import {Loading} from './Loading';
import {useEffect, useRef, useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Folder, ChevronRight, X} from 'lucide-react';
import {api} from './api';
export type Directory={cid:string;path:string};
type Page={cid:string;path:{cid:string;name:string}[];items:{cid:string;name:string}[];total:number;offset:number;limit:number};
export function DirectoryPicker({title,onPick,close}:{title:string;onPick:(dir:Directory)=>void;close:()=>void}){
 const ref=useRef<HTMLDialogElement>(null),[cid,setCid]=useState('0'),[offset,setOffset]=useState(0);
 const query=useQuery({queryKey:['115-directories',cid,offset],staleTime:0,queryFn:()=>api<Page>('/integrations/115/directories?cid='+encodeURIComponent(cid)+'&offset='+offset+'&limit=100')});
 useEffect(()=>{ref.current?.showModal();},[]);
 const path=query.data?.path.map(x=>x.name).filter(x=>x!=='根目录').join('/');
 return <dialog ref={ref} className="directory-picker" onCancel={e=>{e.preventDefault();close();}}><div className="dialog-head"><h2>{title}</h2><button className="icon-button" aria-label="关闭目录选择" onClick={close}><X/></button></div><div className="dialog-body"><p className="muted">只读取已授权115账号的目录，不创建或移动文件。</p><nav className="folder-breadcrumb">{query.data?.path.map(p=><button key={p.cid} onClick={()=>{setCid(p.cid);setOffset(0);}}>{p.name}<ChevronRight size={13}/></button>)}</nav>{query.isFetching&&<Loading label="正在读取115目录…"/>}{query.error&&<div className="error" role="alert">{query.error.message}<button onClick={()=>query.refetch()}>重新读取</button></div>}<div className="folder-list">{query.data?.items.map(x=><button key={x.cid} onClick={()=>{setCid(x.cid);setOffset(0);}}><Folder size={20}/><span>{x.name}<small>CID {x.cid}</small></span><ChevronRight size={18}/></button>)}{query.data?.items.length===0&&!query.isFetching&&<p className="muted">该目录没有子目录，可以选择当前目录。</p>}</div>{query.data&&<div className="pagination"><button disabled={offset===0} onClick={()=>setOffset(Math.max(0,offset-100))}>上一页</button><span>第 {Math.floor(offset/100)+1} 页</span><button disabled={offset+100>=query.data.total} onClick={()=>setOffset(offset+100)}>下一页</button></div>}</div><div className="dialog-foot"><button onClick={close}>取消</button><button className="primary" disabled={!query.data||query.isFetching||!!query.error} onClick={()=>{onPick({cid:query.data!.cid,path:'/'+path});close();}}>选择当前目录</button></div></dialog>;
}
