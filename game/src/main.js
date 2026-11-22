// Vaultbreak: The Meridian Job — entry point.
// One job: own the frame loop and the screen flow (title → play → caught
// or win), and hand the world, input and audio to the modules that do the
// real work. In `?shot=` mode the scene is staged once and frozen, so a
// screenshot is always the same frame.

import { VIEW_W, VIEW_H } from './config.js';
import { createWorld, updateWorld, resetWorld } from './world.js';
import { createInput, bindInput, endFrame, wasPressed } from './input.js';
import { createAudio } from './audio.js';
import { render } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const params = new URLSearchParams(window.location.search);
const shotMode = params.has('shot');
const seed = Number(params.get('seed') || '1') || 1;

const audio = createAudio();
const world = createWorld(seed);
world.audio = audio;
const input = createInput();
bindInput(input, canvas);

// The fixed step every update runs on, so play and staging agree.
const STEP = 1 / 60;
let accumulator = 0;
let lastTime = performance.now();

if (shotMode) {
  stageShot(world, params);
  render(ctx, world);
} else {
  world.screen = 'title';
  requestAnimationFrame(frame);
}

function frame(now) {
  const elapsed = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  if (world.screen === 'title') {
    world.time += elapsed;
    if (wasPressed(input, 'Enter') || input.mouseClicked) {
      world.screen = 'play';
    }
  } else if (world.screen === 'play') {
    accumulator += elapsed;
    let steps = 0;
    while (accumulator >= STEP && steps < 5) {
      updateWorld(world, input, STEP);
      accumulator -= STEP;
      steps += 1;
      if (world.screen !== 'play') break;
    }
    if (steps === 5) accumulator = 0;
  } else if (wasPressed(input, 'KeyR') || wasPressed(input, 'Enter')) {
    // Caught or escaped: R (or Enter) runs the job again.
    resetWorld(world);
    accumulator = 0;
  }

  render(ctx, world);
  endFrame(input);
  requestAnimationFrame(frame);
}

// A hook for headless play-testing: the page's world, input and step
// function, so a test driver can drive the game and read its state.
window.__vaultbreak = {
  world,
  input,
  step(dt) {
    updateWorld(world, input, dt ?? STEP);
    endFrame(input);
  },
  start() {
    world.screen = 'play';
  },
  reset() {
    resetWorld(world);
  },
};
