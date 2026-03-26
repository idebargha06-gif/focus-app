import { ROOM_HEARTBEAT_MS } from "../../utils/constants.js";
import { createRoomId, getRoomInviteUrl, getRoomIdFromUrl, sanitizeRoomId, writeRoomIdToUrl } from "../../utils/room.js";

export function createRoomsController({ store, repository, feedback, leaderboards }) {
  let presenceUnsubscribe = null;
  let roomUnsubscribe = null;
  let heartbeatId = null;
  let unloadBound = false;
  const handlers = {
    onRemoteSessionStart: null,
    onRemoteSessionStop: null
  };

  function setHandlers(nextHandlers) {
    Object.assign(handlers, nextHandlers);
  }

  function updateRoomMeta(roomData = {}) {
    store.setState((state) => ({
      ...state,
      room: {
        ...state.room,
        ownerUid: roomData.ownerUid || state.room.ownerUid,
        ownerName: roomData.ownerName || state.room.ownerName,
        sessionControl: roomData.sessionControl || null
      }
    }));
  }

  async function subscribeRoomState(roomId) {
    roomUnsubscribe?.();
    roomUnsubscribe = null;

    if (!roomId) {
      updateRoomMeta({
        ownerUid: "",
        ownerName: "",
        sessionControl: null
      });
      return;
    }

    const roomData = await repository.ensureRoom({
      roomId,
      user: store.getState().auth.user
    });
    updateRoomMeta(roomData);

    roomUnsubscribe = repository.subscribeRoom(roomId, async (nextRoom) => {
      const state = store.getState();
      const nextRevision = nextRoom.sessionControl?.revision || 0;
      const currentRevision = state.room.syncRevision || 0;

      store.setState((current) => ({
        ...current,
        room: {
          ...current.room,
          ownerUid: nextRoom.ownerUid || "",
          ownerName: nextRoom.ownerName || "",
          sessionControl: nextRoom.sessionControl || null,
          syncRevision: Math.max(current.room.syncRevision || 0, nextRevision)
        }
      }));

      if (!nextRoom.sessionControl || nextRevision <= currentRevision) {
        return;
      }

      const currentUserId = state.auth.user?.uid || "";
      if (nextRoom.sessionControl.initiatedBy === currentUserId) {
        return;
      }

      if (nextRoom.sessionControl.status === "running") {
        await handlers.onRemoteSessionStart?.(nextRoom.sessionControl);
        return;
      }

      if (["stopped", "completed"].includes(nextRoom.sessionControl.status)) {
        await handlers.onRemoteSessionStop?.({
          completed: nextRoom.sessionControl.status === "completed"
        });
      }
    });
  }

  function syncRoomDraft(roomId) {
    const nextRoomId = sanitizeRoomId(roomId);
    store.setState((state) => ({
      ...state,
      room: {
        ...state.room,
        draftRoomId: nextRoomId
      }
    }));
  }

  async function startPresence() {
    const state = store.getState();
    if (!state.auth.user || state.room.mode !== "room" || !state.room.currentRoomId) {
      return;
    }

    await repository.upsertRoomPresence({
      roomId: state.room.currentRoomId,
      user: state.auth.user
    });

    if (heartbeatId) {
      window.clearInterval(heartbeatId);
      heartbeatId = null;
    }
    await subscribeRoomState(state.room.currentRoomId);
    presenceUnsubscribe?.();
    presenceUnsubscribe = repository.subscribeRoomPresence(state.room.currentRoomId, (participants) => {
      store.setState((nextState) => ({
        ...nextState,
        room: {
          ...nextState.room,
          participants
        }
      }));
    });

    heartbeatId = window.setInterval(() => {
      const liveState = store.getState();
      if (liveState.auth.user && liveState.room.currentRoomId) {
        repository.upsertRoomPresence({
          roomId: liveState.room.currentRoomId,
          user: liveState.auth.user
        }).catch(() => {});
      }
    }, ROOM_HEARTBEAT_MS);

    if (!unloadBound) {
      const handleLeave = () => {
        const liveState = store.getState();
        if (liveState.auth.user && liveState.room.currentRoomId) {
          repository.removeRoomPresence(liveState.room.currentRoomId, liveState.auth.user.uid).catch(() => {});
        }
      };

      window.addEventListener("pagehide", handleLeave);
      window.addEventListener("beforeunload", handleLeave);
      unloadBound = true;
    }
  }

  async function stopPresence() {
    const state = store.getState();
    if (heartbeatId) {
      window.clearInterval(heartbeatId);
      heartbeatId = null;
    }
    presenceUnsubscribe?.();
    presenceUnsubscribe = null;
    roomUnsubscribe?.();
    roomUnsubscribe = null;
    if (state.auth.user && state.room.currentRoomId) {
      await repository.removeRoomPresence(state.room.currentRoomId, state.auth.user.uid).catch(() => {});
    }
    store.setState((nextState) => ({
      ...nextState,
      room: {
        ...nextState.room,
        participants: [],
        ownerUid: "",
        ownerName: "",
        sessionControl: null,
        syncRevision: 0
      }
    }));
  }

  async function joinRoom(roomId, options = { announce: true }) {
    const nextRoomId = sanitizeRoomId(roomId);
    if (!nextRoomId) {
      feedback.notify({
        type: "error",
        title: "Room code needed",
        message: "Enter a valid room code before joining."
      });
      return;
    }

    writeRoomIdToUrl(nextRoomId);
    store.setState((state) => ({
      ...state,
      room: {
        ...state.room,
        mode: "room",
        currentRoomId: nextRoomId,
        draftRoomId: nextRoomId
      },
      ui: {
        ...state.ui,
        roomBoard: "room"
      }
    }));
    leaderboards.startRoom(nextRoomId);
    await startPresence();

    if (options.announce) {
      feedback.notify({
        type: "success",
        title: "Room joined",
        message: `You are now in room ${nextRoomId}.`
      });
    }
  }

  async function createRoom() {
    await joinRoom(createRoomId(), { announce: false });
    feedback.notify({
      type: "success",
      title: "Room created",
      message: "A fresh room has been created and linked to this workspace."
    });
  }

  async function copyInvite() {
    const roomId = store.getState().room.currentRoomId || sanitizeRoomId(store.getState().room.draftRoomId);
    if (!roomId) {
      feedback.notify({
        type: "error",
        title: "No room selected",
        message: "Create or join a room before copying the invite link."
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(getRoomInviteUrl(roomId));
      feedback.notify({
        type: "success",
        title: "Invite copied",
        message: `Room link for ${roomId} copied to your clipboard.`
      });
    } catch (error) {
      feedback.notify({
        type: "error",
        title: "Clipboard blocked",
        message: getRoomInviteUrl(roomId)
      });
    }
  }

  async function setMode(mode) {
    if (store.getState().timer.running) {
      feedback.notify({
        type: "warning",
        title: "Session is active",
        message: "Stop the current session before switching mode."
      });
      return;
    }

    if (mode === "solo") {
      await stopPresence();
      writeRoomIdToUrl("");
      store.setState((state) => ({
        ...state,
        room: {
          ...state.room,
          mode: "solo",
          currentRoomId: "",
          draftRoomId: "",
          participants: [],
          ownerUid: "",
          ownerName: "",
          sessionControl: null,
          syncRevision: 0
        },
        ui: {
          ...state.ui,
          roomBoard: "global"
        }
      }));
      leaderboards.startRoom("");
      return;
    }

    store.setState((state) => ({
      ...state,
      room: {
        ...state.room,
        mode: "room"
      },
      ui: {
        ...state.ui,
        roomBoard: "room"
      }
    }));

    if (store.getState().room.currentRoomId) {
      await startPresence();
      leaderboards.startRoom(store.getState().room.currentRoomId);
    }
  }

  async function hydrateFromUrl() {
    const roomId = getRoomIdFromUrl();
    if (roomId) {
      await joinRoom(roomId, { announce: false });
    }
  }

  async function publishTimerStart(timerState) {
    const state = store.getState();
    if (!state.auth.user || !state.room.currentRoomId || state.room.ownerUid !== state.auth.user.uid) {
      return null;
    }

    const control = await repository.upsertRoomSessionControl({
      roomId: state.room.currentRoomId,
      user: state.auth.user,
      control: {
        status: "running",
        startedAt: Date.now(),
        totalTime: timerState.totalTime,
        selectedDuration: timerState.selectedDuration,
        sessionMode: timerState.sessionMode,
        pomodoroEnabled: timerState.pomodoroEnabled,
        pomodoroPhase: timerState.pomodoroPhase,
        pomodoroCycle: timerState.pomodoroCycle,
        cumulativeFocusSeconds: timerState.cumulativeFocusSeconds || 0,
        focusGoal: timerState.focusGoal || ""
      }
    });

    store.setState((current) => ({
      ...current,
      room: {
        ...current.room,
        sessionControl: control,
        syncRevision: control.revision
      }
    }));

    return control;
  }

  async function publishTimerStop({ completed, focusGoal }) {
    const state = store.getState();
    if (!state.auth.user || !state.room.currentRoomId || state.room.ownerUid !== state.auth.user.uid) {
      return null;
    }

    const control = await repository.upsertRoomSessionControl({
      roomId: state.room.currentRoomId,
      user: state.auth.user,
      control: {
        status: completed ? "completed" : "stopped",
        endedAt: Date.now(),
        focusGoal: focusGoal || state.session.focusGoal || ""
      }
    });

    store.setState((current) => ({
      ...current,
      room: {
        ...current.room,
        sessionControl: control,
        syncRevision: control.revision
      }
    }));

    return control;
  }

  return {
    setHandlers,
    syncRoomDraft,
    setMode,
    joinRoom,
    createRoom,
    copyInvite,
    hydrateFromUrl,
    startPresence,
    stopPresence,
    publishTimerStart,
    publishTimerStop
  };
}
