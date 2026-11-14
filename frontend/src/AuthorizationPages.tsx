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
 return <><div className="page-title"><div><h1>115 扫码授权</h1><p className="subtitle">你主动发起扫码，在115 App中确认；会话由映序后端加密保管。</p></div><StatusBadge status={status.data?.drive115_session_saved?'enabled':'unconfigured'} label={status.data?(status.data.drive115_session_saved?'已授权':'尚未授权'):'读取状态中'}/></div>{status.error&&<p className="error">{status.error.message}</p>}{error&&<p className="error" role="alert">{error}</p>}<div className="settings-columns"><section className="panel"><h2>使用115 App扫码</h2><label>授权客户端<select value={client} disabled={busy||active(flow)} onChange={e=>setClient(e.target.value)}><option value="ipad">115生活 · iPad</option><option value="android">115生活 · Android</option><option value="ios">115生活 · iOS</option></select><small>选择用于授权的客户端。</small></label><div className="authorization-qr"><div className="qr-box">{flow?.qr_image&&active(flow)?<img src={flow.qr_image} alt="115本次登录授权二维码"/>:<div className="qr-empty"><b>扫码区域</b><span>{flow?labels[flow.status]:'点击生成二维码后显示'}</span></div>}</div><ol className="authorization-steps"><li><b>生成二维码</b><small>生成本次登录二维码。</small></li><li><b>打开115 App扫一扫</b><small>确认账号后，在手机上批准本次登录。</small></li><li><b>后端保存会话</b><small>不会把Cookie、UID或SEID返回页面。</small></li></ol></div><div className="card-actions"><button className="primary" disabled={busy||status.isPending||!!status.error} onClick={generate}>{busy?<Loading kind="compact" label="处理中…"/>:flow?'重新生成二维码':'生成授权二维码'}</button><button disabled={busy||!active(flow)} onClick={stop}>停止检查</button>{active(flow)&&!polling&&<button disabled={busy} onClick={()=>{setError('');setPolling(true);}}>继续检查</button>}</div><p className="authorization-status" role="status">{flow?labels[flow.status]:'尚未发起授权'}{polling?' · 自动检查中':''}</p><p className="muted">二维码约两分钟内有效。离开本页将停止新的自动检查；已经确认的授权可能已保存，可在下方移除本地会话。</p></section><aside className="settings-notes"><section className="panel"><h2>授权会话</h2><small>旧会话在新扫码成功前保留；重新生成会停止旧的待处理二维码。</small>{status.data?.drive115_session_saved&&<button className="danger full" disabled={busy} onClick={remove}>移除本地115会话</button>}</section><section className="panel"><h2>凭证保护</h2><p>请只在115官方 App中确认扫码。本页不要求手工粘贴Cookie，不读取浏览器现有登录。</p></section></aside></div><DailyCheckin provider="115"/></>;
}
