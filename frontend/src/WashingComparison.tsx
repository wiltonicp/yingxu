import {useQuery} from '@tanstack/react-query';
import {api} from './api';

type Facts={file_id:string;media_key:string;scores:Record<string,number|null>;release_group:string|null};
export type Comparison={basis:string;decision:{action:string;metric:string|null;reason:string};current:Facts|null;candidate:Facts};
const names:Record<string,string>={release_group:'发布组',source:'资源类型',resolution:'分辨率',dynamic_range:'动态范围',bit_depth:'色深',audio:'音频规格',frame_rate:'帧率',revision:'修订版本',video_codec:'视频编码',file_size:'文件大小'};
const actions:Record<string,string>={upgrade:'候选版更优 · 待替换核对',keep:'保留现有版本',skip:'按配置跳过',review:'资料不足 · 等待确认'};
function display(metric:string,value:number|null|undefined){
 if(value==null)return '未知';
 if(metric==='resolution')return Math.floor(value/2)+(value%2?'p':'i');
 if(metric==='bit_depth')return value+' bit';
 if(metric==='frame_rate')return value+' fps';
 if(metric==='dynamic_range')return ['SDR','HDR','HDR10','HDR10+','Dolby Vision','Dolby Vision + HDR10'][value]||String(value);
 if(metric==='video_codec')return ['','MPEG-2','H.264','H.265','AV1'][value]||String(value);
 if(metric==='file_size')return value>=1024**3?(value/1024**3).toFixed(2)+' GiB':value.toLocaleString()+' 字节';
 if(metric==='audio'){const score=value>=1000?value-1000:value;return (value>=1000?'Atmos / ':'')+(['','MP3','AAC','DD','DD+','DTS','FLAC/PCM','DTS-HD','TrueHD'][Math.floor(score/100)]||'未知')+' / '+score%100+' 声道';}
 return String(value);
}

export function WashingComparison({rows}:{rows:{file_id:string;filename?:string;status?:string;state?:string;cleanup_pending?:boolean;deleted_old_files?:number;washing?:Comparison|null}[]}){
 const rules=useQuery({queryKey:['quality-preferences'],queryFn:()=>api<{description:string;metrics:Record<string,string>}>('/processing/quality-preferences')});
 const unique=[...new Map(rows.filter(x=>x.washing).map(x=>[x.file_id,x])).values()];
 return <section className="panel"><h2>版本比较记录</h2><p className="muted">{rules.data?.description||'基于原始发布文件名的声明规格与115文件身份核对；缺少资料时等待确认。'}</p>{unique.length===0?<p className="muted">遇到已有版本后，这里展示比较结果；当前没有需要展示的比较记录。</p>:unique.map(row=>{
  const c=row.washing!;
  const key=c.decision.metric;
  return <article className="version-comparison" key={row.file_id}><h3 title={row.filename}>{row.filename||'候选文件 #'+row.file_id}</h3><span className="badge">{c.decision.action==='upgrade'&&(row.status==='succeeded'||row.state==='succeeded')?'新版已入库 · 旧版已清理':actions[c.decision.action]||c.decision.action}</span>{row.cleanup_pending&&<p className="notice">新版已发布，旧版清理待核对；已清理 {row.deleted_old_files||0} 个文件。请先只读核对，再继续清理。</p>}{!!row.deleted_old_files&&!row.cleanup_pending&&<small>已清理旧版及附属文件 {row.deleted_old_files} 个。</small>}<p>{c.decision.reason}</p>{key&&<p className="muted">决定性条件：{names[key]||key} · {rules.data?.metrics[key]}</p>}<div className="data-table"><table><thead><tr><th>条件</th><th>现有版本</th><th>候选版本</th></tr></thead><tbody>{Object.entries(names).map(([metric,label])=>{
   const value=(facts:Facts|null)=>metric==='release_group'?(facts?.release_group||'未知'):display(metric,facts?.scores[metric]);
   return <tr key={metric}><td data-label="条件"><b>{label}{metric===key?' · 决定项':''}</b></td><td data-label="现有版本">{value(c.current)}</td><td data-label="候选版本">{value(c.candidate)}</td></tr>;
  })}</tbody></table></div><small>表内为用于排序的分值；数值定义见下方规则，不等同于实测画质。</small></article>;
 })}<details><summary>查看各项比较规则</summary>{rules.error?<p className="error">{rules.error.message}</p>:Object.entries(rules.data?.metrics||{}).map(([key,help])=><p key={key}><b>{names[key]||key}：</b>{help}</p>)}</details></section>;
}
