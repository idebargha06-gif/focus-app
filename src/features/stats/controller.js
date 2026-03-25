export function createStatsController({ store, repository }) {
  async function refreshWorkspace(uid) {
    const workspace = await repository.loadWorkspace(uid);

    store.setState((state) => ({
      ...state,
      stats: {
        ...state.stats,
        ...workspace.stats
      },
      history: workspace.history
    }));

    return workspace;
  }

  return {
    refreshWorkspace
  };
}
