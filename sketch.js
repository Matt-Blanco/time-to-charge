const batteryLimit = 3700; // Samsung A7 Lite Batter capacity is 3700mAh
const showBatteryInfo = false;
let battery = {
  level: 0.0,
  charging: false,
  chargingTime: 0,
  dischargingTime: 0,
};

let chargingCount = 0;
let frontGlitch;
let backGlitch;

let pointCount = 200;
const points = [];

const formationThreshold = 120;
let batteryTargets = [];

let formationProgress = 0;
let formationTarget = 0;
let lastChargingState = null;

let camera;

let xMax;
let yMax;
let zMax;

let cameraX;
let cameraY;
let cameraZ;

let smoothing = 0.05;

let font;
let runtime;
let energyUsed = 0;
let energyMade = 0;

async function preload() {
  await startBatteryListeners();
  font = loadFont(
    "https://mattblanco.me/itp-nature-of-code/04_oscillators/assets/MonaspaceKrypton-Regular.otf",
  );
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);

  runtime = millis();

  cameraX = width - 100;
  cameraY = 0;
  cameraZ = width * 1.5;

  xMax = width;
  yMax = height;
  zMax = width;

  batteryTargets = buildBatteryTargets();

  pointCount =
    pointCount < batteryTargets.length ? batteryTargets.length : pointCount;

  for (let i = 0; i < pointCount; i++) {
    const x = random(-xMax, xMax);
    const y = random(-yMax, yMax);
    const z = random(-zMax, zMax);
    points.push(new Star(x, y, z, i, 1));
  }

  stroke(252, 182, 32);
}

function buildBatteryTargets() {
  const sampleFactor = 0.1;
  const fontSize = 72;

  const chargePoints = font.textToPoints(
    `Energy Created`,
    -width / 2 + 25,
    60,
    fontSize,
    { sampleFactor },
  );
  const chargeAmount = font.textToPoints(
    `${energyMade.toFixed(2)} Wh`,
    -width / 2 + 25,
    125,
    fontSize,
    { sampleFactor },
  );

  const dischargePoints = font.textToPoints(`Energy Used`, 50, 60, fontSize, {
    sampleFactor,
  });
  const dischargeAmount = font.textToPoints(
    `${energyUsed.toFixed(2)} Wh`,
    50,
    125,
    fontSize,
    { sampleFactor },
  );

  return chargePoints
    .concat(chargeAmount, dischargePoints, dischargeAmount)
    .map((pnt) => createVector(pnt.x, pnt.y, 0));
}

function draw() {
  background(0);
  batteryVisualization();
}

function batteryVisualization() {
  if (showBatteryInfo) {
    textFont(font);
    fill(255);
    textSize(36);
    text(`charging: ${battery.charging}`, width / 2, height / 2);
    text(
      `charge time ${battery.chargingTime / 3600} hour(s)`,
      width / 2,
      height / 2 - 20,
    );
    text(
      `discharge time: ${battery.dischargingTime}`,
      width / 2,
      height / 2 - 30,
    );
    text(`battery level: ${battery.level}`, width / 2, height / 2 - 50);
  }

  runtime = millis() / 1000;
  batteryTargets = buildBatteryTargets();

  while (points.length < batteryTargets.length) {
    const i = points.length;
    const x = random(-xMax, xMax);
    const y = random(-yMax, yMax);
    const z = random(-zMax, zMax);
    points.push(new Star(x, y, z, i, 0));
  }

  for (let i = 0; i < points.length; i++) {
    points[i].target = batteryTargets[i % batteryTargets.length];
  }

  if (battery.charging) {
    const e = 0.12;
    energyMade += e;
    const x = random(-xMax, xMax);
    const y = random(-yMax, yMax);
    const z = random(-zMax, zMax);
    points.push(new Star(x, y, z, -1, 0));
  }

  energyUsed += 1.33 / 3.8; // Estimated 10hr battery life over a 20Wh, 5000mAh battery

  if (
    (lastChargingState !== null && battery.charging !== lastChargingState) ||
    battery.charging
  ) {
    formationTarget = battery.charging ? 1 : 0;
  }

  lastChargingState = battery.charging;

  formationProgress = lerp(formationProgress, formationTarget, 0.02);

  push();
  const date = new Date(null);
  date.setSeconds(runtime); // specify value for SECONDS here
  const result = date.toISOString().slice(11, 19);
  const displayTime = font.textToPoints(
    `${result}`,
    -width / 2 + 475,
    -250,
    96,
    {
      sampleFactor: 0.3,
    },
  );
  displayTime.forEach((pnt) => {
    strokeWeight(0.5)
    point(pnt.x, pnt.y, 1);
  });

  for (let i = 0; i < points.length; i++) {
    points[i].update();
  }
  pop();

  orbitControl();

  if (frameCount % 15 === 0 && battery.charging) {
    chargingCount++;
  }
}

async function startBatteryListeners() {
  bat = await navigator.getBattery();
  battery = bat;

  bat.addEventListener("chargingchange", () => {
    battery = bat;
  });

  bat.addEventListener("chargingtimechange", () => {
    battery = bat;
  });

  bat.addEventListener("dischargingtimechange", () => {
    battery = bat;
  });

  bat.addEventListener("levelChange", () => {
    battery = bat;
  });
}

class Star {
  constructor(x, y, z, index, spawnProgress = 0, useTarget = false) {
    this.theta = random(TWO_PI);
    this.phi = random(PI);

    this.orbitRadius = random(100, xMax * 2);

    this.pos = createVector(x, y, z);

    if (useTarget) {
      this.target =
        batteryTargets.length > 0
          ? batteryTargets[index % batteryTargets.length]
          : createVector(0, 0, 0);
    } else {
      this.target = createVector(0, 0, 0);
    }

    this.thetaSpeed = random(0.005, 0.02);
    this.phiSpeed = random(0.003, 0.01);

    this.spawnProgress = spawnProgress;
    this.spawnRate = 0.015;
  }

  update() {
    this.theta += this.thetaSpeed;
    this.phi += this.phiSpeed;

    if (this.spawnProgress < 1) {
      this.spawnProgress = min(1, this.spawnProgress + this.spawnRate);
    }

    const sinPhi = sin(this.phi);
    const orbitX = this.orbitRadius * sinPhi * cos(this.theta);
    const orbitY = this.orbitRadius * sinPhi * sin(this.theta);
    const orbitZ = this.orbitRadius * cos(this.phi);

    const progress = constrain(formationProgress * this.spawnProgress, 0, 1);
    const eased = progress * progress * (3 - 2 * progress);

    const settledX = this.target.x;
    const settledY = this.target.y;
    const settledZ = this.target.z;

    this.pos.x = orbitX + (settledX - orbitX) * eased;
    this.pos.y = orbitY + (settledY - orbitY) * eased;
    this.pos.z = orbitZ + (settledZ - orbitZ) * eased;

    this.draw(eased);
  }

  draw(progress) {
    const alpha = 160 + (255 - 160) * progress;
    stroke(252, 182, 32, alpha);
    strokeWeight(0.75);
    point(this.pos.x, this.pos.y, this.pos.z);
  }

  isPresent() {
    return true;
  }
}
