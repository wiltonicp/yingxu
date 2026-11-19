import './OverviewDashboard.css';
import {ManualProcessingTasks} from './ManualProcessing';
import {Link} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {ArrowRight,List,CheckCheck,Archive,Bookmark,CloudDownload,ScanSearch,LibraryBig,RefreshCw,Search,Film} from 'lucide-react';
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
  ['完成入库',data.counts.completed,'/processing/output',LibraryBig,'library'],
 ] as const):[];
 return <div className="overview-dashboard">
  <section className="dashboard-hero" aria-labelledby="dashboard-title"><div>
   <div className="dashboard-runtime"><i data-running={automationActive}/>{!data?'正在读取运行状态':automationActive?'自动化运行中':'自动化已暂停'}</div>
   <h1 id="dashboard-title">影视工作台</h1><p>从发现、订阅到入库，在这里查看每一步进展。</p>
   <div className="dashboard-hero-actions"><Link className="button-link primary" to="/discover"><Search size={16}/>发现影视</Link><Link className="button-link" to="/jobs">查看任务<ArrowRight size={15}/></Link></div>
  </div><button type="button" className="dashboard-refresh" disabled={query.isFetching} onClick={()=>void query.refetch()}><RefreshCw size={16}/>{query.isFetching?'更新中…':'刷新总览'}</button><Film className="dashboard-hero-art" aria-hidden="true"/></section>
  {query.error&&<p className="error">{query.error.message}</p>}
  {query.isPending?<Loading count={4} label="正在读取工作空间…"/>:data&&<>
   <DashboardMetrics metrics={metrics}/>
   {data.counts.pending_requests>0&&<div className="overview-review"><CheckCheck size={21}/><div><b>{data.counts.pending_requests} 项订阅待审核</b><small>批准后匹配频道新增消息及历史档案。</small></div><Link className="button-link" to="/requests">查看审核</Link></div>}
 <div className="overview-grid"><section><div className="page-title"><div><h2>最近入库</h2></div><Link className="text-link" to="/library">查看媒体库 →</Link></div>{data.emby_error&&<p className="error">{data.emby_error}</p>}{data.poster_warning&&<p className="muted">{data.poster_warning}</p>}{data.recent.length?<div className="media-grid overview-media-grid">{data.recent.map(film=><MediaCard key={film.emby_id||film.file_id} film={{...film,in_library:true,source_label:data.recent_source==='emby'?'Emby':'映序'}} to={!film.tmdb_id&&film.emby_id?'/library/'+film.emby_id:undefined}/>)}</div>:<div className="panel empty dashboard-library-empty"><span className="dashboard-metric-icon"><LibraryBig size={22}/></span><strong>暂无最近入库</strong><p>{data.recent_source==='emby'?'Emby暂无最近入库影视。':'暂无已完成的入库记录；可连接Emby展示现有媒体。'}</p><Link className="text-link" to="/settings/emby">配置Emby →</Link></div>}</section>
 <aside className="overview-side"><section className="overview-queue"><div className="page-title"><h2>活动队列</h2><List size={18}/></div><div className="overview-queue-body"><ManualProcessingTasks showSummary/>{data.jobs.length?data.jobs.map(job=><div className="overview-job" key={job.id}><div><b>{job.title}</b><small>任务 #{job.id} · {new Date(job.updated_at*1000).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}</small></div><span className="badge">{statuses[job.status]||job.status}</span></div>):<p className="muted">当前没有转存任务。</p>}<Link className="text-link" to="/jobs">查看全部任务 →</Link></div></section>
 <section className="overview-connections"><h2>连接与运行</h2><div className="overview-connection"><span>115 网盘</span><Link to="/settings/drive115">{data.connections.drive115_session_saved?'会话已保存':'去扫码授权'}</Link></div><div className="overview-connection"><span>TMDB</span><Link to="/settings/tmdb">{data.connections.tmdb_last_check?.ok?'上次检查通过':data.connections.tmdb_configured?'已保存配置':'待配置'}</Link></div><div className="overview-connection"><span>频道来源</span><Link to="/channels">{data.runtime.configured_channels} 个频道</Link></div><div className="overview-connection"><span>整理任务</span><Link to="/processing">{data.runtime.organizer_running?'正在整理':data.runtime.scheduler_status==='disabled'?'定时关闭':'查看运行状态'}</Link></div></section></aside></div></>}
 </div>;
}


export function PersonalOverviewPage(){
 const subs=useQuery({queryKey:['subscriptions'],queryFn:()=>api<Subscription[]>('/subscriptions')});
 const requests=useQuery({queryKey:['requests'],queryFn:()=>api<MediaRequest[]>('/requests')});
 const recent=useQuery({queryKey:['my-library-latest'],queryFn:()=>api<{items:(Media&{emby_id:string;external_url?:string;poster_url?:string;score?:number})[]}>('/library/latest'),retry:false});
 return <div className="overview-dashboard personal-dashboard">
  <section className="dashboard-hero" aria-labelledby="personal-dashboard-title"><div>
   <div className="dashboard-runtime">我的影视空间</div>
   <h1 id="personal-dashboard-title">我的影视工作台</h1><p>查看订阅进展、申请结果和媒体库最新影视。</p>
   <div className="dashboard-hero-actions"><Link className="button-link primary" to="/discover"><Search size={16}/>发现影视</Link><Link className="button-link" to="/library">浏览媒体库<ArrowRight size={15}/></Link></div>
  </div><Film className="dashboard-hero-art" aria-hidden="true"/></section>
  <DashboardMetrics metrics={[
   ['我的订阅',subs.data?.length??'—','/subscriptions',Bookmark,'subscription'],
   ['等待审核',requests.data?.filter(x=>x.status==='pending').length??'—','/requests',ScanSearch,'attention'],
   ['已通过申请',requests.data?.filter(x=>x.status==='approved').length??'—','/requests',CheckCheck,'library'],
  ]}/>
  {(subs.error||requests.error)&&<p className="error">{(subs.error||requests.error)?.message}</p>}
  <section><div className="page-title"><h2>我的订阅</h2><Link className="text-link" to="/subscriptions">管理订阅 →</Link></div>
   {subs.isPending?<Loading kind="posters" count={4}/>:subs.data?.length?<div className="media-grid">{subs.data.slice(0,8).map(x=><MediaCard key={x.id} film={{...x.media,subscribed:true}}/>)}</div>:!subs.error&&<div className="panel empty dashboard-library-empty"><span className="dashboard-metric-icon"><Bookmark size={22}/></span><strong>还没有订阅</strong><Link className="text-link" to="/discover">发现影视 →</Link></div>}
  </section>
  <section><div className="page-title"><h2>媒体库最近更新</h2><Link className="text-link" to="/library">查看媒体库 →</Link></div>
   {recent.isPending?<Loading kind="posters" count={4}/>:recent.error?<p className="notice">{recent.error.message}</p>:recent.data?.items.length?<div className="media-grid">{recent.data.items.map(x=><MediaCard key={x.emby_id} film={x}/>)}</div>:<div className="panel empty dashboard-library-empty"><span className="dashboard-metric-icon"><LibraryBig size={22}/></span><strong>你的媒体库暂无影视</strong></div>}
  </section>
 </div>;
}
