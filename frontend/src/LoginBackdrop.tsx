import {useEffect,useRef,useState} from 'react';
import backdrops from '../public/login-backdrops/backdrops.json';

const INTERVAL=5*60*1000;
function pick(exclude=-1){const choices=backdrops.map((_,i)=>i).filter(i=>i!==exclude);return choices[Math.floor(Math.random()*choices.length)];}
/** Bundled public artwork only. No private metadata credentials or login-time cloud requests. */
export function LoginBackdrop(){
 const [frame,setFrame]=useState(()=>({current:pick(),previous:null as number|null}));
 const [status,setStatus]=useState('loading'),index=useRef(frame.current);
 useEffect(()=>{
  let disposed=false,pending:HTMLImageElement|null=null;
  const timer=window.setInterval(()=>{
   if(document.hidden||pending)return;
   const next=pick(index.current),image=new Image();pending=image;
   image.onload=()=>{if(disposed||document.hidden){pending=null;return;}const previous=index.current;index.current=next;setFrame({current:next,previous});setStatus('ready');pending=null;};
   image.onerror=()=>{if(disposed)return;setStatus('error');pending=null;console.error('Login background could not load:',backdrops[next].src);};
   image.src=backdrops[next].src;
  },INTERVAL);
  return()=>{disposed=true;window.clearInterval(timer);if(pending){pending.onload=null;pending.onerror=null;pending=null;}};
 },[]);
 return <div className="desktop-login-backdrop" aria-hidden="true" data-background-state={status} data-background-id={backdrops[frame.current].tmdb_id}>
  {frame.previous!==null&&<img className="login-backdrop-previous" src={backdrops[frame.previous].src} alt="" draggable={false}/>}
  <img className="login-backdrop-current" key={frame.current} src={backdrops[frame.current].src} alt="" draggable={false} decoding="async" fetchPriority="high" onLoad={()=>setStatus('ready')} onError={()=>setStatus('error')}/>
 </div>;
}
