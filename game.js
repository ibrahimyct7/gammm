const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// --- Assets ---
const playerImg = new Image();
playerImg.src = "assets/player.png";

const swordImg = new Image();
swordImg.src = "assets/swords.png";

const snakeImg = new Image();
snakeImg.src = "assets/snake.png";

const plantImg = new Image();
plantImg.src = "assets/plants.png";

const mapImg = new Image();
mapImg.src = "assets/map.png";

// New house assets
const tallHouse = new Image();
tallHouse.src = "assets/tall house.png";

const shortHouse = new Image();
shortHouse.src = "assets/short house.png";

// --- Game state ---
let player, blocks, hazards, dist, dead;

function reset() {
  player = { x: 200, y: 300, vy: 0, w: 40, h: 40, jumping: false };
  blocks = [makeBlock(150, 400, 200, 80)];
  hazards = [];
  dist = 0;
  dead = false;
}

function makeBlock(x, y, w, h) {
  return {
    x, y, w, h,
    img: Math.random() < 0.5 ? tallHouse : shortHouse // random house
  };
}

function makeHazard(x, y, type) {
  return { x, y, type };
}

// --- Controls ---
const keys = {};
onkeydown = e => (keys[e.code] = true);
onkeyup = e => (keys[e.code] = false);

// --- Update ---
function update() {
  if (dead) {
    if (keys["KeyR"]) reset();
    return;
  }

  dist += 2;

  // Gravity
  player.vy += 1;
  player.y += player.vy;

  // Jump
  if (keys["Space"] && !player.jumping) {
    player.vy = -15;
    player.jumping = true;
  }

  // Left/right in air
  if (keys["ArrowLeft"]) player.x -= 5;
  if (keys["ArrowRight"]) player.x += 5;

  // Collisions with blocks
  for (let b of blocks) {
    if (
      player.x < b.x + b.w &&
      player.x + player.w > b.x &&
      player.y + player.h > b.y - b.h &&
      player.y + player.h < b.y &&
      player.vy >= 0
    ) {
      player.y = b.y - b.h - player.h;
      player.vy = 0;
      player.jumping = false;
    }
  }

  // Collisions with hazards
  for (let h of hazards) {
    if (
      player.x < h.x + 40 &&
      player.x + player.w > h.x &&
      player.y < h.y + 40 &&
      player.y + player.h > h.y
    ) {
      dead = true;
    }
  }

  // Generate new blocks
  const last = blocks[blocks.length - 1];
  if (last.x + last.w < canvas.width) {
    const newX = last.x + last.w + Math.random() * 200 + 100;
    const newW = 200 + Math.random() * 100;
    const newY = 400; // rooftops aligned
    blocks.push(makeBlock(newX, newY, newW, 80));

    // Random hazards
    if (Math.random() < 0.3) {
      hazards.push(makeHazard(newX + newW / 2, newY - 80, "sword"));
    } else if (Math.random() < 0.3) {
      hazards.push(makeHazard(newX + newW / 2, newY - 80, "snake"));
    }
  }
}

// --- Draw ---
function drawBlock(b) {
  if (b.img && b.img.complete) {
    ctx.drawImage(b.img, b.x, b.y - b.h, b.w, b.h);
  } else {
    ctx.fillStyle = "#222";
    ctx.fillRect(b.x, b.y - b.h, b.w, b.h);
  }
}

function drawHazard(h) {
  let img;
  if (h.type === "sword") img = swordImg;
  if (h.type === "snake") img = snakeImg;
  if (h.type === "plant") img = plantImg;
  if (img) ctx.drawImage(img, h.x, h.y, 40, 40);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background
  ctx.drawImage(mapImg, 0, 0, canvas.width, canvas.height);

  // Blocks (houses)
  for (let b of blocks) drawBlock(b);

  // Hazards
  for (let h of hazards) drawHazard(h);

  // Player
  ctx.drawImage(playerImg, player.x, player.y, player.w, player.h);

  // HUD
  document.getElementById("dist").textContent = Math.floor(dist / 10) + " m";

  if (dead) {
    document.getElementById("overlay").classList.remove("hidden");
  } else {
    document.getElementById("overlay").classList.add("hidden");
  }
}

// --- Loop ---
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

reset();
loop();
