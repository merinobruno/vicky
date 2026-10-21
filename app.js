import { CHAOS, DISCORD_INVITE_URL, InvitationState, pickPosition, stageFor, tauntFor } from './game.mjs';

const $ = id => document.getElementById(id);
const state = new InvitationState();
const no = $('no-button');
const yes = $('yes-button');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const timers = new Set();
const lifetime = new AbortController();
let lastPointer = null;
let resizeFrame = 0;
let animationFrame = 0;
let noTravel = null;
let clearConfetti = () => {};
const on = (target, type, listener, options = {}) => target.addEventListener(type, listener, { ...options, signal: lifetime.signal });
const later = (fn, delay) => { const id = setTimeout(() => { timers.delete(id); fn(); }, delay); timers.add(id); return id; };
const rect = element => { const r = element.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; };

$('discord-link').href = DISCORD_INVITE_URL;
function syncMotion() {
  document.body.classList.toggle('reduced-motion', reducedMotion.matches);
  if (reducedMotion.matches && noTravel) noTravel.finish();
}
syncMotion();
on(reducedMotion, 'change', syncMotion);

function usableViewport() {
  const viewport = window.visualViewport;
  const safe = getComputedStyle($('safe-area-probe'));
  const inset = name => parseFloat(safe[name]) || 0;
  return {
    x: (viewport?.offsetLeft || 0) + inset('paddingLeft'),
    y: (viewport?.offsetTop || 0) + inset('paddingTop'),
    width: (viewport?.width || innerWidth) - inset('paddingLeft') - inset('paddingRight'),
    height: (viewport?.height || innerHeight) - inset('paddingTop') - inset('paddingBottom')
  };
}

function moveNo(pointer = lastPointer, { animate = true, from = rect(no), preservePosition = false } = {}) {
  if (state.accepted) return;
  const previous = from;
  if (noTravel) { noTravel.cancel(); noTravel = null; }
  no.classList.remove('is-moving', 'just-landed');
  // Preserve the initial inline location before changing the positioning mode.
  no.style.setProperty('--no-x', `${previous.x}px`);
  no.style.setProperty('--no-y', `${previous.y}px`);
  no.classList.add('is-loose');
  const viewport = usableViewport();
  const obstacles = [yes, $('question'), $('face-zone'), document.querySelector('.site-header'), $('speech'), $('discord-link')]
    .filter(element => !element.hidden).map(rect);
  let size = { width: no.offsetWidth, height: no.offsetHeight };
  const pathObstacles = animate && !reducedMotion.matches ? [rect(yes)] : [];
  let position = pickPosition({ viewport, size, obstacles, pathObstacles, pointer, previous, preferPrevious: preservePosition });
  if (!position) {
    no.textContent = 'No';
    no.classList.add('is-compact');
    size = { width: no.offsetWidth, height: no.offsetHeight };
    position = pickPosition({ viewport, size, obstacles, pathObstacles, pointer, previous, preferPrevious: preservePosition });
  }
  if (!position || document.body.classList.contains('escape-docked')) {
    // Extremely short viewports get a dedicated strip; the page remains scrollable above it.
    document.body.classList.add('escape-docked');
    position = { x: viewport.x + 16 + Math.random() * Math.max(0, viewport.width - size.width - 32), y: viewport.y + viewport.height - size.height - 16 };
    animate = false;
  }
  no.style.setProperty('--no-x', `${position.x}px`);
  no.style.setProperty('--no-y', `${position.y}px`);
  if (animate && !reducedMotion.matches && Math.hypot(previous.x - position.x, previous.y - position.y) > 3) {
    no.classList.add('is-moving');
    state.pauseAttemptsUntil(performance.now() + CHAOS.travelDuration + CHAOS.landingPause);
    noTravel = no.animate([
      { transform: `translate(${previous.x - position.x}px, ${previous.y - position.y}px)` },
      { transform: 'translate(0, 0)' }
    ], { duration: CHAOS.travelDuration, easing: 'cubic-bezier(.3, .05, .25, 1)' });
    noTravel.onfinish = () => {
      noTravel = null;
      no.classList.remove('is-moving');
      if (!state.accepted) no.classList.add('just-landed');
    };
  } else {
    no.classList.add('just-landed');
  }
}

function makeEffects(previous) {
  if (reducedMotion.matches) return;
  if (state.attempts >= 8) {
    const ghost = document.createElement('span');
    ghost.className = 'afterimage';
    ghost.textContent = no.textContent;
    Object.assign(ghost.style, { left: `${previous.x}px`, top: `${previous.y}px`, width: `${previous.width}px`, height: `${previous.height}px` });
    $('effects').append(ghost);
    later(() => ghost.remove(), 700);
  }
  if (state.attempts >= 4) {
    const symbols = ['♪', '♡', '✦', '♫', '🥬'];
    for (let n = 0; n < Math.min(7, 2 + Math.floor(state.attempts / 3)); n++) {
      const sticker = document.createElement('span');
      sticker.className = 'sticker';
      sticker.textContent = symbols[(state.attempts + n) % symbols.length];
      Object.assign(sticker.style, { left: `${previous.x + previous.width / 2 + (Math.random() - .5) * 55}px`, top: `${previous.y}px`, color: n % 2 ? '#ff78b8' : '#91ffe0' });
      sticker.style.setProperty('--drift', `${(Math.random() - .5) * 120}px`);
      $('effects').append(sticker);
      later(() => sticker.remove(), 1100);
    }
  }
}

function renderAttempt() {
  const previous = rect(no);
  const stage = stageFor(state.attempts);
  document.body.classList.remove('stage-0', 'stage-1', 'stage-2', 'stage-3', 'stage-4');
  document.body.classList.add(`stage-${stage}`, 'has-attempts');
  document.body.dataset.attempts = state.attempts;
  $('reaction-text').textContent = tauntFor(state.attempts);
  $('attempt-info').hidden = false;
  $('attempt-count').textContent = `Failed escape attempts: ${state.attempts}`;
  $('resistance').textContent = `RESISTANCE ${state.attempts > 12 ? state.attempts * 39 : Math.min(99, state.attempts * 8)}%`;
  $('resistance-fill').style.width = `${Math.min(100, state.attempts * 8)}%`;
  document.documentElement.style.setProperty('--yes-scale', Math.min(CHAOS.maxYesScale, 1 + state.attempts * .019));
  const speeches = ['hey, you! ♡', 'excuse me?! ♡', 'oh, we’re doing this?', 'I make the rules. ♡', 'The No department is closed.'];
  $('speech').textContent = speeches[stage];
  no.textContent = stage >= 3 ? ['Nice try', 'Absolutely maybe', 'No.exe stopped responding', 'No'][state.attempts % 4] : 'No';
  no.classList.toggle('is-error', stage === 4 && state.attempts % 3 === 1);
  no.setAttribute('aria-label', `${no.textContent}. Try to decline the invitation`);
  makeEffects(previous);
  moveNo(lastPointer, { from: previous });
  const scene = $('character-scene');
  scene.classList.remove('react');
  yes.classList.remove('pulse');
  void scene.offsetWidth;
  scene.classList.add('react');
  yes.classList.add('pulse');
  if (state.attempts === 8 || state.attempts === 13 || state.attempts % 10 === 0) {
    $('takeover').classList.add('show');
    later(() => $('takeover').classList.remove('show'), 1500);
  }
}

function attempt(time = performance.now()) { if (state.attempt(time)) renderAttempt(); }
on(document, 'pointermove', event => {
  if (state.accepted || event.pointerType !== 'mouse') return;
  lastPointer = { x: event.clientX, y: event.clientY };
  const button = no.getBoundingClientRect();
  const dx = Math.max(button.left - event.clientX, 0, event.clientX - button.right);
  const dy = Math.max(button.top - event.clientY, 0, event.clientY - button.bottom);
  if (Math.hypot(dx, dy) < 36) attempt();
}, { passive: true });
on(no, 'pointerenter', event => { if (event.pointerType === 'mouse') attempt(); });
on(document, 'pointerdown', event => {
  const target = no.contains(event.target) ? 'no' : yes.contains(event.target) ? 'yes' : 'other';
  if (target === 'no') {
    event.preventDefault();
    lastPointer = { x: event.clientX, y: event.clientY };
    no.focus({ preventScroll: true });
  }
  if (state.pointerDown(target, performance.now())) renderAttempt();
}, { capture: true });
on(no, 'click', event => { event.preventDefault(); if (state.noClick(performance.now(), event.detail)) renderAttempt(); });
on(no, 'keydown', event => {
  if (!['Enter', ' '].includes(event.key)) return;
  event.preventDefault();
  if (state.noKey(event.key, event.repeat, performance.now())) renderAttempt();
});
on(no, 'keyup', event => { if (['Enter', ' '].includes(event.key)) event.preventDefault(); });
on(yes, 'click', event => {
  if (!state.accept(event.detail)) return;
  celebrate();
});

function scheduleReposition() {
  if (!no.classList.contains('is-loose') || state.accepted || resizeFrame) return;
  resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; moveNo(null, { animate: false, preservePosition: true }); });
}
on(window, 'resize', scheduleReposition);
on(window, 'orientationchange', scheduleReposition);
on(window, 'scroll', scheduleReposition, { passive: true });
on(document.querySelector('.page-shell'), 'scroll', scheduleReposition, { passive: true });
if (window.visualViewport) {
  on(window.visualViewport, 'resize', scheduleReposition);
  on(window.visualViewport, 'scroll', scheduleReposition);
}

function confetti() {
  const canvas = $('confetti');
  const context = canvas.getContext('2d');
  if (!context) return;
  let width = innerWidth;
  let height = innerHeight;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  context.scale(dpr, dpr);
  const colors = ['#91ffe0', '#ff78b8', '#ffffff', '#b9cbd1', '#39d7cd'];
  let particles = [];
  let last = performance.now();
  const reduced = reducedMotion.matches;
  const budget = reduced ? 32 : innerWidth < 700 ? CHAOS.mobileParticles : CHAOS.maxParticles;
  function burst(count, shower = false) {
    for (let n = 0; n < count; n++) {
      const side = n % 2;
      particles.push({
        x: shower || reduced ? Math.random() * width : side ? width + 10 : -10,
        y: shower || reduced ? -20 - Math.random() * 140 : height * .65,
        vx: reduced ? 0 : shower ? (Math.random() - .5) * 3 : (side ? -1 : 1) * (5 + Math.random() * 14),
        vy: reduced ? 1.8 : shower ? 2 + Math.random() * 3 : -9 - Math.random() * 12,
        size: 5 + Math.random() * 7, color: colors[n % colors.length], rotation: Math.random() * Math.PI,
        spin: (Math.random() - .5) * .2, shape: n % 12, life: 0
      });
    }
  }
  burst(Math.floor(budget * .55));
  if (!reduced) { later(() => burst(Math.floor(budget * .25)), 450); later(() => burst(Math.floor(budget * .2), true), 950); }
  function draw(now) {
    const dt = Math.min(2, (now - last) / 16.67); last = now;
    context.clearRect(0, 0, width, height);
    particles = particles.filter(p => p.y < height + 45 && p.life < 240);
    for (const p of particles) {
      p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (reduced ? .015 : .16) * dt;
      p.vx *= .994; p.rotation += p.spin * dt;
      context.save(); context.translate(p.x, p.y); context.rotate(reduced ? 0 : p.rotation); context.fillStyle = p.color;
      context.globalAlpha = Math.min(1, (240 - p.life) / 30);
      if (p.shape < 4) { context.font = `${p.size + 10}px sans-serif`; context.fillText(['♡', '✦', '♪', '🥬'][p.shape], 0, 0); }
      else context.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * (p.shape % 2 ? .4 : 1));
      context.restore();
    }
    if (particles.length) animationFrame = requestAnimationFrame(draw);
  }
  animationFrame = requestAnimationFrame(draw);
  clearConfetti = () => { cancelAnimationFrame(animationFrame); particles = []; context.clearRect(0, 0, width, height); };
}

function celebrate() {
  if (noTravel) { noTravel.cancel(); noTravel = null; }
  document.body.classList.add('accepted');
  document.body.dataset.accepted = 'true';
  $('actions').hidden = true;
  $('attempt-info').hidden = true;
  $('takeover').classList.remove('show');
  $('effects').replaceChildren();
  $('player-label').textContent = 'PLAYER 2 FOUND';
  $('question').textContent = 'YAAAY! LET’S PLAY! ♡';
  $('subtitle').textContent = 'Miku approves. Opening Discord…';
  $('speech').textContent = 'BEST. DAY. EVER. ♡';
  $('reaction-text').textContent = 'Friendship achieved. See you in the lobby!';
  $('discord-link').hidden = false;
  $('discord-link').focus({ preventScroll: true });
  confetti();
  later(() => { window.location.assign(DISCORD_INVITE_URL); }, CHAOS.redirectDelay);
}

on(window, 'pagehide', () => {
  timers.forEach(clearTimeout); timers.clear();
  cancelAnimationFrame(resizeFrame); clearConfetti(); lifetime.abort();
  if (noTravel) noTravel.cancel();
});
// A restored back/forward-cache page should be a fresh invitation, not a frozen celebration.
window.addEventListener('pageshow', event => { if (event.persisted) window.location.reload(); });
