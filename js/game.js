/* Nova Rift — fixed-step simulation. Presentation lives in renderer.mjs and ui.js. */
(function () {
  'use strict';
  const G = window.G,
    A = G.Audio,
    L = G.Levels;
  const T = 16,
    VW = 320,
    VH = 240,
    ROWS = 15;
  G.debug = G.debug || { god: false, onPit: null };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = Math.random;

  /* ================= input ================= */
  const KEYMAP = {
    ArrowLeft: 'left',
    KeyA: 'left',
    ArrowRight: 'right',
    KeyD: 'right',
    ArrowUp: 'up',
    KeyW: 'up',
    ArrowDown: 'down',
    KeyS: 'down',
    KeyZ: 'jump',
    Space: 'jump',
    KeyK: 'jump',
    KeyX: 'fire',
    ShiftLeft: 'run',
    ShiftRight: 'run',
    KeyJ: 'fire',
    Enter: 'start',
    KeyP: 'pause',
    Escape: 'pause',
    KeyM: 'mute',
    KeyF: 'full',
    KeyH: 'help',
  };
  const held = {},
    key = {},
    pressed = {};
  function refreshKey(k) {
    key[k] = false;
    for (const c in KEYMAP)
      if (KEYMAP[c] === k && held[c]) {
        key[k] = true;
        break;
      }
  }
  window.addEventListener('keydown', (e) => {
    if (e.target && ['SELECT', 'INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
    A.unlock();
    if (e.target && e.target.tagName === 'BUTTON' && (e.code === 'Enter' || e.code === 'Space'))
      return;
    const k = KEYMAP[e.code];
    if (!k || e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault();
    if (e.repeat) return;
    held[e.code] = true;
    key[k] = true;
    pressed[k] = true;
    if (k === 'full') toggleFull();
  });
  window.addEventListener('keyup', (e) => {
    const k = KEYMAP[e.code];
    if (!k) return;
    held[e.code] = false;
    refreshKey(k);
  });
  window.addEventListener('blur', () => {
    for (const c in held) held[c] = false;
    for (const k in key) key[k] = false;
    if (game.state === 'play') setPause(true);
  });
  window.addEventListener('pointerdown', () => A.unlock());

  /* ================= state ================= */
  // Keep the original key so existing world unlocks and best scores survive the upgrade.
  const SAVE_KEY = 'foxfire.save.v1';
  const game = {
    weapon: 0,
    hero: 0,
    damageTaken: 0,
    stageCoins: 0,
    totalCoins: 0,
    medals: [],
    celebration: false,
    state: 'title',
    t: 0,
    world: 1,
    stage: 1,
    lives: 3,
    score: 0,
    coins: 0,
    hi: 0,
    maxWorld: 1,
    time: 300,
    tacc: 0,
    cp: null,
    pw: 0,
    menu: 0,
    selWorld: 1,
    freeze: 0,
    hurry: false,
    bossOn: false,
    bossDead: false,
    gphase: 0,
    flameY: 0,
    worldClear: false,
    toast: null,
    warp: null,
    helpFrom: 'title',
    lit: false,
  };
  let lvl = null,
    area = null,
    P = null;
  const cam = { x: 0 };
  function loadSave() {
    try {
      const stored = localStorage.getItem(SAVE_KEY);
      if (stored === null) return; // A first visit has no progress to restore.
      const saved = JSON.parse(stored);
      if (saved === null || typeof saved !== 'object' || Array.isArray(saved))
        throw new Error('Invalid save object.');
      const { hi = 0, maxWorld = 1, muted = false } = saved;
      if (
        !Number.isSafeInteger(hi) ||
        hi < 0 ||
        !Number.isInteger(maxWorld) ||
        maxWorld < 1 ||
        maxWorld > 8 ||
        typeof muted !== 'boolean'
      )
        throw new Error('Invalid saved progress.');
      // Apply only after every field passes validation; never restore a partial save.
      game.hi = hi;
      game.maxWorld = maxWorld;
      A.setMute(muted);
    } catch (error) {
      game.storageError = 'Saved progress could not be read. This session starts fresh.';
      console.warn(game.storageError, error);
    }
  }
  function writeSave() {
    try {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({ hi: game.hi, maxWorld: game.maxWorld, muted: A.muted }),
      );
    } catch (e) {
      game.storageError = 'Progress cannot be saved. Keep this tab open to continue your session.';
      console.warn(game.storageError, e);
    }
  }
  function toast(txt) {
    game.toast = { txt, t: 110 };
  }

  /* ================= tiles ================= */
  const SOLID = { '#': 1, B: 1, '?': 1, U: 1, H: 1, X: 1, l: 1, r: 1, '[': 1, ']': 1 };
  function tileAt(tx, ty) {
    if (tx < 0 || tx >= area.w) return 'H';
    if (ty < 0 || ty >= ROWS) return ' ';
    return area.g[ty][tx];
  }
  function setTile(tx, ty, c) {
    if (tx >= 0 && tx < area.w && ty >= 0 && ty < ROWS) area.g[ty][tx] = c;
  }
  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function moveX(e, dx) {
    if (!dx) return false;
    e.x += dx;
    const y0 = Math.floor(e.y / T),
      y1 = Math.floor((e.y + e.h - 0.01) / T);
    if (dx > 0) {
      const tx = Math.floor((e.x + e.w - 0.01) / T);
      for (let ty = y0; ty <= y1; ty++)
        if (SOLID[tileAt(tx, ty)]) {
          e.x = tx * T - e.w;
          return true;
        }
    } else {
      const tx = Math.floor(e.x / T);
      for (let ty = y0; ty <= y1; ty++)
        if (SOLID[tileAt(tx, ty)]) {
          e.x = (tx + 1) * T;
          return true;
        }
    }
    return false;
  }
  function moveY(e, dy, hidden) {
    e.onGround = false;
    const prevB = e.y + e.h,
      prevT = e.y;
    e.y += dy;
    const x0 = Math.floor(e.x / T),
      x1 = Math.floor((e.x + e.w - 0.01) / T);
    if (dy > 0) {
      const ty = Math.floor((e.y + e.h - 0.01) / T);
      for (let tx = x0; tx <= x1; tx++) {
        const c = tileAt(tx, ty);
        if (SOLID[c] || (c === '=' && prevB <= ty * T + 0.01)) {
          e.y = ty * T - e.h;
          e.vy = 0;
          e.onGround = true;
          return 1;
        }
      }
    } else if (dy < 0) {
      const ty = Math.floor(e.y / T);
      for (let tx = x0; tx <= x1; tx++) {
        const c = tileAt(tx, ty);
        if (SOLID[c] || (hidden && c === 'I' && prevT >= (ty + 1) * T - 0.01)) {
          e.y = (ty + 1) * T;
          e.vy = 0;
          return -1;
        }
      }
    }
    return 0;
  }

  /* ================= particles / scoring ================= */
  function part(o) {
    area.parts.push(o);
    return o;
  }
  function puff(x, y) {
    part({ k: 'puff', x, y, t: 0, life: 14 });
  }
  function sparkle(x, y, col, n) {
    for (let i = 0; i < (n || 6); i++)
      part({
        k: 'spk',
        x,
        y,
        vx: (rnd() - 0.5) * 3,
        vy: (rnd() - 0.8) * 3,
        t: 0,
        life: 18 + rnd() * 18,
        col,
      });
  }
  function addScore(n, x, y) {
    game.score += n;
    if (game.score > game.hi) game.hi = game.score;
    if (x !== undefined) part({ k: 'txt', x, y, t: 0, life: 48, txt: String(n) });
  }
  function addLife(x, y) {
    game.lives++;
    A.sfx('life');
    if (x !== undefined) part({ k: 'txt', x, y, t: 0, life: 60, txt: '1UP', col: '#8aff6a' });
  }
  function addCoin() {
    game.stageCoins++;
    game.coins++;
    game.score += 200;
    if (game.score > game.hi) game.hi = game.score;
    A.sfx('coin');
    if (game.coins >= 100) {
      game.coins -= 100;
      addLife(P.x, P.y - 12);
    }
  }
  const COMBO = [100, 200, 400, 800, 1000, 2000, 4000, 8000];
  function comboScore(e, src) {
    const c = src.combo || 0;
    if (c >= COMBO.length) addLife(e.x, e.y - 8);
    else addScore(COMBO[c], e.x, e.y - 8);
    src.combo = c + 1;
  }
  function killFlip(e, dir) {
    e.flip = true;
    e.vy = -3.6;
    e.vx = (dir || 1) * 1.1;
    A.sfx('kick');
  }

  /* ================= entities ================= */
  const ET = {};
  function walk(e) {
    e.vy = Math.min(e.vy + 0.3, 4.5);
    if (moveX(e, e.vx)) e.vx = -e.vx;
    moveY(e, e.vy);
    if (e.careful && e.onGround) {
      const fx = e.vx < 0 ? e.x - 1 : e.x + e.w + 1,
        ty = Math.floor((e.y + e.h + 1) / T),
        c = tileAt(Math.floor(fx / T), ty);
      if (!SOLID[c] && c !== '=') e.vx = -e.vx;
    }
    e.dir = e.vx < 0 ? -1 : 1;
  }

  ET.beetle = {
    w: 12,
    h: 12,
    stomp: true,
    init(e) {
      e.vx = -0.5;
    },
    update(e) {
      if (e.state === 1) {
        if (++e.timer > 28) e.dead = true;
        return;
      }
      walk(e);
    },
    pre(e) {
      return e.state === 1;
    },
    onStomp(e) {
      e.state = 1;
      e.timer = 0;
      e.vx = 0;
      A.sfx('stomp');
    },
  };
  ET.snail = {
    w: 12,
    h: 13,
    stomp: true,
    init(e, d) {
      e.vx = -0.45;
      e.careful = !!d.careful;
      e.grace = 0;
    },
    update(e) {
      if (e.grace > 0) e.grace--;
      if (e.state === 0) {
        walk(e);
        return;
      }
      e.vy = Math.min(e.vy + 0.3, 4.5);
      if (e.state === 1) {
        e.vx = 0;
        moveY(e, e.vy);
        if (++e.timer > 460) {
          e.state = 0;
          e.vx = -0.45;
        }
        return;
      }
      if (moveX(e, e.vx)) {
        e.vx = -e.vx;
        if (Math.abs(e.x - cam.x - VW / 2) < VW / 2 + 16) A.sfx('bump');
      }
      moveY(e, e.vy);
      for (const o of area.ents) {
        if (o === e || o.dead || o.flip || !o.active) continue;
        const td = ET[o.t];
        if (td.shell === false || td.noTouch || td.isItem) continue;
        if (overlap(e, o)) {
          killFlip(o, e.vx > 0 ? 1 : -1);
          comboScore(o, e);
        }
      }
      if (e.x < cam.x - 240 || e.x > cam.x + VW + 240) e.dead = true;
    },
    pre(e) {
      if (e.state !== 1) return false;
      if (e.grace > 0) return true;
      e.state = 2;
      e.vx = P.x + P.w / 2 < e.x + e.w / 2 ? 3.2 : -3.2;
      e.grace = 14;
      e.combo = 0;
      A.sfx('kick');
      addScore(400, e.x, e.y - 8);
      if (P.vy > 0 && P.y + P.h - e.y < 10) P.vy = -3;
      return true;
    },
    onStomp(e) {
      A.sfx('stomp');
      if (e.state === 0) {
        e.state = 1;
        e.timer = 0;
        e.vx = 0;
      } else {
        e.state = 1;
        e.timer = 0;
        e.vx = 0;
      }
      e.grace = 10;
    },
    harm(e) {
      return e.state === 0 || (e.state === 2 && e.grace <= 0);
    },
  };
  ET.urchin = {
    w: 12,
    h: 12,
    stomp: false,
    init(e) {
      e.vx = -0.4;
    },
    update(e) {
      walk(e);
    },
  };
  ET.hopper = {
    w: 12,
    h: 11,
    stomp: true,
    init(e) {
      e.timer = 30 + rnd() * 50;
    },
    update(e) {
      e.vy = Math.min(e.vy + 0.28, 4.5);
      if (e.onGround) {
        e.vx = 0;
        if (--e.timer <= 0) {
          e.dir = P.x < e.x ? -1 : 1;
          e.vy = -4.3;
          e.vx = e.dir * 1.1;
          e.timer = 50 + rnd() * 50;
        }
      }
      if (moveX(e, e.vx)) e.vx = -e.vx;
      moveY(e, e.vy);
    },
    onStomp(e) {
      A.sfx('stomp');
      killFlip(e, 0);
      e.vy = 0;
    },
  };
  ET.bat = {
    w: 14,
    h: 9,
    stomp: true,
    far: true,
    init(e) {
      e.by = e.y;
      e.vx = -0.9;
    },
    update(e) {
      e.x += e.vx;
      e.y = e.by + Math.sin(area.t * 0.07 + e.by) * 18;
      if (e.x < cam.x - 90) e.dead = true;
    },
    onStomp(e) {
      A.sfx('stomp');
      killFlip(e, 0);
      e.vy = 0;
    },
  };
  ET.thorn = {
    w: 12,
    h: 20,
    stomp: false,
    behind: true,
    bumpable: false,
    shell: false,
    init(e, d) {
      e.x = d.x * T + 10;
      e.baseY = d.y * T;
      e.y = e.baseY + 2;
      e.timer = Math.floor(rnd() * 80);
    },
    update(e) {
      const cyc = 230,
        ph = e.timer % cyc;
      if (ph === 80 && Math.abs(P.x + P.w / 2 - (e.x + e.w / 2)) < 30) return; // stays hidden while Kip is close
      e.timer++;
      let up = 0;
      if (ph >= 80 && ph < 110) up = (ph - 80) / 30;
      else if (ph >= 110 && ph < 190) up = 1;
      else if (ph >= 190 && ph < 220) up = 1 - (ph - 190) / 30;
      e.y = e.baseY + 2 - up * 24;
    },
    harm(e) {
      return e.y < e.baseY - 6;
    },
  };
  ET.fish = {
    w: 12,
    h: 8,
    stomp: false,
    far: true,
    init(e) {
      e.by = e.y;
      e.vx = -(0.5 + rnd() * 0.5);
    },
    update(e) {
      e.x += e.vx;
      e.y = e.by + Math.sin(area.t * 0.05 + e.by) * 6;
      if (e.x < cam.x - 90) e.dead = true;
    },
  };
  ET.jelly = {
    w: 12,
    h: 12,
    stomp: false,
    init(e) {
      e.timer = Math.floor(rnd() * 100);
    },
    update(e) {
      e.timer++;
      const ph = e.timer % 110;
      e.y += ph < 64 ? 0.32 : -1.05;
      e.x += Math.sign(P.x + P.w / 2 - (e.x + e.w / 2)) * 0.22;
      e.y = clamp(e.y, 2 * T + 2, 11 * T);
    },
  };
  ET.wisp = {
    w: 10,
    h: 12,
    stomp: false,
    kill: false,
    sparkable: false,
    shell: false,
    bumpable: false,
    init(e, d) {
      e.x = d.x * T + 3;
      e.baseY = d.y * T + 6;
      e.y = e.baseY;
      e.timer = d.ph || 0;
    },
    update(e) {
      if (e.state === 0) {
        if (--e.timer <= 0) {
          e.state = 1;
          e.vy = -5.2;
        }
        return;
      }
      e.vy += 0.15;
      e.y += e.vy;
      if (e.y >= e.baseY) {
        e.y = e.baseY;
        e.state = 0;
        e.timer = 70 + rnd() * 60;
      }
    },
    harm(e) {
      return e.state === 1;
    },
  };
  ET.jet = {
    w: 10,
    h: 0,
    stomp: false,
    kill: false,
    sparkable: false,
    shell: false,
    bumpable: false,
    init(e, d) {
      e.x = d.x * T + 3;
      e.baseY = d.y * T;
      e.y = e.baseY;
      e.ph = d.ph || 0;
    },
    update(e) {
      const ph = (area.t + e.ph) % 150;
      e.on = ph >= 90;
      e.warn = ph >= 66 && ph < 90;
      if (ph === 90 && Math.abs(e.x - P.x) < 200) A.sfx('flame');
      if (e.on) {
        e.h = 42;
        e.y = e.baseY - 42;
      } else {
        e.h = 0;
        e.y = e.baseY;
      }
    },
    harm(e) {
      return e.on;
    },
  };
  ET.totem = {
    w: 16,
    h: 16,
    stomp: false,
    kill: false,
    sparkable: false,
    shell: false,
    bumpable: false,
    harmless: true,
    init(e, d) {
      e.x = d.x * T;
      e.y = d.y * T;
      e.timer = 60 + Math.floor(rnd() * 60);
    },
    update(e) {
      if (--e.timer > 0) return;
      e.timer = 150;
      const dx = P.x + P.w / 2 - (e.x + 8);
      if (Math.abs(dx) > 230 || Math.abs(dx) < 26) {
        e.timer = 30;
        return;
      }
      const o = spawn({ t: 'orb', x: 0, y: 0 });
      o.x = dx < 0 ? e.x - 8 : e.x + 14;
      o.y = e.y + 4;
      o.vx = dx < 0 ? -1.3 : 1.3;
      o.active = true;
      area.ents.push(o);
      A.sfx('spark');
    },
  };
  ET.orb = {
    w: 10,
    h: 10,
    stomp: false,
    sparkable: false,
    shell: false,
    bumpable: false,
    far: true,
    update(e) {
      e.x += e.vx;
      e.vy = 0;
      if (++e.timer > 420) e.dead = true;
    },
  };
  ET.ember = {
    w: 10,
    h: 10,
    stomp: false,
    kill: false,
    sparkable: false,
    shell: false,
    bumpable: false,
    far: true,
    update(e) {
      e.vy += 0.15;
      e.x += e.vx;
      if (moveY(e, e.vy) === 1 || ++e.timer > 300) {
        e.dead = true;
        puff(e.x + 5, e.y + 8);
      }
    },
  };
  ET.plat = {
    w: 48,
    h: 8,
    always: true,
    noTouch: true,
    shell: false,
    bumpable: false,
    sparkable: false,
    init(e, d) {
      e.bx = d.x * T;
      e.by = d.y * T;
      e.x = e.bx;
      e.y = e.by;
      e.kind = d.kind;
      e.range = (d.range || 0) * T;
      e.sp = d.sp || 0.02;
      e.dx = 0;
      e.dy = 0;
    },
    update(e) {
      const ox = e.x,
        oy = e.y,
        k = 0.5 - 0.5 * Math.cos(area.t * e.sp);
      if (e.kind === 'h') e.x = e.bx + e.range * k;
      else if (e.kind === 'v') e.y = e.by + e.range * k;
      else if (e.ridden) {
        if (++e.timer > 22) {
          e.vy = Math.min(e.vy + 0.2, 3.5);
          e.y += e.vy;
        }
        if (e.y > VH + 40) e.dead = true;
      }
      e.dx = e.x - ox;
      e.dy = e.y - oy;
    },
  };
  ET.cp = {
    w: 16,
    h: 32,
    always: true,
    noTouch: true,
    shell: false,
    bumpable: false,
    sparkable: false,
    update(e) {
      if (
        !e.lit &&
        P.x + P.w > e.x &&
        P.x < e.x + e.w + 16 &&
        Math.abs(P.y + P.h - (e.y + e.h)) < 32
      ) {
        e.lit = true;
        game.cp = { x: lvl.cp.x, y: lvl.cp.y };
        A.sfx('beacon');
        toast('CHECKPOINT');
        sparkle(e.x + 8, e.y + 6, '#ffd23a', 10);
      }
    },
  };
  ET.item = {
    w: 12,
    h: 13,
    noTouch: false,
    shell: false,
    sparkable: false,
    isItem: true,
    init(e, d) {
      e.kind = d.kind;
      e.stationary = !!d.stationary;
      e.emerge = 0;
    },
    update(e) {
      if (e.stationary) return;
      if (e.emerge > 0) {
        e.y -= 0.5;
        if (--e.emerge === 0) {
          e.behind = false;
          if (e.kind === 'acorn' || e.kind === 'leaf') e.vx = 0.8;
          else if (e.kind === 'shard') e.vx = 1.1;
        }
        return;
      }
      e.vy = Math.min(e.vy + 0.25, 4);
      if (moveX(e, e.vx)) e.vx = -e.vx;
      moveY(e, e.vy);
      if (e.kind === 'shard' && e.onGround) e.vy = -3.4;
      if (e.y > VH + 20) e.dead = true;
    },
  };
  ET.shot = {
    w: 8,
    h: 8,
    noTouch: true,
    shell: false,
    bumpable: false,
    sparkable: false,
    far: true,
    update(e) {
      e.vy = 0;
      if (moveX(e, e.vx) || ++e.timer > 110) {
        e.dead = true;
        puff(e.x + 4, e.y + 4);
        return;
      }
      e.y += e.vy;
      for (const o of area.ents) {
        if (o === e || o.dead || o.flip || !o.active) continue;
        const td = ET[o.t];
        if (td.noTouch || td.isItem || !overlap(e, o)) continue;
        if (o.t === 'boss') {
          bossDamage(o, game.weapon === 2 ? 2 : 1);
          e.dead = true;
          puff(e.x + 4, e.y + 4);
          return;
        }
        if (o.t === 'totem') setTile(Math.floor(o.x / T), Math.floor(o.y / T), ' ');
        killFlip(o, e.vx > 0 ? 1 : -1);
        addScore(200, o.x, o.y - 8);
        e.dead = true;
        puff(e.x + 4, e.y + 4);
        return;
      }
      if (Math.abs(e.x - P.x) > VW + 32) e.dead = true;
    },
  };
  ET.boss = {
    w: 26,
    h: 30,
    stomp: true,
    kill: false,
    shell: false,
    bumpable: false,
    sparkable: false,
    always: true,
    init(e) {
      e.hp = 9 + 3 * Math.floor((game.world - 1) / 3);
      e.max = e.hp;
      e.cd = 100;
      e.invT = 0;
      e.flash = 0;
    },
    update(e) {
      if (e.state === 9) {
        e.timer++;
        if (e.timer % 5 === 0) {
          puff(e.x + rnd() * e.w, e.y + rnd() * e.h);
          sparkle(e.x + rnd() * e.w, e.y + rnd() * e.h, '#ff9a2a', 3);
        }
        if (e.timer > 90) {
          e.dead = true;
          bossDefeated();
        }
        return;
      }
      if (e.invT > 0) e.invT--;
      if (e.flash > 0) e.flash--;
      const dirTo = P.x + P.w / 2 < e.x + e.w / 2 ? -1 : 1,
        sp = 0.45 + game.world * 0.05 + (1 - e.hp / e.max) * 0.5;
      if (e.onGround) {
        e.dir = dirTo;
        e.vx = dirTo * sp;
        if (--e.cd <= 0) {
          if (rnd() < 0.5) {
            e.vy = -5.6;
            e.vx = dirTo * 1.4;
            A.sfx('bossjump');
          } else {
            const o = spawn({ t: 'ember', x: 0, y: 0 });
            o.x = e.x + e.w / 2 - 5;
            o.y = e.y;
            o.vx = dirTo * (1.1 + rnd() * 1.5);
            o.vy = -3.9;
            o.active = true;
            area.ents.push(o);
            A.sfx('spark');
          }
          e.cd = Math.max(46, 130 - game.world * 8) + rnd() * 40;
        }
      }
      e.vy = Math.min(e.vy + 0.3, 5);
      if (moveX(e, e.vx)) e.vx = 0;
      e.x = clamp(e.x, area.lockL, area.lockR - e.w);
      moveY(e, e.vy);
    },
    onStomp(e) {
      if (e.invT <= 0) {
        bossDamage(e, 3);
        e.invT = 50;
      } else A.sfx('bump');
    },
    harm(e) {
      return e.state !== 9;
    },
  };
  function bossDamage(e, n) {
    if (e.state === 9) return;
    e.hp -= n;
    e.flash = 8;
    A.sfx('bosshit');
    if (e.hp <= 0) {
      e.hp = 0;
      e.state = 9;
      e.timer = 0;
      e.vx = 0;
      for (const o of area.ents) if (o.t === 'ember' || o.t === 'orb') o.dead = true;
      addScore(5000, e.x, e.y - 10);
      A.stop();
    }
  }

  function spawn(d) {
    const td = ET[d.t],
      e = {
        t: d.t,
        w: td.w,
        h: td.h,
        vx: 0,
        vy: 0,
        dir: -1,
        timer: 0,
        state: 0,
        onGround: false,
        active: !!td.always,
        dead: false,
        flip: false,
        behind: !!td.behind,
      };
    e.x = d.x * T + (T - e.w) / 2;
    e.y = (d.y + 1) * T - e.h;
    if (td.init) td.init(e, d);
    return e;
  }
  function initArea(a) {
    if (!a.defs) a.defs = a.ents;
    a.ents = a.defs.map(spawn);
    a.parts = [];
    a.bumps = [];
    a.multi = {};
    a.t = 0;
    a.lockL = 0;
    a.lockR = a.w * T;
  }

  /* ================= player ================= */
  function newPlayer() {
    return {
      x: 0,
      y: 0,
      w: 12,
      h: game.pw > 0 ? 27 : 14,
      vx: 0,
      vy: 0,
      face: 1,
      onGround: false,
      inv: 0,
      star: 0,
      crouch: false,
      anim: 0,
      coyote: 0,
      jbuf: 0,
      jumping: false,
      combo: 0,
      ride: null,
      dead: false,
      fireCd: 0,
      behind: false,
      skid: false,
    };
  }
  function canStand() {
    const y0 = Math.floor((P.y - 13) / T),
      y1 = Math.floor((P.y - 0.01) / T),
      x0 = Math.floor(P.x / T),
      x1 = Math.floor((P.x + P.w - 0.01) / T);
    for (let ty = y0; ty <= y1; ty++)
      for (let tx = x0; tx <= x1; tx++) if (SOLID[tileAt(tx, ty)]) return false;
    return true;
  }
  function setSize() {
    const big = game.pw > 0;
    if (big && P.h === 14 && !P.crouch) {
      if (canStand()) {
        P.h = 27;
        P.y -= 13;
      } else P.crouch = true;
    } else if (!big) {
      if (P.h === 27) {
        P.y += 13;
        P.h = 14;
      }
      P.crouch = false;
    }
  }
  function hurt() {
    if (P.inv > 0 || P.star > 0 || G.debug.god || game.state !== 'play') return;
    game.damageTaken++;
    if (game.pw > 0) {
      game.pw = 0;
      setSize();
      P.inv = 130;
      A.sfx('hurt');
      game.freeze = 18;
    } else die();
  }
  function die() {
    if (game.state !== 'play' && game.state !== 'warp') return;
    game.state = 'dying';
    game.t = 0;
    P.dead = true;
    game.damageTaken++;
    game.weapon = 0;
    P.vx = 0;
    P.vy = 0;
    game.pw = 0;
    P.star = 0;
    P.h = 14;
    P.crouch = false;
    A.tempo(1);
    A.jingle('die');
  }
  function levelMusic() {
    if (P && P.star > 0) return 'star';
    if (lvl.bonus && area === lvl.bonus) return 'cave';
    if (game.bossOn && !game.bossDead) return 'boss';
    return lvl.music;
  }
  function playMusic() {
    A.tempo(game.hurry ? 1.28 : 1);
    A.play(levelMusic());
  }

  function collect(e) {
    e.dead = true;
    if (e.kind === 'blaster' || e.kind === 'pulse') {
      game.weapon = e.kind === 'pulse' ? 2 : Math.max(game.weapon, 1);
      addScore(500, e.x, e.y);
      A.sfx('power');
      toast(game.weapon === 2 ? 'PULSE RIFLE EQUIPPED' : 'BLASTER EQUIPPED · HOLD X TO FIRE');
    } else if (e.kind === 'acorn') {
      addScore(1000, e.x, e.y - 8);
      A.sfx('power');
      if (game.pw === 0) {
        game.pw = 1;
        setSize();
        game.freeze = 24;
      }
    } else if (e.kind === 'pepper') {
      addScore(1000, e.x, e.y - 8);
      A.sfx('power');
      if (game.pw < 2) {
        game.pw = 2;
        game.weapon = 2;
        setSize();
        game.freeze = 24;
      }
    } else if (e.kind === 'shard') {
      addScore(1000, e.x, e.y - 8);
      A.sfx('power');
      P.star = 720;
      toast('NOVA STAR · 12 SECONDS INVINCIBLE');
      playMusic();
    } else if (e.kind === 'leaf') addLife(e.x, e.y - 8);
  }
  function release(kind, tx, ty) {
    if (kind === 'coin' || kind === 'multi') {
      addCoin();
      part({ k: 'coin', x: tx * T + 3, y: ty * T - 12, vy: -4.2, t: 0, life: 28 });
      return;
    }
    let k = kind;
    if (kind === 'power') k = game.pw === 0 ? 'acorn' : 'pepper';
    const e = spawn({ t: 'item', x: tx, y: ty });
    e.kind = k;
    e.x = tx * T + 2;
    e.y = ty * T + 3;
    e.emerge = 32;
    e.behind = true;
    e.active = true;
    area.ents.push(e);
    A.sfx('item');
  }
  function bumpBlock(tx, ty) {
    const c = tileAt(tx, ty),
      k = tx + ',' + ty,
      cont = area.contents[k];
    const hitAbove = () => {
      if (tileAt(tx, ty - 1) === 'o') {
        setTile(tx, ty - 1, ' ');
        addCoin();
        part({ k: 'coin', x: tx * T + 3, y: (ty - 1) * T - 8, vy: -3.5, t: 0, life: 24 });
      }
      for (const e of area.ents) {
        if (e.dead || e.flip || !e.active) continue;
        const td = ET[e.t];
        if (td.bumpable === false) continue;
        if (e.x + e.w > tx * T && e.x < tx * T + T && Math.abs(e.y + e.h - ty * T) < 4) {
          if (td.isItem) {
            if (!e.emerge) {
              e.vy = -3;
              e.vx = -e.vx;
            }
          } else {
            killFlip(e, e.x + e.w / 2 < tx * T + 8 ? -1 : 1);
            addScore(100, e.x, e.y - 8);
          }
        }
      }
    };
    const bump = () => area.bumps.push({ tx, ty, t: 0 });
    if (c === 'B') {
      if (cont === 'multi') {
        area.multi[k] = (area.multi[k] || 8) - 1;
        release('coin', tx, ty);
        if (area.multi[k] <= 0) {
          setTile(tx, ty, 'U');
          delete area.contents[k];
        }
        bump();
        hitAbove();
      } else if (cont) {
        release(cont, tx, ty);
        setTile(tx, ty, 'U');
        delete area.contents[k];
        bump();
        hitAbove();
      } else if (game.pw > 0) {
        hitAbove();
        setTile(tx, ty, ' ');
        addScore(50);
        A.sfx('brk');
        for (let i = 0; i < 4; i++)
          part({
            k: 'deb',
            x: tx * T + 4 + (i % 2) * 8,
            y: ty * T + 4 + (i >> 1) * 8,
            vx: (i % 2 ? 1 : -1) * (1 + rnd()),
            vy: -3 - (i >> 1 ? 0 : 1.5),
            t: 0,
            life: 60,
          });
      } else {
        bump();
        A.sfx('bump');
        hitAbove();
      }
    } else if (c === '?' || c === 'I') {
      release(cont || 'coin', tx, ty);
      setTile(tx, ty, 'U');
      delete area.contents[k];
      bump();
      hitAbove();
    } else A.sfx('bump');
  }

  function updatePlayer() {
    const p = P,
      water = !!area.water;
    if (p.inv > 0) p.inv--;
    if (p.star > 0) {
      p.star--;
      if (p.star === 0) playMusic();
    }
    if (p.fireCd > 0) p.fireCd--;
    if (p.ride) {
      const r = p.ride;
      if (r.dead || p.x + p.w <= r.x || p.x >= r.x + r.w) p.ride = null;
      else {
        moveX(p, r.dx);
        p.y = r.y - p.h;
      }
    }
    const jh = key.jump || key.up,
      jp = pressed.jump || pressed.up,
      run = key.run;
    // crouch
    if (key.down && p.onGround && game.pw > 0 && !water && !p.crouch) {
      p.crouch = true;
      p.h = 14;
      p.y += 13;
    } else if (p.crouch && !(key.down && p.onGround) && game.pw > 0 && canStand()) {
      p.crouch = false;
      p.h = 27;
      p.y -= 13;
    }
    const maxv = water ? (run ? 1.5 : 1.1) : run ? 2.6 : 1.5,
      acc = water ? 0.05 : p.onGround ? (run ? 0.09 : 0.07) : 0.07;
    let dir = 0;
    if (!(p.crouch && p.onGround)) {
      if (key.left && !key.right) dir = -1;
      else if (key.right && !key.left) dir = 1;
    }
    if (dir) {
      p.face = dir;
      if (p.vx * dir < 0 && p.onGround) {
        p.vx += dir * 0.18;
        p.skid = true;
      } else {
        p.vx += dir * acc;
        p.skid = false;
      }
    } else {
      p.skid = false;
      const fr = p.onGround ? 0.1 : water ? 0.03 : 0.02;
      if (Math.abs(p.vx) <= fr) p.vx = 0;
      else p.vx -= Math.sign(p.vx) * fr;
    }
    if (Math.abs(p.vx) > maxv) p.vx -= Math.sign(p.vx) * Math.min(Math.abs(p.vx) - maxv, 0.12);
    // jump / swim
    if (jp) p.jbuf = 7;
    else if (p.jbuf > 0) p.jbuf--;
    if (p.onGround) p.coyote = 6;
    else if (p.coyote > 0) p.coyote--;
    if (water) {
      if (jp) {
        p.vy = -2.3;
        A.sfx('swim');
        p.ride = null;
      }
    } else if (p.jbuf > 0 && p.coyote > 0) {
      p.vy = -(4.85 + 0.35 * Math.min(1, Math.abs(p.vx) / 2.6));
      p.jumping = true;
      p.jbuf = 0;
      p.coyote = 0;
      p.onGround = false;
      p.ride = null;
      A.sfx(game.pw ? 'jumpBig' : 'jump');
    }
    const g = water ? 0.08 : p.vy < 0 && jh && p.jumping ? 0.17 : 0.4;
    p.vy = Math.min(p.vy + g, water ? 1.4 : 4.6);
    if (p.vy >= 0) p.jumping = false;
    // spark
    if (key.fire && game.weapon > 0 && p.fireCd <= 0 && !p.crouch) {
      let n = 0;
      for (const e of area.ents) if (e.t === 'shot' && !e.dead) n++;
      if (n < 10) {
        const s = spawn({ t: 'shot', x: 0, y: 0 });
        s.x = p.face > 0 ? p.x + p.w : p.x - 8;
        s.y = p.y + p.h * 0.52 - 4;
        s.vx = p.face * 6;
        s.vy = 0;
        s.active = true;
        area.ents.push(s);
        p.fireCd = game.weapon === 2 ? 8 : 14;
        A.sfx('spark');
      }
    }
    // horizontal
    if (moveX(p, p.vx)) p.vx = 0;
    if (p.x < area.lockL) {
      p.x = area.lockL;
      if (p.vx < 0) p.vx = 0;
    }
    if (p.x > area.lockR - p.w) {
      p.x = area.lockR - p.w;
      if (p.vx > 0) p.vx = 0;
    }
    // vertical
    const prevB = p.y + p.h;
    if (p.vy < 0) {
      // forgiving corners: slide around a block edge when only a few pixels overlap
      const ty = Math.floor((p.y + p.vy) / T),
        x0 = Math.floor(p.x / T),
        x1 = Math.floor((p.x + p.w - 0.01) / T),
        cx = Math.floor((p.x + p.w / 2) / T);
      if (x0 !== x1 && !SOLID[tileAt(cx, ty)] && tileAt(cx, ty) !== 'I') {
        if (SOLID[tileAt(x0, ty)] && cx !== x0 && (x0 + 1) * T - p.x <= 4) p.x = (x0 + 1) * T;
        else if (SOLID[tileAt(x1, ty)] && cx !== x1 && p.x + p.w - x1 * T <= 4) p.x = x1 * T - p.w;
      }
      if (moveY(p, p.vy, true) === -1) {
        const hy = Math.floor((p.y - 1) / T),
          a0 = Math.floor(p.x / T),
          a1 = Math.floor((p.x + p.w - 0.01) / T),
          ac = Math.floor((p.x + p.w / 2) / T);
        const ok = (c) => SOLID[c] || c === 'I';
        let tx = -1;
        if (ok(tileAt(ac, hy))) tx = ac;
        else if (ok(tileAt(a0, hy))) tx = a0;
        else if (ok(tileAt(a1, hy))) tx = a1;
        if (tx >= 0) bumpBlock(tx, hy);
      }
      p.ride = null;
    } else {
      moveY(p, p.vy);
      if (!p.onGround) {
        p.ride = null;
        for (const e of area.ents) {
          if (e.t !== 'plat' || e.dead) continue;
          if (p.x + p.w > e.x && p.x < e.x + e.w && prevB <= e.y + 4 && p.y + p.h >= e.y) {
            p.y = e.y - p.h;
            p.vy = 0;
            p.onGround = true;
            p.ride = e;
            e.ridden = true;
            break;
          }
        }
      } else p.ride = null;
    }
    if (p.onGround) p.combo = 0;
    p.anim += Math.abs(p.vx) * 0.11 + (water ? 0.05 : 0);
    // tiles under the hitbox: coins, hazards
    const tx0 = Math.floor(p.x / T),
      tx1 = Math.floor((p.x + p.w - 0.01) / T),
      ty0 = Math.floor(p.y / T),
      ty1 = Math.floor((p.y + p.h - 0.01) / T);
    for (let ty = ty0; ty <= ty1; ty++)
      for (let tx = tx0; tx <= tx1; tx++) {
        const c = tileAt(tx, ty);
        if (c === 'o') {
          setTile(tx, ty, ' ');
          addCoin();
          sparkle(tx * T + 8, ty * T + 8, '#fff2a0', 3);
        } else if (c === '~' || c === 'L') {
          if (!G.debug.god) {
            die();
            return;
          }
        } else if (c === '^' && p.y + p.h > ty * T + 8) hurt();
      }
    if (p.y > VH + 16) {
      if (G.debug.onPit) G.debug.onPit();
      else die();
      return;
    }
    // hidden bonus room entrance
    if (lvl.tunnel && area === lvl.main && p.onGround && key.down) {
      const tn = lvl.tunnel,
        cx = p.x + p.w / 2;
      if (cx > tn.inX * T + 5 && cx < tn.inX * T + 27 && Math.abs(p.y + p.h - tn.inY * T) < 2) {
        startWarp('in');
        return;
      }
    }
    if (lvl.bonus && area === lvl.bonus && p.x > 18.6 * T) {
      startWarp('out');
      return;
    }
    // goal beacon
    if (lvl.goal && area === lvl.main) {
      const px = lvl.goal.x * T + 7;
      if (p.x + p.w >= px) startGoal();
    }
    // boss arena
    if (lvl.boss && !game.bossOn && p.x > (lvl.boss.x0 + 3) * T) {
      game.bossOn = true;
      area.lockL = lvl.boss.x0 * T;
      area.lockR = lvl.boss.x1 * T;
      const b = spawn({ t: 'boss', x: lvl.boss.x1 - 4, y: lvl.boss.top - 1 });
      b.active = true;
      area.ents.push(b);
      game.boss = b;
      playMusic();
      toast('WARDEN · HELIX ENFORCER');
    }
  }

  function touchPlayer(e, td) {
    if (td.noTouch || P.dead || e.flip || e.h <= 0 || !overlap(P, e)) return;
    if (td.isItem) {
      if (!(e.emerge > 16)) collect(e);
      return;
    }
    if (P.star > 0) {
      if (e.t === 'boss') {
        if (e.invT <= 0) {
          bossDamage(e, 3);
          e.invT = 45;
        }
      } else {
        if (e.t === 'totem') setTile(Math.floor(e.x / T), Math.floor(e.y / T), ' ');
        killFlip(e, P.face);
        addScore(200, e.x, e.y - 8);
      }
      return;
    }
    if (td.pre && td.pre(e)) return;
    if (td.stomp && !area.water && P.vy > 0 && P.y + P.h - e.y < 9 + P.vy) {
      td.onStomp(e);
      P.y = e.y - P.h;
      P.vy = key.jump || key.up ? -4.5 : -3.2;
      P.jumping = true;
      if (e.t !== 'boss' || e.flash > 0) comboScore(e, P);
      return;
    }
    if (td.harmless) return;
    if (!td.harm || td.harm(e)) hurt();
  }

  /* ================= flow ================= */
  function loadLevel() {
    lvl = L.build(game.world, game.stage);
    initArea(lvl.main);
    if (lvl.bonus) {
      initArea(lvl.bonus);
    }
    area = lvl.main;
    if (lvl.cp) {
      const c = spawn({ t: 'cp', x: lvl.cp.x, y: lvl.cp.y });
      c.x = lvl.cp.x * T;
      c.y = (lvl.cp.y + 1) * T - 32;
      c.lit = !!game.cp;
      area.ents.push(c);
    }
    P = newPlayer();
    const st = game.cp || lvl.start;
    P.x = st.x * T + 2;
    P.y = (st.y + 1) * T - P.h;
    cam.x = clamp(P.x - VW * 0.42, 0, Math.max(0, area.w * T - VW));
    game.time = lvl.time;
    game.tacc = 0;
    game.hurry = false;
    game.bossOn = false;
    game.bossDead = false;
    game.boss = null;
    game.worldClear = false;
    game.lit = false;
    game.freeze = 0;
    game.flameY = lvl.goal ? lvl.goal.y * T : 0;
    game.stageCoins = 0;
    game.damageTaken = 0;
    game.celebration = false;
    game.medals = [];
    game.totalCoins =
      area.g.flat().filter((c) => c === 'o').length +
      Object.values(area.contents).filter((c) => c === 'coin' || c === 'multi').length;
  }
  function startIntro() {
    A.stop();
    A.tempo(1);
    loadLevel();
    game.state = 'intro';
    game.t = 0;
  }
  function resetRun(w) {
    game.score = 0;
    game.coins = 0;
    game.lives = 3;
    game.world = w;
    game.stage = 1;
    game.pw = 1;
    game.weapon = 0;
    game.cp = null;
    startIntro();
  }
  function nextStage() {
    game.cp = null;
    game.stage++;
    if (game.stage > 4) {
      game.stage = 1;
      game.world++;
    }
    if (game.world > 8) {
      game.world = 8;
      game.stage = 4;
      game.state = 'ending';
      game.t = 0;
      writeSave();
      A.play('ending');
      return;
    }
    if (game.world > game.maxWorld) game.maxWorld = game.world;
    writeSave();
    startIntro();
  }
  function setPause(p) {
    if (p && game.state === 'play') {
      game.state = 'pause';
      A.sfx('pause');
      setTimeout(() => {
        if (game.state === 'pause') A.pause(true);
      }, 180);
    } else if (!p && game.state === 'pause') {
      game.state = 'play';
      A.pause(false);
    }
  }
  function startWarp(dir) {
    game.state = 'warp';
    game.warp = { dir, t: 0 };
    P.vx = 0;
    P.vy = 0;
    P.behind = true;
    A.sfx('tunnel');
    if (dir === 'out') {
      swapArea('main');
    }
  }
  function swapArea(which) {
    if (which === 'bonus') {
      area = lvl.bonus;
      P.x = area.start.x * T;
      P.y = area.start.y * T;
      cam.x = 0;
    } else {
      area = lvl.main;
      const tn = lvl.tunnel;
      P.x = tn.outX * T + 10;
      P.y = tn.outY * T + 2;
      cam.x = clamp(P.x - VW * 0.42, 0, area.w * T - VW);
    }
    P.ride = null;
    P.onGround = false;
  }
  function awardClear() {
    game.medals = [];
    if (game.damageTaken === 0) game.medals.push('UNTOUCHED');
    if (game.totalCoins > 0 && game.stageCoins >= Math.ceil(game.totalCoins * 0.7))
      game.medals.push('COLLECTOR');
    if (game.time >= lvl.time * 0.6) game.medals.push('SPEEDRUNNER');
    game.celebration = game.medals.length > 0;
    game.clearTime = lvl.time - game.time;
    game.score += game.medals.length * 1500;
    game.hi = Math.max(game.hi, game.score);
    writeSave();
  }
  function startGoal() {
    awardClear();
    const g = lvl.goal,
      groundY = g.y * T,
      tiles = (groundY - (P.y + P.h)) / T;
    const pts =
      tiles >= 6 ? 5000 : tiles >= 4.5 ? 2000 : tiles >= 3 ? 800 : tiles >= 1.5 ? 400 : 100;
    addScore(pts, P.x - 4, P.y - 10);
    game.state = 'goal';
    game.t = 0;
    game.gphase = 0;
    P.vx = 0;
    P.vy = 0;
    P.x = g.x * T + 9 - P.w;
    P.face = 1;
    P.star = 0;
    P.inv = 0;
    if (P.crouch) {
      P.crouch = false;
      if (game.pw > 0) {
        P.h = 27;
        P.y -= 13;
      }
    }
    game.flameY = Math.min(groundY, P.y + P.h);
    A.stop();
    A.tempo(1);
    A.sfx('beacon');
  }
  function bossDefeated() {
    game.bossDead = true;
    awardClear();
    if (game.state !== 'play') return;
    game.state = 'goal';
    game.t = 0;
    game.gphase = 1;
    game.worldClear = true;
    P.vx = 0;
    P.star = 0;
    P.inv = 0;
    A.tempo(1);
    A.jingle('worldclear');
  }

  function firework() {
    part({
      k: 'rocket',
      x: cam.x + 30 + rnd() * 260,
      y: 220,
      target: 25 + rnd() * 85,
      vy: -4.5,
      t: 0,
      life: 60,
    });
  }
  function updateParts() {
    for (const p of area.parts) {
      p.t++;
      if (p.k === 'rocket') {
        p.y += p.vy;
        if (p.y <= p.target) {
          p.t = p.life;
          const color = ['#ffd68a', '#7cf7db', '#afadff', '#ffb8bb'][Math.floor(rnd() * 4)];
          for (let i = 0; i < 48; i++) {
            const angle = (i * Math.PI * 2) / 48,
              speed = 1.2 + rnd() * 1.8;
            part({
              k: 'spk',
              x: p.x,
              y: p.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              t: 0,
              life: 55 + rnd() * 25,
              col: color,
            });
          }
          A.sfx('firework');
        }
      } else if (p.k === 'coin') {
        p.vy += 0.3;
        p.y += p.vy;
      } else if (p.k === 'txt') p.y -= 0.5;
      else if (p.k === 'deb' || p.k === 'spk') {
        p.vy += p.k === 'deb' ? 0.3 : 0.12;
        p.x += p.vx;
        p.y += p.vy;
      }
    }
    area.parts = area.parts.filter((p) => p.t < p.life);
    for (const b of area.bumps) b.t++;
    area.bumps = area.bumps.filter((b) => b.t < 10);
  }
  function updateCam() {
    const lo = area.lockL,
      hi = Math.max(lo, Math.min(area.w * T, area.lockR) - VW);
    const tx = clamp(P.x + P.w / 2 - VW * 0.42, lo, hi);
    cam.x += (tx - cam.x) * 0.2;
    if (Math.abs(tx - cam.x) < 0.5) cam.x = tx;
  }
  function updatePlay() {
    if (game.freeze > 0) {
      game.freeze--;
      return;
    }
    area.t++;
    if (++game.tacc >= 60) {
      game.tacc = 0;
      if (game.time > 0) game.time--;
      if (game.time === 100 && !game.hurry) {
        game.hurry = true;
        A.sfx('hurry');
        toast('HURRY UP!');
        playMusic();
      }
      if (game.time <= 0 && !G.debug.god) {
        die();
        return;
      }
    }
    for (const e of area.ents) if (e.t === 'plat' && !e.dead) ET.plat.update(e);
    updatePlayer();
    if (game.state !== 'play') return;
    updateEntsNoPlat();
    updateParts();
    updateCam();
    if (pressed.start || pressed.pause) setPause(true);
    else if (pressed.help) {
      setPause(true);
      game.showHelp = true;
    }
  }
  function updateEntsNoPlat() {
    const list = area.ents;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.dead || e.t === 'plat') continue;
      const td = ET[e.t];
      if (!e.active) {
        if (e.x < cam.x + VW + 32 && e.x + e.w > cam.x - 48) e.active = true;
        else continue;
      }
      if (e.flip) {
        e.vy += 0.3;
        e.y += e.vy;
        e.x += e.vx;
        if (e.y > VH + 30) e.dead = true;
        continue;
      }
      if (!td.always && !td.far && (e.x < cam.x - 170 || e.x > cam.x + VW + 170)) continue;
      td.update(e);
      if (!td.always && e.y > VH + 40) {
        e.dead = true;
        continue;
      }
      if (game.state === 'play' && !e.dead) touchPlayer(e, td);
      if (game.state !== 'play') break;
    }
    if (area.t % 30 === 0) area.ents = area.ents.filter((e) => !e.dead);
  }

  function update() {
    if (pressed.mute) {
      A.setMute(!A.muted);
      writeSave();
      toast(A.muted ? 'SOUND OFF' : 'SOUND ON');
    }
    game.t++;
    if (game.toast && --game.toast.t <= 0) game.toast = null;
    const ok = pressed.start || pressed.jump;
    switch (game.state) {
      case 'title': {
        const items = menuItems();
        if (pressed.down) {
          game.menu = (game.menu + 1) % items.length;
          A.sfx('select');
        }
        if (pressed.up) {
          game.menu = (game.menu + items.length - 1) % items.length;
          A.sfx('select');
        }
        if (items[game.menu].id === 'cont') {
          if (pressed.left && game.selWorld > 1) {
            game.selWorld--;
            A.sfx('select');
          }
          if (pressed.right && game.selWorld < game.maxWorld) {
            game.selWorld++;
            A.sfx('select');
          }
        }
        if (pressed.help) {
          game.state = 'help';
          game.helpFrom = 'title';
        } else if (ok) {
          const id = items[game.menu].id;
          A.sfx('coin');
          if (id === 'new') resetRun(1);
          else if (id === 'cont') resetRun(game.selWorld);
          else {
            game.state = 'help';
            game.helpFrom = 'title';
          }
        }
        if (area) {
          area.t++;
          cam.x = (0.5 - 0.5 * Math.cos(game.t / 500)) * Math.min(600, area.w * T - VW);
        }
        break;
      }
      case 'help':
        if (ok || pressed.pause || pressed.help) {
          game.state = 'title';
          A.sfx('select');
        }
        break;
      case 'intro':
        if ((!game.awaitBriefing && game.t > 130) || (game.t > 30 && ok)) {
          game.awaitBriefing = false;
          game.state = 'play';
          playMusic();
        }
        break;
      case 'play':
        updatePlay();
        break;
      case 'pause':
        if (pressed.help) game.showHelp = !game.showHelp;
        else if (pressed.start || pressed.pause) {
          game.showHelp = false;
          setPause(false);
        }
        break;
      case 'warp': {
        const w = game.warp;
        w.t++;
        area.t++;
        if (w.dir === 'in') {
          P.y += 1;
          if (w.t >= 30) {
            swapArea('bonus');
            P.behind = false;
            game.state = 'play';
            playMusic();
          }
        } else {
          const tn = lvl.tunnel,
            ty = tn.outY * T - P.h;
          P.y = Math.max(ty, P.y - 1);
          if (P.y <= ty && w.t > 20) {
            P.behind = false;
            game.state = 'play';
            playMusic();
          }
        }
        updateParts();
        break;
      }
      case 'dying':
        area.t++;
        if (game.t === 26) P.vy = -5.6;
        if (game.t > 26) {
          P.vy += 0.25;
          P.y += P.vy;
        }
        updateParts();
        if (game.t > 170) {
          game.lives--;
          if (game.lives <= 0) {
            game.state = 'gameover';
            game.t = 0;
            writeSave();
            A.jingle('gameover');
          } else startIntro();
        }
        break;
      case 'goal':
        updateGoal();
        break;
      case 'gameover':
        if (game.t > 300 || (game.t > 60 && ok)) returnToTitle();
        break;
      case 'ending':
        if (game.t > 180 && ok) returnToTitle();
        break;
    }
    for (const k in pressed) pressed[k] = false;
  }
  function updateGoal() {
    area.t++;
    updateParts();
    const groundY = lvl.goal ? lvl.goal.y * T : 0;
    if (game.gphase === 0) {
      const top = (lvl.goal.y - 8) * T;
      let done = true;
      if (P.y + P.h < groundY) {
        P.y = Math.min(P.y + 2, groundY - P.h);
        done = false;
      }
      if (game.flameY > top) {
        game.flameY = Math.max(top, game.flameY - 4);
        done = false;
      }
      if (done) {
        game.gphase = 1;
        game.t = 0;
        game.lit = true;
        A.jingle('clear');
        sparkle(lvl.goal.x * T + 8, top - 6, '#ffd23a', 24);
      }
    } else if (game.gphase === 1) {
      P.vy = Math.min(P.vy + 0.4, 4.6);
      if (!game.worldClear && game.t > 24 && game.t < 96) {
        P.vx = 1.2;
        moveX(P, P.vx);
        P.anim += 0.13;
      } else P.vx = 0;
      moveY(P, P.vy);
      if (game.celebration && game.t % 35 === 0) firework();
      if (game.t > (game.worldClear ? 170 : 110)) {
        game.gphase = 2;
        game.t = 0;
      }
    } else if (game.gphase === 2) {
      if (game.time > 0) {
        const n = Math.min(game.time, 3);
        game.time -= n;
        game.score += 50 * n;
        if (game.score > game.hi) game.hi = game.score;
        if (game.t % 3 === 0) A.sfx('tick');
      } else {
        game.gphase = 3;
        game.t = 0;
      }
    } else {
      if (game.celebration && game.t % 42 === 0) firework();
      if (game.t > 30 && pressed.start) nextStage();
    }
  }
  function menuItems() {
    const it = [{ id: 'new', txt: 'NEW GAME' }];
    if (game.maxWorld > 1)
      it.push({ id: 'cont', txt: 'CONTINUE  < WORLD ' + game.selWorld + ' >' });
    it.push({ id: 'help', txt: 'HOW TO PLAY' });
    return it;
  }
  function titleScene() {
    const w = game.world,
      s = game.stage,
      cp = game.cp,
      pw = game.pw;
    game.world = 1;
    game.stage = 1;
    game.cp = null;
    game.pw = 0;
    loadLevel();
    game.world = w;
    game.stage = s;
    game.cp = cp;
    game.pw = pw;
    P.x = -100;
  }
  function returnToTitle() {
    titleScene();
    game.state = 'title';
    game.t = 0;
    game.menu = 0;
    game.selWorld = game.maxWorld;
    game.awaitBriefing = false;
    game.toast = null;
    A.pause(false);
    A.play('title');
  }
  function toggleFull() {
    const el = document.documentElement;
    if (!document.fullscreenElement) el.requestFullscreen();
    else document.exitFullscreen();
  }

  function render() {
    G.View.render(G.T);
  }
  function fit() {
    if (G.View) G.View.resize();
  }

  let last = 0,
    acc = 0;
  function frame(ts) {
    // Run physics at 60 Hz regardless of display refresh rate. Cap catch-up work
    // after a suspended tab so one late frame cannot lock up the browser.
    const dt = Math.min(0.1, (ts - last) / 1000 || 0);
    last = ts;
    acc += dt;
    let n = 0;
    while (acc >= 1 / 60 && n < 5) {
      update();
      acc -= 1 / 60;
      n++;
    }
    if (n === 5) acc = 0;
    render();
    requestAnimationFrame(frame);
  }
  function boot() {
    loadSave();
    game.selWorld = game.maxWorld;
    titleScene();
    game.state = 'title';
    A.play('title');
    {
      const q = new URLSearchParams(window.location.search);
      if (q.get('god')) G.debug.god = true;
      if (q.get('w')) {
        game.score = 0;
        game.coins = 0;
        game.lives = 5;
        game.world = clamp(+q.get('w') || 1, 1, 8);
        game.stage = clamp(+q.get('s') || 1, 1, 4);
        game.pw = clamp(+q.get('pw') || 0, 0, 2);
        game.cp = null;
        startIntro();
      }
    }
    if (window.addEventListener) {
      window.addEventListener('resize', fit);
      document.addEventListener && document.addEventListener('fullscreenchange', fit);
    }
    fit();
  }
  G.T = {
    game,
    key,
    pressed,
    update,
    render,
    cam,
    P: () => P,
    area: () => area,
    lvl: () => lvl,
    resetRun,
    startIntro,
    nextStage,
    setPause,
    returnToTitle,
    tileAt,
    SOLID,
    start: () => requestAnimationFrame(frame),
  };
  boot();
})();
