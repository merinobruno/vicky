import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHAOS, DISCORD_INVITE_URL, InvitationState, overlaps, pickPosition, stageFor, tauntFor } from '../game.mjs';

test('touch pointerdown plus the browser click count as one attempt', () => {
  const state = new InvitationState();
  assert.equal(state.pointerDown('no', 1000), true);
  assert.equal(state.noClick(1030, 1), false);
  assert.equal(state.noClick(1600, 1), false);
  assert.equal(state.attempts, 1);
  assert.equal(state.accepted, false);
  assert.equal(state.pointerDown('no', 2000), true);
  assert.equal(state.attempts, 2);
});
test('a gesture beginning on No cannot click through to Yes', () => {
  const state = new InvitationState();
  state.pointerDown('no', 1000);
  assert.equal(state.accept(1), false);
  assert.equal(state.accepted, false);
  state.pointerDown('yes', 1100);
  assert.equal(state.accept(1), true);
  assert.equal(state.accepted, true);
});
test('Yes requires its own pointerdown or a keyboard/assistive activation', () => {
  const state = new InvitationState();
  state.pointerDown('other', 1000);
  assert.equal(state.accept(1), false);
  assert.equal(state.accept(0), true);
});
test('Enter and Space attempts work; repeats and synthetic clicks do not double count', () => {
  const state = new InvitationState();
  assert.equal(state.noKey('Enter', false, 1000), true);
  assert.equal(state.noKey('Enter', true, 1010), false);
  assert.equal(state.noClick(1015, 0), false);
  assert.equal(state.noKey(' ', false, 1100), true);
  assert.equal(state.noKey('Tab', false, 1150), false);
  assert.equal(state.noClick(1160, 0), false);
  assert.equal(state.attempts, 2);
});
test('pointer proximity is throttled and a following pointerdown is deduplicated', () => {
  const state = new InvitationState();
  assert.equal(state.attempt(1000), true);
  assert.equal(state.attempt(1100), false);
  assert.equal(state.pointerDown('no', 1200), false);
  assert.equal(state.noClick(1220), false);
  assert.equal(state.attempt(1500), true);
});
test('acceptance is a one-way transition: only one celebration and redirect can start', () => {
  const state = new InvitationState();
  assert.equal(state.accept(), true);
  assert.equal(state.accept(), false);
  assert.equal(state.attempt(1000), false);
  assert.equal(state.noKey('Enter', false, 2000), false);
  assert.equal(state.attempts, 0);
  assert.equal(CHAOS.redirectDelay, 2500);
  assert.equal(DISCORD_INVITE_URL, 'https://discord.gg/hXT6Euajp');
});
test('chaos escalates at the defined boundaries and remains bounded', () => {
  assert.deepEqual([0, 1, 3, 4, 7, 8, 12, 13, 1000].map(stageFor), [0, 1, 1, 2, 2, 3, 3, 4, 4]);
  assert.equal(tauntFor(1), 'Oops. Slippery button.');
  assert.ok(tauntFor(1000).length > 0);
  assert.ok(CHAOS.maxYesScale < 1.3);
});
test('escape positions stay inside narrow viewport and avoid protected content', () => {
  const viewport = { x: 0, y: 0, width: 320, height: 568 };
  const size = { width: 160, height: 52 };
  const obstacles = [{ x: 30, y: 100, width: 260, height: 95 }, { x: 30, y: 235, width: 175, height: 60 }, { x: 150, y: 360, width: 140, height: 110 }];
  for (let i = 0; i < 100; i++) {
    const position = pickPosition({ viewport, size, obstacles, pointer: { x: 120, y: 300 } });
    assert.ok(position);
    assert.ok(position.x >= 16 && position.x + size.width <= 304);
    assert.ok(position.y >= 16 && position.y + size.height <= 552);
    assert.ok(obstacles.every(obstacle => !overlaps({ ...position, ...size }, obstacle, 12)));
  }
});
test('safe viewport offsets and orientation changes are honored', () => {
  for (const viewport of [{ x: 20, y: 30, width: 720, height: 320 }, { x: 0, y: 0, width: 320, height: 720 }]) {
    const size = { width: 85, height: 52 };
    const position = pickPosition({ viewport, size });
    assert.ok(position.x >= viewport.x + 16);
    assert.ok(position.y >= viewport.y + 16);
    assert.ok(position.x + size.width <= viewport.x + viewport.width - 16);
    assert.ok(position.y + size.height <= viewport.y + viewport.height - 16);
  }
});
test('impossible geometry returns a bounded no-fit signal instead of covering controls', () => {
  const viewport = { x: 0, y: 0, width: 320, height: 180 };
  const result = pickPosition({ viewport, size: { width: 180, height: 52 }, obstacles: [viewport], random: () => .5 });
  assert.equal(result, null);
});
