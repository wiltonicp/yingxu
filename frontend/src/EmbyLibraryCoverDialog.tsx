import {useEffect,useRef,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Link} from 'react-router-dom';
import {Check,X} from 'lucide-react';
import {api} from './api';
import {Loading} from './Loading';
import './embyCover.css';

const endpoint='/settings/plugins/emby-cover';
type Folder={id:string;name:string};
type CoverState={revision:string;has_image:boolean;has_backup:boolean;can_restore:boolean};
type Artwork={emby_id:string;title:string;poster_url?:string};
import {artworkCount,defaultEnglish,defaultTypography,loadCoverTitleFont,renderCover,subtitleFonts,templates,titleFonts,withArtwork,type CoverTypography,type Template} from './embyCoverRenderer';

const defaultSchedule={schedule_enabled:false,update_cron:"0 * * * *"} as const;
type Preferences=CoverTypography&{schedule_enabled:boolean;update_cron:"0 * * * *";libraries:string[];template:Template;english_enabled:boolean;english_titles:Record<string,string>};
type Result={folder:Folder;state?:CoverState;src?:string;error?:string;outcome?:string};
const featured:Template[]=['split','matrix','wall','mosaic','overlay','reels','marquee'];
const choices=[...new Set([...featured,...Object.keys(templates) as Template[]])];
const route=(id:string)=>endpoint+'/'+encodeURIComponent(id);
const imageUrl=(id:string)=>'/api/library/images/'+encodeURIComponent(id);

async function automaticArt(folder:Folder, count:number){
 const response=await api<{items:Artwork[]}>('/library/items?limit=24&parent='+encodeURIComponent(folder.id));
 const ids=[...new Set(response.items.filter(item=>item.poster_url).map(item=>item.emby_id))].slice(0,count);
 return ids.map(imageUrl);
}

export function EmbyLibraryCoverDialog({close}:{close:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [tab,setTab]=useState<'style'|'config'|'preview'>('style');
 const [config,setConfig]=useState<Preferences|null>(null);
 const [saved,setSaved]=useState<Preferences|null>(null);
 const [results,setResults]=useState<Result[]>([]);
 const [busy,setBusy]=useState('');
 const [progress,setProgress]=useState('');
 const [confirm,setConfirm]=useState<'sync'|Folder|null>(null);
 const [message,setMessage]=useState<{error:boolean;text:string}|null>(null);
 const query=useQuery({queryKey:[endpoint,'workspace'],retry:false,staleTime:0,queryFn:async()=>{
  const [list,prefs]=await Promise.all([api<{items:Folder[]}>(endpoint+'/libraries'),api<{config:Preferences|null}>(endpoint+'/preferences')]);
  return {...list,...prefs};
 }});
 const folders=query.data?.items;
 useEffect(()=>{
  const element=dialog.current!;
  element.showModal();
  return ()=>element.close();
 },[]);
 useEffect(()=>{
  if(!query.data)return;
  const {items,config:savedConfig}=query.data;
  const available=new Set(items.map(folder=>folder.id));
  const previous:Preferences|null=savedConfig?{
   ...defaultTypography,...defaultSchedule,...savedConfig,english_enabled:savedConfig.english_enabled??false,english_titles:savedConfig.english_titles??{},
  }:null;
  const initial:Preferences=previous?{
   ...previous,libraries:previous.libraries.filter(id=>available.has(id)),
   english_titles:Object.fromEntries(Object.entries(previous.english_titles).filter(([id])=>available.has(id))),
  }:{...defaultTypography,...defaultSchedule,libraries:items.map(folder=>folder.id),template:'cinema',english_enabled:false,english_titles:{}};
  setConfig(current=>current??initial);
  setSaved(current=>current??previous);
 },[query.data]);
 function edit(next:Preferences){setConfig(next);setResults([]);setConfirm(null);setMessage(null);}
 const dirty=JSON.stringify(saved)!==JSON.stringify(config);
 async function save(){
  if(!config||busy)return;
  setBusy('save');setMessage(null);
  try{
   const english_titles=Object.fromEntries(Object.entries(config.english_titles).map(([id,value])=>[id,value.trim()]).filter(([,value])=>value));
   const result=await api<{config:Preferences}>(endpoint+'/preferences','PUT',{...config,english_titles});
   setSaved(result.config);setConfig(result.config);
   setMessage({error:false,text:'配置已保存，可以生成预览。'});
  }catch(error){setMessage({error:true,text:(error as Error).message});}
  finally{setBusy('');}
 }
 async function generate(){
  if(!saved||!folders||busy||dirty)return;
  setTab('preview');setBusy('preview');setResults([]);setMessage(null);
  const selected=folders.filter(folder=>saved.libraries.includes(folder.id));
  const count=artworkCount[saved.template];
  try{
   await loadCoverTitleFont(saved.title_font);
   for(const [index,folder] of selected.entries()){
    setProgress('正在生成 '+(index+1)+' / '+selected.length+'：'+folder.name);
    let state:CoverState|undefined;
    try{
     state=await api<CoverState>(route(folder.id)+'/state');
     const sources=await automaticArt(folder,count);
     const subtitle=saved.english_enabled?(saved.english_titles[folder.id]||defaultEnglish(folder.name)):'';
     const src=await withArtwork(sources,images=>renderCover(folder.name,saved.template,images,1,'image/png',subtitle,saved));
     setResults(current=>[...current,{folder,state,src}]);
    }catch(error){setResults(current=>[...current,{folder,state,error:(error as Error).message}]);}
   }
  }catch(error){setMessage({error:true,text:(error as Error).message});}
  finally{setBusy('');setProgress('');}
 }
 const eligible=results.filter(result=>result.src&&result.state&&!result.outcome);
 async function sync(){
  if(!eligible.length||busy||dirty)return;
  setTab('preview');setConfirm(null);setBusy('sync');setMessage(null);
  let succeeded=0;
  try{
   for(const [index,result] of eligible.entries()){
    setProgress('正在同步 '+(index+1)+' / '+eligible.length+'：'+result.folder.name);
    let outcome:string, state=result.state;
    try{
     await api(route(result.folder.id)+'/apply','POST',{confirmed:true,expected:state!.revision,image:result.src!.split(',')[1]});
     outcome='已同步';succeeded++;
    }catch(error){outcome='未确认同步：'+(error as Error).message;}
    try{state=await api<CoverState>(route(result.folder.id)+'/state');}catch{state=undefined;}
    setResults(current=>current.map(item=>item.folder.id===result.folder.id?{...item,state,outcome}:item));
   }
   setMessage({error:succeeded!==eligible.length,text:'同步完成：成功 '+succeeded+' / '+eligible.length+' 个媒体库。'});
  }finally{setBusy('');setProgress('');}
 }
 async function restore(folder:Folder){
  setConfirm(null);setBusy('restore');setMessage(null);
  let state:CoverState|undefined, outcome='';
  try{
   state=await api<CoverState>(route(folder.id)+'/state');
   await api(route(folder.id)+'/restore','POST',{confirmed:true,expected:state.revision});
   outcome='已恢复原图';
  }catch(error){outcome='恢复失败：'+(error as Error).message;}
  finally{
   try{state=await api<CoverState>(route(folder.id)+'/state');}catch{state=undefined;}
   const next={folder,state,outcome};
   setResults(current=>current.some(row=>row.folder.id===folder.id)?
    current.map(row=>row.folder.id===folder.id?next:row):[...current,next]);
   setBusy('');
  }
 }
 const stage=!config?'loading':dirty?'save':!saved?.libraries.length?'select':tab==='preview'&&eligible.length?'sync':'preview';
 const stageLabel={loading:'等待配置',save:'保存配置',select:'选择媒体库',sync:'确认同步（'+eligible.length+'）',preview:'生成预览'}[stage];
 const busyLabel:Record<string,string>={save:'保存中…',preview:'生成中…',sync:'同步中…',restore:'恢复中…'};
 function nextStep(){
  if(stage==='save')void save();
  else if(stage==='select')setTab('config');
  else if(stage==='preview')void generate();
  else if(stage==='sync'){setTab('preview');setConfirm('sync');}
 }
 return <dialog ref={dialog} className="emby-cover-dialog emby-library-cover" aria-labelledby="library-cover-heading" onCancel={event=>{event.preventDefault();if(!busy)close();}}>
  <div className="dialog-head"><div><h2 id="library-cover-heading">媒体库封面</h2></div><button type="button" className="icon-button" aria-label="关闭媒体库封面" disabled={!!busy} onClick={close}><X/></button></div>
  <div className="dialog-body emby-cover-batch">
   {query.isError?<><p className="error" role="alert">{query.error.message}</p><Link to="/settings/emby" onClick={close}>检查 Emby 连接设置</Link></>:
    !config||!folders?<Loading label="正在读取媒体库和封面配置…"/>:<>
    <nav className="emby-cover-tabs" aria-label="封面工作台">
     {([['style','风格'],['config','设置'],['preview','预览']] as const).map(([key,label])=><button key={key} type="button" aria-current={tab===key?'page':undefined} onClick={()=>setTab(key)}>{label}{key==='preview'&&results.length>0&&<span>{results.length}</span>}</button>)}
     {dirty&&<span className="emby-cover-dirty">未保存</span>}
    </nav>
    {tab==='config'&&<div className="emby-cover-settings">
    <div className="emby-cover-section-head"><h3>媒体库 <small className="muted">{config.libraries.length} / {folders.length}</small></h3><div className="toolbar"><button disabled={!!busy} onClick={()=>edit({...config,libraries:folders.map(folder=>folder.id)})}>全选</button><button disabled={!!busy} onClick={()=>edit({...config,libraries:[]})}>清空</button></div></div>
    <div className="emby-cover-library-grid">{folders.map(folder=><label key={folder.id}><input type="checkbox" disabled={!!busy} checked={config.libraries.includes(folder.id)} onChange={event=>edit({...config,libraries:event.target.checked?[...config.libraries,folder.id]:config.libraries.filter(id=>id!==folder.id)})}/><span>{folder.name}</span></label>)}</div>
    <fieldset className="emby-cover-typography" disabled={!!busy}>
     <legend>封面字体与字号</legend>
     <div className="emby-cover-typography-grid">
      <label>中文标题字体<select value={config.title_font} onChange={event=>edit({...config,title_font:event.target.value as CoverTypography['title_font']})}>{Object.entries(titleFonts).map(([value,option])=><option key={value} value={value}>{option.label}</option>)}</select></label>
      <label>中文标题字号 <output>{config.title_size} px</output><input aria-label="中文标题字号" type="range" min={56} max={156} value={config.title_size} onChange={event=>edit({...config,title_size:event.target.valueAsNumber})}/></label>
      <label>英文副标题字体<select value={config.subtitle_font} onChange={event=>edit({...config,subtitle_font:event.target.value as CoverTypography['subtitle_font']})}>{Object.entries(subtitleFonts).map(([value,option])=><option key={value} value={value}>{option.label}</option>)}</select></label>
      <label>英文副标题字号 <output>{config.subtitle_size} px</output><input aria-label="英文副标题字号" type="range" min={22} max={72} value={config.subtitle_size} onChange={event=>edit({...config,subtitle_size:event.target.valueAsNumber})}/></label>
     </div>
     
    </fieldset>
    <section className="emby-cover-english">
     <label className="switch-row"><span><b>显示英文副标题</b></span><input type="checkbox" role="switch" disabled={!!busy} checked={config.english_enabled} onChange={event=>edit({...config,english_enabled:event.target.checked})}/></label>
     {config.english_enabled&&<details><summary>自定义各库英文名</summary><div className="emby-cover-library-grid">
      {folders.filter(folder=>config.libraries.includes(folder.id)).map(folder=><label className="emby-cover-english-field" key={folder.id}>{folder.name}<input type="text" disabled={!!busy} maxLength={100} value={config.english_titles[folder.id]??''} placeholder={defaultEnglish(folder.name)||'未匹配，留空则不显示'} onChange={event=>edit({...config,english_titles:{...config.english_titles,[folder.id]:event.target.value}})}/></label>)}
     </div></details>}
    </section>
    {!folders.length&&<p className="muted">Emby 未返回媒体库。</p>}
    <section className="emby-cover-schedule">
     <label className="switch-row"><span><b>定时更新</b></span><input type="checkbox" role="switch" disabled={!!busy} checked={config.schedule_enabled} onChange={event=>edit({...config,schedule_enabled:event.target.checked})}/></label>
     <div className="emby-cover-schedule-value"><span>更新策略</span><code>{config.update_cron}</code><small>每小时整点</small></div>
    </section>
    </div>}
    {tab==='style'&&
    <fieldset disabled={!!busy} className="emby-library-template-gallery">
     <legend>封面风格</legend>
     <div className="emby-library-templates">{choices.map(style=><button type="button" key={style} aria-pressed={config.template===style} onClick={()=>edit({...config,template:style})}>
      <img className="emby-template-thumb" src={"/emby-cover-previews/"+style+".webp"} alt="" width={640} height={360}/>
      <span className="emby-template-caption"><b>{templates[style].name}</b>{config.template===style&&<Check size={16} aria-hidden="true"/>}</span>

     </button>)}</div>
    </fieldset>}
    {tab==='preview'&&<div className="emby-cover-results-pane">
    {progress&&<p role="status">{progress}</p>}
    {!results.length&&!progress&&<p className="muted">尚无预览</p>}
    {!!results.length&&!!eligible.length&&!busy&&!confirm&&<button className="emby-preview-refresh" type="button" onClick={()=>void generate()}>重新生成</button>}
    <div className="emby-cover-preview-grid">{results.map(result=><article key={result.folder.id}>
     <b>{result.folder.name}</b>
     {result.src&&<img src={result.src} alt={result.folder.name+' 封面预览'}/>}
     {result.error&&<small className="error">{result.error}</small>}
     {result.outcome&&<small>{result.outcome}</small>}
    </article>)}</div>
    <details className="emby-cover-restore"><summary>恢复原图</summary><div className="toolbar">{folders.map(folder=><button key={folder.id} disabled={!!busy} onClick={()=>setConfirm(folder)}>{folder.name}</button>)}</div></details>
    </div>}
   </>}
  </div>
  <div className="dialog-foot emby-cover-stage-footer">
   {message&&<p className={message.error?'error':'muted'} role={message.error?'alert':'status'}>{message.text}</p>}
   {confirm?<div className="emby-cover-stage-confirm" role="group" aria-label="确认封面操作">
    <b>{confirm==='sync'?'同步 '+eligible.length+' 个媒体库？':'恢复「'+confirm.name+'」的原封面？'}</b>
    <button type="button" onClick={()=>setConfirm(null)}>取消</button>
    <button type="button" className="primary" onClick={()=>void (confirm==='sync'?sync():restore(confirm))}>{confirm==='sync'?'确认同步':'确认恢复'}</button>
   </div>:<button type="button" className="primary" disabled={!!busy||stage==='loading'} onClick={nextStep}>{busyLabel[busy]||stageLabel}</button>}
  </div>
 </dialog>;
}
