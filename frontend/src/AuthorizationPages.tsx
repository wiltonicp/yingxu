import './drive115Compact.css';
import {DailyCheckin} from './DailyCheckin';
import {StatusBadge} from './StatusBadge';
import {Loading} from './Loading';
import {useEffect, useState} from 'react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {api} from './api';

type IntegrationStatus={drive115_session_saved:boolean;transfer_verified:boolean;collector_running:boolean};
type Flow={id:string;provider:string;status:string;expires_at:number;qr_image?:string};
const active=(f:Flow|null)=>!!f&&['waiting','scanned','code_required','password_required'].includes(f.status);
const labels:Record<string,string>={waiting:'等待使用115 App扫码',scanned:'已扫码，请在手机上确认',authorized:'授权会话已加密保存',expired:'本次授权已过期，请重新发起',cancelled:'已在客户端取消',stopped:'已停止本次授权检查',error:'授权请求失败',code_required:'请输入收到的Telegram验证码',password_required:'账号启用了两步验证，请输入Telegram密码'};

function useIntegrationStatus(){return useQuery({queryKey:['integration-status'],queryFn:()=>api<IntegrationStatus>('/integrations/status')});}

export function Drive115Page(){
 const cache=useQueryClient(),status=useIntegrationStatus();
 const [client,setClient]=useState('ipad'),[flow,setFlow]=useState<Flow|null>(null),[polling,setPolling]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  if(!flow||!['waiting','scanned'].includes(flow.status)||!polling)return;
  let live=true;
  const timer=setTimeout(async()=>{try{const next=await api<Flow>('/integrations/115/qr/'+flow.id+'/poll','POST');if(!live)return;setFlow(next);if(!['waiting','scanned'].includes(next.status)){setPolling(false);await cache.invalidateQueries({queryKey:['integration-status']});}}catch(e){if(live){setError((e as Error).message);setPolling(false);}}},3500);
  return ()=>{live=false;clearTimeout(timer);};
 },[flow,polling,cache]);
 async function generate(){setBusy(true);setError('');setPolling(false);try{if(active(flow))await api('/integrations/flows/'+flow!.id+'/stop','POST');const next=await api<Flow>('/integrations/115/qr','POST',{client});setFlow(next);setPolling(true);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function stop(){if(!flow)return;setBusy(true);setPolling(false);setError('');try{setFlow(await api<Flow>('/integrations/flows/'+flow.id+'/stop','POST'));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function remove(){if(!window.confirm('移除映序保存的115会话？不会删除网盘文件，也不会退出其他设备。'))return;setBusy(true);setPolling(false);setError('');try{await api('/integrations/115/session','DELETE');setFlow(null);await cache.invalidateQueries({queryKey:['integration-status']});}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const waiting=active(flow);
 const authorized=!!status.data?.drive115_session_saved;
 return <>
  <div className="page-title"><h1>115 扫码授权</h1><StatusBadge status={authorized?'enabled':'unconfigured'} label={status.data?(authorized?'已授权':'尚未授权'):'读取状态中'}/></div>
  {status.error&&<p className="error">{status.error.message}</p>}
  <div className="connection-card-pair">
  <section className="panel drive115-authorization" aria-label="115 授权">
   <label>授权客户端<select value={client} disabled={busy||waiting} onChange={e=>setClient(e.target.value)}><option value="ipad">115生活 · iPad</option><option value="android">115生活 · Android</option><option value="ios">115生活 · iOS</option></select></label>
   <div className="card-actions">
    <button className="primary" disabled={busy||status.isPending||!!status.error} onClick={generate}>{busy?<Loading kind="compact" label="处理中…"/>:flow?'重新生成二维码':'生成授权二维码'}</button>
    {waiting&&<button disabled={busy} onClick={stop}>停止检查</button>}
    {waiting&&!polling&&<button disabled={busy} onClick={()=>{setError('');setPolling(true);}}>继续检查</button>}
   </div>
   {error&&<p className="error" role="alert">{error}</p>}
   {flow?.qr_image&&waiting&&<div className="drive115-active-qr"><img src={flow.qr_image} alt="115 本次登录授权二维码"/></div>}
   {flow&&<p className="authorization-status" role="status">{labels[flow.status]}</p>}
   {authorized&&<details className="drive115-session-settings"><summary>管理已保存会话</summary><button className="danger" disabled={busy} onClick={remove}>移除本地115会话</button></details>}
  </section>
  <DailyCheckin provider="115"/>
  </div>
 </>;
}