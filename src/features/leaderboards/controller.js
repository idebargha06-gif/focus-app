export function createLeaderboardsController({ store, repository }) {
  let landingUnsubscribe = null;
  let globalUnsubscribe = null;
  let roomUnsubscribe = null;

  async function refreshPublicStats() {
    const stats = await repository.fetchPublicStats();
    store.setState((state) => ({
      ...state,
      publicStats: stats
    }));
  }

  function startLanding() {
    if (landingUnsubscribe) {
      landingUnsubscribe();
    }

    landingUnsubscribe = repository.subscribeLandingLeaderboard((entries) => {
      store.setState((state) => ({
        ...state,
        leaderboards: {
          ...state.leaderboards,
          landing: entries
        }
      }));
    });
  }

  function startGlobal() {
    if (globalUnsubscribe) {
      globalUnsubscribe();
    }

    globalUnsubscribe = repository.subscribeGlobalLeaderboard((entries) => {
      store.setState((state) => ({
        ...state,
        leaderboards: {
          ...state.leaderboards,
          global: entries
        }
      }));
    });
  }

  function startRoom(roomId) {
    if (roomUnsubscribe) {
      roomUnsubscribe();
      roomUnsubscribe = null;
    }

    if (!roomId) {
      store.setState((state) => ({
        ...state,
        leaderboards: {
          ...state.leaderboards,
          room: []
        }
      }));
      return;
    }

    roomUnsubscribe = repository.subscribeRoomLeaderboard(roomId, (entries) => {
      store.setState((state) => ({
        ...state,
        leaderboards: {
          ...state.leaderboards,
          room: entries
        }
      }));
    });
  }

  function stopAll() {
    landingUnsubscribe?.();
    globalUnsubscribe?.();
    roomUnsubscribe?.();
    landingUnsubscribe = null;
    globalUnsubscribe = null;
    roomUnsubscribe = null;
  }

  return {
    refreshPublicStats,
    startLanding,
    startGlobal,
    startRoom,
    stopAll
  };
}
