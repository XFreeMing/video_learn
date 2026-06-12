import sharp from 'sharp'

const PHASH_SIZE = 32
const PHASH_OUTPUT_SIZE = 8

/**
 * Compute perceptual hash (pHash) for an image.
 * Uses DCT-based approach: resize to 32x32 grayscale, compute DCT,
 * take top-left 8x8 low-frequency coefficients, threshold against median.
 */
export async function computePHash(imagePath: string): Promise<string> {
  const result = await sharp(imagePath)
    .grayscale()
    .resize(PHASH_SIZE, PHASH_SIZE, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { data, info } = result as { data: Buffer; info: { width: number; height: number } }

  // Convert buffer to 2D matrix
  const matrix: number[][] = []
  for (let y = 0; y < info.height; y++) {
    const row: number[] = []
    for (let x = 0; x < info.width; x++) {
      row.push(data[y * info.width + x])
    }
    matrix.push(row)
  }

  // Compute DCT and take top-left PHASH_OUTPUT_SIZE x PHASH_OUTPUT_SIZE
  const dctCoefficients = computeDCTCoefficients(matrix, PHASH_OUTPUT_SIZE)

  // Compute median of coefficients (excluding DC component at [0][0])
  const values: number[] = []
  for (let i = 0; i < PHASH_OUTPUT_SIZE; i++) {
    for (let j = 0; j < PHASH_OUTPUT_SIZE; j++) {
      if (i === 0 && j === 0) continue
      values.push(dctCoefficients[i][j])
    }
  }
  const median = values.sort((a, b) => a - b)[Math.floor(values.length / 2)]

  // Create hash: bits set where coefficient >= median
  let hash = 0n
  let bitIndex = 0
  for (let i = 0; i < PHASH_OUTPUT_SIZE; i++) {
    for (let j = 0; j < PHASH_OUTPUT_SIZE; j++) {
      if (i === 0 && j === 0) continue
      if (dctCoefficients[i][j] >= median) {
        hash |= 1n << BigInt(bitIndex)
      }
      bitIndex++
    }
  }

  return hash.toString(16).padStart(16, '0')
}

/**
 * Compute the DCT-based coefficients for the top-left N x N region.
 * Simplified 1D DCT applied row-wise then column-wise.
 */
function computeDCTCoefficients(matrix: number[][], size: number): number[][] {
  const n = matrix.length
  const coeffs: number[][] = []

  // Row-wise DCT
  const rowDct: number[][] = []
  for (let i = 0; i < n; i++) {
    rowDct.push(dct1d(matrix[i], size))
  }

  // Column-wise DCT
  for (let j = 0; j < size; j++) {
    const col: number[] = []
    for (let i = 0; i < n; i++) {
      col.push(rowDct[i][j])
    }
    const colResult = dct1d(col, size)
    for (let i = 0; i < size; i++) {
      if (!coeffs[i]) coeffs[i] = []
      coeffs[i][j] = colResult[i]
    }
  }

  return coeffs
}

function dct1d(signal: number[], size: number): number[] {
  const result: number[] = new Array(size).fill(0)
  const n = signal.length
  for (let k = 0; k < size; k++) {
    let sum = 0
    for (let x = 0; x < n; x++) {
      sum += signal[x] * Math.cos((Math.PI / n) * (x + 0.5) * k)
    }
    result[k] = sum
  }
  return result
}

/**
 * Compute Hamming distance between two pHash hex strings.
 * Lower distance = more similar images.
 */
export function hammingDistance(a: string, b: string): number {
  const hashA = BigInt(`0x${a}`)
  const hashB = BigInt(`0x${b}`)
  const xor = hashA ^ hashB
  // Count set bits
  let distance = 0
  let val = xor
  while (val > 0n) {
    distance += Number(val & 1n)
    val >>= 1n
  }
  return distance
}

/**
 * Default threshold for considering two frames as duplicates.
 * Hamming distance below this threshold means the images are similar.
 */
export const DEDUP_THRESHOLD = 10
