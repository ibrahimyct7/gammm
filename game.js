const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let keys = {};
document.addEventListener('keydown', e => keys[e.code] = true);
document.addEventListener('keyup', e => keys[e.code] = false);

const assets = {};
const loadImage = src => {
  const img = new Image();
  img.src = src;
  return img;
};

// Load images
assets.sky = loadImage('assets/sky.png');
assets.mountain = loadImage('assets/mountain.png');
assets.bush = loadImage('assets/bush.png');
assets.short_house = loadImage('assets/short_house.png');
assets.tall_house = loadImage('assets/tall_house.png');
assets.player = loadImage('assets/player.png');
assets.snake = loadImage('assets/snake.png');
assets.swords = loadImage('assets/swords.png');

let player = {
  x: 100, y: canvas.height - 300, w: 50, h: 50,
  vx: 0, vy: 0, jumping: false, alive: true
};

let gravity = 0.6;
let jumpPower = -12;
let scrollSpeed = 3;

let platforms = [];
let hazards = [];
let score = 0;

// Generate platforms endlessly
function addPlatform(x) {
  const type = Math.random() < 0.5 ? 'short_house' : 'tall_house';
  const img = assets[type];
  const y = canvas.height - (type === 'short_house' ? 200 : 300);
  platforms.push({x, y, w: img.width, h: img.height, type});
  // Random hazard
  if (Math.random() < 0.5) {
    hazards.push({
      x: x + Math.random() * (img.width - 50),
      y: y - 50,
      type: Math.random() < 0.5 ? 'snake' : 'swords'
    });
  }
}

for (let i = 0; i < 5; i++) {
  addPlatform(i * 300 + 200);
}

// Update loop
function update() {
  if (!player.alive) return;

  // Jump controls only
  if (keys['Space'] && !player.jumping) {
    player.vy = jumpPower;
    if (keys['ArrowRight']) player.vx = 5;
    else if (keys['ArrowLeft']) player.vx = -5;
    else player.vx = 0;
    player.jumping = true;
  }

  player.vy += gravity;
  player.x += player.vx;
  player.y += player.vy;

  // Collision with platforms
  for (let plat of platforms) {
    if (player.x < plat.x + plat.w && player.x + player.w > plat.x &&
        player.y + player.h < plat.y + 20 && player.y + player.h > plat.y - 20) {
      player.y = plat.y - player.h;
      player.vy = 0;
      player.jumping = false;
      score += 0.1;
    }
  }

  // Hazards
  for (let hz of hazards) {
    let img = assets[hz.type];
    if (player.x < hz.x + img.width && player.x + player.w > hz.x &&
        player.y < hz.y + img.height && player.y + player.h > hz.y) {
      player.alive = false;
    }
  }

  // Death if fall
  if (player.y > canvas.height - 50) {
    player.alive = false;
  }

  // Scroll world
  for (let plat of platforms) plat.x -= scrollSpeed;
  for (let hz of hazards) hz.x -= scrollSpeed;

  if (platforms[0].x + platforms[0].w < 0) {
    platforms.shift();
    hazards.shift();
    addPlatform(platforms[platforms.length-1].x + 300);
  }
}

// Draw parallax + world
function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // Parallax backgrounds
  ctx.drawImage(assets.sky, 0, 0, canvas.width, canvas.height);
  ctx.drawImage(assets.mountain, 0, canvas.height-400, canvas.width, 400);
  ctx.drawImage(assets.bush, 0, canvas.height-200, canvas.width, 200);

  // Platforms
  for (let plat of platforms) {
    ctx.drawImage(assets[plat.type], plat.x, plat.y);
  }

  // Hazards
  for (let hz of hazards) {
    ctx.drawImage(assets[hz.type], hz.x, hz.y, 40, 40);
  }

  // Player
  ctx.drawImage(assets.player, player.x, player.y, player.w, player.h);

  // Score
  ctx.fillStyle = 'white';
  ctx.font = '20px Arial';
  ctx.fillText('Score: ' + Math.floor(score), 20, 30);

  if (!player.alive) {
    ctx.fillStyle = 'red';
    ctx.font = '40px Arial';
    ctx.fillText('Game Over - Press R', canvas.width/2 - 150, canvas.height/2);
  }
}

// Restart
document.addEventListener('keydown', e => {
  if (e.code === 'KeyR' && !player.alive) {
    player = {x:100,y:canvas.height-300,w:50,h:50,vx:0,vy:0,jumping:false,alive:true};
    platforms = [];
    hazards = [];
    for (let i = 0; i < 5; i++) addPlatform(i*300+200);
    score = 0;
  }
});

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();
