// The Meridian Job — canvas rendering.
// One job: turn the world state into a picture. Every draw here is plain
// canvas 2D shapes, so the game needs no image assets at all.

import { VIEW_W, VIEW_H, COLORS, ROOM, EXIT_ZONE, SMOKE_RADIUS } from './config.js';
import { pointInRect } from './world.js';

// Draw the whole scene for the current screen: title, play, caught or win.
export function render(ctx, world) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawFloor(ctx);
  drawVaultFloor(ctx);
  drawExitZone(ctx, world);
  drawCovers(ctx);
  drawLoot(ctx, world);
  drawVisionCones(ctx, world);
  drawSmoke(ctx, world);
  drawWalls(ctx);
  drawShortcutDoor(ctx, world);
  drawCameras(ctx, world);
  drawGuards(ctx, world);
  drawCoins(ctx, world);
  drawThief(ctx, world);
  drawHud(ctx, world);
  if (world.screen === 'title') drawTitle(ctx, world);
  if (world.screen === 'caught') drawCaught(ctx, world);
  if (world.screen === 'win') drawWin(ctx, world);
}

function drawFloor(ctx) {
  const tile = 64;
  for (let y = 0; y < VIEW_H; y += tile) {
    for (let x = 0; x < VIEW_W; x += tile) {
      ctx.fillStyle = ((x / tile + y / tile) % 2 === 0 ? COLORS.floorA : COLORS.floorB);
      ctx.fillRect(x, y, tile, tile);
    }
  }
  ctx.strokeStyle = COLORS.floorLine;
  ctx.lineWidth = 1;
  for (let x = 0; x <= VIEW_W; x += tile) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, VIEW_H);
    ctx.stroke();
  }
  for (let y = 0; y <= VIEW_H; y += tile) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(VIEW_W, y + 0.5);
    ctx.stroke();
  }
}

function drawVaultFloor(ctx) {
  ctx.fillStyle = COLORS.vaultFloor;
  ctx.fillRect(1004, 24, 252, 252);
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2;
  ctx.strokeRect(1008, 28, 244, 244);
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('V A U L T', 1130, 52);
}

function drawExitZone(ctx, world) {
  const pulse = world.screen === 'play' && world.hasArtifact ? 0.5 + 0.3 * Math.sin(world.time * 5) : 0.25;
  ctx.fillStyle = `rgba(47, 191, 113, ${0.25 + pulse * 0.3})`;
  ctx.fillRect(EXIT_ZONE.x, EXIT_ZONE.y, EXIT_ZONE.w, EXIT_ZONE.h);
  ctx.strokeStyle = COLORS.exitGlow;
  ctx.lineWidth = 3;
  ctx.strokeRect(EXIT_ZONE.x, EXIT_ZONE.y, EXIT_ZONE.w, EXIT_ZONE.h);
  ctx.fillStyle = COLORS.exitGlow;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GETAWAY', EXIT_ZONE.x + EXIT_ZONE.w / 2, EXIT_ZONE.y + 24);
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillStyle = COLORS.hudText;
  ctx.fillText(world.hasArtifact ? 'GO! GO! GO!' : 'needs the Star', EXIT_ZONE.x + EXIT_ZONE.w / 2, EXIT_ZONE.y + 44);
}

function drawCovers(ctx) {
  for (const c of ROOM.covers) {
    ctx.fillStyle = COLORS.cover;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = COLORS.coverTop;
    ctx.fillRect(c.x + 3, c.y + 3, c.w - 6, 10);
    ctx.strokeStyle = '#1a2236';
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x, c.y, c.w, c.h);
  }
}

function drawLoot(ctx, world) {
  for (const loot of world.smallLoot) {
    if (loot.taken) continue;
    ctx.save();
    ctx.translate(loot.x, loot.y);
    ctx.fillStyle = COLORS.gold;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.goldGlow;
    ctx.beginPath();
    ctx.arc(-2, -2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  if (!world.artifact.taken) {
    const a = world.artifact;
    const glow = 18 + 6 * Math.sin(world.time * 3);
    const grad = ctx.createRadialGradient(a.x, a.y, 2, a.x, a.y, glow + 22);
    grad.addColorStop(0, 'rgba(255, 226, 122, 0.55)');
    grad.addColorStop(1, 'rgba(255, 226, 122, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(a.x, a.y, glow + 22, 0, Math.PI * 2);
    ctx.fill();
    // The Meridian Star: a faceted gold diamond.
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(-13, -13, 26, 26);
    ctx.fillStyle = COLORS.goldGlow;
    ctx.fillRect(-13, -13, 26, 8);
    ctx.strokeStyle = '#8a6d1f';
    ctx.lineWidth = 2;
    ctx.strokeRect(-13, -13, 26, 26);
    ctx.restore();
    ctx.fillStyle = COLORS.goldGlow;
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('THE MERIDIAN STAR', a.x, a.y + 34);
    if (world.artifactProgress > 0) {
      drawProgressRing(ctx, a.x, a.y - 26, 14, world.artifactProgress / 0.9);
    }
  }
}

function drawProgressRing(ctx, x, y, r, frac) {
  ctx.strokeStyle = 'rgba(232, 230, 223, 0.3)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = COLORS.goldGlow;
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
  ctx.stroke();
}

// A watcher's vision cone: a translucent sector from its position.
function drawCone(ctx, x, y, angle, range, halfAngle, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fill();
}

function drawVisionCones(ctx, world) {
  for (const g of world.guards) {
    drawCone(
      ctx,
      g.x,
      g.y,
      g.facing,
      235,
      0.62,
      g.suspicion > 55 ? COLORS.coneGuardAlert : COLORS.coneGuard,
    );
  }
  for (const cam of world.cameras) {
    drawCone(
      ctx,
      cam.x,
      cam.y,
      cam.angle,
      265,
      0.5,
      cam.seeing ? COLORS.coneCameraAlert : COLORS.coneCamera,
    );
  }
}

function drawSmoke(ctx, world) {
  for (const s of world.smoke) {
    ctx.fillStyle = COLORS.smoke;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius * (0.7 + 0.3 * Math.sin(world.time * 6)), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWalls(ctx) {
  for (const w of ROOM.walls) {
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = COLORS.wallTop;
    if (w.h <= 24) ctx.fillRect(w.x, w.y, w.w, 5);
    else ctx.fillRect(w.x, w.y, 5, w.h);
  }
}

function drawShortcutDoor(ctx, world) {
  const d = ROOM.shortcutDoor;
  if (world.doorOpen) {
    ctx.fillStyle = '#0e1420';
    ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.fillStyle = COLORS.exitGlow;
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(d.x + d.w / 2, d.y + d.h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('OPEN', 0, 3);
    ctx.restore();
    return;
  }
  ctx.fillStyle = '#6b4a1f';
  ctx.fillRect(d.x, d.y, d.w, d.h);
  ctx.fillStyle = '#8a5f28';
  ctx.fillRect(d.x + 3, d.y + 3, d.w - 6, d.h - 6);
  ctx.fillStyle = COLORS.gold;
  ctx.beginPath();
  ctx.arc(d.x + d.w / 2, d.y + d.h / 2, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.save();
  ctx.translate(d.x + d.w / 2, d.y + d.h / 2 + 22);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('LOCKED · 2', 0, 3);
  ctx.restore();
  if (world.lockpicking) {
    drawProgressRing(ctx, d.x + d.w / 2, d.y - 18, 11, world.lockpickProgress / 2.0);
  }
}

function drawCameras(ctx, world) {
  for (const cam of world.cameras) {
    ctx.fillStyle = '#20293f';
    ctx.strokeStyle = cam.seeing ? '#e5484d' : '#7fb8e8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    const lx = cam.x + Math.cos(cam.angle) * 16;
    const ly = cam.y + Math.sin(cam.angle) * 16;
    ctx.strokeStyle = cam.seeing ? '#e5484d' : '#7fb8e8';
    ctx.beginPath();
    ctx.moveTo(cam.x, cam.y);
    ctx.lineTo(lx, ly);
    ctx.stroke();
    ctx.fillStyle = cam.seeing ? '#ff5a5a' : '#ff3b3b';
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGuards(ctx, world) {
  for (const g of world.guards) {
    // Suspicion ring above the guard's head.
    if (g.suspicion > 2) {
      ctx.fillStyle = 'rgba(8, 10, 18, 0.7)';
      ctx.fillRect(g.x - 16, g.y - 32, 32, 6);
      ctx.fillStyle = g.suspicion > 55 ? '#e5484d' : COLORS.gold;
      ctx.fillRect(g.x - 15, g.y - 31, 30 * (g.suspicion / 100), 4);
    }
    if (g.spotted) {
      ctx.fillStyle = '#e5484d';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', g.x, g.y - 36);
    }
    ctx.fillStyle = g.alertTimer > 0 ? '#e5484d' : COLORS.guard;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.guardDark;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f0d9a0';
    ctx.beginPath();
    ctx.arc(g.x + Math.cos(g.facing) * 5, g.y + Math.sin(g.facing) * 5, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.hudText;
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(g.name, g.x, g.y + 26);
  }
}

function drawCoins(ctx, world) {
  for (const c of world.coins) {
    ctx.fillStyle = COLORS.gold;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.landed ? 6 : 4, 0, Math.PI * 2);
    ctx.fill();
    if (c.landed) {
      ctx.strokeStyle = 'rgba(245, 197, 66, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 11 + 3 * Math.sin(world.time * 5), 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawThief(ctx, world) {
  const p = world.player;
  // A soft shadow so the thief reads against the floor.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 10, 13, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.sneaking ? '#5a6b8f' : COLORS.thiefCoat;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.thief;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
  ctx.stroke();
  // Facing tick: the thief's nose.
  ctx.fillStyle = COLORS.thief;
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.facing) * 9, p.y + Math.sin(p.facing) * 9, 4, 0, Math.PI * 2);
  ctx.fill();
  if (p.dashTimer > 0) {
    ctx.strokeStyle = 'rgba(232, 230, 223, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.x - Math.cos(p.facing) * 22, p.y - Math.sin(p.facing) * 22);
    ctx.lineTo(p.x - Math.cos(p.facing) * 10, p.y - Math.sin(p.facing) * 10);
    ctx.stroke();
  }
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('YOU', p.x, p.y - 20);
}

// ---------------------------------------------------------------- the HUD

function drawHud(ctx, world) {
  const pad = 14;
  const barW = 300;
  const barH = 18;
  const x = pad;
  const y = pad;
  ctx.fillStyle = COLORS.hudBg;
  roundRect(ctx, x - 6, y - 6, barW + 260, 44, 8);
  ctx.fill();

  // The alarm meter: the run's heartbeat, always visible.
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ALARM', x, y + 14);
  const ax = x + 62;
  ctx.fillStyle = '#20263a';
  ctx.fillRect(ax, y, barW, barH);
  const frac = world.alarm / 100;
  ctx.fillStyle = frac < 0.35 ? COLORS.alarmLow : frac < 0.7 ? COLORS.alarmMid : COLORS.alarmHigh;
  ctx.fillRect(ax, y, barW * frac, barH);
  ctx.strokeStyle = '#55617e';
  ctx.lineWidth = 1;
  ctx.strokeRect(ax + 0.5, y + 0.5, barW, barH);
  ctx.fillStyle = '#0b0e16';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(world.alarm)}`, ax + barW / 2, y + 14);

  // Loot and gadgets, right of the meter.
  const gx = ax + barW + 18;
  ctx.fillStyle = COLORS.goldGlow;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`◆ $${world.lootValue}`, gx, y + 15);
  ctx.fillStyle = world.hasArtifact ? COLORS.goldGlow : COLORS.hudMuted;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText(world.hasArtifact ? '★ STAR SECURED — RUN!' : '☆ Star not taken', gx, y + 32);

  // Gadget counts, bottom-left.
  const gy = VIEW_H - 16;
  ctx.fillStyle = COLORS.hudBg;
  roundRect(ctx, pad - 6, gy - 24, 430, 30, 8);
  ctx.fill();
  ctx.fillStyle = COLORS.hudText;
  ctx.font = '13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(
    `[1] Smoke ×${world.gadgets.smoke}    [2] Lockpick ×${world.gadgets.lockpicks}    [3] Coin ×${world.gadgets.coins}    [Space] Dash${world.player.dashCooldown > 0 ? ' …' : ''}    [Shift] Sneak`,
    pad,
    gy - 4,
  );

  // A flashing warning while anyone watches the thief.
  if (world.seenNow && world.screen === 'play') {
    ctx.fillStyle = '#e5484d';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`⚠ SEEN — ${world.seenBy.toUpperCase()}`, VIEW_W / 2, 44);
  }

  // Timer, top-right.
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.floor(world.time / 60)}:${String(Math.floor(world.time % 60)).padStart(2, '0')}`, VIEW_W - pad, y + 15);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------------------------------------------------------------- screens

function dimScreen(ctx, alpha) {
  ctx.fillStyle = `rgba(6, 8, 14, ${alpha})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function drawTitle(ctx, world) {
  dimScreen(ctx, 0.72);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.goldGlow;
  ctx.font = 'bold 64px Georgia, serif';
  ctx.fillText('VAULTBREAK', VIEW_W / 2, 190);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'italic 26px Georgia, serif';
  ctx.fillText('— The Meridian Job —', VIEW_W / 2, 232);
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillStyle = '#c8cede';
  const lines = [
    'One museum. One vault. One gold star worth $5,000.',
    'Slip past Marlow, Okafor and Petrov, dodge the wall cameras,',
    'lift the Meridian Star and reach the getaway door — quiet, or not at all.',
    '',
    'WASD / arrows — move      Shift — sneak      Space — dash (loud!)',
    'E — lift the Star / work a lock      Click — interact or toss a coin',
    '1 — smoke bomb      2 — lockpick the shortcut door      3 — toss a coin',
    '',
    'Watch the cones. When the ALARM meter hits 100, the night is over.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 300 + i * 26));
  const blink = 0.6 + 0.4 * Math.sin(world.time * 4);
  ctx.fillStyle = `rgba(245, 197, 66, ${blink})`;
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('Press ENTER or click to start the job', VIEW_W / 2, 610);
}

function drawCaught(ctx, world) {
  dimScreen(ctx, 0.66);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5a5a';
  ctx.font = 'bold 56px Georgia, serif';
  ctx.fillText('CAUGHT', VIEW_W / 2, 260);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText(world.caughtBy || 'The alarm hit 100.', VIEW_W / 2, 310);
  ctx.fillStyle = '#c8cede';
  ctx.font = '17px system-ui, sans-serif';
  const tips = [
    `Alarm reached ${Math.round(world.maxAlarm)} — the meter only falls while nobody sees you.`,
    'Sneak (Shift) behind display cases, break sight with a smoke bomb,',
    'or toss a coin to pull a guard away before you cross an open floor.',
  ];
  tips.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 360 + i * 26));
  ctx.fillStyle = COLORS.goldGlow;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('Press R to try the job again', VIEW_W / 2, 500);
}

function drawWin(ctx, world) {
  dimScreen(ctx, 0.66);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.goldGlow;
  ctx.font = 'bold 56px Georgia, serif';
  ctx.fillText('CLEAN GETAWAY', VIEW_W / 2, 220);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('The Meridian Star is yours. The museum never knew you were there.', VIEW_W / 2, 262);
  ctx.font = '18px system-ui, sans-serif';
  world.scoreLines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 330 + i * 30));
  ctx.fillStyle = COLORS.goldGlow;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('Press R to run the job again', VIEW_W / 2, 500);
}
