const batteryLimit = 3700; // Samsung A7 Lite Batter capacity is 3700mAh
const showBatteryInfo = false;
let battery = {
  level: 0.0,
  charging: false,
  chargingTime: 0,
  dischargingTime: 0,
};

let chargingCount = 0;
let glitch;
let frontCapture;
let backCapture;
let showBackCapture = true;

let detector;
let detections = [];

function videoReady() {
  // Models available are 'cocossd', 'yolo'
  detector = ml5.objectDetector("cocossd", modelReady);
}

// Use `exact` only on devices likely to have a rear camera.
// On laptops/desktops, `exact: "environment"` throws OverconstrainedError;
// a plain string acts as a preference and falls back to the available camera.
function videoConstraints(preferred) {
  const ua = navigator.userAgent;
  const isMobileOrTablet =
    /Mobi|Android|iPhone|iPad|iPod|Tablet/i.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return {
    video: {
      facingMode: isMobileOrTablet ? { exact: preferred } : preferred,
    },
  };
}

function modelReady() {
  detector.detect(frontCapture, gotDetections);
}

function gotDetections(error, results) {
  if (error) {
    console.error(error);
    return;
  }
  detections = results;
  detector.detect(frontCapture, gotDetections);
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  glitch = new Glitch();
  glitch.pixelate(1);

  frontCapture = createCapture(videoConstraints("user"), videoReady);
  frontCapture.size(width / 2, height / 2);
  frontCapture.hide();

  if (showBackCapture) {
    backCapture = createCapture(videoConstraints("environment"));
    backCapture.size(width / 2, height / 2);
    backCapture.hide();
  }
}

function draw() {
  background(0);

  glitchConnection();
}

function glitchConnection() {
  if (frameCount % 3 === 0) {
    if (!mouseIsPressed) {
      glitch.loadImage(frontCapture);
    }

    const personBounds = detections
      .filter((d) => d.label.toLowerCase() === "person")
      .reduce(
        (person, bounds) => {
          if (person.width > bounds.width || person.height > bounds.height) {
            return { width: person.width, height: person.height };
          } else {
            return bounds;
          }
        },
        { height: 0, width: 0 },
      );

    // map mouseX to # of randomBytes() + mouseY to limitBytes()
    glitch.limitBytes(map(personBounds.height, 0, height, 0, 1));
    glitch.randomBytes(map(personBounds.width, 0, width, 0, 100));
    glitch.buildImage();
  }

  image(glitch.image, 0, 0, glitch.width, glitch.height);
  if (showBackCapture) {
    image(backCapture, 0, height / 2, width / 2, height / 2);
  }
}

function batteryVisualization() {
  if (frameCount % 15 === 0) {
    if (battery.charging) {
      chargingCount++;
    } else if (!battery.charging && chargingCount > 0) {
      chargingCount--;
    }
  }

  textFont("lincoln-electric-regular");
  fill(0, lerp(0, 100, map(chargingCount, 0, 50, 0, 1)));
  textSize(50);
  text("What is a Joule?", width / 2 - 50, 50);
  text(`charge count: ${chargingCount}`, width / 2 - 50, 150);

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
