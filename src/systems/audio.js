/**
 * 音樂與音效：用 Web Audio 即時合成的原創配樂與效果音。
 */

/* ---------- 音樂與音效（Web Audio 即時合成，原創曲） ---------- */
const AU=(()=>{
  let ctx=null, master, musicBus, sfxBus, muted=false, nextT=0, step=0, timer=null, eng=null, sir=null, sirOn=false, noiseBuf=null;
  const BPM=124, S16=60/BPM/4;
  const N=n=>440*Math.pow(2,(n-69)/12);
  /* 和弦進行 C – G – Am – F（每小節一個和弦），共 8 小節：A 段兩次 */
  const PROG=[[48,52,55],[43,47,50],[45,48,52],[41,45,48],[48,52,55],[43,47,50],[41,45,48],[43,47,50]];
  const MEL=[
    [72,0,76,0,79,0,76,74, 72,0,74,0,76,0,0,0],[74,0,71,0,74,0,79,0, 77,76,74,0,71,0,0,0],
    [72,0,76,0,81,0,79,76, 72,0,76,0,79,0,0,0],[77,0,76,0,74,0,72,0, 74,0,76,0,72,0,0,0],
    [79,0,79,81,79,0,76,0, 72,0,74,76,79,0,0,0],[74,0,74,76,74,0,71,0, 67,0,71,74,79,0,0,0],
    [81,0,79,0,77,0,76,0, 77,0,79,0,81,0,0,0],[79,0,77,0,76,0,74,0, 71,0,74,0,79,0,77,0]];
  function voice(type,freq,t,dur,vol,bus,att=0.005,rel=0.08,glide){
    const o=ctx.createOscillator(), g=ctx.createGain(); o.type=type; o.frequency.setValueAtTime(freq,t);
    if(glide) o.frequency.exponentialRampToValueAtTime(glide,t+dur);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+att); g.gain.exponentialRampToValueAtTime(0.0001,t+dur+rel);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t+dur+rel+0.02); }
  function noise(t,dur,vol,bus,hp,lp){
    const s=ctx.createBufferSource(); s.buffer=noiseBuf; const g=ctx.createGain(), f=ctx.createBiquadFilter(); f.type=hp?'highpass':'lowpass'; f.frequency.value=hp||lp;
    g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+dur); s.connect(f); f.connect(g); g.connect(bus); s.start(t); s.stop(t+dur+0.02); }
  function kick(t){ const o=ctx.createOscillator(), g=ctx.createGain(); o.frequency.setValueAtTime(140,t); o.frequency.exponentialRampToValueAtTime(45,t+0.12);
    g.gain.setValueAtTime(0.55,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.2); o.connect(g); g.connect(musicBus); o.start(t); o.stop(t+0.22); }
  /* 戰鬥曲：A 小調、節奏較快（Am – F – G – E），低音八分音符推進 */
  const B_PROG=[[45,48,52],[41,45,48],[43,47,50],[40,44,47],[45,48,52],[41,45,48],[38,41,45],[40,44,47]];
  const B_MEL=[
    [76,0,76,77,76,0,74,72, 74,0,72,71,72,0,69,0],[72,0,72,74,72,0,71,69, 71,0,72,74,76,0,0,0],
    [74,0,74,76,74,0,72,71, 72,0,71,69,71,0,67,0],[68,0,71,0,74,0,76,0, 80,0,79,0,76,0,74,0],
    [81,0,79,0,77,0,76,0, 77,0,76,0,74,0,72,0],[77,0,76,0,74,0,72,0, 74,0,76,0,77,0,0,0],
    [74,0,76,0,77,0,79,0, 81,0,77,0,74,0,0,0],[76,0,80,0,83,0,80,0, 76,0,74,0,71,0,68,0]];
  let track='field';
  function schedule(){
    while(nextT<ctx.currentTime+0.15){
      if(track==='battle'){ scheduleBattle(); continue; }
      const bar=Math.floor(step/16)%8, s=step%16, t=nextT, ch=PROG[bar];
      const m=MEL[bar][s]; if(m) voice('square',N(m),t,S16*1.6,0.07,musicBus,0.004,0.06);
      if(m&&s%4===0) voice('triangle',N(m+12),t,S16*0.8,0.025,musicBus);
      if(s%2===0) voice('triangle',N(ch[0]-12+(s%4===2?12:0)),t,S16*1.4,0.22,musicBus,0.004,0.04);
      if(s===2||s===6||s===10||s===14) ch.forEach(n=>voice('sawtooth',N(n+12),t,S16*0.5,0.018,musicBus,0.002,0.05));
      if(s%4===0) kick(t);
      if(s===4||s===12) noise(t,0.12,0.18,musicBus,1800);
      if(s%2===1) noise(t,0.03,0.06,musicBus,7000);
      if(bar===7&&s>=12) noise(t,0.05,0.1,musicBus,4000);
      nextT+=S16; step++;
    }
  }
  function scheduleBattle(){
    const S=60/164/4, bar=Math.floor(step/16)%8, s=step%16, t=nextT, ch=B_PROG[bar];
    const m=B_MEL[bar][s]; if(m) voice('square',N(m),t,S*1.5,0.065,musicBus,0.003,0.04);
    if(m&&s%4===0) voice('sawtooth',N(m-12),t,S*0.9,0.02,musicBus);
    voice('triangle',N(ch[0]-12+(s%2?12:0)),t,S*0.9,0.24,musicBus,0.003,0.03);
    if(s%8===4) ch.forEach(n=>voice('square',N(n+12),t,S*0.6,0.016,musicBus,0.002,0.04));
    if(s%4===0) kick(t);
    if(s===4||s===12) noise(t,0.1,0.2,musicBus,1600);
    noise(t,0.025,s%2?0.035:0.06,musicBus,8000);
    nextT+=S; step++;
  }
  /** 切換背景音樂：'field'（校園）或 'battle'（戰鬥） */
  function music(name){ if(name===track) return; track=name; step=0; if(ctx) nextT=Math.max(nextT,ctx.currentTime+0.05); }
  function init(){
    if(ctx) { if(ctx.state==='suspended') ctx.resume(); return; }
    try{ ctx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return; }
    master=ctx.createGain(); master.gain.value=0.7; master.connect(ctx.destination);
    musicBus=ctx.createGain(); musicBus.gain.value=0.38; musicBus.connect(master);
    sfxBus=ctx.createGain(); sfxBus.gain.value=0.8; sfxBus.connect(master);
    noiseBuf=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate); const d=noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    nextT=ctx.currentTime+0.1; timer=setInterval(schedule,40);
  }
  const SFX={
    jump:t=>voice('square',330,t,0.12,0.12,sfxBus,0.003,0.04,760),
    land:t=>noise(t,0.06,0.12,sfxBus,0,600),
    step:t=>noise(t,0.035,0.05,sfxBus,0,900+Math.random()*400),
    blip:t=>voice('square',880+Math.random()*120,t,0.025,0.035,sfxBus,0.002,0.015),
    open:t=>{ voice('triangle',660,t,0.06,0.12,sfxBus); voice('triangle',990,t+0.06,0.08,0.12,sfxBus); },
    gem:t=>[72,76,79,84,88].forEach((n,i)=>voice('triangle',N(n),t+i*0.06,0.14,0.14,sfxBus,0.003,0.2)),
    chime:t=>{ voice('sine',N(84),t,0.3,0.08,sfxBus,0.01,0.4); voice('sine',N(91),t+0.12,0.35,0.07,sfxBus,0.01,0.5); },
    grab:t=>{ voice('square',N(84),t,0.05,0.08,sfxBus,0.002,0.03,N(91)); voice('square',N(88),t+0.07,0.06,0.08,sfxBus,0.002,0.03,N(96)); },
    whistle:t=>{ for(let i=0;i<2;i++){ const o=ctx.createOscillator(), l=ctx.createOscillator(), lg=ctx.createGain(), g=ctx.createGain(), s0=t+i*0.32;
      o.type='sine'; o.frequency.value=2900; l.frequency.value=38; lg.gain.value=180; l.connect(lg); lg.connect(o.frequency);
      g.gain.setValueAtTime(0.0001,s0); g.gain.exponentialRampToValueAtTime(0.16,s0+0.02); g.gain.setValueAtTime(0.16,s0+(i?0.45:0.2)); g.gain.exponentialRampToValueAtTime(0.0001,s0+(i?0.5:0.25));
      o.connect(g); g.connect(sfxBus); o.start(s0); l.start(s0); o.stop(s0+0.55); l.stop(s0+0.55); } },
    door:t=>{ noise(t,0.08,0.25,sfxBus,0,400); voice('square',120,t,0.05,0.12,sfxBus,0.002,0.04,70); },
    scream:t=>voice('sawtooth',900+Math.random()*300,t,0.35,0.05,sfxBus,0.01,0.1,380),
    horn:t=>{ voice('sawtooth',392,t,0.35,0.07,sfxBus,0.01,0.05); voice('sawtooth',494,t,0.35,0.06,sfxBus,0.01,0.05); },
    toot:t=>{ voice('square',523,t,0.08,0.06,sfxBus); voice('square',659,t+0.09,0.12,0.06,sfxBus); },
    /* 戰鬥用 */
    encounter:t=>{ voice('square',N(88),t,0.07,0.1,sfxBus,0.002,0.03); voice('square',N(95),t+0.08,0.16,0.1,sfxBus,0.002,0.06); },
    select:t=>voice('square',N(84),t,0.04,0.07,sfxBus,0.002,0.02),
    hit:t=>{ noise(t,0.16,0.35,sfxBus,0,1200); voice('square',200,t,0.1,0.12,sfxBus,0.002,0.05,60); },
    crit:t=>{ noise(t,0.22,0.4,sfxBus,0,2200); voice('sawtooth',300,t,0.18,0.1,sfxBus,0.002,0.05,50); },
    water:t=>{ noise(t,0.9,0.22,sfxBus,0,2600); for(let i=0;i<6;i++) voice('sine',N(84+i*2),t+i*0.07,0.08,0.05,sfxBus,0.002,0.05,N(96+i*2)); },
    sand:t=>{ noise(t,1.1,0.28,sfxBus,0,700); noise(t+0.3,0.8,0.18,sfxBus,3000); },
    holy:t=>[84,88,91,96,100].forEach((n,i)=>voice('sine',N(n),t+i*0.05,0.5,0.06,sfxBus,0.01,0.4)),
    sword:t=>{ noise(t,0.25,0.3,sfxBus,2500); voice('sawtooth',1400,t,0.22,0.06,sfxBus,0.002,0.05,180); },
    heal:t=>[72,76,79,84,79,84,88].forEach((n,i)=>voice('triangle',N(n),t+i*0.07,0.1,0.09,sfxBus,0.003,0.12)),
    flee:t=>[79,74,70,67].forEach((n,i)=>voice('square',N(n),t+i*0.06,0.05,0.07,sfxBus,0.002,0.03)),
    neigh:t=>{ voice('sawtooth',N(83),t,0.45,0.05,sfxBus,0.01,0.2,N(71)); voice('square',N(90),t+0.05,0.25,0.025,sfxBus,0.01,0.12,N(78)); },
    clop:t=>noise(t,0.035,0.07,sfxBus,0,1500+Math.random()*500),
    faint:t=>voice('square',N(72),t,0.6,0.09,sfxBus,0.005,0.1,N(48)),
    win:t=>[[72,0],[76,0.12],[79,0.24],[84,0.36],[79,0.6],[84,0.72]].forEach(([n,d])=>voice('square',N(n),t+d,d>0.5?0.3:0.1,0.09,sfxBus,0.003,0.1)),
    lowhp:t=>{ voice('square',N(91),t,0.07,0.05,sfxBus,0.002,0.02); voice('square',N(91),t+0.14,0.07,0.05,sfxBus,0.002,0.02); },
    over:t=>[[67,0],[63,0.35],[60,0.7],[55,1.05]].forEach(([n,d])=>voice('triangle',N(n),t+d,0.4,0.12,sfxBus,0.005,0.3))
  };
  return {
    init,
    music,
    sfx(n){ if(!ctx||muted||!SFX[n]) return; SFX[n](ctx.currentTime+0.005); },
    engine(on,speed){ if(!ctx) return;
      if(on&&!eng){ const o=ctx.createOscillator(), o2=ctx.createOscillator(), f=ctx.createBiquadFilter(), g=ctx.createGain(); o.type='sawtooth'; o2.type='square'; f.type='lowpass'; f.frequency.value=600; g.gain.value=0;
        o.connect(f); o2.connect(f); f.connect(g); g.connect(sfxBus); o.start(); o2.start(); eng={o,o2,g}; }
      if(eng){ const t=ctx.currentTime, sp=Math.abs(speed||0); eng.o.frequency.setTargetAtTime(45+sp*5,t,0.08); eng.o2.frequency.setTargetAtTime(22.5+sp*2.5,t,0.08);
        eng.g.gain.setTargetAtTime(on&&!muted?0.045+sp*0.004:0,t,0.08);
        if(!on){ const e=eng; eng=null; setTimeout(()=>{ try{ e.o.stop(); e.o2.stop(); }catch(_){} },400); } } },
    siren(on){ if(!ctx||on===sirOn) return; sirOn=on;
      if(on){ const o=ctx.createOscillator(), l=ctx.createOscillator(), lg=ctx.createGain(), g=ctx.createGain(); o.type='square'; o.frequency.value=760; l.type='square'; l.frequency.value=1.4; lg.gain.value=170;
        l.connect(lg); lg.connect(o.frequency); g.gain.value=muted?0:0.035; o.connect(g); g.connect(sfxBus); o.start(); l.start(); sir={o,l,g}; musicBus.gain.setTargetAtTime(muted?0:0.16,ctx.currentTime,0.3); }
      else if(sir){ const e=sir; sir=null; e.g.gain.setTargetAtTime(0,ctx.currentTime,0.05); setTimeout(()=>{ try{ e.o.stop(); e.l.stop(); }catch(_){} },300); musicBus.gain.setTargetAtTime(muted?0:0.38,ctx.currentTime,0.3); } },
    toggle(){ muted=!muted; if(ctx){ const t=ctx.currentTime; master.gain.setTargetAtTime(muted?0:0.7,t,0.05); } return muted; },
    get muted(){ return muted; }
  };
})();

export { AU };
