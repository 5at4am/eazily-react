import React from 'react';
import { createRoot } from 'react-dom/client';
import PartnerApp from '../src/pages/PartnerApp.jsx';
import { AccountContext } from '../src/lib/account.js';
import { RealtimeProvider } from '../src/lib/realtime.jsx';
import '../src/styles.css';
import '../src/experience.css';
import '../src/partner.css';
import '../src/product-polish.css';
import '../src/design-system.css';
import '../src/tailwind.css';
import '../src/responsive.css';

const root=createRoot(document.getElementById('root'));
const realtime={available:false,connectionState:'Offline',networkOnline:true,revision:0,scopes:[],lastSyncedAt:null,setPublicAudience:()=>{},retry:()=>{}};
window.renderRole=role=>{
  history.replaceState({eazilyDepth:0},'',location.href);
  const ids={professional:'10000000-0000-4000-8000-000000000001',influencer:'10000000-0000-4000-8000-000000000002',consultant:'10000000-0000-4000-8000-000000000003'};
  const account={user:{id:ids[role]},profile:{id:ids[role],full_name:'Pending Partner',account_status:'active'},roles:[role],applications:[{id:ids[role],role,status:'submitted',details:{name:'Pending Partner',businessName:'Pending Partner',creatorName:'Pending Partner',city:'Bhopal',stage:5}}],assessments:{},staff:null,isAdmin:false};
  root.render(<AccountContext.Provider value={{...account,logout:async()=>{}}}><RealtimeProvider value={realtime}><div className="phone-shell peazily-ui"><PartnerApp role={role} account={account} notify={message=>window.lastNotice=message} onWorkspace={()=>{}} onAddRole={()=>{}} onEditRegistration={()=>window.registrationRequested=true}/></div></RealtimeProvider></AccountContext.Provider>);
 };
window.renderRole(new URLSearchParams(location.search).get('role')||'professional');
