import {useRef,useState,type FormEvent} from 'react';
import {ArrowRight,Eye,EyeOff,LockKeyhole,UserRound,KeyRound,ShieldCheck} from 'lucide-react';
import {Brand} from './Brand';
import {VersionBadge} from './VersionBadge';
import {Loading} from './Loading';
import './AuthPage.css';

export function AuthPage({initial,busy,error,onSubmit}:{initial:boolean;busy:boolean;error:string;onSubmit:(e:FormEvent<HTMLFormElement>)=>Promise<void>}){
 const [visible,setVisible]=useState(false);
 const submitting=useRef(false);
 return <div className="auth-entry"><div className="auth-entry-frame">
  <aside className="auth-editorial" aria-label="映序品牌介绍">
   <div className="auth-editorial-brand"><Brand/><span>YOUR PRIVATE CINEMA</span></div>
   <div className="auth-editorial-copy"><span className="auth-overline"><i/> 为热爱，留一席之地</span><h2>把期待，<br/>收进<span>片库。</span></h2><p>从偶然发现，到如约相见。<br/>让每一个好故事，都有自己的位置。</p></div>
   <div className="auth-cinema" aria-hidden="true"><div className="auth-cinema-top"><span><i/><i/><i/></span><b>THE NEXT CHAPTER</b><span>01 / 24</span></div><div className="auth-cinema-scene"><div className="auth-scene-orbit"/><div className="auth-scene-sun"/><div className="auth-scene-ridge back"/><div className="auth-scene-ridge front"/><div className="auth-scene-caption"><span>光影之间，自有归处</span><b>STORIES WORTH KEEPING</b></div><span className="auth-scene-frame tl"/><span className="auth-scene-frame br"/></div><div className="auth-cinema-progress"><i/><span>映你所寻，序你所藏。</span></div></div>
   <div className="auth-editorial-bottom"><span>发现<span> / </span>订阅<span> / </span>珍藏</span><span>YINGXU · 映序</span></div>
  </aside>
  <main className="auth-access"><div className="auth-mobile-brand"><Brand/></div><div className="auth-access-top"><span>映序工作空间</span><VersionBadge compact/></div>
   <div className="auth-access-content"><span className="auth-access-eyebrow">{initial?'CREATE YOUR SPACE':'WELCOME BACK'}</span><h1>{initial?'开启你的私人片库':'欢迎回来。'}</h1><p className="auth-access-intro">{initial?'创建管理员账号，让期待开始有序。':'登录映序，继续你的光影收藏。'}</p>
    <form onSubmit={async e=>{e.preventDefault();if(busy||submitting.current)return;submitting.current=true;try{await onSubmit(e);}finally{submitting.current=false;}}} aria-label={initial?'创建管理员账号':'登录映序'}>
     <fieldset disabled={busy}>
      {initial&&<label className="auth-input-label">本机初始化口令<div className="auth-input-wrap"><KeyRound size={18}/><input name="setup_token" type="password" required autoComplete="off" placeholder="输入初始化口令"/></div><small>在服务器读取 <code>data/bootstrap.key</code>，无需发送给他人。</small></label>}
      <label className="auth-input-label">用户名<div className="auth-input-wrap"><UserRound size={18}/><input name="username" placeholder="输入你的用户名" minLength={3} maxLength={32} pattern="[A-Za-z0-9_.-]+" autoComplete="username" autoCapitalize="none" spellCheck={false} required/></div></label>
      <label className="auth-input-label">密码<div className="auth-input-wrap"><LockKeyhole size={18}/><input name="password" placeholder={initial?'设置至少 6 位密码':'输入你的密码'} type={visible?'text':'password'} minLength={6} maxLength={128} autoComplete={initial?'new-password':'current-password'} required/><button type="button" className="auth-password-toggle" aria-label={visible?'隐藏密码':'显示密码'} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>{initial&&<small>至少 6 个字符，建议使用不重复的长密码。</small>}</label>
      {error&&<div className="auth-access-error" role="alert">{error}</div>}
      <button type="submit" className="auth-submit" disabled={busy}>{busy?<Loading kind="compact" label="正在提交…"/>:<><span>{initial?'创建管理员账号':'进入我的片库'}</span><ArrowRight size={19}/></>}</button>
     </fieldset>
    </form>
    <div className="auth-private-note"><ShieldCheck size={16}/><span>{initial?'初始化仅用于创建首个管理员':'私人工作空间，仅限已创建的账号访问'}</span></div>
   </div>
   <div className="auth-access-bottom"><span>好故事，值得有序珍藏。</span><span>YINGXU</span></div>
  </main>
 </div></div>;
}
