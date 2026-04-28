// ===== PARTICLE GALAXY - COMPLETE ENHANCED VERSION =====

// Audio setup
const audio = document.getElementById("bg-audio");
const audioToggle = document.getElementById("audio-toggle");
const fullscreenBtn = document.getElementById("fullscreen-btn");
const screenshotBtn = document.getElementById("screenshot-btn");
const settingsBtn = document.getElementById("settings-btn");
let audioPlaying = false;

// Settings
let settings = {
  particleCount: 5000,
  rotationSpeed: 1.0,
  brightness: 1.0,
  nebulaIntensity: 0.5,
  shootingStars: true,
  trails: false,
  constellationMode: false
};

// FPS Counter
let fps = 60;
let lastTime = performance.now();
let frames = 0;

function updateFPS() {
  frames++;
  const currentTime = performance.now();
  if (currentTime >= lastTime + 1000) {
    fps = Math.round((frames * 1000) / (currentTime - lastTime));
    document.getElementById('fps-counter').textContent = fps;
    frames = 0;
    lastTime = currentTime;
  }
}

// Audio control
document.addEventListener("click", function startAudio() {
  audio.play().then(() => {
    audioPlaying = true;
    audioToggle.innerHTML = '<i class="fas fa-volume-up"></i>';
  }).catch(() => {});
  document.removeEventListener("click", startAudio);
}, { once: true });

audioToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  if (audioPlaying) {
    audio.pause();
    audioToggle.innerHTML = '<i class="fas fa-volume-mute"></i>';
    audioPlaying = false;
  } else {
    audio.play();
    audioToggle.innerHTML = '<i class="fas fa-volume-up"></i>';
    audioPlaying = true;
  }
});

// Loader
window.addEventListener("load", () => {
  setTimeout(() => document.getElementById("loader").classList.add("hidden"), 1500);
});

// Canvas setup
const canvas = document.getElementById("galaxy-canvas");
const ctx = canvas.getContext("2d");
let W, H;

function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

// Particle system
const particles = [];
let mouseX = W / 2, mouseY = H / 2;
let targetRotX = 0, targetRotY = 0, rotX = 0, rotY = 0;
let zoom = 1, targetZoom = 1;
let isDragging = false, lastMX = 0, lastMY = 0;
let warpSpeed = 0;
let shootingStars = [];
let supernovas = [];
let time = 0;
let lastShootingStar = 0;

class Particle {
  constructor() {
    this.reset();
  }
  reset() {
    const r = 200 + Math.random() * 400;
    const theta = Math.random() * Math.PI * 2;
    const phi = (Math.random() - 0.5) * Math.PI * 0.6;
    this.x = r * Math.cos(theta) * Math.cos(phi);
    this.y = r * Math.sin(phi) * 0.4;
    this.z = r * Math.sin(theta) * Math.cos(phi);
    this.baseSize = 0.5 + Math.random() * 2;
    this.brightness = 0.3 + Math.random() * 0.7;
    const colorRoll = Math.random();
    if (colorRoll < 0.5) this.color = [255, 153, 51];
    else if (colorRoll < 0.8) this.color = [19, 136, 8];
    else if (colorRoll < 0.92) this.color = [255, 255, 255];
    else this.color = [0, 0, 128];
    this.orbitSpeed = (0.0002 + Math.random() * 0.0008) * (Math.random() > 0.5 ? 1 : -1);
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.pulseSpeed = 0.01 + Math.random() * 0.03;
  }
}

function initParticles(count) {
  particles.length = 0;
  for (let i = 0; i < count; i++) {
    particles.push(new Particle());
  }
  document.getElementById('particle-count').textContent = count.toLocaleString();
}

const PARTICLE_COUNT = window.innerWidth < 768 ? 2000 : 5000;
initParticles(PARTICLE_COUNT);

class ShootingStar {
  constructor() {
    this.x = Math.random() * W;
    this.y = Math.random() * H * 0.3;
    this.vx = 8 + Math.random() * 6;
    this.vy = 3 + Math.random() * 3;
    this.life = 1;
    this.trail = [];
  }
  update() {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 20) this.trail.shift();
    this.x += this.vx;
    this.y += this.vy;
    this.life -= 0.015;
  }
  draw() {
    for (let i = 0; i < this.trail.length; i++) {
      const a = (i / this.trail.length) * this.life;
      ctx.beginPath();
      ctx.arc(this.trail[i].x, this.trail[i].y, 1.5 * (i / this.trail.length), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fill();
    }
  }
}

class Supernova {
  constructor(sx, sy) {
    this.x = sx;
    this.y = sy;
    this.sparks = [];
    for (let i = 0; i < 200; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 8;
      this.sparks.push({
        x: sx, y: sy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color: Math.random() > 0.5 ? [255, 153, 51] : [19, 136, 8],
        size: 1 + Math.random() * 3,
      });
    }
    this.flash = 1;
  }
  update() {
    this.flash *= 0.92;
    this.sparks.forEach((s) => {
      s.x += s.vx;
      s.y += s.vy;
      s.vx *= 0.98;
      s.vy *= 0.98;
      s.life -= 0.02;
    });
    this.sparks = this.sparks.filter((s) => s.life > 0);
  }
  draw() {
    if (this.flash > 0.05) {
      const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 150 * this.flash);
      grad.addColorStop(0, `rgba(255,255,255,${this.flash})`);
      grad.addColorStop(0.3, `rgba(0,255,255,${this.flash * 0.5})`);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(this.x - 200, this.y - 200, 400, 400);
    }
    this.sparks.forEach((s) => {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * s.life, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${s.color[0]},${s.color[1]},${s.color[2]},${s.life})`;
      ctx.fill();
    });
  }
}

function project(x, y, z) {
  const cosRX = Math.cos(rotX), sinRX = Math.sin(rotX);
  const cosRY = Math.cos(rotY), sinRY = Math.sin(rotY);
  let ny = y * cosRX - z * sinRX;
  let nz = y * sinRX + z * cosRX;
  let nx = x * cosRY + nz * sinRY;
  nz = -x * sinRY + nz * cosRY;
  const perspective = 800 / (800 + nz * zoom);
  return {
    sx: W / 2 + nx * perspective * zoom,
    sy: H / 2 + ny * perspective * zoom,
    scale: perspective,
    z: nz,
  };
}

function animate() {
  requestAnimationFrame(animate);
  time++;
  updateFPS();

  ctx.fillStyle = `rgba(0,0,17,${warpSpeed > 0.5 ? 0.15 : 0.25})`;
  ctx.fillRect(0, 0, W, H);

  rotX += (targetRotX - rotX) * 0.05;
  rotY += (targetRotY - rotY) * 0.05;
  zoom += (targetZoom - zoom) * 0.08;
  warpSpeed *= 0.95;

  const sorted = [];
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const angle = p.orbitSpeed * settings.rotationSpeed * (1 + warpSpeed * 5);
    const cosA = Math.cos(angle), sinA = Math.sin(angle);
    const nx = p.x * cosA - p.z * sinA;
    const nz = p.x * sinA + p.z * cosA;
    p.x = nx;
    p.z = nz;
    p.pulsePhase += p.pulseSpeed;
    const proj = project(p.x, p.y, p.z);
    sorted.push({ p, proj });
  }

  sorted.sort((a, b) => a.proj.z - b.proj.z);

  sorted.forEach(({ p, proj }) => {
    if (proj.sx < -50 || proj.sx > W + 50 || proj.sy < -50 || proj.sy > H + 50) return;
    const pulse = 0.7 + 0.3 * Math.sin(p.pulsePhase);
    const size = p.baseSize * proj.scale * (1 + warpSpeed * 2) * pulse;
    const alpha = Math.min(1, p.brightness * proj.scale * pulse * settings.brightness);
    if (size < 0.3) return;
    const [r, g, b] = p.color;

    if (settings.trails) {
      ctx.beginPath();
      ctx.moveTo(proj.sx, proj.sy);
      ctx.lineTo(proj.sx - p.x * 0.01, proj.sy - p.y * 0.01);
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.3})`;
      ctx.lineWidth = size * 0.5;
      ctx.stroke();
    }

    if (size > 2) {
      const grad = ctx.createRadialGradient(proj.sx, proj.sy, 0, proj.sx, proj.sy, size * 3);
      grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
      grad.addColorStop(0.4, `rgba(${r},${g},${b},${alpha * 0.3})`);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(proj.sx - size * 3, proj.sy - size * 3, size * 6, size * 6);
    }
    ctx.beginPath();
    ctx.arc(proj.sx, proj.sy, Math.max(0.5, size), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.fill();
  });

  if (settings.shootingStars && time - lastShootingStar > 180) {
    shootingStars.push(new ShootingStar());
    lastShootingStar = time;
  }
  shootingStars.forEach((s) => { s.update(); s.draw(); });
  shootingStars = shootingStars.filter((s) => s.life > 0);

  supernovas.forEach((s) => { s.update(); s.draw(); });
  supernovas = supernovas.filter((s) => s.sparks.length > 0);

  const nebulaCount = Math.floor(3 + Math.sin(time * 0.005) * 2);
  for (let i = 0; i < nebulaCount; i++) {
    const nx = W / 2 + Math.sin(time * 0.002 + i * 2) * 300;
    const ny = H / 2 + Math.cos(time * 0.003 + i * 1.5) * 200;
    const nSize = 80 + Math.sin(time * 0.01 + i) * 40;
    const grad = ctx.createRadialGradient(nx, ny, 0, nx, ny, nSize);
    const hue = (time * 0.1 + i * 60) % 360;
    grad.addColorStop(0, `hsla(${hue},80%,60%,${0.03 * settings.nebulaIntensity})`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(nx - nSize, ny - nSize, nSize * 2, nSize * 2);
  }

  document.getElementById("zoom-level").textContent = zoom.toFixed(1) + "x";
}

// Mouse/Touch controls
canvas.addEventListener("mousedown", (e) => {
  isDragging = true;
  lastMX = e.clientX;
  lastMY = e.clientY;
});

document.addEventListener("mousemove", (e) => {
  if (isDragging) {
    targetRotY += (e.clientX - lastMX) * 0.005;
    targetRotX += (e.clientY - lastMY) * 0.005;
    lastMX = e.clientX;
    lastMY = e.clientY;
  }
});

document.addEventListener("mouseup", () => (isDragging = false));

canvas.addEventListener("click", (e) => {
  supernovas.push(new Supernova(e.clientX, e.clientY));
});

canvas.addEventListener("dblclick", () => {
  warpSpeed = 3;
});

canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  targetZoom = Math.max(0.3, Math.min(5, targetZoom - e.deltaY * 0.001));
}, { passive: false });

let touchStartDist = 0;
canvas.addEventListener("touchstart", (e) => {
  if (e.touches.length === 1) {
    isDragging = true;
    lastMX = e.touches[0].clientX;
    lastMY = e.touches[0].clientY;
  } else if (e.touches.length === 2) {
    touchStartDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
  }
});

canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  if (e.touches.length === 1 && isDragging) {
    targetRotY += (e.touches[0].clientX - lastMX) * 0.005;
    targetRotX += (e.touches[0].clientY - lastMY) * 0.005;
    lastMX = e.touches[0].clientX;
    lastMY = e.touches[0].clientY;
  } else if (e.touches.length === 2) {
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    targetZoom = Math.max(0.3, Math.min(5, targetZoom * (dist / touchStartDist)));
    touchStartDist = dist;
  }
}, { passive: false });

canvas.addEventListener("touchend", () => (isDragging = false));

// Title animation
const titleText = "You are made of stardust";
const titleEl = document.getElementById("main-title");
let charIndex = 0;
setTimeout(() => {
  const titleInterval = setInterval(() => {
    if (charIndex < titleText.length) {
      titleEl.textContent += titleText[charIndex];
      charIndex++;
    } else {
      clearInterval(titleInterval);
    }
  }, 80);
}, 3000);

// Settings panel
const settingsPanel = document.getElementById('settings-panel');
settingsBtn.addEventListener('click', () => {
  settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('close-settings-btn').addEventListener('click', () => {
  settingsPanel.style.display = 'none';
});

document.getElementById('reset-view-btn').addEventListener('click', () => {
  targetRotX = 0;
  targetRotY = 0;
  targetZoom = 1;
  showNotification('View reset! 🔄');
});

document.getElementById('particle-slider').addEventListener('input', (e) => {
  settings.particleCount = parseInt(e.target.value);
  document.getElementById('particle-val').textContent = settings.particleCount;
  initParticles(settings.particleCount);
});

document.getElementById('rotation-slider').addEventListener('input', (e) => {
  settings.rotationSpeed = parseFloat(e.target.value);
  document.getElementById('rotation-val').textContent = settings.rotationSpeed.toFixed(1) + 'x';
});

document.getElementById('brightness-slider').addEventListener('input', (e) => {
  settings.brightness = parseInt(e.target.value) / 100;
  document.getElementById('brightness-val').textContent = e.target.value + '%';
});

document.getElementById('nebula-slider').addEventListener('input', (e) => {
  settings.nebulaIntensity = parseInt(e.target.value) / 100;
  document.getElementById('nebula-val').textContent = e.target.value + '%';
});

document.getElementById('shooting-stars-toggle').addEventListener('change', (e) => {
  settings.shootingStars = e.target.checked;
});

document.getElementById('trails-toggle').addEventListener('change', (e) => {
  settings.trails = e.target.checked;
});

// Fullscreen
fullscreenBtn.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
    fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
  } else {
    document.exitFullscreen();
    fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
  }
});

// Screenshot
function captureScreenshot() {
  const link = document.createElement('a');
  link.download = `galaxy-${Date.now()}.png`;
  link.href = canvas.toDataURL();
  link.click();
  showNotification('Screenshot saved! 📸');
}
screenshotBtn.addEventListener('click', captureScreenshot);

// Notification
function showNotification(message) {
  const notif = document.createElement('div');
  notif.textContent = message;
  notif.style.cssText = `
    position: fixed; top: 80px; right: 20px;
    background: rgba(0, 255, 255, 0.1);
    border: 1px solid rgba(0, 255, 255, 0.3);
    padding: 12px 20px; border-radius: 8px;
    color: #00ffff; font-size: 0.8rem;
    z-index: 10000; backdrop-filter: blur(10px);
    animation: slideInRight 0.3s ease;
  `;
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 3000);
}

// Info cards rotation
let currentCard = 0;
const infoCards = document.querySelectorAll('.info-card');
function rotateInfoCards() {
  if (infoCards.length > 0) {
    infoCards[currentCard].classList.remove('active');
    currentCard = (currentCard + 1) % infoCards.length;
    infoCards[currentCard].classList.add('active');
  }
}
setInterval(rotateInfoCards, 10000);

// Quick actions
document.querySelectorAll('.action-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    if (action === 'timelapse') {
      settings.rotationSpeed = 5.0;
      setTimeout(() => { settings.rotationSpeed = 1.0; }, 5000);
      showNotification('Time Lapse Mode! ⏱️');
    } else if (action === 'blackhole') {
      particles.forEach(p => {
        const dx = -p.x, dy = -p.y, dz = -p.z;
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (dist > 0) {
          p.x += dx * 0.01;
          p.y += dy * 0.01;
          p.z += dz * 0.01;
        }
      });
      showNotification('Black Hole Created! 🕳️');
    } else if (action === 'collision') {
      particles.forEach(p => { p.orbitSpeed *= 2; });
      setTimeout(() => { particles.forEach(p => { p.orbitSpeed /= 2; }); }, 3000);
      showNotification('Galaxy Collision! 💥');
    }
  });
});

// Keyboard shortcuts
const shortcutsHelp = document.getElementById('shortcuts-help');
document.getElementById('close-help-btn').addEventListener('click', () => {
  shortcutsHelp.style.display = 'none';
});

document.addEventListener('keydown', (e) => {
  if (e.key === 's' || e.key === 'S') { e.preventDefault(); captureScreenshot(); }
  if (e.key === 'f' || e.key === 'F') { e.preventDefault(); fullscreenBtn.click(); }
  if (e.key === 'm' || e.key === 'M') { e.preventDefault(); audioToggle.click(); }
  if (e.key === 'r' || e.key === 'R') { e.preventDefault(); document.getElementById('reset-view-btn').click(); }
  if (e.key === ' ') { e.preventDefault(); warpSpeed = 3; showNotification('Warp speed! 🚀'); }
  if (e.key === '?') { e.preventDefault(); shortcutsHelp.style.display = shortcutsHelp.style.display === 'none' ? 'flex' : 'none'; }
});

// Animations CSS
const animStyle = document.createElement('style');
animStyle.textContent = `
  @keyframes slideInRight {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
`;
document.head.appendChild(animStyle);

// Audio volume
audio.volume = 0.3;

// Start animation
animate();

console.log('🌌 Particle Galaxy initialized!');
