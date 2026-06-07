"use strict";

/* ===========================================================
   Lower the Bar — modular app
   Loads plan from /data/*.json. App code never contains plan content.
   Data layers:  exercises (atoms) <- templates (days) <- schedule (dates)
                 phases (progression params + unlock criteria)
   =========================================================== */

var DATA = { exercises:null, phases:null, templates:null, schedule:null, ifitSeries:null };
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
  { text:"You didn't quit. That's a whole personality now.", phase:4 },
  { text:"Strong enough to do the thing. That was always the goal.", phase:4 },
  { text:"Maintenance isn't coasting. It's holding what you built.", phase:4 },
  { text:"The reps compound. So does the identity.", phase:4 },
  { text:"This is not a finish line. It's a floor.", phase:4 },
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
  function shuffle(arr){ var a=arr.slice(); for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i];a[i]=a[j];a[j]=t; } return a; }
  // Phase-specific for current phase only
  var phaseSpecific=INTENTION_POOL.filter(function(i){ return i.phase===ph; });
  // "any" pool — always eligible, used for fill + wildcard
  var anyPool=INTENTION_POOL.filter(function(i){ return i.phase==="any"; });
  phaseSpecific=shuffle(phaseSpecific); anyPool=shuffle(anyPool);
  // Pick up to 3 from current phase, fill to 5 with "any" — never show other phases' content
  var chosen=phaseSpecific.slice(0,3).concat(anyPool);
  chosen=shuffle(chosen).slice(0,5);
  return chosen.map(function(i){ return i.text; });
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

/* ---------- iFIT series ---------- */
function ifitState(){ return store.ifit || {}; }
function saveIfitState(obj){ var cur=ifitState(); var n={}; for(var k in cur)n[k]=cur[k]; for(var k2 in obj)n[k2]=obj[k2]; store.ifit=n; saveStore(store); }

function ifitPickChoices(){
  var ph=phaseNumber();
  var completed=(ifitState().completedIds)||[];
  var current=(ifitState().seriesId)||null;
  // eligible: matches phase, not completed, not current
  var eligible=DATA.ifitSeries.filter(function(s){
    if(s.id===current) return false;
    if(completed.indexOf(s.id)!==-1) return false;
    return s.phases.indexOf(ph)!==-1;
  });
  // if fewer than 3, broaden to adjacent phases
  if(eligible.length<3){
    var broader=DATA.ifitSeries.filter(function(s){
      if(s.id===current) return false;
      if(completed.indexOf(s.id)!==-1) return false;
      return eligible.indexOf(s)===-1;
    });
    eligible=eligible.concat(broader);
  }
  // shuffle and pick 3
  for(var i=eligible.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=eligible[i];eligible[i]=eligible[j];eligible[j]=t; }
  return eligible.slice(0,3);
}

function renderIfitWidget(body){
  var ph=INFO.phase;
  var ist=ifitState();
  var isFuture=selectedIsFuture();

  if(isFuture){
    // show current series info passively
    if(ist.seriesId){
      var s=null; for(var z=0;z<DATA.ifitSeries.length;z++) if(DATA.ifitSeries[z].id===ist.seriesId){s=DATA.ifitSeries[z];break;}
      if(s){
        var p=el("div",{style:"background:#eaf0f4;border:1px solid #cdddea;border-radius:10px;padding:12px 14px;margin-bottom:14px;font-size:12px;color:#33536a;"});
        p.appendChild(el("div",{style:"font-weight:bold;margin-bottom:2px;"},"📺 "+s.name));
        p.appendChild(el("div",null,"Episode "+(ist.episodesDone||0)+" done so far"));
        body.appendChild(p);
      }
    }
    return;
  }

  // Choosing a new series
  if(!ist.seriesId || ist.choosingNew){
    var choices=ist.pendingChoices;
    if(!choices||!choices.length){
      choices=ifitPickChoices().map(function(s){ return s.id; });
      saveIfitState({pendingChoices:choices});
    }
    var chooseSeries=choices.map(function(id){ for(var z=0;z<DATA.ifitSeries.length;z++) if(DATA.ifitSeries[z].id===id) return DATA.ifitSeries[z]; return null; }).filter(Boolean);

    var cw=el("div",{style:"margin-bottom:14px;"});
    cw.appendChild(sectionLabel("Pick your iFIT series"));
    cw.appendChild(el("div",{style:"font-size:12px;color:#7a6a5a;margin-bottom:10px;"},"Three picks for Phase "+ph.order+". Do the next episode each bike day. Can't find one in iFIT? Hit Switch after picking and choose again."));
    chooseSeries.forEach(function(s){
      var card=el("div",{style:"background:#fff;border:2px solid #d0c8bc;border-radius:10px;padding:12px 14px;margin-bottom:8px;cursor:pointer;",onclick:function(){
        saveIfitState({seriesId:s.id,episodesDone:0,choosingNew:false,pendingChoices:null});
        render();
      }});
      card.appendChild(el("div",{style:"font-size:14px;font-weight:bold;color:#2d3a2e;margin-bottom:2px;"},s.name));
      card.appendChild(el("div",{style:"font-size:11px;color:#7a6a5a;margin-bottom:4px;"},s.trainer+" · ~"+s.approxEpisodes+" episodes · "+s.tier));
      card.appendChild(el("div",{style:"font-size:12px;color:#5a4a3a;line-height:1.4;"},s.focus));
      body.appendChild(card);
    });
    if(ist.seriesId && ist.choosingNew){
      cw.appendChild(el("button",{style:"width:100%;padding:9px;background:transparent;border:1px solid #d0c8bc;border-radius:8px;font-size:12px;color:#9a8a7a;margin-top:4px;",onclick:function(){ saveIfitState({choosingNew:false}); render(); }},"← Keep current series"));
    }
    body.appendChild(cw);
    return;
  }

  // Active series
  var activeSeries=null;
  for(var z=0;z<DATA.ifitSeries.length;z++) if(DATA.ifitSeries[z].id===ist.seriesId){activeSeries=DATA.ifitSeries[z];break;}
  if(!activeSeries) return;

  var episodesDone=ist.episodesDone||0;
  var sw=el("div",{style:"background:#eaf0f4;border:2px solid #7aadcc;border-radius:12px;padding:14px 16px;margin-bottom:14px;"});
  var sh=el("div",{style:"display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:8px;"});
  var si=el("div",{style:"flex:1;"});
  si.appendChild(el("div",{style:"font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#5a8aaa;margin-bottom:2px;"},"Current iFIT Series"));
  si.appendChild(el("div",{style:"font-size:15px;font-weight:bold;color:#1a3a5a;margin-bottom:1px;"},activeSeries.name));
  si.appendChild(el("div",{style:"font-size:11px;color:#5a7a8a;"},activeSeries.trainer+" · Episode "+episodesDone+" done"));
  sh.appendChild(si);
  sh.appendChild(el("span",{style:"font-size:24px;"},"📺"));
  sw.appendChild(sh);

  // Episode progress dots (up to 12 shown)
  var dotCount=Math.min(activeSeries.approxEpisodes, 12);
  var dots=el("div",{style:"display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px;"});
  for(var d=0;d<dotCount;d++){
    dots.appendChild(el("div",{style:"width:10px;height:10px;border-radius:50%;background:"+(d<episodesDone?"#5a9e8a":"#c8dde8")+";"}));
  }
  if(activeSeries.approxEpisodes>12) dots.appendChild(el("span",{style:"font-size:10px;color:#8aacba;margin-left:2px;"},"+"+(activeSeries.approxEpisodes-12)+" more"));
  sw.appendChild(dots);

  var btnRow=el("div",{style:"display:flex;gap:8px;"});
  // Open in iFIT
  var openBtn=el("a",{href:activeSeries.url,target:"_blank",style:"flex:1;padding:10px;background:#1a3a5a;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:bold;text-align:center;text-decoration:none;"},"Open in iFIT ↗");
  btnRow.appendChild(openBtn);
  // Mark episode done
  btnRow.appendChild(el("button",{style:"flex:1;padding:10px;background:#5a9e8a;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:bold;",onclick:function(){
    saveIfitState({episodesDone:episodesDone+1});
    render();
  }},"Episode done ✓"));
  sw.appendChild(btnRow);

  // Finish series
  var finRow=el("div",{style:"display:flex;gap:8px;margin-top:8px;"});
  finRow.appendChild(el("button",{style:"flex:1;padding:8px;background:transparent;border:1px solid #a0c0d0;border-radius:8px;font-size:11px;color:#5a8aaa;",onclick:function(){
    var done=(ifitState().completedIds)||[];
    done=done.concat([activeSeries.id]);
    saveIfitState({seriesId:null,episodesDone:0,completedIds:done,choosingNew:true,pendingChoices:null});
    render();
  }},"✨ Finish series — pick next"));
  finRow.appendChild(el("button",{style:"padding:8px 10px;background:transparent;border:1px solid #c8d8e0;border-radius:8px;font-size:11px;color:#8aacba;",onclick:function(){
    saveIfitState({choosingNew:true,pendingChoices:null});
    render();
  }},"Switch"));
  sw.appendChild(finRow);
  body.appendChild(sw);
}

var TAG_COLORS = { glute:"#5a9e8a", cardio:"#4a8ab5", strength:"#8a6eb5", yoga:"#b07a5a", rest:"#9aaa8a", vacation:"#c4956a" };
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
  var shift = (DATA.schedule.shiftDays||0) + (store.shiftOverride||0);
  var d = new Date(realDate); d.setDate(d.getDate() - shift);
  return d;
}
function weekdayOf(d){ return DAY_NAMES[d.getDay()]; }

/* ---------- vacation ---------- */
function isVacationDay(dateStr){
  var v=store.vacation; if(!v||!v.startDate||!v.days) return false;
  var start=parseYMD(v.startDate); var end=new Date(start); end.setDate(start.getDate()+v.days);
  var d=parseYMD(dateStr); return d>=start && d<end;
}
function vacationDaysLeft(){
  var v=store.vacation; if(!v||!v.startDate||!v.days) return 0;
  var end=new Date(parseYMD(v.startDate)); end.setDate(end.getDate()+v.days);
  return Math.max(0, Math.ceil((end-todayMidnight())/86400000));
}
function vacationTemplateForDate(dateStr){
  // Deterministic random by date so it stays consistent on reopen
  var hash=0; for(var i=0;i<dateStr.length;i++) hash=(hash*31+dateStr.charCodeAt(i))&0x7fffffff;
  var opts=["vacation-minimum","vacation-bodyweight","vacation-flow"];
  return opts[hash%3];
}
function checkVacationEnd(){
  var v=store.vacation; if(!v||!v.startDate||!v.days) return;
  var end=new Date(parseYMD(v.startDate)); end.setDate(end.getDate()+v.days);
  if(todayMidnight()>=end){
    store.shiftOverride=(store.shiftOverride||0)+v.days;
    store.vacation=null; saveStore(store);
  }
}

// Which template runs on a given REAL calendar date (honors overrides + shift).
function templateIdForDate(realDateStr){
  if(isVacationDay(realDateStr)) return vacationTemplateForDate(realDateStr);
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
  checkVacationEnd();
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
  flareMode: false,
  view: "session",
  showIntentionPicker: false,
  writingOwn: false,
  customIntention: "",
  bonusRevealed: false,
  currentBonus: null,
  seenBonusIds: [],
  refreshesLeft: 2,
  showUnlock: false,
  refFilter: "all",
  vacationDays: 7,
  vacationPickerOpen: false
};

var PAIN_FLAGS = [
  { id:"lower_back",    label:"Lower back",     emoji:"🔴" },
  { id:"right_hip",     label:"Right hip",      emoji:"🔴" },
  { id:"right_scapula", label:"Right scapula",  emoji:"🔴" },
  { id:"left_ankle",    label:"Left ankle",     emoji:"🟡" },
  { id:"knees",         label:"Knees",          emoji:"🟡" }
];
function getPainFlags(){ return (dayData().painFlags)||[]; }
function isTripleFlare(){
  var f=getPainFlags();
  return f.indexOf("lower_back")!==-1 && f.indexOf("right_hip")!==-1 && f.indexOf("right_scapula")!==-1;
}

/* date of the selected day in the rolling 7-day window (today = index 3) */
function selectedDateKey(){
  var today = parseYMD(INFO.todayKey);
  var d = new Date(today); d.setDate(today.getDate() + (state.selectedDay - 3));
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
    var optRow=el("div",{style:"display:flex;gap:8px;margin-bottom:10px;"});
    optRow.appendChild(el("button",{style:"flex:1;padding:11px 16px;background:transparent;border:2px dashed #c0b8b0;border-radius:10px;font-size:13px;color:#7a6a5a;",onclick:function(){ state.writingOwn=true; render(); }},"Write my own\u2026"));
    optRow.appendChild(el("button",{style:"padding:11px 14px;background:transparent;border:2px solid #d0c8bc;border-radius:10px;font-size:13px;color:#9a8a7a;",onclick:function(){ update("week-"+INFO.weekMondayKey,{intentionChoices:null}); render(); }},"\u21ba"));
    inner.appendChild(optRow);
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
  // PT check-in banner at phase transition weeks
  var ptWeek=(INFO.planWeek===4||INFO.planWeek===7);
  if(ptWeek){
    var ptPhase=INFO.planWeek===4?"Build":"Strengthen";
    var ptDismissKey="pt-checkin-dismissed-week-"+INFO.planWeek;
    if(!store[ptDismissKey]){
      var ptb=el("div",{style:"background:#3a4a2e;border:1px solid #5a7a4a;border-radius:8px;padding:9px 12px;margin-bottom:10px;display:flex;align-items:flex-start;gap:8px;"});
      ptb.appendChild(el("span",{style:"font-size:16px;flex-shrink:0;"},"🩺"));
      var ptbTxt=el("div",{style:"flex:1;"});
      ptbTxt.appendChild(el("div",{style:"font-size:12px;font-weight:bold;color:#c8e0b0;margin-bottom:1px;"},"Week "+INFO.planWeek+" — PT check-in time"));
      ptbTxt.appendChild(el("div",{style:"font-size:11px;color:#9ab090;line-height:1.4;"},"Before advancing to "+ptPhase+", get PT sign-off. Tick the criterion in progression when done."));
      ptb.appendChild(ptbTxt);
      ptb.appendChild(el("button",{style:"background:transparent;border:none;color:#6a8a60;font-size:16px;padding:0 2px;flex-shrink:0;line-height:1;",onclick:function(){ store[ptDismissKey]=true; saveStore(store); render(); }},"×"));
      h.appendChild(ptb);
    }
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
  // Rolling 7-day window: indices 0-6, today = index 3
  for(var i=0;i<7;i++){
    var today=parseYMD(INFO.todayKey);
    var dd=new Date(today); dd.setDate(today.getDate()+(i-3));
    var dkey=ymd(dd);
    var tid=templateIdForDate(dkey); var tpl=DATA.templates[tid];
    var active=state.selectedDay===i;
    var isToday=(dkey===INFO.todayKey);
    var isPast=dkey<INFO.todayKey;
    var done=store[dkey]&&store[dkey].completed;
    var dayName=DAY_NAMES[dd.getDay()];
    var dateNum=dd.getDate();
    var label=el("div",{style:"display:flex;flex-direction:column;align-items:center;gap:1px;"});
    label.appendChild(el("span",{style:"font-size:11px;"},dayName));
    label.appendChild(el("span",{style:"font-size:13px;font-weight:"+(isToday?"bold":"normal")+";"},done&&!active?"\u2713":isToday?"\u25cf":String(dateNum)));
    var btn=el("button",{style:"padding:6px 10px;border-radius:8px;border:"+(isToday?"2px solid "+TAG_COLORS[tpl.tag]:"2px solid transparent")+";background:"+(active?TAG_COLORS[tpl.tag]:done&&!active?"#d8f0e4":isPast?"#e8e3db":"#f0ebe3")+";color:"+(active?"#fff":done&&!active?"#2d6a4a":isPast?"#8a7a6a":"#4a3f35")+";font-size:12px;white-space:nowrap;flex-shrink:0;line-height:1;",onclick:(function(idx){ return function(){ state.selectedDay=idx; state.hardMode=false; state.bonusRevealed=false; state.currentBonus=null; state.seenBonusIds=[]; state.refreshesLeft=2; render(); }; })(i)});
    btn.appendChild(label);
    bar.appendChild(btn);
  }
  return bar;
}

function renderVacationSession(body, tpl){
  var isToday=(selectedDateKey()===INFO.todayKey);
  var isFuture=selectedIsFuture();
  var dd=dayData();
  var daysLeft=vacationDaysLeft();

  // Vacation banner
  var banner=el("div",{style:"background:#c4956a;color:#fff;border-radius:12px;padding:14px 16px;margin-bottom:14px;text-align:center;"});
  banner.appendChild(el("div",{style:"font-size:20px;margin-bottom:4px;"},"🌴"));
  banner.appendChild(el("div",{style:"font-size:15px;font-weight:bold;margin-bottom:2px;"},"Vacation mode"));
  banner.appendChild(el("div",{style:"font-size:12px;opacity:0.85;"},daysLeft>0?(daysLeft===1?"Last day — plan resumes tomorrow.":daysLeft+" days left. Plan resumes automatically."):"Wrapping up today."));
  body.appendChild(banner);

  // Ankle mob
  var ANKLE_EX_IDS=["ankle-circles","wall-mobilisation","calf-stretch"];
  var aDone=ankleDone();
  var aWrap=el("div",{style:"margin-bottom:14px;"});
  var a=el("div",{style:"display:flex;align-items:center;gap:12px;padding:13px 15px;border-radius:10px;"+(isFuture?"background:#f0ece4;border:2px solid #ddd5c8;opacity:0.7;":(aDone?"background:#d4eddf;border:2px solid #5a9e8a;":"background:#fff;border:2px solid #e8b84b;")),onclick:isFuture?null:toggleAnkle});
  a.appendChild(el("span",{style:"font-size:22px;"},isFuture?"🔒":(aDone?"✅":"🦶")));
  a.appendChild(el("div",{style:"flex:1;"},[el("div",{style:"font-size:14px;font-weight:bold;color:"+(aDone?"#2d6a4a":"#5a4010")+";"},"Ankle mobilisation — 5 min"),el("div",{style:"font-size:11px;color:"+(aDone?"#4a8a64":"#8a6a20")+";"},aDone?"Done.":"Still the one non-negotiable.")]));
  aWrap.appendChild(a);
  if(!isFuture){
    var aList=el("div",{style:"background:#fffdf5;border:1px solid #e8d8a0;border-top:none;border-radius:0 0 10px 10px;padding:10px 14px;display:flex;flex-direction:column;gap:8px;"});
    ANKLE_EX_IDS.forEach(function(id){ var ex=DATA.exercises[id]; if(!ex)return; var row=el("div",null); row.appendChild(el("div",{style:"font-size:12px;font-weight:bold;color:#5a4010;"},ex.name+(ex.defaultDose?" — "+ex.defaultDose:""))); if(ex.cues&&ex.cues.length) row.appendChild(el("div",{style:"font-size:11px;color:#8a7040;"},ex.cues[0])); aList.appendChild(row); });
    aWrap.appendChild(aList);
  }
  body.appendChild(aWrap);

  // Today's template exercises
  if(!isFuture && tpl.note) body.appendChild(el("div",{style:"padding:9px 13px;margin-bottom:12px;background:#f9f4ee;border-radius:8px;font-size:12px;color:#6a5a4a;border-left:3px solid #c4956a;line-height:1.5;"},tpl.note));
  var exIds=(tpl.warmup||[]).concat(tpl.exercises||[]);
  if(exIds.length && !isFuture){
    var mw=el("div",{style:"margin-bottom:14px;"}); mw.appendChild(sectionLabel("Today's moves"));
    exIds.forEach(function(id,i){
      var ex=DATA.exercises[id]; if(!ex)return;
      var done=isChecked(i); var dose=doseFor(ex);
      var card=el("div",{style:"padding:11px 13px;background:"+(done?"#ddf0e8":"#fff")+";border-radius:8px;font-size:13px;margin-bottom:6px;border-left:4px solid "+(done?"#5a9e8a":"#c4956a")+";display:flex;align-items:flex-start;gap:10px;",onclick:function(){ toggleChecked(i); render(); }});
      card.appendChild(el("span",{style:"font-size:15px;flex-shrink:0;"},done?"✅":"⬜"));
      var txt=el("div",{style:"flex:1;"}); txt.appendChild(el("div",{style:(done?"text-decoration:line-through;":"")+"font-weight:bold;"},ex.name+(dose?" — "+dose:""))); if(ex.cues&&ex.cues.length) txt.appendChild(el("div",{style:"font-size:11px;color:#8a7a6a;margin-top:2px;"},ex.cues[0])); card.appendChild(txt);
      mw.appendChild(card);
    });
    body.appendChild(mw);
  }

  // Done tap
  if(!isFuture){
    if(!dd.completed){
      body.appendChild(el("button",{style:"width:100%;padding:14px;background:#c4956a;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:bold;margin-bottom:14px;",onclick:function(){ update(dayKey(),{completed:true}); render(); }},"Done for today ✓"));
    } else {
      var comp=el("div",{style:"background:#2d3a2e;color:#e8dfd0;border-radius:12px;padding:14px 18px;text-align:center;margin-bottom:14px;"});
      comp.appendChild(el("div",{style:"font-size:20px;margin-bottom:4px;"},"✨"));
      comp.appendChild(el("div",{style:"font-size:14px;font-weight:bold;"},"Kept the thread. Well done."));
      comp.appendChild(el("div",{style:"font-size:12px;color:#9ab090;margin-top:3px;"},"Plan resumes in "+daysLeft+(daysLeft===1?" day.":" days.")));
      body.appendChild(comp);
    }
  }
}

function renderFlareProtocol(body){
  var dd=dayData();
  // Banner
  var banner=el("div",{style:"background:#7a2030;color:#fff;border-radius:12px;padding:14px 16px;margin-bottom:14px;"});
  banner.appendChild(el("div",{style:"font-size:18px;margin-bottom:4px;"},"🔴"));
  banner.appendChild(el("div",{style:"font-size:15px;font-weight:bold;margin-bottom:3px;"},"Triple flare protocol"));
  banner.appendChild(el("div",{style:"font-size:12px;opacity:0.85;line-height:1.5;"},"Lower back + right hip + right scapula together. Likely ligament laxity. Modified session only — rest IS the work today."));
  var exitBtn=el("button",{style:"margin-top:10px;padding:6px 14px;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);border-radius:20px;color:#fff;font-size:11px;",onclick:function(){ state.flareMode=false; render(); }},"← Back to normal session");
  banner.appendChild(exitBtn);
  body.appendChild(banner);

  // Ankle mob — twice today
  var aDone=ankleDone();
  var aCard=el("div",{style:"display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:10px;margin-bottom:12px;"+(aDone?"background:#d4eddf;border:2px solid #5a9e8a;":"background:#fff;border:2px solid #e8b84b;"),onclick:toggleAnkle});
  aCard.appendChild(el("span",{style:"font-size:20px;"},aDone?"✅":"🦶"));
  aCard.appendChild(el("div",{style:"flex:1;"},[el("div",{style:"font-size:13px;font-weight:bold;color:"+(aDone?"#2d6a4a":"#5a4010")+";"},"Ankle mobilisation — twice today"),el("div",{style:"font-size:11px;color:"+(aDone?"#4a8a64":"#8a6a20")+";"},"Ligament laxity is highest. Do it morning and evening.")]));
  body.appendChild(aCard);

  // Do these — in order
  body.appendChild(sectionLabel("Do these — in order"));
  var flareSteps=[
    { name:"Modified Savasana", dose:"5–10 min", cue:"Bolster under BENT knees. Arms relaxed. Breathe. Do this first." },
    { name:"Gentle Cat-Cow", dose:"5–8 cycles, 50% range", cue:"Half your normal range. Inhale=Cow, Exhale=Cat. Never forced." },
    { name:"Supine Twist", dose:"3–4 min/side, 50% range", cue:"Drop knees to side. Let gravity do the work. Never force rotation." },
    { name:"Scapular Setting", dose:"10 reps, hold 3 sec", cue:"Blade lightly down and in. NO resistance, no bands, no weight." }
  ];
  flareSteps.forEach(function(item,i){
    var done=isChecked(i);
    var card=el("div",{style:"padding:11px 13px;background:"+(done?"#f5e8ea":"#fff")+";border-radius:8px;margin-bottom:6px;border-left:4px solid "+(done?"#7a2030":"#d4a0a8")+";display:flex;align-items:flex-start;gap:10px;",onclick:function(){ toggleChecked(i); render(); }});
    card.appendChild(el("span",{style:"font-size:15px;flex-shrink:0;"},done?"✅":"⬜"));
    var txt=el("div",{style:"flex:1;"});
    txt.appendChild(el("div",{style:(done?"text-decoration:line-through;":"")+"font-weight:bold;color:#4a1a22;"},item.name+(item.dose?" — "+item.dose:"")));
    txt.appendChild(el("div",{style:"font-size:11px;color:#8a5a5a;margin-top:2px;"},item.cue));
    card.appendChild(txt);
    body.appendChild(card);
  });

  // Skip today
  body.appendChild(el("div",{style:"margin-top:14px;margin-bottom:8px;"}));
  body.appendChild(sectionLabel("Skip today"));
  var skipWrap=el("div",{style:"background:#fff8f8;border:1px solid #e8c0c0;border-radius:8px;padding:10px 14px;margin-bottom:14px;"});
  ["Any bridging or glute loading","All band or dumbbell scapula work","The bike","Any held standing poses"].forEach(function(s){
    var row=el("div",{style:"font-size:12px;color:#7a3030;padding:3px 0 3px 14px;position:relative;"});
    row.appendChild(el("span",{style:"position:absolute;left:0;color:#c4a0a0;"},"✕"));
    row.appendChild(document.createTextNode(s));
    skipWrap.appendChild(row);
  });
  body.appendChild(skipWrap);

  // For the pain
  body.appendChild(sectionLabel("For the pain"));
  var painWrap=el("div",{style:"background:#fff5f5;border:1px solid #e8c0c0;border-radius:8px;padding:10px 14px;margin-bottom:14px;"});
  ["🌡️  Heat pack on right rhomboid — 15–20 min","⚡  TENS on right scapula + lower back simultaneously during savasana","🛏️  Pillow between knees or under right hip if side-lying","💊  Magnesium supplement (discuss with GP — helps cycle-related tension)","🚨  Pain travelling DOWN the leg → contact PT or GP today"].forEach(function(p){
    painWrap.appendChild(el("div",{style:"font-size:12px;color:#6a2a2a;padding:4px 0;line-height:1.4;"},p));
  });
  body.appendChild(painWrap);

  // Completion
  if(!dd.completed){
    body.appendChild(el("button",{style:"width:100%;padding:14px;background:#7a2030;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:bold;margin-bottom:14px;",onclick:function(){ update(dayKey(),{completed:true,mode:"flare"}); render(); }},"Done — rested well ✓"));
  } else {
    var comp=el("div",{style:"background:#2d3a2e;color:#e8dfd0;border-radius:12px;padding:14px 18px;text-align:center;margin-bottom:14px;"});
    comp.appendChild(el("div",{style:"font-size:22px;margin-bottom:4px;"},"🌿"));
    comp.appendChild(el("div",{style:"font-size:15px;font-weight:bold;"},"Rest taken. That is the session."));
    comp.appendChild(el("div",{style:"font-size:12px;color:#9ab090;margin-top:4px;"},"3+ consecutive bad days → contact PT before resuming."));
    body.appendChild(comp);
  }
}

function renderTensSuggestion(body, tag){
  var tens=null;
  var cycleFlare=weekData().cycleFlare;
  if(cycleFlare){
    tens={ title:"TENS: Scapula + lower back", note:"Both areas simultaneously during savasana. Ideal on cycle flare days. Start at lowest intensity.", pads:"Small 1.5\"×1.5\" on scapula · Middle 2\"×2\" on lower back" };
  } else if(tag==="cardio"){
    tens={ title:"TENS: Left ankle — post-ride", note:"Good recovery after bike. Either side of the ankle joint. Never use TENS before a ride.", pads:"Small 1.5\"×1.5\" pads, either side of ankle joint" };
  } else if(tag==="strength"){
    tens={ title:"TENS: Right scapula — optional", note:"If the scapula is tender after today's work. Above and below the medial border. Start at lowest intensity.", pads:"Small 1.5\"×1.5\" pads, above and below medial border of right shoulder blade" };
  } else if(tag==="glute"){
    tens={ title:"TENS: Right hip/glute — optional", note:"Post-session recovery on the glute muscle belly. Not on the joint itself. Great during a rest period.", pads:"Large 2\"×4\" pad on glute muscle belly" };
  } else {
    tens={ title:"TENS: Any tender area during savasana", note:"Yoga and rest days are ideal for TENS recovery. 10–30 min. Start at lowest intensity.", pads:"See Reference → TENS for pad placement by area" };
  }
  var card=el("div",{style:"background:#eef4f8;border:1px solid #b8d4e4;border-radius:10px;padding:12px 14px;margin-bottom:14px;"});
  var top=el("div",{style:"display:flex;align-items:flex-start;gap:10px;"});
  top.appendChild(el("span",{style:"font-size:20px;flex-shrink:0;"},"⚡"));
  var txt=el("div",{style:"flex:1;"});
  txt.appendChild(el("div",{style:"font-size:13px;font-weight:bold;color:#1a3a5a;margin-bottom:2px;"},tens.title));
  txt.appendChild(el("div",{style:"font-size:12px;color:#3a5a6a;line-height:1.4;margin-bottom:4px;"},tens.note));
  txt.appendChild(el("div",{style:"font-size:10px;color:#7a9aaa;font-style:italic;"},tens.pads));
  top.appendChild(txt);
  card.appendChild(top);
  card.appendChild(el("div",{style:"font-size:10px;color:#9ab0ba;margin-top:6px;padding-top:6px;border-top:1px solid #c8dce8;"},"Optional — Reference tab has full pad placement guide and contraindications"));
  body.appendChild(card);
}

function renderSession(body){
  var sel=selectedTemplate(); var tpl=sel.tpl; var tag=tpl.tag; var tagColor=TAG_COLORS[tag];
  var isToday=(selectedDateKey()===INFO.todayKey);
  var dd=dayData();

  // Hand off to vacation renderer if this is a vacation day
  if(tag==="vacation"){ renderVacationSession(body,tpl); return; }

  // Hand off to flare protocol if active
  if(state.flareMode && !selectedIsFuture()){ renderFlareProtocol(body); return; }

  var selDayName=DAY_FULL[DAY_NAMES[new Date(selectedDateKey()+"T12:00:00").getDay()]];
  var dh=el("div",{style:"display:flex;align-items:center;gap:10px;margin-bottom:14px;"});
  dh.appendChild(el("span",{style:"font-size:24px;"},tpl.icon));
  dh.appendChild(el("div",null,[ el("div",{style:"font-size:17px;font-weight:bold;color:#2d3a2e;"},selDayName), el("div",{style:"font-size:12px;color:"+tagColor+";font-weight:bold;letter-spacing:0.05em;"},tpl.label) ]));
  if(isToday) dh.appendChild(el("div",{style:"margin-left:auto;background:"+tagColor+";color:#fff;padding:3px 9px;border-radius:20px;font-size:10px;font-weight:bold;text-transform:uppercase;"},"Today"));
  body.appendChild(dh);

  // Pre-session energy + pain check-in (only if not yet completed and not a future day)
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

    // Pain flags
    ec.appendChild(el("div",{style:"font-size:12px;font-weight:bold;color:#7a5a5a;margin-top:12px;margin-bottom:7px;"},"Any pain or discomfort today?"));
    var flagRow=el("div",{style:"display:flex;gap:6px;flex-wrap:wrap;"});
    var currentFlags=getPainFlags();
    PAIN_FLAGS.forEach(function(pf){
      var on=currentFlags.indexOf(pf.id)!==-1;
      flagRow.appendChild(el("button",{style:"padding:5px 10px;border-radius:20px;border:2px solid "+(on?"#c4506a":"#d0c8bc")+";background:"+(on?"#fde8ee":"#f5f0ea")+";color:"+(on?"#8a2040":"#6a5a5a")+";font-size:11px;",onclick:function(){
        var f=getPainFlags().slice();
        var idx=f.indexOf(pf.id);
        if(idx===-1) f.push(pf.id); else f.splice(idx,1);
        updateDayData({painFlags:f});
      }},pf.emoji+" "+pf.label));
    });
    ec.appendChild(flagRow);

    // Triple flare detection
    if(isTripleFlare()){
      var flareAlert=el("div",{style:"margin-top:10px;padding:10px 12px;background:#fde8ee;border-radius:8px;border-left:3px solid #c4506a;"});
      flareAlert.appendChild(el("div",{style:"font-size:12px;font-weight:bold;color:#8a2040;margin-bottom:4px;"},"🔴 Triple flare detected"));
      flareAlert.appendChild(el("div",{style:"font-size:11px;color:#7a3050;margin-bottom:8px;line-height:1.4;"},"Lower back + right hip + right scapula together. Likely ligament laxity. There’s a specific protocol for this."));
      flareAlert.appendChild(el("button",{style:"width:100%;padding:9px;background:#7a2030;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:bold;",onclick:function(){ state.flareMode=true; render(); }},"Switch to flare protocol →"));
      ec.appendChild(flareAlert);
    } else if(currentFlags.length>=2){
      ec.appendChild(el("div",{style:"margin-top:10px;padding:9px 12px;background:#fff0f0;border-radius:8px;font-size:12px;color:#8a4040;border-left:3px solid #d4a0a0;"},"Multiple areas flagged. Consider functional mode — half reps, reduced range. Your call."));
    }
    body.appendChild(ec);
  } else if(dd.completed && dd.energyBefore){
    var eo2=findOpt(ENERGY_OPTIONS,dd.energyBefore);
    var summaryRow=el("div",{style:"display:flex;align-items:center;gap:8px;padding:8px 13px;background:#f5f0ea;border-radius:8px;margin-bottom:10px;font-size:12px;color:#7a6a5a;"});
    summaryRow.appendChild(el("span",null,eo2.emoji));
    summaryRow.appendChild(el("span",null,"Energy: "+eo2.label));
    var completedFlags=getPainFlags();
    if(completedFlags.length) summaryRow.appendChild(el("span",{style:"margin-left:4px;color:#c4506a;"},"· "+completedFlags.map(function(f){ var pf=PAIN_FLAGS.filter(function(p){return p.id===f;})[0]; return pf?pf.label:f; }).join(", ")));
    body.appendChild(summaryRow);
  }

  // Ankle mob (daily, persistent, locked on future)
  var ANKLE_EX_IDS = ["ankle-circles", "wall-mobilisation", "calf-stretch"];
  var aDone=ankleDone(), aFuture=selectedIsFuture();
  var aWrap=el("div",{style:"margin-bottom:16px;"});
  var a=el("div",{style:"display:flex;align-items:center;gap:12px;padding:13px 15px;border-radius:10px;"+(aFuture?"background:#f0ece4;border:2px solid #ddd5c8;opacity:0.7;":(aDone?"background:#d4eddf;border:2px solid #5a9e8a;":"background:#fff;border:2px solid #e8b84b;box-shadow:0 1px 4px rgba(232,184,75,0.2);")),onclick:toggleAnkle});
  a.appendChild(el("span",{style:"font-size:22px;"},aFuture?"\ud83d\udd12":(aDone?"\u2705":"\ud83e\uddb6")));
  a.appendChild(el("div",{style:"flex:1;"},[ el("div",{style:"font-size:14px;font-weight:bold;color:"+(aFuture?"#8a8276":(aDone?"#2d6a4a":"#5a4010"))+";"},"Ankle mobilisation \u2014 5 min"), el("div",{style:"font-size:11px;color:"+(aFuture?"#a39a8a":(aDone?"#4a8a64":"#8a6a20"))+";"}, aFuture?"Comes around when the day does.":(aDone?"Done. The one non-negotiable \u2014 ticked.":"Every single day \u2014 tap when done.")) ]));
  if(!aDone&&!aFuture) a.appendChild(el("div",{style:"font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:#e8b84b;font-weight:bold;"},"daily"));
  aWrap.appendChild(a);
  if(!aFuture){
    var aList=el("div",{style:"background:#fffdf5;border:1px solid #e8d8a0;border-top:none;border-radius:0 0 10px 10px;padding:10px 14px;display:flex;flex-direction:column;gap:8px;"});
    ANKLE_EX_IDS.forEach(function(id){
      var ex=DATA.exercises[id]; if(!ex) return;
      var row=el("div",{style:"display:flex;flex-direction:column;gap:2px;"});
      row.appendChild(el("div",{style:"font-size:12px;font-weight:bold;color:#5a4010;"},ex.name+(ex.defaultDose?" \u2014 "+ex.defaultDose:"")));
      if(ex.cues && ex.cues.length) row.appendChild(el("div",{style:"font-size:11px;color:#8a7040;"},ex.cues[0]));
      aList.appendChild(row);
    });
    aWrap.appendChild(aList);
  }
  body.appendChild(aWrap);

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
    var selWkday=new Date(selectedDateKey()+"T12:00:00").getDay(); // 0=Sun,6=Sat
    var isSatBike=(selWkday===6);
    var rideTime=isSatBike&&bk.satRide?bk.satRide:bk.ride;
    var selPlanWeek=planWeekForDate(selectedDateKey());

    // Weeks 1\u20136: optional banner
    if(selPlanWeek<=6){
      var optBanner=el("div",{style:"background:#fff8e6;border:2px solid #e8b84b;border-radius:10px;padding:12px 14px;margin-bottom:12px;"});
      optBanner.appendChild(el("div",{style:"font-size:13px;font-weight:bold;color:#8a5a10;margin-bottom:4px;"},"\u26a0\ufe0f Weeks 1\u20136: Ride only on good days"));
      optBanner.appendChild(el("div",{style:"font-size:12px;color:#7a5a20;line-height:1.5;"},"Skip entirely on any scapula, low back, or hip flare. On mild-discomfort days: 5 min max, flat scenic ride, light resistance. Bike becomes fully scheduled from week 7."));
      body.appendChild(optBanner);
    }

    // Cycle flare: skip bike warning
    if(weekData().cycleFlare){
      body.appendChild(el("div",{style:"background:#fdf0f6;border:2px solid #d4a0c0;border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:12px;color:#8a3a5a;"},"\ud83c\udf19 Cycle modifier: skip bike if flaring. 5 min max on mild days \u2014 flat scenic, light resistance only. TENS on ankle after (not before) if you do ride."));
    }

    // Bike stats card
    var bb=el("div",{style:"background:#eaf0f4;border:1px solid #cdddea;border-radius:10px;padding:11px 14px;margin-bottom:12px;"});
    bb.appendChild(el("div",{style:"font-size:12px;font-weight:bold;color:#33536a;margin-bottom:8px;"},"\ud83d\udeb4 NordicTrack X24 \u2014 Phase "+INFO.phase.order+(isSatBike?" \u00b7 Saturday (longer ride)":"")));
    var statRow=el("div",{style:"display:flex;gap:6px;"});
    function bikeChip(label,val){
      var c=el("div",{style:"flex:1;background:#fff;border:1px solid #cdddea;border-radius:7px;padding:6px 8px;text-align:center;"});
      c.appendChild(el("div",{style:"font-size:9px;color:#7aadcc;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px;"},label));
      c.appendChild(el("div",{style:"font-size:13px;font-weight:bold;color:#1a3a5a;"},val));
      return c;
    }
    statRow.appendChild(bikeChip("Ride",rideTime));
    statRow.appendChild(bikeChip("Resistance",bk.resistance));
    statRow.appendChild(bikeChip("Incline",bk.incline));
    bb.appendChild(statRow);
    body.appendChild(bb);
    if(DATA.ifitSeries) renderIfitWidget(body);
  }

  // Cycle flare banner for non-bike sessions
  if(weekData().cycleFlare && tag!=="rest" && !tpl.isBike){
    var cfNote="";
    if(tag==="strength") cfNote="Scapula work today: gentle retraction only. Skip bands and resistance. Pain-free range only.";
    else if(tag==="glute") cfNote="Reduce end-range movements. Bolster under knees for all floor work. Skip if lower back + hip are flaring together.";
    else if(tag==="yoga") cfNote="Reduce rotation range \u2014 let gravity do the work. Bolster under knees in savasana. Non-negotiable today.";
    else cfNote="Easy does it. Reduce range across all movements today.";
    var cfBanner=el("div",{style:"background:#fdf0f6;border:2px solid #d4a0c0;border-radius:10px;padding:12px 14px;margin-bottom:14px;"});
    cfBanner.appendChild(el("div",{style:"font-size:13px;font-weight:bold;color:#8a3a5a;margin-bottom:4px;"},"\ud83c\udf19 Cycle modifier active"));
    cfBanner.appendChild(el("div",{style:"font-size:12px;color:#7a3a5a;line-height:1.5;"},cfNote));
    cfBanner.appendChild(el("div",{style:"font-size:11px;color:#c4a0b8;margin-top:6px;"},"\ud83e\uddb6 Ankle mob twice today \u2014 ligament laxity is highest around your cycle."));
    body.appendChild(cfBanner);
  }

  // Pre-strength TENS nudge (Wednesday, before session starts)
  if(tag==="strength" && !dd.completed && !selectedIsFuture()){
    body.appendChild(el("div",{style:"background:#eef4f8;border:1px solid #b8d4e4;border-radius:8px;padding:9px 13px;margin-bottom:14px;font-size:12px;color:#3a5a6a;line-height:1.4;"},"⚡ Optional: 10–15 min TENS on right scapula before scapula exercises. Start at lowest intensity. Don't use immediately before if that feels odd — after works too."));
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

  // Cool-down
  if(tpl.cooldown && tpl.cooldown.length && !state.hardMode && !selectedIsFuture()){
    var cw=el("div",{style:"margin-bottom:14px;"}); cw.appendChild(sectionLabel("Cool-Down"));
    tpl.cooldown.forEach(function(id){
      var ex=DATA.exercises[id]; if(!ex) return;
      var dose=doseFor(ex);
      var cd=el("div",{style:"padding:10px 12px;background:#eef4f8;border-radius:8px;font-size:13px;color:#3a4a5a;margin-bottom:5px;border-left:3px solid #7aadcc;"});
      cd.appendChild(el("div",{style:"font-weight:bold;margin-bottom:2px;"},ex.name+(dose?" — "+dose:"")));
      if(ex.cues && ex.cues.length) cd.appendChild(el("div",{style:"font-size:11px;color:#6a8a9a;"},ex.cues[0]));
      cw.appendChild(cd);
    });
    body.appendChild(cw);
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

      // TENS suggestion post-completion
      if(tag!=="rest") renderTensSuggestion(body, tag);

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
    top2.appendChild(el("span",{style:"font-size:22px;font-weight:bold;color:"+(color||"#2d3a2e")+";"},value));
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

  // Cycle flare toggle
  var cycleFlare=weekData().cycleFlare;
  var cycleCard=el("div",{style:"margin-top:14px;background:#fff;border:2px solid "+(cycleFlare?"#d4a0c0":"#e0d8cc")+";border-radius:12px;overflow:hidden;"});
  var cycleBtn=el("button",{style:"width:100%;padding:13px 16px;background:transparent;border:none;display:flex;align-items:center;gap:10px;text-align:left;",onclick:function(){ updateWeekData({cycleFlare:!cycleFlare}); }});
  cycleBtn.appendChild(el("span",{style:"font-size:20px;"},"🌙"));
  var cycleTxt=el("div",{style:"flex:1;"});
  cycleTxt.appendChild(el("div",{style:"font-size:13px;font-weight:bold;color:"+(cycleFlare?"#8a3a5a":"#2d3a2e")+";"},cycleFlare?"Cycle modifier active":"Cycle flare this week?"));
  cycleTxt.appendChild(el("div",{style:"font-size:12px;color:#7a6a5a;"},cycleFlare?"Sessions adjusted. Tap to clear when you're through.":"Adjusts scapula, bike, and ankle mob guidance."));
  cycleBtn.appendChild(cycleTxt);
  var cycleSwitch=el("div",{style:"width:34px;height:19px;border-radius:10px;background:"+(cycleFlare?"#c4a0b8":"#c0b8b0")+";position:relative;flex-shrink:0;"});
  cycleSwitch.appendChild(el("div",{style:"position:absolute;top:2px;left:"+(cycleFlare?"17":"2")+"px;width:15px;height:15px;border-radius:50%;background:#fff;"}));
  cycleBtn.appendChild(cycleSwitch);
  cycleCard.appendChild(cycleBtn);
  if(cycleFlare){
    var cycleInfo=el("div",{style:"padding:12px 16px;background:#fdf5fa;border-top:1px solid #e8d0e0;font-size:12px;color:#6a3a5a;line-height:1.6;"});
    cycleInfo.appendChild(el("div",{style:"font-weight:bold;margin-bottom:6px;"},"What's adjusted this week:"));
    ["Scapula work: gentle retraction only — no bands or resistance",
     "Bike: skip entirely if flaring. 5 min max on mild days, flat scenic only",
     "Ankle mob: aim for twice daily — ligament laxity is highest",
     "End-range movements: reduce across all exercises",
     "Savasana: bolster under knees is non-negotiable today",
     "TENS on lower back + scapula during savasana is ideal"
    ].forEach(function(b){
      cycleInfo.appendChild(el("div",{style:"padding:2px 0 2px 12px;position:relative;"},[el("span",{style:"position:absolute;left:0;color:#c4a0b8;"},"·"),b]));
    });
    cycleCard.appendChild(cycleInfo);
  }
  body.appendChild(cycleCard);

  // Vacation mode
  var vac=store.vacation;
  var vacCard=el("div",{style:"margin-top:18px;background:#fff;border:1px solid #e0d8cc;border-radius:12px;overflow:hidden;"});
  if(vac && vac.startDate && vac.days){
    var dLeft=vacationDaysLeft();
    var vh=el("div",{style:"padding:14px 16px;display:flex;align-items:center;gap:12px;"});
    vh.appendChild(el("span",{style:"font-size:22px;"},"\ud83c\udf34"));
    var vt=el("div",{style:"flex:1;"}); vt.appendChild(el("div",{style:"font-size:14px;font-weight:bold;color:#2d3a2e;"},"Vacation mode active")); vt.appendChild(el("div",{style:"font-size:12px;color:#7a6a5a;"},dLeft===0?"Ends today \u2014 plan resumes tomorrow.":dLeft===1?"Last day tomorrow.":dLeft+" days remaining.")); vh.appendChild(vt);
    vh.appendChild(el("button",{style:"padding:7px 12px;background:#f5ece6;border:1px solid #d0b8a8;border-radius:8px;font-size:12px;color:#8a4a30;",onclick:function(){ if(confirm("End vacation mode now? The plan will shift forward by the days you were away.")){ store.shiftOverride=(store.shiftOverride||0)+Math.floor((todayMidnight()-parseYMD(vac.startDate))/86400000); store.vacation=null; saveStore(store); render(); } }},"End early"));
    vacCard.appendChild(vh);
  } else if(state.vacationPickerOpen){
    var vp=el("div",{style:"padding:14px 16px;"});
    vp.appendChild(el("div",{style:"font-size:14px;font-weight:bold;color:#2d3a2e;margin-bottom:4px;"},"\ud83c\udf34 How many days away?"));
    vp.appendChild(el("div",{style:"font-size:12px;color:#7a6a5a;margin-bottom:14px;"},"The plan auto-resumes when you're back. No toggle to remember."));
    var stepper=el("div",{style:"display:flex;align-items:center;gap:16px;justify-content:center;margin-bottom:16px;"});
    stepper.appendChild(el("button",{style:"width:40px;height:40px;border-radius:50%;border:2px solid #d0c8bc;background:#f5f0ea;font-size:20px;color:#3a3028;",onclick:function(){ if(state.vacationDays>1){ state.vacationDays--; render(); } }},"-"));
    stepper.appendChild(el("div",{style:"font-size:26px;font-weight:bold;color:#2d3a2e;min-width:60px;text-align:center;"},state.vacationDays+(state.vacationDays===1?" day":" days")));
    stepper.appendChild(el("button",{style:"width:40px;height:40px;border-radius:50%;border:2px solid #d0c8bc;background:#f5f0ea;font-size:20px;color:#3a3028;",onclick:function(){ if(state.vacationDays<21){ state.vacationDays++; render(); } }},"+"));
    vp.appendChild(stepper);
    var vbrow=el("div",{style:"display:flex;gap:8px;"});
    vbrow.appendChild(el("button",{style:"flex:1;padding:12px;background:#c4956a;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:bold;",onclick:function(){ store.vacation={startDate:INFO.todayKey,days:state.vacationDays}; saveStore(store); state.vacationPickerOpen=false; render(); }},"Start vacation \ud83c\udf34"));
    vbrow.appendChild(el("button",{style:"padding:12px 16px;background:transparent;border:2px solid #d0c8bc;border-radius:10px;font-size:13px;color:#7a6a5a;",onclick:function(){ state.vacationPickerOpen=false; render(); }},"Cancel"));
    vp.appendChild(vbrow);
    vacCard.appendChild(vp);
  } else {
    var vb=el("button",{style:"width:100%;padding:13px 16px;background:transparent;border:none;display:flex;align-items:center;gap:10px;text-align:left;",onclick:function(){ state.vacationPickerOpen=true; render(); }});
    vb.appendChild(el("span",{style:"font-size:20px;"},"\ud83c\udf34"));
    var vbt=el("div",{style:"flex:1;"}); vbt.appendChild(el("div",{style:"font-size:13px;font-weight:bold;color:#2d3a2e;"},"Going away?")); vbt.appendChild(el("div",{style:"font-size:12px;color:#7a6a5a;"},"Set vacation mode \u2014 plan shifts automatically when you're back."));
    vb.appendChild(vbt); vb.appendChild(el("span",{style:"font-size:14px;color:#9a8a7a;"},"\u203a"));
    vacCard.appendChild(vb);
  }
  body.appendChild(vacCard);

  body.appendChild(el("button",{style:"width:100%;margin-top:14px;padding:11px;background:#e8e0d4;border:1px solid #d0c8bc;border-radius:8px;font-size:12px;color:#6a5a4a;",onclick:exportData},"\u2b07\ufe0e Back up my data"));
  body.appendChild(el("div",{style:"margin-top:12px;padding:12px 14px;background:#ede8e0;border-radius:8px;font-size:11px;color:#9a8a7a;text-align:center;line-height:1.5;"},"Saved on this device. Functional beats perfect."));
}

var REF_FILTERS = ["today","all","glute","ankle","core","cardio","strength","mobility","tens","recovery","safety"];

function renderReference(body){
  var ph=INFO.phase;
  if(!state.refFilter) state.refFilter="today";

  // Build today's exercise ID set
  var todayTpl=DATA.templates[templateIdForDate(INFO.todayKey)];
  var todayIds={};
  var ANKLE_EX_IDS=["ankle-circles","wall-mobilisation","calf-stretch"];
  ANKLE_EX_IDS.forEach(function(id){ todayIds[id]=true; });
  if(todayTpl){
    (todayTpl.warmup||[]).forEach(function(id){ todayIds[id]=true; });
    (todayTpl.exercises||[]).forEach(function(id){ todayIds[id]=true; });
    (todayTpl.cooldown||[]).forEach(function(id){ todayIds[id]=true; });
  }

  // Header
  body.appendChild(el("div",{style:"font-size:16px;font-weight:bold;color:#2d3a2e;margin-bottom:3px;"},"Exercise Reference"));
  body.appendChild(el("div",{style:"font-size:12px;color:#8a7a6a;margin-bottom:14px;"},"How-to and cues for every move in the plan."));

  // Filter chips
  var chips=el("div",{style:"display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;"});
  REF_FILTERS.forEach(function(f){
    var active=state.refFilter===f;
    var label=f==="today"?"Today — "+(todayTpl?todayTpl.label:"Rest"):f==="tens"?"⚡ TENS":f==="recovery"?"🛠 Recovery":f==="safety"?"⚠️ Safety":f.charAt(0).toUpperCase()+f.slice(1);
    chips.appendChild(el("button",{style:"padding:5px 12px;border-radius:20px;border:2px solid "+(active?ph.color:"#d0c8bc")+";background:"+(active?ph.color:"#fff")+";color:"+(active?"#fff":"#5a4a3a")+";font-size:12px;",onclick:function(){ state.refFilter=f; render(); }},label));
  });
  body.appendChild(chips);

  // Phase note
  var pnote=el("div",{style:"padding:9px 13px;background:#2d3a2e;border-radius:8px;font-size:12px;color:#9ab090;margin-bottom:16px;line-height:1.5;"});
  pnote.appendChild(el("span",{style:"font-weight:bold;color:"+ph.color+";"},"Phase "+ph.order+": "+ph.label+" — "));
  pnote.appendChild(document.createTextNode("Exercises marked with a phase badge are locked until that phase."));
  body.appendChild(pnote);

  // TENS guide (dedicated view when filter = tens)
  if(state.refFilter==="tens"){
    body.appendChild(el("div",{style:"font-size:15px;font-weight:bold;color:#2d3a2e;margin-bottom:3px;"},"⚡ TENS Unit Guide"));
    body.appendChild(el("div",{style:"font-size:12px;color:#8a7a6a;margin-bottom:14px;"},"Etekcity 4-channel unit · FSA/HSA eligible · 8 electrode pads"));

    body.appendChild(sectionLabel("When to use"));
    var whenData=[
      { when:"After bike session", rec:"Left ankle — either side of ankle joint. Not before a ride." },
      { when:"Pre-strength (Wed)", rec:"Optional: 10–15 min on right scapula before scapula exercises." },
      { when:"Post any session", rec:"Any tender area during savasana or cool-down. 10–30 min." },
      { when:"Bad day / flare", rec:"Scapula + lower back simultaneously during savasana." },
      { when:"Cycle flare", rec:"Lower back + scapula during savasana. Both channels." }
    ];
    whenData.forEach(function(w){
      var row=el("div",{style:"background:#fff;border-radius:8px;padding:10px 13px;margin-bottom:6px;border:1px solid #e0d8cc;"});
      row.appendChild(el("div",{style:"font-size:12px;font-weight:bold;color:#2d3a2e;margin-bottom:2px;"},w.when));
      row.appendChild(el("div",{style:"font-size:11px;color:#5a4a3a;line-height:1.4;"},w.rec));
      body.appendChild(row);
    });

    body.appendChild(el("div",{style:"margin-top:16px;"}));
    body.appendChild(sectionLabel("Pad placement by area"));
    var padData=[
      { area:"Right scapula / rhomboid", place:"Above and below medial border of right shoulder blade", size:"Small 1.5\"×1.5\"", note:"Ask PT to mark spots" },
      { area:"Lower back", place:"Either side of spine at lumbar level", size:"Middle 2\"×2\"", note:"NEVER directly on spine" },
      { area:"Left ankle", place:"Either side of ankle joint", size:"Small 1.5\"×1.5\"", note:"Good post-bike" },
      { area:"Right hip / glute", place:"On glute muscle belly", size:"Large 2\"×4\"", note:"Not on the joint itself" }
    ];
    padData.forEach(function(p){
      var card=el("div",{style:"background:#fff;border-radius:8px;padding:11px 13px;margin-bottom:6px;border:1px solid #e0d8cc;"});
      card.appendChild(el("div",{style:"font-size:12px;font-weight:bold;color:#2d3a2e;margin-bottom:3px;"},p.area));
      card.appendChild(el("div",{style:"font-size:11px;color:#5a4a3a;"},p.place));
      var meta=el("div",{style:"display:flex;gap:8px;margin-top:4px;flex-wrap:wrap;"});
      meta.appendChild(el("span",{style:"font-size:10px;background:#eef4f8;color:#3a6a8a;padding:2px 8px;border-radius:10px;"},p.size));
      meta.appendChild(el("span",{style:"font-size:10px;color:#8a7a6a;font-style:italic;"},p.note));
      card.appendChild(meta);
      body.appendChild(card);
    });

    body.appendChild(el("div",{style:"margin-top:16px;"}));
    body.appendChild(sectionLabel("Usage"));
    var usageWrap=el("div",{style:"background:#fff;border-radius:8px;padding:11px 13px;border:1px solid #e0d8cc;font-size:12px;color:#5a4a3a;line-height:1.6;"});
    ["Start at the lowest intensity level","Increase slowly — most users never exceed level 3","Session duration: 10–30 min (use the built-in timer)","For scapula: start very conservative due to hypermobility"].forEach(function(u){
      var r=el("div",{style:"padding:2px 0 2px 12px;position:relative;"});
      r.appendChild(el("span",{style:"position:absolute;left:0;color:#9ab090;"},"·"));
      r.appendChild(document.createTextNode(u));
      usageWrap.appendChild(r);
    });
    body.appendChild(usageWrap);

    body.appendChild(el("div",{style:"margin-top:16px;"}));
    body.appendChild(sectionLabel("⚠️ Contraindications — never do these"));
    var warnWrap=el("div",{style:"background:#fff8f0;border:2px solid #e8c090;border-radius:8px;padding:11px 13px;font-size:12px;color:#6a4a20;line-height:1.6;"});
    ["NEVER use immediately before a bike session","NEVER place pads directly on the spine","NEVER use during sleep","NEVER use on broken, irritated, or inflamed skin","NEVER place over the front or sides of the neck","Do not use with a cardiac pacemaker","Do not use while the device is charging","Stop if skin becomes irritated or red"].forEach(function(w){
      var r=el("div",{style:"padding:2px 0 2px 14px;position:relative;"});
      r.appendChild(el("span",{style:"position:absolute;left:0;color:#c4906a;"},"✕"));
      r.appendChild(document.createTextNode(w));
      warnWrap.appendChild(r);
    });
    body.appendChild(warnWrap);
    return;
  }

  // Recovery toolkit guide
  if(state.refFilter==="recovery"){
    body.appendChild(el("div",{style:"font-size:15px;font-weight:bold;color:#2d3a2e;margin-bottom:3px;"},"🛠 Recovery Toolkit"));
    body.appendChild(el("div",{style:"font-size:12px;color:#8a7a6a;margin-bottom:14px;"},"What to reach for and when."));

    var tools=[
      { emoji:"🌡️", name:"Moist heat pack", bestFor:"Low back, scapula, flare days", timing:"Anytime — first response to pain or stiffness", notes:[] },
      { emoji:"⚡", name:"TENS unit", bestFor:"Scapula, lower back, ankle", timing:"During rest or savasana. Never immediately before bike.", notes:["See ⚡ TENS tab for full pad placement guide"] },
      { emoji:"💊", name:"Aspercreme roll-on (topical lidocaine)", bestFor:"Ankle, knee, any accessible spot", timing:"Can't reach your own scapula — use heat or TENS there instead", notes:[] },
      { emoji:"🔫", name:"Percussion gun", bestFor:"Glute, low back muscles", timing:"Day AFTER exercise — not during or after a flare", notes:["Left ankle: calf and peroneals only, small attachment, gentle/low speed","Right scapula: low speed, light pressure on muscle belly — never on joint","NOT during a flare — wait until the day after"] },
      { emoji:"💊", name:"Voltaren / diclofenac gel", bestFor:"Ankle joint, knee", timing:"Post-exercise acute soreness", notes:[] }
    ];
    tools.forEach(function(t){
      var card=el("div",{style:"background:#fff;border-radius:10px;border:1px solid #e0d8cc;padding:12px 14px;margin-bottom:8px;"});
      var top=el("div",{style:"display:flex;align-items:flex-start;gap:10px;margin-bottom:6px;"});
      top.appendChild(el("span",{style:"font-size:22px;flex-shrink:0;"},t.emoji));
      var txt=el("div",{style:"flex:1;"});
      txt.appendChild(el("div",{style:"font-size:13px;font-weight:bold;color:#2d3a2e;margin-bottom:2px;"},t.name));
      txt.appendChild(el("div",{style:"font-size:11px;color:#7a6a5a;"},"Best for: "+t.bestFor));
      txt.appendChild(el("div",{style:"font-size:11px;color:#7a6a5a;"},"Timing: "+t.timing));
      top.appendChild(txt);
      card.appendChild(top);
      if(t.notes.length){
        var noteWrap=el("div",{style:"background:#f5f0ea;border-radius:6px;padding:7px 10px;"});
        t.notes.forEach(function(n){
          var r=el("div",{style:"font-size:11px;color:#5a4a3a;padding:2px 0 2px 10px;position:relative;"});
          r.appendChild(el("span",{style:"position:absolute;left:0;color:#9a8a7a;"},"·"));
          r.appendChild(document.createTextNode(n));
          noteWrap.appendChild(r);
        });
        card.appendChild(noteWrap);
      }
      body.appendChild(card);
    });
    return;
  }

  // Safety warnings guide
  if(state.refFilter==="safety"){
    body.appendChild(el("div",{style:"font-size:15px;font-weight:bold;color:#2d3a2e;margin-bottom:3px;"},"⚠️ Safety Reminders"));
    body.appendChild(el("div",{style:"font-size:12px;color:#8a7a6a;margin-bottom:14px;"},"Stop signals for your specific conditions."));

    // Always-on rules
    var alwaysWrap=el("div",{style:"background:#fff8e6;border:2px solid #e8c84b;border-radius:10px;padding:12px 14px;margin-bottom:16px;"});
    alwaysWrap.appendChild(el("div",{style:"font-size:12px;font-weight:bold;color:#6a4a10;margin-bottom:8px;"},"Always — every session"));
    ["Consult PT before advancing phases","Pain-free range only for all scapula exercises","Stop immediately if a knee slips","Stop immediately if you feel sharp or radiating pain anywhere"].forEach(function(r){
      var row=el("div",{style:"font-size:12px;color:#6a4a10;padding:3px 0 3px 12px;position:relative;"});
      row.appendChild(el("span",{style:"position:absolute;left:0;"},"·"));
      row.appendChild(document.createTextNode(r));
      alwaysWrap.appendChild(row);
    });
    body.appendChild(alwaysWrap);

    // Stop signals by condition
    body.appendChild(sectionLabel("Stop immediately if —"));
    var signals=[
      { condition:"Knees", signal:"Knee slips or feels unstable", color:"#c4506a" },
      { condition:"Left ankle", signal:"Sharp ankle pain or feeling of giving way", color:"#c4506a" },
      { condition:"Right glute", signal:"Low back takes over — reduce load, don't push through", color:"#c49a30" },
      { condition:"Low back", signal:"Pain radiating down the leg", color:"#c4506a" },
      { condition:"Right scapula", signal:"Sharp or radiating pain into arm or neck", color:"#c4506a" },
      { condition:"Hypermobility", signal:"Any joint gives way or feels unstable", color:"#c4506a" }
    ];
    signals.forEach(function(s){
      var card=el("div",{style:"background:#fff;border-radius:9px;border:1px solid #e0d8cc;border-left:4px solid "+s.color+";padding:10px 13px;margin-bottom:7px;display:flex;align-items:flex-start;gap:10px;"});
      card.appendChild(el("div",{style:"font-size:11px;font-weight:bold;color:#2d3a2e;min-width:90px;padding-top:1px;"},s.condition));
      card.appendChild(el("div",{style:"font-size:12px;color:#5a3a3a;line-height:1.4;"},s.signal));
      body.appendChild(card);
    });

    body.appendChild(el("div",{style:"margin-top:14px;padding:10px 13px;background:#f5ece6;border-radius:8px;font-size:11px;color:#7a4a30;line-height:1.5;border-left:3px solid #c49a8a;"},"If radiating pain (leg or arm), 3+ consecutive bad days, or any sudden worsening → contact PT or GP before resuming exercise."));
    return;
  }

  // Exercise cards
  var exList=Object.keys(DATA.exercises);
  exList.forEach(function(id){
    var ex=DATA.exercises[id];
    var f=state.refFilter;
    if(f==="today"){
      if(!todayIds[id]) return;
    } else if(f!=="all"){
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
  Promise.all([fetchJSON("exercises"),fetchJSON("phases"),fetchJSON("templates"),fetchJSON("schedule"),fetchJSON("ifit-series")])
    .then(function(res){
      DATA.exercises=res[0].exercises; DATA.phases=res[1].phases; DATA.templates=res[2].templates; DATA.schedule=res[3]; DATA.ifitSeries=res[4].series;
      recomputeInfo();
      state.selectedDay=3; // today is always index 3 in the rolling window
      if(!weekData().intention) state.showIntentionPicker=true;
      render();
    })
    .catch(function(err){
      root.innerHTML='<div style="padding:40px 24px;font-family:Georgia,serif;color:#7a4a30;">Couldn\u2019t load the plan data ('+err.message+'.json). If you just opened offline for the first time, connect once so it can cache, then reopen.</div>';
    });
}
if(typeof module!=="undefined" && module.exports){ module.exports={ templateIdForDate:function(d){return templateIdForDate(d);}, _setData:function(x){DATA=x;} }; }
else { boot(); }
