import {EmbyLibraryCoverDialog} from './EmbyLibraryCoverDialog';
import {useState} from 'react';
import {AiRecognitionSettings,useAiRecognitionConfig} from './AiRecognitionSettings';
import {ImagePlus, Sparkles} from 'lucide-react';
import './plugins.css';

const builtInPlugins = [
 {id:'ai-recognition', name:'AI 识别', icon:Sparkles, dialog:AiRecognitionSettings, description:'为自动整理补充影视身份和季集；通过 TMDB 核验后自动整理。'},
 {id:'emby-cover', name:'Emby 封面生成', icon:ImagePlus, dialog:EmbyLibraryCoverDialog, description:'批量制作 Emby 媒体库横版封面，自动选材，预览后确认同步。'},
] as const;

const statusLabels={enabled:'已启用',disabled:'未启用',error:'状态读取失败',loading:'读取中…',preview:'可用'};

export function PluginsPage(){
 const ai=useAiRecognitionConfig();
 const [active,setActive]=useState<(typeof builtInPlugins)[number]['id']|null>(null);
 const ActiveDialog=builtInPlugins.find(plugin=>plugin.id===active)?.dialog;
 return <>
  <div className="page-title"><div><h1>插件</h1></div></div>
  <section className="built-in-plugins" aria-label="内置插件">
   {builtInPlugins.map(({id,name,icon:Icon,description})=>{
    const status=id==="emby-cover"?"preview":ai.data?(ai.data.enabled?"enabled":"disabled"):ai.isError?"error":"loading";
    return <article className="panel built-in-plugin" key={id} aria-labelledby={id}>
     <div className="built-in-plugin-heading">
      <span className="built-in-plugin-icon" data-plugin={id} aria-hidden="true"><Icon size={22}/></span>
      <h2 id={id}>{name}</h2>
      <span className="built-in-plugin-status" data-status={status}>{statusLabels[status]}</span>
     </div>
     <p className="built-in-plugin-description" title={description}>{description}</p>
     <div className="built-in-plugin-actions"><button type="button" aria-haspopup="dialog" aria-label={'管理 '+name} onClick={()=>setActive(id)}>管理</button></div>
    </article>;
   })}
  </section>
  {ActiveDialog&&<ActiveDialog close={()=>setActive(null)}/>}
 </>;
}
