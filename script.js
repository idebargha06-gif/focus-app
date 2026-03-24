// ══════════════════════════════════════════════════════════
//  FIREBASE IMPORTS
// ══════════════════════════════════════════════════════════
import { initializeApp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup,
  onAuthStateChanged, signOut as fbSignOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection, addDoc, getDocs,
  query, orderBy, limit,
  doc, getDoc, setDoc, updateDoc,
  onSnapshot, serverTimestamp, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ══════════════════════════════════════════════════════════
//  FIREBASE INIT
// ══════════════════════════════════════════════════════════
const firebaseConfig = {
  apiKey:            "AIzaSyB9wLp_Z2PzCQgtdTjwoQZGw2tSC8tgNNY",
  authDomain:        "focus-app-3c749.firebaseapp.com",
  projectId:         "focus-app-3c749",
  storageBucket:     "focus-app-3c749.appspot.com",
  messagingSenderId: "583246239661",
  appId:             "1:583246239661:web:7117c22d10842171ff7324"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db   = getFirestore(firebaseApp);
const gProvider = new GoogleAuthProvider();


// ══════════════════════════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════════════════════════
const CIRC = 2 * Math.PI * 88; // 552.92

const QUOTES = [
  '"Deep work is the ability to focus without distraction." — Cal Newport',
  '"The successful warrior is the average person with laser-like focus." — Bruce Lee',
  '"Concentrate all your thoughts upon the work at hand." — Alexander Graham Bell',
  '"Either you run the day or the day runs you." — Jim Rohn',
  '"Focus is a matter of deciding what things you\'re not going to do." — John Carmack',
  '"Lost time is never found again." — Benjamin Franklin',
  '"Do the hard jobs first. The easy jobs will take care of themselves." — Dale Carnegie',
  '"You have to be burning with an idea, or a problem." — Steve Jobs',
  '"The ability to perform deep work is becoming increasingly rare and valuable." — Cal Newport',
];

const BADGES_DEF = [
  { id:"first",      label:"🎯 First Session",   icon:"🎯", check: s => s.totalSessions >= 1 },
  { id:"ten",        label:"💪 10 Sessions",      icon:"💪", check: s => s.totalSessions >= 10 },
  { id:"nodistract", label:"🧘 Clean Focus",      icon:"🧘", check: s => s.lastDistractions === 0 && s.totalSessions >= 1 },
  { id:"streak7",    label:"🔥 7 Day Streak",     icon:"🔥", check: s => s.streak >= 7 },
  { id:"hour",       label:"⏰ 1 Hour Focus",     icon:"⏰", check: s => s.totalMinutes >= 60 },
  { id:"night",      label:"🌙 Night Owl",        icon:"🌙", check: s => s.nightSession === true },
  { id:"legend",     label:"👑 Legend",            icon:"👑", check: s => s.totalMinutes >= 600 },
];

const LEVELS = [
  { name:"Beginner",    min:0,   next:60   },
  { name:"Deep Worker", min:60,  next:300  },
  { name:"Flow State",  min:300, next:600  },
  { name:"Legend",      min:600, next:9999 },
];

const SESSION_MODES = {
  normal: { label:"📚 Study",  penalty:20, desc:"Standard focus session. −20 pts per distraction." },
  deep:   { label:"🧠 Deep",   penalty:35, desc:"Deep Focus Mode. −35 pts/distraction. High reward." },
  sprint: { label:"⚡ Sprint", penalty:10, desc:"Sprint Mode — short bursts, low penalty, fast points." },
};

const DAILY_GOAL_MIN = 60; // 60 minutes default daily goal

// Working audio URLs — tested & reliable
const SOUND_URLS = {
  lofi:   "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3",
  rain:   "https://cdn.pixabay.com/audio/2022/03/10/audio_9419a9f7c5.mp3",
  cafe:   "https://cdn.pixabay.com/audio/2021/09/06/audio_3da8018a5d.mp3",
  forest: "https://cdn.pixabay.com/audio/2022/03/15/audio_16c4b21c07.mp3",
  white:  "https://cdn.pixabay.com/audio/2022/03/12/audio_4a0b1bd2c3.mp3",
};

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];


// ══════════════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════════════
let timeLeft = 0, totalTime = 0;
let distractedCount = 0, distractionPenaltyTotal = 0;
let running = false, intervalId = null;
let mode = "solo", sessionMode = "normal";
let roomUnsubscribe = null, globalUnsubscribe = null, roomPresenceUnsub = null;
let pomodoroMode = false, pomoPhase = "work", pomoCycle = 0;
let activeAudio = null, activeSound = null;
let distractionLog = [], distractionTimes = [];
let blurTime = null, lastActivity = Date.now();
let appInitialized = false;
let profileOpen = false;
let notificationsEnabled = true;
let presenceDocRef = null; // for room presence cleanup
let stats = {
  totalSessions:0, totalMinutes:0, streak:0,
  lastSessionDate:null, badges:[], weekData:[0,0,0,0,0,0,0],
  lastDistractions:0, todayMinutes:0, nightSession:false
};


// ══════════════════════════════════════════════════════════
//  ROUTING — SPA navigation with history API
// ══════════════════════════════════════════════════════════
function goToLanding() {
  if (running) { alert("Stop your session first!"); return; }
  history.pushState({ page:"landing" }, "", location.pathname);
  showLanding();
}
window.goToLanding = goToLanding;

window.addEventListener("popstate", e => {
  if (e.state && e.state.page === "app" && window.currentUser) showApp(window.currentUser);
  else showLanding();
});


// ══════════════════════════════════════════════════════════
//  AUTH — onAuthStateChanged is SOLE source of truth
//  Auth loader hides ONLY after Firebase resolves state
// ══════════════════════════════════════════════════════════
const loader = document.getElementById("authLoader");

// Start landing stats immediately — no auth required
initLandingStats();

onAuthStateChanged(auth, user => {
  loader.classList.add("hidden");
  setTimeout(() => loader.style.display = "none", 400);

  if (user) {
    window.currentUser = user;
    history.replaceState({ page:"app" }, "", location.pathname);
    showApp(user);
    if (!appInitialized) { appInitialized = true; initApp(); }
  } else {
    window.currentUser = null;
    appInitialized = false;
    cleanupPresence();
    showLanding();
  }
});

function showApp(user) {
  document.getElementById("landingPage").style.display = "none";
  document.getElementById("mainApp").style.display = "block";
  // Header
  const av = document.getElementById("userAvatar"); if (av) av.src = user.photoURL || "";
  const un = document.getElementById("userName");   if (un) un.innerText = user.displayName?.split(" ")[0] || "You";
  // Profile dropdown
  const pda = document.getElementById("pdAvatar"); if (pda) pda.src = user.photoURL || "";
  const pdn = document.getElementById("pdName");   if (pdn) pdn.innerText = user.displayName || "User";
  const pde = document.getElementById("pdEmail");  if (pde) pde.innerText = user.email || "";
}

function showLanding() {
  document.getElementById("landingPage").style.display = "block";
  document.getElementById("mainApp").style.display = "none";
  closeProfileMenu();
}

window.signInWithGoogle = async () => {
  try { await signInWithPopup(auth, gProvider); }
  catch (e) {
    if (e.code === "auth/popup-closed-by-user") return;
    alert("Sign-in failed: " + e.message);
  }
};

window.doSignOut = async () => {
  if (running) { alert("Stop your session before signing out."); return; }
  cleanupPresence();
  if (roomUnsubscribe)   { roomUnsubscribe();   roomUnsubscribe   = null; }
  if (globalUnsubscribe) { globalUnsubscribe(); globalUnsubscribe = null; }
  appInitialized = false;
  closeProfileMenu();
  await fbSignOut(auth);
};


// ══════════════════════════════════════════════════════════
//  WIRE BUTTONS (synchronous — DOM is ready when module runs)
// ══════════════════════════════════════════════════════════
["btnSignIn","btnHeroCTA","btnLbCTA","btnFinalCTA"].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("click", () => window.signInWithGoogle());
});

document.getElementById("roomInput")?.addEventListener("input", () => {
  if (mode === "room" && getRoom()) displayLeaderboard();
});

// Close profile on outside click
document.addEventListener("click", e => {
  const pd = document.getElementById("profileDropdown");
  const pill = document.getElementById("userPill");
  if (profileOpen && pd && pill && !pd.contains(e.target) && !pill.contains(e.target)) {
    closeProfileMenu();
  }
});

// Escape closes everything
document.addEventListener("keydown", e => {
  if (e.code === "Escape") {
    closeProfileMenu();
    document.getElementById("distractionModal").style.display = "none";
    document.getElementById("badgeModal").style.display = "none";
  }
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
  if (e.code === "Space") { e.preventDefault(); running ? stopSession() : startSession(); }
  if (e.code === "KeyR" && !running) resetUI();
});


// ══════════════════════════════════════════════════════════
//  APP INIT
// ══════════════════════════════════════════════════════════
async function initApp() {
  showQuote();
  loadTheme();
  loadSoundPreference();
  checkRoomFromURL();
  await loadStats();
  renderStats();
  renderHistory();
  displayGlobalLeaderboard();
  startIdleTracking();
  startVisibilityTracking();
  checkStreakWarning();
}
window.initApp = initApp;


// ══════════════════════════════════════════════════════════
//  LANDING STATS — public, no auth, real-time
// ══════════════════════════════════════════════════════════
function initLandingStats() {
  // Real-time global leaderboard on landing
  const q = query(collection(db,"users"), orderBy("total","desc"), limit(5));
  onSnapshot(q, snap => {
    const list = document.getElementById("landingLeaderboard");
    if (!list) return;
    list.innerHTML = "";
    const medals = ["🥇","🥈","🥉","4️⃣","5️⃣"];
    let i = 0;
    snap.forEach(d => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${medals[i]}</span><span style="flex:1">${d.data().name||d.id}</span><span style="color:var(--accent);font-weight:600">${d.data().total||0} pts</span>`;
      list.appendChild(li); i++;
    });
    if (i===0) list.innerHTML = "<li style='color:var(--muted);justify-content:center'>Be the first!</li>";
  });

  // Aggregate stats — fetched once (near real-time after sessions save)
  updatePublicStats();
}

async function updatePublicStats() {
  try {
    const snap = await getDocs(collection(db,"users"));
    let totalMins = 0, totalSess = 0;
    snap.forEach(d => {
      totalMins += d.data().totalMinutes  || 0;
      totalSess += d.data().totalSessions || 0;
    });
    const fmt = n => n >= 1000 ? (n/1000).toFixed(1)+"k" : String(n);
    const elS = document.getElementById("statSessions"); if(elS) elS.innerText = fmt(totalSess);
    const elU = document.getElementById("statUsers");    if(elU) elU.innerText = fmt(snap.size);
    const elM = document.getElementById("statMinutes");  if(elM) elM.innerText = fmt(totalMins);
    const elL = document.getElementById("liveMinutes");  if(elL) elL.innerText = fmt(totalMins);
  } catch(e) { console.warn("publicStats:", e); }
}


// ══════════════════════════════════════════════════════════
//  PROFILE DROPDOWN — fixed z-index, positioned via JS
// ══════════════════════════════════════════════════════════
function toggleProfileMenu() {
  profileOpen ? closeProfileMenu() : openProfileMenu();
}
window.toggleProfileMenu = toggleProfileMenu;

function openProfileMenu() {
  profileOpen = true;
  const pd   = document.getElementById("profileDropdown");
  const pill = document.getElementById("userPill");
  if (!pd || !pill) return;

  // Position relative to pill
  const rect = pill.getBoundingClientRect();
  pd.style.top   = (rect.bottom + 8) + "px";
  pd.style.right = (window.innerWidth - rect.right) + "px";
  pd.style.display = "block";
  pill.classList.add("open");
  updateProfileDropdownStats();
}

function closeProfileMenu() {
  profileOpen = false;
  const pd   = document.getElementById("profileDropdown");
  const pill = document.getElementById("userPill");
  if (pd)   pd.style.display = "none";
  if (pill) pill.classList.remove("open");
}

function updateProfileDropdownStats() {
  const level = getLevelInfo();
  const el = (id, val) => { const e = document.getElementById(id); if(e) e.innerText = val; };
  el("pdStreak",   stats.streak + "🔥");
  el("pdLevel",    level.name);
  el("pdSessions", stats.totalSessions);
  el("pdHours",    (stats.totalMinutes/60).toFixed(1)+"h");

  // Daily goal progress
  const pct = Math.min(100, Math.round((stats.todayMinutes / DAILY_GOAL_MIN) * 100));
  const goalText = document.getElementById("pdGoalText");
  const goalFill = document.getElementById("pdGoalFill");
  if (goalText) goalText.innerText = `${stats.todayMinutes} / ${DAILY_GOAL_MIN} min today`;
  if (goalFill) goalFill.style.width = pct + "%";

  // Theme switch state
  const ts = document.getElementById("themeSwitch");
  if (ts) ts.classList.toggle("active", !document.body.classList.contains("light"));
}

function toggleNotifications() {
  notificationsEnabled = !notificationsEnabled;
  const sw = document.getElementById("notifSwitch");
  if (sw) sw.classList.toggle("active", notificationsEnabled);
  if (notificationsEnabled && Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
}
window.toggleNotifications = toggleNotifications;


// ══════════════════════════════════════════════════════════
//  QUOTE
// ══════════════════════════════════════════════════════════
function showQuote() {
  const el = document.getElementById("quoteBar");
  if (el) el.innerText = QUOTES[Math.floor(Math.random() * QUOTES.length)];
}


// ══════════════════════════════════════════════════════════
//  THEME
// ══════════════════════════════════════════════════════════
function loadTheme() {
  if (localStorage.getItem("ff_theme") === "light") applyLight();
}
function applyLight() {
  document.body.classList.add("light");
  document.querySelectorAll(".theme-toggle").forEach(b => b.textContent = "☀️");
  const ts = document.getElementById("themeSwitch"); if(ts) ts.classList.remove("active");
}
function applyDark() {
  document.body.classList.remove("light");
  document.querySelectorAll(".theme-toggle").forEach(b => b.textContent = "🌙");
  const ts = document.getElementById("themeSwitch"); if(ts) ts.classList.add("active");
}
function toggleTheme() {
  const isLight = document.body.classList.contains("light");
  if (isLight) { applyDark(); localStorage.setItem("ff_theme","dark"); }
  else          { applyLight(); localStorage.setItem("ff_theme","light"); }
}
window.toggleTheme = toggleTheme;


// ══════════════════════════════════════════════════════════
//  STREAK WARNING
// ══════════════════════════════════════════════════════════
function checkStreakWarning() {
  if (!stats.streak) return;
  const today = new Date().toDateString();
  if (stats.lastSessionDate !== today && stats.streak > 0) {
    const banner = document.getElementById("streakBanner");
    const text   = document.getElementById("streakBannerText");
    if (banner && text) {
      text.innerText = `⚠️ You have a ${stats.streak}🔥 streak — complete a session today to keep it!`;
      banner.style.display = "flex";
    }
  }
}


// ══════════════════════════════════════════════════════════
//  MODE
// ══════════════════════════════════════════════════════════
function setMode(selected, btn) {
  if (running) { alert("Stop session first"); return; }
  mode = selected;
  if (roomUnsubscribe)    { roomUnsubscribe();    roomUnsubscribe    = null; }
  if (globalUnsubscribe)  { globalUnsubscribe();  globalUnsubscribe  = null; }
  if (roomPresenceUnsub)  { roomPresenceUnsub();  roomPresenceUnsub  = null; }
  cleanupPresence();

  const rs = document.getElementById("roomSection");
  if (mode === "solo") {
    rs.style.display = "none";
    document.getElementById("roomParticipants").style.display = "none";
    document.getElementById("leaderboard").innerHTML = "";
    switchBoard("global", document.querySelector(".leaderboard-tabs button[data-tab='global']"));
    displayGlobalLeaderboard();
  } else {
    rs.style.display = "block";
    switchBoard("room", document.querySelector(".leaderboard-tabs button[data-tab='room']"));
  }
  document.querySelectorAll(".mode-select button").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  resetUI();
}
window.setMode = setMode;


// ══════════════════════════════════════════════════════════
//  SESSION MODE
// ══════════════════════════════════════════════════════════
function setSessionMode(m, btn) {
  if (running) return;
  sessionMode = m;
  document.querySelectorAll(".smode-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  const desc = document.getElementById("smodeDesc");
  const info = document.getElementById("scoreInfoBody");
  const cfg  = SESSION_MODES[m];
  if (desc) desc.innerText = cfg.desc;
  if (info) info.innerText = `+1 pt/sec focused · −${cfg.penalty} pts/distraction · minimum 0`;
}
window.setSessionMode = setSessionMode;


// ══════════════════════════════════════════════════════════
//  SECTION TOGGLE
// ══════════════════════════════════════════════════════════
function toggleSection(id, btn) {
  const el = document.getElementById(id);
  if (!el) return;
  const hidden = el.style.display === "none";
  el.style.display = hidden ? "block" : "none";
  btn.textContent  = hidden ? "Hide" : "Show";
}
window.toggleSection = toggleSection;


// ══════════════════════════════════════════════════════════
//  TAB SWITCH (leaderboard)
// ══════════════════════════════════════════════════════════
function switchBoard(type, btn) {
  document.querySelectorAll(".leaderboard-tabs button").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  document.getElementById("roomBoard").style.display   = type==="room"   ? "block" : "none";
  document.getElementById("globalBoard").style.display = type==="global" ? "block" : "none";
}
window.switchBoard = switchBoard;


// ══════════════════════════════════════════════════════════
//  TIMER
// ══════════════════════════════════════════════════════════
function setTime(seconds, btn) {
  if (running) return;
  timeLeft = seconds; totalTime = seconds;
  updateTimerDisplay(); resetRing();
  document.getElementById("timer").classList.remove("distracted");
  document.querySelectorAll(".time-select button").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  document.getElementById("customTimeRow").style.display = "none";
  pomodoroMode = false;
  document.getElementById("pomodoroBtn").classList.remove("active");
  document.getElementById("pomoStatus").innerText = "";
}
window.setTime = setTime;

function openCustomTime() {
  const row = document.getElementById("customTimeRow");
  row.style.display = row.style.display === "none" ? "flex" : "none";
}
window.openCustomTime = openCustomTime;

function applyCustomTime() {
  const mins = parseInt(document.getElementById("customMinutes").value);
  if (!mins || mins < 1) return;
  timeLeft = mins*60; totalTime = mins*60;
  updateTimerDisplay(); resetRing();
  document.querySelectorAll(".time-select button").forEach(b => b.classList.remove("active"));
  document.getElementById("btnCustom").classList.add("active");
  document.getElementById("customTimeRow").style.display = "none";
}
window.applyCustomTime = applyCustomTime;

function updateTimerDisplay() {
  const m = Math.floor(timeLeft/60), s = timeLeft%60;
  document.getElementById("timer").innerText = String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");
  const pct = totalTime > 0 ? Math.round((timeLeft/totalTime)*100) : 0;
  document.getElementById("timerPct").innerText = running ? pct+"%" : "—";
  updateRing(pct);
  document.title = running ? `🎯 ${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")} — FocusFlow` : "FocusFlow — Deep Work Sessions";
}


// ══════════════════════════════════════════════════════════
//  POMODORO
// ══════════════════════════════════════════════════════════
function togglePomodoro() {
  if (running) return;
  pomodoroMode = !pomodoroMode;
  document.getElementById("pomodoroBtn").classList.toggle("active", pomodoroMode);
  if (pomodoroMode) {
    pomoPhase = "work"; pomoCycle = 0;
    timeLeft = 25*60; totalTime = 25*60;
    updateTimerDisplay(); resetRing();
    document.getElementById("pomoStatus").innerText = "🍅 Work — 25m";
    document.querySelectorAll(".time-select button").forEach(b => b.classList.remove("active"));
  } else {
    document.getElementById("pomoStatus").innerText = "";
  }
}
window.togglePomodoro = togglePomodoro;

function nextPomoPhase() {
  if (pomoPhase === "work") {
    pomoCycle++;
    pomoPhase = "break";
    timeLeft = 5*60; totalTime = 5*60;
    document.getElementById("pomoStatus").innerText = `☕ Break — 5m (Cycle ${pomoCycle})`;
    setStatus("Break time! ☕");
  } else {
    pomoPhase = "work";
    timeLeft = 25*60; totalTime = 25*60;
    document.getElementById("pomoStatus").innerText = `🍅 Work — 25m (Cycle ${pomoCycle})`;
    setStatus("Back to work! 🎯");
  }
  updateTimerDisplay(); resetRing();
  running = true;
  intervalId = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 0) { clearInterval(intervalId); playBell(); if(pomodoroMode) nextPomoPhase(); }
  }, 1000);
}


// ══════════════════════════════════════════════════════════
//  SESSION
// ══════════════════════════════════════════════════════════
function startSession() {
  if (running || !window.currentUser) return;
  if (timeLeft === 0) { setStatus("⚠️ Select a time first!"); return; }
  if (mode === "room" && !getRoom()) { setStatus("⚠️ Enter a room name!"); return; }

  document.getElementById("btnStart").disabled = true;
  running = true;
  distractedCount = 0; distractionPenaltyTotal = 0;
  distractionLog = []; distractionTimes = [];
  document.getElementById("shareBtn").style.display = "none";
  document.getElementById("sessionFeedback").style.display = "none";
  clearSummary();
  setStatus("Focused 🎯");
  document.getElementById("timer").classList.remove("distracted");
  document.getElementById("timerRingWrap").classList.remove("distracted-ring");

  // Join room presence
  if (mode === "room" && getRoom()) joinRoomPresence();

  intervalId = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 0) {
      clearInterval(intervalId);
      if (pomodoroMode) { nextPomoPhase(); return; }
      stopSession();
    }
  }, 1000);
}
window.startSession = startSession;

function stopSession() {
  if (!running) return;
  running = false;
  clearInterval(intervalId);
  document.title = "FocusFlow — Deep Work Sessions";

  const timeSpent = totalTime - timeLeft;

  // SMART SCORING: time-based distraction penalty
  const penaltyPerDistraction = SESSION_MODES[sessionMode].penalty;
  const score = Math.max(0, timeSpent - distractionPenaltyTotal);

  document.getElementById("btnStart").disabled = false;
  document.getElementById("timer").classList.remove("distracted");
  document.getElementById("timerRingWrap").classList.remove("distracted-ring");
  setStatus("Session Ended ✅");

  const m = Math.floor(timeSpent/60), s = timeSpent%60;
  document.getElementById("statTime").innerText         = String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");
  document.getElementById("statDistractions").innerText = distractedCount;
  document.getElementById("statScore").innerText        = score;

  // Distraction log
  const logEl = document.getElementById("distractionLog");
  logEl.innerHTML = "";
  distractionLog.forEach(d => {
    const div = document.createElement("div"); div.className = "dl-entry";
    div.innerHTML = `<span>⚠️</span> ${d.time} — away ${d.duration}s (−${d.penalty}pts)`;
    logEl.appendChild(div);
  });

  timeLeft = 0;
  document.getElementById("timer").innerText    = "00:00";
  document.getElementById("timerPct").innerText = "—";
  resetRing(); resetTimeButtons();
  playBell();

  // Smart feedback
  showSessionFeedback(distractedCount, timeSpent);

  // Confetti for clean sessions
  if (distractedCount === 0 && timeSpent >= 60) launchConfetti();
  document.getElementById("shareBtn").style.display = "block";

  // Notification
  try {
    if (notificationsEnabled && Notification.permission === "granted") {
      new Notification("FocusFlow — Session Complete! 🎉", {
        body: `Score: ${score} pts · Time: ${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`
      });
    }
  } catch(e) {}

  // Stop ambient sound when session ends
  if (activeAudio) { activeAudio.pause(); }

  // Leave room presence
  cleanupPresence();

  if (window.currentUser) saveSession(score, timeSpent);
}
window.stopSession = stopSession;

// SMART FEEDBACK based on session quality
function showSessionFeedback(dist, timeSpent) {
  const fb = document.getElementById("sessionFeedback");
  if (!fb) return;
  fb.style.display = "block";
  if (dist === 0 && timeSpent >= 1500) {
    fb.className = "session-feedback good";
    fb.innerText = "🔥 Exceptional focus! Zero distractions. You're in the zone!";
  } else if (dist === 0) {
    fb.className = "session-feedback good";
    fb.innerText = "✅ Clean session! No distractions. Keep it up!";
  } else if (dist <= 2) {
    fb.className = "session-feedback warn";
    fb.innerText = `⚡ Good effort! ${dist} distraction${dist>1?"s":""}. Try to cut down next time.`;
  } else if (dist <= 5) {
    fb.className = "session-feedback warn";
    fb.innerText = `😬 ${dist} distractions. Try shorter sessions to build focus gradually.`;
  } else {
    fb.className = "session-feedback bad";
    fb.innerText = `😔 Too many distractions (${dist}). Consider using Pomodoro or a shorter session.`;
  }
}

function resetUI() {
  clearSummary();
  setStatus("Ready");
  document.getElementById("timer").innerText    = "00:00";
  document.getElementById("timerPct").innerText = "—";
  document.getElementById("timer").classList.remove("distracted");
  timeLeft = 0; totalTime = 0; distractedCount = 0; distractionPenaltyTotal = 0;
  distractionLog = []; distractionTimes = [];
  resetRing(); resetTimeButtons();
  document.getElementById("distractionLog").innerHTML = "";
  document.getElementById("shareBtn").style.display = "none";
  document.getElementById("sessionFeedback").style.display = "none";
  document.title = "FocusFlow — Deep Work Sessions";
}
window.resetUI = resetUI;

function clearSummary() {
  document.getElementById("statTime").innerText         = "--";
  document.getElementById("statDistractions").innerText = "--";
  document.getElementById("statScore").innerText        = "--";
}
function resetTimeButtons() { document.querySelectorAll(".time-select button").forEach(b => b.classList.remove("active")); }
function setStatus(msg) { document.getElementById("status").innerText = msg; }


// ══════════════════════════════════════════════════════════
//  DISTRACTION DETECTION — IMPROVED
//
//  What browsers CAN do:
//  ✅ Detect tab switch (blur + visibilitychange)
//  ✅ Track time away + frequency
//  ✅ Apply adaptive penalties (longer away = bigger penalty)
//  ✅ Detect mouse/keyboard idle
//
//  What browsers CANNOT do:
//  ❌ See other tabs' content or URLs
//  ❌ Detect split-screen usage
//  ❌ Track other apps
//
//  Our strategy: Declare-based allowed mode — user picks what
//  they'll be doing (PDF, YouTube learning, Docs). If they
//  come back quickly (<10s), we assume it was allowed work.
// ══════════════════════════════════════════════════════════

function recordDistraction(awaySeconds = 0) {
  distractedCount++;
  distractionTimes.push(Date.now());

  // Adaptive penalty: base + time_away_seconds
  const cfg = SESSION_MODES[sessionMode];
  const basePenalty = cfg.penalty;
  const timePenalty = Math.floor(awaySeconds / 5); // +1 per 5s away
  const penalty = basePenalty + timePenalty;

  // Frequency escalation: >3 in 60s → double penalty
  const recentCutoff = Date.now() - 60000;
  const recentCount  = distractionTimes.filter(t => t > recentCutoff).length;
  const finalPenalty = recentCount > 3 ? penalty * 2 : penalty;
  distractionPenaltyTotal += finalPenalty;

  const now = new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
  distractionLog.push({ time: now, duration: awaySeconds, penalty: finalPenalty });

  const msg = recentCount > 3
    ? `🚨 Rapid switching! −${finalPenalty}pts (Distraction ${distractedCount})`
    : `Distracted ❌ −${finalPenalty}pts (${distractedCount} total)`;
  setStatus(msg);
  document.getElementById("timer").classList.add("distracted");
  document.getElementById("timerRingWrap").classList.add("distracted-ring");
  setTimeout(() => document.getElementById("timerRingWrap").classList.remove("distracted-ring"), 500);
}

window.onblur = () => {
  if (!running) return;
  blurTime = Date.now();
  recordDistraction(0);
};

window.onfocus = () => {
  if (!running || !blurTime) return;
  const away = Math.round((Date.now() - blurTime) / 1000);
  blurTime = null;
  document.getElementById("timer").classList.remove("distracted");

  // If away < 10s, assume it was allowed work — no extra modal
  if (away < 10) {
    setStatus(`Focused 🎯 · ${distractedCount} slip${distractedCount!==1?"s":""}`);
    return;
  }

  setStatus(`Focused 🎯 · ${distractedCount} slip${distractedCount!==1?"s":""}`);
  document.getElementById("modalMsg").innerText   = `You were away for ${away} seconds.`;
  document.getElementById("modalPenalty").innerText = `Penalty applied: −${SESSION_MODES[sessionMode].penalty + Math.floor(away/5)} pts`;
  document.getElementById("distractionModal").style.display = "flex";
};

function startVisibilityTracking() {
  document.addEventListener("visibilitychange", () => {
    if (!running) return;
    if (document.hidden) {
      if (!blurTime) { blurTime = Date.now(); recordDistraction(0); }
    } else {
      if (blurTime) {
        const away = Math.round((Date.now() - blurTime) / 1000);
        blurTime = null;
        document.getElementById("timer").classList.remove("distracted");
        setStatus(`Focused 🎯 · ${distractedCount} slip${distractedCount!==1?"s":""}`);
        if (away >= 10) {
          document.getElementById("modalMsg").innerText   = `You were away for ${away} seconds.`;
          document.getElementById("modalPenalty").innerText = `Penalty: −${SESSION_MODES[sessionMode].penalty + Math.floor(away/5)} pts`;
          document.getElementById("distractionModal").style.display = "flex";
        }
      }
    }
  });
}

function closeDistractionModal() {
  document.getElementById("distractionModal").style.display = "none";
}
window.closeDistractionModal = closeDistractionModal;

function startIdleTracking() {
  const reset = () => { lastActivity = Date.now(); };
  document.addEventListener("mousemove",  reset);
  document.addEventListener("keydown",    reset);
  document.addEventListener("touchstart", reset);
  setInterval(() => {
    if (!running) return;
    if (Date.now() - lastActivity > 5 * 60 * 1000) {
      recordDistraction(300);
      setStatus(`Idle 5min 😴 · ${distractedCount} distractions`);
      lastActivity = Date.now();
    }
  }, 30000);
}


// ══════════════════════════════════════════════════════════
//  ROOM PRESENCE — shows who's in the room
// ══════════════════════════════════════════════════════════
async function joinRoomPresence() {
  if (!window.currentUser || !getRoom()) return;
  const room = getRoom();
  const uid  = window.currentUser.uid;
  presenceDocRef = doc(db, "rooms", room, "presence", uid);
  try {
    await setDoc(presenceDocRef, {
      name:   window.currentUser.displayName || "User",
      uid,
      active: true,
      joinedAt: Date.now()
    });
  } catch(e) { console.warn("presence:", e); }

  // Listen for participants
  const presRef = collection(db, "rooms", room, "presence");
  roomPresenceUnsub = onSnapshot(presRef, snap => {
    const rpList = document.getElementById("rpList");
    const rpSection = document.getElementById("roomParticipants");
    if (!rpList || !rpSection) return;
    rpSection.style.display = "block";
    rpList.innerHTML = "";
    snap.forEach(d => {
      const data = d.data();
      const div  = document.createElement("div");
      div.className = "rp-user" + (data.active ? " active" : "");
      const initial = (data.name || "?")[0].toUpperCase();
      div.innerHTML = `<div class="rp-avatar">${initial}</div><span>${data.name}</span>`;
      rpList.appendChild(div);
    });
  });
}

async function cleanupPresence() {
  if (presenceDocRef) {
    try { await deleteDoc(presenceDocRef); } catch(e) {}
    presenceDocRef = null;
  }
  if (roomPresenceUnsub) { roomPresenceUnsub(); roomPresenceUnsub = null; }
}


// ══════════════════════════════════════════════════════════
//  AMBIENT SOUNDS — with preference saving
// ══════════════════════════════════════════════════════════
function toggleSound(btn) {
  const sound = btn.dataset.sound;
  if (activeSound === sound) {
    if (activeAudio) { activeAudio.pause(); activeAudio = null; }
    activeSound = null;
    btn.classList.remove("active");
    localStorage.removeItem("ff_sound");
    return;
  }
  if (activeAudio) activeAudio.pause();
  document.querySelectorAll(".sound-btn").forEach(b => b.classList.remove("active"));
  const audio  = new Audio(SOUND_URLS[sound]);
  audio.loop   = true;
  audio.volume = document.getElementById("volumeSlider").value / 100;
  audio.play().catch(() => {});
  activeAudio = audio; activeSound = sound;
  btn.classList.add("active");
  localStorage.setItem("ff_sound", sound);
  localStorage.setItem("ff_vol", document.getElementById("volumeSlider").value);
}
window.toggleSound = toggleSound;

function loadSoundPreference() {
  const saved = localStorage.getItem("ff_sound");
  const vol   = localStorage.getItem("ff_vol") || "40";
  document.getElementById("volumeSlider").value = vol;
  if (saved) {
    const btn = document.querySelector(`.sound-btn[data-sound="${saved}"]`);
    if (btn) toggleSound(btn);
  }
}

function setVolume(val) {
  if (activeAudio) activeAudio.volume = val / 100;
  localStorage.setItem("ff_vol", val);
}
window.setVolume = setVolume;

function playBell() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880; osc.type = "sine";
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 1.5);
  } catch(e) {}
}


// ══════════════════════════════════════════════════════════
//  RING
// ══════════════════════════════════════════════════════════
function updateRing(pct) {
  const ring = document.getElementById("ringProgress");
  if (!ring) return;
  const progress = totalTime > 0 ? timeLeft/totalTime : 0;
  ring.style.strokeDashoffset = CIRC * (1 - progress);
  // Red ring when under 10%
  if (pct !== undefined && pct < 10 && running) ring.classList.add("danger");
  else ring.classList.remove("danger");
}
function resetRing() {
  const ring = document.getElementById("ringProgress");
  if (ring) { ring.style.strokeDashoffset = CIRC; ring.classList.remove("danger"); }
}


// ══════════════════════════════════════════════════════════
//  INVITE LINK
// ══════════════════════════════════════════════════════════
function copyInviteLink() {
  const room = getRoom();
  if (!room) return;
  const url = `${location.origin}${location.pathname}?room=${encodeURIComponent(room)}`;
  navigator.clipboard.writeText(url)
    .then(() => { const t=document.getElementById("inviteToast"); t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),2500); })
    .catch(() => prompt("Copy this link:", url));
}
window.copyInviteLink = copyInviteLink;

function checkRoomFromURL() {
  const params = new URLSearchParams(location.search);
  const room   = params.get("room");
  if (room) {
    setTimeout(() => {
      const inp = document.getElementById("roomInput");
      if (inp) inp.value = room;
      const btn = document.querySelector(".mode-select button:last-child");
      if (btn) setMode("room", btn);
    }, 600);
  }
}


// ══════════════════════════════════════════════════════════
//  FIREBASE — SAVE SESSION
// ══════════════════════════════════════════════════════════
async function saveSession(score, timeSpent) {
  if (!window.currentUser) return;
  const uid      = window.currentUser.uid;
  const username = window.currentUser.displayName || window.currentUser.email || "Anonymous";
  const room = getRoom();
  const goal = document.getElementById("focusGoal")?.value.trim() || "—";
  const isNight = new Date().getHours() >= 23 || new Date().getHours() < 4;

  // Room leaderboard save
  if (mode === "room" && room) {
    await addDoc(collection(db,"rooms",room,"scores"), {
      value:score, name:username, uid, timestamp:Date.now()
    }).catch(e => console.warn("room save:", e));
  }

  // Session history
  await addDoc(collection(db,"users",uid,"sessions"), {
    score, timeSpent, distractions:distractedCount,
    goal, mode:sessionMode, timestamp:Date.now(),
    date: new Date().toLocaleDateString()
  }).catch(e => console.warn("session save:", e));

  // User stats
  const userRef  = doc(db,"users",uid);
  const userSnap = await getDoc(userRef).catch(()=>null);
  const prev     = userSnap?.exists() ? userSnap.data() : {};
  const today    = new Date().toDateString();
  const yesterday = new Date(Date.now()-86400000).toDateString();
  const lastDate = prev.lastSessionDate || "";
  const newStreak = lastDate===today ? (prev.streak||0) : lastDate===yesterday ? (prev.streak||0)+1 : 1;
  const weekData  = [...(prev.weekData||[0,0,0,0,0,0,0])];
  weekData[new Date().getDay()] += Math.floor(timeSpent/60);
  const todayMins = (lastDate===today ? (prev.todayMinutes||0) : 0) + Math.floor(timeSpent/60);

  await setDoc(userRef, {
    total:          (prev.total||0) + score,
    totalSessions:  (prev.totalSessions||0) + 1,
    totalMinutes:   (prev.totalMinutes||0) + Math.floor(timeSpent/60),
    streak:         newStreak,
    lastSessionDate: today,
    weekData,
    todayMinutes:   todayMins,
    lastDistractions: distractedCount,
    nightSession:   isNight,
    name: username
  }).catch(e => console.warn("user save:", e));

  stats = {
    totalSessions:   (prev.totalSessions||0)+1,
    totalMinutes:    (prev.totalMinutes||0)+Math.floor(timeSpent/60),
    streak:          newStreak,
    weekData,
    todayMinutes:    todayMins,
    lastDistractions: distractedCount,
    lastSessionDate: today,
    nightSession:    isNight,
    badges: checkBadges({
      totalSessions:(prev.totalSessions||0)+1,
      totalMinutes:(prev.totalMinutes||0)+Math.floor(timeSpent/60),
      streak:newStreak, lastDistractions:distractedCount, nightSession:isNight
    })
  };

  // Check for new badges
  const prevBadges = prev.badges || [];
  const newBadges  = stats.badges.filter(b => !prevBadges.includes(b));
  if (newBadges.length > 0) {
    const def = BADGES_DEF.find(b => b.id === newBadges[0]);
    if (def) showBadgeUnlock(def);
  }

  // Update daily goal in all places
  updateDailyGoalUI();
  renderStats();
  renderHistory();
  displayGlobalLeaderboard();
  updateProfileDropdownStats();
  updatePublicStats(); // refresh landing stats
  if (mode === "room") displayLeaderboard();
}


// ══════════════════════════════════════════════════════════
//  BADGE UNLOCK ANIMATION
// ══════════════════════════════════════════════════════════
function showBadgeUnlock(def) {
  const icon  = document.getElementById("badgeUnlockIcon");
  const label = document.getElementById("badgeUnlockLabel");
  const modal = document.getElementById("badgeModal");
  if (!icon || !label || !modal) return;
  icon.innerText  = def.icon;
  label.innerText = def.label;
  modal.style.display = "flex";
}


// ══════════════════════════════════════════════════════════
//  DAILY GOAL UI
// ══════════════════════════════════════════════════════════
function updateDailyGoalUI() {
  const today = new Date().toDateString();
  const todayMins = stats.lastSessionDate === today ? stats.todayMinutes : 0;
  const pct = Math.min(100, Math.round((todayMins / DAILY_GOAL_MIN) * 100));
  const dgVal  = document.getElementById("dgValue");
  const dgFill = document.getElementById("dgFill");
  if (dgVal)  dgVal.innerText = `${todayMins} / ${DAILY_GOAL_MIN} min`;
  if (dgFill) dgFill.style.width = pct + "%";
}


// ══════════════════════════════════════════════════════════
//  LOAD STATS
// ══════════════════════════════════════════════════════════
async function loadStats() {
  if (!window.currentUser) return;
  try {
    const snap = await getDoc(doc(db,"users",window.currentUser.uid));
    if (snap.exists()) {
      const d = snap.data();
      stats = {
        totalSessions:   d.totalSessions   || 0,
        totalMinutes:    d.totalMinutes    || 0,
        streak:          d.streak          || 0,
        weekData:        d.weekData        || [0,0,0,0,0,0,0],
        lastDistractions:d.lastDistractions|| 0,
        todayMinutes:    d.todayMinutes    || 0,
        lastSessionDate: d.lastSessionDate || null,
        nightSession:    d.nightSession    || false,
        badges: checkBadges(d)
      };
    }
  } catch(e) { console.warn("loadStats:", e); }
  updateDailyGoalUI();
}

function checkBadges(d) {
  return BADGES_DEF.filter(b => b.check(d)).map(b => b.id);
}

function getLevelInfo() {
  return [...LEVELS].reverse().find(l => stats.totalMinutes >= l.min) || LEVELS[0];
}


// ══════════════════════════════════════════════════════════
//  RENDER STATS
// ══════════════════════════════════════════════════════════
function renderStats() {
  const level = getLevelInfo();
  const el = (id, val) => { const e=document.getElementById(id); if(e) e.innerText=val; };
  el("dashStreak", stats.streak + "🔥");
  el("dashTotal",  stats.totalSessions);
  el("dashHours",  (stats.totalMinutes/60).toFixed(1)+"h");
  el("dashLevel",  level.name);

  // XP bar
  const xpMin  = level.min;
  const xpMax  = level.next;
  const xpCurr = stats.totalMinutes;
  const xpPct  = xpMax < 9999 ? Math.min(100, Math.round(((xpCurr-xpMin)/(xpMax-xpMin))*100)) : 100;
  const xpLbl  = document.getElementById("xpLabel");  if(xpLbl) xpLbl.innerText = `XP: ${xpCurr} min`;
  const xpNxt  = document.getElementById("xpNext");   if(xpNxt) xpNxt.innerText = xpMax < 9999 ? `Next: ${xpMax} min` : "Max Level!";
  const xpFill = document.getElementById("xpFill");   if(xpFill) xpFill.style.width = xpPct + "%";

  // Badges
  const prevIds = stats.badges;
  const row = document.getElementById("badgesRow");
  row.innerHTML = "";
  BADGES_DEF.forEach(b => {
    const div = document.createElement("div");
    div.className = "badge" + (prevIds.includes(b.id) ? " earned" : "");
    div.textContent = b.label;
    row.appendChild(div);
  });

  // Week chart
  const chart  = document.getElementById("weekChart");
  chart.innerHTML = "";
  const wd     = stats.weekData || [0,0,0,0,0,0,0];
  const maxVal = Math.max(...wd, 1);
  const today  = new Date().getDay();
  wd.forEach((val, i) => {
    const wrap = document.createElement("div"); wrap.className = "bar-day";
    const bar  = document.createElement("div");
    bar.className  = "bar" + (i===today ? " today" : "");
    bar.style.height = Math.max(3, (val/maxVal)*50) + "px";
    const lbl  = document.createElement("div"); lbl.className="bar-lbl"; lbl.textContent=DAYS[i];
    wrap.appendChild(bar); wrap.appendChild(lbl);
    chart.appendChild(wrap);
  });
}


// ══════════════════════════════════════════════════════════
//  RENDER HISTORY
// ══════════════════════════════════════════════════════════
async function renderHistory() {
  if (!window.currentUser) return;
  try {
    const q    = query(collection(db,"users",window.currentUser.uid,"sessions"), orderBy("timestamp","desc"), limit(10));
    const snap = await getDocs(q);
    const list = document.getElementById("historyList");
    list.innerHTML = "";
    if (snap.empty) {
      list.innerHTML = "<li style='color:var(--muted)'>No sessions yet. Start your first!</li>";
      return;
    }
    snap.forEach(d => {
      const data = d.data();
      const m    = Math.floor(data.timeSpent/60), s = data.timeSpent%60;
      const li   = document.createElement("li");
      const modeLabel = SESSION_MODES[data.mode||"normal"]?.label || "📚";
      li.innerHTML = `<span class="h-goal">${data.goal} ${modeLabel}</span><span class="h-meta">${data.date} · ${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")} · ${data.distractions} distractions · ${data.score} pts</span>`;
      list.appendChild(li);
    });
  } catch(e) { console.warn("renderHistory:", e); }
}


// ══════════════════════════════════════════════════════════
//  LEADERBOARDS — real-time onSnapshot
// ══════════════════════════════════════════════════════════
async function displayLeaderboard() {
  const room = getRoom();
  if (!room) { document.getElementById("leaderboard").innerHTML = "<li style='color:var(--muted)'>Enter a room name</li>"; return; }
  if (roomUnsubscribe) { roomUnsubscribe(); roomUnsubscribe = null; }
  const q = query(collection(db,"rooms",room,"scores"), orderBy("value","desc"), limit(5));
  roomUnsubscribe = onSnapshot(q, snap => {
    const list = document.getElementById("leaderboard");
    list.innerHTML = "";
    let i = 1;
    snap.forEach(d => {
      const data = d.data(); if (!data.name) return;
      const li   = document.createElement("li");
      const isMe = window.currentUser && data.uid === window.currentUser.uid;
      if (isMe) li.classList.add("mine");
      li.innerText = `#${i}  ${data.name}${isMe?" (you)":""} — ${data.value} pts`;
      list.appendChild(li); i++;
    });
    if (i===1) list.innerHTML = "<li style='color:var(--muted)'>No scores yet</li>";
  });
}

async function displayGlobalLeaderboard() {
  if (globalUnsubscribe) { globalUnsubscribe(); globalUnsubscribe = null; }
  const q = query(collection(db,"users"), orderBy("total","desc"), limit(10));
  globalUnsubscribe = onSnapshot(q, snap => {
    const list = document.getElementById("globalLeaderboard");
    list.innerHTML = "";
    let i = 1;
    snap.forEach(d => {
      const isMe = window.currentUser && d.id === window.currentUser.uid;
      const li   = document.createElement("li");
      if (isMe) li.classList.add("mine");
      li.innerText = `#${i}  ${d.data().name||d.id}${isMe?" (you)":""} — ${d.data().total||0} pts`;
      list.appendChild(li); i++;
    });
    if (i===1) list.innerHTML = "<li style='color:var(--muted)'>No scores yet</li>";
  });
}


// ══════════════════════════════════════════════════════════
//  SHARE
// ══════════════════════════════════════════════════════════
function shareScore() {
  const time  = document.getElementById("statTime").innerText;
  const dist  = document.getElementById("statDistractions").innerText;
  const score = document.getElementById("statScore").innerText;
  const goal  = document.getElementById("focusGoal")?.value.trim() || "Deep work";
  const text  = `⚡ FocusFlow Session\n🎯 ${goal}\n⏱️ ${time} · 🚫 ${dist} distractions · 🏆 ${score} pts\n\nfocus-app-six-hazel.vercel.app`;
  if (navigator.share) {
    navigator.share({ title:"FocusFlow Score", text }).catch(()=>{});
  } else {
    navigator.clipboard.writeText(text).then(()=>alert("Score copied! 🎉")).catch(()=>{});
  }
}
window.shareScore = shareScore;


// ══════════════════════════════════════════════════════════
//  CONFETTI — 3 second duration with fade out
// ══════════════════════════════════════════════════════════
function launchConfetti() {
  const canvas = document.getElementById("confettiCanvas");
  canvas.style.display = "block";
  canvas.style.opacity = "1";
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  const colors = ["#22d47a","#38bdf8","#f87171","#fbbf24","#818cf8","#fb923c"];
  const pieces = Array.from({length:140}, () => ({
    x: Math.random()*canvas.width,
    y: Math.random()*canvas.height - canvas.height,
    w: Math.random()*10+4, h: Math.random()*6+3,
    color: colors[Math.floor(Math.random()*colors.length)],
    speed: Math.random()*4+1.5,
    angle: Math.random()*Math.PI*2,
    spin:  (Math.random()-0.5)*0.22,
    drift: (Math.random()-0.5)*1.5
  }));

  const START = Date.now();
  const DURATION = 3500; // 3.5 seconds

  const draw = () => {
    const elapsed = Date.now() - START;
    if (elapsed > DURATION) {
      canvas.style.opacity = "0";
      setTimeout(() => { ctx.clearRect(0,0,canvas.width,canvas.height); canvas.style.display="none"; canvas.style.opacity="1"; }, 500);
      return;
    }
    // Fade out in last second
    if (elapsed > DURATION - 1000) canvas.style.opacity = ((DURATION - elapsed) / 1000).toFixed(2);

    ctx.clearRect(0,0,canvas.width,canvas.height);
    pieces.forEach(p => {
      p.y += p.speed; p.x += p.drift; p.angle += p.spin;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.angle);
      ctx.fillStyle = p.color; ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
      ctx.restore();
    });
    requestAnimationFrame(draw);
  };
  draw();
}


// ══════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════
function getRoom() { return document.getElementById("roomInput")?.value.trim() || ""; }