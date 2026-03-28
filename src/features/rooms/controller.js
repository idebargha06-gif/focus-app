import { ROOM_HEARTBEAT_MS, ROOM_PRESENCE_TTL_MS } from "../../utils/constants.js";
import {
  clearRoomIdFromUrl,
  createRoomId,
  createRoomName,
  getRoomInviteUrl,
  getRoomIdFromUrl,
  isValidRoomCode,
  sanitizeRoomId,
  sanitizeRoomName,
  URL_ROOM_ID,
  writeRoomIdToUrl
} from "../../utils/room.js";

export function createRoomsController({ store, repository, feedback, leaderboards }) {
  let presenceUnsubscribe = null;
  let roomUnsubscribe = null;
  let heartbeatId = null;
  let unloadBound = false;
  let previousPresenceByUid = new Map();
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
        currentRoomName: roomData.roomName || state.room.currentRoomName,
        sessionControl: roomData.sessionControl || null
      }
    }));
  }

  async function subscribeRoomState(roomId) {
    roomUnsubscribe?.();
    roomUnsubscribe = null;

    if (!roomId) {
      updateRoomMeta({ ownerUid: "", ownerName: "", roomName: "", sessionControl: null });
      return;
    }

    const roomData = await repository.ensureRoom({
      roomId,
      user: store.getState().auth.user,
      createIfMissing: false
    });
    if (roomData) {
      updateRoomMeta(roomData);
    }

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
          currentRoomName: nextRoom.roomName || current.room.currentRoomName,
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

  function syncRoomDraft(roomName) {
    const nextRoomName = sanitizeRoomName(roomName);
    store.setState((state) => ({
      ...state,
      room: {
        ...state.room,
        draftRoomName: nextRoomName
      }
    }));
  }

  function syncJoinCode(value) {
    const nextCode = sanitizeRoomId(value);
    store.setState((state) => ({
      ...state,
      room: {
        ...state.room,
        joinCode: nextCode
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

  function notifyOwnerOnDepartures(participants) {
    const state = store.getState();
    const currentUserId = state.auth.user?.uid || "";
    if (!currentUserId || state.room.ownerUid !== currentUserId) {
      previousPresenceByUid = new Map(participants.map((participant) => [participant.uid, participant]));
      return;
    }

    const nextPresenceByUid = new Map(participants.map((participant) => [participant.uid, participant]));

    previousPresenceByUid.forEach((previousParticipant, uid) => {
      if (uid === currentUserId) {
        return;
      }

      const nextParticipant = nextPresenceByUid.get(uid);
      const justLeft = previousParticipant.active !== false
        && !previousParticipant.leftAt
        && (
          !nextParticipant
          || nextParticipant.active === false
          || Boolean(nextParticipant.leftAt)
        );

      if (justLeft) {
        feedback.notify({
          type: "warning",
          title: "Participant left",
          message: `${previousParticipant.name} left room ${state.room.currentRoomId}.`
        });
      }
    });

    previousPresenceByUid = nextPresenceByUid;
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
    previousPresenceByUid = new Map();
    presenceUnsubscribe?.();
    presenceUnsubscribe = repository.subscribeOwnerRoomPresence(state.room.currentRoomId, (participants) => {
      notifyOwnerOnDepartures(participants);
      const now = Date.now();
      const activeParticipants = participants
        .filter((participant) => participant.active && !participant.leftAt && now - participant.lastSeenAt <= ROOM_PRESENCE_TTL_MS)
        .sort((left, right) => left.name.localeCompare(right.name));

      store.setState((nextState) => ({
        ...nextState,
        room: {
          ...nextState.room,
          participants: activeParticipants,
          activeCount: activeParticipants.length
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
    previousPresenceByUid = new Map();

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
        currentRoomName: "",
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
        message: "Enter a valid 8-character room code before joining."
      });
      return;
    }

    const roomData = await repository.ensureRoom({
      roomId: nextRoomId,
      user: store.getState().auth.user,
      roomName: options.roomName || "",
      createIfMissing: options.createIfMissing !== false
    });

    if (!roomData) {
      feedback.notify({
        type: "warning",
        title: "Room not found",
        message: `No room found with code ${nextRoomId}.`
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
        currentRoomName: roomData.roomName || nextRoomId,
        draftRoomName: options.keepDraft ? state.room.draftRoomName : "",
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
      feedback.setBanner(`Joined Room: ${roomData.roomName || nextRoomId} (${nextRoomId})`, "success", 4000);
    } else if (options.announce !== false) {
      feedback.notify({
        type: "success",
        title: "Room joined",
        message: `You are now in ${roomData.roomName || "this room"} (${nextRoomId}).`
      });
    }
  }

  async function joinRoomByCode(roomCode) {
    const normalized = sanitizeRoomId(roomCode);
    if (!normalized || !isValidRoomCode(normalized)) {
      feedback.notify({
        type: "warning",
        title: "Invalid code",
        message: "Room codes use exactly 8 letters/numbers."
      });
      return;
    }

    await joinRoom(normalized, { announce: false, clearJoinCode: true, createIfMissing: false });
    if (store.getState().room.currentRoomId === normalized) {
      feedback.setBanner(`Joined Room Code: ${normalized}`, "success", 4000);
    }
  }

  async function createRoom() {
    const state = store.getState();
    const rawRoomName = state.room.draftRoomName.trim();
    const roomName = sanitizeRoomName(rawRoomName) || createRoomName();

    let roomId = "";
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const candidate = createRoomId();
      const existingRoom = await repository.getRoom(candidate);
      if (!existingRoom) {
        roomId = candidate;
        break;
      }
    }

    if (!roomId) {
      feedback.notify({
        type: "error",
        title: "Room creation failed",
        message: "Could not reserve a unique room code. Try again."
      });
      return;
    }

    await joinRoom(roomId, {
      announce: false,
      roomName,
      createIfMissing: true,
      clearJoinCode: true,
      keepDraft: false
    });

    feedback.notify({
      type: "success",
      title: "Room created",
      message: `${roomName} is ready. Share code ${roomId} to invite others.`
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
        currentRoomName: "",
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

    feedback.notify({
      type: "success",
      title: "Room updated",
      message: "You left the room."
    });
  }

  async function copyInvite() {
    const roomId = store.getState().room.currentRoomId;
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
    const roomId = store.getState().room.currentRoomId;
    if (!roomId) {
      feedback.notify({ type: "warning", title: "No code available", message: "Create or join a room before copying the code." });
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

    const draftRoomName = store.getState().room.draftRoomName;

    if (mode === "solo") {
      await stopPresence();
      writeRoomIdToUrl("");
      store.setState((state) => ({
        ...state,
        room: {
          ...state.room,
          mode: "solo",
          currentRoomId: "",
          currentRoomName: "",
          draftRoomName,
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
        draftRoomName
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
      await joinRoom(roomId, { announce: false, fromUrl: true, createIfMissing: false });
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
        startedAt: timerState.startedAt || Date.now(),
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

