import * as repository from "../repositories/focusRepository.js";
import { createAuthController } from "../features/auth/controller.js";
import { createAudioController } from "../features/audio/controller.js";
import { createFeedbackController } from "../features/feedback/controller.js";
import { createLeaderboardsController } from "../features/leaderboards/controller.js";
import { createOwnerController } from "../features/owner/controller.js";
import { createProfileController } from "../features/profile/controller.js";
import { createRoomsController } from "../features/rooms/controller.js";
import { createSessionsController } from "../features/sessions/controller.js";
import { createStatsController } from "../features/stats/controller.js";
import { createTimerController } from "../features/timer/controller.js";
import { createStore } from "../store/createStore.js";
import { createInitialState } from "../store/state.js";
import { mountApp } from "../ui/dom.js";
import { createRenderer } from "../ui/render.js";
import { getMonthKey, shiftMonthKey } from "../utils/date.js";

export function bootstrapApp() {
  const root = document.querySelector("#app");
  const refs = mountApp(root);
  // Keep profile dropdown outside route-specific containers so it can open
  // from both landing and workspace views.
  if (refs.profilePanel && refs.mainApp?.contains(refs.profilePanel)) {
    refs.root.appendChild(refs.profilePanel);
  }
  const store = createStore(createInitialState());
  const render = createRenderer(refs);

  const feedback = createFeedbackController({ store });
  const profile = createProfileController({ store });
  const leaderboards = createLeaderboardsController({ store, repository });
  const stats = createStatsController({ store, repository });
  const audio = createAudioController({ store, feedback });
  const rooms = createRoomsController({ store, repository, feedback, leaderboards });
  const owner = createOwnerController({ store, repository });
  const timer = createTimerController({ store, feedback });
  const sessions = createSessionsController({
    store,
    repository,
    timer,
    stats,
    rooms,
    leaderboards,
    audio,
    feedback
  });
  const auth = createAuthController({
    store,
    repository,
    stats,
    leaderboards,
    rooms,
    profile,
    feedback
  });

  timer.setHandlers({
    onToggleSession: sessions.toggleStartStop,
    onEscape: () => {
      feedback.hideDistractionModal();
      feedback.hideBadgeModal();
      profile.closeProfile();
      owner.closeDashboard();
    },
    onSessionFinished: sessions.handleTimerCompletion,
    onDistraction: ({ awaySeconds, distractionCount }) => {
      rooms.updatePresence({
        distractedAt: Date.now(),
        distractionCount,
        awayDuration: awaySeconds
      }).catch(() => {});
    },
    onDistractionCleared: () => {
      rooms.updatePresence({ distractedAt: 0, awayDuration: 0 }).catch(() => {});
    }
  });

  rooms.setHandlers({
    onRemoteSessionStart: sessions.startRemoteSession,
    onRemoteSessionStop: sessions.stopRemoteSession
  });

  function toggleHistoryExpansion(historyId) {
    store.setState((state) => {
      const current = new Set(state.ui.expandedHistoryIds);
      if (current.has(historyId)) {
        current.delete(historyId);
      } else {
        current.add(historyId);
      }

      return {
        ...state,
        ui: {
          ...state.ui,
          expandedHistoryIds: [...current]
        }
      };
    });
  }

  function shiftCalendar(delta) {
    const currentMonth = store.getState().ui.calendarViewMonth;
    const nextMonth = shiftMonthKey(currentMonth, delta);
    const currentLimit = getMonthKey();
    if (nextMonth > currentLimit) {
      return;
    }

    store.setState((state) => ({
      ...state,
      ui: {
        ...state.ui,
        calendarViewMonth: nextMonth
      }
    }));
  }

  function bindGlobalEvents() {
    root.addEventListener("click", async (event) => {
      const actionTarget = event.target.closest("[data-action]");
      if (!actionTarget) {
        return;
      }

      const { action } = actionTarget.dataset;

      switch (action) {
        case "sign-in":
          auth.signIn();
          break;
        case "sign-out":
          auth.signOut();
          break;
        case "go-app":
          if (store.getState().auth.user) {
            auth.openAppRoute();
          } else {
            auth.signIn();
          }
          break;
        case "go-landing":
          if (store.getState().timer.running) {
            feedback.notify({
              type: "warning",
              title: "Session still running",
              message: "Stop the current session before leaving the workspace."
            });
            return;
          }
          auth.openLandingRoute();
          break;
        case "scroll-live-board":
          document.getElementById("live-board")?.scrollIntoView({ behavior: "smooth", block: "start" });
          break;
        case "toggle-theme":
          profile.toggleTheme();
          break;
        case "toggle-notifications":
          profile.toggleNotifications();
          break;
        case "toggle-profile":
          profile.toggleProfile();
          break;
        case "set-mode":
          await rooms.setMode(actionTarget.dataset.mode);
          break;
        case "set-session-mode":
          timer.setSessionMode(actionTarget.dataset.sessionMode);
          break;
        case "set-duration":
          timer.setDuration(Number(actionTarget.dataset.duration));
          refs.customDurationPanel.hidden = true;
          break;
        case "toggle-custom-duration":
          refs.customDurationPanel.hidden = !refs.customDurationPanel.hidden;
          break;
        case "apply-custom-duration":
          if (timer.applyCustomMinutes(refs.customMinutesInput.value)) {
            refs.customDurationPanel.hidden = true;
          } else {
            feedback.notify({ type: "warning", title: "Minutes required", message: "Enter a whole number greater than zero." });
          }
          break;
        case "toggle-pomodoro":
          timer.togglePomodoro();
          break;
        case "join-room":
          await rooms.joinRoom(refs.roomCodeInput.value);
          break;
        case "join-room-code":
          await rooms.joinRoomByCode(refs.roomJoinInput.value);
          break;
        case "create-room":
          await rooms.createRoom();
          break;
        case "copy-invite":
          await rooms.copyInvite();
          break;
        case "leave-room":
          await rooms.leaveRoom();
          break;
        case "copy-room-code":
          await rooms.copyRoomCode();
          break;
        case "start-session":
          await sessions.startSession();
          break;
        case "stop-session":
          await sessions.stopSession();
          break;
        case "share-session":
          await sessions.shareLastSession();
          break;
        case "switch-board":
          store.setState((state) => ({
            ...state,
            ui: {
              ...state.ui,
              roomBoard: actionTarget.dataset.board
            }
          }));
          break;
        case "toggle-section": {
          const sectionKey = actionTarget.dataset.section;
          store.setState((state) => ({
            ...state,
            ui: {
              ...state.ui,
              sections: {
                ...state.ui.sections,
                [sectionKey]: !state.ui.sections[sectionKey]
              }
            }
          }));
          break;
        }
        case "calendar-prev":
          shiftCalendar(-1);
          break;
        case "calendar-next":
          shiftCalendar(1);
          break;
        case "toggle-history-item":
          toggleHistoryExpansion(actionTarget.dataset.historyId);
          break;
        case "open-owner-dashboard":
          owner.openDashboard();
          break;
        case "close-owner-dashboard":
          owner.closeDashboard();
          break;
        case "dismiss-toast":
          feedback.dismissToast(actionTarget.dataset.toastId);
          break;
        case "close-distraction-modal":
          feedback.hideDistractionModal();
          break;
        case "close-badge-modal":
          feedback.hideBadgeModal();
          break;
        default:
          break;
      }
    });

    refs.focusGoalInput.addEventListener("input", (event) => {
      store.setState((state) => ({
        ...state,
        session: {
          ...state.session,
          focusGoal: event.target.value
        }
      }));
    });

    refs.roomCodeInput.addEventListener("input", (event) => {
      rooms.syncRoomDraft(event.target.value.toUpperCase());
    });

    refs.roomJoinInput.addEventListener("input", (event) => {
      rooms.syncJoinCode(event.target.value);
    });

    refs.roomJoinInput.addEventListener("keydown", async (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        await rooms.joinRoomByCode(event.target.value);
      }
    });

    refs.ownerRoomSelect.addEventListener("change", (event) => {
      owner.loadOwnerRoom(event.target.value);
    });

    refs.volumeInput.addEventListener("input", (event) => {
      audio.setVolume(Number(event.target.value));
    });

    refs.soundButtons.forEach((button) => {
      button.addEventListener("click", () => {
        audio.toggleCategory(button.dataset.sound);
      });
    });
    const handleProfileToggle = (event) => {
      event.stopPropagation();
      profile.toggleProfile();
    };

    refs.profileButton?.addEventListener("click", handleProfileToggle);
    refs.landingProfileButton?.addEventListener("click", handleProfileToggle);
    refs.profilePanelAvatar?.addEventListener("click", handleProfileToggle);

    document.addEventListener("click", (event) => {
      const clickedWorkspaceProfile = refs.profileButton?.contains(event.target);
      const clickedLandingProfile = refs.landingProfileButton?.contains(event.target);
      const clickedOwnerButton = refs.ownerDashButton?.contains(event.target);
      const clickedOwnerOverlay = event.target === refs.ownerDashboard;
      if (!refs.profilePanel.hidden && !refs.profilePanel.contains(event.target) && !clickedWorkspaceProfile && !clickedLandingProfile) {
        profile.closeProfile();
      }
      if (!refs.ownerDashboard.hidden && clickedOwnerOverlay && !clickedOwnerButton) {
        owner.closeDashboard();
      }
    });
  }

  bindGlobalEvents();
  timer.bindAttentionTracking();

  store.subscribe(render);
  render(store.getState());

  leaderboards.startLanding();
  leaderboards.startGlobal();
  leaderboards.refreshPublicStats().catch(() => {});
  auth.init();
}




