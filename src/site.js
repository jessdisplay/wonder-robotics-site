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
     machines:{bpro:1}, img:'{{root}}img/offer/coffee-bar-studio.jpg', alt:'The dual-arm B Pro coffee bar on its counter'},
    {id:'cafe', name:'The robot café', line:'Coffee and soft serve, the counter, the room and the brand across all of it.',
     machines:{bpro:1,ice:1}, img:'{{root}}img/coffee/venue-01-bar-in-room.jpg', alt:'A branded robot coffee bar in a venue, by the street door'},
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
  return {MACHINES:MACHINES,ROBOTS:ROBOTS,PACKAGES:PACKAGES,PACKAGE_OFF:PACKAGE_OFF,PACKAGE_WORK:PACKAGE_WORK,packageQuote:packageQuote,PARTS:PARTS,SERVICES:SERVICES,RATES:RATES,GST:GST,serviceAmount:serviceAmount,parsePick:parsePick,
          money:new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',maximumFractionDigits:0})};
})();
/* Package blocks on a page, drawn from the same price list as the quote:
   <div data-packages> for all of them, data-only="box" for one. A pill with
   data-pkg-from shows the lowest package price, data-pkg-price="id" one. */
(function(){
  var Q=window.WonderQuote; if(!Q||!Q.PACKAGES) return;
  var money=Q.money;
  var esc=function(t){ return String(t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); };
  var quotes={}; Q.PACKAGES.forEach(function(p){ quotes[p.id]=Q.packageQuote(p); });
  var root=(function(){ var a=document.querySelector('.bar .mark'); return a?a.getAttribute('href'):''; })();

  [].forEach.call(document.querySelectorAll('[data-pkg-from]'),function(el){
    // only a package whose price is the whole price can set the "from"
    var low=Q.PACKAGES.filter(function(p){return !quotes[p.id].extra;}).map(function(p){return quotes[p.id].total;}).sort(function(a,b){return a-b;})[0];
    el.textContent='From '+money.format(low);
  });
  [].forEach.call(document.querySelectorAll('[data-pkg-price]'),function(el){
    var q=quotes[el.getAttribute('data-pkg-price')]; if(!q) return;
    el.textContent='From '+money.format(q.total)+(q.extra?' plus the build':'');
  });

  [].forEach.call(document.querySelectorAll('[data-packages]'),function(host){
    var only=(host.getAttribute('data-only')||'').split(',').filter(Boolean);
    var list=Q.PACKAGES.filter(function(p){ return !only.length||only.indexOf(p.id)>=0; });
    host.innerHTML=list.map(function(p,i){
      var q=quotes[p.id];
      var rows=q.lines.map(function(l){
        return '<li><span class="t"><img src="'+l.img+'" alt="" loading="lazy"></span><span class="n">'+esc(l.name)+'<small>'+esc(l.kind==='machine'?l.sub:'Indicative')+'</small></span><span class="v">'+money.format(l.amount)+'</span></li>';
      }).join('')+(q.extra?'<li><span class="t"><img src="'+p.img+'" alt="" loading="lazy"></span><span class="n">'+esc(q.extra.name)+'<small>'+esc(q.extra.sub)+'</small></span><span class="v ask">'+esc(q.extra.note)+'</span></li>':'');
      return '<article class="pk" id="pk-'+p.id+'">'+
        '<figure class="pk-ph"><img src="'+p.img+'" alt="'+esc(p.alt)+'" loading="lazy"></figure>'+
        '<div class="pk-b">'+
          (list.length>1?'<span class="label">('+('0'+(i+1)).slice(-2)+')</span>':'<span class="label">[ The package ]</span>')+
          '<h2>'+esc(p.name)+'</h2><p class="pk-line">'+esc(p.line)+'</p>'+
          '<ul class="pk-rows">'+rows+'</ul>'+
          '<div class="pk-sum">'+
            '<div class="pk-was"><span>Bought separately</span><s>'+money.format(q.separate)+'</s></div>'+
            '<div class="pk-save"><span>Package, 10% off the work</span><b>Save '+money.format(q.save)+'</b></div>'+
            '<div class="pk-total"><span class="pk-num">'+money.format(q.total)+'</span><span class="label">'+(q.extra?'Ex GST, plus the container build':'Ex GST, delivered within 100 km of a port')+'</span></div>'+
          '</div>'+
          '<div class="pk-go"><a class="btn" href="'+root+'quote/?pkg='+p.id+'" data-quote data-pkg="'+p.id+'"><span>Build this package</span><i aria-hidden="true">+</i></a>'+
          '<a class="btn ghost" href="'+root+'quote/?pkg='+p.id+'"><span>See the full quote</span><i aria-hidden="true">+</i></a>'+
          (p.url&&location.pathname.indexOf('robot-container-kitchens')<0?'<a class="link" href="'+p.url+'">The container</a>':'')+'</div>'+
        '</div></article>';
    }).join('');
  });
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
  var qty={}, parts={}, svc={}, pkg=null, drawn=false, lastFocus=null;
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
  function draw(){
    if(drawn) return; drawn=true;
    $('qp-pkg').innerHTML=Q.PACKAGES.map(pkgCard).join('');
    $('qp-food').innerHTML=Q.MACHINES.map(function(m){
      return card(m,{kind:'unit',counted:true,label:m.name+', '+m.model,title:m.name,small:m.model,text:m.kit,price:money.format(m.price)});
    }).join('');
    $('qp-robots').innerHTML=Q.ROBOTS.map(function(r){
      var floor=/floor/i.test(r.status);
      return card(r,{kind:'unit',counted:true,label:r.name,title:r.name,small:r.kind,price:'On request',ask:true,
        tag:'<span class="tag'+(floor?' floor':'')+'"><i></i>'+esc(r.status)+'</span>'});
    }).join('');
    $('qp-parts').innerHTML=Q.PARTS.map(function(x){ return card(x,{kind:'part',label:x.name,title:x.name,text:x.sub}); }).join('');
    $('qp-work').innerHTML=Q.SERVICES.map(function(x){ return card(x,{kind:'svc',label:x.name,title:x.name,text:x.sub}); }).join('');
    render();
  }
  $('qs-pick').addEventListener('click',function(e){
    var step=e.target.closest('button[data-d]');
    if(step){ var sid=step.getAttribute('data-id'); qty[sid]=Math.max(0,Math.min(20,qty[sid]+parseInt(step.getAttribute('data-d'),10))); render(); return; }
    var hit=e.target.closest('.qs-hit'); if(!hit) return;
    var id=hit.getAttribute('data-id'), k=hit.getAttribute('data-kind');
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
    var tabCount={food:0,robots:0,parts:0,work:0};
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
      total+=x.price; tabCount.parts++; pick.push(x.id);
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
  }
  function mark(id,n){
    var c=$('qc-'+id); if(!c) return;
    c.classList.toggle('on',n>0);
    var o=$('qn-'+id); if(o) o.textContent=n;
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
  // not "parts": the quote builder below shares this scope and has its own
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

  function render(){
    var v=read();
    var count=0, supply=0, lines=[], indicative=false;
    MACHINES.forEach(function(m){
      var n=qty[m.id]; el('qty-'+m.id).textContent=n;
      el('pick-'+m.id).classList.toggle('on',n>0);
      if(n>0){count+=n; supply+=n*m.price; lines.push(line(m.name+', '+m.model, n+' \u00d7 '+money.format(m.price)+', supply', n*m.price, false, m.img));}
    });

    var asks=0;
    ROBOTS.forEach(function(r){
      var n=qty[r.id]; el('qty-'+r.id).textContent=n;
      el('pick-'+r.id).classList.toggle('on',n>0);
      if(n>0){ asks+=n; indicative=true; lines.push(line(r.name, n+' \u00d7 '+r.kind+', priced to order', null, true, r.img)); }
    });

    var sub=supply, workSum=0;
    PARTS.forEach(function(p){
      var on=parts[p.id]; el('ad-'+p.id).classList.toggle('on',on); el('ad-'+p.id).setAttribute('aria-pressed',on?'true':'false');
      el('adp-'+p.id).textContent=money.format(p.price);
      if(on){ sub+=p.price; indicative=true; lines.push(line(p.name,p.sub+', indicative',p.price,true,p.img)); }
    });
    SERVICES.forEach(function(s){
      var on=svc[s.id], amt=count?Q.serviceAmount(s,supply):0;
      el('ad-'+s.id).classList.toggle('on',on); el('ad-'+s.id).setAttribute('aria-pressed',on?'true':'false');
      el('adp-'+s.id).textContent=count?money.format(amt):'Priced on your machines';
      if(on&&count){ sub+=amt; workSum+=amt; indicative=true; lines.push(line(s.name,s.sub+', indicative',amt,true,s.img)); }
    });

    var noPlan=v.plan==='none';
    el('term').disabled=noPlan; el('term-row').classList.toggle('off',noPlan);
    el('term-out').textContent=v.term+(v.term===1?' year':' years');
    if(count>0&&!noPlan){
      var pct=RATES.maintenance_pct_per_year[v.plan];
      var yr=Math.round(supply*pct/100)*100, mt=yr*v.term;
      sub+=mt; indicative=true;
      lines.push(line((v.plan==='priority'?'Priority':'Standard')+' maintenance',
        v.term+(v.term===1?' year':' years')+', '+money.format(yr)+' a year, indicative',mt,true));
    }
    // A package holds while its machines, its work and a maintenance plan are
    // all still on the quote. The saving is 10% off the work and the first
    // year of maintenance; machines stay at list.
    var pk=pagePkg&&Q.PACKAGES.filter(function(x){return x.id===pagePkg;})[0];
    var holds=pk&&!noPlan&&Object.keys(pk.machines).every(function(m){return qty[m]>=pk.machines[m];})&&Q.PACKAGE_WORK.every(function(w){return svc[w];});
    if(holds){
      var firstYr=Math.round(supply*RATES.maintenance_pct_per_year[v.plan]/100)*100;
      var save=Math.round((workSum+firstYr)*Q.PACKAGE_OFF/100)*100;
      if(pk.extra){ lines.push({label:pk.extra.name,sub:pk.extra.sub,value:null,note:pk.extra.note,ind:true,img:pk.img}); indicative=true; }
      sub-=save;
      lines.push(line('Package saving',pk.name+', 10% off the work',-save,true,pk.img));
    }
    if(count>0){
      if(v.site==='port'){lines.push(line('Delivery','Within 100 km of a port, included',0));}
      else{sub+=RATES.delivery_inland; lines.push(line('Delivery','Beyond 100 km of a port, indicative',RATES.delivery_inland,true)); indicative=true;}
    }

    var tb=el('q-lines'); tb.innerHTML='';
    if(!lines.length){ tb.innerHTML='<tr class="empty"><th colspan="2">Pick a machine to start the quote</th></tr>'; }
    lines.forEach(function(l){
      var tr=document.createElement('tr');
      if(l.ind) tr.className='scope';
      if(l.img) tr.className+=(tr.className?' ':'')+'pic';
      tr.innerHTML='<th><span class="lr">'+(l.img?'<span class="t"><img src="'+l.img+'" alt=""></span>':'')+'<span>'+l.label+'<small>'+l.sub+'</small></span></span></th><td>'+(l.value===null?(l.note||'On request'):l.value===0?'Included':money.format(l.value))+'</td>';
      tb.appendChild(tr);
    });

    var gst=Math.round(sub*GST), inc=sub+gst;
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
  el('q-print').addEventListener('click',function(e){e.preventDefault();window.print();});
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
