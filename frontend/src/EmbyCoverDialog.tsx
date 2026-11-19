import {useEffect,useRef,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Link} from 'react-router-dom';
import {ImagePlus,Search,X} from 'lucide-react';
import {api} from './api';
import {Loading} from './Loading';
import './embyCover.css';

type CoverItem={emby_id:string;title:string;year?:string;media_type:'movie'|'tv'};
type ItemsPage={items:CoverItem[];total:number;start:number;limit:number};
const templates={
 cinema:{label:'影院暗金',start:'#0b111b',end:'#371d14',accent:'#f3c879'},
 frost:{label:'冷调青蓝',start:'#071d30',end:'#103f52',accent:'#9defff'},
};
type Template=keyof typeof templates;

function linesFor(context:CanvasRenderingContext2D,text:string,width:number){
 const lines:string[]=[];
 let line='';
 for(const character of text.trim()){
  if(line&&context.measureText(line+character).width>width){
   lines.push(line.trimEnd());
   line=character.trimStart();
  }else line+=character;
 }
 if(line)lines.push(line);
 return lines;
}

async function generateCover(item:CoverItem,style:Template){
 const response=await fetch('/api/library/images/'+encodeURIComponent(item.emby_id));
 if(!response.ok)throw new Error('读取原封面失败，请确认该媒体已有 Emby 主图。');
 const artwork=await createImageBitmap(await response.blob());
 try{
  const canvas=document.createElement('canvas');
  canvas.width=600;
  canvas.height=900;
  const context=canvas.getContext('2d');
  if(!context)throw new Error('当前浏览器无法生成封面。');
  const palette=templates[style];
  const gradient=context.createLinearGradient(0,0,600,900);
  gradient.addColorStop(0,palette.start);
  gradient.addColorStop(1,palette.end);
  context.fillStyle=gradient;
  context.fillRect(0,0,600,900);
  const scale=Math.max(600/artwork.width,570/artwork.height);
  const width=artwork.width*scale,height=artwork.height*scale;
  context.save();
  context.beginPath();
  context.rect(0,0,600,570);
  context.clip();
  context.drawImage(artwork,(600-width)/2,(570-height)/2,width,height);
  context.restore();
  const shade=context.createLinearGradient(0,350,0,570);
  shade.addColorStop(0,'transparent');
  shade.addColorStop(1,palette.start);
  context.fillStyle=shade;
  context.fillRect(0,350,600,220);
  let size=54,lines:string[];
  do{
   context.font='700 '+size+'px system-ui, sans-serif';
   lines=linesFor(context,item.title,504);
   if(lines.length<=3||size===26)break;
   size-=2;
  }while(true);
  if(lines.length>3){
   lines=lines.slice(0,3);
   while(context.measureText(lines[2]+'…').width>504)lines[2]=lines[2].slice(0,-1);
   lines[2]+='…';
  }
  context.fillStyle=palette.accent;
  context.fillRect(48,586,54,4);
  context.fillStyle='#fff';
  lines.forEach((line,index)=>context.fillText(line,48,650+index*(size+9)));
  context.fillStyle=palette.accent;
  context.font='600 24px system-ui, sans-serif';
  context.fillText([item.media_type==='tv'?'剧集':'电影',item.year].filter(Boolean).join('  /  '),48,850);
  return canvas.toDataURL('image/png');
 }finally{artwork.close();}
}

export function EmbyCoverDialog({close}:{close:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [draft,setDraft]=useState('');
 const [search,setSearch]=useState<{text:string;start:number}|null>(null);
 const [selected,setSelected]=useState<CoverItem|null>(null);
 const [style,setStyle]=useState<Template>('cinema');
 const [preview,setPreview]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const results=useQuery({
  queryKey:['emby-cover-search',search?.text,search?.start],
  enabled:!!search,retry:false,
  queryFn:()=>api<ItemsPage>('/library/items?limit=8&start='+search!.start+'&q='+encodeURIComponent(search!.text)),
 });
 useEffect(()=>{
  const element=dialog.current!;
  element.showModal();
  return ()=>element.close();
 },[]);
 async function generate(){
  if(!selected||busy)return;
  setBusy(true);setError('');setPreview('');
  try{setPreview(await generateCover(selected,style));}
  catch(error){setError((error as Error).message);}
  finally{setBusy(false);}
 }
 return <dialog ref={dialog} className="emby-cover-dialog" aria-labelledby="emby-cover-title" onCancel={event=>{event.preventDefault();if(!busy)close();}}>
  <div className="dialog-head"><h2 id="emby-cover-title">Emby 封面生成</h2><button type="button" className="icon-button" aria-label="关闭 Emby 封面生成" disabled={busy} onClick={close}><X/></button></div>
  <div className="dialog-body emby-cover-workspace">
   <section className="emby-cover-controls" aria-label="选择媒体和模板">
    <p className="muted">从已连接的 Emby 搜索单部电影或剧集。当前只生成预览，不修改原封面。</p>
    <form className="emby-cover-search" onSubmit={event=>{event.preventDefault();if(draft.trim()){setSelected(null);setPreview('');setError('');setSearch({text:draft.trim(),start:0});}}}>
     <input aria-label="搜索媒体标题" placeholder="输入电影或剧集名称" value={draft} onChange={event=>setDraft(event.target.value)} maxLength={100} required disabled={busy}/>
     <button type="submit" disabled={busy||!draft.trim()}><Search size={16}/>搜索</button>
    </form>
    {search&&results.isFetching&&<Loading label="正在搜索 Emby…"/>}
    {results.isError&&<><p className="error" role="alert">{results.error.message}</p><Link to="/settings/emby" onClick={close}>检查 Emby 连接设置</Link></>}
    {results.data&&<><div className="emby-cover-results" aria-label="搜索结果">
     {!results.data.items.length&&<p className="muted">没有找到匹配的电影或剧集。</p>}
     {results.data.items.map(item=><button key={item.emby_id} type="button" disabled={busy} aria-pressed={selected?.emby_id===item.emby_id} onClick={()=>{setSelected(item);setPreview('');setError('');}}><b>{item.title}</b><small>{[item.media_type==='tv'?'剧集':'电影',item.year].filter(Boolean).join(' · ')}</small></button>)}
    </div><div className="emby-cover-pagination">
     {search&&search.start>0&&<button type="button" disabled={busy||results.isFetching} onClick={()=>setSearch({...search,start:search.start-8})}>上一页</button>}
     {search&&results.data.start+results.data.limit<results.data.total&&<button type="button" disabled={busy||results.isFetching} onClick={()=>setSearch({...search,start:search.start+8})}>下一页</button>}
    </div></>}
    <label>封面模板<select value={style} disabled={busy} onChange={event=>{setStyle(event.target.value as Template);setPreview('');setError('');}}>{Object.entries(templates).map(([key,value])=><option key={key} value={key}>{value.label}</option>)}</select></label>
    {selected&&<p className="emby-cover-selection">已选择：<b>{selected.title}</b></p>}
    {error&&<p className="error" role="alert">{error}</p>}
   </section>
   <figure className="emby-cover-preview">
    <figcaption>生成预览</figcaption>
    {preview?<img src={preview} alt={selected?.title+' 的生成封面'}/>:<div className="emby-cover-placeholder"><ImagePlus size={28}/><span>选片并生成后在此查看</span></div>}
   </figure>
  </div>
  <div className="dialog-foot"><button type="button" disabled={busy} onClick={close}>关闭</button><button className="primary" type="button" disabled={busy||!selected} onClick={()=>void generate()}>{busy?'生成中…':'生成预览'}</button></div>
 </dialog>;
}
