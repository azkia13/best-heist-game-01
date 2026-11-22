// Vaultbreak: The Meridian Job — static configuration.
// Every number that shapes the room, the patrols and the gadgets lives here,
// so balancing the heist never means hunting through the update logic.

export const VIEW_W = 1280;
export const VIEW_H = 800;

// Movement speeds, in pixels per second.
export const WALK_SPEED = 175;
export const SNEAK_SPEED = 95;
export const DASH_SPEED = 540;
export const DASH_TIME = 0.18;
export const DASH_COOLDOWN = 1.5;

// Detection: how far a watcher sees, how wide its cone is, how fast it
// notices the thief, and how fast the alarm climbs and cools off.
export const GUARD_RANGE = 235;
export const GUARD_HALF_ANGLE = 0.62;
export const CAMERA_RANGE = 265;
export const CAMERA_HALF_ANGLE = 0.5;
export const SUSPICION_RATE = 60; // per second while the thief is seen
export const SUSPICION_DECAY = 28; // per second while hidden
export const ALARM_RATE_GUARD = 16; // per second while any guard sees the thief
export const ALARM_RATE_CAMERA = 24; // per second while a camera sees the thief
export const ALARM_DECAY = 6; // per second while nobody sees the thief
export const SNEAK_SPOT_FACTOR = 0.45; // sneaking slows suspicion gain

// Gadget stock at the start of a run.
export const START_SMOKE = 2;
export const START_LOCKPICKS = 1;
export const START_COINS = 3;
export const SMOKE_RADIUS = 95;
export const SMOKE_TIME = 4.0;
export const LOCKPICK_TIME = 2.0;
export const COIN_LURE_RADIUS = 300;
export const COIN_LURE_TIME = 4.0;
export const NOISE_RADIUS = 260;

// Scoring.
export const ARTIFACT_VALUE = 5000;
export const GHOST_BONUS = 2000;
export const GHOST_ALARM_LIMIT = 30;

// The museum floor at night. Walls and display cases block both movement
// and sight; doors are gaps in walls that can be locked or open.
export const ROOM = {
  walls: [
    // Outer shell.
    { x: 0, y: 0, w: 1280, h: 24 },
    { x: 0, y: 776, w: 1280, h: 24 },
    { x: 0, y: 0, w: 24, h: 800 },
    { x: 1256, y: 0, w: 24, h: 800 },
    // Vault enclosure, top-right: the gold artifact sits inside it.
    { x: 980, y: 24, w: 24, h: 146 }, // west vault wall, upper part
    { x: 980, y: 250, w: 24, h: 50 }, // west vault wall, lower part
    { x: 1004, y: 276, w: 252, h: 24 }, // south vault wall
    // Middle divider: a locked shortcut door is the fast way through.
    { x: 560, y: 24, w: 24, h: 276 },
    { x: 560, y: 380, w: 24, h: 120 },
  ],
  // The locked shortcut door in the middle divider (y 300..380).
  shortcutDoor: { x: 560, y: 300, w: 24, h: 80 },
  covers: [
    // Display cases and crates the thief can hide behind.
    { x: 170, y: 170, w: 130, h: 64 },
    { x: 170, y: 430, w: 130, h: 64 },
    { x: 340, y: 300, w: 92, h: 92 },
    { x: 690, y: 140, w: 150, h: 64 },
    { x: 690, y: 430, w: 150, h: 64 },
    { x: 880, y: 620, w: 130, h: 64 },
    { x: 400, y: 640, w: 130, h: 64 },
    { x: 1060, y: 480, w: 130, h: 64 },
  ],
  // The vault doorway gap in the west vault wall (y 170..250).
  vaultGap: { x: 980, y: 170, w: 24, h: 80 },
};

// Where the run begins, where the gold waits, and where the getaway is.
export const PLAYER_START = { x: 92, y: 716 };
export const ARTIFACT = { x: 1152, y: 132, value: ARTIFACT_VALUE, name: 'The Meridian Star' };
export const SMALL_LOOT = [
  { x: 300, y: 120, value: 200, name: 'Silver coin stack' },
  { x: 770, y: 700, value: 150, name: 'Jade figurine' },
  { x: 1152, y: 620, value: 250, name: 'Ruby brooch' },
];
export const EXIT_ZONE = { x: 24, y: 668, w: 110, h: 108 };

// Patrol routes: each guard walks its waypoints and turns at each end.
export const GUARDS = [
  {
    name: 'Marlow',
    speed: 62,
    waypoints: [
      { x: 640, y: 205 },
      { x: 920, y: 205 },
    ],
  },
  {
    name: 'Okafor',
    speed: 55,
    waypoints: [
      { x: 400, y: 120 },
      { x: 400, y: 560 },
    ],
  },
  {
    name: 'Petrov',
    speed: 58,
    waypoints: [
      { x: 260, y: 660 },
      { x: 950, y: 660 },
    ],
  },
];

// Wall cameras sweep back and forth around a base facing angle.
export const CAMERAS = [
  { x: 770, y: 26, baseAngle: Math.PI / 2, sweep: 0.85, period: 5.0, phase: 0 },
  { x: 1254, y: 430, baseAngle: Math.PI, sweep: 0.8, period: 6.0, phase: 2.1 },
];

// Palette: night museum — deep blues, warm gold loot, red danger.
export const COLORS = {
  floorA: '#1b2338',
  floorB: '#161d2e',
  floorLine: '#232c44',
  wall: '#3a4666',
  wallTop: '#4a5878',
  cover: '#2c3a5e',
  coverTop: '#3d4f7d',
  vaultFloor: '#241f2e',
  exit: '#1f7a4d',
  exitGlow: '#2fbf71',
  gold: '#f5c542',
  goldGlow: '#ffe27a',
  thief: '#e8e6df',
  thiefCoat: '#232733',
  guard: '#c94f4f',
  guardDark: '#8e2f2f',
  coneGuard: 'rgba(245, 197, 66, 0.20)',
  coneGuardAlert: 'rgba(220, 60, 60, 0.28)',
  coneCamera: 'rgba(120, 190, 255, 0.20)',
  coneCameraAlert: 'rgba(220, 60, 60, 0.30)',
  smoke: 'rgba(190, 200, 215, 0.55)',
  hudBg: 'rgba(8, 10, 18, 0.82)',
  hudText: '#e8e6df',
  hudMuted: '#9aa3b8',
  alarmLow: '#2fbf71',
  alarmMid: '#f5c542',
  alarmHigh: '#e5484d',
};
