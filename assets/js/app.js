const TASK_GROUPS = [
  {
    title: "DAILY ROUTINE", period: "Daily", items: [
      { id: "duty", name: "Duty Quests", detail: "Complete available missions", max: 5, tag: "5×", mainOnly: true },
      { id: "world-boss", name: "World Bosses", detail: "Optional activity", max: 1, tag: "OPTIONAL" },
      { id: "supply", name: "Supply Request", detail: "Optional activity", max: 1, tag: "OPTIONAL" }
    ]
  },
  {
    title: "WEEKLY CONTENT", period: "Weekly", items: [
      { id: "dungeon-energy", name: "Dungeon Energy", detail: "Energy recovery · Level 22 · +120/day · 560 cap", membershipDetail: "Energy recovery · Level 22 · +120/day · 840 cap", max: 560, membershipMax: 840, step: 40, tag: "+120/day · 560 cap", membershipTag: "+120/day · 840 cap" },
      { id: "ascension", name: "Ascension Trial", detail: "Clear Ascension Trials", max: 3, tag: "3×" },
      { id: "daily-dungeon", name: "Daily Dungeon", detail: "Run the daily dungeon loop until the weekly cap", max: 14, tag: "14×" },
      { id: "shugo", name: "Shugo Festival", detail: "Energy recovery · Level 13 · +3/day · 12 cap", membershipDetail: "Energy recovery · Level 13 · +3/day · 21 cap", max: 12, membershipMax: 21, step: 3, tag: "+3/day · 12 cap", membershipTag: "+3/day · 21 cap", mainOnly: true },
      { id: "nightmare", name: "Nightmare", detail: "Complete the Nightmare run for your weekly attempt count", max: 14, tag: "14×" },
      { id: "corridors", name: "Abyss Corridors", detail: "Finish Abyss Corridors for free Abyss Tokens", max: 9, tag: "1–9×" },
      { id: "battlefield", name: "Battlefield", detail: "Take part in the battlefield for the week", max: 3, tag: "3×" }
    ]
  },
  {
    title: "CRAFTING & SHOPS", period: "Weekly", items: [
      { id: "wind-breeze-odyle", name: "Wind Breeze Odyle", detail: "Buy Odyle from the Wind Breeze Shop", max: 20, tag: "20×" },
      { id: "morph", name: "Substance Morph Odyle Craft", detail: "Craft Odyle from Substance Morph", max: 20, tag: "20×" },
      { id: "pve", name: "PvE Weeklies", detail: "Command Merchant · Main City", max: 12, tag: "12×", mainOnly: true },
      { id: "pvp", name: "PvP Weeklies", detail: "Command Merchant · Abyss", max: 20, tag: "20×", mainOnly: true }
    ]
  }
];

const STORAGE_KEY = "aion2-checklist-v1";
const MAX_CHARACTERS = 4;
const MAIN_CHARACTER_INDEX = 0;
const CLASS_DETAILS = {
  templar: { icon: "assets/icons/templar.png", label: "Templar" },
  gladiator: { icon: "assets/icons/gladiator.png", label: "Gladiator" },
  assassin: { icon: "assets/icons/assassin.png", label: "Assassin" },
  ranger: { icon: "assets/icons/ranger.png", label: "Ranger" },
  sorcerer: { icon: "assets/icons/sorcerer.png", label: "Sorcerer" },
  spiritmaster: { icon: "assets/icons/spiritmaster.png", label: "Spiritmaster" },
  cleric: { icon: "assets/icons/cleric.png", label: "Cleric" },
  chanter: { icon: "assets/icons/chanter.png", label: "Chanter" }
};
let activeTab = "Daily";
let state = loadState();
const shugoAlertAudio = new Audio("assets/audio/shugo.mp3");
let shugoAlertWindowKey = null;
let shugoAlertMuted = true;

shugoAlertAudio.volume = 0.15;

function setShugoAlertStatus() {
  const muteButton = document.getElementById("shugo-alert-mute");
  const status = document.getElementById("shugo-alert-status");
  if (!muteButton || !status) return;

  status.textContent = shugoAlertMuted ? "Muted" : "Alert active";
  muteButton.textContent = shugoAlertMuted ? "🔇" : "🔊";
  muteButton.classList.toggle("muted", shugoAlertMuted);
  muteButton.title = shugoAlertMuted ? "Unmute alert" : "Mute alert";
  muteButton.setAttribute("aria-label", shugoAlertMuted ? "Unmute Shugo alert" : "Mute Shugo alert");
}

function updateShugoAlertCountdown(now = new Date()) {
  const statusText = document.getElementById("shugo-alert-countdown");
  const noteText = document.getElementById("shugo-alert-note");
  if (!statusText || !noteText) return;

  const nextHour = new Date(now);
  nextHour.setMinutes(0, 0, 0);
  nextHour.setHours(nextHour.getHours() + 1);

  const eventStartTime = nextHour;
  const remainingMinutes = Math.max(0, Math.ceil((eventStartTime.getTime() - now.getTime()) / 60000));
  statusText.textContent = remainingMinutes > 0 ? `Event starts in ${remainingMinutes} min` : "Event starts now";
  noteText.textContent = "Sound plays 5 minutes before the event.";
}

function playShugoAlert() {
  if (shugoAlertMuted) return;
  shugoAlertAudio.currentTime = 0;
  shugoAlertAudio.play().catch(() => {});
  showToast("Shugo Festival is starting in 5 minutes!");
}

function checkShugoAlert(now = new Date()) {
  const nextHour = new Date(now);
  nextHour.setMinutes(0, 0, 0);
  nextHour.setHours(nextHour.getHours() + 1);

  const alertTime = new Date(nextHour.getTime() - 5 * 60 * 1000);
  const alertKey = alertTime.getTime();

  if (now >= alertTime && now < nextHour) {
    if (shugoAlertWindowKey !== alertKey) {
      shugoAlertWindowKey = alertKey;
      playShugoAlert();
    }
    return;
  }

  if (now >= nextHour) {
    shugoAlertWindowKey = null;
  }
}

function defaultCharacter(name = "Character 1", classKey = "templar") {
  return { name, classKey, done: {}, counts: {} };
}
function activeCharacter() {
  return state.characters[state.activeCharacter] || state.characters[0] || defaultCharacter();
}
function isMainCharacter(index = state.activeCharacter) {
  return index === MAIN_CHARACTER_INDEX;
}
function getCharacterClass(character = activeCharacter()) {
  return CLASS_DETAILS[character?.classKey] || CLASS_DETAILS.templar;
}
function getItemMax(item) {
  if (state.membership && typeof item.membershipMax === "number") {
    return item.membershipMax;
  }
  return item.max;
}
function getItemDetail(item) {
  if (state.membership && item.membershipDetail) return item.membershipDetail;
  return item.detail;
}
function getItemTag(item) {
  if (state.membership && item.membershipTag) return item.membershipTag;
  return item.tag;
}
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    let characters = [];

    if (Array.isArray(saved.characters) && saved.characters.length) {
      characters = saved.characters.slice(0, MAX_CHARACTERS).map((character, index) => ({
        name: typeof character?.name === "string" && character.name.trim() ? character.name.trim() : `Character ${index + 1}`,
        classKey: Object.prototype.hasOwnProperty.call(CLASS_DETAILS, character?.classKey) ? character.classKey : (index % Object.keys(CLASS_DETAILS).length === 0 ? "templar" : Object.keys(CLASS_DETAILS)[index % Object.keys(CLASS_DETAILS).length]),
        done: character?.done || {},
        counts: character?.counts || {}
      }));
    } else if (saved.done || saved.counts) {
      characters = [defaultCharacter("Character 1")];
      characters[0].done = saved.done || {};
      characters[0].counts = saved.counts || {};
    } else {
      characters = Array.from({ length: MAX_CHARACTERS }, (_, index) => defaultCharacter(`Character ${index + 1}`, Object.keys(CLASS_DETAILS)[index % Object.keys(CLASS_DETAILS).length]));
    }

    while (characters.length < MAX_CHARACTERS) {
      characters.push(defaultCharacter(`Character ${characters.length + 1}`));
    }

    const activeCharacterIndex = Number.isInteger(saved.activeCharacter) ? saved.activeCharacter : 0;
    return {
      activeCharacter: Math.max(0, Math.min(activeCharacterIndex, characters.length - 1)),
      membership: !!saved.membership,
      characters: characters.slice(0, MAX_CHARACTERS)
    };
  } catch {
    return {
      activeCharacter: 0,
      membership: false,
      characters: Array.from({ length: MAX_CHARACTERS }, (_, index) => defaultCharacter(`Character ${index + 1}`, Object.keys(CLASS_DETAILS)[index % Object.keys(CLASS_DETAILS).length]))
    };
  }
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}
function visibleGroups(characterIndex = state.activeCharacter) {
  return TASK_GROUPS
    .filter(group => activeTab === "All" || group.period === activeTab)
    .map(group => ({
      ...group,
      items: group.items.filter(item => !item.mainOnly || isMainCharacter(characterIndex))
    }))
    .filter(group => group.items.length > 0);
}
function allVisibleItems(characterIndex = state.activeCharacter) {
  return visibleGroups(characterIndex).flatMap(group => group.items);
}
function characterProgress(character = activeCharacter(), characterIndex = state.activeCharacter) {
  const items = TASK_GROUPS.flatMap(group => group.items)
    .filter(item => !item.mainOnly || isMainCharacter(characterIndex));
  const done = items.filter(item => !!character.done[item.id]).length;
  return { done, total: items.length, percent: items.length ? Math.round(done / items.length * 100) : 0 };
}
function renderCharacterWidget() {
  const switcher = document.getElementById("character-switcher");
  const label = document.getElementById("active-character-name");
  if (!switcher || !label) return;

  const current = activeCharacter();
  const currentClass = getCharacterClass(current);
  label.innerHTML = `<img class="character-icon-large" src="${currentClass.icon}" alt="${escapeHTML(currentClass.label)}" /> <span>${escapeHTML(current.name)}${isMainCharacter() ? ' <em class="main-badge">MAIN</em>' : ''}</span>`;
  label.setAttribute("aria-label", `Active character: ${current.name} (${currentClass.label})`);

  switcher.innerHTML = state.characters.map((character, index) => {
    const selected = index === state.activeCharacter;
    const progress = characterProgress(character, index);
    const classDetails = getCharacterClass(character);
    const mainBadge = isMainCharacter(index) ? '<span class="main-badge">MAIN</span>' : '';
    return `<button class="character-pill${selected ? " active" : ""}" type="button" data-character-index="${index}" aria-pressed="${selected ? "true" : "false"}">
      <span class="character-pill-row">
        <img class="character-icon-small" src="${classDetails.icon}" alt="${escapeHTML(classDetails.label)}" />
        <span class="character-pill-name">${escapeHTML(character.name)}</span>
        ${mainBadge}
      </span>
      <span class="character-pill-progress">${progress.done} / ${progress.total}</span>
    </button>`;
  }).join("");

  switcher.querySelectorAll(".character-pill").forEach(button => {
    button.addEventListener("click", () => {
      state.activeCharacter = Number(button.dataset.characterIndex);
      saveState(); render();
    });
  });
}
function render() {
  if (!isMainCharacter() && activeTab === "Daily") {
    activeTab = "Weekly";
  }
  document.querySelectorAll(".tab").forEach(button => {
    button.hidden = button.dataset.tab === "Daily" && !isMainCharacter();
    const active = button.dataset.tab === activeTab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const groupsRoot = document.getElementById("task-groups");
  const character = activeCharacter();
  groupsRoot.innerHTML = visibleGroups().map(group => {
    const doneCount = group.items.filter(item => !!character.done[item.id]).length;
    return `<section class="group">
      <div class="group-heading"><h3>${escapeHTML(group.title)}</h3><span>${doneCount} / ${group.items.length} complete</span></div>
      <div class="task-list">${group.items.map(item => renderTask(item, character)).join("")}</div>
    </section>`;
  }).join("");
  const membershipToggle = document.getElementById("membership-toggle");
  if (membershipToggle) {
    membershipToggle.checked = !!state.membership;
    membershipToggle.onchange = () => {
      state.membership = membershipToggle.checked;
      saveState(); render();
    };
  }

  groupsRoot.querySelectorAll(".task-check").forEach(input => {
    input.addEventListener("change", () => {
      const id = input.dataset.id;
      const item = findItem(id);
      if (!item) return;
      const nextCharacter = activeCharacter();
      const max = getItemMax(item);
      nextCharacter.done[id] = input.checked;
      if (input.checked) {
        nextCharacter.counts[id] = max;
      } else {
        nextCharacter.counts[id] = 0;
      }
      saveState(); render();
    });
  });
  groupsRoot.querySelectorAll(".counter-btn").forEach(button => {
    button.addEventListener("click", () => {
      const id = button.dataset.id;
      const item = findItem(id);
      if (!item) return;
      const currentCharacter = activeCharacter();
      const itemMax = getItemMax(item);
      const current = Number(currentCharacter.counts[id] || 0);
      currentCharacter.counts[id] = Math.max(0, Math.min(itemMax, current + Number(button.dataset.delta)));
      currentCharacter.done[id] = currentCharacter.counts[id] >= itemMax;
      saveState(); render();
    });
  });
  renderCharacterWidget();
  updateProgress();
}
function renderTask(item, character = activeCharacter()) {
  const itemMax = getItemMax(item);
  const checked = !!character.done[item.id];
  const count = Math.max(0, Math.min(itemMax, Number(character.counts[item.id] || 0)));
  const step = Number(item.step || 1);
  const tag = getItemTag(item);
  const detail = getItemDetail(item);
  return `<article class="task ${checked ? "completed" : ""}">
    <div class="task-main">
      <input class="task-check" type="checkbox" data-id="${escapeHTML(item.id)}" aria-label="Mark ${escapeHTML(item.name)} complete" ${checked ? "checked" : ""}>
      <div class="task-copy">
        <div class="task-name">${escapeHTML(item.name)}</div>
        <div class="task-detail">${escapeHTML(detail)}</div>
        <span class="task-tag">${escapeHTML(tag)}</span>
      </div>
    </div>
    ${item.max > 1 ? `<div class="counter-row">
      <span>Run progress</span>
      <button class="counter-btn" data-id="${escapeHTML(item.id)}" data-delta="-${step}" aria-label="Decrease ${escapeHTML(item.name)} progress" ${count <= 0 ? "disabled" : ""}>−</button>
      <strong>${count} / ${itemMax}</strong>
      <button class="counter-btn" data-id="${escapeHTML(item.id)}" data-delta="${step}" aria-label="Increase ${escapeHTML(item.name)} progress" ${count >= itemMax ? "disabled" : ""}>+</button>
    </div><div class="mini-track"><div class="mini-fill" style="width:${count / itemMax * 100}%"></div></div>` : ""}
  </article>`;
}
function findItem(id) {
  return TASK_GROUPS.flatMap(group => group.items).find(item => item.id === id);
}
function updateProgress() {
  const character = activeCharacter();
  const items = allVisibleItems();
  const done = items.filter(item => !!character.done[item.id]).length;
  const percent = items.length ? Math.round(done / items.length * 100) : 0;
  document.getElementById("progress-count").textContent = `${done} / ${items.length}`;
  document.getElementById("progress-percent").textContent = `${percent}% complete`;
  document.getElementById("overall-bar").style.width = `${percent}%`;
}
document.querySelectorAll(".tab").forEach(button => {
  button.addEventListener("click", () => { activeTab = button.dataset.tab; render(); });
});

function openCharacterEditor() {
  const modal = document.getElementById("character-editor-modal");
  const nameInput = document.getElementById("character-name-input");
  const classSelect = document.getElementById("character-class-select");
  if (!modal || !nameInput || !classSelect) return;

  const current = activeCharacter();
  nameInput.value = current.name;
  classSelect.value = current.classKey || "templar";
  modal.classList.remove("hidden");
  setTimeout(() => nameInput.focus(), 0);
}

function closeCharacterEditor() {
  const modal = document.getElementById("character-editor-modal");
  if (modal) modal.classList.add("hidden");
}

function saveCharacterEditor() {
  const nameInput = document.getElementById("character-name-input");
  const classSelect = document.getElementById("character-class-select");
  if (!nameInput || !classSelect) return;

  const current = activeCharacter();
  const trimmed = nameInput.value.trim();
  if (!trimmed) {
    showToast("Character name cannot be empty.");
    return;
  }

  current.name = trimmed;
  current.classKey = classSelect.value;
  saveState(); render();
  closeCharacterEditor();
}

document.getElementById("active-character-name").addEventListener("click", openCharacterEditor);
document.getElementById("edit-character-name").addEventListener("click", openCharacterEditor);
document.getElementById("save-character-details").addEventListener("click", saveCharacterEditor);
document.getElementById("cancel-character-edit").addEventListener("click", closeCharacterEditor);
document.getElementById("character-name-input").addEventListener("keydown", event => {
  if (event.key === "Enter") saveCharacterEditor();
});

document.getElementById("reset-checklist").addEventListener("click", () => {
  const items = allVisibleItems();
  if (!items.length) return;
  if (!confirm(`Reset progress for ${activeTab === "All" ? "all tasks" : `the ${activeTab.toLowerCase()} checklist`} on ${activeCharacter().name}?`)) return;
  const character = activeCharacter();
  items.forEach(item => { delete character.done[item.id]; delete character.counts[item.id]; });
  saveState(); render(); showToast(`${activeCharacter().name}'s checklist reset.`);
});
document.getElementById("copy-checklist").addEventListener("click", async () => {
  const character = activeCharacter();
  const text = visibleGroups().map(group => `${group.title}\n${group.items.map(item => {
    const count = Number(character.counts[item.id] || 0);
    const itemMax = getItemMax(item);
    const tag = getItemTag(item);
    return `${character.done[item.id] ? "[x]" : "[ ]"} ${item.name} — ${tag}${item.max > 1 ? ` (${count}/${itemMax})` : ""}`;
  }).join("\n")}`).join("\n\n");
  try {
    await navigator.clipboard.writeText(text);
    showToast(`${character.name}'s checklist copied.`);
  } catch {
    const area = document.createElement("textarea");
    area.value = text; area.style.position = "fixed"; area.style.opacity = "0";
    document.body.appendChild(area); area.select();
    const ok = document.execCommand("copy"); area.remove();
    showToast(ok ? `${character.name}'s checklist copied.` : "Copy failed — try opening this page in a browser.");
  }
});
document.getElementById("shugo-alert-mute").addEventListener("click", () => {
  shugoAlertMuted = !shugoAlertMuted;
  setShugoAlertStatus();
  showToast(shugoAlertMuted ? "Shugo alert muted." : "Shugo alert unmuted.");
});
setShugoAlertStatus();
let toastTimer;
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.textContent = ""; }, 2800);
}

// Reset targets are computed from UTC, independent of the computer's local timezone.
function nextDailyReset(now) {
  const target = new Date(now);
  target.setUTCHours(7, 0, 0, 0);
  if (target <= now) target.setUTCDate(target.getUTCDate() + 1);
  return target;
}
function nextWeeklyReset(now) {
  const target = new Date(now);
  target.setUTCHours(7, 0, 0, 0);
  const daysUntilWednesday = (3 - target.getUTCDay() + 7) % 7;
  target.setUTCDate(target.getUTCDate() + daysUntilWednesday);
  if (target <= now) target.setUTCDate(target.getUTCDate() + 7);
  return target;
}
const pad = number => String(number).padStart(2, "0");
const resetDateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC", weekday: "long", day: "2-digit", month: "short", year: "numeric"
});
function dateLabel(date) {
  return resetDateFormatter.format(date) + " · 07:00 UTC";
}
function updateTimers() {
  const now = new Date();
  drawTimer("daily", nextDailyReset(now), now, 86400000, false);
  drawTimer("weekly", nextWeeklyReset(now), now, 7 * 86400000, true);
  updateShugoAlertCountdown(now);
  checkShugoAlert(now);
}
function drawTimer(prefix, target, now, periodMs, showDays) {
  const remaining = Math.max(0, target.getTime() - now.getTime());
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  document.getElementById(`${prefix}-clock`).textContent =
    (showDays ? `${days}d ` : "") + `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  document.getElementById(`${prefix}-date`).textContent = `Next reset: ${dateLabel(target)}`;
  const elapsed = Math.max(0, Math.min(100, (1 - remaining / periodMs) * 100));
  document.getElementById(`${prefix}-bar`).style.width = `${elapsed}%`;
}
render();
updateTimers();
setInterval(updateTimers, 1000);
