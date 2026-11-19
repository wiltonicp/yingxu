import {useEffect,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {Link} from 'react-router-dom';
import {api} from './api';
import {processingSteps,processingErrors} from './processingLabels';

export type ManualTask={id:string;kind:string;status:string;created_at:number;file_ids:string[];error_message?:string;error_code?:string;progress:{finished:number;total:number;files?:Record<string,{status:string;error_code?:string}>;filename?:string;step?:string};result?:{status:string;files?:{file_id:string;status:string;error_code?:string}[]}};
export async function submitProcessing(payload:{kind:'batch'|'retry'|'scan'|'resume';file_id?:string;ticket?:string}){
 const task=await api<ManualTask>('/processing/tasks','POST',{...payload,request_id:Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('')});
 window.dispatchEvent(new CustomEvent('manual-processing-submitted',{detail:task.id}));return task;
}
const labels:Record<string,string>={queued:'排队中',running:'后台执行中',completed:'已完成',stopped:'已停止',failed:'执行失败',interrupted:'执行中断',succeeded:'已完成',skipped:'已跳过',replaced:'已替换',blocked:'待核对',not_executed:'未执行'};
const kinds:Record<string,string>={retry:'单文件整理',batch:'批量整理',scan:'扫描整理',resume:'继续原任务'};
const active=(task:ManualTask)=>['queued','running'].includes(task.status);
const attention=(task:ManualTask)=>['failed','stopped','interrupted'].includes(task.status);
export function ManualProcessingTasks({center=false,showSummary=false}:{center?:boolean;showSummary?:boolean}){
 const cache=useQueryClient();
 const [filter,setFilter]=useState<'focus'|'all'>('focus');
 const [selected,setSelected]=useState('');
 const q=useQuery({queryKey:['manual-processing-tasks'],queryFn:()=>api<{items:ManualTask[];worker_error?:string}>('/processing/tasks'),refetchInterval:q=>q.state.data?.items.some(active)?2000:15000});
 useEffect(()=>{
  const listener=(event:Event)=>{if(center){setSelected((event as CustomEvent<string>).detail);setFilter('focus');}void cache.invalidateQueries({queryKey:['manual-processing-tasks']});};
  window.addEventListener('manual-processing-submitted',listener);
  return()=>window.removeEventListener('manual-processing-submitted',listener);
 },[cache,center]);
 const terminalKey=q.data?.items.filter(x=>!active(x)).map(x=>x.id+':'+x.status).join('|')||'';
 useEffect(()=>{if(terminalKey&&!center){for(const key of ['processing-records','processing-record','processing-history','processing-status','subscriptions'])void cache.invalidateQueries({queryKey:[key]});}},[terminalKey,cache,center]);
 const rows=q.data?.items||[],running=rows.filter(active),issues=rows.filter(attention);
 const error=q.error?.message||q.data?.worker_error;
 if(!center)return showSummary&&(running.length||issues.length||error)?<div className="task-shortcut" role="status"><Link to="/jobs?view=organize">{error?'后台整理状态异常 · 查看任务中心 →':`整理任务：${running.length} 项运行或排队 · ${issues.length} 项待查看 →`}</Link></div>:null;
 const visible=filter==='all'?rows:[...running,...issues];
 return <section className="panel task-center-panel" aria-label="整理任务">
  <div className="card-actions"><button aria-pressed={filter==='focus'} onClick={()=>setFilter('focus')}>运行 / 待处理</button><button aria-pressed={filter==='all'} onClick={()=>setFilter('all')}>最近全部</button><button onClick={()=>void q.refetch()} disabled={q.isFetching}>刷新整理任务</button></div>
  {error&&<p className="error">{error} · <Link to="/logs">查看日志</Link></p>}
  {q.isPending?<p>正在读取整理任务…</p>:!visible.length&&!error?<p className="muted">暂无{filter==='focus'?'运行或待处理的':''}整理任务。</p>:visible.map(task=>{
   const files=new Map(Object.entries(task.progress.files||{}));
   for(const file of task.result?.files||[])files.set(file.file_id,file);
   for(const id of task.file_ids)if(!files.has(id))files.set(id,{status:active(task)?'pending':'unconfirmed'});
   return <article className="manual-task-row" key={task.id}><div>
    <strong>{kinds[task.kind]||task.kind} · {labels[task.status]||task.status}</strong>
    <small>任务 #{task.id.slice(-8)} · {new Date(task.created_at*1000).toLocaleString()}</small>
    <p>已处理 {task.progress.finished}{task.progress.total?' / '+task.progress.total:''} 个文件</p>
    {active(task)&&task.progress.filename&&<p>{task.progress.filename} · {processingSteps[task.progress.step||'']||task.progress.step}</p>}
    {task.error_message&&<p className="error">{task.error_message}</p>}
    <button aria-expanded={selected===task.id} onClick={()=>setSelected(selected===task.id?'':task.id)}>文件详情</button>
    {selected===task.id&&<ul className="task-file-results">{Array.from(files,([id,file])=><li key={id}>#{id} · {labels[file.status]||(file.status==='pending'?'待处理':file.status==='unconfirmed'?'结果待核对':file.status)}{file.error_code?' · '+(processingErrors[file.error_code]||file.error_code):''} <Link to={'/processing-records?file='+encodeURIComponent(id)}>查看文件记录</Link></li>)}{!files.size&&<li>暂无逐文件结果。<Link to="/processing-records">查看整理记录</Link></li>}</ul>}
   </div></article>;
  })}
 </section>;
}
