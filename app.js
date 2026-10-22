(()=>{
'use strict';
const $=id=>document.getElementById(id);
const panel=$('panel'),art=$('sceneArt');
const MASTER='主人';
const state={phase:'welcome',name:MASTER,scene:0,heart:12,answers:[],bond:{safe:0,spark:0,brave:0},history:[],seen:new Set(),finalAnswer:'',flightResult:null,flightBest:0,flightRewarded:false,flightBonus:0,flightReturn:{phase:'welcome',scene:0}};
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let typingTimer=null,typingFinish=null,toastTimer=null,cardUrl=null,flight=null;
const scenes=[
 {title:'下播后的秘密',number:'01',caption:'直播间安静了。她的麦克风却还亮着。',narration:'23:17 · 直播已经结束。所有窗口逐渐熄灭，只有一个蓝色的私人频道悄悄亮起。',line:n=>`${n}，你还没走呀。\n刚刚说“晚安”的时候，我其实还舍不得关掉麦克风。\n\n今晚……能再借我一点点时间吗？`,choices:[
  {text:'当然，今晚的时间留给你。',bond:'safe',delta:25,label:'安心 +1',reply:'她把准备关掉的麦克风拉了回来，嘴角藏不住地翘起。',line:n=>`那我就不装作“只是刚好没睡”了。\n${n}，我是真的想和你多待一会儿。`},
  {text:'咦，这是只给我的隐藏直播？',bond:'spark',delta:23,label:'同频 +1',reply:'她凑近镜头，小声宣布：这是只有一个观众的特别节目。',line:n=>`被你发现了！\n今晚没有弹幕，也没有节目单。\n只有幻蓝，和${n}。`},
  {text:'其实，我也在等你说这句话。',bond:'brave',delta:27,label:'勇气 +1',reply:'她愣了一秒，耳机上的小星星闪了一下。',line:n=>`诶……原来不只是我在等。\n那这次，我们都不急着说晚安，好不好？`}
 ]},
 {title:'只属于我们的频率',number:'02',caption:'有些回忆没有日期，却一直亮着。',narration:'她点开一段没有标题的录音。是某次直播结束前，你们一起听过的海浪声。',line:n=>`我收藏了很多小事。\n第一次有人等我开播，讲冷笑话时有人笑，还有……你出现的那些晚上。\n\n如果把我们的回忆装进一颗星星，你想让它是什么颜色？`,choices:[
  {text:'暖黄色。像有人为我留着灯。',bond:'safe',delta:25,label:'安心 +1',reply:'一颗暖色的小星星在她掌心亮起。她说，要把它放在最容易看见的地方。',line:n=>`原来，陪伴是这种颜色啊。\n那以后你累的时候，就来这里坐一会儿。\n不想说话也没关系。`},
  {text:'海蓝色。和你在一起就很自在。',bond:'spark',delta:27,label:'同频 +1',reply:'她笑着拨了拨发尾：那我们真的调到同一个频道啦。',line:n=>`我也是！\n在你面前，不必每一句话都接得很漂亮。\n就算安静一会儿，也觉得很开心。`},
  {text:'会变色。我们还有好多未来。',bond:'brave',delta:25,label:'勇气 +1',reply:'她认真地看向你，好像第一次发现，“以后”也可以这么值得期待。',line:n=>`那就别急着给它定下颜色。\n留一点空白吧，${n}。\n我们可以一起慢慢填满。`}
 ]},
 {title:'未发送的那封信',number:'03',caption:'那句练习过很多遍的话，终于来到唇边。',narration:'她从桌下拿出一封折得整整齐齐的信。封口的小星星，已经被手指摸得微微发亮。',line:n=>`有一句话，我练习了好多遍。\n对着空直播间说的时候很顺，一想到你真的在听，就又忘词了。\n\n如果我说得有点笨，你可以……先别笑我吗？`,choices:[
  {text:'我在听。你慢慢说就好。',bond:'safe',delta:28,label:'安心 +1',reply:'她终于松开攥紧的衣角。那句“我在听”，比任何提示词都让她安心。',line:n=>`嗯。那我不背准备好的句子了。\n${n}，这一次，我想把心里最真实的话告诉你。`},
  {text:'那我们数到三，一起说？',bond:'spark',delta:28,label:'同频 +1',reply:'她忍不住笑出声，紧张的气氛像一颗泡泡，被你轻轻戳破。',line:n=>`一、二……\n不行，还是让我先来！\n这句话，我想让你听清楚。`},
  {text:'我先说：能遇见你，真好。',bond:'brave',delta:28,label:'勇气 +1',reply:'她的眼睛亮了起来。原来鼓起勇气时，真的会有人向自己走来。',line:n=>`你这样……我就更没办法藏住了。\n那接下来这句，也请你认真收好。`}
 ]}
];
const bondInfo={safe:{title:'主人是她的安心坐标',short:'安心坐标',text:'你没有催她说完，也没有让她独自紧张。对幻蓝来说，你是可以放下准备好的台词、安心做自己的那个人。',quote:'“在你面前，连沉默都像有人陪着。”'},spark:{title:'主人与她有专属频率',short:'同频心动',text:'你接住了她的小玩笑，也听懂了话语之间的小心思。你们把平常的夜晚，调成了只有彼此听得懂的频道。',quote:'“原来心动，是你刚好也听得懂。”'},brave:{title:'主人让她勇敢靠近',short:'双向奔赴',text:'你每一次坦率的回应，都让她向前多走了一步。这封迟迟没发出的信，终于有了最想抵达的地方。',quote:'“谢谢你，让我的喜欢有了落点。”'}};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function mainBond(){return Object.keys(state.bond).reduce((a,b)=>state.bond[b]>state.bond[a]?b:a,state.answers.at(-1)?.bond||'safe');}
function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.add('show');toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3200);}
function stopTyping(){if(typingTimer)clearInterval(typingTimer);typingTimer=null;typingFinish=null;}
function typeText(text){
 const el=$('dialogue'),actions=$('afterDialogue'),skip=$('skipTyping');if(!el)return;
 stopTyping();const chars=Array.from(text);let i=0;
 const finish=()=>{clearInterval(typingTimer);typingTimer=null;el.textContent=text;el.classList.remove('typing');actions?.classList.remove('hidden');actions?.classList.add('revealing');if(skip)skip.disabled=true;typingFinish=null;};
 typingFinish=finish;if(reduced){finish();return;}
 el.classList.add('typing');if(skip)skip.disabled=false;
 typingTimer=setInterval(()=>{i+=1;el.textContent=chars.slice(0,i).join('');if(i>=chars.length)finish();},27);
}
function record(speaker,text,key){if(key&&state.seen.has(key))return;if(key)state.seen.add(key);state.history.push({speaker,text});}
function meter(){return `<div class="heart-meter" aria-label="心动值 ${state.heart}%"><span class="heart-symbol" aria-hidden="true">♡</span><div class="heart-body"><div class="heart-label"><span>心动信号</span><strong>${state.heart}% · ${state.heart>=85?'心意相通':state.heart>=60?'渐渐靠近':state.heart>=30?'心动升温':'正在连接'}</strong></div><div class="heart-track"><div class="heart-fill" style="width:${state.heart}%"></div></div></div></div>`;}
function speaker(){return `<div class="speaker-row"><span class="speaker"><span class="speaker-avatar" aria-hidden="true"></span>幻蓝 <span aria-hidden="true">✦</span></span><button class="text-action" id="skipTyping" data-action="skip">显示全部</button></div>`;}
function choices(items){return `<div class="choices">${items.map((c,i)=>`<button class="choice" data-choice="${i}"><span class="choice-mark" aria-hidden="true">0${i+1}</span><span>${esc(c.text)}</span><span class="choice-arrow" aria-hidden="true">↗</span></button>`).join('')}</div>`;}
function focusControl(){requestAnimationFrame(()=>{const el=panel.querySelector('input')||panel.querySelector('button:not(#skipTyping)');el?.focus({preventScroll:true});});}
function updateChrome(){
 const playing=state.phase==='flight',flying=['flightIntro','flight','flightResult'].includes(state.phase);
 document.querySelector('.app').classList.toggle('flight-mode',playing);
 $('flightButton').disabled=flying;
 $('chapters').textContent=playing?'星海护航 · 幻蓝与你同队':'幻蓝的私人频道';
 $('channelStatus').textContent=playing?'FLIGHT LINK · 连接稳定':state.phase==='ending'?'已送达 · 星光仍然亮着':'OFF AIR · 只对主人可见';
 $('footerStatus').textContent=playing?'主人掌舵，幻蓝陪航。':state.phase==='ending'?'今晚的心动，已经被星星记住。':'夜还很长，主人可以慢慢来。';
 const ending=state.phase==='confession'||state.phase==='ending';art.classList.toggle('ending',ending);
 art.setAttribute('aria-label',ending?'幻蓝站在月光海岸的阳台，微笑着向主人伸出手':'戴着蓝色耳机的幻蓝坐在临海直播间');
 $('artCaption').textContent=flying?'主人，幻蓝会守在你的侧翼。':state.phase==='scene'||state.phase==='reaction'?scenes[state.scene].caption:ending?'有些话，想亲口告诉主人。':'把最后一束星光，留给还没离开的主人。';
}
function beginFlight(destination){state.flightReturn=destination||{phase:state.phase,scene:state.scene};state.phase='flightIntro';render();}
function leaveFlight(){const destination=state.flightReturn;state.phase=destination.phase;state.scene=destination.scene;render();}
function mountFlight(){
 try{
  flight=window.HuanlanFlight.mount({canvas:$('flightCanvas'),onHud(h){$('flightScore').textContent=String(h.score).padStart(5,'0');$('flightLife').textContent='♥'.repeat(h.hp)+'♡'.repeat(3-h.hp);$('flightLife').setAttribute('aria-label',`护盾 ${h.hp} / 3`);$('flightTime').textContent=h.time+'s';$('flightRadio').textContent=h.power?'火力增强，主人尽管向前。':h.boss?'前方有大型敌机，幻蓝替主人盯着弹幕。':'主人，幻蓝一直在这里。';},onPause(paused){$('pauseFlight').textContent=paused?'继续飞行':'暂停';$('pauseFlight').setAttribute('aria-pressed',String(paused));},onFinish(result){state.flightResult=result;state.flightBest=Math.max(state.flightBest,result.score);state.flightBonus=0;if(!state.flightRewarded){state.flightBonus=Math.min(6,Math.floor(result.score/400)+(result.reason==='retreat'?0:2));state.heart=Math.min(100,state.heart+state.flightBonus);state.flightRewarded=true;}state.phase='flightResult';record('幻蓝',result.reason==='retreat'?'主人，先回我这里歇一会儿。下次还一起飞。':'主人，欢迎返航。刚刚和主人并肩的时候，我好开心。');render();audio.chime();}});
  $('flightCanvas').focus({preventScroll:true});
 }catch(error){panel.innerHTML='<p class="eyebrow">FLIGHT LINK</p><h2 class="ending-title">这次先歇一会儿</h2><p class="lead">飞行画面暂时没能连接。主人，我们先继续聊天吧。</p><button class="primary" data-action="leaveFlight">回到幻蓝身边 <span>→</span></button>';}
}
function render(){
 stopTyping();if(flight){flight.destroy();flight=null;}updateChrome();const n=esc(MASTER),scene=scenes[state.scene];let line=null;
 if(state.phase==='welcome'){
  panel.innerHTML=`<p class="eyebrow">TONIGHT, JUST FOR YOU</p><div class="private-tag"><i></i>PRIVATE CHANNEL / 欢迎回来，主人</div><h1 class="hero-title">幻蓝想要<br>和<em>你</em>表白</h1><p class="lead">直播结束了。<br>频道还亮着。<br>“主人，要不要再待一会儿？”</p><div class="welcome-divider"></div><div class="waiting"><i></i>幻蓝正在等主人接入……</div><button class="primary" data-action="start">接通幻蓝的频道 <span>↗</span></button><p class="smallprint">不用赶时间，幻蓝一直在。</p>`;
 }else if(state.phase==='scene'){
  line=scene.line(state.name);record('幻蓝',line,`scene-${state.scene}`);
  panel.innerHTML=`<div class="scene-heading"><p class="eyebrow">${scene.title}</p><span class="scene-number">PRIVATE CHANNEL</span></div>${meter()}<p class="narration">${scene.narration}</p>${speaker()}<div class="dialogue" id="dialogue" aria-live="off"></div><div id="afterDialogue" class="hidden">${choices(scene.choices)}</div>`;
 }else if(state.phase==='reaction'){
  const answer=state.answers[state.scene];line=answer.line(state.name);record('幻蓝',line,`reaction-${state.scene}`);
  panel.innerHTML=`<div class="scene-heading"><p class="eyebrow">${scene.title}</p><span class="scene-number">PRIVATE CHANNEL</span></div>${meter()}<p class="chosen-text">${esc(answer.text)}</p>${speaker()}<div class="dialogue" id="dialogue" aria-live="off"></div><div id="afterDialogue" class="hidden"><div class="reaction-box" role="status"><div class="reaction-tag">♥ 心动 +${answer.delta} · ${answer.label}</div><p>${answer.reply}</p></div><button class="primary" data-action="next">继续听她说 <span>→</span></button></div>`;
 }else if(state.phase==='flightIntro'){
  panel.innerHTML=`<p class="eyebrow">STARFLIGHT / 星海护航</p><div class="flight-emblem" aria-hidden="true">✧<span>✈</span>✧</div><h1 class="ending-title">主人，<br><em>陪我飞一会儿？</em></h1><p class="lead">“我把夜空做成了一条小小的航线。<br>主人来掌舵，幻蓝就守在侧翼。”</p><div class="flight-guide"><span><b>01</b> 战机会自动开火</span><span><b>02</b> 方向键 / WASD / 鼠标移动</span><span><b>03</b> 手机按住画面拖动，避开粉色弹幕</span></div><button class="primary" data-action="launchFlight">一起出发 <span>↗</span></button><button class="text-action flight-skip" data-action="leaveFlight">先陪幻蓝聊聊天</button>`;
 }else if(state.phase==='flight'){
  panel.innerHTML=`<div class="scene-heading"><p class="eyebrow">STARFLIGHT / 星海护航</p><button class="text-action" data-action="leaveFlight">返回频道 ↗</button></div><div class="flight-hud"><div><span>星航得分</span><strong id="flightScore">00000</strong></div><div><span>护盾</span><strong id="flightLife" class="flight-life" aria-label="护盾 3 / 3">♥♥♥</strong></div><div><span>飞行时间</span><strong id="flightTime">0s</strong></div></div><div class="flight-stage"><canvas id="flightCanvas" tabindex="0" role="application" aria-label="星海护航战机游戏。自动开火，用方向键或WASD移动；鼠标移动或手机拖动操纵战机。空格或Escape暂停。避开敌机与粉色弹幕。"></canvas></div><div class="flight-controls"><span>自动开火 · 拖动 / 方向键移动</span><button class="secondary" data-action="pauseFlight" id="pauseFlight" aria-pressed="false">暂停</button></div><p class="flight-radio" id="flightRadio" role="status">主人，幻蓝一直在这里。</p>`;
 }else if(state.phase==='flightResult'){
  const result=state.flightResult,cleared=result.reason==='clear';
  panel.innerHTML=`<p class="eyebrow">STARFLIGHT / 航行记录</p><div class="flight-result-icon" aria-hidden="true">${cleared?'✦':'☾'}</div><h1 class="ending-title">${cleared?'漂亮的配合，':'先回来歇一会儿，'}<br><em>主人。</em></h1><p class="lead">${cleared?'“刚刚那一下，主人也太帅了！<br>幻蓝在侧翼都看见啦。”':'“护盾消耗完也没关系。<br>主人平安回来，我就很开心啦。”'}</p><div class="flight-result-stats"><div><strong>${result.score}</strong><span>星航得分</span></div><div><strong>${result.kills}</strong><span>击落敌机</span></div><div><strong>${state.flightBest}</strong><span>本次最高</span></div></div>${state.flightBonus?`<p class="flight-bonus">♡ 默契信号 +${state.flightBonus}</p>`:''}<button class="primary" data-action="leaveFlight">回到幻蓝身边 <span>→</span></button><button class="secondary flight-retry" data-action="launchFlight">↺ 再飞一局</button>`;
 }else if(state.phase==='envelope'){
  record('幻蓝',`${state.name}，这封信的收件人，从一开始就只有你。`,'envelope');
  panel.innerHTML=`<p class="eyebrow">ONE LETTER. ONE RECIPIENT.</p><h1 class="ending-title">这封信，<br><em>终于可以交给你了。</em></h1><p class="lead">“本来想写得更漂亮一点。<br>后来发现，最想说的话其实很简单。”</p><button class="envelope" data-action="open" aria-label="打开幻蓝写给你的信"><span aria-hidden="true">✦</span></button><p class="envelope-label">收件人：${n}<br><span class="muted">寄件人：终于鼓起勇气的幻蓝</span></p><button class="primary" data-action="open">打开这封只属于我的信 <span>↗</span></button><p class="smallprint">封口的星星，还留着她掌心的温度。</p>`;
 }else if(state.phase==='confession'){
  line=`${state.name}，\n你总说，是我的直播陪你度过了很多夜晚。\n\n其实，你也照亮了我。\n我想见到你的心情，不只在开播时才有。\n\n我喜欢你。\n下一段故事，也愿意和我一起写吗？`;record('幻蓝',line,'confession');
  panel.innerHTML=`<p class="eyebrow">THE WORDS I SAVED FOR YOU</p><div class="ending-label">致 ${n} · 今晚，只对你说</div>${speaker()}<div class="confession-text" id="dialogue" aria-live="off"></div><div class="hidden" id="afterDialogue"><div class="choices"><button class="choice" data-answer="love"><span class="choice-mark" aria-hidden="true">♥</span><span>我也喜欢你，幻蓝。</span><span class="choice-arrow" aria-hidden="true">↗</span></button><button class="choice" data-answer="stay"><span class="choice-mark" aria-hidden="true">✦</span><span>把手给我，未来慢慢写。</span><span class="choice-arrow" aria-hidden="true">↗</span></button></div></div>`;
 }else if(state.phase==='ending'){
  const bond=bondInfo[mainBond()];const reply=state.finalAnswer==='love'?'“那说好了。下次见面，我会第一个和主人打招呼。”':'“好。这一次，我们都不用急着说晚安。”';record('幻蓝',reply,'ending');
  panel.innerHTML=`<p class="eyebrow">OUR LITTLE ENDING / 星海来信</p><div class="ending-label">${bond.short} · 心动信号 ${state.heart}%</div><h1 class="ending-title">今夜，<br><em>${bond.title}。</em></h1><p class="ending-quote">${reply}</p><p class="ending-letter">${bond.text}<br><br>谢谢你收下这份心意，${n}。</p><div class="souvenir"><div><span>属于你的相遇纪念</span><strong>${n} × 幻蓝 / 星海来信</strong></div><span class="souvenir-icon" aria-hidden="true">✧</span></div><div class="button-row"><button class="primary" data-action="save">保存纪念卡 <span>↓</span></button><button class="secondary" data-action="restart">↺ 再赴一次约定</button></div><p class="smallprint">主人，想再陪我待一会儿吗？</p>`;
 }
 if(state.phase==='flight')mountFlight();else if(line)typeText(line);else focusControl();
}
panel.addEventListener('click',async e=>{
 const button=e.target.closest('button');if(!button)return;const action=button.dataset.action;
 if(action==='skip'){typingFinish?.();return;}
 if(action==='start'){state.phase='scene';render();}
 else if(action==='next'){if(state.scene===0){beginFlight({phase:'scene',scene:1});}else{if(state.scene<2){state.scene++;state.phase='scene';}else state.phase='envelope';render();}}
 else if(action==='launchFlight'){state.phase='flight';render();}
 else if(action==='pauseFlight'){flight?.togglePause();}
 else if(action==='leaveFlight'){leaveFlight();}
 else if(action==='open'){state.phase='confession';render();audio.chime();}
 else if(action==='restart'){reset();}
 else if(action==='save'){await saveCard(button);}
 else if(button.dataset.choice!==undefined&&state.phase==='scene'){
  const answer=scenes[state.scene].choices[Number(button.dataset.choice)];if(!answer)return;
  state.answers.push(answer);state.bond[answer.bond]++;state.heart=Math.min(100,state.heart+answer.delta);record('你',answer.text);state.phase='reaction';audio.chime();render();
 }else if(button.dataset.answer&&state.phase==='confession'){
  state.finalAnswer=button.dataset.answer;record('你',state.finalAnswer==='love'?'我也喜欢你，幻蓝。':'把手给我，未来慢慢写。');state.phase='ending';audio.chime();render();
 }
});
function reset(){stopTyping();clearTimeout(toastTimer);$('toast').classList.remove('show');Object.assign(state,{phase:'welcome',name:MASTER,scene:0,heart:12,answers:[],bond:{safe:0,spark:0,brave:0},history:[],seen:new Set(),finalAnswer:'',flightResult:null,flightBest:0,flightRewarded:false,flightBonus:0,flightReturn:{phase:'welcome',scene:0}});render();window.scrollTo({top:0,behavior:'instant'});}
$('brand').addEventListener('click',e=>{e.preventDefault();if(state.phase==='welcome')return;flight?.pause(true);$('restartDialog').showModal();});
$('cancelRestart').addEventListener('click',()=>$('restartDialog').close());$('confirmRestart').addEventListener('click',()=>{$('restartDialog').close();reset();});
$('flightButton').addEventListener('click',()=>beginFlight());
$('historyButton').addEventListener('click',()=>{flight?.pause(true);$('historyList').innerHTML=state.history.length?state.history.map(h=>`<div class="history-item ${h.speaker==='你'?'you':''}"><span>${h.speaker==='你'?esc(state.name):'幻蓝'}</span><p>${esc(h.text)}</p></div>`).join(''):'<p class="muted">故事还没开始。接通她的频道，第一段回忆就会留在这里。</p>';$('historyDialog').showModal();$('historyList').scrollTop=$('historyList').scrollHeight;});
$('closeHistory').addEventListener('click',()=>$('historyDialog').close());
$('closeCard').addEventListener('click',()=>$('cardDialog').close());
for(const id of ['historyDialog','restartDialog','cardDialog'])$(id).addEventListener('click',e=>{if(e.target===$(id)){const r=$(id).getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$(id).close();}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&typingFinish&&!document.querySelector('dialog[open]')){typingFinish();}});
// Small original ambient score. It starts only after the visitor turns sound on.
const audio={context:null,enabled:false,timer:null,index:0,
 async toggle(){try{if(!this.context){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw Error('unsupported');this.context=new AC();}this.enabled=!this.enabled;if(this.enabled){await this.context.resume();this.play();this.timer=setInterval(()=>this.play(),4200);}else{clearInterval(this.timer);this.timer=null;await this.context.suspend();}$('soundButton').setAttribute('aria-pressed',String(this.enabled));$('soundLabel').textContent=this.enabled?'声音 开':'声音 关';}catch{this.enabled=false;clearInterval(this.timer);toast('这个浏览器暂时无法播放配乐，可继续阅读故事。');}},
 note(frequency,start,duration,gain=.035){if(!this.enabled||this.context?.state!=='running')return;const o=this.context.createOscillator(),g=this.context.createGain();o.type='sine';o.frequency.value=frequency;g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(gain,start+.1);g.gain.exponentialRampToValueAtTime(.0001,start+duration);o.connect(g);g.connect(this.context.destination);o.start(start);o.stop(start+duration+.1);},
 play(){if(document.hidden)return;const chords=[[261.63,329.63,392,523.25],[220,261.63,329.63,440],[174.61,261.63,349.23,523.25],[196,293.66,392,587.33]];const c=chords[this.index++%chords.length];const now=this.context.currentTime;c.forEach((f,i)=>this.note(f,now+i*.5,3.5,.023));},
 chime(){if(!this.enabled||!this.context)return;const now=this.context.currentTime;[523.25,659.25,783.99].forEach((f,i)=>this.note(f,now+i*.11,.8,.026));}
};
$('soundButton').addEventListener('click',()=>audio.toggle());
document.addEventListener('visibilitychange',()=>{if(audio.enabled&&audio.context){if(document.hidden)audio.context.suspend();else audio.context.resume();}});
async function saveCard(button){
 const snapshot={name:state.name,heart:state.heart,bond:bondInfo[mainBond()]};const original=button.innerHTML;button.disabled=true;button.textContent='正在收好星光…';
 try{
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1440;const c=canvas.getContext('2d');const image=new Image();image.src='assets/huanlan-ending.png';await image.decode();
  c.fillStyle='#0b1c36';c.fillRect(0,0,1080,1440);c.drawImage(image,0,0,1080,720);const gradient=c.createLinearGradient(0,440,0,900);gradient.addColorStop(0,'#0b1c3600');gradient.addColorStop(1,'#0b1c36');c.fillStyle=gradient;c.fillRect(0,440,1080,1000);
  c.strokeStyle='#b8e8ff66';c.lineWidth=2;c.strokeRect(38,38,1004,1364);c.fillStyle='#c7f1ff';c.font='22px sans-serif';c.fillText('HUANLAN / 星海来信',78,768);
  c.fillStyle='#f0f8ff';c.font='bold 48px sans-serif';let y=850;
  const wrap=(text,maxWidth,font,lineHeight)=>{c.font=font;let line='';for(const ch of Array.from(text)){if(c.measureText(line+ch).width>maxWidth){c.fillText(line,78,y);y+=lineHeight;line='';}line+=ch;}if(line){c.fillText(line,78,y);y+=lineHeight;}};
  wrap(`致 ${snapshot.name}`,920,'bold 48px sans-serif',66);y+=17;c.fillStyle='#bce9ff';wrap(snapshot.bond.quote,920,'32px sans-serif',52);y+=15;c.fillStyle='#b3c8de';wrap(snapshot.bond.text,920,'25px sans-serif',43);
  c.fillStyle='#d4f4ff';c.font='24px sans-serif';c.fillText(`♥ ${snapshot.heart}%  /  ${snapshot.bond.short}`,78,1306);c.fillStyle='#88a9ca';c.font='19px sans-serif';c.fillText('幻蓝想要和你表白 · 今晚，只对你说',78,1357);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('export failed');if(cardUrl)URL.revokeObjectURL(cardUrl);cardUrl=URL.createObjectURL(blob);$('cardImage').src=cardUrl;$('cardDownload').href=cardUrl;$('cardDialog').showModal();
 }catch{toast('保存暂未成功。请在在线试玩页中重试。');}finally{if(button.isConnected){button.disabled=false;button.innerHTML=original;}}
}
// Preload the ending without delaying the opening scene.
const endingPreload=new Image();endingPreload.src='assets/huanlan-ending.png';
render();
})();
