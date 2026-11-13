import {Search} from 'lucide-react';
import {useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {useQuery,useInfiniteQuery,useQueryClient} from '@tanstack/react-query';
import {api} from './api';
import {MediaCard,type CardMedia} from './MediaCard';
import {Loading} from './Loading';
type Item=CardMedia&{emby_id:string;overview:string};
export function LibraryPage(){
 const {id}=useParams();
 return id?<LibraryItem id={id}/>:<LibraryBrowse/>;
}
function LibraryBrowse(){
 const cache=useQueryClient();
 const admin=cache.getQueryData<{user:{role:string}}>(['session'])?.user.role==='admin';
 const [view,setView]=useState(''),[draft,setDraft]=useState(''),[q,setQ]=useState(''),[activating,setActivating]=useState(false),[error,setError]=useState('');
 const config=useQuery({queryKey:['emby'],enabled:admin,queryFn:()=>api<{user_template_id?:string;cache_interval_minutes?:number;enabled:boolean;server:string;api_key_configured:boolean;refresh_after_output:boolean}>('/settings/emby')});
 const views=useQuery({queryKey:['library-views'],queryFn:()=>api<{items:{id:string;name:string;type:string}[]}>('/library/views')});
 const feed=useInfiniteQuery({queryKey:['library-items',view,q],enabled:!!views.data,initialPageParam:0,queryFn:({pageParam})=>api<{items:Item[];total:number;start:number;limit:number}>('/library/items?parent='+encodeURIComponent(view)+'&q='+encodeURIComponent(q)+'&start='+pageParam),getNextPageParam:last=>last.start+last.limit<last.total?last.start+last.limit:undefined});
 const items=feed.data?.pages.flatMap(x=>x.items)||[];
 return <><div className="page-title"><div><h1>媒体库</h1><p className="subtitle">浏览已入库的电影与剧集</p></div>{admin&&<Link to="/settings/emby" className="text-link">连接设置 →</Link>}</div><form className="library-search toolbar" onSubmit={e=>{e.preventDefault();setQ(draft.trim());}}><input value={draft} onChange={e=>setDraft(e.target.value)} aria-label="搜索Emby媒体库" placeholder="在Emby媒体库中搜索" maxLength={100}/><button className="primary"><Search size={16}/>搜索</button></form>{views.error?<div className="notice"><p>{views.error.message}</p>{config.data?.api_key_configured&&!config.data.enabled&&<button className="primary" disabled={activating} onClick={async()=>{setActivating(true);setError('');try{await api('/settings/emby','PUT',{user_template_id:config.data!.user_template_id??'',cache_interval_minutes:config.data!.cache_interval_minutes??60,enabled:true,server:config.data!.server,refresh_after_output:config.data!.refresh_after_output,api_key:null});await cache.invalidateQueries({queryKey:['emby']});await cache.invalidateQueries({queryKey:['library-views']});await cache.invalidateQueries({queryKey:['overview']});await cache.invalidateQueries({queryKey:['catalog-library-status']});}catch(e){setError((e as Error).message);}finally{setActivating(false);}}}>{activating?<Loading kind="compact" label="启用中…"/>:'启用并读取已保存的Emby连接'}</button>}{error&&<p className="error">{error}</p>}{admin&&<Link className="text-link" to="/settings/emby">配置Emby连接 →</Link>}</div>:views.isPending?<Loading label="正在读取Emby分类…"/>:<><div className="catalog-filters"><button className={!view?'selected':''} onClick={()=>setView('')}>全部媒体</button>{views.data?.items.map(x=><button key={x.id} className={view===x.id?'selected':''} onClick={()=>setView(x.id)}>{x.name}</button>)}</div>{feed.isPending?<Loading kind="posters" count={10}/>:<div className="media-grid">{items.map(item=><MediaCard key={item.emby_id} film={item} to={item.tmdb_id?undefined:'/library/'+item.emby_id}/>)}</div>}{feed.error&&<p className="error">{feed.error.message}</p>}{!feed.isPending&&!feed.error&&items.length===0&&<div className="empty">该分类暂无影视。</div>}{feed.hasNextPage&&<div className="load-more"><button disabled={feed.isFetchingNextPage} onClick={()=>feed.fetchNextPage()}>{feed.isFetchingNextPage?<Loading kind="compact" label="加载中…"/>:'加载更多'}</button></div>}</>}</>;
}
function LibraryItem({id}:{id:string}){
 const item=useQuery({queryKey:['library-item',id],queryFn:()=>api<Item>('/library/items/'+id)});
 return <><Link className="back-link" to="/library">← 返回媒体库</Link>{item.isPending?<Loading count={4}/>:item.error?<p className="error">{item.error.message}</p>:item.data&&<section className="emby-item-detail"><div><MediaCard film={item.data} to={'/library/'+id}/></div><div><span className="detail-kicker">EMBY LIBRARY</span><h1>{item.data.title}</h1><p className="subtitle">{item.data.year} · 已入库</p><h2>剧情简介</h2><p className="film-overview">{item.data.overview||'Emby未提供简介。'}</p></div></section>}</>;
}
