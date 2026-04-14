let battery = {
  level: 0.0,
  charging: false,
  chargingTime: 0,
  dischargingTime: 0,
};

let hapticOn = 0;

function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(220);

  text(`charging: ${battery.charging}`, width / 2, height / 2);
  text(`charge time ${battery.chargingTime / 3600} hour(s)`, width / 2, height / 2 - 20);
  text(`discharge time: ${battery.dischargingTime}`, width / 2, height / 2 - 30);
  text(`battery level: ${battery.level}`, width / 2, height / 2 - 50);
  text(`haptic cound: ${hapticOn}`, width / 2, height / 2 - 60);
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

function triggerHaptic() {
  navigator.vibrate(500);
  hapticOn++;;
}

setInterval(triggerHaptic, 1000)
