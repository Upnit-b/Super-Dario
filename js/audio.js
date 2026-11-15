/* Nova Rift: original layered electronic score, synthesized locally with Web Audio. */
(function(){
'use strict';
const G=window.G=window.G||{},A=G.Audio={muted:false};
let ac=null,master,music,sfx,reverb,delay,noiseBuffer,track=null,pending=null,paused=false,tempo=1,next=0,step=0,bus=null;
const tracks=A.tracks={
  title:{bpm:88,root:50,chords:[0,5,9,7],mood:'air',drums:false},
  over:{bpm:112,root:50,chords:[0,5,9,7],mood:'bright',drums:true},
  cave:{bpm:94,root:45,chords:[0,8,5,7],mood:'dark',drums:true},
  water:{bpm:82,root:52,chords:[0,5,9,7],mood:'air',drums:false},
  sky:{bpm:124,root:55,chords:[0,9,5,7],mood:'bright',drums:true},
  forge:{bpm:118,root:40,chords:[0,8,3,7],mood:'dark',drums:true},
  boss:{bpm:138,root:40,chords:[0,3,8,7],mood:'dark',drums:true},
  star:{bpm:136,root:57,chords:[0,5,9,7],mood:'bright',drums:true},
  ending:{bpm:92,root:50,chords:[0,5,9,7],mood:'air',drums:true}
};
const hz=n=>440*2**((n-69)/12);
function init(){
  if(ac)return;
  const Context=window.AudioContext||window.webkitAudioContext;
  if(!Context)throw new Error('Web Audio is unavailable in this browser.');
  ac=new Context();
  const limiter=ac.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=18;limiter.ratio.value=5;limiter.attack.value=.005;limiter.release.value=.18;limiter.connect(ac.destination);
  master=ac.createGain();master.gain.value=A.muted?0:.7;master.connect(limiter);
  music=ac.createGain();music.gain.value=.62;music.connect(master);
  sfx=ac.createGain();sfx.gain.value=.55;sfx.connect(master);
  reverb=ac.createConvolver();const impulse=ac.createBuffer(2,Math.floor(ac.sampleRate*2.4),ac.sampleRate);
  for(let ch=0;ch<2;ch++){const data=impulse.getChannelData(ch);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,3)*.35;}
  reverb.buffer=impulse;const wet=ac.createGain();wet.gain.value=.28;reverb.connect(wet);wet.connect(music);
  delay=ac.createDelay(1);delay.delayTime.value=.32;const feedback=ac.createGain();feedback.gain.value=.2;const echo=ac.createGain();echo.gain.value=.16;delay.connect(feedback);feedback.connect(delay);delay.connect(echo);echo.connect(music);
  noiseBuffer=ac.createBuffer(1,ac.sampleRate,ac.sampleRate);const data=noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  setInterval(schedule,25);
}
A.unlock=function(){init();if(ac.state==='suspended'&&!paused)ac.resume();if(pending){const name=pending;pending=null;A.play(name);}};
A.setMute=function(value){A.muted=value;if(ac)master.gain.setTargetAtTime(value?0:.7,ac.currentTime,.04);};
A.tempo=function(value){tempo=value;};
A.pause=function(value){paused=value;if(ac){if(value)ac.suspend();else ac.resume();}};
A.current=()=>track?track.name:pending;
function tone(n,t,duration,volume,type='sine',out=bus,pan=0,detune=0){
  const osc=ac.createOscillator(),gain=ac.createGain(),filter=ac.createBiquadFilter(),stereo=ac.createStereoPanner();
  osc.type=type;osc.frequency.setValueAtTime(hz(n),t);osc.detune.value=detune;
  filter.type='lowpass';filter.frequency.setValueAtTime(type==='sawtooth'?1400:5400,t);filter.frequency.exponentialRampToValueAtTime(type==='sawtooth'?430:1800,t+duration);
  gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(volume,t+Math.min(.04,duration*.15));gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
  stereo.pan.value=pan;osc.connect(filter);filter.connect(gain);gain.connect(stereo);stereo.connect(out);osc.start(t);osc.stop(t+duration+.05);
  osc.onended=()=>{osc.disconnect();filter.disconnect();gain.disconnect();stereo.disconnect();};
}
function pad(root,t,duration,mood){
  const third=mood==='dark'?3:4;
  for(const[n,pan]of [[root,-.55],[root+third,.2],[root+7,.55],[root+14,-.2]]){
    tone(n,t,duration,.032,'sine',bus,pan);tone(n,t,duration,.012,'triangle',bus,-pan,5);
  }
}
function noise(t,d,volume,cutoff,out){
  const source=ac.createBufferSource(),filter=ac.createBiquadFilter(),gain=ac.createGain();source.buffer=noiseBuffer;
  filter.type='highpass';filter.frequency.value=cutoff;gain.gain.setValueAtTime(volume,t);gain.gain.exponentialRampToValueAtTime(.0001,t+d);
  source.connect(filter);filter.connect(gain);gain.connect(out);source.start(t);source.stop(t+d+.01);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
}
function kick(t,out=bus){const osc=ac.createOscillator(),gain=ac.createGain();osc.frequency.setValueAtTime(135,t);osc.frequency.exponentialRampToValueAtTime(42,t+.17);gain.gain.setValueAtTime(.35,t);gain.gain.exponentialRampToValueAtTime(.0001,t+.27);osc.connect(gain);gain.connect(out);osc.start(t);osc.stop(t+.3);osc.onended=()=>{osc.disconnect();gain.disconnect();};}
const melody=[0,null,7,12,null,9,7,null,4,null,2,7,null,4,2,null,0,null,4,7,12,null,14,12,9,null,7,4,2,null,null,null];
function schedule(){
  if(!ac||!track||paused||ac.state!=='running')return;
  const def=track.def,beat=60/def.bpm/tempo,unit=beat/4;
  if(next<ac.currentTime-.2)next=ac.currentTime+.03;
  while(next<ac.currentTime+.12){
    const bar=Math.floor(step/16),position=step%16,root=def.root+def.chords[Math.floor(bar/2)%4];
    if(step%32===0)pad(root,next,beat*8*.98,def.mood);
    if(position===0||position===8)tone(root-12,next,beat*1.7,.12,'sine',bus);
    if(position===6||position===14)tone(root-5,next,beat*.4,.055,'triangle',bus);
    // Alternate a spacious lead with an arpeggiated answer over a sixteen-bar phrase.
    const lead=melody[step%32];
    if(lead!==null&&bar%4<2){let n=root+12+lead;if(def.mood==='dark'&&lead===4)n--;tone(n,next,beat*.8,.045,'sine',bus,Math.sin(step)*.3);tone(n+12,next,beat*.3,.008,'sine',bus);}
    if(bar%4>=2&&position%2===0){const arp=[0,7,12,16,14,7,9,4][position/2];tone(root+12+arp,next,beat*.75,.025,'triangle',bus,position%4===0?-.5:.5);}
    if(def.drums){
      if(position===0||position===8||(def.mood==='dark'&&position===11))kick(next);
      if(position===4||position===12){noise(next,.14,.07,1800,bus);tone(50,next,.12,.035,'triangle',bus);}
      if(position%2===0)noise(next,.04,position%4===2?.025:.012,7000,bus);
    }
    next+=unit;step=(step+1)%256;
  }
}
A.play=function(name){
  if(!(name in tracks))throw new Error('Unknown music track: '+name);
  if(track&&track.name===name)return;
  if(!ac){pending=name;return;}
  A.stop();bus=ac.createGain();bus.gain.setValueAtTime(.0001,ac.currentTime);bus.gain.linearRampToValueAtTime(1,ac.currentTime+.4);bus.connect(music);bus.connect(reverb);bus.connect(delay);
  track={name,def:tracks[name]};next=ac.currentTime+.04;step=0;
};
A.stop=function(){pending=null;if(!track)return;const old=bus;track=null;old.gain.setTargetAtTime(0,ac.currentTime,.045);setTimeout(()=>old.disconnect(),900);};
A.jingle=function(name){A.stop();if(!ac)return;const notes={clear:[62,66,69,74],worldclear:[62,69,74,78,81],die:[62,57,50],gameover:[57,53,50],ending:[62,66,69,74,81]};if(!(name in notes))throw new Error('Unknown jingle: '+name);notes[name].forEach((n,i)=>tone(n,ac.currentTime+i*.14,.8,.12,'sine',sfx,i%2?.3:-.3));};
function sweep(from,to,duration,volume){const osc=ac.createOscillator(),gain=ac.createGain();const t=ac.currentTime;osc.type='sine';osc.frequency.setValueAtTime(from,t);osc.frequency.exponentialRampToValueAtTime(to,t+duration);gain.gain.setValueAtTime(volume,t);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);osc.connect(gain);gain.connect(sfx);osc.start(t);osc.stop(t+duration+.01);osc.onended=()=>{osc.disconnect();gain.disconnect();};}
const effects={
  jump:()=>sweep(230,520,.17,.1),jumpBig:()=>sweep(190,400,.2,.12),swim:()=>sweep(370,620,.16,.07),
  coin:()=>{tone(88,ac.currentTime,.3,.11,'sine',sfx);tone(95,ac.currentTime+.06,.4,.06,'sine',sfx);},
  spark:()=>{sweep(1300,210,.1,.13);noise(ac.currentTime,.065,.045,3800,sfx);},
  stomp:()=>{sweep(190,55,.12,.17);noise(ac.currentTime,.08,.07,600,sfx);},
  kick:()=>sweep(280,65,.12,.14),bump:()=>sweep(140,70,.08,.12),brk:()=>noise(ac.currentTime,.25,.2,800,sfx),
  item:()=>[67,74,79].forEach((n,i)=>tone(n,ac.currentTime+i*.065,.3,.07,'sine',sfx)),
  power:()=>[62,66,69,74,81].forEach((n,i)=>tone(n,ac.currentTime+i*.065,.55,.085,'sine',sfx)),
  hurt:()=>{noise(ac.currentTime,.18,.16,700,sfx);sweep(330,90,.25,.15);},
  life:()=>[74,78,81,86].forEach((n,i)=>tone(n,ac.currentTime+i*.1,.6,.1,'sine',sfx)),
  pause:()=>tone(74,ac.currentTime,.3,.06,'sine',sfx),
  beacon:()=>[62,69,74,78].forEach((n,i)=>tone(n,ac.currentTime+i*.12,.8,.09,'sine',sfx)),
  bosshit:()=>{kick(ac.currentTime,sfx);noise(ac.currentTime,.18,.17,900,sfx);},bossjump:()=>sweep(110,45,.25,.18),
  tick:()=>tone(86,ac.currentTime,.035,.025,'sine',sfx),hurry:()=>[81,81,86].forEach((n,i)=>tone(n,ac.currentTime+i*.16,.13,.08,'sine',sfx)),
  tunnel:()=>sweep(440,90,.4,.12),select:()=>tone(81,ac.currentTime,.1,.06,'sine',sfx),flame:()=>noise(ac.currentTime,.3,.1,1800,sfx),
  firework:()=>{sweep(100,45,.4,.15);noise(ac.currentTime,.55,.11,1700,sfx);}
};
A.sfx=function(name){if(!(name in effects))throw new Error('Unknown sound effect: '+name);if(!ac||ac.state!=='running')return;effects[name]();};
})();
