// Super Flávio World II — O Brasil sob Flávio
// Motor da v2. Reaproveita a física, os controles e as telas da v1, com câmera 2D,
// cutscenes, chefões e o "Brasil Invertido".
import { VW, VH, TS, hr, fmtBR, setVW, VW_MIN, VW_MAX } from '../game/sources.ts';
import { SRC2 } from './sources2.ts';
import { heroFrames, villainFrames, HEROES, Frames } from './sprites2.ts';
import { createMusic2 } from './music2.ts';
import { LEVELS2, THEMES2, build2, LevelData2 } from './levels2.ts';
import { CUTS, Gfx } from './cutscenes2.ts';
import { TX } from './texts2.ts';

export function initGame2(onExit?: () => void) {
  const cv = document.getElementById('game') as HTMLCanvasElement;
  if (!cv) return () => {};
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const $ = (id: string) => document.getElementById(id)!;

  const HF: Record<string, Frames> = {};
  for (const id in HEROES) HF[id] = heroFrames(id);
  const VIL = villainFrames();
  const HERO_IDS = ['jessica', 'neide', 'cida', 'raimundo', 'kaua', 'arlindo'];

  // ---------------- Áudio ----------------
  let AC: AudioContext | null = null;
  let muted = false;
  function unlockAudio() {
    if (AC) { if (AC.state === 'suspended') { try { AC.resume(); } catch (_) {} } return; }
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) AC = new AudioCtx();
    } catch (_) {}
  }
  function tone(f: number, d: number, type: OscillatorType = 'square', v = 0.045, slide = 0, delay = 0) {
    if (muted || !AC) return;
    try {
      const t = AC.currentTime + delay;
      const o = AC.createOscillator();
      const g = AC.createGain();
      g.gain.value = 0;
      o.type = type;
      o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(AC.destination);
      o.start(t);
      o.stop(t + d + 0.02);
    } catch (_) {}
  }
  // mugido: serra grave filtrada, com o "uuu" descendo no fim
  function moo(pitch = 1, delay = 0) {
    if (muted || !AC) return;
    try {
      const t = AC.currentTime + delay, d = 0.75;
      const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(500, t); f.frequency.linearRampToValueAtTime(900, t + 0.25); f.frequency.linearRampToValueAtTime(350, t + d);
      const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.12); g.gain.setValueAtTime(0.09, t + d - 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      for (const k of [1, 1.006]) {
        const o = AC.createOscillator(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(150 * pitch * k, t); o.frequency.linearRampToValueAtTime(175 * pitch * k, t + 0.2); o.frequency.exponentialRampToValueAtTime(110 * pitch * k, t + d);
        o.connect(f); o.start(t); o.stop(t + d + 0.05);
      }
      f.connect(g).connect(AC.destination);
    } catch (_) {}
  }
  const sfx = {
    jump: () => tone(300, 0.16, 'square', 0.035, 600),
    coin: () => { tone(880, 0.07); tone(1175, 0.2, 'square', 0.04, 0, 0.07); },
    stomp: () => tone(240, 0.12, 'square', 0.05, 80),
    bump: () => tone(130, 0.08, 'triangle', 0.08),
    die: () => { [440, 415, 392, 349, 330, 294].forEach((f, i) => tone(f, 0.15, 'square', 0.05, 0, i * 0.14)); },
    // a fanfarra de vitória começa certa e desafina no meio
    bitter: () => { [523, 659, 784, 1047, 980, 870, 700].forEach((f, i) => tone(f, i < 4 ? 0.16 : 0.24, i < 4 ? 'square' : 'sawtooth', 0.04, i >= 4 ? f * 0.85 : 0, i * 0.12)); },
    pick: () => { tone(660, 0.08); tone(880, 0.08, 'square', 0.04, 0, 0.08); tone(1175, 0.16, 'square', 0.04, 0, 0.16); },
    hit: () => { tone(180, 0.1, 'square', 0.06, 60); tone(900, 0.12, 'square', 0.04, 300, 0.05); },
    hurt: () => tone(200, 0.25, 'sawtooth', 0.04, 80),
    stamp: () => { tone(140, 0.1, 'triangle', 0.09, 50); tone(90, 0.12, 'square', 0.03, 0, 0.03); },
    bell: () => { tone(1568, 0.3, 'triangle', 0.05); tone(1568, 0.3, 'triangle', 0.05, 0, 0.35); },
    beep: () => tone(2350, 0.08, 'square', 0.03),
    sel: () => tone(600, 0.06, 'square', 0.03),
    boss: () => { [196, 185, 175, 165].forEach((f, i) => tone(f, 0.25, 'sawtooth', 0.05, 0, i * 0.2)); },
    shot: () => tone(110, 0.18, 'sawtooth', 0.06, 50)
  };

  // ---------------- Estado ----------------
  let S = 'title';
  let T = 0;
  let lives = 13;
  let mapIdx = 0;
  let lv: LevelData2 | null = null;
  let st: any = null;
  let P: any = null;
  let B: any = null; // chefão
  let bossCk: { i: number; x: number; y: number } | null = null; // checkpoint no chefão (vale até perder todas as vidas)
  let camX = 0, camY = 0;
  let parts: any[] = [];
  let dieT = 0, pitFall = false, wonT = 0;
  let dq: any = null;
  let under = 'map';
  let titleCam = 0;
  let toastT = 0;
  let hudCache = '';
  let cut: { id: string; t: number; done: () => void } | null = null;
  let finalHero = 'jessica';
  let pickIdx = 0;
  let seenPrologue = false;

  const NL = LEVELS2.length;
  const ALL_DONE = (1 << NL) - 1;
  let doneMask = 0;
  try { doneMask = (parseInt(localStorage.getItem('sfw2-done') || '0', 10) || 0) & ALL_DONE; } catch (_) {}
  const isDone = (i: number) => !!(doneMask & (1 << i));
  const doneCount = () => { let n = 0; for (let i = 0; i < NL; i++) if (isDone(i)) n++; return n; };
  { let first = 0; while (first < NL - 1 && isDone(first)) first++; mapIdx = first; }
  const saveProgress = () => { try { localStorage.setItem('sfw2-done', String(doneMask)); } catch (_) {} };

  // ---------------- Controles ----------------
  const K: Record<string, boolean> = {};
  const pressed: Record<string, boolean> = {};
  const KEYMAP: Record<string, string> = {
    ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D',
    KeyZ: 'J', KeyX: 'B', Enter: 'S', NumpadEnter: 'S', Escape: 'P', KeyM: 'M'
  };
  const isTouch = () => document.documentElement.classList.contains('touch-on');
  const keyB = () => isTouch() ? 'B' : 'X';
  const keyJ = () => isTouch() ? 'A' : 'Z';
  const keyBack = () => isTouch() ? 'II' : 'Esc';
  const confirmHit = () => pressed.J || pressed.S;

  function setBtn(b: string, on: boolean, el?: Element | null) {
    if (on && !K[b]) {
      pressed[b] = true;
      if (el) {
        tone(b === 'J' ? 880 : b === 'B' ? 660 : 520, 0.03, 'square', 0.014);
        try { navigator.vibrate?.(8); } catch (_) {}
      }
    }
    K[b] = on;
    if (el) el.classList.toggle('on', on);
  }
  const dpad = $('dpad');
  const dirEl: Record<string, HTMLElement | null> = {
    L: dpad?.querySelector('.l') as HTMLElement,
    R: dpad?.querySelector('.r') as HTMLElement
  };
  let dpadId: number | null = null;
  function dpadAt(e: PointerEvent) {
    if (!dpad) return;
    const r = dpad.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dz = r.width * 0.04;
    const s: Record<string, boolean> = { L: dx < -dz, R: dx > dz };
    for (const b in s) setBtn(b, s[b], dirEl[b]);
  }
  function enableTouch() {
    if (isTouch()) return;
    document.documentElement.classList.add('touch-on');
    const p1 = $('pressTxt'), p3 = $('pauseTxt');
    if (p1) p1.textContent = 'Aperte A para começar';
    if (p3) p3.textContent = 'A continua · B volta ao mapa';
    checkRotate();
  }
  const FULLQ = window.matchMedia('(pointer:coarse), (hover:none), (orientation:landscape) and (max-height:600px)');
  function layout() {
    const de = document.documentElement, stg = $('stage');
    if (!stg) return;
    const full = FULLQ.matches || isTouch();
    de.classList.toggle('full', full);
    let vw = VW_MIN;
    if (full) {
      const W = window.innerWidth, H = window.innerHeight;
      vw = Math.max(VW_MIN, Math.min(VW_MAX, Math.floor(VH * W / H)));
      const sh = Math.min(H, W * VH / vw), sw = sh * vw / VH;
      stg.style.width = sw + 'px';
      stg.style.height = sh + 'px';
      stg.style.setProperty('--u', (sh * 1.75 / 100) + 'px');
    } else {
      stg.style.width = '';
      stg.style.height = '';
      stg.style.removeProperty('--u');
    }
    if (vw !== VW || cv.width !== vw) {
      setVW(vw);
      cv.width = vw;
      cv.height = VH;
      ctx.imageSmoothingEnabled = false;
    }
  }
  function goFull() {
    const d = document.documentElement as any, doc = document as any;
    if (!d.classList.contains('full') || doc.fullscreenElement || doc.webkitFullscreenElement) return;
    if (!(doc.fullscreenEnabled || doc.webkitFullscreenEnabled)) return;
    const rq = d.requestFullscreen || d.webkitRequestFullscreen;
    if (!rq) return;
    try {
      const pr = rq.call(d, { navigationUI: 'hide' });
      if (pr && pr.then) pr.then(() => { try { (screen.orientation as any)?.lock?.('landscape')?.catch?.(() => {}); } catch (_) {} }).catch(() => {});
    } catch (_) {}
  }
  function checkRotate() {
    layout();
    const need = window.innerHeight > window.innerWidth && (isTouch() || window.innerWidth <= 900);
    const rot = $('rotate');
    if (rot) rot.hidden = !need;
    if (need && S === 'play') setS('pause');
  }
  function toast(t: string) {
    const el = $('toast');
    if (!el) return;
    el.textContent = t;
    el.hidden = false;
    toastT = 120;
  }
  function esc(t: any) {
    return String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] || c));
  }
  const keyTxt = (s: string) => s.replace(/\bX\b/g, keyB()).replace(/\bZ\b/g, keyJ());

  // ---------------- Telas (DOM) ----------------
  // na fase final (e na urna) a Jéssica veste amarelo
  const skin = (id: string) => (id === 'jessica' ? 'jessica7' : id);
  const heroId = () => (lv?.D?.hero === 'pick' ? finalHero : lv?.D?.hero || 'jessica');
  const heroName = () => HEROES[heroId()].name;

  function mapBar() {
    const D = LEVELS2[mapIdx];
    const t1 = $('mT1'), t2 = $('mT2'), t3 = $('mT3');
    if (t1) t1.textContent = `Fase ${D.n} · ${D.area}` + (isDone(mapIdx) ? ' · concluída' : '');
    if (t2) t2.textContent = D.name;
    if (t3) t3.innerHTML = `Aperte ${keyJ()} para entrar na fase<br>◀ ▶ para andar · Vidas ${lives}`;
  }
  function ui() {
    $('title').hidden = S !== 'title';
    $('select').hidden = S !== 'pick';
    $('mapbar').hidden = !(S === 'map' || (S === 'dialog' && under === 'map'));
    $('hud').hidden = !(lv && ['play', 'dialog', 'dying', 'won', 'pause', 'card'].includes(S) && under === 'play');
    $('dlg').hidden = S !== 'dialog';
    $('card').hidden = S !== 'card';
    $('pause').hidden = S !== 'pause';
    $('urna').hidden = S !== 'urna' && S !== 'credits';
    $('credits').hidden = S !== 'credits';
    const sk = $('skipCut');
    if (sk) sk.hidden = S !== 'cut';
    document.documentElement.classList.toggle('in-cut', S === 'cut'); // no celular, o botão de pausa some para não cobrir o Pular
    document.documentElement.classList.toggle('txt-open', ['dialog', 'card', 'urna', 'credits'].includes(S));
    if (S === 'map') mapBar();
    if (S === 'pick') renderPick();
  }
  function setS(s: string) { S = s; ui(); }

  function renderDlg(fresh = false) {
    if (!dq) return;
    const p = dq.pages[dq.i];
    const full = p.body || '';
    const shown = full.slice(0, Math.floor(dq.n));
    const doneTyping = dq.n >= full.length;
    const tagCls = p.tag === 'O que pode acontecer' ? 'tag fact' : (p.tag === 'Vitória amarga' || /^Final/.test(p.tag || '')) ? 'tag end' : 'tag';
    let h = p.tag ? `<div class="${tagCls}">${esc(p.tag)}</div>` : '';
    if (p.title) h += `<h2>${esc(p.title)}</h2>`;
    h += `<p>${esc(shown)}${doneTyping ? '' : '<span style="opacity:.4">▌</span>'}</p>`;
    if (doneTyping) {
      if (p.stats) h += `<dl class="stats">${p.stats.map(([k, v]: [string, string]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
      if (p.note) h += `<p class="note">${esc(p.note)}</p>`;
      if (p.src && p.src.length) {
        h += `<div class="src">Fontes: ${p.src.map((k: string) => `<a href="${SRC2[k][1]}" target="_blank" rel="noopener noreferrer">${esc(SRC2[k][0])} ↗</a>`).join(' · ')}</div>`;
      }
      h += `<div class="next" id="dlgNext"></div>`;
    }
    const dlgEl = $('dlg');
    if (dlgEl) {
      dlgEl.innerHTML = h;
      if (fresh) dlgEl.scrollTop = 0;
      else if (!doneTyping) dlgEl.scrollTop = dlgEl.scrollHeight;
      updNext();
    }
  }
  function dlgHidden() {
    const el = $('dlg');
    return el ? el.scrollHeight - el.clientHeight - el.scrollTop : 0;
  }
  function updNext() {
    const n = document.getElementById('dlgNext');
    if (!n || !dq) return;
    const more = dlgHidden() > 8;
    n.classList.toggle('more', more);
    n.textContent = more ? `Aperte ${keyJ()} para rolar ▼` : `Aperte ${keyJ()} para continuar ▶`;
  }
  function dialog(pages: any[], done: () => void, u?: string) {
    under = u || under;
    dq = { pages, i: 0, done, n: 0 };
    renderDlg(true);
    setS('dialog');
  }
  function updDialog() {
    if (!dq) return;
    const p = dq.pages[dq.i];
    const len = (p.body || '').length;
    if (dq.n < len) {
      dq.n = Math.min(len, dq.n + 1.6);
      if (confirmHit()) dq.n = len;
      renderDlg();
      if (dq.n < len && T % 3 === 0) tone(1400, 0.02, 'square', 0.012);
      return;
    }
    if (confirmHit()) {
      sfx.sel();
      const el = $('dlg');
      if (el && dlgHidden() > 8) { el.scrollBy({ top: el.clientHeight * 0.75, behavior: 'smooth' }); return; }
      if (dq.i < dq.pages.length - 1) { dq.i++; dq.n = 0; renderDlg(true); }
      else { const d = dq.done; dq = null; if (d) d(); }
    }
  }

  function showCard(final: boolean) {
    if (!lv || !lv.D) return;
    const D = lv.D;
    const msg = st.deathMsg || { head: D.deathHead, sub: D.deathSub };
    const roll = $('roll');
    if (roll) {
      roll.innerHTML = final
        ? `<div class="go-kick">${esc(heroName())} × 0</div><div class="go-big">Game over</div><div class="go-head">O Brasil não desiste</div><div class="go-sub">Quem vive aqui já está acostumado a recomeçar. Mais 13 vidas.</div><div class="go-lives">${esc(heroName())} × 13</div><div class="go-hint">Aperte ${keyJ()} para ${bossCk && lv.i === bossCk.i ? 'voltar ao chefão' : 'recomeçar a fase do início'}</div>`
        : `<div class="go-kick">Fase ${D.n} · ${esc(D.name)}</div><div class="go-big">Game over</div><div class="go-head">${esc(msg.head)}</div><div class="go-sub">${esc(msg.sub)}</div><div class="go-lives">${esc(heroName())} × ${lives}</div><div class="go-hint">${keyJ()} ${bossCk && lv.i === bossCk.i ? 'volta no chefão' : 'tenta de novo'} · ${keyBack()} volta ao mapa</div>`;
      roll.style.animation = 'none';
      void roll.offsetWidth;
      roll.style.animation = '';
    }
    st.final = final;
    setS('card');
  }

  // Seleção do personagem na fase final
  function renderPick() {
    const el = $('pickRow');
    if (!el) return;
    el.innerHTML = '';
    HERO_IDS.forEach((id, i) => {
      const c = document.createElement('canvas');
      c.width = 14; c.height = 20;
      c.getContext('2d')!.drawImage(HF[skin(id)].stand[0], 0, 0);
      const d = document.createElement('div');
      d.className = 'pk' + (i === pickIdx ? ' on' : '');
      d.appendChild(c);
      const nm = document.createElement('span');
      nm.textContent = HEROES[id].name;
      d.appendChild(nm);
      el.appendChild(d);
    });
    const q = $('pickQuip');
    if (q) q.textContent = ['Jéssica corre com ' + keyB() + '.', 'Dona Neide corre com ' + keyB() + '.', 'Dona Cida corre com ' + keyB() + '.', 'Raimundo corre com ' + keyB() + '.', 'Kauã corre com ' + keyB() + '.', 'Seu Arlindo tem pulo duplo com a bengala.'][pickIdx];
  }

  // ---------------- Física ----------------
  const SOLID = new Set(['#', 'B', 'X', 'V']);
  const ROWS = () => (lv ? lv.rows : 12);
  const FLOOR = () => (ROWS() - 2) * TS;
  function tileAt(tx: number, ty: number) {
    if (!lv) return '#';
    if (tx < 0 || tx >= lv.w) return '#';
    if (ty < 0) return ' ';
    if (ty >= lv.rows) return ' ';
    if (st && st.voidY !== undefined && ty * TS >= st.voidY) return ' ';
    const c = lv.g[ty][tx];
    if (c === '=' && st && st.cut && st.cut[tx + ',' + ty] > 0) return ' ';
    return c;
  }
  function solidFor(c: string, down: boolean, prevBottom?: number, ty?: number) {
    if (c === '-' || c === '=' || c === '^') return down && (prevBottom ?? 0) <= (ty ?? 0) * TS + 0.01;
    return SOLID.has(c);
  }
  function moveBody(b: any, dx: number, dy: number) {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 6));
    if (n === 1) return moveStep(b, dx, dy);
    const r: any = {};
    let sx = dx / n, sy = dy / n;
    for (let i = 0; i < n; i++) {
      const q = moveStep(b, sx, sy);
      if (q.wall) { r.wall = q.wall; sx = 0; }
      if (q.land) { r.land = true; sy = 0; }
      if (q.head) { r.head = q.head; sy = 0; }
      if (!sx && !sy) break;
    }
    return r;
  }
  function moveStep(b: any, dx: number, dy: number) {
    const r: any = {};
    if (dx) {
      b.x += dx;
      const y0 = Math.floor(b.y / TS), y1 = Math.floor((b.y + b.h - 0.01) / TS);
      if (dx > 0) {
        const tx = Math.floor((b.x + b.w - 0.01) / TS);
        for (let ty = y0; ty <= y1; ty++) if (solidFor(tileAt(tx, ty), false)) { b.x = tx * TS - b.w; r.wall = 1; break; }
      } else {
        const tx = Math.floor(b.x / TS);
        for (let ty = y0; ty <= y1; ty++) if (solidFor(tileAt(tx, ty), false)) { b.x = (tx + 1) * TS; r.wall = -1; break; }
      }
    }
    const prevBottom = b.y + b.h;
    b.y += dy;
    const x0 = Math.floor(b.x / TS), x1 = Math.floor((b.x + b.w - 0.01) / TS);
    if (dy > 0) {
      const ty = Math.floor((b.y + b.h - 0.01) / TS);
      for (let tx = x0; tx <= x1; tx++) if (solidFor(tileAt(tx, ty), true, prevBottom, ty)) { b.y = ty * TS - b.h; r.land = true; break; }
    } else if (dy < 0) {
      const ty = Math.floor(b.y / TS), cx = Math.floor((b.x + b.w / 2) / TS);
      for (const tx of [cx, x0, x1]) {
        const c = tileAt(tx, ty);
        if (c !== '-' && c !== '=' && c !== '^' && solidFor(c, false)) { b.y = (ty + 1) * TS; r.head = { tx, ty, c }; break; }
      }
    }
    return r;
  }
  const over = (a: any, b: any) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const near = (a: any, b: any, d: number) => a.x - d < b.x + b.w && a.x + a.w + d > b.x && a.y - d < b.y + b.h && a.y + a.h + d > b.y;
  const stompOn = (b: any) => P.vy > 0.3 && P.y + P.h >= b.y - 1 && P.y + P.h - b.y < 10 && P.x + P.w > b.x + 1 && P.x < b.x + b.w - 1;

  function getStartX(): number {
    const dp = $('dpad');
    if (dp && cv && isTouch()) {
      const dr = dp.getBoundingClientRect(), cr = cv.getBoundingClientRect();
      if (cr.width > 0 && dr.width > 0) {
        const r = (dr.right - cr.left) * (VW / cr.width);
        if (r > 0) return Math.max(32, Math.round(r + 20));
      }
    }
    return isTouch() ? 96 : 32;
  }

  function loadLevel(i: number) {
    const D = LEVELS2[i];
    lv = build2(D);
    lv.i = i; lv.id = D.id; lv.D = D; lv.th = THEMES2[D.theme];
    st = { coins: 0, pontos: 0, sal: 1621, sold: 0, caixa: 0, remedios: 41, mudas: 0, plant: 0, entregas: 0, ben: 1621, stuck: 0, spawn: 90, adh: 60, boiaT: 420, trees: 9, cut: {}, blink: {}, pastelT: 99 };
    if (D.id === 'postinho') st.voidY = (lv.rows + 3) * TS;
    const sx = getStartX();
    lv.start.x = D.id === 'postinho' ? Math.max(3 * TS, sx) : sx; // no celular, sempre à direita das setas
    lv.start.y = FLOOR() - 20;
    P = { x: lv.start.x, y: lv.start.y, w: 10, h: 20, vx: 0, vy: 0, on: false, face: 1, inv: 0, jbuf: 0, coyote: 0, anim: 0, air2: false, hide: false, slow: 0, swing: 0, carry: false };
    B = null;
    camX = 0;
    camY = Math.max(0, lv.rows * TS - VH);
    parts = [];
    hudCache = '';
  }

  function killPlayer(pit: boolean, msg?: { head: string; sub: string }) {
    if (S !== 'play' || !P) return;
    st.deathMsg = msg || null;
    pitFall = !!pit;
    P.vy = pit ? 0 : -5; P.vx = 0;
    dieT = pit ? 50 : 100;
    sfx.die();
    setS('dying');
  }

  // Trava de cada fase antes da arena do chefão
  function goalLock() {
    if (!lv || !st) return '';
    switch (lv.id) {
      case 'busao': return st.pontos < 3 ? `Bata o ponto nos 3 relógios (${st.pontos}/3)` : '';
      case 'feira': return st.sold < 20 ? `Venda 20 pastéis (${st.sold}/20)` : '';
      case 'fumaca': return st.plant < 5 ? `Plante as 5 mudas (${st.plant}/5)` : '';
      case 'territorio': return st.entregas < 5 ? `Faça as 5 entregas (${st.entregas}/5)` : '';
    }
    return '';
  }

  const canRun = () => {
    const id = lv?.id;
    if (heroId() === 'arlindo') return false;
    return id === 'busao' || id === 'postinho' || id === 'praca';
  };

  function updPlayer() {
    if (!lv || !P) return;
    const arl = heroId() === 'arlindo';
    let max = arl ? 1.05 : (K.B && canRun() ? 2.3 : 1.4);
    if (P.slow > 0) { P.slow--; max *= 0.5; }
    // esconder (fase 5): segurar X atrás de uma caixa d'água ou muro
    P.hide = false;
    if (lv.id === 'territorio' && K.B && P.on) {
      for (const e of lv.ents) if (e.k === 'cover' && over(P, { x: e.x + 2, y: e.y, w: e.w - 4, h: e.h })) { P.hide = true; break; }
    }
    if (P.hide) max = 0;
    const acc = P.on ? 0.12 : 0.085;
    if (K.L && !K.R && max > 0) { P.face = -1; if (P.vx > -max) P.vx = Math.max(-max, P.vx - acc); }
    else if (K.R && !K.L && max > 0) { P.face = 1; if (P.vx < max) P.vx = Math.min(max, P.vx + acc); }
    else { P.vx *= P.on ? 0.8 : 0.97; if (Math.abs(P.vx) < 0.05) P.vx = 0; }
    if (Math.abs(P.vx) > max) P.vx = Math.sign(P.vx) * Math.max(max, Math.abs(P.vx) - 0.08);

    if (pressed.J) P.jbuf = 7;
    if (P.jbuf > 0) P.jbuf--;
    if (P.on) { P.coyote = 6; P.air2 = false; }
    else if (P.coyote > 0) P.coyote--;
    if (P.jbuf > 0 && !P.hide) {
      if (P.coyote > 0) {
        P.vy = -(4.3 + Math.abs(P.vx) * 0.25);
        P.on = false; P.coyote = 0; P.jbuf = 0; sfx.jump();
      } else if (arl && !P.air2) {
        // pulo duplo com a bengala
        P.vy = -4.0; P.air2 = true; P.jbuf = 0; tone(520, 0.1, 'square', 0.03, 900);
        parts.push({ k: 'txt', s: 'BENGALA!', x: P.x - 8, y: P.y + 18, t: 26 });
      }
    }
    const g = (K.J && P.vy < 0) ? 0.14 : 0.34;
    P.vy = Math.min(P.vy + g, 5.5);
    const prevBottom = P.y + P.h;
    const r = moveBody(P, P.vx, P.vy);
    if (r.wall) P.vx = 0;
    P.on = !!r.land;
    if (r.land) P.vy = 0;
    if (r.head) { P.vy = Math.max(P.vy, 0.5); sfx.bump(); }
    // plataformas móveis (ônibus, van)
    for (const e of lv.ents) {
      if (!e.plat || e.gone) continue;
      if (P.vy >= 0 && prevBottom <= e.y + 3 && P.y + P.h >= e.y && P.x + P.w > e.x + 2 && P.x < e.x + e.w - 2) {
        P.y = e.y - P.h; P.vy = 0; P.on = true; P.x += e.dx || 0;
      }
    }
    // arena: paredes invisíveis; antes dela, o portão trava até cumprir a missão
    if (B && B.ax !== undefined) {
      if (P.x < B.ax + 2) { P.x = B.ax + 2; P.vx = 0; }
      if (P.x > B.ax + VW - P.w - 2) { P.x = B.ax + VW - P.w - 2; P.vx = 0; }
    } else if (lv.arenaX && !B) {
      const gx = lv.arenaX * TS - 4;
      const lock = goalLock();
      if (lock && P.x + P.w > gx) { P.x = gx - P.w; P.vx = 0; if (toastT <= 0) toast(lock); }
    }
    P.anim += Math.abs(P.vx);
    if (P.inv > 0) P.inv--;
    if (P.x < 0) P.x = 0;
    if (P.swing > 0) P.swing--;
  }

  // ---------------- Entidades ----------------
  const WALKERS = new Set(['walk']);
  function proj(o: any) { lv!.ents.push(Object.assign({ k: 'proj', w: 10, h: 8, vx: 0, vy: 0, grav: 0, life: 600, act: true, hurt: true }, o)); }

  function landWalk(e: any) {
    e.vy = Math.min((e.vy || 0) + 0.3, 5);
    const r = moveBody(e, e.vx, e.vy);
    if (r.wall) e.vx *= -1;
    if (r.land) {
      e.vy = 0;
      const ax = e.vx > 0 ? e.x + e.w + 1 : e.x - 1;
      const c = tileAt(Math.floor(ax / TS), Math.floor((e.y + e.h + 2) / TS));
      if (!SOLID.has(c) && c !== '-' && c !== '=') e.vx *= -1;
    }
  }

  function updEnts() {
    if (!lv || !P) return;
    const fl = FLOOR();
    for (const e of lv.ents) {
      if (e.gone) continue;
      if (!e.act) {
        if (e.x < camX + VW + 40 && e.x > camX - 120 && e.y < camY + VH + 60 && e.y > camY - 120) e.act = true;
        else continue;
      }
      if (e.dead) { e.vy += 0.3; e.y += e.vy; e.x += e.vx || 0; if (e.y > camY + VH + 40) e.gone = true; continue; }
      if (e.squash) { if (--e.squash <= 0) e.gone = true; continue; }
      e.dx = 0;
      switch (e.k) {
        case 'walk': landWalk(e); if (e.y > lv.rows * TS + 40) e.gone = true; break;
        case 'bus': {
          // lotado na ida e na volta; só esvazia do outro lado. Aí volta vazio e dá pra subir.
          if (e.full === undefined) { e.full = true; e.wait = 0; e.sp = Math.abs(e.vx); }
          const riding = P.on && Math.abs(P.y + P.h - e.y) < 2 && P.x + P.w > e.x + 2 && P.x < e.x + e.w - 2;
          const ox = e.x;
          if (e.wait > 0) {
            e.wait--;
            if (e.wait === 30 && e.x >= e.x1 - 1) {
              if (e.full) { e.full = false; e.plat = true; parts.push({ k: 'txt', s: 'ESVAZIOU', x: e.x + 8, y: e.y - 8, t: 50 }); }
              else if (!riding) { e.full = true; e.plat = false; parts.push({ k: 'txt', s: 'LOTOU', x: e.x + 14, y: e.y - 8, t: 50 }); }
              else e.wait = 31; // espera a passageira descer
            }
          } else {
            e.x += e.vx;
            if (e.x > e.x1) { e.x = e.x1; e.vx = -e.sp; e.wait = 70; }
            if (e.x < e.x0) { e.x = e.x0; e.vx = e.sp; e.wait = 50; }
          }
          e.plat = !e.full;
          e.dx = e.x - ox;
          if (e.full && !st.busHint && Math.abs(P.x - e.x) < 90 && P.on) { st.busHint = true; toast('Ônibus lotado! Espere ele esvaziar do outro lado'); }
          break;
        }
        case 'relogio': {
          if (e.done) break;
          const d = (e.x + 7) - (P.x + 5);
          if (Math.abs(d) < 60 && Math.abs(P.y - e.y) < 50) {
            e.vx = Math.sign(d || 1) * 1.7;
            e.run = true;
          } else { e.vx *= 0.9; e.run = false; }
          e.x = Math.max(e.xmin, Math.min(e.xmax, e.x + e.vx));
          break;
        }
        case 'cliente': landWalk(e); if (e.y > lv.rows * TS + 20 || (e.served && e.x > camX + VW + 20)) e.gone = true; break;
        case 'cobrador': {
          e.x += e.vx;
          if (e.x > e.xmax) { e.x = e.xmax; e.vx = -Math.abs(e.vx); e.wait = 50; }
          if (e.x < e.xmin) { e.x = e.xmin; e.vx = Math.abs(e.vx); e.wait = 50; }
          if (e.wait > 0) { e.wait--; e.x -= e.vx; }
          // lanterna: cone à frente
          const f = Math.sign(e.vx) || 1;
          const hx = e.x + (f > 0 ? e.w : 0), hy = e.y + 7;
          const px = P.x + P.w / 2, py = P.y + P.h / 2;
          const dx = (px - hx) * f;
          if (!P.hide && P.inv <= 0 && dx > 0 && dx < 70 && Math.abs(py - hy) < 4 + dx * 0.16) {
            killPlayer(false, { head: 'Taxa de proteção vencida.', sub: 'A lanterna da milícia te pegou.' });
            return;
          }
          if (!P.hide && P.inv <= 0 && over(P, e)) { killPlayer(false, { head: 'Taxa de proteção vencida.', sub: 'A milícia mandou lembranças.' }); return; }
          break;
        }
        case 'env': {
          const ty = P.y + 6;
          e.vy += Math.sign(ty - e.y) * 0.02; e.vy = Math.max(-0.6, Math.min(0.6, e.vy));
          e.x += e.vx; e.y += e.vy + Math.sin((T + e.ph) * 0.08) * 0.3;
          if (e.x < camX - 40) e.gone = true;
          if (P.swing > 0) {
            const hb = { x: P.face > 0 ? P.x + P.w - 2 : P.x - 24, y: P.y - 4, w: 26, h: 24 };
            if (over(hb, e)) { e.gone = true; sfx.stomp(); parts.push({ k: 'txt', s: 'NÃO AUTORIZO!', x: e.x - 16, y: e.y - 4, t: 40 }); }
          }
          break;
        }
        case 'proj': {
          e.vy += e.grav; e.x += e.vx; e.y += e.vy;
          if (e.spin !== undefined) e.spin += 0.2;
          if (e.floorStop && e.y + e.h >= fl) { e.y = fl - e.h; if (e.onFloor) e.onFloor(e); else e.gone = true; }
          if (--e.life <= 0 || e.x < camX - 60 || e.x > camX + VW + 60 || e.y > camY + VH + 40) e.gone = true;
          break;
        }
        case 'licenca': {
          if (!e.landed) {
            e.vy += 0.15; e.x += e.vx; e.y += e.vy;
            if (e.y + e.h >= fl) { e.y = fl - e.h; e.landed = true; e.vx = -e.speed; }
          } else if (!e.stamped) {
            e.x += e.vx;
            if (e.x < B.ax + 4) { e.gone = true; e.escaped = true; licEscaped(e); }
          } else if (--e.fade <= 0) e.gone = true;
          if (!e.stamped && e.landed && pressed.B && near(P, e, 10)) {
            e.stamped = true; e.fade = 50; sfx.stamp();
            parts.push({ k: 'stampTxt', s: 'NEGADO', x: e.x + 8, y: e.y - 4, t: 60, c: '#e8412c' });
            pressed.B = false;
          }
          break;
        }
      }

      if (S !== 'play' || e.gone || !over(P, e)) continue;

      // inimigos
      if (e.k === 'walk' || e.k === 'proj' || e.k === 'fogo') {
        if (e.k === 'proj' && !e.hurt) continue;
        if (!e.nostomp && e.k !== 'fogo' && (e.k === 'walk' || e.stompable) && stompOn(e)) {
          if (e.k === 'walk') { e.squash = 20; if (e.popTxt) parts.push({ k: 'txt', s: e.popTxt, x: e.x - 20, y: e.y - 4, t: 40 }); }
          else if (e.kind === 'tesoura') {
            // pisou na tesoura: ela despenca e não corta mais nada
            e.hurt = false; e.stompable = false; e.counted = true; e.vx = 0; e.vy = 0.5; e.grav = 0.3; e.fallen = true;
            parts.push({ k: 'txt', s: 'CORTE BARRADO!', x: e.x - 20, y: e.y - 4, t: 40 });
          } else if (e.kind === 'hext') {
            // pulou em cima da hora extra: ela cai e não machuca mais
            e.hurt = false; e.stompable = false; e.vx = 0; e.vy = 0.5; e.grav = 0.3; e.fallen = true;
            parts.push({ k: 'txt', s: 'HORA EXTRA RECUSADA!', x: e.x - 30, y: e.y - 4, t: 40 });
          } else { e.gone = true; parts.push({ k: 'txt', s: e.popTxt || 'POW', x: e.x - 6, y: e.y - 4, t: 30 }); }
          P.vy = K.J ? -5 : -3.2; sfx.stomp();
          continue;
        }
        if (P.inv > 0) continue;
        if (e.k === 'proj' && e.sticky) { e.gone = true; P.slow = 180; sfx.hurt(); parts.push({ k: 'txt', s: 'TAXADA!', x: P.x - 10, y: P.y - 6, t: 50 }); continue; }
        killPlayer(false, e.msg);
        return;
      }
      switch (e.k) {
        case 'coin': e.gone = true; st.coins++; sfx.coin(); break;
        case 'relogio':
          if (!e.done) {
            e.done = true; st.pontos++; sfx.pick();
            parts.push({ k: 'txt', s: `PONTO ${st.pontos}/3`, x: e.x - 10, y: e.y - 6, t: 60 });
            if (st.pontos === 3) toast('Ponto batido! Agora corra para o supermercado');
          }
          break;
        case 'cliente': {
          if (e.served || st.pastelT < 28) break; // sem pastel na mão, não vende
          const v = e.taxed ? 4 : 8;
          // Dona Neide entrega o pastel que estava erguendo; o cliente sai comendo
          const hx = P.x + (P.face > 0 ? 10 : -2), hy = P.y - 4;
          parts.push({ k: 'pastel', x: hx, y: hy, x0: hx, y0: hy, x1: e.x + 6, y1: e.y + 6, t: 14, d: 14 });
          e.served = true; e.vx = 0.7; e.taxed = false; st.pastelT = 0; st.sold++; st.caixa += v; sfx.coin();
          // com adesivo de TAXA, o pastel sai por R$ 4, em vermelho
          parts.push({ k: 'txt', s: v === 4 ? '+R$ 4 (TAXA!)' : '+R$ 8 PIX', c: v === 4 ? '#ff3b2a' : '#fff', x: e.x - 14, y: e.y - 6, t: 50 });
          if (st.sold === 20) toast('20 pastéis vendidos! Siga em frente');
          break;
        }
        case 'muda': e.gone = true; st.mudas++; sfx.coin(); parts.push({ k: 'txt', s: '+1 MUDA', x: e.x - 8, y: e.y - 4, t: 36 }); break;
        case 'clareira':
          if (!e.planted && st.mudas > 0) {
            e.planted = true; e.grow = 0; st.mudas--; st.plant++; sfx.pick();
            parts.push({ k: 'txt', s: `PLANTADA ${st.plant}/5`, x: e.x - 6, y: e.y - 26, t: 60 });
          } else if (!e.planted && toastT <= 0) toast('Pegue uma muda para plantar aqui');
          break;
        case 'porta':
          if (!e.done) { e.done = true; st.entregas++; sfx.pick(); parts.push({ k: 'txt', s: `ENTREGUE ${st.entregas}/5`, x: e.x - 12, y: e.y - 6, t: 60 }); }
          break;
        case 'env':
          e.gone = true; st.stuck = Math.min(4, st.stuck + 1); sfx.hurt();
          parts.push({ k: 'txt', s: 'DESCONTO!', x: P.x - 10, y: P.y - 6, t: 40 });
          break;
      }
    }
    if (T % 120 === 0) lv.ents = lv.ents.filter(e => !e.gone);
  }

  // Cada fase tem um "motor" próprio: o que aparece, o que conta, o que pesa
  function updLevelRules() {
    if (!lv || !P || S !== 'play') return;
    const fl = FLOOR();
    switch (lv.id) {
      case 'busao':
        if (st.pontos < 3 && T % 30 === 0) st.sal = Math.max(0, st.sal - 1);
        break;
      case 'feira': {
        if (st.pastelT < 99) st.pastelT++;
        // novos clientes chegam enquanto faltar venda
        if (!B && st.sold < 20 && --st.spawn <= 0) {
          st.spawn = 110;
          const alive = lv.ents.filter(e => e.k === 'cliente' && !e.gone && !e.served && e.x > camX - 20 && e.x < camX + VW + 60).length;
          const sx = camX + VW + 8, tx = Math.floor(sx / TS);
          if (alive < 4 && tx < lv.arenaX && tileAt(tx, ROWS() - 2) === '#') {
            lv.ents.push({ k: 'cliente', x: sx, y: fl - 22, w: 12, h: 22, vx: -0.35, vy: 0, taxed: false, act: true, ph: T % 99 });
          }
        }
        // adesivos de TAXA caem do céu e grudam nos QR codes
        if (!B && --st.adh <= 0) {
          st.adh = 55;
          const cl = lv.ents.filter(e => e.k === 'cliente' && !e.gone && !e.served && !e.taxed && e.act && e.x > camX && e.x < camX + VW);
          const tgt = cl.length ? cl[Math.floor(hr(T) * cl.length)] : null;
          const x = tgt ? tgt.x + 2 : camX + 30 + hr(T + 3) * (VW - 60);
          proj({ kind: 'adesivo', x, y: camY - 10, w: 8, h: 8, vy: 1.1, hurt: false, life: 400 });
        }
        for (const a of lv.ents) {
          if (a.gone || a.kind !== 'adesivo') continue;
          for (const c of lv.ents) if (c.k === 'cliente' && !c.gone && !c.served && !c.taxed && over(a, { x: c.x, y: c.y + 6, w: c.w, h: 10 })) { c.taxed = true; a.gone = true; tone(300, 0.08, 'square', 0.03, 150); break; }
          if (a.y > fl) a.gone = true;
        }
        if (pressed.B) {
          const c = lv.ents.find(c => c.k === 'cliente' && !c.gone && c.taxed && near(P, c, 14));
          if (c) { c.taxed = false; sfx.sel(); parts.push({ k: 'txt', s: 'SEM TAXA!', x: c.x - 10, y: c.y - 8, t: 40 }); }
          else if (toastT <= 0) toast(`${keyB()} arranca o adesivo de TAXA de um cliente perto de você`);
        }
        break;
      }
      case 'postinho': {
        // o chão desaba de baixo pra cima
        if (!B) {
          if (T > 120) st.voidY -= 0.24;
          if (P.y < st.voidY - VH * 1.4) st.voidY = Math.min(st.voidY, P.y + VH * 1.4);
          if (P.y + P.h > st.voidY) { killPlayer(true, { head: 'O piso desabou.', sub: 'Desvincularam o piso da saúde.' }); return; }
          if (--st.spawn <= 0) {
            st.spawn = 150;
            const dir = hr(T) > 0.5 ? 1 : -1;
            const y = camY + 30 + hr(T + 7) * (VH - 70);
            proj({ kind: 'tesoura', x: dir > 0 ? camX - 20 : camX + VW + 4, y, w: 18, h: 8, vx: 1.6 * dir, life: 900, stompable: true, msg: { head: 'Tesouraço!', sub: 'O corte pegou você antes do remédio.' }, passed: false });
          }
          for (const e of lv.ents) if (e.kind === 'tesoura' && !e.counted && (e.x > camX + VW || e.x < camX - 18)) { e.counted = true; st.remedios = Math.max(0, st.remedios - 1); }
        }
        break;
      }
      case 'fumaca': {
        if (B) break;
        if (--st.boiaT <= 0) { st.boiaT = 560; }
        if (st.boiaT === 130) { sfx.bell(); toast('Ouviu o sininho? Suba: lá vem a boiada!'); }
        if (st.boiaT === 1) parts.push({ k: 'boiada', x: VW + 20, t: 9999 });
        break;
      }
      case 'inss': {
        if (!B && --st.spawn <= 0) {
          st.spawn = 120;
          lv.ents.push({ k: 'env', x: camX + VW + 8, y: fl - 30 - hr(T) * 70, w: 14, h: 10, vx: -0.85, vy: 0, act: true, ph: T });
        }
        if (pressed.B) {
          P.swing = 12; tone(400, 0.06, 'square', 0.03, 200);
          if (st.stuck > 0) { st.stuck--; parts.push({ k: 'txt', s: 'NÃO AUTORIZO!', x: P.x - 16, y: P.y - 6, t: 40 }); }
        }
        if (st.stuck > 0) {
          st.ben = Math.max(0, st.ben - st.stuck * 0.45);
          if (st.ben <= 0) { killPlayer(false, { head: 'Benefício zerado.', sub: 'Os descontos comeram a aposentadoria inteira.' }); return; }
        }
        break;
      }
      case 'praca': {
        if (B) break;
        // o Banqueiro joga malas do alto e o pai atira canetas de indulto
        if (T % 110 === 0) proj({ kind: 'mala', x: camX + VW * (0.35 + hr(T) * 0.5), y: camY + 30, w: 12, h: 10, grav: 0.12, floorStop: true, msg: { head: 'Acertado pela mala.', sub: 'Era dinheiro "para o filme".' } });
        if (T % 95 === 40) proj({ kind: 'caneta', x: camX + VW - 30, y: fl - 12, w: 14, h: 4, vx: -2.2, msg: { head: 'Indultado.', sub: 'A caneta do indulto passou por cima de você.' }, stompable: true, popTxt: 'VETADA' });
        break;
      }
    }
  }

  // ---------------- Chefões ----------------
  // Todo chefão: ataca num ritmo fixo, depois fica parado e piscando por até 6 s.
  // Se o jogador acerta nesse intervalo, ele volta à ativa. Três acertos vencem.
  const VULN = 360;
  const BOSS_NAME: Record<string, string> = {
    relogio: 'O Relógio do Patrão', taxador: 'O Taxador do Pix', tesourao: 'O Tesourão',
    licenciador: 'O Licenciador', capitao: 'O Capitão', calculadora: 'A Calculadora Desvinculadora', flavio: 'Flávio'
  };
  const BOSS_HINT: Record<string, string> = {
    relogio: 'Desvie das HORAS EXTRAS. Quando o ponto aparecer no meio, pule nele.',
    taxador: 'Desvie dos adesivos. Quando ele mostrar PROCESSANDO, pule na cabeça dele.',
    tesourao: 'Saia das plataformas que piscam. Quando a tesoura emperrar, pule no parafuso.',
    licenciador: 'Corra até cada licença e aperte X para carimbar NEGADO.',
    capitao: 'Pule as balas. Quando ele recarregar, pule na cabeça dele.',
    calculadora: 'Desvie dos sinais de menos. Quando o fio soltar, leve a ponta até a tomada.',
    flavio: 'Desvie dos ataques. Quando ele parar pra foto, pule na cabeça dele.'
  };

  function startBoss() {
    if (!lv) return;
    const type = lv.D!.boss;
    const vertical = lv.id === 'postinho';
    B = { type, hits: 0, state: 'intro', t: 0, ax: vertical ? undefined : lv.arenaX * TS };
    if (P) bossCk = { i: lv.i!, x: P.x, y: vertical ? P.y : FLOOR() - P.h };
    if (!vertical) { camX = B.ax; }
    const ax = B.ax ?? 0, fl = FLOOR();
    switch (type) {
      case 'relogio': for (const w of lv.ents) if (w.k === 'walk' && w.x > ax - 30) w.gone = true; B.cx = ax + VW / 2; B.cy = 62; B.f = 0; B.btn = { x: ax + VW / 2 - 12, y: fl - 30, w: 24, h: 6 }; break;
      case 'taxador': B.x = ax + VW - 70; B.y = fl - 36; B.w = 30; B.h = 36; B.vx = -0.6; break;
      case 'tesourao': {
        B.groups = [];
        for (let ty = 0; ty < 12; ty++) {
          let run: number[] = [];
          for (let tx = 0; tx <= lv.w; tx++) {
            if (tx < lv.w && lv.g[ty][tx] === '=') run.push(tx);
            else if (run.length) { B.groups.push({ ty, xs: run }); run = []; }
          }
        }
        B.cx = (lv.w * TS) / 2; B.cy = 30; B.screw = { x: B.cx - 6, y: 100, w: 12, h: 12 };
        st.voidY = 12 * TS;
        // base fixa logo abaixo do Tesourão, para quem pula no parafuso
        for (let tx = 14; tx <= 19; tx++) lv.g[9][tx] = '-';
        for (let ty = 10; ty < 13; ty++) for (let tx = 0; tx < lv.w; tx++) if (lv.g[ty][tx] === '^' || lv.g[ty][tx] === '-') lv.g[ty][tx] = ' ';
        break;
      }
      case 'licenciador': B.x = ax + VW - 64; B.y = fl - 40; B.w = 40; B.h = 40; break;
      case 'capitao': {
        const van = { k: 'van', x: ax + VW - 100, y: fl - 32, w: 84, h: 32, plat: true, act: true, dx: 0 };
        lv.ents.push(van);
        B.van = van; B.x = van.x + 46; B.y = van.y - 22; B.w = 14; B.h = 22;
        break;
      }
      case 'calculadora': B.x = ax + VW - 54; B.y = fl - 60; B.w = 42; B.h = 60; B.sock = { x: ax + 6, y: fl - 34, w: 12, h: 16 }; break;
      case 'flavio': {
        B.x = ax + VW - 70; B.y = fl - 48; B.w = 30; B.h = 48; B.vx = 0;
        B.cols = [0.2, 0.42, 0.64, 0.86].map(k => ({ x: ax + VW * k - 10, s: 'up', t: 0 }));
        break;
      }
    }
    sfx.boss();
    toast(BOSS_HINT[type].replace(/\bX\b/g, keyB()));
  }

  function bossHit() {
    B.hits++; sfx.hit();
    parts.push({ k: 'flash', t: 10 });
    if (B.hits >= 3) { B.state = 'dead'; B.t = 0; clearHazards(); return; }
    B.state = 'attack'; B.t = 0; B.sub = 0;
  }
  function clearHazards() { if (lv) for (const e of lv.ents) if (e.k === 'proj' || e.k === 'licenca') e.gone = true; }
  function toVuln() { B.state = 'vuln'; B.t = VULN; }

  function licEscaped(e: any) {
    st.trees = Math.max(0, st.trees - 1);
    B.fail = true;
    sfx.hurt();
    parts.push({ k: 'stampTxt', s: 'APROVADA', x: e.x + 30, y: e.y - 6, t: 70, c: '#2ecc55' });
    parts.push({ k: 'saw', x: B.ax + 20 + hr(T) * (VW - 60), t: 200 });
  }

  function updBoss() {
    if (!lv || !P) return;
    if (!B) {
      if (lv.id === 'postinho') { if (P.on && P.y + P.h <= 9 * TS + 1) startBoss(); }
      else if (P.x > lv.arenaX * TS + 24) startBoss();
      return;
    }
    const fl = FLOOR(), ax = B.ax ?? camX;
    B.t++;
    if (B.state === 'intro') { if (B.t > 110) { B.state = 'attack'; B.t = 0; B.sub = 0; } return; }
    if (B.state === 'dead') { if (B.t > 110 && lv.id !== 'praca') bossWon(); return; }

    switch (B.type) {
      case 'relogio': {
        // o Relógio do Patrão dispara relógios de HORA EXTRA na direção da jogadora.
        // A cada ponto batido: 20% mais horas extras e 10% mais rápidas.
        const rate = Math.max(14, Math.round(66 / Math.pow(1.2, B.hits))); // 30% menos horas extras que antes
        const spd = 1.6 * Math.pow(1.1, B.hits);
        if (B.state === 'attack' && ++B.f % rate === 0) { // com o ponto na tela, o relógio para de atirar
          const sx = B.cx, sy = B.cy + 28;
          const tx = P.x + P.w / 2 + (hr(T) - 0.5) * 50, ty = P.y + P.h / 2;
          const d = Math.max(1, Math.hypot(tx - sx, ty - sy));
          proj({ kind: 'hext', x: sx - 6, y: sy - 6, w: 12, h: 12, vx: (tx - sx) / d * spd, vy: (ty - sy) / d * spd, life: 600, floorStop: true, stompable: true, msg: { head: 'Hora extra não paga!', sub: 'O relógio do patrão te pegou.' } });
          tone(880, 0.05, 'square', 0.025, 660);
        }
        if (B.state === 'attack') {
          if (B.t >= 300) {
            toVuln(); // depois de uns segundos, o ponto aparece no meio da tela
            // as horas extras que ainda estavam no ar caem sem machucar
            for (const h of lv.ents) if (h.kind === 'hext' && !h.gone && !h.fallen) { h.hurt = false; h.stompable = false; h.vx = 0; h.vy = 0.5; h.grav = 0.3; h.fallen = true; }
          }
        } else if (B.state === 'vuln') {
          if (stompOn(B.btn)) { P.vy = -4.2; bossHit(); parts.push({ k: 'txt', s: `PONTO ${B.hits}/3`, x: B.btn.x - 4, y: B.btn.y - 10, t: 50 }); }
          else if (--B.t <= 0) { B.state = 'attack'; B.t = 0; B.sub = 0; }
        }
        break;
      }
      case 'taxador': {
        const body = { x: B.x, y: B.y, w: B.w, h: B.h };
        if (B.state === 'attack') {
          B.x += B.vx;
          if (B.x < ax + 30 || B.x > ax + VW - B.w - 10) B.vx *= -1;
          if (B.t % 55 === 30 && B.sub < 3) {
            const dx = (P.x + 5) - (B.x + B.w / 2);
            proj({ kind: 'adesivoT', x: B.x + B.w / 2, y: B.y + 6, w: 10, h: 10, vx: dx / 70, vy: -3.6, grav: 0.1, sticky: true, life: 300 });
            B.sub++; sfx.beep();
          }
          if (B.sub >= 3 && B.t > 220) toVuln();
          if (over(P, body)) {
            if (stompOn(body)) { P.vy = -4; sfx.bump(); }
            else if (P.inv <= 0) { killPlayer(false, { head: 'Pix taxado!', sub: 'A maquininha passou o cartão em você.' }); return; }
          }
        } else {
          if (over(P, body) && stompOn(body)) { P.vy = -4.5; bossHit(); }
          else if (--B.t <= 0) { B.state = 'attack'; B.t = 0; B.sub = 0; }
        }
        break;
      }
      case 'tesourao': {
        if (B.state === 'attack') {
          // cada rodada: duas plataformas piscam e são cortadas
          const cyc = 170, k = B.t % cyc;
          if (k === 1) {
            B.sel = [];
            const n = Math.min(B.groups.length, 2 + (B.hits > 0 ? 1 : 0));
            const pool = B.groups.map((_: any, i: number) => i);
            for (let i = 0; i < n; i++) B.sel.push(pool.splice(Math.floor(hr(T + i * 7) * pool.length), 1)[0]);
            for (const gi of B.sel) for (const tx of B.groups[gi].xs) st.blink[tx + ',' + B.groups[gi].ty] = 70;
          }
          if (k === 70) {
            sfx.stamp(); parts.push({ k: 'flash', t: 4 });
            for (const gi of B.sel) for (const tx of B.groups[gi].xs) st.cut[tx + ',' + B.groups[gi].ty] = 90;
          }
          if (B.t >= cyc * 3) { toVuln(); }
          B.dropY = 0;
        } else {
          B.dropY = Math.min(1, (B.dropY || 0) + 0.05);
          if (B.dropY >= 1 && stompOn(B.screw)) { P.vy = -4.5; bossHit(); }
          else if (--B.t <= 0) { B.state = 'attack'; B.t = 0; }
        }
        for (const key in st.blink) if (st.blink[key] > 0) st.blink[key]--;
        for (const key in st.cut) if (st.cut[key] > 0) st.cut[key]--;
        if (P.y > 12 * TS - 4) { killPlayer(true, { head: 'O piso desabou.', sub: 'O Tesourão cortou o chão debaixo de você.' }); return; }
        break;
      }
      case 'licenciador': {
        if (B.state === 'attack') {
          const wave = B.hits + 2; // 2, 3 e 4 licenças por onda
          if (B.t === 1) { B.thrown = 0; B.fail = false; }
          if (B.t % 32 === 16 && B.thrown < wave) {
            const lx = ax + VW * (0.45 + hr(T + B.thrown) * 0.3);
            const dist = lx - (ax + 4);
            lv.ents.push({ k: 'licenca', x: B.x, y: B.y, w: 16, h: 12, vx: (lx - B.x) / 50, vy: -3.2, act: true, speed: dist / (VULN * 0.72), landed: false });
            B.thrown++; tone(700, 0.06, 'triangle', 0.03);
          }
          if (B.thrown >= wave && B.t > 32 * wave + 30) { B.state = 'vuln'; B.t = VULN + 60; }
        } else {
          const live = lv.ents.filter(e => e.k === 'licenca' && !e.gone && !e.stamped);
          if (!live.length) {
            if (!B.fail) bossHit();
            else { toast('Uma licença escapou e foi aprovada. A onda recomeça.'); B.state = 'attack'; B.t = 0; }
          }
        }
        break;
      }
      case 'capitao': {
        const head = { x: B.x, y: B.y, w: B.w, h: 10 };
        if (B.state === 'attack') {
          if (B.t % 60 === 30 && (B.sub || 0) < 3) {
            const roof = (B.sub || 0) % 2 === 1;
            proj({ kind: 'cac', x: B.x - 24, y: roof ? B.van.y - 12 : fl - 12, w: 22, h: 10, vx: -(2 + B.hits * 0.4), stompable: true, popTxt: 'TRAVADA', msg: { head: 'Bala de CAC.', sub: 'Comprada legalmente, usada como sempre.' } });
            B.sub = (B.sub || 0) + 1; sfx.shot();
          }
          if ((B.sub || 0) >= 3 && B.t > 260) toVuln();
          if (over(P, { x: B.x, y: B.y, w: B.w, h: B.h }) && P.inv <= 0) {
            if (stompOn(head)) { P.vy = -4; sfx.bump(); }
            else { killPlayer(false, { head: 'Taxa de proteção vencida.', sub: 'O Capitão te cobrou.' }); return; }
          }
        } else {
          if (stompOn(head) && over(P, { x: B.x, y: B.y - 2, w: B.w, h: 12 })) { P.vy = -4.5; bossHit(); }
          else if (--B.t <= 0) { B.state = 'attack'; B.t = 0; B.sub = 0; }
        }
        break;
      }
      case 'calculadora': {
        if (B.state === 'attack') {
          if (B.t % 50 === 25 && (B.sub || 0) < 4) {
            const hi = (B.sub || 0) % 2 === 1;
            proj({ kind: 'menos', x: B.x - 16, y: hi ? fl - 32 : fl - 10, w: 16, h: 5, vx: -(1.8 + B.hits * 0.3), msg: { head: 'Benefício desvinculado.', sub: 'Mais um sinal de menos na sua aposentadoria.' } });
            B.sub = (B.sub || 0) + 1; tone(220, 0.08, 'square', 0.04, 110);
          }
          if ((B.sub || 0) >= 4 && B.t > 250) {
            toVuln();
            B.plug = { x: ax + VW * (0.35 + hr(T) * 0.25), y: fl - 6, w: 10, h: 6 };
            P.carry = false;
          }
          if (over(P, B) && P.inv <= 0) { killPlayer(false, { head: 'Benefício desvinculado.', sub: 'A calculadora te desligou.' }); return; }
        } else {
          if (!P.carry && over(P, B.plug)) { P.carry = true; sfx.pick(); }
          if (P.carry) { B.plug.x = P.x + (P.face > 0 ? P.w : -10); B.plug.y = P.y + 8; }
          if (P.carry && over(P, B.sock)) { P.carry = false; B.plug = null; bossHit(); parts.push({ k: 'txt', s: 'RELIGADO!', x: P.x - 6, y: P.y - 8, t: 50 }); }
          else if (--B.t <= 0) { B.state = 'attack'; B.t = 0; B.sub = 0; P.carry = false; B.plug = null; }
        }
        break;
      }
      case 'flavio': {
        const body = { x: B.x, y: B.y, w: B.w, h: B.h };
        if (B.state === 'attack') {
          if (B.hits === 0) {
            if (B.t % 45 === 20 && (B.sub || 0) < 5) {
              const dx = (P.x + 5) - (B.x + 10);
              proj({ kind: 'caneta', x: B.x, y: B.y + 10, w: 14, h: 4, vx: dx / 60, vy: -3.4, grav: 0.11, msg: { head: 'Indultado.', sub: '"Vou dar indulto para todo mundo."' } });
              B.sub = (B.sub || 0) + 1; tone(800, 0.06, 'square', 0.03, 400);
            }
            if ((B.sub || 0) >= 5 && B.t > 280) toVuln();
          } else if (B.hits === 1) {
            // as colunas do STF caem uma a uma; a que vai cair treme antes
            const i = Math.floor(B.t / 80);
            if (i < B.cols.length) {
              const c = B.cols[i], k = B.t % 80;
              c.s = k < 45 ? 'shake' : k < 60 ? 'fall' : 'down';
              if (c.s !== 'shake' && P.inv <= 0 && over(P, { x: c.x - 2, y: k < 60 ? fl - 60 + (k - 45) * 4 : fl - 16, w: 24, h: 60 })) { killPlayer(false, { head: 'Esmagado pelo impeachment.', sub: 'A coluna do STF caiu em cima de você.' }); return; }
            } else { for (const c of B.cols) c.s = 'gone'; toVuln(); }
          } else {
            if (B.t % 26 === 5 && B.t < 300) proj({ kind: 'pagina', x: ax + 20 + hr(T) * (VW - 40), y: camY - 10, w: 10, h: 8, vy: 1.6, msg: { head: 'Constituição queimada.', sub: 'Uma página em chamas caiu em você.' } });
            if (B.t % 90 === 10) {
              const ps: [number, number][] = [];
              for (let tx = Math.floor(ax / TS); tx < Math.floor((ax + VW) / TS); tx++) for (let ty = 0; ty < 10; ty++) if (lv.g[ty][tx] === '-') ps.push([tx, ty]);
              if (ps.length) { const [tx, ty] = ps[Math.floor(hr(T) * ps.length)]; for (let d = -3; d <= 3; d++) if (lv.g[ty][tx + d] === '-') lv.g[ty][tx + d] = '~'; B.burnT = 100; }
            }
            if (B.t > 330) toVuln();
          }
          if (over(P, body) && P.inv <= 0) {
            if (stompOn(body)) { P.vy = -4; sfx.bump(); }
            else { killPlayer(false, { head: 'Constituição queimada.', sub: 'Flávio passou por cima de você.' }); return; }
          }
        } else {
          for (const c of B.cols) if (c.s === 'down') c.s = 'gone';
          if (over(P, body) && stompOn(body)) { P.vy = -4.5; bossHit(); }
          else if (--B.t <= 0) { B.state = 'attack'; B.t = 0; B.sub = 0; }
        }
        if (B.burnT && --B.burnT <= 0) for (let ty = 0; ty < 12; ty++) for (let tx = 0; tx < lv.w; tx++) if (lv.g[ty][tx] === '~') lv.g[ty][tx] = '-';
        break;
      }
    }
  }

  // Na fase final, depois de derrotar o Flávio, a urna aparece: encostar nela é o golpe final
  function updUrnaEnt() {
    if (!lv || lv.id !== 'praca' || !B || B.state !== 'dead') return;
    if (!B.urna) B.urna = { x: B.ax + VW / 2 - 12, y: FLOOR() - 30, w: 24, h: 30 };
    if (B.t > 60 && over(P, B.urna)) { B.urna.used = true; bossWon(); }
  }

  // ---------------- Fim de fase ----------------
  function bossWon() {
    if (!lv || S !== 'play') return;
    clearHazards();
    wonT = 120; sfx.bitter();
    setS('won');
  }
  function finishLevel() {
    if (!lv || !lv.D) return;
    const i = lv.i!, D = lv.D;
    const tx = TX[String(D.n)];
    const extra = resultLine();
    dialog([
      { tag: 'Vitória amarga', title: D.name, body: tx.va },
      { tag: 'O que pode acontecer', title: tx.adverte || `Fase ${D.n} · ${D.area}`, body: tx.real, note: extra, src: D.src }
    ], () => {
      doneMask |= 1 << i;
      saveProgress();
      if (D.id === 'praca' || doneMask === ALL_DONE) {
        $('toast').hidden = true; toastT = 0;
        if (doneMask === ALL_DONE) { showEnding(() => { mapIdx = i; under = 'map'; setS('map'); }); return; }
      }
      let n = (i + 1) % NL;
      while (isDone(n) && n !== i) n = (n + 1) % NL;
      mapIdx = n;
      under = 'map';
      setS('map');
      const f = NL - doneCount();
      if (f > 0) toast(f === 1 ? 'Falta 1 fase para o final' : `Faltam ${f} fases para o final`);
    }, 'play');
    dq.outro = true;
  }
  function resultLine() {
    if (!lv) return '';
    switch (lv.id) {
      case 'busao': return `No jogo, o atraso tirou R$ ${fmtBR(1621 - st.sal)} do seu salário.`;
      case 'feira': return `No jogo, você vendeu 20 pastéis e fez R$ ${fmtBR(st.caixa)}. Sem as taxas, seriam R$ 160.`;
      case 'postinho': return `No jogo, sobraram ${st.remedios} dos 41 remédios grátis.`;
      case 'fumaca': return `No jogo, ${9 - st.trees} árvores foram derrubadas por licenças aprovadas no prazo.`;
      case 'inss': return `No jogo, Seu Arlindo chegou ao guichê com R$ ${fmtBR(st.ben, 2)} de benefício.`;
    }
    return '';
  }

  const PLACAR_SRC = ['ustr', 'folhapisos', 'mentiras', 'amarras', 'leis', 'medalha', 'careca', 'pec6x1'];
  function showEnding(done: () => void) {
    dialog([{
      tag: 'Final · Placar',
      title: 'Você zerou Super Flávio World II',
      body: 'O Flávio que não aparece no horário eleitoral:',
      stats: TX.placar,
      src: PLACAR_SRC
    }], () => showUrna(done), 'end');
    dq.ending = true;
  }

  // Urna: o Brasil desinvertido
  let urna: { n: number; phase: number; t: number; done: () => void } | null = null;
  let credY = 0, credEnd = false;
  function urnaHidden() { const el = $('urnaScr'); return el ? el.scrollHeight - el.clientHeight - el.scrollTop : 0; }
  function updUrnaHint() {
    const h = document.getElementById('urnaHint');
    if (!h) return;
    const more = urnaHidden() > 8;
    h.classList.toggle('more', more);
    h.textContent = more ? `Aperte ${keyJ()} para rolar ▼` : `Aperte ${keyJ()} para confirmar ▶`;
  }
  function renderUrna(fresh = false) {
    const el = $('urnaScr');
    if (!el || !urna) return;
    if (urna.phase === 1) { el.innerHTML = '<div class="u-fim">Fim</div><div class="u-votou">Votou</div>'; el.classList.add('voted'); return; }
    el.classList.remove('voted');
    const full = TX.urna.body;
    const doneTyping = urna.n >= full.length;
    let h = '<div class="u-top">Eleições 2026 · 2º turno</div>';
    h += `<h2>${esc(TX.urna.title)}</h2>`;
    h += `<p>${esc(full.slice(0, Math.floor(urna.n)))}${doneTyping ? '' : '<span style="opacity:.4">▌</span>'}</p>`;
    if (doneTyping) h += '<div class="u-hint" id="urnaHint"></div>';
    el.innerHTML = h;
    if (fresh) el.scrollTop = 0;
    else if (!doneTyping) el.scrollTop = el.scrollHeight;
    updUrnaHint();
  }
  function showUrna(done: () => void) { urna = { n: 0, phase: 0, t: 0, done }; renderUrna(true); setS('urna'); }
  function urnaBeep() { for (let i = 0; i < 5; i++) tone(1046, 0.06, 'square', 0.04, 0, i * 0.085); tone(1046, 0.7, 'square', 0.04, 0, 0.45); }
  function updUrna() {
    if (!urna) return;
    if (urna.phase === 0) {
      const len = TX.urna.body.length;
      if (urna.n < len) {
        urna.n = Math.min(len, urna.n + 1.6);
        if (confirmHit()) urna.n = len;
        renderUrna();
        if (urna.n < len && T % 3 === 0) tone(1400, 0.02, 'square', 0.012);
        return;
      }
      if (confirmHit()) {
        const el = $('urnaScr');
        if (el && urnaHidden() > 8) { sfx.sel(); el.scrollBy({ top: el.clientHeight * 0.75, behavior: 'smooth' }); return; }
        urna.phase = 1; urna.t = 0;
        const ok = $('urnaOk');
        if (ok) { ok.classList.add('on'); setTimeout(() => ok.classList.remove('on'), 260); }
        urnaBeep(); renderUrna();
      }
      return;
    }
    if (++urna.t > 110) startCredits();
  }
  function startCredits() {
    credY = 0; credEnd = false;
    const hint = $('crHint');
    if (hint) { hint.hidden = true; hint.textContent = `Aperte ${keyJ()} para voltar ao mapa`; }
    setS('credits');
    placeCredits();
  }
  function placeCredits() {
    const box = $('credits'), crawl = $('crawl');
    if (!box || !crawl) return;
    const top = box.clientHeight - credY;
    const hintH = box.clientHeight * 0.14;
    const stop = (box.clientHeight - hintH) / 2 - crawl.offsetHeight + (crawl.lastElementChild as HTMLElement)?.offsetHeight / 2;
    if (top <= stop) {
      crawl.style.transform = `translateY(${stop}px)`;
      if (!credEnd) { credEnd = true; const h = $('crHint'); if (h) h.hidden = false; }
      return;
    }
    crawl.style.transform = `translateY(${top}px)`;
  }
  function updCredits() {
    if (!urna) return;
    if (!credEnd) {
      const box = $('credits');
      credY += (box ? box.clientHeight : 360) * 0.0032 * (K.J ? 4 : 1);
      placeCredits();
    } else if (confirmHit() || pressed.P) {
      sfx.sel();
      const d = urna.done; urna = null; d();
    }
  }

  // ---------------- Desenho ----------------
  function R(x: number, y: number, w: number, h: number, c: string) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
  function circ(x: number, y: number, r: number, c: string) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  // todo texto do jogo vai para a camada HTML: nítido em qualquer tela, com tamanho mínimo legível
  // texto de cenário (fica atrás das placas e objetos): desenhado no próprio canvas
  function textC(s: string, x: number, y: number, c = '#fff', size = 6, align: CanvasTextAlign = 'left') {
    ctx.font = `${size}px "Press Start 2P", monospace`; ctx.textAlign = align; ctx.fillStyle = c; ctx.fillText(s, Math.round(x), Math.round(y)); ctx.textAlign = 'left';
  }
  function text(s: string, x: number, y: number, c = '#fff', size = 6, align: CanvasTextAlign = 'left') {
    if (s) textD(s, x, y, c, size, align as any);
  }
  function wrap(s: string, maxW: number, size: number) {
    ctx.font = `${size}px "Press Start 2P", monospace`;
    const words = s.split(' '), lines: string[] = [];
    let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur);
    return lines;
  }

  // Camada de texto nítido: frases e placas são desenhadas em HTML por cima do canvas,
  // na resolução real da tela (o canvas tem só 192 px de altura e deixava a letra borrada).
  type TItem = { s: string; x: number; y: number; c: string; size: number; align: string; rot: number; a: number; b?: number; fixed?: boolean };
  const TL: TItem[] = [];
  const tlEls: HTMLDivElement[] = [];
  function tlPos(x: number, y: number) { const m = ctx.getTransform(); return { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f, rot: Math.atan2(m.b, m.a) }; }
  function textD(s: string, x: number, y: number, c = '#fff', size = 6, align: CanvasTextAlign = 'left', fixed = false) {
    const p = tlPos(x, y);
    TL.push({ s, x: p.x, y: p.y, c, size, align, rot: p.rot, a: ctx.globalAlpha, fixed });
  }
  function bubble(s: string, x: number, y: number, maxW = 130) {
    const p = tlPos(x, y);
    TL.push({ s, x: p.x, y: p.y, c: '#120c18', size: 8, align: 'center', rot: 0, a: ctx.globalAlpha, b: maxW });
  }
  function lum(c: string) {
    const m = /^#([0-9a-f]{6})$/i.exec(c); if (!m) return 1;
    const n = parseInt(m[1], 16); return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  }
  function syncTL() {
    const layer = document.getElementById('tlayer');
    if (!layer) return;
    const k = cv.clientWidth / VW;
    for (let i = 0; i < TL.length; i++) {
      const it = TL[i];
      let el = tlEls[i];
      if (!el) { el = document.createElement('div'); layer.appendChild(el); tlEls[i] = el; }
      const key = `${it.s}|${Math.round(it.x * k)}|${Math.round(it.y * k)}|${it.c}|${it.size}|${it.align}|${it.rot.toFixed(2)}|${it.a.toFixed(2)}|${it.b || 0}|${it.fixed ? 1 : 0}|${k.toFixed(3)}`;
      if ((el as any)._k === key) continue;
      (el as any)._k = key;
      // a div é reaproveitada entre rótulo e balão: zera todo estilo antigo (sombra, largura, origem...)
      el.removeAttribute('style');
      el.style.opacity = String(it.a);
      if (it.b) {
        el.className = 'tb';
        el.textContent = it.s;
                el.style.maxWidth = Math.round(it.b * 1.25 * k) + 'px';
        el.style.fontSize = Math.max(16, Math.round(it.size * k)) + 'px';
        el.style.left = '0px'; el.style.top = '0px';
        const w = el.offsetWidth, h = el.offsetHeight;
        const W = cv.clientWidth, ax = it.x * k;
        const left = Math.max(4, Math.min(W - w - 4, ax - w / 2));
        el.style.left = left + 'px';
        el.style.top = Math.round(it.y * k - h - 10) + 'px';
        el.style.setProperty('--tail', Math.round(Math.max(10, Math.min(w - 10, ax - left))) + 'px');
      } else {
        el.className = 'tt';
        el.textContent = it.s;
        el.style.color = it.c;
        el.style.fontSize = (it.fixed ? it.size * k : Math.max(9, it.size * k)) + 'px'; // fixed: escala junto com o desenho (texto dentro de objeto)
        // texto claro ganha contorno escuro para ler sobre qualquer fundo
        el.style.textShadow = lum(it.c) > 0.45 ? '1px 1px 0 #000, -1px 1px 0 #000, 1px -1px 0 #000, -1px -1px 0 #000, 0 2px 0 #000' : 'none';
        el.style.left = Math.round(it.x * k) + 'px';
        el.style.top = Math.round(it.y * k) + 'px';
        const tx = it.align === 'center' ? '-50%' : it.align === 'right' ? '-100%' : '0';
        el.style.transform = `translate(${tx}, -100%) rotate(${it.rot}rad)`;
        el.style.transformOrigin = it.align === 'center' ? '50% 100%' : it.align === 'right' ? '100% 100%' : '0 100%';
      }
    }
    for (let i = TL.length; i < tlEls.length; i++) if (tlEls[i].style.display !== 'none') { tlEls[i].style.display = 'none'; (tlEls[i] as any)._k = ''; }
  }
  function spr(c: HTMLCanvasElement, x: number, y: number, s = 1) { ctx.drawImage(c, Math.round(x), Math.round(y), c.width * s, c.height * s); }
  const G: Gfx = {
    ctx, W: VW, H: VH, T: 0, R, circ, text: textD, bubble, spr,
    flavio: VIL.flavio, pai: VIL.pai, banq: VIL.banq,
    hero: (id, f = 'stand', flip = false) => HF[id][f][flip ? 1 : 0]
  };
  function sky(th: any) {
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  }
  function rep(cam: number, f: number, span: number, fn: (x: number, k: number) => void) {
    const off = -((cam * f) % span + span) % span;
    for (let x = off - span; x < VW + span; x += span) fn(x, Math.floor((cam * f - off + x) / span));
  }

  // Fundos do Brasil Invertido
  const BG: Record<string, (cx: number, cy: number) => void> = {
    busao(cam) {
      // o sol que nunca nasce
      circ(VW * 0.7, 150, 34, '#6a3048'); circ(VW * 0.7, 150, 28, '#7a3a54');
      rep(cam, 0.25, 240, (x, k) => {
        for (let j = 0; j < 5; j++) {
          const id = k * 5 + j, bw = 26 + Math.floor(hr(id * 9) * 14), bh = 50 + Math.floor(hr(id * 5) * 70), bx = x + j * 48;
          R(bx, VH - bh, bw, bh, '#1a1226');
          // janelas fixas no prédio; só ~10% delas acende ou apaga devagar ao longo do tempo
          let ri = 0;
          for (let wy = VH - bh + 6; wy < VH - 8; wy += 9, ri++) {
            let ci = 0;
            for (let wx = bx + 4; wx < bx + bw - 4; wx += 7, ci++) {
              const wid = id * 977 + ri * 31 + ci * 7;
              let on = hr(wid) > 0.78;
              if (hr(wid + 0.5) < 0.1) { const per = 360 + Math.floor(hr(wid + 0.25) * 720); if (Math.floor((T + hr(wid + 0.75) * per) / per) % 2) on = !on; }
              if (on) R(wx, wy, 3, 4, '#8a6a3a');
            }
          }
        }
      });
      rep(cam, 0.55, 200, (x) => { R(x + 40, 112, 3, 48, '#2a2236'); R(x + 30, 108, 24, 6, '#3a2e48'); textC('PONTO', x + 42, 113, '#c8b8e0', 4, 'center'); });
    },
    feira(cam) {
      rep(cam, 0.2, 300, (x) => { R(x + 30, 60, 260, 2, '#3a3020'); for (let i = 0; i < 26; i++) { ctx.fillStyle = i % 2 ? '#5a5048' : '#4a4038'; ctx.beginPath(); ctx.moveTo(x + 30 + i * 10, 62); ctx.lineTo(x + 40 + i * 10, 62); ctx.lineTo(x + 35 + i * 10, 70); ctx.fill(); } });
      rep(cam, 0.45, 180, (x) => {
        for (let i = 0; i < 4; i++) R(x + 20 + i * 12, 100, 12, 12, i % 2 ? '#6a4a3a' : '#7a6a5a');
        R(x + 20, 112, 48, 48, '#2a2018'); R(x + 18, 100, 52, 2, '#120c08');
      });
    },
    postinho(cam, cy) {
      const off = -(cy * 0.5) % 32;
      for (let y = off - 32; y < VH; y += 32) for (let x = -((cam * 0.5) % 32) - 32; x < VW; x += 32) { R(x + 1, y + 1, 30, 30, '#142420'); R(x + 1, y + 1, 30, 1, '#1c3028'); }
      const lamp = (T >> 2) % 9 === 0 ? 'rgba(154,216,184,.05)' : 'rgba(154,216,184,.22)';
      for (let y = off - 32; y < VH; y += 96) { for (const lx of [VW * 0.3, VW * 0.7]) { R(lx + 9, y, 1, 6, '#0a1410'); R(lx, y + 6, 20, 2, lamp); ctx.fillStyle = lamp; ctx.beginPath(); ctx.moveTo(lx, y + 8); ctx.lineTo(lx + 20, y + 8); ctx.lineTo(lx + 34, y + 40); ctx.lineTo(lx - 14, y + 40); ctx.fill(); } }
      for (let y = off - 32; y < VH; y += 160) { R(VW / 2 - 8, y + 70, 16, 5, '#7a1a1a'); R(VW / 2 - 2, y + 64, 5, 17, '#7a1a1a'); }
    },
    fumaca(cam) {
      for (let i = 0; i < 3; i++) circ(VW * (0.2 + i * 0.3), 170, 60, 'rgba(255,90,20,.08)');
      rep(cam, 0.2, 90, (x, k) => { const h = 70 + hr(k) * 40; R(x + 30, VH - h, 7, h, '#120604'); circ(x + 33, VH - h - 8, 16 + hr(k + 3) * 6, '#160806'); });
      rep(cam, 0.5, 140, (x, k) => { if (hr(k * 7) > 0.5) { R(x + 50, 132, 20, 28, '#0e0503'); R(x + 46, 128, 28, 4, '#0e0503'); } });
      const n = st ? st.trees : 9;
      if (B && lv?.id === 'fumaca') for (let i = 0; i < 9; i++) {
        const x = (B.ax - camX) + 16 + i * (VW - 120) / 9;
        if (i < n) { R(x + 4, 100, 5, 60, '#2a1608'); circ(x + 6, 94, 12, '#1a3a12'); } else { R(x, 152, 14, 8, '#2a1608'); }
      }
    },
    territorio(cam) {
      // noite na comunidade: morro de casas empilhadas, tijolo à vista, caixas d'água e varais
      circ(VW * 0.82, 30, 11, '#d8d4c0'); circ(VW * 0.82 + 4, 27, 10, '#2a2c52');
      for (let i = 0; i < 30; i++) R((hr(i) * VW * 2 - cam * 0.03 + VW * 2) % VW, hr(i + 9) * 60, 1, 1, '#8a8ab0');
      const WALL = ['#8a4a3a', '#a86a5a', '#4a6a8a', '#5a7a5a', '#a8925a', '#7a4a34', '#8a6a8a', '#6a5a4a'];
      const house = (bx: number, by: number, bw: number, bh: number, id: number, dim: number) => {
        const c = WALL[Math.floor(hr(id) * WALL.length)];
        ctx.globalAlpha = dim;
        R(bx, by, bw, bh, c);
        if (hr(id + 1) > 0.5) for (let yy = by + 3; yy < by + bh; yy += 4) R(bx, yy, bw, 1, 'rgba(0,0,0,.18)'); // tijolo à vista
        R(bx - 1, by - 2, bw + 2, 2, '#4a4450'); // laje
        if (hr(id + 2) > 0.55) { R(bx + 2, by - 7, 6, 5, '#2a6aa0'); R(bx + 1, by - 8, 8, 2, '#3a7ab0'); } // caixa d'água
        else if (hr(id + 2) > 0.3) { R(bx + 3, by - 5, 1, 3, '#5a5a5a'); R(bx + bw - 4, by - 5, 1, 3, '#5a5a5a'); } // ferro da laje
        const lit = hr(id + 3) > 0.35;
        R(bx + 3, by + 4, 4, 4, lit ? '#ffd07a' : '#1a1622');
        if (bw > 14) R(bx + bw - 7, by + 4, 4, 4, hr(id + 4) > 0.5 ? '#ffc060' : '#1a1622');
        if (bh > 14) R(bx + Math.floor(bw / 2) - 2, by + bh - 7, 4, 7, '#2a1e1a');
        ctx.globalAlpha = 1;
      };
      // morro ao fundo
      rep(cam, 0.15, 260, (x, k) => {
        ctx.fillStyle = '#1e1a34'; ctx.beginPath(); ctx.moveTo(x - 10, VH); ctx.quadraticCurveTo(x + 130, 40, x + 270, VH); ctx.fill();
        for (let r = 0; r < 6; r++) for (let j = 0; j < 9; j++) {
          const id = k * 97 + r * 13 + j, hx = x + 20 + j * 24 + (r % 2) * 10, hy = 150 - r * 16 - Math.max(0, 40 - Math.abs(hx - x - 130) * 0.4) * (r > 2 ? 1 : 0.5);
          if (Math.abs(hx - x - 130) > 120 - r * 14) continue;
          house(hx, hy, 18, 14, id, 0.42);
        }
      });
      // casas da frente
      rep(cam, 0.4, 200, (x, k) => {
        for (let j = 0; j < 5; j++) {
          const id = k * 31 + j, bw = 26 + Math.floor(hr(id) * 10), floors = 1 + Math.floor(hr(id + 5) * 3);
          const bx = x + j * 40;
          for (let f = 0; f < floors; f++) house(bx + (f % 2) * 3, 160 - (f + 1) * 20, bw - (f % 2) * 4, 20, id * 7 + f, 0.62);
        }
        // varal com roupa
        R(x + 30, 112, 50, 1, '#2a2430');
        ['#c84a4a', '#e0d060', '#4a8ac8', '#f0f0e0'].forEach((cl, i) => R(x + 36 + i * 11, 113, 6, 7, cl));
      });
      // fios
      rep(cam, 0.55, 120, (x) => { ctx.strokeStyle = '#120e1a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, 70); ctx.quadraticCurveTo(x + 60, 92, x + 120, 70); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, 78); ctx.quadraticCurveTo(x + 60, 104, x + 120, 78); ctx.stroke(); });
      // escurece só o cenário de fundo, para casas de entrega e esconderijos se destacarem
      ctx.fillStyle = 'rgba(6,6,22,.34)'; ctx.fillRect(0, 0, VW, VH);
    },
    inss(cam) {
      rep(cam, 0.35, 160, (x, k) => {
        R(x + 20, 50, 60, 70, '#4a4a3a'); R(x + 24, 54, 52, 30, '#2a2a22');
        textC('GUICHÊ ' + ((k % 9) + 1), x + 50, 73, '#e8e8c0', 5, 'center');
        R(x + 100, 40, 18, 18, '#e9e2c8'); R(x + 108, 43, 1, 7, '#120c18'); R(x + 108, 49, 6, 1, '#120c18');
      });
      rep(cam, 0.6, 26, (x, k) => { if (hr(k) > 0.35) { R(x + 8, 130, 8, 30, '#2a2a22'); circ(x + 12, 126, 4, '#2a2a22'); } });
    },
    praca(cam) {
      for (let i = 0; i < 3; i++) R(0, 40 + i * 30, VW, 1, 'rgba(255,80,60,.08)');
      rep(cam, 0.15, 420, (x) => {
        const c = '#200606';
        R(x + 190, 70, 9, 90, c); R(x + 204, 70, 9, 90, c); R(x + 100, 152, 200, 10, c);
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + 140, 152, 20, Math.PI, 0); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + 230, 152); ctx.lineTo(x + 284, 152); ctx.lineTo(x + 272, 136); ctx.lineTo(x + 242, 136); ctx.fill();
      });
      rep(cam, 0.4, 260, (x) => { for (let i = 0; i < 5; i++) R(x + 20 + i * 18, 110, 6, 50, '#2a0e0c'); R(x + 14, 104, 98, 6, '#2a0e0c'); });
    }
  };

  function drawTile(c: string, x: number, y: number, tx: number, ty: number, th: any) {
    switch (c) {
      case '#': {
        const topEdge = !['#'].includes(tileAt(tx, ty - 1));
        R(x, y, 16, 16, th.fill);
        if ((tx + ty) % 2 === 0) R(x + 4, y + 8, 2, 2, th.dot); else R(x + 10, y + 11, 2, 2, th.dot);
        if (topEdge) { R(x, y, 16, 5, th.top); R(x, y + 5, 16, 1, 'rgba(0,0,0,.35)'); }
        break;
      }
      case 'X': R(x, y, 16, 16, th.block); R(x, y, 16, 2, 'rgba(255,255,255,.12)'); R(x, y + 14, 16, 2, 'rgba(0,0,0,.35)'); break;
      case '^': case '-': R(x, y, 16, 6, th.plat); R(x, y, 16, 1, 'rgba(255,255,255,.3)'); R(x, y + 5, 16, 1, 'rgba(0,0,0,.4)'); break;
      case '~': {
        R(x, y, 16, 6, '#3a1a10');
        for (let i = 0; i < 3; i++) R(x + i * 5 + ((T >> 2) % 3), y - 3 - ((T + i * 5) % 6), 3, 4, i % 2 ? '#ffd21f' : '#e8412c');
        break;
      }
      case '=': {
        const key = tx + ',' + ty;
        if (st.cut[key] > 0) { if (st.cut[key] > 70) R(x, y + 2, 16, 2, '#cfd6e0'); break; }
        const bl = st.blink[key] > 0 && (T >> 2) % 2;
        R(x, y, 16, 6, bl ? '#e8412c' : th.plat); R(x, y, 16, 1, 'rgba(255,255,255,.3)'); R(x, y + 5, 16, 1, 'rgba(0,0,0,.4)');
        if (tx % 2) R(x + 6, y + 2, 4, 2, '#c0282d');
        break;
      }
    }
  }

  function drawSkin(e: any, x: number, y: number, o: number) {
    const f = e.vx > 0;
    switch (e.skin) {
      case 'gerente':
        R(x + 4, y, 6, 2, '#2a1a10'); R(x + 4, y + 2, 6, 4, '#d9a07a'); R(x + 5, y + 3, 1, 1, '#120c18'); R(x + 8, y + 3, 1, 1, '#120c18');
        R(x + 2, y + 6, 10, 6, '#3a3a4a'); R(x + 6, y + 6, 2, 5, '#c0282d');
        R(f ? x + 11 : x - 1, y + 5, 4, 6, '#e9dcb0'); R(f ? x + 12 : x, y + 6, 2, 1, '#555');
        R(x + 3 + o, y + 12, 3, 2, '#120c18'); R(x + 8 - o, y + 12, 3, 2, '#120c18');
        break;
      case 'maqui':
        R(x + 2, y + 1, 10, 12, '#1a1a22'); R(x + 3, y + 2, 8, 4, '#5ac8a0'); R(x + 3, y + 7, 8, 5, '#3a3a44');
        for (let i = 0; i < 3; i++) R(x + 4 + i * 2, y + 8, 1, 1, '#ddd');
        R(x + 4, y + 3, 1, 1, '#120c18'); R(x + 8, y + 3, 1, 1, '#120c18');
        R(x + 3 + o, y + 13, 2, 1, '#120c18'); R(x + 9 - o, y + 13, 2, 1, '#120c18');
        break;
      case 'serra':
        R(x, y + 5, 9, 8, '#ff7a1a'); R(x + 1, y + 6, 7, 2, '#ffa040');
        R(f ? x + 9 : x - 8, y + 7, 9, 4, '#cfd6e0');
        for (let i = 0; i < 4; i++) R((f ? x + 9 : x - 8) + i * 2 + ((T >> 1) % 2), y + 6 + (i % 2) * 5, 1, 1, '#6a6a6a');
        R(x + 2 + o, y + 13, 2, 1, '#120c18'); R(x + 6 - o, y + 13, 2, 1, '#120c18');
        break;
      case 'senha':
        R(x + 2, y, 10, 12, '#e9e2c8'); R(x + 3, y + 1, 8, 1, '#c0282d');
        text(String((e.ph % 90) + 10), x + 7, y + 9, '#120c18', 4, 'center');
        R(x + 3 + o, y + 12, 3, 2, '#120c18'); R(x + 8 - o, y + 12, 3, 2, '#120c18');
        break;
      default: R(x, y, 14, 14, '#f0f');
    }
  }

  function drawEnt(e: any) {
    const x = Math.round(e.x - camX), y = Math.round(e.y - camY);
    if (x < -120 || x > VW + 120 || y < -80 || y > VH + 80) return;
    const o = (T >> 3) % 2 ? 1 : 0;
    if (e.squash) { ctx.save(); ctx.translate(x, y + 10); ctx.scale(1, 0.3); drawSkin(e, 0, 0, 0); ctx.restore(); return; }
    switch (e.k) {
      case 'walk': drawSkin(e, x, y, o); break;
      case 'coin': {
        R(x + 1, y, 8, 10, '#e9e2c8'); R(x + 1, y, 8, 3, '#c0282d'); R(x + 4, y + 4, 2, 4, '#c0282d'); R(x + 3, y + 5, 4, 2, '#c0282d');
        break;
      }
      case 'relogio': {
        const run = e.run && !e.done;
        R(x + 3, y + 14, 2, 10, '#120c18'); R(x + 9, y + 14, 2, 10, '#120c18');
        if (run) { R(x + 1 + o * 2, y + 22, 4, 2, '#120c18'); R(x + 9 - o * 2, y + 22, 4, 2, '#120c18'); }
        else { R(x + 2, y + 22, 4, 2, '#120c18'); R(x + 8, y + 22, 4, 2, '#120c18'); }
        R(x, y, 14, 14, '#120c18'); R(x + 1, y + 1, 12, 12, e.done ? '#2ecc55' : '#c8c0a8');
        R(x + 3, y + 3, 8, 4, e.done ? '#0a4a2a' : '#3a2a3a');
        if (!e.done) { R(x + 4, y + 4, 2, 2, '#fff'); R(x + 8, y + 4, 2, 2, '#fff'); R(x + 5 + (e.vx > 0 ? 0 : -1), y + 5, 1, 1, '#120c18'); R(x + 9 + (e.vx > 0 ? 0 : -1), y + 5, 1, 1, '#120c18'); }
        else text('OK', x + 7, y + 7, '#fff', 4, 'center');
        R(x + 3, y + 9, 8, 2, '#6a6a7a');
        break;
      }
      case 'bus': {
        const full = e.full !== false;
        R(x, y, e.w, 24, '#3a2a4a'); R(x, y, e.w, 2, full ? '#5a4a6a' : '#8a7aa0');
        for (let i = 0; i < 4; i++) R(x + 4 + i * 13, y + 5, 10, 8, '#c8a050');
        if (full) {
          // gente espremida: cabeças e ombros colados no vidro
          for (let i = 0; i < 4; i++) {
            const wx = x + 4 + i * 13;
            for (let j = 0; j < 3; j++) R(wx + j * 4 - (j === 2 ? 1 : 0), y + 6 + ((i + j) % 2), 3, 3, '#120c18');
            R(wx, y + 10, 10, 3, '#120c18');
            R(wx + 1 + (i % 2) * 6, y + 5, 3, 2, '#120c18'); // mão no corrimão
          }
          // braços pra fora da porta e cabeça no teto
          R(x + e.w - 9, y + 3, 2, 3, '#120c18'); R(x + 1, y + 14, 4, 2, '#120c18');
        } else {
          for (let i = 0; i < 4; i++) R(x + 5 + i * 13, y + 11, 8, 1, '#6a4a2a'); // bancos vazios
        }
        R(x + e.w - 4, y + 16, 3, 3, '#ffd21f');
        circ(x + 12, y + 25, 4, '#0a0a0a'); circ(x + e.w - 12, y + 25, 4, '#0a0a0a');
        if (full) text('LOTADO', x + e.w / 2, y + 21, '#e8412c', 4, 'center');
        else text('LIVRE', x + e.w / 2, y + 21, '#5ad07a', 4, 'center');
        break;
      }
      case 'cliente': {
        const c = ['#5a7a9a', '#9a5a7a', '#7a9a5a', '#9a8a5a'][e.ph % 4];
        R(x + 3, y, 6, 2, '#2a1a10'); R(x + 3, y + 2, 6, 5, ['#e6b08a', '#8a5a36', '#c98b62', '#6b4024'][e.ph % 4]);
        R(x + 1, y + 7, 10, 9, c);
        R(x + 2 + o, y + 16, 3, 6, '#2a2a3a'); R(x + 7 - o, y + 16, 3, 6, '#2a2a3a');
        if (e.served) {
          const px2 = x + 9; R(px2, y + 6, 7, 4, '#e8b04a'); R(px2, y + 6, 7, 1, '#f6d27a'); R(px2 + 1, y + 9, 5, 1, '#b07a2a');
          if ((T + e.ph) % 40 < 20) text('NHAC', x + 6, y - 3, '#f6d27a', 4, 'center');
          break;
        }
        // o celular com o QR
        const qx = e.vx > 0 ? x + 9 : x - 5;
        R(qx, y + 7, 7, 9, '#120c18'); R(qx + 1, y + 8, 5, 7, '#f4f4f4'); R(qx + 2, y + 9, 3, 3, '#120c18');
        if (e.taxed) { R(qx - 6, y + 7, 18, 7, '#e8412c'); text('TAXA', qx + 3, y + 13, '#fff', 4, 'center'); }
        else if ((T + e.ph) % 50 < 25) text('PIX', x + 6, y - 3, '#32bcad', 4, 'center');
        break;
      }
      case 'muda': {
        const b = Math.round(Math.sin(T * 0.08 + e.x) * 1.5);
        R(x + 2, y + 9 + b, 6, 5, '#6a3a1a'); R(x + 4, y + 3 + b, 2, 6, '#2a8a2a'); R(x + 1, y + 2 + b, 4, 3, '#3ac04a'); R(x + 5, y + b, 4, 3, '#3ac04a');
        break;
      }
      case 'clareira': {
        R(x, y + 2, e.w, 3, '#4a2a14');
        if (!e.planted) { if ((T >> 4) % 2) { R(x + 12, y - 10, 8, 8, 'rgba(120,255,120,.25)'); R(x + 15, y - 9, 2, 4, '#8aff8a'); R(x + 13, y - 5, 6, 1, '#8aff8a'); R(x + 14, y - 4, 4, 1, '#8aff8a'); R(x + 15, y - 3, 2, 1, '#8aff8a'); } }
        else { e.grow = Math.min(1, (e.grow || 0) + 0.02); const h = 10 + e.grow * 30; R(x + 14, y + 2 - h, 4, h, '#4a2a14'); circ(x + 16, y - h, 6 + e.grow * 8, '#2a7a2a'); }
        break;
      }
      case 'fogo': {
        for (let i = 0; i < 4; i++) { const h = 6 + ((T + i * 7) % 8); R(x + i * 3, y + 14 - h, 3, h, i % 2 ? '#ffd21f' : '#e8412c'); }
        R(x - 1, y + 12, 14, 2, '#3a1a0a');
        break;
      }
      case 'cover': {
        R(x - 2, y + e.h - 1, e.w + 4, 2, 'rgba(0,0,0,.5)');
        if (e.kind === 'caixa') {
          R(x + 1, y + 5, 18, 19, '#0a0a12'); R(x + 2, y + 6, 16, 18, '#2a78c0'); R(x - 1, y + 1, 22, 6, '#0a0a12'); R(x, y + 2, 20, 4, '#4a98e0');
          R(x + 4, y + 11, 12, 1, '#1a5a98'); R(x + 4, y + 17, 12, 1, '#1a5a98'); R(x + 3, y + 7, 2, 15, 'rgba(255,255,255,.28)');
        } else {
          R(x - 1, y - 1, 22, 26, '#0a0a12');
          for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) { const bx = x + c * 10 - (r % 2) * 5; const bw = Math.min(10, x + 20 - bx) - 1; if (bw > 0 && bx >= x) R(bx, y + r * 6, bw, 5, r % 2 ? '#a85a3a' : '#b8683e'); }
          R(x, y, 20, 1, 'rgba(255,255,255,.3)');
        }
        // passou por um esconderijo: mostra o botão
        if (P && !P.hide && over(P, { x: e.x + 2, y: e.y, w: e.w - 4, h: e.h })) {
          const k = keyB(); R(x + e.w / 2 - 15, y - 14, 30, 10, '#ffd21f'); R(x + e.w / 2 - 15, y - 14, 30, 1, '#fff');
          text(k, x + e.w / 2, y - 6, '#120c18', 5, 'center');
          text('SEGURE', x + e.w / 2, y - 17, '#ffd21f', 4, 'center');
        }
        break;
      }
      case 'porta': {
        // casinha de entrega: tijolo/reboco, laje, caixa d'água, janela acesa e a porta
        const WALLS = ['#c8785a', '#d8b860', '#6aa0c8', '#9ac07a', '#c890b8'];
        const wc = WALLS[Math.floor(e.x / TS) % WALLS.length];
        const hx = x - 14, hy = y - 18, hw = e.w + 28, hh = e.h + 18;
        R(hx - 1, hy - 1, hw + 2, hh + 1, '#0a0a12'); R(hx, hy, hw, hh, wc);
        for (let yy = hy + 4; yy < hy + hh; yy += 5) R(hx, yy, hw, 1, 'rgba(0,0,0,.12)');
        R(hx - 3, hy - 4, hw + 6, 4, '#5a5260'); R(hx - 3, hy - 4, hw + 6, 1, '#8a8290'); // laje
        R(hx + hw - 14, hy - 13, 10, 9, '#2a78c0'); R(hx + hw - 15, hy - 14, 12, 2, '#4a98e0'); // caixa d'água
        R(hx + 3, hy + 6, 8, 8, '#0a0a12'); R(hx + 4, hy + 7, 6, 6, e.done ? '#ffe08a' : '#ffc860'); R(hx + 6.5, hy + 7, 1, 6, '#0a0a12'); // janela
        R(x - 1, y - 1, e.w + 2, e.h + 1, '#0a0a12');
        R(x, y, e.w, e.h, e.done ? '#2a8a4a' : '#5a3a24'); R(x + 2, y + 2, e.w - 4, e.h - 4, e.done ? '#2a7a40' : '#4a2e1c'); R(x + e.w - 5, y + 14, 2, 3, '#ffd21f');
        const lx = x + e.w / 2, ly = hy - 16;
        if (!e.done) { R(lx - 22, ly - 9, 44, 10, (T >> 4) % 2 ? '#e8412c' : '#a82a20'); text('ENTREGA', lx, ly - 1, '#fff', 5, 'center'); }
        else { R(lx - 12, ly - 9, 24, 10, '#2a8a4a'); text('OK', lx, ly - 1, '#fff', 5, 'center'); }
        break;
      }
      case 'cobrador': {
        const f = Math.sign(e.vx) || 1;
        R(x + 3, y, 7, 2, '#0a0a0a'); R(x + (f > 0 ? 8 : 0), y + 1, 5, 1, '#0a0a0a');
        R(x + 3, y + 2, 7, 5, '#8a5a36'); R(x + (f > 0 ? 7 : 4), y + 3, 1, 1, '#fff');
        R(x + 1, y + 7, 10, 7, '#1a1a1a'); R(x + 2, y + 14, 3, 6, '#2a2a3a'); R(x + 7, y + 14, 3, 6, '#2a2a3a');
        R(f > 0 ? x + 10 : x - 3, y + 6, 5, 3, '#cfcfcf');
        break;
      }
      case 'env': {
        R(x, y, 14, 10, '#e9dcb0'); R(x, y, 14, 1, '#b8a878');
        ctx.strokeStyle = '#b8a878'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 7, y + 5); ctx.lineTo(x + 14, y); ctx.stroke();
        R(x - 1, y + 4, 16, 6, '#e8412c'); text('-R$', x + 7, y + 10, '#fff', 4, 'center');
        break;
      }
      case 'van': {
        R(x, y + 4, e.w, 22, '#1e1e26'); R(x + 54, y - 0, 30, 26, '#1e1e26'); R(x + 58, y + 4, 22, 10, '#3a3a4a');
        R(x, y + 4, e.w, 2, '#3a3a44'); text('VAN', x + 20, y + 18, '#5a5a6a', 6);
        circ(x + 16, y + 28, 5, '#050505'); circ(x + e.w - 16, y + 28, 5, '#050505');
        break;
      }
      case 'licenca': {
        if (e.stamped) ctx.globalAlpha = Math.max(0, e.fade / 50);
        R(x, y, 16, 12, '#f4f0e0'); R(x, y, 16, 1, '#c8c0a8');
        R(x + 2, y + 2, 12, 1, '#555'); R(x + 2, y + 5, 9, 1, '#888'); R(x + 2, y + 8, 10, 1, '#888');
        if (!e.stamped && e.landed) { R(x + 4 + o, y + 12, 2, 2, '#120c18'); R(x + 10 - o, y + 12, 2, 2, '#120c18'); if (near(P, e, 10) && (T >> 3) % 2) text(keyB(), x + 8, y - 3, '#ffd21f', 5, 'center'); }
        ctx.globalAlpha = 1;
        break;
      }
      case 'proj': {
        switch (e.kind) {
          case 'hext': {
            // relógio de HORA EXTRA: mostrador + fita vermelha com o aviso
            circ(x + 6, y + 6, 7, '#120c18'); circ(x + 6, y + 6, 6, '#f4f0e0');
            const a = T * 0.3; ctx.strokeStyle = '#120c18'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 6, y + 6); ctx.lineTo(x + 6 + Math.sin(a) * 4, y + 6 - Math.cos(a) * 4); ctx.stroke();
            R(x - 17, y - 9, 46, 7, '#e8412c'); text('HORA EXTRA', x + 6, y - 3, '#fff', 4, 'center');
            break;
          }
          case 'adesivo': case 'adesivoT':
            R(x, y, e.w, e.h, '#e8412c'); text('$', x + e.w / 2, y + e.h - 2, '#fff', 4, 'center'); break;
          case 'tesoura':
            ctx.save(); ctx.translate(x + 9, y + 4); if (e.vx < 0) ctx.scale(-1, 1); if (e.fallen) ctx.rotate(Math.PI / 2);
            const a = e.fallen ? 0.05 : Math.sin(T * 0.4) * 0.4;
            for (const s of [-1, 1]) { ctx.save(); ctx.rotate(s * a); R(-9, -1, 14, 2, '#cfd6e0'); circ(-10, 0, 3, '#c0282d'); ctx.restore(); }
            ctx.restore(); break;
          case 'mala':
            ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x + 6, FLOOR() - camY, 7, 2, 0, 0, Math.PI * 2); ctx.fill();
            R(x, y + 2, 12, 8, '#6a4a24'); R(x + 4, y, 4, 2, '#3a2a14'); text('$', x + 6, y + 9, '#ffd21f', 4, 'center'); break;
          case 'caneta':
            R(x, y, 12, 4, '#1d2c5a'); R(x + 12, y + 1, 2, 2, '#ffd21f'); R(x + 1, y + 1, 4, 1, '#c0c8d8'); break;
          case 'cac':
            R(x + 4, y, 18, 10, '#b8862a'); R(x, y + 2, 6, 6, '#8a8a8a'); R(x + 1, y + 3, 4, 4, '#c0c0c0'); R(x + 18, y, 4, 10, '#7a5a1a');
            text('CAC', x + 12, y + 8, '#120c18', 4, 'center'); break;
          case 'menos':
            R(x, y, 16, 5, '#e8412c'); R(x + 2, y + 1, 12, 1, '#ff8a6a'); break;
          case 'pagina':
            R(x, y, 10, 8, '#e9dcb0'); for (let i = 0; i < 3; i++) R(x + i * 3 + ((T >> 2) % 2), y - 3 - (i % 2) * 2, 2, 3, i % 2 ? '#ffd21f' : '#e8412c'); break;
        }
        break;
      }
    }
  }

  function drawSign(e: any) {
    const x = Math.round(e.x - camX), y = Math.round(e.y - camY);
    if (x < -220 || x > VW + 40) return;
    // a placa é dimensionada pelo tamanho REAL do texto na tela (fonte monoespaçada, com o mínimo legível)
    const k = (cv.clientWidth || VW) / VW, eff = (s: number) => Math.max(s, 9 / k);
    const cw5 = eff(5), cw4 = eff(4);
    const maxSub = Math.max(e.a.length * cw5, 150);
    const words = String(e.s).split(' '), lines: string[] = [];
    let cur = '';
    for (const wd of words) { const t = cur ? cur + ' ' + wd : wd; if (t.length * cw4 > maxSub && cur) { lines.push(cur); cur = wd; } else cur = t; }
    if (cur) lines.push(cur);
    const w = Math.ceil(Math.max(e.a.length * cw5, ...lines.map(l => l.length * cw4)) + 12);
    const lh = Math.max(6, cw4 * 1.4), bh = 15 + lines.length * lh;
    const y0 = y - 88;
    R(x + 8, y0 + bh, 3, 88 - bh, '#2a2030'); R(x + w - 12, y0 + bh, 3, 88 - bh, '#2a2030');
    R(x, y0, w, bh, '#120c18'); R(x + 1, y0 + 1, w - 2, bh - 2, '#e9e2c8');
    textD(e.a, x + w / 2, y0 + 4 + cw5, '#c0282d', 5, 'center');
    lines.forEach((l, i) => textD(l, x + w / 2, y0 + 9 + cw5 + (i + 1) * lh - (lh - cw4) / 2, '#120c18', 4, 'center'));
  }

  function drawPlayer() {
    if (!P) return;
    if (S === 'dying' && pitFall && P.y > camY + VH) return;
    if (P.inv > 0 && (T >> 2) % 2) return;
    const sx = Math.round(P.x - camX - 2), sy = Math.round(P.y - camY);
    const fr = HF[lv?.id === 'praca' ? skin(heroId()) : heroId()];
    if (P.hide) { spr(fr.hide![P.face > 0 ? 0 : 1], sx, sy + 3); return; }
    let f: 'stand' | 'walk' | 'jump' = 'stand';
    if (S === 'dying' || !P.on) f = 'jump';
    else if (Math.abs(P.vx) > 0.2) f = (P.anim >> 3) % 2 ? 'walk' : 'stand';
    if (P.slow > 0) { ctx.globalAlpha = 0.85; }
    spr(fr[f][P.face > 0 ? 0 : 1], sx, sy);
    ctx.globalAlpha = 1;
    if (lv?.id === 'feira' && heroId() === 'neide' && !P.hide) {
      // braço erguido com o pastel; depois de vender, o próximo sobe aos poucos
      const k = Math.min(1, Math.max(0, ((st.pastelT ?? 99) - 12) / 16));
      const ax = P.face > 0 ? sx + 11 : sx + 1;
      const top = Math.round(sy + 10 - k * 9);
      R(ax, top, 2, sy + 12 - top, '#9a6440'); R(ax, top, 2, 1, '#7d4f30');
      if (k > 0) {
        const pxp = ax - 3, pyp = top - 4;
        R(pxp, pyp, 8, 4, '#e8b04a'); R(pxp + 1, pyp - 1, 6, 1, '#f6d27a'); R(pxp, pyp + 3, 8, 1, '#b07a2a');
        for (let i = 0; i < 3; i++) R(pxp + 1 + i * 3, pyp + 3, 1, 1, '#8a5a1a');
        if (k >= 1 && (T % 60) < 30) R(pxp + 3, pyp - 4, 1, 2, 'rgba(255,255,255,.5)'); // fumacinha
      }
    }
    if (P.slow > 0 && (T >> 3) % 2) { R(sx - 2, sy + 3, 18, 7, '#e8412c'); text('TAXA', sx + 7, sy + 9, '#fff', 4, 'center'); }
    if (heroId() === 'arlindo') {
      const sw = P.swing > 0 ? (12 - P.swing) / 12 : 0;
      // bengala na mão da frente; a bengalada gira para a FRENTE, até ficar na horizontal
      const ang = -P.face * (0.25 + Math.sin(sw * Math.PI) * 1.35);
      ctx.save(); ctx.translate(sx + (P.face > 0 ? 12 : 2), sy + 11); ctx.rotate(ang);
      R(-1, 0, 2, 13, '#6a4a24'); R(-1, 0, 2, 1, '#8a6a3a'); ctx.restore();
      if (P.swing > 2 && P.swing < 11) { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(sx + (P.face > 0 ? 12 : 2), sy + 11, 15, P.face > 0 ? -0.6 : Math.PI - 0.9, P.face > 0 ? 0.9 : Math.PI + 0.6); ctx.arc(sx + (P.face > 0 ? 12 : 2), sy + 11, 12, P.face > 0 ? 0.9 : Math.PI + 0.6, P.face > 0 ? -0.6 : Math.PI - 0.9, true); ctx.fill(); }
    }
    if (lv?.id === 'inss' && st.stuck > 0) for (let i = 0; i < st.stuck; i++) { R(sx - 2 + i * 4, sy + 8 + (i % 2) * 4, 8, 6, '#e9dcb0'); R(sx - 1 + i * 4, sy + 11 + (i % 2) * 4, 6, 2, '#e8412c'); }
  }

  function drawBoss() {
    if (!B || !lv) return;
    const ax = (B.ax ?? camX) - camX, fl = FLOOR() - camY;
    const blink = B.state === 'vuln' && (T >> 3) % 2;
    switch (B.type) {
      case 'relogio': {
        const cx = B.cx - camX, cy = B.cy - camY;
        circ(cx, cy, 40, '#120c18'); circ(cx, cy, 37, '#c8c0a8'); circ(cx, cy, 31, '#1e1824');
        for (let i = 0; i < 12; i++) R(cx + Math.sin(i * Math.PI / 6) * 27 - 1, cy - Math.cos(i * Math.PI / 6) * 27 - 1, 2, 2, '#c8c0a8');
        if (B.state === 'attack') B.spin = (B.spin || 0) + 0.12 + B.hits * 0.05; // ponteiros param enquanto o ponto está aberto
        const sp = B.spin || 0;
        ctx.strokeStyle = '#e8412c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(sp) * 24, cy - Math.cos(sp) * 24); ctx.stroke();
        ctx.strokeStyle = '#c8c0a8'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(sp / 12) * 16, cy - Math.cos(sp / 12) * 16); ctx.stroke();
        // cara brava de patrão
        R(cx - 9, cy + 6, 6, 2, '#120c18'); R(cx + 3, cy + 6, 6, 2, '#120c18'); R(cx - 7, cy + 9, 4, 4, '#fff'); R(cx + 3, cy + 9, 4, 4, '#fff'); R(cx - 6, cy + 10, 2, 2, '#120c18'); R(cx + 4, cy + 10, 2, 2, '#120c18');
        R(cx - 6, cy + 17, 12, 2, '#e8412c');
        // faixa com o nome
        R(cx - 46, cy + 42, 92, 12, '#e8412c'); R(cx - 46, cy + 42, 92, 2, '#ff8a6a');
        text('RELÓGIO DO PATRÃO', cx, cy + 51, '#fff', 4, 'center');
        if (B.state === 'vuln') {
          // o relógio de ponto, fixo no meio do chão
          const bx = B.btn.x - camX, by = B.btn.y - camY;
          R(bx + 2, by + 6, B.btn.w - 4, 24, '#3a3a4a'); R(bx + 5, by + 10, B.btn.w - 10, 8, '#9ab08a'); R(bx + 7, by + 12, 3, 4, '#120c18'); R(bx + 12, by + 12, 3, 4, '#120c18');
          R(bx, by, B.btn.w, B.btn.h, blink ? '#ffd21f' : '#2ecc55'); R(bx, by, B.btn.w, 2, '#fff');
          text('PONTO', bx + B.btn.w / 2, by - 4, blink ? '#ffd21f' : '#2ecc55', 5, 'center');
        }
        break;
      }
      case 'taxador': {
        const x = B.x - camX, y = B.y - camY;
        R(x, y + 6, B.w, B.h - 10, '#1a1a22'); R(x + 3, y + 9, B.w - 6, 12, blink ? '#ffd21f' : '#5ac8a0');
        text(B.state === 'vuln' ? 'PROCES-' : 'TAXA', x + B.w / 2, y + 15, '#120c18', 4, 'center');
        if (B.state === 'vuln') text('SANDO…', x + B.w / 2, y + 20, '#120c18', 4, 'center');
        for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) R(x + 6 + i * 7, y + 24 + j * 4, 5, 3, '#cfd6e0');
        // chapéu de cowboy
        R(x - 4, y + 4, B.w + 8, 3, '#7a4a20'); R(x + 6, y - 4, B.w - 12, 8, '#7a4a20'); R(x + 6, y + 1, B.w - 12, 2, '#3a2a10');
        R(x + 6 + ((T >> 3) % 2), y + B.h - 4, 5, 4, '#120c18'); R(x + B.w - 11 - ((T >> 3) % 2), y + B.h - 4, 5, 4, '#120c18');
        break;
      }
      case 'tesourao': {
        const cx = B.cx - camX, top = 14 - camY;
        const d = B.state === 'vuln' ? (B.dropY || 0) : 0;
        const py = top + 20 + d * 70;
        const op = B.state === 'attack' ? Math.abs(Math.sin(T * 0.08)) * 0.5 : 0.05;
        for (const s of [-1, 1]) {
          ctx.save(); ctx.translate(cx, py); ctx.rotate(Math.PI / 2 + s * op);
          R(0, -3, 60, 6, '#cfd6e0'); R(0, -3, 60, 1, '#fff'); circ(-10, 0, 9, '#c0282d'); circ(-10, 0, 5, '#06100c');
          ctx.restore();
        }
        text('FLÁVIO 2027', cx, py + 40, '#ffd21f', 4, 'center');
        // bancada
        // a bancada é a base fixa (linha 9) — o único piso que o Tesourão não corta
        { const bx = 14 * TS - camX, by = 9 * TS - camY; R(bx, by, 6 * TS, 8, '#5a4a2a'); R(bx, by, 6 * TS, 2, '#9a8a5a'); R(bx + 4, by + 8, 3, 12, '#3a2e1a'); R(bx + 6 * TS - 7, by + 8, 3, 12, '#3a2e1a'); }
        if (B.state === 'vuln' && d >= 1) {
          const sx = B.screw.x - camX, sy = B.screw.y - camY;
          circ(sx + 6, sy + 6, 7, blink ? '#ffd21f' : '#8a8a8a'); R(sx + 2, sy + 5, 8, 2, '#120c18');
          text('EMPERROU', cx, sy - 6, '#ffd21f', 4, 'center');
        }
        break;
      }
      case 'licenciador': {
        const x = B.x - camX, y = B.y - camY;
        R(x + 12, y + 2, 16, 14, '#e6b08a'); R(x + 12, y, 16, 4, '#2a2a2a'); R(x + 15, y + 7, 3, 2, '#120c18'); R(x + 22, y + 7, 3, 2, '#120c18');
        R(x + 15, y + 12, 10, 1, '#6a1e1e');
        R(x + 8, y + 16, 24, 10, '#3a3a4a');
        R(x - 6, y + 22, B.w + 12, 18, '#4a3622'); R(x - 6, y + 22, B.w + 12, 2, '#6a5030');
        R(x - 4, y + 24, B.w + 8, 15, '#e9e2c8');
        text('ATRASOU,', x + B.w / 2, y + 31, '#120c18', 5, 'center'); text('APROVOU', x + B.w / 2, y + 38, '#120c18', 5, 'center');
        if (B.state === 'attack' && B.t % 40 > 10 && B.t % 40 < 25) R(x + 4, y + 12, 6, 6, '#f4f0e0');
        break;
      }
      case 'capitao': {
        const x = B.x - camX, y = B.y - camY;
        R(x + 2, y, 10, 2, '#0a0a0a'); R(x + 10, y + 1, 5, 1, '#0a0a0a');
        R(x + 2, y + 2, 10, 6, '#8a5a36'); R(x + 3, y + 4, 2, 1, '#120c18'); R(x + 8, y + 4, 2, 1, '#120c18');
        R(x, y + 8, 14, 9, '#2a3a2a'); circ(x + 4, y + 11, 2, '#ffd21f');
        R(x + 2, y + 17, 4, 5, '#1a1a1a'); R(x + 8, y + 17, 4, 5, '#1a1a1a');
        R(x - 12, y + 10, 14, 4, '#3a3a3a'); R(x - 14, y + 11, 3, 2, '#2a2a2a');
        if (B.state === 'vuln') text(blink ? 'RECARREGANDO' : '', x + 7, y - 6, '#ffd21f', 4, 'center');
        break;
      }
      case 'calculadora': {
        const x = B.x - camX, y = B.y - camY;
        R(x, y, B.w, B.h, '#1e2024'); R(x + 4, y + 4, B.w - 8, 12, blink ? '#ffd21f' : '#9ab08a');
        text(B.state === 'vuln' ? 'ERRO' : '-R$', x + B.w - 7, y + 13, '#120c18', 5, 'right');
        for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) R(x + 5 + i * 12, y + 20 + j * 9, 9, 6, j === 3 && i === 2 ? '#e8412c' : '#4a4e56');
        text('EQUIPE ECONÔMICA', x + B.w / 2, y - 10, '#e9e2c8', 5, 'center'); text('DE FLÁVIO', x + B.w / 2, y - 3, '#e9e2c8', 5, 'center');
        const s = B.sock;
        R(s.x - camX, s.y - camY, s.w, s.h, '#e9e2c8'); R(s.x - camX + 3, s.y - camY + 5, 2, 5, '#120c18'); R(s.x - camX + 7, s.y - camY + 5, 2, 5, '#120c18');
        text('SALÁRIO', s.x - camX, s.y - camY - 10, '#ffd21f', 5); text('MÍNIMO', s.x - camX, s.y - camY - 3, '#ffd21f', 5);
        if (B.plug) {
          const px = B.plug.x - camX, py = B.plug.y - camY;
          ctx.strokeStyle = '#120c18'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 4, y + B.h - 8); ctx.quadraticCurveTo((x + px) / 2, fl + 2, px + 5, py + 3); ctx.stroke();
          R(px, py, 10, 6, blink ? '#ffd21f' : '#8a8a8a'); R(px + 10, py + 1, 3, 1, '#ddd'); R(px + 10, py + 4, 3, 1, '#ddd');
        }
        break;
      }
      case 'flavio': {
        const x = B.x - camX, y = B.y - camY;
        for (const c of B.cols) {
          if (c.s === 'gone' || (B.hits !== 1 && B.state !== 'dead')) continue;
          const cx2 = c.x - camX;
          if (c.s === 'up' || c.s === 'shake') { const sh = c.s === 'shake' ? ((T >> 1) % 2 ? 1 : -1) : 0; R(cx2 + sh, 40 - camY, 20, fl - 40 + camY, '#d8cfc0'); R(cx2 + sh - 3, 36 - camY, 26, 6, '#c8bfb0'); text('STF', cx2 + 10 + sh, 60 - camY, '#6a5a50', 4, 'center'); }
          else { ctx.save(); ctx.translate(cx2 + 10, fl); ctx.rotate(c.s === 'down' ? -Math.PI / 2 * 0.95 : -Math.PI / 4); R(-10, -100, 20, 100, '#d8cfc0'); ctx.restore(); }
        }
        if (B.state === 'dead') {
          ctx.save(); ctx.translate(x + 18, y + 48); ctx.rotate(Math.min(1, B.t / 40) * -Math.PI / 2); spr(VIL.flavio.stand[1], -18, -44, 2); ctx.restore();
          if (B.urna) {
            const ux = B.urna.x - camX, uy = B.urna.y - camY;
            R(ux, uy, 24, 30, '#e9e8e2'); R(ux + 2, uy + 2, 20, 10, '#2a2a2a'); R(ux + 4, uy + 4, 16, 6, '#7a9a7a');
            for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) R(ux + 4 + i * 6, uy + 14 + j * 4, 4, 3, '#1a1a1a');
            R(ux + 4, uy + 26, 16, 2, '#2ecc55');
            if ((T >> 4) % 2) text('VOTE', ux + 12, uy - 4, '#ffd21f', 5, 'center');
          }
          break;
        }
        const pose = B.state === 'vuln';
        ctx.save(); if (blink) ctx.globalAlpha = 0.7;
        spr(VIL.flavio[pose ? 'stand' : ((T >> 3) % 2 ? 'walk' : 'stand')][1], x - 3, y + 4, 2);
        ctx.restore();
        if (pose) { R(x - 30, y - 10, 10, 8, '#2a2a2a'); if ((T >> 2) % 6 === 0) circ(x - 25, y - 6, 10, 'rgba(255,255,255,.7)'); text('FOTO!', x + 15, y - 6, '#ffd21f', 5, 'center'); }
        else {
          const q = ['"Vou trabalhar pra que a anistia seja feita ainda na transição."', 'Impeachment de ministros do STF', '"Mudar a Constituição"'][Math.min(2, B.hits)];
          if (B.t < 160) bubble(q, x + 10, y - 2, 150);
        }
        break;
      }
    }
  }

  function drawParts() {
    for (const p of parts) {
      const px = Math.round(p.x - camX), py = Math.round((p.y ?? 0) - camY);
      if (p.k === 'txt') { text(p.s, px + 1, py + 1, '#000', 5); text(p.s, px, py, p.c || '#fff', 5); }
      else if (p.k === 'pastel') { R(px, py, 8, 4, '#e8b04a'); R(px + 1, py - 1, 6, 1, '#f6d27a'); }
      else if (p.k === 'stampTxt') {
        ctx.save(); ctx.globalAlpha = Math.min(1, p.t / 30); ctx.translate(px, py); ctx.rotate(-0.15);
        ctx.strokeStyle = p.c; ctx.lineWidth = 1.5; ctx.strokeRect(-24, -6, 48, 12); text(p.s, 0, 3, p.c, 6, 'center'); ctx.restore();
      } else if (p.k === 'saw') {
        const sx = p.x - camX;
        R(sx, 140, 12, 10, '#ff7a1a'); R(sx + 12, 143, 12, 4, '#cfd6e0');
        if ((T >> 2) % 2) R(sx + 14, 140, 1, 1, '#ffd21f');
      } else if (p.k === 'boiada') {
        const fl = FLOOR() - camY;
        // cinco bois em fila, bem separados, cada um com a sua cor
        const cols = ['#6a4428', '#e9e2c8', '#3a2a1e', '#8a5a34', '#d8d0b8'];
        for (let i = 0; i < 5; i++) {
          const bx = p.x + i * 44, c = cols[i], sp = i % 2 ? '#3a2414' : '#f4efe0';
          const bob = ((T >> 3) + i) % 2;
          R(bx, fl - 15 + bob, 24, 11, c); R(bx + 6, fl - 14 + bob, 6, 4, sp); R(bx + 15, fl - 10 + bob, 5, 3, sp);
          R(bx + 23, fl - 14 + bob, 3, 2, c); R(bx + 25, fl - 13 + bob, 1, 4, c); // rabo
          R(bx - 8, fl - 19 + bob, 9, 8, c); R(bx - 9, fl - 14 + bob, 4, 3, '#c89a8a'); R(bx - 6, fl - 17 + bob, 1, 1, '#120c18');
          R(bx - 6, fl - 22 + bob, 2, 3, '#e9e2c8'); R(bx - 1, fl - 22 + bob, 2, 3, '#e9e2c8');
          const o = (T >> 2) % 2 ? 1 : -1;
          R(bx + 2 + o, fl - 4, 3, 4, '#2a1a10'); R(bx + 18 - o, fl - 4, 3, 4, '#2a1a10');
        }
        textD('PASSANDO A BOIADA', p.x + 100, fl - 30, '#ffd21f', 7, 'center');
      }
    }
  }

  // Brasil Invertido: cinzas no ar e gavinhas escuras nas bordas
  function invertido(k: number) {
    for (let i = 0; i < 26; i++) {
      const x = (hr(i) * VW + T * (0.15 + hr(i + 1) * 0.3) + Math.sin(T * 0.01 + i) * 8) % VW;
      const y = (hr(i + 50) * VH - T * (0.12 + hr(i + 2) * 0.2) + VH * 10) % VH;
      R(x, y, 1, 1, i % 3 ? 'rgba(230,190,190,.4)' : 'rgba(255,120,90,.45)');
    }
    ctx.strokeStyle = 'rgba(8,2,10,.85)'; ctx.lineWidth = 2;
    for (let i = 0; i < 5 * k; i++) {
      const left = i % 2 === 0, y0 = (i * 47) % VH, sw = Math.sin(T * 0.02 + i) * 3;
      ctx.beginPath(); ctx.moveTo(left ? 0 : VW, y0);
      ctx.quadraticCurveTo(left ? 14 + sw : VW - 14 - sw, y0 + 10, left ? 6 : VW - 6, y0 + 26); ctx.stroke();
    }
    const g = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.4, VW / 2, VH / 2, VW * 0.7);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(20,0,10,.55)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  }

  function updParts() {
    for (const p of parts) {
      p.t--;
      if (p.k === 'txt') p.y -= 0.5;
      else if (p.k === 'pastel') { const u = 1 - p.t / p.d; p.x = p.x0 + (p.x1 - p.x0) * u; p.y = p.y0 + (p.y1 - p.y0) * u - Math.sin(u * Math.PI) * 14; }
      else if (p.k === 'boiada') {
        p.x -= 3.68; // 20% mais devagar, dá tempo de ler
        if (p.x < -220) p.t = 0;
        if (p.x < VW + 10 && p.x > -200 && (p.mt = (p.mt || 0) - 1) <= 0) { p.mt = 26; p.mi = ((p.mi || 0) + 1) % 5; moo([1, 0.85, 1.15, 0.92, 1.05][p.mi]); }
        if (S === 'play' && P && P.inv <= 0) {
          const fl = FLOOR(), sx = P.x - camX;
          if (P.y + P.h > fl - 16 && sx + P.w > p.x - 8 && sx < p.x + 200) { killPlayer(false, { head: 'Atropelado pela boiada.', sub: 'A boiada passou, e você estava no caminho.' }); }
        }
      } else if (p.k === 'saw') { if (p.t < 100 && p.t % 20 === 0) tone(90, 0.1, 'sawtooth', 0.02); }
    }
    parts = parts.filter(p => p.t > 0);
  }

  function camera() {
    if (!lv || !P) return;
    if (B && B.ax !== undefined) { camX += (B.ax - camX) * 0.2; if (Math.abs(B.ax - camX) < 0.5) camX = B.ax; }
    else {
      const tx = Math.max(0, Math.min(lv.w * TS - VW, P.x - VW * 0.4));
      camX += (tx - camX) * 0.18; if (Math.abs(tx - camX) < 0.3) camX = tx;
    }
    const maxY = Math.max(0, lv.rows * TS - VH);
    let ty = Math.max(0, Math.min(maxY, P.y - VH * 0.55));
    if (B && lv.id === 'postinho') ty = 0;
    camY += (ty - camY) * 0.15; if (Math.abs(ty - camY) < 0.3) camY = ty;
  }

  function renderLevel() {
    if (!lv) return;
    const th = lv.th;
    sky(th);
    BG[lv.D!.theme](camX, camY);
    for (const e of lv.ents) if (!e.gone && e.k === 'sign') drawSign(e);
    for (const e of lv.ents) if (!e.gone && e.bg && e.k !== 'sign') drawEnt(e);
    const x0 = Math.floor(camX / TS), x1 = x0 + Math.ceil(VW / TS) + 1;
    const y0 = Math.max(0, Math.floor(camY / TS)), y1 = Math.min(lv.rows - 1, y0 + Math.ceil(VH / TS) + 1);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (tx < 0 || tx >= lv.w) continue;
      const c = tileAt(tx, ty);
      if (c === ' ') continue;
      drawTile(c, Math.round(tx * TS - camX), Math.round(ty * TS - camY), tx, ty, th);
    }
    // portão antes da arena
    if (lv.arenaX && !B) {
      const gx = lv.arenaX * TS - 4 - camX, locked = !!goalLock();
      if (gx > -20 && gx < VW + 20) {
        const fl = FLOOR() - camY;
        R(gx, fl - 64, 4, 64, '#2a2030'); R(gx + 20, fl - 64, 4, 64, '#2a2030');
        if (locked) { for (let y = fl - 60; y < fl; y += 10) R(gx + 4, y, 16, 2, '#8a8a9a'); R(gx + 7, fl - 36, 10, 8, '#e8412c'); }
        else if ((T >> 4) % 2) text('▶', gx + 12, fl - 30, '#ffd21f', 6, 'center');
      }
    }
    // névoa do piso desabando (Postinho)
    if (st.voidY !== undefined && !B) {
      const vy = st.voidY - camY;
      if (vy < VH) { R(0, vy, VW, VH - vy, '#020403'); for (let x = 0; x < VW; x += 8) R(x + ((T >> 2) % 8), vy - 2 - ((x * 7 + T) % 5), 4, 3, '#0a120e'); }
    }
    for (const e of lv.ents) if (!e.gone && !e.bg) drawEnt(e);
    // fase final: o Banqueiro (no alto, jogando malas) e o pai (atirando canetas de indulto)
    if (lv.id === 'praca' && !B) {
      const bx = VW * 0.6 + Math.sin(T * 0.02) * 40;
      R(bx - 14, 34, 42, 6, '#3a1c1c'); R(bx - 14, 34, 42, 1, '#7a3a30');
      spr(VIL.banq[(T >> 5) % 2], bx, 14);
      const fl = FLOOR() - camY;
      spr(VIL.pai[1], VW - 26, fl - 20);
      R(VW - 30, fl - 8, 6, 2, '#1d2c5a');
    }
    drawBoss();
    drawPlayer();
    drawParts();
    // noite na fase 5: escuro com as lanternas acesas
    if (lv.id === 'territorio') {
      ctx.fillStyle = 'rgba(2,2,20,.08)'; ctx.fillRect(0, 0, VW, VH);
      for (const e of lv.ents) if (!e.gone && e.k === 'sign') drawSign(e);
      for (const e of lv.ents) {
        if (e.k !== 'cobrador' || e.gone) continue;
        const f = Math.sign(e.vx) || 1, hx = e.x - camX + (f > 0 ? e.w : 0), hy = e.y - camY + 7;
        ctx.fillStyle = 'rgba(255,230,140,.22)';
        ctx.beginPath(); ctx.moveTo(hx, hy - 3); ctx.lineTo(hx + f * 70, hy - 4 - 11); ctx.lineTo(hx + f * 70, hy + 4 + 11); ctx.lineTo(hx, hy + 3); ctx.fill();
      }
      if (P && !P.hide) { const sx = P.x - camX; R(sx - 1, P.y - camY + 10, 6, 7, '#e8412c'); }
    }
    for (const p of parts) if (p.k === 'flash') { ctx.fillStyle = `rgba(255,255,255,${p.t / 14})`; ctx.fillRect(0, 0, VW, VH); }
    invertido(1);
    if (B && B.state === 'intro') {
      const a = Math.min(1, B.t / 20) * Math.min(1, (110 - B.t) / 20);
      ctx.globalAlpha = Math.max(0, a);
      R(0, VH / 2 - 22, VW, 40, 'rgba(0,0,0,.75)');
      textD('CHEFÃO', VW / 2, VH / 2 - 8, '#e8412c', 6, 'center');
      textD(BOSS_NAME[B.type].toUpperCase(), VW / 2, VH / 2 + 8, '#ffd21f', 8, 'center');
      ctx.globalAlpha = 1;
    }
    if (S === 'won') {
      const t = B && B.type === 'flavio' ? 'VOCÊ VENCEU… NO JOGO' : 'VITÓRIA?';
      textD(t, VW / 2, 80, '#ffd21f', 10, 'center');
    }
  }

  // Título: o Brasil Invertido com o Flávio presidente passeando
  function renderTitleBG() {
    sky(THEMES2.praca);
    BG.praca(titleCam, 0);
    for (let tx = -1; tx < Math.ceil(VW / TS) + 2; tx++) {
      const x = Math.round(tx * TS - (titleCam % TS));
      R(x, 160, 16, 32, THEMES2.praca.fill); R(x, 160, 16, 5, THEMES2.praca.top);
    }
    spr(VIL.flavio[(T >> 3) % 2 ? 'walk' : 'stand'][0], Math.round(((titleCam * 0.9) % (VW + 60)) - 30), 140);
    invertido(1);
  }

  // Fundo claro da urna: o Brasil desinvertido
  function renderBright() {
    const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#5aa8ff'); g.addColorStop(1, '#bfe6ff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    for (let i = 0; i < 4; i++) { const cx = ((i * 120 + T * 0.2) % (VW + 60)) - 30; circ(cx, 40 + i * 6, 8, '#fff'); circ(cx + 10, 36 + i * 6, 10, '#fff'); }
    R(0, 160, VW, 32, '#8b5a2b'); R(0, 160, VW, 6, '#3ec04a');
    HERO_IDS.forEach((id, i) => spr(HF[skin(id)].stand[0], VW / 2 - 66 + i * 22, 140));
  }

  const HORIZON = 74;
  const MAPN: [number, number][] = [[34, 128], [78, 100], [118, 134], [160, 96], [204, 128], [246, 92], [292, 60]];
  const mapY = (y: number) => Math.round(96 + (y - 60) * 0.58);
  function renderMap() {
    const sk = ctx.createLinearGradient(0, 0, 0, HORIZON);
    sk.addColorStop(0, '#1a0404'); sk.addColorStop(1, '#6a1a12');
    ctx.fillStyle = sk; ctx.fillRect(0, 0, VW, HORIZON);
    const cx = VW - 82, base = HORIZON - 2, c = '#140404';
    R(cx - 8, base - 46, 6, 41, c); R(cx + 2, base - 46, 6, 41, c); R(cx - 74, base - 5, 148, 5, c);
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx - 38, base - 5, 11, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx + 20, base - 16); ctx.lineTo(cx + 56, base - 16); ctx.lineTo(cx + 46, base - 5); ctx.lineTo(cx + 30, base - 5); ctx.fill();
    R(0, HORIZON, VW, VH - HORIZON, '#141a2a');
    for (let y = HORIZON + 4; y < VH; y += 12) for (let x = ((y * 7 + T * 0.3) % 24) - 24; x < VW; x += 24) R(x, y, 8, 1, '#26304a');
    ctx.save();
    ctx.translate(Math.round((VW - 336) / 2), 0);
    ctx.fillStyle = '#0e1a10'; ctx.beginPath(); ctx.ellipse(170, 130, 160, 58, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1e3a1e'; ctx.beginPath(); ctx.ellipse(170, 126, 154, 52, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 14; i++) { const x = 40 + hr(i) * 260, y = 98 + hr(i + 20) * 56; circ(x, y, 5, '#16301a'); }
    for (let i = 0; i < MAPN.length - 1; i++) {
      const [a, b] = [MAPN[i], MAPN[i + 1]], ay = mapY(a[1]), by = mapY(b[1]);
      for (let k = 1; k < 8; k++) { const t = k / 8; R(a[0] + (b[0] - a[0]) * t - 1, ay + (by - ay) * t - 1, 3, 3, '#6a5a3a'); }
    }
    MAPN.forEach(([x, y0], i) => {
      const y = mapY(y0), done = isDone(i);
      circ(x, y + 2, 7, '#000'); circ(x, y, 7, done ? '#ffd21f' : '#8a1a12'); circ(x, y, 4, done ? '#fff2a0' : '#c0402a');
      text(String(i + 1), x - 3, y + 3, '#120c18', 6);
      if (done) { R(x + 4, y - 9, 5, 5, '#120c18'); R(x + 5, y - 8, 3, 3, '#2ecc55'); }
    });
    const D = LEVELS2[mapIdx];
    const [nx, ny0] = MAPN[mapIdx], ny = mapY(ny0);
    const hid = D.hero === 'pick' ? 'jessica7' : D.hero;
    spr(HF[hid].stand[0], nx - 7, ny - 24 + Math.round(Math.sin(T * 0.12) * 2));
    textD('SUPER FLÁVIO WORLD II', 12, 16, '#e8412c', 8);
    ctx.restore();
    invertido(1);
  }

  function hud() {
    if (!lv || !P) return;
    let sp = '';
    if (B && B.state !== 'dead') {
      const pips = '■'.repeat(3 - B.hits) + '□'.repeat(B.hits);
      sp = `${BOSS_NAME[B.type]} ${pips}`;
      if (B.state === 'vuln' && B.type !== 'licenciador') sp += ` <span class="meter"><i style="width:${(B.t / VULN) * 100}%"></i></span>`;
    } else switch (lv.id) {
      case 'busao': sp = `Ponto ${st.pontos}/3 · Salário R$ ${fmtBR(st.sal)}`; break;
      case 'feira': sp = `Pastéis ${st.sold}/20 · Caixa R$ ${fmtBR(st.caixa)}`; break;
      case 'postinho': sp = `Remédios grátis ${st.remedios}/41`; break;
      case 'fumaca': sp = `Mudas ${st.mudas} · Plantadas ${st.plant}/5`; break;
      case 'territorio': sp = `Entregas ${st.entregas}/5${P.hide ? ' · escondido' : ''}`; break;
      case 'inss': sp = `Benefício R$ ${fmtBR(st.ben, 2)}${st.stuck ? ' · ' + keyB() + ' tira o desconto' : ''}`; break;
      case 'praca': sp = 'Chegue à urna'; break;
    }
    const s = `${lives}|${lv.i}|${sp}|${st.coins}|${heroId()}`;
    if (s === hudCache) return;
    hudCache = s;
    $('hLives').textContent = `${heroName()} × ${lives}`;
    $('hLevel').textContent = `Fase ${lv.D!.n}`;
    $('hSpecial').innerHTML = sp;
    $('hCoins').innerHTML = lv.id === 'postinho' ? `<span class="coin"></span>× ${st.coins}` : '';
  }

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    TL.length = 0;
    G.W = VW; G.H = VH; G.T = T;
    if (S === 'title' || S === 'pick') renderTitleBG();
    else if (S === 'cut' && cut) { ctx.save(); CUTS[cut.id].draw(cut.t, G); ctx.restore(); }
    else if (S === 'map' || (S === 'dialog' && under === 'map')) renderMap();
    else if (S === 'urna' || S === 'credits' || (S === 'dialog' && dq && dq.ending)) renderBright();
    else if (lv) renderLevel();
    if (lv && under === 'play' && S !== 'cut') hud();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    syncTL();
  }

  // ---------------- Fluxo ----------------
  function playCut(id: string, done: () => void) { cut = { id, t: 0, done }; setS('cut'); }
  function startLevel(i: number) {
    bossCk = null;
    loadLevel(i);
    const D = LEVELS2[i];
    under = 'play';
    const mission = () => dialog([{
      tag: 'Missão · ' + D.area,
      title: `Fase ${D.n} · ${D.name}`,
      body: keyTxt(TX[String(D.n)].missao)
    }], () => setS('play'), 'play');
    playCut(D.cut, () => {
      if (D.hero === 'pick') { pickIdx = HERO_IDS.indexOf(finalHero); if (pickIdx < 0) pickIdx = 0; setS('pick'); st.afterPick = mission; }
      else mission();
    });
  }

  function step() {
    T++;
    if (pressed.M) { muted = !muted; toast(muted ? 'Som desligado' : 'Som ligado'); }
    if (toastT > 0 && --toastT === 0) $('toast').hidden = true;
    switch (S) {
      case 'title':
        titleCam += 0.6;
        if (confirmHit()) {
          sfx.pick();
          if (!seenPrologue) { seenPrologue = true; under = 'map'; playCut('prologo', () => { under = 'map'; setS('map'); }); }
          else { under = 'map'; setS('map'); }
        }
        if (pressed.P && onExit) onExit();
        break;
      case 'cut':
        if (!cut) break;
        cut.t++;
        if (confirmHit() || pressed.P || cut.t >= CUTS[cut.id].dur) { const d = cut.done; cut = null; d(); }
        break;
      case 'pick':
        titleCam += 0.6;
        if (pressed.L) { pickIdx = (pickIdx + HERO_IDS.length - 1) % HERO_IDS.length; sfx.sel(); renderPick(); }
        if (pressed.R) { pickIdx = (pickIdx + 1) % HERO_IDS.length; sfx.sel(); renderPick(); }
        if (confirmHit()) { finalHero = HERO_IDS[pickIdx]; sfx.pick(); hudCache = ''; const f = st.afterPick; st.afterPick = null; if (f) f(); }
        break;
      case 'map': {
        if ((pressed.R || pressed.U) && mapIdx < NL - 1) { mapIdx++; sfx.sel(); mapBar(); }
        if ((pressed.L || pressed.D) && mapIdx > 0) { mapIdx--; sfx.sel(); mapBar(); }
        if (pressed.P) setS('title');
        if (confirmHit()) { sfx.pick(); startLevel(mapIdx); }
        break;
      }
      case 'dialog': updDialog(); break;
      case 'urna': updUrna(); break;
      case 'credits': updCredits(); break;
      case 'play':
        if (pressed.P) { setS('pause'); break; }
        updPlayer(); updEnts(); updLevelRules(); updBoss(); updUrnaEnt(); updParts(); camera();
        if (S !== 'play' || !P || !lv) break;
        if (P.y > lv.rows * TS + 20) { killPlayer(true); break; }
        break;
      case 'pause':
        if (confirmHit() || pressed.P) setS('play');
        else if (pressed.B) { under = 'map'; setS('map'); }
        break;
      case 'dying':
        if (!pitFall && dieT < 85 && P) { P.vy += 0.25; P.y += P.vy; }
        if (--dieT <= 0) { lives--; showCard(lives <= 0); }
        break;
      case 'card':
        if (confirmHit()) {
          if (st.final) lives = 13; // o checkpoint do chefão vale até vencê-lo, mesmo depois de perder todas as vidas
          const i = lv!.i!;
          const ck = bossCk && bossCk.i === i ? bossCk : null;
          loadLevel(i);
          if (ck && P && lv) {
            // volta direto para o chefão
            P.x = ck.x; P.y = ck.y; P.vy = 0;
            if (lv.id === 'postinho') {
              camY = 0; camX = 0;
              // volta em cima da bancada do Tesourão, longe das setas do celular
              if (isTouch() && P.x < getStartX()) { P.x = 16 * TS; P.y = 9 * TS - P.h; }
            }
            else { camX = lv.arenaX * TS; P.x = Math.max(P.x, camX + getStartX()); const maxY = Math.max(0, lv.rows * TS - VH); camY = Math.max(0, Math.min(maxY, P.y - VH * 0.55)); }
            startBoss();
          }
          setS('play');
        } else if (pressed.P) {
          if (st.final) lives = 13;
          bossCk = null;
          under = 'map'; setS('map');
        }
        break;
      case 'won':
        updParts();
        if (--wonT <= 0) finishLevel();
        break;
    }
    for (const k in pressed) pressed[k] = false;
  }

  // Música
  const music = createMusic2();
  function wantTrack(): string | null {
    if (document.hidden) return null;
    if (S === 'title' || S === 'map' || S === 'pick') return 'title2';
    if (S === 'cut') return cut && cut.id === 'prologo' ? 'title2' : null;
    if (S === 'urna' || S === 'credits') return 'ending';
    if (S === 'dialog') {
      if (dq && dq.ending) return 'ending';
      if (under === 'map') return 'title2';
      if (dq && dq.outro) return null;
      return lv ? lv.D!.music : null;
    }
    if ((S === 'play' || S === 'pause') && lv) return lv.D!.music + (B && B.state !== 'dead' ? '!' : '');
    return null;
  }

  let acc = 0, lastT = 0, animId = 0;
  function frame(t: number) {
    animId = requestAnimationFrame(frame);
    if (!lastT) lastT = t;
    acc += Math.min(100, t - lastT);
    lastT = t;
    try {
      while (acc >= 1000 / 60) { step(); acc -= 1000 / 60; }
      render();
      music.tick(AC, wantTrack(), muted, S === 'pause');
    } catch (err) {
      acc = 0;
      console.error(err);
      for (const k in pressed) pressed[k] = false;
      if (lv && (S === 'play' || S === 'dying')) {
        try { loadLevel(lv.i!); setS('play'); toast('A fase reiniciou após um erro'); } catch (_) {}
      }
    }
  }

  // ---------------- Eventos ----------------
  const onKeyDown = (e: KeyboardEvent) => {
    const b = KEYMAP[e.code];
    if (!b) return;
    e.preventDefault();
    if (!K[b]) pressed[b] = true;
    K[b] = true;
    unlockAudio();
  };
  const onKeyUp = (e: KeyboardEvent) => { const b = KEYMAP[e.code]; if (b) K[b] = false; };
  const onBlur = () => { for (const k in K) K[k] = false; };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  const onPointerDownDpad = (e: PointerEvent) => { e.preventDefault(); dpadId = e.pointerId; try { (dpad as any)?.setPointerCapture(e.pointerId); } catch (_) {} dpadAt(e); unlockAudio(); };
  const onPointerMoveDpad = (e: PointerEvent) => { if (e.pointerId === dpadId) dpadAt(e); };
  const dpadEnd = (e: PointerEvent) => { if (e.pointerId !== dpadId) return; dpadId = null; for (const b in dirEl) setBtn(b, false, dirEl[b]); };
  dpad?.addEventListener('pointerdown', onPointerDownDpad);
  dpad?.addEventListener('pointermove', onPointerMoveDpad);
  dpad?.addEventListener('pointerup', dpadEnd);
  dpad?.addEventListener('pointercancel', dpadEnd);

  const touchButtons = document.querySelectorAll('.tbtn, .tpause');
  const buttonHandlers: { el: Element; down: (e: any) => void; up: (e: any) => void }[] = [];
  touchButtons.forEach(bt => {
    const b = (bt as HTMLElement).dataset.b;
    if (!b) return;
    const down = (e: PointerEvent) => { e.preventDefault(); e.stopPropagation(); try { (bt as any).setPointerCapture(e.pointerId); } catch (_) {} setBtn(b, true, bt); unlockAudio(); };
    const up = (e: PointerEvent) => { e.preventDefault(); setBtn(b, false, bt); };
    bt.addEventListener('pointerdown', down as any);
    bt.addEventListener('pointerup', up as any);
    bt.addEventListener('pointercancel', up as any);
    bt.addEventListener('contextmenu', e => e.preventDefault());
    buttonHandlers.push({ el: bt, down, up });
  });

  const onResize = () => checkRotate();
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  window.visualViewport?.addEventListener('resize', onResize);
  document.addEventListener('fullscreenchange', onResize);
  document.addEventListener('webkitfullscreenchange', onResize);
  const onPointerUpFull = (e: PointerEvent) => { if (e.pointerType !== 'mouse') goFull(); };
  window.addEventListener('pointerup', onPointerUpFull, { passive: true });
  window.addEventListener('touchstart', enableTouch, { passive: true });
  const releaseAll = () => { for (const k in K) K[k] = false; dpadId = null; document.querySelectorAll('.touch .on, .tpause.on').forEach(el => el.classList.remove('on')); };
  const onTouchEndAll = (e: TouchEvent) => { if (e.touches.length === 0) releaseAll(); };
  window.addEventListener('touchend', onTouchEndAll, { passive: true });
  window.addEventListener('touchcancel', onTouchEndAll, { passive: true });

  const screenHandlers: { el: HTMLElement; fn: (e: Event) => void }[] = [];
  ['title', 'select', 'dlg', 'card', 'pause'].forEach(id => {
    const el = $(id);
    if (!el) return;
    const fn = (e: Event) => {
      if ((e as PointerEvent).pointerType === 'touch' || (e as PointerEvent).pointerType === 'pen') return;
      if ((e.target as HTMLElement)?.closest?.('a, button')) return;
      pressed.J = true; unlockAudio();
    };
    el.addEventListener('pointerdown', fn);
    screenHandlers.push({ el, fn });
  });
  const stage = $('stage');
  const onStageDown = (e: PointerEvent) => {
    if (e.pointerType === 'touch' || e.pointerType === 'pen') return;
    if (S === 'map' || S === 'cut') { pressed.J = true; unlockAudio(); }
  };
  stage?.addEventListener('pointerdown', onStageDown);
  const skipBtn = document.getElementById('skipCut');
  const onSkip = (e: Event) => { e.preventDefault(); e.stopPropagation(); if (S === 'cut') pressed.J = true; };
  skipBtn?.addEventListener('pointerdown', onSkip);

  const onVisibilityChange = () => {
    lastT = 0; acc = 0;
    for (const k in K) K[k] = false;
    document.querySelectorAll('.on').forEach(el => el.classList.remove('on'));
    if (document.hidden && S === 'play') setS('pause');
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  const TOUCH_OK = '.dpad, .tbtn, .tpause, #urnaOk, #skipCut, a, button';
  const SCROLL_OK = '.dlg, .u-scr';
  let lastTouchEnd = 0;
  const closestOf = (t: EventTarget | null, sel: string) => (t as HTMLElement)?.closest?.(sel);
  const onTouchStartBlock = (e: TouchEvent) => {
    if (e.touches.length > 1 && !closestOf(e.target, TOUCH_OK)) { e.preventDefault(); return; }
    if (!closestOf(e.target, TOUCH_OK) && !closestOf(e.target, SCROLL_OK)) e.preventDefault();
  };
  const onTouchMoveBlock = (e: TouchEvent) => { if (e.touches.length > 1 || !closestOf(e.target, SCROLL_OK)) e.preventDefault(); };
  const onTouchEndBlock = (e: TouchEvent) => { const now = Date.now(); if (now - lastTouchEnd < 350 && !closestOf(e.target, 'a, button')) e.preventDefault(); lastTouchEnd = now; };
  const blockEvent = (e: Event) => e.preventDefault();
  const blockMenu = (e: Event) => { if (isTouch()) e.preventDefault(); };
  document.addEventListener('touchstart', onTouchStartBlock, { passive: false });
  document.addEventListener('touchmove', onTouchMoveBlock, { passive: false });
  document.addEventListener('touchend', onTouchEndBlock, { passive: false });
  document.addEventListener('gesturestart', blockEvent);
  document.addEventListener('gesturechange', blockEvent);
  document.addEventListener('dblclick', blockEvent);
  document.addEventListener('contextmenu', blockMenu);
  $('dlg')?.addEventListener('scroll', updNext);
  $('urnaScr')?.addEventListener('scroll', updUrnaHint);
  const onUrnaOk = (e: Event) => { e.preventDefault(); if (S === 'urna') { pressed.J = true; unlockAudio(); } };
  $('urnaOk')?.addEventListener('pointerdown', onUrnaOk);

  if (window.matchMedia('(pointer:coarse)').matches || (navigator.maxTouchPoints > 0 && window.matchMedia('(hover:none)').matches)) enableTouch();
  checkRotate();
  ui();
  animId = requestAnimationFrame(frame);

  // ganchos de teste (usados só pelos testes automatizados)
  (window as any).__sfw2 = {
    get S() { return S; }, get st() { return st; }, get P() { return P; }, get B() { return B; }, get lv() { return lv; }, get lives() { return lives; }, set lives(v: number) { lives = v; }, kill: () => killPlayer(false),
    start: (i: number) => { seenPrologue = true; startLevel(i); }, setS, finishLevel, bossWon, showEnding: () => showEnding(() => setS('map')),
    setDone: (m: number) => { doneMask = m; saveProgress(); }
  };

  return () => {
    document.documentElement.classList.remove('in-cut');
    cancelAnimationFrame(animId);
    music.stop(AC);
    try { AC?.close(); } catch (_) {}
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    dpad?.removeEventListener('pointerdown', onPointerDownDpad);
    dpad?.removeEventListener('pointermove', onPointerMoveDpad);
    dpad?.removeEventListener('pointerup', dpadEnd);
    dpad?.removeEventListener('pointercancel', dpadEnd);
    buttonHandlers.forEach(({ el, down, up }) => { el.removeEventListener('pointerdown', down as any); el.removeEventListener('pointerup', up as any); el.removeEventListener('pointercancel', up as any); });
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    window.visualViewport?.removeEventListener('resize', onResize);
    document.removeEventListener('fullscreenchange', onResize);
    document.removeEventListener('webkitfullscreenchange', onResize);
    window.removeEventListener('pointerup', onPointerUpFull);
    window.removeEventListener('touchstart', enableTouch);
    window.removeEventListener('touchend', onTouchEndAll);
    window.removeEventListener('touchcancel', onTouchEndAll);
    screenHandlers.forEach(({ el, fn }) => el.removeEventListener('pointerdown', fn));
    stage?.removeEventListener('pointerdown', onStageDown);
    skipBtn?.removeEventListener('pointerdown', onSkip);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    document.removeEventListener('touchstart', onTouchStartBlock);
    document.removeEventListener('touchmove', onTouchMoveBlock);
    document.removeEventListener('touchend', onTouchEndBlock);
    document.removeEventListener('gesturestart', blockEvent);
    document.removeEventListener('gesturechange', blockEvent);
    document.removeEventListener('dblclick', blockEvent);
    document.removeEventListener('contextmenu', blockMenu);
    $('dlg')?.removeEventListener('scroll', updNext);
    $('urnaScr')?.removeEventListener('scroll', updUrnaHint);
    $('urnaOk')?.removeEventListener('pointerdown', onUrnaOk);
    delete (window as any).__sfw2;
  };
}
