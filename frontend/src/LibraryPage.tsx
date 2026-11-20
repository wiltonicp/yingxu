import {uniqueLibraryItems} from './libraryItems';
import {ArrowLeft,Clapperboard,ExternalLink,Search,Star,UserRound,Play,Video,AudioLines,Captions} from 'lucide-react';
import './libraryDetail.css';
import {useState} from 'react';
import {Link,useLocation,useParams,useSearchParams} from 'react-router-dom';
import {useQuery,useInfiniteQuery,useQueryClient} from '@tanstack/react-query';
import {api} from './api';
import {MediaCard,type CardMedia} from './MediaCard';
import {Loading} from './Loading';
type Item=CardMedia&{emby_id:string;overview:string;runtime?:number|null;original_title?:string;rating?:string;tagline?:string;genres?:string[];studios?:string[];people?:{name:string;role:string;photo?:string}[];backdrop_url?:string;container?:string;streams?:Track[]};
type Track={type:"Video"|"Audio"|"Subtitle";codec?:string;language?:string;width?:number;height?:number;channels?:number;isdefault?:boolean;isforced?:boolean;bitrate?:number;profile?:string;videorange?:string;samplerate?:number;bitdepth?:number;displaytitle?:string};
type Chapter={id:string;title:string;index?:number|null;episode_count?:number|null;overview?:string;runtime?:number|null;image_url?:string|null;external_url?:string|null};
export function LibraryPage(){
 const {id}=useParams();
 return id?<LibraryItem id={id}/>:<LibraryBrowse/>;
}
function LibraryBrowse(){
 const cache=useQueryClient();
 const admin=cache.getQueryData<{user:{role:string}}>(['session'])?.user.role==='admin';
 const [params,setParams]=useSearchParams();
 const view=params.get('view')||'',q=params.get('q')||'';
 const [draft,setDraft]=useState(q),[activating,setActivating]=useState(false),[error,setError]=useState('');
 function filter(key:string,value:string){const next=new URLSearchParams(params);if(value)next.set(key,value);else next.delete(key);setParams(next,{replace:true});}
 const suffix=params.size?'?'+params.toString():'';
 const config=useQuery({queryKey:['emby'],enabled:admin,queryFn:()=>api<{user_template_id?:string;cache_interval_minutes?:number;enabled:boolean;server:string;api_key_configured:boolean;refresh_after_output:boolean}>('/settings/emby')});
 const views=useQuery({queryKey:['library-views'],staleTime:30000,queryFn:()=>api<{items:{id:string;name:string;type:string}[]}>('/library/views')});
 const feed=useInfiniteQuery({queryKey:['library-items',view,q],staleTime:30000,initialPageParam:0,queryFn:({pageParam})=>api<{items:Item[];total:number;start:number;limit:number}>('/library/items?parent='+encodeURIComponent(view)+'&q='+encodeURIComponent(q)+'&start='+pageParam),getNextPageParam:last=>last.start+last.limit<last.total?last.start+last.limit:undefined});
 const items=uniqueLibraryItems(feed.data?.pages.flatMap(x=>x.items)??[]);
 return <><div className="page-title"><div><h1>媒体库</h1><p className="subtitle">浏览已入库的电影与剧集</p></div>{admin&&<Link to="/settings/emby" className="text-link">连接设置 →</Link>}</div><form className="library-search toolbar" onSubmit={e=>{e.preventDefault();filter("q",draft.trim());}}><input value={draft} onChange={e=>setDraft(e.target.value)} aria-label="搜索Emby媒体库" placeholder="在Emby媒体库中搜索" maxLength={100}/><button className="primary"><Search size={16}/>搜索</button></form>{views.error?<div className="notice"><p>{views.error.message}</p>{config.data?.api_key_configured&&!config.data.enabled&&<button className="primary" disabled={activating} onClick={async()=>{setActivating(true);setError('');try{await api('/settings/emby','PUT',{user_template_id:config.data!.user_template_id??'',cache_interval_minutes:config.data!.cache_interval_minutes??60,enabled:true,server:config.data!.server,refresh_after_output:config.data!.refresh_after_output,api_key:null});await cache.invalidateQueries({queryKey:['emby']});await cache.invalidateQueries({queryKey:['library-views']});await cache.invalidateQueries({queryKey:['library-items']});await cache.invalidateQueries({queryKey:['overview']});await cache.invalidateQueries({queryKey:['catalog-library-status']});}catch(e){setError((e as Error).message);}finally{setActivating(false);}}}>{activating?<Loading kind="compact" label="启用中…"/>:'启用并读取已保存的Emby连接'}</button>}{error&&<p className="error">{error}</p>}{admin&&<Link className="text-link" to="/settings/emby">配置Emby连接 →</Link>}</div>:<><div className="catalog-filters"><button className={!view?'selected':''} onClick={()=>filter("view","")}>全部媒体</button>{views.data?.items.map(x=><button key={x.id} className={view===x.id?'selected':''} onClick={()=>filter("view",x.id)}>{x.name}</button>)}</div>{feed.isPending?<Loading kind="posters" count={10}/>:<div className="media-grid">{items.map(item=><MediaCard key={item.emby_id} film={item} hideOwnedBadge openInside to={'/library/'+encodeURIComponent(item.emby_id)+suffix}/>)}</div>}{feed.error&&<p className="error">{feed.error.message}</p>}{!feed.isPending&&!feed.error&&items.length===0&&<div className="empty">该分类暂无影视。</div>}{feed.hasNextPage&&<div className="load-more"><button disabled={feed.isFetchingNextPage} onClick={()=>feed.fetchNextPage()}>{feed.isFetchingNextPage?<Loading kind="compact" label="加载中…"/>:'加载更多'}</button></div>}</>}</>;
}
function LibraryItem({id}:{id:string}){
 const {search}=useLocation();
 const cache=useQueryClient();
 const params=new URLSearchParams(search);
 const fromList=()=>cache.getQueryData<{pages:{items:Item[]}[]}>(['library-items',params.get('view')||'',params.get('q')||''])
  ?.pages.flatMap(page=>page.items).find(row=>row.emby_id===id);
 const item=useQuery({queryKey:['library-item',id],queryFn:()=>api<Item>('/library/items/'+encodeURIComponent(id)),placeholderData:fromList,staleTime:30000,retry:false});
 return <div className="library-detail">
  <Link className="library-detail-back text-link" to={'/library'+search}><ArrowLeft size={17}/>媒体库</Link>
  {item.isPending?<Loading count={4}/>:item.error?<div className="notice"><p className="error" role="alert">{item.error.message}</p><button type="button" onClick={()=>void item.refetch()}>重试</button></div>:item.data&&<LibraryDetailContent key={item.data.emby_id} item={item.data} partial={item.isPlaceholderData}/>}
 </div>;
}

function LibraryDetailContent({item,partial}:{item:Item;partial:boolean}){
 const [failed,setFailed]=useState(false),[expanded,setExpanded]=useState(false);
 const poster=item.poster_url||(item.poster?'https://image.tmdb.org/t/p/w500'+item.poster:'');
 const showPoster=!!poster&&!failed;
 const [backdropFailed,setBackdropFailed]=useState(false);
 const backdrop=item.backdrop_url&&!backdropFailed?item.backdrop_url:null;
 const external=!partial&&item.external_url&&/^https?:\/\//i.test(item.external_url)?item.external_url:null;
 const description=item.overview?.trim();
 return <>
  <section className="library-detail-hero" aria-labelledby="library-detail-title">
   {backdrop?<img className="library-detail-ambient library-detail-backdrop" fetchPriority="low" src={backdrop} alt="" aria-hidden="true" onError={()=>setBackdropFailed(true)}/>:showPoster&&<img className="library-detail-ambient" src={poster} alt="" aria-hidden="true"/>}
   <div className="library-detail-poster">{showPoster?<img src={poster} alt={item.title+'海报'} onError={()=>setFailed(true)}/>:<Clapperboard size={42} aria-hidden="true"/>}</div>
   <div className="library-detail-identity">
    <span className="library-detail-type">{item.media_type==='tv'?'剧集':'电影'}</span>
    <h1 id="library-detail-title">{item.title}</h1>
    {item.original_title&&item.original_title!==item.title&&<p className="library-detail-original">{item.original_title}</p>}
    <ul className="library-detail-meta" aria-label="影视信息">
     {item.year&&<li>{item.year}</li>}{item.rating&&<li className="library-detail-rating">{item.rating}</li>}
     {!!item.runtime&&<li>{item.runtime} 分钟</li>}
     {typeof item.score==='number'&&item.score>0&&<li className="library-detail-score"><Star size={15} fill="currentColor" aria-hidden="true"/>Emby 评分 {item.score.toFixed(1)}</li>}
    </ul>
    {!!item.genres?.length&&<div className="library-detail-genres">{item.genres.slice(0,6).map(genre=><span key={genre}>{genre}</span>)}</div>}
    {external&&<a href={external} target="_blank" rel="noopener noreferrer" className="library-detail-emby button-link primary"><ExternalLink size={17}/>在 Emby 打开</a>}
   </div>
    <section className="library-hero-overview" aria-labelledby="library-detail-overview">
     <h2 id="library-detail-overview">剧情简介</h2>{item.tagline&&<strong>{item.tagline}</strong>}
     {description?<p id="library-detail-copy" className={description.length>165&&!expanded?'library-detail-clamped':''}>{description}</p>:<p>暂无简介</p>}
     {!!description&&description.length>165&&<button type="button" aria-expanded={expanded} aria-controls="library-detail-copy" onClick={()=>setExpanded(!expanded)}>{expanded?'收起简介':'展开简介'}</button>}
    </section>
  </section>
  {partial&&<Loading kind="compact" label="正在补充影视资料…"/>}
  {!partial&&item.media_type==='tv'&&<LibraryEpisodes series={item.emby_id}/>}
  {!!item.people?.length&&<section className="library-detail-summary"><h2>演职人员</h2><div className="library-detail-rail library-people-rail">{item.people.map((person,i)=><article key={person.name+i}><LibraryArtwork src={person.photo} person/><b>{person.name}</b>{person.role&&<small>{person.role}</small>}</article>)}</div></section>}
  {(!!item.studios?.length||!!item.streams?.length)&&<section className="library-detail-summary library-detail-specs">
   {!!item.studios?.length&&<><h2>制作与发行</h2><p>{item.studios.join(' · ')}</p></>}
   {!!item.streams?.length&&<LibraryTracks streams={item.streams} container={item.container}/>}
  </section>}
 </>;
}

const streamTypes=[['Video','视频',Video],['Audio','音轨',AudioLines],['Subtitle','字幕',Captions]] as const;
const streamLanguages:Record<string,string>={eng:'英语',en:'英语',chi:'中文',zho:'中文',zh:'中文',jpn:'日语',ja:'日语',kor:'韩语',ko:'韩语'};
function codecName(codec?:string){
 const name=codec?.toLowerCase();
 return name?({hevc:'HEVC / H.265',h264:'AVC / H.264',av1:'AV1',truehd:'Dolby TrueHD',eac3:'Dolby Digital Plus',ac3:'Dolby Digital',dts:'DTS',aac:'AAC',pgssub:'PGS',subrip:'SRT'} as Record<string,string>)[name]||codec!.toUpperCase():null;
}
function LibraryTracks({streams,container}:{streams:Track[];container?:string}){
 return <div className="library-spec-section">
  <div className="library-spec-head"><h2>媒体规格</h2>{container&&<span>{container.toUpperCase()}</span>}</div>
  <div className="library-spec-grid">{streamTypes.map(([kind,label,Icon])=>{
   const rows=streams.filter(track=>track.type===kind);
   return !!rows.length&&<section className="library-spec-group" key={kind}>
    <h3><Icon size={18} aria-hidden="true"/>{label}<small>{rows.length}</small></h3>
    {rows.map((track,i)=>{
     const format=codecName(track.codec);
     const fields=[
      track.language&&['语言',streamLanguages[track.language.toLowerCase()]||track.language],
      track.width&&track.height&&['分辨率',track.width+' × '+track.height],
      track.videorange&&['动态范围',track.videorange],
      track.profile&&['配置',track.profile],
      track.channels&&['声道',String(track.channels)],
      track.samplerate&&['采样率',(track.samplerate/1000).toLocaleString()+' kHz'],
      track.bitdepth&&['位深',track.bitdepth+' bit'],
      track.bitrate&&['码率',(track.bitrate/1000).toLocaleString(undefined,{maximumFractionDigits:1})+' kbps'],
     ].filter((entry):entry is string[]=>Array.isArray(entry));
     return <div className="library-spec-track" key={i}>
      <div><b>{format||track.displaytitle||label+' '+(i+1)}</b>{track.isdefault&&<small>默认</small>}{track.isforced&&<small>强制</small>}</div>
      {!!fields.length&&<dl>{fields.map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>}
     </div>;
    })}
   </section>;
  })}</div>
 </div>;
}
function LibraryArtwork({src,person=false}:{src?:string|null;person?:boolean}){
 const [failure,setFailure]=useState('');
 return <div className="library-rail-art">{src&&src!==failure?<img src={src} alt="" loading="lazy" decoding="async" fetchPriority="low" onError={()=>setFailure(src)}/>:person?<UserRound size={28} aria-hidden="true"/>:<Clapperboard size={28} aria-hidden="true"/>}</div>;
}

function LibraryEpisodes({series}:{series:string}){
 const base='/library/items/'+encodeURIComponent(series);
 const seasons=useQuery({queryKey:['library-seasons',series],queryFn:()=>api<{items:Chapter[]}>(base+'/seasons'),retry:false});
 const [chosen,setChosen]=useState(''),[episodeId,setEpisodeId]=useState('');
 const season=seasons.data?.items.find(item=>item.id===chosen)||seasons.data?.items[0];
 const episodes=useQuery({queryKey:['library-episodes',series,season?.id],enabled:!!season,queryFn:()=>api<{items:Chapter[]}>(base+'/seasons/'+encodeURIComponent(season!.id)+'/episodes'),retry:false});
 const episode=episodes.data?.items.find(item=>item.id===episodeId);
 if(seasons.isPending)return <Loading kind="compact" label="正在读取播出季…"/>;
 if(seasons.isError)return <p className="error" role="alert">{seasons.error.message}</p>;
 if(!season)return null;
 return <section className="library-detail-summary">
  <h2>播出季</h2>
  <div className="library-detail-rail library-seasons-rail">{seasons.data.items.map(row=><button type="button" key={row.id} aria-pressed={row.id===season.id} onClick={()=>{setChosen(row.id);setEpisodeId('');}}><LibraryArtwork src={row.image_url}/><b>{row.index===0?'特别篇':row.title}</b>{row.episode_count!=null&&<small>{row.episode_count} 集</small>}</button>)}</div>
  <h3>{season.index===0?'特别篇':season.title} · 剧集</h3>
  {episodes.isPending?<Loading kind="compact" label="正在读取剧集…"/>:episodes.isError?<p className="error" role="alert">{episodes.error.message}</p>:episodes.data.items.length?
   <div className="library-detail-rail library-episodes-rail">{episodes.data.items.map(row=><button type="button" key={row.id} aria-pressed={row.id===episodeId} onClick={()=>setEpisodeId(row.id===episodeId?'':row.id)}><LibraryArtwork src={row.image_url}/><b>{row.index!=null?'第 '+row.index+' 集 · ':''}{row.title}</b>{!!row.runtime&&<small>{row.runtime} 分钟</small>}</button>)}</div>:<p className="muted">这一季暂无可浏览的剧集</p>}
  {episode&&<article className="library-episode-detail"><h3>{episode.title}</h3>{episode.overview&&<p>{episode.overview}</p>}{episode.external_url&&/^https?:\/\//i.test(episode.external_url)&&<a href={episode.external_url} target="_blank" rel="noopener noreferrer" className="text-link"><Play size={16}/>在 Emby 打开这一集</a>}</article>}
 </section>;
}