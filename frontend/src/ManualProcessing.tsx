import {useEffect,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {Link} from 'react-router-dom';
import {api} from './api';
import {processingSteps,processingErrors} from './processingLabels';

export type ManualTask={id:string;kind:string;status:string;created_at:number;file_ids:string[];error_message?:string;error_code?:string;progress:{finished:number;total:number;filename?:string;step?:string};result?:{status:string;files?:{file_id:string;status:string;error_code?:string}[]}};
export async function submitProcessing(payload:{kind:'batch'|'retry'|'scan'|'resume';file_id?:string;ticket?:string}){
 const task=await api<ManualTask>('/processing/tasks','POST',{...payload,request_id:Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('')});
 window.dispatchEvent(new CustomEvent('manual-processing-submitted',{detail:task.id}));return task;
}
const labels:Record<string,string>={queued:'排队中',running:'后台执行中',completed:'已完成',stopped:'已停止，待核对',failed:'执行失败，待核对',interrupted:'执行中断，需核对'};
export function ManualProcessingTasks(){
 const cache=useQueryClient(),[open,setOpen]=useState(false);
 const q=useQuery({queryKey:['manual-processing-tasks'],queryFn:()=>api<{items:ManualTask[];worker_error?:string}>('/processing/tasks'),refetchInterval:2000});
 useEffect(()=>{const listener=()=>{setOpen(true);void cache.invalidateQueries({queryKey:['manual-processing-tasks']});};window.addEventListener('manual-processing-submitted',listener);return()=>window.removeEventListener('manual-processing-submitted',listener);},[cache]);
 const terminalKey=q.data?.items.filter(x=>['completed','stopped','failed','interrupted'].includes(x.status)).map(x=>x.id+':'+x.status).join('|')||'';
 useEffect(()=>{if(terminalKey){for(const key of ['processing-records','processing-record','processing-history','processing-status','subscriptions'])void cache.invalidateQueries({queryKey:[key]});}},[terminalKey,cache]);
 const rows=q.data?.items||[],active=rows.filter(x=>['queued','running'].includes(x.status));
 if(q.error)return <p className="error">后台整理状态读取失败：{q.error.message}</p>;
 if(q.data?.worker_error)return <p className="error">{q.data.worker_error} · <Link to="/logs">查看日志</Link></p>;
 if(!rows.length)return null;
 return <details className="manual-processing-panel panel" open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary>后台整理任务 · {active.length?'进行中 '+active.length+' 项':'暂无运行任务'} · 可离开页面，任务继续</summary>{rows.slice(0,10).map(task=><article className="manual-task-row" key={task.id}><div><strong>{({retry:'单文件整理',batch:'批量整理',scan:'扫描整理',resume:'继续原任务'}[task.kind]||task.kind)+' · '+(labels[task.status]||task.status)}</strong><small>任务 #{task.id.slice(-8)} · {new Date(task.created_at*1000).toLocaleString()}</small>{task.status==='running'&&<p>{task.progress.filename||'正在重新核对识别与来源'}{task.progress.step?' · '+(processingSteps[task.progress.step]||task.progress.step):''}</p>}<p>已处理 {task.progress.finished}{task.progress.total?' / '+task.progress.total:''} 个文件</p>{task.result?.status==='partial'&&<small>本轮已处理，待整理目录仍有剩余文件。</small>}{task.error_message&&<p className="error">{task.error_message}</p>}{task.result?.files?.filter(x=>x.error_code||x.status==='not_executed').map(x=><small key={x.file_id}>#{x.file_id} · {x.error_code?(processingErrors[x.error_code]||x.error_code):'未执行'}</small>)}</div><Link className="text-link" to="/processing-records">查看整理记录 →</Link></article>)}</details>;
}
