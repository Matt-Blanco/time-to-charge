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

const pointCount = 200;
const points = [];

let camera;

let xMax;
let yMax;
let zMax;

let cameraX;
let cameraY;
let cameraZ;

let smoothing = 0.05;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  startBatteryListeners();

  cameraX = width - 100;
  cameraY = 0;
  cameraZ = width * 1.5;

  xMax = width;
  yMax = height;
  zMax = width;

  camera = createCamera();
  camera.move(cameraX, cameraY, cameraZ);
  camera.pan(PI / 9);

  stroke(255);
}

function draw() {
  background(0);

  batteryVisualization();
}

function batteryVisualization() {
  console.log(points);

  stroke(255);
  strokeWeight(1);
  points
    .filter((pnt) => pnt.isPresent())
    .forEach((star, indx) => {
      star.update();
    });
  orbitControl();

  if (frameCount % 15 === 0) {
    if (battery.charging) {
      const x = random(-xMax, xMax);
      const y = random(-yMax, yMax);
      const z = random(-zMax, zMax);

      points.push(new Star(x, y, z));

      chargingCount++;
    } else if (!battery.charging && chargingCount > 0) {
      chargingCount--;

      points.pop();
    }
  }

  /*
  textFont("lincoln-electric-regular");
  fill(0, lerp(0, 100, map(chargingCount, 0, 50, 0, 1)));
  textSize(50);
  text("What is a Joule?", width / 2 - 50, 50);
  text(`charge count: ${chargingCount}`, width / 2 - 50, 150);
    */
  if (showBatteryInfo) {
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
}

function startBatteryListeners() {
  navigator.getBattery().then((bat) => {
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
  });
}

class Star {
  constructor(x, y, z) {
    // Random starting angles

    this.theta = random(TWO_PI);
    this.phi = random(PI);

    this.orbitRadius = random(100, xMax * 2);

    this.pos = createVector(x, y, z);
    this.velocity = createVector(
      floor(random(-1, 1)),
      floor(random(-1, 1)),
      floor(random(-1, 1)),
    );

    this.originalVelocity = createVector(
      this.velocity.x,
      this.velocity.y,
      this.velocity.z,
    );

    this.life = 200;
  }

  update() {
    this.theta += 0.01;
    this.phi += 0.005;

    // Save last state
    this.previousPos = createVector(this.pos.x, this.pos.y, this.pos.z);

    // Update position
    this.pos = createVector(
      this.orbitRadius * sin(this.phi) * cos(this.theta),
      this.orbitRadius * sin(this.phi) * sin(this.theta),
      this.orbitRadius * cos(this.phi),
    );

    this.life--;

    this.draw();
  }

  draw() {
    push();
    translate(width / 2, height / 2);
    point(this.pos.x, this.pos.y, this.pos.z);
    pop();
  }

  isPresent() {
    return this.life > 0;
  }
}
