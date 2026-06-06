"use strict";

/* ===========================================================
   Lower the Bar — modular app
   Loads plan from /data/*.json. App code never contains plan content.
   Data layers:  exercises (atoms) <- templates (days) <- schedule (dates)
                 phases (progression params + unlock criteria)
   =========================================================== */

var DATA = { exercises:null, phases:null, templates:null, schedule:null };
var BASE = "data/";

var ENERGY_OPTIONS = [
  { value:1, emoji:"\ud83d\ude34", label:"Drained" },
  { value:2, emoji:"\ud83d\ude10", label:"Okay" },
  { value:3, emoji:"\ud83d\ude0a", label:"Good" },
  { value:4, emoji:"\u26a1", label:"Strong" }
];
var FEEL_OPTIONS = [
  { value:"hard", emoji:"\ud83d\ude13", label:"Tough" },
  { value:"ok", emoji:"\ud83d\udc4d", label:"Solid" },
  { value:"great", emoji:"\ud83c\udf1f", label:"Great" }
];
// Intentions tagged by phase (1-4) or "any".
// "any" = always eligible. Phase-tagged = weighted toward that phase but can appear in others.
var INTENTION_POOL = [
  // Phase 1 — starting, lowering the bar, just showing up
  { text:"Lower the bar. Step over it. Repeat.", phase:1 },
  { text:"The bar is: did I start? That's it.", phase:1 },
  { text:"Done > perfect. No exceptions.", phase:1 },
  { text:"Messy execution still counts.", phase:1 },
  { text:"Just start. Figure the rest out after.", phase:1 },
  { text:"Perfect isn't coming. Start anyway.", phase:1 },
  { text:"You don't have to feel like it. You just have to do it. Feelings: optional.", phase:1 },
  { text:"Ankle mob at minimum. The rest is gravy.", phase:1 },

  // Phase 2 — consistency, habit formation, showing up twice
  { text:"You're not building fitness. You're building a person who does this.", phase:2 },
  { text:"Habit: noun. Something you do before you decide not to.", phase:2 },
  { text:"The streak is a side effect. The showing up is the thing.", phase:2 },
  { text:"Consistency is just showing up until it stops being a decision.", phase:2 },
  { text:"Two weeks in. The routine is the point. Always was.", phase:2 },
  { text:"It gets easier. Not today, probably. But you won't know until you keep going.", phase:2 },
  { text:"Your future self is rooting for you. Annoyingly.", phase:2 },
  { text:"Identity first, results second. You're someone who does this now.", phase:2 },

  // Phase 3 — form, deliberate practice, mind-muscle
  { text:"This week: feel the movement, don't just do the movement.", phase:3 },
  { text:"Slow is smooth. Smooth is correct. Correct is the whole game.", phase:3 },
  { text:"Quality reps > quantity reps. No exceptions, not even today.", phase:3 },
  { text:"Squeeze the right glute like it owes you money.", phase:3 },
  { text:"Form is free gains. Sloppy is just sloppy with extra steps.", phase:3 },
  { text:"Your nervous system is taking notes. Make them good ones.", phase:3 },
  { text:"This phase is about talking to your body. It's a weird conversation. Have it.", phase:3 },
  { text:"Mind-muscle connection: not woo. Just paying attention. Try it.", phase:3 },

  // Phase 4 — strength, maintenance, owning it
  { text:"Phase 4. You didn't quit. That's a whole personality now.", phase:4 },
  { text:"Strong enough to do the thing. That was always the goal.", phase:4 },
  { text:"Maintenance isn't coasting. It's holding what you built.", phase:4 },
  { text:"The reps compound. So does the identity.", phase:4 },
  { text:"Reassess, don't rush. Phase 4 is not a finish line. It's a floor.", phase:4 },
  { text:"You're training to be functional at 80. Respect the timeline.", phase:4 },

  // Any phase — general wit
  { text:"Functional beats perfect. Again.", phase:"any" },
  { text:"Showing up counts even when it's ugly.", phase:"any" },
  { text:"The routine doesn't care how you felt about it.", phase:"any" },
  { text:"Good enough got you here. Let it continue.", phase:"any" },
  { text:"Skip the guilt, just start tomorrow.", phase:"any" },
  { text:"Progress is embarrassingly nonlinear. Do it anyway.", phase:"any" },
  { text:"Every rep is either practice or proof. Pick one.", phase:"any" },
  { text:"You're not behind. There's no schedule. There's just next.", phase:"any" }
];

function pickWeekIntentions(){
  var ph=phaseNumber();
  // Split pool into current-phase-relevant and the rest
  var primary=INTENTION_POOL.filter(function(i){ return i.phase===ph||i.phase==="any"; });
  var secondary=INTENTION_POOL.filter(function(i){ return i.phase!==ph&&i.phase!=="any"; });
  // Shuffle both
  function shuffle(arr){ var a=arr.slice(); for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i];a[i]=a[j];a[j]=t; } return a; }
  primary=shuffle(primary); secondary=shuffle(secondary);
  // Pick 4 from primary, 1 wildcard from secondary, return texts
  var chosen=primary.slice(0,4).concat(secondary.slice(0,1));
  return shuffle(chosen).map(function(i){ return i.text; });
}
var BONUS_POOL = [
  { id:"dance", emoji:"\ud83d\udd7a", title:"Mini dance party", desc:"One song. No audience. Full commitment.", tag:"any" },
  { id:"balance1", emoji:"\ud83e\udda9", title:"Balance stand", desc:"30 sec each foot. Eyes closed if you're feeling bold.", tag:"any" },
  { id:"plank", emoji:"\ud83e\udeb5", title:"Plank hold", desc:"However long. No target \u2014 just see what's there today.", tag:"any" },
  { id:"wallsit", emoji:"\ud83e\ude91", title:"Wall sit", desc:"Sit against a wall until your legs have opinions. Then stop.", tag:"upper" },
  { id:"hang", emoji:"\ud83d\ude48", title:"Dead hang", desc:"Find something to hang from. Stay as long as you've got.", tag:"lower" },
  { id:"outside", emoji:"\ud83c\udf24\ufe0f", title:"Stand outside", desc:"Five minutes. No phone. Just exist in the world.", tag:"any" },
  { id:"shake", emoji:"\ud83d\udc15", title:"Shake it out", desc:"Shake your arms and legs like a golden retriever for 30 seconds.", tag:"any" },
  { id:"breathe", emoji:"\ud83e\udec1", title:"4-7-8 breathing", desc:"Inhale 4 counts, hold 7, exhale 8. Do 4 rounds.", tag:"any" },
  { id:"meditate", emoji:"\ud83e\uddd8", title:"5 min sit", desc:"Set a timer. Sit somewhere quiet. Notice what happens.", tag:"any" },
  { id:"walk", emoji:"\ud83d\udc5f", title:"Walk to the end of the street", desc:"And back. For no reason at all. Counts anyway.", tag:"any" },
  { id:"stretch", emoji:"\ud83c\udf0a", title:"5 min full body stretch", desc:"Whatever feels good. No rules. Follow what's tight.", tag:"any" }
];
var BONUS_COMPLETIONS = {
  dance:["Golden retriever energy: achieved.","Nobody saw that. It still counts."],
  shake:["Physiologically questionable. Felt great.","You vibrated like a golden retriever. No notes."],
  meditate:["You sat with yourself. That's not nothing."],
  "default":["That was extra and it counted.","Bonus done. You didn't have to. You did."]
};
function getBonusCompletion(id){ var p = BONUS_COMPLETIONS[id] || BONUS_COMPLETIONS["default"]; return p[Math.floor(Math.random()*p.length)]; }
function pickBonus(tag, exclude){
  exclude = exclude || [];
  var elig = BONUS_POOL.filter(function(b){
    if(exclude.indexOf(b.id)!==-1) return false;
    if(b.tag==="any") return true;
    if(tag==="glute" && b.tag==="upper") return true;
    if(tag==="strength" && b.tag==="lower") return true;
    return false;
  });
  var pool = elig.length ? elig : BONUS_POOL;
  return pool[Math.floor(Math.random()*pool.length)];
}

var TAG_COLORS = { glute:"#5a9e8a", cardio:"#4a8ab5", strength:"#8a6eb5", yoga:"#b07a5a", rest:"#9aaa8a" };
var DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
var DAY_FULL = { Mon:"Monday", Tue:"Tuesday", Wed:"Wednesday", Thu:"Thursday", Fri:"Friday", Sat:"Saturday", Sun:"Sunday" };
var DAY_ORDER = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

/* ---------- storage ---------- */
function loadStore(){ try { return JSON.parse(localStorage.getItem("ltbData")||"{}"); } catch(e){ return {}; } }
function saveStore(d){ try { localStorage.setItem("ltbData", JSON.stringify(d)); } catch(e){} }
var store = loadStore();

/* ---------- date / schedule resolution ---------- */
function todayMidnight(){ var n=new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
function ymd(d){ return d.toISOString().slice(0,10); }
function parseYMD(s){ return new Date(s+"T00:00:00"); }

// Apply the schedule shift: the effective date used for plan lookups.
function effectiveDate(realDate){
  var shift = (DATA.schedule.shiftDays||0);
  var d = new Date(realDate); d.setDate(d.getDate() - shift);
  return d;
}
function weekdayOf(d){ return DAY_NAMES[d.getDay()]; }

// Which template runs on a given REAL calendar date (honors overrides + shift).
function templateIdForDate(realDateStr){
  var ov = DATA.schedule.overrides || {};
  if(ov[realDateStr]) return ov[realDateStr];
  var eff = effectiveDate(parseYMD(realDateStr));
  return DATA.schedule.weekly[ weekdayOf(eff) ];
}

// Plan week number (1-based) for a real date, via anchor + shift.
function planWeekForDate(realDateStr){
  var anchor = parseYMD(DATA.schedule.anchorDate);
  var eff = effectiveDate(parseYMD(realDateStr));
  var diff = Math.floor((eff - anchor)/86400000);
  return Math.max(1, Math.floor(diff/7)+1);
}

// Current phase: based on manual progression stored in `store.phaseIndex`,
// falling back to suggested-by-week if never set.
function currentPhase(){
  if(typeof store.phaseIndex === "number"){
    return DATA.phases[Math.max(0, Math.min(store.phaseIndex, DATA.phases.length-1))];
  }
  // fallback: suggested by elapsed weeks
  var wk = planWeekForDate(ymd(todayMidnight()));
  var acc = 0;
  for(var i=0;i<DATA.phases.length;i++){ acc += DATA.phases[i].suggestedWeeks; if(wk<=acc) return DATA.phases[i]; }
  return DATA.phases[DATA.phases.length-1];
}
function phaseNumber(){ return currentPhase().order; }

/* ---------- app state ---------- */
var INFO = {};
function recomputeInfo(){
  var tm = todayMidnight();
  INFO.todayKey = ymd(tm);
  INFO.dayIndex = (tm.getDay()===0?6:tm.getDay()-1); // Mon=0..Sun=6
  INFO.weekMondayKey = (function(){ var m=new Date(tm); m.setDate(tm.getDate()-INFO.dayIndex); return ymd(m); })();
  INFO.phase = currentPhase();
  INFO.planWeek = planWeekForDate(INFO.todayKey);
}

var state = {
  selectedDay: 0,
  hardMode: false,
  view: "session",
  showIntentionPicker: false,
  writingOwn: false,
  customIntention: "",
  bonusRevealed: false,
  currentBonus: null,
  seenBonusIds: [],
  refreshesLeft: 2,
  showUnlock: false,
  refFilter: "all"
};

/* date of the selected weekday within the CURRENT real week */
function selectedDateKey(){
  var monday = parseYMD(INFO.weekMondayKey);
  var d = new Date(monday); d.setDate(monday.getDate()+state.selectedDay);
  return ymd(d);
}
function selectedIsFuture(){ return selectedDateKey() > INFO.todayKey; }
function weekData(){ return store["week-"+INFO.weekMondayKey] || {}; }
function dayKey(){ return selectedDateKey(); }
function dayData(){ return store[dayKey()] || {}; }
function ankleKey(){ return "ankle-"+selectedDateKey(); }
function ankleDone(){ return !!store[ankleKey()]; }

/* selected template + resolved exercises (filtered by phase) */
function selectedTemplate(){
  var tid = templateIdForDate(selectedDateKey());
  return { id:tid, tpl:DATA.templates[tid] };
}
function exForPhase(ids){
  var ph = phaseNumber();
  var out = [];
  ids.forEach(function(id){
    var ex = DATA.exercises[id]; if(!ex) return;
    if(ex.minPhase && ph < ex.minPhase) return;       // not yet introduced
    if(ex.phaseDose && !ex.phaseDose[String(ph)] && !ex.defaultDose) return;
    out.push({ id:id, ex:ex });
  });
  return out;
}
function doseFor(ex){
  var ph = String(phaseNumber());
  if(ex.phaseDose && ex.phaseDose[ph]) return ex.phaseDose[ph];
  if(ex.defaultDose) return ex.defaultDose;
  return "";
}

/* ---------- mutations ---------- */
function update(key, obj){ var cur=store[key]||{}; var n={}; for(var k in cur)n[k]=cur[k]; for(var k2 in obj)n[k2]=obj[k2]; store[key]=n; saveStore(store); }
function updateDayData(o){ update(dayKey(), o); render(); }
function updateWeekData(o){ update("week-"+INFO.weekMondayKey, o); render(); }
function toggleAnkle(){ if(selectedIsFuture()) return; store[ankleKey()] = !store[ankleKey()]; saveStore(store); render(); }

function checksKey(){ return "checks-"+selectedDateKey()+"-"+(state.hardMode?"hard":"normal"); }
function getChecks(){ return store[checksKey()] || {}; }
function isChecked(i){ return !!getChecks()[i]; }
function toggleChecked(i){ if(selectedIsFuture()) return; var c=getChecks(); var n={}; for(var k in c)n[k]=c[k]; n[i]=!n[i]; store[checksKey()]=n; saveStore(store); }
function allChecked(list){ if(!list.length) return false; var c=getChecks(); for(var i=0;i<list.length;i++){ if(!c[i]) return false; } return true; }

function maybeMarkComplete(list){
  if(selectedIsFuture()) return;
  var complete = allChecked(list);
  var dd = dayData();
  if(complete && !dd.completed) update(dayKey(), { completed:true, mode: state.hardMode?"hard":"normal" });
  else if(!complete && dd.completed) update(dayKey(), { completed:false });
}

/* ---------- history ---------- */
function buildHistory(){
  var out=[];
  for(var i=0;i<7;i++){
    var d=todayMidnight(); d.setDate(d.getDate()-(6-i));
    var key=ymd(d);
    var tid=templateIdForDate(key); var tpl=DATA.templates[tid];
    var data=store[key]||{};
    out.push({ key:key, tid:tid, tpl:tpl, data:data, isToday:key===INFO.todayKey, isRest:tpl&&tpl.tag==="rest" });
  }
  return out;
}
function streakCount(){
  var h=buildHistory(), c=0;
  for(var i=h.length-1;i>=0;i--){ var e=h[i]; if(e.isRest){c++;continue;} if(e.data.completed||e.data.energyBefore)c++; else if(e.isToday)continue; else break; }
  return c;
}

/* ---------- DOM helper ---------- */
function el(tag, attrs, kids){
  var e=document.createElement(tag);
  if(attrs) for(var k in attrs){
    if(k==="style") e.setAttribute("style",attrs[k]);
    else if(k==="onclick") e.addEventListener("click",attrs[k]);
    else if(k==="oninput") e.addEventListener("input",attrs[k]);
    else e.setAttribute(k,attrs[k]);
  }
  if(kids!=null){ if(!Array.isArray(kids))kids=[kids]; kids.forEach(function(c){ if(c==null||c===false)return; if(typeof c==="string"||typeof c==="number")e.appendChild(document.createTextNode(String(c))); else e.appendChild(c); }); }
  return e;
}
function findOpt(arr,v){ for(var i=0;i<arr.length;i++) if(arr[i].value===v) return arr[i]; return null; }
function sectionLabel(t){ return el("div",{style:"font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#9a8a7a;margin-bottom:7px;font-weight:bold;"},t); }

/* ---------- render ---------- */
var root;
function render(){
  recomputeInfo();
  root.innerHTML="";
  if(state.showIntentionPicker){ root.appendChild(renderIntentionPicker()); return; }
  var wrap=el("div",{style:"min-height:100vh;background:#f5f0ea;"});
  wrap.appendChild(renderHeader());
  wrap.appendChild(renderTabs());
  if(state.view==="session") wrap.appendChild(renderDaySelector());
  var body=el("div",{style:"padding:16px 18px;max-width:580px;margin:0 auto;"});
  if(state.view==="session") renderSession(body);
  else if(state.view==="history") renderHistory(body);
  else if(state.view==="reference") renderReference(body);
  wrap.appendChild(body);
  root.appendChild(wrap);
}

function renderIntentionPicker(){
  var c=el("div",{style:"min-height:100vh;background:#f5f0ea;padding:32px 20px;"});
  var inner=el("div",{style:"max-width:500px;margin:0 auto;"});
  inner.appendChild(el("div",{style:"font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#9a8a7a;margin-bottom:8px;"},"Week "+INFO.planWeek+" \u00b7 Phase "+INFO.phase.order+" intention"));
  inner.appendChild(el("div",{style:"font-size:20px;font-weight:bold;color:#2d3a2e;margin-bottom:6px;"},"Pick a phrase for this week."));
  inner.appendChild(el("div",{style:"font-size:13px;color:#7a6a5a;margin-bottom:24px;line-height:1.5;"},"Five options, picked for where you are in the plan. Choose the one that feels true right now, not the one that sounds best."));
  if(!state.writingOwn){
    // Load or generate this week's choices and persist them so they're stable
    var wd=weekData();
    var choices=wd.intentionChoices;
    if(!choices||!choices.length){ choices=pickWeekIntentions(); update("week-"+INFO.weekMondayKey,{intentionChoices:choices}); }
    var list=el("div",{style:"display:flex;flex-direction:column;gap:8px;margin-bottom:14px;"});
    choices.forEach(function(it){
      var selected=wd.intention===it;
      list.appendChild(el("button",{style:"padding:13px 16px;background:"+(selected?"#2d3a2e":"#fff")+";border:2px solid "+(selected?"#2d3a2e":"#d0c8bc")+";border-radius:10px;font-size:14px;color:"+(selected?"#e8dfd0":"#3a3028")+";text-align:left;line-height:1.4;",onclick:function(){ state.showIntentionPicker=false; updateWeekData({intention:it}); }},it));
    });
    inner.appendChild(list);
    inner.appendChild(el("button",{style:"width:100%;padding:11px 16px;background:transparent;border:2px dashed #c0b8b0;border-radius:10px;font-size:13px;color:#7a6a5a;",onclick:function(){ state.writingOwn=true; render(); }},"Write my own\u2026"));
    inner.appendChild(el("button",{style:"width:100%;margin-top:10px;padding:10px;background:transparent;border:none;font-size:12px;color:#aaa098;",onclick:function(){ state.showIntentionPicker=false; render(); }},"Skip for now"));
  } else {
    var ta=el("textarea",{placeholder:"Write something that means something to you this week\u2026",style:"width:100%;min-height:80px;padding:12px 14px;background:#fff;border:2px solid #d0c8bc;border-radius:10px;font-size:14px;color:#3a3028;resize:none;box-sizing:border-box;outline:none;margin-bottom:10px;",oninput:function(e){ state.customIntention=e.target.value; }});
    ta.value=state.customIntention; inner.appendChild(ta);
    var row=el("div",{style:"display:flex;gap:8px;"});
    row.appendChild(el("button",{style:"flex:1;padding:12px;background:#2d3a2e;color:#e8dfd0;border:none;border-radius:10px;font-size:14px;",onclick:function(){ if(state.customIntention.trim()){ state.showIntentionPicker=false; updateWeekData({intention:state.customIntention.trim()}); } }},"Set this"));
    row.appendChild(el("button",{style:"padding:12px 16px;background:transparent;border:2px solid #d0c8bc;border-radius:10px;font-size:13px;color:#7a6a5a;",onclick:function(){ state.writingOwn=false; render(); }},"Back"));
    inner.appendChild(row);
  }
  c.appendChild(inner); return c;
}

function renderHeader(){
  var ph=INFO.phase, wd=weekData(), sc=streakCount();
  var h=el("div",{style:"background:#2d3a2e;color:#e8dfd0;padding:18px 22px 14px;"});
  h.appendChild(el("div",{style:"font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#9ab090;margin-bottom:3px;"},"12-Week Glute, Joint & Stability Plan"));
  var row=el("div",{style:"display:flex;align-items:center;justify-content:space-between;margin-bottom:3px;"});
  var title=el("div",{style:"font-size:19px;font-weight:bold;"}); title.appendChild(document.createTextNode("Week "+INFO.planWeek+" \u00b7 ")); title.appendChild(el("span",{style:"color:"+ph.color+";"},ph.label));
  row.appendChild(title);
  if(sc>1) row.appendChild(el("div",{style:"font-size:13px;color:#c49a8a;font-weight:bold;"},"\ud83d\udd25 "+sc+" days"));
  h.appendChild(row);
  h.appendChild(el("div",{style:"font-size:12px;color:#b0bfa8;margin-bottom:10px;"},ph.duration+" \u00b7 "+ph.focus));
  if(wd.intention){
    var ib=el("div",{style:"background:#1a2318;border-radius:7px;padding:8px 12px;font-size:12px;color:#9ab090;font-style:italic;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;",onclick:function(){ state.showIntentionPicker=true; render(); }});
    ib.appendChild(el("span",null,'"'+wd.intention+'"')); ib.appendChild(el("span",{style:"font-size:10px;color:#5a6a50;margin-left:8px;flex-shrink:0;"},"change"));
    h.appendChild(ib);
  }
  var bar=el("div",{style:"background:#1a2318;border-radius:4px;height:4px;overflow:hidden;"});
  bar.appendChild(el("div",{style:"height:100%;width:"+((ph.order/4)*100)+"%;background:"+ph.color+";border-radius:4px;"}));
  h.appendChild(bar);
  var sub=el("div",{style:"display:flex;align-items:center;justify-content:space-between;margin-top:3px;"});
  sub.appendChild(el("div",{style:"font-size:11px;color:#6a7a60;"},"Phase "+ph.order+" of 4"));
  sub.appendChild(el("div",{style:"font-size:11px;color:#9ab090;text-decoration:underline;",onclick:function(){ state.showUnlock=!state.showUnlock; state.view="history"; render(); }},"progression"));
  h.appendChild(sub);
  return h;
}

function renderTabs(){
  var ph=INFO.phase;
  var tabs=[{id:"session",label:"Session"},{id:"history",label:"This Week"},{id:"reference",label:"Reference"}];
  var bar=el("div",{style:"background:#e8e0d4;border-bottom:2px solid #d0c8bc;display:flex;"});
  tabs.forEach(function(t){
    var a=state.view===t.id;
    bar.appendChild(el("button",{style:"flex:1;padding:10px 0;background:"+(a?"#f5f0ea":"transparent")+";border:none;border-bottom:"+(a?"3px solid "+ph.color:"3px solid transparent")+";font-size:13px;color:"+(a?"#2d3a2e":"#7a6a5a")+";font-weight:"+(a?"bold":"normal")+";",onclick:function(){ state.view=t.id; render(); }},t.label));
  });
  return bar;
}

function renderDaySelector(){
  var bar=el("div",{"class":"scroll-x",style:"background:#ede8e0;padding:9px 14px;display:flex;gap:6px;overflow-x:auto;border-bottom:1px solid #d8d0c4;"});
  DAY_ORDER.forEach(function(wd,i){
    var monday=parseYMD(INFO.weekMondayKey); var dd=new Date(monday); dd.setDate(monday.getDate()+i); var dkey=ymd(dd);
    var tid=templateIdForDate(dkey); var tpl=DATA.templates[tid];
    var active=state.selectedDay===i; var td=(dkey===INFO.todayKey);
    var done=store[dkey]&&store[dkey].completed;
    var label=wd+(done&&!active?" \u2713":"")+(td?" \u25cf":"");
    bar.appendChild(el("button",{style:"padding:6px 11px;border-radius:6px;border:"+(td?"2px solid "+TAG_COLORS[tpl.tag]:"2px solid transparent")+";background:"+(active?TAG_COLORS[tpl.tag]:done?"#d8f0e4":"#f0ebe3")+";color:"+(active?"#fff":done?"#2d6a4a":"#4a3f35")+";font-size:12px;white-space:nowrap;font-weight:"+(td?"bold":"normal")+";flex-shrink:0;",onclick:function(){ state.selectedDay=i; state.hardMode=false; state.bonusRevealed=false; state.currentBonus=null; state.seenBonusIds=[]; state.refreshesLeft=2; render(); }},label));
  });
  return bar;
}

function renderSession(body){
  var sel=selectedTemplate(); var tpl=sel.tpl; var tag=tpl.tag; var tagColor=TAG_COLORS[tag];
  var isToday=(selectedDateKey()===INFO.todayKey);
  var dd=dayData();

  var dh=el("div",{style:"display:flex;align-items:center;gap:10px;margin-bottom:14px;"});
  dh.appendChild(el("span",{style:"font-size:24px;"},tpl.icon));
  dh.appendChild(el("div",null,[ el("div",{style:"font-size:17px;font-weight:bold;color:#2d3a2e;"},DAY_FULL[DAY_ORDER[state.selectedDay]]), el("div",{style:"font-size:12px;color:"+tagColor+";font-weight:bold;letter-spacing:0.05em;"},tpl.label) ]));
  if(isToday) dh.appendChild(el("div",{style:"margin-left:auto;background:"+tagColor+";color:#fff;padding:3px 9px;border-radius:20px;font-size:10px;font-weight:bold;text-transform:uppercase;"},"Today"));
  body.appendChild(dh);

  // Pre-session energy check-in (only if not yet completed and not a future day)
  if(!dd.completed && !selectedIsFuture() && tag!=="rest"){
    var ec=el("div",{style:"background:#fff;border:2px solid #d0c8bc;border-radius:10px;padding:13px 15px;margin-bottom:14px;"});
    ec.appendChild(el("div",{style:"font-size:13px;font-weight:bold;color:#4a3a2e;margin-bottom:10px;"},"How’s your energy right now?"));
    var er=el("div",{style:"display:flex;gap:8px;"});
    ENERGY_OPTIONS.forEach(function(o){
      var sl=dd.energyBefore===o.value;
      er.appendChild(el("button",{style:"flex:1;padding:10px 4px;border-radius:10px;border:2px solid "+(sl?tagColor:"#d0c8bc")+";background:"+(sl?tagColor:"#f5f0ea")+";color:"+(sl?"#fff":"#4a3a2e")+";text-align:center;",onclick:function(){ updateDayData({energyBefore:o.value}); }},[el("div",{style:"font-size:20px;"},o.emoji),el("div",{style:"font-size:11px;margin-top:2px;"},o.label)]));
    });
    ec.appendChild(er);
    if(dd.energyBefore && dd.energyBefore<=2) ec.appendChild(el("div",{style:"margin-top:10px;padding:9px 12px;background:#f5ece6;border-radius:8px;font-size:12px;color:#7a4a30;border-left:3px solid #c49a8a;"},"Low energy noted. Functional mode is a valid choice — not a cop-out."));
    if(dd.energyBefore && dd.energyBefore>=3) ec.appendChild(el("div",{style:"margin-top:10px;padding:9px 12px;background:#e8f5ee;border-radius:8px;font-size:12px;color:#2d6a4a;border-left:3px solid #5a9e8a;"},"Good energy. Stick to prescribed reps — no need to do extra."));
    body.appendChild(ec);
  } else if(dd.completed && dd.energyBefore){
    var eo2=findOpt(ENERGY_OPTIONS,dd.energyBefore);
    body.appendChild(el("div",{style:"display:flex;align-items:center;gap:8px;padding:8px 13px;background:#f5f0ea;border-radius:8px;margin-bottom:10px;font-size:12px;color:#7a6a5a;"},[el("span",null,eo2.emoji),el("span",null,"Energy logged: "+eo2.label)]));
  }

  // Ankle mob (daily, persistent, locked on future)
  var aDone=ankleDone(), aFuture=selectedIsFuture();
  var a=el("div",{style:"display:flex;align-items:center;gap:12px;padding:13px 15px;margin-bottom:16px;border-radius:10px;"+(aFuture?"background:#f0ece4;border:2px solid #ddd5c8;opacity:0.7;":(aDone?"background:#d4eddf;border:2px solid #5a9e8a;":"background:#fff;border:2px solid #e8b84b;box-shadow:0 1px 4px rgba(232,184,75,0.2);")),onclick:toggleAnkle});
  a.appendChild(el("span",{style:"font-size:22px;"},aFuture?"\ud83d\udd12":(aDone?"\u2705":"\ud83e\uddb6")));
  a.appendChild(el("div",{style:"flex:1;"},[ el("div",{style:"font-size:14px;font-weight:bold;color:"+(aFuture?"#8a8276":(aDone?"#2d6a4a":"#5a4010"))+";"},"Ankle mobilisation \u2014 5 min"), el("div",{style:"font-size:11px;color:"+(aFuture?"#a39a8a":(aDone?"#4a8a64":"#8a6a20"))+";"}, aFuture?"Comes around when the day does.":(aDone?"Done. The one non-negotiable \u2014 ticked.":"Circles \u00b7 wall mob \u00b7 calf stretch \u2014 every single day")) ]));
  if(!aDone&&!aFuture) a.appendChild(el("div",{style:"font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:#e8b84b;font-weight:bold;"},"daily"));
  body.appendChild(a);

  // Functional toggle
  if(tag!=="rest"){
    var hm=state.hardMode;
    var tog=el("div",{style:"background:"+(hm?"#f0e8e0":"#f5f0ea")+";border:2px solid "+(hm?"#c49a8a":"#d0c8bc")+";border-radius:10px;padding:10px 14px;margin-bottom:14px;display:flex;align-items:center;gap:10px;",onclick:function(){ state.hardMode=!state.hardMode; render(); }});
    tog.appendChild(el("span",{style:"font-size:18px;"},"\ud83c\udf21\ufe0f"));
    tog.appendChild(el("div",{style:"flex:1;"},[ el("div",{style:"font-size:13px;font-weight:bold;color:"+(hm?"#8a4a30":"#5a4a3a")+";"},hm?"Functional mode \u2014 scaled down":"Go functional"), el("div",{style:"font-size:11px;color:#8a7a6a;"},hm?"Tap to switch back to full session":"Not a lesser version. A valid one.") ]));
    var sw=el("div",{style:"width:34px;height:19px;border-radius:10px;background:"+(hm?"#c49a8a":"#c0b8b0")+";position:relative;"}); sw.appendChild(el("div",{style:"position:absolute;top:2px;left:"+(hm?17:2)+"px;width:15px;height:15px;border-radius:50%;background:#fff;transition:left 0.2s;"})); tog.appendChild(sw);
    body.appendChild(tog);
  }

  // Bike / iFIT guidance block
  if(tpl.isBike){
    var bk=INFO.phase.bike;
    var bb=el("div",{style:"background:#eaf0f4;border:1px solid #cdddE8;border-radius:10px;padding:12px 14px;margin-bottom:14px;font-size:12px;color:#33536a;line-height:1.6;"});
    bb.appendChild(el("div",{style:"font-weight:bold;margin-bottom:4px;"},"\ud83d\udeb4 NordicTrack X24 \u2014 Phase "+INFO.phase.order));
    bb.appendChild(el("div",null,"Ride: "+bk.ride+" \u00b7 Resistance "+bk.resistance+" \u00b7 Incline "+bk.incline));
    bb.appendChild(el("div",null,"iFIT: "+bk.ifit));
    body.appendChild(bb);
  }

  // Template note
  if(tpl.note) body.appendChild(el("div",{style:"padding:9px 13px;margin-bottom:14px;background:#f3efe7;border-radius:8px;font-size:12px;color:#6a5a4a;border-left:3px solid "+tagColor+";line-height:1.5;"},tpl.note));

  // Warmup
  if(tpl.warmup && tpl.warmup.length && !state.hardMode){
    var w=el("div",{style:"margin-bottom:14px;"}); w.appendChild(sectionLabel("Warm-Up"));
    tpl.warmup.forEach(function(id){ var ex=DATA.exercises[id]; if(!ex)return; w.appendChild(el("div",{style:"padding:7px 11px;background:#eee8e0;border-radius:6px;font-size:13px;color:#5a4a3a;margin-bottom:5px;border-left:3px solid #c0b0a0;"}, ex.name + (doseFor(ex)?" \u2014 "+doseFor(ex):""))); });
    body.appendChild(w);
  }

  // Main exercises (resolved from library, filtered by phase)
  var list=exForPhase(tpl.exercises);
  if(state.hardMode) list = list.slice(0, Math.max(2, Math.ceil(list.length/2))); // functional = first half, min 2
  if(list.length){
    var mw=el("div",{style:"margin-bottom:14px;"}); mw.appendChild(sectionLabel(state.hardMode?"Functional Session":"Main Session"));
    list.forEach(function(item,i){
      var ex=item.ex; var done=isChecked(i); var dose=doseFor(ex);
      var card=el("div",{style:"padding:11px 13px;background:"+(done?"#ddf0e8":"#fff")+";border-radius:8px;font-size:13px;color:"+(done?"#3a6a50":"#3a3028")+";margin-bottom:6px;border-left:4px solid "+(done?"#5a9e8a":tagColor)+";display:flex;align-items:flex-start;gap:10px;box-shadow:0 1px 3px rgba(0,0,0,0.06);"+(done?"opacity:0.75;":""),onclick:function(){ toggleChecked(i); maybeMarkComplete(list); render(); }});
      card.appendChild(el("span",{style:"font-size:15px;margin-top:1px;flex-shrink:0;"},done?"\u2705":"\u2b1c"));
      var txt=el("div",{style:"flex:1;"});
      txt.appendChild(el("div",{style:(done?"text-decoration:line-through;":"")+"font-weight:bold;"}, ex.name + (dose?" \u2014 "+dose:"")));
      if(ex.cues && ex.cues.length) txt.appendChild(el("div",{style:"font-size:11px;color:#8a7a6a;margin-top:2px;"}, ex.cues[0]));
      card.appendChild(txt);
      mw.appendChild(card);
    });
    body.appendChild(mw);
  } else if(tag!=="rest" && !tpl.isBike){
    body.appendChild(el("div",{style:"padding:11px 13px;background:#fff;border-radius:8px;font-size:13px;color:#7a6a5a;margin-bottom:14px;"},"No exercises listed for this phase."));
  }

  // Completion + bonus
  var canComplete = list.length || tpl.isBike;
  if(canComplete && (tpl.isBike ? true : allChecked(list))){
    if(tpl.isBike && !dayData().completed){
      body.appendChild(el("button",{style:"width:100%;padding:12px;background:"+tagColor+";color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:bold;margin-bottom:14px;",onclick:function(){ update(dayKey(),{completed:true,mode:state.hardMode?"hard":"normal"}); render(); }},"Mark ride complete \u2713"));
    }
    if(!tpl.isBike || dayData().completed){
      var comp=el("div",{style:"background:#2d3a2e;color:#e8dfd0;border-radius:12px;padding:16px 18px;text-align:center;margin-bottom:14px;"});
      comp.appendChild(el("div",{style:"font-size:22px;margin-bottom:4px;"},"\u2728"));
      comp.appendChild(el("div",{style:"font-size:15px;font-weight:bold;margin-bottom:3px;"},state.hardMode?"Functional. Done. That counts.":"Session complete."));
      comp.appendChild(el("div",{style:"font-size:12px;color:#9ab090;margin-bottom:(isToday&&!dd.feelAfter)?12px:0;"},state.hardMode?"Showing up on a hard day is the whole game.":"Week "+INFO.planWeek+" in progress."));
      if(isToday&&!dayData().feelAfter){
        comp.appendChild(el("div",{style:"font-size:12px;color:#b0bfa8;margin:8px 0;"},"How did it feel?"));
        var fr=el("div",{style:"display:flex;gap:8px;justify-content:center;"});
        FEEL_OPTIONS.forEach(function(o){ fr.appendChild(el("button",{style:"padding:8px 14px;border-radius:20px;border:2px solid #4a5a3e;background:transparent;color:#e8dfd0;font-size:13px;",onclick:function(){ updateDayData({feelAfter:o.value}); }},o.emoji+" "+o.label)); });
        comp.appendChild(fr);
      } else if(dayData().feelAfter){ var fo=findOpt(FEEL_OPTIONS,dayData().feelAfter); comp.appendChild(el("div",{style:"font-size:13px;color:#9ab090;"},"Logged: "+fo.emoji+" "+fo.label)); }
      body.appendChild(comp);

      if(tag!=="rest"){
        var bw=el("div",{style:"margin-bottom:14px;"});
        if(!dayData().bonusId && !state.bonusRevealed){
          var sealed=el("div",{style:"background:linear-gradient(135deg,#2d3a2e 60%,#3a5040);border-radius:14px;padding:20px 18px;text-align:center;border:2px solid #4a6a50;box-shadow:0 4px 16px rgba(45,58,46,0.25);",onclick:function(){ var b=pickBonus(tag,state.seenBonusIds); state.currentBonus=b; state.seenBonusIds.push(b.id); state.bonusRevealed=true; render(); }});
          sealed.appendChild(el("div",{style:"font-size:32px;margin-bottom:6px;"},"\ud83c\udf81"));
          sealed.appendChild(el("div",{style:"font-size:15px;font-weight:bold;color:#e8dfd0;margin-bottom:4px;"},"Bonus unlocked"));
          sealed.appendChild(el("div",{style:"font-size:12px;color:#9ab090;margin-bottom:12px;"},"You finished. There's something here if you want it."));
          sealed.appendChild(el("div",{style:"display:inline-block;padding:8px 20px;background:#5a9e8a;color:#fff;border-radius:20px;font-size:13px;font-weight:bold;"},"Tap to reveal \u2728"));
          bw.appendChild(sealed);
        } else if(!dayData().bonusId && state.bonusRevealed && state.currentBonus){
          var cb=state.currentBonus;
          var rev=el("div",{"class":"fade",style:"background:#fff;border-radius:14px;padding:18px 16px;border:2px solid "+tagColor+";box-shadow:0 2px 12px rgba(0,0,0,0.08);"});
          var top=el("div",{style:"display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;"}); top.appendChild(el("span",{style:"font-size:30px;"},cb.emoji)); top.appendChild(el("div",{style:"flex:1;"},[ el("div",{style:"font-size:15px;font-weight:bold;color:#2d3a2e;margin-bottom:3px;"},cb.title), el("div",{style:"font-size:13px;color:#5a4a3a;line-height:1.5;"},cb.desc) ])); rev.appendChild(top);
          var br=el("div",{style:"display:flex;gap:8px;"});
          br.appendChild(el("button",{style:"flex:1;padding:10px;background:"+tagColor+";color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:bold;",onclick:function(){ updateDayData({bonusId:cb.id,bonusTitle:cb.title,bonusMsg:getBonusCompletion(cb.id)}); }},"Done \u2713"));
          if(state.refreshesLeft>0) br.appendChild(el("button",{style:"padding:10px 14px;background:#f5f0ea;border:2px solid #d0c8bc;border-radius:10px;font-size:12px;color:#7a6a5a;",onclick:function(){ if(state.refreshesLeft<=0)return; var b=pickBonus(tag,state.seenBonusIds); state.currentBonus=b; state.seenBonusIds.push(b.id); state.refreshesLeft--; render(); }},"\u21ba ("+state.refreshesLeft+")"));
          br.appendChild(el("button",{style:"padding:10px 12px;background:transparent;border:2px solid #e0d8d0;border-radius:10px;font-size:12px;color:#aaa098;",onclick:function(){ state.bonusRevealed=false; render(); }},"Skip"));
          rev.appendChild(br);
          rev.appendChild(el("div",{style:"font-size:11px;color:#aaa098;text-align:center;margin-top:8px;"},"Completely optional. Not doing it also counts."));
          bw.appendChild(rev);
        } else if(dayData().bonusId){
          var bp=null; for(var z=0;z<BONUS_POOL.length;z++) if(BONUS_POOL[z].id===dayData().bonusId) bp=BONUS_POOL[z];
          var done2=el("div",{style:"background:#f0faf4;border-radius:14px;padding:16px 18px;border:2px solid #5a9e8a;display:flex;align-items:center;gap:12px;"});
          done2.appendChild(el("span",{style:"font-size:26px;"},bp?bp.emoji:"\u2728"));
          done2.appendChild(el("div",{style:"flex:1;"},[ el("div",{style:"font-size:13px;font-weight:bold;color:#2d6a4a;margin-bottom:2px;"},dayData().bonusTitle), el("div",{style:"font-size:12px;color:#4a8a64;font-style:italic;"},dayData().bonusMsg) ]));
          done2.appendChild(el("span",{style:"font-size:18px;"},"\u2b50"));
          bw.appendChild(done2);
        }
        body.appendChild(bw);
      }
    }
  }
}


function renderHistory(body){
  // Progression panel
  var ph=INFO.phase;
  var prog=el("div",{style:"background:#2d3a2e;color:#e8dfd0;border-radius:12px;padding:16px 18px;margin-bottom:16px;"});
  prog.appendChild(el("div",{style:"font-size:14px;font-weight:bold;margin-bottom:8px;"},"Phase "+ph.order+": "+ph.label));
  if(ph.unlockCriteria && ph.order<4){
    prog.appendChild(el("div",{style:"font-size:12px;color:#9ab090;margin-bottom:10px;"},"Ready for the next phase? Tick what's true. No rush \u2014 this gates progress, on purpose."));
    var allTicked=true;
    ph.unlockCriteria.forEach(function(crit,i){
      var k="unlock-"+ph.id+"-"+i; var on=!!store[k]; if(!on) allTicked=false;
      var rowc=el("div",{style:"display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-top:1px solid #3a4a38;",onclick:function(){ store[k]=!store[k]; saveStore(store); render(); }});
      rowc.appendChild(el("span",{style:"font-size:16px;flex-shrink:0;"},on?"\u2705":"\u2b1c"));
      rowc.appendChild(el("span",{style:"font-size:12px;color:#d8e0d0;line-height:1.4;"+(on?"":"")},crit));
      prog.appendChild(rowc);
    });
    if(allTicked){
      prog.appendChild(el("button",{style:"width:100%;margin-top:12px;padding:11px;background:"+ph.color+";color:#1a2318;border:none;border-radius:10px;font-size:13px;font-weight:bold;",onclick:function(){ var idx=(typeof store.phaseIndex==="number"?store.phaseIndex:ph.order-1); store.phaseIndex=Math.min(idx+1,DATA.phases.length-1); saveStore(store); state.view="session"; render(); }},"Advance to "+(DATA.phases[ph.order]?DATA.phases[ph.order].label:"next")+" \u2192"));
    } else {
      prog.appendChild(el("div",{style:"font-size:11px;color:#6a7a60;margin-top:10px;text-align:center;"},"Tick all to unlock the next phase."));
    }
  } else {
    prog.appendChild(el("div",{style:"font-size:12px;color:#9ab090;"},"Final phase. Reassess with your PT before deciding what comes next."));
  }
  body.appendChild(prog);

  // Weekly stats
  var hist=buildHistory();
  var workDays=hist.filter(function(e){ return !e.isRest; });
  var sessionsTotal=workDays.length;
  var sessionsDone=workDays.filter(function(e){ return e.data.completed; }).length;
  var ankleTotal=hist.length; // all 7 days
  var ankleDoneCount=hist.filter(function(e){ return !!store["ankle-"+e.key]; }).length;
  var bonusCount=hist.filter(function(e){ return !!e.data.bonusId; }).length;
  var streak=streakCount();

  var stats=el("div",{style:"display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:18px;"});
  function statCard(emoji, value, label, sub, color){
    var c=el("div",{style:"background:#fff;border-radius:10px;padding:12px 14px;border:1px solid #e0d8cc;"});
    var top2=el("div",{style:"display:flex;align-items:baseline;gap:6px;margin-bottom:2px;"});
    top2.appendChild(el("span",{style:"font-size:20px;"},emoji));
    top2.appendChild(el("span",{style:"font-size:22px;font-weight:bold;color:"+(color||"#2d3a2e");"},value));
    c.appendChild(top2);
    c.appendChild(el("div",{style:"font-size:12px;font-weight:bold;color:#3a3028;margin-bottom:1px;"},label));
    if(sub) c.appendChild(el("div",{style:"font-size:11px;color:#9a8a7a;"},sub));
    return c;
  }
  stats.appendChild(statCard("✅", sessionsDone+"/"+sessionsTotal, "Sessions this week", sessionsDone===sessionsTotal&&sessionsTotal>0?"Full week. Nice.":"workout days logged", ph.color));
  stats.appendChild(statCard("🦶", ankleDoneCount+"/"+ankleTotal, "Ankle mob days", ankleDoneCount===ankleTotal?"Every single day.":"of 7 days", "#5a9e8a"));
  stats.appendChild(statCard("🔥", streak, "Day streak", streak===0?"Start today.":streak===1?"One down. Keep it.":"consecutive days", "#c49a8a"));
  stats.appendChild(statCard("⭐", bonusCount, "Bonus moves", bonusCount===0?"None yet — they're optional.":bonusCount===1?"One bonus. Didn't have to.":"this week", "#d4a820"));
  body.appendChild(stats);

  body.appendChild(el("div",{style:"font-size:16px;font-weight:bold;color:#2d3a2e;margin-bottom:4px;"},"Last 7 Days"));
  body.appendChild(el("div",{style:"font-size:12px;color:#8a7a6a;margin-bottom:14px;"},"What you've shown up for."));
  hist.forEach(function(e){
    var done=e.data.completed||e.isRest; var att=e.data.energyBefore||e.data.completed; var ankle=!!store["ankle-"+e.key]; var hb=!!e.data.bonusId;
    var lbl=new Date(e.key+"T12:00:00").toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"});
    var row=el("div",{style:"display:flex;align-items:center;gap:12px;padding:11px 13px;background:"+(e.isToday?"#fff":"#f5f0ea")+";border-radius:9px;margin-bottom:7px;border-left:4px solid "+(done?TAG_COLORS[e.tpl.tag]:att?"#d0c8a0":"#e0d8cc")+";"+(e.isToday?"box-shadow:0 1px 4px rgba(0,0,0,0.08);":"opacity:0.85;")});
    row.appendChild(el("div",{style:"font-size:18px;"},e.isRest?"\ud83c\udf3f":done?"\u2705":att?"\ud83d\udd36":"\u2b1c"));
    var mid=el("div",{style:"flex:1;"}); var tr=el("div",{style:"display:flex;align-items:center;gap:5px;flex-wrap:wrap;"});
    tr.appendChild(el("span",{style:"font-size:13px;font-weight:bold;color:#2d3a2e;"},lbl));
    if(e.isToday) tr.appendChild(el("span",{style:"font-size:10px;background:"+TAG_COLORS[e.tpl.tag]+";color:#fff;border-radius:10px;padding:1px 6px;"},"TODAY"));
    if(e.data.mode==="hard") tr.appendChild(el("span",{style:"font-size:10px;background:#c49a8a;color:#fff;border-radius:10px;padding:1px 6px;"},"FUNCTIONAL"));
    if(hb) tr.appendChild(el("span",{style:"font-size:10px;background:#d4a820;color:#fff;border-radius:10px;padding:1px 6px;"},"\u2b50 bonus"));
    if(ankle) tr.appendChild(el("span",{style:"font-size:11px;"},"\ud83e\uddb6"));
    mid.appendChild(tr);
    mid.appendChild(el("div",{style:"font-size:11px;color:#7a6a5a;"}, e.isRest?"Rest day":(hb?e.tpl.label+" + "+e.data.bonusTitle:e.tpl.label)));
    row.appendChild(mid);
    var right=el("div",{style:"display:flex;gap:4px;align-items:center;"});
    if(e.data.energyBefore){ var eo=findOpt(ENERGY_OPTIONS,e.data.energyBefore); right.appendChild(el("span",null,eo.emoji)); }
    if(e.data.feelAfter){ var fo=findOpt(FEEL_OPTIONS,e.data.feelAfter); right.appendChild(el("span",{style:"font-size:10px;color:#b0a898;"},"\u2192")); right.appendChild(el("span",null,fo.emoji)); }
    row.appendChild(right);
    body.appendChild(row);
  });

  body.appendChild(el("button",{style:"width:100%;margin-top:14px;padding:11px;background:#e8e0d4;border:1px solid #d0c8bc;border-radius:8px;font-size:12px;color:#6a5a4a;",onclick:exportData},"\u2b07\ufe0e Back up my data"));
  body.appendChild(el("div",{style:"margin-top:12px;padding:12px 14px;background:#ede8e0;border-radius:8px;font-size:11px;color:#9a8a7a;text-align:center;line-height:1.5;"},"Saved on this device. Functional beats perfect."));
}

var REF_FILTERS = ["all","glute","ankle","core","cardio","strength","mobility"];

function renderReference(body){
  var ph=INFO.phase;
  if(!state.refFilter) state.refFilter="all";

  // Header
  body.appendChild(el("div",{style:"font-size:16px;font-weight:bold;color:#2d3a2e;margin-bottom:3px;"},"Exercise Reference"));
  body.appendChild(el("div",{style:"font-size:12px;color:#8a7a6a;margin-bottom:14px;"},"How-to and cues for every move in the plan."));

  // Filter chips
  var chips=el("div",{style:"display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;"});
  REF_FILTERS.forEach(function(f){
    var active=state.refFilter===f;
    chips.appendChild(el("button",{style:"padding:5px 12px;border-radius:20px;border:2px solid "+(active?ph.color:"#d0c8bc")+";background:"+(active?ph.color:"#fff")+";color:"+(active?"#fff":"#5a4a3a")+";font-size:12px;",onclick:function(){ state.refFilter=f; render(); }},f.charAt(0).toUpperCase()+f.slice(1)));
  });
  body.appendChild(chips);

  // Phase note
  var pnote=el("div",{style:"padding:9px 13px;background:#2d3a2e;border-radius:8px;font-size:12px;color:#9ab090;margin-bottom:16px;line-height:1.5;"});
  pnote.appendChild(el("span",{style:"font-weight:bold;color:"+ph.color+";"},"Phase "+ph.order+": "+ph.label+" — "));
  pnote.appendChild(document.createTextNode("Exercises marked with a phase badge are locked until that phase."));
  body.appendChild(pnote);

  // Exercise cards
  var exList=Object.keys(DATA.exercises);
  exList.forEach(function(id){
    var ex=DATA.exercises[id];
    var f=state.refFilter;
    if(f!=="all"){
      var bodyMatch=ex.bodyParts&&ex.bodyParts.indexOf(f)!==-1;
      var goalMatch=ex.goals&&ex.goals.indexOf(f)!==-1;
      if(!bodyMatch&&!goalMatch) return;
    }
    var locked=ex.minPhase && ph.order < ex.minPhase;
    var dose=doseFor(ex);
    var card=el("div",{style:"background:"+(locked?"#f0ebe3":"#fff")+";border-radius:10px;border:1px solid "+(locked?"#ddd5c8":"#e0d8cc")+";padding:13px 15px;margin-bottom:10px;"+(locked?"opacity:0.65;":"")});
    var top=el("div",{style:"display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px;"});
    var nameRow=el("div",{style:"flex:1;"});
    nameRow.appendChild(el("div",{style:"font-size:14px;font-weight:bold;color:#2d3a2e;margin-bottom:2px;"},ex.name+(locked?" 🔒":"")));
    if(dose) nameRow.appendChild(el("div",{style:"font-size:11px;color:"+ph.color+";font-weight:bold;"},"Phase "+ph.order+": "+dose));
    top.appendChild(nameRow);
    var tags=el("div",{style:"display:flex;gap:4px;flex-wrap:wrap;flex-shrink:0;"});
    if(ex.bodyParts) ex.bodyParts.forEach(function(bp){ tags.appendChild(el("span",{style:"font-size:10px;padding:2px 7px;border-radius:10px;background:#ede8e0;color:#6a5a4a;"},bp)); });
    top.appendChild(tags);
    card.appendChild(top);
    if(locked){
      card.appendChild(el("div",{style:"font-size:12px;color:#8a7a6a;font-style:italic;"},"Unlocks in Phase "+ex.minPhase+"."));
    } else {
      if(ex.howTo) card.appendChild(el("div",{style:"font-size:12px;color:#5a4a3a;line-height:1.5;margin-bottom:6px;"},ex.howTo));
      if(ex.cues && ex.cues.length){
        var cueList=el("div",{style:"display:flex;flex-direction:column;gap:3px;"});
        ex.cues.forEach(function(c){ cueList.appendChild(el("div",{style:"font-size:11px;color:#7a6a5a;padding-left:10px;position:relative;"},[el("span",{style:"position:absolute;left:0;"},"·"),c])); });
        card.appendChild(cueList);
      }
      if(ex.equipment && ex.equipment.length){
        card.appendChild(el("div",{style:"font-size:11px;color:#9a8070;margin-top:6px;"},"🛠 "+ex.equipment.join(", ")));
      }
    }
    body.appendChild(card);
  });

  // Bonus moves glossary
  body.appendChild(el("div",{style:"font-size:14px;font-weight:bold;color:#2d3a2e;margin:18px 0 10px;"},"Bonus Move Pool"));
  BONUS_POOL.forEach(function(b){
    var bc=el("div",{style:"background:#fff;border-radius:10px;border:1px solid #e0d8cc;padding:12px 14px;margin-bottom:8px;display:flex;gap:12px;align-items:flex-start;"});
    bc.appendChild(el("span",{style:"font-size:24px;flex-shrink:0;"},b.emoji));
    bc.appendChild(el("div",null,[el("div",{style:"font-size:13px;font-weight:bold;color:#2d3a2e;margin-bottom:2px;"},b.title),el("div",{style:"font-size:12px;color:#5a4a3a;line-height:1.4;"},b.desc)]));
    body.appendChild(bc);
  });
}

function exportData(){
  try { var blob=new Blob([JSON.stringify(store,null,2)],{type:"application/json"}); var url=URL.createObjectURL(blob); var aa=document.createElement("a"); aa.href=url; aa.download="lower-the-bar-backup-"+INFO.todayKey+".json"; document.body.appendChild(aa); aa.click(); document.body.removeChild(aa); setTimeout(function(){URL.revokeObjectURL(url);},1000); } catch(e){ alert("Couldn't export here."); }
}

/* ---------- boot ---------- */
function fetchJSON(name){ return fetch(BASE+name+".json",{cache:"no-cache"}).then(function(r){ if(!r.ok) throw new Error(name); return r.json(); }); }

function boot(){
  root=document.getElementById("app");
  Promise.all([fetchJSON("exercises"),fetchJSON("phases"),fetchJSON("templates"),fetchJSON("schedule")])
    .then(function(res){
      DATA.exercises=res[0].exercises; DATA.phases=res[1].phases; DATA.templates=res[2].templates; DATA.schedule=res[3];
      recomputeInfo();
      state.selectedDay=INFO.dayIndex;
      if(!weekData().intention) state.showIntentionPicker=true;
      render();
    })
    .catch(function(err){
      root.innerHTML='<div style="padding:40px 24px;font-family:Georgia,serif;color:#7a4a30;">Couldn\u2019t load the plan data ('+err.message+'.json). If you just opened offline for the first time, connect once so it can cache, then reopen.</div>';
    });
}
if(typeof module!=="undefined" && module.exports){ module.exports={ templateIdForDate:function(d){return templateIdForDate(d);}, _setData:function(x){DATA=x;} }; }
else { boot(); }
