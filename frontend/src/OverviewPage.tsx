import {OverviewInsights} from './OverviewInsights';
import './OverviewDashboard.css';
import {ManualProcessingTasks} from './ManualProcessing';
import {Link} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {ArrowRight,List,CheckCheck,Archive,Bookmark,CloudDownload,ScanSearch,LibraryBig,RefreshCw,Search,Film,SlidersHorizontal,Plug,ScrollText,FileVideo} from 'lucide-react';
import {api,type Media,type Subscription,type MediaRequest} from './api';
import {Loading} from './Loading';
import {MediaCard} from './MediaCard';
type Overview={counts:{resources:number;subscriptions:number;queued:number;attention:number;completed:number;pending_requests:number};recent_source?:'local'|'emby';emby_error?:string;poster_warning?:string;recent:(Media&{file_id?:string;emby_id?:string;external_url?:string|null;poster_url?:string;score?:number|null;completed_at:number})[];jobs:{id:number;title:string;status:string;updated_at:number}[];runtime:{collector_running:boolean;configured_channels:number;transfer_status:string;organizer_running:boolean;scheduler_status:string};connections:{drive115_session_saved:boolean;tmdb_configured:boolean;tmdb_last_check?:{ok:boolean}}};
const statuses:Record<string,string>={queued:'等待转存',running:'正在转存',succeeded:'转存已核对',blocked:'待处理',failed:'执行失败',cancelled:'已取消',retry_wait:'等待重试'};
type DashboardMetric=readonly [string,number|string,string,typeof Archive,string];
function DashboardMetrics({metrics}:{metrics:readonly DashboardMetric[]}){
 return <section className="dashboard-metrics" aria-label="进度统计">{metrics.map(([label,count,to,Icon,tone])=>
  <Link className={'dashboard-metric dashboard-metric--'+tone} to={to} key={label}>
   <span className="dashboard-metric-icon"><Icon size={24} aria-hidden="true"/></span>
   <span className="dashboard-metric-copy"><strong>{count}</strong><span>{label}</span></span>
  </Link>
 )}</section>;
}
export function OverviewPage(){
 const query=useQuery({queryKey:['overview'],queryFn:()=>api<Overview>('/overview'),refetchInterval:10000});
 const data=query.data;
 const automationActive=!!data&&(data.runtime.collector_running||data.runtime.organizer_running||!['disabled','error'].includes(data.runtime.transfer_status)||!['disabled','error','stopped','blocked_tmdb'].includes(data.runtime.scheduler_status));
 const metrics=data?([
  ['资源归档',data.counts.resources,'/resources',Archive,'archive'],
  ['订阅追踪',data.counts.subscriptions,'/subscriptions',Bookmark,'subscription'],
  ['等待转存',data.counts.queued,'/jobs',CloudDownload,'transfer'],
  ['整理待确认',data.counts.attention,'/processing-records',ScanSearch,'attention'],

 ] as const):[];
 return <div className="overview-dashboard admin-overview-dashboard">
  <section className="overview-command" aria-labelledby="dashboard-title">
   <div className="overview-command-title">
    <h1 id="dashboard-title">影视工作台</h1>
    <span className="dashboard-runtime"><i data-running={automationActive}/>{!data?'正在读取':automationActive?'自动化运行中':'自动化已暂停'}</span>
   </div>
   <div className="overview-command-actions">
    <Link className="button-link button-soft" to="/discover"><Search size={16}/>发现影视</Link>
    <button type="button" className="icon-button overview-refresh" aria-label="刷新总览" title="刷新总览" disabled={query.isFetching} onClick={()=>void query.refetch()}><RefreshCw size={18}/></button>
   </div>
  </section>
  {query.error&&<p className="error">{query.error.message}</p>}
  {query.isPending?<Loading count={4} label="正在读取工作空间…"/>:data&&<>
   <DashboardMetrics metrics={metrics}/>
   {data.counts.pending_requests>0&&<div className="overview-review"><CheckCheck size={21}/><div><b>{data.counts.pending_requests} 项订阅待审核</b></div><Link className="button-link" to="/requests">查看审核</Link></div>}
   <div className="overview-module-grid">
   <OverviewInsights/>
   <section className="panel overview-recent-module"><div className="overview-module-head"><h2><span className="overview-module-icon tone-violet"><Film size={18} aria-hidden="true"/></span>最近入库</h2><Link className="text-link" to="/library">媒体库 <ArrowRight size={14}/></Link></div>{data.emby_error&&<p className="error">{data.emby_error}</p>}{data.poster_warning&&<p className="muted">{data.poster_warning}</p>}{data.recent.length?<div className="overview-recent-strip">{data.recent.map(film=><MediaCard key={film.emby_id||film.file_id} film={film} to={!film.tmdb_id&&film.emby_id?'/library/'+film.emby_id:undefined}/>)}</div>:<div className="panel empty dashboard-library-empty"><span className="dashboard-metric-icon"><LibraryBig size={22}/></span><strong>暂无最近入库</strong><p>{data.recent_source==='emby'?'Emby暂无最近入库影视。':'暂无已完成的入库记录；可连接Emby展示现有媒体。'}</p><Link className="text-link" to="/settings/emby">配置Emby →</Link></div>}</section>
 <section className="panel overview-queue"><div className="overview-module-head"><h2><span className="overview-module-icon tone-sky"><List size={18} aria-hidden="true"/></span>活动队列</h2><Link className="text-link" to="/jobs">全部任务 <ArrowRight size={14}/></Link></div><div className="overview-queue-body"><ManualProcessingTasks showSummary/>{data.jobs.length?data.jobs.map(job=><div className="overview-job" key={job.id}><div><b>{job.title}</b><small>任务 #{job.id} · {new Date(job.updated_at*1000).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}</small></div><span className="badge">{statuses[job.status]||job.status}</span></div>):<p className="overview-queue-empty"><CheckCheck size={16} aria-hidden="true"/>暂无转存任务</p>}</div></section>
   <nav className="overview-shortcuts" aria-label="常用操作">
    {([['整理设置','/processing',SlidersHorizontal,'violet'],['STRM 输出','/processing/output',FileVideo,'mint'],['连接设置','/settings',Plug,'sky'],['日志中心','/logs',ScrollText,'amber']] as const).map(([label,to,Icon,tone])=>
     <Link key={to} to={to}><span className={'overview-module-icon tone-'+tone}><Icon size={17} aria-hidden="true"/></span><b>{label}</b><ArrowRight size={15} aria-hidden="true"/></Link>)}
   </nav>
 </div></>}

 </div>;
}


export function PersonalOverviewPage(){
 const subs=useQuery({queryKey:['subscriptions'],queryFn:()=>api<Subscription[]>('/subscriptions')});
 const requests=useQuery({queryKey:['requests'],queryFn:()=>api<MediaRequest[]>('/requests')});
 const recent=useQuery({queryKey:['my-library-latest'],queryFn:()=>api<{items:(Media&{emby_id:string;external_url?:string;poster_url?:string;score?:number})[]}>('/library/latest'),retry:false});
 return <div className="overview-dashboard personal-dashboard">
  <section className="overview-command" aria-labelledby="personal-dashboard-title">
   <div className="overview-command-title"><h1 id="personal-dashboard-title">我的影视工作台</h1></div>
   <div className="overview-command-actions"><Link className="button-link button-soft" to="/discover"><Search size={16}/>发现影视</Link></div>
  </section>
  <DashboardMetrics metrics={[
   ['我的订阅',subs.data?.length??'—','/subscriptions',Bookmark,'subscription'],
   ['等待审核',requests.data?.filter(x=>x.status==='pending').length??'—','/requests',ScanSearch,'attention'],
   ['已通过申请',requests.data?.filter(x=>x.status==='approved').length??'—','/requests',CheckCheck,'library'],
  ]}/>
  {(subs.error||requests.error)&&<p className="error">{(subs.error||requests.error)?.message}</p>}
  <section className="panel personal-overview-module"><div className="overview-module-head"><h2><span className="overview-module-icon tone-violet"><Bookmark size={18} aria-hidden="true"/></span>我的订阅</h2><Link className="text-link" to="/subscriptions">管理订阅 →</Link></div>
   {subs.isPending?<Loading kind="posters" count={4}/>:subs.data?.length?<div className="personal-overview-rail">{subs.data.slice(0,8).map(x=><MediaCard key={x.id} film={{...x.media,subscribed:true}}/>)}</div>:!subs.error&&<div className="panel empty dashboard-library-empty"><span className="dashboard-metric-icon"><Bookmark size={22}/></span><strong>还没有订阅</strong><Link className="text-link" to="/discover">发现影视 →</Link></div>}
  </section>
  <section className="panel personal-overview-module"><div className="overview-module-head"><h2><span className="overview-module-icon tone-mint"><LibraryBig size={18} aria-hidden="true"/></span>媒体库最近更新</h2><Link className="text-link" to="/library">查看媒体库 →</Link></div>
   {recent.isPending?<Loading kind="posters" count={4}/>:recent.error?<p className="notice">{recent.error.message}</p>:recent.data?.items.length?<div className="personal-overview-rail personal-overview-latest">{recent.data.items.map(x=><MediaCard key={x.emby_id} film={x} hideOwnedBadge openInside to={"/library/"+encodeURIComponent(x.emby_id)}/>)}</div>:<div className="panel empty dashboard-library-empty"><span className="dashboard-metric-icon"><LibraryBig size={22}/></span><strong>你的媒体库暂无影视</strong></div>}
  </section>
 </div>;
}
