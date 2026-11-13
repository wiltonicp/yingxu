import {useState,type ReactNode} from 'react';
import {Link} from 'react-router-dom';
import {useQueryClient} from '@tanstack/react-query';
import {ArrowDownToLine,ExternalLink,Check} from 'lucide-react';
import {api} from './api';
import {StatusBadge} from './StatusBadge';
import {processingErrors} from './processingLabels';
export type ResourceProgress={transfer:{job_id:number|null;status:string;error_code:string;target_cid?:string;reused_video_count?:number};processing:{status:string;total:number;completed:number;failed:number;pending:number;failures:{file_id:string;filename:string;error_code:string;step:string;details?:Record<string,string>}[]}};
export type TransferResource={id:number;title:string;revision:number;availability?:string;match_verified?:boolean;progress?:ResourceProgress};
const transferLabels:Record<string,string>={not_queued:'尚未转存',queued:'等待转存',running:'转存中',retry_wait:'等待重试',succeeded:'转存已核对',blocked:'转存受阻',failed:'转存失败',cancelled:'转存已取消'};
const errors:Record<string,string>={result_unknown:'接收结果待只读核对，未重复转存',target_conflict:'待整理目录存在同名内容，请先核对目录中的文件',drive115_not_connected:'115尚未连接',share_cancelled:'原分享已取消',share_unavailable:'分享读取未通过，可能已失效或提取码错误',precondition_changed:'账号、资源版本或任务前置条件已变化',transfer_preflight_failed:'转存前检查未通过',mixed_existing_media:'分享中部分文件已入库，请先核对重复范围'};
export function ResourcePipeline({resource,dialog=false,actions}:{resource:TransferResource;dialog?:boolean;actions?:ReactNode}){
 const cache=useQueryClient(),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const p=resource.progress,t=p?.transfer,processing=p?.processing;
 const processingLabel=processing?.status==='succeeded'?`整理完成 ${processing.completed}/${processing.total}`:processing?.status==='blocked'?`整理受阻 ${processing.failed} 项`:processing?.status==='running'?'正在整理':processing?.status==='waiting'?`等待整理${processing.total?' '+processing.completed+'/'+processing.total:''}`:'尚未整理';
 async function transfer(){
  if(!window.confirm('确认转存此种子？\n'+resource.title+'\n将保存到配置的115待整理目录，核对后继续整理、刮削和STRM生成。已成功转存的记录不会重复接收。'))return;
  setBusy(true);setError('');setMessage('');
  try{const result=await api<{job_id:number;status:string;already_complete?:boolean}>('/resources/'+resource.id+'/transfer','POST',{revision:resource.revision,confirmed:true});setMessage(result.already_complete?'任务 #'+result.job_id+' 已转存成功，无需重复接收；请查看下面的整理状态。':'已提交转存任务 #'+result.job_id);await Promise.all([cache.invalidateQueries({queryKey:['resources']}),cache.invalidateQueries({queryKey:['resource',resource.id]}),cache.invalidateQueries({queryKey:['local-resources']}),cache.invalidateQueries({queryKey:['jobs']})]);}catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 const complete=processing?.status==='succeeded',hasProcessing=processing&&processing.status!=='not_started';
 const transferComplete=t?.status==='succeeded',activeTransfer=['queued','running','retry_wait'].includes(t?.status||'');
 const mainStatus=hasProcessing?processing.status:t?.status==='not_queued'||!t?'disabled':t.status;
 const mainLabel=hasProcessing?processingLabel:t?.status==='not_queued'||!t?'未入库':transferLabels[t.status]||t.status;
 const reason=t?.error_code&&t.status!=='succeeded'?(errors[t.error_code]||processingErrors[t.error_code]||t.error_code):processing?.failures[0]?(processingErrors[processing.failures[0].error_code]||processing.failures[0].error_code):'';
 return <div className={'resource-pipeline'+(dialog?' is-detail':'')}><div className="resource-pipeline-status"><StatusBadge status={mainStatus} label={mainLabel}/><small className="resource-transfer-note">{hasProcessing?(transferLabels[t?.status||'not_queued']||''):'转存后自动整理'}</small>{t?.job_id&&<Link className="text-link resource-job-link" to="/jobs">#{t.job_id} <ExternalLink size={11}/></Link>}</div>{!!t?.reused_video_count&&<small className="resource-reused-count">复用已入库 {t.reused_video_count} 集</small>}{!dialog&&reason&&<p className="resource-pipeline-reason" title={reason}>{reason}</p>}{dialog&&reason&&<p className="resource-pipeline-error">{reason}</p>}{dialog&&!!processing?.failures.length&&<details className="resource-pipeline-failures" open><summary>{processing.failures.length} 项整理失败 · 查看原因</summary>{processing.failures.map((f,i)=><div key={f.file_id||i}><b title={f.filename}>{f.filename}</b><p>{processingErrors[f.error_code]||f.error_code}{f.details&&Object.keys(f.details).length?'（115错误码：'+Object.values(f.details).join(' / ')+'）':''}</p></div>)}<Link className="text-link" to="/processing-records">前往整理记录核对 / 继续 →</Link></details>}<div className="resource-pipeline-actions"><button className={transferComplete?'resource-transfer-done':'button-soft'} disabled={busy||resource.match_verified===false||transferComplete||activeTransfer||resource.availability==='cancelled'} onClick={transfer}>{transferComplete?<Check size={14}/>:<ArrowDownToLine size={14}/ >}{busy?'正在提交…':transferComplete?'已转存':activeTransfer?'转存处理中':'转存到115'}</button>{actions}{!actions&&resource.match_verified===false&&<small>确认影视身份后可转存</small>}</div>{error&&<p className="error" role="alert">{error}</p>}{message&&!complete&&<p className="resource-pipeline-message" role="status">{message}</p>}</div>;
}
