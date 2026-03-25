import { checkBadges } from "../../utils/scoring.js";

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
      }
    }));
  }

  async function startSession() {
    const state = store.getState();

    if (!state.auth.user) {
      feedback.notify({
        type: "warning",
        title: "Sign in required",
        message: "Use Google sign-in before starting a tracked session."
      });
      return;
    }

    if (!state.timer.timeLeft || state.timer.timeLeft <= 0) {
      feedback.notify({
        type: "warning",
        title: "Choose a duration",
        message: "Select a duration or custom minute count before starting."
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

    resetSummaryState();
    timer.start();
    audio.handleSessionStart();
    feedback.setBanner("Session in progress. Stay with the work.");
    await rooms.startPresence();
  }

  async function finalizeSession(completed = false) {
    const state = store.getState();
    if (!state.timer.running && !state.session.lastResult && !completed) {
      return;
    }

    timer.stopRuntime();
    audio.handleSessionStop();
    feedback.setBanner("");

    const diagnostics = timer.getSessionDiagnostics();
    const result = {
      ...diagnostics,
      completed,
      goal: store.getState().session.focusGoal || "Untitled session",
      score: Math.max(0, diagnostics.timeSpent - diagnostics.penaltyTotal)
    };

    if (state.ui.notificationsEnabled && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("FocusFlow session ready", {
          body: `${result.score} points earned in ${Math.floor(result.timeSpent / 60)}m ${result.timeSpent % 60}s.`
        });
      } catch (error) {
        // Ignore notification issues.
      }
    }

    store.setState((current) => ({
      ...current,
      session: {
        ...current.session,
        lastResult: result,
        saveState: "saving"
      }
    }));

    if (!state.auth.user) {
      store.setState((current) => ({
        ...current,
        session: {
          ...current.session,
          saveState: "idle"
        }
      }));
      return;
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

  async function shareLastSession() {
    const result = store.getState().session.lastResult;
    if (!result) {
      return;
    }

    const text = [
      "FocusFlow",
      `Goal: ${store.getState().session.focusGoal || "Deep work"}`,
      `Time: ${Math.floor(result.timeSpent / 60)}m ${result.timeSpent % 60}s`,
      `Distractions: ${result.distractions}`,
      `Score: ${result.score} pts`
    ].join("\n");

    try {
      if (navigator.share) {
        await navigator.share({
          title: "FocusFlow session",
          text
        });
      } else {
        await navigator.clipboard.writeText(text);
        feedback.notify({
          type: "success",
          title: "Summary copied",
          message: "The session summary was copied to your clipboard."
        });
      }
    } catch (error) {
      feedback.notify({
        type: "warning",
        title: "Share cancelled",
        message: "No summary was shared."
      });
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
    shareLastSession,
    toggleStartStop
  };
}
