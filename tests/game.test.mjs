import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHAOS, DISCORD_INVITE_URL, InvitationState, overlaps, pickPosition, stageFor, tauntFor, yesRectFor } from '../game.mjs';

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
test('chaos escalates at the defined boundaries', () => {
  assert.deepEqual([0, 1, 3, 4, 7, 8, 12, 13, 1000].map(stageFor), [0, 1, 1, 2, 2, 3, 3, 4, 4]);
  assert.equal(tauntFor(1), 'Oops. Slippery button.');
  assert.ok(tauntFor(1000).length > 0);
  assert.equal(CHAOS.takeoverAt, 20);
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

test('travel and landing pause prevent repeated escapes while retaining the gesture guard', () => {
  const state = new InvitationState();
  assert.equal(state.attempt(1000), true);
  state.pauseAttemptsUntil(1000 + CHAOS.travelDuration + CHAOS.landingPause);
  assert.equal(state.pointerDown('no', 1300), false);
  assert.equal(state.noKey('Enter', false, 1350), false);
  assert.equal(state.accept(1), false);
  assert.equal(state.attempts, 1);
  assert.equal(state.noKey(' ', false, 2000), true);
  assert.equal(state.attempts, 2);
});

test('escapes travel much farther from the pointer without sweeping across Yes', () => {
  const viewport = { x: 0, y: 0, width: 1440, height: 800 };
  const size = { width: 85, height: 52 };
  const previous = { x: 500, y: 450 };
  const yes = { x: 280, y: 440, width: 190, height: 65 };
  for (let n = 0; n < 100; n++) {
    const position = pickPosition({ viewport, size, previous, obstacles: [yes], pathObstacles: [yes], pointer: { x: 540, y: 476 } });
    assert.ok(position);
    const distance = Math.hypot(position.x - previous.x, position.y - previous.y);
    assert.ok(distance >= 350 && distance <= 575);
    const swept = { x: Math.min(previous.x, position.x), y: Math.min(previous.y, position.y), width: Math.abs(previous.x - position.x) + size.width, height: Math.abs(previous.y - position.y) + size.height };
    assert.equal(overlaps(swept, yes, 8), false);
  }
});

test('scroll and resize corrections retain an already safe visible position', () => {
  const previous = { x: 250, y: 420 };
  assert.deepEqual(pickPosition({ viewport: { x: 0, y: 0, width: 700, height: 600 }, size: { width: 85, height: 52 }, previous, preferPrevious: true }), previous);
});

test('Yes grows on every escape and covers the complete viewport only on twenty', () => {
  for (const viewport of [{ x: 0, y: 0, width: 1440, height: 800 }, { x: 0, y: 0, width: 320, height: 568 }, { x: 14, y: 21, width: 800, height: 320 }]) {
    const initial = { x: 80, y: 250, width: 140, height: 54 };
    let previousArea = initial.width * initial.height;
    for (let attempts = 1; attempts <= CHAOS.takeoverAt; attempts++) {
      const result = yesRectFor({ attempts, viewport, initial });
      assert.ok(result.width * result.height > previousArea);
      assert.ok(result.x >= viewport.x && result.y >= viewport.y);
      assert.ok(result.x + result.width <= viewport.x + viewport.width + .001);
      assert.ok(result.y + result.height <= viewport.y + viewport.height + .001);
      if (attempts < CHAOS.takeoverAt) {
        assert.equal(result.full, false);
        assert.ok(result.y + result.height <= viewport.y + viewport.height - 100 + .001);
      }
      else assert.deepEqual(result, { ...viewport, full: true });
      previousArea = result.width * result.height;
    }
    const first = yesRectFor({ attempts: 1, viewport, initial });
    assert.ok(first.width * first.height < initial.width * initial.height * 2);
    const sixth = yesRectFor({ attempts: 6, viewport, initial });
    assert.ok(sixth.width * sixth.height < viewport.width * viewport.height * .3);
  }
});

test('No retains a safe endpoint outside the growing Yes until takeover', () => {
  for (const viewport of [{ x: 0, y: 0, width: 1440, height: 800 }, { x: 0, y: 0, width: 320, height: 568 }]) {
    for (let attempts = 1; attempts < CHAOS.takeoverAt; attempts++) {
      const yes = yesRectFor({ attempts, viewport, initial: { x: 40, y: 280, width: 140, height: 54 } });
      const size = { width: 85, height: 52 };
      const position = pickPosition({ viewport, size, obstacles: [yes] });
      assert.ok(position);
      assert.equal(overlaps({ ...position, ...size }, yes, 12), false);
    }
  }
});

test('the final No pointer gesture cannot accept the covering Yes', () => {
  const state = new InvitationState();
  for (let n = 1; n <= CHAOS.takeoverAt; n++) {
    assert.equal(state.pointerDown('no', n * 1000), true);
    assert.equal(state.noCovered, n === CHAOS.takeoverAt);
  }
  const takeoverTime = CHAOS.takeoverAt * 1000;
  assert.equal(state.noCovered, true);
  assert.equal(state.accept(1), false);
  assert.equal(state.accept(0), false);
  assert.equal(state.attempt(takeoverTime + 2000), false);
  assert.equal(state.accepted, false);
  state.pointerDown('yes', takeoverTime + 3000);
  assert.equal(state.accept(1), true);
});

test('final No Enter or Space never accepts without a new intentional Yes focus', () => {
  for (const key of ['Enter', ' ']) {
    const state = new InvitationState();
    for (let n = 1; n <= CHAOS.takeoverAt; n++) {
      assert.equal(state.noKey(key, false, n * 1000), true);
      assert.equal(state.noCovered, n === CHAOS.takeoverAt);
    }
    const takeoverTime = CHAOS.takeoverAt * 1000;
    assert.equal(state.noCovered, true);
    assert.equal(state.noKey(key, true, takeoverTime + 100), false);
    assert.equal(state.accept(0), false);
    assert.equal(state.noClick(takeoverTime + 200, 0), false);
    assert.equal(state.accepted, false);
    state.focusYes();
    assert.equal(state.accept(0), true);
  }
});
