export const DISCORD_INVITE_URL = 'https://discord.gg/hXT6Euajp';
export const CHAOS = Object.freeze({ cooldown: 480, redirectDelay: 2500, maxYesScale: 1.22, maxParticles: 620, mobileParticles: 280 });
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
  attempt(time, bypassCooldown = false) {
    if (this.accepted || (!bypassCooldown && time - this.lastAttempt < CHAOS.cooldown)) return false;
    this.attempts++;
    this.lastAttempt = time;
    return true;
  }
  pointerDown(target, time) {
    this.pointerOrigin = target;
    this.pointerCounted = target === 'no';
    return target === 'no' && this.attempt(time);
  }
  noClick(time, detail = 1) {
    if ((detail > 0 && this.pointerCounted) || (detail === 0 && time - this.lastKeyboard < CHAOS.cooldown)) return false;
    return this.attempt(time);
  }
  noKey(key, repeat, time) {
    if (!['Enter', ' '].includes(key) || repeat || this.accepted) return false;
    this.lastKeyboard = time;
    return this.attempt(time, true);
  }
  accept(detail = 0) {
    if (this.accepted || (detail > 0 && this.pointerOrigin !== 'yes')) return false;
    this.accepted = true;
    this.pointerOrigin = null;
    return true;
  }
}
export function overlaps(a, b, gap = 0) { return a.x < b.x + b.width + gap && a.x + a.width + gap > b.x && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y; }
export function pickPosition({ viewport, size, obstacles = [], pointer, previous, random = Math.random, margin = 16 }) {
  const left = viewport.x + margin;
  const top = viewport.y + margin;
  const maxX = Math.max(left, viewport.x + viewport.width - size.width - margin);
  const maxY = Math.max(top, viewport.y + viewport.height - size.height - margin);
  const candidates = [];
  const add = (x, y) => candidates.push({ x: Math.max(left, Math.min(maxX, x)), y: Math.max(top, Math.min(maxY, y)), ...size });
  // Random escapes plus a bounded grid guarantee a deterministic fallback.
  for (let n = 0; n < 36; n++) add(left + random() * (maxX - left), top + random() * (maxY - top));
  for (let y = 0; y <= 8; y++) for (let x = 0; x <= 8; x++) add(left + (maxX - left) * x / 8, top + (maxY - top) * y / 8);
  if (previous) {
    add(previous.x + 140, previous.y + 65);
    add(previous.x - 140, previous.y - 65);
  }
  let best = null;
  let bestScore = -Infinity;
  for (const candidate of candidates) {
    const overlapCount = obstacles.filter(obstacle => overlaps(candidate, obstacle, 12)).length;
    if (overlapCount) continue;
    const pointerDistance = pointer ? Math.hypot(candidate.x + size.width / 2 - pointer.x, candidate.y + size.height / 2 - pointer.y) : 160;
    const movedDistance = previous ? Math.hypot(candidate.x - previous.x, candidate.y - previous.y) : 160;
    const score = -overlapCount * 100000 + Math.min(pointerDistance, 350) + Math.min(movedDistance, 240) + random() * 160;
    if (score > bestScore) { best = candidate; bestScore = score; }
  }
  return best ? { x: best.x, y: best.y } : null;
}
