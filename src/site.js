(function(){
  var L=document.getElementById('loader'); if(!L) return;
  var seen=false; try{seen=sessionStorage.getItem('wr-loader')==='1';}catch(e){}
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(seen||reduce){L.remove();return;}
  var lift=function(){L.classList.add('out'); try{sessionStorage.setItem('wr-loader','1');}catch(e){} setTimeout(function(){L.remove();},600);};
  var start=function(){ if(window.WonderMark){WonderMark.paintAll();} L.classList.add('in'); setTimeout(lift,900); };
  if(document.fonts&&document.fonts.load){ document.fonts.load('700 84px UnboundedW').then(start,start); setTimeout(start,700); } else { setTimeout(start,200); }
  setTimeout(lift,2200); // never trap anyone behind it
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
  // None of these are set, because nobody has set them: they are Gino's numbers,
  // not ours to guess. The rate desk at ?internal=1 writes them into this
  // browser, and the moment one is filled the quote prices it instead of
  // sending it to scope. Nothing here ever ships a made-up price to a client.
  var RATES={
    install_per_machine:null,          // AUD ex GST, per machine, install and commission
    maintenance_per_machine_year:{standard:null, priority:null},
    delivery_inland:null,              // AUD ex GST, flat, beyond 100 km of a port
    cost:{}                            // what WE pay, per machine id. Internal only.
  };
  var GST=0.10;

  // The rates a person typed beat the nulls above. One key, one browser, no server.
  var DESK='wr-rates-v1';
  function desk(){ try{ return JSON.parse(localStorage.getItem(DESK)||'{}'); }catch(e){ return {}; } }
  function deskSet(k,v){ var d=desk(); if(v===''||v==null||isNaN(v)) delete d[k]; else d[k]=+v; try{ localStorage.setItem(DESK,JSON.stringify(d)); }catch(e){} }
  // A rate is a number or null. Null means unknown, and unknown is not zero.
  function rateOf(k,fallback){ var d=desk(); return Object.prototype.hasOwnProperty.call(d,k)?d[k]:(fallback==null?null:fallback); }

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
      var r=rateOf('sell.install',RATES.install_per_machine);
      if(r==null){open.push('installation'); lines.push(line('Installation and commissioning',count+(count===1?' machine':' machines')+', by Wonder',null));}
      else{sub+=r*count; lines.push(line('Installation and commissioning',count+' \u00d7 '+money.format(r),r*count));}
    }
    if(count>0&&!noPlan){
      var mr=rateOf('sell.maint.'+v.plan,RATES.maintenance_per_machine_year[v.plan]);
      var label=(v.plan==='priority'?'Priority':'Standard')+' maintenance';
      var sub2=count+(count===1?' machine':' machines')+', '+v.term+(v.term===1?' year':' years');
      if(mr==null){open.push('maintenance'); lines.push(line(label,sub2,null));}
      else{var mt=mr*count*v.term; sub+=mt; lines.push(line(label,sub2+', '+money.format(mr)+' a machine a year',mt));}
    }
    if(count>0){
      if(v.site==='port'){lines.push(line('Delivery','Within 100 km of a port, included',0));}
      else{var dr=rateOf('sell.delivery',RATES.delivery_inland); if(dr==null){open.push('delivery'); lines.push(line('Delivery','Beyond 100 km of a port',null));} else{sub+=dr; lines.push(line('Delivery','Beyond 100 km of a port',dr));}}
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
    if(PANEL) margin(v,count,sub);
  }

  /* ── The rate desk. Internal, and only at ?internal=1 ──────────────────────
     The public quote can only ever price what it knows, so three lines have sat
     on scope since this page was built. This is where they get set, along with
     what each machine actually costs us, and it is the only place cost and
     margin are ever drawn. It is built by script and only when asked for, so a
     client reading over a shoulder is not one keystroke away from our margin.
     Nothing leaves the browser. */
  var PANEL=/[?&]internal=1/.test(location.search)||location.hash==='#internal';
  var SELL=[
    {k:'sell.install',  label:'Installation and commissioning', sub:'a machine'},
    {k:'sell.maint.standard', label:'Standard maintenance', sub:'a machine a year'},
    {k:'sell.maint.priority', label:'Priority maintenance', sub:'a machine a year'},
    {k:'sell.delivery', label:'Delivery beyond 100 km of a port', sub:'flat'}
  ];
  var COST=[
    {k:'cost.install',  label:'Installation and commissioning', sub:'a machine, our cost'},
    {k:'cost.maint.standard', label:'Standard maintenance', sub:'a machine a year, our cost'},
    {k:'cost.maint.priority', label:'Priority maintenance', sub:'a machine a year, our cost'},
    {k:'cost.delivery', label:'Delivery beyond 100 km of a port', sub:'flat, our cost'}
  ];

  function deskField(r){
    var v=rateOf(r.k,null);
    return '<tr><th>'+r.label+'<small>'+r.sub+'</small></th>'+
      '<td><input class="qi-in" type="number" min="0" step="100" inputmode="numeric" data-k="'+r.k+
      '" value="'+(v==null?'':v)+'" placeholder="not set" aria-label="'+r.label+', '+r.sub+'"></td></tr>';
  }

  function buildPanel(){
    var box=document.createElement('section');
    box.className='qint'; box.id='qint';
    var h=['<div class="top label"><span><b>Rate desk</b></span><span>Internal &middot; this browser only</span></div>',
      '<p class="qi-note">Nothing here is on the public page and nothing is sent anywhere. Fill a rate and the ',
      'quote stops saying <b>on scope</b> and prices it. Leave one blank and it stays honest about not knowing.</p>',
      '<div class="qi-cols">',
      '<div><p class="label">What we charge</p><table class="lines"><tbody>'];
    SELL.forEach(function(r){ h.push(deskField(r)); });
    h.push('</tbody></table></div>');
    h.push('<div><p class="label">What it costs us</p><table class="lines"><tbody>');
    COST.forEach(function(r){ h.push(deskField(r)); });
    h.push('</tbody></table></div>');
    h.push('</div>');
    h.push('<p class="label qi-sub">What each machine costs us, against the list price</p>');
    h.push('<table class="lines"><tbody>');
    MACHINES.forEach(function(m){
      var v=rateOf('cost.m.'+m.id,null);
      h.push('<tr><th>'+m.name+'<small>'+m.model+', list '+money.format(m.price)+'</small></th>'+
        '<td><input class="qi-in" type="number" min="0" step="500" inputmode="numeric" data-k="cost.m.'+m.id+
        '" value="'+(v==null?'':v)+'" placeholder="not set" aria-label="Our cost for '+m.name+', '+m.model+'"></td></tr>');
    });
    h.push('</tbody></table>');
    h.push('<p class="label qi-sub">The check</p>');
    h.push('<table class="lines"><tbody><tr><th>Target multiple<small>on our cost. Set it, we are not guessing it</small></th>'+
      '<td><input class="qi-in" type="number" min="1" step="0.05" inputmode="decimal" data-k="target" value="'+
      (rateOf('target',null)==null?'':rateOf('target',null))+'" placeholder="not set" aria-label="Target multiple"></td></tr></tbody></table>');
    h.push('<div id="qi-out"></div>');
    h.push('<p class="qi-note"><button type="button" class="qi-clear">Clear the desk</button> Wipes every number above from this browser.</p>');
    box.innerHTML=h.join('');
    form.parentNode.insertBefore(box, form.nextSibling);
    box.addEventListener('input',function(e){
      var i=e.target.closest('.qi-in'); if(!i) return;
      deskSet(i.getAttribute('data-k'), i.value===''?'':parseFloat(i.value));
      render();
    });
    box.querySelector('.qi-clear').addEventListener('click',function(){
      try{ localStorage.removeItem(DESK); }catch(e){}
      box.remove(); buildPanel(); render();
    });
  }

  /* Cost is only knowable when every part of it is known. A missing number is
     not a zero, so say which one is missing rather than print a flattering
     margin built on a blank. */
  function margin(v,count,sub){
    var out=el('qi-out'); if(!out) return;
    var cost=0, missing=[];
    MACHINES.forEach(function(m){
      var n=qty[m.id]; if(!n) return;
      var c=rateOf('cost.m.'+m.id,null);
      if(c==null) missing.push(m.name+', '+m.model); else cost+=c*n;
    });
    if(count>0&&v.install==='full'){
      var ic=rateOf('cost.install',null);
      if(ic==null) missing.push('installation'); else cost+=ic*count;
    }
    if(count>0&&v.plan!=='none'){
      var mc=rateOf('cost.maint.'+v.plan,null);
      if(mc==null) missing.push(v.plan+' maintenance'); else cost+=mc*count*v.term;
    }
    if(count>0&&v.site!=='port'){
      var dc=rateOf('cost.delivery',null);
      if(dc==null) missing.push('delivery'); else cost+=dc;
    }

    if(!count){ out.innerHTML='<p class="qi-note">Add a machine and the margin lands here.</p>'; return; }
    if(missing.length){
      out.innerHTML='<p class="qi-warn">No margin yet. Still missing a cost for '+missing.join(', ')+'.</p>';
      return;
    }
    var m=sub-cost, gm=sub>0?m/sub:0, mult=cost>0?sub/cost:0;
    var t=rateOf('target',null), verdict;
    if(t==null||t<=0){
      verdict='<p class="qi-note">Set a target multiple and this line will tell you whether the quote clears it.</p>';
    } else if(mult>=t){
      verdict='<p class="qi-ok">'+mult.toFixed(2)+'x against a target of '+(+t).toFixed(2)+'x. That clears it.</p>';
    } else {
      verdict='<p class="qi-warn">'+mult.toFixed(2)+'x against a target of '+(+t).toFixed(2)+'x. '+
        money.format(cost*t-sub)+' short, which is '+money.format((cost*t-sub)/count)+' a machine.</p>';
    }
    out.innerHTML='<table class="lines sums"><tbody>'+
      '<tr><th class="label">Quoted ex GST</th><td>'+money.format(sub)+'</td></tr>'+
      '<tr><th class="label">Our cost</th><td>'+money.format(cost)+'</td></tr>'+
      '<tr class="tot"><th class="label">Margin</th><td>'+money.format(m)+' &middot; '+Math.round(gm*100)+'%</td></tr>'+
      '</tbody></table>'+verdict;
  }

  form.addEventListener('input',render);
  form.addEventListener('change',render);
  el('q-print').addEventListener('click',function(e){e.preventDefault();window.print();});
  if(PANEL) buildPanel();
  qty.noo=1; qty.fry=1;
  render();
})();

(function(){
  // honour reduced motion for the hero: pause and show the still
  var vid=document.querySelector('.hero-video'); if(!vid) return;
  if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches){ try{vid.pause();}catch(e){} vid.removeAttribute('autoplay'); }
})();

/* Motion. The references move: coffee-tech reveals on scroll, fauna runs
   ScrollTrigger. This is the same behaviour without a library: things rise in
   as they enter, images drift inside their frames, the hero types itself in.
   Everything is off under prefers-reduced-motion. */
(function(){
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root=document.documentElement;
  if(reduce||!('IntersectionObserver' in window)){root.classList.add('no-motion');return;}
  root.classList.add('motion');

  /* rise in, staggered by position within the group */
  var rise=document.querySelectorAll('[data-rise]');
  if(rise.length){
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(!e.isIntersecting) return;
        var el=e.target, i=+el.dataset.i||0;
        el.style.transitionDelay=(i*70)+'ms';
        el.classList.add('is-in');
        io.unobserve(el);
      });
    },{rootMargin:'0px 0px -12% 0px',threshold:0.08});
    Array.prototype.forEach.call(rise,function(el){
      var group=el.parentElement?el.parentElement.querySelectorAll(':scope > [data-rise]'):[el];
      el.dataset.i=Math.min(Array.prototype.indexOf.call(group,el),5);
      io.observe(el);
    });
  }

  /* images drift inside their frames while the frame crosses the viewport */
  var floats=document.querySelectorAll('[data-float] img, [data-float] video');
  var hero=document.querySelector('.pop .bg');
  var ticking=false;
  function frame(){
    ticking=false;
    var vh=window.innerHeight;
    Array.prototype.forEach.call(floats,function(m){
      var box=m.parentElement.getBoundingClientRect();
      if(box.bottom<-200||box.top>vh+200) return;
      var p=(box.top+box.height/2-vh/2)/vh;      /* -1 above, 0 centred, 1 below */
      m.style.transform='translate3d(0,'+(p*-5).toFixed(2)+'%,0) scale(1.1)';
    });
    if(hero){
      var y=window.scrollY;
      if(y<window.innerHeight*1.2) hero.style.transform='translate3d(0,'+(y*0.18).toFixed(1)+'px,0) scale(1.06)';
    }
  }
  function onScroll(){ if(!ticking){ticking=true;requestAnimationFrame(frame);} }
  addEventListener('scroll',onScroll,{passive:true});
  addEventListener('resize',onScroll);
  frame();

  /* the hero heading arrives line by line */
  var h1=document.querySelector('.pop h1');
  if(h1&&!h1.dataset.split){
    h1.dataset.split='1';
    var lines=h1.innerHTML.split(/<br\s*\/?>/i);
    h1.innerHTML=lines.map(function(l,i){
      return '<span class="ln"><span style="transition-delay:'+(120+i*90)+'ms">'+l+'</span></span>';
    }).join('');
    requestAnimationFrame(function(){requestAnimationFrame(function(){h1.classList.add('is-in');});});
  }
})();
