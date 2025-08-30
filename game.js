
// --- PATCH START ---

// Scaling factors
const PLAYER_SCALE = 1.5;
const TRAP_SCALE = 0.67;

// Trap (spikes/lava) handling
class Trap {
  constructor(img, x, y) {
    this.img = img;
    this.x = x;
    this.y = y;
    this.width = img.width * TRAP_SCALE;
    this.height = img.height * TRAP_SCALE;
  }
  update() {
    // Move left with background speed
    if (movingLeft) this.x += bgSpeed;
    if (movingRight) this.x -= bgSpeed;
  }
  draw() {
    ctx.drawImage(this.img, this.x, this.y - this.height, this.width, this.height);
  }
}

// Ghost handling
class Ghost {
  constructor(img, x, y) {
    this.img = img;
    this.baseX = x;
    this.baseY = y;
    this.width = img.width;
    this.height = img.height;
    this.time = 0;
  }
  update() {
    this.time += 0.02; // slower
  }
  draw() {
    let offsetY = Math.sin(this.time) * 30;
    ctx.drawImage(this.img, this.baseX, this.baseY + offsetY, this.width, this.height);
  }
}

// Override player drawing with scaling
function drawPlayer(img, x, y, width, height) {
  let w = width * PLAYER_SCALE;
  let h = height * PLAYER_SCALE;
  ctx.drawImage(img, x, y - h, w, h);
}

// --- PATCH END ---


let bgX = 0;
let bgSpeed = 4;
let movingLeft = false;
let movingRight = false;

document.addEventListener("keydown", e => {
  if (e.code === "ArrowLeft") movingLeft = true;
  if (e.code === "ArrowRight") movingRight = true;
});
document.addEventListener("keyup", e => {
  if (e.code === "ArrowLeft") movingLeft = false;
  if (e.code === "ArrowRight") movingRight = false;
});

function updateBackground() {
  if (movingLeft) bgX += bgSpeed;
  if (movingRight) bgX -= bgSpeed;
  if (bgX <= -canvas.width) bgX = 0;
  if (bgX >= canvas.width) bgX = 0;
}

/* Endless Forest Jump - GitHub Pages ready
Requirements implemented:
- Forest background repeats horizontally (parallax) for endless feel.
- Playable hooded character (space to jump). 
- While jumping, horizontal displacement depends on how long ←/→ is held at the moment of jumping.
- Obstacles: spike pits, lava pits (ground), and ghosts (vertical oscillation). Touching any = Game Over.
- Initial safe runway before the first obstacle.
- Obstacles are spawned randomly with spacing constraints.
*/


const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// ------ Config ------
const GROUND_Y = canvas.height - 90; // ground baseline for obstacles/player
const GRAVITY = 0.8;
const JUMP_POWER = 16; // tuned to clear a typical pit
const BASE_SIDE_PUSH = 7;       // base side impulse for minimal arrow hold
const MAX_SIDE_PUSH = 14;       // max side impulse when arrow held to cap
const ARROW_HOLD_FOR_MAX = 450; // ms of hold time to reach max side push
const SCROLL_SPEED = 4.0;       // world speed
const SAFE_START_DISTANCE = 500; // pixels before first obstacle
const MIN_GAP = 520;            // min distance between obstacles
const MAX_GAP = 820;            // max distance between obstacles
const PIT_WIDTH = 260;          // logical pit width; jump tuned to be "barely more"
const GHOST_FREQ = 0.0018;      // vertical oscillation speed
const PLAYER_VISUAL_SCALE = 1.5;
const TRAP_VISUAL_SCALE = 0.67; // 1 / 1.5

function deadlyCollision(player, trap) {
  return (
    player.x < trap.x + trap.w &&
    player.x + player.w > trap.x &&
    player.y < trap.y + trap.h &&
    player.y + player.h > trap.y
  );
}

// ------ Assets ------
const images = {};
const imageList = {
  forest: 'assets/forest.png',
  player: 'assets/player.png',
  spikes: 'assets/spikes.png',
  lava: 'assets/lava.png',
  ghost: 'assets/ghost.png',
};
let assetsLoaded = 0, assetsTarget = Object.keys(imageList).length;

for (const [key, src] of Object.entries(imageList)) {
  const img = new Image();
  img.src = src;
  img.onload = () => { assetsLoaded++; };
  images[key] = img;
}

// ------ Input ------
let keys = { left:false, right:false, space:false };
let arrowDownTime = { left:0, right:0 }; // track duration
window.addEventListener('keydown', (e)=>{
  if (e.code === 'ArrowLeft') { if (!keys.left) arrowDownTime.left = performance.now(); keys.left = true; }
  if (e.code === 'ArrowRight'){ if (!keys.right) arrowDownTime.right = performance.now(); keys.right = true; }
  if (e.code === 'Space') { keys.space = true; e.preventDefault(); }
});
window.addEventListener('keyup', (e)=>{
  if (e.code === 'ArrowLeft') keys.left = false;
  if (e.code === 'ArrowRight') keys.right = false;
  if (e.code === 'Space') keys.space = false;
});

// ------ Game State ------
const state = {
  started: false,
  gameOver: false,
  bgOffset: 0,
  distance: 0,
  entities: [], // obstacles + ghosts
  lastSpawnX: SAFE_START_DISTANCE,
  time: 0
};

// Player
const player = {
  x: 160,
  y: GROUND_Y - 72,
  w: Math.floor(70 * PLAYER_VISUAL_SCALE),
  h: Math.floor(90 * PLAYER_VISUAL_SCALE),
  vy: 0,
  onGround: true,
  dir: 1, // last facing direction
};

function resetGame(){
  state.started = true;
  state.gameOver = false;
  state.bgOffset = 0;
  state.distance = 0;
  state.entities = [];
  state.lastSpawnX = SAFE_START_DISTANCE;
  state.time = 0;
  player.x = 160;
  player.y = GROUND_Y - 72;
  player.vy = 0;
  player.onGround = true;
  document.getElementById('overlay').classList.add('hidden');
}

// Entities
function spawnEntity(kind, worldX){
  if (kind === 'spikes' || kind === 'lava'){
    const w = Math.floor(PIT_WIDTH * TRAP_VISUAL_SCALE);
    const h = Math.floor(70 * TRAP_VISUAL_SCALE);
    state.entities.push({
      kind, x: worldX, y: GROUND_Y-10, w, h
    });
  } else if (kind === 'ghost'){
    const baseY = GROUND_Y - 260 - Math.random()*60;
    state.entities.push({
      kind, x: worldX, y: baseY, w: 120, h: 120, t0: state.time + Math.random()*10000
    });
  }
}

function maybeSpawn(){
  // ensure spacing
  if (state.lastSpawnX - state.distance < MIN_GAP) return;
  // pick next gap when we place something
  const ahead = state.distance + (MIN_GAP + Math.random()*(MAX_GAP - MIN_GAP));
  if (ahead > state.lastSpawnX) {
    const kinds = ['spikes','lava','ghost'];
    const kind = kinds[Math.floor(Math.random()*kinds.length)];
    spawnEntity(kind, state.lastSpawnX);
    state.lastSpawnX += MIN_GAP + Math.random()*(MAX_GAP - MIN_GAP);
  }
}

// Collision helper (AABB)
function aabb(ax,ay,aw,ah,bx,by,bw,bh){
  return ax < bx+bw && ax+aw > bx && ay < by+bh && ay+ah > by;
}

// ------ Rendering ------
function drawBackground(){
  const img = images.forest;
  if (!img.width) return;
  const scale = canvas.height / img.height;
  const drawW = img.width * scale;
  // wrap
  if (state.bgOffset <= -drawW) state.bgOffset += drawW;
  // draw two tiles to cover
  for (let i=-1;i<=1;i++){
    ctx.drawImage(img, state.bgOffset + i*drawW, 0, drawW, canvas.height);
  }
  // simple ground strip
  ctx.fillStyle = '#102815';
  ctx.fillRect(0, GROUND_Y+40, canvas.width, canvas.height-(GROUND_Y+40));
}

// Draw player and entities
function drawPlayer(){
  const img = images.player;
  ctx.save();
  // mild glow
  ctx.shadowColor = 'rgba(255,255,255,0.35)';
  ctx.shadowBlur = 20;
  if (player.dir < 0){
    ctx.translate(player.x+player.w/2, player.y);
    ctx.scale(-1,1);
    ctx.translate(-player.x-player.w/2, -player.y);
  }
  ctx.drawImage(img, player.x, player.y, player.w, player.h);
  ctx.restore();
}

function drawEntities(){
  for (const e of state.entities){
    const screenX = Math.floor(e.x - state.distance);
    if (screenX < -400 || screenX > canvas.width+400) continue;
    if (e.kind === 'spikes'){
      ctx.drawImage(images.spikes, screenX, e.y-40, e.w, e.h+40);
    } else if (e.kind === 'lava'){
      ctx.drawImage(images.lava, screenX, e.y-10, e.w, e.h+10);
    } else if (e.kind === 'ghost'){
      // oscillate high (plenty of headroom to move before descending)
      const amp = 220;
      const y = e.y - Math.sin((state.time - e.t0) * GHOST_FREQ) * amp;
      ctx.drawImage(images.ghost, screenX, y, e.w, e.h);
      e._screenY = y; // store for collision
    }
  }
}

// ------ Update ------
let canJump = true;
function computeSideImpulse(){
  // Determine which arrow is currently held and for how long
  let dir = 0, holdMs = 0;
  const now = performance.now();
  if (keys.left && !keys.right){ dir = -1; holdMs = now - arrowDownTime.left; }
  if (keys.right && !keys.left){ dir =  1; holdMs = now - arrowDownTime.right; }
  // Map hold time to side push
  const t = Math.min(1, holdMs / ARROW_HOLD_FOR_MAX);
  const power = BASE_SIDE_PUSH + (MAX_SIDE_PUSH - BASE_SIDE_PUSH)*t;
  return dir * power;
}

function update(dt){
  state.time += dt;
  if (!state.started || state.gameOver) return;

  // world scrolls only when player moves left/right or has horizontal velocity from a jump
  let moving = (keys.left ^ keys.right) || Math.abs(player.vx || 0) > 0.1;
  if (moving) {
    state.distance += SCROLL_SPEED;
    state.bgOffset -= SCROLL_SPEED * 0.3;
  }

  // spawn
  maybeSpawn();

  // jump logic: only starts from ground on Space press edge
  if (keys.space && player.onGround && canJump){
    const side = computeSideImpulse();
    player.vx = side; // set horizontal impulse only once at jump
    player.vy = -JUMP_POWER;
    player.onGround = false;
    canJump = false;
    if (side !== 0) player.dir = Math.sign(side);
  }
  if (!keys.space) canJump = true;

  // Apply physics
  if (!player.onGround){
    player.y += player.vy;
    player.vy += GRAVITY;
    // apply horizontal impulse with friction to "stop" midair
    player.x += player.vx || 0;
    if (player.vx){
      player.vx *= 0.9;
      if (Math.abs(player.vx) < 0.2) player.vx = 0;
    }
  }

  // Land on ground
  const feet = player.y + player.h;
  if (feet >= GROUND_Y){
    player.y = GROUND_Y - player.h;
    player.vy = 0;
    player.onGround = true;
  }

  // Keep player on screen horizontally (visual only)
  player.x = Math.max(40, Math.min(player.x, canvas.width-40-player.w));

  // Collisions with entities
  for (const e of state.entities){
    const screenX = e.x - state.distance;
    if (e.kind === 'spikes' || e.kind === 'lava'){
      // hazard area approximated by center hole
      const bx = screenX + 20, bw = e.w - 40;
      const by = e.y + 10, bh = e.h - 10;
      if (aabb(player.x, player.y, player.w, player.h, bx, by, bw, bh)){
        return triggerGameOver();
      }
    } else if (e.kind === 'ghost'){
      const gy = e._screenY ?? e.y;
      if (aabb(player.x, player.y, player.w, player.h, screenX+10, gy+10, e.w-20, e.h-20)){
        return triggerGameOver();
      }
    }
  }
}

function triggerGameOver(){
  state.gameOver = true;
  const overlay = document.getElementById('overlay');
  overlay.classList.remove('hidden');
  document.getElementById('overlay-title').textContent = 'Game Over';
  document.getElementById('score-line').textContent = `Distance: ${Math.floor(state.distance/10)} m`;
}

// ------ Loop ------
let last = performance.now();
function loop(now){
  const dt = Math.min(50, now - last);
  last = now;
  if (assetsLoaded === assetsTarget && state.started && !state.gameOver){
    update(dt);
  }
  // Draw
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if (assetsLoaded === assetsTarget){
    drawBackground();
    drawEntities();
    drawPlayer();
  } else {
    // loading
    ctx.fillStyle = '#fff';
    ctx.fillText('Loading...', canvas.width/2-30, canvas.height/2);
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// UI
document.getElementById('restart').addEventListener('click', resetGame);

// Start automatically after a small safe delay to show instructions
setTimeout(resetGame, 300);
