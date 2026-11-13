import {useEffect,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {Shuffle} from 'lucide-react';
import {api} from './api';
type FeaturedFilm={media_type:string;tmdb_id:string;title?:string;score?:number|null};
export function DiscoveryBackdrop({films}:{films:FeaturedFilm[]}){
 const cache=useQueryClient(),[selected,setSelected]=useState<FeaturedFilm|null>(null);
 const pool=[...new Map(films.filter(x=>x.tmdb_id&&['movie','tv'].includes(x.media_type)).map(x=>[x.media_type+':'+x.tmdb_id,x])).values()].sort((a,b)=>(b.score||0)-(a.score||0)).slice(0,10);
 function choose(){const previous=selected?selected.media_type+':'+selected.tmdb_id:cache.getQueryData<string>(['discover-last-featured']);const options=pool.filter(x=>x.media_type+':'+x.tmdb_id!==previous);const next=(options.length?options:pool)[Math.floor(Math.random()*(options.length||pool.length))];if(next){setSelected(next);cache.setQueryData(['discover-last-featured'],next.media_type+':'+next.tmdb_id);}}
 useEffect(()=>{if(!selected&&pool.length)choose();},[films,selected]);
 const detail=useQuery({queryKey:['media-detail','tmdb',selected?.media_type,selected?.tmdb_id],queryFn:()=>api<{backdrop?:string;title:string}>('/catalog/details/'+selected!.media_type+'/'+selected!.tmdb_id),enabled:!!selected,staleTime:30*60*1000,refetchOnWindowFocus:false,retry:false});
 const image=detail.data?.backdrop;
 return <div className="discovery-backdrop discovery-featured-background" data-featured={selected?.tmdb_id||''} data-background-state={detail.isError?'error':image?'ready':'loading'}>{image&&<picture className="discovery-featured-picture" key={image}><source media="(max-width:640px)" srcSet={'https://image.tmdb.org/t/p/w780'+image}/><source media="(min-width:1440px), (min-width:800px) and (min-resolution:2dppx)" srcSet={'https://image.tmdb.org/t/p/original'+image}/><img className="discovery-featured-image" src={'https://image.tmdb.org/t/p/w1280'+image} alt="" aria-hidden="true" decoding="async" fetchPriority="high" draggable={false} referrerPolicy="no-referrer" onError={e=>{e.currentTarget.style.visibility='hidden';}}/></picture>}<div className="discovery-cinema-shade" aria-hidden="true"/>{selected&&<div className="discovery-featured-footer"><span>{detail.isError?'背景图暂未加载':'精选背景 · '+(detail.data?.title||selected.title||'影视')}</span>{pool.length>1&&<button type="button" onClick={choose} aria-label="换一张影视背景"><Shuffle size={13}/><span>换一张</span></button>}</div>}</div>;
}
