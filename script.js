const STORAGE_KEY_SETTINGS = "numberMemoryTrainerSettings";
const STORAGE_KEY_STATS = "numberMemoryTrainerStats";

const defaultSettings = {
  numberLength: "6",
  customLength: 6,
  displayDuration: 5,
  darkMode: false,
};

const defaultStats = {
  totalAttempts: 0,
  correctAttempts: 0,
  currentStreak: 0,
  bestStreak: 0,
};

const appContent = document.getElementById("appContent");
const darkModeToggle = document.getElementById("darkModeToggle");

let settings = loadSettings();
let stats = loadStats();
let activeTimer = null;
let currentNumber = "";
const FLASH_DURATION_MS = 700;
let flashOverlay = null;

function initApp() {
  applyDarkMode();
  bindHeaderActions();
  createFlashOverlay();
  renderHome();
}


// Announce short messages for screen readers
function announce(message) {
  const el = document.getElementById("announcer");
  if (!el) return;
  el.textContent = "";
  // small timeout to ensure assistive tech notices changes
  setTimeout(() => (el.textContent = message), 50);
}

function bindHeaderActions() {
  if (darkModeToggle) {
    darkModeToggle.setAttribute("aria-label", "Toggle dark mode");
    darkModeToggle.setAttribute("aria-pressed", settings.darkMode ? "true" : "false");
    darkModeToggle.addEventListener("click", () => {
      settings.darkMode = !settings.darkMode;
      saveSettings();
      applyDarkMode();
      announce(settings.darkMode ? "Dark mode enabled" : "Light mode enabled");
    });
  }
}

function applyDarkMode() {
  document.body.classList.toggle("dark", settings.darkMode);
  darkModeToggle.textContent = settings.darkMode ? "Light Mode" : "Dark Mode";
  darkModeToggle.setAttribute("aria-pressed", settings.darkMode ? "true" : "false");
}

function loadSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY_SETTINGS));
    return stored ? { ...defaultSettings, ...stored } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

function saveSettings() {
  localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
}

function loadStats() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY_STATS));
    return stored ? { ...defaultStats, ...stored } : defaultStats;
  } catch {
    return defaultStats;
  }
}

function saveStats() {
  localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
}

function renderHome() {
  clearActiveTimer();

  appContent.innerHTML = `
    <section class="screen-card">
      <h2 class="section-title">Start your training session</h2>
      <div class="action-grid">
        <button id="startTrainingBtn" class="primary-button" type="button">Start Training</button>
        <button id="showStatsBtn" class="secondary-button" type="button">Statistics</button>
        <button id="showSettingsBtn" class="secondary-button" type="button">Settings</button>
      </div>
    </section>

    <section class="screen-card">
      <h2 class="section-title">Quick progress</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <strong>${stats.totalAttempts}</strong>
          <span>Total attempts</span>
        </div>
        <div class="stat-card">
          <strong>${stats.correctAttempts}</strong>
          <span>Correct attempts</span>
        </div>
        <div class="stat-card">
          <strong>${formatAccuracy(stats)}%</strong>
          <span>Accuracy</span>
        </div>
      </div>
    </section>
  `;

  document.getElementById("startTrainingBtn").addEventListener("click", renderTraining);
  document.getElementById("showStatsBtn").addEventListener("click", renderStatistics);
  document.getElementById("showSettingsBtn").addEventListener("click", renderSettings);
  // focus the primary action for keyboard users
  const start = document.getElementById("startTrainingBtn");
  if (start) start.focus();
}

function renderSettings() {
  clearActiveTimer();

  appContent.innerHTML = `
    <section class="screen-card">
      <h2 class="section-title">Settings</h2>
      <div class="form-grid">
        <div class="field-group">
          <p id="lengthLabel"><strong>Number length</strong></p>
          <div role="radiogroup" aria-labelledby="lengthLabel" class="field-grid">
            ${renderNumberLengthOption("4")}
            ${renderNumberLengthOption("6")}
            ${renderNumberLengthOption("8")}
            ${renderNumberLengthOption("10")}
            ${renderNumberLengthOption("12")}
            ${renderNumberLengthOption("custom", "Custom length")}
          </div>
          <div id="customLengthRow" class="custom-row ${settings.numberLength !== "custom" ? "hidden" : ""}">
            <label for="customLengthInput">
              <span>Custom length</span>
            </label>
            <input id="customLengthInput" type="number" min="1" max="20" value="${settings.customLength}" />
            <p class="helper">Enter a number between 1 and 20 digits.</p>
          </div>
        </div>

        <div class="field-group">
          <p id="durationLabel"><strong>Display duration</strong></p>
          <div role="radiogroup" aria-labelledby="durationLabel" class="field-grid">
            ${renderDurationOption(3)}
            ${renderDurationOption(5)}
            ${renderDurationOption(10)}
            ${renderDurationOption(15)}
          </div>
        </div>

        <div class="button-row">
          <button id="saveSettingsBtn" class="primary-button" type="button">Save settings</button>
          <button id="backHomeBtn" class="tertiary-button" type="button">Back to home</button>
        </div>

        <p id="settingsMessage" class="helper" role="status" aria-live="polite"></p>
      </div>
    </section>
  `;

  document.querySelectorAll('input[name="length"]').forEach((radio) => {
    radio.addEventListener("change", handleLengthSelection);
  });

  document.querySelectorAll('input[name="duration"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      settings.displayDuration = Number(document.querySelector('input[name="duration"]:checked').value);
    });
  });

  const customInput = document.getElementById("customLengthInput");
  if (customInput) {
    customInput.addEventListener("input", () => {
      const v = Number(customInput.value);
      if (Number.isInteger(v) && v >= 1 && v <= 20) {
        settings.customLength = v;
      }
    });
  }

  document.getElementById("saveSettingsBtn").addEventListener("click", handleSaveSettings);
  document.getElementById("backHomeBtn").addEventListener("click", renderHome);

  // focus first option
  const first = document.querySelector('input[name="length"]');
  if (first) first.focus();
}

function renderNumberLengthOption(value, label = value) {
  const checked = settings.numberLength === value ? "checked" : "";
  return `
    <label>
      <input type="radio" name="length" value="${value}" ${checked} />
      <span>${label}</span>
    </label>
  `;
}

function renderDurationOption(value) {
  const checked = settings.displayDuration === value ? "checked" : "";
  return `
    <label>
      <input type="radio" name="duration" value="${value}" ${checked} />
      <span>${value}s</span>
    </label>
  `;
}

function handleLengthSelection(event) {
  const isCustom = event.target.value === "custom";
  const row = document.getElementById("customLengthRow");
  row.classList.toggle("hidden", !isCustom);

  settings.numberLength = event.target.value;
  if (isCustom) {
    const customInput = document.getElementById("customLengthInput");
    settings.customLength = Number(customInput.value) || 6;
  }
}

function handleSaveSettings() {
  const customInput = document.getElementById("customLengthInput");
  if (settings.numberLength === "custom") {
    const customValue = Number(customInput.value);
    if (!Number.isInteger(customValue) || customValue < 1 || customValue > 20) {
      showSettingsMessage("Custom length must be 1 to 20.", true);
      return;
    }
    settings.customLength = customValue;
  }

  saveSettings();
  showSettingsMessage("Settings saved successfully.");
  announce("Settings saved");
}

function showSettingsMessage(message, isError = false) {
  const messageElement = document.getElementById("settingsMessage");
  if (messageElement) {
    messageElement.textContent = message;
    messageElement.style.color = isError ? "#dc2626" : "var(--text)";
  }
}

function renderStatistics() {
  clearActiveTimer();

  appContent.innerHTML = `
    <section class="screen-card">
      <h2 class="section-title">Statistics</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <strong>${stats.totalAttempts}</strong>
          <span>Total attempts</span>
        </div>
        <div class="stat-card">
          <strong>${stats.correctAttempts}</strong>
          <span>Correct attempts</span>
        </div>
        <div class="stat-card">
          <strong>${formatAccuracy(stats)}%</strong>
          <span>Accuracy</span>
        </div>
        <div class="stat-card">
          <strong>${stats.currentStreak}</strong>
          <span>Current streak</span>
        </div>
        <div class="stat-card">
          <strong>${stats.bestStreak}</strong>
          <span>Best streak</span>
        </div>
      </div>

      <div class="button-row" style="margin-top: 24px;">
        <button id="resetStatsBtn" class="secondary-button" type="button">Reset statistics</button>
        <button id="homeFromStatsBtn" class="primary-button" type="button">Back to home</button>
      </div>
    </section>
  `;

  document.getElementById("resetStatsBtn").addEventListener("click", resetStatistics);
  document.getElementById("homeFromStatsBtn").addEventListener("click", renderHome);
}

function resetStatistics() {
  stats = { ...defaultStats };
  saveStats();
  renderStatistics();
  announce("Statistics reset");
}

function renderTraining() {
  clearActiveTimer();
  currentNumber = generateRandomNumber(getActiveLength());

  appContent.innerHTML = `
    <section class="screen-card training-card">
      <p class="training-label">Memorize this number</p>
      <div id="memorizeNumber" class="number-display">${currentNumber}</div>
      <div class="timer-pill" id="countdownLabel">${settings.displayDuration}s</div>
      <div class="button-row">
        <button id="stopTrainingBtn" class="secondary-button" type="button">Stop training</button>
      </div>
    </section>
  `;

  document.getElementById("stopTrainingBtn").addEventListener("click", renderHome);
  startCountdown(settings.displayDuration);
}

function startCountdown(seconds) {
  let remaining = seconds;
  const countdownLabel = document.getElementById("countdownLabel");

  activeTimer = setInterval(() => {
    remaining -= 1;
    if (countdownLabel) {
      countdownLabel.textContent = `${remaining}s`;
    }

    if (remaining <= 0) {
      clearActiveTimer();
      revealAnswerInput();
    }
  }, 1000);
}

function revealAnswerInput() {
  appContent.innerHTML = `
    <section class="screen-card training-card">
      <p class="training-label">Enter the number you saw</p>
      <div class="input-row">
        <input id="answerInput" class="training-input" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="20" placeholder="Type the number" aria-label="Enter the number you saw" />
      </div>
      <div class="button-row">
        <button id="submitAnswerBtn" class="primary-button" type="button">Check answer</button>
        <button id="skipBtn" class="tertiary-button" type="button" aria-label="Skip round">Skip</button>
        <button id="homeFromTrainingBtn" class="secondary-button" type="button">Back to home</button>
      </div>
    </section>
  `;

  const answerInput = document.getElementById("answerInput");
  answerInput.focus();

  document.getElementById("submitAnswerBtn").addEventListener("click", () => {
    validateAnswer(answerInput.value);
  });

  const skipEl = document.getElementById("skipBtn");
  if (skipEl) {
    skipEl.addEventListener("click", skipCurrent);
  }

  document.getElementById("homeFromTrainingBtn").addEventListener("click", renderHome);

  answerInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      validateAnswer(answerInput.value);
    }
  });
}

function validateAnswer(value) {
  const userAnswer = value.trim();
  const correct = userAnswer === currentNumber;
  updateStatistics(correct);
  // Show a brief full-screen flash before showing the result card
  showFlash(correct);
  setTimeout(() => renderResult(correct), FLASH_DURATION_MS);
}

function renderResult(correct) {
  appContent.innerHTML = `
    <section class="screen-card training-card">
      <div class="result-badge ${correct ? "result-correct" : "result-incorrect"}" role="status" aria-live="polite">
        ${correct ? "Correct!" : "Incorrect"}
      </div>
      <p class="training-label">Actual number</p>
      <div class="number-display">${currentNumber}</div>
      <div class="button-row">
        <button id="nextRoundBtn" class="primary-button" type="button">Next round</button>
        <button id="homeFromResultBtn" class="secondary-button" type="button">Back to home</button>
      </div>
    </section>
  `;
  document.getElementById("nextRoundBtn").addEventListener("click", renderTraining);
  document.getElementById("homeFromResultBtn").addEventListener("click", renderHome);

  // focus next round for quick flow
  const next = document.getElementById("nextRoundBtn");
  if (next) next.focus();
}

function createFlashOverlay() {
  if (flashOverlay) return;
  const existing = document.getElementById("flashOverlay");
  if (existing) {
    flashOverlay = existing;
    return;
  }
  const div = document.createElement("div");
  div.id = "flashOverlay";
  div.className = "flash-overlay";
  div.setAttribute("aria-hidden", "true");
  document.body.appendChild(div);
  flashOverlay = div;
}

function showFlash(correct, duration = FLASH_DURATION_MS) {
  if (!flashOverlay) createFlashOverlay();
  flashOverlay.classList.remove("flash-correct", "flash-incorrect");
  flashOverlay.classList.add(correct ? "flash-correct" : "flash-incorrect", "flash-show");
  // ensure it's visible for the duration, then hide
  setTimeout(() => {
    if (flashOverlay) flashOverlay.classList.remove("flash-show");
  }, duration);
  // Announce immediately for assistive tech
  announce(correct ? "Correct" : "Incorrect");
}

function skipCurrent() {
  clearActiveTimer();
  announce("Skipped — next number");
  // do not update statistics for a skip
  currentNumber = generateRandomNumber(getActiveLength());
  // small delay to allow the announcer to update
  setTimeout(() => renderTraining(), 120);
}

function updateStatistics(correct) {
  stats.totalAttempts += 1;
  if (correct) {
    stats.correctAttempts += 1;
    stats.currentStreak += 1;
    stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
  } else {
    stats.currentStreak = 0;
  }
  saveStats();
}

function getActiveLength() {
  return settings.numberLength === "custom" ? Number(settings.customLength) : Number(settings.numberLength);
}

function generateRandomNumber(length) {
  const n = Math.max(1, Math.floor(Number(length) || 1));
  return Array.from({ length: n }, () => String(Math.floor(Math.random() * 10))).join("");
}

function formatAccuracy(statBlock) {
  if (!statBlock.totalAttempts) {
    return 0;
  }
  return Math.round((statBlock.correctAttempts / statBlock.totalAttempts) * 100);
}

function clearActiveTimer() {
  if (activeTimer) {
    clearInterval(activeTimer);
    activeTimer = null;
  }
}

initApp();
