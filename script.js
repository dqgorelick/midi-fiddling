const randRange = (min, max) => {
  return Math.floor(Math.random()*(max-min)) + min;
}

const map = (n, start1, stop1, start2, stop2) => {
  return ((n-start1)/(stop1-start1))*(stop2-start2)+start2;
};


const NOTE_LENGTH = 0.7;
const ANIMATION_TIME = 3
const MOUSE_CONTROL = true
const OUTPUT_AUDIO = false
var px = .2618025751072961
var py = 0.08366013071895424
// SVG bezier path code from: https://medium.com/@francoisromain/smooth-a-svg-path-with-cubic-bezier-curves-e37b49d46c74

const svgPath = (points, command) => {
  // build the d attributes by looping over the points
  const d = points.reduce((acc, point, i, a) => i === 0
    // if first point
    ? `M ${point[0]},${point[1]}`
    // else
    : `${acc} ${command(point, i, a)}`
  , '')
  return d
}

const line = (pointA, pointB) => {
  const lengthX = pointB[0] - pointA[0]
  const lengthY = pointB[1] - pointA[1]
  return {
    length: Math.sqrt(Math.pow(lengthX, 2) + Math.pow(lengthY, 2)),
    angle: Math.atan2(lengthY, lengthX)
  }
}

const lineCommand = point => `L ${point[0]} ${point[1]}`

const controlPoint = (current, previous, next, reverse) => {
  const p = previous || current
  const n = next || current
  // The smoothing ratio
  let smoothing = 1.3
  // if (MOUSE_CONTROL) {
    smoothing = 2 * py;
  // }
  // Properties of the opposed-line
  const o = line(p, n)
  // If is end-control-point, add PI to the angle to go backward
  const angle = o.angle + (reverse ? Math.PI : 0)
  const length = o.length * smoothing
  // The control point position is relative to the current point
  const x = current[0] + Math.cos(angle) * length
  const y = current[1] + Math.sin(angle) * length
  return [x, y]
}

const bezierCommand = (point, i, a) => {
  // start control point
  const [cpsX, cpsY] = controlPoint(a[i - 1], a[i - 2], point)
  // end control point
  const [cpeX, cpeY] = controlPoint(point, a[i - 1], a[i + 1], true)
  return `C ${cpsX},${cpsY} ${cpeX},${cpeY} ${point[0]},${point[1]}`
}

const generatePoints = (num, offsetX) => {
  const scaleX = window.innerHeight / 88
  const scaleY = (window.innerHeight / (num));
  // const scale
  const points = []
  // dir = 1;
  for (let i=0; i<num; i++) {
    const dir = Math.random() < 0.5 ? -1 : 1;
    var offsetFactor = randRange(0, 300)
    // if (MOUSE_CONTROL) {
      offsetFactor = offsetFactor * px;
    // }
    const x = offsetX + dir * 0.20 * (i) * offsetFactor
    const y = window.innerHeight - i * scaleY
    // const x = offsetX
    points.push([x, y])
  }
  points.push([offsetX, -10])
  return points
}

const svg = document.querySelector('.svg')

const createSVGPath = (key, path, animation, id) => {
    let newPath = document.createElementNS("http://www.w3.org/2000/svg","path");
    newPath.setAttributeNS(null, "class", animation);
    newPath.setAttributeNS(null, "id", id);
    newPath.setAttributeNS(null, "d", path);

    const color = keyColors[key]
    const len = newPath.getTotalLength()
    const path_offset = len
    const start = len
    const initial = len
    const segment_length = len
    const end = len*2

    newPath.setAttributeNS(null, 'style',
      `--stroke: ${color};
      --offset: ${path_offset};
      --start: ${start};
      --end: ${end};
      --initial: ${initial};
      --segment_length: ${segment_length}`)

    return newPath
}

const keyEnvelopes = {}
const keyCounters = {}

const addKeyCount = (key) => {
  if (keyCounters.hasOwnProperty(key)) {
    keyCounters[key] += 1
  } else {
    keyCounters[key] = 1;
  }
  return keyCounters[key]
}

const getMidiID = (midi) => {
  return midi + '_' + keyCounters[midi]
}

const startNote = (key, id) => {
  playingNotes = true;
  backgroundHaze(true);
  const steps = window.innerWidth/60
  const points = generatePoints(7,  ((key) - 30) * steps)
  const d = svgPath(points, bezierCommand)
  const path = createSVGPath(key, d, 'animating', id);
  svg.appendChild(path);
}

const endNote = (midi, id) => {
  // const id = getMidiID(midi)
  const path = document.getElementById(id)
  const matrix = getComputedStyle(path).getPropertyValue('stroke-dasharray')
  const dashArrayStart = parseFloat(matrix.split('px')[0], 10)

  const len = path.getTotalLength()
  const color = keyColors[midi]
  const path_offset = len*2
  const start = len
  const initial = len
  const segment_length = dashArrayStart - len
  const end = len + len + segment_length

  path.setAttributeNS(null, 'style',
    `--stroke: ${color};
    --offset: ${path_offset};
    --start: ${start};
    --end: ${end};
    --initial: ${initial};
    --start_midway: ${(start + end)/2};
    --segment_length: ${segment_length}`)
  path.setAttributeNS(null, 'class', 'animatingEnd')
  playingNotes = false
  setTimeout(() => {
    if (!playingNotes) {
      backgroundHaze(false);
    }
    svg.removeChild(path)
  }, 1000 * ANIMATION_TIME)
}

function initMidi() {
  WebMidi.enable(function (err) {

      WebMidi.inputs.forEach(function(input) {
        // 'IAC Driver ableton<>processing'
        // console.log(input)

        var outputAudio = OUTPUT_AUDIO;
        // Listen for a 'note on' message on all channels
        input.addListener('noteon', "all",
          function (e) {
            const midi = e.note.number
            // if (!keysPressed[midi]) {
              // keysPressed[midi] = true
              // console.log(midi)
            playMidi(midi)
          }
        );


      })
  });
}

const keyColors = [];

const setKeyColors = () => {
    var min = 0;
    var max = 88;
    var startingHue = randRange(0, 256)

    for (var i=min; i<max+1; i++) {
        keyColors.push(map(i, min, max, 0, 1000))%256
        // keyColors.push(randRange(0, 256))
    }
}


const backgroundHaze = (on) => {
    // if (on) {
        // console.log('turning on!')
    //     backgroundHue = (backgroundHue + 4)%256
    //     $('body').css('background-color', 'hsla('+ backgroundHue +', 100%, 40%, 0.2)')
    // } else {
    //     console.log('turning off!')
    //     $('body').css('background-color', '#222222')
    // }
}

var playingNotes = false;
var backgroundHue = randRange(0, 256)

const upper = [81,50,87,51,69,82,53,84,54,89,55,85,73,57,79,48,80,219,187,221]
const lower = [90,83,88,68,67,86,71,66,72,78,74,77,188,76,190,186,191]
const keysPressed = {}

const playMidi = (midi) => {
  const id = addKeyCount(midi)

  const noteId = midi + '_' + id
  startNote(midi, noteId)
  startWaveTableNow(midi)
  setTimeout(() => {
    endNote(midi, noteId);
  }, NOTE_LENGTH/(4 * (py*3 + 1)) * 1000)
}

const init = () => {
  document.addEventListener('keydown', function(e) {
      const key = e.which;
      const up = upper.indexOf(key)
      const low = lower.indexOf(key)
      let midi = up + 60
      if (up === -1) {
        midi = low + 48;
      }
      if (up === -1 && low === -1) {
        return
      }
      playMidi(midi)
  });


  document.addEventListener('mousemove', function(e) {
    if (MOUSE_CONTROL) {
      py = 1 - ((e.clientY)/ window.innerHeight);
      px = ((e.clientX)/ window.innerWidth);
    }
  });

  document.addEventListener('click', function(e) {
    playMidi(randRange(30, 90))
    counter++;
    console.log(counter, py, px)
  });

  document.addEventListener('touchend', function(e) {
    playMidi(randRange(30, 90))
    counter++;
    console.log(counter, py, px)
  });

  initMidi();
}

var counter = 0;

StartAudioContext(Tone.context, '.starter-button').then(function(){

    var selectedPreset=_tone_0110_Aspirin_sf2_file;
    var AudioContextFunc = window.AudioContext || window.webkitAudioContext;
    var audioContext = new AudioContextFunc();
    var player=new WebAudioFontPlayer();
    var channelMaster = player.createChannel(audioContext);
    var reverberator = player.createReverberator(audioContext);

    var channelDrums = player.createChannel(audioContext);
    var channelBass = player.createChannel(audioContext);
    var channelDistortion = player.createChannel(audioContext);
    var channelMaster = player.createChannel(audioContext);
    var reverberator = player.createReverberator(audioContext);
    channelDrums.output.connect(channelMaster.input);
    channelBass.output.connect(channelMaster.input);
    channelDistortion.output.connect(channelMaster.input);
    channelMaster.output.connect(reverberator.input);
    reverberator.output.connect(audioContext.destination);
    playCustomAHDSR()
    function playCustomAHDSR() {
            for (var i = 0; i < selectedPreset.zones.length; i++) {
              selectedPreset.zones[i].ahdsr = [{
                  duration: 0,
                  volume: 1
                }, {
                  duration: NOTE_LENGTH/10,
                  volume: 0.9
                }, {
                  duration: NOTE_LENGTH/10,
                  volume: 0.8
                }, {
                  duration: NOTE_LENGTH/10,
                  volume: 0.7
                }, {
                  duration: NOTE_LENGTH/10,
                  volume: 0.6
                }, {
                  duration: NOTE_LENGTH/10,
                  volume: 0.5
                }, {
                  duration: NOTE_LENGTH/10,
                  volume: 0.4
                }, {
                  duration: NOTE_LENGTH/10,
                  volume: 0.3
                }, {
                  duration: NOTE_LENGTH/10,
                  volume: 0.2
                }, {
                  duration: NOTE_LENGTH/10,
                  volume: 0.1
                }, {
                  duration: NOTE_LENGTH/10,
                  volume: 0.05
                }
              ];
            }
          }
    // reverberator.wet.gain.setTargetAtTime(1.5,0,0.0001)
    player.adjustPreset(audioContext,selectedPreset);


    window.playPipe = function(midiNote){
      if (keyEnvelopes[midiNote] !== undefined) {
        stopPipe(midiNote);
      }
      keyEnvelopes[midiNote] = {envelope: player.queueWaveTable(audioContext, audioContext.destination, _tone_0110_Aspirin_sf2_file, 0, midiNote, 999,true)}
    }
    window.stopPipe = function(midiNote){
      console.log(midiNote, keyEnvelopes[midiNote])
      if(keyEnvelopes[midiNote].envelope){
        keyEnvelopes[midiNote].envelope.cancel();
        keyEnvelopes[midiNote].envelope=null;
      }
    }

    window.startWaveTableNow = function(pitch) {
        // var audioBufferSourceNode = player.queueWaveTable(audioContext, audioContext.destination, selectedPreset, audioContext.currentTime + 0, pitch, 0.4);
        // var audioBufferSourceNode = player.queueWaveTable(audioContext, audioContext.destination, selectedPreset, audioContext.currentTime + 0.4, pitch, 0.2);
        // var audioBufferSourceNode = player.queueWaveTable(audioContext, audioContext.destination, selectedPreset, audioContext.currentTime + 0.6, pitch, 0.2);
        // var audioBufferSourceNode = player.queueWaveTable(audioContext, audioContext.destination, selectedPreset, audioContext.currentTime, pitch, NOTE_LENGTH);
        player.queueWaveTable(audioContext, audioContext.destination, selectedPreset, 0, pitch, NOTE_LENGTH);
    }
    document.querySelectorAll('.initialize')[0].classList = ['initialize'];
    setKeyColors();
    init();
});
