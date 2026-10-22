/* Huanlan's little starflight: a deterministic simulation and a canvas view. */
(function(root){
'use strict';
const WIDTH=480,HEIGHT=600;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const hit=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)<a.r+b.r;
function createSimulation(options={}){
 const random=options.random||Math.random;
 const s={time:0,score:0,kills:0,hp:3,maxHp:3,invulnerable:1.5,player:{x:240,y:515,r:12},bullets:[],enemies:[],shots:[],drops:[],effects:[],boss:null,bossAppeared:false,power:0,resonance:0,done:false,result:null};
 let spawnClock=.5,fireClock=0,uid=0;
 const effect=(x,y,color,count=12)=>{for(let i=0;i<count;i++){const angle=random()*Math.PI*2,speed=35+random()*130;s.effects.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:.35+random()*.4,max:.75,color});}};
 function finish(reason){if(s.done)return;if(reason==='clear')s.resonance=3;s.done=true;s.result={reason,score:s.score,kills:s.kills,time:Math.round(s.time),hp:s.hp,resonance:s.resonance,bossDefeated:reason==='clear'};}
 function damage(){if(s.invulnerable>0||s.done)return;s.hp--;s.invulnerable=1.8;effect(s.player.x,s.player.y,'#c5a5ff',20);if(s.hp<=0)finish('retreat');}
 function destroyEnemy(enemy){enemy.dead=true;s.kills++;s.score+=enemy.heavy?180:100;effect(enemy.x,enemy.y,enemy.heavy?'#dfb2ff':'#8eeeff',enemy.heavy?20:12);if(s.kills%6===0)s.drops.push({x:enemy.x,y:enemy.y,r:13,kind:s.hp<3?'repair':'power'});}
 function step(dt,input={}){
  if(s.done)return;s.time+=dt;s.invulnerable=Math.max(0,s.invulnerable-dt);
  if(input.target){const tx=clamp(input.target.x,20,WIDTH-20),ty=clamp(input.target.y,55,HEIGHT-28),dx=tx-s.player.x,dy=ty-s.player.y,d=Math.hypot(dx,dy),travel=Math.min(d,620*dt);if(d){s.player.x+=dx/d*travel;s.player.y+=dy/d*travel;}}
  else{let dx=input.x||0,dy=input.y||0;const d=Math.hypot(dx,dy);if(d>1){dx/=d;dy/=d;}s.player.x=clamp(s.player.x+dx*310*dt,20,WIDTH-20);s.player.y=clamp(s.player.y+dy*310*dt,55,HEIGHT-28);}
  fireClock-=dt;
  if(fireClock<=0){fireClock+=.14/(1+Math.min(s.power,4)*.15);const barrels=Math.min(5,2+s.power),damage=1+s.power;for(let i=0;i<barrels;i++){const offset=(i-(barrels-1)/2)*14;s.bullets.push({x:s.player.x+offset,y:s.player.y-23,r:4,vy:-610,vx:offset*.25,damage});}}
  spawnClock-=dt;
  if(spawnClock<=0&&s.time<29){spawnClock+=s.time<8?.75:s.time<18?.57:.47;const heavy=s.time>8&&random()<.22,x=30+random()*(WIDTH-60);s.enemies.push({id:++uid,x,y:-30,baseX:x,r:heavy?23:16,hp:heavy?7:3,heavy,speed:heavy?55:85+random()*45,age:random()*6,shoot:heavy?.8:1.7+random()*.8});}
  if(s.time>=29&&!s.bossAppeared){s.bossAppeared=true;s.boss={x:240,y:-65,r:47,hp:150,maxHp:150,shoot:1.2};}
  for(const bullet of s.bullets){bullet.x+=bullet.vx*dt;bullet.y+=bullet.vy*dt;}
  for(const enemy of s.enemies){enemy.age+=dt;enemy.y+=enemy.speed*dt;enemy.x=clamp(enemy.baseX+Math.sin(enemy.age*1.8)*(enemy.heavy?30:20),25,WIDTH-25);enemy.shoot-=dt;if(enemy.shoot<=0&&enemy.y>25&&enemy.y<HEIGHT-120){enemy.shoot=enemy.heavy?1.3:2.1;const angle=Math.atan2(s.player.y-enemy.y,s.player.x-enemy.x);s.shots.push({x:enemy.x,y:enemy.y+16,r:5,vx:Math.cos(angle)*155,vy:Math.sin(angle)*155});}}
  if(s.boss){const b=s.boss;b.y=Math.min(88,b.y+65*dt);b.x=240+Math.sin(s.time*.8)*130;b.shoot-=dt;if(b.y>=70&&b.shoot<=0){b.shoot=.72;const aim=Math.atan2(s.player.y-b.y,s.player.x-b.x);for(let i=-2;i<=2;i++)s.shots.push({x:b.x,y:b.y+25,r:6,vx:Math.cos(aim+i*.24)*157,vy:Math.sin(aim+i*.24)*157});}}
  for(const shot of s.shots){shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;}
  for(const bullet of s.bullets){if(bullet.dead)continue;let contacted=false;for(const enemy of s.enemies){if(enemy.dead||!hit(bullet,enemy))continue;bullet.dead=true;enemy.hp-=bullet.damage??1;contacted=true;if(enemy.hp<=0)destroyEnemy(enemy);break;}if(!contacted&&s.boss&&hit(bullet,s.boss)){bullet.dead=true;s.boss.hp-=bullet.damage??1;effect(bullet.x,bullet.y,'#b7f8ff',2);if(s.boss.hp<=0){s.score+=1500;s.kills++;effect(s.boss.x,s.boss.y,'#f6d8ff',40);s.boss=null;finish('clear');}}}
  for(const enemy of s.enemies){if(!enemy.dead&&hit(s.player,enemy)){enemy.dead=true;effect(enemy.x,enemy.y,'#9deaff');damage();}}
  for(const shot of s.shots){if(!shot.dead&&hit(s.player,shot)){shot.dead=true;damage();}}
  if(s.boss&&hit(s.player,s.boss))damage();
  for(const drop of s.drops){drop.y+=80*dt;if(hit(s.player,drop)){drop.dead=true;if(drop.kind==='repair')s.hp=Math.min(s.maxHp,s.hp+1);else s.power++;s.score+=50;effect(drop.x,drop.y,'#afffdf',12);}}
  if(!s.done)s.resonance=Math.max(s.resonance,s.kills>=18||(s.boss&&s.boss.hp/s.boss.maxHp<=.45)?2:s.kills>=6||s.power>0?1:0);
  for(const p of s.effects){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}
  s.bullets=s.bullets.filter(b=>!b.dead&&b.y>-20&&b.x>-20&&b.x<WIDTH+20);s.enemies=s.enemies.filter(e=>!e.dead&&e.y<HEIGHT+50);s.shots=s.shots.filter(b=>!b.dead&&b.y<HEIGHT+20&&b.y>-30&&b.x>-20&&b.x<WIDTH+20);s.drops=s.drops.filter(d=>!d.dead&&d.y<HEIGHT+20);s.effects=s.effects.filter(p=>p.life>0);
 }
 return {state:s,step,finish};
}
function mount(options){
 const {canvas,onFinish,onHud,onPause}=options,ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas is unavailable');
 const game=createSimulation(),s=game.state,keys=new Set(),stars=Array.from({length:65},()=>({x:Math.random()*WIDTH,y:Math.random()*HEIGHT,r:.5+Math.random()*1.2,speed:18+Math.random()*70}));
 let raf=0,last=0,accumulator=0,paused=false,destroyed=false,reported=false,pointer=null,hudClock=0,pointerId=null;
 const resize=()=>{const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=WIDTH*dpr;canvas.height=HEIGHT*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);draw();};
 const polygon=(points,fill,stroke)=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.3;ctx.stroke();}};
 function plane(x,y,enemy=false,heavy=false){ctx.save();ctx.translate(x,y);if(enemy)ctx.rotate(Math.PI);const scale=heavy?1.35:1;ctx.scale(scale,scale);ctx.shadowColor=enemy?'#cba9ff':'#80eaff';ctx.shadowBlur=enemy?10:18;if(!enemy){const flame=14+Math.sin(s.time*35)*5;polygon([[-5,17],[0,17+flame],[5,17]],'#a1e8ff');polygon([[-2,18],[0,28],[2,18]],'#fff');}polygon([[0,-27],[8,-6],[23,13],[21,20],[5,12],[0,20],[-5,12],[-21,20],[-23,13],[-8,-6]],enemy?'#77518f':'#73caff',enemy?'#e1bbff':'#d9ffff');ctx.shadowBlur=0;polygon([[0,-18],[4,3],[0,9],[-4,3]],enemy?'#f9a8df':'#e2fcff');ctx.strokeStyle=enemy?'#f8d2ff':'#d9ffff';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-14,11);ctx.lineTo(-5,7);ctx.moveTo(14,11);ctx.lineTo(5,7);ctx.stroke();ctx.restore();}
 function drawBoss(){const b=s.boss;if(!b)return;ctx.save();ctx.translate(b.x,b.y);ctx.shadowBlur=25;ctx.shadowColor='#c4a3ff';polygon([[0,-37],[24,-18],[63,2],[57,25],[21,14],[11,33],[-11,33],[-21,14],[-57,25],[-63,2],[-24,-18]],'#574a86','#d1c0ff');ctx.shadowBlur=0;ctx.fillStyle='#f2c5ff';ctx.beginPath();ctx.arc(0,0,13+Math.sin(s.time*4)*2,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fbeaff';ctx.lineWidth=1;ctx.stroke();ctx.restore();ctx.fillStyle='#bfa1fa23';ctx.fillRect(80,36,320,4);ctx.fillStyle='#e3b3ff';ctx.fillRect(80,36,320*b.hp/b.maxHp,4);ctx.font='10px sans-serif';ctx.fillStyle='#d3c4ef';ctx.textAlign='center';ctx.fillText('大型敌机',240,28);}
 function draw(){
  ctx.clearRect(0,0,WIDTH,HEIGHT);const gradient=ctx.createLinearGradient(0,0,WIDTH,HEIGHT);gradient.addColorStop(0,'#0c1635');gradient.addColorStop(.55,'#0c2944');gradient.addColorStop(1,'#12223d');ctx.fillStyle=gradient;ctx.fillRect(0,0,WIDTH,HEIGHT);
  const glow=ctx.createRadialGradient(100,160,0,100,160,300);glow.addColorStop(0,'#585bc52b');glow.addColorStop(1,'#585bc500');ctx.fillStyle=glow;ctx.fillRect(0,0,WIDTH,HEIGHT);
  for(const star of stars){const y=(star.y+s.time*star.speed)%HEIGHT;ctx.globalAlpha=.25+star.r/3;ctx.fillStyle='#ceefff';ctx.fillRect(star.x,y,star.r,star.r*2.5);}ctx.globalAlpha=1;
  ctx.strokeStyle='#b6dcff07';ctx.lineWidth=1;for(let x=0;x<WIDTH;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,HEIGHT);ctx.stroke();}
  for(const drop of s.drops){ctx.save();ctx.translate(drop.x,drop.y);ctx.rotate(s.time);ctx.strokeStyle='#b6ffe1';ctx.fillStyle='#7de7ca25';ctx.lineWidth=1.3;ctx.fillRect(-11,-11,22,22);ctx.strokeRect(-11,-11,22,22);ctx.restore();ctx.font='bold 15px sans-serif';ctx.fillStyle='#c7ffed';ctx.textAlign='center';ctx.fillText(drop.kind==='repair'?'+':'↑',drop.x,drop.y+5);}
  for(const b of s.bullets){ctx.shadowBlur=12;ctx.shadowColor='#8ef6ff';ctx.fillStyle='#c0ffff';const width=Math.min(8,3+(b.damage??1));ctx.fillRect(b.x-width/2,b.y-9,width,17);}ctx.shadowBlur=0;
  for(const e of s.enemies)plane(e.x,e.y,true,e.heavy);drawBoss();
  for(const b of s.shots){ctx.shadowBlur=10;ctx.shadowColor='#ffbcf1';ctx.fillStyle='#ffd2f6';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff4ff';ctx.beginPath();ctx.arc(b.x,b.y,2,0,Math.PI*2);ctx.fill();}ctx.shadowBlur=0;
  if(s.invulnerable<=0||Math.floor(s.time*10)%2===0)plane(s.player.x,s.player.y);
  if(s.invulnerable>0){ctx.strokeStyle='#c4efff77';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(s.player.x,s.player.y,31,0,Math.PI*2);ctx.stroke();}
  for(const p of s.effects){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.fillRect(p.x-2,p.y-2,3,3);}ctx.globalAlpha=1;
  if(s.time<2.5){ctx.fillStyle='#c6e9ff';ctx.textAlign='center';ctx.font='13px sans-serif';ctx.fillText('主人，幻蓝在你的侧翼。',240,220);}
  if(s.time>=27.5&&s.time<30){ctx.fillStyle='#d8beff';ctx.textAlign='center';ctx.font='13px sans-serif';ctx.fillText('前方信号增强 · 注意躲避',240,215);}
  if(paused){ctx.fillStyle='#07142bc9';ctx.fillRect(0,0,WIDTH,HEIGHT);ctx.textAlign='center';ctx.fillStyle='#dcf5ff';ctx.font='24px sans-serif';ctx.fillText('稍作停留',240,270);ctx.font='13px sans-serif';ctx.fillStyle='#a8c4df';ctx.fillText('点击“继续飞行”再次出发',240,301);}
 }
 function hud(){onHud?.({score:s.score,hp:s.hp,time:Math.floor(s.time),boss:!!s.boss,power:s.power,damage:1+s.power,resonance:s.resonance});}
 function tick(now){if(destroyed)return;if(!last)last=now;const elapsed=Math.min((now-last)/1000,.1);last=now;if(!paused&&!s.done){accumulator+=elapsed;while(accumulator>=1/120&&!s.done){const x=Number(keys.has('ArrowRight')||keys.has('d'))-Number(keys.has('ArrowLeft')||keys.has('a')),y=Number(keys.has('ArrowDown')||keys.has('s'))-Number(keys.has('ArrowUp')||keys.has('w'));game.step(1/120,{x,y,target:x||y?null:pointer});accumulator-=1/120;}hudClock+=elapsed;if(hudClock>.08){hud();hudClock=0;}}
  draw();if(s.done&&!reported){reported=true;hud();onFinish(s.result);return;}raf=requestAnimationFrame(tick);
 }
 function pause(value=true){if(destroyed||s.done)return;paused=value;keys.clear();pointer=null;last=0;accumulator=0;onPause?.(paused);draw();}
 function down(e){if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D',' ','Escape'].includes(e.key))return;if(document.querySelector('dialog[open]'))return;e.preventDefault();if(e.key===' '||e.key==='Escape'){if(!e.repeat)pause(!paused);return;}keys.add(e.key.length===1?e.key.toLowerCase():e.key);}
 const up=e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key);
 function aim(e){const rect=canvas.getBoundingClientRect();pointer={x:(e.clientX-rect.left)/rect.width*WIDTH,y:(e.clientY-rect.top)/rect.height*HEIGHT-(e.pointerType==='touch'?32:0)};}
 function pointerDown(e){if(paused)return;e.preventDefault();pointerId=e.pointerId;canvas.setPointerCapture(e.pointerId);aim(e);canvas.focus({preventScroll:true});}
 function pointerMove(e){if(paused)return;if(e.pointerType==='mouse'||e.pointerId===pointerId)aim(e);}
 function pointerUp(e){if(e.pointerId===pointerId){pointerId=null;pointer=null;}}
 const leave=()=>{if(pointerId===null)pointer=null;};
 const visibility=()=>{if(document.hidden)pause(true);};const blur=()=>pause(true);
 window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',visibility);window.addEventListener('resize',resize);canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',pointerUp);canvas.addEventListener('pointerleave',leave);
 resize();hud();raf=requestAnimationFrame(tick);
 return {pause,togglePause:()=>pause(!paused),destroy(){if(destroyed)return;destroyed=true;cancelAnimationFrame(raf);keys.clear();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('resize',resize);canvas.removeEventListener('pointerdown',pointerDown);canvas.removeEventListener('pointermove',pointerMove);canvas.removeEventListener('pointerup',pointerUp);canvas.removeEventListener('pointercancel',pointerUp);canvas.removeEventListener('pointerleave',leave);}};
}
const api={createSimulation,mount,WIDTH,HEIGHT};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HuanlanFlight=api;
})(typeof window!=='undefined'?window:globalThis);
