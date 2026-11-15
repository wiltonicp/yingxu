import {useEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,UserRound} from 'lucide-react';
type Actor={name:string;character:string;profile?:string};
export function CastStrip({actors}:{actors:Actor[]}){
 const ref=useRef<HTMLDivElement>(null),[edges,setEdges]=useState({overflow:false,left:false,right:false});
 useEffect(()=>{
  const el=ref.current;if(!el)return;
  const update=()=>{
   const track=el.querySelector<HTMLElement>('.hero-cast-track');if(!track)return;
   const style=getComputedStyle(el),gap=parseFloat(getComputedStyle(track).columnGap)||12;
   const available=el.clientWidth-(parseFloat(style.paddingLeft)||0)-(parseFloat(style.paddingRight)||0);
   const minimum=window.matchMedia('(max-width:640px)').matches?70:76;
   const visible=Math.max(1,Math.floor((available+gap)/(minimum+gap)));
   const width=actors.length>visible?(available-gap*(visible-1))/visible:minimum;
   el.style.setProperty('--cast-person-width',Math.max(minimum,width)+'px');
   setEdges({overflow:el.scrollWidth>el.clientWidth+2,left:el.scrollLeft>2,right:el.scrollLeft+el.clientWidth<el.scrollWidth-2});
  };
  const observer=new ResizeObserver(update);observer.observe(el);el.addEventListener('scroll',update,{passive:true});update();
  return()=>{observer.disconnect();el.removeEventListener('scroll',update);};
 },[actors]);
 function move(direction:number){
  const el=ref.current;if(!el)return;
  const person=el.querySelector<HTMLElement>('.hero-cast-person'),track=el.querySelector<HTMLElement>('.hero-cast-track');
  const step=(person?.getBoundingClientRect().width||76)+(track?parseFloat(getComputedStyle(track).columnGap)||12:12);
  const count=Math.max(1,Math.floor((el.clientWidth+12)/step));
  el.scrollBy({left:direction*count*step,behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});
 }

 return <section className="hero-cast-strip" aria-label="主要演员"><div className="hero-cast-heading"><h3>主要演员</h3><small>{actors.length} 位</small></div><div className={'hero-cast-frame'+(edges.overflow?' has-overflow':'')}>{edges.overflow&&<button className="cast-scroll-arrow" type="button" aria-label="查看前面的演员" disabled={!edges.left} onClick={()=>move(-1)}><ChevronLeft size={17}/></button>}<div ref={ref} className="hero-cast-viewport" tabIndex={0} aria-label="演员列表，可左右滚动" onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();move(e.key==='ArrowLeft'?-1:1);}}}><div className="hero-cast-track">{actors.map((person,index)=><div className="hero-cast-person" key={person.name+index}><div className="hero-cast-avatar">{person.profile?<img src={'https://image.tmdb.org/t/p/w185'+person.profile} alt="" loading="lazy" decoding="async" onError={e=>{e.currentTarget.style.visibility='hidden';}}/>:<UserRound size={23}/>}</div><b title={person.name}>{person.name}</b><small title={person.character}>{person.character||'演员'}</small></div>)}</div></div>{edges.overflow&&<button className="cast-scroll-arrow" type="button" aria-label="查看后面的演员" disabled={!edges.right} onClick={()=>move(1)}><ChevronRight size={17}/></button>}</div></section>;
}
