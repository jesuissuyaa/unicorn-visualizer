var soundInstance;
var stage;
var angle = 0;
var particles;
var random;
var objectPool = [];
var src = "vexento_pixel-party.mp3";

// global constants
var CANVAS_COLOR = "#C4F5FC"; // edit CSS to change canvas bg
var MAUVE = "#E2A0FF";
var CANARY = "#FFF9A5";
var AERO_BLUE = "#B7FFD8";
var BUBBLE_GUM = "#FFC1CF";

var params = {
  // volume: 0.5,
  volume: 0.1,
  pan: 0
};

window.addEventListener("load", init);
window.addEventListener("load", handleResize); //ロード時リサイズをかける

function init() {
  stage = new createjs.Stage("myCanvas");

  // controls: volume, pan
  var gui = new dat.GUI();
  gui.add(params, "volume", 0, 1).step(0.1);
  gui.add(params, "pan", -1, 1).step(0.1);

  window.addEventListener("resize", function() {
    handleResize();
  });

  createMessage();
  // load file
  createjs.Sound.on("fileload", function() {
    handleLoad(128, 0.8); //(fftSize, smoothingTimeConstant)
  });
  createjs.Sound.registerSound(src);

  stage.update();
}

// loading message on intiial page load
function createMessage() {
  messageField = new createjs.Text("Loading...", "14px Arial", "#FFFFFF");
  messageField.textAlign = "center";
  messageField.x = window.innerWidth / 2;
  messageField.y = window.innerHeight / 2;
  stage.addChild(messageField);
}

function handleLoad(fftSize, smoothingTimeConstant) {
  var context = createjs.Sound.activePlugin.context;

  analyserNode = context.createAnalyser();
  analyserNode.fftSize = fftSize;
  analyserNode.smoothingTimeConstant = smoothingTimeConstant;
  analyserNode.connect(context.destination);

  var dynamicsNode = createjs.Sound.activePlugin.dynamicsCompressorNode;
  dynamicsNode.disconnect();
  dynamicsNode.connect(analyserNode);

  var freqFloatData = new Float32Array(analyserNode.frequencyBinCount);
  var freqByteData = new Uint8Array(analyserNode.frequencyBinCount);
  var timeByteData = new Uint8Array(analyserNode.frequencyBinCount);

  if (createjs.Touch.enable(stage)) {
    messageField.text = "Touch to start";
    stage.addEventListener("stagemousedown", function() {
      startPlayback(freqFloatData, freqByteData, timeByteData, analyserNode);
    });
    stage.update();
  } else {
    messageField.text = "click to start";
    stage.addEventListener("stagemousedown", function() {
      startPlayback(freqFloatData, freqByteData, timeByteData, analyserNode);
    });
    stage.update();
  }
}

function startPlayback(
  freqFloatData,
  freqByteData,
  timeByteData,
  analyserNode
) {
  stage.removeEventListener("stagemousedown", function() {
    startPlayback(freqFloatData, freqByteData, timeByteData, analyserNode);
  });
  if (soundInstance) {
    return;
  }
  stage.removeChild(messageField);

  // DEBUG
  var props = new createjs.PlayPropsConfig().set({
    loop: -1
    // offset: 45 * 1000 // offset of start time
  });
  soundInstance = createjs.Sound.play(src, props);

  /* draw shapes */
  var dbCircle = new soundCircle();
  // var rays = new rayContainer();
  var bars = new barContainer(timeByteData);

  /* add shapes to canvas */
  stage.addChild(dbCircle);
  // stage.addChild(rays);
  stage.addChild(bars);

  createjs.Ticker.addEventListener("tick", tick);
  createjs.Ticker.timingMode = createjs.Ticker.RAF;

  // DEBUG
  var flag = true;
  function tick() {
    // set volume and pan
    soundInstance.volume = params.volume;
    soundInstance.pan = params.pan;

    // store audio analysis
    analyserNode.getFloatFrequencyData(freqFloatData); // dBs
    analyserNode.getByteFrequencyData(freqByteData); // frequency data
    analyserNode.getByteTimeDomainData(timeByteData); // waveform

    // get sum
    var freqSum = freqByteData.reduce(function(acc, crr) {
      return acc + crr;
    });
    var timeSum = freqByteData.reduce(function(acc, crr) {
      return acc + crr;
    });

    var dbSum = freqByteData.reduce(function(acc, crr) {
      return acc + crr;
    });

    // DEBUG
    if (flag) {
      console.log(freqFloatData, freqByteData, timeByteData);
      flag = !flag;
    }

    /* generate particles */
    if (freqSum < 8000) {
      var particles = new Particle(
        getRandom(10, 30),
        "#ffffff",
        getRandom(10, 40),
        30,
        100,
        1
      );
      stage.addChild(particles);
    } else if (freqSum < 10000) {
      var particles = new Particle(
        getRandom(10, 30),
        "#ffffff",
        getRandom(10, 40),
        40,
        100,
        2
      );
      stage.addChild(particles);
    } else {
      var particles = new Particle(
        getRandom(10, 30),
        "#ffffff",
        getRandom(10, 40),
        80,
        100,
        3
      );
      stage.addChild(particles);
    }
    /* update shapes */
    dbCircle.update(dbSum);
    bars.update(timeByteData);
    // rays.update(dbSum);
    /* update stage */
    stage.update();
  }
}

/* classes for custom shapes */
class soundCircle extends createjs.Container {
  constructor() {
    super();
    this.size = 0;
    this.soundCircle = new createjs.Shape();
    this.addChild(this.soundCircle);
  }
  update(dbSum) {
    this.size = 0;
    this.soundCircle.graphics
      .clear()
      .beginFill(CANARY)
      .drawCircle(
        stage.canvas.width / 2,
        stage.canvas.height,
        stage.canvas.width / 20 + dbSum / 30
      );
  }
}

class barContainer extends createjs.Container {
  constructor(timeByteData) {
    super();
    this.barList = [];
    this.count = 0;
    this.direction = -1;
    this.height = 1;
    for (var i = 0; i < timeByteData.length; i++) {
      var bar = new createjs.Shape();
      this.addChild(bar);
      this.barList[i] = bar;
    }
  }

  update(timeByteData) {
    // caluclate total value
    var avg =
      timeByteData.reduce(function(acc, crr) {
        return acc + crr;
      }) / timeByteData.length;
    this.y = stage.canvas.height;
    for (var i = 0; i < timeByteData.length; i++) {
      var bar = this.barList[i];
      bar.graphics
        .clear()
        .setStrokeStyle(40)
        // TODO
        .beginStroke(avg < 130 ? AERO_BLUE : MAUVE)
        .moveTo((i * stage.canvas.width) / timeByteData.length + 10, 0)
        .lineTo(
          (i * stage.canvas.width) / timeByteData.length + 10,
          timeByteData[i] * this.height * this.direction
        );
    }
  }
}

class Particle extends createjs.Container {
  constructor(size, color, vx, vy, life, num) {
    super();
    this.particleList = [];
    this.size = size;
    this.color = color;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.gravity = 1;

    for (var i = 0; i < num; i++) {
      var particle = fromPool();
      particle.graphics.beginFill(this.color).drawCircle(0, 0, this.size);
      particle.cache(-this.size, -this.size, this.size * 2, this.size * 2);
      particle.x = stage.canvas.width * Math.random();
      particle.y = stage.canvas.height;

      this.addChild(particle);
      particle.vx = this.vx * (Math.random() - 0.5);
      particle.vy = this.vy * (Math.random() - 0.5);
      particle.life = this.life;
      particle.rotation = Math.random() * 360;
      this.particleList.push(particle);
    }
    this.on("tick", this.update, this);
  }
  update() {
    for (var i = 0; i < this.particleList.length; i++) {
      var particle = this.particleList[i];
      particle.vy += 1;
      particle.vx *= this.gravity;
      particle.vy *= this.gravity;
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.rotation += 2;
      particle.life -= 1;
      particle.alpha = particle.life / 100;

      if (particle.life <= 0) {
        toPool(this.particleList[i]);
        stage.removeChild(this.particleList[i]);
        this.particleList.splice(i, 1);
        i -= 1;
      }

      this.addChild(particle);
    }
  }
}

/*
class rayContainer extends createjs.Container {
  constructor() {
    super();
    this.rayList = [];
    this.count = 0;
    this.numRays = 6; // # of rays around sun
    this.rotUnit = 180 / this.numRays; // unit of rotation
    for (var i = 0; i < this.numRays; i++) {
      var ray = new createjs.Shape();
      this.addChild(ray);
      this.rayList[i] = ray;
    }
  }
  update(dbSum) {
    // this.y = stage.canvas.width / 20 + dbSum / 30 + 1;
    this.y = 200;
    for (var i = 0; i < this.rayList.length; i++) {
      var ray = this.rayList[i];
      // center of rotation
      ray.regX = 0;
      ray.regY = 0;
      ray.rotation = this.rotUnit * -2;
      ray.graphics
        .clear()
        .beginFill(CANARY)
        .drawRect(i + 100, this.y, 20, 50);
    }
  }
}
*/

function handleResize() {
  var w = window.innerWidth;
  var h = window.innerHeight;
  stage.canvas.width = w;
  stage.canvas.height = h;
  stage.update();
}

function toPool(particle) {
  objectPool.unshift(particle);
}

function fromPool() {
  if (objectPool.length === 0) {
    return new createjs.Shape();
  } else {
    return objectPool.pop();
  }
}

function getRandom(min, max) {
  return Math.random() * (max - min) + min;
}
