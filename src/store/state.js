import { DAILY_GOAL_MINUTES, DEFAULT_DURATIONS, QUOTES } from "../utils/constants.js";
import { getRoomIdFromUrl } from "../utils/room.js";

export function createEmptyStats() {
  return {
    totalScore: 0,
    totalSessions: 0,
    totalMinutes: 0,
    streak: 0,
    longestStreak: 0,
    weekData: [0, 0, 0, 0, 0, 0, 0],
    todayMinutes: 0,
    lastDistractions: 0,
    lastSessionDay: null,
    nightSession: false,
    badges: [],
    activityDays: [],
    dailyGoalMinutes: DAILY_GOAL_MINUTES
  };
}

export function createInitialState() {
  const roomId = getRoomIdFromUrl();
  const selectedDuration = DEFAULT_DURATIONS[2].seconds;
  const savedTheme = localStorage.getItem("ff_theme") === "light" ? "light" : "dark";
  const notificationsEnabled = localStorage.getItem("ff_notifications") !== "off";
  const savedSound = localStorage.getItem("ff_sound") || "";
  const savedVolume = Number(localStorage.getItem("ff_volume") || "40");

  return {
    auth: {
      user: null,
      loading: true
    },
    route: {
      view: "landing"
    },
    ui: {
      theme: savedTheme,
      notificationsEnabled,
      profileOpen: false,
      roomBoard: "global",
      sections: {
        progress: true,
        history: true,
        leaderboard: true,
        calendar: false
      },
      quote: QUOTES[0],
      toasts: [],
      distractionModal: null,
      badgeModal: null,
      banner: "",
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches
    },
    timer: {
      selectedDuration,
      totalTime: selectedDuration,
      timeLeft: selectedDuration,
      running: false,
      sessionMode: "normal",
      pomodoroEnabled: false,
      pomodoroPhase: "work",
      pomodoroCycle: 0,
      cumulativeFocusSeconds: 0,
      phaseStartedAt: null,
      phaseInitialTime: selectedDuration,
      distractionCount: 0,
      distractionPenaltyTotal: 0,
      distractionLog: [],
      blurStartedAt: null,
      lastActivityAt: Date.now()
    },
    session: {
      focusGoal: "",
      customMinutes: "",
      lastResult: null,
      saveState: "idle"
    },
    room: {
      mode: roomId ? "room" : "solo",
      currentRoomId: roomId,
      draftRoomId: roomId,
      participants: []
    },
    stats: createEmptyStats(),
    history: [],
    leaderboards: {
      landing: [],
      global: [],
      room: []
    },
    publicStats: {
      totalMinutes: 0,
      totalSessions: 0,
      totalUsers: 0
    },
    audio: {
      selectedCategory: savedSound,
      volume: Math.max(0, Math.min(savedVolume, 100)),
      playing: false,
      trackLabel: ""
    }
  };
}
