export const APP_TITLE = "FocusFlow";
export const DEFAULT_TITLE = "FocusFlow | Deep work that feels intentional";
export const DAILY_GOAL_MINUTES = 60;
export const CIRCLE_RADIUS = 88;
export const CIRCLE_LENGTH = 2 * Math.PI * CIRCLE_RADIUS;
export const ROOM_PRESENCE_TTL_MS = 2 * 60 * 1000;
export const ROOM_HEARTBEAT_MS = 30 * 1000;
export const IDLE_THRESHOLD_MS = 5 * 60 * 1000;
export const TIMER_TICK_MS = 250;
export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const DEFAULT_DURATIONS = [
  { label: "5m", seconds: 5 * 60 },
  { label: "10m", seconds: 10 * 60 },
  { label: "25m", seconds: 25 * 60 },
  { label: "1h", seconds: 60 * 60 },
  { label: "2h", seconds: 2 * 60 * 60 },
  { label: "3h", seconds: 3 * 60 * 60 }
];

export const SOUND_CATEGORIES = [
  { id: "lofi", label: "Lofi" },
  { id: "rain", label: "Rain" },
  { id: "cafe", label: "Cafe" },
  { id: "forest", label: "Forest" },
  { id: "white", label: "White noise" }
];

export const SESSION_MODES = {
  normal: {
    id: "normal",
    label: "Study",
    penalty: 20,
    description: "Balanced scoring for everyday focus blocks."
  },
  deep: {
    id: "deep",
    label: "Deep",
    penalty: 35,
    description: "Stricter distraction penalties for high-intent work."
  },
  sprint: {
    id: "sprint",
    label: "Sprint",
    penalty: 10,
    description: "Lighter penalties for fast, short bursts of work."
  }
};

export const LEVELS = [
  { name: "Beginner", min: 0, next: 60 },
  { name: "Deep Worker", min: 60, next: 300 },
  { name: "Flow State", min: 300, next: 600 },
  { name: "Legend", min: 600, next: Number.POSITIVE_INFINITY }
];

export const BADGES = [
  { id: "first_session", label: "First Session", check: (stats) => stats.totalSessions >= 1 },
  { id: "five_sessions", label: "Getting Started", check: (stats) => stats.totalSessions >= 5 },
  { id: "ten_sessions", label: "Consistent", check: (stats) => stats.totalSessions >= 10 },
  { id: "twenty_five_sessions", label: "Focused Mind", check: (stats) => stats.totalSessions >= 25 },
  { id: "fifty_sessions", label: "Deep Work Master", check: (stats) => stats.totalSessions >= 50 },
  { id: "clean_focus", label: "Clean Focus", check: (stats) => stats.lastDistractions === 0 && stats.totalSessions >= 1 },
  { id: "streak_three", label: "Nice Start", check: (stats) => stats.streak >= 3 },
  { id: "streak_seven", label: "Seven Day Streak", check: (stats) => stats.streak >= 7 },
  { id: "streak_fourteen", label: "Strong Habit", check: (stats) => stats.streak >= 14 },
  { id: "streak_thirty", label: "Elite Focus", check: (stats) => stats.streak >= 30 },
  { id: "hour_focused", label: "One Hour Focused", check: (stats) => stats.totalMinutes >= 60 },
  { id: "night_owl", label: "Night Owl", check: (stats) => stats.nightSession === true },
  { id: "legend", label: "Legend", check: (stats) => stats.totalMinutes >= 600 }
];

export const QUOTES = [
  "Deep work is the ability to focus without distraction. - Cal Newport",
  "Either you run the day or the day runs you. - Jim Rohn",
  "Focus is deciding what not to do. - John Carmack",
  "Do not watch the clock. Do what it does. Keep going. - Sam Levenson",
  "A little progress each day adds up to big results. - Satya Nani",
  "Progress grows out of consistency. - FocusFlow"
];

export const FEEDBACK_POOLS = {
  clean: [
    "Exceptional focus. That session stayed clean from start to finish.",
    "Locked in. No distractions, no drift, just deliberate work.",
    "That was a sharp session. Keep repeating that rhythm."
  ],
  steady: [
    "Solid work. A few slips, but you recovered well.",
    "Good momentum. Tighten the edges and the next one gets even better.",
    "You stayed in the work more often than not. That still counts."
  ],
  rough: [
    "The session felt noisy. Try a shorter block and reset cleanly.",
    "Attention drifted. Reduce tabs, shorten the timer, and go again.",
    "Not your cleanest round, but it still created signal for the next one."
  ]
};
