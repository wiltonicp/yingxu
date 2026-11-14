import {Brand} from './Brand';
import {Link,useLocation} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {House,Search,History,ScrollText,LibraryBig,Bookmark,ClipboardCheck,List,RadioTower,Sparkles,Users,SlidersHorizontal,LogOut,type LucideIcon} from 'lucide-react';
import {api,type User,type MediaRequest} from './api';

type Item=readonly [string,string,LucideIcon];
type Group={label:string;links:Item[]};

export function navigationGroups(admin:boolean):Group[]{
 if(!admin)return [{label:'工作空间',links:[['overview','总览',House],['discover','资源发现',Search],['subscriptions','我的订阅',Bookmark],['requests','申请记录',ClipboardCheck],['library','媒体库',LibraryBig]]}];
 return [
  {label:'工作空间',links:[['overview','总览',House],['discover','资源发现',Search]]},
  {label:'订阅',links:[['subscriptions','订阅管理',Bookmark],['requests','订阅审核',ClipboardCheck]]},
  {label:'资源',links:[['resources','种子列表',List],['channels','频道监控',RadioTower]]},
  {label:'自动化',links:[['jobs','任务中心',List],['library','媒体库',LibraryBig],['processing','整理与刮削',Sparkles],['processing-records','整理记录',History]]},
  {label:'管理',links:[['users','用户管理',Users],['settings','连接设置',SlidersHorizontal],['logs','日志中心',ScrollText]]},
 ];
}

export function Sidebar({user,busy,onLogout}:{user:User;busy:boolean;onLogout:()=>void}){
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
  <div className="identity sidebar-account"><span className="sidebar-avatar" aria-hidden="true">{user.username.slice(0,1).toUpperCase()}</span><div className="sidebar-account-copy"><b title={user.username}>{user.username}</b><small>{admin?'超级管理员':'普通用户'}</small></div><button className="sidebar-logout" type="button" disabled={busy} onClick={onLogout} title="退出登录" aria-label="退出登录"><LogOut size={17}/></button></div>
 </aside>;
}
