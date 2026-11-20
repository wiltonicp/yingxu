import {Activity,Clapperboard,HardDrive,LibraryBig,PlaySquare,Tv} from 'lucide-react';
import {useQuery} from '@tanstack/react-query';
import {Link} from 'react-router-dom';
import {api} from './api';

type Capacity={total:number;used:number};
type Insights={
 library:{status:'ready';movies:number;series:number;episodes:number}|{status:'unavailable'|'unconfigured'};
 system:{cpu_percent:number|null;memory:Capacity|null;disk:(Capacity&{free:number})|null};
};
const count=new Intl.NumberFormat('zh-CN');
function capacity(bytes:number){
 return bytes>=1024**4?(bytes/1024**4).toFixed(1)+' TiB':bytes>=1024**3?(bytes/1024**3).toFixed(1)+' GiB':Math.round(bytes/1024**2)+' MiB';
}
function Meter({label,value,detail}:{label:string;value:number|null;detail?:string}){
 return <div className="overview-meter">
  <div><span>{label}</span><b>{value===null?'—':Math.round(value)+'%'}</b></div>
  {value!==null?<meter min={0} max={100} value={value} aria-label={label}/>:<span className="overview-meter-track" aria-hidden="true"/>}
  {detail&&<small>{detail}</small>}
 </div>;
}
const ratio=(value:Capacity|null|undefined)=>value&&value.total?Math.min(100,Math.max(0,100*value.used/value.total)):null;

export function OverviewInsights(){
 const query=useQuery({queryKey:['overview-insights'],queryFn:()=>api<Insights>('/overview/insights'),refetchInterval:30000,retry:false});
 const stats=query.data?.library,system=query.data?.system,disk=system?.disk;
 const ready=stats?.status==='ready';
 return <>
  <section className="panel overview-library-module" aria-labelledby="overview-library-title">
   <div className="overview-module-head"><h2 id="overview-library-title"><span className="overview-module-icon tone-violet"><LibraryBig size={18} aria-hidden="true"/></span>媒体库统计</h2><Link className="text-link" to={stats?.status==="unconfigured"?"/settings/emby":"/library"}>{stats?.status==="unconfigured"?"连接 Emby":"媒体库"} →</Link></div>
   <div className="overview-library-stats">
    {([['电影',ready?stats.movies:null,Clapperboard,'movies'],['剧集',ready?stats.series:null,Tv,'series'],['单集',ready?stats.episodes:null,PlaySquare,'archived']] as const).map(([label,value,Icon,tone])=>
     <div key={label}><span className={'overview-stat-icon stat-'+tone}><Icon size={21} aria-hidden="true"/></span><strong>{value===null?'—':count.format(value)}</strong><span>{label}</span></div>)}
   </div>
  </section>
  <div className="overview-usage-grid">
   <section className="panel overview-usage-module"><div className="overview-module-head"><h2><span className="overview-module-icon tone-sky"><Activity size={18} aria-hidden="true"/></span>系统占用</h2></div>
    <Meter label="CPU" value={system?.cpu_percent??null}/>
    <Meter label="内存" value={ratio(system?.memory)} detail={system?.memory?capacity(system.memory.used)+' / '+capacity(system.memory.total):undefined}/>
   </section>
   <section className="panel overview-usage-module overview-disk"><div className="overview-module-head"><h2><span className="overview-module-icon tone-mint"><HardDrive size={18} aria-hidden="true"/></span>磁盘占用</h2></div>
    <Meter label="映序数据卷" value={ratio(disk)} detail={disk?capacity(disk.used)+' / '+capacity(disk.total):undefined}/>
    {disk&&<div className="overview-disk-free"><strong>{capacity(disk.free)}</strong><span>可用空间</span></div>}
   </section>
  </div>
 </>;
}
