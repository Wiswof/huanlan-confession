/* Huanlan Starflight: deterministic arcade simulation and canvas renderer. */
(function(root){
'use strict';
const WIDTH=480,HEIGHT=600;
const STAGES=[
 {id:'harbor',name:'星港近海',boss:'潮汐巡航者',bossAt:23,hp:700,accent:'#a9efff',colors:['#071a34','#10364b','#09213a']},
 {id:'neon',name:'霓虹雨城',boss:'棱镜裁决者',bossAt:25,hp:2300,accent:'#f5a9e8',colors:['#1c1238','#321e49','#0a2440']},
 {id:'aurora',name:'极光星环',boss:'星环之心',bossAt:27,hp:5400,accent:'#b9ffd8',colors:['#11162f','#183c4b','#251940']}
];
const LOOT={power:{label:'火力',icon:'↑',color:'#b9efff'},laser:{label:'贯穿激光',icon:'L',color:'#9affeb'},missile:{label:'追踪导弹',icon:'M',color:'#ffce99'},shield:{label:'光盾',icon:'◇',color:'#c5beff'},repair:{label:'护盾修复',icon:'+',color:'#b0ffd7'},magnet:{label:'磁力回收',icon:'U',color:'#ffc1e9'},nova:{label:'星爆清屏',icon:'✦',color:'#fff0b2'},wingman:{label:'僚机',icon:'W',color:'#acddff'}};
const lootOrder=['power','missile','laser','shield','magnet','nova','wingman','repair','power','laser','missile','power'];
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const hit=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)<a.r+b.r;
function createSimulation(options={}){
 const random=options.random||Math.random;
 const s={time:0,stageTime:0,stageIndex:0,phase:'wave',bossesDefeated:0,score:0,kills:0,hp:3,maxHp:3,invulnerable:2.5,player:{x:240,y:515,r:10},bullets:[],enemies:[],shots:[],missiles:[],beams:[],drops:[],effects:[],boss:null,bossAppeared:false,power:0,laser:0,missile:0,wingman:0,barrier:0,magnet:0,resonance:0,combo:0,comboUntil:0,notice:null,nova:0,transition:null,done:false,result:null};
 let spawnClock=.4,fireClock=0,missileClock=.3,laserClock=0,wingClock=0,uid=0,dropCount=0,transitionId=0;
 function effect(x,y,color,count=12){for(let i=0;i<count;i++){const angle=random()*Math.PI*2,speed=35+random()*130;s.effects.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:.35+random()*.4,max:.75,color});}}
 function notice(label,color){s.notice={label,color,until:s.time+2};}
 function finish(reason){if(s.done)return;if(reason==='clear')s.resonance=4;s.done=true;s.phase='finished';s.result={reason,score:s.score,kills:s.kills,time:Math.round(s.time),hp:s.hp,resonance:s.resonance,bossesDefeated:s.bossesDefeated,stageIndex:s.stageIndex,bossDefeated:reason==='clear'};}
 function damage(){if(s.invulnerable>0||s.done||s.transition)return;if(s.barrier>0){s.barrier--;s.invulnerable=.9;effect(s.player.x,s.player.y,'#cbbdff',20);notice('光盾挡下了攻击','#cfbdff');return;}s.hp--;s.combo=0;s.invulnerable=1.8;effect(s.player.x,s.player.y,'#c5a5ff',20);if(s.hp<=0)finish('retreat');}
 function dropLoot(x,y){let kind=lootOrder[dropCount++%lootOrder.length];if(s.hp===1&&dropCount%3===0)kind='repair';s.drops.push({x,y,r:14,kind});}
 function destroyEnemy(enemy){if(enemy.dead)return;enemy.dead=true;s.kills++;s.combo=s.time<s.comboUntil?Math.min(30,s.combo+1):1;s.comboUntil=s.time+2.3;s.score+=(enemy.heavy?180:100)+Math.min(50,s.combo*3);effect(enemy.x,enemy.y,enemy.heavy?'#dfb2ff':'#8eeeff',enemy.heavy?20:12);if(s.kills%4===0)dropLoot(enemy.x,enemy.y);}
 function defeatBoss(){
  const previous=s.boss;if(!previous||s.transition||s.done)return;
  s.bossesDefeated++;s.kills++;s.score+=1800+s.stageIndex*1400;s.boss=null;s.bullets=[];s.missiles=[];s.enemies=[];s.shots=[];s.beams=[];
  effect(previous.x,previous.y,STAGES[s.stageIndex].accent,65);s.nova=.8;
  for(const drop of s.drops)if(!drop.dead){drop.dead=true;collect(drop.kind);}s.drops=[];
  if(s.stageIndex===STAGES.length-1){finish('clear');return;}
  s.hp=Math.min(s.maxHp,s.hp+1);s.barrier=Math.min(3,s.barrier+1);s.power++;
  if(s.stageIndex===0)s.missile=Math.max(1,s.missile);else s.laser=Math.max(1,s.laser);
  s.resonance=s.stageIndex+2;s.phase='intermission';
  s.transition={id:++transitionId,fromStage:s.stageIndex,nextStage:s.stageIndex+1,bossName:STAGES[s.stageIndex].boss,scene:STAGES[s.stageIndex+1],resonance:s.resonance};
 }
 function damageBoss(amount){if(!s.boss||s.boss.y<65||s.done||s.transition)return;s.boss.hp-=amount;if(s.boss.hp<=0)defeatBoss();}
 function collect(kind){
  const item=LOOT[kind];if(!item)return;
  if(kind==='power')s.power++;
  else if(kind==='repair'){if(s.hp<s.maxHp)s.hp++;else s.barrier=Math.min(3,s.barrier+1);}
  else if(kind==='shield')s.barrier=Math.min(3,s.barrier+2);
  else if(kind==='nova'){
   s.nova=.8;s.invulnerable=Math.max(s.invulnerable,1.5);s.shots=[];s.beams=[];
   for(const e of s.enemies)destroyEnemy(e);
   damageBoss(120+s.power*18+s.stageIndex*100);
  }else s[kind]++;
  s.score+=50;notice(item.label+(kind==='power'?' Lv.'+(s.power+1):['laser','missile','wingman','magnet'].includes(kind)?' Lv.'+s[kind]:' 已生效'),item.color);effect(s.player.x,s.player.y,item.color,14);
 }
 function continueStage(){
  if(!s.transition||s.done)return false;
  s.stageIndex=s.transition.nextStage;s.transition=null;s.stageTime=0;s.phase='wave';s.bossAppeared=false;s.player.x=240;s.player.y=515;s.invulnerable=3;s.notice=null;
  s.bullets=[];s.shots=[];s.beams=[];s.missiles=[];s.enemies=[];s.drops=[];s.effects=[];spawnClock=.6;fireClock=0;missileClock=.3;laserClock=0;wingClock=0;return true;
 }
 function shoot(x,y,angle,speed=140,r=5){s.shots.push({x,y,r,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,age:0});}
 function fan(x,y,angle,count,spread,speed=140){for(let i=0;i<count;i++)shoot(x,y,angle+(i-(count-1)/2)*spread,speed);}
 function spawnEnemy(forceHeavy=false){
  const level=s.stageIndex,heavy=forceHeavy||(s.stageTime>6&&random()<.18+level*.06),interceptor=!heavy&&level>0&&random()<.28,x=30+random()*(WIDTH-60);
  s.enemies.push({id:++uid,x,y:-30,baseX:x,r:heavy?23:15,hp:heavy?8+level*8:3+level*3,heavy,interceptor,speed:heavy?53+level*6:interceptor?165:85+random()*35+level*10,age:random()*6,shoot:heavy?1:1.6+random()*.8});
 }
 function step(dt,input={}){
  if(s.done||s.transition)return;
  s.time+=dt;s.stageTime+=dt;s.invulnerable=Math.max(0,s.invulnerable-dt);s.nova=Math.max(0,s.nova-dt);if(s.time>s.comboUntil)s.combo=0;
  const level=s.stageIndex;
  if(input.target){const tx=clamp(input.target.x,20,WIDTH-20),ty=clamp(input.target.y,55,HEIGHT-28),dx=tx-s.player.x,dy=ty-s.player.y,d=Math.hypot(dx,dy),travel=Math.min(d,620*dt);if(d){s.player.x+=dx/d*travel;s.player.y+=dy/d*travel;}}
  else{let dx=input.x||0,dy=input.y||0;const d=Math.hypot(dx,dy);if(d>1){dx/=d;dy/=d;}s.player.x=clamp(s.player.x+dx*310*dt,20,WIDTH-20);s.player.y=clamp(s.player.y+dy*310*dt,55,HEIGHT-28);}
  fireClock-=dt;
  if(fireClock<=0){fireClock+=.14/(1+Math.min(s.power,4)*.15);const barrels=Math.min(5,2+s.power),damage=1+s.power;for(let i=0;i<barrels;i++){const offset=(i-(barrels-1)/2)*14;s.bullets.push({x:s.player.x+offset,y:s.player.y-23,r:4,vy:-610,vx:offset*.25,damage});}}
  wingClock-=dt;
  if(s.wingman&&wingClock<=0){wingClock=.28;for(const side of [-1,1])s.bullets.push({x:clamp(s.player.x+side*38,8,472),y:s.player.y+3,r:4,vy:-570,vx:side*16,damage:Math.ceil(1+s.power*.5+s.wingman*.7),wing:true});}
  missileClock-=dt;
  if(s.missile&&missileClock<=0){missileClock=Math.max(.45,1.3-s.missile*.13);for(const side of [-1,1])s.missiles.push({x:clamp(s.player.x+side*21,10,470),y:s.player.y-10,r:7,damage:10+s.missile*9+s.power*2,age:0});}
  spawnClock-=dt;
  if(spawnClock<=0&&!s.bossAppeared){spawnClock=Math.max(.25,.72-level*.11-s.stageTime*.004);spawnEnemy();}
  if(s.stageTime>=STAGES[level].bossAt&&!s.bossAppeared){s.bossAppeared=true;s.phase='boss';s.boss={id:'boss-'+level,x:240,y:-65,r:level===2?53:47,hp:STAGES[level].hp,maxHp:STAGES[level].hp,shoot:1,laser:3.6,age:0,volley:0,reinforced:false};notice(STAGES[level].boss+' 接近中',STAGES[level].accent);}
  for(const bullet of s.bullets){bullet.x+=(bullet.vx||0)*dt;bullet.y+=bullet.vy*dt;}
  for(const enemy of s.enemies){
   if(enemy.dead)continue;enemy.age+=dt;enemy.y+=enemy.speed*dt;enemy.x=clamp(enemy.baseX+Math.sin(enemy.age*(enemy.interceptor?3:1.8))*(enemy.heavy?30:enemy.interceptor?45:20),22,WIDTH-22);enemy.shoot-=dt;
   if(enemy.shoot<=0&&enemy.y>25&&enemy.y<HEIGHT-120){enemy.shoot=enemy.heavy?1.25:2;const angle=Math.atan2(s.player.y-enemy.y,s.player.x-enemy.x);fan(enemy.x,enemy.y+16,angle,enemy.heavy&&level>0?3:1,.22,125+level*16);}
  }
  if(s.boss){
   const b=s.boss;b.age+=dt;b.y=Math.min(level===2?95:88,b.y+65*dt);b.x=240+Math.sin(b.age*(level===1?.65:.8))*(level===2?95:130);const enraged=b.hp<b.maxHp*.5;b.shoot-=dt;b.laser-=dt;
   if(b.y>=70&&b.shoot<=0){
    const aim=Math.atan2(s.player.y-b.y,s.player.x-b.x);b.volley++;
    if(level===0){b.shoot=enraged?.8:1.05;fan(b.x,b.y+25,aim,enraged?7:5,.22,130);}
    else if(level===1){b.shoot=enraged?.78:1.05;fan(b.x,b.y+25,aim,3,.17,160);if(b.volley%3===0)fan(b.x,b.y+25,Math.PI/2,7,.28,125);}
    else{b.shoot=enraged?.48:.65;for(let arm=0;arm<3;arm++)shoot(b.x,b.y+20,b.volley*.38+arm*Math.PI*2/3,135,6);if(b.volley%4===0){const gap=Math.floor((b.volley/4)%12);for(let i=0;i<12;i++)if(i!==gap&&i!==(gap+1)%12)shoot(b.x,b.y,Math.PI*2*i/12,110,5);}}
   }
   if(level>0&&b.y>=70&&b.laser<=0){b.laser=enraged?4.2:5.5;const xs=level===1?[s.player.x]:[s.player.x,WIDTH-s.player.x];for(const x of xs)s.beams.push({x:clamp(x,35,445),width:level===1?26:22,age:0,warn:1.25,active:.65});}
   if(level===1&&enraged&&!b.reinforced){b.reinforced=true;spawnEnemy(true);spawnEnemy(true);}
  }
  for(const shot of s.shots){shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;shot.age=(shot.age||0)+dt;}
  for(const beam of s.beams){beam.age+=dt;if(beam.age>=beam.warn&&beam.age<beam.warn+beam.active&&s.player.y+s.player.r>=105&&Math.abs(s.player.x-beam.x)<beam.width/2+s.player.r)damage();}
  for(const bullet of s.bullets){
   if(bullet.dead)continue;let contacted=false;
   for(const enemy of s.enemies){if(enemy.dead||!hit(bullet,enemy))continue;bullet.dead=true;enemy.hp-=bullet.damage??1;contacted=true;if(enemy.hp<=0)destroyEnemy(enemy);break;}
   if(!contacted&&s.boss&&hit(bullet,s.boss)){bullet.dead=true;effect(bullet.x,bullet.y,'#b7f8ff',2);damageBoss(bullet.damage??1);}
   if(s.transition||s.done)break;
  }
  if(s.transition||s.done)return;
  const targets=()=>s.enemies.filter(e=>!e.dead&&e.y>0&&e.y<s.player.y+25).concat(s.boss&&s.boss.y>0?[s.boss]:[]);
  for(const m of s.missiles){
   m.age+=dt;const candidates=targets();const target=candidates.reduce((best,t)=>!best||Math.hypot(m.x-t.x,m.y-t.y)<Math.hypot(m.x-best.x,m.y-best.y)?t:best,null);
   if(target){const dx=target.x-m.x,dy=target.y-m.y,d=Math.hypot(dx,dy)||1;m.x+=dx/d*350*dt;m.y+=dy/d*350*dt;if(hit(m,target)){m.dead=true;effect(m.x,m.y,'#ffd0a0',17);if(target===s.boss)damageBoss(m.damage);else{target.hp-=m.damage;if(target.hp<=0)destroyEnemy(target);}}}
   else m.y-=330*dt;
   if(s.transition||s.done)break;
  }
  if(s.transition||s.done)return;
  laserClock-=dt;
  if(s.laser&&laserClock<=0){laserClock=.1;const width=9+Math.min(s.laser,6)*3,amount=2+s.laser*1.6+s.power*.35;for(const enemy of s.enemies){if(!enemy.dead&&enemy.y<s.player.y&&Math.abs(enemy.x-s.player.x)<enemy.r+width/2){enemy.hp-=amount;if(enemy.hp<=0)destroyEnemy(enemy);}}if(s.boss&&s.boss.y<s.player.y&&Math.abs(s.boss.x-s.player.x)<s.boss.r+width/2)damageBoss(amount);}
  if(s.transition||s.done)return;
  for(const enemy of s.enemies)if(!enemy.dead&&hit(s.player,enemy)){enemy.dead=true;effect(enemy.x,enemy.y,'#9deaff');damage();}
  for(const shot of s.shots)if(!shot.dead&&hit(s.player,shot)){shot.dead=true;damage();}
  if(s.boss&&hit(s.player,s.boss))damage();
  if(s.done)return;
  for(const drop of s.drops.slice()){
   drop.y+=78*dt;const distance=Math.hypot(drop.x-s.player.x,drop.y-s.player.y),range=s.magnet?Math.min(360,170+s.magnet*45):72;
   if(distance<range&&distance>0){drop.x+=(s.player.x-drop.x)/distance*230*dt;drop.y+=(s.player.y-drop.y)/distance*230*dt;}
   if(hit(s.player,drop)&&!drop.dead){drop.dead=true;collect(drop.kind);}
   if(s.transition||s.done)break;
  }
  if(!s.done&&s.stageIndex===0)s.resonance=Math.max(s.resonance,s.kills>=6||s.power>0?1:0);
  for(const p of s.effects){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}
  s.bullets=s.bullets.filter(b=>!b.dead&&b.y>-25&&b.x>-30&&b.x<WIDTH+30);s.enemies=s.enemies.filter(e=>!e.dead&&e.y<HEIGHT+50);s.shots=s.shots.filter(b=>!b.dead&&b.age<9&&b.y<HEIGHT+25&&b.y>-35&&b.x>-25&&b.x<WIDTH+25);s.missiles=s.missiles.filter(m=>!m.dead&&m.age<5&&m.y>-40);s.beams=s.beams.filter(b=>b.age<b.warn+b.active);s.drops=s.drops.filter(d=>!d.dead&&d.y<HEIGHT+25);s.effects=s.effects.filter(p=>p.life>0).slice(-350);
 }
 return {state:s,step,finish,continueStage};
}
function mount(options){
 const {canvas,onFinish,onHud,onPause,onStageClear}=options,ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');
 const game=createSimulation(options.simulation),s=game.state,keys=new Set(),stars=Array.from({length:65},()=>({x:Math.random()*WIDTH,y:Math.random()*HEIGHT,r:.5+Math.random()*1.2,speed:18+Math.random()*70}));
 let raf=0,last=0,accumulator=0,paused=false,destroyed=false,reported=false,pointer=null,hudClock=0,pointerId=null,announcedTransition=0;
 const polygon=(points,fill,stroke)=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.3;ctx.stroke();}};
 function plane(x,y,enemy=false,heavy=false,small=false){ctx.save();ctx.translate(x,y);if(enemy)ctx.rotate(Math.PI);const scale=small?.48:heavy?1.35:1;ctx.scale(scale,scale);ctx.shadowColor=enemy?'#e7a8eb':'#80eaff';ctx.shadowBlur=enemy?9:17;if(!enemy)polygon([[-5,17],[0,33+Math.sin(s.time*35)*5],[5,17]],'#a1e8ff');polygon([[0,-27],[8,-6],[23,13],[21,20],[5,12],[0,20],[-5,12],[-21,20],[-23,13],[-8,-6]],enemy?heavy?'#805288':'#68487e':'#73caff',enemy?'#e1bbff':'#d9ffff');ctx.shadowBlur=0;polygon([[0,-18],[4,3],[0,9],[-4,3]],enemy?'#f9a8df':'#e2fcff');ctx.restore();}
 function background(){
  const scene=STAGES[s.stageIndex],g=ctx.createLinearGradient(0,0,WIDTH,HEIGHT);scene.colors.forEach((c,i)=>g.addColorStop(i/2,c));ctx.fillStyle=g;ctx.fillRect(0,0,WIDTH,HEIGHT);
  ctx.save();ctx.globalAlpha=.35;
  if(s.stageIndex===0){ctx.strokeStyle='#65bacc';for(let row=0;row<12;row++){const y=(row*57+s.stageTime*28)%650;ctx.beginPath();for(let x=0;x<=480;x+=16){const yy=y+Math.sin(x*.022+s.time)*7;x?ctx.lineTo(x,yy):ctx.moveTo(x,yy);}ctx.stroke();}}
  else if(s.stageIndex===1){for(let i=0;i<10;i++){const x=i*56-30,y=(i*87+s.stageTime*48)%850-150,h=110+(i%3)*45;ctx.fillStyle=i%2?'#272344':'#172b42';ctx.fillRect(x,y,43,h);ctx.strokeStyle=i%2?'#f496d3':'#79dfff';ctx.strokeRect(x,y,43,h);for(let r=12;r<h;r+=18){ctx.fillStyle='#f9b3ed66';ctx.fillRect(x+9,y+r,4,5);ctx.fillRect(x+27,y+r,4,5);}}}
  else{ctx.fillStyle='#6bb6cb44';ctx.beginPath();ctx.arc(400,100,110,0,Math.PI*2);ctx.fill();for(let ribbon=0;ribbon<4;ribbon++){ctx.strokeStyle=['#8affcf','#b1adff','#78def6','#d9aeff'][ribbon];ctx.lineWidth=13;ctx.beginPath();for(let y=0;y<=600;y+=15){const x=60+ribbon*90+Math.sin(y*.009+s.time*.14+ribbon)*60;y?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();}}
  ctx.restore();for(const star of stars){ctx.globalAlpha=.2+star.r/3;ctx.fillStyle='#def7ff';ctx.fillRect(star.x,(star.y+s.time*star.speed)%HEIGHT,star.r,star.r*2.5);}ctx.globalAlpha=1;
 }
 function drawBoss(){
  const b=s.boss;if(!b)return;const color=STAGES[s.stageIndex].accent;ctx.save();ctx.translate(b.x,b.y);ctx.shadowBlur=22;ctx.shadowColor=color;
  if(s.stageIndex===0)polygon([[0,-37],[24,-18],[63,2],[57,25],[21,14],[11,33],[-11,33],[-21,14],[-57,25],[-63,2],[-24,-18]],'#3e6480',color);
  else if(s.stageIndex===1){polygon([[0,-52],[31,-11],[71,9],[43,33],[0,48],[-43,33],[-71,9],[-31,-11]],'#67477f',color);polygon([[0,-30],[16,0],[0,26],[-16,0]],'#dcb0f4','#fff0fc');}
  else{ctx.rotate(b.age*.25);ctx.strokeStyle=color;ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,51,0,Math.PI*2);ctx.stroke();for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);polygon([[0,-72],[16,-50],[9,-32],[-9,-32],[-16,-50]],'#3c7182',color);}ctx.rotate(-b.age*.25);}
  ctx.shadowBlur=0;ctx.fillStyle=color;ctx.beginPath();ctx.arc(0,0,12+Math.sin(s.time*4)*2,0,Math.PI*2);ctx.fill();ctx.restore();ctx.fillStyle='#060f28cf';ctx.fillRect(55,12,370,40);ctx.fillStyle='#bad9ff22';ctx.fillRect(70,39,340,4);ctx.fillStyle=color;ctx.fillRect(70,39,340*clamp(b.hp/b.maxHp,0,1),4);ctx.font='11px sans-serif';ctx.fillStyle='#e4e8ff';ctx.textAlign='center';ctx.fillText(STAGES[s.stageIndex].boss+(b.y<65?' · 入场中':b.hp<b.maxHp*.5?' · 强化阶段':''),240,29);
 }
 function draw(){
  ctx.clearRect(0,0,WIDTH,HEIGHT);background();
  for(const beam of s.beams){const firing=beam.age>=beam.warn;ctx.fillStyle=firing?'#ffa5e6aa':'#f4bbff14';ctx.fillRect(beam.x-beam.width/2,105,beam.width,495);ctx.strokeStyle=firing?'#fff4ff':'#ffc8ee';ctx.lineWidth=firing?5:1;ctx.setLineDash(firing?[]:[8,8]);ctx.beginPath();ctx.moveTo(beam.x,105);ctx.lineTo(beam.x,600);ctx.stroke();ctx.setLineDash([]);if(!firing){ctx.font='10px sans-serif';ctx.fillStyle='#ffd5f2';ctx.textAlign='center';ctx.fillText('锁定',beam.x,132);}}
  for(const drop of s.drops){const item=LOOT[drop.kind];ctx.save();ctx.translate(drop.x,drop.y);ctx.shadowBlur=15;ctx.shadowColor=item.color;ctx.strokeStyle=item.color;ctx.fillStyle='#12243e';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(-14,-14,28,28,7);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.font='bold 16px sans-serif';ctx.fillStyle=item.color;ctx.textAlign='center';ctx.fillText(item.icon,0,6);ctx.restore();}
  if(s.laser){const width=9+Math.min(s.laser,6)*3;ctx.shadowBlur=18;ctx.shadowColor='#8ffff0';ctx.fillStyle='#7affd328';ctx.fillRect(s.player.x-width/2,0,width,s.player.y-20);ctx.fillStyle='#b7fff3bb';ctx.fillRect(s.player.x-2,0,4,s.player.y-20);ctx.shadowBlur=0;}
  for(const b of s.bullets){ctx.shadowBlur=10;ctx.shadowColor='#8ef6ff';ctx.fillStyle=b.wing?'#c8bcff':'#c0ffff';const width=Math.min(8,3+(b.damage||1));ctx.fillRect(b.x-width/2,b.y-9,width,17);}ctx.shadowBlur=0;
  for(const m of s.missiles){ctx.save();ctx.translate(m.x,m.y);ctx.shadowBlur=14;ctx.shadowColor='#ffd28f';polygon([[0,-10],[5,2],[0,8],[-5,2]],'#fff0d0','#ffbd78');ctx.fillStyle='#ffbb76';ctx.fillRect(-2,8,4,12);ctx.restore();}
  for(const e of s.enemies)plane(e.x,e.y,true,e.heavy);drawBoss();
  for(const b of s.shots){ctx.shadowBlur=9;ctx.shadowColor='#ffbcf1';ctx.fillStyle='#ffd2f6';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff4ff';ctx.beginPath();ctx.arc(b.x,b.y,2,0,Math.PI*2);ctx.fill();}ctx.shadowBlur=0;
  if(s.wingman)for(const side of [-1,1])plane(clamp(s.player.x+side*38,8,472),s.player.y+7,false,false,true);
  if(s.invulnerable<=0||Math.floor(s.time*10)%2===0)plane(s.player.x,s.player.y);
  if(s.invulnerable>0||s.barrier){ctx.strokeStyle=s.barrier?'#d5baffbb':'#c4efff66';ctx.lineWidth=s.barrier?2:1;ctx.beginPath();ctx.arc(s.player.x,s.player.y,30+(s.barrier?Math.sin(s.time*3)*2:0),0,Math.PI*2);ctx.stroke();}
  for(const p of s.effects){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.fillRect(p.x-2,p.y-2,3,3);}ctx.globalAlpha=1;
  if(s.nova){ctx.strokeStyle='#dbfaff';ctx.lineWidth=4;ctx.globalAlpha=s.nova;ctx.beginPath();ctx.arc(s.player.x,s.player.y,(.8-s.nova)*850+20,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
  if(s.notice&&s.time<s.notice.until){ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillStyle='#09162acb';ctx.fillRect(100,73,280,30);ctx.fillStyle=s.notice.color;ctx.fillText(s.notice.label,240,93);}
  if(s.combo>=4){ctx.font='bold 13px sans-serif';ctx.fillStyle=STAGES[s.stageIndex].accent;ctx.textAlign='right';ctx.fillText('COMBO ×'+s.combo,456,80);}
  if(s.stageTime<2.5){ctx.font='14px sans-serif';ctx.textAlign='center';ctx.fillStyle='#d9eeff';ctx.fillText(STAGES[s.stageIndex].name,240,215);ctx.font='11px sans-serif';ctx.fillText('主人，幻蓝在你的侧翼。',240,239);}
  if(s.phase==='wave'&&s.stageTime>STAGES[s.stageIndex].bossAt-2){ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillStyle='#efd4ff';ctx.fillText('前方信号增强 · 注意躲避',240,185);}
  if(paused||s.transition){ctx.fillStyle='#07142bba';ctx.fillRect(0,0,WIDTH,HEIGHT);ctx.textAlign='center';ctx.fillStyle='#dcf5ff';ctx.font='24px sans-serif';ctx.fillText(s.transition?'航线已打通':'稍作停留',240,270);ctx.font='12px sans-serif';ctx.fillStyle='#b7cce2';ctx.fillText(s.transition?'幻蓝正在等主人一起出发':'点击“继续飞行”再次出发',240,300);}
 }
 const resize=()=>{const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=WIDTH*dpr;canvas.height=HEIGHT*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);draw();};
 function hud(){onHud?.({score:s.score,hp:s.hp,maxHp:s.maxHp,time:Math.floor(s.time),boss:!!s.boss,power:s.power,damage:1+s.power,laser:s.laser,missile:s.missile,wingman:s.wingman,barrier:s.barrier,magnet:s.magnet,resonance:s.resonance,stageIndex:s.stageIndex,scene:STAGES[s.stageIndex],bossesDefeated:s.bossesDefeated,transition:!!s.transition,notice:s.notice&&s.time<s.notice.until?s.notice.label:''});}
 function tick(now){
  if(destroyed)return;if(!last)last=now;const elapsed=Math.min((now-last)/1000,.1);last=now;
  if(!paused&&!s.done&&!s.transition){accumulator+=elapsed;while(accumulator>=1/120&&!s.done&&!s.transition){const x=Number(keys.has('ArrowRight')||keys.has('d'))-Number(keys.has('ArrowLeft')||keys.has('a')),y=Number(keys.has('ArrowDown')||keys.has('s'))-Number(keys.has('ArrowUp')||keys.has('w'));game.step(1/120,{x,y,target:x||y?null:pointer});accumulator-=1/120;}hudClock+=elapsed;if(hudClock>.08){hud();hudClock=0;}}
  if(s.transition&&s.transition.id!==announcedTransition){announcedTransition=s.transition.id;pause(true);hud();onStageClear?.(s.transition);}
  draw();if(s.done&&!reported){reported=true;hud();onFinish(s.result);return;}raf=requestAnimationFrame(tick);
 }
 function pause(value=true){if(destroyed||s.done)return;paused=value;keys.clear();pointer=null;last=0;accumulator=0;onPause?.(paused);draw();}
 function down(e){if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D',' ','Escape'].includes(e.key)||document.querySelector('dialog[open]'))return;e.preventDefault();if(e.key===' '||e.key==='Escape'){if(!e.repeat)pause(!paused);return;}keys.add(e.key.length===1?e.key.toLowerCase():e.key);}
 const up=e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key);
 function aim(e){const rect=canvas.getBoundingClientRect();pointer={x:(e.clientX-rect.left)/rect.width*WIDTH,y:(e.clientY-rect.top)/rect.height*HEIGHT-(e.pointerType==='touch'?32:0)};}
 function pointerDown(e){if(paused||s.transition)return;e.preventDefault();pointerId=e.pointerId;canvas.setPointerCapture(e.pointerId);aim(e);canvas.focus({preventScroll:true});}
 function pointerMove(e){if(!paused&&!s.transition&&(e.pointerType==='mouse'||e.pointerId===pointerId))aim(e);}
 function pointerUp(e){if(e.pointerId===pointerId){pointerId=null;pointer=null;}}
 const leave=()=>{if(pointerId===null)pointer=null;},visibility=()=>{if(document.hidden)pause(true);},blur=()=>pause(true);
 window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',visibility);window.addEventListener('resize',resize);canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',pointerUp);canvas.addEventListener('pointerleave',leave);
 resize();hud();raf=requestAnimationFrame(tick);
 return {pause,togglePause:()=>pause(!paused),continueStage(){if(game.continueStage()){pause(false);hud();canvas.focus({preventScroll:true});return true;}return false;},destroy(){if(destroyed)return;destroyed=true;cancelAnimationFrame(raf);keys.clear();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('resize',resize);canvas.removeEventListener('pointerdown',pointerDown);canvas.removeEventListener('pointermove',pointerMove);canvas.removeEventListener('pointerup',pointerUp);canvas.removeEventListener('pointercancel',pointerUp);canvas.removeEventListener('pointerleave',leave);}};
}
const api={createSimulation,mount,WIDTH,HEIGHT,STAGES,LOOT};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HuanlanFlight=api;
})(typeof window!=='undefined'?window:globalThis);
