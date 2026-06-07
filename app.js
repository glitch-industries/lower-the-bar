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
  { value:1, emoji:"\ud83d\ude34", label:"Low" },
  { value:2, emoji:"\ud83d\ude10", label:"Okay" },
  { value:3, emoji:"\u26a1", label:"Strong" }
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
  { text:"Done is a perfect score. Show your work.", phase:1 },
  { text:"The minimum effective dose is: starting.", phase:1 },
  { text:"Messy reps count. Technically and officially.", phase:1 },
  { text:"Just start. Optimize later.", phase:1 },
  { text:"The warmup counts. Every single time.", phase:1 },
  { text:"Ankle mob at minimum. The rest is extra credit.", phase:1 },

  // Phase 2 — consistency, habit formation, showing up twice
  { text:"You're proving a theorem about yourself. It's going well!", phase:2 },
  { text:"Habit: noun. Something you do before your brain files an objection.", phase:2 },
  { text:"The streak is a side effect. The showing up is the data.", phase:2 },
  { text:"Consistency is just repetition until the question becomes boring.", phase:2 },
  { text:"It gets easier. The timeline is a little annoying, but the math is real.", phase:2 },
  { text:"Your future self is rooting for you. Annoyingly.", phase:2 },
  { text:"You're becoming someone who does this. She's great, by the way.", phase:2 },
  { text:"Any improvement is technically infinite percent better than zero. Do the math!", phase:2 },

  // Phase 3 — form, deliberate practice, mind-muscle
  { text:"Slow is correct. Correct is the whole assignment.", phase:3 },
  { text:"Find your glute. Introduce yourself.", phase:3 },
  { text:"Squeeze the right glute like it owes you money.", phase:3 },
  { text:"Your nervous system is taking notes. Make them good.", phase:3 },
  { text:"This is where you talk to your body. Weird, but it works.", phase:3 },
  { text:"Mind-muscle connection: not mystical. Just pay attention.", phase:3 },
  { text:"The derivative of showing up is momentum.", phase:3 },
  { text:"Form is free gains. Sloppy is just sloppy with extra steps.", phase:3 },

  // Phase 4 — strength, maintenance, owning it
  { text:"You didn't quit. That's great data.", phase:4 },
  { text:"Strong enough to do the thing. That was always the rubric.", phase:4 },
  { text:"Maintenance: the underrated third act.", phase:4 },
  { text:"Training to be functional at 80. Respect the timeline.", phase:4 },
  { text:"The reps compound. So do you.", phase:4 },
  { text:"You are a variable with unlimited potential. Solve for you!", phase:4 },

  // Any phase — general wit
  { text:"Functional beats perfect. Proven repeatedly.", phase:"any" },
  { text:"Showing up ugly still counts. The bar doesn't grade on aesthetics.", phase:"any" },
  { text:"Good enough is a legitimate grade.", phase:"any" },
  { text:"No late penalties here. Just start tomorrow.", phase:"any" },
  { text:"You're not behind. There's no curve. There's just next.", phase:"any" },
  { text:"Every rep is data. All of it counts.", phase:"any" },
  { text:"Progress is embarrassingly nonlinear. Keep going.", phase:"any" },
  { text:"The slope of your effort is positive. That's the whole graph.", phase:"any" },
  { text:"You did the thing. Kind of impressive, honestly.", phase:"any" }
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
        var p=el("div",{style:"background:#f5f0ea;border:1px solid #d0c8bc;border-radius:10px;padding:12px 14px;margin-bottom:14px;font-size:12px;color:#3a3028;"});
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

  // Active series — collapsed one-line view
  var activeSeries=null;
  for(var z=0;z<DATA.ifitSeries.length;z++) if(DATA.ifitSeries[z].id===ist.seriesId){activeSeries=DATA.ifitSeries[z];break;}
  if(!activeSeries) return;

  var episodesDone=ist.episodesDone||0;
  var sw=el("div",{style:"background:#fff;border:1px solid #d0c8bc;border-radius:10px;padding:11px 14px;margin-bottom:14px;"});

  // Collapsed row: icon + name + episode count + done button
  var mainRow=el("div",{style:"display:flex;align-items:center;gap:10px;"});
  mainRow.appendChild(el("span",{style:"font-size:18px;"},"📺"));
  var nameEl=el("div",{style:"flex:1;"});
  nameEl.appendChild(el("div",{style:"font-size:13px;font-weight:bold;color:#2d3a2e;"},activeSeries.name));
  nameEl.appendChild(el("div",{style:"font-size:11px;color:#9a8a7a;"},"Episode "+(episodesDone+1)));
  mainRow.appendChild(nameEl);
  mainRow.appendChild(el("button",{style:"padding:7px 13px;background:#5a9e8a;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:bold;flex-shrink:0;",onclick:function(){
    saveIfitState({episodesDone:episodesDone+1});
    render();
  }},"Done ✓"));
  sw.appendChild(mainRow);

  // Expandable management section
  if(state.ifitExpanded){
    var mgmt=el("div",{style:"margin-top:10px;padding-top:10px;border-top:1px solid #e8e0d8;display:flex;gap:8px;flex-wrap:wrap;"});
    mgmt.appendChild(el("a",{href:activeSeries.url,target:"_blank",style:"padding:7px 12px;background:#2d3a2e;color:#fff;border:none;border-radius:8px;font-size:11px;font-weight:bold;text-align:center;text-decoration:none;"},"Open in iFIT ↗"));
    mgmt.appendChild(el("button",{style:"padding:7px 12px;background:transparent;border:1px solid #d0c8bc;border-radius:8px;font-size:11px;color:#9a8a7a;",onclick:function(){
      var done=(ifitState().completedIds)||[];
      done=done.concat([activeSeries.id]);
      saveIfitState({seriesId:null,episodesDone:0,completedIds:done,choosingNew:true,pendingChoices:null});
      state.ifitExpanded=false; render();
    }},"Finish series"));
    mgmt.appendChild(el("button",{style:"padding:7px 12px;background:transparent;border:1px solid #d0c8bc;border-radius:8px;font-size:11px;color:#9a8a7a;",onclick:function(){
      saveIfitState({choosingNew:true,pendingChoices:null});
      state.ifitExpanded=false; render();
    }},"Switch series"));
    mgmt.appendChild(el("button",{style:"padding:7px 12px;background:transparent;border:none;font-size:11px;color:#b0a898;",onclick:function(){ state.ifitExpanded=false; render(); }},"Close"));
    sw.appendChild(mgmt);
  } else {
    sw.appendChild(el("button",{style:"margin-top:6px;padding:0;background:transparent;border:none;font-size:11px;color:#9a8a7a;text-decoration:underline;",onclick:function(){ state.ifitExpanded=true; render(); }},"manage series"));
  }
  body.appendChild(sw);
}

var TAG_COLORS = { glute:"#5a9e8a", cardio:"#5a8a9a", strength:"#8a6eb5", yoga:"#b07a5a", rest:"#9aaa8a", vacation:"#e8a0b0" };
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
  intentionPickerOpen: false,
  progressionOpen: false,
  writingOwn: false,
  customIntention: "",
  bonusRevealed: false,
  currentBonus: null,
  seenBonusIds: [],
  refreshesLeft: 2,
  showUnlock: false,
  refFilter: "today",
  vacationDays: 7,
  vacationPickerOpen: false,
  editingCheckin: false
};

var PAIN_FLAGS = [
  { id:"lower_back",    label:"Lower back",     emoji:"🪻" },
  { id:"right_hip",     label:"Right hip",      emoji:"🪻" },
  { id:"right_scapula", label:"Right scapula",  emoji:"🪻" },
  { id:"left_ankle",    label:"Left ankle",     emoji:"🪻" },
  { id:"knees",         label:"Knees",          emoji:"🪻" }
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
function openKey(){ return "open-"+selectedDateKey(); }
function openRitualDone(){ return !!store[openKey()]; }
function cooldownKey(){ return "cooldown-"+selectedDateKey(); }
function cooldownDone(){ return !!store[cooldownKey()]; }
function closeKey(){ return "close-"+selectedDateKey(); }
function closeRitualDone(){ return !!store[closeKey()]; }

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

/* ---------- timer ---------- */
var _timerInterval = null;

function parseDuration(dose){
  if(!dose) return null;
  // Skip rep-based doses that happen to mention seconds (e.g. "5 sec hold × 10 reps")
  if(/[×x]\s*\d+\s*rep/i.test(dose)) return null;
  var twoSided = /each side|each leg|both sides/i.test(dose);
  var m;
  // Minutes: "2 min", "2.5 min"
  m = dose.match(/(\d+(?:\.\d+)?)\s*min/i);
  if(m){ return { secs: Math.round(parseFloat(m[1])*60), twoSided: twoSided }; }
  // Seconds: "30 sec", "20–30 sec" (take lower bound), "30 sec hold"
  m = dose.match(/(\d+)(?:[–\-]\d+)?\s*sec/i);
  if(m){ return { secs: parseInt(m[1]), twoSided: twoSided }; }
  return null;
}

function fmtTimer(secsRemaining){
  var s = Math.max(0, Math.ceil(secsRemaining));
  var m = Math.floor(s/60); var r = s%60;
  return m>0 ? m+":"+(r<10?"0":"")+r : s+"s";
}

function beepAndVibrate(){
  try{
    var ctx=new (window.AudioContext||window.webkitAudioContext)();
    var osc=ctx.createOscillator(); var gain=ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value=880; osc.type="sine";
    gain.gain.setValueAtTime(0.3,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.4);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime+0.4);
  }catch(e){}
  try{ if(navigator.vibrate) navigator.vibrate([100,50,100]); }catch(e){}
}

function startExTimer(listIdx, durationSecs, twoSided, side){
  clearInterval(_timerInterval);
  state.activeTimer={listIdx:listIdx, startMs:Date.now(), durationSecs:durationSecs, twoSided:twoSided, side:side||1};
  _timerInterval=setInterval(function(){
    if(!state.activeTimer){ clearInterval(_timerInterval); return; }
    var elapsed=(Date.now()-state.activeTimer.startMs)/1000;
    if(elapsed>=state.activeTimer.durationSecs){
      beepAndVibrate();
      var t=state.activeTimer;
      if(t.twoSided && t.side===1){
        state.activeTimer={listIdx:t.listIdx, startMs:Date.now(), durationSecs:t.durationSecs, twoSided:t.twoSided, side:2};
      } else {
        clearInterval(_timerInterval); _timerInterval=null; state.activeTimer=null;
        var c=getChecks(); var n={}; for(var k in c)n[k]=c[k]; n[t.listIdx]=true; store[checksKey()]=n; saveStore(store);
        var tpl2=DATA.templates[templateIdForDate(INFO.todayKey)];
        if(tpl2) maybeMarkComplete(exForPhase(tpl2.exercises||[]));
      }
      render();
    }
  },1000);
}

function cancelTimer(){ clearInterval(_timerInterval); _timerInterval=null; state.activeTimer=null; render(); }

/* ---------- mutations ---------- */
function update(key, obj){ var cur=store[key]||{}; var n={}; for(var k in cur)n[k]=cur[k]; for(var k2 in obj)n[k2]=obj[k2]; store[key]=n; saveStore(store); }
function updateDayData(o){ update(dayKey(), o); render(); }
function updateWeekData(o){ update("week-"+INFO.weekMondayKey, o); render(); }
function toggleOpenRitual(){ if(selectedIsFuture()) return; store[openKey()]=!store[openKey()]; saveStore(store); render(); }
function toggleCooldown(){ if(selectedIsFuture()) return; store[cooldownKey()]=!store[cooldownKey()]; saveStore(store); render(); }
function toggleCloseRitual(){ if(selectedIsFuture()) return; store[closeKey()]=!store[closeKey()]; saveStore(store); render(); }

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
function rollingEmoji(n){ return n===7?"🔥":n>=6?"🌟":n>=4?"⭐":n>=2?"✨":"🌱"; }
function rollingCount(){
  var h=buildHistory();
  return h.filter(function(e){
    if(e.isRest) return !!store["open-"+e.key]; // rest day counts if open ritual done
    return !!(e.data.completed||e.data.energyBefore);
  }).length;
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
function sectionLabel(t){ return el("div",{style:"font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#e8a0b0;margin-bottom:7px;font-weight:bold;"},t); }

/* ---------- render ---------- */
var root;
function render(){
  recomputeInfo();
  // Preserve scroll position across rebuilds so toggles don't jump to top.
  // Reset to 0 when switching tabs or views.
  var savedScroll = (root._lastView === state.view && root.children[1]) ? root.children[1].scrollTop : 0;
  root._lastView = state.view;
  root.innerHTML="";

  // Fixed top zone — header, tabs, day selector never scroll away
  var stickyTop=el("div",{style:"flex-shrink:0;background:#f5f0ea;"});
  stickyTop.appendChild(renderHeader());
  stickyTop.appendChild(renderTabs());
  if(state.view==="session") stickyTop.appendChild(renderDaySelector());
  root.appendChild(stickyTop);

  // Scrollable content zone
  var flareBg=(state.view==="session" && state.flareMode && !selectedIsFuture())?"background:#fdf5f9;":"";
  var scrollArea=el("div",{style:"flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;background:"+(flareBg?"#fdf5f9":"#f5f0ea")+";padding-bottom:env(safe-area-inset-bottom,16px);"});
  var body=el("div",{"class":"fade",style:"padding:16px 18px;max-width:580px;margin:0 auto;"});
  if(state.view==="session") renderSession(body);
  else if(state.view==="history") renderHistory(body);
  else if(state.view==="reference") renderReference(body);
  scrollArea.appendChild(body);
  root.appendChild(scrollArea);
  scrollArea.scrollTop = savedScroll;
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
  var ph=INFO.phase, wd=weekData(), sc=rollingCount();
  var h=el("div",{style:"background:#2d3a2e;color:#e8dfd0;padding:18px 22px 14px;"});
  h.appendChild(el("div",{style:"font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#9ab090;margin-bottom:3px;"},"12-Week Glute, Joint & Stability Plan"));
  var row=el("div",{style:"display:flex;align-items:center;justify-content:space-between;margin-bottom:3px;"});
  var title=el("div",{style:"font-size:19px;font-weight:bold;"}); title.appendChild(document.createTextNode("Week "+INFO.planWeek+" \u00b7 ")); title.appendChild(el("span",{style:"color:#9ab090;"},ph.label));
  row.appendChild(title);
  h.appendChild(row);
  if(wd.intention){
    var ib=el("div",{style:"background:#1a2318;border-radius:7px;padding:8px 12px;font-size:12px;color:#9ab090;font-style:italic;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;gap:10px;"});
    ib.appendChild(el("span",{style:"color:#e8dfd0;flex:1;"},'"'+wd.intention+'"'));
    ib.appendChild(el("button",{style:"flex-shrink:0;padding:4px 10px;background:transparent;border:1px solid #3a5a30;border-radius:20px;font-size:11px;color:#7a9a70;font-family:inherit;cursor:pointer;",onclick:function(){ state.intentionPickerOpen=true; state.view="history"; render(); }},"change"));
    h.appendChild(ib);
  }

  var bar=el("div",{style:"background:#1a2318;border-radius:4px;height:4px;overflow:hidden;"});
  bar.appendChild(el("div",{style:"height:100%;width:"+((ph.order/4)*100)+"%;background:"+ph.color+";border-radius:4px;"}));
  h.appendChild(bar);
  var sub=el("div",{style:"display:flex;align-items:center;justify-content:space-between;margin-top:6px;"});
  sub.appendChild(el("div",{style:"font-size:11px;color:#6a7a60;"},"Phase "+ph.order+" of 4"));
  var isFinalPhase=ph.order===4;
  var progPill=el("button",{style:"padding:3px 10px;border-radius:20px;border:1px solid "+(isFinalPhase?"#3a5a30":"#5a8a60")+";background:transparent;font-size:11px;color:"+(isFinalPhase?"#5a7a50":"#9ab090")+";font-family:inherit;cursor:pointer;display:flex;align-items:center;gap:4px;",onclick:function(){ state.progressionOpen=true; state.view="history"; render(); setTimeout(function(){ var a=document.getElementById('progression-anchor'); if(a) a.scrollIntoView({behavior:'smooth',block:'start'}); },50); }});
  progPill.appendChild(el("span",{},isFinalPhase?"🏁":"📈"));
  progPill.appendChild(el("span",{},isFinalPhase?"final phase":"progression"));
  sub.appendChild(progPill);
  h.appendChild(sub);
  return h;
}

function renderTabs(){
  var ph=INFO.phase;
  var tabs=[{id:"session",label:"Session"},{id:"history",label:"This Week"},{id:"reference",label:"Reference"}];
  var bar=el("div",{style:"background:#e8e0d4;border-bottom:2px solid #d0c8bc;display:flex;"});
  tabs.forEach(function(t){
    var a=state.view===t.id;
    bar.appendChild(el("button",{style:"flex:1;padding:10px 0;background:"+(a?"#f5f0ea":"transparent")+";border:none;border-bottom:"+(a?"3px solid #e8a0b0":"3px solid transparent")+";font-size:13px;color:"+(a?"#2d3a2e":"#7a6a5a")+";font-weight:"+(a?"bold":"normal")+";",onclick:function(){ state.view=t.id; render(); }},t.label));
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
    label.appendChild(el("span",{style:"font-size:9px;line-height:1;margin-top:1px;opacity:"+(active?"1":"0.65")+";"},tpl?tpl.icon:""));
    var btn=el("button",{style:"padding:6px 10px;border-radius:8px;border:"+(isToday&&!active?"2px solid #2d3a2e":"2px solid transparent")+";background:"+(active?"#2d3a2e":done&&!active?"#5a9e8a":isPast?"#e8e3db":"#f0ebe3")+";color:"+(active?"#fff":done&&!active?"#fff":isPast?"#8a7a6a":"#4a3f35")+";font-size:12px;white-space:nowrap;flex-shrink:0;line-height:1;",onclick:(function(idx){ return function(){ state.selectedDay=idx; state.hardMode=false; state.bonusRevealed=false; state.currentBonus=null; state.seenBonusIds=[]; state.refreshesLeft=2; state.editingCheckin=false; state.showPainFlags=false; state.ifitExpanded=false; render(); }; })(i)});
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
  var banner=el("div",{style:"background:#e8a0b0;color:#fff;border-radius:12px;padding:14px 16px;margin-bottom:14px;text-align:center;"});
  banner.appendChild(el("div",{style:"font-size:20px;margin-bottom:4px;"},"🌴"));
  banner.appendChild(el("div",{style:"font-size:15px;font-weight:bold;margin-bottom:2px;"},"Vacation mode"));
  banner.appendChild(el("div",{style:"font-size:12px;opacity:0.85;"},daysLeft>0?(daysLeft===1?"Last day — plan resumes tomorrow.":daysLeft+" days left. Plan resumes automatically."):"Wrapping up today."));
  body.appendChild(banner);


  // Open ritual (vacation)
  var phOrder2=String(INFO.phase.order);
  var openIds2=(DATA.schedule.openRitual&&DATA.schedule.openRitual[phOrder2])||["ankle-circles","leg-swings","cat-cow","wall-mobilisation"];
  var aDone=openRitualDone();
  var aWrap=el("div",{style:"margin-bottom:14px;"});
  var a=el("div",{style:"display:flex;align-items:center;gap:12px;padding:13px 15px;border-radius:10px;"+(isFuture?"background:#f0ece4;border:2px solid #ddd5c8;opacity:0.7;":(aDone?"background:#d4eddf;border:2px solid #5a9e8a;":"background:#fff;border:2px solid #2d3a2e;")),onclick:isFuture?null:toggleOpenRitual});
  a.appendChild(el("span",{style:"font-size:22px;"},isFuture?"\ud83d\udd12":(aDone?"\u2705":"\ud83c\udf05")));
  a.appendChild(el("div",{style:"flex:1;"},[el("div",{style:"font-size:14px;font-weight:bold;color:"+(aDone?"#2d6a4a":"#3a3028")+";"},"Open ritual"),el("div",{style:"font-size:11px;color:"+(aDone?"#4a8a64":"#9a8a7a")+";"},aDone?"Done.":"Still non-negotiable, even on vacation.")]));
  aWrap.appendChild(a);
  if(!isFuture){
    var aList=el("div",{style:"background:#f5f0ea;border:1px solid #d0c8bc;border-top:none;border-radius:0 0 10px 10px;padding:10px 14px;display:flex;flex-direction:column;gap:8px;"});
    openIds2.forEach(function(id){ var ex=DATA.exercises[id]; if(!ex)return; var row=el("div",null); row.appendChild(el("div",{style:"font-size:12px;font-weight:bold;color:#3a3028;"},ex.name+(doseFor(ex)?" \u2014 "+doseFor(ex):""))); if(ex.cues&&ex.cues.length) row.appendChild(el("div",{style:"font-size:11px;color:#9a8a7a;"},ex.cues[0])); aList.appendChild(row); });
    aWrap.appendChild(aList);
  }
  body.appendChild(aWrap);

  // Today's template exercises
  if(!isFuture && tpl.note) body.appendChild(el("div",{style:"padding:9px 13px;margin-bottom:12px;background:#f9f4ee;border-radius:8px;font-size:12px;color:#6a5a4a;border-left:3px solid #e8a0b0;line-height:1.5;"},tpl.note));
  var exIds=(tpl.warmup||[]).concat(tpl.exercises||[]);
  if(exIds.length && !isFuture){
    var mw=el("div",{style:"margin-bottom:14px;"}); mw.appendChild(sectionLabel("Today's moves"));
    exIds.forEach(function(id,i){
      var ex=DATA.exercises[id]; if(!ex)return;
      var done=isChecked(i); var dose=doseFor(ex);
      var card=el("div",{style:"padding:11px 13px;background:"+(done?"#ddf0e8":"#fff")+";border-radius:8px;font-size:13px;margin-bottom:6px;border-left:4px solid "+(done?"#5a9e8a":"#e8a0b0")+";display:flex;align-items:flex-start;gap:10px;",onclick:function(){ toggleChecked(i); render(); }});
      card.appendChild(el("span",{style:"font-size:15px;flex-shrink:0;"},done?"✅":"⬜"));
      var txt=el("div",{style:"flex:1;"}); txt.appendChild(el("div",{style:(done?"text-decoration:line-through;":"")+"font-weight:bold;"},ex.name+(dose?" — "+dose:""))); if(ex.cues&&ex.cues.length) txt.appendChild(el("div",{style:"font-size:11px;color:#8a7a6a;margin-top:2px;"},ex.cues[0])); card.appendChild(txt);
      mw.appendChild(card);
    });
    body.appendChild(mw);
  }

  // Done tap
  if(!isFuture){
    if(!dd.completed){
      body.appendChild(el("button",{style:"width:100%;padding:14px;background:#e8a0b0;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:bold;margin-bottom:14px;",onclick:function(){ update(dayKey(),{completed:true}); render(); }},"Done for today ✓"));
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
  var banner=el("div",{style:"background:#6a3a58;color:#fff;border-radius:12px;padding:14px 16px;margin-bottom:14px;"});
  banner.appendChild(el("div",{style:"font-size:18px;margin-bottom:4px;"},"🌸"));
  banner.appendChild(el("div",{style:"font-size:15px;font-weight:bold;margin-bottom:3px;"},"Triple flare protocol"));
  banner.appendChild(el("div",{style:"font-size:12px;opacity:0.85;line-height:1.5;"},"Lower back + right hip + right scapula together. Likely ligament laxity. Modified session only — rest IS the work today."));
  var exitBtn=el("button",{style:"margin-top:10px;padding:6px 14px;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);border-radius:20px;color:#fff;font-size:11px;",onclick:function(){ state.flareMode=false; render(); }},"← Back to normal session");
  banner.appendChild(exitBtn);
  body.appendChild(banner);

  // Open ritual — flare day
  var aDone=openRitualDone();
  var aCard=el("div",{style:"display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:10px;margin-bottom:12px;"+(aDone?"background:#d4eddf;border:2px solid #5a9e8a;":"background:#fff;border:2px solid #2d3a2e;"),onclick:toggleOpenRitual});
  aCard.appendChild(el("span",{style:"font-size:20px;"},aDone?"✅":"🦶"));
  aCard.appendChild(el("div",{style:"flex:1;"},[el("div",{style:"font-size:13px;font-weight:bold;color:"+(aDone?"#2d6a4a":"#3a3028")+";"},"Ankle mobilisation — twice today"),el("div",{style:"font-size:11px;color:"+(aDone?"#4a8a64":"#9a8a7a")+";"},"Ligament laxity is highest. Do it morning and evening.")]));
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
    var card=el("div",{style:"padding:11px 13px;background:"+(done?"#ede8f5":"#fff")+";border-radius:8px;margin-bottom:6px;border-left:4px solid "+(done?"#6a3a58":"#b0a0c4")+";display:flex;align-items:flex-start;gap:10px;",onclick:function(){ toggleChecked(i); render(); }});
    card.appendChild(el("span",{style:"font-size:15px;flex-shrink:0;"},done?"✅":"⬜"));
    var txt=el("div",{style:"flex:1;"});
    txt.appendChild(el("div",{style:(done?"text-decoration:line-through;":"")+"font-weight:bold;color:#5a3a58;"},item.name+(item.dose?" — "+item.dose:"")));
    txt.appendChild(el("div",{style:"font-size:11px;color:#7a5a78;margin-top:2px;"},item.cue));
    card.appendChild(txt);
    body.appendChild(card);
  });

  // Skip today
  body.appendChild(el("div",{style:"margin-top:14px;margin-bottom:8px;"}));
  body.appendChild(sectionLabel("Skip today"));
  var skipWrap=el("div",{style:"background:#faeef1;border:1px solid #e0bfc8;border-radius:8px;padding:10px 14px;margin-bottom:14px;"});
  ["Any bridging or glute loading","All band or dumbbell scapula work","The bike","Any held standing poses"].forEach(function(s){
    var row=el("div",{style:"font-size:12px;color:#8a5068;padding:3px 0 3px 14px;position:relative;"});
    row.appendChild(el("span",{style:"position:absolute;left:0;color:#b0a0c4;"},"✕"));
    row.appendChild(document.createTextNode(s));
    skipWrap.appendChild(row);
  });
  body.appendChild(skipWrap);

  // For the pain
  body.appendChild(sectionLabel("For the pain"));
  var painWrap=el("div",{style:"background:#faeef1;border:1px solid #e0bfc8;border-radius:8px;padding:10px 14px;margin-bottom:14px;"});
  ["🌡️  Heat pack on right rhomboid — 15–20 min","⚡  TENS on right scapula + lower back simultaneously during savasana","🛏️  Pillow between knees or under right hip if side-lying","💊  Magnesium supplement (discuss with GP — helps cycle-related tension)","🚨  Pain travelling DOWN the leg → contact PT or GP today"].forEach(function(p){
    painWrap.appendChild(el("div",{style:"font-size:12px;color:#6a3a58;padding:4px 0;line-height:1.4;"},p));
  });
  body.appendChild(painWrap);

  // Completion
  if(!dd.completed){
    body.appendChild(el("button",{style:"width:100%;padding:14px;background:#6a3a58;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:bold;margin-bottom:14px;",onclick:function(){ update(dayKey(),{completed:true,mode:"flare"}); render(); }},"Done — rested well ✓"));
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
  var card=el("div",{style:"background:#f5f0ea;border:1px solid #d0c8bc;border-radius:10px;padding:12px 14px;margin-bottom:14px;"});
  var top=el("div",{style:"display:flex;align-items:flex-start;gap:10px;"});
  top.appendChild(el("span",{style:"font-size:20px;flex-shrink:0;"},"⚡"));
  var txt=el("div",{style:"flex:1;"});
  txt.appendChild(el("div",{style:"font-size:13px;font-weight:bold;color:#2d3a2e;margin-bottom:2px;"},tens.title));
  txt.appendChild(el("div",{style:"font-size:12px;color:#5a4a3a;line-height:1.4;margin-bottom:4px;"},tens.note));
  txt.appendChild(el("div",{style:"font-size:10px;color:#9a8a7a;font-style:italic;"},tens.pads));
  top.appendChild(txt);
  card.appendChild(top);
  card.appendChild(el("div",{style:"font-size:10px;color:#9a8a7a;margin-top:6px;padding-top:6px;border-top:1px solid #d0c8bc;"},"Optional — Reference tab has full pad placement guide and contraindications"));
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
  dh.appendChild(el("div",null,[ el("div",{style:"font-size:17px;font-weight:bold;color:#2d3a2e;"},selDayName), el("div",{style:"font-size:12px;color:#9a8a7a;font-weight:bold;letter-spacing:0.05em;"},tpl.label) ]));
  if(isToday) dh.appendChild(el("div",{style:"margin-left:auto;background:#2d3a2e;color:#e8dfd0;padding:3px 9px;border-radius:20px;font-size:10px;font-weight:bold;text-transform:uppercase;"},"Today"));
  body.appendChild(dh);

  // Day focus — top of session, sets the mental frame before anything else
  var selDayAbbr=DAY_NAMES[new Date(selectedDateKey()+"T12:00:00").getDay()];
  var dayFocusTxt=DATA.schedule.dayFocus&&DATA.schedule.dayFocus[selDayAbbr];
  if(dayFocusTxt){
    var dfRow=el("div",{style:"display:flex;align-items:baseline;gap:8px;padding:8px 13px;margin-bottom:14px;background:#f0ebe3;border-radius:8px;border-left:3px solid #9ab090;"});
    dfRow.appendChild(el("span",{style:"font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:#9ab090;font-weight:bold;white-space:nowrap;flex-shrink:0;"},"Today's focus"));
    dfRow.appendChild(el("span",{style:"font-size:12px;color:#4a3f35;line-height:1.4;"},dayFocusTxt));
    body.appendChild(dfRow);
  }

  // Check-in: today only — no point logging energy after the fact
  if(isToday && tag!=="rest"){
    var showFullCheckin = (!dd.energyBefore || state.editingCheckin) && !dd.completed;
    if(showFullCheckin){
      var ec=el("div",{style:"background:#fff;border:2px solid #d0c8bc;border-radius:10px;padding:13px 15px;margin-bottom:14px;"});
      ec.appendChild(el("div",{style:"font-size:13px;font-weight:bold;color:#4a3a2e;margin-bottom:10px;"},"How’s your energy right now?"));
      var er=el("div",{style:"display:flex;gap:8px;"});
      ENERGY_OPTIONS.forEach(function(o){
        var sl=dd.energyBefore===o.value;
        er.appendChild(el("button",{style:"flex:1;padding:10px 4px;border-radius:10px;border:2px solid "+(sl?tagColor:"#d0c8bc")+";background:"+(sl?tagColor:"#f5f0ea")+";color:"+(sl?"#fff":"#4a3a2e")+";text-align:center;",onclick:function(){ state.editingCheckin=false; updateDayData({energyBefore:o.value}); }},[el("div",{style:"font-size:20px;"},o.emoji),el("div",{style:"font-size:11px;margin-top:2px;"},o.label)]));
      });
      ec.appendChild(er);
      if(dd.energyBefore===1){
        var fmBtn=el("div",{style:"margin-top:10px;display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:"+(state.hardMode?"#faeef1":"#f5f0ea")+";border-radius:8px;border:1px solid "+(state.hardMode?"#e8a0b0":"#d0c8bc")+";cursor:pointer;",onclick:function(){ state.hardMode=!state.hardMode; render(); }});
        fmBtn.appendChild(el("div",null,[el("div",{style:"font-size:12px;font-weight:bold;color:"+(state.hardMode?"#7a3a52":"#5a4a3a")+";"},state.hardMode?"Functional mode — on":"Go functional?"),el("div",{style:"font-size:11px;color:#9a8a7a;"},state.hardMode?"Scaled down. That counts.":"Low energy. A valid option.")]));
        var fmsw=el("div",{style:"width:34px;height:19px;border-radius:10px;background:"+(state.hardMode?"#e8a0b0":"#c0b8b0")+";position:relative;flex-shrink:0;"}); fmsw.appendChild(el("div",{style:"position:absolute;top:2px;left:"+(state.hardMode?17:2)+"px;width:15px;height:15px;border-radius:50%;background:#fff;"})); fmBtn.appendChild(fmsw);
        ec.appendChild(fmBtn);
      }
      if(dd.energyBefore===3) ec.appendChild(el("div",{style:"margin-top:10px;padding:9px 12px;background:#e8f5ee;border-radius:8px;font-size:12px;color:#2d6a4a;border-left:3px solid #5a9e8a;"},"Good energy. Stick to prescribed reps — no need to do extra."));
      var currentFlags=getPainFlags();
      var showingPain=state.showPainFlags||currentFlags.length>0;
      if(!showingPain){
        ec.appendChild(el("button",{style:"margin-top:10px;padding:0;background:transparent;border:none;font-size:12px;color:#9a8a7a;text-decoration:underline;",onclick:function(){ state.showPainFlags=true; render(); }},"Something's bothering me today"));
      } else {
        var painSection=el("div",{style:"margin-top:10px;"});
        var painHeader=el("div",{style:"display:flex;align-items:center;justify-content:space-between;margin-bottom:7px;"});
        painHeader.appendChild(el("div",{style:"font-size:12px;font-weight:bold;color:#7a5a5a;"},"Any pain or discomfort today?"));
        if(!currentFlags.length) painHeader.appendChild(el("button",{style:"padding:0;background:transparent;border:none;font-size:11px;color:#9a8a7a;",onclick:function(){ state.showPainFlags=false; render(); }},"never mind"));
        painSection.appendChild(painHeader);
        var flagRow=el("div",{style:"display:flex;gap:6px;flex-wrap:wrap;"});
        PAIN_FLAGS.forEach(function(pf){
          var on=currentFlags.indexOf(pf.id)!==-1;
          flagRow.appendChild(el("button",{style:"padding:5px 10px;border-radius:20px;border:2px solid "+(on?"#e8a0b0":"#d0c8bc")+";background:"+(on?"#faeef1":"#f5f0ea")+";color:"+(on?"#7a4060":"#6a5a5a")+";font-size:11px;",onclick:function(){
            var f=getPainFlags().slice(); var idx=f.indexOf(pf.id);
            if(idx===-1) f.push(pf.id); else f.splice(idx,1);
            updateDayData({painFlags:f});
          }},pf.emoji+" "+pf.label));
        });
        painSection.appendChild(flagRow);
        ec.appendChild(painSection);
      }
      if(isTripleFlare()){
        var flareAlert=el("div",{style:"margin-top:10px;padding:10px 12px;background:#faeef1;border-radius:8px;border-left:3px solid #e8a0b0;"});
        flareAlert.appendChild(el("div",{style:"font-size:12px;font-weight:bold;color:#7a4060;margin-bottom:4px;"},"🪻 Triple flare detected"));
        flareAlert.appendChild(el("div",{style:"font-size:11px;color:#6a4a70;margin-bottom:8px;line-height:1.4;"},"Lower back + right hip + right scapula together. Likely ligament laxity. There’s a specific protocol for this."));
        flareAlert.appendChild(el("button",{style:"width:100%;padding:9px;background:#6a3a58;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:bold;",onclick:function(){ state.flareMode=true; render(); }},"Switch to flare protocol →"));
        ec.appendChild(flareAlert);
      } else if(currentFlags.length>=2){
        var fmBtn2=el("div",{style:"margin-top:10px;display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:"+(state.hardMode?"#faeef1":"#f5f0ea")+";border-radius:8px;border:1px solid "+(state.hardMode?"#e8a0b0":"#d0c8bc")+";cursor:pointer;",onclick:function(){ state.hardMode=!state.hardMode; render(); }});
        fmBtn2.appendChild(el("div",null,[el("div",{style:"font-size:12px;font-weight:bold;color:"+(state.hardMode?"#7a3a52":"#5a4a3a")+";"},state.hardMode?"Functional mode — on":"Go functional?"),el("div",{style:"font-size:11px;color:#9a8a7a;"},state.hardMode?"Half reps, reduced range. That counts.":"Multiple flags. Half reps, reduced range.")]));
        var fmsw2=el("div",{style:"width:34px;height:19px;border-radius:10px;background:"+(state.hardMode?"#e8a0b0":"#c0b8b0")+";position:relative;flex-shrink:0;"}); fmsw2.appendChild(el("div",{style:"position:absolute;top:2px;left:"+(state.hardMode?17:2)+"px;width:15px;height:15px;border-radius:50%;background:#fff;"})); fmBtn2.appendChild(fmsw2);
        ec.appendChild(fmBtn2);
      }
      body.appendChild(ec);
    } else if(dd.energyBefore){
      // Collapsed summary banner — shows after energy logged, or after completion
      var eo2=findOpt(ENERGY_OPTIONS,dd.energyBefore);
      var summaryRow=el("div",{style:"display:flex;align-items:center;gap:8px;padding:9px 13px;background:#f5f0ea;border-radius:8px;margin-bottom:12px;font-size:12px;color:#7a6a5a;border:1px solid #e0d8cc;"});
      summaryRow.appendChild(el("span",null,eo2.emoji));
      summaryRow.appendChild(el("span",null,"Energy: "+eo2.label));
      var completedFlags=getPainFlags();
      if(completedFlags.length) summaryRow.appendChild(el("span",{style:"margin-left:4px;color:#e8a0b0;"},"· "+completedFlags.map(function(f){ var pf=PAIN_FLAGS.filter(function(p){return p.id===f;})[0]; return pf?pf.label:f; }).join(", ")));
      if(!dd.completed) summaryRow.appendChild(el("button",{style:"margin-left:auto;padding:4px 10px;background:transparent;border:1px solid #d0c8bc;border-radius:12px;font-size:11px;color:#7a6a5a;",onclick:function(){ state.editingCheckin=true; render(); }},"Edit"));
      body.appendChild(summaryRow);
      if(state.hardMode){
        var fmPill=el("div",{style:"display:flex;align-items:center;justify-content:space-between;padding:7px 13px;background:#faeef1;border-radius:8px;margin-bottom:12px;border:1px solid #e8a0b0;cursor:pointer;",onclick:function(){ state.hardMode=false; render(); }});
        fmPill.appendChild(el("span",{style:"font-size:12px;color:#7a3a52;"},"🌡️ Functional mode on"));
        fmPill.appendChild(el("span",{style:"font-size:11px;color:#9a8a7a;"},"tap to switch back"));
        body.appendChild(fmPill);
      }
    }
  }

  // Open ritual (daily, phase-progressive, locked on future)
  var phOrder=String(INFO.phase.order);
  var openIds=(DATA.schedule.openRitual&&DATA.schedule.openRitual[phOrder])||["ankle-circles","leg-swings","cat-cow","wall-mobilisation"];
  var oDone=openRitualDone(), oFuture=selectedIsFuture();
  var oWrap=el("div",{style:"margin-bottom:16px;"});
  var oCard=el("div",{style:"display:flex;align-items:center;gap:12px;padding:13px 15px;border-radius:10px;"+(oFuture?"background:#f0ece4;border:2px solid #ddd5c8;opacity:0.7;":(oDone?"background:#d4eddf;border:2px solid #5a9e8a;":"background:#fff;border:2px solid #2d3a2e;")),onclick:oFuture?null:toggleOpenRitual});
  oCard.appendChild(el("span",{style:"font-size:22px;"},oFuture?"\ud83d\udd12":(oDone?"\u2705":"\ud83c\udf05")));
  oCard.appendChild(el("div",{style:"flex:1;"},[
    el("div",{style:"font-size:14px;font-weight:bold;color:"+(oFuture?"#8a8276":(oDone?"#2d6a4a":"#3a3028"))+";"},"Open ritual"),
    el("div",{style:"font-size:11px;color:"+(oFuture?"#a39a8a":(oDone?"#4a8a64":"#9a8a7a"))+";"},oFuture?"Comes around when the day does.":(oDone?"Done. Good start.":"Every session \u2014 tap when complete."))
  ]));
  if(!oDone&&!oFuture) oCard.appendChild(el("div",{style:"font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:#e8a0b0;font-weight:bold;"},"daily"));
  oWrap.appendChild(oCard);
  if(!oFuture && !oDone){
    var oList=el("div",{style:"background:#f5f0ea;border:1px solid #d0c8bc;border-top:none;border-radius:0 0 10px 10px;padding:10px 14px;display:flex;flex-direction:column;gap:8px;"});
    openIds.forEach(function(id){
      var ex=DATA.exercises[id]; if(!ex) return;
      var row=el("div",{style:"display:flex;flex-direction:column;gap:2px;"});
      row.appendChild(el("div",{style:"font-size:12px;font-weight:bold;color:#3a3028;"},ex.name+(doseFor(ex)?" \u2014 "+doseFor(ex):"")));
      if(ex.cues&&ex.cues.length) row.appendChild(el("div",{style:"font-size:11px;color:#9a8a7a;"},ex.cues[0]));
      oList.appendChild(row);
    });
    oWrap.appendChild(oList);
  }
  body.appendChild(oWrap);

  // Bike / iFIT guidance block
  if(tpl.isBike){
    var bk=INFO.phase.bike;
    var selWkday=new Date(selectedDateKey()+"T12:00:00").getDay(); // 0=Sun,6=Sat
    var isSatBike=(selWkday===6);
    var rideTime=isSatBike&&bk.satRide?bk.satRide:bk.ride;
    var selPlanWeek=planWeekForDate(selectedDateKey());

    // Bike stats card \u2014 scaled down in functional mode
    var hm=state.hardMode;
    var bb=el("div",{style:"background:"+(hm?"#faeef1":"#f5f0ea")+";border:1px solid "+(hm?"#e0bfc8":"#d0c8bc")+";border-radius:10px;padding:11px 14px;margin-bottom:12px;"});
    bb.appendChild(el("div",{style:"font-size:12px;font-weight:bold;color:"+(hm?"#7a3a52":"#2d3a2e")+";margin-bottom:8px;"},"\ud83d\udeb4 NordicTrack X24 \u2014 "+(hm?"Functional ride":"Phase "+INFO.phase.order+(isSatBike?" \u00b7 Saturday (longer ride)":""))));
    if(hm){
      bb.appendChild(el("div",{style:"font-size:11px;color:#7a3a52;margin-bottom:8px;line-height:1.5;"},"Mild discomfort day. Short, flat, easy \u2014 staying in motion is the win."));
    }
    var statRow=el("div",{style:"display:flex;gap:6px;"});
    function bikeChip(label,val,dimmed){
      var c=el("div",{style:"flex:1;background:#fff;border:1px solid "+(dimmed?"#d0c8bc":"#d0c8bc")+";border-radius:7px;padding:6px 8px;text-align:center;"});
      c.appendChild(el("div",{style:"font-size:9px;color:"+(dimmed?"#9a8a7a":"#9a8a7a")+";text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px;"},label));
      c.appendChild(el("div",{style:"font-size:13px;font-weight:bold;color:"+(dimmed?"#7a6a5a":"#2d3a2e")+";"},val));
      return c;
    }
    statRow.appendChild(bikeChip("Ride", hm?"5 min max":rideTime, hm));
    statRow.appendChild(bikeChip("Resistance", hm?"1\u20133 (light)":bk.resistance, hm));
    statRow.appendChild(bikeChip("Incline", hm?"Flat only":bk.incline, hm));
    bb.appendChild(statRow);
    if(hm){
      bb.appendChild(el("div",{style:"font-size:11px;color:#9a6a50;margin-top:8px;padding-top:8px;border-top:1px solid #d0c8bc;"},"iFIT: Beginner Scenic ride only. Skip intervals, hills, and any structured workout today."));
    }
    body.appendChild(bb);
    if(DATA.ifitSeries) renderIfitWidget(body);
  }

  // Cycle flare — one-line note only (full guidance in Reference tab)
  if(weekData().cycleFlare && tag!=="rest" && !tpl.isBike){
    body.appendChild(el("div",{style:"padding:8px 12px;margin-bottom:12px;background:#faeef1;border-radius:8px;font-size:12px;color:#7a3a52;border-left:3px solid #e8a0b0;"},"\ud83c\udf19 Cycle modifier on \u2014 see Reference for session adjustments."));
  }


  // Main exercises (resolved from library, filtered by phase)
  var list=exForPhase(tpl.exercises);
  if(state.hardMode) list = list.slice(0, Math.max(2, Math.ceil(list.length/2))); // functional = first half, min 2
  if(list.length){
    var isFutureDay=selectedIsFuture();
    var mw=el("div",{style:"margin-bottom:14px;"}); mw.appendChild(sectionLabel(state.hardMode?"Functional Session":"Main Session"));
    if(!selectedIsFuture()){
      var checkedCount=list.filter(function(_,i){ return isChecked(i); }).length;
      var progressPct=list.length?(checkedCount/list.length*100):0;
      var pbWrap=el("div",{style:"margin-bottom:10px;"});
      var pbBg=el("div",{style:"background:#e8e3db;border-radius:4px;height:5px;overflow:hidden;"});
      pbBg.appendChild(el("div",{style:"height:100%;width:"+progressPct+"%;background:#5a9e8a;border-radius:4px;"}));
      pbWrap.appendChild(pbBg);
      pbWrap.appendChild(el("div",{style:"font-size:10px;color:#9a8a7a;margin-top:3px;text-align:right;"},checkedCount+"/"+list.length));
      mw.appendChild(pbWrap);
    }
    list.forEach(function(item,i){
      var ex=item.ex; var done=isChecked(i); var dose=doseFor(ex);
      if(isFutureDay){
        // Locked preview card
        var card=el("div",{style:"padding:11px 13px;background:#f0ece4;border-radius:8px;font-size:13px;color:#8a8276;margin-bottom:6px;border-left:4px solid #d0c8bc;display:flex;align-items:flex-start;gap:10px;opacity:0.7;"});
        card.appendChild(el("span",{style:"font-size:15px;margin-top:1px;flex-shrink:0;"},"\ud83d\udd12"));
        var txt=el("div",{style:"flex:1;"});
        txt.appendChild(el("div",{style:"font-weight:bold;"}, ex.name + (dose?" \u2014 "+dose:"")));
        card.appendChild(txt);
        mw.appendChild(card);
      } else {
        var dur=!done?parseDuration(dose):null;
        var isTimingThis=state.activeTimer&&state.activeTimer.listIdx===i;
        var secsRemaining=isTimingThis?Math.max(0,state.activeTimer.durationSecs-(Date.now()-state.activeTimer.startMs)/1000):null;
        var card=el("div",{style:"padding:11px 13px;background:"+(done?"#ddf0e8":isTimingThis?"#fff9ee":"#fff")+";border-radius:8px;font-size:13px;color:"+(done?"#3a6a50":"#3a3028")+";margin-bottom:6px;border-left:4px solid "+(done?"#5a9e8a":isTimingThis?"#c87941":"#e8a0b0")+";display:flex;align-items:flex-start;gap:10px;box-shadow:0 1px 3px rgba(0,0,0,0.06);"+(done?"opacity:0.75;":""),onclick:function(){ if(isTimingThis) cancelTimer(); else { toggleChecked(i); maybeMarkComplete(list); render(); } }});
        card.appendChild(el("span",{style:"font-size:15px;margin-top:1px;flex-shrink:0;"},done?"\u2705":"\u2b1c"));
        var txt=el("div",{style:"flex:1;"});
        txt.appendChild(el("div",{style:(done?"text-decoration:line-through;":"")+"font-weight:bold;"}, ex.name + (dose?" \u2014 "+dose:"")));
        if(ex.cues && ex.cues.length) txt.appendChild(el("div",{style:"font-size:11px;color:#8a7a6a;margin-top:2px;"}, ex.cues[0]));
        card.appendChild(txt);
        // Timer button or countdown
        if(!done){
          if(isTimingThis){
            var timerCol=el("div",{style:"display:flex;flex-direction:column;align-items:center;gap:2px;flex-shrink:0;"});
            timerCol.appendChild(el("div",{style:"font-size:18px;font-weight:bold;color:#c87941;font-variant-numeric:tabular-nums;min-width:40px;text-align:center;"},fmtTimer(secsRemaining)));
            if(dur&&dur.twoSided) timerCol.appendChild(el("div",{style:"font-size:9px;color:#c87941;letter-spacing:0.08em;text-transform:uppercase;"},"Side "+state.activeTimer.side+" of 2"));
            timerCol.appendChild(el("button",{style:"font-size:10px;color:#9a8a7a;background:transparent;border:none;padding:0;cursor:pointer;",onclick:function(e){ e.stopPropagation(); cancelTimer(); }},"\u2715 cancel"));
            card.appendChild(timerCol);
          } else if(dur){
            (function(idx,d){ card.appendChild(el("button",{style:"flex-shrink:0;padding:4px 8px;border-radius:8px;border:1px solid #d0c8bc;background:#f5f0ea;font-size:14px;cursor:pointer;margin-top:1px;",onclick:function(e){ e.stopPropagation(); startExTimer(idx,d.secs,d.twoSided,1); }},"\u23f1")); })(i,dur);
          }
        }
        mw.appendChild(card);
      }
    });
    body.appendChild(mw);
  } else if(tag!=="rest" && !tpl.isBike){
    body.appendChild(el("div",{style:"padding:11px 13px;background:#fff;border-radius:8px;font-size:13px;color:#7a6a5a;margin-bottom:14px;"},"No exercises listed for this phase."));
  }

  // Day stretches (one-tap) + close ritual
  if(tpl.cooldown && tpl.cooldown.length && !state.hardMode && !selectedIsFuture()){
    var cdList=exForPhase(tpl.cooldown);
    if(cdList.length){
      var cdDone=cooldownDone();
      var cdWrap=el("div",{style:"margin-bottom:14px;"});
      var cdCard=el("div",{style:"display:flex;align-items:center;gap:12px;padding:13px 15px;border-radius:10px;"+(cdDone?"background:#d4eddf;border:2px solid #5a9e8a;":"background:#fff;border:2px solid #c0b8b0;"),onclick:toggleCooldown});
      cdCard.appendChild(el("span",{style:"font-size:22px;"},cdDone?"\u2705":"\ud83e\uddd8"));
      cdCard.appendChild(el("div",{style:"flex:1;"},[
        el("div",{style:"font-size:14px;font-weight:bold;color:"+(cdDone?"#2d6a4a":"#3a3028")+";"},"Day stretches"),
        el("div",{style:"font-size:11px;color:"+(cdDone?"#4a8a64":"#9a8a7a")+";"},cdDone?"Done.":"Tap when complete.")
      ]));
      cdWrap.appendChild(cdCard);
      var cdDetail=el("div",{style:"background:#f5f0ea;border:1px solid #d0c8bc;border-top:none;border-radius:0 0 10px 10px;padding:10px 14px;display:flex;flex-direction:column;gap:8px;"});
      cdList.forEach(function(item){
        var ex=item.ex; var dose=doseFor(ex);
        var row=el("div",{style:"display:flex;flex-direction:column;gap:2px;"});
        row.appendChild(el("div",{style:"font-size:12px;font-weight:bold;color:#3a3028;"},ex.name+(dose?" \u2014 "+dose:"")));
        if(ex.cues&&ex.cues.length) row.appendChild(el("div",{style:"font-size:11px;color:#9a8a7a;"},ex.cues[0]));
        cdDetail.appendChild(row);
      });
      cdWrap.appendChild(cdDetail);
      body.appendChild(cdWrap);
    }
  }
  // Close ritual (always same)
  if(!selectedIsFuture() && !state.hardMode){
    var closeIds=(DATA.schedule.closeRitual)||["calf-stretch","supine-twist","savasana"];
    var clDone=closeRitualDone();
    var clWrap=el("div",{style:"margin-bottom:16px;"});
    var clCard=el("div",{style:"display:flex;align-items:center;gap:12px;padding:13px 15px;border-radius:10px;"+(clDone?"background:#d4eddf;border:2px solid #5a9e8a;":"background:#fff;border:2px solid #2d3a2e;"),onclick:toggleCloseRitual});
    clCard.appendChild(el("span",{style:"font-size:22px;"},clDone?"\u2705":"\ud83c\udf19"));
    clCard.appendChild(el("div",{style:"flex:1;"},[
      el("div",{style:"font-size:14px;font-weight:bold;color:"+(clDone?"#2d6a4a":"#3a3028")+";"},"Close ritual"),
      el("div",{style:"font-size:11px;color:"+(clDone?"#4a8a64":"#9a8a7a")+";"},clDone?"Done. Full session complete.":"Tap when complete.")
    ]));
    clCard.appendChild(el("span",{style:"font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#9a8a7a;font-weight:bold;"},"DAILY"));
    clWrap.appendChild(clCard);
    if(!clDone){
      var clDetail=el("div",{style:"background:#f5f0ea;border:1px solid #d0c8bc;border-top:none;border-radius:0 0 10px 10px;padding:10px 14px;display:flex;flex-direction:column;gap:8px;"});
      closeIds.forEach(function(id){
        var ex=DATA.exercises[id]; if(!ex) return;
        var row=el("div",{style:"display:flex;flex-direction:column;gap:2px;"});
        row.appendChild(el("div",{style:"font-size:12px;font-weight:bold;color:#3a3028;"},ex.name+(doseFor(ex)?" \u2014 "+doseFor(ex):"")));
        if(ex.cues&&ex.cues.length) row.appendChild(el("div",{style:"font-size:11px;color:#9a8a7a;"},ex.cues[0]));
        clDetail.appendChild(row);
      });
      clWrap.appendChild(clDetail);
    }
    body.appendChild(clWrap);
  }

  // Completion + bonus
  var canComplete = list.length || tpl.isBike;
  if(canComplete && (tpl.isBike ? true : allChecked(list))){
    if(tpl.isBike && !dayData().completed){
      body.appendChild(el("button",{style:"width:100%;padding:12px;background:#e8a0b0;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:bold;margin-bottom:14px;",onclick:function(){ update(dayKey(),{completed:true,mode:state.hardMode?"hard":"normal"}); render(); }},"Mark ride complete \u2713"));
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
          var rev=el("div",{"class":"fade",style:"background:#fff;border-radius:14px;padding:18px 16px;border:2px solid #e8a0b0;box-shadow:0 2px 12px rgba(0,0,0,0.08);"});
          var top=el("div",{style:"display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;"}); top.appendChild(el("span",{style:"font-size:30px;"},cb.emoji)); top.appendChild(el("div",{style:"flex:1;"},[ el("div",{style:"font-size:15px;font-weight:bold;color:#2d3a2e;margin-bottom:3px;"},cb.title), el("div",{style:"font-size:13px;color:#5a4a3a;line-height:1.5;"},cb.desc) ])); rev.appendChild(top);
          var br=el("div",{style:"display:flex;gap:8px;"});
          br.appendChild(el("button",{style:"flex:1;padding:10px;background:#e8a0b0;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:bold;",onclick:function(){ updateDayData({bonusId:cb.id,bonusTitle:cb.title,bonusMsg:getBonusCompletion(cb.id)}); }},"Done \u2713"));
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
  // Intention picker — only shown when explicitly opened or no intention set yet
  var wd=weekData();
  if(!wd.intention || state.intentionPickerOpen){
    var intentBlock=el("div",{style:"margin-bottom:20px;"});
    intentBlock.appendChild(el("div",{style:"font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#e8a0b0;font-weight:bold;margin-bottom:8px;"},"This week's intention"));
    if(!state.writingOwn){
      var choices=wd.intentionChoices;
      if(!choices||!choices.length){ choices=pickWeekIntentions(); update("week-"+INFO.weekMondayKey,{intentionChoices:choices}); }
      var iList=el("div",{style:"display:flex;flex-direction:column;gap:7px;margin-bottom:10px;"});
      choices.forEach(function(it){
        var sel=wd.intention===it;
        iList.appendChild(el("div",{style:"padding:11px 14px;background:"+(sel?"#2d3a2e":"#fff")+";border:2px solid "+(sel?"#2d3a2e":"#d0c8bc")+";border-radius:10px;font-size:13px;color:"+(sel?"#e8dfd0":"#3a3028")+";line-height:1.4;cursor:pointer;",onclick:function(){ state.intentionPickerOpen=false; state.writingOwn=false; updateWeekData({intention:it}); }},it));
      });
      intentBlock.appendChild(iList);
      var iOptRow=el("div",{style:"display:flex;gap:8px;"});
      iOptRow.appendChild(el("button",{style:"flex:1;padding:9px 14px;background:transparent;border:2px dashed #c0b8b0;border-radius:10px;font-size:12px;color:#7a6a5a;",onclick:function(){ state.writingOwn=true; render(); }},"Write my own…"));
      iOptRow.appendChild(el("button",{style:"padding:9px 13px;background:transparent;border:2px solid #d0c8bc;border-radius:10px;font-size:13px;color:#9a8a7a;",onclick:function(){ update("week-"+INFO.weekMondayKey,{intentionChoices:null}); render(); }},"↺"));
      if(wd.intention) iOptRow.appendChild(el("button",{style:"padding:9px 13px;background:transparent;border:none;font-size:12px;color:#9a8a7a;",onclick:function(){ state.intentionPickerOpen=false; render(); }},"Cancel"));
      intentBlock.appendChild(iOptRow);
    } else {
      var ta=el("textarea",{placeholder:"Write something that means something to you this week…",style:"width:100%;min-height:72px;padding:11px 13px;background:#fff;border:2px solid #d0c8bc;border-radius:10px;font-size:13px;color:#3a3028;resize:none;box-sizing:border-box;outline:none;margin-bottom:8px;",oninput:function(e){ state.customIntention=e.target.value; }});
      ta.value=state.customIntention||""; intentBlock.appendChild(ta);
      var iRow=el("div",{style:"display:flex;gap:8px;"});
      iRow.appendChild(el("button",{style:"flex:1;padding:11px;background:#2d3a2e;color:#e8dfd0;border:none;border-radius:10px;font-size:13px;",onclick:function(){ if((state.customIntention||"").trim()){ state.intentionPickerOpen=false; state.writingOwn=false; updateWeekData({intention:state.customIntention.trim()}); } }},"Set this"));
      iRow.appendChild(el("button",{style:"padding:11px 14px;background:transparent;border:2px solid #d0c8bc;border-radius:10px;font-size:12px;color:#7a6a5a;",onclick:function(){ state.writingOwn=false; render(); }},"Back"));
      intentBlock.appendChild(iRow);
    }
    body.appendChild(intentBlock);
  }

  // Progression panel \u2014 always visible, gated content unlocks at 2+ weeks in phase
  var ph=INFO.phase;
  var phaseStartWeek = store.phaseStartWeek || 1;
  var weeksInPhase = INFO.planWeek - phaseStartWeek;
  var readyToShow = weeksInPhase >= 2;
  if(ph.order<4){
    if(!readyToShow){
      var lockedWrap=el("div",{id:"progression-anchor",style:"border-radius:12px;overflow:hidden;margin-bottom:16px;border:2px solid #d0c8bc;"});
      var lockedHdr=el("div",{style:"background:#e8e3db;padding:13px 16px;display:flex;align-items:center;justify-content:space-between;"});
      lockedHdr.appendChild(el("div",null,[
        el("div",{style:"font-size:13px;font-weight:bold;color:#8a7a6a;"},"\ud83d\udcc8 Progression \u00b7 "+ph.label),
        el("div",{style:"font-size:11px;color:#b0a090;margin-top:2px;"},"Unlocks after 2 weeks in this phase \u2014 Week "+(phaseStartWeek+2)+" of your plan.")
      ]));
      lockedHdr.appendChild(el("div",{style:"font-size:18px;"},"\ud83d\udd12"));
      lockedWrap.appendChild(lockedHdr);
      body.appendChild(lockedWrap);
    }
  }
  if(readyToShow && ph.order<4){
    var progOpen=state.progressionOpen;
    var progWrap=el("div",{id:"progression-anchor",style:"border-radius:12px;overflow:hidden;margin-bottom:16px;border:2px solid #2d3a2e;"});
    // Collapsed header \u2014 always visible
    var progHeader=el("div",{style:"background:#2d3a2e;color:#e8dfd0;padding:13px 16px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;",onclick:function(){ state.progressionOpen=!state.progressionOpen; render(); }});
    progHeader.appendChild(el("div",null,[
      el("div",{style:"font-size:13px;font-weight:bold;color:#e8dfd0;"},"Phase "+ph.order+": "+ph.label+" \u00b7 "+ph.focus),
      el("div",{style:"font-size:11px;color:#9ab090;margin-top:2px;"},"Ready to move on?")
    ]));
    progHeader.appendChild(el("div",{style:"font-size:16px;color:#9ab090;transform:"+(progOpen?"rotate(180deg)":"rotate(0deg)")+";transition:transform 0.2s;"},"\u203a"));
    progWrap.appendChild(progHeader);
    if(progOpen){
      var progBody=el("div",{style:"background:#2d3a2e;padding:0 16px 16px;"});
      progBody.appendChild(el("div",{style:"font-size:12px;color:#9ab090;padding:10px 0;border-top:1px solid #3a4a38;margin-bottom:4px;"},"Tick what's true. No rush \u2014 this gates progress, on purpose."));
      var allTicked=true;
      ph.unlockCriteria.forEach(function(crit,i){
        var k="unlock-"+ph.id+"-"+i; var on=!!store[k]; if(!on) allTicked=false;
        var rowc=el("div",{style:"display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-top:1px solid #3a4a38;cursor:pointer;",onclick:function(){ store[k]=!store[k]; saveStore(store); render(); }});
        var chkBox=el("div",{style:on?"width:20px;height:20px;border-radius:50%;background:#5a9e8a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;font-weight:bold;":"width:20px;height:20px;border-radius:50%;border:2px solid #4a5a3e;flex-shrink:0;background:transparent;"},on?"\u2713":"");
        rowc.appendChild(chkBox);
        rowc.appendChild(el("span",{style:"font-size:12px;color:#d8e0d0;line-height:1.4;"+(on?"opacity:0.5;text-decoration:line-through;":"")},crit));
        progBody.appendChild(rowc);
      });
      if(allTicked){
        progBody.appendChild(el("button",{style:"width:100%;margin-top:12px;padding:11px;background:#e8a0b0;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:bold;",onclick:function(){ var idx=(typeof store.phaseIndex==="number"?store.phaseIndex:ph.order-1); store.phaseIndex=Math.min(idx+1,DATA.phases.length-1); store.phaseStartWeek=INFO.planWeek; saveStore(store); state.progressionOpen=false; state.view="session"; render(); }},"Advance to "+(DATA.phases[ph.order]?DATA.phases[ph.order].label:"next")+" \u2192"));
      } else {
        progBody.appendChild(el("div",{style:"font-size:11px;color:#6a7a60;margin-top:10px;text-align:center;"},"Tick all to unlock the next phase."));
      }
      progWrap.appendChild(progBody);
    }
    body.appendChild(progWrap);
  } else if(ph.order===4){
    body.appendChild(el("div",{style:"background:#2d3a2e;color:#9ab090;border-radius:12px;padding:13px 16px;margin-bottom:16px;font-size:12px;"},"Final phase. Reassess with your PT before deciding what comes next."));
  }

  // Weekly stats
  var hist=buildHistory();
  var workDays=hist.filter(function(e){ return !e.isRest; });
  var sessionsTotal=workDays.length;
  var sessionsDone=workDays.filter(function(e){ return e.data.completed; }).length;
  var openTotal=hist.length; // all 7 days
  var openDoneCount=hist.filter(function(e){ return !!store["open-"+e.key]; }).length;
  // Streak: consecutive days going back from today where open ritual was done
  var streakCount=0;
  var streakCur=new Date(parseYMD(INFO.todayKey));
  for(var si=0;si<90;si++){
    var sk=ymd(streakCur);
    if(store["open-"+sk]){ streakCount++; streakCur.setDate(streakCur.getDate()-1); }
    else break;
  }

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
  stats.appendChild(statCard("🌅", openDoneCount+"/"+openTotal, "Open ritual days", openDoneCount===openTotal?"Every single day.":"of 7 days", "#5a9e8a"));
  var streakEmoji=streakCount===0?"✨":streakCount>=14?"🔥🔥":streakCount>=7?"🔥":"⚡";
  var streakSub=streakCount===0?"Start today — first one's the hardest.":streakCount===1?"Day one. Keep it going.":streakCount>=14?"Two weeks straight. It's a habit now.":streakCount>=7?"A full week. Keep going.":"Consecutive open ritual days.";
  stats.appendChild(statCard(streakEmoji, String(streakCount), "Day streak", streakSub, "#c87941"));
  stats.appendChild(statCard("📅", "Week "+String(INFO.planWeek||1), "of 12-week plan", "Phase "+(ph.order)+" · "+ph.label, ph.color));
  body.appendChild(stats);

  body.appendChild(el("div",{style:"font-size:16px;font-weight:bold;color:#2d3a2e;margin-bottom:4px;"},"Last 7 Days"));
  body.appendChild(el("div",{style:"font-size:12px;color:#8a7a6a;margin-bottom:16px;"},"What you've shown up for."));
  var timeline=el("div",{style:"position:relative;"});
  hist.forEach(function(e,idx){
    var done=e.data.completed||e.isRest;
    var att=e.data.energyBefore||e.data.completed;
    var ankle=!!store["open-"+e.key];
    var hb=!!e.data.bonusId;
    var isLast=idx===hist.length-1;
    var lbl=new Date(e.key+"T12:00:00").toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"});
    var row=el("div",{style:"display:flex;align-items:flex-start;gap:12px;margin-bottom:"+(isLast?"0":"4px")+";"+(e.isToday?"":"opacity:0.82;")});

    // Left axis: dot + connector line
    var axis=el("div",{style:"display:flex;flex-direction:column;align-items:center;flex-shrink:0;width:24px;"});
    var dotBg=done?TAG_COLORS[e.tpl.tag]:(att?"#c8c0b4":"#f0ebe3");
    var dotBorder=done?TAG_COLORS[e.tpl.tag]:(att?"#b8b0a4":"#d0c8bc");
    var dotColor=done?"#fff":(att?"#6a6058":"#a09890");
    var dot=el("div",{style:"width:24px;height:24px;border-radius:50%;background:"+dotBg+";border:2px solid "+dotBorder+";color:"+dotColor+";display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;flex-shrink:0;"},done?(e.isRest?"\u00b7":"\u2713"):"");
    axis.appendChild(dot);
    if(!isLast){
      var connector=el("div",{style:"width:2px;flex:1;min-height:18px;background:#e0d8cc;margin:3px 0;"});
      axis.appendChild(connector);
    }
    row.appendChild(axis);

    // Content
    var content=el("div",{style:"flex:1;padding-bottom:"+(isLast?"4px":"14px")+";"});
    var dateRow=el("div",{style:"display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-bottom:2px;"});
    dateRow.appendChild(el("span",{style:"font-size:13px;font-weight:bold;color:"+(e.isToday?"#2d3a2e":"#4a4038")+";"},lbl));
    if(e.isToday) dateRow.appendChild(el("span",{style:"font-size:10px;background:"+TAG_COLORS[e.tpl.tag]+";color:#fff;border-radius:10px;padding:1px 6px;"},"TODAY"));
    if(e.data.mode==="hard") dateRow.appendChild(el("span",{style:"font-size:10px;background:#e8a0b0;color:#fff;border-radius:10px;padding:1px 6px;"},"FUNCTIONAL"));
    if(hb) dateRow.appendChild(el("span",{style:"font-size:10px;background:#d4a820;color:#fff;border-radius:10px;padding:1px 6px;"},"\u2b50 bonus"));
    content.appendChild(dateRow);

    var subRow=el("div",{style:"display:flex;align-items:center;gap:6px;"});
    subRow.appendChild(el("span",{style:"font-size:12px;color:#8a7a6a;"},e.isRest?"Rest day":(hb?e.tpl.label+" + "+e.data.bonusTitle:e.tpl.label)));
    if(ankle) subRow.appendChild(el("span",{style:"font-size:11px;"},"\ud83e\uddb6"));
    if(e.data.energyBefore){ var eo=findOpt(ENERGY_OPTIONS,e.data.energyBefore); subRow.appendChild(el("span",null,eo.emoji)); }
    if(e.data.feelAfter){ var fo=findOpt(FEEL_OPTIONS,e.data.feelAfter); subRow.appendChild(el("span",{style:"font-size:10px;color:#b0a898;"},"\u2192")); subRow.appendChild(el("span",null,fo.emoji)); }
    content.appendChild(subRow);
    row.appendChild(content);
    timeline.appendChild(row);
  });
  body.appendChild(timeline);

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
    vh.appendChild(el("button",{style:"padding:7px 12px;background:#faeef1;border:1px solid #e0bfc8;border-radius:8px;font-size:12px;color:#7a3a52;",onclick:function(){ if(confirm("End vacation mode now? The plan will shift forward by the days you were away.")){ store.shiftOverride=(store.shiftOverride||0)+Math.floor((todayMidnight()-parseYMD(vac.startDate))/86400000); store.vacation=null; saveStore(store); render(); } }},"End early"));
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
    vbrow.appendChild(el("button",{style:"flex:1;padding:12px;background:#e8a0b0;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:bold;",onclick:function(){ store.vacation={startDate:INFO.todayKey,days:state.vacationDays}; saveStore(store); state.vacationPickerOpen=false; render(); }},"Start vacation \ud83c\udf34"));
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
  // Open + close ritual exercises always in today's reference
  var phOrderRef=String(INFO.phase.order);
  var openRitualIds=(DATA.schedule.openRitual&&DATA.schedule.openRitual[phOrderRef])||["ankle-circles","leg-swings","cat-cow","wall-mobilisation"];
  var closeRitualIds=(DATA.schedule.closeRitual)||["calf-stretch","supine-twist","savasana"];
  openRitualIds.forEach(function(id){ todayIds[id]=true; });
  closeRitualIds.forEach(function(id){ todayIds[id]=true; });
  if(todayTpl){
    (todayTpl.warmup||[]).forEach(function(id){ todayIds[id]=true; });
    (todayTpl.exercises||[]).forEach(function(id){ todayIds[id]=true; });
    (todayTpl.cooldown||[]).forEach(function(id){ todayIds[id]=true; });
  }

  // Dedicated views for TENS / Recovery / Safety
  if(state.refFilter==="tens"||state.refFilter==="recovery"||state.refFilter==="safety"||state.refFilter==="phases"){
    var backRow=el("div",{style:"margin-bottom:16px;"});
    backRow.appendChild(el("button",{style:"padding:0;background:transparent;border:none;font-size:12px;color:#9a8a7a;",onclick:function(){ state.refFilter="today"; render(); }},"← Back to today"));
    body.appendChild(backRow);
  } else {
    // Top bar: day label + show all toggle + secondary links
    var topBar=el("div",{style:"display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;"});
    var dayLabel=el("div",null);
    dayLabel.appendChild(el("div",{style:"font-size:15px;font-weight:bold;color:#2d3a2e;"},state.refFilter==="all"?"All Exercises":(todayTpl?todayTpl.label:"Rest day")));
    dayLabel.appendChild(el("div",{style:"font-size:11px;color:#9a8a7a;"},state.refFilter==="all"?"Every move in the plan":"Today's exercises"));
    topBar.appendChild(dayLabel);
    topBar.appendChild(el("button",{style:"padding:5px 12px;border-radius:20px;border:2px solid #d0c8bc;background:#fff;color:#5a4a3a;font-size:12px;white-space:nowrap;",onclick:function(){ state.refFilter=state.refFilter==="all"?"today":"all"; render(); }},state.refFilter==="all"?"← Today only":"Show all →"));
    body.appendChild(topBar);

    // Secondary links: TENS · Recovery · Safety
    var secondRow=el("div",{style:"display:flex;gap:16px;margin-bottom:18px;"});
    [["tens","⚡ TENS"],["recovery","🛠 Recovery"],["safety","⚠️ Safety"],["phases","📋 Phases"]].forEach(function(pair){
      secondRow.appendChild(el("button",{style:"padding:0;background:transparent;border:none;font-size:12px;color:#9a8a7a;text-decoration:underline;",onclick:function(){ state.refFilter=pair[0]; render(); }},pair[1]));
    });
    body.appendChild(secondRow);

    // Session note for today's template (shown in today-filter only)
    if(state.refFilter==="today" && todayTpl && todayTpl.note){
      var noteBox=el("div",{style:"background:#f0ebe3;border-radius:8px;padding:10px 13px;margin-bottom:16px;border-left:3px solid #c8b89a;"});
      noteBox.appendChild(el("div",{style:"font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:#9a8a7a;font-weight:bold;margin-bottom:4px;"},"Session note"));
      noteBox.appendChild(el("div",{style:"font-size:12px;color:#4a3f35;line-height:1.5;"},todayTpl.note));
      body.appendChild(noteBox);
    }
  }

  // Phases guide
  if(state.refFilter==="phases"){
    body.appendChild(el("div",{style:"font-size:15px;font-weight:bold;color:#2d3a2e;margin-bottom:3px;"},"📋 The 4 Phases"));
    body.appendChild(el("div",{style:"font-size:12px;color:#8a7a6a;margin-bottom:16px;"},"Each phase builds on the last. Progress when it feels solid, not just when the weeks are up."));
    DATA.phases.forEach(function(p){
      var isCurrent=INFO.phase.id===p.id;
      var card=el("div",{style:"border-radius:12px;border:2px solid "+(isCurrent?"#2d3a2e":"#e0d8cc")+";background:"+(isCurrent?"#2d3a2e":"#fff")+";padding:14px 16px;margin-bottom:10px;"});
      var top=el("div",{style:"display:flex;align-items:baseline;justify-content:space-between;margin-bottom:6px;"});
      top.appendChild(el("div",{style:"font-size:14px;font-weight:bold;color:"+(isCurrent?"#9ab090":"#2d3a2e")},"Phase "+p.order+": "+p.label));
      top.appendChild(el("div",{style:"font-size:11px;color:"+(isCurrent?"#6a8a60":"#9a8a7a")},p.duration));
      card.appendChild(top);
      card.appendChild(el("div",{style:"font-size:12px;color:"+(isCurrent?"#c0d4b8":"#5a4a3a")+";margin-bottom:8px;line-height:1.5;"},p.focus));
      if(p.unlockCriteria&&p.unlockCriteria.length){
        var ul=el("div",{style:"display:flex;flex-direction:column;gap:4px;"});
        p.unlockCriteria.forEach(function(c){
          var r=el("div",{style:"font-size:11px;color:"+(isCurrent?"#7a9a78":"#7a6a5a")+";padding-left:12px;position:relative;"});
          r.appendChild(el("span",{style:"position:absolute;left:0;color:"+(isCurrent?"#9ab090":"#e8a0b0")},"·"));
          r.appendChild(document.createTextNode(c));
          ul.appendChild(r);
        });
        card.appendChild(ul);
      }
      if(isCurrent) card.appendChild(el("div",{style:"margin-top:8px;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#e8a0b0;font-weight:bold;"},"← You are here"));
      body.appendChild(card);
    });
    return;
  }

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
      meta.appendChild(el("span",{style:"font-size:10px;background:#f5f0ea;color:#2d6a4a;padding:2px 8px;border-radius:10px;"},p.size));
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
    var alwaysWrap=el("div",{style:"background:#f5f0ea;border:2px solid #d0c8bc;border-radius:10px;padding:12px 14px;margin-bottom:16px;"});
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
      { condition:"Knees", signal:"Knee slips or feels unstable", color:"#e8a0b0" },
      { condition:"Left ankle", signal:"Sharp ankle pain or feeling of giving way", color:"#e8a0b0" },
      { condition:"Right glute", signal:"Low back takes over — reduce load, don't push through", color:"#e8a0b0" },
      { condition:"Low back", signal:"Pain radiating down the leg", color:"#e8a0b0" },
      { condition:"Right scapula", signal:"Sharp or radiating pain into arm or neck", color:"#e8a0b0" },
      { condition:"Hypermobility", signal:"Any joint gives way or feels unstable", color:"#e8a0b0" }
    ];
    signals.forEach(function(s){
      var card=el("div",{style:"background:#fff;border-radius:9px;border:1px solid #e0d8cc;border-left:4px solid "+s.color+";padding:10px 13px;margin-bottom:7px;display:flex;align-items:flex-start;gap:10px;"});
      card.appendChild(el("div",{style:"font-size:11px;font-weight:bold;color:#2d3a2e;min-width:90px;padding-top:1px;"},s.condition));
      card.appendChild(el("div",{style:"font-size:12px;color:#5a3a3a;line-height:1.4;"},s.signal));
      body.appendChild(card);
    });

    body.appendChild(el("div",{style:"margin-top:14px;padding:10px 13px;background:#faeef1;border-radius:8px;font-size:11px;color:#7a3a52;line-height:1.5;border-left:3px solid #e8a0b0;"},"If radiating pain (leg or arm), 3+ consecutive bad days, or any sudden worsening → contact PT or GP before resuming exercise."));
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
    var card=el("div",{style:"background:"+(locked?"#f5f2ec":"#fff")+";border-radius:10px;border:1px solid "+(locked?"#e2ddd5":"#e0d8cc")+";padding:13px 15px;margin-bottom:10px;"+(locked?"opacity:0.5;":"")});
    if(locked){ card.addEventListener("click",function(){ if(card.classList.contains("shake"))return; card.classList.add("shake"); setTimeout(function(){card.classList.remove("shake");},300); }); }
    var top=el("div",{style:"display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px;"});
    var nameRow=el("div",{style:"flex:1;"});
    nameRow.appendChild(el("div",{style:"font-size:14px;font-weight:bold;color:"+(locked?"#8a8278":"#2d3a2e")+";margin-bottom:2px;"},ex.name));
    if(dose) nameRow.appendChild(el("div",{style:"font-size:11px;color:"+ph.color+";font-weight:bold;"},"Phase "+ph.order+": "+dose));
    top.appendChild(nameRow);
    var tags=el("div",{style:"display:flex;gap:4px;flex-wrap:wrap;flex-shrink:0;"});
    if(locked) tags.appendChild(el("span",{style:"font-size:10px;padding:2px 8px;border-radius:10px;background:#e8e3dc;color:#a09888;"},"Phase "+ex.minPhase));
    else if(ex.bodyParts) ex.bodyParts.forEach(function(bp){ tags.appendChild(el("span",{style:"font-size:10px;padding:2px 7px;border-radius:10px;background:#ede8e0;color:#6a5a4a;"},bp)); });
    top.appendChild(tags);
    card.appendChild(top);
    if(locked){
      card.appendChild(el("div",{style:"font-size:12px;color:#a09888;"},"Unlocks in Phase "+ex.minPhase+"."));
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
      render();
    })
    .catch(function(err){
      root.innerHTML='<div style="padding:40px 24px;font-family:Georgia,serif;color:#7a3a52;">Couldn\u2019t load the plan data ('+err.message+'.json). If you just opened offline for the first time, connect once so it can cache, then reopen.</div>';
    });
}
if(typeof module!=="undefined" && module.exports){ module.exports={ templateIdForDate:function(d){return templateIdForDate(d);}, _setData:function(x){DATA=x;} }; }
else { boot(); }
