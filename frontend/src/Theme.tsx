import {useSyncExternalStore} from 'react';

type Theme='light'|'dark'|'system';
const key='yingxu-theme';
const system=matchMedia('(prefers-color-scheme: dark)');
const listeners=new Set<()=>void>();
function read():Theme{
 try{const value=localStorage.getItem(key);if(value==='dark'||value==='system')return value;}catch{/* storage may be disabled */}
 return 'light';
}
let selected=read();
function apply(){
 const dark=selected==='dark'||(selected==='system'&&system.matches);
 document.documentElement.dataset.theme=dark?'dark':'light';
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#141c29':'#f8faff');
}
function update(value:Theme){
 selected=value;apply();listeners.forEach(fn=>fn());
}
system.addEventListener('change',()=>{if(selected==='system')apply();});
window.addEventListener('storage',e=>{if(e.key===key||e.key===null)update(read());});
apply();
function subscribe(fn:()=>void){listeners.add(fn);return ()=>{listeners.delete(fn);};}
export function ThemeChooser({className=''}:{className?:string}){
 const value=useSyncExternalStore(subscribe,()=>selected);
 return <label className={'theme-chooser '+className}>主题<select value={value} onChange={e=>{
  const theme=e.target.value as Theme;
  try{localStorage.setItem(key,theme);}catch{/* still apply for this page */}
  update(theme);
 }}><option value="light">浅色</option><option value="dark">深色</option><option value="system">跟随系统</option></select></label>;
}
