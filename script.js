(function () {

  const randRange = (min, max) => {
    return Math.floor(Math.random()*(max-min)) + min;
  }

  const map = (n, start1, stop1, start2, stop2) => {
    return ((n-start1)/(stop1-start1))*(stop2-start2)+start2;
  };

  const mapVelocity = (velocity) => {
    const MIN_STROKE_WIDTH = 20;
    const MAX_STROKE_WIDTH = 60
    return map(velocity, 0, 1, MIN_STROKE_WIDTH, MAX_STROKE_WIDTH);
  }

  var FIXED_LENGTH = false;
  var ARP = false; 

  const urlParams = new URLSearchParams(window.location.search);
  const voice = urlParams.get('voice');
  if (!!voice) {
    FIXED_LENGTH = false;
  }

  var MOUSE_CONTROL = false;

  const NOTE_LENGTH = 0.7;
  const ANIMATION_TIME = 3
  const OUTPUT_AUDIO = true

  var paramSet = 1
  var params = [
  {
    x: 0.05227467811158796,
    y: 0.05744431418522861
  }, {
    x: .2618025751072961,
    y: 0.08366013071895424
  }, {
    x: 0.5507868383404864,
    y: 0.4856711915535445
  }, {
    x: 0.821173104434907,
    y: 0.9215686274509803
  }
  ]

  var px = params[paramSet].x
  var py = params[paramSet].y
  // SVG bezier path code from: https://medium.com/@francoisromain/smooth-a-svg-path-with-cubic-bezier-curves-e37b49d46c74

  const svgPath = (points, command) => {
    const d = points.reduce((acc, point, i, a) => i === 0
      ? `M ${point[0]},${point[1]}`
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
    const smoothing = 2 * py;
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

  const createSVGPath = (key, path, animation, id, velocity) => {
      let newPath = document.createElementNS("http://www.w3.org/2000/svg","path");
      newPath.setAttributeNS(null, "class", animation);
      newPath.setAttributeNS(null, "id", id);
      newPath.setAttributeNS(null, "d", path);
      newPath.setAttributeNS(null, "data-velocity", velocity);

      const color = keyColors[key]
      const len = newPath.getTotalLength()
      const path_offset = len
      const start = len
      const initial = len
      const segment_length = len
      const end = len*2

      newPath.setAttributeNS(null, 'style',
        `--stroke: ${color};
        --stroke-width: ${mapVelocity(velocity)};
        --offset: ${path_offset};
        --start: ${start};
        --end: ${end};
        --initial: ${initial};
        --segment_length: ${segment_length}`)

      return newPath
  }

  const keyCounters = {}

  const addKeyCount = (key) => {
    if (keyCounters.hasOwnProperty(key)) {
      keyCounters[key] += 1
    } else {
      keyCounters[key] = 1;
    }
    return keyCounters[key]
  }

  const startNoteAnimation = (midi, id, velocity) => {
    // TODO: figure out how to get rid of lines drawn by notes played by two inputs (ie: midi1, midi2 or midi1 and keyboard)
    // const lastPath = document.getElementById(midi + '_' + (id-1))
    // if (lastPath !== null) {
    //   endNoteAnimation(midi, id-1)
    // }
    const steps = window.innerWidth/60
    const points = generatePoints(7,  ((midi) - 25) * steps)
    const d = svgPath(points, bezierCommand)
    const path = createSVGPath(midi, d, 'animating', midi + '_' + id, velocity);
    svg.appendChild(path);
  }

  const endNoteAnimation = (midi, id, velocity) => {
    const path = document.getElementById(midi + '_' + id)
    if (!path) {
      return
    }
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
      --stroke-width: ${mapVelocity(path.dataset.velocity)};
      --offset: ${path_offset};
      --start: ${start};
      --end: ${end};
      --initial: ${initial};
      --start_midway: ${(start + end)/2};
      --segment_length: ${segment_length}`)
    path.setAttributeNS(null, 'class', 'animatingEnd')

    setTimeout(() => {
      if (!path) {
        svg.removeChild(path)
      }
    }, 1000 * ANIMATION_TIME)
  }

  const keyColors = [];

  const setKeyColors = () => {
      var min = 0;
      var max = 160;
      var startingHue = randRange(0, 256)

      for (var i=min; i<max+1; i++) {
          keyColors.push(map(i, startingHue + min, startingHue + max, 0, 1000))%256
      }
  }


  const upper = [81,50,87,51,69,82,53,84,54,89,55,85,73,57,79,48,80,219,187,221]
  const lower = [90,83,88,68,67,86,71,66,72,78,74,77,188,76,190,186,191]
  const keysPressed = {}

  const playFixedLengthMidi = (midi, velocity) => {
    const id = addKeyCount(midi)
    startNoteAnimation(midi, id, velocity)
    if (OUTPUT_AUDIO) {
      startWaveTableNow(midi, velocity)
    }
    setTimeout(() => {
      endNoteAnimation(midi, id, velocity);
    }, NOTE_LENGTH/(4 * (py*3 + 1)) * 1000)
  }

  const keyEnvelopes = {}

  const startMidi = (midiNote, velocity) => {
    if (keyEnvelopes[midiNote] !== undefined) {
      endMidi(midiNote)
    }
    keyEnvelopes[midiNote] = {
      envelope: player.queueWaveTable(audioContext, audioContext.destination, selectedPreset, audioContext.currentTime + 0.02, midiNote, 999, velocity),
    }
  }

  const endMidi = (midiNote) => {
    if (!!keyEnvelopes[midiNote]) {
      if (keyEnvelopes[midiNote].envelope) {
        keyEnvelopes[midiNote].envelope.cancel();
        keyEnvelopes[midiNote].envelope=null;
      }
    }
  }

  const init = () => {
    
    const modifierKeys = [91, 18, 16, 17];

    document.addEventListener('keydown', function(e) {
      const key = e.which;
      const up = upper.indexOf(key)
      const low = lower.indexOf(key)
      
      if (key === 32) {
        toggleMouseControl()
      }
      if (modifierKeys.indexOf(key) !== -1) {
        keysPressed[key] = true
      }
      for (let i=0; i<modifierKeys.length; i++) {
        if (!!keysPressed[modifierKeys[i]]) {
          console.log('modifier key pressed')
          return   
        }        
      }
      
      if (FIXED_LENGTH) {
        let midi = up + 60
        if (!FIXED_LENGTH) {
          midi = up + 48
        }
        if (up === -1) {
          midi = low + 48;
          if (!FIXED_LENGTH) {
            midi = low + 36
          }
        }
        if (up === -1 && low === -1) {
          return
        }
        playFixedLengthMidi(midi, 0.7)
      } else {
        if (up !== -1 && !keysPressed[key]) {
            var midi = up + 60
            if (!FIXED_LENGTH) {
              midi = up + 48
            }
            keysPressed[key] = true
            // console.log(midi)
            const id = addKeyCount(midi)
            startMidi(midi)
            startNoteAnimation(midi, id, 1)
        }
        if (low !== -1 && !keysPressed[key]) {
            var midi = low + 48
            if (!FIXED_LENGTH) {
              midi = low + 36
            }
            keysPressed[key] = true
            // console.log(midi)
            const id = addKeyCount(midi)
            startMidi(midi, 0.9)
            startNoteAnimation(midi, id, 1)
        }
      }
    });

    document.addEventListener('keyup', function(e) {
        const key = e.which;
        if (modifierKeys.indexOf(key) !== -1) {
          console.log('modifier key off');
          keysPressed[key] = false
        }
        const up = upper.indexOf(key)
        const low = lower.indexOf(key)
        if (up !== -1) {
            var midi = up + 60
            if (!FIXED_LENGTH) {
              midi = up + 48
            }
            keysPressed[key] = false
            if (!FIXED_LENGTH) {
      
              endMidi(midi)
              const id = keyCounters[midi]
              endNoteAnimation(midi, id, 1)
            }
        }
        if (low !== -1) {
            var midi = low + 48
            if (!FIXED_LENGTH) {
              midi = low + 36
            }
            keysPressed[key] = false
            if (!FIXED_LENGTH) {
              endMidi(midi)
              const id = keyCounters[midi]
              endNoteAnimation(midi, id, 1)
            }
        }
    });

    document.addEventListener('mousemove', function(e) {
      if (MOUSE_CONTROL) {
        py = 1 - ((e.clientY)/ window.innerHeight);
        px = ((e.clientX)/ window.innerWidth);
      }
    });
    
    var instructionsWrapper = document.querySelectorAll('.instructions-wrapper')[0];
    instructionsWrapper.addEventListener('click', function(e) {
      
      instructionsWrapper.classList.add('inactive');
    });
  
    var modeButtons = document.querySelectorAll('.mode-button')
    modeButtons.forEach((mode) => {
       mode.addEventListener('click', (e) => {
         var id = e.target.id;
         console.log(e.target.id)
         $('.mode-button').removeClass('active')
         document.querySelectorAll(`#${id}`)[0].classList.add('active');
         if (id === 'vox') {
            selectedPreset = _tone_0530_Aspirin_sf2_file; // ooos
            FIXED_LENGTH = false;
         } else if (id === 'vibes') {
            selectedPreset = _tone_0110_FluidR3_GM_sf2_file; // vibes
            FIXED_LENGTH = true;  
         } else if (id === 'organ') {
            selectedPreset=_tone_0161_SoundBlasterOld_sf2; // organ     
            FIXED_LENGTH = false;
         }
       });  
    })
    
    var mouseControlButton = document.querySelectorAll('.mouse-mode-button')[0]
    
    const toggleMouseControl = () => {
      if (MOUSE_CONTROL) {
        mouseControlButton.classList.remove('active')
        MOUSE_CONTROL = false;
      } else {
        mouseControlButton.classList.add('active')
        MOUSE_CONTROL = true;
      }
      console.log(MOUSE_CONTROL)
    }
    
    mouseControlButton.addEventListener('click', (e) => {
      console.log('clicked')
      toggleMouseControl();
      
    });
    // document.addEventListener('click', function(e) {
    //   playFixedLengthMidi(randRange(30, 90), 0.7)
    //   if (!MOUSE_CONTROL) {
    //     paramSet = (paramSet + 1) % params.length
    //     console.log('paramSet:', paramSet)
    //     px = params[paramSet].x
    //     py = params[paramSet].y
    //   }
    // });
  

    
    document.addEventListener('touchend', function(e) {
      playFixedLengthMidi(randRange(30, 90), 0.7)
    });

    var notesPressed = [];

    var notePressedIndex = 0;
    var lastNotePressedLength = 0;

    setInterval(() => {
      if (lastNotePressedLength !== notesPressed.length) {
        notePressedIndex = 0;
      }
      if (notesPressed.length !== 0) {
        playFixedLengthMidi(notesPressed[notePressedIndex], 0.7)
      }
      notePressedIndex++
      if (notePressedIndex > notesPressed.length-1) {
        notePressedIndex = 0
      }
      lastNotePressedLength = notesPressed.length
    }, 200)

    WebMidi.enable(function (err) {
      WebMidi.inputs.forEach(function(input) {
        // 'IAC Driver ableton<>processing'
        input.addListener('noteon', "all", (e) => {
            const midi = e.note.number
            if (ARP) {
              notesPressed.push(midi)
              console.log(notesPressed)
            } else {
              if (FIXED_LENGTH) {
                playFixedLengthMidi(midi, e.velocity)
              } else {
                const id = addKeyCount(midi)
                startNoteAnimation(midi, id, e.velocity)
                if (OUTPUT_AUDIO) {
                  startMidi(midi, e.velocity)
                }
              }
            }
          }
        );

        input.addListener('noteoff', "all", (e) => {
            const midi = e.note.number
            if (ARP) {
              notesPressed.splice(notesPressed.indexOf(midi), 1)
              console.log(notesPressed)
            } else {
              if (!FIXED_LENGTH) {
                const midi = e.note.number
                if (OUTPUT_AUDIO) {
                  endMidi(midi)
                }
                const id = keyCounters[midi]
                endNoteAnimation(midi, id, e.velocity)
              }
            }
          }
        );

      })
    });
  }

  var selectedPreset, audioContext, player;

  StartAudioContext(Tone.context, '.starter-button').then(function(){

      // selectedPreset = _tone_0110_Aspirin_sf2_file; // vibes
      selectedPreset = _tone_0110_FluidR3_GM_sf2_file;
      if (!FIXED_LENGTH) {
        // selectedPreset = _tone_0530_Chaos_sf2_file; // ooos
        selectedPreset = _tone_0530_Aspirin_sf2_file; // ooos
      }
      // selectedPreset=_tone_0161_SoundBlasterOld_sf2; // organ
      var AudioContextFunc = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioContextFunc();
      player = new WebAudioFontPlayer();

      if (FIXED_LENGTH) {
        playFixedAHDSR()
      } else {
        playAHDSR()
      }
      function playAHDSR() {
        for (var i = 0; i < selectedPreset.zones.length; i++) {
          selectedPreset.zones[i].ahdsr = [{
              duration: 0,
              volume: 0.8
            }, {
              duration: NOTE_LENGTH/5,
              volume: 0.7
            }, {
              duration: NOTE_LENGTH/5,
              volume: 0.6
            }, {
              duration: NOTE_LENGTH/5,
              volume: 0.4
            }, {
              duration: NOTE_LENGTH/5,
              volume: 0.3
            }, {
              duration: NOTE_LENGTH/5,
              volume: 0.2
            }
          ];
        }
      }
      function playFixedAHDSR() {
        for (var i = 0; i < selectedPreset.zones.length; i++) {
          selectedPreset.zones[i].ahdsr = [{
              duration: 0,
              volume: 1
            }, {
              duration: NOTE_LENGTH/10,
              volume: 0.9
            }, {
              duration: NOTE_LENGTH/10,
              volume: 0.9
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
              volume: 0.6
            }, {
              duration: NOTE_LENGTH/10,
              volume: 0.4
            }, {
              duration: NOTE_LENGTH/10,
              volume: 0.3
            }, {
              duration: NOTE_LENGTH/10,
              volume: 0.2
            }
          ];
        }
      }
      player.adjustPreset(audioContext,selectedPreset);

      window.startWaveTableNow = function(pitch, velocity) {
          player.queueWaveTable(audioContext, audioContext.destination, selectedPreset, audioContext.currentTime + 0.02, pitch, NOTE_LENGTH, velocity);
      }
      document.querySelectorAll('.initialize')[0].classList = ['initialize'];
      setKeyColors();
      init();
  });

})()
