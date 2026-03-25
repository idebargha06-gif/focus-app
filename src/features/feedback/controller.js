let toastId = 0;

export function createFeedbackController({ store }) {
  const toastTimers = new Map();

  function notify({ type = "info", title, message, duration = 3200 }) {
    const id = `toast-${toastId += 1}`;
    store.setState((state) => ({
      ...state,
      ui: {
        ...state.ui,
        toasts: [...state.ui.toasts, { id, type, title, message }]
      }
    }));

    const timer = window.setTimeout(() => dismissToast(id), duration);
    toastTimers.set(id, timer);
    return id;
  }

  function dismissToast(id) {
    if (toastTimers.has(id)) {
      window.clearTimeout(toastTimers.get(id));
      toastTimers.delete(id);
    }

    store.setState((state) => ({
      ...state,
      ui: {
        ...state.ui,
        toasts: state.ui.toasts.filter((toast) => toast.id !== id)
      }
    }));
  }

  function setBanner(message = "") {
    store.setState((state) => ({
      ...state,
      ui: {
        ...state.ui,
        banner: message
      }
    }));
  }

  function showDistractionModal(message) {
    store.setState((state) => ({
      ...state,
      ui: {
        ...state.ui,
        distractionModal: { message }
      }
    }));
  }

  function hideDistractionModal() {
    store.setState((state) => ({
      ...state,
      ui: {
        ...state.ui,
        distractionModal: null
      }
    }));
  }

  function showBadgeModal(title, message) {
    store.setState((state) => ({
      ...state,
      ui: {
        ...state.ui,
        badgeModal: { title, message }
      }
    }));
  }

  function hideBadgeModal() {
    store.setState((state) => ({
      ...state,
      ui: {
        ...state.ui,
        badgeModal: null
      }
    }));
  }

  return {
    notify,
    dismissToast,
    setBanner,
    showDistractionModal,
    hideDistractionModal,
    showBadgeModal,
    hideBadgeModal
  };
}
