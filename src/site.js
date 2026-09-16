/* The robot looks round the edge of the moon before it commits. One
   implementation, used by the loader and by the footer mark. */
window.WonderSneak = (function () {
  var OUT = 1.62;                                // OUT puts the face off the moon entirely
  // peek, hesitate, then slide in. Keyframes rather than one curve so the
  // hesitation is something we can tune rather than a happy accident.
  var KEYS = [[0, OUT], [0.30, 1.18], [0.46, 1.14], [1, null]];
  function ease(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; }
  function at(t, home) {
    for (var i = 1; i < KEYS.length; i++) {
      if (t <= KEYS[i][0]) {
        var a = KEYS[i-1], b = KEYS[i];
        var av = a[1] === null ? home : a[1], bv = b[1] === null ? home : b[1];
        return av + (bv - av) * ease((t - a[0]) / (b[0] - a[0] || 1));
      }
    }
    return home;
  }
  function park(cv) {
    if (!cv || !window.WonderMark) return false;
    var g = WonderMark.geom(cv);
    if (!g) return false;
    cv._wmdx = OUT;
    WonderMark.drawLockup(cv, g.W, g.H, g.px, g.ink, g.sub, OUT);
    return true;
  }
  function run(cv, dur, done) {
    var g = window.WonderMark && WonderMark.geom(cv);
    if (!g) { if (done) done(); return; }
    var home = WonderMark.HOME, t0 = null;
    (function frame(now) {
      if (t0 === null) t0 = now;
      var t = Math.min(1, (now - t0) / dur);
      cv._wmdx = at(t, home);
      WonderMark.drawLockup(cv, g.W, g.H, g.px, g.ink, g.sub, cv._wmdx);
      if (t < 1) requestAnimationFrame(frame);
      else { cv._wmdx = undefined; if (done) done(); }
    })(performance.now());
  }
  function hide(cv, dur, done) {
    var g = window.WonderMark && WonderMark.geom(cv);
    if (!g) { if (done) done(); return; }
    var home = WonderMark.HOME, t0 = null;
    (function frame(now) {
      if (t0 === null) t0 = now;
      var t = Math.min(1, (now - t0) / dur);
      cv._wmdx = home + (OUT - home) * ease(t);
      WonderMark.drawLockup(cv, g.W, g.H, g.px, g.ink, g.sub, cv._wmdx);
      if (t < 1) requestAnimationFrame(frame); else if (done) done();
    })(performance.now());
  }
  return { OUT: OUT, park: park, run: run, hide: hide, at: at };
})();
/* The price list, once. The quote page and the quote drop in the bar both
   read it, so a price changed here changes everywhere. */
window.WonderQuote = (function(){
  // Supply: the 2026 Moton Australia price list, list prices in AUD ex GST.
  // Every picture is our own: a studio render of that machine, or our
  // photograph of it running downstairs. No maker collages.
  var MACHINES=[
    {id:'bpro', name:'Coffee barista',   model:'B Pro, bar type',          kit:'Dual arm, Eversys, BTB Z02 ice, Yingmei cup printer', price:100000, img:'{{root}}img/offer/coffee-bar-studio.jpg'},
    {id:'bstd', name:'Coffee barista',   model:'B Standard, bar type',     kit:'Dual arm, Dr.Coffee F3, ice, cup printer', price:67000,  img:'{{root}}img/machines/coffee-robot-light.jpg'},
    {id:'eff',  name:'Coffee robot',     model:'Smart EFF, vending kiosk', kit:'Dual arm, Dr.Coffee F200, ice, 3 syrups, milk frother, printer', price:74000, img:'{{root}}img/machines/coffee-robot-d1.jpg'},
    {id:'bar',  name:'Robot bartender',  model:'T Standard',               kit:'Dobot arm, BTB Z02 ice, 3 syrup channels', price:39000, img:'{{root}}img/offer/robot-bar-studio.jpg'},
    {id:'ice',  name:'Ice cream robot',  model:'I Pro',                    kit:'Pasteurising machine, 3 syrups, 2 toppings', price:41000, img:'{{root}}img/tile-kiosk.jpg'},
    {id:'fry',  name:'Deep frying robot',model:'F Standard',               kit:'Dobot arm, 6 frying stoves', price:42000, img:'{{root}}img/tile-arm.jpg'},
    {id:'noo',  name:'Noodle robot',     model:'N Standard',               kit:'Dobot arm, 6 noodle stoves', price:52000, img:'{{root}}img/valley-baths.jpg'}
  ];

  // Hardware add-ons. The Moton list prices these inside the formats and never
  // on their own, so these are indicative round numbers, not list: they say so
  // on the sheet and are confirmed on scope.
  var PARTS=[
    {id:'icem', name:'Ice maker',                     sub:'BTB Z02. A second, or one on a line with none', price:3800,
     img:'{{root}}img/coffee/bar-06-service-front.jpg', alt:'The bar with its doors open, the ice maker and services inside'},
    {id:'prnt', name:'Chocolate and caramel printer',  sub:'Yingmei. Your mark on the crema or the foam',   price:5200,
     img:'{{root}}img/machines/coffee-robot-d2.jpg', alt:'Milk poured into a cup, the pattern forming on the crema'},
    {id:'milk', name:'Extra milk line',                sub:'A second milk, oat or soy',                     price:1900,
     img:'{{root}}img/machines/coffee-hero.jpg', alt:'A dual arm at the machine with the milk jug in hand'},
    {id:'syr',  name:'Extra syrup channels',           sub:'Three more, beyond the three supplied',         price:1400,
     img:'{{root}}img/machines/coffee-robot-d3.jpg', alt:'The machine head, grinder and syrup lines'}
  ];

  // The work around the machine, calculated from what you picked: a percentage
  // of the machine subtotal with a floor, because a fit-out for one $42,000
  // fryer and one for a $100,000 bar are not the same job. Indicative until we
  // have seen the room. Change the numbers here and the whole site follows.
  var SERVICES=[
    {id:'eng',   name:'Engineering and fit-out', sub:'Counter, cell, guarding, services, extraction, drawings, the build', pct:0.22, min:12000,
     img:'{{root}}img/process/03-fitout.jpg', alt:'The line going in: bare stainless benches, extraction hood, a fitter at work'},
    {id:'brand', name:'Branding',                sub:'Mark, colours, cups, bags, menu, signage',                           pct:0.06, min:6000,
     img:'{{root}}img/coffee/brand-01-family.jpg', alt:'Cups and bags carrying the mark, the whole family together'},
    {id:'web',   name:'Website',                 sub:'Designed and built in the same brand, with the menu and ordering', pct:0.02, min:6500,
     img:'{{root}}img/offer/website.jpg', alt:'A page of a website we designed and built'},
    {id:'wrap',  name:'Branding on the machine', sub:'Your colours on the arms and the body, your mark on the screen',  pct:0.03, min:2500,
     img:'{{root}}img/coffee/bar-02-front.jpg', alt:'Two robot arms finished in the brand colours on a timber bar'},
    {id:'soft',  name:'Software',                sub:'Ordering, payment, the screen, the dashboard',                       pct:0.10, min:8000,
     img:'{{root}}img/lrd/menu.jpg', alt:'The ordering screen with the menu on it'},
    {id:'inst',  name:'Install and handover',    sub:'Site survey, placement, services, first run, staff training',        pct:0.08, min:3500, on:true,
     img:'{{root}}img/process/04-commission.jpg', alt:'Technicians on the finished line for the first run and the training'}
  ];
  // How a buyer thinks about the machines: one robot, then which model of it,
  // then the accessories that fit that robot and no other.
  var FAMILIES=[
    {id:'coffee',   name:'Coffee robot',      line:'A barista in about two square metres, seventy seconds a drink.', models:['bpro','bstd','eff'], parts:['icem','prnt','milk','syr'], img:'{{root}}img/offer/coffee-bar-studio.jpg'},
    {id:'cocktail', name:'Robot bartender',   line:'An arm under a rack of your bottles, the same measure every time.', models:['bar'], parts:['icem','syr'], img:'{{root}}img/offer/robot-bar-studio.jpg'},
    {id:'icecream', name:'Ice cream robot',   line:'Pasteurised soft serve, and an arm that hands the cone over.', models:['ice'], parts:['syr'], img:'{{root}}img/tile-kiosk.jpg'},
    {id:'fryer',    name:'Deep frying robot', line:'Six fryers: basket in, timed, lifted, drained, plated.', models:['fry'], parts:[], img:'{{root}}img/tile-arm.jpg'},
    {id:'noodle',   name:'Noodle robot',      line:'Six noodle stoves, cooked to the order, bowl after bowl.', models:['noo'], parts:[], img:'{{root}}img/valley-baths.jpg'}
  ];
  // The showroom robots, written in from the catalogue at build time. There is
  // no list price for any of them, so they sit on a quote as a line priced on
  // request and never move the total.
  var ROBOTS=/*{{robots}}*/[];
  var RATES={
    maintenance_pct_per_year:{standard:0.07, priority:0.11},
    delivery_inland:2400
  };
  var GST=0.10;

  // Packages: the whole job at one price. Everything a venue needs to open,
  // from the brand and the website to the machine, the fit-out and a year of
  // maintenance, with 10% off the work because it is one team doing all of it.
  // Machines stay at list: the discount only ever comes off the work.
  // Website and branding on the machine are indicative set prices until
  // confirmed. The container build has no price yet and says so.
  var PACKAGE_OFF=0.10;
  var PACKAGE_WORK=['brand','web','wrap','eng','soft','inst'];
  var PACKAGES=[
    {id:'bar', name:'The robot coffee bar', line:'A barista bar in your brand, fitted into the venue you have.',
     machines:{bpro:1}, img:'{{root}}img/offer/coffee-bar-studio.jpg', alt:'The dual-arm B Pro coffee bar on its counter',
     url:'{{root}}robot-coffee-bar-package/'},
    {id:'cafe', name:'The robot café', line:'Coffee and soft serve, the counter, the room and the brand across all of it.',
     machines:{bpro:1,ice:1}, img:'{{root}}img/coffee/venue-01-bar-in-room.jpg', alt:'A branded robot coffee bar in a venue, by the street door',
     url:'{{root}}robot-cafe-package/'},
    {id:'box', name:'The robot container kitchen', line:'A twenty foot container, an arm cooking behind glass, a skin that carries the brand.',
     machines:{fry:1,noo:1}, img:'{{root}}img/container/day.jpg', alt:'A branded shipping container kitchen at a market by day',
     extra:{name:'The container build', sub:'Twenty foot high-cube: cut, frame, line, hatch, extraction, the skin', note:'Priced on scope'},
     url:'{{root}}robot-container-kitchens/'}
  ];
  // A service is a share of the machine supply with a floor, rounded to $100.
  function serviceAmount(s,supply){ return Math.max(s.min,Math.round(supply*s.pct/100)*100); }
  // What a package costs, line by line: machines at list, each piece of work
  // on the shared formula, a year of standard maintenance, then 10% off the
  // work. Returns everything a page needs to show "separately" and "saved".
  function packageQuote(pk){
    var lines=[], supply=0;
    Object.keys(pk.machines).forEach(function(id){
      var m=MACHINES.filter(function(x){return x.id===id;})[0], n=pk.machines[id];
      supply+=m.price*n; lines.push({kind:'machine',id:id,name:m.name,sub:(n>1?n+' \u00d7 ':'')+m.model,img:m.img,amount:m.price*n});
    });
    var work=0;
    PACKAGE_WORK.forEach(function(id){
      var s=SERVICES.filter(function(x){return x.id===id;})[0], a=serviceAmount(s,supply);
      work+=a; lines.push({kind:'work',id:id,name:s.name,sub:s.sub,img:s.img,amount:a});
    });
    var care=Math.round(supply*RATES.maintenance_pct_per_year.standard/100)*100;
    work+=care; lines.push({kind:'work',id:'care',name:'A year of maintenance',sub:'Spares, monitoring, updates, a number that answers',img:'{{root}}img/process/04-commission.jpg',amount:care});
    var save=Math.round(work*PACKAGE_OFF/100)*100;
    return {lines:lines, supply:supply, work:work, separate:supply+work, save:save, total:supply+work-save, extra:pk.extra||null};
  }
  // What each part of a quote is: its stage in the job, one line on what it
  // is, what you get, and the facts that matter. Written only from facts the
  // site already states. Package pages and proposals both read this.
  var DETAILS={"bpro": {"stage": "Supply", "lead": "Two arms at an Eversys machine: one pulls the shot, one steams and pours. About seventy seconds a drink.", "gets": ["Dual-arm barista, bar type", "Eversys espresso machine", "BTB Z02 ice maker", "Yingmei cup printer", "8 and 12 oz, hot and iced", "One year warranty"], "facts": [["Footprint", "About two square metres"], ["Lead time", "About two months from order"], ["Delivered", "Within 100 km of a port"]]}, "ice": {"stage": "Supply", "lead": "A pasteurising soft-serve machine and a kiosk arm that hands the cone over. Ours runs the dessert kiosk downstairs.", "gets": ["I Pro ice cream robot", "Pasteurising machine", "Three syrups", "Two toppings", "Kiosk arm", "One year warranty"], "facts": [["On our floor", "365 St Pauls Terrace"], ["Lead time", "About two months from order"], ["Delivered", "Within 100 km of a port"]]}, "fry": {"stage": "Supply", "lead": "A Dobot arm working six frying stoves: basket in, timed, lifted, drained, plated.", "gets": ["F Standard deep frying robot", "Dobot arm", "Six frying stoves", "One year warranty"], "facts": [["On our floor", "365 St Pauls Terrace"], ["Lead time", "About two months from order"], ["Delivered", "Within 100 km of a port"]]}, "noo": {"stage": "Supply", "lead": "A Dobot arm over six noodle stoves, cooking to the order, bowl after bowl.", "gets": ["N Standard noodle robot", "Dobot arm", "Six noodle stoves", "One year warranty"], "facts": [["On our floor", "365 St Pauls Terrace"], ["Lead time", "About two months from order"], ["Delivered", "Within 100 km of a port"]]}, "brand": {"stage": "Design", "lead": "A brand, not a sticker. The mark and everything it goes on, drawn as one system across the machine and the room.", "gets": ["The mark and its lockups", "Colours and type", "Cups, bags and sacks", "The menu", "Signage", "Uniforms"], "facts": [["Worked example", "Wonder Bean, Sol and Luna"], ["Designed", "In Fortitude Valley"]]}, "web": {"stage": "Design", "lead": "The website in the same brand, with the menu on it and ordering one tap away.", "gets": ["Designed in the brand", "Built and launched", "The menu", "Ordering", "Your venue, hours and directions"], "facts": [["Example", "This site is one of ours"], ["Designed", "In Fortitude Valley"]]}, "wrap": {"stage": "Build", "lead": "Your colours on the arms and the body, your mark on the screen and the cup. The machine is the first thing in the brand people see.", "gets": ["Colours on the arms", "The body finished in the brand", "Your mark on the screen", "Your mark on the cup"], "facts": [["Worked example", "The Wonder Bean bar"], ["Finished", "Before it leaves us"]]}, "eng": {"stage": "Build", "lead": "The counter or cell the machine lives in, drawn to your floor plan and built by our trades or yours, to our drawings.", "gets": ["Drawings to your floor plan", "The counter or cell", "Guarding", "Services: power, water, drainage", "Extraction", "Joinery, stone, the skin, the screen"], "facts": [["Where", "The venue you have, or a new one"], ["Drawn", "To your floor plan"]]}, "soft": {"stage": "Commission", "lead": "The ordering, payment and screen every machine talks to, and the dashboard that tells you the numbers.", "gets": ["Ordering", "Payment", "The menu on the screen", "The dashboard", "The numbers"], "facts": [["Runs", "On the machines and the counter"], ["Built", "In Fortitude Valley"]]}, "inst": {"stage": "Commission", "lead": "We survey the site, place and connect the machines, program the menu, run it and train your people.", "gets": ["Site survey", "Placement and services", "Menu programmed", "First run", "Staff training"], "facts": [["Signed off", "After the first hundred served"], ["On site", "Our team"]]}, "care": {"stage": "Run", "lead": "The first year looked after: spares, monitoring and updates, and a number that answers when something stops.", "gets": ["Spares", "Monitoring", "Software updates", "A number that answers"], "facts": [["Plan", "Standard, the first year"], ["After that", "Priced by the year"]]}};
  // Pictures that need a different frame or a different subject on a page.
  var DETAIL_IMG={care:'{{root}}img/hero-kitchen.jpg'};
  var IMG_POS={'img/lrd/menu.jpg':'50% 18%','img/tile-kiosk.jpg':'50% 10%','img/hero-kitchen.jpg':'50% 60%','img/offer/website.jpg':'0% 40%'};

  // The whole quote from a state, as numbers and lines, with no page in it.
  // The quote page draws it, the proposal draws it, the build reads it.
  // state: {qty:{id:n}, parts:{id:bool}, svc:{id:bool}, pkg:id|null,
  //         plan:'standard'|'priority'|'none', term:1..5, site:'port'|'far'}
  function compute(st){
    var qty=st.qty||{}, parts=st.parts||{}, svc=st.svc||{}, plan=st.plan||'standard', term=st.term||1, site=st.site||'port';
    var money=new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',maximumFractionDigits:0});
    var lines=[], count=0, supply=0, asks=0, sub=0, workSum=0, indicative=false;
    MACHINES.forEach(function(m){ var n=qty[m.id]||0; if(!n) return;
      count+=n; supply+=n*m.price;
      lines.push({id:m.id,kind:'machine',n:n,label:m.name+', '+m.model,name:m.name,model:m.model,sub:n+' \u00d7 '+money.format(m.price)+', supply',value:n*m.price,img:m.img}); });
    ROBOTS.forEach(function(r){ var n=qty[r.id]||0; if(!n) return;
      asks+=n; indicative=true;
      lines.push({id:r.id,kind:'robot',n:n,label:r.name,name:r.name,model:r.kind,status:r.status,sub:n+' \u00d7 '+r.kind+', priced to order',value:null,ind:true,img:r.img}); });
    sub=supply;
    PARTS.forEach(function(p){ if(!parts[p.id]) return;
      sub+=p.price; indicative=true;
      lines.push({id:p.id,kind:'part',label:p.name,name:p.name,sub:p.sub+', indicative',value:p.price,ind:true,img:p.img}); });
    SERVICES.forEach(function(x){ if(!svc[x.id]||!count) return;
      var amt=serviceAmount(x,supply); sub+=amt; workSum+=amt; indicative=true;
      lines.push({id:x.id,kind:'service',label:x.name,name:x.name,sub:x.sub+', indicative',value:amt,ind:true,img:x.img}); });
    var noPlan=plan==='none', yr=0;
    if(count>0&&!noPlan){
      yr=Math.round(supply*RATES.maintenance_pct_per_year[plan]/100)*100;
      sub+=yr*term; indicative=true;
      lines.push({id:'care',kind:'care',label:(plan==='priority'?'Priority':'Standard')+' maintenance',name:(plan==='priority'?'Priority':'Standard')+' maintenance',
        sub:term+(term===1?' year':' years')+', '+money.format(yr)+' a year, indicative',value:yr*term,ind:true,img:DETAIL_IMG.care}); }
    var pk=st.pkg&&PACKAGES.filter(function(x){return x.id===st.pkg;})[0];
    var held=pk&&!noPlan&&Object.keys(pk.machines).every(function(m){return (qty[m]||0)>=pk.machines[m];})&&PACKAGE_WORK.every(function(w){return svc[w];});
    var save=0;
    if(held){
      save=Math.round((workSum+yr)*PACKAGE_OFF/100)*100;
      if(pk.extra){ lines.push({id:'extra',kind:'extra',label:pk.extra.name,name:pk.extra.name,sub:pk.extra.sub,value:null,note:pk.extra.note,ind:true,img:pk.img}); indicative=true; }
      sub-=save;
      lines.push({id:'save',kind:'save',label:'Package saving',name:'Package saving',sub:pk.name+', 10% off the work',value:-save,ind:true,img:pk.img});
    }
    if(count>0){
      if(site==='port') lines.push({id:'delivery',kind:'delivery',label:'Delivery',name:'Delivery',sub:'Within 100 km of a port, included',value:0});
      else{ sub+=RATES.delivery_inland; indicative=true; lines.push({id:'delivery',kind:'delivery',label:'Delivery',name:'Delivery',sub:'Beyond 100 km of a port, indicative',value:RATES.delivery_inland,ind:true}); }
    }
    var gst=Math.round(sub*GST);
    return {lines:lines,count:count,asks:asks,supply:supply,sub:sub,gst:gst,inc:sub+gst,indicative:indicative,pkg:held?pk:null,save:save,plan:plan,term:term,site:site};
  }

  // A quote as a URL and back, so a quote can be a link: the full quote page,
  // the proposal, an email. Unknown ids are ignored, numbers are clamped.
  function stateFromQuery(search){
    var get=function(k){ var m=(search||'').match(new RegExp('[?&]'+k+'=([^&]*)')); return m?decodeURIComponent(m[1]):''; };
    var st={qty:{},parts:{},svc:{},pkg:null,plan:'standard',term:1,site:'port',who:get('for').slice(0,80)};
    SERVICES.forEach(function(x){ if(x.on) st.svc[x.id]=true; });
    var pk=PACKAGES.filter(function(x){return x.id===get('pkg');})[0];
    if(pk){ st.pkg=pk.id; Object.keys(pk.machines).forEach(function(m){ st.qty[m]=pk.machines[m]; }); PACKAGE_WORK.forEach(function(w){ st.svc[w]=true; }); }
    var pp=parsePick(get('pick'));
    Object.keys(pp.qty).forEach(function(id){ st.qty[id]=pp.qty[id]; });
    Object.keys(pp.parts).forEach(function(id){ st.parts[id]=true; });
    Object.keys(pp.svc).forEach(function(id){ st.svc[id]=true; });
    if(['standard','priority','none'].indexOf(get('plan'))>=0) st.plan=get('plan');
    var t=parseInt(get('term'),10); if(t>=1&&t<=5) st.term=t;
    if(get('site')==='far') st.site='far';
    return st;
  }
  function toQuery(st){
    var pick=[];
    Object.keys(st.qty||{}).forEach(function(id){ var n=st.qty[id]; if(n>0) pick.push(n>1?id+':'+n:id); });
    Object.keys(st.parts||{}).forEach(function(id){ if(st.parts[id]) pick.push(id); });
    Object.keys(st.svc||{}).forEach(function(id){ if(st.svc[id]&&id!=='inst') pick.push(id); });
    var q=[]; if(pick.length) q.push('pick='+pick.join(','));
    if(st.pkg) q.push('pkg='+st.pkg);
    if(st.plan&&st.plan!=='standard') q.push('plan='+st.plan);
    if(st.term&&st.term!==1) q.push('term='+st.term);
    if(st.site==='far') q.push('site=far');
    if(st.who) q.push('for='+encodeURIComponent(st.who));
    return q.length?'?'+q.join('&'):'';
  }

  // ?pick=bpro:2,prnt,eng  ->  {qty:{bpro:2}, parts:{prnt:true}, svc:{eng:true}}
  function parsePick(str){
    var out={qty:{},parts:{},svc:{}}; if(!str) return out;
    decodeURIComponent(str).split(',').forEach(function(tok){
      var kv=tok.split(':'), id=kv[0], n=Math.max(1,Math.min(20,parseInt(kv[1],10)||1));
      if(MACHINES.some(function(m){return m.id===id;})||ROBOTS.some(function(r){return r.id===id;})) out.qty[id]=n;
      else if(PARTS.some(function(p){return p.id===id;})) out.parts[id]=true;
      else if(SERVICES.some(function(x){return x.id===id;})) out.svc[id]=true;
    });
    return out;
  }
  return {MACHINES:MACHINES,FAMILIES:FAMILIES,ROBOTS:ROBOTS,DETAILS:DETAILS,DETAIL_IMG:DETAIL_IMG,IMG_POS:IMG_POS,compute:compute,stateFromQuery:stateFromQuery,toQuery:toQuery,PACKAGES:PACKAGES,PACKAGE_OFF:PACKAGE_OFF,PACKAGE_WORK:PACKAGE_WORK,packageQuote:packageQuote,PARTS:PARTS,SERVICES:SERVICES,RATES:RATES,GST:GST,serviceAmount:serviceAmount,parsePick:parsePick,
          money:new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',maximumFractionDigits:0})};
})();
/* The product menu. Hover Machines (with a moment's intent, so the mouse
   passing over it does not flash a panel), or press the down arrow on it.
   It closes when the pointer leaves both the word and the panel, on Escape,
   on the blurred page, when focus leaves it, or when a link in it is used.
   On a touch screen the first tap opens it and a second follows the link. */
(function(){
  var bar=document.getElementById('bar'), trig=document.getElementById('nav-machines');
  var mega=document.getElementById('mega'), scrim=document.getElementById('mega-scrim');
  if(!bar||!trig||!mega) return;
  var canHover=window.matchMedia&&window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var openT=null, closeT=null;
  function isOpen(){ return mega.classList.contains('on'); }
  function set(on){
    clearTimeout(openT); clearTimeout(closeT);
    if(on===isOpen()) return;
    mega.classList.toggle('on',on); bar.classList.toggle('bar-open',on);
    if(scrim) scrim.classList.toggle('on',on);
    trig.setAttribute('aria-expanded',on?'true':'false');
  }
  function later(on,ms){ clearTimeout(openT); clearTimeout(closeT); if(on) openT=setTimeout(function(){set(true);},ms); else closeT=setTimeout(function(){set(false);},ms); }
  if(canHover){
    trig.addEventListener('mouseenter',function(){ later(true,isOpen()?0:110); });
    trig.addEventListener('mouseleave',function(){ later(false,200); });
    mega.addEventListener('mouseenter',function(){ clearTimeout(closeT); });
    mega.addEventListener('mouseleave',function(){ later(false,200); });
    // moving to another word in the bar closes it at once
    [].forEach.call(bar.querySelectorAll('nav a'),function(a){ if(a!==trig) a.addEventListener('mouseenter',function(){ set(false); }); });
  }
  trig.addEventListener('click',function(e){ if(!canHover&&!isOpen()){ e.preventDefault(); set(true); } });
  trig.addEventListener('keydown',function(e){
    if(e.key==='ArrowDown'){ e.preventDefault(); set(true); var first=mega.querySelector('a'); if(first) setTimeout(function(){ first.focus(); },60); }
  });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&isOpen()){ var inside=mega.contains(document.activeElement); set(false); if(inside) trig.focus(); } });
  mega.addEventListener('focusout',function(e){ var to=e.relatedTarget; if(to&&!mega.contains(to)&&to!==trig) set(false); });
  if(scrim) scrim.addEventListener('click',function(){ set(false); });
  mega.addEventListener('click',function(e){ if(e.target.closest('a')) set(false); });
  // the quote sheet opening from anywhere puts the menu away
  var btn=document.getElementById('want'); if(btn) btn.addEventListener('click',function(){ set(false); });
})();

/* The proposal: a quote drawn as a document. Same state, same maths as the
   quote page, read from the address, so a proposal is a link you can send
   and a PDF you can save. A4 sheets on screen and on paper. */
(function(){
  var host=document.getElementById('pp'); var Q=window.WonderQuote;
  if(!host||!Q) return;
  var money=Q.money;
  var esc=function(t){ return String(t==null?'':t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); };
  var root=(function(){ var a=document.querySelector('.bar .mark'); return a?a.getAttribute('href'):''; })();
  var st=Q.stateFromQuery(location.search);
  var forInput=document.getElementById('pp-for');
  var long=new Intl.DateTimeFormat('en-AU',{day:'numeric',month:'long',year:'numeric'});

  function pos(img){ var k=Object.keys(Q.IMG_POS).filter(function(x){return img&&img.indexOf(x)>=0;})[0]; return k?Q.IMG_POS[k]:'50% 50%'; }
  function pic(src,cls){ return src?'<img class="'+(cls||'')+'" src="'+src+'" alt="" loading="eager" style="object-position:'+pos(src)+'">':''; }
  function val(l){ return l.value===null?(l.note||'On request'):l.value===0?'Included':money.format(l.value); }
  function joinNames(xs){ return xs.length<2?(xs[0]||''):xs.slice(0,-1).join(', ')+' and '+xs[xs.length-1]; }

  function draw(){
    var c=Q.compute(st);
    var picked=c.lines.filter(function(l){ return l.kind==='machine'||l.kind==='robot'; });
    if(!picked.length){
      host.innerHTML='<section class="sheet pp-empty"><div class="sh-in"><span class="label">[ Proposal ]</span><h1>Nothing to propose yet.</h1>'+
        '<p>Pick the machines and the work on the quote, and the proposal draws itself.</p><a class="btn" href="'+root+'quote/"><span>Build the quote</span><i aria-hidden="true">+</i></a></div></section>';
      return;
    }
    var now=new Date(), until=new Date(now.getTime()+30*864e5);
    var ref='WR-P'+String(now.getFullYear()).slice(2)+('0'+(now.getMonth()+1)).slice(-2)+('0'+now.getDate()).slice(-2)+'-'+(c.count+c.asks);
    var title=c.pkg?c.pkg.name:joinNames(picked.map(function(l){ return (l.n>1?l.n+' × ':'')+l.name; }));
    var hero=c.pkg?c.pkg.img:picked[0].img;
    var parts=c.lines.filter(function(l){ return l.kind!=='delivery'&&l.kind!=='save'; });
    var sheets=[];

    // 1. cover
    sheets.push('<section class="sheet pp-cover">'+pic(hero,'cv-img')+
      '<div class="cv-band"><div class="cv-top"><canvas data-wonder-mark data-sub="ROBOTICS" data-ink="#F3F1E4" data-w="200" data-hr="0.30" role="img" aria-label="Wonder Robotics"></canvas><span class="cv-kind">Proposal</span></div>'+
      '<h1>'+esc(title)+'</h1>'+
      '<dl class="cv-meta"><div><dt>Prepared for</dt><dd class="cv-for">'+(st.who?esc(st.who):'<span class="blank"></span>')+'</dd></div>'+
      '<div><dt>Reference</dt><dd>'+ref+'</dd></div><div><dt>Date</dt><dd>'+long.format(now)+'</dd></div><div><dt>Valid until</dt><dd>'+long.format(until)+'</dd></div></dl></div></section>');

    // 2. the investment
    var del=c.lines.filter(function(l){return l.kind==='delivery';})[0];
    var work=c.sub-c.supply+c.save-(del&&del.value?del.value:0);
    var sums='<dt>Machines at list</dt><dd>'+money.format(c.supply)+'</dd>';
    sums+='<dt>The work and care</dt><dd>'+money.format(work)+'</dd>';
    if(c.pkg) sums+='<dt>'+esc(c.pkg.name)+', 10% off the work</dt><dd class="save">'+money.format(-c.save)+'</dd>';
    if(del) sums+='<dt>Delivery, '+(c.site==='far'?'beyond':'within')+' 100 km of a port</dt><dd>'+val(del)+'</dd>';
    sums+='<dt>Total ex GST</dt><dd>'+money.format(c.sub)+'</dd><dt>GST 10%</dt><dd>'+money.format(c.gst)+'</dd><dt class="tot">Total inc GST</dt><dd class="tot">'+money.format(c.inc)+'</dd>';
    var grid=parts.map(function(l,i){
      return '<li>'+pic(l.img)+'<span class="i">'+('0'+(i+1)).slice(-2)+'</span><b>'+esc(l.label)+'</b><span class="v'+(l.value===null?' ask':'')+'">'+val(l)+'</span></li>';
    }).join('');
    sheets.push('<section class="sheet pp-sum"><div class="sh-in">'+
      '<span class="label">[ The whole job, one price ]</span>'+
      '<div class="ps-fig">'+(c.indicative?'<small>about</small>':'')+money.format(c.sub)+'</div>'+
      '<div class="ps-row"><p>'+(c.pkg?esc(c.pkg.line)+' Bought as one job, the work costs 10% less.':'Everything on this proposal, designed, supplied, built and looked after by one team in Fortitude Valley.')+
      (c.asks?' Robots are priced to order and follow on their own quote.':'')+'</p><dl class="ps-sums">'+sums+'</dl></div>'+
      '<span class="label ps-in">In this proposal</span><ol class="ps-grid'+(parts.length>8?' many':'')+'">'+grid+'</ol></div>'+foot(ref)+'</section>');

    // 3. every part, two to a sheet
    var blocks=parts.map(function(l,i){
      var d=Q.DETAILS[l.id]||null, img=(l.id==='care'?(Q.DETAIL_IMG.care||l.img):l.img);
      if(l.id==='care'&&d){
        // the words must match the plan on this quote, not the package default
        d={stage:d.stage,gets:d.gets,
           lead:'Looked after: spares, monitoring and updates, and a number that answers when something stops.',
           facts:[['Plan',(c.plan==='priority'?'Priority':'Standard')+', '+c.term+(c.term===1?' year':' years')],['After that','Priced by the year']]};
      }
      var stage=d?d.stage:(l.kind==='robot'?'Supply':l.kind==='part'?'Supply':l.kind==='extra'?'Build':'');
      var lead=d?d.lead:(l.kind==='robot'?(l.status+'. '+l.model+', priced to order.'):l.sub);
      var gets=d?'<ul>'+d.gets.map(function(g){return '<li>'+esc(g)+'</li>';}).join('')+'</ul>':'';
      var facts=d?'<dl>'+d.facts.map(function(f){return '<div><dt>'+esc(f[0])+'</dt><dd>'+esc(f[1])+'</dd></div>';}).join('')+'</dl>':'';
      var name=l.kind==='machine'?l.name+', '+l.model:l.label;
      return '<article class="pp-part">'+pic(img,'pt-img')+
        '<div class="pt-h"><span class="i">('+('0'+(i+1)).slice(-2)+')</span>'+(stage?'<span class="stage">'+esc(stage)+'</span>':'')+
        '<span class="pt-v'+(l.value===null?' ask':'')+'">'+val(l)+'</span></div>'+
        '<h2>'+esc((l.n>1?l.n+' × ':'')+name)+'</h2><p class="pt-lead">'+esc(lead)+'</p>'+
        '<div class="pt-cols">'+gets+facts+'</div></article>';
    });
    for(var i=0;i<blocks.length;i+=2){
      sheets.push('<section class="sheet pp-parts"><div class="sh-in">'+(i===0?'<span class="label">[ Everything in it ]</span>':'')+blocks.slice(i,i+2).join('')+'</div>'+foot(ref)+'</section>');
    }

    // 4. how it goes, terms, the yes
    var stages=[['Plan','The site, the power, the queue, the menu.'],['Design','The brand, the counter, the website, the drawings.'],['Build','Machines ordered, fit-out made, the skin finished.'],['Commission','Menu programmed, staff trained, the first hundred served.'],['Open','About two months from order. Then we keep it running.']];
    sheets.push('<section class="sheet pp-close"><div class="sh-in">'+
      '<span class="label">[ How it goes ]</span><ol class="pc-stages">'+stages.map(function(x,j){return '<li><span class="i">0'+(j+1)+'</span><b>'+x[0]+'</b><p>'+x[1]+'</p></li>';}).join('')+'</ol>'+
      '<div class="pc-row"><div><span class="label">Terms</span><ul class="pc-terms"><li>Machines at the 2026 Moton Australia list, ex GST</li><li>Everything else indicative, confirmed once we have seen the site</li>'+
      '<li>Valid 30 days, until '+long.format(until)+'</li><li>One year warranty on the machines</li><li>About two months from order</li><li>Delivered duty unpaid within 100 km of an Australian port</li><li>Sold on the <a href="'+root+'terms/">Wonder Robotics terms of sale</a></li>'+(c.asks?'<li>Robots priced to order on their own quote</li>':'')+(c.pkg&&c.pkg.extra?'<li>'+esc(c.pkg.extra.name)+' priced on scope</li>':'')+'</ul></div>'+
      '<div><span class="label">Talk to us</span><p class="pc-contact"><a href="tel:1800983404">1800 983 404</a><br><a href="mailto:info@wonderbytech.com?subject='+encodeURIComponent('Proposal '+ref)+'">info@wonderbytech.com</a><br>365 St Pauls Terrace<br>Fortitude Valley QLD 4006</p></div></div>'+
      '<div class="pc-yes"><span class="label">Accepted</span><div class="lines"><div><span></span><em>Name</em></div><div><span></span><em>Signature</em></div><div><span></span><em>Date</em></div></div></div>'+
      '</div>'+foot(ref)+'</section>');

    host.innerHTML=sheets.join('');
    var n=host.querySelectorAll('.sheet').length;
    [].forEach.call(host.querySelectorAll('.sh-foot .pg'),function(el,k){ el.textContent=(k+2)+' of '+n; });
    if(window.WonderMark) WonderMark.paintAll();
    document.title='Proposal '+ref+(st.who?', '+st.who:'')+', Wonder Robotics';
    var edit=document.getElementById('pp-edit'); if(edit) edit.href=root+'quote/'+Q.toQuery(st);
  }
  function foot(ref){ return '<div class="sh-foot"><span>Wonder Robotics</span><span>'+ref+'</span><span class="pg"></span></div>'; }

  if(forInput){
    forInput.value=st.who||'';
    forInput.addEventListener('input',function(){
      st.who=forInput.value.slice(0,80);
      var dd=host.querySelector('.cv-for'); if(dd) dd.innerHTML=st.who?esc(st.who):'<span class="blank"></span>';
      try{ history.replaceState(null,'',location.pathname+Q.toQuery(st)); }catch(e){}
    });
  }
  var copy=document.getElementById('pp-copy');
  if(copy) copy.addEventListener('click',function(){
    var span=copy.querySelector('span'), done=function(t){ span.textContent=t; setTimeout(function(){span.textContent='Copy the link';},1800); };
    if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(location.href).then(function(){done('Copied');},function(){done('Copy it from the address bar');});
    else done('Copy it from the address bar');
  });
  var printBtn=document.getElementById('pp-print');
  // Printing before the pictures have arrived gives grey boxes on paper, so
  // wait for every picture on the sheets first.
  if(printBtn) printBtn.addEventListener('click',function(){
    var imgs=[].slice.call(host.querySelectorAll('img'));
    Promise.all(imgs.map(function(im){ return im.complete?0:new Promise(function(r){ im.onload=im.onerror=r; }); })).then(function(){ window.print(); });
  });
  draw();
})();

/* The loader does not fade out, it walks to its post. The robot sneaks home
   on the full screen mark, then the whole lockup flies into the header and
   becomes the header mark, so the load is one continuous idea instead of a
   curtain and then a logo. On a second page this session there is no curtain,
   so the header mark plays the sneak on its own. */
(function(){
  var L=document.getElementById('loader');
  var head=document.querySelector('.bar .mark canvas');
  var holder=head&&head.parentNode;
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var seen=false; try{seen=sessionStorage.getItem('wr-loader')==='1';}catch(e){}

  function sneakHead(dur){
    if(!head||!window.WonderSneak||reduce) return;
    if(!WonderSneak.park(head)) return;
    setTimeout(function(){ WonderSneak.run(head,dur||950); },90);
  }

  if(!L){ return; }
  if(reduce){ L.remove(); return; }
  if(seen){ L.remove(); sneakHead(900); return; }

  var lifted=false, started=false;
  var lift=function(){ if(lifted) return; lifted=true;
    if(holder) holder.classList.remove('handing');
    L.classList.add('out'); try{sessionStorage.setItem('wr-loader','1');}catch(e){} setTimeout(function(){L.remove();},600);};

  // Measure both marks, then move the loader's canvas onto the header's box.
  // Same aspect and same sub, so one scale carries it.
  var hand=function(cv){
    if(!head){ setTimeout(lift,200); return; }
    var a=cv.getBoundingClientRect(), b=head.getBoundingClientRect();
    if(!(a.width>2&&b.width>2)){ setTimeout(lift,200); return; }
    if(holder) holder.classList.add('handing');
    cv.style.transformOrigin='0 0';
    cv.style.transition='transform .8s cubic-bezier(.16,.84,.24,1)';
    cv.style.transform='translate('+(b.left-a.left)+'px,'+(b.top-a.top)+'px) scale('+(b.width/a.width)+')';
    L.classList.add('hand');
    setTimeout(lift,760);
  };

  var start=function(){ if(started) return; started=true;
    if(window.WonderMark){WonderMark.paintAll();}
    var cv=L.querySelector('canvas[data-wonder-mark]');
    var ran=cv&&window.WonderSneak&&WonderSneak.park(cv);
    L.classList.add('in');
    if(ran) WonderSneak.run(cv,1050,function(){setTimeout(function(){hand(cv);},160);});
    else setTimeout(lift,900);
  };
  if(document.fonts&&document.fonts.load){ document.fonts.load('700 84px UnboundedW').then(start,start); setTimeout(start,700); } else { setTimeout(start,200); }
  setTimeout(lift,3200); // never trap anyone behind it
})();

/* The bar: it sets when you leave the top, it says which page you are on, and
   its button drops the panel that asks the only question we want asked. */
(function(){
  var bar=document.getElementById('bar'); if(!bar) return;

  var set=false;
  function onScroll(){
    var want=(window.pageYOffset||document.documentElement.scrollTop)>18;
    if(want!==set){ set=want; bar.classList.toggle('bar-set',want); }
  }
  onScroll(); window.addEventListener('scroll',onScroll,{passive:true});

  // Where am I. Match on the deepest path a link points at, so /machines/
  // lights up on every machine page. Section anchors never light, and neither
  // does the site root: on GitHub Pages the root is /wonder-robotics-site/,
  // not /, and every page starts with it.
  var clean=function(x){return x.replace(/index\.html$/,'');};
  var markLink=bar.querySelector('.mark');
  var root=clean(new URL(markLink?markLink.getAttribute('href'):'/',location.href).pathname);
  var here=clean(location.pathname);
  var best=null, bestLen=0;
  bar.querySelectorAll('nav a').forEach(function(a){
    var u=new URL(a.getAttribute('href'),location.href), p=clean(u.pathname);
    if(u.hash||p===root) return;
    if(here.indexOf(p)===0&&p.length>bestLen){ best=a; bestLen=p.length; }
  });
  if(best) best.setAttribute('aria-current','page');

  var btn=document.getElementById('want'), sheet=document.getElementById('wantpanel');
  var Q=window.WonderQuote;
  if(!btn||!sheet||!Q) return;
  var $=function(id){return document.getElementById(id);};
  var esc=function(t){ return String(t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); };
  var money=Q.money;

  // One state for the sheet. Machines and robots count, add-ons toggle.
  var qty={}, parts={}, svc={}, pkg=null, drawn=false, lastFocus=null, openFam=null;
  Q.MACHINES.concat(Q.ROBOTS).forEach(function(m){ qty[m.id]=0; });
  Q.PARTS.forEach(function(x){ parts[x.id]=false; });
  Q.SERVICES.forEach(function(x){ svc[x.id]=!!x.on; });

  // ---- open and close. It is a modal: focus goes in, the page stops
  // scrolling underneath, Escape and the scrim put it back, focus returns.
  function isOpen(){ return sheet.classList.contains('on'); }
  function setOpen(on){
    if(on===isOpen()) return;
    if(on){
      draw(); lastFocus=document.activeElement;
      var sw=window.innerWidth-document.documentElement.clientWidth;
      document.documentElement.style.paddingRight=sw>0?sw+'px':'';
      document.documentElement.classList.add('qs-lock');
      sheet.classList.add('on'); btn.setAttribute('aria-expanded','true');
      setTimeout(function(){ var t=$('qs-close'); if(t) t.focus({preventScroll:true}); },60);
    }else{
      sheet.classList.remove('on'); btn.setAttribute('aria-expanded','false');
      document.documentElement.classList.remove('qs-lock'); document.documentElement.style.paddingRight='';
      if(lastFocus&&lastFocus.focus) lastFocus.focus({preventScroll:true});
    }
  }
  btn.addEventListener('click',function(e){ e.preventDefault(); setOpen(true); });
  $('qs-close').addEventListener('click',function(){ setOpen(false); });
  $('wantscrim').addEventListener('click',function(){ setOpen(false); });
  document.addEventListener('keydown',function(e){
    if(!isOpen()) return;
    if(e.key==='Escape'){ e.preventDefault(); setOpen(false); return; }
    if(e.key==='Tab'){   // keep Tab inside the sheet
      var f=[].filter.call(sheet.querySelectorAll('button,a[href],[tabindex]:not([tabindex="-1"])'),function(n){ return n.offsetParent!==null&&!n.disabled; });
      if(!f.length) return;
      var first=f[0], last=f[f.length-1];
      if(e.shiftKey&&document.activeElement===first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey&&document.activeElement===last){ e.preventDefault(); first.focus(); }
    }
  });
  // Any link on the site that points at the quote section can open the sheet
  // instead of scrolling: <a data-quote> or ?pick= style hrefs keep working.
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a[data-quote]'); if(!a) return;
    e.preventDefault(); draw();
    if(a.getAttribute('data-pkg')){ choosePackage(a.getAttribute('data-pkg')); render(); }
    setOpen(true);
  });

  // ---- the sections fold. All open to start: the list is the whole offer.
  [].forEach.call(sheet.querySelectorAll('.qs-sec-h button'),function(h){
    h.addEventListener('click',function(){
      var open=h.getAttribute('aria-expanded')!=='true';
      h.setAttribute('aria-expanded',open?'true':'false');
      $(h.getAttribute('aria-controls')).hidden=!open;
      // folding a section you had scrolled into would drop you mid-way
      // through the next one, so bring its heading back to the top
      var pick=$('qs-pick'), sec=h.closest('.qs-sec');
      if(sec&&pick.scrollTop>sec.offsetTop) pick.scrollTop=sec.offsetTop;
    });
  });

  // ---- the cards, drawn the first time the sheet opens so no page pays for
  // two dozen images it never shows
  function stepper(id,label){
    return '<span class="qty"><button type="button" data-id="'+id+'" data-d="-1" aria-label="One fewer '+esc(label)+'">&minus;</button>'+
           '<output id="qn-'+id+'">0</output><button type="button" data-id="'+id+'" data-d="1" aria-label="One more '+esc(label)+'">+</button></span>';
  }
  // Every card is one button laid over the whole card. Machines and robots
  // go in at one and come out at zero; once in, a stepper sits above the
  // button for a second or a third. Add-ons simply go in and out.
  function card(o,opt){
    var label=opt.label;
    return '<article class="qs-card'+(opt.counted?' counted':'')+'" id="qc-'+o.id+'">'+
      '<button type="button" class="qs-hit" data-id="'+o.id+'" data-kind="'+opt.kind+'" aria-pressed="false" aria-label="'+esc(label)+'"></button>'+
      '<span class="n" id="qb-'+o.id+'" aria-hidden="true"></span>'+(opt.tag||'')+
      '<div class="ph"><img src="'+o.img+'" alt="" loading="lazy" decoding="async"></div>'+
      '<div class="qs-card-b"><h3>'+esc(opt.title)+(opt.small?'<small>'+esc(opt.small)+'</small>':'')+'</h3>'+(opt.text?'<p>'+esc(opt.text)+'</p>':'')+
      '<div class="qs-card-f"><span class="price'+(opt.ask?' ask':'')+'" id="qpv-'+o.id+'">'+(opt.price||'')+'</span>'+
      '<span class="add" aria-hidden="true">'+(opt.counted?'Add':'Add')+'</span>'+(opt.counted?stepper(o.id,label):'')+'</div></div></article>';
  }
  function pkgCard(pk){
    var q=Q.packageQuote(pk);
    var has=q.lines.map(function(l){return l.name;}).join(', ')+(q.extra?', '+q.extra.name.toLowerCase():'');
    return '<article class="qs-card pkg" id="qc-pkg-'+pk.id+'">'+
      '<button type="button" class="qs-hit" data-id="'+pk.id+'" data-kind="pkg" aria-pressed="false" aria-label="'+esc(pk.name+', package')+'"></button>'+
      '<span class="n" aria-hidden="true"></span>'+
      '<div class="ph"><img src="'+pk.img+'" alt="" loading="lazy" decoding="async"></div>'+
      '<div class="qs-card-b"><h3>'+esc(pk.name)+'</h3><p>'+esc(pk.line)+'</p><p class="has">'+esc(has)+'</p>'+
      '<div class="qs-card-f"><span class="price"><s>'+money.format(q.separate)+'</s> '+money.format(q.total)+(q.extra?'<small>plus the container</small>':'')+
      '<small class="save">Save '+money.format(q.save)+'</small></span><span class="add" aria-hidden="true">Add</span></div></div></article>';
  }
  function mById(id){ return Q.MACHINES.filter(function(m){return m.id===id;})[0]; }
  function pById(id){ return Q.PARTS.filter(function(p){return p.id===id;})[0]; }
  function famOf(mid){ return Q.FAMILIES.filter(function(f){return f.models.indexOf(mid)>=0;})[0]; }
  function famCount(f){ return f.models.reduce(function(a,id){return a+(qty[id]||0);},0); }
  function famCard(f){
    var prices=f.models.map(function(id){return mById(id).price;}), low=Math.min.apply(null,prices);
    var from=(f.models.length>1?'From ':'')+money.format(low);
    var small=f.models.length>1?f.models.length+' models':mById(f.models[0]).model;
    return '<article class="qs-card fam" id="qf-'+f.id+'">'+
      '<button type="button" class="qs-hit" data-id="'+f.id+'" data-kind="fam" aria-expanded="false" aria-controls="qs-conf" aria-label="'+esc(f.name)+'"></button>'+
      '<span class="n" id="qfb-'+f.id+'" aria-hidden="true"></span>'+
      '<div class="ph"><img src="'+f.img+'" alt="" loading="lazy" decoding="async"></div>'+
      '<div class="qs-card-b"><h3>'+esc(f.name)+'<small>'+esc(small)+'</small></h3><p>'+esc(f.line)+'</p>'+
      '<div class="qs-card-f"><span class="price">'+from+'</span><span class="add" aria-hidden="true">Add</span></div></div></article>';
  }
  // The drop-down under a robot once it is on the quote: which model, how
  // many, and only the accessories that fit it. It opens in the row the
  // robot's card is in, so it reads as that robot's panel.
  function drawConf(){
    var old=$('qs-conf'); if(old) old.parentNode.removeChild(old);
    var f=Q.FAMILIES.filter(function(x){return x.id===openFam;})[0]; if(!f) return;
    var cardEl=$('qf-'+f.id); if(!cardEl) return;
    var models=f.models.length>1?'<div class="cf-block"><span class="label">Which '+esc(f.name.toLowerCase())+'</span><div class="cf-models">'+f.models.map(function(id){
        var m=mById(id);
        return '<button type="button" class="cf-model" id="qm-'+id+'" data-kind="model" data-fam="'+f.id+'" data-id="'+id+'" aria-pressed="false">'+
          '<span class="t"><img src="'+m.img+'" alt="" loading="lazy"></span><span class="m"><b>'+esc(m.model)+'</b><small>'+esc(m.kit)+'</small></span><span class="p">'+money.format(m.price)+'</span></button>';
      }).join('')+'</div></div>':'';
    var counts='<div class="cf-block"><span class="label">How many</span><div class="cf-counts">'+f.models.map(function(id){
        var m=mById(id); return '<div class="cf-count" id="qcc-'+id+'"><span>'+esc(m.model)+'</span>'+stepper(id,m.model)+'</div>';
      }).join('')+'</div></div>';
    var acc=f.parts.length?'<div class="cf-block"><span class="label">Accessories for it</span><div class="cf-parts">'+f.parts.map(function(id){
        var x=pById(id);
        return '<button type="button" class="cf-part" id="qx-'+id+'" data-kind="part" data-id="'+id+'" aria-pressed="false">'+
          '<span class="t"><img src="'+x.img+'" alt="" loading="lazy"></span><span class="m"><b>'+esc(x.name)+'</b><small>'+esc(x.sub)+'</small></span><span class="p">'+money.format(x.price)+'</span><span class="tick" aria-hidden="true"></span></button>';
      }).join('')+'</div></div>':'<div class="cf-block"><span class="label">Accessories for it</span><p class="cf-none">It comes complete. Nothing to add to this one.</p></div>';
    var panel=document.createElement('div');
    panel.className='qs-conf'; panel.id='qs-conf';
    panel.innerHTML='<div class="cf-head"><h4>Your '+esc(f.name.toLowerCase())+'</h4><button type="button" class="cf-remove" data-kind="famrm" data-id="'+f.id+'">Remove it</button></div>'+
      models+counts+acc+
      '<div class="cf-foot"><button type="button" class="btn" data-kind="next"><span>Next: the work around it</span><i aria-hidden="true">+</i></button>'+
      '<button type="button" class="btn ghost" data-kind="famclose"><span>Add another machine</span><i aria-hidden="true">+</i></button></div>';
    // after the last card in the same row
    var grid=cardEl.parentNode, cards=[].slice.call(grid.querySelectorAll('.qs-card.fam')), top=cardEl.offsetTop, last=cardEl;
    cards.forEach(function(c){ if(c.offsetTop===top) last=c; });
    grid.insertBefore(panel,last.nextSibling);
  }
  function setFamily(fid,open){
    openFam=open?fid:null;
    [].forEach.call(document.querySelectorAll('.qs-card.fam .qs-hit'),function(h){ h.setAttribute('aria-expanded',h.getAttribute('data-id')===openFam?'true':'false'); });
    drawConf();
  }
  function dropUnusedParts(){
    // accessories only make sense while a robot they fit is on the quote
    Q.PARTS.forEach(function(x){
      if(!parts[x.id]) return;
      var fits=Q.FAMILIES.some(function(f){ return f.parts.indexOf(x.id)>=0&&famCount(f)>0; });
      if(!fits) parts[x.id]=false;
    });
  }
  window.addEventListener('resize',function(){ if(openFam) drawConf(), render(); });
  function draw(){
    if(drawn) return; drawn=true;
    $('qp-pkg').innerHTML=Q.PACKAGES.map(pkgCard).join('');
    $('qp-food').innerHTML=Q.FAMILIES.map(famCard).join('');
    $('qp-robots').innerHTML=Q.ROBOTS.map(function(r){
      var floor=/floor/i.test(r.status);
      return card(r,{kind:'unit',counted:true,label:r.name,title:r.name,small:r.kind,price:'On request',ask:true,
        tag:'<span class="tag'+(floor?' floor':'')+'"><i></i>'+esc(r.status)+'</span>'});
    }).join('');
    $('qp-work').innerHTML=Q.SERVICES.map(function(x){ return card(x,{kind:'svc',label:x.name,title:x.name,text:x.sub}); }).join('');
    render();
  }
  $('qs-pick').addEventListener('click',function(e){
    var step=e.target.closest('button[data-d]');
    if(step){ var sid=step.getAttribute('data-id'); qty[sid]=Math.max(0,Math.min(20,qty[sid]+parseInt(step.getAttribute('data-d'),10))); dropUnusedParts(); render(); return; }
    var ctl=e.target.closest('[data-kind]'); if(!ctl) return;
    var id=ctl.getAttribute('data-id'), k=ctl.getAttribute('data-kind');
    if(k==='fam'){
      var f=Q.FAMILIES.filter(function(x){return x.id===id;})[0];
      if(!famCount(f)){ qty[f.models[0]]=1; setFamily(id,true); }
      else setFamily(id,openFam!==id);
      render(); return;
    }
    if(k==='model'){
      var fam=Q.FAMILIES.filter(function(x){return x.id===ctl.getAttribute('data-fam');})[0];
      var n=Math.max(1,famCount(fam)); fam.models.forEach(function(m){ qty[m]=0; }); qty[id]=n;
      render(); return;
    }
    if(k==='famrm'){ Q.FAMILIES.filter(function(x){return x.id===id;})[0].models.forEach(function(m){ qty[m]=0; }); dropUnusedParts(); setFamily(null,false); render(); return; }
    if(k==='famclose'){ setFamily(null,false); render(); return; }
    if(k==='next'){
      setFamily(null,false); render();
      var sec=$('qsec-work'), pick=$('qs-pick'); if(sec&&pick) pick.scrollTo({top:sec.offsetTop,behavior:'smooth'});
      return;
    }
    if(k==='pkg'){ choosePackage(pkg===id?null:id); render(); return; }
    if(k==='unit') qty[id]=qty[id]>0?0:1;
    else if(k==='part') parts[id]=!parts[id];
    else svc[id]=!svc[id];
    render();
  });
  // Choosing a package puts its machines and its work on the quote. Taking it
  // off takes them back off. Change the picks so it is no longer the package,
  // and the saving goes with it: the price is for the whole job.
  function pkgById(id){ return Q.PACKAGES.filter(function(p){return p.id===id;})[0]||null; }
  function choosePackage(id){
    var was=pkgById(pkg);
    if(was){
      Object.keys(was.machines).forEach(function(m){ qty[m]=Math.max(0,qty[m]-was.machines[m]); });
      Q.PACKAGE_WORK.forEach(function(w){ svc[w]=false; });
      Q.SERVICES.forEach(function(x){ if(x.on) svc[x.id]=true; });
    }
    pkg=null;
    var pk=pkgById(id); if(!pk) return;
    Object.keys(pk.machines).forEach(function(m){ qty[m]=Math.max(qty[m],pk.machines[m]); });
    Q.PACKAGE_WORK.forEach(function(w){ svc[w]=true; });
    pkg=id;
  }
  function packageHolds(){
    var pk=pkgById(pkg); if(!pk) return null;
    var ok=Object.keys(pk.machines).every(function(m){return qty[m]>=pk.machines[m];})&&Q.PACKAGE_WORK.every(function(w){return svc[w];});
    return ok?pk:null;
  }
  window.WonderQuoteSheet={ open:function(id){ draw(); if(id) choosePackage(id); render(); setOpen(true); } };
  $('qs-peek').addEventListener('click',function(){
    var tray=$('qs-tray'), o=!tray.classList.contains('open');
    tray.classList.toggle('open',o); this.setAttribute('aria-expanded',o?'true':'false');
  });

  // ---- the tray and the total
  function render(){
    var count=0, supply=0, total=0, asks=0, lines=[], pick=[], faces=[];
    var tabCount={food:0,robots:0,work:0};
    Q.MACHINES.forEach(function(m){
      var n=qty[m.id]; mark(m.id,n);
      if(!n) return;
      count+=n; supply+=n*m.price; tabCount.food+=n; pick.push(n>1?m.id+':'+n:m.id); faces.push(m.img);
      lines.push({img:m.img,name:m.name,sub:(n>1?n+' × ':'')+m.model,v:money.format(n*m.price)});
    });
    Q.ROBOTS.forEach(function(r){
      var n=qty[r.id]; mark(r.id,n);
      if(!n) return;
      asks+=n; tabCount.robots+=n; pick.push(n>1?r.id+':'+n:r.id); faces.push(r.img);
      lines.push({img:r.img,name:r.name,sub:(n>1?n+' × ':'')+r.kind,v:'On request',ask:true});
    });
    total=supply;
    Q.PARTS.forEach(function(x){
      var pv=$('qpv-'+x.id); if(pv) pv.textContent=money.format(x.price);
      toggle(x.id,parts[x.id]);
      if(!parts[x.id]) return;
      total+=x.price; pick.push(x.id);
      lines.push({img:x.img,name:x.name,sub:'Add-on, indicative',v:money.format(x.price)});
    });
    Q.SERVICES.forEach(function(x){
      var amt=count?Q.serviceAmount(x,supply):0;
      var pv=$('qpv-'+x.id); if(pv){ pv.textContent=count?money.format(amt):'Priced on your machines'; pv.classList.toggle('ask',!count); }
      toggle(x.id,svc[x.id]);
      if(!svc[x.id]) return;
      tabCount.work++; if(x.id!=='inst') pick.push(x.id);
      if(!count&&!asks) return;
      if(count) total+=amt;
      lines.push({img:x.img,name:x.name,sub:count?Math.round(x.pct*100)+'% of the machines, indicative':'Priced with the robots',v:count?money.format(amt):'On request',ask:!count});
    });

    Object.keys(tabCount).forEach(function(k){
      var c=$('qc-n-'+k); if(c) c.textContent=tabCount[k]?tabCount[k]+' added':'';
    });
    Q.FAMILIES.forEach(function(f){
      var n=famCount(f), c=$('qf-'+f.id); if(!c) return;
      c.classList.toggle('on',n>0); c.classList.toggle('open',openFam===f.id);
      var b=$('qfb-'+f.id); if(b) b.textContent=n||'';
      var a=c.querySelector('.add'); if(a) a.textContent=n?(openFam===f.id?'Done':'Change'):'Add';
      f.models.forEach(function(id){
        var mb=$('qm-'+id); if(mb) mb.setAttribute('aria-pressed',qty[id]>0?'true':'false');
        var cc=$('qcc-'+id); if(cc) cc.hidden=!(qty[id]>0)&&!(f.models.length===1);
      });
    });
    Q.PARTS.forEach(function(x){ var pb=$('qx-'+x.id); if(pb) pb.setAttribute('aria-pressed',parts[x.id]?'true':'false'); });
    var lock=$('qs-work-lock'); if(lock) lock.hidden=count>0||asks>0;
    var ws=$('qsec-work'); if(ws) ws.classList.toggle('locked',!(count>0||asks>0));

    var held=packageHolds(), save=0; if(pkg&&!held) pkg=null;
    Q.PACKAGES.forEach(function(p){
      var c=$('qc-pkg-'+p.id); if(!c) return; var on=!!held&&held.id===p.id;
      c.classList.toggle('on',on); c.querySelector('.qs-hit').setAttribute('aria-pressed',on?'true':'false');
      c.querySelector('.add').textContent=on?'Added':'Add';
    });
    var nPkg=$('qc-n-pkg'); if(nPkg) nPkg.textContent=held?'1 added':'';
    if(held){
      var care=Math.round(supply*Q.RATES.maintenance_pct_per_year.standard/100)*100;
      var workSum=care;
      Q.SERVICES.forEach(function(x){ if(svc[x.id]&&count) workSum+=Q.serviceAmount(x,supply); });
      save=Math.round(workSum*Q.PACKAGE_OFF/100)*100;
      total+=care-save;
      lines.push({img:'{{root}}img/process/04-commission.jpg',name:'A year of maintenance',sub:'Standard plan, indicative',v:money.format(care)});
      if(held.extra) lines.push({img:held.img,name:held.extra.name,sub:held.extra.sub,v:held.extra.note,ask:true});
      lines.push({img:held.img,name:'Package saving',sub:held.name+', 10% off the work',v:'\u2212'+money.format(save),save:true});
      pick.push('pkg='+held.id);
    }
    var ul=$('qs-lines');
    ul.innerHTML=lines.length?lines.map(function(l){
      return '<li><span class="t"><img src="'+l.img+'" alt=""></span><span><b>'+esc(l.name)+'</b><small>'+esc(l.sub)+'</small></span>'+
             '<span class="v'+(l.ask?' ask':'')+(l.save?' save':'')+'">'+esc(l.v)+'</span></li>';
    }).join(''):'<li class="empty">Nothing yet. Pick a machine or a robot and it lands here, priced.</li>';

    var things=count+asks;
    var totalEl=$('dq-total'), noteEl=$('dq-note');
    if(!things){ totalEl.textContent=money.format(0); noteEl.textContent='Pick a machine to start'; }
    else{
      totalEl.innerHTML=(total!==supply||asks?'<small>about</small>':'')+money.format(total);
      var bits=[];
      if(count) bits.push(count+(count===1?' machine':' machines'));
      if(asks) bits.push(asks+(asks===1?' robot on request':' robots on request'));
      noteEl.textContent=held?(held.name+', you save '+money.format(save)+'. Ex GST'):bits.join(', ')+'. Ex GST';
    }
    $('qs-thumbs').innerHTML=faces.slice(0,5).map(function(src){return '<img src="'+src+'" alt="">';}).join('');
    $('qs-peek-t').textContent=things?('See the '+lines.length+(lines.length===1?' line':' lines')):'Your quote';

    var pkgParam=pick.filter(function(x){return x.indexOf('pkg=')===0;})[0];
    var plain=pick.filter(function(x){return x.indexOf('pkg=')!==0;});
    var qs=[]; if(plain.length) qs.push('pick='+plain.join(',')); if(pkgParam) qs.push(pkgParam);
    var go=$('want-go'); go.href=go.getAttribute('data-base')+(qs.length?'?'+qs.join('&'):'');
    var prop=$('want-proposal'); if(prop) prop.href=go.getAttribute('data-base')+'proposal/'+(qs.length?'?'+qs.join('&'):'');
  }
  function mark(id,n){
    var o=$('qn-'+id); if(o) o.textContent=n;
    var c=$('qc-'+id); if(!c) return;
    c.classList.toggle('on',n>0);
    var b=$('qb-'+id); if(b) b.textContent=n;
    var h=c.querySelector('.qs-hit'); if(h) h.setAttribute('aria-pressed',n>0?'true':'false');
  }
  function toggle(id,on){
    var c=$('qc-'+id); if(!c) return;
    c.classList.toggle('on',!!on);
    var h=c.querySelector('.qs-hit'); if(h) h.setAttribute('aria-pressed',on?'true':'false');
    var a=c.querySelector('.add'); if(a) a.textContent=on?'Added':'Add';
  }
  var goEl=$('want-go'); goEl.setAttribute('data-base',goEl.getAttribute('href'));

  // "Have us call you" ticks the matching boxes in the band above the footer,
  // which is on every page, then closes the sheet and takes you there.
  var TO_BAND={bpro:'eoi-coffee',bstd:'eoi-coffee',eff:'eoi-coffee',bar:'eoi-cocktail',ice:'eoi-icecream',
               fry:'eoi-kitchen',noo:'eoi-kitchen',eng:'eoi-fitout',brand:'eoi-brand',soft:'eoi-software'};
  $('want-mail').addEventListener('click',function(){
    Object.keys(TO_BAND).forEach(function(id){
      var on=(qty[id]>0)||parts[id]||(svc[id]&&id!=='inst');
      var box=document.getElementById(TO_BAND[id]); if(on&&box) box.checked=true;
    });
    setOpen(false);
  });
})();
(function(){
  var clock=document.getElementById('clock');
  var state=document.getElementById('floor-state');
  var dot=document.getElementById('floor-dot');
  var fmt=new Intl.DateTimeFormat('en-AU',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Australia/Brisbane'});
  var clockParts=new Intl.DateTimeFormat('en-AU',{weekday:'short',hour:'numeric',minute:'numeric',hour12:false,timeZone:'Australia/Brisbane'});
  var HOURS={Mon:[9,19],Tue:[9,19],Wed:[9,19],Thu:[9,19],Fri:[9,19],Sat:[10,17]};
  function tick(){
    var now=new Date();
    clock.textContent=fmt.format(now);
    var p={};
    clockParts.formatToParts(now).forEach(function(x){p[x.type]=x.value;});
    var h=parseInt(p.hour,10)%24+parseInt(p.minute,10)/60;
    var span=HOURS[p.weekday];
    var open=!!span&&h>=span[0]&&h<span[1];
    state.textContent=open?'Floor open':'Floor closed';
    dot.classList.toggle('shut',!open);
  }
  tick(); setInterval(tick,15000);
})();

/* The quote page builder. Its own scope: it once shared one with the bar
   clock, and two different names in it collided (parts, then state). */
(function(){

  var Q=window.WonderQuote, MACHINES=Q.MACHINES, PARTS=Q.PARTS, SERVICES=Q.SERVICES, RATES=Q.RATES, GST=Q.GST;

  var form=document.getElementById('quote-form');
  if(!form){return;}
  var el=function(id){return document.getElementById(id);};
  var money=new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',maximumFractionDigits:0});
  var qty={}, parts={}, svc={}, pagePkg=null;

  // 1. the machines, as cards you can see
  var picker=el('cat');
  MACHINES.forEach(function(m){
    qty[m.id]=0;
    var c=document.createElement('div'); c.className='pick'; c.id='pick-'+m.id;
    c.innerHTML='<div class="ph"><img src="'+m.img+'" alt="'+m.name+', '+m.model+'" loading="lazy"></div>'+
      '<div class="pick-b"><h3>'+m.name+'<small>'+m.model+'</small></h3><p>'+m.kit+'</p>'+
      '<div class="pick-f"><span class="price">'+money.format(m.price)+'</span>'+
      '<span class="qty"><button type="button" data-id="'+m.id+'" data-d="-1" aria-label="Fewer '+m.name+'">&minus;</button><output id="qty-'+m.id+'">0</output><button type="button" data-id="'+m.id+'" data-d="1" aria-label="Add '+m.name+'">+</button></span></div></div>';
    picker.appendChild(c);
  });
  // the showroom robots, priced on request, in the same grid
  var ROBOTS=Q.ROBOTS||[];
  if(ROBOTS.length){ var hd=document.createElement('div'); hd.className='pick-sub label'; hd.textContent='Showroom robots, priced to order'; picker.appendChild(hd); }
  ROBOTS.forEach(function(r){
    qty[r.id]=0;
    var c=document.createElement('div'); c.className='pick robot'; c.id='pick-'+r.id;
    c.innerHTML='<div class="ph"><img src="'+r.img+'" alt="'+r.name+'" loading="lazy"></div>'+
      '<div class="pick-b"><h3>'+r.name+'<small>'+r.kind+'</small></h3><p>'+r.status+'. Priced to order.</p>'+
      '<div class="pick-f"><span class="price">On request</span>'+
      '<span class="qty"><button type="button" data-id="'+r.id+'" data-d="-1" aria-label="Fewer '+r.name+'">&minus;</button><output id="qty-'+r.id+'">0</output><button type="button" data-id="'+r.id+'" data-d="1" aria-label="Add '+r.name+'">+</button></span></div></div>';
    picker.appendChild(c);
  });
  picker.addEventListener('click',function(e){
    var b=e.target.closest('button[data-id]'); if(!b) return;
    var id=b.getAttribute('data-id'); qty[id]=Math.max(0,Math.min(20,qty[id]+parseInt(b.getAttribute('data-d'),10)));
    render();
  });

  // 2. add-ons: hardware first, then the work around it
  var box=el('addons');
  function chip(o,group){
    var d=document.createElement('button'); d.type='button'; d.className='addon'; d.id='ad-'+o.id;
    d.setAttribute('data-group',group); d.setAttribute('data-id',o.id); d.setAttribute('aria-pressed','false');
    d.innerHTML=(o.img?'<span class="ph"><img src="'+o.img+'" alt="'+o.alt+'" loading="lazy"></span>':'')+
      '<span class="addon-b"><b>'+o.name+'</b><small>'+o.sub+'</small><span class="p" id="adp-'+o.id+'"></span></span>';
    box.appendChild(d);
  }
  PARTS.forEach(function(p){ parts[p.id]=false; chip(p,'part'); });
  SERVICES.forEach(function(s){ svc[s.id]=!!s.on; chip(s,'svc'); });
  box.addEventListener('click',function(e){
    var b=e.target.closest('.addon'); if(!b) return;
    var id=b.getAttribute('data-id'), g=b.getAttribute('data-group');
    if(g==='part') parts[id]=!parts[id]; else svc[id]=!svc[id];
    render();
  });

  function read(){
    return {
      plan:form.querySelector('input[name=plan]:checked').value,
      term:parseInt(el('term').value,10)||1,
      site:form.querySelector('input[name=site]:checked').value,
      gst:form.querySelector('input[name=gst]:checked').value
    };
  }
  function line(label,sub,value,ind,img){ return {label:label,sub:sub,value:value,ind:ind,img:img}; }

  function state(){
    var v=read();
    return {qty:qty,parts:parts,svc:svc,pkg:pagePkg,plan:v.plan,term:v.term,site:v.site};
  }
  function render(){
    var v=read(), c=Q.compute(state());
    var lines=c.lines.map(function(l){ return {label:l.label,sub:l.sub,value:l.value,note:l.note,ind:l.ind,img:l.img}; });
    var sub=c.sub, count=c.count, indicative=c.indicative;
    // the cards
    MACHINES.concat(ROBOTS).forEach(function(m){
      var n=qty[m.id]; el('qty-'+m.id).textContent=n; el('pick-'+m.id).classList.toggle('on',n>0);
    });
    PARTS.forEach(function(p){
      var on=parts[p.id]; el('ad-'+p.id).classList.toggle('on',on); el('ad-'+p.id).setAttribute('aria-pressed',on?'true':'false');
      el('adp-'+p.id).textContent=money.format(p.price);
    });
    SERVICES.forEach(function(s){
      var on=svc[s.id], amt=c.count?Q.serviceAmount(s,c.supply):0;
      el('ad-'+s.id).classList.toggle('on',on); el('ad-'+s.id).setAttribute('aria-pressed',on?'true':'false');
      el('adp-'+s.id).textContent=c.count?money.format(amt):'Priced on your machines';
    });
    var noPlan=v.plan==='none';
    el('term').disabled=noPlan; el('term-row').classList.toggle('off',noPlan);
    el('term-out').textContent=v.term+(v.term===1?' year':' years');
    // the proposal is this quote as a document, at its own address
    var prop=el('q-proposal'); if(prop) prop.href=prop.getAttribute('data-base')+Q.toQuery(state());

    var tb=el('q-lines'); tb.innerHTML='';
    if(!lines.length){ tb.innerHTML='<tr class="empty"><th colspan="2">Pick a machine to start the quote</th></tr>'; }
    lines.forEach(function(l){
      var tr=document.createElement('tr');
      if(l.ind) tr.className='scope';
      if(l.img) tr.className+=(tr.className?' ':'')+'pic';
      tr.innerHTML='<th><span class="lr">'+(l.img?'<span class="t"><img src="'+l.img+'" alt=""></span>':'')+'<span>'+l.label+'<small>'+l.sub+'</small></span></span></th><td>'+(l.value===null?(l.note||'On request'):l.value===0?'Included':money.format(l.value))+'</td>';
      tb.appendChild(tr);
    });

    var gst=c.gst, inc=c.inc;
    el('q-sub').textContent=money.format(sub); el('q-gst').textContent=money.format(gst); el('q-inc').textContent=money.format(inc);
    var shown=v.gst==='inc'?inc:sub;
    el('q-total').innerHTML=(indicative?'<small>about</small>':'')+money.format(shown);
    el('q-total-note').textContent=(v.gst==='inc'?'Total, inc GST':'Total, ex GST')+(indicative?'. Machines at list, the rest indicative':'');

    var d=new Date(), ref='WR-Q'+String(d.getFullYear()).slice(2)+('0'+(d.getMonth()+1)).slice(-2)+('0'+d.getDate()).slice(-2)+'-'+count;
    el('q-ref').textContent=ref;
    var body=['Quote '+ref].concat(lines.map(function(l){return l.label+' ('+l.sub+'): '+(l.value===null?(l.note||'on request').toLowerCase():l.value===0?'included':money.format(l.value));}))
      .concat(['Subtotal ex GST: '+money.format(sub),'GST: '+money.format(gst),'Total inc GST: '+money.format(inc),'',
               'Machines at 2026 Moton list. Everything else indicative, confirmed on scope.','','Site:','Contact:']).join('\n');
    el('q-send').href='mailto:info@wonderbytech.com?subject='+encodeURIComponent('Quote '+ref)+'&body='+encodeURIComponent(body);
  }
  form.addEventListener('input',render);
  form.addEventListener('change',render);
  var propEl=el('q-proposal'); if(propEl) propEl.setAttribute('data-base',propEl.getAttribute('href'));
  // A product or landing page pre-picks its lines: quote/?pick=bpro,prnt.
  var pick=(location.search.match(/[?&]pick=([^&]*)/)||[])[1];
  var pkgQ=(location.search.match(/[?&]pkg=([a-z]+)/)||[])[1];
  var pkgDef=pkgQ&&Q.PACKAGES.filter(function(x){return x.id===pkgQ;})[0];
  if(pkgDef){
    pagePkg=pkgDef.id;
    Object.keys(pkgDef.machines).forEach(function(m){ qty[m]=Math.max(qty[m],pkgDef.machines[m]); });
    Q.PACKAGE_WORK.forEach(function(w){ svc[w]=true; });
  }
  if(pick){ var pk=Q.parsePick(pick);
    Object.keys(pk.qty).forEach(function(id){qty[id]=pk.qty[id];});
    Object.keys(pk.parts).forEach(function(id){parts[id]=true;});
    Object.keys(pk.svc).forEach(function(id){svc[id]=true;}); }
  else if(!pkgDef){ qty.fry=1; qty.noo=1; }
  render();
})();

(function(){
  // honour reduced motion for the hero: pause and show the still
  var vid=document.querySelector('.hero-video'); if(!vid) return;
  if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches){ try{vid.pause();}catch(e){} vid.removeAttribute('autoplay'); }
})();

/* One small animation. The night half of the stack rises into place under the
   cream half, so the page acts out what the section says. Off under reduced
   motion, and it only ever runs once. */
(function () {
  // The same observer now lifts every plate on the site as it arrives
  // (Jesse, 14 Sep 2026: "a subtle loader on the images to make it pop").
  // The process rail keeps its own ink wipe and is left out here.
  var els = [].slice.call(document.querySelectorAll('.layer.bottom, .story figure:not(.diag), .cases .ph, .catalogue .ph, .venue .shot, .visit .peek a, .feature .card, .related .ph, .next .ph, .pdetail figure, .tiles li'));
  if (!els.length || !('IntersectionObserver' in window)) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.documentElement.classList.add('wr-lift');
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
  els.forEach(function (n) { io.observe(n); });
})();

/* Rail arrows. The scroller already works without them; these just page it by
   one card and grey themselves out at each end. */
(function () {
  var btns = document.querySelectorAll('.rail-btn');
  if (!btns.length) return;
  function step(rail) {
    var card = rail.querySelector('.shot');
    return card ? card.getBoundingClientRect().width + 24 : rail.clientWidth * 0.8;
  }
  function sync(rail) {
    var max = rail.scrollWidth - rail.clientWidth - 2;
    document.querySelectorAll('[data-rail="' + rail.id + '"]').forEach(function (b) {
      var back = b.dataset.dir === '-1';
      b.disabled = back ? rail.scrollLeft <= 2 : rail.scrollLeft >= max;
    });
  }
  btns.forEach(function (b) {
    var rail = document.getElementById(b.dataset.rail);
    if (!rail) return;
    b.addEventListener('click', function () {
      rail.scrollBy({ left: step(rail) * (+b.dataset.dir), behavior: 'smooth' });
    });
    rail.addEventListener('scroll', function () { sync(rail); }, { passive: true });
    sync(rail);
  });
})();

/* The rails drive sideways as the page scrolls down. Progress is how far the
   rail has travelled up the viewport, mapped onto its own scroll range, so it
   finishes as it leaves. The moment somebody drags, wheels sideways or uses an
   arrow, that rail is theirs until it has scrolled out of view. Off under
   reduced motion, and the snap and smooth CSS are lifted only while we drive,
   because both fight a scrollLeft that changes every frame. */
(function () {
  var rails = [].slice.call(document.querySelectorAll('.rail-scroll'));
  if (!rails.length) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  function take(rail) { rail._manual = true; rail.style.scrollSnapType = ''; rail.style.scrollBehavior = ''; }
  rails.forEach(function (rail) {
    rail.addEventListener('pointerdown', function () { take(rail); }, { passive: true });
    rail.addEventListener('wheel', function (e) { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) take(rail); }, { passive: true });
    document.querySelectorAll('[data-rail="' + rail.id + '"]').forEach(function (b) {
      b.addEventListener('click', function () { take(rail); });
    });
  });
  var ticking = false;
  function frame() {
    ticking = false;
    var vh = window.innerHeight;
    rails.forEach(function (rail) {
      var r = rail.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) { rail._manual = false; return; }   // out of view: hand it back
      if (rail._manual) return;
      var max = rail.scrollWidth - rail.clientWidth;
      if (max <= 0) return;
      // enters at 90% down the viewport, done by the time its bottom passes 30%
      var t = (vh * 0.9 - r.top) / (vh * 0.9 - (vh * 0.3 - r.height));
      t = Math.max(0, Math.min(1, t));
      rail.style.scrollSnapType = 'none';
      rail.style.scrollBehavior = 'auto';
      rail.scrollLeft = t * max;
    });
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  frame();
})();

/* The process plates ink in as they come into view, one after another. */
(function () {
  var shots = [].slice.call(document.querySelectorAll('.process .shot'));
  if (!shots.length || !('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      var i = shots.indexOf(e.target);
      setTimeout(function () { e.target.classList.add('inked'); }, Math.max(0, i) * 180);
    });
  }, { threshold: 0.15 });
  shots.forEach(function (s) { io.observe(s); });
})();

/* The footer robot rides the scroll (Jesse, 14 Sep 2026: "smoothly and on
   scroll"). Its position is the footer's progress up the viewport mapped onto
   the same peek-hesitate-slide keyframes the loader uses, and a lerp carries it
   between scroll events so it never steps. Scroll back up and it retreats.
   The mark paints after the font loads, so parking waits for geometry. */
(function () {
  var cv = document.querySelector('footer canvas[data-wonder-mark]');
  if (!cv || !window.WonderSneak || !window.WonderMark) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var g = null, cur = WonderSneak.OUT, target = cur, raf = null;
  function progress() {
    var r = cv.getBoundingClientRect(), vh = window.innerHeight;
    // enters at the bottom edge, home by the time its centre is 58% up
    return Math.max(0, Math.min(1, (vh - r.top) / (vh * 0.42 + r.height * 0.5)));
  }
  function frame() {
    raf = null;
    cur += (target - cur) * 0.16;
    if (Math.abs(target - cur) < 0.0015) cur = target;
    cv._wmdx = cur;
    WonderMark.drawLockup(cv, g.W, g.H, g.px, g.ink, g.sub, cur);
    if (cur !== target) raf = requestAnimationFrame(frame);
  }
  function onScroll() {
    if (!g) return;
    target = WonderSneak.at(progress(), WonderMark.HOME);
    if (!raf) raf = requestAnimationFrame(frame);
  }
  var tries = 0;
  (function park() {
    if (WonderSneak.park(cv)) { g = WonderMark.geom(cv); onScroll(); return; }
    if (++tries < 400) requestAnimationFrame(park);
  })();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { g = WonderMark.geom(cv); onScroll(); });
})();

/* The ask form. mailto: with enctype text/plain works in most mail apps but
   not all, so we compose the message ourselves and open it. */
(function () {
  [].forEach.call(document.querySelectorAll('form.ask'), function (f) {
    var eoi = f.hasAttribute('data-eoi');
    // The site-wide band pre-ticks the product of the page it sits on.
    if (eoi) {
      var path = location.pathname;
      var key = /robot-coffee/.test(path) ? 'coffee' : /robot-cocktail/.test(path) ? 'cocktail' : /robot-ice-cream/.test(path) ? 'icecream' : /robot-kitchen|kitchen-robot/.test(path) ? 'kitchen' : /coffee-robot/.test(path) ? 'coffee' : null;
      if (key && f.elements[key]) f.elements[key].checked = true;
    }
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = function (n) { var el = f.elements[n]; return el && el.value ? el.value.trim() : ''; };
      var lines, subject;
      if (eoi) {
        var picks = [].filter.call(f.querySelectorAll('input[type=checkbox]'), function (c) { return c.checked; }).map(function (c) { return c.value; });
        var venue = (f.querySelector('input[name=venue]:checked') || {}).value || '';
        subject = 'Design, build and fit out: ' + (picks.length ? picks.join(', ') : 'a venue');
        lines = ['Interested in: ' + (picks.length ? picks.join(', ') : 'not sure yet'), 'Venue: ' + venue, 'Name: ' + v('name'), 'Email: ' + v('email')];
      } else {
        var machine = f.dataset.product || v('machine');
        subject = 'Quote: ' + machine;
        lines = ['Machine: ' + machine, 'Name: ' + v('name'), 'Email: ' + v('email')];
      }
      if (v('company')) lines.push('Company: ' + v('company'));
      if (v('where')) lines.push('Where: ' + v('where'));
      if (v('job')) lines.push('', 'The job:', v('job'));
      window.location.href = 'mailto:info@wonderbytech.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
    });
  });
})();

/* The footer line arrives a word at a time. */
(function () {
  var made = document.querySelector('footer .made');
  if (!made || !('IntersectionObserver' in window)) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  made.classList.add('stagger');
  [].forEach.call(made.children, function (el, i) { el.style.transitionDelay = (i * 55) + 'ms'; });
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { made.classList.add('is-in'); io.disconnect(); } });
  }, { threshold: 0.5 });
  io.observe(made);
})();
