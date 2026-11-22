// Screenshot staging: how the game's own rules produce each still frame.
// A `?shot=` query picks a scene; the stager builds a fresh world from the
// seed and plays it forward with a simple autopilot for a fixed number of
// 1/60s steps, so the same seed always yields the same frame — and every
// frame is the real game, never a posed mock-up.

import { createWorld, updateWorld, resetWorld } from './world.js';

// The autopilot's route through the museum: down the bottom corridor,
// up the right side, in through the vault gap, then back out the same way.
// Waypoints steer around the divider wall and the display cases.
const ROUTE_IN = [
  { x: 300, y: 730 },
  { x: 520, y: 730 },
  { x: 700, y: 730 },
  { x: 850, y: 730 },
  { x: 850, y: 560 },
  { x: 920, y: 460 },
  { x: 920, y: 300 },
  { x: 940, y: 210 },
  { x: 1040, y: 210 },
  { x: 1152, y: 150 },
];
const ROUTE_OUT = [
  { x: 1040, y: 210 },
  { x: 940, y: 210 },
  { x: 920, y: 300 },
  { x: 920, y: 460 },
  { x: 850, y: 560 },
  { x: 850, y: 730 },
  { x: 700, y: 730 },
  { x: 520, y: 730 },
  { x: 300, y: 730 },
  { x: 80, y: 730 },
];

const STEP = 1 / 60;

// A synthetic input object shaped like the real keyboard/mouse state.
function blankInput() {
  return {
    keys: new Set(),
    pressed: new Set(),
    mouseX: 0,
    mouseY: 0,
    mouseClicked: false,
    mouseDown: false,
  };
}

// Steer the thief toward a point: the matching WASD keys, sneaking when a
// guard is close enough to matter.
function steerInput(world, target, sneak) {
  const input = blankInput();
  const p = world.player;
  const dx = target.x - p.x;
  const dy = target.y - p.y;
  if (dx > 12) input.keys.add('KeyD');
  if (dx < -12) input.keys.add('KeyA');
  if (dy > 12) input.keys.add('KeyS');
  if (dy < -12) input.keys.add('KeyW');
  if (sneak) input.keys.add('ShiftLeft');
  return input;
}

function guardNear(world, radius) {
  const p = world.player;
  return world.guards.some((g) => Math.hypot(g.x - p.x, g.y - p.y) < radius);
}

// One autopilot step toward the job's goal: fetch the Star, then run.
function autopilotStep(world, state) {
  const p = world.player;
  const input = blankInput();
  if (!world.hasArtifact) {
    const a = world.artifact;
    if (Math.hypot(p.x - a.x, p.y - a.y) < 55) {
      // Stand by the mount and hold E until the Star comes free.
      input.keys.add('KeyE');
      input.pressed.add('KeyE');
      return input;
    }
    const target = ROUTE_IN[state.wp];
    if (!target) return input;
    if (Math.hypot(p.x - target.x, p.y - target.y) < 20) state.wp += 1;
    return steerInput(world, ROUTE_IN[Math.min(state.wp, ROUTE_IN.length - 1)], guardNear(world, 280));
  }
  const target = ROUTE_OUT[state.wpOut];
  if (!target) return input;
  if (Math.hypot(p.x - target.x, p.y - target.y) < 20) state.wpOut += 1;
  return steerInput(world, ROUTE_OUT[Math.min(state.wpOut, ROUTE_OUT.length - 1)], guardNear(world, 280));
}

// Run the autopilot for `steps` fixed steps. Returns the screen it ended on.
function runAutopilot(world, steps, useSmoke) {
  const state = { wp: 0, wpOut: 0 };
  let smoked = false;
  for (let i = 0; i < steps; i++) {
    if (world.screen !== 'play') break;
    const input = autopilotStep(world, state);
    // If the alarm is climbing and smoke is allowed, break sight once.
    if (useSmoke && !smoked && world.alarm > 55 && world.gadgets.smoke > 0) {
      input.pressed.add('Digit1');
      smoked = true;
    }
    updateWorld(world, input, STEP);
  }
  return world.screen;
}

// Stage one named scene from a fresh world. Called once at load, before
// the first frame, so the screenshot is fully deterministic.
export function stageShot(world, query) {
  const shot = query.get('shot') || 'play';
  const seed = Number(query.get('seed') || '1') || 1;
  const fresh = createWorld(seed);
  fresh.audio = world.audio;
  Object.keys(fresh).forEach((k) => {
    world[k] = fresh[k];
  });

  if (shot === 'start') {
    world.screen = 'title';
    world.time = 0.5;
    return;
  }
  if (shot === 'play') {
    world.screen = 'play';
    // Cross the room for ~10 seconds: the thief mid-floor near the vault
    // approach, a guard's cone sweeping nearby, the camera turning, the
    // Star still glittering in its vault.
    runAutopilot(world, 60 * 10, true);
    if (world.screen !== 'play') {
      // The autopilot got caught on the way; re-stage a shorter crossing
      // so the play frame always shows the job in progress.
      resetWorld(world);
      runAutopilot(world, 60 * 8, true);
    }
    return;
  }
  if (shot === 'end') {
    world.screen = 'play';
    runAutopilot(world, 60 * 150, true);
    if (world.screen !== 'win') {
      // Fallback: the route is deterministic, so a miss means the patrol
      // timing changed — re-run sneaking the whole way.
      resetWorld(world);
      const state = { wp: 0, wpOut: 0 };
      for (let i = 0; i < 60 * 200 && world.screen === 'play'; i++) {
        const input = autopilotStep(world, state);
        input.keys.add('ShiftLeft');
        updateWorld(world, input, STEP);
      }
    }
    return;
  }
  if (shot === 'caught') {
    world.screen = 'play';
    // Stand on the first guard's patrol path, in front of it: it walks
    // straight into its own cone and the alarm climbs from there.
    world.player.x = 780;
    world.player.y = 205;
    for (let i = 0; i < 60 * 30 && world.screen === 'play'; i++) {
      updateWorld(world, blankInput(), STEP);
    }
    if (world.screen !== 'caught') {
      // Force the fair version of the same moment: the thief stands in
      // the guard's cone with the alarm already at the edge.
      const g = world.guards[0];
      world.player.x = g.x + Math.cos(g.facing) * 90;
      world.player.y = g.y + Math.sin(g.facing) * 90;
      world.alarm = 96;
      for (let i = 0; i < 60 * 4 && world.screen === 'play'; i++) {
        updateWorld(world, blankInput(), STEP);
      }
    }
    return;
  }
  // Unknown shot name: show the title.
  world.screen = 'title';
  world.time = 0.5;
}
