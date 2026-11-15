import {useEffect,useState} from 'react';

/** VisualViewport tracks the visible area without disabling iPhone pinch zoom. */
export function useMobileViewport(mobile:boolean){
 const [keyboardOpen,setKeyboardOpen]=useState(false);
 useEffect(()=>{
  if(!mobile){setKeyboardOpen(false);return;}
  const root=document.documentElement,viewport=window.visualViewport;
  let frame=0,focusFrame=0;
  const update=()=>{
   frame=0;
   const normalScale=!viewport||Math.abs(viewport.scale-1)<.05;
   const height=normalScale&&viewport?viewport.height:window.innerHeight;
   const top=normalScale&&viewport?viewport.offsetTop:0;
   root.style.setProperty('--app-visual-height',Math.round(height)+'px');
   root.style.setProperty('--app-visual-top',Math.round(top)+'px');
   const active=document.activeElement;
   const editing=active instanceof HTMLElement&&(active.matches('textarea,input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit])')||active.isContentEditable);
   const keyboard=normalScale&&editing&&window.innerHeight-height>140;
   setKeyboardOpen(keyboard);
   if(keyboard&&active instanceof HTMLElement&&active.closest('dialog[open]')){
    cancelAnimationFrame(focusFrame);
    focusFrame=requestAnimationFrame(()=>{if(document.activeElement===active)active.scrollIntoView({block:'nearest',inline:'nearest'});});
   }
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  update();
  viewport?.addEventListener('resize',schedule);viewport?.addEventListener('scroll',schedule);
  window.addEventListener('resize',schedule);document.addEventListener('focusin',schedule);document.addEventListener('focusout',schedule);
  return()=>{
   cancelAnimationFrame(frame);cancelAnimationFrame(focusFrame);viewport?.removeEventListener('resize',schedule);viewport?.removeEventListener('scroll',schedule);
   window.removeEventListener('resize',schedule);document.removeEventListener('focusin',schedule);document.removeEventListener('focusout',schedule);
   root.style.removeProperty('--app-visual-height');root.style.removeProperty('--app-visual-top');
  };
 },[mobile]);
 return keyboardOpen;
}
