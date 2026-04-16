const batteryLimit = 3700; // Samsung A7 Lite Batter capacity is 3700mAh
const showBatteryInfo = false;
let battery = {
  level: 0.0,
  charging: false,
  chargingTime: 0,
  dischargingTime: 0,
};

let chargingCount = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
}

function draw() {
  background(220);

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
