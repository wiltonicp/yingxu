import {useEffect,useRef,useState} from 'react';
import {Eye,EyeOff} from 'lucide-react';
import {VersionBadge} from './VersionBadge';
import {Loading} from './Loading';
import type {AuthPageProps} from './AuthPage';
import './MobileAuthPage.css';
import {LoginPosterWall} from './LoginPosterWall';

/** Phone-specific layout; the API, CSRF and session handler are shared with desktop. */
export function MobileAuthPage({initial,busy,error,keyboardOpen=false,onSubmit}:AuthPageProps){
 const [visible,setVisible]=useState(false),submitting=useRef(false),password=useRef<HTMLInputElement>(null);
 useEffect(()=>{
  const meta=document.querySelector<HTMLMetaElement>('meta[name="theme-color"]'),oldColor=meta?.content;
  const oldRoot=document.documentElement.style.backgroundColor,oldBody=document.body.style.backgroundColor;
  if(meta)meta.content='#14283e';document.documentElement.style.backgroundColor='#14283e';document.body.style.backgroundColor='#14283e';
  return()=>{if(meta&&oldColor!==undefined)meta.content=oldColor;document.documentElement.style.backgroundColor=oldRoot;document.body.style.backgroundColor=oldBody;};
 },[]);
 return <main className={'phone-auth-page'+(initial?' phone-auth-page--setup':'')+(keyboardOpen?' phone-auth-page--keyboard':'')} data-auth-layout="mobile"><LoginPosterWall/><div className="phone-auth-inner">
  <div className="phone-auth-brand"><img src="/yingxu-logo.svg?v=3" alt="映序 Logo" width="84" height="84"/><p>映你所寻   序你所藏</p></div>
  <section className="phone-auth-content" aria-labelledby="phone-auth-title"><h1 id="phone-auth-title" className={initial?'phone-auth-setup-title':'phone-auth-sr-only'}>{initial?'创建管理员':'登录映序'}</h1>
   <form aria-label={initial?'创建管理员账号':'登录映序'} onSubmit={async e=>{e.preventDefault();if(busy||submitting.current)return;submitting.current=true;try{await onSubmit(e);}finally{submitting.current=false;}}}>
    <fieldset disabled={busy}>
     {initial&&<label className="phone-auth-label"><span className="phone-auth-caption">初始化口令</span><div className="phone-auth-field"><input name="setup_token" type="password" autoComplete="off" enterKeyHint="next" placeholder="本机初始化口令" required/></div><small>在服务器读取 <code>data/bootstrap.key</code>，无需发送给他人。</small></label>}
     <label className="phone-auth-label"><span className="phone-auth-caption">用户名</span><div className="phone-auth-field"><input name="username" placeholder="请输入用户名" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} minLength={3} maxLength={32} pattern="[A-Za-z0-9_.-]+" enterKeyHint="next" onKeyDown={e=>{if(e.key==='Enter'&&!e.nativeEvent.isComposing){e.preventDefault();password.current?.focus();}}} required/></div></label>
     <label className="phone-auth-label"><span className="phone-auth-caption">密码</span><div className="phone-auth-field"><input ref={password} name="password" type={visible?'text':'password'} placeholder={initial?'至少 6 位密码':'请输入密码'} minLength={6} maxLength={128} autoComplete={initial?'new-password':'current-password'} autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="go" required/><button className="phone-auth-eye" type="button" aria-label={visible?'隐藏密码':'显示密码'} aria-pressed={visible} onMouseDown={e=>e.preventDefault()} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={20}/>:<Eye size={20}/>}</button></div></label>
     {error&&<div className="phone-auth-error" role="alert">{error}</div>}
     <button className="phone-auth-submit" type="submit" disabled={busy}>{busy?<Loading kind="compact" label="正在提交…"/>:<span>{initial?'创建并进入':'登录'}</span>}</button>
    </fieldset>
   </form>
  </section>
  <div className="phone-auth-footer"><VersionBadge compact/></div>
 </div></main>;
}
