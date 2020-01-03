var soundInstance;
var stage;
var angle = 0;
var particles;
var random;
var objectPool = [];
// var src = "https://dl.dropbox.com/s/ytlerzw98ar2jm7/chiptune3%20-%202018_09_02%208.44.m4a?dl=0";
var src = "vexento_pixel-party.mp3";

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

  soundInstance = createjs.Sound.play(src, { loop: -1 });

  var freqByteBar = new lineBar(freqByteData);
  stage.addChild(freqByteBar);

  var freqByteCircle = new soundCircle(freqFloatData);
  stage.addChild(freqByteCircle);

  createjs.Ticker.addEventListener("tick", tick);
  createjs.Ticker.timingMode = createjs.Ticker.RAF;
  function tick() {
    var freqByteDataSize = 0;
    for (var i = 0; i < freqByteData.length; i++) {
      freqByteDataSize += freqByteData[i];
    }

    if (freqByteDataSize < 8000) {
      var particles = new Particle(
        getRandom(10, 30),
        "#ffffff",
        getRandom(10, 40),
        50,
        100,
        1
      );
      stage.addChild(particles);
    } else {
      var particles = new Particle(
        getRandom(20, 40),
        "#ff2546",
        getRandom(12, 20),
        50,
        100,
        1
      );
      stage.addChild(particles);
    }

    if (freqByteDataSize > 10000) {
      var particles2 = new Particle(
        getRandom(100, 120),
        "#ff2546",
        getRandom(4, 30),
        100,
        100,
        1
      );
      stage.addChild(particles2);
    }

    if (freqByteDataSize > 10000 && freqByteDataSize < 12000) {
      var particles2 = new Particle(
        getRandom(10, 20),
        "#b3ff25",
        getRandom(5, 80),
        50,
        100,
        5
      );
      stage.addChild(particles2);
    } else if (freqByteDataSize > 12000) {
      var particles2 = new Particle(
        getRandom(40, 80),
        "#b3ff25",
        getRandom(5, 60),
        100,
        100,
        2
      );
      stage.addChild(particles2);
    }

    freqByteBar.update(freqByteData, -1, 2);
    freqByteCircle.update(timeByteData, freqByteDataSize);

    soundInstance.volume = params.volume;
    soundInstance.pan = params.pan;

    analyserNode.getFloatFrequencyData(freqFloatData); // this gives us the dBs
    analyserNode.getByteFrequencyData(freqByteData); // this gives us the frequency
    analyserNode.getByteTimeDomainData(timeByteData); // this gives us the waveform

    stage.update();
  }
}

class soundCircle extends createjs.Container {
  constructor() {
    super();
    this.size = 0;
    this.soundCircle = new createjs.Shape();
    this.addChild(this.soundCircle);
  }
  update(data, freqByteDataSize) {
    this.size = 0;
    this.soundCircle.graphics
      .clear()
      .setStrokeStyle(100)
      .beginStroke("#fbd8d8")
      .drawCircle(
        stage.canvas.width / 2,
        stage.canvas.height,
        stage.canvas.width / 10 + freqByteDataSize / 20
      );
  }
}

class lineBar extends createjs.Container {
  constructor(timeByteData) {
    super();
    this.lineList = [];
    this.count = 0;
    for (var i = 0; i < timeByteData.length; i++) {
      var line = new createjs.Shape();
      this.addChild(line);
      this.lineList[i] = line;
    }
  }
  update(timeByteData, direction, height) {
    this.y = stage.canvas.height;
    for (var i = 0; i < timeByteData.length; i++) {
      this.lineList[i].graphics
        .clear()
        .setStrokeStyle(40)
        .beginStroke("#ff6565")
        .moveTo((i * stage.canvas.width) / timeByteData.length + 10, 0)
        .lineTo(
          (i * stage.canvas.width) / timeByteData.length + 10,
          timeByteData[i] * height * direction
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
      particle.graphics
        .beginFill(this.color)
        .drawRect(0, 0, this.size, this.size);
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
