import {CastStrip} from './CastStrip';
import {DiscoveryBackdrop} from './DiscoveryBackdrop';
import {mediaBadges} from './mediaBadges';
import {MediaResources} from './Re0Pages';
import {useDiscoveryScroll,discoveryViewKey,isDiscoveryUrl,type DiscoveryView} from './discoveryNavigation';
import {useState,useLayoutEffect,type ReactNode} from 'react';
import {Link,useParams,useSearchParams,useLocation,useNavigate} from 'react-router-dom';
import {useQuery,useInfiniteQuery,useQueries,useQueryClient} from '@tanstack/react-query';
import {api,type Media,type Subscription,type MediaRequest} from './api';
import {Loading} from './Loading';
import {MediaCard} from './MediaCard';
import {Search,X,Star,Check,ArrowLeft,BookmarkPlus} from 'lucide-react';
type Film=Media&{douban_id?:string;poster_url?:string;identity_unresolved?:boolean;source_url?:string;overview:string;score:number|null;in_library?:boolean;source_label?:string};
type Detail=Film&{genres:string[];runtime:number|null;seasons?:number;episodes?:number;backdrop?:string;original_title?:string;status?:string;tagline?:string;countries?:string[];cast:{name:string;character:string;profile?:string}[]};
type Open=(s:{title:string;body:ReactNode;action:()=>Promise<unknown>;label?:string})=>void;
function Art({movie}:{movie:Media&{poster_url?:string}}){return <div className="poster">{movie.poster_url||movie.poster?<img src={movie.poster_url||('https://image.tmdb.org/t/p/w342'+movie.poster)} alt={movie.title} loading="lazy"/>:<div className="poster-placeholder"><b>{movie.title}</b><small>{movie.year}</small></div>}</div>;}
export function DiscoverPage(){
 const [params,setParams]=useSearchParams();
 const location=useLocation(),cache=useQueryClient();
 const savedView=cache.getQueryData<DiscoveryView>(discoveryViewKey(location.pathname+location.search));
 const category=params.get('category')||'all',source=params.get('source')||'tmdb',search=params.get('q')||'',genre=params.get('genre')||'',region=params.get('region')||'',year=params.get('year')||'',sort=params.get('sort')||'popular';
 const [draft,setDraft]=useState(savedView?.draft??search),[olderYears,setOlderYears]=useState(savedView?.olderYears??false);
 function change(updates:Record<string,string>){const next=new URLSearchParams(params);Object.entries(updates).forEach(([k,v])=>v?next.set(k,v):next.delete(k));setParams(next,{replace:true});}
 const sources=useQuery({queryKey:['catalog-sources'],queryFn:()=>api<{items:{id:string;name:string;enabled:boolean}[]}>('/catalog/sources')});
 type Feed={items:Film[];page:number;total_pages:number;total_results?:number|null;warning?:string};
 const query=new URLSearchParams({source,category,q:search,genre,region,year,sort}).toString();
 const feed=useInfiniteQuery({queryKey:['catalog-feed',query],initialPageParam:1,staleTime:10*60*1000,gcTime:60*60*1000,refetchOnMount:false,queryFn:({pageParam})=>api<Feed>('/catalog/browse?'+query+'&page='+pageParam),getNextPageParam:last=>last.page<last.total_pages?last.page+1:undefined});
 useDiscoveryScroll(!feed.isPending,draft,olderYears);
 const rawFilms=[...new Map((feed.data?.pages.flatMap(x=>x.items)||[]).map(x=>[x.douban_id?'douban:'+x.douban_id:x.media_type+':'+x.tmdb_id,x])).values()];
 type DoubanIdentity={media_type:string;douban_id:string;tmdb_id:string;poster:string;state:string};
 const doubanKeys=source==='douban'?rawFilms.filter(x=>x.douban_id).map(x=>x.media_type+':'+x.douban_id):[];
 const identityChunks=Array.from({length:Math.ceil(doubanKeys.length/60)},(_,i)=>doubanKeys.slice(i*60,i*60+60));
 const identities=useQueries({queries:identityChunks.map(ids=>({queryKey:['douban-identities',ids.join(',')],queryFn:()=>api<{items:DoubanIdentity[];pending:boolean}>('/catalog/douban-identities?ids='+encodeURIComponent(ids.join(','))),retry:false,refetchOnWindowFocus:false,staleTime:30000,refetchInterval:(q:{state:{data?:{pending:boolean}}})=>q.state.data?.pending?1500:false}))});
 const identityMap=new Map(identities.flatMap(x=>x.data?.items||[]).map(x=>[x.media_type+':'+x.douban_id,x]));
 const films=rawFilms.map(film=>{const identity=film.douban_id?identityMap.get(film.media_type+':'+film.douban_id):null;return identity?{...film,tmdb_id:identity.tmdb_id||film.tmdb_id,...(identity.poster?{poster:identity.poster,poster_url:'https://image.tmdb.org/t/p/w342'+identity.poster,poster_source:'tmdb'}:{})}:film;});
 const keys=films.filter(x=>x.tmdb_id).map(x=>x.media_type+':'+x.tmdb_id),chunks=Array.from({length:Math.ceil(keys.length/60)},(_,i)=>keys.slice(i*60,i*60+60));
 const library=useQueries({queries:chunks.map(ids=>({queryKey:['catalog-library-status',ids.join(',')],queryFn:()=>api<{present:string[];error?:string}>('/catalog/library-status?ids='+encodeURIComponent(ids.join(','))),staleTime:60000,refetchInterval:30000}))});
 const subscriptions=useQuery({queryKey:['subscriptions'],queryFn:()=>api<Subscription[]>('/subscriptions'),refetchInterval:15000});
 const subscribed=new Set(subscriptions.data?.filter(x=>x.followers>0).map(x=>x.media.media_type+':'+x.media.tmdb_id));
 const progressByMedia=new Map(subscriptions.data?.filter(x=>x.followers>0).map(x=>[x.media.media_type+':'+x.media.tmdb_id,x.completion]));
 const present=new Set(library.flatMap(x=>x.data?.present||[]));
 const categories=search?[['all','全部影视'],['movie','电影'],['tv','剧集']]:source==='douban'?[['movie','电影'],['tv','剧集'],['animation','动漫'],['documentary','纪录片'],['variety','综艺'],['japanese','日剧']]:[['all','为你推荐'],['movie','电影'],['tv','剧集'],['animation','动漫'],['documentary','纪录片'],['variety','综艺'],['japanese','日剧']];
 const first=feed.data?.pages[0],filterCount=[genre,region,year,sort!=='popular'?sort:''].filter(Boolean).length;
 const genreOptions=[['drama','剧情'],['comedy','喜剧'],['action','动作'],['scifi','科幻'],['animation','动画'],['documentary','纪录片'],['mystery','悬疑'],['crime','犯罪'],['family','家庭']];
 const regionOptions=[['CN','中国大陆'],['US','美国'],['JP','日本'],['KR','韩国'],['GB','英国'],['FR','法国'],['HK','中国香港'],['TW','中国台湾'],['IN','印度']];
 function preference(key:string,value:string){change({[key]:value,...(category==='all'?{category:'movie'}:{}),...(category==='japanese'&&key==='region'&&value!=='JP'?{category:'tv'}:{})});}
 return <><section className="discovery-cinema-hero"><DiscoveryBackdrop films={films}/><div className="discovery-hero-content"><div className="page-title"><div><h1>发现下一部好故事。</h1><p className="subtitle">从热门推荐到你的偏好，让想看的每一部都有去处。</p></div></div>
 <form className="catalog-search" onSubmit={e=>{e.preventDefault();change({q:draft.trim(),source:draft.trim()?'tmdb':source,category:year?'movie':['all','movie','tv'].includes(category)?category:'all',genre:'',region:'',sort:'popular'});}}><Search size={20}/><input aria-label="搜索电影或剧集" placeholder="搜索电影、剧集" value={draft} onChange={e=>setDraft(e.target.value)} maxLength={100}/>{draft&&<button type="button" className="icon-button" aria-label="清空影视搜索" onClick={()=>{setDraft('');change({q:''});}}><X size={18}/></button>}<button className="primary">搜索</button></form>
 <p className="catalog-search-hint">关键词搜索使用TMDB；豆瓣提供独立推荐、评分与偏好筛选。</p></div></section>
 <section className="expanded-filters" aria-label="影视偏好筛选"><div className="expanded-filter-heading"><span>探索偏好{filterCount?' · '+filterCount+' 项':''}</span><button className="text-link" onClick={()=>{change({genre:'',region:'',year:'',sort:'popular'});setOlderYears(false);}}>重置筛选</button></div>
 <FilterRow label="来源" options={(sources.data?.items||[{id:'tmdb',name:'TMDB',enabled:true},{id:'douban',name:'豆瓣',enabled:true}]).map(x=>[x.id,x.name])} value={source} onChange={value=>{setDraft('');change({source:value,q:'',category:'movie'});}}/>
 <FilterRow label="类别" options={categories} value={category} onChange={value=>change({category:value,genre:'',...(value==='japanese'?{region:'JP'}:{}),...(value==='all'?{year:''}:{})})}/>
 <FilterRow label="类型" options={[["","全部"],...genreOptions]} value={genre} disabled={!!search} onChange={value=>preference('genre',value)}/>
 <FilterRow label="地区" options={[["","全部"],...regionOptions]} value={region} disabled={!!search} onChange={value=>preference('region',value)}/>
 <FilterRow label="年份" options={[["","全部"],...Array.from({length:olderYears?new Date().getFullYear()-1899:12},(_,i)=>String(new Date().getFullYear()-i)).map(y=>[y,y]),...(!olderYears&&year&&Number(year)<new Date().getFullYear()-11?[[year,year]]:[])]} value={year} disabled={!!search&&category==='all'} onChange={value=>preference('year',value)} trailing={<button type="button" className="filter-older-years" onClick={()=>setOlderYears(!olderYears)} aria-expanded={olderYears}>{olderYears?'收起早期年份':'更早年份'} {olderYears?'−':'＋'}</button>}/>
 <FilterRow label="排序" options={[["popular","近期热度"],["rating","高分优先"],["newest","最新上映"]]} value={sort} disabled={!!search} onChange={value=>preference('sort',value)}/>
 {search&&<small>关键词结果按相关性排列；清空搜索后可使用完整偏好筛选。</small>}{sources.error&&<p className="error">{sources.error.message}</p>}</section>
 <div className="catalog-result-heading"><span>{search?'“'+search+'” 的搜索结果':(source==='douban'?'豆瓣':'TMDB')+' · 精选影视'}</span>{first&&<small>已显示 {films.length} 部 · 已加载 {feed.data?.pages.length} / {first.total_pages} 页{typeof first.total_results==='number'?' · 共 '+first.total_results+' 条':''}</small>}</div>
 {feed.error&&<div className="error" role="alert">{feed.error.message}<button onClick={()=>feed.refetch()}>重试</button></div>}{first?.warning&&<p className="notice">{first.warning}</p>}
 {feed.isPending?<Loading kind="posters" count={12} label="正在读取影视…"/>:<div className="media-grid">{films.map(film=><MediaCard key={film.douban_id?'douban:'+film.douban_id:film.media_type+film.tmdb_id} film={{...film,in_library:present.has(film.media_type+':'+film.tmdb_id),subscribed:subscribed.has(film.media_type+':'+film.tmdb_id),completion:progressByMedia.get(film.media_type+':'+film.tmdb_id)}} to={film.douban_id?'/douban/'+film.media_type+'/'+film.douban_id:undefined}/>)}</div>}
 {source==='douban'&&identities.some(x=>x.error||x.data?.items.some(item=>item.state==='error'))&&<p className="muted">部分豆瓣影视的身份或封面核对失败，推荐与评分仍为豆瓣数据；进入详情可重试。</p>}
 {library.some(x=>x.error||x.data?.error)&&<p className="muted library-status-note">部分入库状态暂未核对，已确认的标识仍保留。</p>}{subscriptions.error&&<p className="muted">订阅状态读取失败，请刷新核对。</p>}
 {!feed.isPending&&!feed.error&&!films.length&&<div className="empty">没有找到匹配影视，试试其他条件。</div>}
 {feed.isFetchingNextPage&&<Loading kind="posters" count={6} label="正在加载更多影视…"/>}{films.length>0&&<div className="load-more"><button disabled={!feed.hasNextPage||feed.isFetchingNextPage} onClick={()=>feed.fetchNextPage()}>{feed.isFetchingNextPage?<Loading kind="compact" label="正在加载…"/>:feed.hasNextPage?'加载更多影视':'本轮结果已加载完毕'}</button></div>}
 </>;
}

function FilterRow({label,options,value,onChange,disabled=false,trailing}:{label:string;options:string[][];value:string;onChange:(value:string)=>void;disabled?:boolean;trailing?:ReactNode}){
 return <div className="expanded-filter-row"><span className="expanded-filter-label">{label}</span><div className="expanded-filter-options" role="group" aria-label={label}>{options.map(([key,text])=><button key={key} type="button" className={'filter-chip'+(key===value?' selected':'')} aria-pressed={key===value} disabled={disabled} onClick={()=>onChange(key)}>{text}</button>)}{trailing}</div></div>;
}

export function MediaDetailPage({admin,open,busy,source='tmdb'}:{admin:boolean;open:Open;busy:boolean;source?:'tmdb'|'douban'}){
 const {kind,id}=useParams();
 const location=useLocation(),navigate=useNavigate(),cache=useQueryClient();
 const returnState=location.state as {discoverReturn?:unknown;fromDiscovery?:boolean}|null;
 const lastDiscovery=cache.getQueryData<string>(['discover-last-location']);
 const returnTo=isDiscoveryUrl(returnState?.discoverReturn)?returnState.discoverReturn:isDiscoveryUrl(lastDiscovery)?lastDiscovery:'/discover';
 useLayoutEffect(()=>{window.scrollTo(0,0);},[kind,id,source]);
 const [plotExpanded,setPlotExpanded]=useState(false);
 const [resourcesOpen,setResourcesOpen]=useState(false);
 const query=useQuery({queryKey:['media-detail',source,kind,id],queryFn:()=>api<Detail>((source==='douban'?'/catalog/douban/':'/catalog/details/')+kind+'/'+id)});
 const subscriptions=useQuery({queryKey:['subscriptions'],queryFn:()=>api<Subscription[]>('/subscriptions'),refetchInterval:5000});
 const requests=useQuery({queryKey:['requests'],enabled:!admin,queryFn:()=>api<MediaRequest[]>('/requests'),refetchInterval:5000});
 const canonical=query.data?.tmdb_id||'';
 const owned=useQuery({queryKey:['catalog-library-status',kind+':'+canonical],enabled:!!canonical,queryFn:()=>api<{present:string[]}>('/catalog/library-status?ids='+kind+':'+canonical),refetchInterval:10000});
 if(query.error)return <p className="error">{query.error.message}</p>;
 if(!query.data)return <Loading label="正在读取影视详情…" count={5}/>;
 const film=query.data,subscribed=subscriptions.data?.some(x=>x.media.media_type===film.media_type&&x.media.tmdb_id===film.tmdb_id&&(admin||x.mine)),inLibrary=owned.data?.present.includes(film.media_type+':'+film.tmdb_id);
 const detailProgress=subscriptions.data?.find(x=>x.media.media_type===film.media_type&&x.media.tmdb_id===film.tmdb_id&&(admin||x.mine))?.completion;
 const badges=mediaBadges(film.media_type,!!inLibrary,!!subscribed,detailProgress);
 const pending=!admin&&requests.data?.some(x=>x.status==='pending'&&x.media.media_type===film.media_type&&x.media.tmdb_id===film.tmdb_id);
 const stateNames:Record<string,string>={Released:'已上映','Returning Series':'播出中',Ended:'已完结','In Production':'制作中',Planned:'计划中','Post Production':'后期制作',Canceled:'已取消'};
 return <div className="media-detail-page"><Link className="detail-back text-link" to={returnTo} onClick={e=>{if(returnState?.fromDiscovery&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey&&e.button===0&&(window.history.state?.idx??0)>0){e.preventDefault();navigate(-1);}}}><ArrowLeft size={16}/>返回影视发现</Link><section className="detail-hero">{film.backdrop&&<div className="detail-backdrop" style={{backgroundImage:'url(https://image.tmdb.org/t/p/w1280'+film.backdrop+')'}}/>}<div className="detail-cover"><Art movie={film}/></div><div className="detail-summary"><div className="detail-information"><div className="detail-badges"><span>{film.media_type==='movie'?'电影':'电视剧'}</span><span>{film.year||'年份待定'}</span>{inLibrary&&<span className="detail-owned" title={badges.description}><Check size={13}/>{badges.owned}</span>}</div><h1>{film.title}</h1>{film.original_title&&film.original_title!==film.title&&<p className="detail-original">{film.original_title}</p>}{film.tagline&&<p className="detail-tagline">{film.tagline}</p>}<div className="detail-facts"><div><small>{source==='douban'?'豆瓣评分':'TMDB评分'}</small><b className="detail-rating"><Star size={18} fill="currentColor"/>{typeof film.score==='number'&&film.score>0?film.score.toFixed(1):'暂无'}</b></div><div><small>{film.media_type==='movie'?'片长':'季 / 集'}</small><b>{film.media_type==='movie'?(film.runtime?film.runtime+' 分钟':'未公布'):(film.seasons??'—')+' 季 / '+(film.episodes??'—')+' 集'}</b></div><div><small>状态</small><b>{stateNames[film.status||'']||film.status||'未公布'}</b></div></div><div className="detail-genres">{film.genres.map(x=><span key={x}>{x}</span>)}</div><div className="detail-actions"><button className="primary" disabled={busy||subscribed||pending||!film.tmdb_id} onClick={()=>{open({title:(admin?'订阅：':'申请订阅：')+film.title,body:<><p>{admin?'加入持续追踪，匹配频道资源后进入转存队列。':'批准后开始追踪，你可在我的订阅里取消自己的关注。'}</p></>,action:()=>api(admin?'/subscriptions':'/requests','POST',{media_type:film.media_type,tmdb_id:film.tmdb_id,title:film.title,year:film.year,poster:film.poster,...(admin?{}:{reason:''})})});}}><BookmarkPlus size={17}/>{subscribed?badges.subscription:pending?'申请审核中':admin?'订阅追踪':'申请订阅'}</button>{subscribed&&<Link to="/subscriptions" className="button-link">管理订阅</Link>}{admin&&<button className="re0-secondary" disabled={!film.tmdb_id} onClick={()=>{setResourcesOpen(true);setTimeout(()=>document.getElementById("media-resources")?.scrollIntoView({behavior:"smooth",block:"start"}),80);}}>搜索资源</button>}</div>{!film.tmdb_id&&<p className="notice">尚未唯一核对TMDB身份，暂不自动订阅。<Link className="text-link" to={'/discover?q='+encodeURIComponent(film.title)+'&category='+film.media_type+'&source=tmdb'}>搜索并选择正确影视 →</Link></p>}<small className="detail-id">{source==='douban'?'豆瓣 · '+id+' / TMDB · ':'TMDB · '}{film.tmdb_id||'待核对'}{badges.description?' · '+badges.description:inLibrary?' · 媒体库已有此影视':''}</small></div><section className="detail-synopsis"><h2>剧情简介</h2><p className={'detail-synopsis-text'+(plotExpanded?' expanded':'')}>{film.overview||(source==='douban'?'豆瓣':'TMDB')+'暂未提供简介。'}</p>{film.overview.length>140&&<button className="detail-plot-toggle" type="button" aria-expanded={plotExpanded} onClick={()=>setPlotExpanded(!plotExpanded)}>{plotExpanded?'收起简介':'展开完整简介'}</button>}{!!film.countries?.length&&<small className="detail-countries">制片地区 · {film.countries.join(' / ')}</small>}{film.cast.length>0&&<CastStrip key={film.media_type+film.tmdb_id} actors={film.cast}/>}</section></div></section>{admin&&resourcesOpen&&<MediaResources key={film.media_type+film.tmdb_id} kind={film.media_type} tid={film.tmdb_id}/>}</div>;
}
