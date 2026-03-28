import { getRandomQuote } from "../../utils/constants.js";
import { calculateFocusPercentage, checkBadges, calculateSessionScore } from "../../utils/scoring.js";

export function createSessionsController({
  store,
  repository,
  timer,
  stats,
  rooms,
  leaderboards,
  audio,
  feedback
}) {
  function resetSummaryState() {
    store.setState((state) => ({
      ...state,
      session: {
        ...state.session,
        lastResult: null,
        saveState: "idle"
      },
      ui: {
        ...state.ui,
        highlightedBadgeId: ""
      }
    }));
  }

  function rotateQuote() {
    store.setState((state) => ({
      ...state,
      ui: {
        ...state.ui,
        quote: getRandomQuote(state.ui.quote)
      }
    }));
  }

  function pulseTimerRing() {
    store.setState((state) => ({
      ...state,
      ui: {
        ...state.ui,
        focusPulse: true
      }
    }));

    window.setTimeout(() => {
      store.setState((state) => ({
        ...state,
        ui: {
          ...state.ui,
          focusPulse: false
        }
      }));
    }, 700);
  }

  function setSummaryState(result, saveState = "saving") {
    store.setState((current) => ({
      ...current,
      session: {
        ...current.session,
        lastResult: result,
        saveState
      }
    }));
  }

  async function startSession(options = {}) {
    const state = store.getState();
    const isRemote = Boolean(options.remoteControl);

    if (!state.auth.user) {
      feedback.notify({
        type: "warning",
        title: "Sign in required",
        message: "Use Google sign-in before starting a tracked session."
      });
      return;
    }

    if (!isRemote && (!state.timer.selectedDuration || state.timer.selectedDuration <= 0)) {
      feedback.notify({
        type: "warning",
        title: "Choose a duration",
        message: "Select a duration or custom minute count before starting."
      });
      return;
    }

    if (state.room.mode === "room" && state.room.currentRoomId && state.room.ownerUid && state.room.ownerUid !== state.auth.user.uid && !isRemote) {
      feedback.notify({
        type: "warning",
        title: "Room owner controls this timer",
        message: `${state.room.ownerName || "The room owner"} starts and stops shared room sessions.`
      });
      return;
    }

    if (state.room.mode === "room" && !state.room.currentRoomId) {
      feedback.notify({
        type: "warning",
        title: "Room missing",
        message: "Join or create a room before starting a room session."
      });
      return;
    }

    if (options.remoteControl) {
      store.setState((current) => ({
        ...current,
        session: {
          ...current.session,
          focusGoal: options.remoteControl.focusGoal || current.session.focusGoal
        }
      }));
      timer.syncRemoteTimer(options.remoteControl);
    } else {
      timer.start();
    }

    const liveTimer = store.getState().timer;
    const startedAt = options.remoteControl?.startedAt || liveTimer.phaseStartedAt || Date.now();

    if (state.room.mode === "room" && state.room.currentRoomId && !options.remoteControl) {
      await rooms.publishTimerStart({
        startedAt,
        totalTime: liveTimer.totalTime,
        selectedDuration: liveTimer.selectedDuration,
        sessionMode: liveTimer.sessionMode,
        pomodoroEnabled: liveTimer.pomodoroEnabled,
        pomodoroPhase: liveTimer.pomodoroPhase,
        pomodoroCycle: liveTimer.pomodoroCycle,
        cumulativeFocusSeconds: liveTimer.cumulativeFocusSeconds,
        focusGoal: store.getState().session.focusGoal
      });
    }

    resetSummaryState();
    pulseTimerRing();
    audio.handleSessionStart();
    feedback.setBanner("Session in progress. Stay with the work.", "neutral");
    await rooms.startPresence();
    rooms.updatePresence({ focusing: true, sessionStarted: startedAt, distractedAt: 0, awayDuration: 0, distractionCount: 0, leftAt: 0, active: true }).catch(() => {});
  }

  async function finalizeSession(completed = false, options = {}) {
    const state = store.getState();
    if (!state.timer.running && !completed) {
      return;
    }

    const diagnostics = timer.getSessionDiagnostics();
    timer.stopRuntime();
    timer.clearAfterSession();
    audio.handleSessionStop();
    feedback.setBanner("");
    rooms.updatePresence({ focusing: false, distractedAt: 0, awayDuration: 0 }).catch(() => {});
    const result = {
      ...diagnostics,
      completed,
      goal: store.getState().session.focusGoal || "Untitled session",
      score: calculateSessionScore(diagnostics.timeSpent, diagnostics.penaltyTotal),
      focusPercentage: calculateFocusPercentage(diagnostics.timeSpent, diagnostics.penaltyTotal)
    };

    if (!result.timeSpent) {
      setSummaryState(null, "idle");
      return;
    }

    rotateQuote();

    if (state.ui.notificationsEnabled && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("FocusFlow session ready", {
          body: `${result.score} points earned in ${Math.floor(result.timeSpent / 60)}m ${result.timeSpent % 60}s.`
        });
      } catch (error) {
        // Ignore notification issues.
      }
    }

    setSummaryState(result, "saving");

    if (!state.auth.user) {
      setSummaryState(result, "idle");
      return;
    }

    if (state.room.mode === "room" && state.room.currentRoomId && state.room.ownerUid === state.auth.user.uid && !options.skipRoomSync) {
      await rooms.publishTimerStop({ completed, focusGoal: result.goal });
    }

    const previousBadges = new Set(store.getState().stats.badges);

    try {
      const workspace = await repository.saveSession({
        user: state.auth.user,
        roomId: state.room.mode === "room" ? state.room.currentRoomId : "",
        sessionResult: result
      });

      store.setState((current) => ({
        ...current,
        stats: {
          ...current.stats,
          ...workspace.stats
        },
        history: workspace.history,
        session: {
          ...current.session,
          saveState: "saved",
          lastResult: result
        }
      }));

      const nextBadges = checkBadges(workspace.stats);
      const unlocked = nextBadges.find((badge) => !previousBadges.has(badge));
      if (unlocked) {
        store.setState((current) => ({
          ...current,
          ui: {
            ...current.ui,
            highlightedBadgeId: unlocked
          }
        }));
        window.setTimeout(() => {
          store.setState((current) => ({
            ...current,
            ui: {
              ...current.ui,
              highlightedBadgeId: current.ui.highlightedBadgeId === unlocked ? "" : current.ui.highlightedBadgeId
            }
          }));
        }, 2200);
        feedback.showBadgeModal("New badge", `You unlocked ${unlocked.replaceAll("_", " ")}.`);
      }

      await leaderboards.refreshPublicStats();
      if (state.room.currentRoomId) {
        leaderboards.startRoom(state.room.currentRoomId);
      }

      feedback.notify({
        type: "success",
        title: "Session saved",
        message: `Focus result stored with ${result.score} points.`
      });
    } catch (error) {
      store.setState((current) => ({
        ...current,
        session: {
          ...current.session,
          saveState: "error",
          lastResult: result
        }
      }));

      feedback.notify({
        type: "error",
        title: "Save failed",
        message: "The session summary is still visible, but the backend write did not complete."
      });
    }
  }

  async function stopSession() {
    await finalizeSession(false);
  }

  async function handleTimerCompletion() {
    audio.playBell();
    await finalizeSession(true);
  }

  async function startRemoteSession(control) {
    await startSession({ remoteControl: control });
  }

  async function stopRemoteSession({ completed = false } = {}) {
    await finalizeSession(completed, { skipRoomSync: true });
  }

  async function shareLastSession() {
    const result = store.getState().session.lastResult;
    if (!result) {
      return;
    }

    const appUrl = window.location.origin;
    const text = [
      "FocusFlow",
      `Goal: ${store.getState().session.focusGoal || "Deep work"}`,
      `Time: ${Math.floor(result.timeSpent / 60)}m ${result.timeSpent % 60}s`,
      `Distractions: ${result.distractions}`,
      `Score: ${result.score} pts`,
      "",
      "Join me on FocusFlow and start your next clean focus session:",
      appUrl
    ].join("\n");

    try {
      if (navigator.share) {
        await navigator.share({
          title: "FocusFlow session",
          text,
          url: appUrl
        });
      } else {
        await navigator.clipboard.writeText(text);
        feedback.notify({
          type: "success",
          title: "Summary copied",
          message: "The session summary and app invite were copied to your clipboard."
        });
      }
    } catch (error) {
      feedback.notify({ type: "warning", title: "Share cancelled", message: "No summary was shared." });
    }
  }

  function toggleStartStop() {
    if (store.getState().timer.running) {
      stopSession();
      return;
    }

    startSession();
  }

  return {
    startSession,
    stopSession,
    handleTimerCompletion,
    startRemoteSession,
    stopRemoteSession,
    shareLastSession,
    toggleStartStop
  };
}

