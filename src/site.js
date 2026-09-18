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
  // How it is sold (the Wonder Byte partner package, September 2026): no
  // machine on its own. Every sale is the equipment, installed, and a monthly
  // service for at least 24 months that carries the design, the software, the
  // maintenance and the support. The installed price is the equipment
  // delivered, positioned and commissioned, in AUD ex GST. How that price is
  // built stays in the partner document and never reaches a page.
  // Every picture is our own: a studio render of that machine, or our
  // photograph of it running downstairs. No maker collages.
  var MACHINES=[
    {id:'bpro', name:'Coffee barista',   model:'B Pro, bar type',          kit:'Dual arm, Eversys, BTB Z02 ice, Yingmei cup printer', price:92000, img:'{{root}}img/offer/coffee-bar-studio.jpg'},
    {id:'bstd', name:'Coffee barista',   model:'B Standard, bar type',     kit:'Dual arm, Dr.Coffee F3, ice, cup printer', price:61640,  img:'{{root}}img/machines/coffee-robot-light.jpg'},
    {id:'eff',  name:'Coffee robot',     model:'Smart EFF, vending format', kit:'Dual arm, Dr.Coffee F200, BTB Z06 ice, 3 syrups, milk frother, printer', price:68080, img:'{{root}}img/machines/coffee-robot-d1.jpg'},
    {id:'bar',  name:'Robot bartender',  model:'T Standard',               kit:'Dobot arm, BTB Z02 ice, 3 syrup channels', price:35880, img:'{{root}}img/offer/robot-bar-studio.jpg'},
    {id:'ice',  name:'Ice cream robot',  model:'I Pro',                    kit:'Pasteurising machine, 3 syrups, 2 toppings', price:37720, img:'{{root}}img/tile-kiosk.jpg'},
    {id:'fry',  name:'Deep frying robot',model:'F Standard',               kit:'Dobot arm, 6 frying stoves', price:38640, img:'{{root}}img/tile-arm.jpg'},
    {id:'noo',  name:'Noodle robot',     model:'N Standard',               kit:'Dobot arm, 6 noodle stoves', price:47840, img:'{{root}}img/valley-baths.jpg'}
  ];

  // Accessories beyond the listed configuration. They are priced with the
  // supplier when ordered, so the quote carries them as a line to confirm
  // and never guesses a number.
  var PARTS=[
    {id:'icem', name:'Ice maker',                     sub:'BTB Z02. A second, or one on a line with none',
     img:'{{root}}img/coffee/bar-06-service-front.jpg', alt:'The bar with its doors open, the ice maker and services inside'},
    {id:'prnt', name:'Chocolate and caramel printer',  sub:'Yingmei. Your mark on the crema or the foam',
     img:'{{root}}img/machines/coffee-robot-d2.jpg', alt:'Milk poured into a cup, the pattern forming on the crema'},
    {id:'milk', name:'Extra milk line',                sub:'A second milk, oat or soy',
     img:'{{root}}img/machines/coffee-hero.jpg', alt:'A dual arm at the machine with the milk jug in hand'},
    {id:'syr',  name:'Extra syrup channels',           sub:'Three more, beyond the three supplied',
     img:'{{root}}img/machines/coffee-robot-d3.jpg', alt:'The machine head, grinder and syrup lines'}
  ];

  // The monthly service. The first kitchen workstation carries the venue:
  // the design, the ordering, the platform. Each machine after it shares
  // those, so it adds half. A delivery or reception robot in a kitchen adds
  // less again. On its own, a service robot has a narrower package.
  var SERVICE={first:2000, extra:1000, robot:500};
  var TERM=24;
  // After the term: keep the managed service, or call us when needed.
  var AFTER={first:600, extra:250, hourly:180, minHours:2};

  // What the service includes, in the order the job happens.
  var INCLUDED=[
    {id:'brand', name:'Robots and screen in your brand', sub:'Workflow and layout, your colours and graphics on the robots, the ordering screen', img:'{{root}}img/coffee/bar-01-sketch.jpg', kitchen:true},
    {id:'inst',  name:'Install and integrate',     sub:'Positioned, configured, networked, orders routed, one payment system', img:'{{root}}img/process/04-commission.jpg'},
    {id:'hand',  name:'Handover and training',     sub:'Commissioning tests, two training sessions, guides, your champions',  img:'{{root}}img/lrd/menu.jpg'},
    {id:'care',  name:'Maintained for 24 months',  sub:'Monitoring, updates, quarterly checks, six-monthly service, covered repairs', img:'{{root}}img/hero-kitchen.jpg'},
    {id:'help',  name:'Technical support',         sub:'8am to 6pm weekdays, Brisbane time',                                 img:'{{root}}img/coffee/bar-05-services.jpg'}
  ];

  // The studio work: what we design and build around the machines, priced
  // once. Research, 17 Sep 2026: a Brisbane studio identity runs $5,000 to
  // $8,000 and more before packaging and signage; a cafe website with ordering
  // $3,000 to $6,000 freelance, $10,000 and up from an agency; vinyl on a
  // machine about $530 before design and fitting on curved arms; counter
  // joinery $2,000 to $8,000 before services and drawings; extraction for a
  // small kitchen $8,000 to $15,000 installed; design of a small cafe, concept and
  // documentation, $8,000 to $15,000 in Brisbane, about 80 hours at $180. A second machine shares the
  // counter and the drawings, so it adds less. Indicative until we have seen
  // the site, and confirmed in writing.
  // Then the service options, from the partner package: monthly ones join
  // the service, one-off ones are paid once.
  // kitchen: only offered with a kitchen workstation. cook: only with a
  // frying or noodle robot. each: added for every workstation after the first.
  var OPTIONS=[
    {id:'space',    group:'studio', name:'Space design',            sub:'The room drawn around the machines: layout, finishes, lighting, joinery, renders', per:'once', price:14500,
     img:'{{root}}img/coffee/venue-02-entry.jpg', alt:'The cafe seen from the street door'},
    {id:'identity', group:'studio', name:'Brand identity',          sub:'A brand made for you: the mark, colours, cups, bags, menu, signage, uniforms', per:'once', price:8500,
     img:'{{root}}img/coffee/brand-01-family.jpg', alt:'Cups and bags carrying the mark, the whole family together'},
    {id:'web',      group:'studio', name:'Website',                 sub:'Designed and built in the brand, with the menu and ordering',          per:'once', price:6500,
     img:'{{root}}img/offer/website.jpg', alt:'Our website on a laptop screen and a phone'},
    {id:'wrap',     group:'studio', name:'Branding on the machine', sub:'Your colours on the arms and the body, fitted before it leaves us',   per:'once', price:1800, each:1800, kitchen:true,
     img:'{{root}}img/coffee/bar-02-front.jpg', alt:'Two robot arms finished in the brand colours on a timber bar'},
    {id:'fitout',   group:'studio', name:'Counter and services',    sub:'The counter or cell, power, water and drainage, built to our drawings', per:'once', price:18000, each:9000, kitchen:true,
     img:'{{root}}img/process/03-fitout.jpg', alt:'The line going in: bare stainless benches, a fitter at work'},
    {id:'extract',  group:'studio', name:'Extraction',              sub:'The hood and ducting over the frying and noodle stoves',             per:'once', price:12000, cook:true,
     img:'{{root}}img/tile-arm.jpg', alt:'The frying arm under its hood'},
    {id:'ext',      group:'care',   name:'Extended-hours support',  sub:'Remote support beyond weekday hours, on hours we agree',               per:'month', price:500,
     img:'{{root}}img/hero-kitchen.jpg', alt:'The robot kitchen running at night'},
    {id:'pos',      group:'care',   name:'Another POS or payment system', sub:'Connected as well as the one included',                       per:'once', price:2000,
     img:'{{root}}img/lrd/menu.jpg', alt:'The ordering screen with the menu on it'},
    {id:'round',    group:'care',   name:'An extra design round',   sub:'A third round of revisions',                                          per:'once', price:500,
     img:'{{root}}img/coffee/brand-01-family.jpg', alt:'The pack family'},
    {id:'train',    group:'care',   name:'An extra training session', sub:'Up to two hours, for a new shift or a new team',                    per:'once', price:350,
     img:'{{root}}img/process/04-commission.jpg', alt:'Technicians on the finished line for the training'}
  ];
  // What an option costs on this quote, or null when it does not apply.
  function optionAmount(o,count,cooks){
    if(o.kitchen&&!count) return null;
    if(o.cook&&!cooks) return null;
    return o.price+(o.each?o.each*Math.max(0,count-1):0);
  }
  // The studio work every ready-made package includes.
  var STUDIO=['space','identity','web','wrap','fitout','extract'];

  // How a buyer thinks about the machines: one robot, then which model of it,
  // then the accessories that fit that robot and no other.
  var FAMILIES=[
    {id:'coffee',   name:'Coffee robot',      line:'A barista in about two square metres, in your brand.', models:['bpro','bstd','eff'], parts:['icem','prnt','milk','syr'], img:'{{root}}img/offer/coffee-bar-studio.jpg'},
    {id:'cocktail', name:'Robot bartender',   line:'An arm under a rack of your bottles, the same measure every time.', models:['bar'], parts:['icem','syr'], img:'{{root}}img/offer/robot-bar-studio.jpg'},
    {id:'icecream', name:'Ice cream robot',   line:'Pasteurised soft serve, and an arm that hands the cone over.', models:['ice'], parts:['syr'], img:'{{root}}img/tile-kiosk.jpg'},
    {id:'fryer',    name:'Deep frying robot', line:'Six fryers: basket in, timed, lifted, drained.', models:['fry'], parts:[], img:'{{root}}img/tile-arm.jpg'},
    {id:'noodle',   name:'Noodle robot',      line:'Six noodle stoves, cooked to the order.', models:['noo'], parts:[], img:'{{root}}img/valley-baths.jpg'}
  ];
  // The showroom robots, written in from the catalogue at build time. The
  // two service robots sold in a package carry a price; the rest are priced
  // to order and never move the total.
  var ROBOTS=/*{{robots}}*/[];
  var ROBOT_PRICES={
    'ubtech-cadebot': {price:5400,  alone:275, after:100, role:'Carries orders to the table'},
    'ubtech-cruzr-1s':{price:16200, alone:500, after:250, role:'Greets and guides guests'}
  };
  ROBOTS.forEach(function(r){ var p=ROBOT_PRICES[r.id]; if(p){ r.price=p.price; r.alone=p.alone; r.after=p.after; r.role=p.role; } });
  var GST=0.10;

  // Ways to pay. The monthly budget is the equipment spread over the term
  // plus the service, before GST and finance charges. Equipment can be paid
  // on order or financed through a partner lender; the service is billed by
  // us and is not financed. The finance range (research, 17 Sep 2026: small
  // business equipment loans from about 9% to the top of fintech ranges for
  // imported kit, 15%) is an illustration over the same 24 months, with the
  // downside shown beside the upside as ASIC's RG 234 asks.
  var PAY={finance:{low:0.09, high:0.15, months:TERM}};
  function monthly(principal,annual,months){
    var r=annual/12; if(!r) return principal/months;
    return principal*r/(1-Math.pow(1+r,-months));
  }
  function waysToPay(c){
    if(!c||!(c.count||c.robots)) return null;
    var m=PAY.finance.months, lo=monthly(c.installed,PAY.finance.low,m), hi=monthly(c.installed,PAY.finance.high,m);
    return {budget:{monthly:c.monthly, total:c.total, term:c.term},
            upfront:{amount:c.upfront, service:c.service},
            finance:{months:m, principal:c.installed, once:c.upfront-c.installed, low:Math.round(lo), high:Math.round(hi),
                     withLow:Math.round(lo+c.service), withHigh:Math.round(hi+c.service), rateLow:PAY.finance.low, rateHigh:PAY.finance.high}};
  }
  function payHtml(c,opts){
    var w=waysToPay(c); if(!w) return '';
    var money=new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',maximumFractionDigits:0});
    var f=w.finance, pc=function(x){ return Math.round(x*1000)/10+'%'; };
    var work=c.studio||c.once;
    return '<div class="pays-grid">'+
      '<article class="pay monthly"><span class="label">Your monthly budget</span><div class="pay-fig">'+money.format(w.budget.monthly)+'<small>a month</small></div>'+
        '<p>'+(work?'The equipment and the design and build':'The equipment')+' spread over '+w.budget.term+' months, plus the service. '+money.format(w.budget.total)+' over the term.</p></article>'+
      '<article class="pay"><span class="label">Paid upfront</span><div class="pay-fig">'+money.format(w.upfront.amount)+'<small>once</small></div>'+
        '<p>Then '+money.format(w.upfront.service)+' a month for '+w.budget.term+' months. '+(work?'The equipment and the design and build':'The equipment')+' paid in stages, on order and on commissioning.</p></article>'+
      '<article class="pay fin"><span class="label">Equipment financed</span><div class="pay-fig">'+money.format(f.withLow)+'<small>to</small>'+money.format(f.withHigh)+'<small>a month</small></div>'+
        '<p>The equipment through our finance partner, plus the service from us. We organise it.'+(f.once?' The design and build, '+money.format(f.once)+', is paid in stages.':'')+'</p>'+
        '<p class="pay-terms">Illustration only, not an offer of finance. Equipment of '+money.format(f.principal)+' ex GST at '+pc(f.rateLow)+' to '+pc(f.rateHigh)+' a year over '+f.months+' months is '+money.format(f.low)+' to '+money.format(f.high)+' a month, no deposit or balloon, fees excluded. Approval, rate, deposit and GST timing are the lender\u2019s. The service is not financed. Wonder Byte is not a lender or broker.</p>'+
        (opts&&opts.ask?'<a class="link" href="'+opts.ask+'">Ask us to organise it</a>':'')+'</article>'+
      '</div><p class="pays-fine">Ex GST. Every package has a '+w.budget.term+' month service term.</p>';
  }

  // The ready-made packages: combinations we would open with. Any other mix
  // is priced by the same rule.
  var PACKAGES=[
    {id:'bar', name:'The robot coffee bar', line:'A barista bar in your brand, fitted into the venue you have.',
     machines:{bpro:1}, opts:['space','identity','web','wrap','fitout'], img:'{{root}}img/offer/coffee-bar-studio.jpg', alt:'The dual-arm B Pro coffee bar on its counter',
     url:'{{root}}robot-coffee-bar-package/'},
    {id:'cafe', name:'The robot café', line:'Coffee and soft serve, the counter, the room and the brand across all of it.',
     machines:{bpro:1,ice:1}, opts:['space','identity','web','wrap','fitout'], img:'{{root}}img/coffee/venue-01-bar-in-room.jpg', alt:'A branded robot coffee bar in a venue, by the street door',
     url:'{{root}}robot-cafe-package/'},
    {id:'box', name:'The robot container kitchen', line:'A twenty foot container, an arm cooking behind glass, a skin that carries the brand.',
     machines:{fry:1,noo:1}, opts:['identity','web','wrap'], img:'{{root}}img/container/day.jpg', alt:'A branded shipping container kitchen at a market by day',
     extra:{name:'The container build', sub:'Twenty foot high-cube: cut, frame, line, hatch, extraction, the skin', note:'Priced on scope'},
     url:'{{root}}robot-container-kitchens/'}
  ];
  function packageQuote(pk){ return compute(stateFromQuery('?pkg='+pk.id)); }

  // What each part of a quote is: its stage in the job, one line on what it
  // is, what you get, and the facts that matter. Package pages, the quote
  // page and proposals all read this. Output is never promised: it is
  // measured on the buyer's menu when the machine is commissioned.
  var OUTPUT=['Output','Measured on your menu at commissioning'];
  var LEAD=['Lead time','About two months from order'];
  var DETAILS={
    bpro:{stage:'Equipment', lead:'Two arms at an Eversys machine: one pulls the shot, one steams and pours. The premium coffee robot.',
      gets:['Dual-arm barista, bar type','Eversys espresso machine','BTB Z02 ice maker','Yingmei cup printer','8 and 12 oz, hot and iced','Delivered, positioned, commissioned'],
      facts:[['Suits','Premium cafés, hotels, branded venues'],LEAD,OUTPUT]},
    bstd:{stage:'Equipment', lead:'The same two arms on a Dr.Coffee F3, at a lower entry cost than the B Pro.',
      gets:['Dual-arm barista, bar type','Dr.Coffee F3 espresso machine','Ice maker','Cup printer','8 and 12 oz, hot and iced','Delivered, positioned, commissioned'],
      facts:[['Suits','Cafés, hotel service areas, corporate hospitality'],LEAD,OUTPUT]},
    eff:{stage:'Equipment', lead:'Two arms in a vending format: the order goes in on the screen, and the coffee, ice and syrups are all inside.',
      gets:['Dual-arm vending format','Dr.Coffee F200','BTB Z06 ice maker','Three syrup channels','Milk frother and printing','Delivered, positioned, commissioned'],
      facts:[['Suits','Coffee kiosks, hotels, office lobbies, retail'],LEAD,OUTPUT]},
    bar:{stage:'Equipment', lead:'A Dobot arm under a rack of your bottles, pouring the same measure every time.',
      gets:['T Standard robot bartender','Dobot arm','BTB Z02 ice maker','Three syrup channels','Delivered, positioned, commissioned'],
      facts:[['Suits','Bars, hotels, entertainment venues, events'],['On our floor','365 St Pauls Terrace'],OUTPUT]},
    ice:{stage:'Equipment', lead:'A pasteurising soft-serve machine and a kiosk arm that hands the cone over. Ours runs the dessert kiosk downstairs.',
      gets:['I Pro ice cream robot','Pasteurising machine','Three syrups','Two toppings','Kiosk arm','Delivered, positioned, commissioned'],
      facts:[['Suits','Dessert shops, shopping centres, attractions'],['On our floor','365 St Pauls Terrace'],OUTPUT]},
    fry:{stage:'Equipment', lead:'A Dobot arm working six frying stoves: basket in, timed, lifted, drained, plated.',
      gets:['F Standard deep frying robot','Dobot arm','Six frying stoves','Delivered, positioned, commissioned'],
      facts:[['Suits','Quick service and commercial kitchens'],['On our floor','365 St Pauls Terrace'],OUTPUT]},
    noo:{stage:'Equipment', lead:'A Dobot arm over six noodle stoves, cooking to the order.',
      gets:['N Standard noodle robot','Dobot arm','Six noodle stoves','Delivered, positioned, commissioned'],
      facts:[['Suits','Noodle restaurants, food courts, restaurant groups'],['On our floor','365 St Pauls Terrace'],OUTPUT]},
    'ubtech-cadebot':{stage:'Equipment', lead:'Three open trays that carry orders from the pass to the table, mapped to your floor.',
      gets:['UBTECH CadeBot','Three trays, 40 kg','Mapped to your floor','Delivered and commissioned'],
      facts:[['Suits','Restaurants and hotels with indoor routes'],['Service','$500 a month in a kitchen package']]},
    'ubtech-cruzr-1s':{stage:'Equipment', lead:'A reception robot that greets, answers and guides guests, with your content on its screen.',
      gets:['UBTECH Cruzr 1S','Multilingual voice','Guided routes','Your content on the screen','Delivered and commissioned'],
      facts:[['Suits','Hotels, reception, visitor spaces'],['Service','$500 a month in a kitchen package']]},
    brand:{stage:'Design', lead:'The layout and workflow drawn for your venue, your colours and graphics on the robots, and the ordering screen in your brand.',
      gets:['Workflow and layout concept','Your colours on the robots','Robot graphics artwork','Branded ordering screen','Two rounds of revisions'],
      facts:[['In the service','Nothing extra to pay'],['Designed','In Fortitude Valley']]},
    inst:{stage:'Install', lead:'We position and configure the equipment, connect it to your network, set its sequences and route the orders to it.',
      gets:['Equipment positioned','Standard configuration','Network connection','Operating sequences','Order routing','One payment system connected'],
      facts:[['In the service','Nothing extra to pay'],['On site','Our technicians']]},
    hand:{stage:'Handover', lead:'Commissioning tests, then your people trained and named, so the venue owns the routine from the first day.',
      gets:['Commissioning tests','Two operator training sessions','Cleaning and fault guides','Named venue champions','An agreed acceptance checklist'],
      facts:[['Signed off','Against the checklist'],OUTPUT]},
    care:{stage:'Run', lead:'Watched remotely, updated, checked every quarter and serviced on site every six months, with covered repairs, parts and labour.',
      gets:['Remote monitoring and diagnostics','Software updates','Quarterly preventative checks','On-site service every six months','Covered repairs, parts and labour'],
      facts:[['Term','24 months'],['After that','From $600 a month, or on call']]},
    help:{stage:'Run', lead:'A person on the line from 8am to 6pm on weekdays, Brisbane time, and a technician on site when remote help is not enough.',
      gets:['Phone and remote diagnosis','Critical faults acknowledged within four business hours','Routine questions within one business day','On site within two business days in our local zone, as a target'],
      facts:[['Hours','8am to 6pm, Monday to Friday'],['Longer hours','$500 a month']]},
    space:{stage:'Design', lead:'The room drawn around the machines, so the robots, the queue and the people who work it all fit.',
      gets:['Layout and workflow','Finishes and materials','Lighting','Joinery and counter drawings','Renders of the room','Drawings a builder can price'],
      facts:[['Drawn','From your floor plan or our scan'],['Designed','In Fortitude Valley']]},
    identity:{stage:'Design', lead:'A brand, not a sticker. The mark and everything it goes on, drawn as one system across the machine and the room.',
      gets:['The mark and its lockups','Colours and type','Cups, bags and sacks','The menu','Signage','Uniforms'],
      facts:[['Worked example','Wonder Bean, Sol and Luna'],['Designed','In Fortitude Valley']]},
    web:{stage:'Design', lead:'The website in the same brand, with the menu on it and ordering one tap away.',
      gets:['Designed in the brand','Built and launched','The menu','Ordering','Your venue, hours and directions'],
      facts:[['Example','This site is one of ours'],['Designed','In Fortitude Valley']]},
    wrap:{stage:'Build', lead:'Your colours on the arms and the body, finished before it leaves us. The machine is the first thing in the brand people see.',
      gets:['Colours on the arms','The body finished in the brand','Your mark on the screen'],
      facts:[['Worked example','The Wonder Bean bar'],['Priced','For each machine']]},
    fitout:{stage:'Build', lead:'The counter or cell the machine lives in, with its power, water and drainage, built by our trades or yours to our drawings.',
      gets:['The counter or cell','Power, water and drainage','Guarding where it is needed','Joinery and stone','Built to our drawings'],
      facts:[['Indicative','Until we have seen the site'],['Walls, floors, lighting','Quoted from the space design']]},
    extract:{stage:'Build', lead:'The hood, ducting and fan over the frying and noodle stoves, drawn and installed to code.',
      gets:['Hood over the line','Ducting and fan','Drawings and sign-off'],
      facts:[['Indicative','Until we have seen the site'],['Needed','Wherever there is frying']]},
    ext:{stage:'Run', lead:'Remote support beyond weekday hours, on the evenings and weekends you trade.',
      gets:['Priority phone and remote diagnosis','Hours agreed in the quote'],
      facts:[['Price','$500 a month a venue'],['On site','As in the standard service']]}
  };
  var IMG_POS={'img/lrd/menu.jpg':'50% 18%','img/tile-kiosk.jpg':'50% 10%','img/hero-kitchen.jpg':'50% 60%','img/offer/website.jpg':'50% 50%'};

  // A ready-made package names itself when the machines are exactly its own,
  // or when it was chosen and its machines are all still there. The
  // container kitchen only when chosen, since it carries a build of its own.
  function packageFor(qty,pkgId){
    var mine=MACHINES.filter(function(m){return (qty[m.id]||0)>0;});
    if(!mine.length) return null;
    var covers=function(p){ return Object.keys(p.machines).every(function(k){return (qty[k]||0)>=p.machines[k];}); };
    var chosen=pkgId&&PACKAGES.filter(function(p){return p.id===pkgId;})[0];
    if(chosen&&covers(chosen)) return chosen;
    return PACKAGES.filter(function(p){ return !p.extra&&covers(p)&&mine.every(function(m){return (qty[m.id]||0)===(p.machines[m.id]||0);}); })[0]||null;
  }

  // The monthly service for a mix, and the words for how it was reached.
  function serviceFor(count,robotRows){
    var robots=robotRows.reduce(function(a,r){return a+r.n;},0);
    if(count>0) return {amount:SERVICE.first+SERVICE.extra*(count-1)+SERVICE.robot*robots, kitchen:true};
    return {amount:robotRows.reduce(function(a,r){return a+r.n*r.alone;},0), kitchen:false};
  }

  // The whole quote from a state, as numbers and lines, with no page in it.
  // The sheet, the quote page, the proposal and the build all read it.
  // state: {qty:{id:n}, parts:{id:bool}, opts:{id:bool}, pkg:id|null, site:'local'|'far'}
  function compute(st){
    var qty=st.qty||{}, parts=st.parts||{}, opts=st.opts||{}, site=st.site==='far'?'far':'local';
    var money=new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',maximumFractionDigits:0});
    var lines=[], count=0, installed=0, asks=0, robotRows=[], once=0, studio=0, monthlyOpts=0, scoped=false;
    MACHINES.forEach(function(m){ var n=qty[m.id]||0; if(!n) return;
      count+=n; installed+=n*m.price;
      lines.push({id:m.id,kind:'machine',n:n,label:m.name+', '+m.model,name:m.name,model:m.model,sub:n+' × '+money.format(m.price)+', installed',value:n*m.price,img:m.img}); });
    ROBOTS.forEach(function(r){ var n=qty[r.id]||0; if(!n) return;
      if(r.price){
        robotRows.push({n:n,alone:r.alone,after:r.after}); installed+=n*r.price;
        lines.push({id:r.id,kind:'robot',n:n,label:r.name,name:r.name,model:r.kind,status:r.status,sub:n+' × '+money.format(r.price)+', installed',value:n*r.price,img:r.img});
      }else{
        asks+=n; scoped=true;
        lines.push({id:r.id,kind:'robot',n:n,label:r.name,name:r.name,model:r.kind,status:r.status,sub:n+' × '+r.kind+', priced to order',value:null,note:'Priced to order',img:r.img});
      } });
    var robots=robotRows.reduce(function(a,r){return a+r.n;},0);
    PARTS.forEach(function(p){ if(!parts[p.id]) return; scoped=true;
      lines.push({id:p.id,kind:'part',label:p.name,name:p.name,sub:p.sub,value:null,note:'Priced on order',img:p.img}); });
    var sv=serviceFor(count,robotRows), open=count+robots>0;
    if(open){
      var how=sv.kitchen?['First workstation '+money.format(SERVICE.first)].concat(count>1?[(count-1)+' more at '+money.format(SERVICE.extra)]:[]).concat(robots?[robots+(robots===1?' robot':' robots')+' at '+money.format(SERVICE.robot)]:[]).join(', ')
                        :'Service robot package';
      lines.push({id:'service',kind:'service',label:'The service, '+TERM+' months',name:'The service',sub:how,value:sv.amount,per:'month',img:'{{root}}img/hero-kitchen.jpg'});
      INCLUDED.forEach(function(x){ if(x.kitchen&&!sv.kitchen) return;
        lines.push({id:x.id,kind:'included',label:x.name,name:x.name,sub:x.sub,value:0,img:x.img}); });
    }
    var cooks=(qty.fry||0)+(qty.noo||0);
    OPTIONS.forEach(function(o){ if(!opts[o.id]||!open) return;
      var amt=optionAmount(o,count,cooks); if(amt===null) return;
      if(o.per==='month') monthlyOpts+=amt; else if(o.group==='studio') studio+=amt; else once+=amt;
      lines.push({id:o.id,kind:'option',group:o.group,label:o.name,name:o.name,sub:o.sub,value:amt,per:o.per,img:o.img}); });
    var pk=packageFor(qty,st.pkg);
    if(pk&&pk.extra){ scoped=true; lines.push({id:'extra',kind:'extra',label:pk.extra.name,name:pk.extra.name,sub:pk.extra.sub,value:null,note:pk.extra.note,img:pk.img}); }
    if(open){
      if(site==='local') lines.push({id:'delivery',kind:'delivery',label:'Delivery',name:'Delivery',sub:'Within 100 km of a port, included',value:0});
      else{ scoped=true; lines.push({id:'delivery',kind:'delivery',label:'Delivery and travel',name:'Delivery and travel',sub:'Beyond 100 km of a port or our local service zone',value:null,note:'Quoted'}); }
    }
    // Everything paid once (the equipment, the studio work, one-off options)
    // spread over the term, plus the service, is the monthly budget.
    var service=sv.amount+monthlyOpts, upfront=installed+studio+once;
    var total=upfront+service*TERM;
    var mon=open?Math.round(upfront/TERM+service):0;
    var afterAmt=count>0?AFTER.first+AFTER.extra*(count-1+robots):robotRows.reduce(function(a,r){return a+r.n*r.after;},0);
    var gst=Math.round(total*GST);
    return {lines:lines,count:count,robots:robots,asks:asks,installed:installed,studio:studio,once:once,upfront:upfront,base:sv.amount,service:service,term:TERM,
            total:total,monthly:mon,gst:gst,inc:total+gst,scoped:scoped,pkg:pk,site:site,
            after:open?{monthly:afterAmt,hourly:AFTER.hourly,minHours:AFTER.minHours}:null,
            next:sv.kitchen?SERVICE.extra:null};
  }

  // A quote's name in words: "Two coffee baristas and an ice cream robot".
  // Machines are common nouns; showroom robots keep their proper names.
  function titleOf(lines){
    var nums=['','one','two','three','four','five','six','seven','eight','nine','ten'];
    var bits=lines.filter(function(l){return l.kind==='machine'||l.kind==='robot';}).map(function(l){
      if(l.kind==='robot') return (l.n>1?(nums[l.n]||l.n)+' ':'a ')+l.name+(l.n>1?'s':'');
      var noun=l.name.charAt(0).toLowerCase()+l.name.slice(1);
      if(l.n>1) return (nums[l.n]||l.n)+' '+noun+'s';
      return (/^[aeiou]/.test(noun)?'an ':'a ')+noun;
    });
    var t=bits.length<2?(bits[0]||''):bits.slice(0,-1).join(', ')+' and '+bits[bits.length-1];
    return t.charAt(0).toUpperCase()+t.slice(1);
  }

  // A quote as a URL and back, so a quote can be a link: the full quote page,
  // the proposal, an email. Unknown ids are ignored, numbers are clamped, and
  // links sent before the service model still open on the nearest thing.
  var ALIAS={eng:'fitout',brand:'identity'};
  function stateFromQuery(search){
    var get=function(k){ var m=(search||'').match(new RegExp('[?&]'+k+'=([^&]*)')); return m?decodeURIComponent(m[1]):''; };
    var st={qty:{},parts:{},opts:{},pkg:null,site:'local',who:get('for').slice(0,80),by:get('by').slice(0,60)};
    var pk=PACKAGES.filter(function(x){return x.id===get('pkg');})[0];
    // a package link fills in the package; once there is a pick, the pick is
    // the quote and the package only names it, so a removed line stays removed
    var pp=parsePick(get('pick'));
    if(pk){ st.pkg=pk.id; if(!get('pick')){ Object.keys(pk.machines).forEach(function(m){ st.qty[m]=pk.machines[m]; }); (pk.opts||[]).forEach(function(o){ st.opts[o]=true; }); } }
    Object.keys(pp.qty).forEach(function(id){ st.qty[id]=pp.qty[id]; });
    Object.keys(pp.parts).forEach(function(id){ st.parts[id]=true; });
    Object.keys(pp.opts).forEach(function(id){ st.opts[id]=true; });
    if(get('site')==='far') st.site='far';
    return st;
  }
  function toQuery(st){
    var pick=[];
    Object.keys(st.qty||{}).forEach(function(id){ var n=st.qty[id]; if(n>0) pick.push(n>1?id+':'+n:id); });
    Object.keys(st.parts||{}).forEach(function(id){ if(st.parts[id]) pick.push(id); });
    Object.keys(st.opts||{}).forEach(function(id){ if(st.opts[id]) pick.push(id); });
    var q=[]; if(pick.length) q.push('pick='+pick.join(','));
    if(st.pkg) q.push('pkg='+st.pkg);
    if(st.site==='far') q.push('site=far');
    if(st.who) q.push('for='+encodeURIComponent(st.who));
    if(st.by) q.push('by='+encodeURIComponent(st.by));
    return q.length?'?'+q.join('&'):'';
  }

  // ?pick=bpro:2,prnt,ext  ->  {qty:{bpro:2}, parts:{prnt:true}, opts:{ext:true}}
  function parsePick(str){
    var out={qty:{},parts:{},opts:{}}; if(!str) return out;
    decodeURIComponent(str).split(',').forEach(function(tok){
      var kv=tok.split(':'), id=ALIAS[kv[0]]||kv[0], n=Math.max(1,Math.min(20,parseInt(kv[1],10)||1));
      if(MACHINES.some(function(m){return m.id===id;})||ROBOTS.some(function(r){return r.id===id;})) out.qty[id]=n;
      else if(PARTS.some(function(p){return p.id===id;})) out.parts[id]=true;
      else if(OPTIONS.some(function(o){return o.id===id;})) out.opts[id]=true;
    });
    return out;
  }
  // ---- words for a computed quote, shared by the quote page, the proposal
  // and the package pages the build writes, so they can never disagree.
  var fmt=new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',maximumFractionDigits:0});
  function parts(c){
    return {picked:c.lines.filter(function(l){return l.kind==='machine'||l.kind==='robot';}),
            parts:c.lines.filter(function(l){return l.kind!=='included'&&!(l.kind==='delivery'&&l.value!==null);})};
  }
  function valueText(l){
    if(l.value===null) return l.note||'On request';
    if(l.value===0) return 'Included';
    return fmt.format(l.value)+(l.per==='month'?' a month':'');
  }
  function valueNote(l){
    if(l.value===null) return 'To confirm';
    if(l.kind==='machine'||l.kind==='robot') return 'Installed, ex GST';
    if(l.kind==='service') return 'For '+TERM+' months, ex GST';
    if(l.group==='studio') return 'Once, indicative, ex GST';
    if(l.per==='once') return 'Once, ex GST';
    return 'Ex GST';
  }
  function detailFor(l,c){
    if(l.kind==='service'){
      var inc=c.lines.filter(function(x){return x.kind==='included';});
      return {stage:'Run',
        lead:c.count?'One monthly fee runs the venue for '+TERM+' months: the robots and the ordering screen in your brand, install and training, maintenance and support. Each machine after the first adds '+fmt.format(SERVICE.extra)+', not '+fmt.format(SERVICE.first)+'.'
                    :'One monthly fee for '+TERM+' months: install and training, maintenance and support for the robot.',
        gets:inc.map(function(x){return x.name;}),
        facts:[['Support','8am to 6pm weekdays, Brisbane time'],['Covered repairs','Parts and labour, '+TERM+' months'],['After that',c.after?'From '+fmt.format(c.after.monthly)+' a month, or on call':'Managed, or on call']]};
    }
    if(DETAILS[l.id]) return DETAILS[l.id];
    if(l.kind==='robot') return {stage:'Equipment', lead:l.status+'. '+l.model+', priced to order.'};
    if(l.kind==='extra') return {stage:'Build', lead:l.sub+'.'};
    return {stage:'Equipment', lead:l.sub+'.'};
  }
  function summaryLine(c){
    if(!c.monthly) return 'Showroom robots are priced to order. We will come back to you with the quote.';
    return 'The equipment installed'+(c.studio?', the design and build around it,':'')+' and the service that runs it for '+TERM+' months: install, training, maintenance and support.'+
      (c.scoped?' Anything marked to confirm is priced once we have the site.':'')+(c.asks?' Showroom robots are priced to order.':'');
  }
  function sumsHtml(c,doc){
    if(!c.monthly) return '';
    var r='<dt>Equipment, installed</dt><dd>'+fmt.format(c.installed)+'</dd>';
    if(c.studio) r+='<dt>Design and build, indicative</dt><dd>'+fmt.format(c.studio)+'</dd>';
    if(c.once) r+='<dt>Options, once</dt><dd>'+fmt.format(c.once)+'</dd>';
    if(c.studio||c.once) r+='<dt>Paid upfront</dt><dd>'+fmt.format(c.upfront)+'</dd>';
    r+='<dt>The service</dt><dd>'+fmt.format(c.service)+' a month</dd>';
    r+='<dt>Over '+TERM+' months, ex GST</dt><dd>'+fmt.format(c.total)+'</dd><dt>GST 10%</dt><dd>'+fmt.format(c.gst)+'</dd>';
    r+='<dt'+(doc?' class="tot"':'')+'>Over '+TERM+' months, inc GST</dt><dd'+(doc?' class="tot"':'')+'>'+fmt.format(c.inc)+'</dd>';
    return r;
  }
  // [title, detail, the same as one sentence]
  function termsList(c,until){
    var t=[c.site==='far'?['Equipment installed','Delivery and travel beyond 100 km of a port quoted','Equipment installed, ex GST, with delivery and travel beyond 100 km of an Australian port quoted for your site']
                         :['Equipment installed','Delivered within 100 km of a port, positioned, commissioned','Equipment installed, ex GST, delivered within 100 km of an Australian port']];
    if(c.studio) t.push(['Design and build indicative','Confirmed once we have seen the site','Design and build indicative, confirmed once we have seen the site']);
    t.push(['A '+TERM+' month service','Maintenance and support included','A '+TERM+' month service term, billed monthly, maintenance and support included']);
    t.push(['Support','8am to 6pm weekdays, Brisbane time','Support from 8am to 6pm, Monday to Friday, Brisbane time']);
    if(c.after) t.push(['After '+TERM+' months','Managed from '+fmt.format(c.after.monthly)+' a month, or on call','After '+TERM+' months, a managed service from '+fmt.format(c.after.monthly)+' a month, or on call at '+fmt.format(AFTER.hourly)+' an hour, two hours minimum']);
    t.push(['Valid 30 days','Until '+until,'Valid 30 days, until '+until]);
    t.push(['12 month supplier warranty','Our cover runs the full '+TERM+' months','A 12 month supplier warranty on the machines, and our cover for covered repairs for the full '+TERM+' months']);
    t.push(['About two months','From order','About two months from order']);
    if(c.asks) t.push(['Showroom robots','Priced to order','Showroom robots priced to order on their own quote']);
    if(c.pkg&&c.pkg.extra) t.push([c.pkg.extra.name,'Priced on scope',c.pkg.extra.name+' priced on scope']);
    return t;
  }
  // ---- the saved quote. A quote lives past the page it was built on: the
  // sheet saves it as it changes, every page restores it, and the quote page
  // and the proposal take it over when they are opened on a link. Contact
  // details are kept here too, on this device only: they print on the
  // proposal but never ride in a link. Storage can be missing or full
  // (private windows), so every call may fail quietly and the quote still
  // works for the page it is on.
  var STORE='wr-quote', KEEP=30*864e5;
  function load(){
    try{ var o=JSON.parse(localStorage.getItem(STORE)||'null'); if(!o||!o.t||Date.now()-o.t>KEEP) return null; return o; }catch(e){ return null; }
  }
  function save(patch){
    try{ var o=load()||{}; Object.keys(patch).forEach(function(k){ o[k]=patch[k]; }); o.t=Date.now(); localStorage.setItem(STORE,JSON.stringify(o)); }catch(e){}
    try{ window.dispatchEvent(new CustomEvent('wr-quote')); }catch(e){}
  }
  function forget(){ try{ localStorage.removeItem(STORE); }catch(e){} try{ window.dispatchEvent(new CustomEvent('wr-quote')); }catch(e){} }
  return {load:load,save:save,forget:forget,parts:parts,valueText:valueText,valueNote:valueNote,detailFor:detailFor,summaryLine:summaryLine,sumsHtml:sumsHtml,termsList:termsList,
          optionAmount:optionAmount,STUDIO:STUDIO,MACHINES:MACHINES,PARTS:PARTS,OPTIONS:OPTIONS,INCLUDED:INCLUDED,FAMILIES:FAMILIES,ROBOTS:ROBOTS,ROBOT_PRICES:ROBOT_PRICES,
          SERVICE:SERVICE,TERM:TERM,AFTER:AFTER,GST:GST,PAY:PAY,PACKAGES:PACKAGES,DETAILS:DETAILS,IMG_POS:IMG_POS,
          compute:compute,packageQuote:packageQuote,packageFor:packageFor,waysToPay:waysToPay,payHtml:payHtml,titleOf:titleOf,
          stateFromQuery:stateFromQuery,toQuery:toQuery,parsePick:parsePick,
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

/* The quote page: a quote shown the way a product page shows a product.
   The name over the picture, the monthly budget set large with its sums,
   then every part as its own spread. Built in the sheet; this is where it
   lands. The state is the address, so the page is a link, and the proposal
   is one click from it. */
(function(){
  var host=document.getElementById('qv'); var Q=window.WonderQuote;
  if(!host||!Q) return;
  var money=Q.money;
  var esc=function(t){ return String(t==null?'':t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); };
  var root=(function(){ var a=document.querySelector('.bar .mark'); return a?a.getAttribute('href'):''; })();
  var st=Q.stateFromQuery(location.search);
  (function(){
    var linked=Object.keys(st.qty).length>0, kept=Q.load();
    if(!linked&&kept&&kept.q){ var who=st.who; st=Q.stateFromQuery(kept.q); st.who=who||st.who; try{ history.replaceState(null,'',location.pathname+Q.toQuery(st)); }catch(e){} }
    else if(linked) Q.save({q:Q.toQuery({qty:st.qty,parts:st.parts,opts:st.opts,pkg:st.pkg,site:st.site})});
  })();
  var long=new Intl.DateTimeFormat('en-AU',{day:'numeric',month:'long',year:'numeric'});
  function pos(img){ var k=Object.keys(Q.IMG_POS).filter(function(x){return img&&img.indexOf(x)>=0;})[0]; return k?Q.IMG_POS[k]:'50% 50%'; }
  function famImg(mid){ var f=(Q.FAMILIES||[]).filter(function(x){return x.models.indexOf(mid)>=0;})[0]; return f&&f.models.length>1&&f.models[0]===mid?f.img:null; }

  function draw(){
    var c=Q.compute(st), P=Q.parts(c);
    if(!P.picked.length){
      host.innerHTML='<section class="qv-empty"><div class="wrap"><span class="label">[ Your quote ]</span><h1>Nothing on it yet.</h1>'+
        '<p>Pick a robot, then everything around it. It prices as you go, and lands here.</p>'+
        '<div class="actions"><a class="btn" href="'+root+'quote/" data-quote><span>Build a quote</span><i aria-hidden="true">+</i></a>'+
        '<a class="btn ghost" href="'+root+'robot-cafe-packages/"><span>Start from a package</span><i aria-hidden="true">+</i></a></div></div></section>';
      return;
    }
    var now=new Date(), until=new Date(now.getTime()+30*864e5);
    var ref='WR-Q'+String(now.getFullYear()).slice(2)+('0'+(now.getMonth()+1)).slice(-2)+('0'+now.getDate()).slice(-2)+'-'+(c.count+c.robots+c.asks);
    var title=c.pkg?c.pkg.name:Q.titleOf(c.lines);
    var hero=c.pkg?c.pkg.img:(famImg(P.picked[0].id)||P.picked[0].img);
    var q=Q.toQuery(st);
    var body=['Quote '+ref+': '+title].concat(P.parts.map(function(l){ return l.label+': '+Q.valueText(l); }))
      .concat(['Monthly budget: '+money.format(c.monthly)+' a month over '+c.term+' months','Upfront: '+money.format(c.upfront),'Service: '+money.format(c.service)+' a month','Over '+c.term+' months, ex GST: '+money.format(c.total),'',location.origin+location.pathname+q]).join('\n');
    var opt=function(name,value,label,on){ return '<button type="button" class="qv-seg" data-opt="'+name+'" data-val="'+value+'" aria-pressed="'+(on?'true':'false')+'">'+label+'</button>'; };
    var options=c.monthly?'<div class="qv-opts"><div><span class="label">Delivery</span><div class="qv-segs">'+opt('site','local','Within 100 km of a port',c.site==='local')+opt('site','far','Further',c.site==='far')+'</div></div></div>':'';

    var spreads=P.parts.map(function(l,i){
      var d=Q.detailFor(l,c);
      var name=(l.n>1?l.n+' × ':'')+(l.kind==='machine'?l.name+', '+l.model:l.label);
      var gets=d&&d.gets?'<div><span class="label">What you get</span><ul class="inc-gets">'+d.gets.map(function(g){return '<li>'+esc(g)+'</li>';}).join('')+'</ul></div>':'';
      var facts=d&&d.facts?'<dl class="inc-facts">'+d.facts.map(function(f){return '<dt>'+esc(f[0])+'</dt><dd>'+esc(f[1])+'</dd>';}).join('')+'</dl>':'';
      return '<article class="inc'+(i%2?' flip':'')+'"><div class="inc-h"><span class="inc-i">('+('0'+(i+1)).slice(-2)+')</span><span class="inc-stage">'+esc(d?d.stage:'Equipment')+'</span>'+
        '<h3>'+esc(name)+'</h3><div class="inc-price'+(l.value===null?' ask':'')+'">'+esc(Q.valueText(l))+'<small>'+esc(Q.valueNote(l))+'</small></div></div>'+
        '<figure class="inc-ph"><img src="'+l.img+'" alt="" loading="lazy" style="object-position:'+pos(l.img)+'"></figure>'+
        '<div class="inc-b"><p class="inc-lead">'+esc(d?d.lead:l.sub)+'</p>'+((gets||facts)?'<div class="inc-cols">'+gets+facts+'</div>':'')+'</div></article>';
    }).join('');

    host.innerHTML=
      '<section class="phero"><div class="wrap"><div class="pills"><span class="pill">Quote '+ref+'</span><span class="pill">Valid until '+long.format(until)+'</span><span class="pill">About two months</span>'+(c.monthly?'<span class="pill price">'+money.format(c.monthly)+' a month</span>':'')+'</div>'+
        '<h1>'+esc(title)+'.</h1><figure class="stage photo"><img src="'+hero+'" alt="" loading="eager" style="object-position:'+pos(hero)+'"><figcaption class="label"><span>'+esc(title)+'</span><span>Your quote</span></figcaption></figure></div></section>'+
      '<section class="pnum"><div class="wrap"><span class="label">[ Your monthly budget ]</span>'+
        (c.monthly?'<div class="pn-fig">'+money.format(c.monthly)+'</div><span class="pn-extra">a month over '+c.term+' months, ex GST'+(c.pkg&&c.pkg.extra?', plus '+esc(c.pkg.extra.name.toLowerCase())+', priced on scope':'')+'</span>':'<div class="pn-fig">On request</div>')+
        '<div class="pn-row"><p>'+esc(Q.summaryLine(c))+'</p><dl class="pn-sum">'+Q.sumsHtml(c)+'</dl></div>'+
        options+
        '<div class="actions"><a class="btn" href="'+root+'quote/proposal/'+q+'"><span>The proposal, PDF</span><i aria-hidden="true">+</i></a>'+
        '<button type="button" class="btn ghost" id="qv-change"><span>Change it</span><i aria-hidden="true">+</i></button>'+
        '<a class="btn ghost" href="mailto:info@wonderbytech.com?subject='+encodeURIComponent('Quote '+ref)+'&body='+encodeURIComponent(body)+'"><span>Send it to us</span><i aria-hidden="true">+</i></a></div>'+
      '</div></section>'+
      (c.monthly?'<section class="pays"><div class="wrap"><div class="pays-h"><span class="label">[ Ways to pay ]</span><h2>Spread, upfront or financed.</h2></div>'+Q.payHtml(c,{ask:'#eoi'})+'</div></section>':'')+
      '<section class="incs"><div class="wrap"><div class="incs-h"><span class="label">[ Everything in it ]</span><h2>'+P.parts.length+(P.parts.length===1?' part':' parts')+'. One monthly budget.</h2></div>'+spreads+'</div></section>'+
      '<section class="rail last"><div class="wrap"><span class="label">[ Terms ]</span><div><ol class="hl three">'+
        Q.termsList(c,long.format(until)).slice(0,6).map(function(t){ return '<li><b>'+esc(t[0])+'</b><p>'+esc(t[1])+'</p></li>'; }).join('')+
        '</ol><p class="pays-fine"><a class="link" href="'+root+'terms/">The terms of sale</a></p></div></div></section>';

    document.title=title+', quote '+ref+', Wonder Robotics';
    var ch=document.getElementById('qv-change');
    if(ch) ch.addEventListener('click',function(){ if(window.WonderQuoteSheet) WonderQuoteSheet.load(st); });
  }
  host.addEventListener('click',function(e){
    var b=e.target.closest('.qv-seg'); if(!b) return;
    st[b.getAttribute('data-opt')]=b.getAttribute('data-val');
    try{ history.replaceState(null,'',location.pathname+Q.toQuery(st)); }catch(err){}
    Q.save({q:Q.toQuery({qty:st.qty,parts:st.parts,opts:st.opts,pkg:st.pkg,site:st.site})});
    draw();
  });
  draw();
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
  (function(){
    var linked=Object.keys(st.qty).length>0, kept=Q.load();
    if(!linked&&kept&&kept.q){ var who=st.who; st=Q.stateFromQuery(kept.q); st.who=who||st.who; try{ history.replaceState(null,'',location.pathname+Q.toQuery(st)); }catch(e){} }
    else if(linked) Q.save({q:Q.toQuery({qty:st.qty,parts:st.parts,opts:st.opts,pkg:st.pkg,site:st.site})});
  })();
  var forInput=document.getElementById('pp-for');
  var long=new Intl.DateTimeFormat('en-AU',{day:'numeric',month:'long',year:'numeric'});

  function pos(img){ var k=Object.keys(Q.IMG_POS).filter(function(x){return img&&img.indexOf(x)>=0;})[0]; return k?Q.IMG_POS[k]:'50% 50%'; }
  function pic(src,cls){ return src?'<img class="'+(cls||'')+'" src="'+src+'" alt="" loading="eager" style="object-position:'+pos(src)+'">':''; }

  function draw(){
    var c=Q.compute(st), P=Q.parts(c);
    if(!P.picked.length){
      host.innerHTML='<section class="sheet pp-empty"><div class="sh-in"><span class="label">[ Proposal ]</span><h1>Nothing to propose yet.</h1>'+
        '<p>Pick the machines and the work on the quote, and the proposal draws itself.</p><a class="btn" href="'+root+'quote/"><span>Build the quote</span><i aria-hidden="true">+</i></a></div></section>';
      return;
    }
    var now=new Date(), until=new Date(now.getTime()+30*864e5);
    var ref='WR-P'+String(now.getFullYear()).slice(2)+('0'+(now.getMonth()+1)).slice(-2)+('0'+now.getDate()).slice(-2)+'-'+(c.count+c.robots+c.asks);
    var title=c.pkg?c.pkg.name:Q.titleOf(c.lines);
    var hero=c.pkg?c.pkg.img:P.picked[0].img;
    var sheets=[];

    // 1. cover
    sheets.push('<section class="sheet pp-cover">'+pic(hero,'cv-img')+
      '<div class="cv-band"><div class="cv-top"><canvas data-wonder-mark data-sub="ROBOTICS" data-ink="#F3F1E4" data-w="200" data-hr="0.30" role="img" aria-label="Wonder Robotics"></canvas><span class="cv-kind">Proposal</span></div>'+
      '<h1>'+esc(title)+'</h1>'+
      '<dl class="cv-meta"><div><dt>Prepared for</dt><dd class="cv-for">'+(st.who?esc(st.who):'<span class="blank"></span>')+'</dd></div>'+
      '<div><dt>Reference</dt><dd>'+ref+'</dd></div><div><dt>Date</dt><dd>'+long.format(now)+'</dd></div><div><dt>Valid until</dt><dd>'+long.format(until)+'</dd></div></dl>'+
      '<dl class="cv-meta cv-people" hidden><div><dt>Contact</dt><dd class="cv-contact"></dd></div><div><dt>Your account manager</dt><dd class="cv-am"></dd></div></dl></div></section>');

    // 2. the monthly budget
    var grid=P.parts.map(function(l,i){
      return '<li>'+pic(l.img)+'<span class="i">'+('0'+(i+1)).slice(-2)+'</span><b>'+esc(l.label)+'</b><span class="v'+(l.value===null?' ask':'')+'">'+esc(Q.valueText(l))+'</span></li>';
    }).join('');
    sheets.push('<section class="sheet pp-sum"><div class="sh-in">'+
      '<span class="label">[ Your monthly budget ]</span>'+
      '<div class="ps-fig">'+(c.monthly?money.format(c.monthly)+'<small>a month</small>':'On request')+'</div>'+
      '<div class="ps-row"><p>'+esc(Q.summaryLine(c))+'</p><dl class="ps-sums">'+Q.sumsHtml(c,true)+'</dl></div>'+
      '<span class="label ps-in">In this proposal</span><ol class="ps-grid'+(P.parts.length>8?' many':'')+'">'+grid+'</ol></div>'+foot(ref)+'</section>');

    // 3. every part, two to a sheet
    var blocks=P.parts.map(function(l,i){
      var d=Q.detailFor(l,c);
      var gets=d&&d.gets?'<ul>'+d.gets.map(function(g){return '<li>'+esc(g)+'</li>';}).join('')+'</ul>':'';
      var facts=d&&d.facts?'<dl>'+d.facts.map(function(f){return '<div><dt>'+esc(f[0])+'</dt><dd>'+esc(f[1])+'</dd></div>';}).join('')+'</dl>':'';
      var name=l.kind==='machine'?l.name+', '+l.model:l.label;
      return '<article class="pp-part">'+pic(l.img,'pt-img')+
        '<div class="pt-h"><span class="i">('+('0'+(i+1)).slice(-2)+')</span><span class="stage">'+esc(d?d.stage:'Equipment')+'</span>'+
        '<span class="pt-v'+(l.value===null?' ask':'')+'">'+esc(Q.valueText(l))+'</span></div>'+
        '<h2>'+esc((l.n>1?l.n+' × ':'')+name)+'</h2><p class="pt-lead">'+esc(d?d.lead:l.sub)+'</p>'+
        '<div class="pt-cols">'+gets+facts+'</div></article>';
    });
    for(var i=0;i<blocks.length;i+=2){
      sheets.push('<section class="sheet pp-parts"><div class="sh-in">'+(i===0?'<span class="label">[ Everything in it ]</span>':'')+blocks.slice(i,i+2).join('')+'</div>'+foot(ref)+'</section>');
    }

    // 4. how it goes and ways to pay, then the terms and the yes
    var stages=[['Plan','The site, the menu, the workflow.'],['Design','The layout, the brand, the screens, the drawings.'],['Build','Equipment ordered, the counter built, the machines in your colours.'],['Commission','Connected, tested on your menu, your people trained.'],['Run','Maintained and supported for '+c.term+' months.']];
    sheets.push('<section class="sheet pp-close"><div class="sh-in">'+
      '<span class="label">[ How it goes ]</span><ol class="pc-stages">'+stages.map(function(x,j){return '<li><span class="i">0'+(j+1)+'</span><b>'+x[0]+'</b><p>'+x[1]+'</p></li>';}).join('')+'</ol>'+
      (c.monthly?'<div class="pc-pay"><span class="label">Ways to pay</span>'+Q.payHtml(c)+'</div>':'')+
      '</div>'+foot(ref)+'</section>');
    sheets.push('<section class="sheet pp-close"><div class="sh-in">'+
      '<div class="pc-row"><div><span class="label">Terms</span><ul class="pc-terms">'+Q.termsList(c,long.format(until)).map(function(t){ return '<li>'+esc(t[2]||t[0]+', '+t[1].charAt(0).toLowerCase()+t[1].slice(1))+'</li>'; }).join('')+
      '<li>Sold on the <a href="'+root+'terms/">Wonder Robotics terms of sale</a></li></ul></div>'+
      '<div><span class="label">Talk to us</span><p class="pc-contact"><span class="pc-am"></span><a href="tel:1800983404">1800 983 404</a><br><a href="mailto:info@wonderbytech.com?subject='+encodeURIComponent('Proposal '+ref)+'">info@wonderbytech.com</a><br>365 St Pauls Terrace<br>Fortitude Valley QLD 4006</p></div></div>'+
      '<div class="pc-yes"><span class="label">Accepted</span><div class="lines"><div><span></span><em>Name</em></div><div><span></span><em>Signature</em></div><div><span></span><em>Date</em></div></div></div>'+
      '</div>'+foot(ref)+'</section>');

    host.innerHTML=sheets.join('');
    var n=host.querySelectorAll('.sheet').length;
    [].forEach.call(host.querySelectorAll('.sh-foot .pg'),function(el,k){ el.textContent=(k+2)+' of '+n; });
    if(window.WonderMark) WonderMark.paintAll();
    document.title='Proposal '+ref+(st.who?', '+st.who:'')+', Wonder Robotics';
    var edit=document.getElementById('pp-edit'); if(edit) edit.href=root+'quote/'+Q.toQuery(st);
    paintPeople();
  }
  // The people on it. The client's contact details are kept on this device
  // and print on the proposal; they are never written into the link.
  var people=(Q.load()||{}).contact||{};
  // one client's details never land on another client's proposal
  if(people.for&&st.who&&people.for!==st.who){ people={}; Q.save({contact:people}); }
  if(!st.by) st.by=((Q.load()||{}).am||'').slice(0,60);
  function paintPeople(){
    var set=function(sel,html){ [].forEach.call(host.querySelectorAll(sel),function(n){ n.innerHTML=html; }); };
    set('.cv-for',st.who?esc(st.who):'<span class="blank"></span>');
    var lines=[people.name,people.email,people.phone].filter(Boolean).map(esc);
    set('.cv-contact',lines.join('<br>'));
    set('.cv-am',st.by?esc(st.by)+'<br>1800 983 404':'');
    set('.pc-am',st.by?esc(st.by)+', your account manager<br>':'');
    var box=host.querySelector('.cv-people'); if(box) box.hidden=!(lines.length||st.by);
    [].forEach.call(host.querySelectorAll('.cv-people > div'),function(d,i){ d.hidden=i===0?!lines.length:!st.by; });
  }
  function foot(ref){ return '<div class="sh-foot"><span>Wonder Robotics</span><span>'+ref+'</span><span class="pg"></span></div>'; }

  var FIELDS=[['pp-for','who',80],['pp-by','by',60],['pp-name','name',80],['pp-email','email',120],['pp-phone','phone',40]];
  FIELDS.forEach(function(f){
    var el=document.getElementById(f[0]); if(!el) return;
    var mine=f[1]==='who'||f[1]==='by';
    el.value=(mine?st[f[1]]:people[f[1]])||'';
    el.addEventListener('input',function(){
      var v=el.value.slice(0,f[2]);
      if(mine){ st[f[1]]=v; try{ history.replaceState(null,'',location.pathname+Q.toQuery(st)); }catch(e){} if(f[1]==='by') Q.save({am:v}); }
      else{ people[f[1]]=v; }
      people.for=st.who||''; Q.save({contact:people});
      paintPeople();
      var edit=document.getElementById('pp-edit'); if(edit) edit.href=root+'quote/'+Q.toQuery(st);
      document.title='Proposal'+(st.who?', '+st.who:'')+', Wonder Robotics';
    });
  });
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

  // One state for the sheet. Machines and robots count, the rest toggle.
  var qty={}, parts={}, opts={}, pkg=null, drawn=false, lastFocus=null, openFam=null;
  // a choice the sheet does not show but must not lose when a quote page is changed in it
  var carry={site:'local'};
  function clearAll(){
    Q.MACHINES.concat(Q.ROBOTS).forEach(function(m){ qty[m.id]=0; });
    Q.PARTS.forEach(function(x){ parts[x.id]=false; });
    Q.OPTIONS.forEach(function(x){ opts[x.id]=false; });
    pkg=null;
  }
  clearAll();
  function state(){ return {qty:qty,parts:parts,opts:opts,pkg:pkg,site:carry.site}; }
  // pick the quote back up where it was left, on whatever page this is
  var saved=Q.load();
  if(saved&&saved.q){
    var was=Q.stateFromQuery(saved.q);
    Object.keys(was.qty).forEach(function(id){ if(id in qty) qty[id]=was.qty[id]; });
    Object.keys(was.parts).forEach(function(id){ if(id in parts) parts[id]=true; });
    Object.keys(was.opts).forEach(function(id){ if(id in opts) opts[id]=true; });
    pkg=was.pkg; carry.site=was.site;
  }

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
    if(a.getAttribute('data-pkg')){ choosePackage(a.getAttribute('data-pkg')); wzEnter(); render(); }
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
  // button for a second or a third. Options simply go in and out.
  function card(o,opt){
    var label=opt.label;
    return '<article class="qs-card'+(opt.counted?' counted':'')+'" id="qc-'+o.id+'">'+
      '<button type="button" class="qs-hit" data-id="'+o.id+'" data-kind="'+opt.kind+'" aria-pressed="false" aria-label="'+esc(label)+'"></button>'+
      '<span class="n" id="qb-'+o.id+'" aria-hidden="true"></span>'+(opt.tag||'')+
      '<div class="ph"><img src="'+o.img+'" alt="" loading="lazy" decoding="async"></div>'+
      '<div class="qs-card-b"><h3>'+esc(opt.title)+(opt.small?'<small>'+esc(opt.small)+'</small>':'')+'</h3>'+(opt.text?'<p>'+esc(opt.text)+'</p>':'')+
      '<div class="qs-card-f"><span class="price'+(opt.ask?' ask':'')+'" id="qpv-'+o.id+'">'+(opt.price||'')+'</span>'+
      '<span class="add" aria-hidden="true">Add</span>'+(opt.counted?stepper(o.id,label):'')+'</div></div></article>';
  }
  function pkgCard(pk){
    var c=Q.packageQuote(pk);
    var has=c.lines.filter(function(l){return l.kind==='machine'||l.kind==='option';}).map(function(l){return l.name;}).join(', ')+', the service'+(pk.extra?', '+pk.extra.name.toLowerCase():'');
    return '<article class="qs-card pkg" id="qc-pkg-'+pk.id+'">'+
      '<button type="button" class="qs-hit" data-id="'+pk.id+'" data-kind="pkg" aria-pressed="false" aria-label="'+esc(pk.name+', package')+'"></button>'+
      '<span class="n" aria-hidden="true"></span>'+
      '<div class="ph"><img src="'+pk.img+'" alt="" loading="lazy" decoding="async"></div>'+
      '<div class="qs-card-b"><h3>'+esc(pk.name)+'</h3><p>'+esc(pk.line)+'</p><p class="has">'+esc(has)+'</p>'+
      '<div class="qs-card-f"><span class="price">'+money.format(c.monthly)+'<small>a month over '+c.term+' months'+(pk.extra?', plus the container':'')+'</small></span>'+
      '<span class="add" aria-hidden="true">Add</span></div></div></article>';
  }
  function mById(id){ return Q.MACHINES.filter(function(m){return m.id===id;})[0]; }
  function pById(id){ return Q.PARTS.filter(function(p){return p.id===id;})[0]; }
  function oById(id){ return Q.OPTIONS.filter(function(o){return o.id===id;})[0]; }
  function rById(id){ return Q.ROBOTS.filter(function(r){return r.id===id;})[0]; }
  function famOf(mid){ return Q.FAMILIES.filter(function(f){return f.models.indexOf(mid)>=0;})[0]; }
  function famCount(f){ return f.models.reduce(function(a,id){return a+(qty[id]||0);},0); }
  function machineCount(){ return Q.MACHINES.reduce(function(a,m){return a+(qty[m.id]||0);},0); }
  function famCard(f){
    var prices=f.models.map(function(id){return mById(id).price;}), low=Math.min.apply(null,prices);
    var from=(f.models.length>1?'From ':'')+money.format(low);
    var small=f.models.length>1?f.models.length+' models':mById(f.models[0]).model;
    return '<article class="qs-card fam" id="qf-'+f.id+'">'+
      '<button type="button" class="qs-hit" data-id="'+f.id+'" data-kind="fam" aria-expanded="false" aria-controls="qs-conf" aria-label="'+esc(f.name)+'"></button>'+
      '<span class="n" id="qfb-'+f.id+'" aria-hidden="true"></span>'+
      '<div class="ph"><img src="'+f.img+'" alt="" loading="lazy" decoding="async"></div>'+
      '<div class="qs-card-b"><h3>'+esc(f.name)+'<small>'+esc(small)+'</small></h3><p>'+esc(f.line)+'</p>'+
      '<div class="qs-card-f"><span class="price">'+from+'<small>installed</small></span><span class="add" aria-hidden="true">Add</span></div></div></article>';
  }
  // The service for the next machine, said where the buyer is deciding.
  function nextLine(){
    return machineCount()?'Another machine adds '+money.format(Q.SERVICE.extra)+' a month to the service, not '+money.format(Q.SERVICE.first)+'.'
                         :'The first machine carries the service: '+money.format(Q.SERVICE.first)+' a month for '+Q.TERM+' months.';
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
      }).join('')+'</div><p class="cf-none" id="qs-conf-next"></p></div>';
    var acc=f.parts.length?'<div class="cf-block"><span class="label">Accessories for it</span><div class="cf-parts">'+f.parts.map(function(id){
        var x=pById(id);
        return '<button type="button" class="cf-part" id="qx-'+id+'" data-kind="part" data-id="'+id+'" aria-pressed="false">'+
          '<span class="t"><img src="'+x.img+'" alt="" loading="lazy"></span><span class="m"><b>'+esc(x.name)+'</b><small>'+esc(x.sub)+'</small></span><span class="p ask">Priced on order</span><span class="tick" aria-hidden="true"></span></button>';
      }).join('')+'</div></div>':'<div class="cf-block"><span class="label">Accessories for it</span><p class="cf-none">It comes complete. Nothing to add to this one.</p></div>';
    var panel=document.createElement('div');
    panel.className='qs-conf'; panel.id='qs-conf';
    panel.innerHTML='<div class="cf-head"><h4>Your '+esc(f.name.toLowerCase())+'</h4><button type="button" class="cf-remove" data-kind="famrm" data-id="'+f.id+'">Remove it</button></div>'+
      models+counts+acc+
      '<div class="cf-foot"><button type="button" class="btn" data-kind="next"><span>Next: design and build it</span><i aria-hidden="true">+</i></button>'+
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
  function robotPrice(r){ return r.price?money.format(r.price)+'<small>+ '+money.format(Q.SERVICE.robot)+' a month</small>':'On request'; }
  function draw(){
    if(drawn) return; drawn=true;
    $('qp-pkg').innerHTML=Q.PACKAGES.map(pkgCard).join('');
    $('qp-food').innerHTML=Q.FAMILIES.map(famCard).join('');
    $('qp-robots').innerHTML=Q.ROBOTS.map(function(r){
      var floor=/floor/i.test(r.status);
      return card(r,{kind:'unit',counted:true,label:r.name,title:r.name,small:r.role||r.kind,price:robotPrice(r),ask:!r.price,
        tag:'<span class="tag'+(floor?' floor':'')+'"><i></i>'+esc(r.status)+'</span>'});
    }).join('');
    var optCard=function(x){ return card(x,{kind:'opt',label:x.name,title:x.name,text:x.sub}); };
    $('qp-work').innerHTML=Q.OPTIONS.filter(function(x){return x.group==='studio';}).map(optCard).join('');
    $('qp-care').innerHTML=Q.OPTIONS.filter(function(x){return x.group==='care';}).map(optCard).join('');
    var inc=$('qs-included'); if(inc) inc.innerHTML=Q.INCLUDED.map(function(x){ return '<li><b>'+esc(x.name)+'</b><small>'+esc(x.sub)+'</small></li>'; }).join('');
    wzEnter();
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
    else if(k==='opt') opts[id]=!opts[id];
    render();
  });
  // Choosing a package puts its machines and its studio work on the quote.
  // Taking it off takes them back off. Change the machines so it is no
  // longer that package and it simply stops naming the quote.
  function pkgById(id){ return Q.PACKAGES.filter(function(p){return p.id===id;})[0]||null; }
  function choosePackage(id){
    var was=pkgById(pkg);
    if(was){
      Object.keys(was.machines).forEach(function(m){ qty[m]=Math.max(0,qty[m]-was.machines[m]); });
      (was.opts||[]).forEach(function(o){ opts[o]=false; });
    }
    pkg=null;
    var pk=pkgById(id); if(!pk) return;
    Object.keys(pk.machines).forEach(function(m){ qty[m]=Math.max(qty[m],pk.machines[m]); });
    (pk.opts||[]).forEach(function(o){ opts[o]=true; });
    pkg=id;
  }
  function paintBar(){
    var c=Q.compute(state()), sp=btn.querySelector('span'); if(!sp) return;
    var has=c.count+c.robots+c.asks>0;
    sp.innerHTML=has?'Your quote'+(c.monthly?'<em>'+money.format(c.monthly)+' a month</em>':''):'Build a quote';
    btn.classList.toggle('has',has);
    btn.setAttribute('aria-label',has?'Your quote'+(c.monthly?', '+money.format(c.monthly)+' a month':'')+'. Open it':'Build a quote');
  }
  paintBar();
  window.WonderQuoteSheet={
    open:function(id){ draw(); if(id){ choosePackage(id); wzEnter(); } render(); setOpen(true); },
    // open the sheet holding a whole quote, so a quote page can be changed
    load:function(st){
      draw(); clearAll();
      Q.MACHINES.concat(Q.ROBOTS).forEach(function(m){ qty[m.id]=(st.qty&&st.qty[m.id])||0; });
      Q.PARTS.forEach(function(x){ parts[x.id]=!!(st.parts&&st.parts[x.id]); });
      Q.OPTIONS.forEach(function(x){ opts[x.id]=!!(st.opts&&st.opts[x.id]); });
      pkg=st.pkg||null; openFam=null; carry={site:st.site==='far'?'far':'local'};
      drawConf(); wzEnter(); render(); setOpen(true);
    }
  };
  $('qs-peek').addEventListener('click',function(){
    var tray=$('qs-tray'), o=!tray.classList.contains('open');
    tray.classList.toggle('open',o); this.setAttribute('aria-expanded',o?'true':'false');
  });

  // ---- the guided quote. A buyer is asked what they are opening, what it
  // serves and where it goes; we recommend and say
  // why; then we offer what makes it theirs, each with its reason. Output is
  // never promised here: it is measured on their menu at commissioning.
  var wz={step:0, type:null, serve:[], front:null, where:null, applied:false};
  if(saved&&saved.wz){ ['type','front','where'].forEach(function(k){ if(typeof saved.wz[k]==='string') wz[k]=saved.wz[k]; }); if(Array.isArray(saved.wz.serve)) wz.serve=saved.wz.serve.slice(0,8); wz.applied=saved.wz.applied!==false; }
  var TYPES=[
    {id:'cafe',    t:'A café',                      s:'Coffee at the counter',                 serve:['coffee'],   img:'{{root}}img/offer/coffee-bar-studio.jpg'},
    {id:'bar',     t:'A bar',                       s:'Cocktails poured by an arm',            serve:['cocktails'], img:'{{root}}img/offer/robot-bar-studio.jpg'},
    {id:'dessert', t:'A dessert or ice cream spot', s:'Soft serve handed over',                serve:['softserve'], img:'{{root}}img/warm-kiosk.jpg',pos:'50% 12%'},
    {id:'kitchen', t:'A kitchen or takeaway',       s:'Fried food and noodles',                serve:['fried','noodles'], img:'{{root}}img/offer/kitchen-line-studio.jpg'},
    {id:'kiosk',   t:'A coffee kiosk',              s:'Ordered on a screen, in a vending format', serve:['coffee'], img:'{{root}}img/machines/coffee-robot-d1.jpg'},
    {id:'front',   t:'Front of house',              s:'A robot to carry orders or greet guests', serve:[], img:'{{root}}img/machines/ubtech-cadebot-light.jpg',pos:'50% 18%'}
  ];
  var SERVES=[{id:'coffee',t:'Coffee',img:'{{root}}img/offer/coffee-bar-studio.jpg'},{id:'cocktails',t:'Cocktails',img:'{{root}}img/offer/robot-bar-studio.jpg'},{id:'softserve',t:'Soft serve',img:'{{root}}img/tile-kiosk.jpg',pos:'50% 40%'},{id:'fried',t:'Fried food',img:'{{root}}img/tile-arm.jpg',pos:'50% 45%'},{id:'noodles',t:'Noodles',img:'{{root}}img/valley-baths.jpg'}];
  var FRONTS=[{id:'carry',t:'Carry orders to the table',s:'UBTECH CadeBot, three trays',img:'{{root}}img/machines/ubtech-cadebot-light.jpg',pos:'50% 18%'},{id:'greet',t:'Greet and guide guests',s:'UBTECH Cruzr 1S, voice and a screen',img:'{{root}}img/machines/ubtech-cruzr-1s-light.jpg',pos:'50% 14%'},{id:'both',t:'Both',s:'One of each',img:'{{root}}img/machines/ubtech-cadebot-light.jpg',img2:'{{root}}img/machines/ubtech-cruzr-1s-light.jpg'}];
  var WHERE=[{id:'have',t:'The venue I have',s:'We fit it into the room you run',img:'{{root}}img/coffee/venue-01-bar-in-room.jpg'},{id:'new',t:'A new venue',s:'We design the space and build it',img:'{{root}}img/coffee/bar-01-sketch.jpg',pos:'50% 40%'},{id:'box',t:'A container or pop-up',s:'Built in our yard, delivered ready',img:'{{root}}img/container/day.jpg',video:'{{root}}img/container/day.mp4'}];
  var WHY={
    bpro:'Two arms at an Eversys, the premium machine: one pulls the shot, one steams and pours.',
    bstd:'The same two arms on a Dr.Coffee F3, at a lower entry cost than the B Pro.',
    eff:'A vending format: the order goes in on the screen, and the coffee, ice and syrups are all inside.',
    bar:'An arm under a rack of your bottles, pouring the same measure every time.',
    ice:'Pasteurised soft serve, and an arm that hands the cone over.',
    fry:'Six fryers worked by one arm: basket in, timed, lifted, drained.',
    noo:'Six noodle stoves, cooked to the order.',
    'ubtech-cadebot':'Carries orders from the pass to the table, mapped to your floor.',
    'ubtech-cruzr-1s':'Greets guests, answers questions and guides them where they are going.'
  };
  function wzSteps(){
    if(wz.type==='front') return ['type','front','result'];
    var st=['type','serve'];
    st.push('where','result');
    return st;
  }
  function recommend(){
    var m={};
    if(wz.type==='front'){
      if(!wz.front) return m;
      if(wz.front!=='greet') m['ubtech-cadebot']=1;
      if(wz.front!=='carry') m['ubtech-cruzr-1s']=1;
      return m;
    }
    if(wz.serve.indexOf('coffee')>=0) m[wz.type==='kiosk'?'eff':'bpro']=1;
    if(wz.serve.indexOf('cocktails')>=0) m.bar=1;
    if(wz.serve.indexOf('softserve')>=0) m.ice=1;
    if(wz.serve.indexOf('fried')>=0) m.fry=1;
    if(wz.serve.indexOf('noodles')>=0) m.noo=1;
    return m;
  }
  // What it takes to open, by where it goes: the room you have needs the
  // counter and the machine in your colours; a new venue needs the room and
  // the brand designed as well; a container is built with its own kitchen.
  var OPEN_WITH={have:['wrap','fitout','extract'], new:['space','identity','web','wrap','fitout','extract'], box:['identity','web','wrap']};
  // Every answer lands on the quote as it is given, so the total moves with
  // each click instead of sitting at $0 until the last question.
  function applyAnswers(){
    clearAll();
    var m=recommend(); Object.keys(m).forEach(function(id){ qty[id]=m[id]; });
    (OPEN_WITH[wz.where]||[]).forEach(function(id){ opts[id]=true; });
    if(wz.where==='box'&&qty.fry&&qty.noo) pkg='box';
  }
  function applyRecommendation(){ applyAnswers(); wz.applied=true; }
  // Every answer is a picture of the thing: the plate the site already
  // uses for it, and the container's clip where there is one.
  function choice(kind,o,on,multi){
    // every photo fills its frame edge to edge, anchored on its subject so a
    // tall plate keeps its head; two robots side by side each take half the
    // card, which is their own 4:5, so both stand whole
    var ph=o.img?'<span class="ph'+(o.img2?' duo':'')+'">'+(o.video?'<video autoplay muted loop playsinline preload="metadata" poster="'+o.img+'"><source src="'+o.video+'" type="video/mp4"></video>':'<img src="'+o.img+'" alt="" loading="lazy" decoding="async"'+(o.pos?' style="object-position:'+o.pos+'"':'')+'>'+(o.img2?'<img src="'+o.img2+'" alt="" loading="lazy" decoding="async">':''))+'</span>':'';
    return '<button type="button" class="wz-opt'+(multi?' multi':'')+(ph?' pic':'')+'" data-wz="'+kind+'" data-val="'+o.id+'" aria-pressed="'+(on?'true':'false')+'">'+ph+
      '<span class="wz-opt-t"><b>'+esc(o.t)+'</b>'+(o.s?'<small>'+esc(o.s)+'</small>':'')+'</span><span class="mk" aria-hidden="true"></span></button>';
  }
  function wzDraw(){
    var host=$('wz'); if(!host) return;
    var steps=wzSteps(), name=steps[Math.min(wz.step,steps.length-1)], n=steps.length-1;
    // no "of N": how many questions there are depends on the answers
    var prog=name==='result'?'':'<div class="wz-prog"><span class="label">Question '+(wz.step+1)+'</span><span class="bar"><i style="width:'+Math.round((wz.step+1)/(n+1)*100)+'%"></i></span></div>';
    var back=wz.step>0?'<button type="button" class="wz-back" data-wz="back">Back</button>':'';
    var browse='<button type="button" class="wz-browse" data-wz="browse">Or browse every machine</button>';
    var opts=function(list,kind,cur,multi){ return '<div class="wz-opts" style="--n:'+list.length+'">'+list.map(function(o){return choice(kind,o,multi?cur.indexOf(o.id)>=0:cur===o.id,multi);}).join('')+'</div>'; };
    var ask=function(q,hint,list,kind,cur){ return prog+'<h3 class="wz-q">'+q+'</h3>'+(hint?'<p class="wz-hint">'+hint+'</p>':'')+opts(list,kind,cur)+'<div class="wz-foot">'+back+'</div>'; };
    var html='';
    if(name==='type'){
      html=prog+'<h3 class="wz-q">What are you opening?</h3>'+opts(TYPES,'type',wz.type)+
        '<div class="wz-foot">'+browse+'</div>';
    }else if(name==='serve'){
      html=prog+'<h3 class="wz-q">What will it serve?</h3><p class="wz-hint">Pick as many as you like.</p>'+opts(SERVES,'serve',wz.serve,true)+
        '<div class="wz-foot">'+back+'<button type="button" class="btn" data-wz="next"'+(wz.serve.length?'':' disabled')+'><span>Next</span><i aria-hidden="true">+</i></button></div>';
    }else if(name==='front'){
      html=ask('What should it do?','',FRONTS,'front',wz.front);
    }else if(name==='where'){
      html=ask('Where will it go?','',WHERE,'where',wz.where);
    }else{
      html=resultHtml();
    }
    host.innerHTML=html;
    // the sheet is named for what they told us they are building
    var BUILD={cafe:'Build your café.',bar:'Build your bar.',dessert:'Build your dessert bar.',kitchen:'Build your kitchen.',kiosk:'Build your kiosk.',front:'Build your front of house.'};
    var tt=$('qs-title'); if(tt) tt.textContent=BUILD[wz.type]||'Build your space.';
    $('qs-browse').hidden=true;
    $('qs-pick').scrollTop=0;
  }
  function offerPrice(o){
    var amt=Q.optionAmount(o,machineCount(),(qty.fry||0)+(qty.noo||0));
    return amt===null?'':money.format(amt)+(o.per==='month'?' a month':'');
  }
  function offer(id,kind,title,why,price,on){
    var img=kind==='part'?pById(id).img:kind==='unit'?rById(id).img:oById(id).img;
    var pos=kind==='unit'?rById(id).pos:null;
    return '<button type="button" class="wz-offer" data-kind="'+kind+'" data-id="'+id+'" aria-pressed="'+(on?'true':'false')+'">'+
      '<span class="t"><img src="'+img+'" alt="" loading="lazy"'+(pos?' style="object-position:'+pos+'"':'')+'></span><span class="m"><b>'+esc(title)+'</b><small>'+esc(why)+'</small></span>'+
      '<span class="p'+(/\$/.test(price)?'':' ask')+'">'+price+'</span><span class="tick" aria-hidden="true"></span></button>';
  }
  function resultHtml(){
    var c=Q.compute(state()), count=c.count, cooks=(qty.fry||0)+(qty.noo||0);
    var picked=Q.MACHINES.concat(Q.ROBOTS.filter(function(r){return r.price;})).filter(function(m){return qty[m.id]>0;});
    var recs=picked.map(function(m){
      var f=famOf(m.id), others=f?f.models.filter(function(id){return id!==m.id;}):[];
      var swap=others.length?'<span class="wz-swap">Or '+others.map(function(id){ var o=mById(id); return '<button type="button" data-kind="model" data-fam="'+f.id+'" data-id="'+id+'">'+esc(o.model)+', '+money.format(o.price)+'</button>'; }).join(' or ')+'</span>':'';
      var img=f&&f.models.length>1&&f.models[0]===m.id?f.img:m.img;
      return '<div class="wz-rec"><span class="t"><img src="'+img+'" alt="" loading="lazy"></span>'+
        '<div class="m"><span class="label">'+esc(m.model||m.kind)+'</span><h4>'+(qty[m.id]>1?qty[m.id]+' × ':'')+esc(m.name)+'</h4><p>'+esc(WHY[m.id]||m.kit||'')+'</p>'+swap+'</div>'+
        '<div class="r"><span class="p">'+money.format(m.price*qty[m.id])+'</span>'+stepper(m.id,m.model||m.name)+'</div></div>';
    }).join('');
    // The budget, then the upsell that is true of this quote: the next
    // machine costs half the service of the first.
    var budget=c.monthly?'<div class="wz-pkg on"><div><span class="label">Your monthly budget</span><h4>'+money.format(c.monthly)+' a month over '+c.term+' months.</h4>'+
      '<p>'+money.format(c.upfront)+' upfront and '+money.format(c.service)+' a month, or finance the equipment and we organise it. Ex GST.</p>'+
      '<ul class="wz-pieces">'+Q.INCLUDED.filter(function(x){return count||!x.kitchen;}).map(function(x){return '<li class="on">'+esc(x.name)+'</li>';}).join('')+'</ul></div></div>':'';
    var nudge=count?'<p class="wz-note">'+esc(nextLine())+'</p>':'';
    var studio=Q.OPTIONS.filter(function(o){ return o.group==='studio'&&Q.optionAmount(o,count,cooks)!==null; });
    var WHY_OPT={
      space:'The room drawn around the machines, so the robots, the queue and your people all fit.',
      identity:'A name and a look people remember: the mark, cups, bags, menu and signage.',
      web:'Your menu and ordering online, in the same brand.',
      wrap:'Your colours on the arms and the body. The machine is the first thing in the brand people see.',
      fitout:wz.where==='have'?'Fitted into the room you run: the counter, power, water and drainage, to our drawings.':'The counter, power, water and drainage, built to our drawings.',
      extract:'The hood and ducting a frying or noodle line needs.',
      ext:'Remote support on the evenings and weekends you trade.',
      pos:'A second POS or payment system connected, beyond the one included.',
      train:'Two hours for a new shift or a new team.'
    };
    var make=studio.map(function(o){ return offer(o.id,'opt',o.name,WHY_OPT[o.id]||o.sub,offerPrice(o),opts[o.id]); }).join('');
    var fams=Q.FAMILIES.filter(function(f){return famCount(f)>0;});
    var accIds=[]; fams.forEach(function(f){ f.parts.forEach(function(id){ if(accIds.indexOf(id)<0) accIds.push(id); }); });
    var ACC_WHY={prnt:'Your mark in chocolate on every crema and foam. The cup people photograph.',icem:'A second ice maker for iced drinks on a hot day.',milk:'Oat or soy on its own line.',syr:'Three more flavours on the menu.'};
    var extras=accIds.map(function(id){ var x=pById(id); return offer(id,'part',x.name,ACC_WHY[id]||x.sub,'Priced on order',parts[id]); }).join('');
    Q.ROBOTS.filter(function(r){return r.price&&!qty[r.id];}).forEach(function(r){
      extras+=offer(r.id,'unit',r.name,WHY[r.id]||r.role,money.format(r.price)+' + '+money.format(count?Q.SERVICE.robot:r.alone)+' a month',false);
    });
    ['ext','pos','train'].forEach(function(id){ var o=oById(id); extras+=offer(id,'opt',o.name,WHY_OPT[id],offerPrice(o),opts[id]); });
    var boxNote=wz.where==='box'?'<p class="wz-note">The container build is priced once we have your site and menu, and it is on the quote to confirm.</p>':'';
    return '<div class="wz-result"><span class="label">[ Here is what we would build ]</span><h3 class="wz-q">'+esc(Q.titleOf(c.lines)||'Your quote')+'.</h3>'+
      '<div class="wz-recs">'+recs+'</div>'+nudge+budget+boxNote+
      (make?'<div class="wz-group"><span class="label">Design and build it</span><div class="wz-offers">'+make+'</div></div>':'')+
      '<div class="wz-group"><span class="label">Worth adding</span><div class="wz-offers">'+extras+'</div></div>'+
      '<div class="wz-foot"><button type="button" class="wz-back" data-wz="restart">Start again</button><button type="button" class="wz-browse" data-wz="browse">Browse every machine</button></div></div>';
  }
  function wzResultRefresh(){ var host=$('wz'); if(!host||host.hidden||wzSteps()[wz.step]!=='result') return; var y=$('qs-pick').scrollTop; host.innerHTML=resultHtml(); $('qs-pick').scrollTop=y; }
  // Clicks in the guided quote stop here. The result redraws itself on every
  // choice, which detaches the button that was clicked, so the browse area's
  // own handler further up could no longer tell where the click came from and
  // handled it a second time (the package went on and straight back off).
  $('wz').addEventListener('click',function(e){ e.stopPropagation(); });
  $('wz').addEventListener('click',function(e){
    var b=e.target.closest('[data-wz]'); if(!b) return;
    var k=b.getAttribute('data-wz'), v=b.getAttribute('data-val');
    if(k==='type'){ wz.type=v; wz.serve=(TYPES.filter(function(t){return t.id===v;})[0]||{serve:[]}).serve.slice(); wz.step=1; }
    else if(k==='serve'){ var i=wz.serve.indexOf(v); if(i>=0) wz.serve.splice(i,1); else wz.serve.push(v); b.setAttribute('aria-pressed',i>=0?'false':'true');
      var nx=$('wz').querySelector('[data-wz="next"]'); if(nx) nx.disabled=!wz.serve.length; applyAnswers(); render(); return; }
    else if(k==='next'){ wz.step++; }
    else if(k==='front'||k==='where'){ wz[k]=v; wz.step++; }
    else if(k==='back'){ wz.step=Math.max(0,wz.step-1); }
    else if(k==='restart'){ wz={step:0,type:null,serve:[],front:null,where:null,applied:false}; clearAll(); Q.forget(); }
    else if(k==='browse'){ $('wz').hidden=true; $('qs-browse').hidden=false; $('qs-pick').scrollTop=0; render(); return; }
    if(wzSteps()[wz.step]==='result'){ applyRecommendation(); }
    else if(k==='type'||k==='front'||k==='where'||k==='next'||k==='back'){ applyAnswers(); }
    wzDraw(); render();
  });
  // choices inside the result use the same kinds as the browse view
  $('wz').addEventListener('click',function(e){
    if(e.target.closest('[data-wz]')) return;
    var step=e.target.closest('button[data-d]');
    if(step){ var sid=step.getAttribute('data-id'); qty[sid]=Math.max(0,Math.min(20,qty[sid]+parseInt(step.getAttribute('data-d'),10))); dropUnusedParts(); render(); wzResultRefresh(); return; }
    var ctl=e.target.closest('[data-kind]'); if(!ctl) return;
    var id=ctl.getAttribute('data-id'), k=ctl.getAttribute('data-kind');
    if(k==='part') parts[id]=!parts[id];
    else if(k==='opt') opts[id]=!opts[id];
    else if(k==='unit') qty[id]=qty[id]>0?0:1;
    else if(k==='model'){ var fam=Q.FAMILIES.filter(function(x){return x.id===ctl.getAttribute('data-fam');})[0]; var n=Math.max(1,famCount(fam)); fam.models.forEach(function(m){qty[m]=0;}); qty[id]=n; dropUnusedParts(); }
    else if(k==='pkg'){ choosePackage(id); }
    render(); wzResultRefresh();
  });
  $('qs-guided').addEventListener('click',function(){ $('qs-browse').hidden=true; $('wz').hidden=false; wzEnter(); render(); });
  function wzEnter(){
    // a sheet opened holding a quote goes straight to the recommendation view of it
    var any=Q.MACHINES.concat(Q.ROBOTS).some(function(m){return qty[m.id]>0;});
    $('wz').hidden=false; $('qs-browse').hidden=true;
    // a quote the questions are still building stays on the questions
    if(any&&(wz.applied||!wz.type)){ wz.step=wzSteps().indexOf('result'); if(wz.step<0) wz.step=0; wz.applied=true; }
    wzDraw();
  }

  // ---- the tray and the total. Every number comes from the engine; the
  // sheet only draws it.
  function render(){
    var c=Q.compute(state()), count=c.count, cooks=(qty.fry||0)+(qty.noo||0), open=c.count+c.robots>0;
    var tabCount={food:0,robots:0,work:0,care:0}, faces=[];
    Q.MACHINES.forEach(function(m){ mark(m.id,qty[m.id]); if(qty[m.id]){ tabCount.food+=qty[m.id]; faces.push(m.img); } });
    Q.ROBOTS.forEach(function(r){ mark(r.id,qty[r.id]); if(qty[r.id]){ tabCount.robots+=qty[r.id]; faces.push(r.img); } });
    Q.OPTIONS.forEach(function(o){
      var amt=Q.optionAmount(o,count,cooks), card=$('qc-'+o.id);
      // an option that cannot apply to these machines comes off, and its card hides
      if(amt===null&&opts[o.id]&&count) opts[o.id]=false;
      if(card) card.hidden=!!count&&amt===null;
      var pv=$('qpv-'+o.id);
      if(pv){ pv.textContent=!open?'Priced on your machines':amt===null?'With a machine':money.format(amt)+(o.per==='month'?' a month':''); pv.classList.toggle('ask',!open||amt===null); }
      toggle(o.id,opts[o.id]);
      if(opts[o.id]) tabCount[o.group==='studio'?'work':'care']++;
    });
    Object.keys(tabCount).forEach(function(k){
      var el=$('qc-n-'+k); if(el) el.textContent=tabCount[k]?tabCount[k]+' added':'';
    });
    Q.FAMILIES.forEach(function(f){
      var n=famCount(f), el=$('qf-'+f.id); if(!el) return;
      el.classList.toggle('on',n>0); el.classList.toggle('open',openFam===f.id);
      var b=$('qfb-'+f.id); if(b) b.textContent=n||'';
      var a=el.querySelector('.add'); if(a) a.textContent=n?(openFam===f.id?'Done':'Change'):'Add';
      f.models.forEach(function(id){
        var mb=$('qm-'+id); if(mb) mb.setAttribute('aria-pressed',qty[id]>0?'true':'false');
        var cc=$('qcc-'+id); if(cc) cc.hidden=!(qty[id]>0)&&!(f.models.length===1);
      });
    });
    var cn=$('qs-conf-next'); if(cn) cn.textContent=nextLine();
    Q.PARTS.forEach(function(x){ var pb=$('qx-'+x.id); if(pb) pb.setAttribute('aria-pressed',parts[x.id]?'true':'false'); });
    ['work','care'].forEach(function(k){
      var lock=$('qs-'+k+'-lock'); if(lock) lock.hidden=open;
      var sec=$('qsec-'+k); if(sec) sec.classList.toggle('locked',!open);
    });

    var held=c.pkg; if(pkg&&(!held||held.id!==pkg)) pkg=null;
    Q.PACKAGES.forEach(function(p){
      var el=$('qc-pkg-'+p.id); if(!el) return; var on=!!held&&held.id===p.id;
      el.classList.toggle('on',on); el.querySelector('.qs-hit').setAttribute('aria-pressed',on?'true':'false');
      el.querySelector('.add').textContent=on?'Added':'Add';
    });
    var nPkg=$('qc-n-pkg'); if(nPkg) nPkg.textContent=held?'1 added':'';

    // the tray lists what was chosen; what the service includes is one line
    var lines=c.lines.filter(function(l){ return l.kind!=='included'&&l.kind!=='delivery'; });
    var ul=$('qs-lines');
    ul.innerHTML=lines.length?lines.map(function(l){
      var v=l.value===null?(l.note||'On request'):money.format(l.value)+(l.per==='month'?'/mo':'');
      return '<li><span class="t">'+(l.img?'<img src="'+l.img+'" alt="">':'')+'</span><span><b>'+esc(l.kind==='machine'?l.name:l.label)+'</b><small>'+esc(l.kind==='machine'?(l.n>1?l.n+' × ':'')+l.model:l.sub)+'</small></span>'+
             '<span class="v'+(l.value===null?' ask':'')+'">'+esc(v)+'</span></li>';
    }).join(''):'<li class="empty">Nothing yet. Pick a machine or a robot and it lands here, priced.</li>';

    var totalEl=$('dq-total'), noteEl=$('dq-note'), payEl=$('dq-pay');
    if(!open){
      totalEl.textContent=money.format(0);
      noteEl.textContent=c.asks?'Showroom robots are priced to order':'Pick a machine to start';
      if(payEl) payEl.textContent='';
    }else{
      totalEl.innerHTML=money.format(c.monthly)+'<small>a month</small>';
      noteEl.textContent=(wz.type&&!wz.applied&&!$('wz').hidden?'So far: ':'')+money.format(c.upfront)+' upfront, then '+money.format(c.service)+' a month for '+c.term+' months. Ex GST';
      if(payEl) payEl.textContent=count?nextLine():'';
    }
    $('qs-thumbs').innerHTML=faces.slice(0,5).map(function(src){return '<img src="'+src+'" alt="">';}).join('');
    $('qs-peek-t').textContent=lines.length?('See the '+lines.length+(lines.length===1?' line':' lines')):'Your quote';

    var q=Q.toQuery({qty:qty,parts:parts,opts:opts,pkg:held?held.id:null,site:carry.site});
    var go=$('want-go'); go.href=go.getAttribute('data-base')+q;
    // the cart: what is on the quote now is what any page opens on next
    if(open||c.asks) Q.save({q:q,wz:{type:wz.type,serve:wz.serve,front:wz.front,where:wz.where,applied:wz.applied}}); else if((Q.load()||{}).q) Q.save({q:'',wz:null});
    paintBar();
    var prop=$('want-proposal'); if(prop) prop.href=go.getAttribute('data-base')+'proposal/'+q;
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
               fry:'eoi-kitchen',noo:'eoi-kitchen',fitout:'eoi-fitout',space:'eoi-fitout',identity:'eoi-brand',web:'eoi-brand'};
  $('want-mail').addEventListener('click',function(){
    Object.keys(TO_BAND).forEach(function(id){
      var on=(qty[id]>0)||opts[id];
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
  var els = [].slice.call(document.querySelectorAll('.layer.bottom, .story figure:not(.diag), .catalogue .ph, .cat .ph, .venue .shot, .visit .peek a, .feature .card, .next .ph, .pdetail figure, .tiles li'));
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
