const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function boot(w = 1, s = 1, storedSave = null) {
  const warnings = [];
  const context = new Proxy(
    {},
    { get: (_, k) => (k === 'measureText' ? () => ({ width: 20 }) : () => {}) },
  );
  const element = { style: {}, getContext: () => context, addEventListener() {} };
  const audio = new Proxy(
    {
      muted: false,
      setMute(value) {
        this.muted = value;
      },
    },
    { get: (t, k) => (k in t ? t[k] : () => {}) },
  );
  const sandbox = {
    console: { ...console, warn: (message) => warnings.push(message) },
    URLSearchParams,
    setTimeout: () => {},
    requestAnimationFrame() {},
    innerWidth: 1280,
    innerHeight: 800,
    __TEST__: true,
    document: {
      getElementById: () => element,
      addEventListener() {},
      createElement: () => element,
    },
    localStorage: { getItem: () => storedSave, setItem() {} },
    location: { search: `?w=${w}&s=${s}` },
    addEventListener() {},
    G: { Audio: audio, Sprites: { init() {}, theme: () => ({}) } },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const file of ['levels.js', 'game.js'])
    vm.runInContext(fs.readFileSync(`js/${file}`, 'utf8'), sandbox);
  const t = sandbox.G.T;
  for (let i = 0; i < 131; i++) t.update();
  return { t, G: sandbox.G, sandbox, warnings };
}
function frames(t, n) {
  for (let i = 0; i < n; i++) t.update();
}
function take(t, kind) {
  const e = t.area().ents.find((e) => e.t === 'item' && e.kind === kind);
  assert.ok(e, `${kind} pickup must be present`);
  t.P().x = e.x;
  t.P().y = e.y;
  t.P().vy = 0;
  t.update();
  return e;
}

test('all 32 stages contain reachable starter guns and stars, plus checkpoint supplies', () => {
  const { G } = boot();
  for (let w = 1; w <= 8; w++)
    for (let s = 1; s <= 4; s++) {
      const level = G.Levels.build(w, s);
      for (const kind of ['blaster', 'shard']) {
        const items = level.main.ents.filter((e) => e.t === 'item' && e.kind === kind);
        assert.ok(items.length >= 2, `${w}-${s}: two ${kind} pickups`);
        assert.ok(
          items.some((e) => e.x < 12),
          `${w}-${s}: starter ${kind}`,
        );
        for (const e of items)
          assert.equal(level.main.g[e.y][e.x], ' ', `${w}-${s}: item not buried`);
      }
    }
});
test('gun pickup equips a separate weapon and holding fire shoots repeatedly', () => {
  const { t } = boot();
  take(t, 'blaster');
  assert.equal(t.game.weapon, 1);
  t.key.fire = true;
  frames(t, 28);
  assert.ok(t.area().ents.filter((e) => e.t === 'shot').length >= 2);
});
test('a moving armored shell is destroyed by a gun shot', () => {
  const { t } = boot();
  take(t, 'blaster');
  const p = t.P();
  const enemy = {
    t: 'snail',
    x: p.x + 33,
    y: p.y,
    w: 12,
    h: 13,
    vx: -1,
    vy: 0,
    state: 2,
    grace: 20,
    combo: 0,
    active: true,
    timer: 0,
  };
  t.area().ents = [enemy];
  t.key.fire = true;
  frames(t, 12);
  assert.ok(enemy.flip || enemy.dead, 'armored shell dies instead of reflecting gunfire');
});
test('star gives twelve seconds of invincibility and prevents contact damage', () => {
  const { t } = boot();
  take(t, 'shard');
  assert.equal(t.P().star, 720);
  const p = t.P(),
    lives = t.game.lives;
  t.area().ents = [
    { t: 'urchin', x: p.x, y: p.y, w: 12, h: 12, vx: 0, vy: 0, active: true, state: 0, timer: 0 },
  ];
  t.update();
  assert.equal(t.game.lives, lives);
  assert.equal(t.game.state, 'play');
  assert.ok(t.area().ents[0].flip);
});
test('timer counts real gameplay seconds and freezes while paused', () => {
  const { t } = boot();
  t.game.tacc = 0;
  const before = t.game.time;
  frames(t, 60);
  assert.equal(t.game.time, before - 1);
  t.game.state = 'pause';
  frames(t, 120);
  assert.equal(t.game.time, before - 1);
});
test('clean stage clears earn fireworks and a persistent results screen', () => {
  const { t } = boot();
  t.P().x = t.lvl().goal.x * 16;
  t.update();
  assert.equal(t.game.state, 'goal');
  assert.equal(t.game.celebration, true);
  assert.ok(t.game.medals.includes('UNTOUCHED'));
  frames(t, 1000);
  assert.equal(t.game.state, 'goal', 'results wait for the player');
});
test('slow damaged clears with few coins do not earn fireworks', () => {
  const { t } = boot();
  t.game.damageTaken = 2;
  t.game.stageCoins = 0;
  t.game.time = 1;
  t.P().x = t.lvl().goal.x * 16;
  t.update();
  assert.equal(t.game.celebration, false);
});
test('pause does not advance star timer or move the player', () => {
  const { t } = boot();
  const p = t.P();
  p.star = 100;
  t.game.state = 'pause';
  const x = p.x;
  t.key.right = true;
  frames(t, 90);
  assert.equal(p.x, x);
  assert.equal(p.star, 100);
});
test('stage generation remains deterministic', () => {
  const { G } = boot();
  assert.deepEqual(G.Levels.build(8, 4), G.Levels.build(8, 4));
});

test('stationary turrets can be destroyed by gunfire despite their old collision tile', () => {
  const { t } = boot(7, 1);
  take(t, 'blaster');
  const turret = t.area().ents.find((e) => e.t === 'totem');
  assert.ok(turret, 'this stage has a turret');
  const p = t.P();
  p.x = turret.x - 40;
  p.y = turret.y;
  p.vy = 0;
  p.face = 1;
  p.inv = 100;
  turret.active = true;
  turret.timer = 100;
  t.key.fire = true;
  frames(t, 12);
  assert.ok(turret.flip || turret.dead, 'turret must be destructible');
});
test('stars destroy moving shells on contact before shell-kick logic runs', () => {
  const { t } = boot();
  take(t, 'shard');
  const p = t.P();
  const shell = {
    t: 'snail',
    x: p.x,
    y: p.y,
    w: 12,
    h: 13,
    vx: 0,
    vy: 0,
    state: 1,
    grace: 0,
    timer: 0,
    active: true,
  };
  t.area().ents = [shell];
  t.update();
  assert.ok(shell.flip);
});
test('a far-away checkpoint cannot activate just because the player is to its right', () => {
  const { t } = boot();
  const cp = t.area().ents.find((e) => e.t === 'cp');
  t.P().x = cp.x + 200;
  t.update();
  assert.equal(t.game.cp, null);
});

test('a failed save is surfaced while the local session stays playable', () => {
  const { t, sandbox } = boot();
  const warnings = [];
  sandbox.console = { ...console, warn: (message) => warnings.push(message) };
  sandbox.localStorage.setItem = () => {
    throw new Error('storage quota exceeded');
  };
  t.pressed.mute = true;
  t.update();
  assert.match(t.game.storageError, /cannot be saved/i);
  assert.equal(warnings.length, 1);
  assert.equal(t.game.state, 'play');
});

test('a blaster defeats the reactor Warden and unlocks the next world', () => {
  const { t, G } = boot(1, 4);
  take(t, 'blaster');
  const arena = t.lvl().boss;
  t.P().x = (arena.x0 + 4) * 16;
  t.P().y = arena.top * 16 - t.P().h;
  G.debug.god = true;
  t.key.fire = true;
  frames(t, 1500);
  assert.equal(t.game.bossDead, true);
  assert.equal(t.game.state, 'goal');
  t.pressed.start = true;
  frames(t, 40);
  assert.equal(t.game.world, 2);
  assert.equal(t.game.maxWorld, 2);
});
test('star expiry restores the normal track and vulnerability timer', () => {
  const { t } = boot();
  take(t, 'shard');
  t.P().star = 1;
  t.update();
  assert.equal(t.P().star, 0);
  assert.equal(t.game.state, 'play');
});
test('stars do not protect the player from falling out of the level', () => {
  const { t } = boot();
  take(t, 'shard');
  t.P().y = 270;
  t.update();
  assert.equal(t.game.state, 'dying');
});

test('valid legacy progress keeps its score, unlocked world and mute preference', () => {
  const { t, G } = boot(1, 1, JSON.stringify({ hi: 4200, maxWorld: 3, muted: true }));
  assert.equal(t.game.hi, 4200);
  assert.equal(t.game.maxWorld, 3);
  assert.equal(G.Audio.muted, true);
  assert.equal(t.game.storageError, undefined);
});

test('corrupt or invalid saved progress is reported and cannot poison the game state', () => {
  for (const storedSave of [
    '{',
    'null',
    '[]',
    '42',
    '{"hi":-1}',
    '{"hi":"4200"}',
    '{"maxWorld":2.5}',
    '{"maxWorld":99}',
    '{"muted":"false"}',
  ]) {
    const { t, warnings } = boot(1, 1, storedSave);
    assert.equal(t.game.hi, 0, storedSave);
    assert.equal(t.game.maxWorld, 1, storedSave);
    assert.match(t.game.storageError, /could not be read/i, storedSave);
    assert.equal(warnings.length, 1, 'invalid saved progress must be logged');
    assert.equal(t.game.state, 'play', storedSave);
  }
});
