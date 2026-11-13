import {useLayoutEffect,useRef} from 'react';
import {useLocation} from 'react-router-dom';
import {useQueryClient} from '@tanstack/react-query';

export type DiscoveryView={scrollY:number;draft?:string;olderYears?:boolean};
export function discoveryViewKey(url:string){return ['discover-view',url] as const;}
export function isDiscoveryUrl(value:unknown):value is string{return typeof value==='string'&&(value==='/discover'||value.startsWith('/discover?'));}
export function useDiscoveryScroll(ready:boolean,draft:string,olderYears:boolean){
 const location=useLocation(),cache=useQueryClient(),url=location.pathname+location.search;
 const controls=useRef({draft,olderYears});controls.current={draft,olderYears};
 useLayoutEffect(()=>{
  if(!ready)return;
  const key=discoveryViewKey(url),saved=cache.getQueryData<DiscoveryView>(key);
  let y=saved?.scrollY??0;
  cache.setQueryData(['discover-last-location'],url);
  window.scrollTo(0,y);
  const capture=()=>{y=window.scrollY;};
  window.addEventListener('scroll',capture,{passive:true});
  return()=>{window.removeEventListener('scroll',capture);if(cache.getQueryData<{user?:unknown}>(['session'])?.user)cache.setQueryData<DiscoveryView>(key,{scrollY:y,...controls.current});};
 },[url,ready,cache]);
}
