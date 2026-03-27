import { ROOM_HEARTBEAT_MS } from "../../utils/constants.js";
import { clearRoomIdFromUrl, createRoomId, getRoomInviteUrl, getRoomIdFromUrl, isValidRoomCode, sanitizeRoomId, URL_ROOM_ID, writeRoomIdToUrl } from "../../utils/room.js";

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
      updateRoomMeta({ ownerUid: "", ownerName: "", sessionControl: null });
      return;
    }

    const roomData = await repository.ensureRoom({ roomId, user: store.getState().auth.user });
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
        await handlers.onRemoteSessionStop?.({ completed: nextRoom.sessionControl.status === "completed" });
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

  function syncJoinCode(value) {
    store.setState((state) => ({
      ...state,
      room: {
        ...state.room,
        joinCode: value
      }
    }));
  }

  async function updatePresence(patch = {}) {
    const state = store.getState();
    if (!state.auth.user?.uid || !state.room.currentRoomId) {
      return;
    }

    await repository.updateRoomPresence(state.room.currentRoomId, state.auth.user.uid, patch).catch(() => {});
    if (state.auth.user) {
      repository.touchActiveRoom({ roomId: state.room.currentRoomId, user: state.auth.user }).catch(() => {});
    }
  }

  async function startPresence() {
    const state = store.getState();
    if (!state.auth.user || state.room.mode !== "room" || !state.room.currentRoomId) {
      return;
    }

    await repository.upsertRoomPresence({ roomId: state.room.currentRoomId, user: state.auth.user });
    await repository.touchActiveRoom({ roomId: state.room.currentRoomId, user: state.auth.user }).catch(() => {});

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
          participants,
          activeCount: participants.filter((participant) => participant.active !== false).length
        }
      }));
    });

    heartbeatId = window.setInterval(() => {
      const liveState = store.getState();
      if (liveState.auth.user && liveState.room.currentRoomId) {
        repository.updateRoomPresence(liveState.room.currentRoomId, liveState.auth.user.uid, {
          active: true,
          lastSeenAt: Date.now(),
          leftAt: 0
        }).catch(() => {});
      }
    }, ROOM_HEARTBEAT_MS);

    if (!unloadBound) {
      const handleLeave = () => {
        const liveState = store.getState();
        if (liveState.auth.user && liveState.room.currentRoomId) {
          repository.updateRoomPresence(liveState.room.currentRoomId, liveState.auth.user.uid, {
            active: false,
            focusing: false,
            leftAt: Date.now()
          }).catch(() => {});
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
        activeCount: 0,
        ownerUid: "",
        ownerName: "",
        sessionControl: null,
        syncRevision: 0
      }
    }));
  }

  async function joinRoom(roomId, options = {}) {
    const nextRoomId = sanitizeRoomId(roomId);
    if (!nextRoomId || !isValidRoomCode(nextRoomId)) {
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
        draftRoomId: nextRoomId,
        joinCode: options.clearJoinCode ? "" : state.room.joinCode
      },
      ui: {
        ...state.ui,
        roomBoard: "room"
      }
    }));

    leaderboards.startRoom(nextRoomId);
    await startPresence();

    if (options.fromUrl) {
      clearRoomIdFromUrl();
      feedback.setBanner(`Joined Room: ${nextRoomId}`, "success", 4000);
    } else if (options.announce !== false) {
      feedback.notify({
        type: "success",
        title: "Room joined",
        message: `You are now in room ${nextRoomId}.`
      });
    }
  }

  async function joinRoomByCode(roomCode) {
    const normalized = sanitizeRoomId(roomCode);
    if (!normalized || !isValidRoomCode(normalized)) {
      feedback.notify({
        type: "warning",
        title: "Invalid code",
        message: "Room codes can use letters, numbers, and hyphens only."
      });
      return;
    }

    await joinRoom(normalized, { announce: false, clearJoinCode: true });
    feedback.setBanner(`Joined Room: ${normalized}`, "success", 4000);
  }

  async function createRoom() {
    const rawRoomName = store.getState().room.draftRoomId.trim();
    const typedRoomId = sanitizeRoomId(rawRoomName);
    const roomId = typedRoomId || createRoomId();

    if (rawRoomName && (!typedRoomId || !isValidRoomCode(typedRoomId))) {
      feedback.notify({
        type: "warning",
        title: "Invalid room name",
        message: "Use only letters, numbers, and hyphens for room names."
      });
      return;
    }

    await joinRoom(roomId, { announce: false });
    feedback.notify({
      type: "success",
      title: "Room created",
      message: typedRoomId
        ? `Room ${roomId} is ready to use.`
        : "A fresh room has been created and linked to this workspace."
    });
  }

  async function leaveRoom() {
    const state = store.getState();
    const roomId = state.room.currentRoomId;
    if (!roomId) {
      feedback.notify({
        type: "warning",
        title: "No active room",
        message: "Join a room before trying to leave it."
      });
      return;
    }

    await stopPresence();
    writeRoomIdToUrl("");

    store.setState((nextState) => ({
      ...nextState,
      room: {
        ...nextState.room,
        mode: "solo",
        currentRoomId: "",
        participants: [],
        activeCount: 0,
        ownerUid: "",
        ownerName: "",
        sessionControl: null,
        syncRevision: 0
      },
      ui: {
        ...nextState.ui,
        roomBoard: "global"
      }
    }));

    leaderboards.startRoom("");

    const leaverName = state.auth.user?.displayName || state.auth.user?.email || "A participant";
    feedback.notify({
      type: "success",
      title: "Room updated",
      message: `${leaverName} has left the room.`
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
      feedback.notify({ type: "success", title: "Invite copied", message: `Room link for ${roomId} copied to your clipboard.` });
    } catch (error) {
      feedback.notify({ type: "error", title: "Clipboard blocked", message: getRoomInviteUrl(roomId) });
    }
  }

  async function copyRoomCode() {
    const roomId = store.getState().room.currentRoomId || sanitizeRoomId(store.getState().room.draftRoomId);
    if (!roomId) {
      feedback.notify({ type: "warning", title: "No code available", message: "Type or join a room before copying the code." });
      return;
    }

    try {
      await navigator.clipboard.writeText(roomId);
      feedback.notify({ type: "success", title: "Code copied", message: "Room code copied!" });
    } catch (error) {
      feedback.notify({ type: "error", title: "Copy failed", message: roomId });
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

    const draftRoomId = store.getState().room.draftRoomId;

    if (mode === "solo") {
      await stopPresence();
      writeRoomIdToUrl("");
      store.setState((state) => ({
        ...state,
        room: {
          ...state.room,
          mode: "solo",
          currentRoomId: "",
          draftRoomId,
          participants: [],
          activeCount: 0,
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
        mode: "room",
        draftRoomId
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
    const roomId = URL_ROOM_ID || getRoomIdFromUrl();
    if (roomId) {
      await joinRoom(roomId, { announce: false, fromUrl: true });
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
    syncJoinCode,
    setMode,
    joinRoom,
    joinRoomByCode,
    createRoom,
    leaveRoom,
    copyInvite,
    copyRoomCode,
    hydrateFromUrl,
    startPresence,
    stopPresence,
    updatePresence,
    publishTimerStart,
    publishTimerStop
  };
}
