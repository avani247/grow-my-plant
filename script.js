const DEFAULT_SETTINGS = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15
};

let userSettings = { ...DEFAULT_SETTINGS };
let currentMode = 'focus';
let focusCount = 0;
let isRunning = false;
let elapsedSeconds = 0;
let targetSeconds = userSettings.focus * 60;
let intervalId = null;
let soundEnabled = true;

const timerDisplay = document.getElementById('timerDisplay');
const modeLabel = document.getElementById('modeLabel');
const sessionInfo = document.getElementById('sessionInfo');
const goalDuration = document.getElementById('goalDuration');
const playPauseBtn = document.getElementById('playPauseBtn');
const resetBtn = document.getElementById('resetBtn');
const skipBtn = document.getElementById('skipBtn');
const soundToggleBtn = document.getElementById('soundToggleBtn');
const sessionDots = document.querySelectorAll('.session-dot');
const plantIllustration = document.getElementById('plantIllustration');
const toast = document.getElementById('toast');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');
const settingsForm = document.getElementById('settingsForm');
const settingsSummary = document.getElementById('settingsSummary');
const helperTexts = {
  focus: document.getElementById('focusHelper'),
  shortBreak: document.getElementById('shortHelper'),
  longBreak: document.getElementById('longHelper')
};

const plantStages = [
  document.getElementById('plantStage0'),
  document.getElementById('plantStage1'),
  document.getElementById('plantStage2'),
  document.getElementById('plantStage3'),
  document.getElementById('plantStage4')
];

const soundCards = document.querySelectorAll('.sound-card');
let activeAudio = null;

function loadSettings() {
  const saved = localStorage.getItem('grow-my-plant-settings');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      userSettings = { ...DEFAULT_SETTINGS, ...parsed };
    } catch (error) {
      console.error('Failed to parse saved settings', error);
    }
  }
}

function persistSettings() {
  localStorage.setItem('grow-my-plant-settings', JSON.stringify(userSettings));
}

function updateSettingsForm() {
  settingsForm.focus.value = userSettings.focus;
  settingsForm.shortBreak.value = userSettings.shortBreak;
  settingsForm.longBreak.value = userSettings.longBreak;
  settingsSummary.querySelector('[data-setting="focus"]').textContent = userSettings.focus;
  settingsSummary.querySelector('[data-setting="shortBreak"]').textContent = userSettings.shortBreak;
  settingsSummary.querySelector('[data-setting="longBreak"]').textContent = userSettings.longBreak;
}

function resetHelperTexts() {
  Object.values(helperTexts).forEach((helper) => {
    helper.textContent = '';
    helper.classList.remove('error');
  });
}

function validateField(name, value) {
  const numeric = Number(value);
  const constraints = {
    focus: { min: 15, max: 30 },
    shortBreak: { min: 5, max: 10 },
    longBreak: { min: 15, max: 20 }
  };

  const { min, max } = constraints[name];
  if (Number.isNaN(numeric) || numeric < min || numeric > max) {
    helperTexts[name].textContent = `Please choose a value between ${min} and ${max}.`;
    helperTexts[name].classList.add('error');
    return false;
  }

  helperTexts[name].textContent = '';
  helperTexts[name].classList.remove('error');
  return true;
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

function updateTimerDisplay() {
  const displaySeconds = Math.min(elapsedSeconds, targetSeconds);
  timerDisplay.textContent = formatTime(displaySeconds);
  goalDuration.textContent = formatTime(targetSeconds);
  const sessionNumber = Math.min(focusCount + (currentMode === 'focus' ? 1 : 0), 4) || 1;
  sessionInfo.textContent = `Session ${sessionNumber} of 4`;
  modeLabel.textContent = currentMode === 'focus' ? 'Focus' : currentMode === 'shortBreak' ? 'Short Break' : 'Long Break';
}

function updateSessionDots() {
  sessionDots.forEach((dot, index) => {
    dot.classList.toggle('completed', index < focusCount);
  });
}

function renderPlant() {
  const stageIndex = Math.min(focusCount, plantStages.length - 1);
  const stage = plantStages[stageIndex];
  if (!stage) return;
  plantIllustration.innerHTML = '';
  plantIllustration.appendChild(stage.cloneNode(true));
}

function getDurationForMode(mode) {
  if (mode === 'focus') return userSettings.focus * 60;
  if (mode === 'shortBreak') return userSettings.shortBreak * 60;
  return userSettings.longBreak * 60;
}

function applyModeDuration({ resetElapsed = true } = {}) {
  targetSeconds = getDurationForMode(currentMode);
  if (resetElapsed) {
    elapsedSeconds = 0;
  } else if (elapsedSeconds > targetSeconds) {
    elapsedSeconds = targetSeconds;
  }
  updateTimerDisplay();
}

function switchMode(nextMode) {
  currentMode = nextMode;
  applyModeDuration({ resetElapsed: true });
}

function growPlantToast() {
  toast.textContent = 'Nice! Plant grew 🌱';
  setTimeout(() => {
    toast.textContent = '';
  }, 3500);
}

function resetPlant() {
  focusCount = 0;
  updateSessionDots();
  renderPlant();
}

function handleSessionComplete({ manual = false } = {}) {
  if (currentMode === 'focus') {
    if (!manual) {
      focusCount = Math.min(focusCount + 1, 4);
      updateSessionDots();
      renderPlant();
      growPlantToast();
    }

    const shouldLongBreak = !manual && focusCount >= 4;
    switchMode(shouldLongBreak ? 'longBreak' : 'shortBreak');
  } else {
    if (currentMode === 'longBreak' && !manual) {
      resetPlant();
    }
    switchMode('focus');
  }

  if (manual) {
    pauseTimer();
  } else {
    startTimer();
  }
}

function tick() {
  elapsedSeconds += 1;
  updateTimerDisplay();

  if (elapsedSeconds >= targetSeconds) {
    clearInterval(intervalId);
    intervalId = null;
    isRunning = false;
    handleSessionComplete();
  }
}

function startTimer() {
  if (elapsedSeconds >= targetSeconds) {
    elapsedSeconds = 0;
    updateTimerDisplay();
  }

  if (intervalId) clearInterval(intervalId);
  intervalId = setInterval(tick, 1000);
  isRunning = true;
  playPauseBtn.textContent = '⏸️';
}

function pauseTimer() {
  clearInterval(intervalId);
  intervalId = null;
  isRunning = false;
  playPauseBtn.textContent = '▶️';
}

function toggleTimer() {
  if (isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
}

function resetTimer() {
  pauseTimer();
  applyModeDuration({ resetElapsed: true });
}

function skipSession() {
  pauseTimer();
  handleSessionComplete({ manual: true });
}

function toggleSounds() {
  soundEnabled = !soundEnabled;
  soundToggleBtn.textContent = soundEnabled ? '🔈' : '🔇';
  if (!soundEnabled && activeAudio) {
    const previousAudio = activeAudio;
    previousAudio.pause();
    const activeCard = [...soundCards].find((c) => c.contains(previousAudio));
    if (activeCard) {
      activeCard.classList.remove('playing');
      activeCard.querySelector('.sound-toggle').textContent = 'Play';
    }
    activeAudio = null;
  }
}

function handleSoundToggle(card, audio) {
  if (!soundEnabled) return;
  if (audio === activeAudio) {
    audio.pause();
    activeAudio = null;
    card.classList.remove('playing');
    card.querySelector('.sound-toggle').textContent = 'Play';
    return;
  }

  if (activeAudio) {
    activeAudio.pause();
    const activeCard = [...soundCards].find((c) => c.contains(activeAudio));
    if (activeCard) {
      activeCard.classList.remove('playing');
      activeCard.querySelector('.sound-toggle').textContent = 'Play';
    }
  }

  audio.play().catch((err) => console.error('Audio play failed', err));
  activeAudio = audio;
  card.classList.add('playing');
  card.querySelector('.sound-toggle').textContent = 'Pause';
}

function initSounds() {
  soundCards.forEach((card) => {
    const audio = card.querySelector('audio');
    const btn = card.querySelector('.sound-toggle');
    btn.addEventListener('click', () => handleSoundToggle(card, audio));
    audio.addEventListener('ended', () => {
      card.classList.remove('playing');
      btn.textContent = 'Play';
      activeAudio = null;
    });
  });
}

function initTabs() {
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      tabButtons.forEach((button) => button.classList.toggle('active', button === btn));
      tabPanels.forEach((panel) => panel.classList.toggle('active', panel.id === `tab-${tabId}`));
    });
  });
}

function initForm() {
  settingsForm.addEventListener('submit', (event) => {
    event.preventDefault();
    resetHelperTexts();
    const formData = new FormData(settingsForm);
    const newSettings = {};
    let isValid = true;

    for (const [name, value] of formData.entries()) {
      const valid = validateField(name, value);
      if (!valid) {
        isValid = false;
      }
      newSettings[name] = Number(value);
    }

    if (!isValid) {
      return;
    }

    userSettings = { ...userSettings, ...newSettings };
    persistSettings();
    updateSettingsForm();

    if (!isRunning && elapsedSeconds === 0) {
      applyModeDuration({ resetElapsed: true });
    } else {
      updateTimerDisplay();
    }
  });
}

function initControls() {
  playPauseBtn.addEventListener('click', toggleTimer);
  resetBtn.addEventListener('click', resetTimer);
  skipBtn.addEventListener('click', skipSession);
  soundToggleBtn.addEventListener('click', toggleSounds);
}

function init() {
  loadSettings();
  updateSettingsForm();
  renderPlant();
  updateSessionDots();
  switchMode('focus');
  pauseTimer();
  initTabs();
  initControls();
  initSounds();
  initForm();
}

init();
