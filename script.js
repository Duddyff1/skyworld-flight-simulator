(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const airports = {
    KLAX:{name:"Los Angeles International",city:"LOS ANGELES",state:"California",lat:33.94,lon:-118.40},
    KSFO:{name:"San Francisco International",city:"SAN FRANCISCO",state:"California",lat:37.62,lon:-122.38},
    KJFK:{name:"John F. Kennedy International",city:"NEW YORK",state:"New York",lat:40.64,lon:-73.78},
    KSEA:{name:"Seattle–Tacoma International",city:"SEATTLE",state:"Washington",lat:47.45,lon:-122.31},
    KBOS:{name:"Boston Logan International",city:"BOSTON",state:"Massachusetts",lat:42.36,lon:-71.01},
    KDEN:{name:"Denver International",city:"DENVER",state:"Colorado",lat:39.86,lon:-104.67},
    KORD:{name:"Chicago O'Hare International",city:"CHICAGO",state:"Illinois",lat:41.97,lon:-87.91},
    KMIA:{name:"Miami International",city:"MIAMI",state:"Florida",lat:25.79,lon:-80.29}
  };
  const aircraftData={A320:{speed:447,range:3300},B737:{speed:453,range:3500},C172:{speed:122,range:640},B787:{speed:488,range:7300}};
  const state={page:"overview",running:false,paused:false,alt:0,speed:0,heading:270,throttle:35,pitch:0,bank:0,fuel:100,elapsed:0,flightHours:0,from:"KLAX",to:"KSEA",aircraft:"A320",weather:"clear",lastTick:0,frame:0};
  const canvas=$("#flightCanvas"),ctx=canvas.getContext("2d");
  let toastTimer, animationId;
  function toast(msg){const el=$("#toast");el.textContent=msg;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2500)}
  function showPage(page){state.page=page;$$(".page").forEach(p=>p.classList.toggle("active",p.id==="page-"+page));$$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===page));$("#pageCrumb").textContent=({overview:"Overview",simulator:"Flight simulator",flights:"Flight planner",fleet:"Fleet",airports:"Airports"})[page]||"Overview";if(page==="simulator")drawScene();window.scrollTo({top:0,behavior:"smooth"})}
  $$("[data-page]").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.page)));
  $$("[data-goto]").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.goto)));
  function distance(a,b){const rad=n=>n*Math.PI/180;const x=rad(airports[b].lat-airports[a].lat),y=rad(airports[b].lon-airports[a].lon);const h=Math.sin(x/2)**2+Math.cos(rad(airports[a].lat))*Math.cos(rad(airports[b].lat))*Math.sin(y/2)**2;return 3440.065*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))}
  function duration(){const d=distance(state.from,state.to),s=aircraftData[state.aircraft].speed;return Math.max(1,Math.round(d/s*60))}
  function updateRoute(){state.from=$("#departure").value;state.to=$("#arrival").value;state.aircraft=$("#aircraftSelect").value;state.weather=$("#weatherSelect").value;const a=airports[state.from],b=airports[state.to],d=Math.round(distance(state.from,state.to));$("#mapFrom").innerHTML=`${a.city} <b>${state.from}</b>`;$("#mapTo").innerHTML=`${b.city} <b>${state.to}</b>`;const mins=duration();$("#routeDuration").textContent=mins>=60?`${Math.floor(mins/60)}h ${String(mins%60).padStart(2,"0")}m`:`${mins} min` ;$("#routeDistance").textContent=`${d.toLocaleString()} NM`;$("#simAircraft").textContent=state.aircraft;$("#simRoute").textContent=`${state.from} → ${state.to}`;drawScene()}
  $("#departure").addEventListener("change",updateRoute);$("#arrival").addEventListener("change",updateRoute);$("#aircraftSelect").addEventListener("change",updateRoute);$("#weatherSelect").addEventListener("change",updateRoute);
  $("#swapAirports").addEventListener("click",()=>{const d=$("#departure"),a=$("#arrival"),v=d.value;d.value=a.value;a.value=v;updateRoute()});
  function setRoute(route){const [a,b]=route.split("-");if(airports[a]&&airports[b]){$("#departure").value=a;$("#arrival").value=b;updateRoute();toast(`Route loaded: ${a} → ${b}`)}}
  $$("[data-route]").forEach(b=>b.addEventListener("click",()=>{setRoute(b.dataset.route);showPage("flights")}));
  $("#launchRoute").addEventListener("click",()=>{updateRoute();showPage("simulator");startFlight()});
  $$(".choose-aircraft").forEach(b=>b.addEventListener("click",()=>{$("#aircraftSelect").value=b.dataset.aircraft;updateRoute();showPage("flights");toast(`${b.dataset.aircraft} selected for your next flight`)}));
  $("#throttle").addEventListener("input",e=>{state.throttle=+e.target.value;$("#throttleLabel").textContent=state.throttle+"%";updateHUD()});
  $("#pitch").addEventListener("input",e=>{state.pitch=+e.target.value;$("#pitchLabel").textContent=state.pitch+"°";updateHUD()});
  $("#bank").addEventListener("input",e=>{state.bank=+e.target.value;$("#bankLabel").textContent=state.bank+"°";updateHUD()});
  $("#startFlightBtn").addEventListener("click",startFlight);
  function startFlight(){state.running=true;state.paused=false;state.lastTick=performance.now();$("#simStartOverlay").classList.add("hidden");$("#simState").textContent="IN FLIGHT";$("#simState").style.color="#249e7a";$("#simToast").textContent="Flight started — have a safe journey";$("#simToast").classList.add("show");setTimeout(()=>$("#simToast").classList.remove("show"),2200);toast("Flight simulation started");}
  function endFlight(){if(state.running){state.running=false;state.flightHours+=state.elapsed/3600;$("#hoursStat").textContent=state.flightHours.toFixed(1).padStart(4,"0");toast("Flight ended. Session saved in this browser.")}state.paused=false;$("#simState").textContent="ON STANDBY";$("#simState").style.color="#259c78";$("#simStartOverlay").classList.remove("hidden");$("#simStartOverlay h3").textContent="Flight complete";$("#simStartOverlay p").textContent="Ready to take another flight?";$("#startFlightBtn").textContent="Start another flight";updateHUD()}
  $("#endFlightBtn").addEventListener("click",endFlight);
  $("#checklistBtn").addEventListener("click",()=>{const checks=$$(".checklist input[type=checkbox]");checks.forEach(c=>c.checked=true);toast("Pre-flight checklist complete. You're cleared to depart.")});
  document.addEventListener("keydown",e=>{if(["INPUT","SELECT","TEXTAREA"].includes(document.activeElement.tagName))return;const key=e.key.toLowerCase();if(key===" "){e.preventDefault();if(state.running){state.paused=!state.paused;$("#simState").textContent=state.paused?"PAUSED":"IN FLIGHT";toast(state.paused?"Simulation paused":"Simulation resumed")}return}if(key==="w")$("#pitch").value=Math.min(12,+$("#pitch").value+1);else if(key==="s")$("#pitch").value=Math.max(-12,+$("#pitch").value-1);else if(key==="a")$("#bank").value=Math.max(-35,+$("#bank").value-3);else if(key==="d")$("#bank").value=Math.min(35,+$("#bank").value+3);else if(key==="arrowup")$("#throttle").value=Math.min(100,+$("#throttle").value+5);else if(key==="arrowdown")$("#throttle").value=Math.max(0,+$("#throttle").value-5);else return;$("#pitch").dispatchEvent(new Event("input"));$("#bank").dispatchEvent(new Event("input"));$("#throttle").dispatchEvent(new Event("input"))});
  $("#fullscreenBtn").addEventListener("click",()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.().catch(()=>toast("Fullscreen is unavailable in this browser"));else document.exitFullscreen?.()});
  const airportGrid=$("#airportGrid");
  function renderAirports(filter=""){airportGrid.innerHTML="";Object.entries(airports).filter(([code,a])=>(code+" "+a.name+" "+a.city+" "+a.state).toLowerCase().includes(filter.toLowerCase())).forEach(([code,a])=>{const el=document.createElement("article");el.className="airport-card";el.innerHTML=`<div class="airport-card-top"><span class="airport-code">${code}</span><span class="airport-pin">⌖</span></div><h3>${a.name}</h3><p>${a.city}, ${a.state}</p><button data-airport="${code}">Plan flight from here →</button>`;airportGrid.appendChild(el)});$$("[data-airport]",airportGrid).forEach(b=>b.addEventListener("click",()=>{$("#departure").value=b.dataset.airport;updateRoute();showPage("flights");toast(`${b.dataset.airport} set as departure airport`)}))}
  $("#airportSearch").addEventListener("input",e=>renderAirports(e.target.value));
  function updateHUD(){const alt=Math.max(0,Math.round(state.alt/100)*100),spd=Math.round(state.speed),heading=((Math.round(state.heading)%360)+360)%360;$("#hudAlt").textContent=String(alt).padStart(4,"0");$("#hudSpeed").textContent=String(spd).padStart(3,"0");$("#hudHeading").textContent=String(heading).padStart(3,"0")+"°";$("#hudThrottle").textContent=state.throttle+"%";$("#vspeed").textContent=(state.running&& !state.paused?Math.round(state.pitch*180):0)+" ft/min";$("#vspeedBar").style.width=Math.max(5,Math.min(95,50+state.pitch*3))+"%";$("#fuelLabel").textContent=Math.round(state.fuel)+"%";$("#fuelBar").style.width=state.fuel+"%";const sec=Math.floor(state.elapsed);$("#flightTime").textContent=String(Math.floor(sec/60)).padStart(2,"0")+":"+String(sec%60).padStart(2,"0")}
  function resizeCanvas(){const r=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.max(1,Math.floor(r.width*dpr));canvas.height=Math.max(1,Math.floor(r.height*dpr));ctx.setTransform(dpr,0,0,dpr,0,0);drawScene()}
  function drawScene(){if(!ctx)return;const w=canvas.clientWidth||700,h=canvas.clientHeight||400;if(!w||!h)return;const t=state.frame*.003,bank=state.bank/35,pitch=state.pitch/12;const grad=ctx.createLinearGradient(0,0,0,h);let skyTop="#4b91c7",skyBottom="#d6e8ef";if(state.weather==="sunset"){skyTop="#4b548e";skyBottom="#f7b87c"}if(state.weather==="storm"){skyTop="#293d58";skyBottom="#8a9baa"}if(state.weather==="cloudy"){skyTop="#6e9fc3";skyBottom="#d2e0e8"}grad.addColorStop(0,skyTop);grad.addColorStop(1,skyBottom);ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
    ctx.save();ctx.translate(w/2,h*.48);ctx.rotate(-bank*.13);ctx.translate(-w/2,h*.48);
    const horizon=h*(.46+pitch*.18+Math.sin(t)*.004);ctx.fillStyle=state.weather==="storm"?"#687b82":"#718e8a";ctx.beginPath();ctx.moveTo(0,horizon);ctx.lineTo(w,horizon);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.closePath();ctx.fill();
    // distant mountain silhouettes
    for(let layer=0;layer<3;layer++){ctx.beginPath();ctx.moveTo(0,horizon+layer*10);for(let x=0;x<=w+30;x+=30){const y=horizon+layer*13+Math.sin(x*.012+layer*2+t*.4)*(12+layer*6)+Math.sin(x*.032+layer)*7;ctx.lineTo(x,y)}ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.closePath();ctx.fillStyle=["#829eaa","#688b91","#547d7e"][layer];ctx.globalAlpha=.6+layer*.13;ctx.fill()}ctx.globalAlpha=1;
    // ground/runway approach perspective
    ctx.fillStyle="#4f716e";ctx.beginPath();ctx.moveTo(w*.43,horizon+18);ctx.lineTo(w*.57,horizon+18);ctx.lineTo(w*.88,h);ctx.lineTo(w*.12,h);ctx.closePath();ctx.fill();
    ctx.fillStyle="#414d5a";ctx.beginPath();ctx.moveTo(w*.485,horizon+20);ctx.lineTo(w*.515,horizon+20);ctx.lineTo(w*.68,h);ctx.lineTo(w*.32,h);ctx.closePath();ctx.fill();
    ctx.strokeStyle="#f3f1dc";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(w*.5,horizon+25);ctx.lineTo(w*.5,h);ctx.stroke();
    for(let i=0;i<8;i++){const y=horizon+32+i*i*3;const width=3+i*1.4;ctx.fillStyle="#f9f7df";ctx.fillRect(w/2-width/2,y,width,Math.max(2,i*1.2))}
    // clouds
    for(let i=0;i<8;i++){let x=((i*173+t*18)% (w+140))-70;let y=35+(i*47%(h*.34));drawCloud(ctx,x,y,0.45+(i%3)*.16)}
    ctx.restore();
    // aircraft silhouette and cockpit frame
    ctx.save();ctx.translate(w/2,h*.56);ctx.fillStyle="#f5f8fc";ctx.strokeStyle="#233e5c";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,-24);ctx.lineTo(5,-3);ctx.lineTo(55,13);ctx.lineTo(55,19);ctx.lineTo(5,12);ctx.lineTo(4,32);ctx.lineTo(17,40);ctx.lineTo(17,44);ctx.lineTo(0,39);ctx.lineTo(-17,44);ctx.lineTo(-17,40);ctx.lineTo(-4,32);ctx.lineTo(-5,12);ctx.lineTo(-55,19);ctx.lineTo(-55,13);ctx.lineTo(-5,-3);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
    // subtle glass vignette
    const vg=ctx.createRadialGradient(w/2,h/2,h*.2,w/2,h/2,h*.8);vg.addColorStop(0,"transparent");vg.addColorStop(1,"#071b2d75");ctx.fillStyle=vg;ctx.fillRect(0,0,w,h);
  }
  function drawCloud(c,x,y,s){c.save();c.translate(x,y);c.scale(s,s);c.fillStyle="#ffffffb8";c.beginPath();c.arc(0,8,17,0,Math.PI*2);c.arc(18,0,22,0,Math.PI*2);c.arc(39,9,15,0,Math.PI*2);c.arc(21,14,20,0,Math.PI*2);c.fill();c.restore()}
  function loop(now){const dt=Math.min(.1,(now-(state.lastTick||now))/1000);state.lastTick=now;state.frame++;if(state.running&&!state.paused){state.elapsed+=dt;const target=aircraftData[state.aircraft].speed*state.throttle/100;state.speed+=(target-state.speed)*Math.min(1,dt*.22);state.alt=Math.max(0,state.alt+state.pitch*95*dt+(state.speed>55?state.pitch*8*dt:0));state.heading+=state.bank*.16*dt;state.fuel=Math.max(0,state.fuel-dt*(.002+state.throttle*.00012));if(state.fuel<=0){state.running=false;$("#simState").textContent="FUEL EMPTY";toast("Fuel depleted. Flight ended.");$("#simStartOverlay").classList.remove("hidden")}updateHUD()}if(state.page==="simulator"&&state.frame%2===0)drawScene();animationId=requestAnimationFrame(loop)}
  window.addEventListener("resize",resizeCanvas);renderAirports();updateRoute();resizeCanvas();requestAnimationFrame(loop);
})();