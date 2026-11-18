import {useEffect,useRef,useState} from 'react';
import {api} from './api';
import {processingErrors} from './processingLabels';

type FileResult={file_id:string;filename?:string;status:string;title?:string;tmdb_id?:string;season?:number;episode?:number;error_code?:string;error_message?:string;layout?:{remote_name:string}};
type Preview={files:FileResult[];ready:boolean;ticket:string|null};
export function BatchProcessingDialog({fileIds,close}:{fileIds:string[];close:()=>void}){
 const ref=useRef<HTMLDialogElement>(null),[kind,setKind]=useState('auto'),[tid,setTid]=useState(''),[season,setSeason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[preview,setPreview]=useState<Preview|null>(null),[result,setResult]=useState<{status:string;files:FileResult[]}|null>(null);
 useEffect(()=>{ref.current?.showModal();},[]);
 async function work(execute=false){
  if(execute&&!confirm('确认整理这 '+fileIds.length+' 个文件？将逐文件移动、改名并输出STRM；遇到异常即停止，已完成文件不自动撤销。'))return;
  setBusy(true);setError('');
  try{if(execute){setResult(await api('/processing/batch/execute','POST',{ticket:preview!.ticket}));setPreview(null);}else setPreview(await api('/processing/batch/preview','POST',{file_ids:fileIds,media_type:kind,tmdb_id:tid.trim(),season:season?Number(season):null}));}
  catch(e){setError((e as Error).message);setPreview(null);}finally{setBusy(false);}
 }
 function reset(){setPreview(null);setError('');}
 const rows=result?.files||preview?.files||[];
 return <dialog ref={ref} className="processing-record-dialog batch-dialog" onCancel={e=>{e.preventDefault();if(!busy)close();}}><div className="dialog-head"><h2>批量识别与整理 · {fileIds.length} 个文件</h2><button disabled={busy} onClick={close} aria-label="关闭批量整理">关闭</button></div><div className="dialog-body"><p>先逐文件验证身份、年份与季集，再确认执行。合集不共用第一部身份；每集保留自己的集号。预览10分钟内有效。</p>{!result&&<form className="record-repair" onSubmit={e=>{e.preventDefault();void work();}}><div className="record-form-grid"><label>媒体类别<select disabled={busy} value={kind} onChange={e=>{setKind(e.target.value);setSeason('');reset();}}><option value="auto">每个文件自动判断</option><option value="movie">电影</option><option value="tv">剧集</option></select></label><label>共同TMDB ID（可留空）<input disabled={busy} value={tid} pattern="[1-9][0-9]{0,11}" maxLength={12} onChange={e=>{setTid(e.target.value);reset();}} placeholder="只用于同一部剧，不强行覆盖冲突"/></label>{kind==='tv'&&<label>季号（可留空）<input disabled={busy} type="number" min={0} max={999} value={season} onChange={e=>{setSeason(e.target.value);reset();}} placeholder="按文件和目录读取"/></label>}</div><button disabled={busy} className="button-soft">{busy?'正在逐文件核对…':'只读预览（不移动）'}</button></form>}{error&&<p className="error" role="alert">{error}</p>}{rows.length>0&&<ol className="batch-results">{rows.map(row=><li key={row.file_id}><strong>{row.title||row.filename||'文件 #'+row.file_id}</strong><small>#{row.file_id}{row.tmdb_id?' · TMDB '+row.tmdb_id:''}{row.season!=null?' · S'+row.season+'E'+row.episode:''}</small>{row.layout&&<small>{row.layout.remote_name}</small>}<p className={row.error_code?'error':'notice'}>{row.error_code?(row.error_message||processingErrors[row.error_code]||row.error_code):({identified:'验证通过',succeeded:'整理完成',skipped:'已跳过',not_executed:'未执行'}[row.status]||row.status)}</p></li>)}</ol>}{preview&&!preview.ready&&<p className="error">存在未通过验证的文件，本批尚未执行。请取消选择冲突文件或在单文件详情修正后重新预览。</p>}{preview?.ready&&<button className="primary" disabled={busy} onClick={()=>void work(true)}>确认结果并整理全部 {fileIds.length} 个文件</button>}{result&&<p role="status" className="notice">{result.status==='completed'?'本批处理完成。':'本批已停止；已完成项保留，未执行项未移动。请到详情核对失败任务。'}</p>}</div></dialog>;
}
