
const randRange = (min, max) => {
  return Math.floor(Math.random()*(max-min)) + min;
}

const map = (n, start1, stop1, start2, stop2) => {
  return ((n-start1)/(stop1-start1))*(stop2-start2)+start2;
};


// code from: https://medium.com/@francoisromain/smooth-a-svg-path-with-cubic-bezier-curves-e37b49d46c74

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

// Position of a control point
// I:  - current (array) [x, y]: current point coordinates
//     - previous (array) [x, y]: previous point coordinates
//     - next (array) [x, y]: next point coordinates
//     - reverse (boolean, optional): sets the direction
// O:  - (array) [x,y]: a tuple of coordinates

const controlPoint = (current, previous, next, reverse) => {
  // When 'current' is the first or last point of the array
  // 'previous' or 'next' don't exist.
  // Replace with 'current'
  const p = previous || current
  const n = next || current
  // The smoothing ratio
  const smoothing = 0.25
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

// Create the bezier curve command
// I:  - point (array) [x,y]: current point coordinates
//     - i (integer): index of 'point' in the array 'a'
//     - a (array): complete array of points coordinates
// O:  - (string) 'C x2,y2 x1,y1 x,y': SVG cubic bezier C command
const bezierCommand = (point, i, a) => {
  // start control point
  const [cpsX, cpsY] = controlPoint(a[i - 1], a[i - 2], point)
  // end control point
  const [cpeX, cpeY] = controlPoint(point, a[i - 1], a[i + 1], true)
  return `C ${cpsX},${cpsY} ${cpeX},${cpeY} ${point[0]},${point[1]}`
}


const generatePoints = (num, offsetX) => {
  const scaleX = 15
  const scaleY = (window.innerHeight / num) * 1.3;
  const points = []
  // dir = 1;
  for (let i=0; i<num; i++) {
    let dir = Math.random() < 0.5 ? -1 : 1;
    points.push([offsetX + dir * 0.04 * (i*i) * randRange(60, 200),  window.innerHeight - i * scaleY])
  }
  return points
}

// const points = [[5, 10], [10, 40], [40, 30], [60, 5], [90, 45], [120, 10], [150, 45], [200, 10]]

const svg = document.querySelector('.svg')

const createSVGPath = (key, path, animation, id) => {
    let newPath = document.createElementNS("http://www.w3.org/2000/svg","path");
    newPath.setAttributeNS(null, "class", animation);
    newPath.setAttributeNS(null, "id", id);
    newPath.setAttributeNS(null, "d", path);

    const color = keyColors[key]
    const len = newPath.getTotalLength()
    newPath.setAttributeNS(null, 'style', `--stroke: ${color}; --len: ${len}`);
    // newPath.setAttributeNS(null, 'style', `stroke: red`);

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

const getMidiID = (midi) => {
  return midi + '_' + keyCounters[midi]
}

const startNote = (key, id) => {
  // const points = generatePoints(10, window.innerWidth/2)
  const steps = window.innerWidth/38
  const points = generatePoints(10,  (13 + (key % 12)) * steps)
  const d = svgPath(points, bezierCommand)
  const path = createSVGPath(key, d, 'animating', id);
  const pathEnd = createSVGPath(key, d, '', id + '_end');
  svg.appendChild(path);
  svg.appendChild(pathEnd);
}

const endNote = (midi) => {
  const id = getMidiID(midi)
  const path = document.getElementById(id)
  const pathEnd = document.getElementById(id + '_end')
  pathEnd.classList.add('animatingEnd')
  setTimeout(() => {
    svg.removeChild(path)
    svg.removeChild(pathEnd)
  }, 1000 * 3) // TODO: MAKE THIS DYNAMIC
}

const upper = [81,50,87,51,69,82,53,84,54,89,55,85,73,57,79,48,80,219,187,221]
const lower = [90,83,88,68,67,86,71,66,72,78,74,77,188,76,190,186,191]
const keysPressed = {}

document.addEventListener('keydown', function(e) {
    const key = e.which;
    const up = upper.indexOf(key)
    const low = lower.indexOf(key)
    if (up !== -1 && !keysPressed[key]) {
        const midi = up + 60
        keysPressed[key] = true
        console.log(midi)
        const id = addKeyCount(midi)
        startNote(midi, midi + '_' + id)
    }
    if (low !== -1 && !keysPressed[key]) {
        const midi = low + 48
        keysPressed[key] = true
        console.log(midi)
        const id = addKeyCount(midi)
        startNote(midi, midi + '_' + id)
    }
});

document.addEventListener('keyup', function(e) {
    const key = e.which;
    const up = upper.indexOf(key)
    const low = lower.indexOf(key)
    if (up !== -1) {
        const midi = up + 60
        keysPressed[key] = false
        endNote(midi)
    }
    if (low !== -1) {
        const midi = low + 48
        keysPressed[key] = false
        endNote(midi)
    }
});


const keyColors = [];

const setKeyColors = () => {
    var min = 0;
    var max = 88;
    var startingHue = randRange(0, 256)

    for (var i=min; i<max+1; i++) {
        keyColors.push(map(i, min, max, 0, 400))%256
    }
}

setKeyColors();