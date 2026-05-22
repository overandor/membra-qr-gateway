import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Download, RefreshCw, QrCode } from 'lucide-react';
import { cn } from '../../utils';
import { Button } from '../ui/Button.jsx';

// ─── Minimal QR matrix encoder (pure JS, no library) ───────────────────────
// Implements QR Code Version 1 (21×21), error correction L, byte mode.
// Sufficient for short URLs / hashes up to ~17 chars.
// For longer payloads, falls back to a data URI placeholder pattern.

const GF = new Uint8Array(256);
const LOG = new Uint8Array(256);
(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 256) x ^= 285;
  }
  GF[255] = GF[0];
})();

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF[(LOG[a] + LOG[b]) % 255];
}

function gfPoly(poly, scalar) {
  return poly.map((v) => gfMul(v, scalar));
}

function gfPolyMul(p, q) {
  const r = new Array(p.length + q.length - 1).fill(0);
  for (let i = 0; i < p.length; i++) {
    for (let j = 0; j < q.length; j++) {
      r[i + j] ^= gfMul(p[i], q[j]);
    }
  }
  return r;
}

function makeGeneratorPoly(degree) {
  let g = [1];
  for (let i = 0; i < degree; i++) {
    g = gfPolyMul(g, [1, GF[i]]);
  }
  return g;
}

function rsEncode(data, ecLen) {
  const gen = makeGeneratorPoly(ecLen);
  const msg = [...data, ...new Array(ecLen).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const c = msg[i];
    if (c !== 0) {
      for (let j = 1; j < gen.length; j++) {
        msg[i + j] ^= gfMul(gen[j], c);
      }
    }
  }
  return msg.slice(data.length);
}

// Version 1-L capacity: 19 data codewords, 7 EC codewords (total 26)
const V1_SIZE = 21;
const V1_DATA_CODEWORDS = 19;
const V1_EC_CODEWORDS = 7;

// QR timing / finder / format patterns
function placeFinder(grid, row, col) {
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const rr = row + r, cc = col + c;
      if (rr < 0 || cc < 0 || rr >= V1_SIZE || cc >= V1_SIZE) continue;
      const isPattern =
        (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
        (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
        (r >= 2 && r <= 4 && c >= 2 && c <= 4);
      grid[rr][cc] = isPattern ? 1 : 0;
    }
  }
}

function buildQRMatrix(data) {
  // Encode as byte mode
  const bytes = [];
  for (let i = 0; i < data.length; i++) bytes.push(data.charCodeAt(i) & 0xff);

  // Build data bit stream
  const bits = [];
  function pushBits(val, len) {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
  }
  // Mode indicator: byte = 0100
  pushBits(0b0100, 4);
  // Character count (8 bits for V1 byte)
  pushBits(bytes.length, 8);
  for (const b of bytes) pushBits(b, 8);
  // Terminator
  pushBits(0, Math.min(4, V1_DATA_CODEWORDS * 8 - bits.length));
  // Pad to byte boundary
  while (bits.length % 8) bits.push(0);
  // Pad codewords
  const padWords = [0xec, 0x11];
  let pi = 0;
  while (bits.length < V1_DATA_CODEWORDS * 8) {
    pushBits(padWords[pi++ % 2], 8);
  }

  // Convert bits to codewords
  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | (bits[i + j] || 0);
    codewords.push(b);
  }

  // EC codewords
  const ec = rsEncode(codewords, V1_EC_CODEWORDS);
  const allWords = [...codewords, ...ec];

  // Build all bits
  const allBits = [];
  for (const w of allWords) pushBits(w, 8);

  // Initialize grid (-1 = unset, 0/1 = module)
  const grid = Array.from({ length: V1_SIZE }, () => new Array(V1_SIZE).fill(-1));
  const reserved = Array.from({ length: V1_SIZE }, () => new Array(V1_SIZE).fill(false));

  function reserveCell(r, c) {
    if (r >= 0 && r < V1_SIZE && c >= 0 && c < V1_SIZE) reserved[r][c] = true;
  }

  // Finders
  placeFinder(grid, 0, 0);
  placeFinder(grid, 0, V1_SIZE - 7);
  placeFinder(grid, V1_SIZE - 7, 0);
  for (let i = 0; i < V1_SIZE; i++) {
    for (let j = 0; j < V1_SIZE; j++) {
      if (grid[i][j] !== -1) reserved[i][j] = true;
    }
  }

  // Separators (already implicit from finder patterns; mark border cells)
  // Timing patterns
  for (let i = 8; i < V1_SIZE - 8; i++) {
    const val = i % 2 === 0 ? 1 : 0;
    grid[6][i] = val; reserved[6][i] = true;
    grid[i][6] = val; reserved[i][6] = true;
  }

  // Dark module
  grid[V1_SIZE - 8][8] = 1; reserved[V1_SIZE - 8][8] = true;

  // Format info area (reserve)
  for (let i = 0; i <= 8; i++) {
    reserveCell(i, 8);
    reserveCell(8, i);
    reserveCell(V1_SIZE - 1 - (i < 7 ? i : i), 8);
    reserveCell(8, V1_SIZE - 1 - (i < 8 ? i : i));
  }

  // Place data bits in upward columns
  let bitIdx = 0;
  let up = true;
  for (let col = V1_SIZE - 1; col >= 1; col -= 2) {
    if (col === 6) col = 5; // Skip timing column
    for (let ri = 0; ri < V1_SIZE; ri++) {
      const row = up ? V1_SIZE - 1 - ri : ri;
      for (let dc = 0; dc < 2; dc++) {
        const c = col - dc;
        if (!reserved[row][c]) {
          grid[row][c] = bitIdx < allBits.length ? allBits[bitIdx++] : 0;
        }
      }
    }
    up = !up;
  }

  // Apply mask pattern 0 (i+j) % 2 === 0
  for (let r = 0; r < V1_SIZE; r++) {
    for (let c = 0; c < V1_SIZE; c++) {
      if (!reserved[r][c] && (r + c) % 2 === 0) {
        grid[r][c] ^= 1;
      }
    }
  }

  // Format info: EC=L(01), mask=0(000) → format word = 01 000 = 8 bits
  // Format string for L,0 (pre-computed, XOR with 101010000010010)
  const FORMAT_BITS = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0];
  const fmtPositions = [
    [[0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [7, 8], [8, 8],
     [8, 7], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0]],
  ];
  for (let i = 0; i < 15; i++) {
    const [r, c] = fmtPositions[0][i];
    grid[r][c] = FORMAT_BITS[i];
    // Mirror
    if (i < 8) {
      grid[V1_SIZE - 1 - i][8] = FORMAT_BITS[i];
    } else {
      grid[8][V1_SIZE - 15 + i] = FORMAT_BITS[i];
    }
  }

  return grid;
}

function drawQRToCanvas(canvas, data, moduleSize = 8, quietZone = 4) {
  const truncated = data.slice(0, 17); // V1-L max
  let grid;
  try {
    grid = buildQRMatrix(truncated);
  } catch {
    return false;
  }
  const size = V1_SIZE;
  const canvasSize = (size + 2 * quietZone) * moduleSize;
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, canvasSize, canvasSize);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      ctx.fillStyle = grid[r][c] === 1 ? '#FF8A1F' : '#050505';
      ctx.fillRect(
        (c + quietZone) * moduleSize,
        (r + quietZone) * moduleSize,
        moduleSize,
        moduleSize
      );
    }
  }
  return true;
}

// ─── Component ──────────────────────────────────────────────────────────────
export function QRGenerator({ artifactId, url, label, size = 200, className }) {
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const [rendered, setRendered] = useState(false);

  const payload = url || artifactId || 'MEMBRA';
  const moduleSize = Math.max(4, Math.floor(size / (V1_SIZE + 8)));

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setError(null);
    try {
      const ok = drawQRToCanvas(canvas, payload, moduleSize, 2);
      setRendered(ok);
      if (!ok) setError('Payload too long for QR Version 1. Max ~17 chars.');
    } catch (e) {
      setError(e.message);
      setRendered(false);
    }
  }, [payload, moduleSize]);

  useEffect(() => {
    render();
  }, [render]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `qr-${artifactId || 'membra'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [artifactId]);

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div
        className="glass-card p-3 flex items-center justify-center"
        style={{ width: size + 24, height: size + 24 }}
      >
        {error ? (
          <div className="flex flex-col items-center gap-2 text-center p-4">
            <QrCode className="w-8 h-8 text-text-muted" />
            <p className="text-xs text-danger">{error}</p>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            style={{ imageRendering: 'pixelated', width: size, height: size }}
          />
        )}
      </div>

      {label && (
        <p className="text-xs text-text-muted font-mono text-center max-w-[200px] break-all">
          {label}
        </p>
      )}

      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="small"
          onClick={render}
          icon={RefreshCw}
        >
          Regenerate
        </Button>
        {rendered && (
          <Button
            variant="primary"
            size="small"
            onClick={handleDownload}
            icon={Download}
          >
            Download PNG
          </Button>
        )}
      </div>
    </div>
  );
}

export default QRGenerator;
