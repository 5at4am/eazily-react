import React from 'react';
import { createRoot } from 'react-dom/client';
import PartnerApp, { Workspace } from '../src/pages/PartnerApp.jsx';
import PartnerDashboard from '../src/features/partners/PartnerDashboard.jsx';
import { AccountContext } from '../src/lib/account.js';
import { RealtimeProvider } from '../src/lib/realtime.jsx';
import '../src/styles.css';
import '../src/experience.css';
import '../src/partner.css';
import '../src/product-polish.css';
import '../src/style.css';
import '../src/responsive.css';

const root=createRoot(document.getElementById('root'));
const realtime={available:false,connectionState:'Offline',networkOnline:true,revision:0,scopes:[],lastSyncedAt:null,setPublicAudience:()=>{},retry:()=>{}};
window.renderRole=role=>{
  history.replaceState({eazilyDepth:0},'',location.href);
  const partnerRoles=['professional','influencer','consultant'];
  const account={user:{id:`navigation-${role}`},profile:{id:`navigation-${role}`,full_name:'Pending Partner',account_status:'active'},roles:partnerRoles,applications:partnerRoles.map(item=>({id:`application-${item}`,role:item,status:item===role?'submitted':'approved',details:{name:'Pending Partner',businessName:'Pending Partner',creatorName:'Pending Partner',city:'Bhopal',stage:5}})),assessments:{},staff:null,isAdmin:false};
  root.render(<AccountContext.Provider value={{...account,logout:async()=>{}}}><RealtimeProvider value={realtime}><div className="phone-shell peazily-ui"><PartnerApp role={role} account={account} notify={message=>window.lastNotice=message} onWorkspace={workspace=>window.selectedWorkspace=workspace} onAddRole={()=>{}} onEditRegistration={()=>window.registrationRequested=true}/></div></RealtimeProvider></AccountContext.Provider>);
};
window.renderWorkspacePicker=current=>{
  const roles=['professional','influencer','consultant'];
  const account={user:{id:'navigation-switch-picker'},profile:{id:'navigation-switch-picker',full_name:'Partner'},roles,applications:roles.map(role=>({id:`switch-${role}`,role,status:'approved',details:{}}))};
  root.render(<AccountContext.Provider value={{...account,logout:async()=>{}}}><RealtimeProvider value={realtime}><div className="phone-shell peazily-ui"><Workspace account={account} current={current} onWorkspace={workspace=>window.selectedWorkspace=workspace}/></div></RealtimeProvider></AccountContext.Provider>);
};
window.renderHomeLayout=role=>{
  const profile=role==='professional'?{businessName:'Sample service professional',category:'Electrician'}:role==='influencer'?{creatorName:'Sample creator',category:'Lifestyle'}:{name:'Sample consultant',category:'Career'};
  root.render(<div className={`partner-workspace role-${role} partner-dashboard-home-view`}><main className="screen partner-screen"><div className="seller-content"><PartnerDashboard role={role} profile={profile} approved application={{status:'approved'}} data={{orders:[],earnings:[],reviews:[],posts:[],leads:[],notifications:[]}} online={false} busy={false} total={()=>0} money={value=>`₹${value}`} setRoute={()=>{}} setSheet={()=>{}} act={callback=>callback()} setAvailability={async online=>({online})} setOnline={()=>{}} notify={()=>{}} onEditRegistration={()=>{}} /></div></main></div>);
};
