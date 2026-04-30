const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const levelEl = document.getElementById('level');
const messageEl = document.getElementById('message');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');

const CELL = 20;
const COLS = canvas.width / CELL;
const ROWS = canvas.height / CELL;

let worm, dir, nextDir, food, score, best, level, state, timer;
// state: 'idle' | 'running' | 'paused' | 'over'

best = parseInt(localStorage.getItem('worm_best') || '0');
bestEl.textContent = best;

function init() {
  worm = [
    { x: 10, y: 10 },
    { x: 9,  y: 10 },
    { x: 8,  y: 10 },
  ];
  dir = { x: 1, y: 0 };
  nextDir = { x: 1, y: 0 };
  score = 0;
  level = 1;
  scoreEl.textContent = 0;
  levelEl.textContent = 1;
  spawnFood();
}

function spawnFood() {
  let pos;
  do {
    pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
  } while (worm.some(s => s.x === pos.x && s.y === pos.y));
  food = pos;
}

function getSpeed() {
  // level 1~10, interval 200ms -> 80ms
  return Math.max(80, 200 - (level - 1) * 13);
}

function startGame() {
  clearInterval(timer);
  init();
  state = 'running';
  messageEl.textContent = '';
  timer = setInterval(tick, getSpeed());
}

function togglePause() {
  if (state === 'running') {
    state = 'paused';
    clearInterval(timer);
    messageEl.textContent = '已暂停 — 按空格继续';
  } else if (state === 'paused') {
    state = 'running';
    messageEl.textContent = '';
    timer = setInterval(tick, getSpeed());
  }
}

function tick() {
  dir = nextDir;
  const head = { x: worm[0].x + dir.x, y: worm[0].y + dir.y };

  // Wall collision
  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
    return gameOver();
  }
  // Self collision
  if (worm.some(s => s.x === head.x && s.y === head.y)) {
    return gameOver();
  }

  worm.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score++;
    scoreEl.textContent = score;
    if (score > best) {
      best = score;
      bestEl.textContent = best;
      localStorage.setItem('worm_best', best);
    }
    // Level up every 5 points
    const newLevel = Math.min(10, 1 + Math.floor(score / 5));
    if (newLevel !== level) {
      level = newLevel;
      levelEl.textContent = level;
      clearInterval(timer);
      timer = setInterval(tick, getSpeed());
    }
    spawnFood();
  } else {
    worm.pop();
  }

  draw();
}

function gameOver() {
  clearInterval(timer);
  state = 'over';
  messageEl.textContent = `游戏结束！得分 ${score} — 按空格或点击开始重玩`;
  draw();
}

function draw() {
  // Background
  ctx.fillStyle = '#16213e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid (subtle)
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= COLS; i++) {
    ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, canvas.height); ctx.stroke();
  }
  for (let j = 0; j <= ROWS; j++) {
    ctx.beginPath(); ctx.moveTo(0, j * CELL); ctx.lineTo(canvas.width, j * CELL); ctx.stroke();
  }

  // Food
  const fx = food.x * CELL + CELL / 2;
  const fy = food.y * CELL + CELL / 2;
  ctx.fillStyle = '#f5a623';
  ctx.beginPath();
  ctx.arc(fx, fy, CELL / 2 - 2, 0, Math.PI * 2);
  ctx.fill();
  // Food shine
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.arc(fx - 3, fy - 3, 3, 0, Math.PI * 2);
  ctx.fill();

  // Worm
  worm.forEach((seg, i) => {
    const ratio = 1 - i / worm.length;
    const r = Math.round(78 * ratio + 20 * (1 - ratio));
    const g = Math.round(204 * ratio + 100 * (1 - ratio));
    const b = Math.round(163 * ratio + 60 * (1 - ratio));
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    const pad = i === 0 ? 1 : 2;
    ctx.beginPath();
    ctx.roundRect(seg.x * CELL + pad, seg.y * CELL + pad, CELL - pad * 2, CELL - pad * 2, 4);
    ctx.fill();
  });

  // Eyes on head
  const head = worm[0];
  ctx.fillStyle = '#1a1a2e';
  const eyeOffset = 4;
  let e1, e2;
  if (dir.x === 1)       { e1 = {x: 13, y: 5};  e2 = {x: 13, y: 13}; }
  else if (dir.x === -1) { e1 = {x: 5,  y: 5};  e2 = {x: 5,  y: 13}; }
  else if (dir.y === -1) { e1 = {x: 5,  y: 5};  e2 = {x: 13, y: 5};  }
  else                   { e1 = {x: 5,  y: 13}; e2 = {x: 13, y: 13}; }
  ctx.beginPath();
  ctx.arc(head.x * CELL + e1.x, head.y * CELL + e1.y, 2, 0, Math.PI * 2);
  ctx.arc(head.x * CELL + e2.x, head.y * CELL + e2.y, 2, 0, Math.PI * 2);
  ctx.fill();
}

// Initial draw
init();
draw();
state = 'idle';

// Input
document.addEventListener('keydown', e => {
  const map = {
    ArrowUp: {x:0,y:-1}, ArrowDown: {x:0,y:1}, ArrowLeft: {x:-1,y:0}, ArrowRight: {x:1,y:0},
    w: {x:0,y:-1}, s: {x:0,y:1}, a: {x:-1,y:0}, d: {x:1,y:0},
    W: {x:0,y:-1}, S: {x:0,y:1}, A: {x:-1,y:0}, D: {x:1,y:0},
  };
  if (e.key === ' ') {
    e.preventDefault();
    if (state === 'idle' || state === 'over') startGame();
    else togglePause();
    return;
  }
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
  const d = map[e.key];
  if (!d) return;
  // Prevent reversing
  if (d.x !== 0 && d.x === -dir.x) return;
  if (d.y !== 0 && d.y === -dir.y) return;
  nextDir = d;
});

startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', () => {
  if (state === 'idle' || state === 'over') startGame();
  else togglePause();
});
