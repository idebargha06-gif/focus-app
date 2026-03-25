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
  doc, getDoc, setDoc,
  onSnapshot, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
  '"You have to be burning with an idea or a problem." — Steve Jobs',
  '"The ability to perform deep work is becoming increasingly rare and valuable." — Cal Newport',
  '"It\'s not that I\'m so smart, I stay with problems longer." — Einstein',
  '"The secret of getting ahead is getting started." — Mark Twain',
  '"Action is the foundational key to all success." — Pablo Picasso',
  '"Don\'t watch the clock; do what it does. Keep going." — Sam Levenson',
  '"Energy and persistence conquer all things." — Benjamin Franklin',
  '"Motivation is what gets you started. Habit is what keeps you going." — Jim Ryun',
  '"Your mind is for having ideas, not holding them." — David Allen',
  '"Focus on being productive instead of busy." — Tim Ferriss',
  '"You don\'t need more time. You need to decide." — Seth Godin',
  '"You don\'t rise to the level of your goals. You fall to the level of your systems." — James Clear',
  '"We are what we repeatedly do. Excellence is not an act, but a habit." — Aristotle',
  '"Discipline is choosing between what you want now and what you want most." — Abraham Lincoln',
  '"If you spend too much time thinking about a thing, you\'ll never get it done." — Bruce Lee',
  '"It always seems impossible until it\'s done." — Nelson Mandela',
  '"The mind is everything. What you think you become." — Buddha',
  '"Not how long, but how well you have lived is the main thing." — Seneca',
  '"Don\'t count the days. Make the days count." — Muhammad Ali',
  '"There is no substitute for hard work." — Thomas Edison',
  '"Nothing will work unless you do." — Maya Angelou',
  '"Begin anywhere." — John Cage',
  '"Today\'s accomplishments were yesterday\'s impossibilities." — Robert H. Schuller',
  '"Push yourself, because no one else is going to do it for you." — Unknown',
  '"Work hard in silence; let your success be the noise." — Frank Ocean',
  '"Believe you can and you\'re halfway there." — Theodore Roosevelt',
  '"It does not matter how slowly you go as long as you do not stop." — Confucius',
  '"Do something today that your future self will thank you for." — Sean Patrick Flanery',
  '"One day or day one. You decide." — Unknown',
  '"Strive for progress, not perfection." — Unknown',
  '"Results happen over time, not overnight. Work hard, stay consistent." — Unknown',
  '"Be so good they can\'t ignore you." — Steve Martin',
  '"Doing the best at this moment puts you in the best place for the next." — Oprah',
  '"You have power over your mind, not outside events." — Marcus Aurelius',
  '"Waste no more time arguing what a good man should be. Be one." — Marcus Aurelius',
  '"Begin at once to live, and count each separate day as a separate life." — Seneca',
  '"Don\'t explain your philosophy. Embody it." — Epictetus',
  '"Make the most of yourself, for that is all there is of you." — Emerson',
  '"Act as if what you do makes a difference. It does." — William James',
  '"Hard work beats talent when talent doesn\'t work hard." — Tim Notke',
  '"Study while others are sleeping; work while others are loafing." — William Arthur Ward',
  '"Well done is better than well said." — Benjamin Franklin',
  '"A little progress each day adds up to big results." — Satya Nani',
  '"The expert in anything was once a beginner." — Helen Hayes',
  '"Quality is not an act. It is a habit." — Aristotle',
  '"If you can dream it, you can do it." — Walt Disney',
  '"The only limit to our realization of tomorrow will be our doubts of today." — FDR',
  '"Problems are not stop signs. They are guidelines." — Robert Schuller',
];

const FEEDBACK_POOLS = {
  clean: [
    "🔥 Exceptional focus! Zero distractions — you're in the zone!",
    "✨ Flawless session! Your concentration is elite-level.",
    "🧘 Perfectly clean! No interruptions. Legendary!",
    "⚡ Zero distractions! Deep work master in the making.",
    "💎 Diamond focus — pure and uninterrupted.",
    "🎯 Bull's-eye! Every second counted. Beautiful work.",
    "🌊 Full flow state! Nothing broke your concentration.",
    "🔐 Focus mode locked in — nothing got through.",
  ],
  medium: [
    "⚡ Good effort! A few slips but overall solid focus.",
    "💪 Nice session! Tighten up on distractions next time.",
    "📈 Making progress! Keep building that distraction resistance.",
    "🎯 Good focus overall! Every session makes you stronger.",
    "🌱 Growing! A few bumps but you recovered well.",
    "✅ Solid session! Aim for fewer distractions next round.",
    "🏃 Keep the pace! You're building the focus habit.",
  ],
  bad: [
    "😬 Too many distractions. Try a shorter session next time.",
    "💭 Mind was wandering. Shorter Pomodoro sessions might help.",
    "📵 Put the phone down and try a fresh 10-minute session.",
    "🌊 Scattered energy. Take a 5-minute break then go again.",
    "💪 Even a difficult session counts. Try again!",
    "📖 Pro tip: Write your goal on paper before the next session.",
    "🚫 Too many tabs open? Close everything except what you need.",
  ]
};

const BADGES_DEF = [
  { id:"first",      label:"🎯 First Session",   icon:"🎯", check: s=>s.totalSessions>=1 },
  { id:"five",       label:"📚 Getting Started",  icon:"📚", check: s=>s.totalSessions>=5 },
  { id:"ten",        label:"💪 Consistent",        icon:"💪", check: s=>s.totalSessions>=10 },
  { id:"twentyfive", label:"🧠 Focused Mind",      icon:"🧠", check: s=>s.totalSessions>=25 },
  { id:"fifty",      label:"🏆 Deep Work Master",  icon:"🏆", check: s=>s.totalSessions>=50 },
  { id:"nodistract", label:"🧘 Clean Focus",       icon:"🧘", check: s=>s.lastDistractions===0&&s.totalSessions>=1 },
  { id:"streak3",    label:"🌱 Nice Start",        icon:"🌱", check: s=>s.streak>=3 },
  { id:"streak7",    label:"🔥 7 Day Streak",      icon:"🔥", check: s=>s.streak>=7 },
  { id:"streak14",   label:"⚡ Strong Habit",      icon:"⚡", check: s=>s.streak>=14 },
  { id:"streak30",   label:"👑 Elite Focus",       icon:"👑", check: s=>s.streak>=30 },
  { id:"hour",       label:"⏰ 1 Hour Focus",      icon:"⏰", check: s=>s.totalMinutes>=60 },
  { id:"night",      label:"🌙 Night Owl",         icon:"🌙", check: s=>s.nightSession===true },
  { id:"legend",     label:"🏅 Legend",            icon:"🏅", check: s=>s.totalMinutes>=600 },
];

const LEVELS = [
  { name:"Beginner",    min:0,   next:60   },
  { name:"Deep Worker", min:60,  next:300  },
  { name:"Flow State",  min:300, next:600  },
  { name:"Legend",      min:600, next:9999 },
];

const SESSION_MODES = {
  normal: { penalty:20, desc:"Standard session · −20 pts/distraction" },
  deep:   { penalty:35, desc:"Deep Focus · −35 pts/distraction · high reward" },
  sprint: { penalty:10, desc:"Sprint Mode · −10 pts/distraction · fast points" },
};

const DAILY_GOAL_MIN = 60;
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];


// ══════════════════════════════════════════════════════════
//  AUDIO PLAYER — fixed: no rAF, no double-fire on error
//  Each category: sounds/<cat>/<cat>1.mp3 … <cat>5.mp3
// ══════════════════════════════════════════════════════════
const AP = {
  cat:    null,   // selected category
  idx:    0,      // current track index 1-5
  vol:    0.4,
  _el:    null,   // current Audio element
  _busy:  false,  // prevents double-fire on error+catch

  trackUrl(cat, idx) { return `sounds/${cat}/${cat}${idx}.mp3`; },

  nextIdx(cat) {
    // random, avoiding immediate repeat
    const n = 5;
    const prev = this.idx;
    let next;
    let attempts = 0;
    do { next = Math.floor(Math.random() * n) + 1; attempts++; }
    while (next === prev && attempts < 15);
    return next;
  },

  play(cat) {
    this.stop(false); // stop silently (no fade — switching categories)
    this.cat   = cat;
    this.idx   = this.nextIdx(cat);
    this._busy = false;
    this._start(this.trackUrl(cat, this.idx));
    this._updateUI();
  },

  _start(url) {
    if (!this.cat) return;
    const el = new Audio();
    el.preload = "none"; // don't preload all 5 tracks
    el.volume  = 0;
    el.src     = url;
    this._el   = el;

    // Fade in using setInterval (not rAF — much lighter)
    const target = this.vol;
    let v = 0;
    const fadeIn = setInterval(() => {
      v = Math.min(v + 0.05, target);
      try { el.volume = v; } catch(e) {}
      if (v >= target) clearInterval(fadeIn);
    }, 60); // ~16 steps over ~1 second

    el.onended = () => {
      if (this.cat && this._el === el) this._next();
    };

    el.onerror = () => {
      // Only fire once per element
      if (this._busy || this._el !== el) return;
      this._busy = true;
      console.warn("Audio not found:", url);
      if (this.cat) setTimeout(() => this._next(), 300);
    };

    el.play().catch(() => {
      if (this._busy || this._el !== el) return;
      this._busy = true;
      console.warn("Audio play blocked:", url);
      if (this.cat) setTimeout(() => this._next(), 300);
    });
  },

  _next() {
    if (!this.cat) return;
    this._busy = false;
    const cat  = this.cat;
    // Fade out current using setInterval
    const el   = this._el;
    if (el) {
      let v = el.volume;
      const fo = setInterval(() => {
        v = Math.max(v - 0.08, 0);
        try { el.volume = v; } catch(e) {}
        if (v <= 0) {
          clearInterval(fo);
          try { el.pause(); el.src = ""; } catch(e) {}
        }
      }, 60);
    }
    this._el = null;
    this.idx = this.nextIdx(cat);
    setTimeout(() => {
      if (this.cat === cat) {
        this._start(this.trackUrl(cat, this.idx));
        this._updateUI();
      }
    }, 600); // gap matches fade duration (~600ms)
  },

  stop(fade = true) {
    this.cat = null;
    const el = this._el;
    this._el = null;
    if (!el) return;
    if (fade) {
      let v = el.volume;
      const fo = setInterval(() => {
        v = Math.max(v - 0.08, 0);
        try { el.volume = v; } catch(e) {}
        if (v <= 0) {
          clearInterval(fo);
          try { el.pause(); el.src = ""; } catch(e) {}
        }
      }, 60);
    } else {
      try { el.pause(); el.src = ""; } catch(e) {}
    }
    this._updateUI();
  },

  setVol(v) {
    this.vol = v;
    if (this._el) try { this._el.volume = v; } catch(e) {}
    localStorage.setItem("ff_vol", Math.round(v * 100));
  },

  _updateUI() {
    const el = document.getElementById("soundTrackInfo");
    if (el) el.innerText = this.cat ? `▶ ${this.cat} · track ${this.idx}` : "";
  }
};


// ══════════════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════════════
let timeLeft = 0, totalTime = 0;
let sessionStartTime = 0;   // Date.now() when session started — for accurate elapsed
let distractedCount = 0, distractionPenaltyTotal = 0;
let running = false, intervalId = null;
let mode = "solo", sessionMode = "normal";
let roomUnsubscribe = null, globalUnsubscribe = null, roomPresenceUnsub = null;
let pomodoroMode = false, pomoPhase = "work", pomoCycle = 0;
let distractionLog = [], distractionTimes = [];
let blurTime = null, lastActivity = Date.now();
let appInitialized = false;
let profileOpen = false;
let notificationsEnabled = true;
let presenceDocRef = null;
let lastQuoteIdx = -1;
let lastFeedbackIdx = { clean:-1, medium:-1, bad:-1 };
let selectedSoundCat = null;
let stats = {
  totalSessions:0, totalMinutes:0, streak:0, longestStreak:0,
  lastSessionDate:null, badges:[], weekData:[0,0,0,0,0,0,0],
  lastDistractions:0, todayMinutes:0, nightSession:false, sessionDates:[]
};


// ══════════════════════════════════════════════════════════
//  ROUTING
// ══════════════════════════════════════════════════════════
function goToLanding() {
  if (running) { alert("Stop your session first!"); return; }
  history.pushState({ page:"landing" }, "", location.pathname);
  showLandingView();
}
window.goToLanding = goToLanding;

function goToApp() {
  if (!window.currentUser) { window.signInWithGoogle(); return; }
  history.pushState({ page:"app" }, "", location.pathname);
  showAppView(window.currentUser);
}
window.goToApp = goToApp;

window.addEventListener("popstate", e => {
  if (e.state?.page === "app" && window.currentUser) showAppView(window.currentUser);
  else showLandingView();
});


// ══════════════════════════════════════════════════════════
//  AUTH — single source of truth, loader blocks until resolved
// ══════════════════════════════════════════════════════════
const loader = document.getElementById("authLoader");
initLandingStats(); // public data, no auth

onAuthStateChanged(auth, user => {
  loader.classList.add("hidden");
  setTimeout(() => loader.style.display = "none", 350);

  if (user) {
    window.currentUser = user;
    history.replaceState({ page:"app" }, "", location.pathname);
    showAppView(user);
    if (!appInitialized) { appInitialized = true; initApp(); }
  } else {
    window.currentUser = null;
    appInitialized = false;
    cleanupPresence();
    if (roomUnsubscribe)   { roomUnsubscribe();   roomUnsubscribe   = null; }
    if (globalUnsubscribe) { globalUnsubscribe(); globalUnsubscribe = null; }
    AP.stop(false);
    showLandingView();
  }
});

// ── showLandingView: adapts for logged-in/logged-out
function showLandingView() {
  document.getElementById("landingPage").style.display = "block";
  document.getElementById("mainApp").style.display     = "none";
  closeProfileMenu();

  const isIn = !!window.currentUser;
  const sib  = document.getElementById("btnSignIn");
  const nua  = document.getElementById("navUserArea");
  if (sib) sib.style.display = isIn ? "none" : "block";
  if (nua) nua.style.display = isIn ? "flex"  : "none";

  if (isIn) {
    const u = window.currentUser;
    const navAv = document.getElementById("navUserAvatar");
    if (navAv) navAv.src = u.photoURL || "";
    document.getElementById("landingLoggedIn").style.display  = "block";
    document.getElementById("landingLoggedOut").style.display = "none";

    const name = u.displayName?.split(" ")[0] || "there";
    const lwN = document.getElementById("lwName"); if (lwN) lwN.innerText = name;
    const lwAv= document.getElementById("lwAvatar"); if (lwAv) lwAv.src = u.photoURL || "";
    const si  = document.getElementById("lwStreakInline"); if (si) si.innerText = `🔥 ${stats.streak} day streak`;

    const today = new Date().toDateString();
    const tm    = stats.lastSessionDate === today ? stats.todayMinutes : 0;
    const level = getLevelInfo();
    const el    = (id,v) => { const e=document.getElementById(id);if(e) e.innerText=v; };
    el("lwMinutes",  tm);
    el("lwSessions", stats.totalSessions);
    el("lwLevel",    level.name);
    el("lwTotal",    stats.totalMinutes);

    const pct = Math.min(100, Math.round((tm / DAILY_GOAL_MIN) * 100));
    const gv  = document.getElementById("lwGoalVal");  if (gv)  gv.innerText = `${tm} / ${DAILY_GOAL_MIN} min`;
    const gf  = document.getElementById("lwGoalFill"); if (gf)  gf.style.width = pct + "%";

    const sub = document.getElementById("lwSubtext");
    if (sub) {
      if (stats.streak >= 7)            sub.innerText = `🔥 ${stats.streak} day streak — you're on fire!`;
      else if (tm >= DAILY_GOAL_MIN)    sub.innerText = "✅ Daily goal achieved! Keep the momentum.";
      else                              sub.innerText = "Ready to focus? Your streak is waiting.";
    }
  } else {
    document.getElementById("landingLoggedIn").style.display  = "none";
    document.getElementById("landingLoggedOut").style.display = "block";
  }
}

function showAppView(user) {
  document.getElementById("landingPage").style.display = "none";
  document.getElementById("mainApp").style.display     = "block";
  const av = document.getElementById("userAvatar"); if (av) av.src = user.photoURL || "";
  const un = document.getElementById("userName");   if (un) un.innerText = user.displayName?.split(" ")[0] || "You";
  const pda= document.getElementById("pdAvatar");   if (pda) pda.src = user.photoURL || "";
  const pdn= document.getElementById("pdName");     if (pdn) pdn.innerText = user.displayName || "User";
  const pde= document.getElementById("pdEmail");    if (pde) pde.innerText = user.email || "";
}

window.signInWithGoogle = async () => {
  try { await signInWithPopup(auth, gProvider); }
  catch(e) {
    if (e.code === "auth/popup-closed-by-user") return;
    alert("Sign-in failed: " + e.message);
  }
};

window.doSignOut = async () => {
  if (running) { alert("Stop your session before signing out."); return; }
  cleanupPresence();
  if (roomUnsubscribe)   { roomUnsubscribe();   roomUnsubscribe   = null; }
  if (globalUnsubscribe) { globalUnsubscribe(); globalUnsubscribe = null; }
  AP.stop(false);
  appInitialized = false;
  closeProfileMenu();
  await fbSignOut(auth);
};


// ══════════════════════════════════════════════════════════
//  WIRE BUTTONS
// ══════════════════════════════════════════════════════════
["btnSignIn","btnHeroCTA","btnLbCTA","btnFinalCTA"].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("click", () => window.signInWithGoogle());
});

document.getElementById("roomInput")?.addEventListener("input", () => {
  if (mode === "room" && getRoom()) displayLeaderboard();
});

// Close dropdown on outside click
document.addEventListener("click", e => {
  const pd   = document.getElementById("profileDropdown");
  const pill = document.getElementById("userPill");
  if (profileOpen && pd && pill && !pd.contains(e.target) && !pill.contains(e.target)) closeProfileMenu();
});

document.addEventListener("keydown", e => {
  if (e.code === "Escape") {
    closeProfileMenu();
    document.getElementById("distractionModal").style.display = "none";
    document.getElementById("badgeModal").style.display       = "none";
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
  restoreSoundPref();
  checkRoomFromURL();
  await loadStats();
  renderStats();        // sync, instant
  renderStreakCalendar(); // sync, instant
  renderHistory();      // async but non-blocking
  displayGlobalLeaderboard(); // realtime listener
  startIdleTracking();
  startVisibilityTracking();
  checkStreakWarning();
  // Update daily goal in case today changed since last load
  updateDailyGoalUI();
}
window.initApp = initApp;


// ══════════════════════════════════════════════════════════
//  LANDING STATS — real-time, no auth
// ══════════════════════════════════════════════════════════
function initLandingStats() {
  // Real-time leaderboard
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
  updatePublicStats();
}

async function updatePublicStats() {
  try {
    const snap = await getDocs(collection(db,"users"));
    let tm=0, ts=0;
    snap.forEach(d => { tm+=d.data().totalMinutes||0; ts+=d.data().totalSessions||0; });
    const fmt = n => n>=1000?(n/1000).toFixed(1)+"k":String(n);
    const elS=document.getElementById("statSessions"); if(elS) elS.innerText=fmt(ts);
    const elU=document.getElementById("statUsers");    if(elU) elU.innerText=fmt(snap.size);
    const elM=document.getElementById("statMinutes");  if(elM) elM.innerText=fmt(tm);
    const elL=document.getElementById("liveMinutes");  if(elL) elL.innerText=fmt(tm);
  } catch(e) {}
}


// ══════════════════════════════════════════════════════════
//  PROFILE DROPDOWN — positioned via JS, always on top
// ══════════════════════════════════════════════════════════
function toggleProfileMenu() { profileOpen ? closeProfileMenu() : openProfileMenu(); }
window.toggleProfileMenu = toggleProfileMenu;

function openProfileMenu() {
  profileOpen = true;
  const pd   = document.getElementById("profileDropdown");
  const pill = document.getElementById("userPill");
  if (!pd||!pill) return;
  const rect = pill.getBoundingClientRect();
  pd.style.top   = (rect.bottom + 8) + "px";
  pd.style.right = (window.innerWidth - rect.right) + "px";
  pd.style.display = "block";
  pill.classList.add("open");
  refreshProfileDropdown();
}

function closeProfileMenu() {
  profileOpen = false;
  const pd   = document.getElementById("profileDropdown");
  const pill = document.getElementById("userPill");
  if (pd)   pd.style.display = "none";
  if (pill) pill.classList.remove("open");
}

function refreshProfileDropdown() {
  const level = getLevelInfo();
  const today = new Date().toDateString();
  const tm    = stats.lastSessionDate === today ? stats.todayMinutes : 0;
  const pct   = Math.min(100, Math.round((tm / DAILY_GOAL_MIN) * 100));
  const el    = (id,v) => { const e=document.getElementById(id);if(e)e.innerText=v; };
  el("pdStreak",   stats.streak);
  el("pdSessions", stats.totalSessions);
  el("pdHours",    (stats.totalMinutes/60).toFixed(1)+"h");
  el("pdTotal",    stats.totalMinutes);
  el("pdLevelBadge", level.name);
  el("pdGoalText", `${tm} / ${DAILY_GOAL_MIN} min`);
  const gf = document.getElementById("pdGoalFill"); if (gf) gf.style.width = pct + "%";
  const ts = document.getElementById("themeSwitch");
  if (ts) ts.classList.toggle("active", !document.body.classList.contains("light"));
}

function toggleNotifications() {
  notificationsEnabled = !notificationsEnabled;
  const sw = document.getElementById("notifSwitch");
  if (sw) sw.classList.toggle("active", notificationsEnabled);
  if (notificationsEnabled && Notification.permission === "default") Notification.requestPermission().catch(()=>{});
}
window.toggleNotifications = toggleNotifications;


// ══════════════════════════════════════════════════════════
//  QUOTE — no back-to-back repeat
// ══════════════════════════════════════════════════════════
function showQuote() {
  const el = document.getElementById("quoteBar");
  if (!el) return;
  let idx;
  do { idx = Math.floor(Math.random() * QUOTES.length); } while (idx === lastQuoteIdx && QUOTES.length > 1);
  lastQuoteIdx = idx;
  el.innerText = QUOTES[idx];
}


// ══════════════════════════════════════════════════════════
//  THEME
// ══════════════════════════════════════════════════════════
function loadTheme() { if (localStorage.getItem("ff_theme")==="light") applyLight(); }
function applyLight() { document.body.classList.add("light"); document.querySelectorAll(".theme-toggle").forEach(b=>b.textContent="☀️"); const ts=document.getElementById("themeSwitch");if(ts)ts.classList.remove("active"); }
function applyDark()  { document.body.classList.remove("light"); document.querySelectorAll(".theme-toggle").forEach(b=>b.textContent="🌙"); const ts=document.getElementById("themeSwitch");if(ts)ts.classList.add("active"); }
function toggleTheme() {
  const isL = document.body.classList.contains("light");
  isL ? (applyDark(), localStorage.setItem("ff_theme","dark")) : (applyLight(), localStorage.setItem("ff_theme","light"));
}
window.toggleTheme = toggleTheme;


// ══════════════════════════════════════════════════════════
//  STREAK WARNING
// ══════════════════════════════════════════════════════════
function checkStreakWarning() {
  if (!stats.streak) return;
  const today = new Date().toDateString();
  if (stats.lastSessionDate !== today) {
    const b=document.getElementById("streakBanner"),t=document.getElementById("streakBannerText");
    if (b&&t) { t.innerText=`⚠️ ${stats.streak}🔥 streak — complete a session today to keep it!`; b.style.display="flex"; }
  }
}


// ══════════════════════════════════════════════════════════
//  MODE
// ══════════════════════════════════════════════════════════
function setMode(sel,btn) {
  if (running) { alert("Stop session first"); return; }
  mode = sel;
  if (roomUnsubscribe)   { roomUnsubscribe();   roomUnsubscribe   = null; }
  if (globalUnsubscribe) { globalUnsubscribe(); globalUnsubscribe = null; }
  if (roomPresenceUnsub) { roomPresenceUnsub(); roomPresenceUnsub = null; }
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
  document.querySelectorAll(".mode-select button").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  resetUI();
}
window.setMode = setMode;

function setSessionMode(m,btn) {
  if (running) return;
  sessionMode = m;
  document.querySelectorAll(".smode-btn").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  const desc = document.getElementById("smodeDesc");
  const info = document.getElementById("scoreInfoBody");
  const cfg  = SESSION_MODES[m];
  if (desc) desc.innerText = cfg.desc;
  if (info) info.innerText = `+1 pt/sec · −${cfg.penalty} pts/distraction · min 0`;
}
window.setSessionMode = setSessionMode;

function toggleSection(id,btn) {
  const el = document.getElementById(id);
  if (!el) return;
  const h = el.style.display === "none";
  el.style.display = h ? "block" : "none";
  btn.textContent  = h ? "Hide" : "Show";
}
window.toggleSection = toggleSection;

// Streak calendar toggle
function toggleCalendar(btn) {
  const body = document.getElementById("streakCalBody");
  if (!body) return;
  const open = body.style.display !== "none";
  body.style.display = open ? "none" : "block";
  btn.classList.toggle("open", !open);
}
window.toggleCalendar = toggleCalendar;

function switchBoard(type,btn) {
  document.querySelectorAll(".leaderboard-tabs button").forEach(b=>b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  document.getElementById("roomBoard").style.display   = type==="room"  ?"block":"none";
  document.getElementById("globalBoard").style.display = type==="global"?"block":"none";
}
window.switchBoard = switchBoard;


// ══════════════════════════════════════════════════════════
//  TIMER — uses Date.now() delta, no drift
// ══════════════════════════════════════════════════════════
function setTime(secs,btn) {
  if (running) return;
  timeLeft = secs; totalTime = secs;
  updateTimerDisplay(); resetRing();
  document.getElementById("timer").classList.remove("distracted");
  document.querySelectorAll(".time-select button").forEach(b=>b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  document.getElementById("customTimeRow").style.display = "none";
  pomodoroMode = false;
  document.getElementById("pomodoroBtn").classList.remove("active");
  document.getElementById("pomoStatus").innerText = "";
}
window.setTime = setTime;

function openCustomTime() {
  const r = document.getElementById("customTimeRow");
  r.style.display = r.style.display === "none" ? "flex" : "none";
}
window.openCustomTime = openCustomTime;

function applyCustomTime() {
  const mins = parseInt(document.getElementById("customMinutes").value);
  if (!mins || mins < 1) return;
  timeLeft = mins*60; totalTime = mins*60;
  updateTimerDisplay(); resetRing();
  document.querySelectorAll(".time-select button").forEach(b=>b.classList.remove("active"));
  document.getElementById("btnCustom").classList.add("active");
  document.getElementById("customTimeRow").style.display = "none";
}
window.applyCustomTime = applyCustomTime;

// Called every second — purely synchronous DOM writes
function updateTimerDisplay() {
  const m = Math.floor(timeLeft/60), s = timeLeft%60;
  document.getElementById("timer").innerText = String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");
  const pct = totalTime>0 ? Math.round((timeLeft/totalTime)*100) : 0;
  document.getElementById("timerPct").innerText = running ? pct+"%" : "—";
  updateRing(pct);
  document.title = running ? `🎯 ${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")} — FocusFlow` : "FocusFlow";
}


// ══════════════════════════════════════════════════════════
//  POMODORO
// ══════════════════════════════════════════════════════════
function togglePomodoro() {
  if (running) return;
  pomodoroMode = !pomodoroMode;
  document.getElementById("pomodoroBtn").classList.toggle("active", pomodoroMode);
  if (pomodoroMode) {
    pomoPhase="work"; pomoCycle=0; timeLeft=25*60; totalTime=25*60;
    updateTimerDisplay(); resetRing();
    document.getElementById("pomoStatus").innerText = "🍅 Work — 25m";
    document.querySelectorAll(".time-select button").forEach(b=>b.classList.remove("active"));
  } else document.getElementById("pomoStatus").innerText = "";
}
window.togglePomodoro = togglePomodoro;

function nextPomoPhase() {
  if (pomoPhase==="work") {
    pomoCycle++; pomoPhase="break"; timeLeft=5*60; totalTime=5*60;
    document.getElementById("pomoStatus").innerText=`☕ Break — 5m (Cycle ${pomoCycle})`;
    setStatus("Break time! ☕");
  } else {
    pomoPhase="work"; timeLeft=25*60; totalTime=25*60;
    document.getElementById("pomoStatus").innerText=`🍅 Work — 25m (Cycle ${pomoCycle})`;
    setStatus("Back to work! 🎯");
  }
  updateTimerDisplay(); resetRing();
  running = true;
  const startTime = Date.now();
  const initLeft  = timeLeft;
  intervalId = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    timeLeft = Math.max(0, initLeft - elapsed);
    updateTimerDisplay();
    if (timeLeft <= 0) { clearInterval(intervalId); playBell(); if (pomodoroMode) nextPomoPhase(); }
  }, 250); // 4x/sec for responsiveness
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

  // Hide summary until session ends
  document.getElementById("summaryBox").style.display = "none";

  setStatus("Focused 🎯");
  document.getElementById("timer").classList.remove("distracted");
  document.getElementById("timerRingWrap").classList.remove("distracted-ring");

  // Start sound
  if (selectedSoundCat) AP.play(selectedSoundCat);

  showQuote(); // fresh quote on start

  if (mode === "room" && getRoom()) joinRoomPresence();

  // Use Date.now()-delta timer for accuracy — poll at 250ms for instant display
  sessionStartTime = Date.now();
  const initLeft   = timeLeft;
  intervalId = setInterval(() => {
    const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
    timeLeft = Math.max(0, initLeft - elapsed);
    updateTimerDisplay();
    if (timeLeft <= 0) {
      clearInterval(intervalId);
      if (pomodoroMode) { nextPomoPhase(); return; }
      stopSession();
    }
  }, 250); // 4 updates/sec — snappy, lightweight
}
window.startSession = startSession;

function stopSession() {
  if (!running) return;
  running = false;
  clearInterval(intervalId);
  document.title = "FocusFlow — Deep Work Sessions";

  const timeSpent = totalTime - timeLeft;
  const score     = Math.max(0, timeSpent - distractionPenaltyTotal);

  // ── UPDATE UI INSTANTLY (before any async) ──────────────
  document.getElementById("btnStart").disabled = false;
  document.getElementById("timer").classList.remove("distracted");
  document.getElementById("timerRingWrap").classList.remove("distracted-ring");
  setStatus("Session Ended ✅");

  const m = Math.floor(timeSpent/60), s = timeSpent%60;
  document.getElementById("statTime").innerText         = String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");
  document.getElementById("statDistractions").innerText = distractedCount;
  document.getElementById("statScore").innerText        = score;

  // Focus %
  const focusPct = timeSpent>0 ? Math.round(Math.max(0,(timeSpent-distractionPenaltyTotal)/timeSpent)*100) : 100;
  const avgGap   = distractedCount>0 ? Math.round(timeSpent/distractedCount)+"s" : "—";
  const er = document.getElementById("summaryExtraRow");
  if (er) {
    er.style.display = "flex";
    const fp = document.getElementById("seFocusPct"); if (fp) fp.innerText = focusPct+"%";
    const ag = document.getElementById("seAvgDist");  if (ag) ag.innerText = avgGap;
  }

  // Distraction log
  const logEl = document.getElementById("distractionLog");
  logEl.innerHTML = "";
  distractionLog.forEach(d => {
    const div = document.createElement("div");
    div.innerHTML = `<span style="color:var(--danger)">⚠️</span> ${d.time} — away ${d.duration}s (−${d.penalty}pts)`;
    logEl.appendChild(div);
  });

  // Show summary
  document.getElementById("summaryBox").style.display = "flex";
  timeLeft = 0;
  document.getElementById("timer").innerText    = "00:00";
  document.getElementById("timerPct").innerText = "—";
  resetRing(); resetTimeButtons();
  playBell();

  // Smart feedback
  showSessionFeedback(distractedCount, timeSpent);

  if (distractedCount === 0 && timeSpent >= 60) launchConfetti();
  document.getElementById("shareBtn").style.display = "block";

  // Stop audio
  AP.stop(true);

  // Notification
  try {
    if (notificationsEnabled && Notification.permission === "granted") {
      new Notification("FocusFlow — Session Complete! 🎉", { body:`Score: ${score} pts · ${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}` });
    }
  } catch(e) {}

  cleanupPresence();

  // ── FIREBASE SAVE — async, non-blocking. UI already updated above.
  if (window.currentUser) saveSession(score, timeSpent).catch(e => console.warn("save:", e));
}
window.stopSession = stopSession;

function showSessionFeedback(dist,timeSpent) {
  const fb = document.getElementById("sessionFeedback");
  if (!fb) return;
  let pool, key;
  if (dist===0)      { pool=FEEDBACK_POOLS.clean;  key="clean"; }
  else if (dist<=3)  { pool=FEEDBACK_POOLS.medium; key="medium"; }
  else               { pool=FEEDBACK_POOLS.bad;    key="bad"; }
  let idx;
  do { idx=Math.floor(Math.random()*pool.length); } while (idx===lastFeedbackIdx[key]&&pool.length>1);
  lastFeedbackIdx[key] = idx;
  fb.style.display = "block";
  fb.className = "session-feedback " + (dist===0?"good":dist<=3?"warn":"bad");
  fb.innerText = pool[idx];
}

function resetUI() {
  setStatus("Ready");
  document.getElementById("timer").innerText    = "00:00";
  document.getElementById("timerPct").innerText = "—";
  document.getElementById("timer").classList.remove("distracted");
  timeLeft=0; totalTime=0; distractedCount=0; distractionPenaltyTotal=0;
  distractionLog=[]; distractionTimes=[];
  resetRing(); resetTimeButtons();
  document.getElementById("distractionLog").innerHTML = "";
  document.getElementById("shareBtn").style.display  = "none";
  document.getElementById("summaryBox").style.display = "none";
  document.title = "FocusFlow — Deep Work Sessions";
}
window.resetUI = resetUI;

function resetTimeButtons() { document.querySelectorAll(".time-select button").forEach(b=>b.classList.remove("active")); }
function setStatus(msg) { document.getElementById("status").innerText = msg; }


// ══════════════════════════════════════════════════════════
//  DISTRACTION DETECTION
// ══════════════════════════════════════════════════════════
function recordDistraction(awaySeconds=0) {
  distractedCount++;
  distractionTimes.push(Date.now());
  const base    = SESSION_MODES[sessionMode].penalty;
  const tBonus  = Math.floor(awaySeconds/5);
  const recent  = distractionTimes.filter(t=>t>Date.now()-60000).length;
  const penalty = (base + tBonus) * (recent > 3 ? 2 : 1);
  distractionPenaltyTotal += penalty;
  const now = new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
  distractionLog.push({ time:now, duration:awaySeconds, penalty });
  setStatus(recent>3?`🚨 Rapid switch! −${penalty}pts (${distractedCount})`:
                      `Distracted ❌ −${penalty}pts (${distractedCount})`);
  document.getElementById("timer").classList.add("distracted");
  document.getElementById("timerRingWrap").classList.add("distracted-ring");
  setTimeout(()=>document.getElementById("timerRingWrap").classList.remove("distracted-ring"), 400);
}

window.onblur = () => { if (!running) return; blurTime=Date.now(); recordDistraction(0); };

window.onfocus = () => {
  if (!running || !blurTime) return;
  const away = Math.round((Date.now()-blurTime)/1000);
  blurTime = null;
  document.getElementById("timer").classList.remove("distracted");
  if (away < 10) { setStatus(`Focused 🎯 · ${distractedCount} slip${distractedCount!==1?"s":""}`); return; }
  setStatus(`Focused 🎯 · ${distractedCount} slip${distractedCount!==1?"s":""}`);
  const penalty = SESSION_MODES[sessionMode].penalty + Math.floor(away/5);
  document.getElementById("modalMsg").innerText   = `You were away for ${away} seconds.`;
  document.getElementById("modalPenalty").innerText = `Penalty: −${penalty} pts`;
  document.getElementById("distractionModal").style.display = "flex";
};

function startVisibilityTracking() {
  document.addEventListener("visibilitychange", () => {
    if (!running) return;
    if (document.hidden) { if (!blurTime) { blurTime=Date.now(); recordDistraction(0); } }
    else if (blurTime) {
      const away = Math.round((Date.now()-blurTime)/1000);
      blurTime = null;
      document.getElementById("timer").classList.remove("distracted");
      setStatus(`Focused 🎯 · ${distractedCount} slip${distractedCount!==1?"s":""}`);
      if (away >= 10) {
        document.getElementById("modalMsg").innerText   = `You were away for ${away} seconds.`;
        document.getElementById("modalPenalty").innerText = `Penalty: −${SESSION_MODES[sessionMode].penalty+Math.floor(away/5)} pts`;
        document.getElementById("distractionModal").style.display = "flex";
      }
    }
  });
}

function closeDistractionModal() { document.getElementById("distractionModal").style.display="none"; }
window.closeDistractionModal = closeDistractionModal;

function startIdleTracking() {
  const reset = () => { lastActivity=Date.now(); };
  document.addEventListener("mousemove",reset);
  document.addEventListener("keydown",reset);
  document.addEventListener("touchstart",reset);
  setInterval(() => {
    if (!running) return;
    if (Date.now()-lastActivity > 5*60*1000) { recordDistraction(300); setStatus(`Idle 5min 😴 · ${distractedCount} dist.`); lastActivity=Date.now(); }
  }, 30000);
}


// ══════════════════════════════════════════════════════════
//  SOUND SYSTEM
// ══════════════════════════════════════════════════════════
function toggleSound(btn) {
  const cat = btn.dataset.sound;
  if (selectedSoundCat === cat) {
    selectedSoundCat = null;
    AP.stop();
    btn.classList.remove("active");
    localStorage.removeItem("ff_sound");
    return;
  }
  document.querySelectorAll(".sound-btn").forEach(b=>b.classList.remove("active"));
  selectedSoundCat = cat;
  btn.classList.add("active");
  localStorage.setItem("ff_sound", cat);
  localStorage.setItem("ff_vol", document.getElementById("volumeSlider").value);
  if (running) AP.play(cat);
}
window.toggleSound = toggleSound;

function restoreSoundPref() {
  const saved = localStorage.getItem("ff_sound");
  const vol   = parseFloat(localStorage.getItem("ff_vol")||"40") / 100;
  AP.vol = vol;
  const sl = document.getElementById("volumeSlider"); if (sl) sl.value = Math.round(vol*100);
  if (saved) {
    selectedSoundCat = saved;
    const btn = document.querySelector(`.sound-btn[data-sound="${saved}"]`);
    if (btn) btn.classList.add("active");
  }
}

function setVolume(val) { AP.setVol(parseFloat(val)/100); }
window.setVolume = setVolume;

function playBell() {
  try {
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    const osc=ctx.createOscillator(); const gain=ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value=880; osc.type="sine";
    gain.gain.setValueAtTime(0.3,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+1.5);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime+1.5);
  } catch(e) {}
}


// ══════════════════════════════════════════════════════════
//  RING — no CSS transition on ring-progress for instant response
// ══════════════════════════════════════════════════════════
function updateRing(pct) {
  const ring = document.getElementById("ringProgress");
  if (!ring) return;
  const progress = totalTime>0 ? timeLeft/totalTime : 0;
  ring.style.strokeDashoffset = CIRC * (1-progress);
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
  const room = getRoom(); if (!room) return;
  const url = `${location.origin}${location.pathname}?room=${encodeURIComponent(room)}`;
  navigator.clipboard.writeText(url)
    .then(()=>{ const t=document.getElementById("inviteToast"); t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),2500); })
    .catch(()=>prompt("Copy this link:", url));
}
window.copyInviteLink = copyInviteLink;

function checkRoomFromURL() {
  const room = new URLSearchParams(location.search).get("room");
  if (room) setTimeout(()=>{
    const inp=document.getElementById("roomInput"); if(inp) inp.value=room;
    const btn=document.querySelector(".mode-select button:last-child"); if(btn) setMode("room",btn);
    displayLeaderboard();
  }, 700);
}

async function joinRoomPresence() {
  if (!window.currentUser || !getRoom()) return;
  const room=getRoom(), uid=window.currentUser.uid;
  presenceDocRef = doc(db,"rooms",room,"presence",uid);
  try { await setDoc(presenceDocRef,{name:window.currentUser.displayName||"User",uid,active:true,joinedAt:Date.now()}); } catch(e){}
  roomPresenceUnsub = onSnapshot(collection(db,"rooms",room,"presence"), snap=>{
    const rpL=document.getElementById("rpList"),rpS=document.getElementById("roomParticipants");
    if (!rpL||!rpS) return;
    rpS.style.display="block"; rpL.innerHTML="";
    snap.forEach(d=>{ const data=d.data(); const div=document.createElement("div"); div.className="rp-user"+(data.active?" active":""); div.innerHTML=`<div class="rp-avatar">${(data.name||"?")[0].toUpperCase()}</div><span>${data.name}</span>`; rpL.appendChild(div); });
  });
}

async function cleanupPresence() {
  if (presenceDocRef) { try { await deleteDoc(presenceDocRef); } catch(e){} presenceDocRef=null; }
  if (roomPresenceUnsub) { roomPresenceUnsub(); roomPresenceUnsub=null; }
}


// ══════════════════════════════════════════════════════════
//  FIREBASE SAVE — async, non-blocking
// ══════════════════════════════════════════════════════════
async function saveSession(score, timeSpent) {
  if (!window.currentUser) return;
  const uid      = window.currentUser.uid;
  const username = window.currentUser.displayName || window.currentUser.email || "Anonymous";
  const room = getRoom();
  const goal = document.getElementById("focusGoal")?.value.trim() || "—";
  const isNight = new Date().getHours()>=23 || new Date().getHours()<4;
  const today   = new Date().toDateString();
  const todayISO= new Date().toISOString().split("T")[0];

  if (mode==="room"&&room) await addDoc(collection(db,"rooms",room,"scores"),{value:score,name:username,uid,timestamp:Date.now()}).catch(()=>{});
  await addDoc(collection(db,"users",uid,"sessions"),{score,timeSpent,distractions:distractedCount,goal,mode:sessionMode,timestamp:Date.now(),date:new Date().toLocaleDateString()}).catch(()=>{});

  const userRef  = doc(db,"users",uid);
  const userSnap = await getDoc(userRef).catch(()=>null);
  const prev     = userSnap?.exists() ? userSnap.data() : {};
  const yesterday= new Date(Date.now()-86400000).toDateString();
  const lastDate = prev.lastSessionDate||"";
  const newStreak= lastDate===today?(prev.streak||0):lastDate===yesterday?(prev.streak||0)+1:1;
  const weekData = [...(prev.weekData||[0,0,0,0,0,0,0])];
  weekData[new Date().getDay()] += Math.floor(timeSpent/60);
  const todayMins= (lastDate===today?(prev.todayMinutes||0):0)+Math.floor(timeSpent/60);
  const newTotalS= (prev.totalSessions||0)+1;
  const newTotalM= (prev.totalMinutes||0)+Math.floor(timeSpent/60);
  const longestSt= Math.max(newStreak, prev.longestStreak||0);

  const sessionDates= [...(prev.sessionDates||[])];
  if (!sessionDates.includes(todayISO)) sessionDates.push(todayISO);
  const cutoff = new Date(Date.now()-90*86400000).toISOString().split("T")[0];
  const filteredDates = sessionDates.filter(d=>d>=cutoff);

  const prevBadges = prev.badges||[];
  const newStatsObj= {totalSessions:newTotalS,totalMinutes:newTotalM,streak:newStreak,lastDistractions:distractedCount,nightSession:isNight};
  const allEarned  = checkBadges(newStatsObj);
  const trulyNew   = allEarned.filter(b=>!prevBadges.includes(b));

  await setDoc(userRef,{
    total:(prev.total||0)+score, totalSessions:newTotalS, totalMinutes:newTotalM,
    streak:newStreak, longestStreak:longestSt, lastSessionDate:today,
    weekData, todayMinutes:todayMins, lastDistractions:distractedCount,
    nightSession:isNight, name:username, badges:allEarned, sessionDates:filteredDates
  }).catch(()=>{});

  // Update local state
  stats = {...stats, totalSessions:newTotalS, totalMinutes:newTotalM, streak:newStreak,
    longestStreak:longestSt, weekData, todayMinutes:todayMins, lastDistractions:distractedCount,
    lastSessionDate:today, nightSession:isNight, badges:allEarned, sessionDates:filteredDates };

  // Badge popup — only new ones
  if (trulyNew.length>0) {
    const def = BADGES_DEF.find(b=>b.id===trulyNew[0]);
    if (def) showBadgeUnlock(def);
  }

  // Update right-panel (non-blocking, after UI already showed summary)
  updateDailyGoalUI();
  renderStats();
  renderStreakCalendar();
  renderHistory();
  displayGlobalLeaderboard();
  updatePublicStats();
  if (mode==="room") displayLeaderboard();
}

function showBadgeUnlock(def) {
  const icon=document.getElementById("badgeUnlockIcon");
  const label=document.getElementById("badgeUnlockLabel");
  const modal=document.getElementById("badgeModal");
  if (!icon||!label||!modal) return;
  icon.innerText=def.icon; label.innerText=def.label; modal.style.display="flex";
}

function updateDailyGoalUI() {
  const today = new Date().toDateString();
  const tm    = stats.lastSessionDate===today ? stats.todayMinutes : 0;
  const pct   = Math.min(100,Math.round((tm/DAILY_GOAL_MIN)*100));
  const dgV=document.getElementById("dgValue");  if(dgV) dgV.innerText=`${tm} / ${DAILY_GOAL_MIN} min`;
  const dgF=document.getElementById("dgFill");   if(dgF) dgF.style.width=pct+"%";
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
      stats = { totalSessions:d.totalSessions||0, totalMinutes:d.totalMinutes||0,
        streak:d.streak||0, longestStreak:d.longestStreak||0,
        weekData:d.weekData||[0,0,0,0,0,0,0], lastDistractions:d.lastDistractions||0,
        todayMinutes:d.todayMinutes||0, lastSessionDate:d.lastSessionDate||null,
        nightSession:d.nightSession||false, badges:d.badges||[], sessionDates:d.sessionDates||[] };
    }
  } catch(e) { console.warn("loadStats:", e); }
  updateDailyGoalUI();
}

function checkBadges(d) { return BADGES_DEF.filter(b=>b.check(d)).map(b=>b.id); }
function getLevelInfo() { return [...LEVELS].reverse().find(l=>stats.totalMinutes>=l.min)||LEVELS[0]; }


// ══════════════════════════════════════════════════════════
//  RENDER STATS — fast, sync
// ══════════════════════════════════════════════════════════
function renderStats() {
  const level = getLevelInfo();
  const el    = (id,v) => { const e=document.getElementById(id);if(e)e.innerText=v; };
  el("dashStreak", stats.streak+"🔥");
  el("dashTotal",  stats.totalSessions);
  el("dashHours",  (stats.totalMinutes/60).toFixed(1)+"h");
  el("dashLevel",  level.name);

  // XP bar
  const xpMin=level.min, xpMax=level.next, xpCurr=stats.totalMinutes;
  const xpPct = xpMax<9999 ? Math.min(100,Math.round(((xpCurr-xpMin)/(xpMax-xpMin))*100)) : 100;
  const xpL=document.getElementById("xpLabel"); if(xpL) xpL.innerText=`${xpCurr} min`;
  const xpN=document.getElementById("xpNext");  if(xpN) xpN.innerText=xpMax<9999?`→ ${xpMax} min`:"→ Max!";
  const xpF=document.getElementById("xpFill");  if(xpF) xpF.style.width=xpPct+"%";

  // Badges
  const earnedCount = stats.badges.length;
  const bc = document.getElementById("badgeCount"); if(bc) bc.innerText=`${earnedCount} / ${BADGES_DEF.length}`;
  const row = document.getElementById("badgesRow");
  if (row) {
    row.innerHTML = "";
    BADGES_DEF.forEach(b => {
      const div = document.createElement("div");
      div.className = "badge" + (stats.badges.includes(b.id)?" earned":"");
      div.textContent = b.label;
      div.title = stats.badges.includes(b.id) ? "Earned!" : "Locked";
      row.appendChild(div);
    });
  }

  // Week chart
  const chart = document.getElementById("weekChart");
  if (chart) {
    chart.innerHTML = "";
    const wd     = stats.weekData||[0,0,0,0,0,0,0];
    const maxVal = Math.max(...wd, 1);
    const todayD = new Date().getDay();
    wd.forEach((val,i) => {
      const wrap=document.createElement("div"); wrap.className="bar-day";
      const bar =document.createElement("div"); bar.className="bar"+(i===todayD?" today":"");
      bar.style.height = Math.max(3,(val/maxVal)*48)+"px";
      const lbl =document.createElement("div"); lbl.className="bar-lbl"; lbl.textContent=DAYS[i];
      wrap.appendChild(bar); wrap.appendChild(lbl); chart.appendChild(wrap);
    });
  }
}


// ══════════════════════════════════════════════════════════
//  STREAK CALENDAR — 28-day view
//  Only marks a day as "missed" if it's in the past AND
//  the user had already started using the app (has sessions)
// ══════════════════════════════════════════════════════════
function renderStreakCalendar() {
  const cal = document.getElementById("streakCalendar");
  if (!cal) return;
  cal.innerHTML = "";

  const today = new Date(); today.setHours(0,0,0,0);
  const sessionSet = new Set(stats.sessionDates||[]);

  // Weekly consistency (last 7 days)
  let weekDone = 0;
  for (let i=6; i>=0; i--) {
    const d   = new Date(today.getTime()-i*86400000);
    const key = d.toISOString().split("T")[0];
    if (sessionSet.has(key)) weekDone++;
  }
  const consistency = Math.round((weekDone/7)*100);
  const scL = document.getElementById("scLongestInline");    if(scL) scL.innerText=`Best: ${stats.longestStreak||0}d`;
  const scC = document.getElementById("scConsistencyInline"); if(scC) scC.innerText=`Week: ${consistency}%`;

  // First session date (to determine when user "started")
  const firstDate = sessionSet.size>0 ? [...sessionSet].sort()[0] : null;

  for (let i=27; i>=0; i--) {
    const d      = new Date(today.getTime()-i*86400000);
    const key    = d.toISOString().split("T")[0];
    const isToday= i===0;
    const hasSess= sessionSet.has(key);

    const cell = document.createElement("div");
    cell.className = "sc-day";
    cell.title = key;

    if (hasSess) {
      cell.classList.add("done");
    } else if (isToday) {
      // today, not yet done — neutral
    } else if (firstDate && key >= firstDate) {
      // past day after user started — missed
      cell.classList.add("missed");
    } else {
      // before user started — empty/neutral
      cell.classList.add("empty");
    }

    if (isToday) cell.classList.add("today");
    cal.appendChild(cell);
  }
}


// ══════════════════════════════════════════════════════════
//  RENDER HISTORY
// ══════════════════════════════════════════════════════════
async function renderHistory() {
  if (!window.currentUser) return;
  try {
    const q    = query(collection(db,"users",window.currentUser.uid,"sessions"),orderBy("timestamp","desc"),limit(10));
    const snap = await getDocs(q);
    const list = document.getElementById("historyList");
    list.innerHTML = "";
    if (snap.empty) { list.innerHTML="<li style='color:var(--muted)'>No sessions yet. Start your first!</li>"; return; }
    snap.forEach(d => {
      const data=d.data();
      const m=Math.floor(data.timeSpent/60),s=data.timeSpent%60;
      const li=document.createElement("li");
      const mLabel=SESSION_MODES[data.mode||"normal"]?`[${data.mode||"study"}]`:"";
      li.innerHTML=`<span class="h-goal">${data.goal} <span style="color:var(--muted);font-size:9px">${mLabel}</span></span><span class="h-meta">${data.date} · ${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")} · ${data.distractions} dist · ${data.score} pts</span>`;
      list.appendChild(li);
    });
  } catch(e) { console.warn("renderHistory:",e); }
}


// ══════════════════════════════════════════════════════════
//  LEADERBOARDS
// ══════════════════════════════════════════════════════════
async function displayLeaderboard() {
  const room=getRoom();
  if (!room) { document.getElementById("leaderboard").innerHTML="<li style='color:var(--muted)'>Enter a room name</li>"; return; }
  if (roomUnsubscribe) { roomUnsubscribe(); roomUnsubscribe=null; }
  const q=query(collection(db,"rooms",room,"scores"),orderBy("value","desc"),limit(5));
  roomUnsubscribe=onSnapshot(q,snap=>{
    const list=document.getElementById("leaderboard"); list.innerHTML=""; let i=1;
    snap.forEach(d=>{ const data=d.data(); if(!data.name) return; const li=document.createElement("li"); const isMe=window.currentUser&&data.uid===window.currentUser.uid; if(isMe)li.classList.add("mine"); li.innerText=`#${i}  ${data.name}${isMe?" (you)":""} — ${data.value} pts`; list.appendChild(li); i++; });
    if (i===1) list.innerHTML="<li style='color:var(--muted)'>No scores yet</li>";
  });
}

async function displayGlobalLeaderboard() {
  if (globalUnsubscribe) { globalUnsubscribe(); globalUnsubscribe=null; }
  const q=query(collection(db,"users"),orderBy("total","desc"),limit(10));
  globalUnsubscribe=onSnapshot(q,snap=>{
    const list=document.getElementById("globalLeaderboard"); list.innerHTML=""; let i=1;
    snap.forEach(d=>{ const isMe=window.currentUser&&d.id===window.currentUser.uid; const li=document.createElement("li"); if(isMe)li.classList.add("mine"); li.innerText=`#${i}  ${d.data().name||d.id}${isMe?" (you)":""} — ${d.data().total||0} pts`; list.appendChild(li); i++; });
    if (i===1) list.innerHTML="<li style='color:var(--muted)'>No scores yet</li>";
  });
}


// ══════════════════════════════════════════════════════════
//  SHARE
// ══════════════════════════════════════════════════════════
function shareScore() {
  const time =document.getElementById("statTime").innerText;
  const dist =document.getElementById("statDistractions").innerText;
  const score=document.getElementById("statScore").innerText;
  const goal =document.getElementById("focusGoal")?.value.trim()||"Deep work";
  const text =`⚡ FocusFlow\n🎯 ${goal}\n⏱️ ${time} · 🚫 ${dist} dist · 🏆 ${score} pts\n\nfocus-app-six-hazel.vercel.app`;
  if (navigator.share) navigator.share({title:"FocusFlow Score",text}).catch(()=>{});
  else navigator.clipboard.writeText(text).then(()=>alert("Score copied! 🎉")).catch(()=>{});
}
window.shareScore=shareScore;


// ══════════════════════════════════════════════════════════
//  CONFETTI — 3.5s smooth fade
// ══════════════════════════════════════════════════════════
function launchConfetti() {
  const canvas=document.getElementById("confettiCanvas");
  canvas.style.display="block"; canvas.style.opacity="1";
  const ctx=canvas.getContext("2d");
  canvas.width=window.innerWidth; canvas.height=window.innerHeight;
  const colors=["#22d47a","#38bdf8","#f87171","#fbbf24","#818cf8","#fb923c"];
  const pieces=Array.from({length:120},()=>({x:Math.random()*canvas.width,y:Math.random()*canvas.height-canvas.height,w:Math.random()*9+4,h:Math.random()*5+3,color:colors[Math.floor(Math.random()*colors.length)],speed:Math.random()*3.5+1.5,angle:Math.random()*Math.PI*2,spin:(Math.random()-0.5)*0.2,drift:(Math.random()-0.5)*1.2}));
  const START=Date.now(), DUR=3500;
  const draw=()=>{
    const el=Date.now()-START;
    if(el>DUR){canvas.style.opacity="0";setTimeout(()=>{ctx.clearRect(0,0,canvas.width,canvas.height);canvas.style.display="none";canvas.style.opacity="1";},500);return;}
    if(el>DUR-1000) canvas.style.opacity=((DUR-el)/1000).toFixed(2);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    pieces.forEach(p=>{p.y+=p.speed;p.x+=p.drift;p.angle+=p.spin;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.fillStyle=p.color;ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);ctx.restore();});
    requestAnimationFrame(draw);
  };
  draw();
}


// ══════════════════════════════════════════════════════════
//  HELPER
// ══════════════════════════════════════════════════════════
function getRoom() { return document.getElementById("roomInput")?.value.trim()||""; }