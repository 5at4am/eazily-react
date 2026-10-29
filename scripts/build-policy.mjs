import { readdirSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { loadEnv } from 'vite';
const PRIVILEGED=/(SERVICE_ROLE|SECRET|PASSWORD|ACCESS_TOKEN|PRIVATE_KEY)/;
const privilegedJwt=code=>(code.match(/eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+/g)||[]).some(jwt=>{try{return JSON.parse(Buffer.from(jwt.split('.')[1],'base64url')).role!=='anon';}catch{return false;}});
export function stagingBuildErrors(env){
  const errors=[];
  const ref=env.SUPABASE_PROJECT_REF||'';
  if(env.EAZILY_TARGET_ENV!=='staging')errors.push('EAZILY_TARGET_ENV must explicitly be staging');
  if(!/^[a-z0-9]{20}$/.test(ref))errors.push('SUPABASE_PROJECT_REF must identify the approved staging project');
  try{const url=new URL(env.VITE_SUPABASE_URL||'');if(url.protocol!=='https:'||url.hostname!==`${ref}.supabase.co`)errors.push('VITE_SUPABASE_URL must match SUPABASE_PROJECT_REF');}catch{errors.push('VITE_SUPABASE_URL must be a valid HTTPS Supabase URL');}
  const key=env.VITE_SUPABASE_PUBLISHABLE_KEY||'';
  let publicKey=key.startsWith('sb_publishable_');
  if(!publicKey&&key.split('.').length===3){try{publicKey=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString()).role==='anon';}catch{publicKey=false;}}
  if(!publicKey)errors.push('VITE_SUPABASE_PUBLISHABLE_KEY must be a publishable or anon key');
  if(env.VITE_PARTNER_DEMO!=='false')errors.push('VITE_PARTNER_DEMO must be explicitly false');
  if(env.VITE_ENABLE_SERVICE_REGISTRATION_TEST_SKIP!=='false')errors.push('VITE_ENABLE_SERVICE_REGISTRATION_TEST_SKIP must be explicitly false');
  return errors;
}
export function buildPolicy(){
  let output, secretValues=[];
  return {
    name:'eazily-production-safety',apply:'build',
    configResolved(config){output=config.build.outDir;
      const allEnv={...loadEnv(config.mode,config.envDir||process.cwd(),''),...process.env};
      // Values of server-only secrets (never VITE_) must not appear anywhere in the output.
      secretValues=Object.entries(allEnv).filter(([name,value])=>PRIVILEGED.test(name)&&typeof value==='string'&&value.length>=12).map(([,value])=>value);
      if(config.mode==='staging'){
        const errors=stagingBuildErrors(allEnv);
        if(errors.length)throw new Error('Staging build blocked: '+errors.join('; '));
      }else if(allEnv.EAZILY_TARGET_ENV==='staging')throw new Error('Staging build blocked: use `npm run build:staging` so the staging-only checks run.');
      for(const [name,value] of Object.entries({...config.env,...process.env})){
        if(name.startsWith('VITE_')&&/(AUTH_BYPASS|MOCK_AUTH|TEST_AUTH)/.test(name)&&value==='true')throw new Error('Authentication bypass flags are prohibited in application builds.');
        if(name.startsWith('VITE_')&&/(SERVICE_ROLE|SECRET|PASSWORD|ACCESS_TOKEN)/.test(name)&&value)throw new Error('Privileged Vite configuration is prohibited.');
      }
    },
    generateBundle(_options,bundle){
      const modules=Object.values(bundle).flatMap(asset=>Object.keys(asset.modules||{}));
      const forbidden=modules.filter(id=>{
        const path=id.replaceAll('\\','/');
        // The Supabase client is now a legitimate runtime dependency. Fixture data
        // and the development OTP bypass remain banned so sample records can never
        // reach a real database.
        return /scripts\/|data\/demo\.js|auth\/developmentOtp\.js/.test(path);
      });
      if(forbidden.length)throw new Error('Unsafe test modules leaked into the local sample build: '+forbidden.map(id=>id.split('/').at(-1)).join(', '));
      for(const file of Object.values(bundle))if(file.type==='chunk'&&/Testing OTP|Local development login|OTP 0000|development-session-only|dev-otp-user|eazily-testing-account|AUTH_FIXTURE_ONLY/.test(file.code))throw new Error('Runtime authentication bypass found in production output.');
      for(const file of Object.values(bundle)){
        const text=file.type==='chunk'?file.code:typeof file.source==='string'?file.source:Buffer.from(file.source||'').toString('latin1');
        if(/sb_secret_[\w-]{16,}/.test(text)||privilegedJwt(text)||secretValues.some(value=>text.includes(value)))throw new Error('Privileged credential found in build output: '+file.fileName);
        // The publishable key is designed for the browser and is already covered by
        // the sb_secret_/JWT checks above. Only a secret key must never be shipped.
        if(/sb_secret_[\w-]{16,}/.test(text))throw new Error('Secret key found in build output: '+file.fileName);
      }
    },
    writeBundle(){
      // Only compressed application artwork is packaged. Preserve legacy sources
      // in public/ for users, but do not ship unused PNG logos or documentation.
      for(const folder of ['user-services','user-carousel']){
        const source=resolve('public/assets',folder);
        for(const name of readdirSync(source)){
          if(!/\.(webp|avif|svg)$/.test(name))continue;
          const target=resolve(output,'assets',folder,name);mkdirSync(dirname(target),{recursive:true});copyFileSync(resolve(source,name),target);
        }
      }
      const launchLogo=resolve('public/assets/eazily-launch-logo.png');
      const launchTarget=resolve(output,'assets/eazily-launch-logo.png');
      mkdirSync(dirname(launchTarget),{recursive:true});copyFileSync(launchLogo,launchTarget);
      const brandLogo=resolve('public/assets/eazily-partner-logo.png');
      copyFileSync(brandLogo,resolve(output,'assets/eazily-partner-logo.png'));
      {
        const sampleFolder=resolve('public/assets/demo/professional');
        for(const name of readdirSync(sampleFolder)){
          if(!/\.(webp|jpg|jpeg|png)$/.test(name))continue;
          const target=resolve(output,'assets/demo/professional',name);
          mkdirSync(dirname(target),{recursive:true});copyFileSync(resolve(sampleFolder,name),target);
        }
      }
    }
  };
}
