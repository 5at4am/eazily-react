import { accountState, clearAccountStorage, EMPTY_ACCOUNT, normalizeEmail, passwordIssues, passwordResetError, safeAuthError, validOtp } from './policy.js';

// One SDK listener per mounted controller. Tokens remain owned by the SDK.
export function createAuthController({ client, loadAccount, loadAuthSettings, googleSignIn, emailOtpLength=8, sessionStorage, localStorage, now=Date.now }) {
  // mode: 'request' (email a reset link) or 'update' (set/change the password).
  const IDLE_PASSWORD=Object.freeze({mode:'idle',status:'idle',email:'',error:''});
  // The emailed link lands back on this origin. Supabase appends its own
  // code/token, so only the app's own path is ever named here.
  const recoveryRedirect=()=>globalThis.location?`${globalThis.location.origin}${globalThis.location.pathname}`:undefined;
  let snapshot={status:client?'initialising':'configuration_required',account:EMPTY_ACCOUNT,error:'',oauthPending:false,contact:'',resendAt:0,otpLength:emailOtpLength,password:IDLE_PASSWORD,recovery:false,providers:loadAuthSettings?{email:false,phone:false,google:false,signup:false}:{email:true,phone:false,google:true,signup:true},providersLoading:Boolean(loadAuthSettings),providersError:''};
  let generation=0,intent=0,subscription,active=false,loading=0,operation=false,loggedOut=false,lastUser=null;
  const listeners=new Set();
  const emit=patch=>{snapshot={...snapshot,...patch};listeners.forEach(fn=>fn());};
  const clear=()=>{clearAccountStorage(sessionStorage);clearAccountStorage(localStorage);};
  const reloadAuthSettings=async()=>{
    if(!loadAuthSettings)return;
    emit({providersLoading:true,providersError:''});
    try {const providers=await loadAuthSettings();if(active)emit({providers,providersLoading:false});}
    catch {if(active)emit({providersLoading:false,providersError:'Sign-in methods could not be loaded. Please retry.'});}
  };
  const refresh=async()=>{
    if (!client||!active) return EMPTY_ACCOUNT;
    // A recovery session exists only to set a new password. Until that succeeds the
    // account stays empty so no workspace renders on the strength of a reset link.
    if (snapshot.recovery) return EMPTY_ACCOUNT;
    const ticket=++generation; loading++;
    const previousAccount=snapshot.account;
    // Keep an authenticated form mounted during routine account refreshes.
    // Sign-in, sign-out and token-expiry events still clear the account explicitly.
    if (snapshot.account.user) emit({error:''});
    else emit({status:'initialising',account:EMPTY_ACCOUNT,error:''});
    try {
      const account=await loadAccount();
      if (!active||ticket!==generation) return EMPTY_ACCOUNT;
      if(lastUser&&lastUser!==account.user?.id)clear();
      lastUser=account.user?.id||null;
      emit({account,status:accountState(account),oauthPending:false});
      return account;
    } catch (error) {
      if (active&&ticket===generation) {
        const expired=['bad_jwt','session_not_found','refresh_token_not_found','refresh_token_already_used'].includes(error?.code)||error?.status===401;
        if(expired)clear();
        emit({account:expired?EMPTY_ACCOUNT:previousAccount.user?previousAccount:EMPTY_ACCOUNT,
          status:expired?'session_expired':previousAccount.user?accountState(previousAccount):'error',
          error:'Account access could not be checked. Please retry.'});
      }
      return EMPTY_ACCOUNT;
    } finally {loading--;}
  };
  return {
    getSnapshot:()=>snapshot,
    subscribe:listener=>{listeners.add(listener);return()=>listeners.delete(listener);},
    start(){
      if(active)return()=>{};active=true;
      void reloadAuthSettings();
      if(client){
        subscription=client.auth.onAuthStateChange((event,session)=>{
          if(!active)return;
          if(event==='PASSWORD_RECOVERY'&&session?.user){
            // The SDK already turned the emailed link into a short-lived recovery
            // session. Hold the account empty until a new password is actually set,
            // so no privileged screen renders on the strength of a reset link.
            emit({recovery:{id:session.user.id,email:session.user.email||''},account:EMPTY_ACCOUNT,status:'initialising',error:'',password:{mode:'update',status:'idle',email:session.user.email||'',error:''}});
            return;
          }
          if(event==='SIGNED_OUT'||(!session&&event==='TOKEN_REFRESHED')){
            generation++;clear();emit({account:EMPTY_ACCOUNT,status:event==='SIGNED_OUT'?'signed_out':'session_expired',oauthPending:false,error:'',password:IDLE_PASSWORD,recovery:false});
          } else if((event==='SIGNED_IN'||event==='TOKEN_REFRESHED'||event==='USER_UPDATED')&&!loggedOut&&session?.user?.id&&session.user.id===snapshot.account.user?.id){
            // A renewed token or an update (for example, an email confirmation) for the same account
            // must not reset an in-progress form.
            queueMicrotask(()=>{if(active)void refresh();});
          } else if(event==='SIGNED_IN'||event==='USER_UPDATED'||event==='TOKEN_REFRESHED'){
            if(loggedOut){queueMicrotask(()=>{void client.auth.signOut({scope:'local'}).catch(()=>{});});return;}
            generation++;clear();emit({account:EMPTY_ACCOUNT,status:'initialising'});
            // Do not await SDK calls inside its authentication callback/lock.
            queueMicrotask(()=>{if(active)void refresh();});
          }
        }).data.subscription;
        void refresh();
      }
      return()=>{active=false;generation++;intent++;subscription?.unsubscribe();subscription=null;};
    },
    refresh,
    reloadAuthSettings,
    async sendOtp(input){
      if(!client){emit({status:'configuration_required',error:'Sign-in is not configured in this environment.'});return false;}
      if(operation||loading||snapshot.providersLoading||now()<snapshot.resendAt)return false;
      const request=typeof input==='object'&&input!==null?input:{contact:input};
      const raw=String(request.contact||'').trim();
      const contact=normalizeEmail(raw);
      if(!contact){emit({error:'Enter a valid Gmail or email address.'});return false;}
      if(!snapshot.providers.email){emit({error:'Email sign-in is unavailable.'});return false;}
      if(request.shouldCreateUser!==false&&!snapshot.providers.signup){emit({error:'New account registration is unavailable. Sign in to an existing account.'});return false;}
      loggedOut=false;operation=true;const ticket=generation;
      emit({status:'otp_sending',contact,otpLength:emailOtpLength,error:''});
      try {
        const data=request.data&&typeof request.data==='object'?request.data:undefined;
        const redirectTo=recoveryRedirect();
        const {error}=await client.auth.signInWithOtp({email:contact,options:{shouldCreateUser:request.shouldCreateUser!==false,...(redirectTo?{emailRedirectTo:redirectTo}:{}),...(data?{data}:{})}});
        if(error)throw error;
        if(ticket!==generation)return false;
        emit({status:'otp_sent',resendAt:now()+60000});return true;
      }catch(error){if(ticket===generation)emit({status:'error',error:safeAuthError(error),resendAt:now()+60000});return false;}
      finally{operation=false;}
    },
    async verifyOtp(code){
      const codeIsValid=validOtp(code,snapshot.otpLength);
      if(!client||operation||!snapshot.contact||!codeIsValid){emit({error:`Enter the ${snapshot.otpLength}-digit verification code.`});return false;}
      operation=true;const ticket=intent;emit({status:'verifying',error:''});
      try{
        const {error}=await client.auth.verifyOtp({email:snapshot.contact,token:code,type:'email'});
        if(error)throw error;
        if(!active||ticket!==intent)return false;
        const account=await refresh();return Boolean(account.user);
      }catch(error){if(active&&ticket===intent)emit({status:'otp_sent',error:safeAuthError(error)});return false;}
      finally{operation=false;}
    },
    async signInWithGoogle(){
      if(snapshot.providersLoading||!snapshot.providers.google){emit({error:'Google sign-in is temporarily unavailable. Choose another available method.'});return false;}
      if(!client?.auth?.signInWithOAuth){emit({error:'Google sign-in is not configured in this environment.'});return false;}
      if(operation||loading||snapshot.oauthPending)return false;
      loggedOut=false;operation=true;emit({error:'',status:'oauth_redirecting',oauthPending:true});
      try {
        if(googleSignIn)await googleSignIn(client);
        else {
          const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:globalThis.location?.origin?`${globalThis.location.origin}/user/home`:undefined}});
          if(error)throw error;
        }
        return true;
      } catch {emit({status:'signed_out',oauthPending:false,error:'Google sign-in could not open. Try again or choose another available method.'});return false;}
      finally{operation=false;}
    },
    cancelGoogleSignIn(){
      if(snapshot.status==='oauth_redirecting')emit({status:'signed_out',oauthPending:false});
    },
    googleSignInError(message){emit({status:'signed_out',oauthPending:false,error:message||'Google sign-in could not be completed. Try again.'});},
    async completeGoogleSignIn(code){
      if(!active||loggedOut||!client?.auth?.exchangeCodeForSession||typeof code!=='string'||!code||code.length>2048)return false;
      const ticket=intent;operation=true;emit({status:'verifying',oauthPending:true,error:''});
      try {
        const {error}=await client.auth.exchangeCodeForSession(code);
        if(error)throw error;
        if(!active||ticket!==intent||loggedOut)return false;
        await refresh();
        if(!snapshot.account.user)emit({error:snapshot.error||'Your account could not be loaded. Try signing in again.'});
        return Boolean(snapshot.account.user);
      } catch {
        if(active&&ticket===intent)emit({status:'signed_out',oauthPending:false,error:'This Google sign-in could not be verified. Start again.'});
        return false;
      } finally {operation=false;if(active&&ticket===intent)emit({oauthPending:false});}
    },
    // Emails a recovery link. The same neutral confirmation is shown on success so the
    // form never reveals whether an address is registered.
    async requestPasswordReset(input){
      if(operation||snapshot.password.status==='sending')return false;
      if(!client?.auth?.resetPasswordForEmail){emit({password:{mode:'request',status:'error',email:'',error:'Password reset is not configured in this environment.'}});return false;}
      const raw=String((typeof input==='object'&&input!==null?input.email:input)||'').trim();
      const email=normalizeEmail(raw);
      if(!email){emit({password:{mode:'request',status:'error',email:raw,error:'Enter the email address linked to your account.'}});return false;}
      operation=true;
      emit({password:{mode:'request',status:'sending',email,error:''}});
      try{
        const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:recoveryRedirect()});
        // Some Auth configurations report an unknown address outright. Answer exactly as
        // a successful send so the form still cannot be used to probe for accounts.
        if(error&&error.code!=='user_not_found')throw error;
        emit({password:{mode:'request',status:'sent',email,error:''}});
        return true;
      }catch(error){emit({password:{mode:'request',status:'error',email,error:passwordResetError(error)}});return false;}
      finally{operation=false;}
    },
    openPasswordUpdate(){emit({password:{mode:'update',status:'idle',email:snapshot.account.user?.email||'',error:''}});},
    openPasswordReset(){emit({password:{mode:'request',status:'idle',email:'',error:''}});},
    closePassword(){emit({password:IDLE_PASSWORD});},
    // Sets the password of a signed-in account. Works both for an account that already
    // has an email identity (change) and for a Google-only account (set).
    async updatePassword(next,confirmation){
      if(operation||snapshot.password.status==='updating')return false;
      if(!client?.auth?.updateUser){emit({password:{...snapshot.password,status:'error',error:'Passwords are not available in this environment.'}});return false;}
      const holder=snapshot.account.user||snapshot.recovery;
      if(!holder){emit({password:{mode:'update',status:'error',email:'',error:'Open this page while signed in to change your password.'}});return false;}
      const issues=passwordIssues(next);
      if(issues.length){emit({password:{...snapshot.password,status:'error',error:issues[0]}});return false;}
      if(String(next)!==String(confirmation)){emit({password:{...snapshot.password,status:'error',error:'Both passwords must match.'}});return false;}
      operation=true;
      emit({password:{...snapshot.password,status:'updating',error:''}});
      try{
        const {error}=await client.auth.updateUser({password:String(next)});
        if(error)throw error;
        // A recovery session exists only to change the password; it is spent now.
        emit({password:{mode:'update',status:'updated',email:holder.email||'',error:''},recovery:false});
        await refresh();
        return true;
      }catch(error){emit({password:{...snapshot.password,status:'error',error:passwordResetError(error)}});return false;}
      finally{operation=false;}
    },
    async signOutEverywhere(){
      if(!client?.auth?.signOut||operation)return false;
      operation=true;
      try{
        const {error}=await client.auth.signOut({scope:'global'});
        if(error)throw error;
      }catch{emit({password:{...snapshot.password,error:'Could not sign out everywhere. Please try again.'}});return false;}
      finally{operation=false;}
      generation++;intent++;loggedOut=true;lastUser=null;clear();
      emit({account:EMPTY_ACCOUNT,status:'signed_out',oauthPending:false,contact:'',error:'',resendAt:0,password:IDLE_PASSWORD,recovery:false});
      return true;
    },
    changeContact(){generation++;intent++;emit({status:client?'signed_out':'configuration_required',contact:'',error:'',resendAt:snapshot.resendAt});},
    async logout(){
      generation++;intent++;loggedOut=true;lastUser=null;clear();emit({account:EMPTY_ACCOUNT,status:'signed_out',oauthPending:false,contact:'',error:'',resendAt:0,password:IDLE_PASSWORD,recovery:false});
      // Local sign-out clears the SDK's own token storage even when remote revocation
      // is unavailable; do not retain a custom session/token copy.
      if(client){try{await client.auth.signOut({scope:'local'});}catch{ /* SDK storage is cleared below through configured adapter storage. */ }
        try { for(const key of Object.keys(localStorage||{}))if(/^sb-.*-auth-token(?:-code-verifier)?$/.test(key))localStorage.removeItem(key); }catch{ /* restricted storage */ }
      }
    }
  };
}
