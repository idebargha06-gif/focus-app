export function createAppTemplate() {
  return `
    <div class="ff-app">
      <div class="ambient ambient-a"></div>
      <div class="ambient ambient-b"></div>
      <div class="ambient ambient-c"></div>

      <div id="authLoader" class="auth-loader">
        <div class="auth-loader__card">
          <div class="auth-loader__mark">FF</div>
          <div class="auth-loader__ring"></div>
          <p>Preparing your workspace...</p>
        </div>
      </div>

      <div id="toastStack" class="toast-stack" aria-live="polite" aria-atomic="true"></div>

      <main class="shell">
        <section id="landingPage" class="page page--landing">
          <header class="topbar">
            <button class="brand brand--button" data-action="go-landing" type="button">
              <span class="brand__mark">FF</span>
              <span class="brand__text">FocusFlow</span>
            </button>

            <nav class="topbar__nav">
              <a href="#features">Features</a>
              <a href="#how-it-works">How it works</a>
              <a href="#live-board">Leaderboard</a>
            </nav>

            <div class="topbar__actions">
              <button id="navAppButton" class="button button--ghost" data-action="go-app" type="button">Open workspace</button>
              <button id="landingSignInButton" class="button button--primary" data-action="sign-in" type="button">Sign in with Google</button>
              <button id="landingUserButton" class="user-chip" data-action="go-app" type="button" hidden>
                <span id="landingUserAvatar" class="avatar avatar--small"></span>
                <span id="landingUserName">Workspace</span>
              </button>
            </div>
          </header>

          <section id="landingLoggedOut" class="hero hero--marketing">
            <div class="hero__copy">
              <p class="eyebrow">Measured focus for ambitious work</p>
              <h1 class="hero__title">A focus ritual with live momentum, ambient depth, and meaningful progress.</h1>
              <p class="hero__body">
                FocusFlow combines timed sessions, live rooms, leaderboards, streaks, and distraction-aware scoring
                in a calmer workspace that helps the work itself stay central.
              </p>
              <div class="hero__actions">
                <button class="button button--primary" data-action="sign-in" type="button">Start with Google</button>
                <button class="button button--ghost" data-action="scroll-live-board" type="button">See live board</button>
              </div>
              <div class="hero__metrics">
                <div class="metric">
                  <span id="publicMinutesMetric" class="metric__value">-</span>
                  <span class="metric__label">minutes focused</span>
                </div>
                <div class="metric">
                  <span id="publicSessionMetric" class="metric__value">-</span>
                  <span class="metric__label">sessions completed</span>
                </div>
                <div class="metric">
                  <span id="publicUserMetric" class="metric__value">-</span>
                  <span class="metric__label">active accounts</span>
                </div>
              </div>
            </div>

            <div class="hero__preview card">
              <p class="preview__label">Focus preview</p>
              <div class="preview__ring">
                <svg viewBox="0 0 200 200" class="preview__ring-svg" aria-hidden="true">
                  <circle class="preview__ring-track" cx="100" cy="100" r="88"></circle>
                  <circle class="preview__ring-progress" cx="100" cy="100" r="88"></circle>
                </svg>
                <div class="preview__ring-value">25:00</div>
              </div>
              <div class="preview__items">
                <div class="preview__item">
                  <span class="preview__item-label">Mode</span>
                  <strong>Deep work</strong>
                </div>
                <div class="preview__item">
                  <span class="preview__item-label">Signals</span>
                  <strong>Rooms, streaks, live score</strong>
                </div>
                <div class="preview__item">
                  <span class="preview__item-label">Atmosphere</span>
                  <strong>Locally hosted ambient sound</strong>
                </div>
              </div>
            </div>
          </section>

          <section id="landingLoggedIn" class="hero hero--member" hidden>
            <div class="hero__copy">
              <p class="eyebrow">Welcome back</p>
              <h1 class="hero__title">Your next clean session is one click away.</h1>
              <p id="landingMemberMessage" class="hero__body">Your recent progress is ready. Step back into the workspace when you are.</p>
              <div class="hero__actions">
                <button class="button button--primary" data-action="go-app" type="button">Resume workspace</button>
                <button class="button button--ghost" data-action="scroll-live-board" type="button">See leaderboard</button>
              </div>
            </div>
            <div class="member-summary card">
              <div class="member-summary__header">
                <span class="member-summary__eyebrow">Today</span>
                <strong id="landingGoalProgress">0 / 60 min</strong>
              </div>
              <div class="progress-bar">
                <div id="landingGoalFill" class="progress-bar__fill"></div>
              </div>
              <div class="member-summary__grid">
                <div class="metric-card">
                  <span class="metric-card__label">Minutes</span>
                  <strong id="landingTodayMinutes">0</strong>
                </div>
                <div class="metric-card">
                  <span class="metric-card__label">Sessions</span>
                  <strong id="landingSessionCount">0</strong>
                </div>
                <div class="metric-card">
                  <span class="metric-card__label">Level</span>
                  <strong id="landingLevelName">Beginner</strong>
                </div>
                <div class="metric-card">
                  <span class="metric-card__label">Score</span>
                  <strong id="landingTotalScore">0</strong>
                </div>
              </div>
            </div>
          </section>

          <section id="features" class="section-grid">
            <article class="feature-card">
              <p class="eyebrow">Timer system</p>
              <h2>Pomodoro, custom sessions, and clean visual feedback.</h2>
              <p>Move between quick blocks, deep sessions, and longer custom runs without losing the feeling of a calm workspace.</p>
            </article>
            <article class="feature-card">
              <p class="eyebrow">Live competition</p>
              <h2>Room invites, global standings, and meaningful score updates.</h2>
              <p>Compete with friends in small rooms or keep an eye on the broader board without breaking concentration.</p>
            </article>
            <article class="feature-card">
              <p class="eyebrow">Ambient support</p>
              <h2>Locally hosted sound, distraction logging, streaks, and badges.</h2>
              <p>Everything reinforces habit-building without turning the interface into a game board first and a focus tool second.</p>
            </article>
          </section>

          <section id="how-it-works" class="section-steps">
            <div class="section-heading">
              <p class="eyebrow">How it works</p>
              <h2>Three simple steps, then stay with the work.</h2>
            </div>
            <div class="steps">
              <article class="step-card">
                <span class="step-card__index">01</span>
                <h3>Authenticate once</h3>
                <p>Sign in with Google and pick up your history, score, streak, and room presence instantly.</p>
              </article>
              <article class="step-card">
                <span class="step-card__index">02</span>
                <h3>Choose the shape of the session</h3>
                <p>Select a duration, mode, and optional room. Add a goal so the timer starts with intent.</p>
              </article>
              <article class="step-card">
                <span class="step-card__index">03</span>
                <h3>Focus and review</h3>
                <p>Let the session run, track distractions, then keep the result across history, leaderboards, and streaks.</p>
              </article>
            </div>
          </section>

          <section id="live-board" class="section-live-board">
            <div class="section-heading">
              <p class="eyebrow">Live board</p>
              <h2>Global standings update in real time.</h2>
            </div>
            <div class="card">
              <ul id="landingLeaderboard" class="board-list board-list--landing"></ul>
            </div>
          </section>
        </section>

        <section id="mainApp" class="page page--app" hidden>
          <header class="workspace-bar">
            <button class="brand brand--button" data-action="go-landing" type="button">
              <span class="brand__mark">FF</span>
              <span class="brand__text">FocusFlow</span>
            </button>

            <div class="workspace-bar__center">
              <div class="segmented-control">
                <button class="segmented-control__button" data-action="set-mode" data-mode="solo" type="button">Solo</button>
                <button class="segmented-control__button" data-action="set-mode" data-mode="room" type="button">Room</button>
              </div>
            </div>

            <div class="workspace-bar__actions">
              <button class="icon-button" data-action="toggle-theme" type="button" aria-label="Toggle theme">
                <span id="themeButtonLabel">Theme</span>
              </button>
              <button id="profileButton" class="profile-button" data-action="toggle-profile" type="button">
                <span id="profileAvatar" class="avatar avatar--small"></span>
                <span class="profile-button__meta">
                  <span id="profileButtonName">Workspace</span>
                  <small id="profileButtonStreak">0 day streak</small>
                </span>
              </button>
            </div>
          </header>

          <div id="workspaceBanner" class="workspace-banner" hidden></div>
          <p id="quoteBar" class="quote-bar"></p>

          <div class="workspace-grid">
            <section class="focus-column">
              <div class="card focus-card">
                <div class="focus-card__header">
                  <div>
                    <p class="eyebrow">Current block</p>
                    <h2>Design the session, then disappear into it.</h2>
                  </div>
                  <div class="goal-chip">
                    <span>Today</span>
                    <strong id="dailyGoalLabel">0 / 60 min</strong>
                  </div>
                </div>

                <div class="progress-bar progress-bar--soft">
                  <div id="dailyGoalFill" class="progress-bar__fill"></div>
                </div>

                <label class="field">
                  <span class="field__label">What are you working on?</span>
                  <input id="focusGoalInput" class="field__input" type="text" placeholder="Finish the deck, ship the build, draft the proposal...">
                </label>

                <div class="session-layout">
                  <div class="session-layout__left">
                    <div class="button-row button-row--compact">
                      <button class="button button--ghost button--small" data-action="set-session-mode" data-session-mode="normal" type="button">Study</button>
                      <button class="button button--ghost button--small" data-action="set-session-mode" data-session-mode="deep" type="button">Deep</button>
                      <button class="button button--ghost button--small" data-action="set-session-mode" data-session-mode="sprint" type="button">Sprint</button>
                    </div>
                    <p id="sessionModeDescription" class="support-text"></p>

                    <div id="roomPanel" class="room-panel" hidden>
                      <div class="room-panel__inputs">
                        <label class="field">
                          <span class="field__label">Room code</span>
                          <input id="roomCodeInput" class="field__input field__input--mono" type="text" placeholder="AB12CD" maxlength="12">
                        </label>
                        <div class="button-row button-row--compact">
                          <button class="button button--secondary button--small" data-action="join-room" type="button">Join room</button>
                          <button class="button button--ghost button--small" data-action="create-room" type="button">Create room</button>
                          <button class="button button--ghost button--small" data-action="copy-invite" type="button">Copy invite</button>
                        </div>
                      </div>

                      <div class="room-panel__meta">
                        <div class="room-panel__meta-item">
                          <span class="room-panel__label">Active room</span>
                          <strong id="activeRoomLabel">None</strong>
                        </div>
                        <div class="room-panel__meta-item">
                          <span class="room-panel__label">Presence</span>
                          <strong id="roomPresenceCount">0 people</strong>
                        </div>
                      </div>

                      <div id="roomPresenceList" class="participant-list"></div>
                    </div>
                  </div>

                  <div class="session-layout__right">
                    <div id="timerRing" class="timer-ring">
                      <svg viewBox="0 0 200 200" class="timer-ring__svg" aria-hidden="true">
                        <defs>
                          <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="var(--accent-strong)"></stop>
                            <stop offset="100%" stop-color="var(--accent-soft)"></stop>
                          </linearGradient>
                          <linearGradient id="timerDangerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#c65a42"></stop>
                            <stop offset="100%" stop-color="#f2ae72"></stop>
                          </linearGradient>
                        </defs>
                        <circle class="timer-ring__track" cx="100" cy="100" r="88"></circle>
                        <circle id="timerProgress" class="timer-ring__progress" cx="100" cy="100" r="88"></circle>
                      </svg>
                      <div class="timer-ring__content">
                        <span id="timerPhaseLabel" class="timer-ring__phase">Ready</span>
                        <strong id="timerValue" class="timer-ring__value">25:00</strong>
                        <span id="timerPercentLabel" class="timer-ring__percent">100%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="button-row button-row--durations">
                  <button class="button button--ghost button--small" data-action="set-duration" data-duration="300" type="button">5m</button>
                  <button class="button button--ghost button--small" data-action="set-duration" data-duration="600" type="button">10m</button>
                  <button class="button button--ghost button--small" data-action="set-duration" data-duration="1500" type="button">25m</button>
                  <button class="button button--ghost button--small" data-action="set-duration" data-duration="3600" type="button">1h</button>
                  <button class="button button--ghost button--small" data-action="set-duration" data-duration="7200" type="button">2h</button>
                  <button class="button button--ghost button--small" data-action="set-duration" data-duration="10800" type="button">3h</button>
                  <button class="button button--ghost button--small" data-action="toggle-custom-duration" type="button">Custom</button>
                </div>

                <div id="customDurationPanel" class="inline-panel" hidden>
                  <label class="field field--inline">
                    <span class="field__label">Minutes</span>
                    <input id="customMinutesInput" class="field__input field__input--mono" type="number" min="1" max="480" placeholder="90">
                  </label>
                  <button class="button button--secondary button--small" data-action="apply-custom-duration" type="button">Apply</button>
                </div>

                <div class="button-row">
                  <button id="pomodoroButton" class="button button--ghost" data-action="toggle-pomodoro" type="button">Pomodoro</button>
                  <button id="startButton" class="button button--primary" data-action="start-session" type="button">Start session</button>
                  <button class="button button--secondary" data-action="stop-session" type="button">Stop session</button>
                </div>

                <div class="meta-grid">
                  <article class="meta-card">
                    <span class="meta-card__label">Scoring</span>
                    <strong id="scoreRuleLabel">+1 point per second</strong>
                    <p id="scorePenaltyLabel" class="meta-card__body"></p>
                  </article>
                  <article class="meta-card">
                    <span class="meta-card__label">Ambient sound</span>
                    <strong id="ambientTrackLabel">No track selected</strong>
                    <div class="sound-grid">
                      <button class="sound-chip" data-action="toggle-sound" data-sound="lofi" type="button">Lofi</button>
                      <button class="sound-chip" data-action="toggle-sound" data-sound="rain" type="button">Rain</button>
                      <button class="sound-chip" data-action="toggle-sound" data-sound="cafe" type="button">Cafe</button>
                      <button class="sound-chip" data-action="toggle-sound" data-sound="forest" type="button">Forest</button>
                      <button class="sound-chip" data-action="toggle-sound" data-sound="white" type="button">White noise</button>
                    </div>
                    <label class="range-field">
                      <span>Volume</span>
                      <input id="volumeInput" type="range" min="0" max="100" value="40">
                    </label>
                  </article>
                </div>

                <section id="sessionSummary" class="summary-panel" hidden>
                  <div class="summary-panel__header">
                    <div>
                      <p class="eyebrow">Session summary</p>
                      <h3 id="summaryHeadline">Session complete</h3>
                    </div>
                    <span id="saveStateBadge" class="status-badge">Idle</span>
                  </div>

                  <div class="summary-panel__stats">
                    <div class="metric-card">
                      <span class="metric-card__label">Time</span>
                      <strong id="summaryTimeValue">00:00</strong>
                    </div>
                    <div class="metric-card">
                      <span class="metric-card__label">Distractions</span>
                      <strong id="summaryDistractionValue">0</strong>
                    </div>
                    <div class="metric-card">
                      <span class="metric-card__label">Score</span>
                      <strong id="summaryScoreValue">0</strong>
                    </div>
                    <div class="metric-card">
                      <span class="metric-card__label">Focus</span>
                      <strong id="summaryFocusValue">100%</strong>
                    </div>
                  </div>

                  <p id="sessionFeedback" class="summary-panel__feedback"></p>
                  <div id="distractionLog" class="log-list"></div>

                  <div class="button-row button-row--compact">
                    <button class="button button--ghost button--small" data-action="share-session" type="button">Share result</button>
                  </div>
                </section>
              </div>
            </section>

            <aside class="side-column">
              <section class="card side-card">
                <div class="section-heading section-heading--compact">
                  <div>
                    <p class="eyebrow">Progress</p>
                    <h3>Your account signal</h3>
                  </div>
                  <button class="text-button" data-action="toggle-section" data-section="progress" type="button">Hide</button>
                </div>
                <div id="progressSection">
                  <div class="metric-grid">
                    <div class="metric-card">
                      <span class="metric-card__label">Streak</span>
                      <strong id="statsStreakValue">0</strong>
                    </div>
                    <div class="metric-card">
                      <span class="metric-card__label">Sessions</span>
                      <strong id="statsSessionValue">0</strong>
                    </div>
                    <div class="metric-card">
                      <span class="metric-card__label">Hours</span>
                      <strong id="statsHoursValue">0.0h</strong>
                    </div>
                    <div class="metric-card">
                      <span class="metric-card__label">Level</span>
                      <strong id="statsLevelValue">Beginner</strong>
                    </div>
                  </div>

                  <div class="xp-block">
                    <div class="xp-block__labels">
                      <span id="xpCurrentLabel">0 min</span>
                      <span id="xpNextLabel">Next: 60 min</span>
                    </div>
                    <div class="progress-bar progress-bar--soft">
                      <div id="xpFill" class="progress-bar__fill"></div>
                    </div>
                  </div>

                  <div class="badge-block">
                    <div class="badge-block__header">
                      <span>Badges</span>
                      <strong id="badgeCountLabel">0 / 13</strong>
                    </div>
                    <div id="badgeList" class="badge-list"></div>
                  </div>

                  <div class="calendar-block">
                    <button class="text-button text-button--wide" data-action="toggle-section" data-section="calendar" type="button">
                      <span>Activity calendar</span>
                      <span id="calendarMetaLabel">Best 0 days</span>
                    </button>
                    <div id="calendarSection" hidden>
                      <div id="calendarGrid" class="calendar-grid"></div>
                    </div>
                  </div>

                  <div class="chart-block">
                    <div class="chart-block__header">
                      <span>This week</span>
                      <strong id="weekConsistencyLabel">0% consistency</strong>
                    </div>
                    <div id="weekChart" class="week-chart"></div>
                  </div>
                </div>
              </section>

              <section class="card side-card">
                <div class="section-heading section-heading--compact">
                  <div>
                    <p class="eyebrow">History</p>
                    <h3>Recent sessions</h3>
                  </div>
                  <button class="text-button" data-action="toggle-section" data-section="history" type="button">Hide</button>
                </div>
                <div id="historySection">
                  <ul id="historyList" class="history-list"></ul>
                </div>
              </section>

              <section class="card side-card">
                <div class="section-heading section-heading--compact">
                  <div>
                    <p class="eyebrow">Leaderboard</p>
                    <h3>See where the focus is landing</h3>
                  </div>
                  <button class="text-button" data-action="toggle-section" data-section="leaderboard" type="button">Hide</button>
                </div>
                <div id="leaderboardSection">
                  <div class="segmented-control segmented-control--small">
                    <button class="segmented-control__button" data-action="switch-board" data-board="global" type="button">Global</button>
                    <button class="segmented-control__button" data-action="switch-board" data-board="room" type="button">Room</button>
                  </div>
                  <ul id="globalLeaderboard" class="board-list"></ul>
                  <ul id="roomLeaderboard" class="board-list" hidden></ul>
                </div>
              </section>
            </aside>
          </div>

          <div id="profilePanel" class="profile-panel" hidden>
            <div class="profile-panel__header">
              <div class="profile-panel__identity">
                <span id="profilePanelAvatar" class="avatar"></span>
                <div>
                  <strong id="profilePanelName">FocusFlow</strong>
                  <p id="profilePanelEmail" class="support-text"></p>
                </div>
              </div>
              <span id="profilePanelLevel" class="status-badge">Beginner</span>
            </div>

            <div class="profile-panel__stats">
              <div class="metric-card">
                <span class="metric-card__label">Streak</span>
                <strong id="profilePanelStreak">0</strong>
              </div>
              <div class="metric-card">
                <span class="metric-card__label">Sessions</span>
                <strong id="profilePanelSessions">0</strong>
              </div>
              <div class="metric-card">
                <span class="metric-card__label">Focus</span>
                <strong id="profilePanelHours">0.0h</strong>
              </div>
              <div class="metric-card">
                <span class="metric-card__label">Score</span>
                <strong id="profilePanelScore">0</strong>
              </div>
            </div>

            <div class="profile-panel__settings">
              <button class="setting-row" data-action="toggle-theme" type="button">
                <span>Theme</span>
                <strong id="profileThemeLabel">Dark</strong>
              </button>
              <button class="setting-row" data-action="toggle-notifications" type="button">
                <span>Notifications</span>
                <strong id="notificationLabel">On</strong>
              </button>
            </div>

            <button class="button button--secondary button--full" data-action="sign-out" type="button">Sign out</button>
          </div>
        </section>
      </main>

      <div id="distractionModal" class="modal" hidden>
        <div class="modal__surface">
          <p class="eyebrow">Attention shift</p>
          <h3>Focus was interrupted.</h3>
          <p id="distractionModalText" class="modal__body"></p>
          <div class="button-row button-row--compact">
            <button class="button button--primary button--small" data-action="close-distraction-modal" type="button">Back to session</button>
          </div>
        </div>
      </div>

      <div id="badgeModal" class="modal" hidden>
        <div class="modal__surface">
          <p class="eyebrow">Badge unlocked</p>
          <h3 id="badgeModalTitle">New badge</h3>
          <p id="badgeModalText" class="modal__body"></p>
          <div class="button-row button-row--compact">
            <button class="button button--primary button--small" data-action="close-badge-modal" type="button">Keep going</button>
          </div>
        </div>
      </div>
    </div>
  `;
}
