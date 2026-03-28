import { beforeEach, describe, expect, it } from "vitest";
import { OWNER_UID } from "../src/utils/constants.js";
import { createRenderer } from "../src/ui/render.js";

function makeClassList() {
  const set = new Set();
  return {
    add: (...items) => items.forEach((item) => set.add(item)),
    remove: (...items) => items.forEach((item) => set.delete(item)),
    toggle: (item, force) => {
      if (force === undefined) {
        if (set.has(item)) {
          set.delete(item);
          return false;
        }
        set.add(item);
        return true;
      }
      if (force) {
        set.add(item);
      } else {
        set.delete(item);
      }
      return force;
    },
    contains: (item) => set.has(item)
  };
}

function makeEl() {
  return {
    hidden: false,
    textContent: "",
    innerHTML: "",
    value: "",
    disabled: false,
    className: "",
    dataset: {},
    style: { setProperty(name, value) { this[name] = value; } },
    classList: makeClassList(),
    setAttribute(name, value) {
      this[name] = value;
    }
  };
}

function createRefs() {
  const refs = {
    root: { querySelectorAll: () => [] },
    loader: makeEl(),
    toastStack: makeEl(),
    landingLoggedOut: makeEl(),
    landingLoggedIn: makeEl(),
    landingSignInButton: makeEl(),
    landingAccountToolbar: makeEl(),
    landingStreakBadge: makeEl(),
    landingStreakValue: makeEl(),
    publicMinutesMetric: makeEl(),
    publicSessionMetric: makeEl(),
    publicUserMetric: makeEl(),
    landingLeaderboard: makeEl(),
    landingUserAvatar: makeEl(),
    landingHeroAvatar: makeEl(),
    profilePanelAvatar: makeEl(),
    landingProfileButton: makeEl(),
    landingUserName: makeEl(),
    landingHeroTitle: makeEl(),
    profilePanelName: makeEl(),
    profilePanelEmail: makeEl(),
    landingGoalProgress: makeEl(),
    landingGoalFill: makeEl(),
    landingTodayMinutes: makeEl(),
    landingSessionCount: makeEl(),
    landingLevelName: makeEl(),
    landingTotalScore: makeEl(),
    landingMemberMessage: makeEl(),
    mainApp: makeEl(),
    landingPage: makeEl(),
    ownerDashButton: makeEl(),
    profileAvatar: makeEl(),
    profileButton: makeEl(),
    profileButtonName: makeEl(),
    profilePanel: makeEl(),
    profileMenuProfileButton: makeEl(),
    profileMenuSettingsButton: makeEl(),
    profileOverviewSection: makeEl(),
    profileSettingsSection: makeEl(),
    workspaceStreakValue: makeEl(),
    workspaceStreakBadge: makeEl(),
    roomModeCountBadge: makeEl(),
    timerValue: makeEl(),
    timerPercentLabel: makeEl(),
    timerPhaseLabel: makeEl(),
    timerProgress: makeEl(),
    timerRing: makeEl(),
    startButton: makeEl(),
    stopButton: makeEl(),
    scorePenaltyLabel: makeEl(),
    sessionModeDescription: makeEl(),
    pomodoroButton: makeEl(),
    roomPanel: makeEl(),
    roomCodeInput: makeEl(),
    roomJoinInput: makeEl(),
    activeRoomLabel: makeEl(),
    activeRoomCodeLabel: makeEl(),
    roomPresenceCount: makeEl(),
    roomOwnerLabel: makeEl(),
    roomSyncLabel: makeEl(),
    roomPresenceList: makeEl(),
    ambientTrackLabel: makeEl(),
    volumeInput: makeEl(),
    dailyGoalLabel: makeEl(),
    dailyGoalFill: makeEl(),
    statsStreakValue: makeEl(),
    statsSessionValue: makeEl(),
    statsHoursValue: makeEl(),
    statsLevelValue: makeEl(),
    xpCurrentLabel: makeEl(),
    xpNextLabel: makeEl(),
    xpFill: makeEl(),
    badgeCountLabel: makeEl(),
    badgeList: makeEl(),
    calendarToggleLabel: makeEl(),
    calendarMetaLabel: makeEl(),
    calendarMonthLabel: makeEl(),
    calendarNextButton: makeEl(),
    calendarLongestLabel: makeEl(),
    calendarMonthDaysLabel: makeEl(),
    calendarGrid: makeEl(),
    weekChart: makeEl(),
    weekConsistencyLabel: makeEl(),
    profilePanelLevel: makeEl(),
    profilePanelStreak: makeEl(),
    profilePanelSessions: makeEl(),
    profilePanelHours: makeEl(),
    profilePanelScore: makeEl(),
    historyList: makeEl(),
    globalLeaderboard: makeEl(),
    roomLeaderboard: makeEl(),
    sessionSummary: makeEl(),
    progressSection: makeEl(),
    historySection: makeEl(),
    leaderboardSection: makeEl(),
    calendarSection: makeEl(),
    workspaceBanner: makeEl(),
    distractionModal: makeEl(),
    distractionModalText: makeEl(),
    badgeModal: makeEl(),
    badgeModalTitle: makeEl(),
    badgeModalText: makeEl(),
    ownerDashboard: makeEl(),
    ownerRoomSelect: makeEl(),
    odTotalParticipants: makeEl(),
    odFocusingCount: makeEl(),
    odDistractedCount: makeEl(),
    odLeftCount: makeEl(),
    odParticipants: makeEl(),
    odEventLog: makeEl(),
    themeButtonLabel: makeEl(),
    landingThemeButtonLabel: makeEl(),
    themeToggleButton: makeEl(),
    landingThemeToggleButton: makeEl(),
    profileThemeLabel: makeEl(),
    notificationLabel: makeEl(),
    quoteBar: makeEl(),
    sessionModeButtons: [makeEl(), makeEl(), makeEl()],
    modeButtons: [makeEl(), makeEl()],
    durationButtons: [makeEl(), makeEl()],
    soundButtons: [makeEl(), makeEl()],
    boardButtons: [makeEl(), makeEl()]
  };

  refs.sessionModeButtons[0].dataset.sessionMode = "normal";
  refs.sessionModeButtons[1].dataset.sessionMode = "deep";
  refs.sessionModeButtons[2].dataset.sessionMode = "sprint";
  refs.modeButtons[0].dataset.mode = "solo";
  refs.modeButtons[1].dataset.mode = "room";
  refs.durationButtons[0].dataset.duration = "1500";
  refs.durationButtons[1].dataset.duration = "3000";
  refs.soundButtons[0].dataset.sound = "lofi";
  refs.soundButtons[1].dataset.sound = "rain";
  refs.boardButtons[0].dataset.board = "global";
  refs.boardButtons[1].dataset.board = "room";
  return refs;
}

function createState(overrides = {}) {
  return {
    auth: { user: null, loading: false },
    route: { view: "landing" },
    publicStats: { totalMinutes: 125, totalSessions: 6, totalUsers: 2 },
    leaderboards: { landing: [], global: [], room: [] },
    stats: {
      totalMinutes: 120,
      totalSessions: 4,
      totalScore: 300,
      streak: 2,
      longestStreak: 5,
      weekData: [0, 25, 0, 60, 15, 0, 0],
      todayMinutes: 25,
      badges: [],
      activityDays: []
    },
    ui: {
      theme: "dark",
      notificationsEnabled: true,
      profileOpen: false,
      profileSection: "profile",
      roomBoard: "global",
      sections: { progress: true, history: true, leaderboard: true, calendar: true },
      quote: "Stay focused",
      toasts: [],
      distractionModal: null,
      badgeModal: null,
      banner: null,
      highlightedBadgeId: "",
      focusPulse: false,
      expandedHistoryIds: [],
      ownerDashboardOpen: false,
      ownerNow: Date.now(),
      calendarViewMonth: "2026-03"
    },
    timer: {
      totalTime: 1500,
      timeLeft: 900,
      running: false,
      pomodoroEnabled: false,
      pomodoroPhase: "work",
      sessionMode: "normal",
      selectedDuration: 1500
    },
    room: {
      mode: "solo",
      currentRoomId: "",
      currentRoomName: "",
      draftRoomName: "",
      joinCode: "",
      activeCount: 0,
      ownerUid: "",
      ownerName: "",
      sessionControl: null,
      participants: []
    },
    history: [],
    session: { lastResult: null, saveState: "idle" },
    audio: { trackLabel: "", volume: 40, selectedCategory: "" },
    owner: {
      rooms: [],
      selectedRoomId: "",
      summary: { total: 0, focusing: 0, distracted: 0, left: 0 },
      participants: [],
      eventLog: []
    },
    ...overrides
  };
}

describe("renderer behavior", () => {
  beforeEach(() => {
    global.document = { body: { dataset: {} }, title: "" };
  });

  it("shows owner controls only for OWNER_UID", () => {
    const refs = createRefs();
    const render = createRenderer(refs);

    render(createState({ auth: { user: { uid: "user-1", displayName: "Ada" }, loading: false }, route: { view: "app" } }));
    expect(refs.ownerDashButton.hidden).toBe(true);
    expect(refs.ownerDashboard.hidden).toBe(true);

    render(createState({
      auth: { user: { uid: OWNER_UID, displayName: "Owner" }, loading: false },
      route: { view: "app" },
      ui: { ...createState().ui, ownerDashboardOpen: true, profileOpen: true, profileSection: "settings", sections: { progress: true, history: true, leaderboard: true, calendar: true } }
    }));

    expect(refs.ownerDashButton.hidden).toBe(false);
    expect(refs.ownerDashboard.hidden).toBe(false);
    expect(refs.profilePanel.hidden).toBe(false);
    expect(refs.profileSettingsSection.hidden).toBe(false);
  });

  it("renders month cells with done, missed, and today states", () => {
    const refs = createRefs();
    const render = createRenderer(refs);
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const todayIso = `${year}-${month}-${day}`;
    const missedDate = new Date(today);
    missedDate.setDate(today.getDate() - 1);
    const doneDate = new Date(today);
    doneDate.setDate(today.getDate() - 2);
    const doneIso = `${doneDate.getFullYear()}-${String(doneDate.getMonth() + 1).padStart(2, "0")}-${String(doneDate.getDate()).padStart(2, "0")}`;
    const missedIso = `${missedDate.getFullYear()}-${String(missedDate.getMonth() + 1).padStart(2, "0")}-${String(missedDate.getDate()).padStart(2, "0")}`;

    render(createState({
      auth: { user: { uid: "user-1", displayName: "Ada" }, loading: false },
      route: { view: "app" },
      ui: { ...createState().ui, calendarViewMonth: `${year}-${month}` },
      stats: { ...createState().stats, activityDays: [doneIso, todayIso] }
    }));

    expect(refs.calendarGrid.innerHTML).toContain("is-done");
    expect(refs.calendarGrid.innerHTML).toContain("is-missed");
    expect(refs.calendarGrid.innerHTML).toContain("is-today");
    expect(refs.calendarGrid.innerHTML).toContain(doneIso ? "&check;" : "");
    expect(refs.calendarGrid.innerHTML).toContain(missedIso.slice(-2));
  });

  it("renders history and both leaderboard views without crashing", () => {
    const refs = createRefs();
    const render = createRenderer(refs);

    render(createState({
      auth: { user: { uid: "user-1", displayName: "Ada" }, loading: false },
      route: { view: "app" },
      ui: { ...createState().ui, roomBoard: "room" },
      history: [{ id: "h1", goal: "Ship mobile UI", dateLabel: "Mar 26, 2026", timeSpent: 1500, distractions: 1, score: 120, penaltyTotal: 20, sessionMode: "deep" }],
      room: { ...createState().room, currentRoomId: "TEST123" },
      leaderboards: {
        landing: [],
        global: [{ id: "user-1", rank: 1, name: "Ada", score: 300 }],
        room: [{ uid: "user-1", rank: 1, name: "Ada", score: 180 }]
      }
    }));

    expect(refs.historyList.innerHTML).toContain("Ship mobile UI");
    expect(refs.globalLeaderboard.innerHTML).toContain("Ada");
    expect(refs.roomLeaderboard.innerHTML).toContain("Ada");
    expect(refs.roomLeaderboard.hidden).toBe(false);
  });
});

