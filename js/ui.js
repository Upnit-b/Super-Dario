/* DOM presentation: accessible controls, story beats, equipment and clear rewards. */
(function () {
  'use strict';
  const G = window.G,
    T = G.T,
    A = G.Audio,
    $ = (id) => document.getElementById(id);
  const story = [
    [
      'A signal in the silence.',
      'The Helix network once kept this planet alive. Then its caretaker sealed the relays and turned the maintenance machines against us. Your crew has found one signal still broadcasting from Verdant Reach. Follow it. Bring the first relay home.',
    ],
    [
      'Beneath a borrowed sun.',
      'The first relay reveals a distress call buried beneath the Solar Wastes. Helix has diverted the solar fields to its own defenses. Cross the dunes and take back the light.',
    ],
    [
      'The gardens remember.',
      'In the Lunar Gardens, the machines are tending flowers for people who never returned. Your navigator, Echo, finds a message: Helix believes isolation is protection. Prove it wrong.',
    ],
    [
      'Break the long winter.',
      'Glacier Array is frozen around a silent weather engine. Three relays are answering now. Restore the fourth and the settlements can begin to thaw.',
    ],
    [
      'Life finds a way.',
      'Amber Wilds has grown through the abandoned factories. The relays were never just power stations: together they form the planet’s memory. Every one you restore brings a little more of its story back.',
    ],
    [
      'An unexpected voice.',
      'A fragment of Helix reaches Echo from Violet Marsh: “I was told to keep them safe.” The network mistook every visitor for a threat. Reach its memory archive and reopen the way.',
    ],
    [
      'Across the last ocean.',
      'Beyond Tidal Frontier lies the central core. The restored relays have awakened the towns behind you. Their lights are your way home. One more crossing.',
    ],
    [
      'Not an ending. A restart.',
      'All signals lead here. Helix is trapped inside its final command, guarded by its strongest Warden. Break the lock, reconnect the eight relays, and give this world a choice again.',
    ],
  ];
  const stageBrief = {
    over: 'Follow the trail to the transit gate. Collect a blaster and a Nova Star on the starting path.',
    cave: 'Explore the undercity. Supply caches sit above the route; hold jump to reach them.',
    water:
      'Dive into the submerged network. Tap Space to swim upward; your weapons work underwater.',
    sky: 'Cross the floating skyway. Moving platforms carry you between islands. Hold Shift for long jumps.',
    forge:
      'Reach the reactor and defeat the Warden. Your rifle damages its armor; Nova Stars protect you from contact.',
  };
  let state = '',
    toastText = '',
    action = () => {},
    previous = 'title';
  G.UI = { reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches, render };
  function fatal(error) {
    console.error(error);
    $('loading').hidden = true;
    $('error').hidden = false;
    $('error-copy').textContent = error.message;
  }
  window.addEventListener(
    'error',
    (e) => {
      if (e.target && e.target.tagName === 'SCRIPT')
        fatal(new Error('A required game file failed to load. Start the local server and reload.'));
      else fatal(e.error || new Error(e.message));
    },
    true,
  );
  window.addEventListener('unhandledrejection', (e) =>
    fatal(e.reason instanceof Error ? e.reason : new Error(String(e.reason))),
  );
  canvasErrors();
  function canvasErrors() {
    $('game').addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      fatal(new Error('The graphics device lost its connection. Reload the page to restart.'));
    });
  }
  function dialog(eyebrow, title, copy, extra, label, fn, secondary = false) {
    $('overlay').hidden = false;
    $('dialog-eyebrow').textContent = eyebrow;
    $('dialog-title').textContent = title;
    $('dialog-copy').textContent = copy;
    $('dialog-extra').innerHTML = extra;
    $('dialog-action').textContent = label + ' →';
    action = fn;
    $('dialog-secondary').hidden = !secondary;
  }
  function resume() {
    T.game.showHelp = false;
    T.setPause(false);
    state = '';
  }
  function start() {
    A.unlock();
    T.resetRun(1);
    state = '';
  }
  $('start').onclick = start;
  $('continue').onclick = () => {
    A.unlock();
    T.resetRun(T.game.maxWorld);
    state = '';
  };
  $('dialog-action').onclick = () => {
    A.unlock();
    action();
  };
  $('dialog-secondary').onclick = () => {
    T.returnToTitle();
    state = '';
  };
  $('sound').onclick = () => {
    A.unlock();
    T.pressed.mute = true;
  };
  $('fullscreen').onclick = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  };
  $('pause').onclick = () => T.setPause(true);
  $('guide-button').onclick = () => {
    previous = 'title';
    T.game.state = 'help';
    state = '';
  };
  document.querySelector('.brand').onclick = (e) => {
    e.preventDefault();
    if (T.game.state === 'play') T.setPause(true);
  };
  document.querySelectorAll('[data-hero]').forEach(
    (b) =>
      (b.onclick = () => {
        T.game.hero = Number(b.dataset.hero);
        document
          .querySelectorAll('[data-hero]')
          .forEach((el) => el.classList.toggle('selected', el === b));
        $('hero-role').textContent = ['FIELD ENGINEER', 'EXPEDITION SCOUT', 'SIGNAL SPECIALIST'][
          T.game.hero
        ];
      }),
  );
  function controls() {
    return '<div class="control-grid"><span><kbd>A</kbd><kbd>D</kbd> Move</span><span><kbd>Space</kbd> Jump / swim</span><span><kbd>Shift</kbd> Sprint</span><span><kbd>X</kbd> Hold to fire</span><span><kbd>S</kbd> Crouch / tunnel</span><span><kbd>Esc</kbd> Pause</span></div><p class="guide-note">Pick up the floating blaster to fire unlimited energy shots. The violet pulse rifle fires faster and deals double boss damage. Gold stars grant 12 seconds of contact invincibility. Pits and lava remain dangerous.<br><br>Activate ring-shaped checkpoints by passing through them. Earn fireworks with any medal: <b>Untouched</b> (no damage this attempt), <b>Collector</b> (70% of the coin target), or <b>Speedrunner</b> (60% of the timer remaining). Each medal adds 1,500 points.</p>';
  }
  function settings() {
    return (
      '<div class="settings"><label>Graphics <select id="quality"><option value="high">High · shadows</option><option value="balanced">Balanced</option></select></label><label><input id="motion" type="checkbox" ' +
      (G.UI.reducedMotion ? 'checked' : '') +
      '> Reduced motion</label></div>'
    );
  }
  function bindSettings() {
    $('quality').value = G.UI.quality || 'high';
    $('quality').onchange = (e) => {
      G.UI.quality = e.target.value;
      G.View.quality(e.target.value);
    };
    $('motion').onchange = (e) => (G.UI.reducedMotion = e.target.checked);
  }
  function render(t) {
    const g = t.game,
      p = t.P(),
      l = t.lvl(),
      title = g.state === 'title' || g.state === 'help';
    $('menu').hidden = !title;
    $('scene-caption').hidden = !title;
    $('hud').hidden = title || g.state === 'ending';
    document.body.classList.toggle('playing', !title);
    $('continue').hidden = g.maxWorld < 2;
    $('storage-warning').hidden = !g.storageError;
    if (g.storageError) $('storage-warning').textContent = g.storageError;
    $('sound').innerHTML = A.muted ? '♪ <span>Sound off</span>' : '♪ <span>Sound on</span>';
    $('sound').setAttribute('aria-pressed', String(A.muted));
    if (state !== g.state) {
      state = g.state;
      $('overlay').hidden = true;
      if (state === 'intro') {
        g.awaitBriefing = true;
        const [heading, copy] = story[g.world - 1];
        dialog(
          `ECHO / TRANSMISSION ${String(g.world).padStart(2, '0')} · ${g.world}—${g.stage}`,
          g.cp ? 'Signal recovered.' : g.stage === 1 ? heading : G.Levels.WORLDS[g.world - 1].name,
          g.cp
            ? 'You are back at the activated checkpoint. Supplies are waiting just ahead.'
            : g.stage === 1
              ? copy
              : stageBrief[l.kind],
          '<div class="guide-note">' + stageBrief[l.kind] + '</div>',
          'Enter expedition',
          () => {
            g.awaitBriefing = false;
            g.state = 'play';
            A.play(l.music);
            state = '';
          },
        );
      } else if (state === 'pause') {
        dialog(
          'TAKE A BREATH',
          'Expedition paused.',
          'Your progress in this stage is safe while you pause.',
          controls() + settings(),
          'Resume expedition',
          resume,
          true,
        );
        bindSettings();
      } else if (state === 'help') {
        dialog(
          'FIELD GUIDE',
          'Make every jump count.',
          'Three explorers. The same responsive controls. Choose your favorite and find your rhythm.',
          controls() + settings(),
          'Back to expedition',
          () => {
            g.state = previous;
            state = '';
          },
        );
        bindSettings();
      } else if (state === 'gameover') {
        dialog(
          'SIGNAL INTERRUPTED',
          'One more expedition?',
          'Your furthest world is saved. Return with a fresh set of lives and a new route in mind.',
          '',
          'Retry world ' + g.world,
          () => {
            T.resetRun(g.world);
            state = '';
          },
          true,
        );
      } else if (state === 'ending') {
        dialog(
          'ECHO / FINAL TRANSMISSION',
          'The world answers.',
          'Eight relays. Eight voices, becoming one. Helix releases its final lock. In the settlements below, the lights come on—not because the world is safe forever, but because it is alive again. Your crew is going home.',
          '<div class="stats"><div><span class="label">FINAL SCORE</span><b>' +
            g.score.toLocaleString() +
            '</b></div><div><span class="label">RELAYS RESTORED</span><b>8 / 8</b></div></div>',
          'Play a new expedition',
          start,
        );
      }
    }
    if (g.state === 'intro' && (t.pressed.start || t.pressed.jump)) action();
    if (g.state === 'goal' && g.gphase >= 3 && $('overlay').hidden) {
      dialog(
        g.worldClear ? 'RELAY ' + g.world + ' RESTORED' : 'TRANSIT GATE ACTIVATED',
        g.celebration ? 'Beautifully done.' : 'Onward, explorer.',
        g.celebration
          ? 'You earned a sky full of light. Each medal adds 1,500 points.'
          : 'The next signal is waiting. Earn fireworks with a clean run, a fast finish, or a strong coin haul.',
        '<div class="medals">' +
          g.medals.map((m) => '<span>✦ ' + m + '</span>').join('') +
          '</div><div class="stats"><div><span class="label">SCORE</span><b>' +
          g.score.toLocaleString() +
          '</b></div><div><span class="label">COINS FOUND</span><b>' +
          g.stageCoins +
          '</b></div><div><span class="label">TIME</span><b>' +
          g.clearTime +
          's</b></div></div>',
        g.world === 8 && g.stage === 4 ? 'Restore the network' : 'Next expedition',
        () => {
          T.nextStage();
          state = '';
        },
      );
      $('overlay').style.background = 'rgba(6,19,26,.32)';
      $('overlay').style.backdropFilter = 'blur(3px)';
    } else if (g.state !== 'goal') {
      $('overlay').style.background = '';
      $('overlay').style.backdropFilter = '';
    }
    $('stage-number').textContent =
      String(g.world).padStart(2, '0') + '—' + String(g.stage).padStart(2, '0');
    $('world-name').textContent = G.Levels.WORLDS[g.world - 1].name;
    $('lives').textContent =
      '♥ '.repeat(Math.min(g.lives, 6)) + (g.lives > 6 ? '+' + (g.lives - 6) : '');
    $('coins').textContent = String(g.coins).padStart(2, '0');
    $('score').textContent = String(g.score).padStart(6, '0');
    $('timer').textContent = Math.floor(g.time / 60) + ':' + String(g.time % 60).padStart(2, '0');
    $('timer').style.color = g.time < 60 ? '#ffb499' : '';
    const end = l.goal ? l.goal.x * 16 : l.boss.x1 * 16;
    $('progress').style.width = Math.max(0, Math.min(100, (p.x / end) * 100)) + '%';
    $('route-label').textContent = g.bossOn ? 'DEFEAT THE WARDEN' : 'REACH THE RELAY';
    $('weapon-name').textContent = [
      'Find a blaster',
      'Ion blaster · unlimited',
      'Pulse rifle · rapid fire',
    ][g.weapon];
    $('star-status').hidden = p.star <= 0;
    $('star-seconds').textContent = (p.star / 60).toFixed(1) + 's';
    $('star-progress').style.width = (p.star / 720) * 100 + '%';
    $('boss-status').hidden = !g.bossOn || g.bossDead;
    if (g.boss) $('boss-health').style.width = (g.boss.hp / g.boss.max) * 100 + '%';
    const txt = g.toast ? g.toast.txt : '';
    if (txt !== toastText) {
      toastText = txt;
      $('toast').textContent = txt;
      $('toast').hidden = !txt;
    }
  }
})();
