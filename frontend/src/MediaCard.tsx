import {mediaBadges,type Completion} from './mediaBadges';
import {useEffect,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {useQueryClient} from '@tanstack/react-query';
import {discoveryViewKey,type DiscoveryView} from './discoveryNavigation';
import {Check,Clapperboard,Star} from 'lucide-react';
import {type Media} from './api';
export type CardMedia=Media&{score?:number|null;poster_url?:string;poster_source?:string;in_library?:boolean;subscribed?:boolean;completion?:Completion;source_label?:string;emby_id?:string;external_url?:string|null};
export function MediaCard({film,to}:{film:CardMedia;to?:string}){
 const [failed,setFailed]=useState(false);
 const location=useLocation(),cache=useQueryClient(),fromDiscovery=location.pathname==='/discover',returnTo=location.pathname+location.search;
 function remember(){if(fromDiscovery)cache.setQueryData<DiscoveryView>(discoveryViewKey(returnTo),old=>({...old,scrollY:window.scrollY}));}
 const badges=mediaBadges(film.media_type,!!film.in_library,!!film.subscribed,film.completion);
 const image=film.poster_url||(film.poster?'https://image.tmdb.org/t/p/w342'+film.poster:'');
 useEffect(()=>{setFailed(false);},[image]);
 const external=film.external_url&&/^https?:\/\//.test(film.external_url)?film.external_url:null;
 const content=<><div className="media-card-art">{image&&!failed?<img src={image} alt={film.title} title={film.poster_source==='tmdb'?'影视封面来自TMDB':undefined} loading="lazy" onError={()=>setFailed(true)}/>:<div className="media-card-placeholder"><Clapperboard size={28}/><span>{film.title}</span>{failed&&<small>封面暂不可用</small>}</div>}<span className="media-type-tag">{film.media_type==='movie'?'电影':'电视剧'}</span>{typeof film.score==='number'&&film.score>0&&<span className="media-score-tag"><Star size={11} fill="currentColor"/>{film.score.toFixed(1)}</span>}{(film.in_library||film.subscribed)&&<div className="media-status-tags">{film.in_library&&<span className="media-owned-tag" title={badges.description}><Check size={11}/>{badges.owned}</span>}{film.subscribed&&<span className="media-owned-tag media-subscribed-tag" title={badges.description}><Check size={11}/>{badges.subscription}</span>}</div>}<span className="media-hover-overlay" aria-hidden="true"/></div><div className="media-card-caption"><h3 title={film.title}>{film.title}</h3><small>{film.year||'年份未提供'}<span>·</span><span className="media-caption-score">{typeof film.score==='number'&&film.score>0?<><Star size={11}/>{film.score.toFixed(1)} 分</>:'暂无评分'}</span></small></div></>;
 return <article className="media-card">{external?<a href={external} target="_blank" rel="noopener noreferrer" className="media-card-link" aria-label={'在Emby新标签页打开'+film.title}>{content}</a>:<Link to={to||('/media/'+film.media_type+'/'+film.tmdb_id)} state={fromDiscovery?{discoverReturn:returnTo,fromDiscovery:true}:undefined} onClick={remember} className="media-card-link" aria-label={'查看'+film.title+'详情'}>{content}</Link>}</article>;
}
