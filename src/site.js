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

