import {Brand} from './Brand';
import {Link,useLocation} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {House,Search,History,ScrollText,LibraryBig,Bookmark,ClipboardCheck,List,RadioTower,Sparkles,Users,SlidersHorizontal,Plug,type LucideIcon} from 'lucide-react';
import {api,type User,type MediaRequest} from './api';

type Item=readonly [string,string,LucideIcon];
type Group={label:string;links:Item[]};

export function navigationGroups(admin:boolean):Group[]{
 if(!admin)return [{label:'工作空间',links:[['overview','总览',House],['discover','资源发现',Search],['subscriptions','我的订阅',Bookmark],['requests','申请记录',ClipboardCheck],['library','媒体库',LibraryBig]]}];
 return [
  {label:'工作空间',links:[['overview','总览',House],['discover','资源发现',Search]]},
  {label:'订阅',links:[['subscriptions','订阅管理',Bookmark],['requests','订阅审核',ClipboardCheck]]},
  {label:'资源',links:[['resources','资源归档',List],['library','媒体库',LibraryBig]]},
  {label:'处理',links:[['jobs','任务中心',List],['processing-records','整理记录',History]]},
  {label:'管理',links:[['channels','频道监控',RadioTower],['processing','整理设置',Sparkles],['users','用户管理',Users],['settings','连接设置',SlidersHorizontal],['plugins','插件',Plug],['logs','日志中心',ScrollText]]},
 ];
}

export function Sidebar({user}:{user:User}){
 const admin=user.role==='admin';
 const {pathname}=useLocation();
 const requests=useQuery({queryKey:['requests'],queryFn:()=>api<MediaRequest[]>('/requests'),enabled:admin,refetchInterval:admin?30000:false});
 const pending=requests.isError?0:requests.data?.filter(x=>x.status==='pending').length||0;
 return <aside className="sidebar" aria-label="侧边工作空间"><Brand showVersion/>
  <nav className="side-nav" aria-label="主导航">{navigationGroups(admin).map(group=><section className="side-nav-group" key={group.label} aria-label={group.label}>
   <h2 className="side-nav-label">{group.label}</h2><div className="side-nav-items">{group.links.map(([key,title,Icon])=>{
    const detailParent=(pathname.startsWith('/media/')||pathname.startsWith('/douban/'))&&key==='discover';
    const selected=pathname==='/'+key||pathname.startsWith('/'+key+'/')||detailParent;
    return <Link to={'/'+key} key={key} className={'side-nav-link'+(selected?' active':'')} aria-current={selected?'page':undefined}><Icon size={20} strokeWidth={1.6} aria-hidden="true"/><span className="side-nav-text">{title}</span>{key==='requests'&&admin&&pending>0&&<span className="side-nav-count" aria-label={pending+'条待审核'}>{pending>99?'99+':pending}</span>}</Link>;
   })}</div>
  </section>)}</nav>
 </aside>;
}
