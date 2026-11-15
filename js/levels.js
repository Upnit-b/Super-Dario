/* Nova Rift — deterministic stage builder: eight worlds, four stages each. */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const L = (G.Levels = {});
  const H = 15;

  // Seeded layout randomness is separate from cosmetic randomness in the renderer.
  // Rebuilding the same world/stage must preserve collision geometry and supplies.
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  L.WORLDS = [
    { name: 'VERDANT REACH', deco: ['bush', 'tree', 'flower', 'bush'] },
    { name: 'SOLAR WASTES', deco: ['cactus', 'rock', 'cactus'] },
    { name: 'LUNAR GARDENS', deco: ['bush', 'tree', 'rock'] },
    { name: 'GLACIER ARRAY', deco: ['pine', 'rock', 'pine'] },
    { name: 'AMBER WILDS', deco: ['tree', 'bush', 'tree'] },
    { name: 'VIOLET MARSH', deco: ['tree', 'rock', 'bush'] },
    { name: 'TIDAL FRONTIER', deco: ['pine', 'bush', 'rock'] },
    { name: 'THE HELIX CORE', deco: ['rock', 'rock'] },
  ];
  L.KIND_NAME = {
    over: 'EXPEDITION',
    cave: 'UNDERCITY',
    water: 'DEEP DIVE',
    sky: 'SKYWAY',
    forge: 'REACTOR',
  };
  L.stageKind = function (w, s) {
    if (s === 4) return 'forge';
    if (s === 3) return 'sky';
    if (s === 2) return w === 3 || w === 6 ? 'water' : 'cave';
    return 'over';
  };

  class Bld {
    constructor(R) {
      this.R = R;
      this.W = 460;
      this.g = [];
      for (let y = 0; y < H; y++) this.g.push(new Array(this.W).fill(' '));
      this.contents = {};
      this.ents = [];
      this.deco = [];
      this.sincePow = 99;
      this.firstPow = true;
    }
    ri(a, b) {
      return a + Math.floor(this.R() * (b - a + 1));
    }
    ch(p) {
      return this.R() < p;
    }
    pick(arr) {
      return arr[Math.floor(this.R() * arr.length)];
    }
    set(x, y, c) {
      if (y >= 0 && y < H && x >= 0 && x < this.W) this.g[y][x] = c;
    }
    get(x, y) {
      return y >= 0 && y < H && x >= 0 && x < this.W ? this.g[y][x] : ' ';
    }
    fill(x0, y0, x1, y1, c) {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, c);
    }
    floor(x0, x1, top, c) {
      this.fill(x0, top, x1, H - 1, c || '#');
    }
    ent(t, x, y, o) {
      this.ents.push(Object.assign({ t, x, y }, o || {}));
    }
    pk() {
      this.sincePow++;
      if (this.firstPow || this.sincePow >= this.ri(6, 9)) {
        this.firstPow = false;
        this.sincePow = 0;
        return 'power';
      }
      if (this.ch(0.03)) return 'shard';
      return 'coin';
    }
    prize(x, y, kind) {
      this.set(x, y, '?');
      this.contents[x + ',' + y] = kind || this.pk();
    }
    row(x, y, pat) {
      for (let i = 0; i < pat.length; i++) {
        const c = pat[i];
        if (c === 'B') {
          this.set(x + i, y, 'B');
          if (this.ch(0.07)) this.contents[x + i + ',' + y] = this.ch(0.25) ? 'shard' : 'multi';
        } else if (c === '?') this.prize(x + i, y);
      }
    }
    coins(x0, x1, y) {
      for (let x = x0; x <= x1; x++) if (this.get(x, y) === ' ') this.set(x, y, 'o');
    }
    arc(x0, w, y) {
      for (let i = 0; i < w; i++) {
        const yy = y - Math.round(Math.sin(((i + 0.5) / w) * Math.PI) * 1.5);
        if (this.get(x0 + i, yy) === ' ') this.set(x0 + i, yy, 'o');
      }
    }
    stump(x, h, top) {
      for (let i = 1; i <= h; i++) {
        const y = top - i,
          tp = i === h;
        this.set(x, y, tp ? 'l' : '[');
        this.set(x + 1, y, tp ? 'r' : ']');
      }
    }
    finish(w) {
      for (let y = 0; y < H; y++) this.g[y].length = w;
      return { g: this.g, w, contents: this.contents, ents: this.ents, deco: this.deco };
    }
  }

  function groundDeco(b, w, kinds, every, groundCh) {
    for (let x = 4; x < w - 3; x += b.ri(every, every + 5)) {
      for (let y = 3; y < H; y++) {
        const c = b.get(x, y);
        if (c === groundCh) {
          if (
            b.get(x, y - 1) === ' ' &&
            b.get(x + 1, y) === groundCh &&
            b.get(x + 1, y - 1) === ' ' &&
            b.get(x, y - 2) === ' '
          )
            b.deco.push({ k: b.pick(kinds), x, y });
          break;
        }
        if (c !== ' ' && c !== 'o') break;
      }
    }
  }
  function clouds(b, w, lo, hi) {
    for (let x = 2; x < w * 0.5 + 24; x += b.ri(7, 13))
      b.deco.push({ k: 'cloud', x, y: b.ri(lo, hi), par: 0.5 });
  }
  function goalSteps(b, gx, top, c) {
    b.set(gx - 6, top - 1, c);
    b.fill(gx - 5, top - 2, gx - 5, top - 1, c);
    b.fill(gx - 4, top - 3, gx - 4, top - 1, c);
  }

  /* ---------- TRAIL (x-1) ---------- */
  function genOver(b, w, s, d) {
    const len = 150 + w * 6 + b.ri(0, 14);
    const pool = ['beetle', 'beetle', 'snail'];
    if (w >= 2) pool.push('hopper');
    if (w >= 3) pool.push('urchin');
    if (w >= 5) pool.push('snail', 'hopper');
    if (w >= 7) pool.push('urchin');
    const foe = (x, top) => {
      const t = b.pick(pool);
      b.ent(t, x, top - 1, t === 'snail' && b.ch(0.5) ? { careful: true } : null);
    };
    b.floor(0, 15, 13);
    let x = 16,
      cp = null,
      tunnel = null,
      last = '';
    if (w === 1) b.row(11, 9, '?');
    const tunnelAt = Math.floor(len * 0.28),
      outAt = Math.floor(len * 0.6);
    while (x < len) {
      if (!cp && x > len * 0.47) {
        b.floor(x, x + 5, 13);
        cp = { x: x + 2, y: 12 };
        x += 6;
        last = 'cp';
        continue;
      }
      if (!tunnel && x >= tunnelAt) {
        b.floor(x, x + 8, 13);
        b.stump(x + 3, 3, 13);
        tunnel = { inX: x + 3, inY: 10, outX: null, outY: 0 };
        x += 9;
        last = 'st';
        continue;
      }
      if (tunnel && tunnel.outX === null && x >= outAt) {
        b.floor(x, x + 8, 13);
        b.stump(x + 3, 2, 13);
        tunnel.outX = x + 3;
        tunnel.outY = 11;
        x += 9;
        last = 'st';
        continue;
      }
      const opts = ['flat', 'flat', 'flat', 'gap', 'stumps', 'plateau', 'stairs', 'float'];
      if (w >= 5) opts.push('totem');
      if (d > 0.4) opts.push('gap', 'float');
      let k = b.pick(opts);
      if (k === last && k !== 'flat') k = 'flat';
      if (x < 30 && (k === 'float' || k === 'stairs')) k = 'flat';
      last = k;
      if (k === 'flat') {
        const n = b.ri(9, 14);
        b.floor(x, x + n - 1, 13);
        const style = b.ri(0, 5),
          bx = x + b.ri(2, 4);
        if (style === 0) b.row(bx, 9, '?');
        else if (style === 1) b.row(bx, 9, 'B?B');
        else if (style === 2) {
          b.row(bx, 9, 'B?B?B');
          if (b.ch(0.5)) b.row(bx + 2, 5, '?');
        } else if (style === 3) {
          b.row(bx, 9, 'BBBB');
          b.coins(bx, bx + 3, 8);
        } else if (style === 4) b.coins(bx, bx + 4, 12);
        const ne = 1 + (b.ch(0.45 + d * 0.5) ? 1 : 0) + (b.ch(0.1 + d * 0.6) ? 1 : 0);
        for (let i = 0; i < ne; i++) foe(Math.min(x + n - 2, x + 5 + i * 2 + b.ri(0, 2)), 13);
        x += n;
      } else if (k === 'gap') {
        b.floor(x, x + 2, 13);
        const gw = b.ri(2, d < 0.25 ? 3 : d < 0.6 ? 4 : 5);
        if (b.ch(0.6)) b.arc(x + 3, gw, 9);
        b.floor(x + 3 + gw, x + 9 + gw, 13);
        if (b.ch(0.35 + d * 0.5)) foe(x + 8 + gw, 13);
        x += 10 + gw;
      } else if (k === 'stumps') {
        const n = b.ri(1, 3);
        let px = x + 2;
        for (let i = 0; i < n; i++) {
          const h = b.ri(2, 3);
          b.stump(px, h, 13);
          if ((w > 1 || s > 1) && b.ch(0.2 + d * 0.5)) b.ent('thorn', px, 13 - h);
          if (i < n - 1 && b.ch(0.5)) foe(px + 4, 13);
          px += b.ri(6, 8);
        }
        b.floor(x, px + 1, 13);
        x = px + 2;
      } else if (k === 'plateau') {
        const n = b.ri(7, 11),
          hh = b.ri(1, 2);
        b.floor(x, x + 1, 13);
        b.floor(x + 2, x + 1 + n, 13 - hh);
        b.floor(x + 2 + n, x + 3 + n, 13);
        if (b.ch(0.7)) b.coins(x + 4, x + n - 1, 13 - hh - 3);
        foe(x + 2 + b.ri(3, n - 2), 13 - hh);
        if (b.ch(d)) foe(x + 2 + b.ri(3, n - 2), 13 - hh);
        x += n + 4;
      } else if (k === 'stairs') {
        const hh = b.ri(3, 4),
          gw = b.ch(0.6) ? b.ri(2, 3) : 0;
        b.floor(x, x + 1, 13);
        let sx = x + 2;
        for (let i = 0; i < hh; i++) {
          b.floor(sx + i, sx + i, 13);
          b.fill(sx + i, 12 - i, sx + i, 12, 'H');
        }
        sx += hh;
        if (gw) {
          if (b.ch(0.5)) b.arc(sx, gw, 13 - hh - 3);
          sx += gw;
        } else {
          b.floor(sx, sx, 13);
          b.fill(sx, 13 - hh, sx, 12, 'H');
          sx += 1;
        }
        for (let i = 0; i < hh; i++) {
          b.floor(sx + i, sx + i, 13);
          b.fill(sx + i, 13 - hh + i, sx + i, 12, 'H');
        }
        sx += hh;
        b.floor(sx, sx + 2, 13);
        x = sx + 3;
      } else if (k === 'float') {
        b.floor(x, x + 2, 13);
        let px = x + 3 + b.ri(2, 3),
          py = b.ri(10, 11);
        const np = b.ri(2, 3);
        for (let i = 0; i < np; i++) {
          b.fill(px, py, px + 2, py, 'H');
          if (b.ch(0.6)) b.coins(px, px + 2, py - 2);
          px += 3 + b.ri(2, 3);
          py = clamp(py + b.ri(-1, 1), 9, 11);
        }
        b.floor(px, px + 6, 13);
        if (b.ch(0.3 + d * 0.5)) foe(px + 5, 13);
        x = px + 7;
      } else {
        // totem
        b.floor(x, x + 8, 13);
        b.set(x + 4, 12, 'H');
        b.ent('totem', x + 4, 11);
        if (b.ch(0.5)) b.coins(x + 2, x + 6, 8);
        x += 9;
      }
    }
    const endX = x;
    // keep every trail lively: top up enemies on open ground until the stage has a minimum number
    const want = Math.floor(len / (15 - w * 0.6));
    for (
      let tries = 0;
      tries < 300 && b.ents.filter((e) => e.t !== 'thorn' && e.t !== 'totem').length < want;
      tries++
    ) {
      const ex = b.ri(26, endX - 4);
      if (
        b.get(ex, 13) !== '#' ||
        b.get(ex, 12) !== ' ' ||
        b.get(ex - 1, 12) !== ' ' ||
        b.get(ex + 1, 12) !== ' ' ||
        b.get(ex - 2, 13) !== '#' ||
        b.get(ex + 2, 13) !== '#'
      )
        continue;
      if (b.ents.some((e) => Math.abs(e.x - ex) < 4)) continue;
      foe(ex, 13);
    }
    b.floor(x, x + 27, 13);
    const gx = x + 14;
    goalSteps(b, gx, 13, 'H');
    const W = x + 28;
    groundDeco(b, W, L.WORLDS[w - 1].deco, 5, '#');
    clouds(b, W, 3, 7);
    return {
      w: W,
      goal: { x: gx, y: 13 },
      cp,
      tunnel: tunnel && tunnel.outX !== null ? tunnel : null,
      start: { x: 2, y: 12 },
    };
  }

  /* ---------- HOLLOW (cave) ---------- */
  function genCave(b, w, s, d) {
    const len = 140 + w * 6 + b.ri(0, 12);
    const pool = ['beetle', 'beetle', 'snail', 'urchin'];
    if (w >= 4) pool.push('hopper');
    const foe = (x, top) => b.ent(b.pick(pool), x, top - 1);
    b.floor(0, 13, 13);
    let x = 14,
      cp = null,
      last = '';
    while (x < len) {
      if (!cp && x > len * 0.47) {
        b.floor(x, x + 5, 13);
        cp = { x: x + 2, y: 12 };
        x += 6;
        last = 'cp';
        continue;
      }
      let k = b.pick(['hall', 'hall', 'pit', 'pillars', 'mass', 'lift', 'low', 'stumps']);
      if (k === last && k !== 'hall') k = 'hall';
      if (x < 26 && k === 'lift') k = 'hall';
      last = k;
      if (k === 'hall') {
        const n = b.ri(8, 13);
        b.floor(x, x + n - 1, 13);
        const bl = b.ri(3, 6),
          bx = x + b.ri(1, 3),
          q = b.ri(0, bl - 1);
        let pat = '';
        for (let i = 0; i < bl; i++) pat += i === q ? '?' : 'B';
        b.row(bx, 9, pat);
        if (b.ch(0.5)) b.coins(bx, bx + bl - 1, 8);
        foe(x + n - 2, 13);
        if (b.ch(0.2 + d * 0.6)) foe(x + n - 4, 13);
        if (b.ch(0.3 + d * 0.5)) b.ent('bat', x + n - 1, b.ri(4, 6));
        x += n;
      } else if (k === 'pit') {
        b.floor(x, x + 2, 13);
        const gw = b.ri(2, d < 0.3 ? 3 : 4);
        if (b.ch(0.6)) b.arc(x + 3, gw, 9);
        b.floor(x + 3 + gw, x + 6 + gw, 13);
        x += 7 + gw;
      } else if (k === 'pillars') {
        const n = b.ri(2, 3);
        b.floor(x, x + n * 6 + 1, 13);
        for (let i = 0; i < n; i++) {
          const h = b.ri(2, 3),
            px = x + 2 + i * 6;
          b.fill(px, 13 - h, px + 1, 12, 'H');
          if (b.ch(0.5)) b.coins(px, px + 1, 13 - h - 2);
          if (i < n - 1 && b.ch(0.4 + d * 0.4)) foe(px + 4, 13);
        }
        if (b.ch(0.4 + d * 0.4)) b.ent('bat', x + n * 6, b.ri(4, 6));
        x += n * 6 + 2;
      } else if (k === 'mass') {
        b.floor(x, x + 10, 13);
        b.fill(x + 3, 7, x + 7, 9, 'B');
        b.prize(x + 5, 9);
        b.coins(x + 3, x + 7, 6);
        foe(x + 9, 13);
        x += 11;
      } else if (k === 'lift') {
        b.floor(x, x + 1, 13);
        b.ent('plat', x + 4, 9, { kind: 'v', range: 3, sp: 0.03 });
        b.coins(x + 4, x + 6, 6);
        b.floor(x + 9, x + 11, 13);
        x += 12;
      } else if (k === 'low') {
        const n = b.ri(6, 9);
        b.floor(x, x + n - 1, 13);
        b.fill(x + 1, 2, x + n - 2, 6, '#');
        b.coins(x + 1, x + n - 2, 11);
        if (b.ch(0.4 + d * 0.4)) b.ent('urchin', x + n - 2, 12);
        x += n;
      } else {
        // stumps
        const n = b.ri(1, 2);
        let px = x + 2;
        for (let i = 0; i < n; i++) {
          const h = b.ri(2, 3);
          b.stump(px, h, 13);
          if (b.ch(0.3 + d * 0.5)) b.ent('thorn', px, 13 - h);
          px += b.ri(6, 8);
        }
        b.floor(x, px + 1, 13);
        x = px + 2;
      }
    }
    b.floor(x, x + 27, 13);
    const gx = x + 14;
    goalSteps(b, gx, 13, 'H');
    const W = x + 28;
    b.fill(0, 0, W - 1, 1, '#');
    groundDeco(b, W, ['crystal', 'crystal', 'rock'], 6, '#');
    for (let i = 3; i < W - 2; i += b.ri(4, 9))
      if (b.get(i, 2) === ' ' && b.get(i, 3) === ' ')
        b.deco.push({ k: 'stal', x: i, y: 2, hang: true });
    return { w: W, goal: { x: gx, y: 13 }, cp, tunnel: null, start: { x: 2, y: 12 } };
  }

  /* ---------- LAGOON (water) ---------- */
  function genWater(b, w, s, d) {
    const len = 125 + w * 5 + b.ri(0, 10);
    b.floor(0, 11, 13);
    let x = 12,
      top = 13,
      cp = null;
    while (x < len) {
      if (!cp && x > len * 0.47) {
        b.floor(x, x + 5, top);
        cp = { x: x + 2, y: top - 1 };
        x += 6;
        continue;
      }
      const r = b.R();
      if (r < 0.1 && x > 24) {
        const gw = b.ri(2, 3);
        x += gw;
        b.floor(x, x + 3, top);
        x += 4;
        continue;
      }
      const n = b.ri(4, 8);
      top = clamp(top + b.ri(-1, 1), 10, 13);
      b.floor(x, x + n - 1, top);
      let rock = false;
      if (r < 0.3) {
        const ph = b.ri(2, 4);
        b.fill(x + 2, top - ph, x + 3, top - 1, 'H');
      } else if (r < 0.48) {
        const hh = b.ri(3, 5);
        b.fill(x + 1, 2, x + n - 2, 1 + hh, '#');
        rock = true;
      } else if (r < 0.7) b.coins(x + 1, x + n - 2, b.ri(5, 9));
      else if (r < 0.8) b.prize(x + 2, top - 4);
      if (b.ch(0.45 + d * 0.4)) b.ent('fish', x + n - 1, b.ri(7, top - 2));
      if (!rock && d > 0.1 && b.ch(0.2 + d * 0.3)) b.ent('jelly', x + b.ri(1, n - 1), b.ri(4, 7));
      if (b.ch(0.2 + d * 0.3)) {
        const ex = x + b.ri(1, n - 2);
        if (b.get(ex, top - 1) === ' ') b.ent('urchin', ex, top - 1);
      }
      x += n;
    }
    b.floor(x, x + 27, 13);
    const gx = x + 14;
    const W = x + 28;
    b.fill(0, 0, W - 1, 1, '#');
    for (let i = 3; i < W - 3; i += b.ri(3, 7)) {
      for (let y = 3; y < H; y++) {
        const c = b.get(i, y);
        if (c === '#') {
          if (b.get(i, y - 1) === ' ' && b.get(i, y - 2) === ' ')
            b.deco.push({ k: b.pick(['coral', 'weed', 'weed', 'rock']), x: i, y });
          break;
        }
        if (c !== ' ' && c !== 'o') break;
      }
    }
    return { w: W, goal: { x: gx, y: 13 }, cp, tunnel: null, start: { x: 2, y: 12 } };
  }

  /* ---------- CANOPY (sky) ---------- */
  function genSky(b, w, s, d) {
    const len = 140 + w * 5 + b.ri(0, 10);
    const pool = ['beetle', 'snail', 'hopper'];
    const isl = (x0, wd, top) => {
      b.fill(x0, top, x0 + wd - 1, top + 1, '#');
      const n = wd > 3 ? 2 : 1;
      b.deco.push({ k: 'trunk', x: x0 + Math.floor((wd - n) / 2), y: top + 2, n });
    };
    isl(0, 11, 12);
    let ex = 10,
      top = 12,
      cp = null,
      last = '',
      batAt = 30;
    while (ex < len) {
      if (ex > batAt && d > 0.15) {
        b.ent('bat', ex + 6, b.ri(4, 8));
        batAt = ex + b.ri(22, 34);
      }
      if (!cp && ex > len * 0.47) {
        const nt = clamp(top + b.ri(-1, 1), 6, 12),
          x0 = ex + 3;
        isl(x0, 6, nt);
        cp = { x: x0 + 2, y: nt - 1 };
        ex = x0 + 5;
        top = nt;
        last = 'cp';
        continue;
      }
      const opts = ['isl', 'isl', 'isl', 'planks', 'moverH', 'moverV'];
      if (d >= 0.1) opts.push('fall');
      if (d > 0.5) opts.push('moverH', 'fall');
      let k = b.pick(opts);
      if (k === last && k !== 'isl') k = 'isl';
      last = k;
      if (k === 'isl') {
        const nt = clamp(top + b.ri(-3, 3), 5, 12),
          up = top - nt;
        const g = up >= 3 ? 2 : up >= 2 ? b.ri(2, 3) : b.ri(2, 4);
        const wd = b.ri(3, 7),
          x0 = ex + 1 + g;
        isl(x0, wd, nt);
        if (wd >= 5 && b.ch(0.5 + d * 0.4))
          b.ent(b.pick(pool), x0 + b.ri(2, wd - 2), nt - 1, { careful: true });
        if (b.ch(0.5)) b.arc(ex + 1, g, Math.min(top, nt) - 3);
        if (wd >= 4 && nt >= 8 && b.ch(0.35)) b.prize(x0 + Math.floor(wd / 2), nt - 4);
        ex = x0 + wd - 1;
        top = nt;
      } else if (k === 'planks') {
        const n = b.ri(2, 3);
        let px = ex + 1 + b.ri(2, 3),
          py = clamp(top + b.ri(-2, 1), 6, 12);
        for (let i = 0; i < n; i++) {
          b.fill(px, py, px + 2, py, '=');
          if (b.ch(0.6)) b.coins(px, px + 2, py - 2);
          px += 3 + b.ri(2, 3);
          if (i < n - 1) py = clamp(py + b.ri(-2, 2), 6, 12);
        }
        const nt = clamp(py + b.ri(-1, 2), 5, 12),
          wd = b.ri(4, 6);
        isl(px, wd, nt);
        ex = px + wd - 1;
        top = nt;
      } else if (k === 'moverH') {
        const gp = b.ri(7, 9),
          x0 = ex + 1 + gp;
        b.ent('plat', ex + 2, top, { kind: 'h', range: gp - 5, sp: 0.02 + d * 0.008 });
        b.coins(ex + 3, ex + gp - 2, top - 3);
        const wd = b.ri(4, 6);
        isl(x0, wd, top);
        if (wd >= 5 && b.ch(d)) b.ent(b.pick(pool), x0 + 3, top - 1, { careful: true });
        ex = x0 + wd - 1;
      } else if (k === 'moverV') {
        let nt = top + b.pick([-4, -3, 3, 4]);
        if (nt < 5) nt = top + 3;
        if (nt > 12) nt = top - 3;
        nt = clamp(nt, 5, 12);
        const lo = Math.min(top, nt),
          x0 = ex + 7;
        b.ent('plat', ex + 3, lo, { kind: 'v', range: Math.abs(top - nt), sp: 0.025 });
        const wd = b.ri(4, 6);
        isl(x0, wd, nt);
        ex = x0 + wd - 1;
        top = nt;
      } else {
        // falling platforms
        b.ent('plat', ex + 3, top, { kind: 'f' });
        b.ent('plat', ex + 8, top, { kind: 'f' });
        b.coins(ex + 3, ex + 10, top - 3);
        const x0 = ex + 13,
          wd = b.ri(4, 6),
          nt = clamp(top + b.ri(0, 1), 5, 12);
        isl(x0, wd, nt);
        ex = x0 + wd - 1;
        top = nt;
      }
    }
    const x0 = ex + 4;
    b.fill(x0, 12, x0 + 27, 14, '#');
    const gx = x0 + 14;
    goalSteps(b, gx, 12, 'H');
    const W = x0 + 28;
    clouds(b, W, 2, 13);
    clouds(b, W, 5, 14);
    for (let i = x0 + 3; i < W - 3; i += 6)
      if (Math.abs(i - gx) > 7) b.deco.push({ k: b.pick(L.WORLDS[w - 1].deco), x: i, y: 12 });
    return { w: W, goal: { x: gx, y: 12 }, cp, tunnel: null, start: { x: 2, y: 11 } };
  }

  /* ---------- FORGE (castle + boss) ---------- */
  function genForge(b, w, s, d) {
    const len = 105 + w * 6 + b.ri(0, 10),
      FT = 11;
    const fl = (x0, x1) => b.fill(x0, FT, x1, H - 1, 'X');
    const lava = (x0, x1) => {
      b.fill(x0, 13, x1, 13, '~');
      b.fill(x0, 14, x1, 14, 'L');
    };
    const pool = ['beetle', 'urchin', 'beetle'];
    fl(0, 11);
    let x = 12,
      last = '';
    while (x < len) {
      const opts = ['hall', 'lavagap', 'lavagap', 'stones', 'mover', 'jets', 'ledge'];
      if (w >= 4) opts.push('totem');
      let k = b.pick(opts);
      if (k === last) k = 'hall';
      if (x < 20 && k !== 'hall' && k !== 'lavagap') k = 'hall';
      last = k;
      if (k === 'hall') {
        const n = b.ri(6, 10);
        fl(x, x + n - 1);
        if (b.ch(0.5 + d * 0.4)) b.ent(b.pick(pool), x + n - 2, FT - 1);
        if (b.ch(0.4)) b.fill(x + 2, 3, x + n - 3, 5, 'X');
        if (b.ch(0.6)) b.coins(x + 2, x + n - 3, 8);
        x += n;
      } else if (k === 'lavagap') {
        fl(x, x + 1);
        const gw = b.ri(2, d < 0.4 ? 3 : 4);
        lava(x + 2, x + 1 + gw);
        if (b.ch(0.3 + d * 0.5))
          b.ent('wisp', x + 2 + Math.floor(gw / 2), 13, { ph: b.ri(0, 100) });
        fl(x + 2 + gw, x + 4 + gw);
        x += gw + 5;
      } else if (k === 'stones') {
        fl(x, x + 1);
        let px = x + 2;
        const n = b.ri(2, 3);
        for (let i = 0; i < n; i++) {
          const g = b.ri(2, 3);
          lava(px, px + g - 1);
          if (b.ch(0.2 + d * 0.5)) b.ent('wisp', px + 1, 13, { ph: b.ri(0, 100) });
          px += g;
          b.fill(px, FT - b.ri(0, 1), px + 1, H - 1, 'X');
          px += 2;
        }
        const g = b.ri(2, 3);
        lava(px, px + g - 1);
        px += g;
        fl(px, px + 2);
        x = px + 3;
      } else if (k === 'mover') {
        fl(x, x + 1);
        const gp = b.ri(7, 9);
        lava(x + 2, x + 1 + gp);
        b.ent('plat', x + 3, FT, { kind: 'h', range: gp - 5, sp: 0.02 + d * 0.006 });
        if (b.ch(d)) b.ent('wisp', x + 2 + Math.floor(gp / 2), 13, { ph: b.ri(0, 100) });
        b.coins(x + 4, x + gp - 1, FT - 3);
        fl(x + 2 + gp, x + 4 + gp);
        x += gp + 5;
      } else if (k === 'jets') {
        const n = b.ri(7, 10);
        fl(x, x + n - 1);
        const nj = n >= 9 ? 3 : 2;
        for (let i = 0; i < nj; i++) b.ent('jet', x + 2 + i * 3, FT, { ph: i * 50 + b.ri(0, 20) });
        x += n;
      } else if (k === 'ledge') {
        const n = b.ri(8, 11);
        fl(x, x + n - 1);
        b.fill(x + 2, 7, x + n - 3, 7, 'X');
        b.coins(x + 2, x + n - 3, 6);
        if (b.ch(0.5)) b.prize(x + 1, 7);
        b.ent(b.pick(pool), x + n - 2, FT - 1);
        x += n;
      } else {
        // totem
        fl(x, x + 8);
        b.set(x + 4, FT - 1, 'X');
        b.ent('totem', x + 4, FT - 2);
        x += 9;
      }
    }
    fl(x, x + 9);
    const cp = { x: x + 3, y: FT - 1 };
    b.prize(x + 6, FT - 4, 'power');
    x += 10;
    const a0 = x;
    fl(a0, a0 + 21);
    b.fill(a0 + 20, 0, a0 + 21, H - 1, 'X');
    const W = a0 + 22;
    b.fill(0, 0, W - 1, 2, 'X');
    for (let i = 5; i < W - 3; i += b.ri(6, 10)) {
      if (b.get(i, 3) === ' ' && b.get(i, 6) === ' ' && b.get(i, FT) === 'X')
        b.deco.push({ k: b.pick(['window', 'torch', 'chain', 'torch']), x: i, y: b.pick([7, 8]) });
    }
    return {
      w: W,
      goal: null,
      cp,
      tunnel: null,
      start: { x: 2, y: FT - 1 },
      boss: { x0: a0, x1: a0 + 20, top: FT },
    };
  }

  /* ---------- hidden bonus room ---------- */
  function genBonus(b) {
    b.fill(0, 0, 19, 1, '#');
    b.fill(0, 13, 19, 14, '#');
    b.fill(0, 2, 0, 12, '#');
    b.fill(19, 2, 19, 10, '#');
    b.fill(5, 9, 14, 9, 'B');
    b.contents['9,9'] = 'multi';
    b.coins(5, 14, 8);
    b.coins(4, 15, 12);
    b.coins(5, 14, 11);
    b.coins(6, 13, 5);
    b.deco.push({ k: 'arrow', x: 17, y: 10 });
    b.deco.push({ k: 'crystal', x: 2, y: 13 });
    b.deco.push({ k: 'crystal', x: 16, y: 13 });
    const a = b.finish(20);
    a.start = { x: 2, y: 3 };
    return a;
  }

  L.build = function (w, s) {
    const kind = L.stageKind(w, s),
      b = new Bld(rng(w * 1000 + s * 37 + 11)),
      d = ((w - 1) * 4 + (s - 1)) / 31;
    const gen = { over: genOver, cave: genCave, water: genWater, sky: genSky, forge: genForge }[
      kind
    ];
    const info = gen(b, w, s, d),
      main = b.finish(info.w);
    main.water = kind === 'water';
    // Supplies are authored onto the safe starting runway and checkpoint floor.
    const supplies = [
      { x: 5, y: info.start.y, kind: 'blaster' },
      { x: 9, y: info.start.y, kind: 'shard' },
    ];
    if (info.cp)
      supplies.push(
        { x: info.cp.x + 1, y: info.cp.y, kind: 'blaster' },
        { x: info.cp.x + 2, y: info.cp.y, kind: 'shard' },
      );
    for (const item of supplies) {
      if (main.g[item.y][item.x] !== ' ')
        throw new Error('Supply placement obstructed: ' + w + '-' + s);
      main.ents.push({ t: 'item', ...item, stationary: true });
    }
    // A visible weapon upgrade rewards reaching the checkpoint.
    if (info.cp)
      main.ents.push({
        t: 'item',
        x: info.cp.x,
        y: info.cp.y - 2,
        kind: 'pulse',
        stationary: true,
      });
    const lvl = {
      world: w,
      stage: s,
      kind,
      main,
      bonus: null,
      tunnel: info.tunnel,
      start: info.start,
      cp: info.cp,
      goal: info.goal,
      boss: info.boss || null,
      time: kind === 'water' || kind === 'forge' ? 350 : 300,
      music: kind,
      name: L.WORLDS[w - 1].name + ' ' + L.KIND_NAME[kind],
    };
    if (lvl.tunnel) lvl.bonus = genBonus(new Bld(rng(w * 77 + s)));
    return lvl;
  };
})();
