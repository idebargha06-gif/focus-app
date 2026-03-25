export function createAuthController({
  store,
  repository,
  stats,
  leaderboards,
  rooms,
  profile,
  feedback
}) {
  let unsubscribeAuth = null;

  function openAppRoute() {
    store.setState((state) => ({
      ...state,
      route: {
        view: "app"
      }
    }));
  }

  function openLandingRoute() {
    store.setState((state) => ({
      ...state,
      route: {
        view: "landing"
      }
    }));
  }

  async function handleSignedIn(user) {
    store.setState((state) => ({
      ...state,
      auth: {
        user,
        loading: false
      }
    }));

    openAppRoute();
    await stats.refreshWorkspace(user.uid);
    leaderboards.startGlobal();
    await leaderboards.refreshPublicStats();
    await rooms.hydrateFromUrl();
  }

  async function handleSignedOut() {
    await rooms.stopPresence();
    profile.closeProfile();

    store.setState((state) => ({
      ...state,
      auth: {
        user: null,
        loading: false
      },
      stats: {
        ...state.stats,
        totalScore: 0,
        totalSessions: 0,
        totalMinutes: 0,
        streak: 0,
        longestStreak: 0,
        weekData: [0, 0, 0, 0, 0, 0, 0],
        todayMinutes: 0,
        lastDistractions: 0,
        lastSessionDay: null,
        nightSession: false,
        badges: [],
        activityDays: []
      },
      history: [],
      session: {
        ...state.session,
        lastResult: null,
        saveState: "idle"
      },
      leaderboards: {
        ...state.leaderboards,
        room: []
      }
    }));

    openLandingRoute();
    leaderboards.startGlobal();
    await leaderboards.refreshPublicStats();
  }

  function init() {
    unsubscribeAuth = repository.subscribeAuth((user) => {
      if (user) {
        handleSignedIn(user).catch(() => {
          feedback.notify({
            type: "error",
            title: "Workspace load failed",
            message: "Auth succeeded, but some saved data could not be loaded."
          });
        });
        return;
      }

      handleSignedOut().catch(() => {});
    });
  }

  async function signIn() {
    try {
      await repository.signInWithGoogle();
    } catch (error) {
      if (error?.code === "auth/popup-closed-by-user") {
        return;
      }

      feedback.notify({
        type: "error",
        title: "Sign-in failed",
        message: error?.message || "The Google sign-in flow could not complete."
      });
    }
  }

  async function signOut() {
    if (store.getState().timer.running) {
      feedback.notify({
        type: "warning",
        title: "Session still running",
        message: "Stop the current session before signing out."
      });
      return;
    }

    await rooms.stopPresence();
    await repository.signOutUser();
  }

  function destroy() {
    unsubscribeAuth?.();
  }

  return {
    init,
    signIn,
    signOut,
    openAppRoute,
    openLandingRoute,
    destroy
  };
}
