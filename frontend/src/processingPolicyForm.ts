/** Only normalize form input; keep every explicitly selected metric and its order. */
export const DEFAULT_WASHING_KEYS:ReadonlySet<string>=new Set(['source','resolution','dynamic_range','revision','video_codec','file_size']);

type Draft={scheduling:{incoming:{cid:string;path:string}[];organized:{cid:string;path:string}|null};washing:{release_groups:string[]}};
export function policyUpdatePayload<T extends Draft>(policy:T,groups:string):T{
 const payload=structuredClone(policy);
 payload.scheduling.incoming=payload.scheduling.incoming.map(item=>({...item,cid:item.cid.trim()})).filter(item=>item.cid!=='');
 if(payload.scheduling.organized){
  const organized=payload.scheduling.organized;
  payload.scheduling.organized=organized.cid.trim()?{...organized,cid:organized.cid.trim()}:null;
 }
 payload.washing.release_groups=groups.split(/\r?\n/).map(value=>value.trim()).filter(Boolean);
 return payload;
}
