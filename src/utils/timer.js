export function getPreciseTimeLeft(startedAt, initialSeconds) {
  if (!startedAt) {
    return initialSeconds;
  }

  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  return Math.max(0, initialSeconds - elapsed);
}

export function getPomodoroPhaseConfig(phase) {
  if (phase === "break") {
    return { phase: "break", totalTime: 5 * 60, label: "Break" };
  }

  return { phase: "work", totalTime: 25 * 60, label: "Work" };
}

export function getNextPomodoroPhase(currentPhase, currentCycle) {
  if (currentPhase === "work") {
    return {
      phase: "break",
      cycle: currentCycle + 1,
      totalTime: 5 * 60,
      label: `Break ${currentCycle + 1}`
    };
  }

  return {
    phase: "work",
    cycle: currentCycle,
    totalTime: 25 * 60,
    label: `Work ${currentCycle}`
  };
}

export function buildDocumentTitle({ running, timeLeft }) {
  if (!running) {
    return "FocusFlow | Deep work that feels intentional";
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")} | FocusFlow`;
}
