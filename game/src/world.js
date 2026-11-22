// The Meridian Job — world state and rules.
// One job: hold the room's state and advance it one fixed step at a time:
// movement, patrols, vision cones, the alarm, gadgets and the win/lose
// conditions. Nothing here draws anything or touches the DOM.

import {
  ROOM,
  PLAYER_START,
  ARTIFACT,
  SMALL_LOOT,
  EXIT_ZONE,
  GUARDS,
  CAMERAS,
  WALK_SPEED,
  SNEAK_SPEED,
  DASH_SPEED,
  DASH_TIME,
  DASH_COOLDOWN,
  GUARD_RANGE,
  GUARD_HALF_ANGLE,
  CAMERA_RANGE,
  CAMERA_HALF_ANGLE,
  SUSPICION_RATE,
  SUSPICION_DECAY,
  ALARM_RATE_GUARD,
  ALARM_RATE_CAMERA,
  ALARM_DECAY,
  SNEAK_SPOT_FACTOR,
  START_SMOKE,
  START_LOCKPICKS,
  START_COINS,
  SMOKE_RADIUS,
  SMOKE_TIME,
  LOCKPICK_TIME,
  COIN_LURE_RADIUS,
  COIN_LURE_TIME,
  NOISE_RADIUS,
  GHOST_BONUS,
  GHOST_ALARM_LIMIT,
} from './config.js';
import { makeRng } from './random.js';
import { moveDirection, isSneaking, wasPressed } from './input.js';
import {
  playPickup,
  playSpotted,
  playAlarmTick,
  playSmoke,
  playUnlock,
  playWin,
  playCaught,
} from './audio.js';

// ---------------------------------------------------------------- geometry

export function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Does the segment (x1,y1)-(x2,y2) cross rectangle r? Slab test.
export function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tMin = 0;
  let tMax = 1;
  if (dx === 0) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let t1 = (r.x - x1) / dx;
    let t2 = (r.x + r.w - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  if (dy === 0) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let t1 = (r.y - y1) / dy;
    let t2 = (r.y + r.h - y1) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  return true;
}

// Does the segment cross a smoke cloud? A cloud is a circle.
function segmentHitsCircle(x1, y1, x2, y2, cx, cy, cr) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((cx - x1) * dx + (cy - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const px = x1 + dx * t;
  const py = y1 + dy * t;
  return Math.hypot(px - cx, py - cy) <= cr;
}

// A circle (the thief or a guard) overlapping a rectangle.
function circleHitsRect(cx, cy, radius, r) {
  const nx = Math.max(r.x, Math.min(cx, r.x + r.w));
  const ny = Math.max(r.y, Math.min(cy, r.y + r.h));
  return Math.hypot(cx - nx, cy - ny) < radius;
}

// ---------------------------------------------------------------- state

// A fresh run of the job. `seed` drives the small random touches (guard
// start offsets) so the same seed always builds the same run.
export function createWorld(seed) {
  const rng = makeRng(seed);
  const guards = GUARDS.map((g, i) => ({
    name: g.name,
    speed: g.speed,
    waypoints: g.waypoints,
    wpIndex: 0,
    x: g.waypoints[0].x,
    y: g.waypoints[0].y,
    facing: 0,
    suspicion: 0,
    spotted: false,
    alertTimer: 0,
    investigate: null, // {x, y, wait}
    waitTimer: 0,
    phase: rng() * 0.6,
  }));
  // Stagger the guards along their routes so they do not march in step.
  guards[1].wpIndex = 1;
  guards[1].x = GUARDS[1].waypoints[1].x;
  guards[1].y = GUARDS[1].waypoints[1].y;
  guards[2].x = 640;
  guards[2].y = 660;
  guards[2].wpIndex = 1;

  return {
    seed,
    time: 0,
    screen: 'title', // title | play | caught | win
    player: {
      x: PLAYER_START.x,
      y: PLAYER_START.y,
      radius: 13,
      facing: -Math.PI / 2,
      sneaking: false,
      dashTimer: 0,
      dashCooldown: 0,
      dashDir: { x: 0, y: -1 },
    },
    guards,
    cameras: CAMERAS.map((c, i) => ({
      index: i,
      x: c.x,
      y: c.y,
      baseAngle: c.baseAngle,
      sweep: c.sweep,
      period: c.period,
      phase: c.phase,
      angle: c.baseAngle,
      seeing: false,
    })),
    artifact: { ...ARTIFACT, taken: false },
    smallLoot: SMALL_LOOT.map((l) => ({ ...l, taken: false })),
    lootValue: 0,
    hasArtifact: false,
    doorOpen: false,
    lockpickProgress: 0,
    lockpicking: false,
    artifactProgress: 0,
    smoke: [], // {x, y, radius, timeLeft}
    coins: [], // {x, y, tx, ty, flight, landed, timeLeft}
    gadgets: { smoke: START_SMOKE, lockpicks: START_LOCKPICKS, coins: START_COINS },
    alarm: 0,
    maxAlarm: 0,
    everFullySpotted: false,
    seenNow: false, // any watcher sees the thief this step
    seenBy: '',
    caughtBy: '',
    caughtAt: null,
    score: 0,
    scoreLines: [],
    log: [],
    audio: null,
  };
}

// Every solid rectangle right now: walls, covers, and the shortcut door
// while it is still locked.
export function solidRects(world) {
  const rects = [...ROOM.walls, ...ROOM.covers];
  if (!world.doorOpen) rects.push(ROOM.shortcutDoor);
  return rects;
}

// Is the line from (x1,y1) to (x2,y2) clear of walls, covers and smoke?
export function hasLineOfSight(world, x1, y1, x2, y2) {
  for (const r of solidRects(world)) {
    if (segmentHitsRect(x1, y1, x2, y2, r)) return false;
  }
  for (const s of world.smoke) {
    if (segmentHitsCircle(x1, y1, x2, y2, s.x, s.y, s.radius)) return false;
  }
  return true;
}

// Can a watcher at (wx,wy) facing `angle`, with this range and cone,
// see the point (tx,ty)?
function watcherSees(world, wx, wy, angle, range, halfAngle, tx, ty, loudness) {
  const dx = tx - wx;
  const dy = ty - wy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  let diff = Math.atan2(dy, dx) - angle;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  if (Math.abs(diff) > halfAngle) return false;
  if (!hasLineOfSight(world, wx, wy, tx, ty)) return false;
  return true;
}

function note(world, text) {
  world.log.push(`${world.time.toFixed(1)}s ${text}`);
}

// Every guard inside `radius` of (x,y) turns and walks over to look.
function noisePing(world, x, y, radius, why) {
  for (const g of world.guards) {
    if (Math.hypot(g.x - x, g.y - y) <= radius) {
      g.investigate = { x, y, wait: 2.0 };
      g.waitTimer = 0;
    }
  }
  note(world, `noise: ${why}`);
}

// ---------------------------------------------------------------- movement

// Slide a circle through the room, axis by axis, so it never sinks into a wall.
function moveCircle(world, body, dx, dy) {
  const rects = solidRects(world);
  const nx = body.x + dx;
  if (!rects.some((r) => circleHitsRect(nx, body.y, body.radius, r))) body.x = nx;
  const ny = body.y + dy;
  if (!rects.some((r) => circleHitsRect(body.x, ny, body.radius, r))) body.y = ny;
  body.x = Math.max(24 + body.radius, Math.min(1256 - body.radius, body.x));
  body.y = Math.max(24 + body.radius, Math.min(776 - body.radius, body.y));
}

function distTo(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// ---------------------------------------------------------------- the thief

function updatePlayer(world, input, dt) {
  const p = world.player;
  p.dashCooldown = Math.max(0, p.dashCooldown - dt);
  const dir = moveDirection(input);
  const moving = dir.x !== 0 || dir.y !== 0;
  p.sneaking = isSneaking(input) && p.dashTimer <= 0;

  // Space: a short loud dash.
  if (wasPressed(input, 'Space') && p.dashCooldown <= 0 && moving) {
    p.dashTimer = DASH_TIME;
    p.dashCooldown = DASH_COOLDOWN;
    p.dashDir = { x: dir.x, y: dir.y };
    noisePing(world, p.x, p.y, NOISE_RADIUS, 'dash');
  }

  let speed = p.sneaking ? SNEAK_SPEED : WALK_SPEED;
  let mx = dir.x;
  let my = dir.y;
  if (p.dashTimer > 0) {
    p.dashTimer -= dt;
    speed = DASH_SPEED;
    mx = p.dashDir.x;
    my = p.dashDir.y;
  }
  if (moving || p.dashTimer > 0) {
    moveCircle(world, p, mx * speed * dt, my * speed * dt);
    p.facing = Math.atan2(my, mx);
  }

  // Gadgets: 1 smoke, 2 lockpick, 3 coin.
  if (wasPressed(input, 'Digit1')) useSmoke(world);
  if (wasPressed(input, 'Digit2')) startLockpick(world);
  if (wasPressed(input, 'Digit3')) throwCoin(world, input.mouseX, input.mouseY);

  // E or a mouse click: grab loot, work the lock, or throw a coin.
  if (wasPressed(input, 'KeyE') || input.mouseClicked) {
    interact(world, input);
  }

  // Lockpick channel: hold still beside the door until it opens.
  const door = ROOM.shortcutDoor;
  const doorCx = door.x + door.w / 2;
  const doorCy = door.y + door.h / 2;
  const nearDoor = Math.hypot(p.x - doorCx, p.y - doorCy) < 78;
  if (world.lockpicking) {
    if (!world.doorOpen && nearDoor && !moving) {
      world.lockpickProgress += dt;
      if (world.lockpickProgress >= LOCKPICK_TIME) {
        world.doorOpen = true;
        world.lockpicking = false;
        note(world, 'shortcut door unlocked');
        if (world.audio) playUnlock(world.audio);
        noisePing(world, doorCx, doorCy, NOISE_RADIUS, 'lockpick');
      }
    } else {
      world.lockpicking = false;
      world.lockpickProgress = 0;
    }
  }

  // The artifact takes a moment to lift from its mount: stand by it
  // holding E and the progress climbs.
  const nearArtifact =
    !world.artifact.taken && Math.hypot(p.x - world.artifact.x, p.y - world.artifact.y) < 62;
  if (nearArtifact && input.keys.has('KeyE')) {
    world.artifactProgress += dt;
    if (world.artifactProgress >= 0.9) {
      takeArtifact(world);
    }
  } else if (!nearArtifact) {
    world.artifactProgress = 0;
  }

  // Small loot is pocketed by walking over it.
  for (const loot of world.smallLoot) {
    if (!loot.taken && Math.hypot(p.x - loot.x, p.y - loot.y) < 42) {
      loot.taken = true;
      world.lootValue += loot.value;
      note(world, `pocketed ${loot.name} (+$${loot.value})`);
      if (world.audio) playPickup(world.audio);
    }
  }

  // The getaway: reach the exit door carrying the artifact.
  if (world.hasArtifact && pointInRect(p.x, p.y, EXIT_ZONE)) {
    winRun(world);
  }
}

function takeArtifact(world) {
  world.artifact.taken = true;
  world.hasArtifact = true;
  world.lootValue += world.artifact.value;
  world.artifactProgress = 0;
  note(world, `took ${world.artifact.name} (+$${world.artifact.value})`);
  if (world.audio) playPickup(world.audio);
}

function useSmoke(world) {
  if (world.gadgets.smoke <= 0) return;
  world.gadgets.smoke -= 1;
  world.smoke.push({ x: world.player.x, y: world.player.y, radius: SMOKE_RADIUS, timeLeft: SMOKE_TIME });
  note(world, 'smoke bomb thrown');
  if (world.audio) playSmoke(world.audio);
}

function startLockpick(world) {
  if (world.doorOpen || world.gadgets.lockpicks <= 0 || world.lockpicking) return;
  const door = ROOM.shortcutDoor;
  const p = world.player;
  if (Math.hypot(p.x - (door.x + door.w / 2), p.y - (door.y + door.h / 2)) > 78) return;
  world.gadgets.lockpicks -= 1;
  world.lockpicking = true;
  world.lockpickProgress = 0;
  note(world, 'lockpicking the shortcut door…');
}

function throwCoin(world, tx, ty) {
  if (world.gadgets.coins <= 0) return;
  const p = world.player;
  const dx = tx - p.x;
  const dy = ty - p.y;
  const dist = Math.hypot(dx, dy);
  const reach = Math.min(dist, 320);
  const nx = dist === 0 ? p.x : p.x + (dx / dist) * reach;
  const ny = dist === 0 ? p.y : p.y + (dy / dist) * reach;
  world.gadgets.coins -= 1;
  world.coins.push({
    x: p.x,
    y: p.y,
    tx: Math.max(40, Math.min(1240, nx)),
    ty: Math.max(40, Math.min(760, ny)),
    flight: 0.35,
    landed: false,
    timeLeft: COIN_LURE_TIME,
  });
  note(world, 'coin tossed');
}

function interact(world, input) {
  const p = world.player;
  // The artifact first: a tap starts the lift, holding E finishes it.
  if (!world.artifact.taken && Math.hypot(p.x - world.artifact.x, p.y - world.artifact.y) < 62) {
    world.artifactProgress += 0.05;
    return;
  }
  // The shortcut door: a click starts the lockpick too.
  const door = ROOM.shortcutDoor;
  if (
    !world.doorOpen &&
    Math.hypot(p.x - (door.x + door.w / 2), p.y - (door.y + door.h / 2)) < 78
  ) {
    startLockpick(world);
    return;
  }
  // Otherwise a click tosses a coin toward the pointer.
  if (input.mouseClicked) throwCoin(world, input.mouseX, input.mouseY);
}

// ---------------------------------------------------------------- guards & cameras

function updateGuard(world, g, dt) {
  const p = world.player;
  const sees = watcherSees(
    world,
    g.x,
    g.y,
    g.facing,
    GUARD_RANGE,
    GUARD_HALF_ANGLE,
    p.x,
    p.y,
  );
  const loud = p.dashTimer > 0 ? 2 : 1;
  if (sees) {
    const rate = SUSPICION_RATE * (p.sneaking ? SNEAK_SPOT_FACTOR : 1) * loud;
    g.suspicion = Math.min(100, g.suspicion + rate * dt);
    world.seenNow = true;
    world.seenBy = `Guard ${g.name}`;
    if (g.suspicion >= 100 && !g.spotted) {
      g.spotted = true;
      g.alertTimer = 3.0;
      world.everFullySpotted = true;
      world.alarm = Math.min(100, world.alarm + 25);
      note(world, `spotted by guard ${g.name}! alarm +25`);
      if (world.audio) playSpotted(world.audio);
    }
  } else {
    g.suspicion = Math.max(0, g.suspicion - SUSPICION_DECAY * dt);
    if (g.suspicion < 60) g.spotted = false;
  }

  // Movement: an alerted guard chases the thief; a curious one walks to
  // the noise; otherwise the patrol route.
  let target = null;
  let speed = g.speed;
  if (g.alertTimer > 0) {
    g.alertTimer -= dt;
    target = { x: p.x, y: p.y };
    speed = g.speed * 1.7;
    if (distTo(g, p) < 26) {
      catchThief(world, `Guard ${g.name} grabbed you up close`);
      return;
    }
  } else if (g.investigate) {
    target = g.investigate;
    if (distTo(g, g.investigate) < 14) {
      g.waitTimer += dt;
      if (g.waitTimer >= g.investigate.wait) {
        g.investigate = null;
        g.waitTimer = 0;
      }
      target = null;
    }
  } else {
    const wp = g.waypoints[g.wpIndex];
    target = wp;
    if (distTo(g, wp) < 12) {
      g.wpIndex = (g.wpIndex + 1) % g.waypoints.length;
    }
  }
  if (target) {
    const dx = target.x - g.x;
    const dy = target.y - g.y;
    const d = Math.hypot(dx, dy);
    if (d > 0.5) {
      const nx = g.x + (dx / d) * speed * dt;
      const ny = g.y + (dy / d) * speed * dt;
      const body = { x: g.x, y: g.y, radius: 14 };
      moveCircle(world, body, nx - g.x, ny - g.y);
      g.x = body.x;
      g.y = body.y;
      g.facing = Math.atan2(dy, dx);
    }
  }
}

function updateCamera(world, cam, dt) {
  cam.angle = cam.baseAngle + cam.sweep * Math.sin((2 * Math.PI * world.time) / cam.period + cam.phase);
  const p = world.player;
  cam.seeing = watcherSees(world, cam.x, cam.y, cam.angle, CAMERA_RANGE, CAMERA_HALF_ANGLE, p.x, p.y);
  if (cam.seeing) {
    world.seenNow = true;
    world.seenBy = `Camera ${cam.index + 1}`;
  }
}

// ---------------------------------------------------------------- the alarm

function updateAlarm(world, dt) {
  const guardSees = world.guards.some(
    (g) =>
      watcherSees(world, g.x, g.y, g.facing, GUARD_RANGE, GUARD_HALF_ANGLE, world.player.x, world.player.y),
  );
  const cameraSees = world.cameras.some((c) => c.seeing);
  if (guardSees) world.alarm += ALARM_RATE_GUARD * dt;
  if (cameraSees) world.alarm += ALARM_RATE_CAMERA * dt;
  if (!guardSees && !cameraSees) world.alarm -= ALARM_DECAY * dt;
  const before = world.alarm;
  world.alarm = Math.max(0, Math.min(100, world.alarm));
  world.maxAlarm = Math.max(world.maxAlarm, world.alarm);
  // A rising alarm ticks past each quarter as a warning.
  for (const mark of [25, 50, 75]) {
    if (before < mark && world.alarm >= mark && world.audio) playAlarmTick(world.audio);
  }
  if (world.alarm >= 100) {
    catchThief(world, world.seenBy ? `Seen by ${world.seenBy} — the alarm hit 100` : 'The alarm hit 100');
  }
}

// ---------------------------------------------------------------- endings

function catchThief(world, why) {
  if (world.screen !== 'play') return;
  world.screen = 'caught';
  world.caughtBy = why;
  world.caughtAt = { x: world.player.x, y: world.player.y };
  note(world, `caught: ${why}`);
  if (world.audio) playCaught(world.audio);
}

function winRun(world) {
  if (world.screen !== 'play') return;
  world.screen = 'win';
  const seconds = Math.floor(world.time);
  const timeBonus = Math.max(0, 4000 - seconds * 15);
  const ghost = world.maxAlarm < GHOST_ALARM_LIMIT && !world.everFullySpotted;
  const ghostBonus = ghost ? GHOST_BONUS : 0;
  world.score = world.lootValue + timeBonus + ghostBonus;
  world.scoreLines = [
    `Loot: $${world.lootValue}`,
    `Time bonus (${seconds}s): $${timeBonus}`,
    ghost ? `Ghost bonus (never raised the alarm): $${ghostBonus}` : 'Ghost bonus: $0 (the alarm rose)',
    `Total: $${world.score}`,
  ];
  note(world, `escaped with $${world.score} in ${seconds}s (ghost: ${ghost})`);
  if (world.audio) playWin(world.audio);
}

// ---------------------------------------------------------------- one step

// Advance the run by `dt` seconds. `input` is the frame's keyboard/mouse
// state (or a synthetic one built by the shot stager). Safe to call while
// the run is already over: it does nothing.
export function updateWorld(world, input, dt) {
  if (world.screen !== 'play') return;
  world.time += dt;
  world.seenNow = false;
  world.seenBy = '';

  updatePlayer(world, input, dt);
  if (world.screen !== 'play') return;

  for (const g of world.guards) {
    updateGuard(world, g, dt);
    if (world.screen !== 'play') return;
  }
  for (const cam of world.cameras) updateCamera(world, cam, dt);
  updateAlarm(world, dt);
  if (world.screen !== 'play') return;

  // Smoke fades; thrown coins land and lure guards while they ring.
  for (const s of world.smoke) s.timeLeft -= dt;
  world.smoke = world.smoke.filter((s) => s.timeLeft > 0);
  for (const c of world.coins) {
    if (!c.landed) {
      c.flight -= dt;
      const t = Math.max(0, 1 - c.flight / 0.35);
      c.x = c.x + (c.tx - c.x) * t * 0.4;
      c.y = c.y + (c.ty - c.y) * t * 0.4;
      if (c.flight <= 0) {
        c.landed = true;
        c.x = c.tx;
        c.y = c.ty;
        for (const g of world.guards) {
          if (Math.hypot(g.x - c.x, g.y - c.y) <= COIN_LURE_RADIUS) {
            g.investigate = { x: c.x, y: c.y, wait: COIN_LURE_TIME };
            g.waitTimer = 0;
          }
        }
        note(world, 'coin landed — guards turn toward it');
      }
    } else {
      c.timeLeft -= dt;
    }
  }
  world.coins = world.coins.filter((c) => c.timeLeft > 0 || !c.landed);
}

// Reset a world to a fresh run with the same seed.
export function resetWorld(world) {
  const fresh = createWorld(world.seed);
  fresh.audio = world.audio;
  Object.keys(fresh).forEach((k) => {
    world[k] = fresh[k];
  });
  world.screen = 'play';
}
