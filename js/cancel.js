// Draws a round rubber-stamp "cancellation" on a canvas, in the style of the
// NPS Passport cancellation stamps: site name on the top arc, place on the
// bottom arc, visit date in the center, with uneven ink.
(function (global) {
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

  const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const DISPLAY = '"Dharma Gothic E", Impact, "Arial Narrow", sans-serif';
  const CAPTION = '"Frutiger Next", Arial, Helvetica, sans-serif';

  function arcText(ctx, text, r, centerAngle, bottom, font, spacing) {
    ctx.font = font;
    const chars = [...text];
    const widths = chars.map((c) => ctx.measureText(c).width + spacing);
    const total = widths.reduce((a, b) => a + b, 0) - spacing;
    let theta = bottom ? centerAngle + total / (2 * r) : centerAngle - total / (2 * r);
    chars.forEach((ch, i) => {
      const half = widths[i] / 2 / r;
      theta += bottom ? -half : half;
      ctx.save();
      ctx.rotate(bottom ? theta - Math.PI / 2 : theta + Math.PI / 2);
      ctx.fillText(ch, 0, bottom ? r : -r);
      ctx.restore();
      theta += bottom ? -half : half;
    });
    return total / r; // angle used
  }

  function fitFont(ctx, text, family, weight, size, maxWidth, spacing) {
    let s = size;
    while (s > 8) {
      ctx.font = `${weight} ${s}px ${family}`;
      const w = [...text].reduce((a, c) => a + ctx.measureText(c).width + spacing, 0);
      if (w <= maxWidth) break;
      s -= 1;
    }
    return `${weight} ${s}px ${family}`;
  }

  /**
   * draw(ctx, opts) — draws centred at (cx, cy) with radius R.
   * opts: { top, bottom, date (Date), color, seed, label, cx, cy, R }
   */
  function draw(ctx, o) {
    const R = o.R, S = R / 100; // design on a 100-unit radius
    const rand = rng(o.seed || hash(o.top + o.date));
    const d = o.date instanceof Date ? o.date : new Date(o.date);

    // Draw onto an offscreen canvas so we can erode it like real ink.
    const size = Math.ceil(R * 2 + 8);
    const off = document.createElement("canvas");
    off.width = off.height = size;
    const c = off.getContext("2d");
    c.translate(size / 2, size / 2);
    c.fillStyle = c.strokeStyle = o.color || "#092A4D";
    c.textAlign = "center";
    c.textBaseline = "alphabetic";

    // rings
    c.lineWidth = 5 * S; c.beginPath(); c.arc(0, 0, 96 * S, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 1.6 * S; c.beginPath(); c.arc(0, 0, 89 * S, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 2.4 * S; c.beginPath(); c.arc(0, 0, 60 * S, 0, Math.PI * 2); c.stroke();

    // arc text
    const sp = 1.6 * S;
    const topFont = fitFont(c, o.top, DISPLAY, 700, 25 * S, Math.PI * 0.95 * 74 * S, sp);
    const usedTop = arcText(c, o.top, 66 * S, -Math.PI / 2, false, topFont, sp);
    const botFont = fitFont(c, o.bottom, DISPLAY, 700, 21 * S, Math.PI * 0.8 * 82 * S, sp);
    const usedBot = arcText(c, o.bottom, 82 * S, Math.PI / 2, true, botFont, sp);

    // stars at the seams between the arcs
    const starAt = (a) => {
      c.save(); c.rotate(a); c.translate(75 * S, 0); star(c, 5.5 * S); c.restore();
    };
    starAt(0); starAt(Math.PI);

    // center: label / date
    c.font = `700 ${9.5 * S}px ${CAPTION}`;
    c.fillText(o.label || "T.R. PASSPORT", 0, -24 * S);
    c.font = `700 ${34 * S}px ${DISPLAY}`;
    c.fillText(`${MONTHS[d.getMonth()]} ${d.getDate()}`, 0, 9 * S);
    c.font = `700 ${22 * S}px ${DISPLAY}`;
    c.fillText(String(d.getFullYear()), 0, 33 * S);
    c.lineWidth = 1.4 * S;
    c.beginPath(); c.moveTo(-34 * S, -15 * S); c.lineTo(34 * S, -15 * S); c.stroke();

    // ink erosion: speckles and a lighter patch where the stamp was pressed unevenly
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = "destination-out";
    const n = Math.round(900 * S * S);
    for (let i = 0; i < n; i++) {
      c.globalAlpha = 0.25 + rand() * 0.75;
      const x = rand() * size, y = rand() * size, rr = (0.3 + rand() * 1.4) * S;
      c.beginPath(); c.arc(x, y, rr, 0, Math.PI * 2); c.fill();
    }
    const ang = rand() * Math.PI * 2;
    const gx = size / 2 + Math.cos(ang) * 70 * S, gy = size / 2 + Math.sin(ang) * 70 * S;
    const g = c.createRadialGradient(gx, gy, 0, gx, gy, 90 * S);
    g.addColorStop(0, "rgba(0,0,0,.55)"); g.addColorStop(1, "rgba(0,0,0,0)");
    c.globalAlpha = 1; c.fillStyle = g; c.fillRect(0, 0, size, size);

    ctx.save();
    ctx.globalAlpha = o.alpha == null ? 0.9 : o.alpha;
    ctx.translate(o.cx, o.cy);
    ctx.rotate(((o.rotate == null ? (rand() * 24 - 12) : o.rotate) * Math.PI) / 180);
    ctx.drawImage(off, -size / 2, -size / 2);
    ctx.restore();
  }

  function star(c, r) {
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI / 5) * i - Math.PI / 2, rad = i % 2 ? r * 0.45 : r;
      c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    c.closePath(); c.fill();
  }

  /** Returns a data URL (PNG) for a cancellation. */
  function toDataURL(opts, px) {
    const size = px || 360;
    const cv = document.createElement("canvas");
    cv.width = cv.height = size;
    draw(cv.getContext("2d"), Object.assign({ cx: size / 2, cy: size / 2, R: size / 2 - 8, rotate: 0 }, opts));
    return cv.toDataURL("image/png");
  }

  global.Cancel = { draw, toDataURL, hash };
})(window);
