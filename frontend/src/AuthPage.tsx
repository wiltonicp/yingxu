import {useRef,useState,type FormEvent} from 'react';
import {ArrowRight,Eye,EyeOff,LockKeyhole,UserRound,KeyRound,ShieldCheck} from 'lucide-react';
import {Brand} from './Brand';
import {VersionBadge} from './VersionBadge';
import {Loading} from './Loading';
import {LoginBackdrop} from './LoginBackdrop';
import './AuthPage.css';
import {MobileAuthPage} from './MobileAuthPage';
import {useMobileAuth} from './authDevice';

export type AuthPageProps={initial:boolean;busy:boolean;error:string;keyboardOpen?:boolean;onSubmit:(e:FormEvent<HTMLFormElement>)=>Promise<void>};
export function AuthPage(props:AuthPageProps){
 const mobile=useMobileAuth();
 return mobile?<MobileAuthPage {...props}/>:<DesktopAuthPage {...props}/>;
}
function DesktopAuthPage({initial,busy,error,onSubmit}:AuthPageProps){
 const [visible,setVisible]=useState(false);
 const submitting=useRef(false);
 return <div className="auth-entry"><LoginBackdrop/><div className="auth-entry-frame">
  <main className="auth-access"><div className="desktop-auth-identity"><Brand/><p>映你所寻   序你所藏</p></div>
   <div className="auth-access-content">{initial&&<h1>创建管理员</h1>}
    <form onSubmit={async e=>{e.preventDefault();if(busy||submitting.current)return;submitting.current=true;try{await onSubmit(e);}finally{submitting.current=false;}}} aria-label={initial?'创建管理员账号':'登录映序'}>
     <fieldset disabled={busy}>
      {initial&&<label className="auth-input-label">本机初始化口令<div className="auth-input-wrap"><KeyRound size={18}/><input name="setup_token" type="password" required autoComplete="off" placeholder="输入初始化口令"/></div><small>在服务器读取 <code>data/bootstrap.key</code>，无需发送给他人。</small></label>}
      <label className="auth-input-label">用户名<div className="auth-input-wrap"><UserRound size={18}/><input name="username" placeholder="输入你的用户名" minLength={3} maxLength={32} pattern="[A-Za-z0-9_.-]+" autoComplete="username" autoCapitalize="none" spellCheck={false} required/></div></label>
      <label className="auth-input-label">密码<div className="auth-input-wrap"><LockKeyhole size={18}/><input name="password" placeholder={initial?'设置至少 6 位密码':'输入你的密码'} type={visible?'text':'password'} minLength={6} maxLength={128} autoComplete={initial?'new-password':'current-password'} required/><button type="button" className="auth-password-toggle" aria-label={visible?'隐藏密码':'显示密码'} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>{initial&&<small>至少 6 个字符，建议使用不重复的长密码。</small>}</label>
      {error&&<div className="auth-access-error" role="alert">{error}</div>}
      <button type="submit" className="auth-submit" disabled={busy}>{busy?<Loading kind="compact" label="正在提交…"/>:<><span>{initial?'创建管理员账号':'登录'}</span><ArrowRight size={19}/></>}</button>
     </fieldset>
    </form>
    {initial&&<div className="auth-private-note"><ShieldCheck size={16}/><span>初始化仅用于创建首个管理员</span></div>}
   </div>
   <div className="auth-access-bottom"><VersionBadge compact/></div>
  </main>
 </div></div>;
}
