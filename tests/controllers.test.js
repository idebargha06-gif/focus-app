import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAudioController } from "../src/features/audio/controller.js";
import { createAuthController } from "../src/features/auth/controller.js";
import { createProfileController } from "../src/features/profile/controller.js";
import { createRoomsController } from "../src/features/rooms/controller.js";
import { createSessionsController } from "../src/features/sessions/controller.js";
import { createTimerController } from "../src/features/timer/controller.js";

function createStore(initialState) {
  let state = initialState;
  return {
    getState: () => state,
    setState(update) {
      state = typeof update === "function" ? update(state) : update;
      return state;
    }
  };
}

describe("controller behavior", () => {
  beforeEach(() => {
    global.localStorage = {
      data: new Map(),
      getItem(key) { return this.data.has(key) ? this.data.get(key) : null; },
      setItem(key, value) { this.data.set(key, String(value)); }
    };
    Object.defineProperty(globalThis, "navigator", { value: { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } }, configurable: true });
    global.Notification = { permission: "denied", requestPermission: vi.fn().mockResolvedValue("denied") };
    global.Audio = class {
      constructor() {
        this.volume = 0.4;
        this.onended = null;
        this.onerror = null;
      }
      play() { return Promise.resolve(); }
      pause() {}
    };
    global.window = {
      location: { href: "https://focusflow.local/?room=test123", search: "?room=test123" },
      history: { replaceState: vi.fn() },
      setInterval: vi.fn(() => 1),
      clearInterval: vi.fn(),
      setTimeout: vi.fn((fn) => { fn(); return 1; }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      AudioContext: class {
        createOscillator() { return { connect() {}, frequency: { value: 0 }, type: "sine", start() {}, stop() {} }; }
        createGain() { return { connect() {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } }; }
        get destination() { return {}; }
        get currentTime() { return 0; }
      }
    };
    global.document = { hidden: false, addEventListener: vi.fn() };
  });

  it("supports setTime and togglePomodoro behavior", () => {
    const store = createStore({
      timer: {
        selectedDuration: 1500,
        totalTime: 1500,
        timeLeft: 1500,
        running: false,
        sessionMode: "normal",
        pomodoroEnabled: false,
        pomodoroPhase: "work",
        pomodoroCycle: 0,
        cumulativeFocusSeconds: 0,
        phaseStartedAt: null,
        phaseInitialTime: 1500,
        distractionCount: 0,
        distractionPenaltyTotal: 0,
        distractionLog: [],
        blurStartedAt: null,
        lastActivityAt: Date.now(),
        distractionHandled: false
      }
    });
    const timer = createTimerController({ store, feedback: { showDistractionModal: vi.fn() } });

    timer.setDuration(600);
    expect(store.getState().timer.selectedDuration).toBe(600);

    timer.togglePomodoro();
    expect(store.getState().timer.pomodoroEnabled).toBe(true);
    expect(store.getState().timer.timeLeft).toBeGreaterThan(0);
  });

  it("supports toggleSound selection", () => {
    const feedback = { notify: vi.fn() };
    const store = createStore({ audio: { selectedCategory: "", volume: 40, playing: false, trackLabel: "" }, timer: { running: false } });
    const audio = createAudioController({ store, feedback });

    audio.toggleCategory("rain");
    expect(store.getState().audio.selectedCategory).toBe("rain");
    expect(feedback.notify).toHaveBeenCalled();

    audio.toggleCategory("rain");
    expect(store.getState().audio.selectedCategory).toBe("");
  });

  it("supports room mode changes and URL room joining", async () => {
    const store = createStore({
      auth: { user: { uid: "user-1", displayName: "Ada" } },
      timer: { running: false },
      room: { mode: "solo", currentRoomId: "", draftRoomName: "", joinCode: "", participants: [], activeCount: 0, ownerUid: "", ownerName: "", sessionControl: null, syncRevision: 0 },
      ui: { roomBoard: "global" }
    });
    const repository = {
      ensureRoom: vi.fn().mockResolvedValue({ ownerUid: "user-1", ownerName: "Ada", sessionControl: null }),
      subscribeRoom: vi.fn(() => () => {}),
      upsertRoomPresence: vi.fn().mockResolvedValue(undefined),
      touchActiveRoom: vi.fn().mockResolvedValue(undefined),
      subscribeRoomPresence: vi.fn(() => () => {}),
      subscribeOwnerRoomPresence: vi.fn(() => () => {}),
      getRoom: vi.fn().mockResolvedValue(null),
      updateRoomPresence: vi.fn().mockResolvedValue(undefined),
      removeRoomPresence: vi.fn().mockResolvedValue(undefined)
    };
    const rooms = createRoomsController({ store, repository, feedback: { notify: vi.fn(), setBanner: vi.fn() }, leaderboards: { startRoom: vi.fn() } });

    await rooms.setMode("room");
    expect(store.getState().room.mode).toBe("room");

    await rooms.hydrateFromUrl();
    expect(store.getState().room.currentRoomId).toBe("TEST123");
  });

  it("supports startSession and stopSession", async () => {
    const store = createStore({
      auth: { user: { uid: "user-1", displayName: "Ada" } },
      timer: { selectedDuration: 1500, running: true },
      room: { mode: "solo", currentRoomId: "", currentRoomName: "", ownerUid: "", ownerName: "" },
      session: { focusGoal: "Write tests", lastResult: null, saveState: "idle" },
      ui: { notificationsEnabled: false, quote: "", highlightedBadgeId: "" },
      stats: { badges: [] }
    });
    const timer = {
      start: vi.fn(),
      stopRuntime: vi.fn(),
      clearAfterSession: vi.fn(),
      syncRemoteTimer: vi.fn(),
      getSessionDiagnostics: vi.fn(() => ({ timeSpent: 1200, distractions: 1, penaltyTotal: 20, distractionLog: [], sessionMode: "normal" }))
    };
    const sessions = createSessionsController({
      store,
      repository: { saveSession: vi.fn().mockResolvedValue({ stats: { badges: [], totalMinutes: 20, totalSessions: 1, totalScore: 100, streak: 1, longestStreak: 1, weekData: [0,0,0,0,0,0,0], todayMinutes: 20 }, history: [] }) },
      timer,
      stats: {},
      rooms: { startPresence: vi.fn().mockResolvedValue(undefined), updatePresence: vi.fn().mockResolvedValue(undefined), publishTimerStart: vi.fn(), publishTimerStop: vi.fn() },
      leaderboards: { refreshPublicStats: vi.fn().mockResolvedValue(undefined), startRoom: vi.fn() },
      audio: { handleSessionStart: vi.fn(), handleSessionStop: vi.fn(), playBell: vi.fn() },
      feedback: { notify: vi.fn(), setBanner: vi.fn(), showBadgeModal: vi.fn() }
    });

    store.setState((state) => ({ ...state, timer: { ...state.timer, running: false } }));
    await sessions.startSession();
    expect(timer.start).toHaveBeenCalled();

    store.setState((state) => ({ ...state, timer: { ...state.timer, running: true } }));
    await sessions.stopSession();
    expect(timer.stopRuntime).toHaveBeenCalled();
    expect(store.getState().session.lastResult?.goal).toBe("Write tests");
  });

  it("supports doSignOut equivalent behavior", async () => {
    const rooms = { stopPresence: vi.fn().mockResolvedValue(undefined), hydrateFromUrl: vi.fn() };
    const repository = { signOutUser: vi.fn().mockResolvedValue(undefined), subscribeAuth: vi.fn(() => () => {}) };
    const store = createStore({ timer: { running: false }, ui: {}, room: {}, stats: {}, leaderboards: {} });
    const auth = createAuthController({
      store,
      repository,
      stats: { refreshWorkspace: vi.fn() },
      leaderboards: { startGlobal: vi.fn(), refreshPublicStats: vi.fn().mockResolvedValue(undefined) },
      rooms,
      profile: { closeProfile: vi.fn() },
      feedback: { notify: vi.fn() }
    });

    await auth.signOut();
    expect(rooms.stopPresence).toHaveBeenCalled();
    expect(repository.signOutUser).toHaveBeenCalled();
  });

  it("keeps profile menu section switching reliable", () => {
    const store = createStore({ ui: { profileOpen: false, profileSection: "profile", notificationsEnabled: true, theme: "dark" } });
    const profile = createProfileController({ store });

    profile.toggleProfile("profile");
    expect(store.getState().ui.profileOpen).toBe(true);

    profile.openProfile("settings");
    expect(store.getState().ui.profileSection).toBe("settings");
    expect(store.getState().ui.profileOpen).toBe(true);
  });
});

