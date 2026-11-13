export type User={id:number;username:string;role:'admin'|'user';enabled:boolean};
export type Media={media_type:'movie'|'tv';tmdb_id:string;title:string;year:string;poster:string};
export type Subscription={id:number;status:string;quality:string;completion?:{state:string;message?:string;received?:number;expected?:number|null;is_ended?:boolean;missing_count?:number;missing_episodes?:string[]};local_lookup?:{matched_resources:number;queued_jobs:number;completed_jobs:number;waiting_for_new_resources:boolean};media:Media;followers:number;mine:boolean};
export type MediaRequest={id:number;user:string;media:Media;status:string;reason:string;rejection:string;auto_review?:{state:string;reason:string;checked_at:number}|null};
let csrf='';
export function setCsrf(token:string){csrf=token;}
export async function api<T>(path:string,method='GET',body?:unknown):Promise<T>{
 const response=await fetch('/api'+path,{method,credentials:'same-origin',headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(method==='GET'?{}:{'X-CSRF-Token':csrf})},body:body===undefined?undefined:JSON.stringify(body)});
 if(response.status===401&&!['/login','/setup'].includes(path))window.dispatchEvent(new Event('yingxu-session-expired'));
 if(!response.ok){const error=await response.json().catch(()=>({detail:'服务响应格式错误'}));throw new Error(typeof error.detail==='string'?error.detail:'输入格式不正确，请检查字段');}
 return response.json();
}
