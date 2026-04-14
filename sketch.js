let battery = {
  level: 0.0,
  charging: false,
  chargingTime: 0,
  dischargingTime: 0,
};

function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(220);

  text(battery.charging, width / 2, height / 2);
  text(`${battery.chargingTime / 3600} hour(s)`, width / 2, height / 2 - 20);
  text(battery.dischargingTime, width / 2, height / 2 - 30);
  text(battery.level, width / 2, height / 2 - 50);
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

navigator.vibrate(10000);