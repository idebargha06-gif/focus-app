import { IDLE_THRESHOLD_MS, SESSION_MODES, TIMER_TICK_MS } from "../../utils/constants.js";
import { calculateDistractionPenalty } from "../../utils/scoring.js";
import { getNextPomodoroPhase, getPomodoroPhaseConfig, getPreciseTimeLeft } from "../../utils/timer.js";

export function createTimerController({ store, feedback }) {
  let tickId = null;
  let idleId = null;
  const handlers = {
    onToggleSession: null,
    onEscape: null,
    onSessionFinished: null
  };

  function setHandlers(nextHandlers) {
    Object.assign(handlers, nextHandlers);
  }

  function stopIntervals() {
    if (tickId) {
      window.clearInterval(tickId);
      tickId = null;
    }
    if (idleId) {
      window.clearInterval(idleId);
      idleId = null;
    }
  }

  function beginTicker() {
    stopIntervals();

    tickId = window.setInterval(() => {
      const state = store.getState();
      if (!state.timer.running) {
        return;
      }

      const nextTimeLeft = getPreciseTimeLeft(state.timer.phaseStartedAt, state.timer.phaseInitialTime);
      store.setState((current) => ({
        ...current,
        timer: {
          ...current.timer,
          timeLeft: nextTimeLeft
        }
      }));

      if (nextTimeLeft <= 0) {
        if (state.timer.pomodoroEnabled) {
          const nextPhase = getNextPomodoroPhase(state.timer.pomodoroPhase, state.timer.pomodoroCycle);
          const focusCarry = state.timer.pomodoroPhase === "work"
            ? state.timer.cumulativeFocusSeconds + state.timer.phaseInitialTime
            : state.timer.cumulativeFocusSeconds;

          store.setState((current) => ({
            ...current,
            timer: {
              ...current.timer,
              cumulativeFocusSeconds: focusCarry,
              pomodoroPhase: nextPhase.phase,
              pomodoroCycle: nextPhase.cycle,
              totalTime: nextPhase.totalTime,
              timeLeft: nextPhase.totalTime,
              phaseStartedAt: Date.now(),
              phaseInitialTime: nextPhase.totalTime
            }
          }));
          return;
        }

        stopRuntime();
        handlers.onSessionFinished?.(true);
      }
    }, TIMER_TICK_MS);

    idleId = window.setInterval(() => {
      const state = store.getState();
      if (!state.timer.running) {
        return;
      }

      if (Date.now() - state.timer.lastActivityAt > IDLE_THRESHOLD_MS) {
        recordDistraction("Idle", 300);
        store.setState((current) => ({
          ...current,
          timer: {
            ...current.timer,
            lastActivityAt: Date.now()
          }
        }));
      }
    }, 30000);
  }

  function setDuration(seconds) {
    const state = store.getState();
    if (state.timer.running) {
      return;
    }

    store.setState((current) => ({
      ...current,
      timer: {
        ...current.timer,
        selectedDuration: seconds,
        totalTime: seconds,
        timeLeft: seconds,
        phaseStartedAt: null,
        phaseInitialTime: seconds,
        pomodoroEnabled: false,
        pomodoroPhase: "work",
        pomodoroCycle: 0,
        cumulativeFocusSeconds: 0
      }
    }));
  }

  function applyCustomMinutes(minutes) {
    const safeMinutes = Number(minutes);
    if (!safeMinutes || safeMinutes < 1) {
      return false;
    }

    setDuration(safeMinutes * 60);
    return true;
  }

  function togglePomodoro() {
    const state = store.getState();
    if (state.timer.running) {
      return;
    }

    if (state.timer.pomodoroEnabled) {
      setDuration(state.timer.selectedDuration);
      return;
    }

    const workConfig = getPomodoroPhaseConfig("work");
    store.setState((current) => ({
      ...current,
      timer: {
        ...current.timer,
        pomodoroEnabled: true,
        pomodoroPhase: workConfig.phase,
        pomodoroCycle: 0,
        cumulativeFocusSeconds: 0,
        totalTime: workConfig.totalTime,
        timeLeft: workConfig.totalTime,
        phaseInitialTime: workConfig.totalTime,
        phaseStartedAt: null
      }
    }));
  }

  function start() {
    const state = store.getState();
    if (state.timer.running) {
      return;
    }

    store.setState((current) => ({
      ...current,
      timer: {
        ...current.timer,
        running: true,
        phaseStartedAt: Date.now(),
        phaseInitialTime: current.timer.timeLeft,
        distractionCount: 0,
        distractionPenaltyTotal: 0,
        distractionLog: [],
        blurStartedAt: null,
        lastActivityAt: Date.now(),
        cumulativeFocusSeconds: current.timer.pomodoroEnabled ? 0 : current.timer.cumulativeFocusSeconds
      }
    }));
    beginTicker();
  }

  function stopRuntime() {
    stopIntervals();
    store.setState((state) => ({
      ...state,
      timer: {
        ...state.timer,
        running: false,
        blurStartedAt: null
      }
    }));
  }

  function reset() {
    stopIntervals();
    store.setState((state) => ({
      ...state,
      timer: {
        ...state.timer,
        running: false,
        totalTime: state.timer.selectedDuration,
        timeLeft: state.timer.selectedDuration,
        phaseStartedAt: null,
        phaseInitialTime: state.timer.selectedDuration,
        distractionCount: 0,
        distractionPenaltyTotal: 0,
        distractionLog: [],
        blurStartedAt: null,
        pomodoroEnabled: false,
        pomodoroPhase: "work",
        pomodoroCycle: 0,
        cumulativeFocusSeconds: 0
      }
    }));
  }

  function recordDistraction(reason, awaySeconds = 0) {
    const state = store.getState();
    if (!state.timer.running) {
      return;
    }

    const recentCount = state.timer.distractionLog.filter((entry) => entry.recordedAt > Date.now() - 60000).length + 1;
    const penalty = calculateDistractionPenalty(state.timer.sessionMode, awaySeconds, recentCount);

    store.setState((current) => ({
      ...current,
      timer: {
        ...current.timer,
        distractionCount: current.timer.distractionCount + 1,
        distractionPenaltyTotal: current.timer.distractionPenaltyTotal + penalty,
        distractionLog: [
          ...current.timer.distractionLog,
          {
            reason,
            duration: awaySeconds,
            penalty,
            recordedAt: Date.now()
          }
        ]
      }
    }));
  }

  function bindAttentionTracking() {
    const markActive = () => {
      store.setState((state) => ({
        ...state,
        timer: {
          ...state.timer,
          lastActivityAt: Date.now()
        }
      }));
    };

    ["mousemove", "keydown", "touchstart", "pointerdown"].forEach((eventName) => {
      window.addEventListener(eventName, markActive);
    });

    window.addEventListener("blur", () => {
      const state = store.getState();
      if (!state.timer.running || state.timer.blurStartedAt) {
        return;
      }

      recordDistraction("Window change", 0);
      store.setState((current) => ({
        ...current,
        timer: {
          ...current.timer,
          blurStartedAt: Date.now()
        }
      }));
    });

    window.addEventListener("focus", () => {
      const state = store.getState();
      if (!state.timer.running || !state.timer.blurStartedAt) {
        return;
      }

      const awaySeconds = Math.round((Date.now() - state.timer.blurStartedAt) / 1000);
      store.setState((current) => ({
        ...current,
        timer: {
          ...current.timer,
          blurStartedAt: null
        }
      }));

      if (awaySeconds >= 10) {
        feedback.showDistractionModal(`You were away for ${awaySeconds} seconds.`);
      }
    });

    document.addEventListener("visibilitychange", () => {
      const state = store.getState();
      if (!state.timer.running) {
        return;
      }

      if (document.hidden) {
        if (!state.timer.blurStartedAt) {
          recordDistraction("Tab hidden", 0);
          store.setState((current) => ({
            ...current,
            timer: {
              ...current.timer,
              blurStartedAt: Date.now()
            }
          }));
        }
        return;
      }

      if (state.timer.blurStartedAt) {
        const awaySeconds = Math.round((Date.now() - state.timer.blurStartedAt) / 1000);
        store.setState((current) => ({
          ...current,
          timer: {
            ...current.timer,
            blurStartedAt: null
          }
        }));

        if (awaySeconds >= 10) {
          feedback.showDistractionModal(`You were away for ${awaySeconds} seconds.`);
        }
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(event.target.tagName)) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        handlers.onToggleSession?.();
      }

      if (event.code === "Escape") {
        handlers.onEscape?.();
      }

      if (event.code === "KeyR" && !store.getState().timer.running) {
        reset();
      }
    });
  }

  function setSessionMode(mode) {
    if (!SESSION_MODES[mode] || store.getState().timer.running) {
      return;
    }

    store.setState((state) => ({
      ...state,
      timer: {
        ...state.timer,
        sessionMode: mode
      }
    }));
  }

  function getFocusedSeconds() {
    const state = store.getState();
    const liveFocused = state.timer.running && (!state.timer.pomodoroEnabled || state.timer.pomodoroPhase === "work")
      ? state.timer.phaseInitialTime - state.timer.timeLeft
      : 0;
    return Math.max(0, state.timer.cumulativeFocusSeconds + liveFocused);
  }

  function getSessionDiagnostics() {
    const state = store.getState();
    return {
      timeSpent: getFocusedSeconds(),
      distractions: state.timer.distractionCount,
      penaltyTotal: state.timer.distractionPenaltyTotal,
      distractionLog: state.timer.distractionLog.map((entry) => ({
        ...entry
      })),
      sessionMode: state.timer.sessionMode
    };
  }

  return {
    setHandlers,
    bindAttentionTracking,
    setDuration,
    applyCustomMinutes,
    togglePomodoro,
    start,
    stopRuntime,
    reset,
    setSessionMode,
    getSessionDiagnostics
  };
}
