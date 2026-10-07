/* Música de fundo da v2 (Brasil Invertido)
   Sintetizador 8-bit próprio (Web Audio), sem arquivos de áudio. Cada faixa tem acordes por compasso,
   baixo, acompanhamento, bateria e melodia; tudo toca bem abaixo dos efeitos sonoros.
   Faixas: title (abertura: título, seleção e mapa), uma por fase (pelo id da fase) e ending (urna e créditos). */

type Ev = { at: number; sym: string; dur: number };
type Pat = { ev: Ev[]; len: number };
type Chord = { r: number; third: number; sev: number };
type Track = {
  bpm: number; spb: number; chords: string[];
  lead: { wave: OscillatorType; v: number; pat: string; vib?: boolean; env?: 'pluck'; trem?: boolean; detune?: boolean };
  bass: string; arp: string; arpOct?: number; drums: Record<string, string>;
  L?: Pat; B?: Pat; A?: Pat; CH?: Chord[]; len?: number; g?: number;
};

export const MUSIC_VOL = 0.3;
const NN: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function midiOf(n: string): number | null {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(n);
  if (!m) return null;
  return 12 * (+m[3] + 1) + NN[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
function chordOf(c: string): Chord {
  const m = /^([A-G])(#|b)?(m|7|m7)?$/.exec(c)!;
  const r = NN[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0), q = m[3] || '';
  return { r, third: q.startsWith('m') ? 3 : 4, sev: q === '7' || q === 'm7' ? 10 : 11 };
}
function degree(ch: Chord, d: string, oct: number) {
  const base = 12 * (oct + 1) + ch.r;
  return base + ({ R: 0, '3': ch.third, '5': 7, '7': ch.sev, '8': 12, '9': 14 } as Record<string, number>)[d];
}
function parsePat(s: string): Pat {
  const ev: Ev[] = [];
  let p = 0;
  for (const tok of s.trim().split(/\s+/)) {
    const [a, b] = tok.split(':');
    const d = b ? +b : 1;
    if (a !== '.') ev.push({ at: p, sym: a, dur: d });
    p += d;
  }
  return { ev, len: p };
}

const MUSIC: Record<string, Track> = {
  // abertura da v2: o tema da v1 em tom menor, lento e meio desafinado
  title2:{bpm:96,spb:16,chords:['Cm','Cm','Fm','G','Cm','Ab','Fm','G'],
    lead:{wave:'square',v:.9,detune:true,pat:'Eb5:2 G5:2 C6:4 B5:2 G5:2 Eb5:4 F5:2 Eb5:2 D5:2 C5:2 D5:4 G4:4 Ab4:2 C5:2 F5:4 Eb5:2 F5:2 Ab5:4 G5:4 F5:2 Eb5:2 D5:4 .:4 Eb5:2 G5:2 C6:4 D6:2 C6:2 G5:4 Ab5:2 G5:2 Eb5:2 C5:2 Eb5:4 Ab4:4 F5:2 Ab5:2 C6:2 Ab5:2 G5:2 F5:2 Eb5:2 D5:2 D5:4 G5:4 C5:6 .:2'},
    bass:'R:4 .:4 5:4 .:4',arp:'.:2 3+5:2 .:4 3+5:2 .:6',
    drums:{k:'x.......x.......',s:'........x.......',h:'..x...x...x...x.'}},
  // fase 1, busão das 5h: chiptune em mi menor com tique-taque e buzina
  busao:{bpm:112,spb:16,chords:['Em','Em','C','B7','Em','Am','C','B7'],
    lead:{wave:'square',v:.8,detune:true,pat:'E5:4 G5:2 F#5:2 E5:4 B4:4 C5:4 B4:2 A4:2 G4:8 A4:4 C5:2 B4:2 A4:4 E5:4 D#5:4 F#5:4 B4:8 E5:4 G5:2 A5:2 B5:4 G5:4 A5:4 G5:2 E5:2 C5:8 A4:4 C5:4 E5:4 G5:4 F#5:4 D#5:4 B4:8'},
    bass:'R:2 .:2 R:2 .:2 5:2 .:2 R:2 .:2',arp:'.:4 3+5:2 .:6 3+5:2 .:2',
    drums:{k:'x.......x.......',s:'....x.......x...',c:'x...x...x...x...',b:'.......................................x........................'}},
  // fase 2, feira: xote em lá menor com sanfona desafinada e o bip da maquininha
  feira:{bpm:100,spb:16,chords:['Am','Am','Dm','E7','Am','F','Dm','E7'],
    lead:{wave:'sawtooth',v:.55,detune:true,vib:true,pat:'E5:3 E5:1 C5:2 A4:2 B4:3 C5:1 D5:4 C5:3 C5:1 A4:2 F4:2 E4:8 F5:3 F5:1 D5:2 A4:2 B4:3 C5:1 D5:4 E5:3 D5:1 C5:2 B4:2 A4:8'},
    bass:'R:3 R:1 .:2 5:2 R:3 R:1 .:2 5:2',arp:'.:2 3+5:2 .:2 3+5:2 .:2 3+5:2 .:2 3+5:2',
    drums:{k:'x..x....x..x....',s:'....x.......x...',p:'..............x.'}},
  // fase 3, postinho: pad grave com o bip do monitor cardíaco
  postinho:{bpm:88,spb:16,chords:['Dm','Dm','Bb','A','Dm','Gm','Bb','A'],
    lead:{wave:'triangle',v:1.4,vib:true,detune:true,pat:'D5:8 F5:4 E5:4 D5:8 A4:8 Bb4:8 D5:4 C5:4 A4:16 D5:8 F5:4 A5:4 G5:8 F5:8 E5:4 F5:4 E5:4 C#5:4 D5:16'},
    bass:'R:8 5:8',arp:'R:4 3:4 5:4 3:4',arpOct:3,
    drums:{m:'x...............',k:'x.......x.......'}},
  // fase 4, fumaça: baixo sintetizado pulsante, motosserra filtrada e o sininho da boiada
  fumaca:{bpm:104,spb:16,chords:['Cm','Cm','Ab','G','Cm','Fm','Ab','G'],
    lead:{wave:'square',v:.7,detune:true,pat:'G5:6 Eb5:2 C5:8 Ab5:6 G5:2 F5:8 G5:4 Ab5:4 Bb5:4 G5:4 F5:16 Eb5:6 F5:2 G5:8 C6:6 Bb5:2 Ab5:8 G5:4 F5:4 Eb5:4 D5:4 C5:16'},
    bass:'R:1 R:1 R:1 R:1 R:1 R:1 R:1 R:1 R:1 R:1 R:1 R:1 R:1 R:1 R:1 R:1',arp:'.:16',
    drums:{k:'x.......x.......',z:'x...............................',s:'........x.......'}},
  // fase 5, território: batidão desacelerado em fá menor, com sirene ao longe
  territorio:{bpm:86,spb:16,chords:['Fm','Fm','Db','C','Fm','Bbm','Db','C'],
    lead:{wave:'square',v:.7,detune:true,pat:'C5:3 C5:1 Ab4:2 F4:2 .:4 Eb5:2 C5:2 Db5:3 Db5:1 Bb4:2 Gb4:2 .:4 F5:2 Db5:2 C5:3 C5:1 Ab4:2 F4:2 .:4 Eb5:2 C5:2 Bb4:4 G4:4 E4:8'},
    bass:'R:3 R:1 .:2 R:2 .:2 R:2 5:2 .:2',arp:'.:16',
    drums:{k:'x..x..x...x..x..',s:'....x.......x...',h:'x.x.x.x.x.x.x.x.',y:'x...............................................................'}},
  // fase 6, fila do INSS: valsa de sala de espera, lenta e perdendo notas
  inss:{bpm:92,spb:12,chords:['Gm','Gm','Cm','D','Gm','Eb','Cm','D'],
    lead:{wave:'sine',v:1.6,vib:true,detune:true,pat:'D5:6 Bb4:3 G4:3 A4:6 Bb4:3 C5:3 D5:6 .:3 G5:3 F#5:9 .:3 Eb5:6 C5:3 A4:3 Bb4:6 C5:3 D5:3 C5:6 .:3 A4:3 G4:12'},
    bass:'R:4 .:8',arp:'.:4 3+5:2 .:2 3+5:2 .:2',
    drums:{t:'x...........'}},
  // fase 7, praça: o tema da v1 em versão sombria, com coral
  praca:{bpm:90,spb:16,chords:['Cm','G','Ab','Eb','Fm','Cm','Ab','G'],
    lead:{wave:'triangle',v:1.6,vib:true,pat:'G4:4 C5:4 Eb5:6 D5:2 C5:4 Bb4:4 G4:8 Ab4:4 C5:4 Eb5:6 F5:2 Eb5:4 C5:4 Bb4:8 C5:4 F5:4 Ab5:6 G5:2 F5:4 Eb5:4 C5:8 Eb5:4 D5:4 C5:4 B4:4 G4:8 .:8'},
    bass:'R:8 5:4 8:4',arp:'R+3+5:16',arpOct:4,
    drums:{k:'x.......x.......',s:'........x.......',t:'x...............'}},
  // urna: o Brasil desinvertido — o tema de encerramento da v1, em sol maior
  ending:{bpm:88,spb:16,chords:['G','D','Em','C','G','D','C','D'],
    lead:{wave:'triangle',v:1.6,vib:true,pat:'B4:4 D5:4 G5:6 F#5:2 E5:4 D5:4 A4:8 B4:4 E5:4 G5:6 A5:2 G5:4 E5:4 C5:8 D5:4 G5:4 B5:6 A5:2 A5:4 F#5:4 D5:8 E5:4 G5:4 C6:4 B5:2 A5:2 A5:8 F#5:4 D5:4'},
    bass:'R:8 5:4 8:4',arp:'R:2 3:2 5:2 8:2 5:2 3:2 5:2 3:2',arpOct:4,
    drums:{k:'x.......x.......',s:'........x.......'}}
};

// versões aceleradas para as lutas de chefão (mesmo tema, mais rápido, com o "ruído" da fase na frente)
for (const id of ['busao', 'feira', 'postinho', 'fumaca', 'territorio', 'inss', 'praca']) {
  const b = MUSIC[id];
  const d: Record<string, string> = {};
  for (const k in b.drums) d[k] = b.drums[k];
  d.k = 'x...x...x...x...';
  MUSIC[id + '!'] = Object.assign({}, b, { bpm: Math.round(b.bpm * 1.28), drums: d, lead: Object.assign({}, b.lead) });
}

// ganho por faixa, para todas ficarem no mesmo volume baixo
const MUSIC_GAIN: Record<string, number> = {title2:0.95,busao:0.95,feira:0.9,postinho:0.85,fumaca:1,territorio:0.95,inss:0.85,praca:0.8,ending:0.8};
for (const k in MUSIC) {
  const t = MUSIC[k];
  t.g = MUSIC_GAIN[k.replace('!', '')] || 1;
  t.L = parsePat(t.lead.pat); t.B = parsePat(t.bass); t.A = parsePat(t.arp);
  t.CH = t.chords.map(chordOf); t.len = t.spb * t.chords.length;
}

let NOISE: AudioBuffer | null = null;
function noiseBuf(ac: BaseAudioContext) {
  if (NOISE && NOISE.sampleRate === ac.sampleRate) return NOISE;
  const b = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return (NOISE = b);
}

// todo nó de ganho começa em zero, para não escapar um estalo antes do envelope
function mNote(ac: BaseAudioContext, out: AudioNode, f: number, t: number, dur: number, wave: OscillatorType, v: number, o: { vib?: boolean; pluck?: boolean } = {}) {
  const os = ac.createOscillator(), g = ac.createGain();
  g.gain.value = 0;
  os.type = wave; os.frequency.setValueAtTime(f, t);
  if (o.vib) {
    const l = ac.createOscillator(), lg = ac.createGain();
    l.frequency.value = 5.2; lg.gain.value = f * 0.006;
    l.connect(lg).connect(os.frequency); l.start(t); l.stop(t + dur + 0.05);
  }
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.008);
  if (o.pluck) g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.18, dur));
  else {
    g.gain.linearRampToValueAtTime(v * 0.7, t + Math.min(0.12, dur * 0.5));
    g.gain.setValueAtTime(v * 0.7, t + Math.max(0.01, dur - 0.04));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  os.connect(g).connect(out); os.start(t); os.stop(t + dur + 0.25);
}

function mDrum(ac: BaseAudioContext, out: AudioNode, kind: string, t: number) {
  if (kind === 'k') {
    const o = ac.createOscillator(), g = ac.createGain();
    g.gain.value = 0; o.type = 'sine';
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0.16, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g).connect(out); o.start(t); o.stop(t + 0.2);
    return;
  }
  if (kind === 'c') { // tique-taque do relógio de ponto
    const o = ac.createOscillator(), g = ac.createGain();
    g.gain.value = 0; o.type = 'square'; o.frequency.value = (Math.floor(t * 10) % 2) ? 1500 : 1900;
    g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    o.connect(g).connect(out); o.start(t); o.stop(t + 0.05);
    return;
  }
  if (kind === 'p') { // bip da maquininha
    const o = ac.createOscillator(), g = ac.createGain();
    g.gain.value = 0; o.type = 'square'; o.frequency.value = 2350;
    g.gain.setValueAtTime(0.035, t); g.gain.setValueAtTime(0.035, t + 0.07); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.connect(g).connect(out); o.start(t); o.stop(t + 0.12);
    return;
  }
  if (kind === 'm') { // monitor cardíaco
    const o = ac.createOscillator(), g = ac.createGain();
    g.gain.value = 0; o.type = 'sine'; o.frequency.value = 988;
    g.gain.setValueAtTime(0.07, t); g.gain.setValueAtTime(0.07, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    o.connect(g).connect(out); o.start(t); o.stop(t + 0.18);
    return;
  }
  if (kind === 'b') { // buzina de ônibus
    for (const f of [233, 294]) {
      const o = ac.createOscillator(), g = ac.createGain();
      g.gain.value = 0; o.type = 'square'; o.frequency.value = f;
      g.gain.setValueAtTime(0.025, t); g.gain.setValueAtTime(0.025, t + 0.22); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g).connect(out); o.start(t); o.stop(t + 0.32);
    }
    return;
  }
  if (kind === 'y') { // sirene ao longe
    const o = ac.createOscillator(), g = ac.createGain();
    g.gain.value = 0; o.type = 'sine';
    o.frequency.setValueAtTime(620, t); o.frequency.linearRampToValueAtTime(980, t + 0.9); o.frequency.linearRampToValueAtTime(620, t + 1.8);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.03, t + 0.3); g.gain.linearRampToValueAtTime(0.0001, t + 1.8);
    o.connect(g).connect(out); o.start(t); o.stop(t + 1.9);
    return;
  }
  if (kind === 'z') { // motosserra filtrada
    const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
    g.gain.value = 0; o.type = 'sawtooth'; o.frequency.setValueAtTime(70, t); o.frequency.linearRampToValueAtTime(110, t + 0.4); o.frequency.linearRampToValueAtTime(80, t + 0.9);
    f.type = 'lowpass'; f.frequency.value = 900;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.045, t + 0.08); g.gain.setValueAtTime(0.045, t + 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + 1);
    o.connect(f).connect(g).connect(out); o.start(t); o.stop(t + 1.05);
    return;
  }
  if (kind === 't') { // carimbo
    const o = ac.createOscillator(), g = ac.createGain();
    g.gain.value = 0; o.type = 'triangle'; o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.08);
    g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    o.connect(g).connect(out); o.start(t); o.stop(t + 0.12);
    return;
  }
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  g.gain.value = 0; s.buffer = noiseBuf(ac);
  f.type = 'highpass'; f.frequency.value = kind === 's' ? 1400 : 7000;
  const d = kind === 's' ? 0.12 : 0.035;
  g.gain.setValueAtTime(kind === 's' ? 0.09 : 0.035, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(f).connect(g).connect(out); s.start(t, Math.random() * 0.5); s.stop(t + d + 0.02);
}

// toca tudo o que começa no passo `step` da faixa, no instante t.
// `loop` alterna o arranjo: 0 melodia cheia, 1 melodia suave uma oitava abaixo, 2 só o acompanhamento
function mStep(ac: BaseAudioContext, out: AudioNode, tr: Track, step: number, t: number, loop = 0) {
  const sd = 60 / tr.bpm / 4, ch = tr.CH![Math.floor(step / tr.spb) % tr.CH!.length], vr = loop % 3;
  const li = step % tr.L!.len;
  if (vr !== 2) for (const e of tr.L!.ev) if (e.at === li) {
    let m = midiOf(e.sym);
    if (m == null) continue;
    if (vr === 1) { m -= 12; mNote(ac, out, hz(m), t, e.dur * sd * 0.95, 'triangle', 0.06 * tr.lead.v, { vib: true }); continue; }
    if (tr.lead.trem) for (let i = 0; i < e.dur; i++) mNote(ac, out, hz(m), t + i * sd, sd * 0.9, tr.lead.wave, 0.045 * tr.lead.v, { pluck: true });
    else mNote(ac, out, hz(m) * (tr.lead.detune ? 1 + (((e.at * 7 + loop * 3) % 5) - 2) * 0.006 : 1), t, e.dur * sd * 0.95, tr.lead.wave, 0.045 * tr.lead.v, { vib: tr.lead.vib, pluck: tr.lead.env === 'pluck' });
  }
  const bi = step % tr.B!.len;
  for (const e of tr.B!.ev) if (e.at === bi) mNote(ac, out, hz(degree(ch, e.sym, 2)), t, e.dur * sd * 0.9, 'triangle', 0.07);
  const ai = step % tr.A!.len;
  for (const e of tr.A!.ev) if (e.at === ai) for (const d of e.sym.split('+')) mNote(ac, out, hz(degree(ch, d, tr.arpOct || 3) + (tr.arpOct ? 0 : 12)), t, e.dur * sd * 0.8, 'square', 0.012, { pluck: true });
  for (const k in tr.drums) { const p = tr.drums[k]; if (p[step % p.length] === 'x') mDrum(ac, out, k, t); }
}

// Toca a faixa pedida a cada quadro, trocando com um fade curto; abaixa na pausa e respeita o mudo
export function createMusic2() {
  let name: string | null = null, bus: GainNode | null = null, trGain: GainNode | null = null, master: GainNode | null = null;
  let step = 0, loop = 0, next = 0;
  function set(ac: AudioContext, want: string | null) {
    if (name === want) return;
    if (!master) { master = ac.createGain(); master.gain.value = MUSIC_VOL; master.connect(ac.destination); }
    const t = ac.currentTime;
    if (bus) {
      const old = bus;
      old.gain.cancelScheduledValues(t); old.gain.setValueAtTime(old.gain.value, t); old.gain.linearRampToValueAtTime(0, t + 0.35);
      setTimeout(() => { try { old.disconnect(); } catch (_) {} }, 800);
    }
    name = want; bus = null; trGain = null;
    if (!want || !MUSIC[want]) { name = null; return; }
    bus = ac.createGain(); bus.gain.setValueAtTime(0, t); bus.gain.linearRampToValueAtTime(1, t + 0.4); bus.connect(master);
    trGain = ac.createGain(); trGain.gain.value = MUSIC[want].g || 1; trGain.connect(bus);
    step = 0; loop = 0; next = t + 0.12;
  }
  return {
    tick(ac: AudioContext | null, want: string | null, muted: boolean, paused: boolean) {
      if (!ac) return;
      set(ac, want);
      if (master) {
        const target = muted ? 0 : MUSIC_VOL * (paused ? 0.35 : 1);
        if (Math.abs(master.gain.value - target) > 0.001) master.gain.setTargetAtTime(target, ac.currentTime, 0.08);
      }
      if (!name || !trGain) return;
      const tr = MUSIC[name], sd = 60 / tr.bpm / 4;
      if (next < ac.currentTime - 0.25) next = ac.currentTime + 0.05; // voltou de um travamento: não despeja notas atrasadas
      while (next < ac.currentTime + 0.18) {
        mStep(ac, trGain, tr, step, next, loop);
        step++;
        if (step >= tr.len!) { step = 0; loop++; }
        next += sd;
      }
    },
    stop(ac: AudioContext | null) { if (ac) set(ac, null); }
  };
}
