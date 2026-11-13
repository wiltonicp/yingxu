export type Re0Resource={slug:string;title:string;remark:string;pan_type:string;share_size:string;source:string[];video_resolution:string[];subtitle_language:string[];subtitle_type:string[];unlock_points:number|null;is_unlocked:boolean;validate_status:string;validate_message:string;unlocked_users_count:number|null;created_at?:string;user?:{id?:string;avatar_url?:string;nickname:string;username:string}|null};
const pans:Record<string,string>={'115':'115 网盘','123':'123 云盘',quark:'夸克',magnet:'磁力',ed2k:'电驴',guangya:'光鸭',alipan:'阿里云盘',aliyun:'阿里云盘',baidu:'百度网盘',xunlei:'迅雷云盘',uc:'UC 网盘',tianyi:'天翼云盘','189':'天翼云盘',pikpak:'PikPak'};
export function panLabel(value:string){return pans[value.toLowerCase()]||value||'未知网盘';}
export function resourceSpecs(item:Re0Resource){
 const text=[item.title,item.remark,...item.source,...item.video_resolution].join(' ');
 const resolutions:string[]=[];
 if(/(?:2160|\b4k\b)/i.test(text))resolutions.push('4K');
 if(/1080/i.test(text))resolutions.push('1080P');
 if(/720/i.test(text))resolutions.push('720P');
 if(!resolutions.length)resolutions.push(...item.video_resolution);
 const rules:[string,RegExp][]=[['杜比视界',/杜比视界|dolby\s*vision|\bDV\b|\bDoVi\b/i],['HDR10+',/hdr10\+/i],['HDR10',/hdr10(?!\+)/i],['HDR',/\bhdr\b(?!10)/i],['H.265',/h[.\s]?265|hevc|x265/i],['H.264',/h[.\s]?264|avc|x264/i],['REMUX',/remux/i],['10bit',/10[ -]?bit/i],['全景声',/atmos|全景声/i],['DTS-HD',/dts[ -]?hd/i]];
 const effects=rules.filter(([,rule])=>rule.test(text)).map(([label])=>label);
 return {pan:panLabel(item.pan_type),resolutions:[...new Set(resolutions)],effects,subtitles:[...new Set([...item.subtitle_language,...item.subtitle_type])],publisher:item.user?.nickname||item.user?.username||'匿名发布'};
}
export function resourceTimestamp(value?:string){
 if(!value)return 0;
 const timestamp=/^\d{10,13}$/.test(value)?Number(value)*(value.length===10?1000:1):Date.parse(value);
 return Number.isFinite(timestamp)?timestamp:0;
}
export function resourceDate(value?:string){
 const timestamp=resourceTimestamp(value);
 if(!timestamp)return '日期未提供';
 return new Date(timestamp).toLocaleDateString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit'});
}
export function compareResources(a:Re0Resource,b:Re0Resource){return Number(b.pan_type==='115')-Number(a.pan_type==='115')||(b.unlocked_users_count??-1)-(a.unlocked_users_count??-1)||(a.unlock_points??Infinity)-(b.unlock_points??Infinity)||a.slug.localeCompare(b.slug);}
