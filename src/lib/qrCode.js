/**
 * Zero-dependency QR Code Matrix Generator (Supports Byte Mode, ECC Level L/M)
 * Generates an N x N boolean matrix suitable for SVG/Canvas rendering.
 */

// Galois Field GF(256) tables with primitive polynomial 0x11D (285)
const EXP = new Uint8Array(512)
const LOG = new Uint8Array(256)
let x = 1
for (let i = 0; i < 255; i++) {
  EXP[i] = x
  EXP[i + 255] = x
  LOG[x] = i
  x = (x << 1) ^ (x >= 128 ? 0x11d : 0)
}

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0
  return EXP[LOG[a] + LOG[b]]
}

function rsGeneratorPoly(degree) {
  let poly = [1]
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0)
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j], EXP[i])
      next[j + 1] ^= poly[j]
    }
    poly = next
  }
  return poly
}

function rsCalculateEc(data, ecCount) {
  const gen = rsGeneratorPoly(ecCount)
  const res = new Array(ecCount).fill(0)
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ res[0]
    for (let j = 0; j < ecCount - 1; j++) {
      res[j] = res[j + 1] ^ gfMul(gen[j + 1], factor)
    }
    res[ecCount - 1] = gfMul(gen[ecCount], factor)
  }
  return res
}

// Version specs: [version, totalModules, dataCodewordsL, ecCodewordsL, alignPos]
const VERSION_SPECS = [
  null,
  { version: 1, size: 21, dataBytes: 19, ecBytes: 7, align: [] },
  { version: 2, size: 25, dataBytes: 34, ecBytes: 10, align: [6, 18] },
  { version: 3, size: 29, dataBytes: 55, ecBytes: 15, align: [6, 22] },
  { version: 4, size: 33, dataBytes: 80, ecBytes: 20, align: [6, 26] },
  { version: 5, size: 37, dataBytes: 108, ecBytes: 26, align: [6, 30] },
  { version: 6, size: 41, dataBytes: 136, ecBytes: 36, align: [6, 34] },
]

export function generateQrMatrix(text) {
  const textBytes = new TextEncoder().encode(text)
  const textLen = textBytes.length

  // Select smallest version that accommodates byte mode
  let spec = VERSION_SPECS[4] // default version 4
  for (let v = 1; v < VERSION_SPECS.length; v++) {
    if (VERSION_SPECS[v] && textLen + 3 <= VERSION_SPECS[v].dataBytes) {
      spec = VERSION_SPECS[v]
      break
    }
  }

  // Build bitstream: [Mode: 0100 (4 bits)] [Length (8 bits)] [Data bytes] [Terminator 0000]
  const bits = []
  function pushBits(val, len) {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >> i) & 1)
    }
  }

  pushBits(0b0100, 4) // Byte mode
  pushBits(textLen, 8) // Length for versions 1-9
  for (let i = 0; i < textLen; i++) {
    pushBits(textBytes[i], 8)
  }

  // Terminator
  const maxDataBits = spec.dataBytes * 8
  const termLen = Math.min(4, maxDataBits - bits.length)
  pushBits(0, termLen)

  // Pad to byte boundary
  while (bits.length % 8 !== 0) {
    bits.push(0)
  }

  // Pad bytes 0xEC and 0x11
  const padBytes = [0xec, 0x11]
  let padIdx = 0
  while (bits.length < maxDataBits) {
    pushBits(padBytes[padIdx % 2], 8)
    padIdx++
  }

  // Convert bits to data codeword array
  const dataCodewords = []
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | bits[i + j]
    }
    dataCodewords.push(b)
  }

  // Calculate Error Correction Codewords
  const ecCodewords = rsCalculateEc(dataCodewords, spec.ecBytes)
  const allCodewords = dataCodewords.concat(ecCodewords)

  // Construct N x N Matrix
  const N = spec.size
  const matrix = Array.from({ length: N }, () => Array(N).fill(null))

  // 1. Finder patterns (Top-Left, Top-Right, Bottom-Left)
  function placeFinder(row, col) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const tr = row + r
        const tc = col + c
        if (tr >= 0 && tr < N && tc >= 0 && tc < N) {
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            const isBorder = (r === 0 || r === 6 || c === 0 || c === 6)
            const isCenter = (r >= 2 && r <= 4 && c >= 2 && c <= 4)
            matrix[tr][tc] = (isBorder || isCenter)
          } else {
            matrix[tr][tc] = false // separator
          }
        }
      }
    }
  }

  placeFinder(0, 0)
  placeFinder(0, N - 7)
  placeFinder(N - 7, 0)

  // 2. Alignment patterns (if any)
  if (spec.align && spec.align.length >= 2) {
    const coords = spec.align
    for (const r of coords) {
      for (const c of coords) {
        if (matrix[r][c] === null) {
          for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
              const isOuter = Math.abs(dr) === 2 || Math.abs(dc) === 2
              const isCenter = dr === 0 && dc === 0
              matrix[r + dr][c + dc] = (isOuter || isCenter)
            }
          }
        }
      }
    }
  }

  // 3. Timing tracks
  for (let i = 8; i < N - 8; i++) {
    if (matrix[6][i] === null) matrix[6][i] = (i % 2 === 0)
    if (matrix[i][6] === null) matrix[i][6] = (i % 2 === 0)
  }

  // Dark module
  matrix[4 * spec.version + 9][8] = true

  // Reserve format info area
  for (let i = 0; i < 9; i++) {
    if (matrix[8][i] === null) matrix[8][i] = false
    if (matrix[i][8] === null) matrix[i][8] = false
    if (matrix[8][N - 1 - i] === null) matrix[8][N - 1 - i] = false
    if (matrix[N - 1 - i][8] === null) matrix[N - 1 - i][8] = false
  }

  // 4. Place Data Bits in 2-column bands
  let bitIdx = 0
  const allBits = []
  for (const b of allCodewords) {
    for (let i = 7; i >= 0; i--) {
      allBits.push((b >> i) & 1)
    }
  }

  let dir = -1 // up
  let row = N - 1
  for (let col = N - 1; col > 0; col -= 2) {
    if (col === 6) col-- // skip vertical timing track
    while (row >= 0 && row < N) {
      for (let c = col; c >= col - 1; c--) {
        if (matrix[row][c] === null) {
          let bit = (bitIdx < allBits.length) ? allBits[bitIdx++] : 0
          // Apply standard Mask 0: (row + col) % 2 == 0
          const mask = ((row + c) % 2 === 0) ? 1 : 0
          matrix[row][c] = (bit ^ mask) === 1
        }
      }
      row += dir
    }
    dir = -dir
    row += dir
  }

  // 5. Format info bits (ECC Level L = 01, Mask 000 = 000) -> 01000
  // Standard format string with BCH(15, 5) and mask XOR: 0x77c4 = 111011111000100
  const formatBits = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0]
  const formatCoordsTL = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ]
  for (let i = 0; i < 15; i++) {
    const [r, c] = formatCoordsTL[i]
    matrix[r][c] = formatBits[i] === 1
  }

  // Write format info top-right and bottom-left
  for (let i = 0; i < 7; i++) {
    matrix[N - 1 - i][8] = formatBits[i] === 1
  }
  for (let i = 0; i < 8; i++) {
    matrix[8][N - 8 + i] = formatBits[7 + i] === 1
  }

  return matrix
}
