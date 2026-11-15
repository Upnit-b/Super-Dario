/* Foxfire — sprites, bitmap font, tile themes. All art is generated here at load time. */
(function () {
'use strict';
const G = (window.G = window.G || {});
const S = (G.Sprites = {});

function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
S.mk = mk;
function px(rows, pal) {
  const h = rows.length, w = rows[0].length, c = mk(w, h), x = c.getContext('2d');
  for (let j = 0; j < h; j++) {
    const r = rows[j];
    if (r.length !== w) throw new Error('sprite row ' + j + ' has width ' + r.length + ': "' + r + '"');
    for (let i = 0; i < w; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); } }
  }
  return c;
}
function flipH(src) { const c = mk(src.width, src.height), x = c.getContext('2d'); x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0); return c; }
function flipV(src) { const c = mk(src.width, src.height), x = c.getContext('2d'); x.translate(0, src.height); x.scale(1, -1); x.drawImage(src, 0, 0); return c; }
function pair(c, nativeLeft) { const f = flipH(c); return nativeLeft ? { l: c, r: f } : { r: c, l: f }; }
function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
function mix(a, b, t) { const A = hex(a), B = hex(b); return '#' + [0, 1, 2].map(i => Math.round(A[i] + (B[i] - A[i]) * t).toString(16).padStart(2, '0')).join(''); }
function ell(x, cx, cy, rx, ry, col) {
  x.fillStyle = col;
  for (let j = Math.floor(cy - ry); j <= cy + ry; j++) for (let i = Math.floor(cx - rx); i <= cx + rx; i++) {
    const dx = (i + 0.5 - cx) / rx, dy = (j + 0.5 - cy) / ry; if (dx * dx + dy * dy <= 1) x.fillRect(i, j, 1, 1);
  }
}
function R(x, col, a, b, w, h) { x.fillStyle = col; x.fillRect(a, b, w, h); }
function swap(rows, repl) { const o = rows.slice(); for (const k in repl) o[+k] = repl[k]; return o; }

/* ---------------- bitmap font (5x7, column encoded) ---------------- */
const FONT = ('0000000000 00005F0000 0007000700 147F147F14 242A7F2A12 2313086462 3649552250 0005030000 001C224100 0041221C00 ' +
  '14083E0814 08083E0808 0050300000 0808080808 0060600000 2010080402 3E5149453E 00427F4000 4261514946 2141454B31 ' +
  '1814127F10 2745454539 3C4A494930 0171090503 3649494936 064949291E 0036360000 0056360000 0814224100 1414141414 ' +
  '0041221408 0201510906 324979413E 7E1111117E 7F49494936 3E41414122 7F4141221C 7F49494941 7F09090901 3E4149497A ' +
  '7F0808087F 00417F4100 2040413F01 7F08142241 7F40404040 7F020C027F 7F0408107F 3E4141413E 7F09090906 3E4151215E ' +
  '7F09192946 4649494931 01017F0101 3F4040403F 1F2040201F 3F4038403F 6314081463 0708700807 6151494543').split(' ');
const fontCache = {};
function atlas(col) {
  if (fontCache[col]) return fontCache[col];
  const c = mk(FONT.length * 6, 8), x = c.getContext('2d'); x.fillStyle = col;
  FONT.forEach((h, i) => { for (let cx = 0; cx < 5; cx++) { const b = parseInt(h.substr(cx * 2, 2), 16); for (let r = 0; r < 7; r++) if ((b >> r) & 1) x.fillRect(i * 6 + cx, r, 1, 1); } });
  return (fontCache[col] = c);
}
function rawText(ctx, str, x, y, col, sc) {
  const at = atlas(col);
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i) - 32; if (ch <= 0 || ch >= FONT.length) continue;
    ctx.drawImage(at, ch * 6, 0, 6, 8, x + i * 6 * sc, y, 6 * sc, 8 * sc);
  }
}
S.text = function (ctx, str, x, y, col, sc, shadow) {
  str = String(str).toUpperCase(); sc = sc || 1;
  if (shadow !== false) { const o = Math.ceil(sc / 3); rawText(ctx, str, x + o, y + o, shadow || '#101018', sc); }
  rawText(ctx, str, x, y, col || '#ffffff', sc);
};
S.textW = function (str, sc) { return String(str).length * 6 * (sc || 1); };
S.textC = function (ctx, str, y, col, sc, shadow) { S.text(ctx, str, Math.round((320 - S.textW(str, sc)) / 2), y, col, sc, shadow); };

/* ---------------- hero: Kip the fox ---------------- */
const KIP_HEAD = [
  '....dd...dd.....',
  '....dod.dod.....',
  '....doooood.....',
  '...oooooooooo...',
  '...oooooookoo...',
  '...oooooookoowk.',
  '...ooowwwwwwww..',
  '....owwwwwww....'];
const KIP_S_IDLE = KIP_HEAD.concat([
  '....tttttttT....',
  '.w.ootttooTT....',
  'wwdooowwwoo.....',
  'wdoooowwwooo....',
  '.dooowwwwoo.....',
  '...ooo..ooo.....',
  '...oo....oo.....',
  '..ddd...ddd.....']);
const KIP_S_RUN1 = swap(KIP_S_IDLE, { 13: '..ooo....ooo....', 14: '.oo.......ooo...', 15: '.dd........ddd..' });
const KIP_S_RUN2 = swap(KIP_S_IDLE, { 13: '....oooooo......', 14: '.....oooo.......', 15: '....ddddd.......' });
const KIP_S_JUMP = KIP_HEAD.slice(0, 7).concat([
  '.o..owwwwwww.o..',
  '.oo.tttttttToo..',
  '..ooootttooTo...',
  'w..ooowwwoo.T...',
  'ww.ooowwwooo....',
  'wdooowwwwood....',
  '.dooo....oood...',
  '..dd......dd....',
  '................']);
const KIP_B_TOP = ['................'].concat(KIP_HEAD, [
  '....tttttttT....',
  '...ottttttTTT...',
  '..ooowwwwooTT...',
  '..oo.owwwwoo.T..',
  '..oo.owwwwoo....',
  '..dd.owwwwoo....',
  '.....owwwwoo....']);
const KIP_B_BODY = [
  'w....owwwwoo....',
  'ww...oowwooo....',
  'wwo..oooooo.....',
  'wooo.oooooo.....',
  '.oooooooooo.....',
  '..ooooooooo.....',
  '...oooooooo.....'];
const KIP_B_IDLE = KIP_B_BODY.concat([
  '.....ooo.ooo....', '.....ooo.ooo....', '.....oo...oo....', '.....oo...oo....', '.....oo...oo....',
  '.....oo...oo....', '.....oo...oo....', '....ddd..ddd....', '....dddd.dddd...']);
const KIP_B_RUN1 = KIP_B_BODY.concat([
  '.....ooooooo....', '....ooo..ooo....', '...ooo....ooo...', '..ooo......oo...', '..oo.......oo...',
  '.ooo.......ooo..', '.oo.........oo..', 'ddd.........ddd.', 'dd..........dddd']);
const KIP_B_RUN2 = KIP_B_BODY.concat([
  '.....oooooo.....', '.....oooooo.....', '......oooo......', '......oooo......', '......ooo.......',
  '.....oooo.......', '.....oo.oo......', '....ddd.ddd.....', '....dd..dddd....']);
const KIP_B_JUMP = KIP_B_BODY.concat([
  '....oooo.oooo...', '...ooo....ooo...', '..ooo......ooo..', '..oo.......dddd.', '.ddd............',
  '.dd.............', '................', '................', '................']);
const KIP_PALS = [
  { o: '#f07a28', d: '#7a3410', w: '#fff0d8', k: '#20140e', t: '#18b8a8', T: '#0c7c74' },
  { o: '#ffb830', d: '#a04808', w: '#fffbe8', k: '#20140e', t: '#e8323a', T: '#9a1420' },
  { o: '#fff6a0', d: '#e0a020', w: '#ffffff', k: '#804000', t: '#7af0ff', T: '#30b0e0' }];

/* ---------------- enemies (drawn facing left) ---------------- */
const BEETLE = [
  '................', '................',
  '..k.............',
  '...k..PPPPPP....',
  '...kPPppppppPP..',
  '..kkPppypppppPP.',
  '.kkkPpppppppypP.',
  'kwkkPppppppppppP',
  'kkkkPpypppppppPP',
  'kkkkPppppppypppP',
  '.kkkPPpppppppPPP',
  '..kkkPPPPPPPPPP.',
  '..k.k..k..k..k..',
  '.k..k..k..k..k..',
  '.k.k..k..k..k...',
  '................'];
const BEETLE2 = swap(BEETLE, { 12: '...k.k..k..k.k..', 13: '...k..k.k..k..k.', 14: '..k...k..k.k..k.' });
const BEETLE_PAL = { p: '#8a5ad0', P: '#4a2a88', y: '#ffd84a', k: '#20140e', w: '#ffffff' };
const SNAIL = [
  '................', '................',
  '.......bbbbbb...',
  '.....bbBBBBBBb..',
  '....bBBbbbbbBBb.',
  'k.k.bBbbBBBbbBb.',
  'y.y.bBbBbbbBbBb.',
  'y.y.bBbBbBbBbBb.',
  'yyyybBbBbbBBbBb.',
  'ykyybBbbBBBbbBb.',
  'yyyybBBbbbbbBBb.',
  'yyyyybBBBBBBBb..',
  '.yyyyybbbbbbbyy.',
  '..yyyyyyyyyyyyyy',
  '...yyyyyyyyyyyy.',
  '................'];
const SNAIL2 = swap(SNAIL, { 12: 'yyyyyybbbbbbby..', 13: '.yyyyyyyyyyyyyy.', 14: '..yyyyyyyyyyyyy.' });
const SHELL = [
  '................', '................', '................', '................',
  '.....bbbbbb.....',
  '...bbBBBBBBbb...',
  '..bBBbbbbbbBBb..',
  '.bBbbBBBBBBbbBb.',
  '.bBbBbbbbbbBbBb.',
  '.bBbBbBBBBbBbBb.',
  '.bBbBbBbbBbBbBb.',
  '.bBbBbBBbBbBbBb.',
  '.bBbBbbbbBbBbBb.',
  '.bBbbBBBBBbbBb..',
  '..bBBbbbbbbBBb..',
  '...bbbbbbbbbb...'];
const SNAIL_PAL = { b: '#2a7aa8', B: '#7ad8f0', y: '#f0d878', k: '#20140e' };
const BAT1 = [
  '................', '................',
  'g..............g',
  'gg............gg',
  'ggg...g..g...ggg',
  'gggg..gggg..gggg',
  'gggggggggggggggg',
  '.gggggrggrggggg.',
  '..gggggggggggg..',
  '...g.gwggwg.g...',
  '......gggg......',
  '................', '................', '................', '................', '................'];
const BAT2 = [
  '................', '................', '................', '................',
  '......g..g......',
  '......gggg......',
  '..gggggggggggg..',
  '.gggggrggrggggg.',
  'gggggggggggggggg',
  'ggg..gwggwg..ggg',
  'gg....gggg....gg',
  'g..............g',
  '................', '................', '................', '................'];
const BAT_PAL = { g: '#7a58b0', r: '#ff3838', w: '#ffffff' };
const URCHIN = [
  '................', '................',
  '.....s..s..s....',
  '....s.s.s.s.s...',
  '...sssssssssss..',
  '..s.sSsSsSsSsss.',
  '...sSSSSSSSSSss.',
  '..sSSSSSSSSSSSss',
  'kccSSSSSSSSSSSs.',
  'ccwkSSSSSSSSSSss',
  '.cccccSSSSSSSSs.',
  '..cccccccSSSSS..',
  '...ccccccccc....',
  '..d.d.....d.d...',
  '.dd.dd...dd.dd..',
  '................'];
const URCHIN2 = swap(URCHIN, { 13: '...d.d...d.d....', 14: '..dd.dd.dd.dd...' });
const URCHIN_PAL = { s: '#f0e8d8', S: '#8a5a3a', c: '#f0c890', k: '#20140e', w: '#ffffff', d: '#5c3a1a' };
const THORN = [
  '...s...s...s....',
  '....s..s..s.....',
  '..s..vvvvv..s...',
  '...svvvvvvvs....',
  '...vvvvvvvvv....',
  's.vvvwwwvvvvv.s.',
  '.svvwwkkwvvvvs..',
  '..vvwwkkwvvvv...',
  '.svvvwwwvvvvvs..',
  's.vvvvvvvvvvv.s.',
  '...VvvvvvvvV....',
  '...sVVVVVVVs....',
  '..s...ggg...s...',
  '......ggg.......',
  '......ggg.......',
  '......ggg.......'];
const THORN2 = swap(THORN, { 6: '.svvwwwwwvvvvs..', 7: '..vvwkkkwvvvv...' });
const THORN_PAL = { s: '#f4d8ff', v: '#b05ae0', V: '#6a2a9a', g: '#3aa655', w: '#ffffff', k: '#20140e' };
const FROG = [
  '................', '................', '................', '................', '................',
  '..ggg...........',
  '.gwkgg..ggggg...',
  '.gwkgggggggggg..',
  'ggggggggggggggg.',
  'gkkkkgggGGGggggg',
  'gggggggGGgGGgggg',
  '.ggggggGggggGggg',
  '..yyyggGgggggGgg',
  '.yyyyyggGGggGGg.',
  '..gg.gg..ggggg..',
  '.ggg.ggg.gggggg.'];
const FROG_PAL = { g: '#4ac040', G: '#2a8a2a', y: '#e8e070', w: '#ffffff', k: '#20140e' };
const FISH = [
  '................', '................', '................',
  '......ooo.......',
  '....oooooo....o.',
  '...ooooooooo.oo.',
  '..oowkooooooooo.',
  '.ooowkoooyooooo.',
  '.oooooooyyooooo.',
  '..ooooooyoooooo.',
  '...ooooooooo.oo.',
  '....oooooo....o.',
  '......ooo.......',
  '................', '................', '................'];
const FISH2 = swap(FISH, { 4: '....oooooo......', 5: '...ooooooooo..o.', 10: '...ooooooooo..o.', 11: '....oooooo......' });
const FISH_PAL = { o: '#ff7a5a', y: '#ffd8a8', w: '#ffffff', k: '#20140e' };
const JELLY = [
  '................',
  '.....pppppp.....',
  '...pppppppppp...',
  '..ppPPppppppPp..',
  '..pPppppppppppp.',
  '.pppkpppppkpppp.',
  '.pppkpppppkpppp.',
  '.pppppppppppppp.',
  '.pppppppppppppp.',
  '..p.pp.pp.pp.p..',
  '..p.p..pp..p.p..',
  '..p.p..p...p.p..',
  '.p..p...p..p..p.',
  '.p...p..p.p...p.',
  '................', '................'];
const JELLY2 = swap(JELLY, { 9: '.pp.pp.pp.pp.pp.', 10: '.p..p..pp..p..p.', 11: '.p..p..pp..p..p.', 12: '..p.p..pp..p.p..', 13: '................' });
const JELLY_PAL = { p: '#ff8ad8', P: '#ffe0f6', k: '#802060' };

/* ---------------- items ---------------- */
const ACORN = [
  '................',
  '.......dd.......',
  '.......d........',
  '....cccccccc....',
  '...cCcCcCcCcc...',
  '..cCcCcCcCcCcc..',
  '..cccccccccccc..',
  '..nnnnnnnnnnnn..',
  '..nNnnnnnnnnnn..',
  '..nNNnnnnnnnnn..',
  '..nnNnnnnnnnnn..',
  '...nnnnnnnnnn...',
  '...nnnnnnnnnn...',
  '....nnnnnnnn....',
  '.....nnnnnn.....',
  '.......nn.......'];
const PEPPER = [
  '................',
  '.........gg.....',
  '........gg......',
  '.......ggg......',
  '.....rrgggrr....',
  '....rrrrrrrrr...',
  '...rRrrrrrrrrr..',
  '...rRRrrrrrrrr..',
  '...rrRrrrrrrrr..',
  '...rrrrrrrrrr...',
  '....rrrrrrrrr...',
  '....rrrrrrrr....',
  '.....rrrrrrr....',
  '......rrrrr.....',
  '.......rrrr.....',
  '.........rr.....'];
const SHARD = [
  '.......ww.......',
  '......wccw......',
  '......wccw......',
  '.....wcCccw.....',
  '.....wcCccw.....',
  '....wcCCcccw....',
  '...wccCcccccw...',
  '.wwcccccccccCww.',
  '.wwcccccccccCww.',
  '...wcccccccCw...',
  '....wcccccCw....',
  '.....wccccw.....',
  '.....wcccCw.....',
  '......wccw......',
  '......wccw......',
  '.......ww.......'];
const LEAF = [
  '................',
  '...ggg....ggg...',
  '..gGGGg..gGGGg..',
  '.gGGGGGggGGGGGg.',
  '.gGGGGGGGGGGGGg.',
  '.gGGGGGGlGGGGGg.',
  '.gGGGGGGlGGGGGg.',
  '..gGGGGGlGGGGg..',
  '..gGGGGGlGGGGg..',
  '...gGGGGlGGGg...',
  '....gGGGlGGg....',
  '.....gGGlGg.....',
  '......gGlg......',
  '.......gl.......',
  '.......d........',
  '......dd........'];

/* ---------------- procedural sprites ---------------- */
function drawBoss(f) {
  const c = mk(32, 32), x = c.getContext('2d');
  const rock = '#5e5868', hi = '#8a8496', lo = '#37323f', lava = '#ff6a1a', glow = '#ffd23a';
  // legs
  if (f === 0) { R(x, lo, 6, 24, 8, 8); R(x, lo, 18, 24, 8, 8); R(x, rock, 6, 24, 7, 6); R(x, rock, 18, 24, 7, 6); }
  else { R(x, lo, 4, 25, 8, 7); R(x, lo, 20, 23, 8, 9); R(x, rock, 4, 25, 7, 5); R(x, rock, 20, 23, 7, 7); }
  // arms
  R(x, lo, 0, 10, 5, 13); R(x, rock, 0, 10, 4, 11); R(x, lo, 27, 10, 5, 13); R(x, rock, 28, 10, 4, 11);
  R(x, hi, 0, 10, 4, 1); R(x, hi, 28, 10, 4, 1);
  // body
  R(x, lo, 4, 8, 24, 18); R(x, rock, 4, 8, 23, 16); R(x, hi, 4, 8, 23, 1); R(x, hi, 4, 8, 1, 16);
  // head
  R(x, lo, 9, 0, 14, 10); R(x, rock, 9, 0, 13, 9); R(x, hi, 9, 0, 13, 1);
  R(x, '#1a1418', 10, 3, 12, 4); R(x, lava, 11, 4, 3, 2); R(x, lava, 18, 4, 3, 2); R(x, glow, 12, 4, 1, 1); R(x, glow, 19, 4, 1, 1);
  // cracks + core
  R(x, lava, 7, 12, 2, 6); R(x, lava, 9, 17, 3, 2); R(x, lava, 22, 11, 2, 5); R(x, lava, 20, 15, 3, 2); R(x, lava, 12, 22, 7, 1);
  R(x, lava, 12, 12, 8, 7); R(x, glow, 13, 13, 6, 5); R(x, '#fff8c0', 15, 14, 2, 2);
  return c;
}
function drawTotem() {
  const c = mk(16, 16), x = c.getContext('2d');
  R(x, '#4a4458', 1, 0, 14, 16); R(x, '#6e6880', 2, 0, 12, 15); R(x, '#9a94aa', 2, 0, 12, 1); R(x, '#9a94aa', 2, 0, 1, 15);
  R(x, '#1a1418', 4, 4, 3, 3); R(x, '#1a1418', 9, 4, 3, 3); R(x, '#ff6a1a', 5, 5, 1, 1); R(x, '#ff6a1a', 10, 5, 1, 1);
  R(x, '#1a1418', 5, 10, 6, 3); R(x, '#ff6a1a', 6, 11, 4, 1); R(x, '#4a4458', 2, 8, 12, 1);
  return c;
}
function drawOrb(f) {
  const c = mk(10, 10), x = c.getContext('2d');
  ell(x, 5, 5, 5, 5, '#e8401a'); ell(x, 5, 5, 3.6, 3.6, '#ff9a2a'); ell(x, f ? 4.4 : 5.6, f ? 5.6 : 4.4, 2, 2, '#fff2a0');
  return c;
}
function drawWisp(f) {
  const c = mk(14, 16), x = c.getContext('2d');
  ell(x, 7, 10, 6.5, 6, '#e8401a'); R(x, '#e8401a', f ? 4 : 8, 1, 2, 5); R(x, '#e8401a', f ? 9 : 3, 3, 2, 3);
  ell(x, 7, 10.5, 4.8, 4.6, '#ff9a2a'); R(x, '#ff9a2a', f ? 4 : 8, 3, 2, 4);
  ell(x, 7, 11.5, 3, 3, '#fff2a0');
  R(x, '#20140e', 4, 9, 2, 3); R(x, '#20140e', 8, 9, 2, 3);
  return c;
}
function drawCoin(f) {
  const c = mk(10, 12), x = c.getContext('2d'); const rx = [5, 3.2, 1.2, 3.2][f];
  ell(x, 5, 6, rx, 6, '#b87800'); ell(x, 5, 6, Math.max(0.6, rx - 1), 5, '#ffd23a');
  if (rx > 2.5) { ell(x, 5, 6, rx - 2.2, 3.4, '#e8a000'); R(x, '#fff6c0', 5 - Math.floor(rx) + 1, 3, 1, 3); }
  return c;
}
function drawSpark(f) {
  const c = mk(8, 8), x = c.getContext('2d');
  if (f) { R(x, '#ff9a2a', 3, 0, 2, 8); R(x, '#ff9a2a', 0, 3, 8, 2); R(x, '#fff2a0', 3, 2, 2, 4); R(x, '#fff2a0', 2, 3, 4, 2); }
  else { for (let i = 0; i < 8; i++) { R(x, '#ff9a2a', i, i, 1, 1); R(x, '#ff9a2a', 7 - i, i, 1, 1); } R(x, '#fff2a0', 2, 2, 4, 4); R(x, '#ffffff', 3, 3, 2, 2); }
  return c;
}
function drawLantern(lit) {
  const c = mk(16, 32), x = c.getContext('2d');
  R(x, '#5c3a1a', 7, 12, 2, 20); R(x, '#8a5a2b', 7, 12, 1, 20); R(x, '#5c3a1a', 4, 30, 8, 2);
  R(x, '#37323f', 3, 2, 10, 11); R(x, lit ? '#ffd23a' : '#57506a', 4, 4, 8, 7); R(x, '#37323f', 5, 0, 6, 2); R(x, '#37323f', 7, 4, 2, 7);
  if (lit) { R(x, '#fff8c0', 5, 6, 2, 3); R(x, '#fff8c0', 9, 6, 2, 3); R(x, '#ff9a2a', 4, 10, 8, 1); }
  return c;
}

/* ---------------- tiles ---------------- */
function tGround(p, cap) {
  const c = mk(16, 16), x = c.getContext('2d');
  R(x, p.dirt, 0, 0, 16, 16);
  x.fillStyle = p.dirtD; [[3, 7], [10, 9], [6, 12], [13, 13], [1, 14], [8, 5], [14, 6], [5, 2], [11, 1]].forEach(a => x.fillRect(a[0], a[1], 2, 1));
  x.fillStyle = mix(p.dirt, '#ffffff', 0.18); [[1, 10], [9, 14], [12, 4], [5, 8]].forEach(a => x.fillRect(a[0], a[1], 1, 1));
  if (cap) {
    R(x, p.cap, 0, 0, 16, 4); R(x, p.capL, 0, 0, 16, 1);
    const jag = [1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0];
    for (let i = 0; i < 16; i++) { if (jag[i]) { R(x, p.cap, i, 4, 1, 1); R(x, p.capD, i, 5, 1, 1); } else R(x, p.capD, i, 4, 1, 1); }
  }
  return c;
}
function tBrick(base, lite, dark, big) {
  const c = mk(16, 16), x = c.getContext('2d'); R(x, base, 0, 0, 16, 16);
  const rh = big ? 8 : 4;
  for (let r = 0; r < 16 / rh; r++) {
    const y = r * rh; R(x, lite, 0, y, 16, 1); R(x, dark, 0, y + rh - 1, 16, 1);
    const off = (r % 2) ? (big ? 4 : 3) : (big ? 12 : 7);
    for (let vx = off; vx < 16; vx += (big ? 16 : 8)) R(x, dark, vx, y, 1, rh);
  }
  return c;
}
function tCrate(f) {
  const c = mk(16, 16), x = c.getContext('2d');
  R(x, '#7a3c00', 0, 0, 16, 16); R(x, '#f8b020', 1, 1, 14, 14); R(x, '#ffe08a', 1, 1, 14, 1); R(x, '#ffe08a', 1, 1, 1, 14);
  R(x, '#c87800', 1, 14, 14, 1); R(x, '#c87800', 14, 1, 1, 14);
  x.fillStyle = '#7a3c00'; [[2, 2], [13, 2], [2, 13], [13, 13]].forEach(a => x.fillRect(a[0], a[1], 1, 1));
  const g = ['#ffffff', '#fff2a0', '#b86800', '#fff2a0'][f];
  R(x, '#7a3c00', 7, 3, 2, 10); R(x, '#7a3c00', 3, 7, 10, 2); R(x, '#7a3c00', 5, 5, 6, 6);
  R(x, g, 7, 4, 2, 8); R(x, g, 4, 7, 8, 2); R(x, g, 6, 6, 4, 4);
  return c;
}
function tUsed() {
  const c = mk(16, 16), x = c.getContext('2d');
  R(x, '#3c2a1c', 0, 0, 16, 16); R(x, '#8b6b4a', 1, 1, 14, 14); R(x, '#a88660', 1, 1, 14, 1); R(x, '#a88660', 1, 1, 1, 14);
  R(x, '#6a4e34', 1, 14, 14, 1); R(x, '#6a4e34', 14, 1, 1, 14);
  x.fillStyle = '#3c2a1c'; [[3, 3], [12, 3], [3, 12], [12, 12]].forEach(a => x.fillRect(a[0], a[1], 1, 1));
  return c;
}
function tHard(base) {
  const c = mk(16, 16), x = c.getContext('2d'); const hi = mix(base, '#ffffff', 0.4), lo = mix(base, '#000000', 0.4);
  R(x, base, 0, 0, 16, 16); R(x, hi, 0, 0, 16, 2); R(x, hi, 0, 0, 2, 16); R(x, lo, 0, 14, 16, 2); R(x, lo, 14, 0, 2, 16);
  R(x, lo, 4, 4, 8, 8); R(x, base, 5, 5, 7, 7); R(x, hi, 11, 5, 1, 7); R(x, hi, 5, 11, 7, 1);
  return c;
}
function tStump(part) {
  const c = mk(16, 16), x = c.getContext('2d'); const bark = '#8a5a2b', dk = '#5c3a1a', lt = '#b07a40', left = (part === 'l' || part === '[');
  if (part === 'l' || part === 'r') {
    R(x, dk, 0, 0, 16, 16); R(x, bark, left ? 1 : 0, 1, 15, 15); R(x, lt, left ? 1 : 0, 1, 15, 2);
    R(x, '#2a1a0e', left ? 4 : 0, 3, 12, 3); R(x, '#120a06', left ? 6 : 0, 4, 10, 1);
    R(x, dk, 0, 7, 16, 1); R(x, lt, left ? 3 : 5, 9, 1, 5); R(x, dk, left ? 9 : 11, 9, 1, 6); R(x, dk, 0, 15, 16, 1);
  } else {
    R(x, bark, left ? 2 : 0, 0, 14, 16); R(x, dk, left ? 2 : 13, 0, 1, 16); R(x, lt, left ? 4 : 5, 0, 1, 16);
    R(x, dk, left ? 9 : 10, 0, 1, 16); R(x, dk, left ? 6 : 2, 4, 2, 1); R(x, dk, left ? 12 : 7, 11, 2, 1);
  }
  return c;
}
function tPlank() {
  const c = mk(16, 16), x = c.getContext('2d');
  R(x, '#5c3a1a', 0, 0, 16, 6); R(x, '#c08a4a', 0, 0, 16, 5); R(x, '#e8b878', 0, 0, 16, 1); R(x, '#8a5a2b', 0, 4, 16, 1);
  R(x, '#5c3a1a', 7, 1, 1, 3); R(x, '#5c3a1a', 15, 0, 1, 5); R(x, '#5c3a1a', 3, 2, 1, 1); R(x, '#5c3a1a', 11, 2, 1, 1);
  return c;
}
function tSpike() {
  const c = mk(16, 16), x = c.getContext('2d');
  for (let s = 0; s < 3; s++) for (let j = 0; j < 9; j++) { const w = Math.ceil((j + 1) / 2); R(x, j < 3 ? '#ffffff' : '#c8c8d8', s * 5 + 3 - Math.floor(w / 2), 7 + j, w, 1); }
  R(x, '#787888', 0, 15, 16, 1);
  return c;
}
function tLava(f, top) {
  const c = mk(16, 16), x = c.getContext('2d');
  if (!top) { R(x, '#e8501a', 0, 0, 16, 16); R(x, '#ff8a2a', (3 + f * 5) % 16, 4, 3, 2); R(x, '#ff8a2a', (11 + f * 3) % 16, 11, 3, 2); R(x, '#b8300a', (7 + f * 4) % 16, 8, 2, 1); return c; }
  for (let i = 0; i < 16; i++) { const h = 3 + Math.round(Math.sin((i + f * 4) / 16 * Math.PI * 2) * 1.5); R(x, '#ffd23a', i, h, 1, 2); R(x, '#ff8a2a', i, h + 2, 1, 2); R(x, '#e8501a', i, h + 4, 1, 16); }
  return c;
}

/* ---------------- decorations ---------------- */
function dBush(p) { const c = mk(32, 14), x = c.getContext('2d'); ell(x, 9, 10, 8, 7, p.capD); ell(x, 22, 10, 9, 8, p.capD); ell(x, 16, 7, 8, 7, p.capD); ell(x, 9, 10, 6.5, 5.5, p.cap); ell(x, 22, 10, 7.5, 6.5, p.cap); ell(x, 16, 7, 6.5, 5.5, p.cap); R(x, p.capL, 13, 3, 3, 1); R(x, p.capL, 19, 6, 3, 1); return c; }
function dTree(p) { const c = mk(32, 48), x = c.getContext('2d'); R(x, '#5c3a1a', 14, 22, 5, 26); R(x, '#8a5a2b', 14, 22, 2, 26); ell(x, 16, 14, 14, 13, p.capD); ell(x, 16, 13, 12, 11, p.cap); ell(x, 12, 9, 5, 4, p.capL); return c; }
function dPine(p) { const c = mk(24, 44), x = c.getContext('2d'); R(x, '#5c3a1a', 10, 34, 4, 10); for (let t = 0; t < 3; t++) for (let j = 0; j < 14; j++) { const w = 2 + j * 1.5; R(x, '#1e6a4a', 12 - w / 2, t * 9 + j, w, 1); if (j < 4) R(x, p.capL, 12 - w / 2, t * 9 + j, w, 1); } return c; }
function dCactus() { const c = mk(16, 28), x = c.getContext('2d'); R(x, '#2a8a4a', 6, 2, 5, 26); R(x, '#2a8a4a', 1, 9, 3, 8); R(x, '#2a8a4a', 1, 15, 6, 3); R(x, '#2a8a4a', 12, 6, 3, 8); R(x, '#2a8a4a', 10, 12, 5, 3); R(x, '#5fc878', 7, 3, 1, 24); R(x, '#5fc878', 2, 10, 1, 6); R(x, '#5fc878', 13, 7, 1, 6); return c; }
function dRock(p) { const c = mk(22, 12), x = c.getContext('2d'); ell(x, 11, 9, 10.5, 8.5, mix(p.dirtD, '#606070', 0.5)); ell(x, 10, 9, 8.5, 7, mix(p.dirt, '#a0a0b0', 0.5)); R(x, mix(p.dirt, '#ffffff', 0.6), 6, 4, 4, 1); return c; }
function dFlower() { const c = mk(8, 9), x = c.getContext('2d'); R(x, '#2c8a2a', 3, 4, 1, 5); R(x, '#ff6aa0', 2, 0, 3, 4); R(x, '#ff6aa0', 1, 1, 5, 2); R(x, '#ffe060', 3, 1, 1, 2); return c; }
function dCloud(col) { const c = mk(48, 20), x = c.getContext('2d'); const sh = mix(col, '#7090c0', 0.3); ell(x, 12, 13, 10, 7, sh); ell(x, 24, 10, 12, 10, sh); ell(x, 37, 13, 10, 7, sh); ell(x, 12, 12, 9, 6, col); ell(x, 24, 9, 11, 9, col); ell(x, 37, 12, 9, 6, col); return c; }
function dCrystal(col) { const c = mk(12, 16), x = c.getContext('2d'); for (let j = 0; j < 16; j++) { const w = j < 5 ? j + 1 : 6; R(x, col, 3 - Math.min(3, Math.floor(w / 2)), j, w, 1); } R(x, '#ffffff', 2, 5, 1, 8); for (let j = 6; j < 16; j++) R(x, mix(col, '#000000', 0.3), 7, j, Math.min(4, j - 5), 1); return c; }
function dStal(p) { const c = mk(10, 18), x = c.getContext('2d'); for (let j = 0; j < 18; j++) { const w = Math.max(1, 10 - Math.floor(j * 0.55)); R(x, p.dirt, 5 - w / 2, j, w, 1); } R(x, p.dirtD, 5, 0, 2, 12); return c; }
function dTrunk() { const c = mk(16, 16), x = c.getContext('2d'); R(x, '#8a5a2b', 3, 0, 10, 16); R(x, '#5c3a1a', 3, 0, 1, 16); R(x, '#5c3a1a', 12, 0, 1, 16); R(x, '#b07a40', 5, 0, 1, 16); R(x, '#5c3a1a', 8, 3, 1, 5); R(x, '#5c3a1a', 10, 10, 1, 4); return c; }
function dCoral(col) { const c = mk(16, 20), x = c.getContext('2d'); R(x, col, 7, 4, 3, 16); R(x, col, 2, 8, 3, 8); R(x, col, 2, 14, 6, 3); R(x, col, 12, 6, 3, 8); R(x, col, 9, 12, 5, 3); R(x, col, 6, 0, 2, 5); R(x, col, 10, 2, 2, 4); R(x, mix(col, '#ffffff', 0.5), 8, 5, 1, 12); return c; }
function dWeed() { const c = mk(8, 28), x = c.getContext('2d'); for (let j = 0; j < 28; j++) { const o = Math.round(Math.sin(j / 4) * 2); R(x, '#2aa870', 3 + o, j, 2, 1); R(x, '#5fd8a0', 3 + o, j, 1, 1); } return c; }
function dTorch() { const c = mk(8, 20), x = c.getContext('2d'); R(x, '#4a4458', 3, 8, 2, 12); R(x, '#6e6880', 1, 7, 6, 2); ell(x, 4, 4, 3, 4, '#e8401a'); ell(x, 4, 5, 2, 2.6, '#ffd23a'); return c; }
function dWindow() { const c = mk(16, 28), x = c.getContext('2d'); R(x, '#0a0408', 1, 4, 14, 24); ell(x, 8, 5, 7, 5, '#0a0408'); R(x, '#5a1810', 3, 6, 10, 21); ell(x, 8, 7, 5, 4, '#5a1810'); R(x, '#ff6a1a', 4, 18, 8, 9); R(x, '#0a0408', 7, 2, 2, 26); R(x, '#0a0408', 1, 14, 14, 2); return c; }
function dChain() { const c = mk(6, 48), x = c.getContext('2d'); for (let j = 0; j < 48; j += 6) { R(x, '#57506a', 1, j, 4, 5); R(x, '#12070a', 2, j + 1, 2, 3); R(x, '#8a84a0', 1, j, 1, 5); } return c; }
function dArrow() { const c = mk(16, 12), x = c.getContext('2d'); R(x, '#ffd23a', 0, 4, 9, 4); for (let j = 0; j < 6; j++) R(x, '#ffd23a', 9 + j, j, 1, 12 - j * 2); return c; }

/* ---------------- world palettes ---------------- */
const BIO = [null,
  { sky: ['#5fbcff', '#c9ecff'], far: '#9ad8b0', far2: '#74c090', cap: '#48b838', capL: '#8ae868', capD: '#2c8a2a', dirt: '#b06a30', dirtD: '#804818', cloud: '#ffffff' },
  { sky: ['#ffc874', '#ffeec2'], far: '#f0b870', far2: '#e09a50', cap: '#f0c860', capL: '#fff0a8', capD: '#c89838', dirt: '#d89a48', dirtD: '#a86c28', cloud: '#fff6e0' },
  { sky: ['#0c1238', '#2a3a7a'], far: '#1a2858', far2: '#141e48', cap: '#2f9a6a', capL: '#5fd09a', capD: '#1c6a4a', dirt: '#5a4a7a', dirtD: '#3a2f58', cloud: '#4a5a9a', stars: true },
  { sky: ['#8ccaf0', '#e6f6ff'], far: '#d4e6f4', far2: '#b4cee6', cap: '#f4faff', capL: '#ffffff', capD: '#b8d8f0', dirt: '#7a8aa8', dirtD: '#56658a', cloud: '#ffffff' },
  { sky: ['#ffa868', '#ffe1b8'], far: '#d88048', far2: '#b86030', cap: '#e07a20', capL: '#ffa848', capD: '#a85010', dirt: '#8a4a28', dirtD: '#5e2e14', cloud: '#fff0d8' },
  { sky: ['#4a2468', '#f08a6a'], far: '#5a2a68', far2: '#3e1c50', cap: '#7a4aa8', capL: '#a878d8', capD: '#4a2a70', dirt: '#4a3050', dirtD: '#301c38', cloud: '#c878a0', stars: true },
  { sky: ['#9cc0c0', '#e0f0ec'], far: '#9ab8b8', far2: '#7ea0a0', cap: '#4aa890', capL: '#7ad8c0', capD: '#2a7868', dirt: '#607878', dirtD: '#405858', cloud: '#f4fcfa' },
  { sky: ['#200808', '#a83018'], far: '#2a0c0c', far2: '#1a0606', cap: '#6a6a72', capL: '#9a9aa2', capD: '#3a3a42', dirt: '#3a2a2a', dirtD: '#201414', cloud: '#5a2a2a' }];

function seeded(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function makeFar(kind, p, world) {
  const c = mk(320, 240), x = c.getContext('2d'), rnd = seeded(world * 31 + kind.length);
  for (let i = 0; i < 12; i++) R(x, mix(p.sky[0], p.sky[1], i / 11), 0, i * 20, 320, 20);
  if (kind === 'over' || kind === 'sky') {
    if (p.stars) for (let i = 0; i < 70; i++) R(x, i % 5 ? '#c8d0ff' : '#ffffff', Math.floor(rnd() * 320), Math.floor(rnd() * 150), 1, 1);
    const base = kind === 'sky' ? 240 : 212;
    for (let i = 0; i < 320; i++) {
      const a = i / 320 * Math.PI * 2;
      const h = 58 + 26 * Math.sin(a * 2) + 12 * Math.sin(a * 5 + 1.3) + 5 * Math.sin(a * 11 + 2);
      R(x, p.far, i, base - h, 1, h + 40);
      const h2 = 26 + 12 * Math.sin(a * 3 + 2) + 6 * Math.sin(a * 7 + 0.5);
      R(x, p.far2, i, base - h2, 1, h2 + 40);
    }
  } else if (kind === 'cave') {
    for (let i = 0; i < 9; i++) { const cx = Math.floor(rnd() * 320), w = 14 + Math.floor(rnd() * 22); R(x, p.far, cx, 0, w, 240); R(x, p.far2, cx, 0, 3, 240); }
    for (let i = 0; i < 26; i++) R(x, p.far2, Math.floor(rnd() * 320), Math.floor(rnd() * 240), 3, 2);
  } else if (kind === 'water') {
    x.globalAlpha = 0.12; x.fillStyle = '#ffffff';
    for (let i = 0; i < 6; i++) { const cx = Math.floor(rnd() * 320); x.beginPath(); x.moveTo(cx, 0); x.lineTo(cx + 26, 0); x.lineTo(cx - 30, 240); x.lineTo(cx - 70, 240); x.fill(); }
    x.globalAlpha = 1;
    for (let i = 0; i < 30; i++) R(x, '#3a8ad8', Math.floor(rnd() * 320), Math.floor(rnd() * 240), 2, 2);
  } else { // forge
    for (let j = 0; j < 15; j++) for (let i = 0; i < 10; i++) { R(x, p.far, i * 32 + (j % 2) * 16, j * 16, 31, 15); }
    for (let i = 0; i < 6; i++) R(x, mix(p.sky[1], '#ff5a1a', 0.12 + i * 0.05), 0, 180 + i * 10, 320, 10);
    x.globalAlpha = 0.35; for (let j = 11; j < 15; j++) for (let i = 0; i < 10; i++) R(x, p.far, i * 32 + (j % 2) * 16, j * 16, 31, 15); x.globalAlpha = 1;
  }
  return c;
}

const themeCache = {};
S.theme = function (kind, world) {
  const key = kind + world; if (themeCache[key]) return themeCache[key];
  const bio = BIO[world] || BIO[1]; let p, brick, hard;
  if (kind === 'over' || kind === 'sky') { p = Object.assign({}, bio); brick = ['#c8622a', '#f09a5a', '#7a3410']; hard = mix(bio.dirt, '#b0b0c0', 0.6); }
  else if (kind === 'cave') {
    const st = mix(bio.dirt, '#5a6ab0', 0.65);
    p = { sky: ['#0a0816', '#1a1532'], far: mix(st, '#000000', 0.78), far2: mix(st, '#000000', 0.68), cap: mix(st, '#ffffff', 0.25), capL: mix(st, '#ffffff', 0.5), capD: mix(st, '#000000', 0.3), dirt: st, dirtD: mix(st, '#000000', 0.35), cloud: '#ffffff' };
    brick = [mix(st, '#3a70c8', 0.5), mix(st, '#a0d0ff', 0.6), mix(st, '#000020', 0.6)]; hard = mix(st, '#b0b0c0', 0.5);
  } else if (kind === 'water') {
    p = { sky: ['#0a2a6a', '#1a6ab8'], far: '#0a2a6a', far2: '#0a2a6a', cap: '#f0d8a0', capL: '#fff4c8', capD: '#b89858', dirt: '#c8a060', dirtD: '#987038', cloud: '#ffffff' };
    brick = ['#d0688a', '#f0a0b8', '#803050']; hard = '#e07a9a';
  } else {
    p = { sky: ['#12070a', '#2a0e12'], far: '#1c0c10', far2: '#140809', cap: '#6a6070', capL: '#9a90a0', capD: '#3a3440', dirt: '#4a4250', dirtD: '#2a2430', cloud: '#ffffff' };
    brick = ['#8a3a2a', '#c06a4a', '#40140e']; hard = '#7a7088';
  }
  const t = {
    gcap: tGround(p, true), gin: tGround(p, false), B: tBrick(brick[0], brick[1], brick[2], false),
    Q: [0, 1, 2, 3].map(tCrate), U: tUsed(), H: tHard(hard), l: tStump('l'), r: tStump('r'), '[': tStump('['), ']': tStump(']'),
    plank: tPlank(), spike: tSpike(), lavaT: [tLava(0, true), tLava(1, true), tLava(2, true), tLava(3, true)], lavaB: [tLava(0, false), tLava(1, false)],
    X: tBrick(mix(p.dirt, '#6a5060', 0.5), mix(p.capL, '#806070', 0.5), p.dirtD, true)
  };
  const deco = {
    bush: dBush(p), tree: dTree(p), pine: dPine(p), cactus: dCactus(), rock: dRock(p), flower: dFlower(), cloud: dCloud(p.cloud),
    crystal: dCrystal(['#7af0ff', '#ff8ad8', '#b8ff7a', '#ffd23a'][world % 4]), stal: dStal(p), trunk: dTrunk(),
    coral: dCoral(['#ff7a9a', '#ffb05a', '#b07aff'][world % 3]), weed: dWeed(), torch: dTorch(), window: dWindow(), chain: dChain(), arrow: dArrow()
  };
  return (themeCache[key] = { kind, p, tiles: t, far: makeFar(kind, p, world), deco });
};

/* ---------------- init ---------------- */
S.init = function () {
  S.hero = KIP_PALS.map(pal => {
    const mkp = rows => pair(px(rows, pal), false);
    const sj = px(KIP_S_JUMP, pal);
    return {
      small: { idle: mkp(KIP_S_IDLE), run: [mkp(KIP_S_RUN1), mkp(KIP_S_IDLE), mkp(KIP_S_RUN2), mkp(KIP_S_IDLE)], jump: pair(sj, false), dead: pair(flipV(sj), false) },
      big: { idle: mkp(KIP_B_TOP.concat(KIP_B_IDLE)), run: [mkp(KIP_B_TOP.concat(KIP_B_RUN1)), mkp(KIP_B_TOP.concat(KIP_B_IDLE)), mkp(KIP_B_TOP.concat(KIP_B_RUN2)), mkp(KIP_B_TOP.concat(KIP_B_IDLE))], jump: mkp(KIP_B_TOP.concat(KIP_B_JUMP)) }
    };
  });
  const L2 = (a, b, pal) => [pair(px(a, pal), true), pair(px(b, pal), true)];
  S.en = {
    beetle: L2(BEETLE, BEETLE2, BEETLE_PAL), snail: L2(SNAIL, SNAIL2, SNAIL_PAL), shell: pair(px(SHELL, SNAIL_PAL), true),
    bat: L2(BAT1, BAT2, BAT_PAL), urchin: L2(URCHIN, URCHIN2, URCHIN_PAL), thorn: L2(THORN, THORN2, THORN_PAL),
    hopper: [pair(px(FROG, FROG_PAL), true)], fish: L2(FISH, FISH2, FISH_PAL), jelly: L2(JELLY, JELLY2, JELLY_PAL),
    boss: [pair(drawBoss(0), true), pair(drawBoss(1), true)], totem: drawTotem(), orb: [drawOrb(0), drawOrb(1)], wisp: [drawWisp(0), drawWisp(1)]
  };
  S.item = {
    acorn: px(ACORN, { c: '#8a5a2b', C: '#5c3a1a', n: '#e8b060', N: '#fff0c0', d: '#5c3a1a' }),
    pepper: px(PEPPER, { r: '#e8282a', R: '#ffb0a0', g: '#3aa655' }),
    shard: [px(SHARD, { c: '#40d8ff', C: '#d8f8ff', w: '#ffffff' }), px(SHARD, { c: '#ff8ad8', C: '#ffe0f6', w: '#ffffff' }), px(SHARD, { c: '#ffd23a', C: '#fff8c0', w: '#ffffff' })],
    leaf: px(LEAF, { G: '#5fd04a', g: '#2c8a2a', l: '#b8f090', d: '#5c3a1a' })
  };
  S.coin = [0, 1, 2, 3].map(drawCoin);
  S.spark = [drawSpark(0), drawSpark(1)];
  S.lantern = [drawLantern(false), drawLantern(true)];
};
S.mix = mix;
})();
