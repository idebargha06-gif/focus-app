import { ROOM_HEARTBEAT_MS } from "../../utils/constants.js";
import { createRoomId, getRoomInviteUrl, getRoomIdFromUrl, sanitizeRoomId, writeRoomIdToUrl } from "../../utils/room.js";

export function createRoomsController({ store, repository, feedback, leaderboards }) {
  let presenceUnsubscribe = null;
  let heartbeatId = null;

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
  }

  async function stopPresence() {
    const state = store.getState();
    if (heartbeatId) {
      window.clearInterval(heartbeatId);
      heartbeatId = null;
    }
    presenceUnsubscribe?.();
    presenceUnsubscribe = null;
    if (state.auth.user && state.room.currentRoomId) {
      await repository.removeRoomPresence(state.room.currentRoomId, state.auth.user.uid).catch(() => {});
    }
    store.setState((nextState) => ({
      ...nextState,
      room: {
        ...nextState.room,
        participants: []
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
          participants: []
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

  return {
    syncRoomDraft,
    setMode,
    joinRoom,
    createRoom,
    copyInvite,
    hydrateFromUrl,
    startPresence,
    stopPresence
  };
}
