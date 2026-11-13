export type Completion={state:string;message?:string;received?:number;expected?:number|null;is_ended?:boolean;missing_count?:number;missing_episodes?:string[]};
export function mediaBadges(kind:string,inLibrary:boolean,subscribed:boolean,progress?:Completion){
 const expected=progress?.expected,received=progress?.received;
 const collecting=kind==='tv'&&subscribed&&typeof expected==='number'&&expected>0&&typeof received==='number'&&received>=0&&received<expected;
 const partial=collecting?`${received}/${expected}`:'';
 return {owned:!inLibrary?'':partial?'部分入库 '+partial:kind==='tv'&&subscribed?'已有剧集':'已入库',subscription:!subscribed?'':collecting?'补集中':kind==='tv'?'追更中':inLibrary?'订阅核对中':'已订阅',description:collecting?`已完结，当前核对 ${partial} 集${progress?.missing_episodes?.length?'，缺少 '+progress.missing_episodes.join('、'):''}；收齐后自动结束订阅`:progress?.message|| (kind==='tv'&&subscribed?'已有部分剧集不代表全剧已收齐，完结并收齐后自动结束订阅':'')};
}
