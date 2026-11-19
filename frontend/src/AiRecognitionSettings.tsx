import {useEffect,useRef,useState,type FormEvent} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {api} from './api';
import {Loading} from './Loading';
import {Eye,EyeOff,X} from 'lucide-react';

const endpoint='/settings/plugins/ai-recognition';
const scopeOptions=[
 ['media_identity','影视身份（电影或剧集）'],
 ['episode','剧集季号与集号'],
] as const;
type Scope=(typeof scopeOptions)[number][0];
type Config={enabled:boolean;api_url:string;prompt:string;model:string;scopes:Scope[];api_key_configured:boolean};

type Busy='save'|'test'|'models'|null;
type ConnectionResult={ok:true;elapsed_ms:number;models:string[]};

export function useAiRecognitionConfig(){return useQuery({queryKey:[endpoint],queryFn:()=>api<Config>(endpoint)});}

export function AiRecognitionSettings({close}:{close:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [busy,setBusy]=useState<Busy>(null);
 const query=useAiRecognitionConfig();
 useEffect(()=>{
  const element=dialog.current!;
  element.showModal();
  return ()=>element.close();
 },[]);
 return <dialog ref={dialog} className="ai-recognition-settings" aria-labelledby="ai-recognition-title" onCancel={event=>{event.preventDefault();if(!busy)close();}}>
  <div className="dialog-head"><h2 id="ai-recognition-title">AI 识别配置</h2><button type="button" className="icon-button" aria-label="关闭 AI 识别配置" disabled={!!busy} onClick={close}><X/></button></div>
  {query.data?<RecognitionForm config={query.data} busy={busy} setBusy={setBusy} close={close}/>:
   <div className="dialog-body">{query.isPending?<Loading label="正在读取 AI 识别配置…"/>:
    <><p className="error" role="alert">{query.error?.message==='Not Found'?'当前后端未加载 AI 识别配置接口，请重启本地预览后端后重试。':query.error?.message}</p><button type="button" onClick={()=>query.refetch()} disabled={query.isFetching}>重试</button></>}
   </div>}
 </dialog>;
}

function RecognitionForm({config,busy,setBusy,close}:{config:Config;busy:Busy;setBusy:(value:Busy)=>void;close:()=>void}){
 const cache=useQueryClient();
 const [enabled,setEnabled]=useState(config.enabled);
 const [url,setUrl]=useState(config.api_url);
 const [prompt,setPrompt]=useState(config.prompt);
 const [model,setModel]=useState(config.model);
 const [key,setKey]=useState('');
 const [showKey,setShowKey]=useState(false);
 const [scopes,setScopes]=useState(config.scopes);
 const [models,setModels]=useState<string[]>([]);
 const [latency,setLatency]=useState<number|null>(null);
 function clearConnection(){setModels([]);setLatency(null);}
 const [feedback,setFeedback]=useState<{ok:boolean;text:string}|null>(null);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(busy)return;
  const action=((event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value;
  void run(action==='test'?'test':'save');
 }
 async function run(mode:NonNullable<Busy>){
  if(busy)return;
  const connection={api_url:url.trim(),model:model.trim(),api_key:key.trim()||null};
  setBusy(mode);
  setFeedback(null);
  try{
   if(mode!=='save'){
    setLatency(null);
    if(mode==='models')setModels([]);
    const result=await api<ConnectionResult>(endpoint+'/test','POST',{...connection,model:mode==='models'?'':connection.model});
    if(!Number.isFinite(result.elapsed_ms)||!Array.isArray(result.models))throw new Error('请重启本地预览后端后重试。');
    setLatency(result.elapsed_ms);
    if(mode==='models'){
     setModels(result.models);
     setFeedback({ok:true,text:result.models.length?'已获取 '+result.models.length+' 个模型，请从下拉列表选择。':'服务返回了空模型列表，仍可手动输入模型 ID。'});
    }
   }else{
    const saved=await api<Config>(endpoint,'PUT',{...connection,enabled,prompt,scopes});
    cache.setQueryData([endpoint],saved);
    close();
   }
  }catch(error){setFeedback({ok:false,text:(error as Error).message});}
  finally{setBusy(null);}
 }
 return <form onSubmit={submit} onChange={()=>setFeedback(null)}><div className="dialog-body">
  <p className="muted">支持 OpenAI 兼容接口。连接测试仅查询模型，不生成内容或保存配置。</p>
  <fieldset disabled={!!busy}>
   <label className="switch-row"><span><b>启用 AI 识别</b><small>自动整理常规识别未通过时，按下方范围调用 AI 辅助识别。</small></span><input type="checkbox" role="switch" checked={enabled} onChange={event=>setEnabled(event.target.checked)}/></label>
   <div className="ai-recognition-grid"><div className="ai-recognition-field"><label htmlFor="ai-recognition-api-url">API URL</label><input id="ai-recognition-api-url" aria-describedby="ai-recognition-url-help" type="url" required maxLength={1000} value={url} onChange={event=>{setUrl(event.target.value);clearConnection();}} placeholder="https://api.example.com/v1" autoComplete="off" spellCheck={false}/><small id="ai-recognition-url-help" className="muted">填写公网 HTTPS 基础地址，包含服务要求的版本路径，不带 /models。</small></div>
   <div className="ai-recognition-field"><label htmlFor="ai-recognition-api-key">API Key</label><div className="ai-recognition-key"><input id="ai-recognition-api-key" type={showKey?"text":"password"} maxLength={512} value={key} onChange={event=>{setKey(event.target.value);clearConnection();}} autoComplete="new-password" placeholder={config.api_key_configured&&url===config.api_url?'已保存，留空继续使用':'请输入此地址对应的 API Key'}/><button type="button" className="icon-button" aria-label={showKey?'隐藏 API Key':'显示 API Key'} disabled={!key} onClick={()=>setShowKey(!showKey)}>{showKey?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></div></div>
   <div className="ai-recognition-field ai-recognition-model"><label htmlFor="ai-recognition-model">自定义模型 ID</label>
   <div className="ai-recognition-model-row">
    <input id="ai-recognition-model" maxLength={200} value={model} onChange={event=>{setModel(event.target.value);setLatency(null);}} placeholder="填写服务商提供的模型 ID" autoComplete="off" spellCheck={false}/>
    <button type="button" onClick={event=>{if(event.currentTarget.form?.reportValidity())void run("models");}} disabled={!!busy}>{busy==='models'?'获取中…':'获取模型'}</button>
   </div>
   </div>
   {models.length>0&&<div className="ai-recognition-field ai-recognition-model"><label htmlFor="ai-recognition-model-choice">从服务商模型列表选择</label><select id="ai-recognition-model-choice" value={models.includes(model)?model:''} onChange={event=>{if(event.target.value){setModel(event.target.value);setLatency(null);}}}><option value="">请选择模型</option>{models.map(id=><option key={id} value={id}>{id}</option>)}</select></div>}
  </fieldset>
  <fieldset disabled={!!busy} className="ai-recognition-prompt">
   <div className="ai-recognition-field"><label htmlFor="ai-recognition-prompt">自定义提示词</label><textarea id="ai-recognition-prompt" aria-describedby="ai-recognition-prompt-help" rows={6} maxLength={8000} value={prompt} onChange={event=>setPrompt(event.target.value)} placeholder="例如：保留原标题，只有在线索明确时才建议季号和集号。"/><small id="ai-recognition-prompt-help" className="muted">自动识别时使用；留空恢复默认提示词。连接测试不会发送提示词。</small></div>
  </fieldset>
  <fieldset disabled={!!busy}>
   <legend>使用范围</legend>
   <div className="ai-recognition-grid ai-recognition-scopes">{scopeOptions.map(([id,label])=><label key={id} className="switch-row"><span>{label}</span><input type="checkbox" checked={scopes.includes(id)} onChange={event=>setScopes(event.target.checked?[...scopes,id]:scopes.filter(scope=>scope!==id))}/></label>)}</div>
   <small className="muted">只在选定范围内补充识别线索；不选则不调用 AI。</small>
  </fieldset>
  {feedback&&<p className={feedback.ok?'':'error'} role={feedback.ok?'status':'alert'}>{feedback.text}</p>}
  </div><div className="dialog-foot">
   {latency!==null&&<span className="ai-recognition-connected" role="status">状态：AI 连接正常 · 耗时 {latency} ms</span>}
   <button type="button" disabled={!!busy} onClick={close}>关闭</button>
   <button className="primary" type="submit" value="save" disabled={!!busy}>{busy==='save'?'保存中…':'保存配置'}</button>
   <button type="submit" value="test" disabled={!!busy}>{busy==='test'?'测试中…':'测试连接'}</button>
  </div>

 </form>;
}
