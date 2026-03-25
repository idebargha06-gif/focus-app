export function createProfileController({ store }) {
  function toggleTheme() {
    store.setState((state) => {
      const nextTheme = state.ui.theme === "dark" ? "light" : "dark";
      localStorage.setItem("ff_theme", nextTheme);
      return {
        ...state,
        ui: {
          ...state.ui,
          theme: nextTheme
        }
      };
    });
  }

  function toggleNotifications() {
    store.setState((state) => {
      const nextValue = !state.ui.notificationsEnabled;
      localStorage.setItem("ff_notifications", nextValue ? "on" : "off");

      if (nextValue && "Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }

      return {
        ...state,
        ui: {
          ...state.ui,
          notificationsEnabled: nextValue
        }
      };
    });
  }

  function toggleProfile() {
    store.setState((state) => ({
      ...state,
      ui: {
        ...state.ui,
        profileOpen: !state.ui.profileOpen
      }
    }));
  }

  function closeProfile() {
    store.setState((state) => ({
      ...state,
      ui: {
        ...state.ui,
        profileOpen: false
      }
    }));
  }

  return {
    toggleTheme,
    toggleNotifications,
    toggleProfile,
    closeProfile
  };
}
