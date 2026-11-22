// Keyboard and mouse state, kept in one place so the world update never
// touches DOM events directly. Keys are tracked by their `code` value.

export function createInput() {
  return {
    keys: new Set(),
    pressed: new Set(), // keys pressed since the last frame was consumed
    mouseX: 0,
    mouseY: 0,
    mouseClicked: false,
    mouseDown: false,
  };
}

// Bind the listeners to a canvas; coordinates are converted to canvas space.
export function bindInput(input, canvas) {
  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) input.pressed.add(event.code);
    input.keys.add(event.code);
  });
  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.code);
  });
  window.addEventListener('blur', () => {
    input.keys.clear();
  });
  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = ((event.clientX - rect.left) / rect.width) * canvas.width;
    input.mouseY = ((event.clientY - rect.top) / rect.height) * canvas.height;
  });
  canvas.addEventListener('mousedown', (event) => {
    input.mouseDown = true;
    input.mouseClicked = true;
    const rect = canvas.getBoundingClientRect();
    input.mouseX = ((event.clientX - rect.left) / rect.width) * canvas.width;
    input.mouseY = ((event.clientY - rect.top) / rect.height) * canvas.height;
  });
  window.addEventListener('mouseup', () => {
    input.mouseDown = false;
  });
}

// The movement direction from WASD or the arrow keys, normalised.
export function moveDirection(input) {
  let x = 0;
  let y = 0;
  if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) x -= 1;
  if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) x += 1;
  if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) y -= 1;
  if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) y += 1;
  if (x !== 0 && y !== 0) {
    const inv = 1 / Math.hypot(x, y);
    x *= inv;
    y *= inv;
  }
  return { x, y };
}

// True while the sneak key is held.
export function isSneaking(input) {
  return input.keys.has('ShiftLeft') || input.keys.has('ShiftRight');
}

// A key pressed since the last consume, checked once per frame.
export function wasPressed(input, code) {
  return input.pressed.has(code);
}

// Clear the per-frame edge state after the world has read it.
export function endFrame(input) {
  input.pressed.clear();
  input.mouseClicked = false;
}
