class AmbientPlayer {
  constructor(onStateChange) {
    this.onStateChange = onStateChange;
    this.category = "";
    this.index = 0;
    this.audio = null;
    this.volume = 0.4;
    this.busy = false;
  }

  getTrackUrl(category, index) {
    return `/sounds/${category}/${category}${index}.mp3`;
  }

  getNextIndex() {
    const next = Math.floor(Math.random() * 5) + 1;
    if (next === this.index) {
      return (next % 5) + 1;
    }
    return next;
  }

  sync() {
    this.onStateChange({
      playing: Boolean(this.category),
      trackLabel: this.category ? `${this.category} ${this.index}` : ""
    });
  }

  play(category) {
    this.stop(false);
    this.category = category;
    this.index = this.getNextIndex();
    this.busy = false;
    this.start(this.getTrackUrl(category, this.index));
    this.sync();
  }

  start(url) {
    const audio = new Audio(url);
    audio.preload = "none";
    audio.volume = this.volume;
    this.audio = audio;

    audio.onended = () => {
      if (!this.category) {
        return;
      }
      this.index = this.getNextIndex();
      this.start(this.getTrackUrl(this.category, this.index));
      this.sync();
    };

    audio.onerror = () => {
      if (this.busy) {
        return;
      }
      this.busy = true;
      this.index = this.getNextIndex();
      window.setTimeout(() => {
        if (this.category) {
          this.start(this.getTrackUrl(this.category, this.index));
          this.sync();
        }
      }, 250);
    };

    audio.play().catch(() => {});
  }

  stop(sync = true) {
    this.category = "";
    if (this.audio) {
      this.audio.pause();
      this.audio.src = "";
    }
    this.audio = null;
    if (sync) {
      this.sync();
    }
  }

  setVolume(value) {
    this.volume = value;
    if (this.audio) {
      this.audio.volume = value;
    }
  }

  playBell() {
    try {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.frequency.value = 880;
      oscillator.type = "sine";
      gain.gain.setValueAtTime(0.2, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 1.1);
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 1.1);
    } catch (error) {
      // Ignore audio API failures.
    }
  }
}

export function createAudioController({ store, feedback }) {
  const player = new AmbientPlayer(({ playing, trackLabel }) => {
    store.setState((state) => ({
      ...state,
      audio: {
        ...state.audio,
        playing,
        trackLabel
      }
    }));
  });

  player.setVolume(store.getState().audio.volume / 100);

  function toggleCategory(category) {
    const selected = store.getState().audio.selectedCategory;
    const nextCategory = selected === category ? "" : category;
    localStorage.setItem("ff_sound", nextCategory);

    store.setState((state) => ({
      ...state,
      audio: {
        ...state.audio,
        selectedCategory: nextCategory
      }
    }));

    if (!nextCategory) {
      player.stop();
      return;
    }

    if (store.getState().timer.running) {
      player.play(nextCategory);
    } else {
      feedback.notify({
        type: "info",
        title: "Sound selected",
        message: `${category} will start with the next session.`
      });
    }
  }

  function setVolume(value) {
    localStorage.setItem("ff_volume", String(value));
    player.setVolume(value / 100);
    store.setState((state) => ({
      ...state,
      audio: {
        ...state.audio,
        volume: value
      }
    }));
  }

  function handleSessionStart() {
    const category = store.getState().audio.selectedCategory;
    if (category) {
      player.play(category);
    }
  }

  function handleSessionStop() {
    player.stop();
  }

  return {
    toggleCategory,
    setVolume,
    handleSessionStart,
    handleSessionStop,
    playBell: () => player.playBell()
  };
}
