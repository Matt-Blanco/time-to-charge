let battery = {
  level: 0.0,
  charging: false,
  chargingTime: 0,
  dischargingTime: 0,
};
// null = follow OS, true/false = manual override
let chargingOverride = null;

// Animated fill level (0..100) — independent of the real battery.level.
// Sweeps up while charging, down while discharging.
let animFillPct = 0;
const ANIM_FILL_RATE = 0.5; // % per frame

function isCharging() {
  return chargingOverride !== null ? chargingOverride : !!battery.charging;
}

let frontGlitch;
let backGlitch;
let frontCapture;
let backCapture;
let showBackCapture = false;

let frontDetector;
let backDetector;
let frontDetections = [];
let backDetections = [];

const CW = 13;
const CH = 18;
const COLS = 24;
const ROWS = 28;

const detectIntervalMs = 300;

// Hoisted out of the per-frame hot path to avoid per-frame Set allocations.
const FILL_CHARS = new Set(["░", "▒", "▓", "█"]);
const WALL_CHARS = new Set(["|", "/", "\\", "'", "."]);
const LABEL_CHARS = new Set([
  "0","1","2","3","4","5","6","7","8","9",
  "%","F","U","L","K","/","\\",
]);

// Cached offscreen buffer for the battery body. Rebuilt only when the fill
// step or integer percent changes — not every frame.
let overlayBuf = null;
let overlayKey = "";

// Detector loop is paused when the camera isn't visible (i.e. !isCharging),
// so the heavy ML inference doesn't run in the background.
let detectorPaused = false;

// `facingMode` as a plain string is a preference — the browser picks the
// matching camera when available and falls back otherwise. Using
// `{ exact: ... }` throws OverconstrainedError on devices without that camera.
function videoConstraints(preferred) {
  return { video: { facingMode: preferred } };
}

function frontVideoReady() {
  frontDetector = ml5.objectDetector("cocossd", () => {
    frontDetector.detect(frontCapture, gotFrontDetections);
  });
}

function backVideoReady() {
  backDetector = ml5.objectDetector("cocossd", () => {
    backDetector.detect(backCapture, gotBackDetections);
  });
}

function gotFrontDetections(error, results) {
  if (error) {
    console.error(error);
    return;
  }
  frontDetections = results;
  if (isCharging()) {
    setTimeout(
      () => frontDetector.detect(frontCapture, gotFrontDetections),
      detectIntervalMs,
    );
  } else {
    detectorPaused = true;
  }
}

function gotBackDetections(error, results) {
  if (error) {
    console.error(error);
    return;
  }
  backDetections = results;
  if (isCharging()) {
    setTimeout(
      () => backDetector.detect(backCapture, gotBackDetections),
      detectIntervalMs,
    );
  }
}

function resumeDetectorIfNeeded() {
  if (detectorPaused && frontDetector && isCharging()) {
    detectorPaused = false;
    frontDetector.detect(frontCapture, gotFrontDetections);
    if (showBackCapture && backDetector) {
      backDetector.detect(backCapture, gotBackDetections);
    }
  }
}

function getBatteryLines(fillPct, labelPct) {
  const fill = Math.max(0, Math.min(100, fillPct));
  const labelVal = Math.max(0, Math.min(100, labelPct));

  let lines = [];
  for (let r = 0; r < ROWS; r++) lines.push(Array(COLS).fill(" "));

  const set = (r, c, ch) => {
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) lines[r][c] = ch;
  };
  const setStr = (r, c, s) => {
    for (let i = 0; i < s.length; i++) set(r, c + i, s[i]);
  };

  setStr(0, 8, ".------.");
  setStr(1, 8, "|  (+) |");
  setStr(2, 8, "'------'");

  setStr(3, 2, "./                \\.");
  setStr(4, 1, "/                    \\");

  for (let r = 5; r <= 21; r++) {
    set(r, 1, "|");
    set(r, 22, "|");
  }

  setStr(22, 1, "\\                    /");
  setStr(23, 2, "'\\.              ./'");

  setStr(24, 1, "+" + "=".repeat(21) + "+");
  setStr(25, 1, "|" + " ".repeat(21) + "|");
  setStr(26, 1, "+" + "=".repeat(21) + "+");

  const fillRows = 17;
  const filled = Math.round((fill / 100) * fillRows);
  const blocks = ["░", "▒", "▓", "█"];

  for (let i = 0; i < fillRows; i++) {
    const row = 5 + (fillRows - 1 - i);
    if (i < filled) {
      const depth = Math.min(3, Math.floor((i / fillRows) * 4));
      const ch = blocks[depth];
      for (let c = 2; c <= 21; c++) lines[row][c] = ch;
    }
  }

  const label = labelVal >= 100 ? "FULL" : labelVal.toFixed(0) + "%";
  const midRow = 13;
  const startCol = Math.floor((COLS - label.length) / 2);
  for (let i = 0; i < label.length; i++) set(midRow, startCol + i, label[i]);

  const icon = labelVal >= 100 ? "OK" : "/\\";
  const iconRow = 15;
  const iconCol = Math.floor((COLS - icon.length) / 2);
  for (let i = 0; i < icon.length; i++) set(iconRow, iconCol + i, icon[i]);

  return lines;
}

function preload() {
  startBatteryListeners();
}

function setup() {
  // Render at 1x backing density — on high-DPR mobile this can be a 4–9x win.
  pixelDensity(1);

  let cnv = createCanvas(windowWidth, windowHeight);
  cnv.parent("c");
  textFont("monospace");
  textSize(13);
  frameRate(30);

  frontGlitch = new Glitch();
  frontGlitch.pixelate(1);

  backGlitch = new Glitch();
  backGlitch.pixelate(1);

  frontCapture = createCapture(
    videoConstraints("environment"),
    frontVideoReady,
  );
  frontCapture.size(width / 4, height / 4);
  frontCapture.hide();

  if (showBackCapture) {
    backCapture = createCapture(videoConstraints("user"), backVideoReady);
    backCapture.size(width / 4, height / 8);
    backCapture.hide();
  }
}

function draw() {
  if (isCharging()) {
    // No background() needed — the fullscreen image() below covers every pixel.
    image(frontCapture, 0, 0, width, height);
    buildGlitch(frontCapture, frontGlitch, frontDetections);
    drawGlitchAroundBounds(frontCapture, frontGlitch, 0, 0, width, height);
    if (showBackCapture) {
      buildGlitch(backCapture, backGlitch, backDetections);
      drawGlitchAroundBounds(
        backCapture,
        backGlitch,
        0,
        height / 2,
        width,
        height / 2,
      );
    }
  } else {
    background(14, 14, 18);
  }

  drawBatteryOverlay();
}

function buildGlitch(capture, glitch, detections) {
  // Was every 12 frames; bumped to 24 since per-byte glitch + image upload
  // is one of the heaviest steps on older mobile.
  if (frameCount % 24 !== 0) return;

  glitch.bounds = detections;

  if (detections.length === 0) return;

  glitch.loadImage(capture);
  glitch.limitBytes(0);
  glitch.randomBytes(50);
  glitch.buildImage();
}

function drawGlitchAroundBounds(capture, glitch, dx, dy, dw, dh) {
  const bounds = glitch.bounds;
  if (
    !bounds ||
    bounds.length === 0 ||
    !glitch.image ||
    glitch.image.width <= 1
  ) {
    return;
  }

  noFill();
  stroke(255, 0, 255);
  strokeWeight(2);

  for (const b of bounds) {
    const n = b.normalized || {
      x: b.x / capture.width,
      y: b.y / capture.height,
      width: b.width / capture.width,
      height: b.height / capture.height,
    };
    const sxRatio = n.x;
    const syRatio = n.y;
    const swRatio = n.width;
    const shRatio = n.height;

    const px = dx + sxRatio * dw;
    const py = dy + syRatio * dh;
    const pw = swRatio * dw;
    const ph = shRatio * dh;

    image(
      glitch.image,
      px,
      py,
      pw,
      ph,
      sxRatio * glitch.image.width,
      syRatio * glitch.image.height,
      swRatio * glitch.image.width,
      shRatio * glitch.image.height,
    );

    rect(px, py, pw, ph);
  }

  noStroke();
}

function drawBatteryOverlay() {
  const charging = isCharging();
  const realPct = Math.max(0, Math.min(100, (battery.level || 0) * 100));

  // Tick the animated fill, bounded so realPct is one endpoint of the loop.
  // Charging: fills realPct -> 100, then resets to realPct.
  // Discharging: drains realPct -> 0, then resets to realPct.
  if (charging) {
    if (animFillPct < realPct) animFillPct = realPct;
    animFillPct += ANIM_FILL_RATE;
    if (animFillPct >= 100) animFillPct = realPct;
  } else {
    if (animFillPct > realPct) animFillPct = realPct;
    animFillPct -= ANIM_FILL_RATE;
    if (animFillPct <= 0) animFillPct = realPct;
  }

  let r, g, b;
  if (realPct < 25) {
    r = 220;
    g = 55;
    b = 55;
  } else if (realPct < 60) {
    r = 230;
    g = 160;
    b = 30;
  } else {
    r = 50;
    g = 200;
    b = 90;
  }

  // Responsive layout: shrink to fit narrow viewports, never upscale past
  // native. Buffer stays at fixed bufW x bufH so the cache key is unaffected;
  // we just blit it at a scaled size with a single GPU draw.
  const bufW = COLS * CW;
  const bufH = ROWS * CH;
  const margin = 32;
  const drawW = Math.min(bufW, Math.max(160, width - margin));
  const s = drawW / bufW;
  const drawH = bufH * s;
  const offX = (width - drawW) / 2;
  const offY = Math.max(12, height * 0.04);
  const cameraActive = charging;

  // Translucent backplate over camera — darker alpha (180) provides enough
  // contrast that we can drop the per-glyph shadowBlur entirely.
  if (cameraActive) {
    const padX = 18 * s;
    const padY = 12 * s;
    noStroke();
    fill(0, 0, 0, 180);
    rect(
      offX - padX,
      offY - padY,
      drawW + padX * 2,
      drawH + padY * 2 + 56 * s,
      8,
    );
  }

  // Cache the battery body to an offscreen buffer at native pixel size.
  // Only rebuild when the visible fill step or integer percent changes.
  const fillStep = Math.floor(animFillPct / (100 / 17));
  const lvlRound = Math.round(realPct);
  const key = `${cameraActive ? 1 : 0}|${fillStep}|${lvlRound}`;
  if (key !== overlayKey) {
    rebuildOverlayBuf(animFillPct, realPct, r, g, b, cameraActive);
    overlayKey = key;
  }
  image(overlayBuf, offX, offY, drawW, drawH);

  const by = offY + drawH + 10 * s;
  const status = charging
    ? `[ charging... ${realPct.toFixed(0)}% ]`
    : `[ losing battery ]`;
  fill(255, 255, 255);
  noStroke();
  textAlign(CENTER);
  textSize(Math.max(10, 11 * s));
  text(status, width / 2, by + 26 * s);

  if (charging) {
    text(
      `(Actual time ${(battery.chargingTime / 3600).toFixed(2)} hours)`,
      width / 2 + 3,
      by + 52 * s,
    );

    text(
      `Time until battery is charged ${((3700 / 100) * (1 - battery.level)).toFixed(2)} hours`,
      width / 2,
      by + 40 * s,
    );
  } else {
    text(
      `Time until battery depletes ${(battery.dischargingTime / 3600).toFixed(2)} hours`,
      width / 2,
      by + 40 * s,
    );
  }
  textAlign(LEFT);
  textSize(13);
}

function rebuildOverlayBuf(animFillPct, realPct, r, g, b, cameraActive) {
  if (!overlayBuf) {
    overlayBuf = createGraphics(COLS * CW, ROWS * CH);
    overlayBuf.textFont("monospace");
    overlayBuf.textSize(13);
    overlayBuf.noStroke();
  }
  overlayBuf.clear();
  const lines = getBatteryLines(animFillPct, realPct);
  const boost = cameraActive ? 30 : 0;
  const c = (v) => Math.min(255, v + boost);

  for (let ri = 0; ri < lines.length; ri++) {
    const row = lines[ri];
    for (let ci = 0; ci < row.length; ci++) {
      const ch = row[ci];
      if (ch === " ") continue;
      if (FILL_CHARS.has(ch)) {
        const alpha = ch === "█" ? 255 : ch === "▓" ? 200 : ch === "▒" ? 145 : 80;
        overlayBuf.fill(c(r), c(g), c(b), alpha);
      } else if (ch === "+" || ch === "=") {
        overlayBuf.fill(c(200), c(205), c(215));
      } else if (WALL_CHARS.has(ch)) {
        overlayBuf.fill(c(170), c(185), c(205));
      } else if (ch === "(" || ch === ")") {
        overlayBuf.fill(255, 220, 80);
      } else if (LABEL_CHARS.has(ch)) {
        overlayBuf.fill(255, 255, 255);
      } else {
        overlayBuf.fill(c(180), c(195), c(210));
      }
      overlayBuf.text(ch, ci * CW, ri * CH);
    }
  }
}

function keyPressed() {
  const k = (key || "").toLowerCase();
  if (k === "c") {
    chargingOverride = !isCharging();
  } else if (k === "r") {
    chargingOverride = null;
  }
  resumeDetectorIfNeeded();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

async function startBatteryListeners() {
  const bat = await navigator.getBattery();
  battery = bat;

  bat.addEventListener("chargingchange", () => {
    battery = bat;
    resumeDetectorIfNeeded();
  });
  bat.addEventListener("chargingtimechange", () => {
    battery = bat;
  });
  bat.addEventListener("dischargingtimechange", () => {
    battery = bat;
  });
  bat.addEventListener("levelchange", () => {
    battery = bat;
  });
}
