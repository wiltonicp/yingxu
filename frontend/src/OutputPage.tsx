import {Loading} from './Loading';
import {useEffect,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {api} from './api';
type Output={directory:string;base_url:string;write_nfo:boolean};
export function OutputPage({busy,run}:{busy:boolean;run:(work:()=>Promise<unknown>)=>Promise<void>}){
 const query=useQuery({queryKey:['processing-policy'],queryFn:()=>api<{output:Output}&Record<string,unknown>>('/settings/processing-policy')});
 const address=useQuery({queryKey:['output-address'],queryFn:()=>api<{suggested_base_url:string|null;source:string;error:string|null;legacy_default:boolean}>('/settings/output-address'),refetchOnWindowFocus:false});
 const [value,setValue]=useState<Output|null>(null),[message,setMessage]=useState('');
 useEffect(()=>{if(query.data&&address.data){const suggestion=address.data.legacy_default&&address.data.suggested_base_url;setValue({...query.data.output,...(suggestion?{base_url:suggestion}:{})});if(suggestion)setMessage('已填入检测到的服务地址，保存后用于新输出；已有STRM未自动改写。');}},[query.data,address.data]);
 if(query.error||address.error)return <p className="error">{query.error?.message||address.error?.message}</p>;
 if(!value)return <Loading label="正在加载输出配置…"/>;
 return <><h1>STRM 输出</h1><p className="subtitle">文件留在115，本地只保存轻量索引和元数据。外部媒体服务的挂载与播放由你处理。</p><section className="panel"><h2>本地目录与播放入口</h2><label>程序目录内的输出路径<input value={value.directory} onChange={e=>setValue({...value,directory:e.target.value})}/><small>例如 library/strm，不使用系统临时目录，不允许越出程序目录。</small></label><label>播放入口地址<input value={value.base_url} onChange={e=>setValue({...value,base_url:e.target.value})}/><small>采用实际可访问的映序地址。</small>{address.data?.suggested_base_url&&<button type="button" className="text-link" onClick={()=>{setValue({...value,base_url:address.data!.suggested_base_url!});setMessage('已采用检测地址，请保存；已有STRM不会自动改写。');}}>使用检测地址</button>}{address.data?.error&&<small className="error">{address.data.error}</small>}</label><label className="switch-row"><span><b>输出 NFO 元数据</b><small>包含片名、年份、简介和TMDB标识，与STRM同目录。</small></span><input type="checkbox" role="switch" checked={value.write_nfo} onChange={e=>setValue({...value,write_nfo:e.target.checked})}/></label><div className="notice">STRM使用固定签名入口，不把会过期的115直链长期写死。每次播放按客户端标识解析新地址；若上游要求额外Cookie，返回明确错误，不把账号凭证交给播放器。</div><button className="primary" disabled={busy} onClick={()=>run(async()=>{await api('/settings/processing-policy?output_address_confirmed=true','PUT',{...query.data,output:value});setMessage('输出配置已保存，不会移动网盘文件或自动生成索引。');})}>保存输出配置</button><p role="status">{message}</p></section></>;
}
