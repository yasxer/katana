import { lerp } from './math';

/** Canvas that reveals or covers content in clustered square cells. */
export class Mosaic {
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private cell = 0;
  private cols = 0;
  private rows = 0;
  private thr = new Float32Array(0);
  private last = -1;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = this.canvas.clientWidth;
    this.h = this.canvas.clientHeight;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cell = Math.max(22, Math.round(this.w / 36));
    this.cols = Math.ceil(this.w / this.cell);
    this.rows = Math.ceil(this.h / this.cell);

    // clustered random order: coarse noise + per-cell jitter, converted to ranks
    const n = this.cols * this.rows;
    const cw = Math.ceil(this.cols / 5) + 2;
    const ch = Math.ceil(this.rows / 5) + 2;
    const coarse = Array.from({ length: cw * ch }, Math.random);
    const val = new Float32Array(n);
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const fx = c / 5;
        const fy = r / 5;
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const g = (x: number, y: number) => coarse[y * cw + x];
        const top = lerp(g(x0, y0), g(x0 + 1, y0), fx - x0);
        const bottom = lerp(g(x0, y0 + 1), g(x0 + 1, y0 + 1), fx - x0);
        val[r * this.cols + c] = lerp(top, bottom, fy - y0) * 0.62 + Math.random() * 0.38;
      }
    }
    const order = Array.from(val.keys()).sort((a, b) => val[a] - val[b]);
    this.thr = new Float32Array(n);
    order.forEach((idx, rank) => (this.thr[idx] = rank / n));
    this.last = -1;
  }

  /** Rows covered by the artwork band. */
  private band() {
    const r0 = Math.round((this.h * 0.19) / this.cell);
    const r1 = Math.round((this.h * 0.8) / this.cell);
    return { r0, r1, y: r0 * this.cell, h: (r1 - r0) * this.cell };
  }

  /** Reveal an image inside the band, cell by cell. `pan` slides it sideways. */
  drawImage(img: HTMLImageElement, t: number, pan: number, veil = 'rgba(21,28,46,.55)') {
    const key = t <= 0 ? 0 : t * 1000 + pan;
    if (key === this.last) return;
    this.last = key;
    const { ctx, w, h, cell, cols } = this;
    ctx.clearRect(0, 0, w, h);
    if (t <= 0 || !img.complete || !img.naturalWidth) return;

    const b = this.band();
    const crop = 26; // trims the paper border of the artwork
    const iw = img.naturalWidth;
    const ih = img.naturalHeight - crop * 2;
    const scale = Math.max(b.h / ih, (w * 1.14) / iw);
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, b.y, w, b.h);
    ctx.clip();
    ctx.drawImage(img, 0, crop, iw, ih, -(dw - w) * pan, b.y + (b.h - dh) / 2, dw, dh);
    ctx.restore();
    if (t >= 1) return;

    for (let r = b.r0; r < b.r1; r++) {
      for (let c = 0; c < cols; c++) {
        const d = this.thr[r * cols + c] - t;
        if (d > 0) ctx.clearRect(c * cell, r * cell, cell, cell);
        else if (d > -0.035) {
          ctx.fillStyle = veil;
          ctx.fillRect(c * cell, r * cell, cell, cell);
        }
      }
    }
  }

  /** Cover the whole canvas with flat cells. */
  drawFill(color: string, t: number) {
    if (t === this.last) return;
    this.last = t;
    const { ctx, w, h, cell, cols, rows } = this;
    ctx.clearRect(0, 0, w, h);
    if (t <= 0) return;
    ctx.fillStyle = color;
    if (t >= 1) {
      ctx.fillRect(0, 0, w, h);
      return;
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (this.thr[r * cols + c] < t) ctx.fillRect(c * cell, r * cell, cell + 0.5, cell + 0.5);
      }
    }
  }
}
