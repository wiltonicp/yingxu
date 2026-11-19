import {Monitor,Moon,Sun} from 'lucide-react';
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
export function ThemeChooser({className='',iconOnly=false}:{className?:string;iconOnly?:boolean}){
 const value=useSyncExternalStore(subscribe,()=>selected);
 const choose=(theme:Theme)=>{try{localStorage.setItem(key,theme);}catch{/* still apply for this page */}update(theme);};
 if(iconOnly){
  const Icon=value==='dark'?Moon:value==='system'?Monitor:Sun;
  const options=[['light','浅色',Sun],['dark','深色',Moon],['system','跟随系统',Monitor]] as const;
  return <div className={'header-theme-control '+className}>
   <button type="button" className="header-theme-icon" popoverTarget="header-theme-menu" aria-label="外观设置" title="外观设置"><Icon size={19} aria-hidden="true"/></button>
   <div popover="auto" id="header-theme-menu" className="header-theme-menu" role="group" aria-label="外观">
    <div className="header-theme-title">外观</div>
    <div className="header-theme-options">{options.map(([theme,label,OptionIcon])=><button key={theme} type="button" aria-pressed={value===theme} onClick={()=>choose(theme)}><OptionIcon size={19} aria-hidden="true"/><span>{label}</span></button>)}</div>
   </div>
  </div>;
 }
 return <label className={'theme-chooser '+className}>主题<select value={value} onChange={e=>choose(e.target.value as Theme)}><option value="light">浅色</option><option value="dark">深色</option><option value="system">跟随系统</option></select></label>;
}
