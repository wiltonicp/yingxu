import {useSyncExternalStore} from 'react';

const narrow='(max-width: 700px)',compactTouch='(max-width: 1100px) and (pointer: coarse)';
function snapshot(){
 const client=navigator as Navigator&{userAgentData?:{mobile?:boolean}};
 const phone=client.userAgentData?.mobile===true||/iPhone|iPod|Android.*Mobile|Windows Phone|IEMobile/i.test(client.userAgent);
 return phone||window.matchMedia(narrow).matches||window.matchMedia(compactTouch).matches;
}
function subscribe(update:()=>void){
 const queries=[window.matchMedia(narrow),window.matchMedia(compactTouch)];
 for(const q of queries)q.addEventListener('change',update);
 return()=>{for(const q of queries)q.removeEventListener('change',update);};
}
export function useMobileLayout(){return useSyncExternalStore(subscribe,snapshot,()=>false);}
export const useMobileAuth=useMobileLayout;
