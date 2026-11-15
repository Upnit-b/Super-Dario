import * as THREE from '../vendor/three.module.min.js';

// True 3D geometry, lit materials and a side-on camera share the simulation's tile coordinates.
const G = window.G;
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1, .1, 250);
const hemi = new THREE.HemisphereLight(0xd1edff, 0x394a3f, 2.25);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffecd0, 3.2);
sun.position.set(-12, 24, 14); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -22; sun.shadow.camera.right = 22;
sun.shadow.camera.top = 18; sun.shadow.camera.bottom = -18;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 70;
sun.shadow.bias = -.0005; sun.shadow.normalBias = .04;
scene.add(sun, sun.target);
const rim = new THREE.DirectionalLight(0xa0f9dc, 1.5); rim.position.set(12, 8, -12); scene.add(rim);
const world = new THREE.Group(), scenery = new THREE.Group(), actors = new THREE.Group(), atmosphere = new THREE.Group();
scene.add(world, scenery, actors, atmosphere);
const materials = new Map();
function mat(color, metal = 0, rough = .65, glow = 0) {
  const key = `${color}/${metal}/${rough}/${glow}`;
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, emissive: color, emissiveIntensity: glow }));
  return materials.get(key);
}
const boxGeo = new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
const boxPositions=boxGeo.attributes.position;
const edgePoint=new THREE.Vector3(),edgeNormal=new THREE.Vector3();
for(let i=0;i<boxPositions.count;i++){
  edgePoint.fromBufferAttribute(boxPositions,i);
  edgeNormal.set(Math.max(-.42,Math.min(.42,edgePoint.x)),Math.max(-.42,Math.min(.42,edgePoint.y)),Math.max(-.42,Math.min(.42,edgePoint.z)));
  edgePoint.sub(edgeNormal).normalize().multiplyScalar(.08).add(edgeNormal);
  boxPositions.setXYZ(i,edgePoint.x,edgePoint.y,edgePoint.z);
}
boxGeo.computeVertexNormals();
const sphereGeo = new THREE.SphereGeometry(1, 20, 14);
const icoGeo = new THREE.IcosahedronGeometry(1, 2);
const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 16);
const coneGeo = new THREE.ConeGeometry(1, 1, 8);
const ringGeo = new THREE.TorusGeometry(1, .065, 10, 56);
const capsuleGeo = new THREE.CapsuleGeometry(.18, .4, 5, 12);
function mesh(parent, geo, color, x, y, z, sx = 1, sy = 1, sz = 1, metal = 0, glow = 0) {
  const m = new THREE.Mesh(geo, mat(color, metal, .6, glow));
  m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
const box = (p,c,x,y,z,sx,sy,sz,metal=0,glow=0) => mesh(p,boxGeo,c,x,y,z,sx,sy,sz,metal,glow);
const ball = (p,c,x,y,z,sx,sy=sx,sz=sx,metal=0,glow=0) => mesh(p,sphereGeo,c,x,y,z,sx,sy,sz,metal,glow);
function ring(p,c,x,y,z,r,glow=0) { return mesh(p,ringGeo,c,x,y,z,r,r,r,.4,glow); }
function group(parent,x=0,y=0,z=0) { const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g; }
const palettes = [
  { sky:0x819fa5, fog:0x94b3b3, ground:0x536f65, top:0x91b691, leaf:0x769d7a, rock:0x7b9385, accent:0xb9f7d1 },
  { sky:0xd7b398, fog:0xdcc3a2, ground:0x9e765d, top:0xd5ae79, leaf:0x8caa94, rock:0xc8a278, accent:0xffd19a },
  { sky:0x202b4c, fog:0x485571, ground:0x50536c, top:0x7a8d93, leaf:0x8a8ab2, rock:0x646c8c, accent:0xc0b4ff },
  { sky:0x92b5cd, fog:0xb6cfd7, ground:0x637c8e, top:0xe0e8e4, leaf:0x8eafbc, rock:0x91aebb, accent:0xa7f2ff },
  { sky:0xc5a69a, fog:0xc8b4a4, ground:0x7e6652, top:0xc69c70, leaf:0xc68d64, rock:0x93816c, accent:0xffd9aa },
  { sky:0x4b4265, fog:0x797187, ground:0x57576a, top:0x9c87ac, leaf:0x837f9e, rock:0x7c7c91, accent:0xf2b5ef },
  { sky:0x6c9cba, fog:0x9fc7c9, ground:0x627c84, top:0xb6d5c8, leaf:0x80b7b1, rock:0x8babb2, accent:0x9de8f2 },
  { sky:0x342c3d, fog:0x675663, ground:0x5a5059, top:0x8e6f74, leaf:0x725b64, rock:0x847078, accent:0xffac83 }
];
const coinGeo=new THREE.TorusGeometry(.22,.065,8,20);
const portalDiscs=new Map();
let palette=palettes[0], currentArea=null, currentKind='', currentHero=-1, hero=null, tileState='', coinInstances=null;
let decor=[], portals=[], coinTiles=[], entityMeshes=new Map();
const dummy=new THREE.Object3D();
const starsGeo = new THREE.BufferGeometry();
const starShape=new THREE.Shape();
for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?.23:.5;const x=Math.cos(a)*r,y=Math.sin(a)*r;if(i===0)starShape.moveTo(x,y);else starShape.lineTo(x,y);}starShape.closePath();
const starGeo=new THREE.ExtrudeGeometry(starShape,{depth:.14,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.035,bevelThickness:.035});
const particleGeo=new THREE.BufferGeometry();
const particlePositions=new Float32Array(1200*3), particleColors=new Float32Array(1200*3);
particleGeo.setAttribute('position',new THREE.BufferAttribute(particlePositions,3));particleGeo.setAttribute('color',new THREE.BufferAttribute(particleColors,3));
const particles=new THREE.Points(particleGeo,new THREE.PointsMaterial({size:.1,vertexColors:true,transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending}));particles.frustumCulled=false;scene.add(particles);
const ambientPositions=new Float32Array(180*3);
for(let i=0;i<180;i++){ambientPositions[i*3]=(i*7.31)%38-19;ambientPositions[i*3+1]=(i*3.47)%15;ambientPositions[i*3+2]=(i*2.79)%18-12;}
starsGeo.setAttribute('position',new THREE.BufferAttribute(ambientPositions,3));
const motes=new THREE.Points(starsGeo,new THREE.PointsMaterial({size:.055,color:0xfff0cc,transparent:true,opacity:.55,depthWrite:false}));scene.add(motes);
function clear(g){g.traverse(o=>{if(o.isInstancedMesh)o.dispose();});g.clear();}
function gun(parent,scale=1){const g=group(parent);box(g,0x263c46,.22,0,0,.65,.17,.18,.75);box(g,0xb4dbce,.12,.07,0,.35,.12,.2,.5);box(g,0x72efdc,.58,.01,0,.19,.08,.1,.6,1.8);box(g,0x273746,.02,-.14,0,.13,.22,.12,.6);g.scale.setScalar(scale);return g;}
function humanoid(index){
  const suits=[0xa9dac3,0xdd9c6e,0xb1a4dc],skins=[0xc18b68,0x784e3c,0xddae8b],hair=[0x302a2a,0x251f23,0x302e46];
  const root=group(actors),body=group(root),color=suits[index];
  ball(body,0x243b42,0,.82,0,.29,.37,.21);
  ball(body,color,0,1.01,.015,.3,.28,.225,.35);
  box(body,0xe1ebe2,0,1.18,.02,.42,.085,.34,.25);
  box(body,0x21383d,0,.98,.23,.19,.2,.035,.7);
  box(body,0x8bf6d8,0,1.03,.244,.12,.04,.02,.4,1.5);
  box(body,0x39494c,0,.7,.02,.43,.11,.35,.4);
  box(body,0xd8d1b4,0,.7,.22,.1,.07,.04,.8);
  box(body,0x34464b,0,1,-.26,.37,.46,.22,.6);
  box(body,color,0,1.08,-.39,.28,.15,.06,.3);
  const neck=ball(body,skins[index],0,1.31,0,.11,.13,.12);
  const head=group(body,0,1.54,.005);
  ball(head,skins[index],0,0,0,.215,.255,.198);
  ball(head,hair[index],0,.12,-.035,.224,.18,.2);
  ball(head,hair[index],-.13,.025,-.03,.08,.19,.16);
  ball(head,skins[index],0,-.035,.192,.045,.055,.04);
  for(const x of [-.075,.075]){ball(head,0x212a2c,x,.025,.18,.026,.024,.016);box(head,hair[index],x,.075,.177,.064,.013,.02);}
  box(head,0x8f5f52,0,-.107,.18,.075,.012,.016);
  for(const x of [-.23,.23]){ball(head,0x273b43,x,.015,-.015,.058,.09,.07,.6);ball(head,0x92efd7,x*1.12,.016,.005,.025,.043,.04,.4,1);}
  if(index!==1){const tail=ball(head,hair[index],0,-.08,-.22,.11,.24,.12);tail.rotation.x=-.35;}
  const arms=[],legs=[];
  for(const side of [-1,1]){
    const arm=group(body,side*.37,1.14,0);arms.push(arm);
    ball(arm,color,0,-.06,0,.145,.15,.16,.3);
    mesh(arm,capsuleGeo,0x30464b,0,-.32,0,.6,.65,.6);
    box(arm,color,0,-.43,.015,.17,.19,.19,.35);
    ball(arm,0x26383d,0,-.58,.02,.095,.11,.1);
    const leg=group(body,side*.15,.65,0);legs.push(leg);
    mesh(leg,capsuleGeo,0x263b42,0,-.26,0,.66,.72,.66);
    box(leg,color,0,-.27,.075,.18,.15,.17,.4);
    box(leg,0x2a3b40,0,-.54,.055,.22,.18,.34,.35);
    box(leg,0x91a9a1,0,-.63,.08,.22,.035,.34,.4);
  }
  const weapon=gun(body,.75);weapon.position.set(.49,.83,.22);
  const aura=ring(root,0xffd788,0,.9,.05,.9,2);aura.visible=false;
  root.userData={body,head,arms,legs,weapon,aura};return root;
}
function robot(type){
  const g=new THREE.Group();
  if(type==='shot'){box(g,0xb3ffed,0,0,0,.55,.09,.09,.1,3);ball(g,0xf3fff3,.25,0,0,.09,.075,.075,0,3);return g;}
  if(type==='plat'){box(g,0x364b55,0,.1,0,3,.35,1.6,.65);box(g,0xb6ddcb,0,.29,0,2.9,.05,1.5,.5);box(g,0x72efd2,0,.05,.82,2.6,.035,.03,.3,2);return g;}
  if(type==='boss'){
    box(g,0x303f4b,0,1,0,1.5,1.5,.8,.7);box(g,0x9b7f72,0,1.65,.07,1.25,.5,.85,.65);
    box(g,0xff8b6d,0,1.65,.51,.75,.085,.04,.5,2);
    ball(g,0xffa17a,0,1.05,.48,.26,.26,.1,.5,1.3);
    for(const sign of [-1,1]){box(g,0x48545a,sign*.9,1.13,0,.45,.95,.6,.6);box(g,0x243746,sign*.43,.2,.1,.5,.4,.7,.8);mesh(g,coneGeo,0xc7b6a2,sign*.6,2.15,0,.16,.55,.16,.6);}
    return g;
  }
  if(['orb','ember','wisp','jet'].includes(type)){ball(g,0xffab7c,0,.4,0,.22,.3,.22,.2,2);ring(g,0xff765b,0,.4,0,.35,1);return g;}
  if(type==='totem'||type==='thorn'){
    mesh(g,cylinderGeo,0x344751,0,.3,0,.38,.6,.38,.7);
    ball(g,0x849b99,0,.7,0,.42,.27,.4,.7);box(g,0xff9c7c,0,.74,.35,.25,.06,.09,.4,1.5);box(g,0x263943,.4,.7,0,.45,.16,.19,.8);return g;
  }
  if(['bat','fish','jelly'].includes(type)){
    ball(g,0x546d7c,0,.4,0,.4,.25,.28,.7);ball(g,0xf29d89,0,.4,.25,.12,.08,.06,.5,1.6);
    for(const sign of [-1,1]){box(g,0x233e4c,sign*.5,.42,0,.55,.07,.34,.7);const rotor=ring(g,0x9cc8c3,sign*.57,.5,0,.26,.5);rotor.rotation.x=Math.PI/2;}
    return g;
  }
  const shell=type==='snail',spiky=type==='urchin';
  ball(g,shell?0x718b97:spiky?0x9c777a:0x819d91,0,.4,0,.42,.32,.36,.55);
  box(g,0x263b46,0,.25,0,.65,.22,.55,.65);
  box(g,0xffb190,0,.46,.34,.28,.045,.03,.3,1.7);
  for(const sign of [-1,1]){mesh(g,cylinderGeo,0x233741,sign*.3,.17,.2,.15,.18,.15,.5).rotation.x=Math.PI/2;box(g,0x37515a,sign*.28,.04,.02,.2,.12,.5,.6);}
  if(shell){for(let i=-1;i<=1;i++)box(g,0xbed3c7,i*.19,.64,-.04,.055,.13,.49,.6);}
  if(spiky){for(let i=0;i<5;i++){const a=i*Math.PI*2/5;mesh(g,coneGeo,0xd7b9a4,Math.cos(a)*.3,.78,Math.sin(a)*.25,.08,.35,.08,.6);}}
  if(type==='hopper'){for(const sign of [-1,1])mesh(g,capsuleGeo,0xbbbbb0,sign*.32,.04,0,.4,.8,.4);}
  return g;
}
function pickup(kind){
  const g=new THREE.Group();
  if(kind==='blaster'||kind==='pulse'){gun(g,.95);const r=ring(g,kind==='pulse'?0xc6b3ff:0x8cf4d4,0,0,0,.6,1);r.rotation.y=.3;}
  else if(kind==='shard'){mesh(g,starGeo,0xffd789,0,0,0,1,1,1,.7,.7);}
  else if(kind==='leaf'){ball(g,0xf4aaad,-.12,.1,0,.2);ball(g,0xf4aaad,.12,.1,0,.2);const m=box(g,0xf4aaad,0,-.07,0,.3,.3,.25);m.rotation.z=Math.PI/4;}
  else{mesh(g,icoGeo,kind==='pepper'?0xc2afff:0x93e0c5,0,0,0,.33,.45,.33,.5,.4);ring(g,0xb3e6dc,0,0,0,.48,.5);}
  return g;
}
function portal(parent,x,y,large=true){
  const g=group(parent,x,y,0),r=large?1.7:.65;
  box(g,0x354b53,0,.12,0,r*1.4,.24,1.15,.7);
  const outer=ring(g,0x536f75,0,r+.22,0,r);outer.scale.z=2.6;
  const inner=ring(g,0xb5f7db,0,r+.22,.06,r*.88,1.8);
  const inner2=ring(g,0x86b8b7,0,r+.22,-.08,r*.76,.5);inner2.rotation.y=.4;
  if(!portalDiscs.has(r))portalDiscs.set(r,new THREE.CircleGeometry(r*.72,64));
  const core=mesh(g,portalDiscs.get(r),0x6bd4cb,0,r+.22,-.06,1,1,1,.4,.35);
  core.material=new THREE.MeshBasicMaterial({color:0x83dfd0,transparent:true,opacity:.09,side:THREE.DoubleSide,depthWrite:false});core.castShadow=false;
  for(let i=0;i<8;i++){const a=i*Math.PI/4;const brace=box(g,0xb8cec1,Math.cos(a)*r,Math.sin(a)*r+r+.22,.03,.12,.28,.26,.7);brace.rotation.z=a-Math.PI/2;}
  g.userData={inner,inner2,core};portals.push(g);return g;
}
function decorGroup(parent, x, y, z, scale = 1) {
  const object = group(parent, x, y, z);
  object.scale.setScalar(scale);
  decor.push(object);
  return object;
}

function forest(parent, x, y, z, scale, seed, autumn = false) {
  const tree = decorGroup(parent, x, y, z, scale);
  const trunk = mesh(tree, cylinderGeo, 0x604d3d, 0, 1.32, 0, .15, 2.64, .16);
  trunk.rotation.z = Math.sin(seed) * .08;
  for (let i = 0; i < 6; i++) {
    const angle = i * 2.4 + seed;
    const color = autumn ? [0xea9654, 0xbf5743, 0xd6aa56][i % 3] : [palette.leaf, 0x4b8a66, 0x8eb780][i % 3];
    const crown = mesh(tree, icoGeo, color, Math.cos(angle) * .67, 2.1 + i * .19, Math.sin(angle) * .6, 1, .64, .86);
    crown.rotation.y = i;
  }
}

function conifer(parent, x, y, z, scale, seed, snowy = true) {
  const tree = decorGroup(parent, x, y, z, scale);
  mesh(tree, cylinderGeo, 0x635d4f, 0, .8, 0, .13, 1.6, .13);
  for (let i = 0; i < 4; i++) {
    const width = .93 - i * .17;
    mesh(tree, coneGeo, snowy ? 0x354e5b : 0x315d59, 0, 1.25 + i * .59, 0, width, 1.17, width).rotation.y = seed;
    if (snowy) mesh(tree, coneGeo, 0xc7e4ef, 0, 1.54 + i * .59, 0, width * .72, .69, width * .72).rotation.y = seed;
  }
}

function solarArray(parent, x, y, z, scale) {
  const array = decorGroup(parent, x, y, z, scale);
  mesh(array, cylinderGeo, 0x645343, 0, .72, 0, .09, 1.45, .09, .45);
  const panel = group(array, 0, 1.47, 0);
  panel.rotation.x = -.45;
  box(panel, 0x504643, 0, 0, 0, 2.24, .92, .12, .4);
  for (let i = 0; i < 4; i++) box(panel, 0x2f5275, -.77 + i * .51, 0, .08, .47, .8, .055, .55, .12);
  box(panel, 0xffd38a, 0, -.38, .12, 2.05, .028, .02, .3, .45);
}

function crystal(parent, x, y, z, scale) {
  const cluster = decorGroup(parent, x, y, z, scale);
  for (let i = 0; i < 3; i++) {
    const height = [1.32, 2.1, 1.58][i];
    const prism = mesh(cluster, crystalGeo, palette.accent, (i - 1) * .48, height * .42, (i % 2) * .25, .29, height, .29, .48, .27);
    prism.rotation.z = (1 - i) * .24;
  }
}

function fanPlant(parent, x, y, z, scale, seed, underwater = false) {
  const plant = decorGroup(parent, x, y, z, scale);
  for (let i = 0; i < 5; i++) {
    const angle = (i - 2) * .32;
    const height = 1.05 + .32 * Math.sin(seed + i);
    const stalk = group(plant, (i - 2) * .1, .05, (i % 2) * .08);
    stalk.rotation.z = angle;
    mesh(stalk, cylinderGeo, underwater ? 0x3a8a84 : 0x686883, 0, height * .63, 0, .034, height * 1.26, .034);
    if (underwater) mesh(stalk, icoGeo, i % 2 ? 0x567ead : 0x4b9f97, 0, height * .96, 0, .14, height * .8, .055);
    else ball(stalk, i % 2 ? 0x945ab2 : 0x826db8, 0, height * 1.3, 0, .13, .28, .13, .08, .2);
  }
}

function relayTower(parent, x, y, z, scale, reactor = false) {
  const tower = decorGroup(parent, x, y, z, scale);
  const bodyColor = reactor ? 0x493c46 : 0x45535d;
  const signal = reactor ? 0xffab73 : palette.accent;
  box(tower, bodyColor, 0, 1.75, 0, 1.15, 3.5, .87, .47);
  box(tower, 0x73868b, 0, .16, 0, 1.54, .32, 1.1, .47);
  box(tower, bodyColor, 0, 3.59, 0, 1.5, .28, 1.1, .5);
  box(tower, signal, 0, 2.25, .46, .09, 1.95, .05, .2, .9);
  for (const side of [-1, 1]) box(tower, bodyColor, side * .75, 1.1, 0, .32, 2.2, .77, .51);
  if (!reactor) ring(tower, signal, 0, 4.44, 0, .55, .55);
}

const crystalGeo = new THREE.CylinderGeometry(.28, 1, 1, 5);
const skyGeometry = new THREE.SphereGeometry(180, 32, 16);
const horizonStyles = ['forest', 'dunes', 'lunar', 'glacier', 'amber', 'marsh', 'coast', 'core'];
const stagePalettes = {
  cave: { sky: 0x172034, fog: 0x475766, ground: 0x465361, top: 0x869899 },
  water: { sky: 0x103848, fog: 0x377e89, ground: 0x375762, top: 0x7eafb2 },
  forge: { sky: 0x291e38, fog: 0x655055, ground: 0x493e51, top: 0x9e8590 }
};
const surfaceDetails = [
  forest,
  solarArray,
  crystal,
  conifer,
  (parent, x, y, z, scale, seed) => forest(parent, x, y, z, scale, seed, true),
  fanPlant,
  (parent, x, y, z, scale, seed) => conifer(parent, x, y, z, scale, seed, false),
  (parent, x, y, z, scale) => relayTower(parent, x, y, z, scale)
];

function buildHorizon(style, width) {
  for (let i = 0; i < Math.ceil((width + 75) / 9); i++) {
    const x = i * 9 - 29;
    const depth = -24 - (i % 3) * 18;
    const height = 3 + (Math.sin(i * 3.1) + 1) * 3.4;
    const formation = decorGroup(scenery, x, -5.2, depth);
    if (style === 'dunes' || style === 'marsh') {
      const ridge = mesh(formation, icoGeo, palette.rock, 0, 0, 0, 15, height * .55, 7);
      ridge.rotation.z = Math.sin(i) * .13;
      if (style === 'dunes' && i % 2 === 0) solarArray(formation, 1, height * .48, 0, 1.7);
      continue;
    }
    if (style === 'core' || style === 'forge') {
      relayTower(formation, 0, 0, 0, height * .65, true);
      box(formation, 0x443744, 0, height * .6, -.48, 8.35, .24, .45, .5);
      continue;
    }
    const sharp = style === 'lunar' || style === 'glacier' || style === 'cave';
    const rock = mesh(formation, icoGeo, palette.rock, 0, height * .23, 0, sharp ? 5.2 : 8, height * (sharp ? 1.4 : .92), 6.6);
    rock.rotation.z = Math.sin(i) * .26;
    rock.rotation.y = i;
    if (style === 'glacier') {
      const snow = mesh(formation, icoGeo, 0xd7eaf2, 0, height * 1.21, 0, 3.3, height * .42, 4.2);
      snow.rotation.z = rock.rotation.z;
    } else if (style === 'forest' || style === 'amber') {
      mesh(formation, icoGeo, palette.leaf, 0, height * 1.06, 0, 6.4, 1.05, 5.2);
      if (i % 2 === 0) forest(formation, 1.6, height * 1.06, 0, 1.15, i, style === 'amber');
    } else if (style === 'coast' && i % 2 === 0) {
      relayTower(formation, 0, height * .98, 0, 1.15);
    } else if (style === 'water' && i % 2 === 0) {
      fanPlant(formation, 0, height * .92, 0, 2.8, i, true);
    }
  }
}

function addStageScenery(area, style, worldNumber) {
  for (let x = 3; x < area.w - 2; x += 4) {
    const firstSurface = area.g.findIndex((row, y) => y >= 4 && ['#', 'H', 'X'].includes(row[x]) && area.g[y - 1][x] === ' ');
    if (firstSurface < 0) continue;
    const floor = 15 - firstSurface - 1.35;
    const scale = .67 + .28 * (1 + Math.sin(x * .74));
    if (style === 'forge') relayTower(scenery, x, floor, -4.1, .94, true);
    else if (style === 'water') fanPlant(scenery, x, floor, -3.1, scale * 1.5, x, true);
    else if (style === 'cave') crystal(scenery, x, floor, -3.25, scale);
    else if (x % 12 !== 7) surfaceDetails[worldNumber - 1](scenery, x, floor, -4.0, scale, x);
    const stone = decorGroup(scenery, x + .8, floor, -2.45);
    mesh(stone, icoGeo, palette.rock, 0, .14, 0, .45, .25, .39);
  }
}

function environment(t, title) {
  for (const port of portals) port.userData.core.material.dispose();
  atmosphere.traverse(object => {
    if (object.isMesh && object.material.isShaderMaterial) object.material.dispose();
  });
  clear(scenery);
  clear(atmosphere);
  decor = [];
  portals = [];
  const area = t.area();
  const level = t.lvl();
  const worldNumber = level.world;
  const kind = area === level.bonus ? 'cave' : level.kind;
  const underground = kind in stagePalettes;
  const style = underground ? kind : horizonStyles[worldNumber - 1];
  palette = { ...palettes[worldNumber - 1], ...stagePalettes[kind] };
  scene.background = new THREE.Color(palette.sky);
  scene.fog = new THREE.Fog(palette.fog, kind === 'water' ? 23 : 34, kind === 'water' ? 77 : 116);
  hemi.color.setHex(kind === 'water' ? 0x8cdded : underground ? 0xabc3db : 0xd3e9f1);
  hemi.intensity = underground ? 1.9 : 2.25;
  sun.color.setHex(kind === 'forge' ? 0xffb68b : style === 'dunes' ? 0xffd3a0 : 0xffebcf);
  sun.intensity = underground ? 1.65 : 3.2;
  motes.material.color.setHex(kind === 'water' ? 0xacffff : style === 'glacier' ? 0xd0eafc : 0xfff0cc);
  motes.material.size = kind === 'water' ? .094 : .06;

  const sky = new THREE.Mesh(skyGeometry, new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      zenith: { value: new THREE.Color(palette.sky).multiplyScalar(.39) },
      horizon: { value: new THREE.Color(palette.fog).multiplyScalar(1.35) },
      deep: { value: new THREE.Color(palette.sky).multiplyScalar(.64) },
      disc: { value: new THREE.Color(style === 'lunar' ? 0xd9ddff : 0xffe1ae) },
      discStrength: { value: underground ? 0 : 1 },
      underwater: { value: kind === 'water' ? 1 : 0 }
    },
    vertexShader: `varying vec3 skyPosition;
      void main() {
        skyPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `uniform vec3 zenith, horizon, deep, disc;
      uniform float discStrength, underwater;
      varying vec3 skyPosition;
      void main() {
        vec3 direction = normalize(skyPosition);
        vec3 color = mix(deep, horizon, smoothstep(-0.62, 0.02, direction.y));
        color = mix(color, zenith, smoothstep(0.01, 0.74, direction.y));
        float light = max(0.0, dot(direction, normalize(vec3(0.39, 0.29, -1.0))));
        color += disc * discStrength * (pow(light, 66.0) * 0.25 + smoothstep(0.995, 0.996, light) * 1.3);
        float shaft = pow(0.5 + 0.5 * cos((direction.x + direction.y * 0.3) * 38.0), 5.0);
        color += underwater * shaft * smoothstep(-0.21, 0.45, direction.y) * vec3(0.05, 0.19, 0.22);
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  }));
  atmosphere.add(sky);
  buildHorizon(style, area.w);
  addStageScenery(area, style, worldNumber);
  if (level.goal && area === level.main) {
    const gate = portal(scenery, level.goal.x + .5, 15 - level.goal.y, true);
    gate.userData.finish = true;
  }
  if (title) portal(scenery, 16, 2, true).userData.preview = true;
}
// Neutral relief maps add surface detail without competing with pickup colors.
function reliefTexture(profile) {
  const size = 128;
  const surface = document.createElement('canvas');
  surface.width = surface.height = size;
  const context = surface.getContext('2d');
  const image = context.createImageData(size, size);
  let seed = 307;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const grain = (seed / 4294967296 - .5) * 27;
      const mineral = Math.sin(x * .15 + Math.sin(y * .17) * 1.9) * Math.sin(y * .12 - x * .018);
      const sediment = Math.sin(y * .21 + Math.sin(x * .046) * 1.6);
      const value = profile === 'stone' ? 210 + grain + mineral * 21 + sediment * 9 : 218 + grain * .52 + mineral * 8;
      const offset = (y * size + x) * 4;
      image.data[offset] = image.data[offset + 1] = image.data[offset + 2] = value;
      image.data[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  if (profile === 'panel') {
    context.strokeStyle = '#a7a7a7';
    context.lineWidth = 2;
    context.strokeRect(6, 6, 116, 116);
    context.strokeStyle = '#ededed';
    context.lineWidth = 1;
    context.strokeRect(9, 9, 110, 110);
    context.fillStyle = '#a2a2a2';
    for (const x of [15, 113]) for (const y of [15, 113]) {
      context.beginPath();
      context.arc(x, y, 2.6, 0, Math.PI * 2);
      context.fill();
    }
  }
  const texture = new THREE.CanvasTexture(surface);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

const reliefMaps = { stone: reliefTexture('stone'), panel: reliefTexture('panel') };
const tileMaterials = new Map();

function tileMaterial(color, metal, profile) {
  const key = [color, metal, profile].join('/');
  if (!tileMaterials.has(key)) {
    const map = reliefMaps[profile];
    tileMaterials.set(key, new THREE.MeshStandardMaterial({
      color, metalness: metal, roughness: .69, map, bumpMap: map, bumpScale: .032
    }));
  }
  return tileMaterials.get(key);
}

function rebuildTiles(a){
  clear(world);coinTiles=[];const batches=new Map();
  for(let y=0;y<15;y++)for(let x=0;x<a.w;x++){
    const c=a.g[y][x];if(c===' '||c==='I')continue;
    if(c==='o'){coinTiles.push({x,y});continue;}
    if(!batches.has(c))batches.set(c,[]);batches.get(c).push({x,y});
  }
  for(const[c,tiles]of batches){
    const lava=c==='~'||c==='L',prize=c==='?',slab=c==='=',pipe=['l','r','[',']'].includes(c);
    const color=prize?0xe2b97c:c==='U'?0x657875:c==='B'?0x8c9b92:lava?0xff9162:pipe?0x577780:c==='H'?0x82968d:palette.ground;
    const geo=c==='^'?coneGeo:boxGeo;
    const metal = prize || pipe || c === 'X' || slab ? .33 : .06;
    const profile = c === '#' || c === 'B' || c === 'H' ? 'stone' : 'panel';
    const material = lava || c === '^' ? mat(color, .08, .7, lava ? .75 : 0) : tileMaterial(color, metal, profile);
    const inst = new THREE.InstancedMesh(geo, material, tiles.length);
    inst.castShadow = !lava;
    inst.receiveShadow = true;
    tiles.forEach((q,i)=>{dummy.position.set(q.x+.5,15-q.y-(slab?.15:.5),0);dummy.scale.set(.98,slab?.3:.98,pipe?1.6:2.8);if(c==='^')dummy.scale.set(.45,.9,.45);dummy.rotation.set(0,0,0);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);});world.add(inst);
    // Thin upper ledges make the traversable surface unambiguous.
    const caps=tiles.filter(q=>!['#','X'].includes(a.g[Math.max(0,q.y-1)][q.x])||prize||c==='B'||c==='H');
    if(!lava&&c!=='^'&&caps.length){const cap=new THREE.InstancedMesh(boxGeo,mat(prize?0xffdb97:pipe?0x91b9b4:palette.top,.15,.6,prize?.15:0),caps.length);caps.forEach((q,i)=>{dummy.position.set(q.x+.5,15-q.y+.025,0);dummy.scale.set(1.015,.12,pipe?1.7:2.88);dummy.updateMatrix();cap.setMatrixAt(i,dummy.matrix);});cap.receiveShadow=true;world.add(cap);}
    if(prize){const marks=new THREE.InstancedMesh(starGeo,mat(0xffedc2,.45,.4,.3),tiles.length);tiles.forEach((q,i)=>{dummy.position.set(q.x+.5,14.5-q.y,1.43);dummy.scale.set(.35,.35,.35);dummy.updateMatrix();marks.setMatrixAt(i,dummy.matrix);});world.add(marks);}
    if(['B','H','X'].includes(c)){const seams=new THREE.InstancedMesh(boxGeo,mat(0x3e5355),tiles.length);tiles.forEach((q,i)=>{dummy.position.set(q.x+.5,14.5-q.y,1.41);dummy.scale.set(.94,.028,.012);dummy.updateMatrix();seams.setMatrixAt(i,dummy.matrix);});world.add(seams);}
  }
  coinInstances=new THREE.InstancedMesh(coinGeo,mat(0xffcd79,.75,.28,.2),coinTiles.length);world.add(coinInstances);
  tileState=a.g.map(r=>r.join('')).join('');
}
function updateEntities(t,time){
  const a=t.area(),seen=new Set();
  for(const e of a.ents){
    if(e.dead||(!e.active&&e.t!=='item')||Math.abs(e.x/16-t.cam.x/16-10)>23)continue;
    seen.add(e);let g=entityMeshes.get(e);
    if(!g){g=e.t==='item'?pickup(e.kind):e.t==='cp'?portal(actors,0,0,false):robot(e.t);actors.add(g);entityMeshes.set(e,g);}
    g.visible=true;g.position.set((e.x+e.w/2)/16,(240-e.y-e.h)/16,0);
    if(e.t==='item'){g.position.y+=.55+Math.sin(time*2+e.x)*.12;g.rotation.y=time*1.3;}
    else if(e.t==='shot'){g.position.y+=.25;g.rotation.y=e.vx<0?Math.PI:0;}
    else if(e.t==='cp'){g.userData.inner.material=mat(e.lit?0xffdc9b:0x8bead5,.4,.5,1.6);}
    else {g.rotation.y=e.vx<0?-.4:.4;g.position.y+=Math.sin(time*6+e.x)*.025;}
    if(e.t==='boss'){g.scale.setScalar(.95);g.visible=!(e.invT>0&&(a.t%6<3));}
    if(e.t==='jet'){g.visible=e.on||e.warn;g.scale.y=e.on?3:1;}
    if(e.t==='wisp'&&e.state===0)g.visible=false;
    if(e.t==='snail'){g.scale.y=e.state>0?.62:1;if(e.state===2)g.rotation.z=time*15;}
    if(e.flip){g.rotation.z+=time*5;g.scale.multiplyScalar(.99);}
  }
  for(const[e,g]of entityMeshes)if(!seen.has(e)){g.visible=false;if(e.dead||!a.ents.includes(e)){actors.remove(g);if(e.t==='cp'){g.userData.core.material.dispose();portals=portals.filter(p=>p!==g);}entityMeshes.delete(e);}}
}
function updateParticles(t){
  const col=new THREE.Color();let n=0;
  for(const p of t.area().parts){if(n>=1200)break;if(p.k==='txt')continue;const life=1-p.t/p.life;col.set(p.col|| (p.k==='deb'?'#b9c8b5':'#ffe3a7')).multiplyScalar(Math.max(.1,life));particlePositions[n*3]=p.x/16;particlePositions[n*3+1]=(240-p.y)/16;particlePositions[n*3+2]=1.6+Math.sin(p.t*.1+n)*.2;particleColors[n*3]=col.r;particleColors[n*3+1]=col.g;particleColors[n*3+2]=col.b;n++;}
  particleGeo.setDrawRange(0,n);particleGeo.attributes.position.needsUpdate=true;particleGeo.attributes.color.needsUpdate=true;
}
function resize(){renderer.setSize(window.innerWidth,window.innerHeight,false);camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();}
let visualTime=0,lastFrame=performance.now();
function render(t){
  const now=performance.now(),dt=Math.min((now-lastFrame)/1000,.05);lastFrame=now;
  if(t.game.state!=='pause'&&!G.UI.reducedMotion)visualTime+=dt;
  const time=visualTime,a=t.area(),p=t.P(),game=t.game,title=game.state==='title'||game.state==='help';
  const envKey=t.lvl().kind+(title?'title':'play');
  if(currentArea!==a||currentKind!==envKey){currentArea=a;currentKind=envKey;environment(t,title);rebuildTiles(a);for(const m of entityMeshes.values())actors.remove(m);entityMeshes.clear();}
  const fingerprint=a.g.map(r=>r.join('')).join('');if(fingerprint!==tileState)rebuildTiles(a);
  if(currentHero!==game.hero){if(hero)actors.remove(hero);hero=humanoid(game.hero);currentHero=game.hero;}
  const center=title?9.8:t.cam.x/16+10;
  const cameraZ=camera.aspect<1.3?30:22;
  const desired=new THREE.Vector3(title?center+2:center+1.2,title?10.3:9.5,title?27:cameraZ);
  if(G.UI.reducedMotion)camera.position.copy(desired);else camera.position.lerp(desired,.12);
  camera.lookAt(center,title?5.4:6.8,0);
  atmosphere.position.x=center;sun.position.set(center-10,24,14);sun.target.position.set(center,3,0);
  motes.position.x=center;motes.rotation.y=Math.sin(time*.03)*.07;
  for(const d of decor)d.visible=Math.abs(d.getWorldPosition(dummy.position).x-center)<85;
  const h=hero.userData;
  if(title){hero.position.set(13.2,2.06,.7);hero.scale.setScalar(2.05);hero.rotation.y=-.28;hero.visible=true;}
  else {hero.position.set((p.x+p.w/2)/16,(240-p.y-p.h)/16,.1);hero.scale.setScalar(p.h/16/1.8);hero.rotation.y=p.face>0?.65:-.65;hero.visible=!(p.inv>0&&(game.t%6<3));}
  const moving=!title&&Math.abs(p.vx)>.1&&p.onGround&&game.state!=='pause';
  const stride=moving?Math.sin(p.anim*3)*.65:Math.sin(time*1.6)*.025;
  h.legs[0].rotation.x=stride;h.legs[1].rotation.x=-stride;
  h.arms[0].rotation.x=-stride*.75;h.arms[1].rotation.x=stride*.75;
  h.body.position.y=moving?Math.abs(Math.sin(p.anim*3))*.045:Math.sin(time*2)*.015;
  h.head.rotation.y=title?-.25:0;
  h.weapon.visible=title||game.weapon>0;h.weapon.position.x=p.face<0&&!title?-.5:.5;h.weapon.rotation.y=p.face<0&&!title?Math.PI:0;
  if(game.weapon>0&&!title)h.arms[p.face>0?1:0].rotation.z=p.face*.85;
  else{h.arms[0].rotation.z=.05;h.arms[1].rotation.z=-.05;}
  if(!title&&!p.onGround){h.legs[0].rotation.x=-.35;h.legs[1].rotation.x=.5;}
  if(p.dead&&!title)hero.rotation.z=-.7;
  else hero.rotation.z=0;
  h.aura.visible=p.star>0&&!title;h.aura.rotation.y=time*2;h.aura.rotation.z=time;
  for (const port of portals) {
    const { inner, inner2, core, finish, preview } = port.userData;
    const active = preview || (finish && game.lit);
    inner.rotation.z = time * .18;
    inner2.rotation.y = .28 + Math.sin(time * 1.2) * .38;
    inner2.rotation.z = -time * .23;
    core.material.opacity = (active ? .37 : .10) + Math.sin(time * 2) * .035;
  }
  updateEntities(t,time);
  coinTiles.forEach((q,i)=>{dummy.position.set(q.x+.5,14.5-q.y+Math.sin(time*2+i)*.05,0);dummy.rotation.set(0,time*2+q.x,0);dummy.scale.setScalar(1);dummy.updateMatrix();coinInstances.setMatrixAt(i,dummy.matrix);});coinInstances.instanceMatrix.needsUpdate=true;
  updateParticles(t);
  G.UI.render(t);
  renderer.render(scene,camera);
}
G.View={render,resize,quality(value){renderer.setPixelRatio(value==='high'?Math.min(window.devicePixelRatio,1.75):1);renderer.shadowMap.enabled=value==='high';resize();},stats:()=>renderer.info};
resize();camera.position.set(11.8,10.3,27);
document.getElementById('loading').hidden=true;
G.T.start();
