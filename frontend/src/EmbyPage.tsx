import './EmbyPage.css';
import {Loading} from './Loading';
import {useEffect,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {LibraryBig,Network,Plug,Save,Server} from 'lucide-react';
import {api} from './api';

type Config={
 proxy_enabled?:boolean;proxy_port?:number;proxy_status?:{state:string;port:number|null;error:string|null};
 cache_refresh?:{ok:boolean;at:number;error?:string};user_template_id?:string;cache_interval_minutes?:number;
 enabled:boolean;server:string;refresh_after_output:boolean;api_key_configured:boolean;
 last_check?:{ok:boolean;http_status:number;checked_at?:number};last_refresh?:{ok:boolean};
};

export function EmbyPage({busy,run}:{busy:boolean;run:(work:()=>Promise<unknown>)=>Promise<void>}){
 const query=useQuery({queryKey:['emby'],queryFn:()=>api<Config>('/settings/emby')});
 const accounts=useQuery({queryKey:['emby-accounts'],enabled:!!query.data?.enabled&&!!query.data?.api_key_configured,queryFn:()=>api<{items:{id:string;name:string;disabled:boolean}[]}>('/users/emby-accounts')});
 const connection=useQuery({queryKey:['emby-connection',query.data?.server,query.data?.api_key_configured],queryFn:()=>api<{ok:boolean;http_status:number;checked_at?:number}>('/settings/emby/test','POST'),enabled:!!query.data?.enabled&&!!query.data?.api_key_configured,staleTime:60000,retry:false,refetchOnWindowFocus:false});
 const [value,setValue]=useState<Config|null>(null),[key,setKey]=useState(''),[message,setMessage]=useState('');
 useEffect(()=>{if(query.data)setValue({...query.data});},[query.data]);
 if(query.error)return <p className="error">{query.error.message}</p>;
 if(!value)return <Loading label="正在读取Emby配置…"/>;
 const connectionDirty=value.server!==query.data?.server||!!key;
 const connectionState=!value.enabled?'disabled':!value.api_key_configured?'unconfigured':connectionDirty?'unsaved':connection.isFetching?'checking':connection.isError?'error':connection.data?.ok?'connected':connection.data?'error':'unknown';
 const connectionLabel=({disabled:'未启用',unconfigured:'未配置',unsaved:'待保存',checking:'检测中',error:'连接失败',connected:'已连接',unknown:'未检测'} as Record<string,string>)[connectionState];
 const connectionHint=connection.error?.message||(connection.data&&!connection.data.ok?'连接未通过（HTTP '+connection.data.http_status+'）':'');
 const proxy=value.proxy_status;
 const proxyLabel=proxy?({disabled:'未启用',starting:'正在启动',running:'运行中',error:'启动失败'} as Record<string,string>)[proxy.state]||proxy.state:'后端待更新';
 async function save(){
  await run(async()=>{
   await api('/settings/emby','PUT',{
    user_template_id:value!.user_template_id??'',cache_interval_minutes:value!.cache_interval_minutes??60,
    enabled:value!.enabled,server:value!.server,refresh_after_output:value!.refresh_after_output,api_key:key||null,
    proxy_enabled:value!.proxy_enabled??false,proxy_port:value!.proxy_port??18099,
   });
   setKey('');setMessage('配置已保存，反代开关和端口已应用；没有修改Emby部署。');
  });
 }
 return <div className="emby-settings">
  <h1>Emby 配置</h1>
  <p className="subtitle">连接媒体服务，管理账号同步与播放反代。</p>
  <div className="emby-settings-grid">
   <section className="panel emby-setting-card" aria-labelledby="emby-connection-heading">
    <div className="emby-card-heading emby-card-heading--status"><span className="emby-setting-icon"><Server size={19}/></span><div><h2 id="emby-connection-heading">连接与授权</h2><p>填写原 Emby 服务地址与管理密钥。</p></div><span className="emby-state-badge emby-connection-status" data-state={connectionState} role="status" aria-label={'Emby连接状态：'+connectionLabel} title={connection.data?.checked_at?'最近检测：'+new Date(connection.data.checked_at*1000).toLocaleString():'以实际连接检测结果为准'}>{connectionLabel}</span></div>
    <label className="switch-row emby-setting-switch"><span><b>启用 Emby 集成</b><small>连接媒体库与账号服务。</small></span><input type="checkbox" role="switch" checked={value.enabled} onChange={e=>setValue({...value,enabled:e.target.checked,...(!e.target.checked?{proxy_enabled:false}:{})})}/></label>
    <label className="emby-field">服务器地址<input value={value.server} onChange={e=>setValue({...value,server:e.target.value})} placeholder="http://NAS地址:8096"/><small>使用原服务地址，不要填写下方的反代入口。</small></label>
    <label className="emby-field">API 密钥<input type="password" value={key} onChange={e=>setKey(e.target.value)} autoComplete="off" placeholder={value.api_key_configured?'已保存，留空保留':'输入Emby API密钥'}/><small>后端加密保存，不回显。</small></label>
    {connectionHint&&!connectionDirty&&value.enabled&&<p className="emby-connection-hint" role="alert">{connectionHint}</p>}
   </section>
   <section className="panel emby-setting-card" aria-labelledby="emby-library-heading">
    <div className="emby-card-heading"><span className="emby-setting-icon"><LibraryBig size={19}/></span><div><h2 id="emby-library-heading">媒体库与账号</h2><p>设置账号模板和媒体数据更新方式。</p></div></div>
    <label className="emby-field">新用户权限模板<select value={value.user_template_id??''} onChange={e=>setValue({...value,user_template_id:e.target.value})}><option value="">未设置（仅关联已有账号）</option>{accounts.data?.items.filter(x=>x.disabled).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><small>选择已停用的非管理员账号。新用户先复制权限、设置密码，再启用。</small>{accounts.error&&<small className="error">{accounts.error.message}</small>}</label>
    <label className="emby-field emby-inline-field"><span>缓存更新间隔<small>单位：分钟，默认 60。</small></span><input aria-label="媒体数据缓存更新间隔（分钟）" type="number" min={5} max={1440} value={value.cache_interval_minutes??60} onChange={e=>setValue({...value,cache_interval_minutes:Number(e.target.value)})}/></label>
    <label className="switch-row emby-setting-switch"><span><b>STRM 输出后请求刷新</b><small>刷新失败只记录告警，已输出的文件仍保留。</small></span><input type="checkbox" role="switch" checked={value.refresh_after_output} onChange={e=>setValue({...value,refresh_after_output:e.target.checked})}/></label>
   </section>
   <section className="panel emby-setting-card emby-proxy-card" aria-labelledby="emby-proxy-heading">
   <div className="emby-card-heading emby-card-heading--status"><span className="emby-setting-icon"><Network size={19}/></span><div><h2 id="emby-proxy-heading">Emby 302 反代</h2><p>让兼容的播放器直连媒体，保留 Emby 用户权限校验。</p></div><span className="emby-state-badge emby-proxy-status" data-state={proxy?.state||'unknown'} role="status" aria-label={'反代状态：'+proxyLabel+(proxy?.port?'，端口'+proxy.port:'')} title="当前已保存的服务状态">{proxyLabel}{proxy?.port?' · '+proxy.port:''}</span></div>
   <label className="switch-row emby-setting-switch"><span><b>启用 302 反代</b><small>{value.enabled?'保存后应用开关和监听端口。':'请先启用上方的 Emby 集成。'}</small></span><input type="checkbox" role="switch" disabled={!value.enabled} checked={value.proxy_enabled??false} onChange={e=>setValue({...value,proxy_enabled:e.target.checked})}/></label>
   <div className="emby-proxy-options">
    <label className="emby-field emby-port-field">反代监听端口<input type="number" min={1024} max={65535} disabled={!value.proxy_enabled} value={value.proxy_port??18099} onChange={e=>setValue({...value,proxy_port:Number(e.target.value)})}/><small>默认 18099，可自行修改。</small></label>
    <div className="emby-proxy-guidance"><p>Emby 客户端连接<strong>映序服务器的 {value.proxy_port??18099} 端口</strong>，仍使用原 Emby 账号登录。</p><p>映序签名 STRM 校验后 302 直连；普通媒体与转码仍由 Emby 处理。</p><details><summary>网络与使用说明</summary><p>端口须避开映序 3008、原 Emby 上游及其他服务。Docker host 模式无需端口映射，主机防火墙仍需允许客户端访问。反代不提供转码，也不替代 STRM 目录挂载。</p></details></div>
   </div>
   {proxy?.error&&<p className="error" role="alert">{proxy.error}</p>}
   </section>
  </div>
  <div className="emby-settings-footer">
   <div className="emby-settings-actions"><button className="primary" disabled={busy} onClick={save}><Save size={16}/>保存配置</button><button disabled={busy||connection.isFetching||!query.data?.enabled||!value.api_key_configured||connectionDirty} title={connectionDirty?'请先保存连接信息':'重新检测已保存的Emby连接'} onClick={async()=>{const result=await connection.refetch();setMessage(result.error?result.error.message:result.data?.ok?'Emby连接检查通过':'连接未通过（HTTP '+result.data?.http_status+'）');}}><Plug size={16}/>测试连接</button></div>
   {message&&<p className="emby-save-message" role="status">{message}</p>}
   {value.cache_refresh&&<p className={value.cache_refresh.ok?'muted':'error'}>{value.cache_refresh.ok?'缓存最近更新：':'缓存更新失败：'}{value.cache_refresh.ok?new Date(value.cache_refresh.at*1000).toLocaleString():value.cache_refresh.error}</p>}
   {value.last_refresh?.ok===false&&<p className="error">上次Emby刷新失败，STRM输出结果仍保留。</p>}
  </div>
 </div>;
}
