import { DAILY_GOAL_MINUTES, DEFAULT_DURATIONS, getRandomQuote } from "../utils/constants.js";
import { getMonthKey } from "../utils/date.js";
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
      quote: getRandomQuote(),
      toasts: [],
      distractionModal: null,
      badgeModal: null,
      banner: null,
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      calendarViewMonth: getMonthKey(),
      highlightedBadgeId: "",
      focusPulse: false,
      expandedHistoryIds: [],
      ownerDashboardOpen: false,
      ownerNow: Date.now()
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
      lastActivityAt: Date.now(),
      distractionHandled: false
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
      draftRoomName: "",
      joinCode: "",
      currentRoomName: "",
      participants: [],
      activeCount: 0,
      ownerUid: "",
      ownerName: "",
      sessionControl: null,
      syncRevision: 0
    },
    stats: createEmptyStats(),
    history: [],
    leaderboards: {
      landing: [],
      global: [],
      room: []
    },
    owner: {
      rooms: [],
      selectedRoomId: "",
      participants: [],
      eventLog: [],
      summary: {
        total: 0,
        focusing: 0,
        distracted: 0,
        left: 0
      }
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

