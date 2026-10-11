import { createGame } from './engine.js';

const $ = (id) => document.getElementById(id);
const UI_STORAGE_KEY = 'obychnyy-den-ui-v1';
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const controls = {
  start: $('start-fragment'), continue: $('continue-fragment'),
  play: $('toggle-play'), mute: $('toggle-mute'), tempo: $('tempo'),
  next: $('next-action'), menu: $('open-menu'), swap: $('swap-camera'),
  repeat: $('repeat-fragment'), reducedMotion: $('reduced-motion'),
};
let game;
let snapshot = { phase: 'loading', dialogue: [], hasSave: false };
let focus = 'store';
let muted = false;
let speed = 1;
let hasSpeedPreference = false;
let motionOverride = null;
let reducedMotion = motionQuery.matches;
let dialogueSignature = '';
let previousPhase = 'loading';
let previousScene = null;
let menuOpenedFrom = 'ready';
let lastMenuFocus = null;
let commandRunning = false;

try {
  const preferences = JSON.parse(localStorage.getItem(UI_STORAGE_KEY) || '{}');
  if (preferences.focus === 'school') focus = 'school';
  if (preferences.speed === 1 || preferences.speed === 2) {
    speed = preferences.speed;
    hasSpeedPreference = true;
  }
  if (typeof preferences.reducedMotion === 'boolean') {
    motionOverride = preferences.reducedMotion;
    reducedMotion = motionOverride;
  }
  if (typeof preferences.muted === 'boolean') muted = preferences.muted;
} catch { /* Preferences are optional; blocked storage never blocks the game. */ }

function savePreferences() {
  try {
    localStorage.setItem(UI_STORAGE_KEY, JSON.stringify({ focus, muted, speed: hasSpeedPreference ? speed : undefined, reducedMotion: motionOverride }));
  } catch { /* Keep functioning in memory when storage is unavailable. */ }
}

function setCamera(camera, announce = false) {
  focus = camera === 'school' ? 'school' : 'store';
  $('world-stage').dataset.focus = focus;
  const other = focus === 'store' ? 'Настю' : 'Вову';
  controls.swap.setAttribute('aria-label', `Показать ${other} крупно`);
  controls.swap.title = `Показать ${other} крупно`;
  controls.swap.querySelector('.pip-label').firstChild.textContent = `${focus === 'store' ? 'Настя' : 'Вова'} `;
  if (announce) $('announcements').textContent = focus === 'store' ? 'Основная камера: Вова, магазин.' : 'Основная камера: Настя, класс.';
  savePreferences();
}

function setMotion(value, remember = false) {
  reducedMotion = Boolean(value);
  if (remember) motionOverride = reducedMotion;
  document.body.dataset.reducedMotion = String(reducedMotion);
  controls.reducedMotion.checked = reducedMotion;
  game?.setReducedMotion(reducedMotion);
  if (remember) savePreferences();
}

function syncSoundButton() {
  const label = muted ? 'Включить звук' : 'Выключить звук';
  controls.mute.setAttribute('aria-label', label);
  controls.mute.setAttribute('aria-pressed', String(muted));
  controls.mute.title = label;
  $('sound-icon').setAttribute('href', muted ? '#i-muted' : '#i-sound');
}

function renderDialogue(messages) {
  const signature = JSON.stringify(messages.map((entry) => [entry.id, entry.speaker, entry.text]));
  if (signature === dialogueSignature) return;
  dialogueSignature = signature;
  const list = $('message-list');
  const shouldFollow = list.scrollHeight - list.scrollTop - list.clientHeight < 35;
  const oldEntries = new Map([...list.children].map((node) => [node.dataset.id, node]));
  const nextNodes = messages.map((entry, index) => {
    const key = String(entry.id ?? index);
    let node = oldEntries.get(key);
    if (!node) {
      node = document.createElement('li');
      node.className = 'message';
      node.dataset.id = key;
      const speaker = document.createElement('span');
      speaker.className = 'message-speaker';
      const text = document.createElement('p');
      text.className = 'message-text';
      node.append(speaker, text);
    }
    node.dataset.speaker = String(entry.speaker ?? '');
    node.children[0].textContent = String(entry.speaker ?? '');
    node.children[1].textContent = String(entry.text ?? '');
    return node;
  });
  for (const node of [...list.children]) if (!nextNodes.includes(node)) node.remove();
  nextNodes.forEach((node, index) => {
    if (list.children[index] !== node) list.insertBefore(node, list.children[index] || null);
  });
  $('chat-counter').textContent = String(messages.length);
  if (shouldFollow) list.scrollTop = list.scrollHeight;
}

function update(next) {
  snapshot = next;
  const phase = next.phase || 'ready';
  const hasStarted = ['playing', 'paused', 'complete'].includes(phase);
  const interactive = Boolean(game) && !commandRunning;
  document.body.dataset.phase = phase;
  $('world-stage').dataset.storyFocus = hasStarted && next.focus === 'store' ? 'store' : 'split';
  $('start-shelf').hidden = hasStarted;
  $('transport').hidden = !hasStarted || phase === 'complete';
  $('completion-shelf').hidden = phase !== 'complete';
  controls.start.disabled = !interactive;
  controls.continue.hidden = !next.hasSave;
  controls.continue.disabled = !interactive || !next.hasSave;
  controls.menu.disabled = !interactive;
  controls.swap.disabled = !interactive;
  controls.play.disabled = !interactive || !['playing', 'paused'].includes(phase);
  controls.mute.disabled = !interactive;
  controls.tempo.disabled = !interactive;
  controls.next.hidden = !next.canAdvance || phase === 'complete';
  controls.next.disabled = !interactive || !next.canAdvance;
  controls.repeat.disabled = !interactive;
  $('restart-fragment').disabled = !interactive;
  const paused = phase === 'paused';
  $('play-icon').setAttribute('href', paused ? '#i-play' : '#i-pause');
  $('play-label').textContent = paused ? 'Продолжить' : 'Пауза';
  controls.play.setAttribute('aria-label', paused ? 'Продолжить проигрывание' : 'Поставить на паузу');
  controls.play.title = paused ? 'Продолжить · пробел' : 'Пауза · пробел';
  $('scene-title').textContent = next.sceneTitle || next.title || 'Хлеб и доска';
  const progress = Math.max(0, Math.min(100, Math.round((next.progress || 0) * 100)));
  $('progress-fill').style.width = `${progress}%`;
  $('scene-progress').setAttribute('aria-valuenow', String(progress));
  $('playback-state').textContent = phase === 'complete' ? 'Завершено' : paused ? 'Пауза' : phase === 'ready' ? 'Первый фрагмент' : 'Утро';
  const messages = Array.isArray(next.dialogue) ? next.dialogue : [];
  renderDialogue(messages);
  const quietExit = next.beatId === '03.07';
  $('chat-panel').hidden = messages.length === 0 || quietExit;
  const hint = typeof next.hint === 'string' ? next.hint : '';
  $('watch-hint').hidden = !hasStarted || phase === 'complete' || next.beatId === '02.08' || quietExit || messages.length > 0 || !hint;
  $('watch-hint').textContent = hint;
  if (next.sceneId && next.sceneId !== previousScene && hasStarted) {
    $('announcements').textContent = next.sceneTitle || next.title || 'Утренняя сцена';
    previousScene = next.sceneId;
  }
  if (phase === 'complete' && previousPhase !== 'complete') {
    $('announcements').textContent = 'Первый фрагмент завершён. Утренние сцены магазина и класса.';
  }
  previousPhase = phase;
}

function showError(error, loading = false) {
  const note = $('error-note');
  note.textContent = loading ? 'Сцены не удалось загрузить. Обновите страницу, чтобы попробовать ещё раз.' : 'Действие не удалось выполнить. Можно продолжить просмотр или обновить страницу.';
  note.hidden = false;
  if (loading) {
    $('stage-status').textContent = 'Сцены пока недоступны';
    controls.start.disabled = true;
    controls.continue.disabled = true;
  }
  console.error('Obychnyy den:', error);
}

function onGameEvent(event) {
  const storageUnavailable = event?.type === 'storage-notice'
    || (event?.type === 'notice' && event.text === 'Прогресс сохранится только до закрытия страницы.');
  if (storageUnavailable) $('storage-note').hidden = false;
  const audioUnavailable = event?.type === 'audio-notice'
    || (event?.type === 'notice' && event.text === 'Звук сейчас недоступен.');
  if (audioUnavailable) $('audio-note').hidden = false;
}

async function command(action) {
  if (!game || commandRunning) return;
  commandRunning = true;
  update(snapshot);
  try {
    await action();
    $('error-note').hidden = true;
  } catch (error) {
    showError(error);
  } finally {
    commandRunning = false;
    update(snapshot);
  }
}

function togglePlayback() {
  if (snapshot.phase === 'playing') return command(() => game.pause());
  if (snapshot.phase === 'paused') return command(() => game.resume());
}

function openMenu() {
  if (!game || $('pause-menu').open) return;
  menuOpenedFrom = snapshot.phase;
  lastMenuFocus = document.activeElement;
  if (snapshot.phase === 'playing') game.pause();
  $('menu-title').textContent = snapshot.phase === 'paused' ? 'Пауза' : 'Настройки';
  $('resume-fragment').textContent = ['playing', 'paused'].includes(menuOpenedFrom) ? 'Продолжить' : 'Вернуться к фрагменту';
  $('pause-menu').showModal();
}

function closeMenu(resume = true) {
  if (!$('pause-menu').open) return;
  $('pause-menu').close();
  if (resume && snapshot.phase === 'paused' && ['playing', 'paused'].includes(menuOpenedFrom)) game.resume();
  if (lastMenuFocus?.isConnected && !lastMenuFocus.disabled) lastMenuFocus.focus();
}

controls.start.addEventListener('click', () => command(() => game.start({ resume: false })));
controls.continue.addEventListener('click', () => { if (snapshot.hasSave) command(() => game.start({ resume: true })); });
controls.play.addEventListener('click', togglePlayback);
controls.menu.addEventListener('click', openMenu);
controls.swap.addEventListener('click', () => setCamera(focus === 'store' ? 'school' : 'store', true));
controls.next.addEventListener('click', () => { if (snapshot.canAdvance) command(() => game.fastForward()); });
controls.repeat.addEventListener('click', () => command(() => game.restart()));
controls.mute.addEventListener('click', () => {
  muted = !muted;
  game?.setMuted(muted);
  syncSoundButton();
  savePreferences();
});
controls.tempo.addEventListener('change', () => {
  speed = Number(controls.tempo.value) === 2 ? 2 : 1;
  hasSpeedPreference = true;
  game?.setSpeed(speed);
  savePreferences();
});
controls.reducedMotion.addEventListener('change', () => setMotion(controls.reducedMotion.checked, true));
$('close-menu').addEventListener('click', () => closeMenu(menuOpenedFrom === 'playing'));
$('resume-fragment').addEventListener('click', () => closeMenu(true));
$('restart-fragment').addEventListener('click', () => {
  closeMenu(false);
  command(() => game.restart());
});
$('pause-menu').addEventListener('cancel', (event) => {
  event.preventDefault();
  closeMenu(menuOpenedFrom === 'playing');
});
$('show-sources').addEventListener('click', () => {
  const open = $('show-sources').getAttribute('aria-expanded') !== 'true';
  $('show-sources').setAttribute('aria-expanded', String(open));
  $('show-sources').querySelector('span').textContent = open ? '−' : '+';
  $('sources-content').hidden = !open;
});
document.addEventListener('keydown', (event) => {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || $('pause-menu').open) return;
  if ((event.key === ' ' || event.key === 'Enter') && ['BODY', 'CANVAS'].includes(event.target.tagName)) {
    event.preventDefault();
    if (snapshot.phase === 'ready') command(() => game.start({ resume: false }));
    else togglePlayback();
  }
});
motionQuery.addEventListener?.('change', (event) => { if (motionOverride === null) setMotion(event.matches); });
setCamera(focus);
setMotion(reducedMotion);
syncSoundButton();

try {
  game = await createGame({
    storeCanvas: $('store-canvas'),
    schoolCanvas: $('school-canvas'),
    onUpdate: update,
    onEvent: onGameEvent,
  });
  window.__game = game;
  window.__ui = { game, getSnapshot: () => snapshot, focusCamera: setCamera, controls };
  if (!hasSpeedPreference) {
    speed = snapshot.speed === 2 ? 2 : 1;
    hasSpeedPreference = true;
  }
  controls.tempo.value = String(speed);
  game.setSpeed(speed);
  game.setMuted(muted);
  game.setReducedMotion(reducedMotion);
  savePreferences();
  $('stage-status').hidden = true;
  update(snapshot.phase === 'loading' ? { ...snapshot, phase: 'ready' } : snapshot);
} catch (error) {
  showError(error, true);
}
