/* FloodLens AI feature layer: public weather/route lookups, local reports, notification and history views, safety assistant. */
(function(){
 'use strict';
 const modal=window.FloodLensModal;if(!modal)return;
 const toolsMarkup=` <section class="section-pad" id="tools" style="background:var(--bg2)">
  <div class="container">
   <h2 class="section-title fade-up">Flood Response <span class="gradient-text">Tools</span></h2>
   <p class="section-sub fade-up">Weather lookups, route planning, community reports, notifications and historical demonstration data.</p>
   <div class="feature-grid">
    <article class="feature-card"><div class="feature-icon"><i class="fa-solid fa-cloud-sun-rain"></i></div><h3>Weather Forecast</h3><p>Look up current conditions and a five-day forecast for a city using Open-Meteo weather data.</p><button class="fl-feature-btn" type="button" data-fl-tool="weather">Check weather <i class="fa-solid fa-arrow-right"></i></button></article>
    <article class="feature-card"><div class="feature-icon"><i class="fa-solid fa-route"></i></div><h3>Route & Shelter Finder</h3><p>Get a road-route estimate and look for mapped emergency shelters near your destination.</p><button class="fl-feature-btn" type="button" data-fl-tool="route">Find route & shelters <i class="fa-solid fa-arrow-right"></i></button></article>
    <article class="feature-card"><div class="feature-icon"><i class="fa-solid fa-house-circle-exclamation"></i></div><h3>Citizen Flood Reporting</h3><p>Sign in to submit and track your flood or waterlogging observations.</p><button class="fl-feature-btn" type="button" data-fl-tool="report">Submit a report <i class="fa-solid fa-arrow-right"></i></button></article>
    <article class="feature-card"><div class="feature-icon"><i class="fa-solid fa-bell"></i></div><h3>Notification Centre</h3><p>Review the website's sample alerts in one place and distinguish simulated notices from official warnings.</p><button class="fl-feature-btn" type="button" data-fl-tool="notifications">Open notifications <i class="fa-solid fa-arrow-right"></i></button></article>
    <article class="feature-card"><div class="feature-icon"><i class="fa-solid fa-chart-line"></i></div><h3>Historical Flood Analysis</h3><p>Compare the demonstration locations by sample risk score and inspect the limitations of the dataset.</p><button class="fl-feature-btn" type="button" data-fl-tool="history">Explore analysis <i class="fa-solid fa-arrow-right"></i></button></article>
   </div>
   <p class="fl-form-note" style="margin-top:18px"><i class="fa-solid fa-circle-info"></i> Route results are not flood-aware, shelter listings may be incomplete, and sample alerts or historical values are not official operational information.</p>
  </div>
 </section>
`;
 const gallery=document.getElementById('gallery');if(gallery&&!document.getElementById('tools'))gallery.insertAdjacentHTML('beforebegin',toolsMarkup);
 const nav=document.getElementById('navLinks');
 if(nav&&!nav.querySelector('a[href="#tools"]')){
  const li=document.createElement('li'),link=document.createElement('a');link.href='#tools';link.textContent='Tools';li.appendChild(link);
  const galleryLink=nav.querySelector('a[href="#gallery"]')?.parentElement;
  if(galleryLink)nav.insertBefore(li,galleryLink);else nav.appendChild(li);
 }
 // Notification bell + a proper dropdown feed with persistent read/unread state.
 const notificationAlerts=(typeof demoAlerts!=='undefined'&&Array.isArray(demoAlerts))?demoAlerts:[];
 const notificationReadKey='floodLensReadNotifications';
 let notificationReadIds=new Set();
 let notificationFilter='all';
 try{notificationReadIds=new Set(JSON.parse(localStorage.getItem(notificationReadKey)||'[]').map(String));}catch(_error){}
 const navInner=document.querySelector('.nav-inner');
 const navToggle=document.getElementById('navToggle');
 let notificationButton=document.getElementById('flNotificationButton');
 if(navInner&&!notificationButton){
  notificationButton=document.createElement('button');
  notificationButton.type='button';notificationButton.id='flNotificationButton';notificationButton.className='fl-notify-trigger';
  notificationButton.setAttribute('aria-label','Open notifications');notificationButton.setAttribute('aria-expanded','false');
  notificationButton.innerHTML='<i class="fa-solid fa-bell" aria-hidden="true"></i><span class="fl-notify-badge" id="flNotifyBadge" aria-label="Unread notifications"></span>';
  if(navToggle)navInner.insertBefore(notificationButton,navToggle);else navInner.appendChild(notificationButton);
 }
 const notificationPanel=document.createElement('section');
 notificationPanel.className='fl-notify-panel';notificationPanel.id='flNotificationPanel';notificationPanel.setAttribute('aria-label','Notifications');
 notificationPanel.innerHTML=`
  <header class="fl-notify-header">
   <div><div class="fl-notify-title">Notifications <span id="flNotifyTotal">0</span></div><small>FloodLens alert centre</small></div>
   <button type="button" class="fl-notify-close" aria-label="Close notifications">&times;</button>
  </header>
  <div class="fl-notify-toolbar">
   <div class="fl-notify-tabs" role="group" aria-label="Filter notifications">
    <button type="button" class="is-active" data-notify-filter="all">All</button>
    <button type="button" data-notify-filter="unread">Unread</button>
   </div>
   <button type="button" class="fl-notify-mark-all">Mark all as read</button>
  </div>
  <div class="fl-notify-list" id="flNotifyList"></div>
  <footer class="fl-notify-footer"><i class="fa-solid fa-circle-info" aria-hidden="true"></i> Sample alerts only. Not live government warnings or emergency notifications.</footer>
 `;
 document.body.appendChild(notificationPanel);
 const notificationList=notificationPanel.querySelector('#flNotifyList');
 function notificationId(alert,index){return String(alert.id??index);}
 function saveReadNotifications(){try{localStorage.setItem(notificationReadKey,JSON.stringify(Array.from(notificationReadIds)));}catch(_error){}}
 function unreadNotificationCount(){return notificationAlerts.filter((alert,index)=>!notificationReadIds.has(notificationId(alert,index))).length;}
 function updateNotificationBadge(){
  const count=unreadNotificationCount(),badge=notificationButton?.querySelector('#flNotifyBadge');
  if(badge){badge.textContent=count>99?'99+':String(count);badge.hidden=count===0;}
  notificationButton?.setAttribute('aria-label',count?('Open notifications, '+count+' unread'):'Open notifications');
  const total=notificationPanel.querySelector('#flNotifyTotal');if(total)total.textContent=String(count);
  const markAll=notificationPanel.querySelector('.fl-notify-mark-all');if(markAll)markAll.disabled=count===0;
 }
 function renderNotifications(){
  notificationList.replaceChildren();
  const visible=notificationAlerts.map((alert,index)=>({alert,id:notificationId(alert,index),unread:!notificationReadIds.has(notificationId(alert,index))}))
   .filter(item=>notificationFilter==='all'||item.unread);
  if(!visible.length){
   const empty=document.createElement('div');empty.className='fl-notify-empty';
   const icon=document.createElement('i');icon.className='fa-regular fa-bell-slash';
   const title=document.createElement('strong');title.textContent=notificationFilter==='unread'?'You are all caught up':'No notifications available';
   const copy=document.createElement('p');copy.textContent=notificationFilter==='unread'?'There are no unread sample alerts.':'There are no alert records to show.';
   empty.append(icon,title,copy);notificationList.appendChild(empty);
  }else{
   visible.forEach(({alert,id,unread})=>{
    const level=String(alert.level||'info').toLowerCase();
    const item=document.createElement('button');item.type='button';item.className='fl-notify-item '+(unread?'is-unread':'is-read');item.dataset.notifyId=id;
    const marker=document.createElement('span');marker.className='fl-notify-severity '+(level==='vhigh'?'is-vhigh':level==='high'?'is-high':level==='moderate'?'is-moderate':'is-low');marker.setAttribute('aria-hidden','true');
    const body=document.createElement('span');body.className='fl-notify-item-body';
    const meta=document.createElement('span');meta.className='fl-notify-item-meta';
    const levelLabel=document.createElement('span');levelLabel.className='fl-notify-level';levelLabel.textContent=level.replace(/[_-]/g,' ').toUpperCase()+' RISK';
    const sample=document.createElement('span');sample.className='fl-notify-sample';sample.textContent='SIMULATED';
    meta.append(levelLabel,sample);
    if(unread){const newLabel=document.createElement('span');newLabel.className='fl-notify-new';newLabel.textContent='NEW';meta.appendChild(newLabel);}
    const title=document.createElement('strong');title.textContent=alert.title||'Flood risk notification';
    const location=document.createElement('span');location.className='fl-notify-location';location.textContent=alert.location||'Location unavailable';
    const description=document.createElement('span');description.className='fl-notify-description';description.textContent=alert.desc||'No additional details provided.';
    const time=document.createElement('span');time.className='fl-notify-time';time.textContent=alert.time||'Sample timestamp unavailable';
    body.append(meta,title,location,description,time);item.append(marker,body);notificationList.appendChild(item);
   });
  }
  notificationPanel.querySelectorAll('[data-notify-filter]').forEach(button=>button.classList.toggle('is-active',button.dataset.notifyFilter===notificationFilter));
  updateNotificationBadge();
 }
 function openNotificationPanel(force){
  const shouldOpen=typeof force==='boolean'?force:!notificationPanel.classList.contains('is-open');
  notificationPanel.classList.toggle('is-open',shouldOpen);notificationButton?.setAttribute('aria-expanded',String(shouldOpen));
  if(shouldOpen)renderNotifications();
 }
 notificationButton?.addEventListener('click',()=>openNotificationPanel());
 notificationPanel.querySelector('.fl-notify-close').addEventListener('click',()=>openNotificationPanel(false));
 notificationPanel.querySelector('.fl-notify-mark-all').addEventListener('click',()=>{
  notificationAlerts.forEach((alert,index)=>notificationReadIds.add(notificationId(alert,index)));
  saveReadNotifications();renderNotifications();
 });
 notificationPanel.addEventListener('click',event=>{
  const filterButton=event.target.closest('[data-notify-filter]');
  if(filterButton){notificationFilter=filterButton.dataset.notifyFilter;renderNotifications();return;}
  const item=event.target.closest('[data-notify-id]');
  if(item){notificationReadIds.add(item.dataset.notifyId);saveReadNotifications();renderNotifications();}
 });
 document.addEventListener('click',event=>{
  if(notificationPanel.classList.contains('is-open')&&!notificationPanel.contains(event.target)&&!notificationButton?.contains(event.target))openNotificationPanel(false);
 });
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&notificationPanel.classList.contains('is-open'))openNotificationPanel(false);});
 updateNotificationBadge();

 const chatMarkup=` <button class="fl-chat-launch" id="flChatLaunch" type="button" aria-label="Open FloodLens safety assistant"><i class="fa-solid fa-comment-dots"></i></button>
 <aside class="fl-chat-panel" id="flChatPanel" aria-label="FloodLens safety assistant" aria-live="polite">
  <div class="fl-chat-head"><div><strong><i class="fa-solid fa-shield-halved" style="color:#00d5ff"></i> FloodLens Assistant</strong><small>Safety-guidance prototype · not an official alert service</small></div><button class="fl-chat-close" id="flChatClose" type="button" aria-label="Close assistant">&times;</button></div>
  <div class="fl-chat-messages" id="flChatMessages"><div class="fl-chat-message bot">Hi! I can help with basic flood preparedness and safety guidance. I do not receive live emergency alerts. What would you like to know?</div></div>
  <form class="fl-chat-compose" id="flChatForm"><input class="fl-chat-input" id="flChatInput" autocomplete="off" maxlength="500" placeholder="Ask about flood safety…" aria-label="Message"><button class="fl-chat-send" type="submit" aria-label="Send message"><i class="fa-solid fa-paper-plane"></i></button></form>
 </aside>
`;
 document.body.insertAdjacentHTML('beforeend',chatMarkup);
 function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined&&text!==null)n.textContent=String(text);if(cls)n.className=cls;return n;}
 function field(labelText,control){const w=el('div',null,'fl-form-field'),l=el('label',labelText);l.htmlFor=control.id;w.append(l,control);return w;}
 function input(id,placeholder,type){const n=el('input');n.id=id;n.name=id;n.placeholder=placeholder||'';n.type=type||'text';return n;}
 function select(id,options){const n=el('select');n.id=id;n.name=id;options.forEach(p=>{const o=el('option',p[1]);o.value=p[0];n.appendChild(o);});return n;}
 function form(){const f=el('form');f.className='fl-feature-form';return f;}
 function note(t){return el('p',t,'fl-form-note');}
 function weatherLabel(code){
  if(code===0)return 'Clear sky';if([1,2,3].includes(code))return 'Mainly clear / partly cloudy';
  if([45,48].includes(code))return 'Fog';if([51,53,55,56,57].includes(code))return 'Drizzle';
  if([61,63,65,66,67,80,81,82].includes(code))return 'Rain / rain showers';
  if([71,73,75,77,85,86].includes(code))return 'Snow';if([95,96,99].includes(code))return 'Thunderstorm';
  return 'Weather conditions unavailable';
 }
 function openWeather(){
  const wrap=el('div'),f=form(),city=input('flWeatherCity','e.g. Raipur');city.required=true;
  const submit=el('button','Get forecast','fl-feature-btn');submit.type='submit';f.append(field('City or town',city),submit);
  const result=el('div');f.addEventListener('submit',async e=>{
   e.preventDefault();submit.disabled=true;submit.textContent='Loading…';result.replaceChildren(note('Looking up weather…'));
   try{
    const g=await fetch('https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(city.value.trim())+'&count=1&language=en&format=json');
    if(!g.ok)throw new Error('Location lookup is temporarily unavailable.');
    const place=(await g.json()).results?.[0];if(!place)throw new Error('No matching city found. Try adding state or country.');
    const url='https://api.open-meteo.com/v1/forecast?latitude='+place.latitude+'&longitude='+place.longitude+'&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&daily=precipitation_sum,precipitation_probability_max,weather_code&forecast_days=5&timezone=auto';
    const response=await fetch(url);if(!response.ok)throw new Error('Weather provider did not return a forecast.');
    const data=await response.json(),c=data.current,d=data.daily;result.replaceChildren();
    const location=el('p',place.name+(place.admin1?', '+place.admin1:'')+(place.country?', '+place.country:''));location.style.fontWeight='700';result.appendChild(location);
    const current=el('div',null,'fl-weather-current');current.append(el('div',Math.round(c.temperature_2m)+'°','fl-weather-temp'));
    const details=el('div');details.append(el('strong',weatherLabel(c.weather_code)),el('small','Humidity '+c.relative_humidity_2m+'% · Rain '+c.precipitation+' mm · Wind '+c.wind_speed_10m+' km/h'));current.appendChild(details);result.appendChild(current);
    const days=el('div',null,'fl-weather-days');d.time.forEach((day,i)=>{const box=el('div',null,'fl-weather-day');box.append(el('strong',new Date(day+'T12:00:00').toLocaleDateString(undefined,{weekday:'short'})),el('div',Math.round(d.precipitation_sum[i])+' mm'),el('small',d.precipitation_probability_max[i]+'% rain chance'));days.appendChild(box);});result.appendChild(days);
    result.append(note('Weather by Open-Meteo. Forecasts can change and are not official flood warnings. Check local weather and disaster-management advisories.'));
   }catch(error){result.replaceChildren(note(error.message||'Unable to load weather data.'));}
   finally{submit.disabled=false;submit.textContent='Get forecast';}
  });
  wrap.append(f,result,note('Enter a city to retrieve current conditions and a five-day forecast. Internet access is required.'));
  modal.open('Weather Forecast',wrap);city.focus();
 }
 async function geocode(place){
  const r=await fetch('https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(place)+'&count=1&language=en&format=json');
  if(!r.ok)throw new Error('Could not look up '+place+'.');const p=(await r.json()).results?.[0];if(!p)throw new Error('No matching place found for '+place+'.');return p;
 }
 function openRoute(){
  const wrap=el('div'),f=form(),grid=el('div',null,'fl-form-grid');
  const origin=input('flRouteOrigin','Starting point'),destination=input('flRouteDestination','Destination');origin.required=true;destination.required=true;
  const submit=el('button','Find route & shelters','fl-feature-btn');submit.type='submit';grid.append(field('From',origin),field('To',destination));f.append(grid,submit);
  const result=el('div');f.addEventListener('submit',async e=>{
   e.preventDefault();submit.disabled=true;submit.textContent='Searching…';result.replaceChildren(note('Looking up places and route…'));
   try{
    const pair=await Promise.all([geocode(origin.value.trim()),geocode(destination.value.trim())]),a=pair[0],b=pair[1];
    const routeUrl='https://router.project-osrm.org/route/v1/driving/'+a.longitude+','+a.latitude+';'+b.longitude+','+b.latitude+'?overview=false';
    const rr=await fetch(routeUrl);if(!rr.ok)throw new Error('Route provider is temporarily unavailable.');
    const rd=await rr.json();if(rd.code!=='Ok'||!rd.routes?.length)throw new Error('No driving route was returned.');
    const route=rd.routes[0],link='https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route='+a.latitude+'%2C'+a.longitude+'%3B'+b.latitude+'%2C'+b.longitude;
    result.replaceChildren(el('p',a.name+' → '+b.name));
    const summary=el('div',null,'fl-result-item');summary.append(el('strong',(route.distance/1000).toFixed(1)+' km · '+Math.round(route.duration/60)+' min estimated drive'),el('small','Road-routing estimate only. It does not account for floods, closures, weather or emergency restrictions.'));result.appendChild(summary);
    const linkNode=el('a','Open route in OpenStreetMap');linkNode.href=link;linkNode.target='_blank';linkNode.rel='noopener noreferrer';linkNode.className='fl-feature-btn';linkNode.style.display='inline-block';linkNode.style.textDecoration='none';linkNode.style.marginTop='10px';result.appendChild(linkNode);
    result.append(el('h4','Mapped emergency shelters near destination'));
    const shelterBox=el('div',null,'fl-result-list');shelterBox.append(note('Searching OpenStreetMap for mapped shelter features…'));result.appendChild(shelterBox);
    try{
     const q='[out:json][timeout:15];(nwr(around:5000,'+b.latitude+','+b.longitude+')["emergency"="shelter"];nwr(around:5000,'+b.latitude+','+b.longitude+')["amenity"="shelter"];);out center tags 10;';
     const sr=await fetch('https://overpass-api.de/api/interpreter?data='+encodeURIComponent(q));if(!sr.ok)throw new Error('Shelter search provider unavailable.');
     const sd=await sr.json();shelterBox.replaceChildren();
     if(!sd.elements?.length)shelterBox.append(note('No mapped shelter found within 5 km. This does not mean there are no shelters nearby. Ask local authorities for verified locations.'));
     sd.elements.slice(0,10).forEach(item=>{
      const tags=item.tags||{},card=el('div',null,'fl-result-item');card.append(el('strong',tags.name||tags.operator||'Mapped emergency shelter'));
      card.append(el('small',[tags['addr:street'],tags['addr:city'],tags.phone].filter(Boolean).join(' · ')||'Address details not provided in OpenStreetMap'));
      const lat=item.lat??item.center?.lat,lon=item.lon??item.center?.lon;
      if(lat&&lon){const mapLink=el('a','View on map');mapLink.href='https://www.openstreetmap.org/?mlat='+lat+'&mlon='+lon+'#map=17/'+lat+'/'+lon;mapLink.target='_blank';mapLink.rel='noopener noreferrer';mapLink.style.color='#00d5ff';card.appendChild(mapLink);}
      shelterBox.appendChild(card);
     });
    }catch(err){shelterBox.replaceChildren(note('Shelter lookup failed: '+err.message+' Use official local shelter information instead.'));}
    result.append(note('Safety notice: this is not a safe-route recommendation. Confirm road conditions and shelter availability with local disaster-management authorities. Never enter floodwater.'));
   }catch(error){result.replaceChildren(note(error.message||'Unable to calculate route.'));}
   finally{submit.disabled=false;submit.textContent='Find route & shelters';}
  });
  wrap.append(f,result,note('Road routing uses OSRM; mapped shelter data uses OpenStreetMap. Neither verifies current flooding, closures, shelter capacity or evacuation instructions.'));
  modal.open('Route & Shelter Finder',wrap);
 }
 function openReport(){
  if(!window.FloodLensAuth || !window.FloodLensAuth.requireSignIn('Sign in or create a FloodLens account before submitting a report.'))return;
  const wrap=el('div'),f=form(),grid=el('div',null,'fl-form-grid');
  const location=input('flReportLocation','Area, street or landmark');location.required=true;
  const type=select('flReportType',[['waterlogging','Waterlogging'],['river_overflow','River overflow'],['urban_flooding','Urban flooding'],['drain_blockage','Blocked drain'],['road_inundation','Road inundation'],['other','Other']]);
  const severity=select('flReportSeverity',[['low','Low'],['moderate','Moderate'],['high','High'],['very_high','Very high']]);
  const contact=input('flReportContact','Optional contact detail');
  const description=el('textarea');description.id='flReportDescription';description.name='description';description.placeholder='Describe what you observed (max 800 characters)…';description.maxLength=800;description.required=true;
  const submit=el('button','Submit flood report','fl-feature-btn');submit.type='submit';
  grid.append(field('Incident type',type),field('Severity observed',severity),field('Location',location),field('Contact (optional)',contact));
  f.append(grid,field('Observation details',description),submit);const result=el('div');
  f.addEventListener('submit',async e=>{
   e.preventDefault();submit.disabled=true;submit.textContent='Saving…';
   const report={id:'FLR-'+Date.now(),location:location.value.trim(),type:type.value,severity:severity.value,contact:contact.value.trim(),description:description.value.trim(),createdAt:new Date().toISOString(),status:'Saved locally'};
   let savedMessage='';
   try{
    const apiBase=window.FLOODLENS_API_BASE||'';
    if(apiBase){
     const accessToken=window.FloodLensAuth?.getAccessToken();
      if(!accessToken)throw new Error('Your sign-in session has expired. Please sign in again.');
      const response=await fetch(apiBase+'/api/reports',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+accessToken},body:JSON.stringify({location:report.location,type:report.type,severity:report.severity,description:report.description})});
     const payload=await response.json();if(!response.ok)throw new Error(payload.error||'Backend could not save the report.');
     report.id=payload.report_id||report.id;report.createdAt=payload.created_at||report.createdAt;report.status='Received by configured backend';
     savedMessage='Saved by the connected FloodLens backend. It has not been verified or forwarded to emergency services.';
    }else{
     const reports=JSON.parse(localStorage.getItem('floodLensCitizenReports')||'[]');reports.unshift(report);localStorage.setItem('floodLensCitizenReports',JSON.stringify(reports.slice(0,100)));
     savedMessage='Saved in this browser only. It has not been transmitted to a server, government agency or emergency service.';
    }
    result.replaceChildren();const success=el('div',null,'fl-result-item');
    success.append(el('strong','Report saved: '+report.id),el('small',savedMessage));
    const download=el('button','Download report JSON','fl-feature-btn');download.type='button';download.style.marginTop='10px';download.addEventListener('click',()=>{
     const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=report.id+'.json';a.click();URL.revokeObjectURL(url);
    });result.append(success,download);f.reset();
   }catch(error){result.replaceChildren(note(error.message||'Unable to save this report.'));}
   finally{submit.disabled=false;submit.textContent='Submit flood report';}
  });
  wrap.append(f,result,note('Privacy note: contact details, if entered, remain local to this browser and are not sent to the backend. Reports are observations, not verified incidents. This is not an emergency-reporting channel.'));
  modal.open('Citizen Flood Reporting',wrap);
 }
 function openNotifications(){openNotificationPanel(true);}
 function openHistory(){
  const wrap=el('div'),samples=(typeof demoLocations!=='undefined'?demoLocations:[]);
  if(!samples.length){wrap.append(note('Historical sample locations are not available.'));modal.open('Historical Flood Analysis',wrap);return;}
  wrap.append(note('Illustrative comparison of demonstration location records. These are not verified historical flood observations or a time-series archive.'));
  samples.slice().sort((a,b)=>b.riskScore-a.riskScore).forEach(loc=>{
   const row=el('div',null,'fl-result-item');row.append(el('strong',loc.name+' · '+loc.riskScore+'/100 risk score'),el('small','Sample category: '+String(loc.risk).toUpperCase()+' · rainfall '+loc.rainfall+' mm · flood depth '+loc.floodDepth+' m'));
   const bar=el('div',null,'fl-history-bar'),fill=el('div',null,'fl-history-fill');fill.style.width=Math.max(0,Math.min(100,loc.riskScore))+'%';bar.appendChild(fill);row.appendChild(bar);wrap.appendChild(row);
  });
  wrap.append(note('A genuine historical analysis requires dated, sourced flood records. Those datasets are not connected in this demo.'));
  modal.open('Historical Flood Analysis',wrap);
 }
 document.addEventListener('click',e=>{
  const button=e.target.closest('[data-fl-tool]');if(!button)return;
  const action=button.getAttribute('data-fl-tool');
  if(action==='weather')openWeather();else if(action==='route')openRoute();else if(action==='report')openReport();else if(action==='notifications')openNotifications();else if(action==='history')openHistory();
 });
 const panel=document.getElementById('flChatPanel'),launch=document.getElementById('flChatLaunch'),close=document.getElementById('flChatClose'),messages=document.getElementById('flChatMessages'),chatForm=document.getElementById('flChatForm'),chatInput=document.getElementById('flChatInput');
 function addMessage(text,role){const node=el('div',text,'fl-chat-message '+role);messages.appendChild(node);messages.scrollTop=messages.scrollHeight;}
 function localReply(text){
  const q=text.toLowerCase();
  if(/emergency|trapped|stranded|drowning|life.?threat|rescue|help me/.test(q))return 'If anyone is in immediate danger, contact your local emergency number or disaster-management authority now. Move to higher ground if you can do so safely. Do not enter floodwater or attempt a water rescue yourself. I cannot dispatch responders.';
  if(/drive|car|vehicle|road|cross.*water|walk.*water|floodwater/.test(q))return 'Do not drive, ride or walk through floodwater. Water depth and road damage can be hard to judge, and moving water can sweep people or vehicles away. Turn around and use an official detour only after confirming it is open.';
  if(/evacuat|shelter|leave home|where.*go/.test(q))return 'Follow evacuation instructions from local authorities. Use a designated, verified shelter and confirm it is open before travelling. Take essential medicines, documents, water, a phone and charger if time allows. Do not use this website’s sample map markers as shelter directions.';
  if(/prepare|kit|before.*flood|suppl/.test(q))return 'Prepare drinking water, essential medicines, a torch, batteries, phone power bank, first-aid supplies and copies of important documents in a waterproof bag. Keep family contact details accessible and monitor official local warnings.';
  if(/warning|alert|real.?time|live/.test(q))return 'The alerts currently displayed by this FloodLens demo are simulated sample records, not live government warnings. Check your local meteorological department and disaster-management authority for verified alerts and instructions.';
  if(/rain|weather|forecast/.test(q))return 'Use the Weather Forecast tool to look up current conditions and a five-day forecast. Weather forecasts do not by themselves confirm flood conditions; also monitor official local advisories.';
  if(/river|water level|rise/.test(q))return 'Avoid riverbanks, drains, culverts and low-lying areas when water levels are rising. Do not rely on sample river-level values shown in this demo. Follow readings and warnings published by the responsible local authority.';
  return 'I can help with general flood preparedness, evacuation precautions, flooded-road safety, weather lookups and understanding this demo. Ask a specific question, and always follow official emergency instructions.';
 }
 launch.addEventListener('click',()=>{panel.classList.add('is-open');launch.setAttribute('aria-expanded','true');chatInput.focus();});
 close.addEventListener('click',()=>{panel.classList.remove('is-open');launch.setAttribute('aria-expanded','false');launch.focus();});
 chatForm.addEventListener('submit',async e=>{
  e.preventDefault();const message=chatInput.value.trim();if(!message)return;addMessage(message,'user');chatInput.value='';chatInput.disabled=true;
  const thinking=el('div','Checking safety guidance…','fl-chat-message bot');messages.appendChild(thinking);messages.scrollTop=messages.scrollHeight;
  let answer='';
  try{const base=window.FLOODLENS_API_BASE||'';const response=await fetch(base+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message})});if(response.ok){const payload=await response.json();if(payload.reply)answer=payload.reply;}}catch(_error){}
  thinking.remove();if(!answer)answer=localReply(message)+'\n\n[Local safety-guidance prototype; live AI service is not connected.]';
  addMessage(answer,'bot');chatInput.disabled=false;chatInput.focus();
 });
 window.FloodLensTools={openWeather,openRoute,openReport,openNotifications,openHistory};
})();