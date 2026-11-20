import {useEffect,useRef} from 'react';
import {X} from 'lucide-react';
import {useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {Globe,Plus,Save} from 'lucide-react';
import {api} from './api';

type Config={trusted_origins:string[]};
type Result={config:Config;environment_origins:string[];same_authority_https:boolean};
function AccessSettings(){
 const cache=useQueryClient(),query=useQuery({queryKey:['access-settings'],queryFn:()=>api<Result>('/settings/access')});
 const [draft,setDraft]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const value=draft??query.data?.config.trusted_origins.join('\n')??'',current=window.location.origin;
 function addCurrent(){const values=value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);setDraft([...new Set([...values,current])].join('\n'));setMessage('');}
 async function save(){
  setBusy(true);setError('');setMessage('');
  try{
   const config={trusted_origins:value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean)};
   const result=await api<{saved:boolean;config:Config}>('/settings/access','PUT',config);
   if(!result.saved)throw new Error('保存未确认');
   cache.setQueryData<Result>(['access-settings'],old=>old?{...old,config:result.config}:undefined);setDraft(null);setMessage('访问设置已保存，即时生效，无需重启。');
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <><div className="settings-columns"><section className="panel"><h2><Globe size={20}/><span>可信访问入口</span></h2><p className="muted access-origin-note">当前浏览器入口：<code style={{overflowWrap:'anywhere'}}>{current}</code></p><label>允许的访问地址<textarea aria-label="允许的访问地址" value={value} disabled={busy||query.isPending} placeholder={'https://media.example.com\nhttps://media.example.net:8443'} onChange={e=>{setDraft(e.target.value);setMessage('');}}/><small>每行一个完整地址，包含 http/https 和端口；不填写路径、参数或通配符，最多 20 个。</small></label><div className="card-actions"><button type="button" disabled={busy||query.isPending} onClick={addCurrent}><Plus size={16}/>添加当前地址</button><button className="primary" disabled={busy||draft===null||query.isPending} onClick={save}><Save size={16}/>{busy?'保存中…':'保存访问设置'}</button></div>{(error||query.error)&&<p className="error" role="alert">{error||query.error?.message}</p>}{message&&<p className="notice" role="status">{message}</p>}{!!query.data?.environment_origins.length&&<p className="muted">环境变量同时允许：{query.data.environment_origins.join('、')}</p>}</section><aside className="settings-notes connection-help-list"><details className="panel connection-help"><summary>反代配置</summary><p>建议保留浏览器原始 Host，并正确转发 X-Forwarded-Proto。TLS 在反代结束、后端使用 HTTP 时，同一 Host 的 HTTPS 入口可正常访问。</p><p>若反代把 Host 改成了内部 IP，请将实际域名加入可信入口列表。只允许明确列出的其他来源，不关闭 CSRF 校验。</p></details><details className="panel connection-help"><summary>访问被拦截</summary><p>先用内网 IP 登录，进入本页添加域名；也可在 Compose 环境变量设置：</p><code style={{overflowWrap:'anywhere'}}>YINGXU_WEB_ORIGIN: https://media.example.com</code><p className="muted">移除正在使用的入口后，可能需要从内网重新进入。本设置只处理浏览器访问，不修改 STRM 播放地址。</p></details></aside></div></>;
}

export function AccessSettingsDialog({close}:{close:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{
  const element=dialog.current;
  element?.showModal();
  return ()=>element?.close();
 },[]);
 return <dialog className="access-plugin-dialog" ref={dialog} aria-labelledby="access-plugin-title" onCancel={event=>{event.preventDefault();close();}}>
  <div className="dialog-head"><h2 id="access-plugin-title">访问与反代</h2><button className="icon-button" type="button" onClick={close} aria-label="关闭访问与反代"><X size={20}/></button></div>
  <div className="dialog-body"><AccessSettings/></div>
 </dialog>;
}
