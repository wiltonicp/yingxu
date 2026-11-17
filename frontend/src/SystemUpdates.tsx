import {useEffect,useRef,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {api} from './api';
import './SystemUpdates.css';

type UpdateJob={id:string;phase:string;message:string;error:string|null;target:string};
type UpdateState={current_version:string;latest:null|{version:string;notes:string;release_url:string;manifest_url:string|null};available:boolean;ignored_version:string|null;last_check:number|null;check_error:string|null;manager_ready:boolean;can_install:boolean;busy:boolean;job:UpdateJob|null};
const labels:Record<string,string>={queued:'等待更新',downloading:'下载及校验',draining:'等待任务完成',stopping:'停止业务进程',backing_up:'备份数据',starting:'启动新版',verifying:'验证新版',rolling_back:'恢复旧版',rolled_back:'已回滚',failed:'更新失败',completed:'更新完成'};
function useUpdates(){return useQuery({queryKey:['system-updates'],queryFn:()=>api<UpdateState>('/system/updates'),retry:false,refetchInterval:q=>q.state.data?.busy?2000:30000,refetchOnWindowFocus:true});}

function Progress({state}:{state:UpdateState}){
 const job=state.job;
 return <>{state.busy&&<p role="status">更新期间页面可能短暂断开；请勿重复更新或关闭容器。</p>}{job&&<div className={'update-progress '+(job.error?'update-progress--error':'')} role="status"><strong>{labels[job.phase]||job.phase} · v{job.target}</strong><p>{job.message}</p>{job.error&&<p className="error">{job.error}</p>}</div>}</>;
}

function UpdateDialog({state,close,onIgnore}:{state:UpdateState;close:()=>void;onIgnore:()=>Promise<void>}){
 const dialog=useRef<HTMLDialogElement>(null),cache=useQueryClient();
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[confirm,setConfirm]=useState(false);
 useEffect(()=>{dialog.current?.showModal();},[]);
 async function act(work:()=>Promise<unknown>){setBusy(true);setError('');try{await work();await cache.invalidateQueries({queryKey:['system-updates']});close();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const latest=state.latest!;
 return <dialog ref={dialog} className="update-dialog" onCancel={e=>{e.preventDefault();if(!busy)close();}}><div className="dialog-head"><h2>{confirm?'确认更新':'发现新版本'} v{latest.version}</h2><button aria-label="关闭更新提示" onClick={close} disabled={busy}>×</button></div><div className="dialog-body"><p>当前版本 v{state.current_version}</p>{confirm?<><p>将先下载并验证更新包，暂停新任务，等待当前任务结束，再备份数据并重启业务进程。</p><p>容器保持不变。新版验证期间不开放业务；启动验证失败会恢复旧版本及升级前数据库。</p></>:<pre className="update-notes">{latest.notes||'此版本未提供更新说明。'}</pre>}{!state.can_install&&<p className="error">{!state.manager_ready?'当前运行方式未启用启动管理器，需先升级支持内部更新的基础镜像。':!latest.manifest_url?'此版本尚未提供内部更新包。':'发布签名信任尚未配置，暂不允许安装。'}</p>}{error&&<p className="error" role="alert">{error}</p>}</div><div className="dialog-foot"><button disabled={busy} onClick={()=>act(onIgnore)}>忽略此版本</button><button disabled={busy} onClick={close}>稍后</button><button className="primary" disabled={busy||state.busy||!state.can_install} onClick={()=>confirm?act(()=>api('/system/updates/install','POST',{version:latest.version})):setConfirm(true)}>{busy?'正在提交…':confirm?'确认并开始更新':'更新'}</button></div></dialog>;
}

export function UpdateNotification(){
 const query=useUpdates(),state=query.data,cache=useQueryClient();
 const [dismissed,setDismissed]=useState(()=>{try{return JSON.parse(localStorage.getItem('yingxu-update-later')||'null') as {version:string;until:number}|null;}catch{return null;}});
 const initial=useRef<string|null>(null);
 useEffect(()=>{if(!state)return;if(initial.current===null)initial.current=state.current_version;else if(initial.current!==state.current_version)window.location.reload();},[state?.current_version]);
 const show=!!(state?.available&&state.latest&&state.ignored_version!==state.latest.version&&!state.busy&&!(dismissed?.version===state.latest.version&&dismissed.until>Date.now()));
 function later(){if(!state?.latest)return;const value={version:state.latest.version,until:Date.now()+86400000};setDismissed(value);localStorage.setItem('yingxu-update-later',JSON.stringify(value));}
 return <>{state?.busy&&<div className="update-banner" role="status">系统更新：{labels[state.job?.phase||'']||'处理中'} · {state.job?.message}</div>}{show&&state&&<UpdateDialog key={state.latest!.version} state={state} close={later} onIgnore={async()=>{await api('/system/updates/ignore','POST',{version:state.latest!.version});await cache.invalidateQueries({queryKey:['system-updates']});}}/>}</>;
}

export function SystemUpdates(){
 const query=useUpdates(),state=query.data,cache=useQueryClient();
 const [checking,setChecking]=useState(false),[error,setError]=useState(''),[open,setOpen]=useState(false);
 async function check(){setChecking(true);setError('');try{const result=await api<UpdateState>('/system/updates/check','POST');cache.setQueryData(['system-updates'],result);}catch(e){setError((e as Error).message);}finally{setChecking(false);}}
 return <section className="panel system-updates"><h1>版本更新</h1><p className="subtitle">单容器内部更新，保留现有账号、配置及媒体挂载。</p>{query.isPending&&<p>正在读取版本…</p>}{query.error&&<p className="error">暂时连接不上服务，更新期间请等待自动重连。{query.error.message}</p>}{state&&<><dl><dt>当前程序版本</dt><dd>v{state.current_version}</dd><dt>检测到的正式版</dt><dd>{state.latest?'v'+state.latest.version:'尚未检测'}</dd><dt>上次检查</dt><dd>{state.last_check?new Date(state.last_check*1000).toLocaleString():'尚未检查'}</dd><dt>启动管理器</dt><dd>{state.manager_ready?'已就绪':'当前运行方式未启用'}</dd></dl>{state.check_error&&<p className="error">{state.check_error}</p>}{state.available&&state.ignored_version===state.latest?.version&&<p>已忽略此版本的自动提示，仍可手动更新。</p>}<div className="update-actions"><button disabled={checking||state.busy} onClick={check}>{checking?'检查中…':'检查更新'}</button><button className="primary" disabled={!state.available||state.busy} onClick={()=>setOpen(true)}>查看新版并更新</button>{state.latest&&<a href={state.latest.release_url} target="_blank" rel="noopener noreferrer">发布说明</a>}</div><Progress state={state}/>{!state.available&&state.latest&&!state.check_error&&<p>当前版本已是最新正式版，或高于更新源版本。</p>}{open&&state.latest&&<UpdateDialog state={state} close={()=>setOpen(false)} onIgnore={async()=>{await api('/system/updates/ignore','POST',{version:state.latest!.version});}}/>}</>}{error&&<p className="error" role="alert">{error}</p>}</section>;
}
