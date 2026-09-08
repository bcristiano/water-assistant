const STORAGE_KEY = "water-assistant-v1";
const todayKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const defaultState = {
  theme: "light",
  profile: {
    sex: "female",
    age: 30,
    weight: 60,
    height: 165,
    activity: "normal",
    temperature: 24,
    humidity: 55
  },
  profileComplete: false,
  goalMl: 2100,
  reminders: {
    enabled: false,
    intervalMinutes: 90,
    startTime: "08:30",
    endTime: "22:00"
  },
  entriesByDate: {}
};

let state = loadState();
let reminderTimer = null;
let editingProfile = false;
const amountOptions = [100, 200, 250, 350, 500];

const elements = {
  themeToggle: document.querySelector("#themeToggle"),
  todayLabel: document.querySelector("#todayLabel"),
  waterFill: document.querySelector("#waterFill"),
  progressPercent: document.querySelector("#progressPercent"),
  remainingMl: document.querySelector("#remainingMl"),
  drunkMl: document.querySelector("#drunkMl"),
  goalMl: document.querySelector("#goalMl"),
  nextCupMl: document.querySelector("#nextCupMl"),
  weeklyAverage: document.querySelector("#weeklyAverage"),
  streakDays: document.querySelector("#streakDays"),
  goalInput: document.querySelector("#goalInput"),
  applySuggestedGoal: document.querySelector("#applySuggestedGoal"),
  quickAmounts: document.querySelector("#quickAmounts"),
  undoDrink: document.querySelector("#undoDrink"),
  customLogForm: document.querySelector("#customLogForm"),
  customAmount: document.querySelector("#customAmount"),
  suggestedGoal: document.querySelector("#suggestedGoal"),
  setupSuggestedGoal: document.querySelector("#setupSuggestedGoal"),
  onboarding: document.querySelector("#onboarding"),
  profileSetupForm: document.querySelector("#profileSetupForm"),
  openProfileSetup: document.querySelector("#openProfileSetup"),
  closeProfileSetup: document.querySelector("#closeProfileSetup"),
  saveProfileLabel: document.querySelector("#saveProfileLabel"),
  sex: document.querySelector("#sex"),
  age: document.querySelector("#age"),
  weight: document.querySelector("#weight"),
  height: document.querySelector("#height"),
  activity: document.querySelector("#activity"),
  temperature: document.querySelector("#temperature"),
  humidity: document.querySelector("#humidity"),
  useWeather: document.querySelector("#useWeather"),
  remindersEnabled: document.querySelector("#remindersEnabled"),
  intervalMinutes: document.querySelector("#intervalMinutes"),
  startTime: document.querySelector("#startTime"),
  endTime: document.querySelector("#endTime"),
  requestNotifications: document.querySelector("#requestNotifications"),
  notificationStatus: document.querySelector("#notificationStatus"),
  downloadCalendar: document.querySelector("#downloadCalendar"),
  calendarStatus: document.querySelector("#calendarStatus"),
  clearToday: document.querySelector("#clearToday"),
  historyList: document.querySelector("#historyList"),
  historyItemTemplate: document.querySelector("#historyItemTemplate")
};

boot();

function boot() {
  registerServiceWorker();
  ensureTodayBucket();
  buildQuickButtons();
  bindEvents();
  syncForm();
  render();
  scheduleNextReminder();
  refreshIcons();
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const merged = mergeState(defaultState, saved || {});
    if (saved && !Object.prototype.hasOwnProperty.call(saved, "profileComplete")) {
      merged.profileComplete = hasLegacyProfile(saved);
    }
    return merged;
  } catch {
    return structuredClone(defaultState);
  }
}

function mergeState(base, saved) {
  return {
    ...structuredClone(base),
    ...saved,
    profile: { ...base.profile, ...(saved.profile || {}) },
    reminders: { ...base.reminders, ...(saved.reminders || {}) },
    entriesByDate: { ...(saved.entriesByDate || {}) }
  };
}

function hasLegacyProfile(saved) {
  const profile = saved.profile || {};
  return ["sex", "age", "weight", "height"].every((field) => {
    const value = profile[field];
    return value !== undefined && value !== null && value !== "";
  });
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function ensureTodayBucket() {
  const key = todayKey();
  if (!state.entriesByDate[key]) {
    state.entriesByDate[key] = [];
  }
}

function bindEvents() {
  elements.themeToggle.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    saveState();
    render();
  });

  elements.goalInput.addEventListener("input", () => {
    const value = readNumber(elements.goalInput.value, state.goalMl);
    state.goalMl = clamp(Math.round(value / 50) * 50, 500, 6000);
    saveState();
    render(false);
  });

  elements.applySuggestedGoal.addEventListener("click", () => {
    state.goalMl = calculateSuggestedGoal(state.profile);
    elements.goalInput.value = state.goalMl;
    saveState();
    render();
  });

  elements.openProfileSetup.addEventListener("click", () => {
    editingProfile = true;
    syncForm();
    render();
  });

  elements.closeProfileSetup.addEventListener("click", () => {
    if (!state.profileComplete) return;
    editingProfile = false;
    render();
  });

  elements.profileSetupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const firstSetup = !state.profileComplete;
    state.profile.sex = elements.sex.value;
    state.profile.age = clamp(readNumber(elements.age.value, defaultState.profile.age), 12, 100);
    state.profile.weight = clamp(readNumber(elements.weight.value, defaultState.profile.weight), 30, 220);
    state.profile.height = clamp(readNumber(elements.height.value, defaultState.profile.height), 120, 230);
    state.profileComplete = true;
    editingProfile = false;
    if (firstSetup) {
      state.goalMl = calculateSuggestedGoal(state.profile);
    }
    saveState();
    render();
  });

  elements.customLogForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const amount = readNumber(elements.customAmount.value, 0);
    if (amount > 0) {
      addEntry(amount);
      elements.customAmount.value = "";
    }
  });

  elements.undoDrink.addEventListener("click", () => {
    const entries = getTodayEntries();
    if (entries.length) {
      entries.pop();
      saveState();
      render();
    }
  });

  elements.clearToday.addEventListener("click", () => {
    state.entriesByDate[todayKey()] = [];
    saveState();
    render();
  });

  ["sex", "age", "weight", "height", "activity", "temperature", "humidity"].forEach((field) => {
    elements[field].addEventListener("input", () => {
      const numericFields = ["age", "weight", "height", "temperature", "humidity"];
      state.profile[field] = numericFields.includes(field)
        ? readNumber(elements[field].value, defaultState.profile[field])
        : elements[field].value;
      saveState();
      render(false);
    });
  });

  ["intervalMinutes", "startTime", "endTime"].forEach((field) => {
    elements[field].addEventListener("input", () => {
      state.reminders[field] = field === "intervalMinutes"
        ? clamp(readNumber(elements[field].value, 90), 15, 240)
        : elements[field].value;
      saveState();
      scheduleNextReminder();
      render(false);
    });
  });

  elements.remindersEnabled.addEventListener("change", async () => {
    state.reminders.enabled = elements.remindersEnabled.checked;
    if (state.reminders.enabled) {
      await requestNotificationPermission();
    }
    saveState();
    scheduleNextReminder();
    render();
  });

  elements.requestNotifications.addEventListener("click", async () => {
    await requestNotificationPermission();
    scheduleNextReminder();
    render();
  });

  elements.downloadCalendar.addEventListener("click", downloadCalendarReminders);
  elements.useWeather.addEventListener("click", useCurrentWeather);
}

function buildQuickButtons() {
  elements.quickAmounts.innerHTML = "";
  amountOptions.forEach((amount) => {
    const button = document.createElement("button");
    button.className = "amount-button";
    button.type = "button";
    button.textContent = `${amount} ml`;
    button.addEventListener("click", () => addEntry(amount));
    elements.quickAmounts.append(button);
  });
}

function addEntry(rawAmount) {
  const amount = clamp(Math.round(Number(rawAmount)), 1, 2000);
  getTodayEntries().push({
    id: window.crypto?.randomUUID ? window.crypto.randomUUID() : String(Date.now()),
    amount,
    time: new Date().toISOString()
  });
  saveState();
  render();
}

function getTodayEntries() {
  ensureTodayBucket();
  return state.entriesByDate[todayKey()];
}

function render(updateInputs = true) {
  document.documentElement.classList.toggle("dark", state.theme === "dark");
  elements.themeToggle.innerHTML = state.theme === "dark"
    ? '<i data-lucide="sun"></i>'
    : '<i data-lucide="moon"></i>';

  const entries = getTodayEntries();
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const goal = clamp(state.goalMl, 500, 6000);
  const percent = Math.min(100, Math.round((total / goal) * 100));
  const remaining = Math.max(0, goal - total);
  const suggested = calculateSuggestedGoal(state.profile);
  const nextCup = calculateNextCup(total, goal, state.profile);

  elements.todayLabel.textContent = new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long"
  }).format(new Date());
  elements.drunkMl.textContent = String(total);
  elements.goalMl.textContent = String(goal);
  elements.remainingMl.textContent = String(remaining);
  elements.progressPercent.textContent = `${percent}%`;
  elements.waterFill.style.height = `${percent}%`;
  elements.suggestedGoal.value = `建议 ${suggested} ml`;
  elements.setupSuggestedGoal.value = `建议 ${suggested} ml`;
  elements.nextCupMl.textContent = remaining > 0 ? `${nextCup} ml` : "完成";
  elements.weeklyAverage.textContent = `${calculateAverageForDays(7)} ml`;
  elements.streakDays.textContent = `${calculateStreak(goal)} 天`;
  elements.notificationStatus.textContent = notificationStatusText();

  if (updateInputs) {
    syncForm();
  }

  renderHistory(entries);
  renderProfileSetup();
  refreshIcons();
}

function syncForm() {
  elements.goalInput.value = state.goalMl;
  elements.sex.value = state.profile.sex;
  elements.age.value = state.profile.age;
  elements.weight.value = state.profile.weight;
  elements.height.value = state.profile.height;
  elements.activity.value = state.profile.activity;
  elements.temperature.value = state.profile.temperature;
  elements.humidity.value = state.profile.humidity;
  elements.remindersEnabled.checked = state.reminders.enabled;
  elements.intervalMinutes.value = state.reminders.intervalMinutes;
  elements.startTime.value = state.reminders.startTime;
  elements.endTime.value = state.reminders.endTime;
}

function renderProfileSetup() {
  const shouldShow = !state.profileComplete || editingProfile;
  elements.onboarding.hidden = !shouldShow;
  elements.closeProfileSetup.hidden = !state.profileComplete;
  elements.saveProfileLabel.textContent = state.profileComplete ? "保存资料" : "保存并开始";
  document.body.classList.toggle("modal-open", shouldShow);
}

function renderHistory(entries) {
  elements.historyList.innerHTML = "";

  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "empty-history";
    empty.textContent = "今天还没有记录";
    elements.historyList.append(empty);
    return;
  }

  [...entries].reverse().forEach((entry) => {
    const item = elements.historyItemTemplate.content.firstElementChild.cloneNode(true);
    item.querySelector(".entry-amount").textContent = `${entry.amount} ml`;
    item.querySelector(".entry-time").textContent = formatTime(entry.time);
    item.querySelector(".delete-entry").addEventListener("click", () => {
      state.entriesByDate[todayKey()] = getTodayEntries().filter((candidate) => candidate.id !== entry.id);
      saveState();
      render();
    });
    elements.historyList.append(item);
  });
}

function calculateSuggestedGoal(profile) {
  const sexBase = {
    male: 35,
    female: 31,
    other: 33
  }[profile.sex] || 33;
  const activityBonus = {
    low: 0,
    normal: 200,
    active: 450,
    intense: 700
  }[profile.activity] || 200;

  const weight = clamp(readNumber(profile.weight, 60), 30, 220);
  const age = clamp(readNumber(profile.age, 30), 12, 100);
  const temperature = clamp(readNumber(profile.temperature, 24), -20, 55);
  const humidity = clamp(readNumber(profile.humidity, 55), 0, 100);

  let goal = weight * sexBase + activityBonus;

  if (age >= 65) goal *= 0.94;
  if (age < 18) goal *= 0.9;

  if (temperature >= 35) goal += 750;
  else if (temperature >= 30) goal += 550;
  else if (temperature >= 26) goal += 300;
  else if (temperature <= 5) goal -= 150;

  if (humidity <= 35) goal += 150;
  if (humidity >= 75 && temperature >= 26) goal += 120;

  return clamp(Math.round(goal / 50) * 50, 1200, 4500);
}

function calculateNextCup(total, goal, profile) {
  const remaining = Math.max(0, goal - total);
  if (!remaining) return 0;

  const active = ["active", "intense"].includes(profile.activity);
  const hot = readNumber(profile.temperature, 24) >= 30;
  const dry = readNumber(profile.humidity, 55) <= 35;
  const base = hot || active ? 300 : dry ? 250 : 200;

  return clamp(Math.min(remaining, Math.round(base / 50) * 50), 100, 500);
}

function calculateAverageForDays(days) {
  const totals = Array.from({ length: days }, (_, index) => {
    const key = dateKeyOffset(-index);
    return getEntriesForDate(key).reduce((sum, entry) => sum + entry.amount, 0);
  });
  return Math.round(totals.reduce((sum, total) => sum + total, 0) / days);
}

function calculateStreak(goal) {
  let streak = 0;
  for (let index = 0; index < 365; index += 1) {
    const key = dateKeyOffset(-index);
    const total = getEntriesForDate(key).reduce((sum, entry) => sum + entry.amount, 0);
    if (total < goal) break;
    streak += 1;
  }
  return streak;
}

function getEntriesForDate(key) {
  return Array.isArray(state.entriesByDate[key]) ? state.entriesByDate[key] : [];
}

function dateKeyOffset(offsetDays) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function useCurrentWeather() {
  elements.useWeather.disabled = true;
  elements.useWeather.textContent = "定位中";

  try {
    const position = await getPosition();
    const { latitude, longitude } = position.coords;
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", latitude.toFixed(4));
    url.searchParams.set("longitude", longitude.toFixed(4));
    url.searchParams.set("current", "temperature_2m,relative_humidity_2m");
    url.searchParams.set("timezone", "auto");

    const response = await fetch(url);
    if (!response.ok) throw new Error("weather");
    const data = await response.json();
    const current = data.current || {};

    state.profile.temperature = Math.round(Number(current.temperature_2m) * 10) / 10;
    state.profile.humidity = Math.round(Number(current.relative_humidity_2m));
    saveState();
    render();
  } catch {
    elements.notificationStatus.textContent = "天气获取失败";
  } finally {
    elements.useWeather.disabled = false;
    elements.useWeather.innerHTML = '<i data-lucide="map-pin"></i>获取天气';
    refreshIcons();
  }
}

function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("geolocation"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 30 * 60 * 1000
    });
  });
}

async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    state.reminders.enabled = false;
    return "unsupported";
  }
  if (Notification.permission === "granted") {
    return "granted";
  }
  const result = await Notification.requestPermission();
  if (result !== "granted") {
    state.reminders.enabled = false;
  }
  saveState();
  return result;
}

function scheduleNextReminder() {
  clearTimeout(reminderTimer);

  if (!state.reminders.enabled || !("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  const delay = millisecondsUntilNextReminder();
  reminderTimer = setTimeout(() => {
    sendHydrationNotification();
    scheduleNextReminder();
  }, delay);
}

function millisecondsUntilNextReminder() {
  const now = new Date();
  const start = timeToday(state.reminders.startTime);
  const end = timeToday(state.reminders.endTime);
  const interval = clamp(state.reminders.intervalMinutes, 15, 240) * 60 * 1000;

  if (now < start) {
    return start.getTime() - now.getTime();
  }

  if (now > end) {
    const tomorrowStart = timeToday(state.reminders.startTime);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    return tomorrowStart.getTime() - now.getTime();
  }

  return interval;
}

function timeToday(value) {
  const [hours, minutes] = String(value || "08:00").split(":").map(Number);
  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date;
}

function sendHydrationNotification() {
  const entries = getTodayEntries();
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const remaining = Math.max(0, state.goalMl - total);

  if (remaining <= 0) {
    new Notification("今天目标已完成", {
      body: "可以保持少量补水，继续维持好状态。",
      icon: "assets/icon-192.png"
    });
    return;
  }

  new Notification("该喝水了", {
    body: `今天还差 ${remaining} ml，建议先喝 ${calculateNextCup(total, state.goalMl, state.profile)} ml。`,
    icon: "assets/icon-192.png"
  });
}

function downloadCalendarReminders() {
  const slots = getReminderSlots();
  if (!slots.length) {
    elements.calendarStatus.textContent = "请先设置提醒时间";
    return;
  }

  const content = buildCalendar(slots);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "water-reminders.ics";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  elements.calendarStatus.textContent = `已生成 ${slots.length} 个日历提醒`;
}

function getReminderSlots() {
  const start = timeToday(state.reminders.startTime);
  const end = timeToday(state.reminders.endTime);
  const intervalMinutes = clamp(readNumber(state.reminders.intervalMinutes, 90), 15, 240);
  const slots = [];

  if (end <= start) return slots;

  for (let cursor = new Date(start); cursor <= end && slots.length < 48; cursor = addMinutes(cursor, intervalMinutes)) {
    slots.push(new Date(cursor));
  }

  return slots;
}

function buildCalendar(slots) {
  const stamp = formatIcsDateTime(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "PRODID:-//Water Assistant//Hydration Reminder//ZH-CN"
  ];

  slots.forEach((slot, index) => {
    const end = addMinutes(slot, 5);
    lines.push(
      "BEGIN:VEVENT",
      `UID:water-reminder-${index}-${formatIcsDateTime(slot)}@water-assistant.local`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${formatIcsDateTime(slot)}`,
      `DTEND:${formatIcsDateTime(end)}`,
      "RRULE:FREQ=DAILY",
      "SUMMARY:喝水提醒",
      "DESCRIPTION:打开饮水助手记录这一杯。",
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "DESCRIPTION:该喝水了",
      "TRIGGER:-PT0M",
      "END:VALARM",
      "END:VEVENT"
    );
  });

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

function formatIcsDateTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

function addMinutes(date, minutes) {
  const next = new Date(date);
  next.setMinutes(next.getMinutes() + minutes);
  return next;
}

function notificationStatusText() {
  if (!("Notification" in window)) return "当前浏览器不支持通知";
  if (Notification.permission === "granted" && state.reminders.enabled) return "通知已开启";
  if (Notification.permission === "denied") return "通知被系统关闭";
  return "通知未开启";
}

function formatTime(iso) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(iso));
}

function readNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}
