// Minimal dependency-free QR Code generator (byte mode), ported from Nayuki's public-domain
// "QR Code generator library" (https://www.nayuki.io/page/qr-code-generator-library).
// Trimmed to what HORIZON needs: encode a short ASCII/UTF-8 string (byte mode) → boolean module matrix.
// No CDN, no runtime deps — safe to run server-side (sample-card PDF) and China-safe on the client.
//
// Public domain. Use qrMatrix(text, ecc) → { size, modules:[[bool]] }.

const ECC = { L: 0, M: 1, Q: 2, H: 3 };

// Per-version, per-ECC tables (index 0 unused; versions 1..40). Rows: L, M, Q, H.
const ECC_CODEWORDS_PER_BLOCK = [
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
];
const NUM_ERROR_CORRECTION_BLOCKS = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
];

function getNumRawDataModules(ver) {
  let result = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const numAlign = Math.floor(ver / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (ver >= 7) result -= 36;
  }
  return result;
}
function getNumDataCodewords(ver, ecl) {
  return Math.floor(getNumRawDataModules(ver) / 8)
    - ECC_CODEWORDS_PER_BLOCK[ecl][ver] * NUM_ERROR_CORRECTION_BLOCKS[ecl][ver];
}

// ── Reed-Solomon ──
function reedSolomonComputeDivisor(degree) {
  const result = new Uint8Array(degree); result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = reedSolomonMultiply(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = reedSolomonMultiply(root, 0x02);
  }
  return result;
}
function reedSolomonComputeRemainder(data, divisor) {
  const result = new Uint8Array(divisor.length);
  for (const b of data) {
    const factor = b ^ result[0];
    result.copyWithin(0, 1); result[result.length - 1] = 0;
    for (let i = 0; i < result.length; i++) result[i] ^= reedSolomonMultiply(divisor[i], factor);
  }
  return result;
}
function reedSolomonMultiply(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; }
  return z & 0xFF;
}

function encodeByteSegment(text) {
  // UTF-8 bytes
  const bytes = [];
  for (const ch of unescape(encodeURIComponent(text))) bytes.push(ch.charCodeAt(0) & 0xFF);
  return bytes;
}

function qrMatrix(text, eccName) {
  const ecl0 = ECC[eccName] != null ? ECC[eccName] : ECC.M;
  const data = encodeByteSegment(text);
  // pick smallest version (1..40) that fits, at the requested ECC (byte mode, 8-bit count for v10+; 8-bit for v1-9)
  let version = 0, dataCapacityBits = 0, ecl = ecl0;
  for (let v = 1; v <= 40; v++) {
    const cap = getNumDataCodewords(v, ecl) * 8;
    const ccBits = v <= 9 ? 8 : 16;             // byte-mode char-count bits
    const needed = 4 + ccBits + 8 * data.length; // mode indicator + count + data
    if (needed <= cap) { version = v; dataCapacityBits = cap; break; }
  }
  if (!version) throw new Error('QR: data too long');

  // ── build bit buffer ──
  const bb = [];
  const append = (val, len) => { for (let i = len - 1; i >= 0; i--) bb.push((val >>> i) & 1); };
  append(0x4, 4);                                  // byte mode
  append(data.length, version <= 9 ? 8 : 16);      // char count
  for (const b of data) append(b, 8);
  // terminator + bit/byte padding
  append(0, Math.min(4, dataCapacityBits - bb.length));
  while (bb.length % 8 !== 0) bb.push(0);
  for (let pad = 0xEC; bb.length < dataCapacityBits; pad ^= 0xEC ^ 0x11) append(pad, 8);
  // pack to bytes
  const dataCodewords = new Uint8Array(bb.length / 8);
  for (let i = 0; i < bb.length; i++) dataCodewords[i >>> 3] |= bb[i] << (7 - (i & 7));

  // ── ECC: split into blocks, interleave ──
  const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[ecl][version];
  const blockEccLen = ECC_CODEWORDS_PER_BLOCK[ecl][version];
  const rawCodewords = Math.floor(getNumRawDataModules(version) / 8);
  const numShortBlocks = numBlocks - rawCodewords % numBlocks;
  const shortBlockLen = Math.floor(rawCodewords / numBlocks);
  const blocks = [];
  const rsDiv = reedSolomonComputeDivisor(blockEccLen);
  let k = 0;
  for (let i = 0; i < numBlocks; i++) {
    const datLen = shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1);
    const dat = Array.from(dataCodewords.slice(k, k + datLen)); k += datLen;
    const ecc = reedSolomonComputeRemainder(dat, rsDiv);
    if (i < numShortBlocks) dat.push(0);           // pad short blocks for even interleave
    blocks.push({ dat, ecc });
  }
  const result = [];
  for (let i = 0; i < blocks[0].dat.length; i++)
    for (let j = 0; j < blocks.length; j++)
      if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) result.push(blocks[j].dat[i]);
  for (let i = 0; i < blockEccLen; i++)
    for (let j = 0; j < blocks.length; j++) result.push(blocks[j].ecc[i]);

  // ── draw modules ──
  const size = version * 4 + 17;
  const modules = Array.from({ length: size }, () => new Array(size).fill(false));
  const isFunction = Array.from({ length: size }, () => new Array(size).fill(false));
  const setFn = (x, y, dark) => { if (x >= 0 && x < size && y >= 0 && y < size) { modules[y][x] = dark; isFunction[y][x] = true; } };

  // timing patterns
  for (let i = 0; i < size; i++) { setFn(6, i, i % 2 === 0); setFn(i, 6, i % 2 === 0); }
  // finder patterns + separators
  const finder = (ox, oy) => {
    for (let dy = -1; dy <= 7; dy++) for (let dx = -1; dx <= 7; dx++) {
      const xx = ox + dx, yy = oy + dy; if (xx < 0 || xx >= size || yy < 0 || yy >= size) continue;
      const dist = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
      setFn(xx, yy, dist !== 2 && dist !== 4);
    }
  };
  finder(0, 0); finder(size - 7, 0); finder(0, size - 7);
  // alignment patterns
  const alignPositions = (() => {
    if (version === 1) return [];
    const num = Math.floor(version / 7) + 2;
    const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (num * 2 - 2)) * 2;
    const pos = [6];
    for (let p = size - 7; pos.length < num; p -= step) pos.splice(1, 0, p);
    return pos;
  })();
  for (let i = 0; i < alignPositions.length; i++) for (let j = 0; j < alignPositions.length; j++) {
    if ((i === 0 && j === 0) || (i === 0 && j === alignPositions.length - 1) || (i === alignPositions.length - 1 && j === 0)) continue;
    const cx = alignPositions[i], cy = alignPositions[j];
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++)
      setFn(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  // reserve format + version info areas (drawn after masking)
  const reserveFormat = () => {
    for (let i = 0; i < 9; i++) { setFn(8, i, false); setFn(i, 8, false); }
    for (let i = 0; i < 8; i++) { setFn(size - 1 - i, 8, false); setFn(8, size - 1 - i, false); }
    setFn(8, size - 8, true);   // dark module
  };
  reserveFormat();
  if (version >= 7) {
    for (let i = 0; i < 18; i++) { const a = size - 11 + i % 3, b = Math.floor(i / 3); isFunction[b][a] = true; isFunction[a][b] = true; }
  }

  // place data with zig-zag
  let idx = 0;
  const getBit = (x, i) => ((x >>> i) & 1) !== 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let jj = 0; jj < 2; jj++) {
        const x = right - jj;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!isFunction[y][x] && idx < result.length * 8) {
          modules[y][x] = getBit(result[idx >>> 3], 7 - (idx & 7)); idx++;
        }
      }
    }
  }

  // ── masking: try all 8, pick lowest penalty ──
  const applyMask = (mask, mods) => {
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      if (isFunction[y][x]) continue;
      let invert;
      switch (mask) {
        case 0: invert = (x + y) % 2 === 0; break;
        case 1: invert = y % 2 === 0; break;
        case 2: invert = x % 3 === 0; break;
        case 3: invert = (x + y) % 3 === 0; break;
        case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
        case 5: invert = (x * y) % 2 + (x * y) % 3 === 0; break;
        case 6: invert = ((x * y) % 2 + (x * y) % 3) % 2 === 0; break;
        case 7: invert = ((x + y) % 2 + (x * y) % 3) % 2 === 0; break;
      }
      if (invert) mods[y][x] = !mods[y][x];
    }
  };
  const drawFormatBits = (mask, mods) => {
    const dataBits = (ecl === 0 ? 1 : ecl === 1 ? 0 : ecl === 2 ? 3 : 2) << 3 | mask;   // ECC L=01,M=00,Q=11,H=10
    let rem = dataBits;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((dataBits << 10) | rem) ^ 0x5412;
    for (let i = 0; i <= 5; i++) mods[i][8] = getBit(bits, i);
    mods[7][8] = getBit(bits, 6); mods[8][8] = getBit(bits, 7); mods[8][7] = getBit(bits, 8);
    for (let i = 9; i < 15; i++) mods[8][14 - i] = getBit(bits, i);
    for (let i = 0; i < 8; i++) mods[8][size - 1 - i] = getBit(bits, i);
    for (let i = 8; i < 15; i++) mods[size - 15 + i][8] = getBit(bits, i);
    mods[size - 8][8] = true;
  };
  const drawVersion = (mods) => {
    if (version < 7) return;
    let rem = version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
    const bits = version << 12 | rem;
    for (let i = 0; i < 18; i++) { const bit = getBit(bits, i); const a = size - 11 + i % 3, b = Math.floor(i / 3); mods[b][a] = bit; mods[a][b] = bit; }
  };
  const penalty = (mods) => {
    let p = 0;
    // rows/cols runs
    for (const line of [(y) => mods[y], (x) => mods.map(r => r[x])]) {
      for (let i = 0; i < size; i++) {
        const arr = line(i); let run = 1;
        for (let j = 1; j < size; j++) { if (arr[j] === arr[j - 1]) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; }
      }
    }
    // 2x2 blocks
    for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++)
      if (mods[y][x] === mods[y][x + 1] && mods[y][x] === mods[y + 1][x] && mods[y][x] === mods[y + 1][x + 1]) p += 3;
    // dark ratio
    let dark = 0; for (const row of mods) for (const c of row) if (c) dark++;
    const total = size * size; const k = Math.floor((Math.abs(dark * 20 - total * 10) + total - 1) / total) - 1;
    p += Math.max(k, 0) * 10;
    return p;
  };
  let bestMask = 0, bestPenalty = Infinity, bestMods = null;
  for (let mask = 0; mask < 8; mask++) {
    const mods = modules.map(r => r.slice());
    applyMask(mask, mods); drawFormatBits(mask, mods); drawVersion(mods);
    const pen = penalty(mods);
    if (pen < bestPenalty) { bestPenalty = pen; bestMask = mask; bestMods = mods; }
  }
  return { size, modules: bestMods, version, mask: bestMask };
}

export { qrMatrix };
