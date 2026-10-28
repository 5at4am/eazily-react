import { useEffect, useState, useSyncExternalStore } from 'react';
import { createAuthController } from './controller.js';
import { authRuntime } from './runtime.js';
import { attachNativeOAuth } from './nativeOAuth.js';

export function useAuth(){
  const [controller]=useState(()=>createAuthController({...authRuntime,sessionStorage:window.sessionStorage,localStorage:window.localStorage}));
  const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
  useEffect(()=>controller.start(),[controller]);
  useEffect(()=>attachNativeOAuth(controller),[controller]);
  useEffect(()=>{
    const check=()=>{if(document.visibilityState==='visible'){controller.cancelGoogleSignIn();if(controller.getSnapshot().account.user)void controller.refresh();}};
    const timer=setInterval(check,60000);document.addEventListener('visibilitychange',check);window.addEventListener('online',check);window.addEventListener('pageshow',check);
    return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',check);window.removeEventListener('online',check);window.removeEventListener('pageshow',check);};
  },[controller]);
  return {...state,controller};
}

