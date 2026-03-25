import {
  APP_TITLE,
  CIRCLE_LENGTH,
  DAILY_GOAL_MINUTES,
  DAY_LABELS,
  FEEDBACK_POOLS,
  SESSION_MODES
} from "../utils/constants.js";
import { getLastTwentyEightDays } from "../utils/date.js";
import { escapeHtml, formatClock, formatCompactMinutes, formatHoursFromMinutes, getInitials, pluralize } from "../utils/format.js";
import { calculateFocusPercentage, getFeedbackBucket, getLevelInfo } from "../utils/scoring.js";

function setAvatar(node, user) {
  if (!node) {
    return;
  }

  const name = user?.displayName || user?.email || "User";
  node.textContent = getInitials(name);

  if (user?.photoURL) {
    node.style.backgroundImage = `url("${user.photoURL}")`;
    node.dataset.photo = "true";
  } else {
    node.style.backgroundImage = "";
    node.dataset.photo = "false";
  }
}

function renderToasts(toasts, refs) {
  refs.toastStack.innerHTML = toasts.map((toast) => `
    <article class="toast toast--${toast.type}">
      <div>
        <strong>${escapeHtml(toast.title)}</strong>
        <p>${escapeHtml(toast.message)}</p>
      </div>
      <button class="text-button" data-action="dismiss-toast" data-toast-id="${toast.id}" type="button">Dismiss</button>
    </article>
  `).join("");
}

function renderLanding(state, refs) {
  const isSignedIn = Boolean(state.auth.user);
  refs.landingLoggedOut.hidden = isSignedIn;
  refs.landingLoggedIn.hidden = !isSignedIn;
  refs.landingSignInButton.hidden = isSignedIn;
  refs.landingUserButton.hidden = !isSignedIn;
  refs.navAppButton.hidden = !isSignedIn;

  refs.publicMinutesMetric.textContent = formatCompactMinutes(state.publicStats.totalMinutes);
  refs.publicSessionMetric.textContent = formatCompactMinutes(state.publicStats.totalSessions);
  refs.publicUserMetric.textContent = formatCompactMinutes(state.publicStats.totalUsers);

  refs.landingLeaderboard.innerHTML = state.leaderboards.landing.length
    ? state.leaderboards.landing.map((entry) => `
      <li>
        <span>#${entry.rank}</span>
        <span>${escapeHtml(entry.name)}</span>
        <strong>${entry.score} pts</strong>
      </li>
    `).join("")
    : `<li class="board-list__empty">No public scores yet.</li>`;

  if (!isSignedIn) {
    return;
  }

  setAvatar(refs.landingUserAvatar, state.auth.user);
  refs.landingUserName.textContent = state.auth.user.displayName?.split(" ")[0] || "Workspace";
  const level = getLevelInfo(state.stats.totalMinutes);
  const goalPercent = Math.min(100, Math.round((state.stats.todayMinutes / DAILY_GOAL_MINUTES) * 100));

  refs.landingGoalProgress.textContent = `${state.stats.todayMinutes} / ${DAILY_GOAL_MINUTES} min`;
  refs.landingGoalFill.style.width = `${goalPercent}%`;
  refs.landingTodayMinutes.textContent = String(state.stats.todayMinutes);
  refs.landingSessionCount.textContent = String(state.stats.totalSessions);
  refs.landingLevelName.textContent = level.name;
  refs.landingTotalScore.textContent = String(state.stats.totalScore);
  refs.landingMemberMessage.textContent = state.stats.streak >= 1
    ? `${pluralize(state.stats.streak, "day")} streak in motion. Keep it alive today.`
    : "Your recent progress is ready. Step back into the workspace when you are.";
}

function renderWorkspace(state, refs) {
  const showApp = state.route.view === "app" && Boolean(state.auth.user);
  refs.mainApp.hidden = !showApp;
  refs.landingPage.hidden = showApp;

  if (!showApp) {
    return;
  }

  setAvatar(refs.profileAvatar, state.auth.user);
  setAvatar(refs.profilePanelAvatar, state.auth.user);
  refs.profileButtonName.textContent = state.auth.user.displayName || "Workspace";
  refs.profileButtonStreak.textContent = `${state.stats.streak} day streak`;
  refs.profilePanelName.textContent = state.auth.user.displayName || "FocusFlow";
  refs.profilePanelEmail.textContent = state.auth.user.email || "";
  refs.profilePanel.hidden = !state.ui.profileOpen;
}

function renderTimer(state, refs) {
  const progress = state.timer.totalTime > 0 ? state.timer.timeLeft / state.timer.totalTime : 0;
  refs.timerValue.textContent = formatClock(state.timer.timeLeft);
  refs.timerPercentLabel.textContent = state.timer.running ? `${Math.round(progress * 100)}%` : "Ready";
  refs.timerPhaseLabel.textContent = state.timer.pomodoroEnabled
    ? `${state.timer.pomodoroPhase === "work" ? "Work" : "Break"} phase`
    : state.timer.running
      ? "In progress"
      : "Ready";
  refs.timerProgress.style.strokeDasharray = `${CIRCLE_LENGTH}`;
  refs.timerProgress.style.strokeDashoffset = `${CIRCLE_LENGTH * (1 - progress)}`;
  refs.timerProgress.classList.toggle("timer-ring__progress--danger", state.timer.running && progress < 0.1);
  refs.startButton.disabled = state.timer.running;

  refs.sessionModeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.sessionMode === state.timer.sessionMode);
  });

  refs.modeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === state.room.mode);
  });

  refs.durationButtons.forEach((button) => {
    button.classList.toggle("is-active", Number(button.dataset.duration) === state.timer.selectedDuration);
  });

  refs.pomodoroButton.classList.toggle("is-active", state.timer.pomodoroEnabled);
  refs.scorePenaltyLabel.textContent = `Penalty: -${SESSION_MODES[state.timer.sessionMode].penalty} per distraction, minimum score 0.`;
  refs.sessionModeDescription.textContent = SESSION_MODES[state.timer.sessionMode].description;
}

function renderRoom(state, refs) {
  refs.roomPanel.hidden = state.room.mode !== "room";
  refs.roomCodeInput.value = state.room.draftRoomId;
  refs.activeRoomLabel.textContent = state.room.currentRoomId || "None";
  refs.roomPresenceCount.textContent = pluralize(state.room.participants.length, "person");
  refs.roomPresenceList.innerHTML = state.room.participants.length
    ? state.room.participants.map((participant) => `
      <div class="participant-pill">
        <span class="avatar avatar--tiny"${participant.avatar ? ` style="background-image:url('${participant.avatar}')"` : ""}>${participant.avatar ? "" : getInitials(participant.name)}</span>
        <span>${escapeHtml(participant.name)}</span>
      </div>
    `).join("")
    : `<p class="empty-copy">Nobody else is in this room yet.</p>`;
}

function renderAudio(state, refs) {
  refs.ambientTrackLabel.textContent = state.audio.trackLabel || "No track selected";
  refs.volumeInput.value = String(state.audio.volume);
  refs.soundButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.sound === state.audio.selectedCategory);
  });
}

function renderStats(state, refs) {
  const level = getLevelInfo(state.stats.totalMinutes);
  const xpRange = Number.isFinite(level.next) ? level.next - level.min : 1;
  const xpValue = Number.isFinite(level.next)
    ? Math.min(100, Math.round(((state.stats.totalMinutes - level.min) / xpRange) * 100))
    : 100;
  const goalPercent = Math.min(100, Math.round((state.stats.todayMinutes / DAILY_GOAL_MINUTES) * 100));
  const activityDays = new Set(state.stats.activityDays);

  refs.dailyGoalLabel.textContent = `${state.stats.todayMinutes} / ${DAILY_GOAL_MINUTES} min`;
  refs.dailyGoalFill.style.width = `${goalPercent}%`;
  refs.statsStreakValue.textContent = String(state.stats.streak);
  refs.statsSessionValue.textContent = String(state.stats.totalSessions);
  refs.statsHoursValue.textContent = formatHoursFromMinutes(state.stats.totalMinutes);
  refs.statsLevelValue.textContent = level.name;
  refs.xpCurrentLabel.textContent = `${state.stats.totalMinutes} min`;
  refs.xpNextLabel.textContent = Number.isFinite(level.next) ? `Next: ${level.next} min` : "Top tier reached";
  refs.xpFill.style.width = `${xpValue}%`;
  refs.badgeCountLabel.textContent = `${state.stats.badges.length} / 13`;

  refs.badgeList.innerHTML = state.stats.badges.length
    ? state.stats.badges.map((badge) => `<span class="badge">${escapeHtml(badge.replaceAll("_", " "))}</span>`).join("")
    : `<span class="badge badge--muted">No badges yet</span>`;

  const calendarDays = getLastTwentyEightDays();
  refs.calendarGrid.innerHTML = calendarDays.map((day) => `
    <div class="calendar-day${activityDays.has(day.iso) ? " is-done" : ""}">
      <span>${day.label}</span>
      <strong>${day.dayNumber}</strong>
    </div>
  `).join("");
  refs.calendarMetaLabel.textContent = `Best ${state.stats.longestStreak} days`;

  const weekMax = Math.max(...state.stats.weekData, 1);
  refs.weekChart.innerHTML = state.stats.weekData.map((value, index) => `
    <div class="week-chart__bar-wrap">
      <div class="week-chart__bar${index === new Date().getDay() ? " is-today" : ""}" style="height:${Math.max(8, (value / weekMax) * 92)}px"></div>
      <span>${DAY_LABELS[index]}</span>
    </div>
  `).join("");
  const activeWeekDays = state.stats.weekData.filter((value) => value > 0).length;
  refs.weekConsistencyLabel.textContent = `${Math.round((activeWeekDays / 7) * 100)}% consistency`;

  refs.profilePanelLevel.textContent = level.name;
  refs.profilePanelStreak.textContent = String(state.stats.streak);
  refs.profilePanelSessions.textContent = String(state.stats.totalSessions);
  refs.profilePanelHours.textContent = formatHoursFromMinutes(state.stats.totalMinutes);
  refs.profilePanelScore.textContent = String(state.stats.totalScore);
}

function renderHistory(state, refs) {
  refs.historyList.innerHTML = state.history.length
    ? state.history.map((session) => `
      <li class="history-item">
        <strong>${escapeHtml(session.goal)}</strong>
        <span>${escapeHtml(session.dateLabel)} - ${formatClock(session.timeSpent)} - ${session.distractions} distractions - ${session.score} pts</span>
      </li>
    `).join("")
    : `<li class="history-item history-item--empty">No sessions yet. Start one to build history.</li>`;
}

function renderLeaderboards(state, refs) {
  refs.boardButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.board === state.ui.roomBoard);
  });
  refs.globalLeaderboard.hidden = state.ui.roomBoard !== "global";
  refs.roomLeaderboard.hidden = state.ui.roomBoard !== "room";

  refs.globalLeaderboard.innerHTML = state.leaderboards.global.length
    ? state.leaderboards.global.map((entry) => `
      <li class="${entry.id === state.auth.user?.uid ? "is-mine" : ""}">
        <span>#${entry.rank}</span>
        <span>${escapeHtml(entry.name)}</span>
        <strong>${entry.score} pts</strong>
      </li>
    `).join("")
    : `<li class="board-list__empty">No global entries yet.</li>`;

  refs.roomLeaderboard.innerHTML = state.room.currentRoomId
    ? (state.leaderboards.room.length
      ? state.leaderboards.room.map((entry) => `
        <li class="${entry.uid === state.auth.user?.uid ? "is-mine" : ""}">
          <span>#${entry.rank}</span>
          <span>${escapeHtml(entry.name)}</span>
          <strong>${entry.score} pts</strong>
        </li>
      `).join("")
      : `<li class="board-list__empty">No room scores yet.</li>`)
    : `<li class="board-list__empty">Join or create a room to see room standings.</li>`;
}

function renderSummary(state, refs) {
  const result = state.session.lastResult;
  refs.sessionSummary.hidden = !result;

  if (!result) {
    return;
  }

  refs.summaryHeadline.textContent = result.completed ? "Session complete" : "Session stopped";
  refs.summaryTimeValue.textContent = formatClock(result.timeSpent);
  refs.summaryDistractionValue.textContent = String(result.distractions);
  refs.summaryScoreValue.textContent = String(result.score);
  refs.summaryFocusValue.textContent = `${calculateFocusPercentage(result.timeSpent, result.penaltyTotal)}%`;
  refs.saveStateBadge.textContent = state.session.saveState;
  refs.saveStateBadge.className = `status-badge status-badge--${state.session.saveState}`;

  const bucket = getFeedbackBucket(result.distractions);
  refs.sessionFeedback.textContent = FEEDBACK_POOLS[bucket][0];
  refs.distractionLog.innerHTML = result.distractionLog.length
    ? result.distractionLog.map((item) => `
      <div class="log-row">
        <span>${escapeHtml(item.reason)}</span>
        <strong>${item.duration}s / -${item.penalty}</strong>
      </div>
    `).join("")
    : `<div class="log-row log-row--empty">No distractions recorded.</div>`;
}

function renderPanels(state, refs) {
  refs.progressSection.hidden = !state.ui.sections.progress;
  refs.historySection.hidden = !state.ui.sections.history;
  refs.leaderboardSection.hidden = !state.ui.sections.leaderboard;
  refs.calendarSection.hidden = !state.ui.sections.calendar;
}

function renderFeedbackState(state, refs) {
  refs.workspaceBanner.hidden = !state.ui.banner;
  refs.workspaceBanner.textContent = state.ui.banner;

  refs.distractionModal.hidden = !state.ui.distractionModal;
  refs.distractionModalText.textContent = state.ui.distractionModal?.message || "";

  refs.badgeModal.hidden = !state.ui.badgeModal;
  refs.badgeModalTitle.textContent = state.ui.badgeModal?.title || "Badge unlocked";
  refs.badgeModalText.textContent = state.ui.badgeModal?.message || "";
}

function renderTheme(state, refs) {
  document.body.dataset.theme = state.ui.theme;
  refs.themeButtonLabel.textContent = state.ui.theme === "dark" ? "Dark" : "Light";
  refs.profileThemeLabel.textContent = state.ui.theme === "dark" ? "Dark" : "Light";
  refs.notificationLabel.textContent = state.ui.notificationsEnabled ? "On" : "Off";
}

function renderLoader(state, refs) {
  refs.loader.classList.toggle("is-hidden", !state.auth.loading);
}

export function createRenderer(refs) {
  let previousState = null;

  return function render(state) {
    renderLoader(state, refs);
    renderTheme(state, refs);
    renderToasts(state.ui.toasts, refs);
    renderLanding(state, refs);
    renderWorkspace(state, refs);
    renderTimer(state, refs);
    renderRoom(state, refs);
    renderAudio(state, refs);
    renderStats(state, refs);
    renderHistory(state, refs);
    renderLeaderboards(state, refs);
    renderSummary(state, refs);
    renderPanels(state, refs);
    renderFeedbackState(state, refs);
    refs.quoteBar.textContent = state.ui.quote;
    document.title = state.route.view === "app" && state.timer.running
      ? `${refs.timerValue.textContent} | ${APP_TITLE}`
      : "FocusFlow | Deep work that feels intentional";
    previousState = state;
    return previousState;
  };
}
