export const templates={
 cinema:{name:'影院幕布',note:'全幅照片 · 左侧标题',color:'#e6bc79',background:'#141821',end:'#4d2e20'},
 editorial:{name:'图书馆藏',note:'分栏排版 · 右侧图面',color:'#8ee0db',background:'#143139',end:'#266166'},
 spotlight:{name:'午夜放映',note:'全幅照片 · 居中片头',color:'#ffb6d3',background:'#211429',end:'#592944'},
 gallery:{name:'纸间展映',note:'左侧画框 · 右侧标题',color:'#d49549',background:'#241e1b',end:'#503a27'},
 marquee:{name:'银幕长廊',note:'中央主海报 · 两侧递退',color:'#f4d58b',background:'#171b2a',end:'#3e253e'},
 mosaic:{name:'错层档案',note:'错层拼贴 · 左侧标题',color:'#a2d9ff',background:'#111b2c',end:'#243b52'},
 row:{name:'片单陈列',note:'一排竖海报 · 独立标题区',color:'#eed4a8',background:'#171a26',end:'#513b35'},
 split:{name:'切光银幕',note:'斜线分隔 · 右侧主视觉',color:'#b0e5df',background:'#12262b',end:'#20504c'},
 fan:{name:'扇页集锦',note:'扇形叠放 · 上方居中标题',color:'#f4c2bb',background:'#291b2d',end:'#523744'},
 matrix:{name:'光谱九格',note:'明亮底色 · 海报网格',color:'#a9e8fb',background:'#26324a',end:'#726b7d'},
 wall:{name:'横幅片墙',note:'上方库名 · 下方六张竖海报',color:'#dfbe90',background:'#151920',end:'#4f3836'},
 overlay:{name:'暗幕分镜',note:'通幅主图 · 左侧斜形暗幕',color:'#bce3cf',background:'#122522',end:'#324033'},
 reels:{name:'双轨胶片',note:'双排画幅 · 下方片名',color:'#f4ce9e',background:'#15121d',end:'#38292a'},
} as const;
export type Template=keyof typeof templates;
export const artworkCount:Record<Template,number>={cinema:1,editorial:1,spotlight:1,gallery:1,marquee:9,mosaic:9,row:8,split:1,fan:7,matrix:9,wall:6,overlay:1,reels:8};

export const titleFonts={
 modern:{label:'现代黑体',family:'"Noto Sans SC", "Noto Sans CJK SC", "Microsoft YaHei UI", "PingFang SC", sans-serif'},
 serif:{label:'典雅宋体',family:'"Noto Serif SC", "Noto Serif CJK SC", "Songti SC", SimSun, serif'},
 poster:{label:'厚重海报',family:'SimHei, "Heiti SC", "Microsoft YaHei", sans-serif'},
 zongyi:{label:'方正综艺简体',family:'"YX Cover Zongyi"',local:['FZZongYi-M05S','方正综艺简体']},
 chaohei:{label:'潮黑',family:'"YX Cover Chaohei"',local:['潮黑','潮黑体','潮黑简体','潮黑体简体','ChaoHei']},
 cuyasong:{label:'粗雅宋',family:'"YX Cover Cuyasong"',local:['粗雅宋','粗雅宋简体','方正粗雅宋简体','FZCuYaSongS-B-GB','FZCuYaSong-B-GBK']},
} as const;
export const subtitleFonts={
 sans:{label:'简洁无衬线',family:'"Segoe UI", Arial, sans-serif'},
 serif:{label:'经典衬线',family:'Georgia, "Times New Roman", serif'},
 narrow:{label:'紧凑无衬线',family:'"Arial Narrow", "Aptos Narrow", "Roboto Condensed", Arial, sans-serif'},
} as const;
export type CoverTypography={
 title_size:number;subtitle_size:number;title_font:keyof typeof titleFonts;subtitle_font:keyof typeof subtitleFonts;
};
export const defaultTypography:CoverTypography={title_size:139,subtitle_size:60,title_font:'zongyi',subtitle_font:'sans'};
export async function loadCoverTitleFont(key:CoverTypography['title_font']){
 const font=titleFonts[key];
 if(!('local' in font))return;
 const family=font.family.slice(1,-1);
 for(const loaded of document.fonts){
  if(loaded.family===family&&loaded.status==='loaded')return;
 }
 const face=new FontFace(family,font.local.map(name=>'local('+JSON.stringify(name)+')').join(', '),{weight:'800'});
 try{document.fonts.add(await face.load());}
 catch{throw new Error('当前浏览器读取不到「'+font.label+'」。请在生成封面的设备安装该字体，或选择其他字体。');}
}
function coverImage(ctx:CanvasRenderingContext2D,image:ImageBitmap|HTMLCanvasElement,x:number,y:number,w:number,h:number){
 const factor=Math.max(w/image.width,h/image.height);
 const width=image.width*factor,height=image.height*factor;
 ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
 ctx.drawImage(image,x+(w-width)/2,y+(h-height)/2,width,height);
 ctx.restore();
}
function titleLines(ctx:CanvasRenderingContext2D,title:string,width:number,maxLines:number,maxSize:number,font:string){
 let size=maxSize,lines:string[]=[];
 // Keep short library names on one line without sacrificing the prominent title size.
 for(;size>Math.min(76,maxSize);size-=4){
  ctx.font='800 '+size+'px '+font;
  if(ctx.measureText(title).width<=width)break;
 }
 for(;size>=36;size-=4){
  ctx.font='800 '+size+'px '+font;
  lines=[];let line='';
  for(const char of title){
   if(line&&ctx.measureText(line+char).width>width){lines.push(line.trimEnd());line='';}
   line+=line||char.trim()?char:'';
  }
  if(line)lines.push(line);
  if(lines.length<=maxLines)break;
 }
 if(lines.length>maxLines){
  lines=lines.slice(0,maxLines);
  while(ctx.measureText(lines[maxLines-1]+'…').width>width)lines[maxLines-1]=Array.from(lines[maxLines-1]).slice(0,-1).join('');
  lines[maxLines-1]+='…';
 }
 return {lines,lineHeight:Math.max(size,36)+12};
}
async function loadArtwork(source:File|string,signal?:AbortSignal){
 if(typeof source!=='string')return createImageBitmap(source);
 const response=await fetch(source,{cache:'no-store',signal});
 if(!response.ok)throw new Error('读取素材失败，请检查 Emby 连接或更换素材。');
 return createImageBitmap(await response.blob());
}

export async function withArtwork<T>(sources:(File|string)[], render:(images:ImageBitmap[])=>T, signal?:AbortSignal){
 const images:ImageBitmap[]=[];
 try{
  for(const source of sources)images.push(await loadArtwork(source,signal));
  return render(images);
 }finally{images.forEach(image=>image.close());}
}

function posterTile(ctx:CanvasRenderingContext2D,image:ImageBitmap|undefined,x:number,y:number,w:number,h:number,angle=0){
 ctx.save();ctx.translate(x+w/2,y+h/2);ctx.rotate(angle);
 ctx.shadowColor='#0009';ctx.shadowBlur=22;ctx.shadowOffsetY=10;
 ctx.beginPath();ctx.roundRect(-w/2,-h/2,w,h,14);
 ctx.fillStyle='#ffffff16';ctx.fill();
 ctx.shadowColor='transparent';
 ctx.clip();
 if(image)coverImage(ctx,image,-w/2,-h/2,w,h);
 ctx.restore();
}

function diagonalPosterWall(ctx:CanvasRenderingContext2D,images:ImageBitmap[],matrix:boolean){
 const origin=matrix?[989,357]:[1024,345], angle=matrix?.23:.22;
 const start=matrix?[-310,-431]:[-292,-448], step=matrix?[208,287]:[214,293];
 const [width,height]=matrix?[190,267]:[198,279];
 ctx.save();ctx.translate(origin[0],origin[1]);ctx.rotate(angle);
 images.forEach((image,slot)=>posterTile(ctx,image,start[0]+(slot%3)*step[0],start[1]+Math.floor(slot/3)*step[1],width,height));
 ctx.restore();
}
export function renderCover(title:string,template:Template,images:ImageBitmap[],scale=1,mime="image/png",subtitle="",typography=defaultTypography){
 const canvas=document.createElement('canvas');canvas.width=1280*scale;canvas.height=720*scale;
 const ctx=canvas.getContext('2d');
 if(!ctx)throw new Error('当前浏览器无法生成封面。');
 ctx.scale(scale,scale);
 const palette=templates[template];
 const gradient=ctx.createLinearGradient(0,0,1280,720);
 gradient.addColorStop(0,palette.background);gradient.addColorStop(1,palette.end);
 ctx.fillStyle=gradient;ctx.fillRect(0,0,1280,720);
 const centered=template==='spotlight', gallery=template==='gallery', editorial=template==='editorial';
 const strip=template==='marquee', mosaic=template==='mosaic';
 const row=template==='row'||template==='wall', split=template==='split', fan=template==='fan';
 const matrix=template==='matrix', overlay=template==='overlay', reels=template==='reels';
 // Reuse available posters only after the library does not supply enough for this layout.
 const available=images.length, targetCount=artworkCount[template];
 if(available>0&&available<targetCount){
  const sources=images;
  images=Array.from({length:targetCount},(_,slot)=>{
   const stagger=(matrix||mosaic)&&available===3?Math.floor(slot/3):0;
   return sources[(slot+stagger)%available];
  });
 }
 const artwork=images[0];
 if(artwork){
  ctx.save();
  ctx.globalAlpha=.56;ctx.filter='blur(38px) saturate(.85)';
  coverImage(ctx,artwork,-68,-68,1416,856);
  ctx.restore();
  const shade=ctx.createLinearGradient(0,0,1280,720);
  shade.addColorStop(0,'#080b16a8');shade.addColorStop(1,'#0a0d16bb');
  ctx.fillStyle=shade;ctx.fillRect(0,0,1280,720);
 }

 if(reels){
  const tileW=images.length<4?Math.min(510,Math.floor(1160/Math.max(1,images.length))):288,tileH=images.length<=4?385:192;
  for(let i=0;i<images.length;i++){
   const line=Math.floor(i/4), column=i%4, size=Math.min(4,images.length-line*4);
   posterTile(ctx,images[i],640-(size*tileW+(size-1)*10)/2+column*(tileW+10),30+line*205,tileW,tileH);
  }
 }else if(matrix||mosaic){
  diagonalPosterWall(ctx,images,matrix);
 }else if(overlay){
  if(artwork)coverImage(ctx,artwork,0,0,1280,720);
  ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(790,0);ctx.lineTo(565,720);ctx.lineTo(0,720);ctx.closePath();
  const shade=ctx.createLinearGradient(0,0,720,0);
  shade.addColorStop(0,'#0b1817f5');shade.addColorStop(1,'#0c17179e');
  ctx.fillStyle=shade;ctx.fill();
 }else if(row){
  const n=images.length,gap=13, width=Math.min(185,(1132-(n-1)*gap)/n), height=width*1.5;
  const total=n*width+(n-1)*gap;
  for(let i=0;i<n;i++)posterTile(ctx,images[i],640-total/2+i*(width+gap),653-height,width,height);
 }else if(fan){
  const n=images.length, step=Math.min(121,915/n),mid=(n-1)/2;
  const order=Array.from({length:n},(_,i)=>i).sort((a,b)=>Math.abs(mid-b)-Math.abs(mid-a));
  for(const i of order){
   const offset=i-mid,distance=Math.abs(offset), height=359-distance*20,width=height*2/3;
   posterTile(ctx,images[i],640+offset*step-width/2,349+distance*31,width,height,offset*.135);
  }
 }else if(split){
  ctx.save();ctx.beginPath();ctx.moveTo(805,0);ctx.lineTo(1280,0);ctx.lineTo(1280,720);ctx.lineTo(575,720);ctx.closePath();ctx.clip();
  if(artwork)coverImage(ctx,artwork,575,0,705,720);
  const wash=ctx.createLinearGradient(570,0,1040,0);
  wash.addColorStop(0,'#0a151bd4');wash.addColorStop(1,'#0a151b09');
  ctx.fillStyle=wash;ctx.fillRect(575,0,705,720);ctx.restore();
  ctx.beginPath();ctx.moveTo(805,0);ctx.lineTo(575,720);ctx.strokeStyle='#b0e5df77';ctx.lineWidth=2;ctx.stroke();
 }else if(strip){

  const n=images.length, step=Math.min(186,1060/n), middle=(n-1)/2;
  const order=Array.from({length:n},(_,i)=>i).sort((a,b)=>Math.abs(middle-b)-Math.abs(middle-a));
  for(const i of order){
   const distance=Math.abs(i-middle), height=Math.max(184,373-distance*43), width=height*2/3;
   posterTile(ctx,images[i],640+(i-(n-1)/2)*step-width/2,684-height,width,height,(i-middle)*.035);
  }
 }else if(artwork){
  if(editorial){
   posterTile(ctx,undefined,797,106,341,510,.16);
   posterTile(ctx,undefined,757,101,341,510,-.125);
   posterTile(ctx,artwork,774,78,376,564,.025);
  }
  else if(gallery){
   ctx.strokeStyle=palette.color;ctx.lineWidth=2;ctx.strokeRect(42,52,620,616);
   posterTile(ctx,artwork,57,67,590,586);
  }else{
   coverImage(ctx,artwork,0,0,1280,720);
   const veil=centered?ctx.createLinearGradient(0,0,0,720):ctx.createLinearGradient(0,0,1280,0);
   veil.addColorStop(0,centered?'#21142966':'#10131bf5');
   veil.addColorStop(.48,centered?'#211429cb':'#10131bc9');
   veil.addColorStop(1,centered?'#211429f2':'#10131b15');
   ctx.fillStyle=veil;ctx.fillRect(0,0,1280,720);
  }
 }
 const centerText=centered||fan||strip, topText=strip||row||fan;
 const x=centerText?640:gallery?720:74;
 ctx.textAlign=centerText?'center':'left';
 ctx.fillStyle=palette.color;
 ctx.fillRect(centerText?604:x,reels?474:topText?99:228,72,5);
 ctx.font='600 23px system-ui, sans-serif';ctx.fillText('映序  /  媒体库',x,reels?452:topText?76:197);
 ctx.fillStyle='#fff';
 const textWidth=editorial?500:gallery?480:centered?1000:mosaic||matrix?505:split||overlay?480:reels?1100:710;
 const titleFamily=titleFonts[typography.title_font].family;
 const subtitleFamily=subtitleFonts[typography.subtitle_font].family;
 const {lines,lineHeight}=titleLines(ctx,title,textWidth,reels?1:topText?2:3,typography.title_size,titleFamily);
 const titleHeight=lineHeight-12;
 const spacing=topText?Math.min(lineHeight,titleHeight+9):lineHeight;
 const titleY=reels?Math.max(572,489+titleHeight):topText?Math.max(168,110+titleHeight):366;
 const subtitleBaseline=typography.subtitle_size;
 // Bound the entire text block before the poster strip or bottom edge.
 const endY=reels?681:topText?(strip||fan?320:420):655;
 const naturalHeight=titleHeight+(lines.length-1)*spacing+(subtitle?subtitleBaseline+16:0);
 const startY=titleY-titleHeight;
 const scaleText=Math.min(1,(endY-startY)/Math.max(naturalHeight,1));
 ctx.save();
 ctx.translate(x,startY);
 ctx.scale(scaleText,scaleText);
 ctx.shadowColor='#050810b0';ctx.shadowBlur=13;ctx.shadowOffsetY=3;
 lines.forEach((line,index)=>ctx.fillText(line,0,titleHeight+index*spacing));
 if(subtitle){
  const y=titleHeight+Math.max(0,lines.length-1)*spacing+subtitleBaseline+16;
  ctx.fillStyle='#f4f7fc';
  let size=subtitleBaseline;
  for(;size>=22;size-=2){
   ctx.font='650 '+size+'px '+subtitleFamily;
   if(ctx.measureText(subtitle).width<=textWidth)break;
  }
 let label=subtitle;
  if(ctx.measureText(label).width>textWidth){
   const chars=Array.from(label);
   while(chars.length&&ctx.measureText(chars.join('')+'…').width>textWidth)chars.pop();
   label=chars.join('')+'…';
  }
  ctx.fillText(label,0,y);
 }
 ctx.restore();
 return canvas.toDataURL(mime,.88);
}


const englishNames=new Map(Object.entries({
 '欧美剧集':'Western TV Series','欧美剧':'Western TV Series','欧美电影':'Western Movies',
 '国产电影':'Chinese Movies','华语电影':'Chinese Movies','国产剧集':'Chinese TV Series','国产剧':'Chinese TV Series',
 '外语电影':'International Movies','海外电影':'International Movies','外语剧集':'International TV Series',
 '日韩剧集':'Japanese & Korean TV Series','日韩电影':'Japanese & Korean Movies',
 '动漫':'Animation','动画':'Animation','动画电影':'Animated Movies','综艺节目':'Variety Shows','综艺':'Variety Shows',
 '纪录片':'Documentaries','电影':'Movies','剧集':'TV Series','电视剧':'TV Series','合集':'Collections',
 '光影精选':'Screen Highlights',
}));
export function defaultEnglish(name:string){return englishNames.get(name.trim().replace(/\s+/g,''))||'';}
