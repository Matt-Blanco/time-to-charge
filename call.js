let frontGlitch;
let backGlitch;
let frontCapture;
let backCapture;
let showBackCapture = false;

let frontDetector;
let backDetector;
let frontDetections = [];
let backDetections = [];

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

const detectIntervalMs = 300;

function frontVideoReady() {
  // Models available are 'cocossd', 'yolo'
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
  setTimeout(
    () => frontDetector.detect(frontCapture, gotFrontDetections),
    detectIntervalMs,
  );
}

function gotBackDetections(error, results) {
  if (error) {
    console.error(error);
    return;
  }
  backDetections = results;
  setTimeout(
    () => backDetector.detect(backCapture, gotBackDetections),
    detectIntervalMs,
  );
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  frontGlitch = new Glitch();
  frontGlitch.pixelate(1);

  backGlitch = new Glitch();
  backGlitch.pixelate(1);

  frontCapture = createCapture(videoConstraints("environment"), frontVideoReady);
  frontCapture.size(width / 4, height / 4);
  frontCapture.hide();

  if (showBackCapture) {
    backCapture = createCapture(
      videoConstraints("user"),
      backVideoReady,
    );
    backCapture.size(width / 4, height / 8);
    backCapture.hide();
  }
}

function draw() {
  background(0);

  glitchConnection();
}

function buildGlitch(capture, glitch, detections) {
  if (frameCount % 12 !== 0) return;

  const people = detections.filter((d) => d.label.toLowerCase() === "person");

  glitch.bounds = people;

  if (people.length === 0) return;

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
    const sxRatio = b.x / capture.width;
    const syRatio = b.y / capture.height;
    const swRatio = b.width / capture.width;
    const shRatio = b.height / capture.height;

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

function glitchConnection() {
  buildGlitch(frontCapture, frontGlitch, frontDetections);

  if (showBackCapture) {
    buildGlitch(backCapture, backGlitch, backDetections);
  }

  image(frontCapture, 0, 0, width, height);
  drawGlitchAroundBounds(frontCapture, frontGlitch, 0, 0, width, height);
  if (showBackCapture) {
    drawGlitchAroundBounds(
      backCapture,
      backGlitch,
      0,
      height / 2,
      width,
      height / 2,
    );
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight)
}