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
  frontDetector.detect(frontCapture, gotFrontDetections);
}

function gotBackDetections(error, results) {
  if (error) {
    console.error(error);
    return;
  }
  backDetections = results;
  backDetector.detect(backCapture, gotBackDetections);
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  frontGlitch = new Glitch();
  frontGlitch.pixelate(1);

  backGlitch = new Glitch();
  backGlitch.pixelate(1);

  frontCapture = createCapture(videoConstraints("user"), frontVideoReady);
  frontCapture.size(width / 4, height / 4);
  frontCapture.hide();

  if (showBackCapture) {
    backCapture = createCapture(
      videoConstraints("environment"),
      backVideoReady,
    );
    backCapture.size(width, height / 2);
    backCapture.hide();
  }
}

function draw() {
  background(0);

  glitchConnection();
}

function buildGlitch(image, glitch, detections) {
  if (frameCount % 3 === 0) {
    if (!mouseIsPressed) {
      glitch.loadImage(image);
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
    glitch.limitBytes(map(personBounds.height, 0, height, 1, 0));
    glitch.randomBytes(map(personBounds.width, 0, width, 100, 0));
    glitch.buildImage();
  }
}

function glitchConnection() {
  buildGlitch(frontCapture, frontGlitch, frontDetections);

  if (showBackCapture) {
    buildGlitch(backCapture, backGlitch, backDetections);
  }

  image(frontGlitch.image, 0, 0, frontGlitch.width, frontGlitch.height);
  if (showBackCapture) {
    image(backGlitch.image, 0, height / 2, backGlitch.width, backGlitch.height);
  }
}