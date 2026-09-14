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
  var MACHINES=[
    {id:'eff',  name:'Coffee robot',     model:'Smart EFF, vending kiosk',    kit:'Dual arm, Dr.Coffee F200, ice, 3 syrups, milk frother, cup printing', price:74000},
    {id:'bpro', name:'Coffee barista',   model:'B Pro, bar type',             kit:'Dual arm, Eversys, ice, cup printing', price:100000},
    {id:'bstd', name:'Coffee barista',   model:'B Standard, bar type',        kit:'Dual arm, Dr.Coffee F3, ice, cup printing', price:67000},
    {id:'bar',  name:'Robot bartender',  model:'T Standard',                  kit:'Dobot arm, ice, 3 syrups', price:39000},
    {id:'ice',  name:'Ice cream robot',  model:'I Pro',                       kit:'Pasteurising machine, 3 syrups, 2 toppings', price:41000},
    {id:'noo',  name:'Noodle robot',     model:'N Standard',                  kit:'Dobot arm, 6 noodle stoves', price:52000},
    {id:'fry',  name:'Deep frying robot',model:'F Standard',                  kit:'Dobot arm, 6 frying stoves', price:42000}
  ];
  // Wonder's own rates. A null rate prints "on scope" and keeps the total honest.
  // Fill these from the rate card; nothing else needs to change.
  var RATES={
    install_per_machine:null,          // AUD ex GST, per machine, install and commission
    maintenance_per_machine_year:{standard:null, priority:null},
    delivery_inland:null               // AUD ex GST, flat, beyond 100 km of a port
  };
  var GST=0.10;

  var form=document.getElementById('quote-form');
  if(!form){return;}
  var el=function(id){return document.getElementById(id);};
  var money=new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',maximumFractionDigits:0});
  var qty={};

  var tbody=el('cat').querySelector('tbody');
  MACHINES.forEach(function(m){
    qty[m.id]=0;
    var tr=document.createElement('tr'); tr.id='row-'+m.id;
    tr.innerHTML='<td class="name">'+m.name+'<small>'+m.model+'</small></td><td class="kit">'+m.kit+'</td>'+
      '<td class="price num">'+money.format(m.price)+'</td>'+
      '<td class="num"><span class="qty"><button type="button" data-id="'+m.id+'" data-d="-1" aria-label="Fewer '+m.name+'">&minus;</button><output id="qty-'+m.id+'">0</output><button type="button" data-id="'+m.id+'" data-d="1" aria-label="More '+m.name+'">+</button></span></td>';
    tbody.appendChild(tr);
  });
  tbody.addEventListener('click',function(e){
    var b=e.target.closest('button[data-id]'); if(!b) return;
    var id=b.getAttribute('data-id'); qty[id]=Math.max(0,Math.min(20,qty[id]+parseInt(b.getAttribute('data-d'),10)));
    render();
  });

  function read(){
    return {
      install:form.querySelector('input[name=install]:checked').value,
      plan:form.querySelector('input[name=plan]:checked').value,
      term:parseInt(el('term').value,10)||1,
      site:form.querySelector('input[name=site]:checked').value,
      gst:form.querySelector('input[name=gst]:checked').value
    };
  }
  function line(label,sub,value){ return {label:label,sub:sub,value:value}; }

  function render(){
    var v=read();
    var count=0, supply=0, lines=[], open=[];
    MACHINES.forEach(function(m){
      var n=qty[m.id]; el('qty-'+m.id).textContent=n;
      el('row-'+m.id).classList.toggle('on',n>0);
      if(n>0){count+=n; supply+=n*m.price; lines.push(line(m.name+', '+m.model, n+' \u00d7 '+money.format(m.price)+', supply', n*m.price));}
    });
    var noPlan=v.plan==='none';
    el('term').disabled=noPlan; el('term-row').classList.toggle('off',noPlan);
    el('term-out').textContent=v.term+(v.term===1?' year':' years');

    var sub=supply;
    if(count>0&&v.install==='full'){
      var r=RATES.install_per_machine;
      if(r==null){open.push('installation'); lines.push(line('Installation and commissioning',count+(count===1?' machine':' machines')+', by Wonder',null));}
      else{sub+=r*count; lines.push(line('Installation and commissioning',count+' \u00d7 '+money.format(r),r*count));}
    }
    if(count>0&&!noPlan){
      var mr=RATES.maintenance_per_machine_year[v.plan];
      var label=(v.plan==='priority'?'Priority':'Standard')+' maintenance';
      var sub2=count+(count===1?' machine':' machines')+', '+v.term+(v.term===1?' year':' years');
      if(mr==null){open.push('maintenance'); lines.push(line(label,sub2,null));}
      else{var mt=mr*count*v.term; sub+=mt; lines.push(line(label,sub2+', '+money.format(mr)+' a machine a year',mt));}
    }
    if(count>0){
      if(v.site==='port'){lines.push(line('Delivery','Within 100 km of a port, included',0));}
      else{var dr=RATES.delivery_inland; if(dr==null){open.push('delivery'); lines.push(line('Delivery','Beyond 100 km of a port',null));} else{sub+=dr; lines.push(line('Delivery','Beyond 100 km of a port',dr));}}
    }

    var tb=el('q-lines'); tb.innerHTML='';
    if(!lines.length){ tb.innerHTML='<tr class="empty"><th colspan="2">Add a machine to start the quote</th></tr>'; }
    lines.forEach(function(l){
      var tr=document.createElement('tr');
      if(l.value==null) tr.className='scope';
      tr.innerHTML='<th>'+l.label+'<small>'+l.sub+'</small></th><td>'+(l.value==null?'On scope':(l.value===0?'Included':money.format(l.value)))+'</td>';
      tb.appendChild(tr);
    });

    var gst=Math.round(sub*GST), inc=sub+gst;
    el('q-sub').textContent=money.format(sub); el('q-gst').textContent=money.format(gst); el('q-inc').textContent=money.format(inc);
    var shown=v.gst==='inc'?inc:sub;
    el('q-total').innerHTML=(open.length?'<small>from</small>':'')+money.format(shown);
    el('q-total-note').textContent=(v.gst==='inc'?'Total, inc GST':'Total, ex GST')+(open.length?', plus '+open.join(', ')+' on scope':'');

    var d=new Date(), ref='WR-Q'+String(d.getFullYear()).slice(2)+('0'+(d.getMonth()+1)).slice(-2)+('0'+d.getDate()).slice(-2)+'-'+count;
    el('q-ref').textContent=ref;
    var body=['Quote '+ref].concat(lines.map(function(l){return l.label+' ('+l.sub+'): '+(l.value==null?'on scope':(l.value===0?'included':money.format(l.value)));}))
      .concat(['Subtotal ex GST: '+money.format(sub),'GST: '+money.format(gst),'Total inc GST: '+money.format(inc),'','Site:','Contact:']).join('\n');
    el('q-send').href='mailto:info@wonderbytech.com?subject='+encodeURIComponent('Quote '+ref)+'&body='+encodeURIComponent(body);
  }
  form.addEventListener('input',render);
  form.addEventListener('change',render);
  el('q-print').addEventListener('click',function(e){e.preventDefault();window.print();});
  qty.noo=1; qty.fry=1;
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
  var f = document.querySelector('form.ask');
  if (!f) return;
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = function (n) { var el = f.elements[n]; return el && el.value ? el.value.trim() : ''; };
    var machine = f.dataset.product || v('machine');
    var lines = ['Machine: ' + machine, 'Name: ' + v('name'), 'Email: ' + v('email')];
    if (v('company')) lines.push('Company: ' + v('company'));
    if (v('where')) lines.push('Where: ' + v('where'));
    if (v('job')) lines.push('', 'What it should do:', v('job'));
    window.location.href = 'mailto:info@wonderbytech.com?subject=' + encodeURIComponent('Quote: ' + machine) + '&body=' + encodeURIComponent(lines.join('\n'));
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
