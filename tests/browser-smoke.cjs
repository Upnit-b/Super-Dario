/* Run with PLAYWRIGHT_MODULE pointing to an installed Playwright package. No browser dependency ships with the game. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const url = process.env.GAME_URL || 'http://127.0.0.1:8642';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors=[];
  try {
    const page = await browser.newPage({viewport:{width:1440,height:900}});
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
    page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
    await page.addInitScript(()=>{
      const Original=window.AudioContext;
      window.AudioContext=class extends Original{constructor(){super();window.testAudio=this;}};
    });
    await page.goto(url);
    await page.waitForFunction(()=>window.G.View && G.View.stats().render.frame>2);
    await page.screenshot({path:'/private/tmp/nova-title.png'});
    await page.click('[data-hero="2"]');
    assert.equal(await page.evaluate(()=>G.T.game.hero),2);
    await page.click('#start');
    await page.waitForSelector('#dialog-action:visible');
    assert.equal(await page.locator('#dialog-title').textContent(),'A signal in the silence.');
    await page.click('#dialog-action');
    await page.keyboard.down('d');
    await page.waitForFunction(()=>G.T.game.weapon===1);
    await page.waitForFunction(()=>G.T.P().star>0);
    await page.keyboard.up('d');
    await page.keyboard.down('x');
    await page.waitForFunction(()=>G.T.area().ents.some(e=>e.t==='shot'));
    await page.keyboard.up('x');
    await page.keyboard.press('Space');
    await page.waitForFunction(()=>!G.T.P().onGround);
    await page.screenshot({path:'/private/tmp/nova-play.png'});
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>G.T.game.state==='pause');
    const paused=await page.evaluate(()=>({x:G.T.P().x,star:G.T.P().star,time:G.T.game.time,frame:G.View.stats().render.frame}));
    await page.waitForFunction(f=>G.View.stats().render.frame>f+5,paused.frame);
    assert.deepEqual(await page.evaluate(()=>({x:G.T.P().x,star:G.T.P().star,time:G.T.game.time})),{x:paused.x,star:paused.star,time:paused.time});
    await page.selectOption('#quality','balanced');
    await page.check('#motion');
    await page.click('#dialog-action');
    assert.equal(await page.evaluate(()=>G.T.game.state),'play');
    await page.click('#sound');
    await page.waitForFunction(()=>G.Audio.muted);
    await page.reload();
    await page.waitForFunction(()=>window.G.View);
    assert.equal(await page.evaluate(()=>G.Audio.muted),true);
    console.log('PASS: character selection, story, movement, gun, star, jump, pause, quality, mute persistence');

    for(let w=1;w<=8;w++)for(let s=1;s<=4;s++){
      const before=await page.evaluate(([w,s])=>{const t=G.T;t.game.world=w;t.game.stage=s;t.game.cp=null;t.game.pw=1;t.startIntro();return G.View.stats().render.frame;},[w,s]);
      await page.waitForFunction(f=>G.View.stats().render.frame>f+2,before);
      assert.equal(await page.locator('#error').isVisible(),false,`${w}-${s} renders`);
      if(w===3&&s===2||w===1&&s===3||w===8&&s===4){
        await page.click('#dialog-action');
        await page.screenshot({path:`/private/tmp/nova-${w}-${s}.png`});
      }
    }
    console.log('PASS: all 32 stages render; memory:',await page.evaluate(()=>G.View.stats().memory));
    await page.evaluate(()=>{const t=G.T;t.game.world=1;t.game.stage=1;t.game.cp=null;t.startIntro();});
    await page.waitForSelector('#dialog-action:visible');await page.click('#dialog-action');
    await page.waitForFunction(()=>G.T.game.state==='play');
    await page.evaluate(()=>{
      const t = G.T;
      t.P().x = t.lvl().goal.x * 16;
      t.cam.x = t.P().x - 140;
      t.game.time = 1;
      t.game.damageTaken = 0;
    });
    await page.waitForFunction(()=>document.getElementById('dialog-extra').textContent.includes('UNTOUCHED'));
    assert.match(await page.locator('#dialog-extra').textContent(),/UNTOUCHED/);
    await page.waitForFunction(()=>G.T.area().parts.some(part=>part.k==='rocket'));
    await page.screenshot({path:'/private/tmp/nova-results.png'});
    await page.click('#dialog-action');
    assert.equal(await page.evaluate(()=>G.T.game.stage),2);
    console.log('PASS: medal results and next-stage transition');
    await page.waitForFunction(()=>G.T.game.state==='intro');
    await page.click('#dialog-action');
    await page.click('#pause');
    await page.click('#dialog-secondary');
    await page.waitForFunction(()=>G.T.game.state==='title');
    assert.deepEqual(await page.evaluate(()=>[G.T.lvl().world,G.T.lvl().stage]),[1,1]);
    console.log('PASS: returning from a later stage restores the title scene');
    assert.deepEqual(errors,[]);
    console.log('PASS: no console errors, uncaught exceptions or failed assets');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
