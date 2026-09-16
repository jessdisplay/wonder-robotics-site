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
(function(){
  var L=document.getElementById('loader'); if(!L) return;
  var seen=false; try{seen=sessionStorage.getItem('wr-loader')==='1';}catch(e){}
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(seen||reduce){L.remove();return;}
  var lifted=false, started=false;
  var lift=function(){ if(lifted) return; lifted=true;
    L.classList.add('out'); try{sessionStorage.setItem('wr-loader','1');}catch(e){} setTimeout(function(){L.remove();},600);};
  // The loader plays the same sneak as the footer, faster, and leaves the
  // moment the robot is home. Nobody waits on a logo.
  var start=function(){ if(started) return; started=true;
    if(window.WonderMark){WonderMark.paintAll();}
    var cv=L.querySelector('canvas[data-wonder-mark]');
    var ran=cv&&window.WonderSneak&&WonderSneak.park(cv);
    L.classList.add('in');
    if(ran) WonderSneak.run(cv,1150,function(){setTimeout(lift,260);});
    else setTimeout(lift,900);
  };
  if(document.fonts&&document.fonts.load){ document.fonts.load('700 84px UnboundedW').then(start,start); setTimeout(start,700); } else { setTimeout(start,200); }
  setTimeout(lift,2600); // never trap anyone behind it
})();
(function(){
  var clock=document.getElementById('clock');
  var state=document.getElementById('floor-state');
  var dot=document.getElementById('floor-dot');
  var fmt=new Intl.DateTimeFormat('en-AU',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Australia/Brisbane'});
  var parts=new Intl.DateTimeFormat('en-AU',{weekday:'short',hour:'numeric',minute:'numeric',hour12:false,timeZone:'Australia/Brisbane'});
  var HOURS={Mon:[9,19],Tue:[9,19],Wed:[9,19],Thu:[9,19],Fri:[9,19],Sat:[10,17]};
  function tick(){
    var now=new Date();
    clock.textContent=fmt.format(now);
    var p={};
    parts.formatToParts(now).forEach(function(x){p[x.type]=x.value;});
    var h=parseInt(p.hour,10)%24+parseInt(p.minute,10)/60;
    var span=HOURS[p.weekday];
    var open=!!span&&h>=span[0]&&h<span[1];
    state.textContent=open?'Floor open':'Floor closed';
    dot.classList.toggle('shut',!open);
  }
  tick(); setInterval(tick,15000);

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
    {id:'icem', name:'Ice maker',                     sub:'BTB Z02. A second, or one on a line with none', price:3800},
    {id:'prnt', name:'Chocolate and caramel printer',  sub:'Yingmei. Your mark on the crema or the foam',   price:5200},
    {id:'milk', name:'Extra milk line',                sub:'A second milk, oat or soy',                     price:1900},
    {id:'syr',  name:'Extra syrup channels',           sub:'Three more, beyond the three supplied',         price:1400}
  ];

  // The work around the machine, calculated from what you picked: a percentage
  // of the machine subtotal with a floor, because a fit-out for one $42,000
  // fryer and one for a $100,000 bar are not the same job. Indicative until we
  // have seen the room. Change the numbers here and the whole site follows.
  var SERVICES=[
    {id:'eng',   name:'Engineering and fit-out', sub:'Counter, cell, guarding, services, extraction, drawings, the build', pct:0.22, min:12000},
    {id:'brand', name:'Branding',                sub:'Mark, colours, cups, bags, menu, signage',                           pct:0.06, min:6000},
    {id:'soft',  name:'Software',                sub:'Ordering, payment, the screen, the dashboard',                       pct:0.10, min:8000},
    {id:'inst',  name:'Install and handover',    sub:'Site survey, placement, services, first run, staff training',        pct:0.08, min:3500, on:true}
  ];
  var RATES={
    maintenance_pct_per_year:{standard:0.07, priority:0.11},
    delivery_inland:2400
  };
  var GST=0.10;

  var form=document.getElementById('quote-form');
  if(!form){return;}
  var el=function(id){return document.getElementById(id);};
  var money=new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',maximumFractionDigits:0});
  var qty={}, parts={}, svc={};

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
    d.innerHTML='<b>'+o.name+'</b><small>'+o.sub+'</small><span class="p" id="adp-'+o.id+'"></span>';
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
  function line(label,sub,value,ind){ return {label:label,sub:sub,value:value,ind:ind}; }

  function render(){
    var v=read();
    var count=0, supply=0, lines=[], indicative=false;
    MACHINES.forEach(function(m){
      var n=qty[m.id]; el('qty-'+m.id).textContent=n;
      el('pick-'+m.id).classList.toggle('on',n>0);
      if(n>0){count+=n; supply+=n*m.price; lines.push(line(m.name+', '+m.model, n+' \u00d7 '+money.format(m.price)+', supply', n*m.price));}
    });

    var sub=supply;
    PARTS.forEach(function(p){
      var on=parts[p.id]; el('ad-'+p.id).classList.toggle('on',on); el('ad-'+p.id).setAttribute('aria-pressed',on?'true':'false');
      el('adp-'+p.id).textContent=money.format(p.price);
      if(on){ sub+=p.price; indicative=true; lines.push(line(p.name,p.sub+', indicative',p.price,true)); }
    });
    SERVICES.forEach(function(s){
      var on=svc[s.id], amt=count?Math.max(s.min,Math.round(supply*s.pct/100)*100):0;
      el('ad-'+s.id).classList.toggle('on',on); el('ad-'+s.id).setAttribute('aria-pressed',on?'true':'false');
      el('adp-'+s.id).textContent=count?money.format(amt):(Math.round(s.pct*100)+'% of supply');
      if(on&&count){ sub+=amt; indicative=true; lines.push(line(s.name,s.sub+', '+Math.round(s.pct*100)+'% of supply, indicative',amt,true)); }
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
    if(count>0){
      if(v.site==='port'){lines.push(line('Delivery','Within 100 km of a port, included',0));}
      else{sub+=RATES.delivery_inland; lines.push(line('Delivery','Beyond 100 km of a port, indicative',RATES.delivery_inland,true)); indicative=true;}
    }

    var tb=el('q-lines'); tb.innerHTML='';
    if(!lines.length){ tb.innerHTML='<tr class="empty"><th colspan="2">Pick a machine to start the quote</th></tr>'; }
    lines.forEach(function(l){
      var tr=document.createElement('tr');
      if(l.ind) tr.className='scope';
      tr.innerHTML='<th>'+l.label+'<small>'+l.sub+'</small></th><td>'+(l.value===0?'Included':money.format(l.value))+'</td>';
      tb.appendChild(tr);
    });

    var gst=Math.round(sub*GST), inc=sub+gst;
    el('q-sub').textContent=money.format(sub); el('q-gst').textContent=money.format(gst); el('q-inc').textContent=money.format(inc);
    var shown=v.gst==='inc'?inc:sub;
    el('q-total').innerHTML=(indicative?'<small>about</small>':'')+money.format(shown);
    el('q-total-note').textContent=(v.gst==='inc'?'Total, inc GST':'Total, ex GST')+(indicative?'. Machines at list, the rest indicative':'');

    var d=new Date(), ref='WR-Q'+String(d.getFullYear()).slice(2)+('0'+(d.getMonth()+1)).slice(-2)+('0'+d.getDate()).slice(-2)+'-'+count;
    el('q-ref').textContent=ref;
    var body=['Quote '+ref].concat(lines.map(function(l){return l.label+' ('+l.sub+'): '+(l.value===0?'included':money.format(l.value));}))
      .concat(['Subtotal ex GST: '+money.format(sub),'GST: '+money.format(gst),'Total inc GST: '+money.format(inc),'',
               'Machines at 2026 Moton list. Everything else indicative, confirmed on scope.','','Site:','Contact:']).join('\n');
    el('q-send').href='mailto:info@wonderbytech.com?subject='+encodeURIComponent('Quote '+ref)+'&body='+encodeURIComponent(body);
  }
  form.addEventListener('input',render);
  form.addEventListener('change',render);
  el('q-print').addEventListener('click',function(e){e.preventDefault();window.print();});
  // A product or landing page pre-picks its lines: quote/?pick=bpro,prnt.
  var pick=(location.search.match(/[?&]pick=([^&]*)/)||[])[1];
  if(pick){ pick.split(',').forEach(function(id){ if(id in qty) qty[id]=1; else if(id in parts) parts[id]=true; else if(id in svc) svc[id]=true; }); }
  else{ qty.fry=1; qty.noo=1; }
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
