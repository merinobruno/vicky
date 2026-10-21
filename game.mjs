export const DISCORD_INVITE_URL = 'https://discord.gg/hXT6Euajp';
export const CHAOS = Object.freeze({ cooldown: 480, travelDuration: 340, landingPause: 120, redirectDelay: 2500, yesGrowth: 1.65, takeoverAt: 6, maxParticles: 620, mobileParticles: 280 });
export const TAUNTS = [
  'Oops. Slippery button.',
  'Were you aiming for the other one?',
  'Miku saw that.',
  'Your rejection has been rejected.',
  'Have you considered the big turquoise button?',
  'Miku is increasing the friendship budget.',
  'That button has places to be.',
  'Plot twist: Miku owns this website.',
  'No.exe has stopped responding.',
  'This is a co-op game. Cooperate. ♡',
  'Your escape route has been remixed.',
  'A perfectly reasonable amount of friendship.',
  'The No department is currently closed.',
  'Resistance is a rhythm game. You are losing.',
  'Congratulations! You unlocked more Miku.',
  'The leeks have voted. It is unanimous.',
  'Friendship budget: financially irresponsible.',
  'This button is now on its world tour.',
  'You could have been in the lobby by now. ♡'
];
export function stageFor(attempts) { return attempts >= 13 ? 4 : attempts >= 8 ? 3 : attempts >= 4 ? 2 : attempts > 0 ? 1 : 0; }
export function tauntFor(attempts) { return TAUNTS[(Math.max(1, attempts) - 1) % TAUNTS.length]; }
export class InvitationState {
  attempts = 0;
  accepted = false;
  lastAttempt = -Infinity;
  lastKeyboard = -Infinity;
  pointerOrigin = null;
  pointerCounted = false;
  keyboardOrigin = null;
  noCovered = false;
  attemptsBlockedUntil = -Infinity;
  pauseAttemptsUntil(time) { this.attemptsBlockedUntil = time; }
  attempt(time, bypassCooldown = false) {
    if (this.accepted || this.noCovered || time < this.attemptsBlockedUntil || (!bypassCooldown && time - this.lastAttempt < CHAOS.cooldown)) return false;
    this.attempts++;
    this.noCovered = this.attempts >= CHAOS.takeoverAt;
    this.lastAttempt = time;
    return true;
  }
  pointerDown(target, time) {
    this.pointerOrigin = target;
    this.pointerCounted = target === 'no';
    if (target === 'no' || target === 'yes') this.keyboardOrigin = target;
    return target === 'no' && this.attempt(time);
  }
  noClick(time, detail = 1) {
    if ((detail > 0 && this.pointerCounted) || (detail === 0 && time - this.lastKeyboard < CHAOS.cooldown)) return false;
    return this.attempt(time);
  }
  noKey(key, repeat, time) {
    if (!['Enter', ' '].includes(key) || repeat || this.accepted || this.noCovered) return false;
    this.keyboardOrigin = 'no';
    this.lastKeyboard = time;
    return this.attempt(time, true);
  }
  focusYes() { this.keyboardOrigin = 'yes'; }
  accept(detail = 0) {
    if (this.accepted || (detail > 0 && this.pointerOrigin !== 'yes') || (detail === 0 && this.keyboardOrigin === 'no')) return false;
    this.accepted = true;
    this.pointerOrigin = null;
    return true;
  }
}
export function yesRectFor({ attempts, viewport, initial }) {
  if (attempts >= CHAOS.takeoverAt) return { ...viewport, full: true };
  const scale = CHAOS.yesGrowth ** Math.max(0, attempts);
  const width = Math.min(viewport.width * Math.min(1, .45 + attempts * .11), initial.width * scale);
  const height = Math.min(Math.max(1, viewport.height - 120), initial.height * scale);
  const progress = Math.min(1, attempts / 4);
  const centerX = (initial.x + initial.width / 2) * (1 - progress) + (viewport.x + viewport.width / 2) * progress;
  const centerY = (initial.y + initial.height / 2) * (1 - progress) + (viewport.y + viewport.height / 2) * progress;
  return {
    x: Math.max(viewport.x, Math.min(viewport.x + viewport.width - width, centerX - width / 2)),
    y: Math.max(viewport.y, Math.min(viewport.y + viewport.height - height - 120, centerY - height / 2)),
    width, height, full: false
  };
}
export function overlaps(a, b, gap = 0) { return a.x < b.x + b.width + gap && a.x + a.width + gap > b.x && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y; }
export function pickPosition({ viewport, size, obstacles = [], pathObstacles = [], pointer, previous, preferPrevious = false, random = Math.random, margin = 16 }) {
  const left = viewport.x + margin;
  const top = viewport.y + margin;
  const maxX = Math.max(left, viewport.x + viewport.width - size.width - margin);
  const maxY = Math.max(top, viewport.y + viewport.height - size.height - margin);
  const escapeDistance = Math.min(480, Math.max(180, Math.min(viewport.width, viewport.height) * .8));
  if (preferPrevious && previous && previous.x >= left && previous.x <= maxX && previous.y >= top && previous.y <= maxY && obstacles.every(obstacle => !overlaps({ ...previous, ...size }, obstacle, 12))) {
    return { x: previous.x, y: previous.y };
  }
  const candidates = [];
  const add = (x, y) => candidates.push({ x: Math.max(left, Math.min(maxX, x)), y: Math.max(top, Math.min(maxY, y)), ...size });
  // Random escapes plus a bounded grid guarantee a deterministic fallback.
  for (let n = 0; n < 36; n++) add(left + random() * (maxX - left), top + random() * (maxY - top));
  for (let y = 0; y <= 8; y++) for (let x = 0; x <= 8; x++) add(left + (maxX - left) * x / 8, top + (maxY - top) * y / 8);
  if (previous) {
    for (const distance of [escapeDistance * .75, escapeDistance, escapeDistance * 1.12]) {
      for (let n = 0; n < 16; n++) add(previous.x + Math.cos(n * Math.PI / 8) * distance, previous.y + Math.sin(n * Math.PI / 8) * distance);
    }
  }
  let best = null;
  let bestScore = -Infinity;
  for (const candidate of candidates) {
    const overlapCount = obstacles.filter(obstacle => overlaps(candidate, obstacle, 12)).length;
    if (overlapCount) continue;
    // A conservative swept rectangle keeps the moving button away from Yes.
    if (previous && pathObstacles.length) {
      const swept = { x: Math.min(previous.x, candidate.x), y: Math.min(previous.y, candidate.y), width: Math.abs(previous.x - candidate.x) + size.width, height: Math.abs(previous.y - candidate.y) + size.height };
      if (pathObstacles.some(obstacle => overlaps(swept, obstacle, 8))) continue;
    }
    const pointerDistance = pointer ? Math.hypot(candidate.x + size.width / 2 - pointer.x, candidate.y + size.height / 2 - pointer.y) : 160;
    const movedDistance = previous ? Math.hypot(candidate.x - previous.x, candidate.y - previous.y) : 160;
    const score = Math.min(pointerDistance, escapeDistance + 70) * 1.1 - Math.abs(movedDistance - escapeDistance) * .6 - Math.max(0, movedDistance - escapeDistance * 1.15) * 3 + random() * 25;
    if (score > bestScore) { best = candidate; bestScore = score; }
  }
  return best ? { x: best.x, y: best.y } : null;
}
