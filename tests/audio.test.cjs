const { test }=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function audio(){const env={window:{},setInterval(){},setTimeout(){},console};vm.createContext(env);vm.runInContext(fs.readFileSync('js/audio.js','utf8'),env);return env.window.G.Audio;}
test('nine original arrangements cover all gameplay environments and story states',()=>{const a=audio();assert.deepEqual(Object.keys(a.tracks).sort(),['boss','cave','ending','forge','over','sky','star','title','water']);for(const track of Object.values(a.tracks)){assert.ok(track.bpm>=60&&track.bpm<=160);assert.equal(track.chords.length,4);assert.ok(Number.isFinite(track.root));}});
test('music queues until user interaction and stop cancels the pending track',()=>{const a=audio();a.play('over');assert.equal(a.current(),'over');a.stop();assert.equal(a.current(),null);});
test('invalid track and effect names surface explicit errors',()=>{const a=audio();assert.throws(()=>a.play('missing'),/Unknown music track/);assert.throws(()=>a.sfx('missing'),/Unknown sound effect/);});
test('unsupported audio reports an error instead of pretending to play',()=>{const a=audio();assert.throws(()=>a.unlock(),/Web Audio is unavailable/);});
