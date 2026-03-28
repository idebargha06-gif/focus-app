import {
  APP_TITLE,
  CIRCLE_LENGTH,
  DAILY_GOAL_MINUTES,
  DAY_LABELS,
  FEEDBACK_POOLS,
  SESSION_MODES
} from "../utils/constants.js";
import { createAvatarMarkup, hydrateAvatarImages, mountAvatar } from "../utils/avatar.js";
import { formatMonthLabel, getMonthGrid, getMonthKey, getTodayIsoDay } from "../utils/date.js";
import { escapeHtml, formatClock, formatClockWithHours, formatCompactMinutes, formatHoursFromMinutes, formatTimeAgo, getFirstName, pluralize } from "../utils/format.js";
import { calculateFocusPercentage, getFeedbackBucket, getLevelInfo } from "../utils/scoring.js";

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
  refs.landingAccountToolbar.hidden = !isSignedIn;
  refs.landingStreakBadge.hidden = !isSignedIn;
  refs.landingStreakValue.textContent = String(state.stats.streak);
  refs.landingStreakBadge.dataset.active = state.stats.streak > 0 ? "true" : "false";

  refs.publicMinutesMetric.textContent = formatCompactMinutes(state.publicStats.totalMinutes);
  refs.publicSessionMetric.textContent = String(state.publicStats.totalSessions);
  refs.publicUserMetric.textContent = String(state.publicStats.totalUsers);

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
    refs.profilePanel.hidden = true;
    return;
  }

  const firstName = getFirstName(state.auth.user.displayName || state.auth.user.email || "Workspace");
  mountAvatar(refs.landingUserAvatar, state.auth.user, { sizeClass: "avatar--small" });
  mountAvatar(refs.profilePanelAvatar, state.auth.user);

  // refs.landingUserName.textContent = firstName; // This element was removed from template
  refs.landingHeroTitle.textContent = `${firstName}, your next clean session is one click away.`;
  refs.profilePanelName.textContent = state.auth.user.displayName || "FocusFlow";
  refs.profilePanelEmail.textContent = state.auth.user.email || "";
  refs.profilePanel.hidden = !state.ui.profileOpen;

  const level = getLevelInfo(state.stats.totalMinutes);
  const goalPercent = Math.min(100, Math.round((state.stats.todayMinutes / DAILY_GOAL_MINUTES) * 100));
  refs.landingGoalProgress.textContent = `${state.stats.todayMinutes} / ${DAILY_GOAL_MINUTES} min`;
  refs.landingGoalFill.style.width = `${goalPercent}%`;
  refs.landingTodayMinutes.textContent = String(state.stats.todayMinutes);
  refs.landingSessionCount.textContent = String(state.stats.totalSessions);
  refs.landingLevelName.textContent = level.name;
  refs.landingTotalScore.textContent = String(state.stats.totalScore);
  refs.landingMemberMessage.textContent = "Your recent progress is ready. Step back in and make the next session count.";
}

function renderWorkspace(state, refs) {
  const showApp = state.route.view === "app" && Boolean(state.auth.user);
  refs.mainApp.hidden = !showApp;
  refs.landingPage.hidden = showApp;

  if (!showApp) {
    return;
  }

  mountAvatar(refs.profileAvatar, state.auth.user, { sizeClass: "avatar--small" });
  mountAvatar(refs.profilePanelAvatar, state.auth.user);
  // refs.profileButtonName.textContent = getFirstName(state.auth.user.displayName || state.auth.user.email || "Workspace"); // Element removed from template
  // refs.profilePanelName.textContent = state.auth.user.displayName || "FocusFlow"; // Element removed from template
  // refs.profilePanelEmail.textContent = state.auth.user.email || ""; // Element removed from template
  refs.profilePanel.hidden = !state.ui.profileOpen;
  refs.workspaceStreakValue.textContent = String(state.stats.streak);
  refs.workspaceStreakBadge.hidden = false;
  refs.workspaceStreakBadge.dataset.active = state.stats.streak > 0 ? "true" : "false";
  refs.roomModeCountBadge.hidden = state.room.mode !== "room" || state.room.activeCount <= 0;
  refs.roomModeCountBadge.textContent = String(state.room.activeCount);
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
  refs.timerRing.classList.toggle("session-starting", state.ui.focusPulse);
  const roomLocked = state.room.mode === "room"
    && Boolean(state.room.currentRoomId)
    && Boolean(state.auth.user?.uid)
    && Boolean(state.room.ownerUid)
    && state.room.ownerUid !== state.auth.user.uid;
  refs.startButton.disabled = state.timer.running || roomLocked;
  refs.stopButton.disabled = !state.timer.running || roomLocked;
  refs.startButton.textContent = roomLocked ? "Owner starts session" : "Start session";

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
  refs.roomCodeInput.value = state.room.draftRoomName;
  refs.roomJoinInput.value = state.room.joinCode;
  refs.activeRoomLabel.textContent = state.room.currentRoomName || state.room.currentRoomId || "None";
  refs.activeRoomCodeLabel.textContent = state.room.currentRoomId || "--------";
  refs.roomPresenceCount.textContent = pluralize(state.room.activeCount, "person");
  refs.roomOwnerLabel.textContent = state.room.ownerName || "Waiting";
  refs.roomSyncLabel.textContent = state.room.sessionControl?.status
    ? `${state.room.sessionControl.status[0].toUpperCase()}${state.room.sessionControl.status.slice(1)}`
    : "Idle";
  const currentUid = state.auth.user?.uid;
  refs.roomPresenceList.innerHTML = state.room.participants.length
    ? state.room.participants.map((participant) => `
      <div class="participant-pill${participant.uid === currentUid ? " is-self" : ""}">
        ${createAvatarMarkup(participant, { sizeClass: "avatar--tiny" })}
        <span>${escapeHtml(participant.name)}${participant.uid === currentUid ? " (you)" : ""}</span>
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

function renderCalendar(state, refs) {
  const level = getLevelInfo(state.stats.totalMinutes);
  const goalPercent = Math.min(100, Math.round((state.stats.todayMinutes / DAILY_GOAL_MINUTES) * 100));
  const activityDays = new Set(state.stats.activityDays);
  const todayIso = getTodayIsoDay();
  const viewedMonth = state.ui.calendarViewMonth;
  const todayMonth = getMonthKey();
  const monthGrid = getMonthGrid(viewedMonth);
  const firstSessionDay = state.stats.activityDays[0] || null;
  const monthActiveDays = monthGrid.filter((cell) => cell.type === "day" && activityDays.has(cell.iso)).length;

  refs.dailyGoalLabel.textContent = `${state.stats.todayMinutes} / ${DAILY_GOAL_MINUTES} min`;
  refs.dailyGoalFill.style.width = `${goalPercent}%`;
  refs.statsStreakValue.textContent = String(state.stats.streak);
  refs.statsSessionValue.textContent = String(state.stats.totalSessions);
  refs.statsHoursValue.textContent = formatHoursFromMinutes(state.stats.totalMinutes);
  refs.statsLevelValue.textContent = level.name;
  refs.xpCurrentLabel.textContent = `${state.stats.totalMinutes} min`;
  refs.xpNextLabel.textContent = Number.isFinite(level.next) ? `Next: ${level.next} min` : "Top tier reached";
  const xpRange = Number.isFinite(level.next) ? level.next - level.min : 1;
  const xpValue = Number.isFinite(level.next)
    ? Math.min(100, Math.round(((state.stats.totalMinutes - level.min) / xpRange) * 100))
    : 100;
  refs.xpFill.style.width = `${xpValue}%`;
  refs.badgeCountLabel.textContent = `${state.stats.badges.length} / 13`;
  refs.badgeList.innerHTML = state.stats.badges.length
    ? state.stats.badges.map((badge) => `<span class="badge${state.ui.highlightedBadgeId === badge ? " just-unlocked" : ""}">${escapeHtml(badge.replaceAll("_", " "))}</span>`).join("")
    : `<span class="badge badge--muted">No badges yet</span>`;

  refs.calendarToggleLabel.textContent = formatMonthLabel(viewedMonth);
  refs.calendarMetaLabel.textContent = `Best ${state.stats.longestStreak} days`;
  refs.calendarMonthLabel.textContent = formatMonthLabel(viewedMonth);
  refs.calendarNextButton.disabled = viewedMonth >= todayMonth;
  refs.calendarLongestLabel.textContent = `Longest: ${state.stats.longestStreak}d`;
  refs.calendarMonthDaysLabel.textContent = `This month: ${monthActiveDays} days`;

  refs.calendarGrid.innerHTML = monthGrid.map((cell) => {
    if (cell.type === "empty") {
      return `<div class="calendar-day calendar-day--empty" aria-hidden="true"></div>`;
    }

    const isToday = cell.iso === todayIso;
    const isDone = activityDays.has(cell.iso);
    const isFuture = cell.iso > todayIso;
    const isBeforeStart = firstSessionDay ? cell.iso < firstSessionDay : true;
    const isMissed = !isDone && !isFuture && !isBeforeStart;

    return `
      <div class="calendar-day${isDone ? " is-done" : ""}${isMissed ? " is-missed" : ""}${isToday ? " is-today" : ""}${(isFuture || isBeforeStart) ? " is-muted" : ""}">
        <span>${cell.dayNumber}</span>
        ${isDone ? '<strong>&check;</strong>' : '<strong></strong>'}
      </div>
    `;
  }).join("");

  const weekMax = Math.max(...state.stats.weekData, 1);
  refs.weekChart.innerHTML = state.stats.weekData.map((value, index) => `
    <div class="week-chart__bar-wrap">
      <div class="week-chart__bar${index === new Date().getDay() ? " is-today" : ""}" style="height:${Math.max(8, (value / weekMax) * 92)}px"></div>
      <span>${DAY_LABELS[index]}</span>
    </div>
  `).join("");
  const activeWeekDays = state.stats.weekData.filter((value) => value > 0).length;
  refs.weekConsistencyLabel.textContent = `${Math.round((activeWeekDays / 7) * 100)}% consistency`;

  // Profile panel stats elements removed from template - commenting out to prevent errors
  // refs.profilePanelLevel.textContent = level.name;
  // refs.profilePanelStreak.textContent = String(state.stats.streak);
  // refs.profilePanelSessions.textContent = String(state.stats.totalSessions);
  // refs.profilePanelHours.textContent = formatHoursFromMinutes(state.stats.totalMinutes);
  // refs.profilePanelScore.textContent = String(state.stats.totalScore);
}

function renderHistory(state, refs) {
  const expandedIds = new Set(state.ui.expandedHistoryIds);
  refs.historyList.innerHTML = state.history.length
    ? state.history.map((session) => `
      <li class="history-item${expandedIds.has(session.id) ? " expanded" : ""}" data-action="toggle-history-item" data-history-id="${session.id}" tabindex="0">
        <strong class="history-item__goal">${escapeHtml(session.goal)}</strong>
        <span>${escapeHtml(session.dateLabel)} - ${formatClock(session.timeSpent)} - ${session.distractions} distractions - ${session.score} pts</span>
        <div class="history-item__details">
          <span>Mode: ${escapeHtml(session.sessionMode || "normal")}</span>
          <span>Distractions: ${session.distractions}</span>
          <span>Score: ${session.score} pts</span>
          <span>Penalty: -${session.penaltyTotal || 0}</span>
        </div>
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
  refs.summaryFocusValue.textContent = `${result.focusPercentage ?? calculateFocusPercentage(result.timeSpent, result.penaltyTotal)}%`;
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
  refs.workspaceBanner.textContent = state.ui.banner?.message || "";
  refs.workspaceBanner.className = `workspace-banner${state.ui.banner ? ` workspace-banner--${state.ui.banner.type}` : ""}`;

  refs.distractionModal.hidden = !state.ui.distractionModal;
  refs.distractionModalText.textContent = state.ui.distractionModal?.message || "";

  refs.badgeModal.hidden = !state.ui.badgeModal;
  refs.badgeModalTitle.textContent = state.ui.badgeModal?.title || "Badge unlocked";
  refs.badgeModalText.textContent = state.ui.badgeModal?.message || "";
}

function renderOwnerDashboard(state, refs) {
  refs.ownerDashboard.hidden = !state.ui.ownerDashboardOpen;
  refs.ownerRoomSelect.innerHTML = state.owner.rooms.length
    ? state.owner.rooms.map((room) => `<option value="${escapeHtml(room.id)}"${room.id === state.owner.selectedRoomId ? " selected" : ""}>${escapeHtml(room.name)}</option>`).join("")
    : '<option value="">No active rooms</option>';
  refs.odTotalParticipants.textContent = String(state.owner.summary.total);
  refs.odFocusingCount.textContent = String(state.owner.summary.focusing);
  refs.odDistractedCount.textContent = String(state.owner.summary.distracted);
  refs.odLeftCount.textContent = String(state.owner.summary.left);
  refs.odParticipants.innerHTML = state.owner.participants.length
    ? state.owner.participants.map((participant) => {
      const status = participant.leftAt
        ? { label: "Left", className: "is-left" }
        : participant.distractedAt
          ? { label: "Distracted", className: "is-distracted" }
          : participant.focusing
            ? { label: "Focusing", className: "is-focusing" }
            : { label: "Waiting", className: "is-waiting" };
      const elapsedSeconds = participant.sessionStarted && participant.focusing
        ? Math.max(0, Math.floor((state.ui.ownerNow - participant.sessionStarted) / 1000))
        : 0;

      return `
        <article class="owner-card ${status.className}">
          <div class="owner-card__header">
            ${createAvatarMarkup(participant)}
            <div>
              <strong>${escapeHtml(participant.name)}</strong>
              <span class="owner-status-pill ${status.className}">${status.label}</span>
            </div>
          </div>
          <div class="owner-card__meta">
            <span class="owner-card__badge${participant.distractionCount > 0 ? ' owner-card__badge--alert' : ''}">${participant.distractionCount} distractions</span>
            <strong>${elapsedSeconds ? formatClockWithHours(elapsedSeconds) : "00:00"}</strong>
          </div>
          <p class="owner-card__subtext">${participant.leftAt ? `Left ${formatTimeAgo(participant.leftAt, state.ui.ownerNow)}` : participant.awayDuration ? `Away ${participant.awayDuration}s` : "Listening for movement"}</p>
        </article>
      `;
    }).join("")
    : '<p class="empty-copy">Select an active room to monitor presence.</p>';

  refs.odEventLog.innerHTML = state.owner.eventLog.length
    ? state.owner.eventLog.map((entry) => `
      <div class="owner-log-row owner-log-row--${entry.type}">
        <strong>${new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</strong>
        <span>${escapeHtml(entry.message)}</span>
      </div>
    `).join("")
    : '<div class="owner-log-row"><span>Events will appear here.</span></div>';
}

function renderTheme(state, refs) {
  document.body.dataset.theme = state.ui.theme;
  
  // Update theme toggle buttons with new structure
  if (refs.themeToggleButton) {
    refs.themeToggleButton.dataset.theme = state.ui.theme;
  }
  if (refs.landingThemeToggleButton) {
    refs.landingThemeToggleButton.dataset.theme = state.ui.theme;
  }
  
  // Update old labels if they exist (for backward compatibility)
  if (refs.themeButtonLabel) {
    refs.themeButtonLabel.textContent = state.ui.theme === "dark" ? "Dark" : "Light";
  }
  if (refs.landingThemeButtonLabel) {
    refs.landingThemeButtonLabel.textContent = state.ui.theme === "dark" ? "Dark" : "Light";
  }
  if (refs.profileThemeLabel) {
    refs.profileThemeLabel.textContent = state.ui.theme === "dark" ? "Dark" : "Light";
  }
  if (refs.notificationLabel) {
    refs.notificationLabel.textContent = state.ui.notificationsEnabled ? "On" : "Off";
  }
}

function renderLoader(state, refs) {
  refs.loader.classList.toggle("is-hidden", !state.auth.loading);
}

export function createRenderer(refs) {
  return function render(state) {
    renderLoader(state, refs);
    renderTheme(state, refs);
    renderToasts(state.ui.toasts, refs);
    renderLanding(state, refs);
    renderWorkspace(state, refs);
    renderTimer(state, refs);
    renderRoom(state, refs);
    renderAudio(state, refs);
    renderCalendar(state, refs);
    renderHistory(state, refs);
    renderLeaderboards(state, refs);
    renderSummary(state, refs);
    renderPanels(state, refs);
    renderFeedbackState(state, refs);
    renderOwnerDashboard(state, refs);
    refs.quoteBar.textContent = state.ui.quote;
    document.title = state.route.view === "app" && state.timer.running
      ? `${refs.timerValue.textContent} | ${APP_TITLE}`
      : "FocusFlow | Deep work that feels intentional";
    hydrateAvatarImages(refs.root);
    return state;
  };
}

