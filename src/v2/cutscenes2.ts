// Cutscenes da v2: antes de cada fase, o Flávio faz algo que o jogador vai enfrentar.
// Cada cutscene desenha um quadro a partir do tempo t (em quadros de 1/60 s). Z pula.
import type { Frames } from './sprites2.ts';

export type Gfx = {
  ctx: CanvasRenderingContext2D;
  W: number; H: number; T: number;
  R: (x: number, y: number, w: number, h: number, c: string) => void;
  circ: (x: number, y: number, r: number, c: string) => void;
  text: (s: string, x: number, y: number, c?: string, size?: number, align?: CanvasTextAlign, fixed?: boolean) => void;
  bubble: (s: string, x: number, y: number, maxW?: number, tail?: number) => void;
  spr: (c: HTMLCanvasElement, x: number, y: number, s?: number) => void;
  flavio: Frames; pai: HTMLCanvasElement[]; banq: HTMLCanvasElement[];
  hero: (id: string, f?: 'stand' | 'walk' | 'jump', flip?: boolean) => HTMLCanvasElement;
};

export type Cut = { dur: number; draw: (t: number, g: Gfx) => void };

const lerp = (a: number, b: number, k: number) => a + (b - a) * Math.max(0, Math.min(1, k));
const seg = (t: number, a: number, b: number) => Math.max(0, Math.min(1, (t - a) / (b - a)));

function walkF(g: Gfx, moving: boolean, flip = false) {
  const f = moving ? ((g.T >> 3) % 2 ? 'walk' : 'stand') : 'stand';
  return g.flavio[f][flip ? 1 : 0];
}

function caption(g: Gfx, s: string, a = 1) {
  const { ctx } = g;
  ctx.globalAlpha = a;
  g.R(0, 0, g.W, 14, 'rgba(0,0,0,.65)');
  g.text(s, g.W / 2, 10, '#e9d8a6', 6, 'center');
  ctx.globalAlpha = 1;
}

function floor(g: Gfx, y: number, c1: string, c2: string) {
  g.R(0, y, g.W, g.H - y, c1);
  for (let x = 0; x < g.W; x += 16) g.R(x, y, 1, g.H - y, c2);
}

// Uma "TV" de boca de cena: listras escuras em cima e embaixo, cinzas caindo
function frameFX(g: Gfx) {
  for (let i = 0; i < 18; i++) {
    const x = (i * 53 + g.T * (0.2 + (i % 3) * 0.1)) % g.W;
    const y = (i * 37 + g.T * (0.3 + (i % 4) * 0.08)) % g.H;
    g.R(x, y, 1, 1, 'rgba(230,200,200,.35)');
  }
  g.R(0, g.H - 6, g.W, 6, '#000');
}

export const CUTS: Record<string, Cut> = {
  // Prólogo: a grande soltura
  prologo: {
    dur: 900,
    draw(t, g) {
      const { W, H } = g;
      if (t >= 720) {
        g.R(0, 0, W, H, '#050307');
        const a = seg(t, 730, 790);
        g.ctx.globalAlpha = a;
        g.text('AGORA O PROBLEMA', W / 2, H / 2 - 8, '#e8412c', 10, 'center');
        g.text('É SEU.', W / 2, H / 2 + 10, '#e8412c', 10, 'center');
        g.ctx.globalAlpha = 1;
        return;
      }
      g.R(0, 0, W, H, '#16121c');
      for (let x = 0; x < W; x += 24) for (let y = 20; y < 140; y += 12) g.R(x + ((y / 12) % 2) * 12, y, 22, 10, '#1e1926');
      g.text('PAPUDA', W / 2, 28, '#6a5a70', 8, 'center');
      floor(g, 150, '#241e2a', '#2c2533');
      const c1 = Math.round(W * 0.36), c2 = Math.round(W * 0.66);
      // celas
      for (const [cx, open] of [[c1, seg(t, 160, 200)], [c2, seg(t, 380, 420)]] as [number, number][]) {
        g.R(cx - 26, 82, 52, 68, '#0d0a10');
        const lift = open * 64;
        for (let i = 0; i < 6; i++) g.R(cx - 24 + i * 10, 84 - lift, 2, 66, '#8a8494');
        g.R(cx - 26, 82 - lift, 52, 3, '#8a8494');
      }
      // Banqueiro
      const bx = t < 200 ? c1 - 7 : lerp(c1 - 7, c1 + 22, seg(t, 200, 240));
      const runK = seg(t, 540, 700);
      const fx0 = t < 150 ? lerp(-24, c1 - 40, seg(t, 0, 150)) : t < 360 ? c1 - 40 : t < 380 ? lerp(c1 - 40, c2 - 40, seg(t, 360, 380)) : c2 - 40;
      const fx = fx0 + runK * (W + 80);
      const px = (t < 420 ? c2 - 7 : lerp(c2 - 7, c2 + 18, seg(t, 420, 460))) + runK * (W + 80);
      const bxx = bx + runK * (W + 80);
      g.spr(g.banq[t >= 520 ? 0 : 1], bxx, 130);
      g.spr(g.pai[t >= 520 ? 0 : 1], px, 130);
      g.spr(walkF(g, t < 150 || (t > 360 && t < 380) || runK > 0), fx, 128);
      // mala PARA O FILME
      if (t > 250) {
        const mx = t < 300 ? bxx - 8 : lerp(bxx - 8, fx + 14, seg(t, 300, 340)) + (t > 340 ? 0 : 0);
        const mxx = t >= 340 ? fx + 14 : mx;
        g.R(mxx, 140, 14, 10, '#6a4a24'); g.R(mxx + 4, 137, 6, 3, '#3a2a14');
        g.text('PARA O FILME', mxx + 7, 136, '#ffd21f', 4, 'center', true);
      }
      if (t > 210 && t < 330) g.bubble('Valeu, irmãozão!', bxx + 8, 120);
      // bola de ferro do pai
      if (t > 380) {
        const br = seg(t, 470, 500);
        g.circ(px + 22 + br * 20, 146 - br * 6, 4, '#2a2a2a');
        if (br < 1) for (let i = 0; i < 4; i++) g.R(px + 10 + i * 3, 147, 2, 1, '#6a6a6a');
        else for (let i = 0; i < 6; i++) g.R(px + 14 + i * 5 + (t - 500) * 0.5, 140 - i * 2 - (t - 500) * 0.2, 2, 2, '#8a8a8a');
      }
      caption(g, '1º DE JANEIRO DE 2027 · PRIMEIRO ATO DO NOVO PRESIDENTE', 1 - seg(t, 120, 160));
      frameFX(g);
    }
  },

  // Fase 1: a PEC do horário flexível
  busao: {
    dur: 600,
    draw(t, g) {
      const { W, H } = g;
      g.R(0, 0, W, H, '#1a2030');
      for (let r = 0; r < 4; r++) for (let x = 0; x < W; x += 10) g.R(x + (r % 2) * 5, 120 + r * 12, 7, 6, '#1f5a3a');
      // janela com a torre do relógio
      const wx = W - 96;
      g.R(wx, 22, 78, 70, '#3a2a4a'); g.R(wx + 2, 24, 74, 66, '#5a3a5a');
      const cw = t < 260 ? 0 : seg(t, 260, 420) * 90;
      const tx = wx + 30 + cw;
      g.ctx.save(); g.ctx.beginPath(); g.ctx.rect(wx + 2, 24, 74, 66); g.ctx.clip();
      g.R(tx, 46, 16, 44, '#2a2030');
      g.circ(tx + 8, 44, 10, '#e9e2c8'); g.circ(tx + 8, 44, 8, '#2a2030'); g.circ(tx + 8, 44, 7, '#e9e2c8');
      const sp = t > 230 ? (t - 230) * 0.25 : 0;
      const a1 = sp, a2 = sp * 12;
      g.ctx.strokeStyle = '#120c18'; g.ctx.lineWidth = 1.2;
      g.ctx.beginPath(); g.ctx.moveTo(tx + 8, 44); g.ctx.lineTo(tx + 8 + Math.sin(a1) * 4, 44 - Math.cos(a1) * 4); g.ctx.stroke();
      g.ctx.beginPath(); g.ctx.moveTo(tx + 8, 44); g.ctx.lineTo(tx + 8 + Math.sin(a2) * 6, 44 - Math.cos(a2) * 6); g.ctx.stroke();
      if (t > 280) { const o = (g.T >> 3) % 2 ? 2 : -2; g.R(tx + 3 + o, 90, 2, 0, '#000'); g.R(tx + 2 + o, 84, 3, 8, '#120c18'); g.R(tx + 11 - o, 84, 3, 8, '#120c18'); }
      g.ctx.restore();
      // tribuna
      const px = Math.round(W * 0.32);
      g.spr(walkF(g, false), px, 74);
      g.R(px - 30, 96, 80, 40, '#3a2a1a'); g.R(px - 30, 96, 80, 3, '#5a4a2a');
      // papel e caneta
      g.R(px - 28, 91, 74, 18, '#f4f0e0'); g.R(px - 28, 108, 74, 1, '#c8c0a8');
      g.text('PEC DO HORÁRIO', px + 9, 99, '#120c18', 4, 'center', true);
      g.text('FLEXÍVEL', px + 9, 105, '#120c18', 4, 'center', true);
      const pk = seg(t, 60, 200);
      const penx = px - 20 + Math.sin(pk * 20) * 12 + pk * 44, peny = 86 + Math.cos(pk * 23) * 3;
      g.ctx.save(); g.ctx.translate(penx, peny); g.ctx.rotate(0.6);
      g.R(0, -2, 26, 4, '#2449c9'); g.R(-4, -1, 4, 2, '#ffd21f'); g.ctx.restore();
      if (t > 200) {
        const a = 1 - seg(t, 260, 300);
        g.ctx.save(); g.ctx.globalAlpha = Math.max(0, a); g.ctx.translate(px + 9, 100); g.ctx.rotate(-0.2);
        g.ctx.strokeStyle = '#e8412c'; g.ctx.lineWidth = 1.5; g.ctx.strokeRect(-34, -9, 68, 18);
        g.text('ASSINADO', 0, 3, '#e8412c', 6, 'center', true); g.ctx.restore();
      }
      if (t > 380) g.bubble('Agora quem decide o seu horário é o patrão.', px + 10, 66, 150);
      caption(g, 'SENADO FEDERAL', 1 - seg(t, 120, 160));
      frameFX(g);
    }
  },

  // Fase 2: o envelope do Pix
  feira: {
    dur: 600,
    draw(t, g) {
      const { W, H } = g;
      g.R(0, 0, W, H, '#0e1428');
      g.ctx.fillStyle = '#16203a'; g.ctx.beginPath(); g.ctx.ellipse(W / 2, 160, W * 0.42, 22, 0, 0, Math.PI * 2); g.ctx.fill();
      for (let i = 0; i < 5; i++) g.R(20 + i * (W - 40) / 4, 30, 10, 110, '#18223e');
      // cavalete com o QR do Pix
      const qx = Math.round(W * 0.52), qy = 60;
      g.R(qx + 6, 116, 3, 40, '#3a2a1a'); g.R(qx + 30, 116, 3, 40, '#3a2a1a');
      g.R(qx, qy, 40, 56, '#f4f4f4');
      for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) if ((i * 7 + j * 3 + i * j) % 3 === 0) g.R(qx + 4 + i * 4, qy + 6 + j * 4, 4, 4, '#120c18');
      g.R(qx + 4, qy + 6, 10, 10, '#120c18'); g.R(qx + 6, qy + 8, 6, 6, '#f4f4f4'); g.R(qx + 26, qy + 6, 10, 10, '#120c18'); g.R(qx + 28, qy + 8, 6, 6, '#f4f4f4');
      g.text('PIX', qx + 20, qy + 52, '#32bcad', 6, 'center');
      if (t > 300) {
        g.ctx.strokeStyle = '#120c18'; g.ctx.lineWidth = 1;
        g.ctx.beginPath(); g.ctx.moveTo(qx + 20, qy); g.ctx.lineTo(qx + 16, qy + 20); g.ctx.lineTo(qx + 24, qy + 34); g.ctx.lineTo(qx + 18, qy + 56); g.ctx.stroke();
      }
      // Tio Sam
      const sx = qx + 54;
      g.R(sx + 2, 82, 14, 4, '#f4f4f4'); g.R(sx + 4, 62, 10, 20, '#f4f4f4');
      for (let i = 0; i < 3; i++) g.R(sx + 4, 64 + i * 6, 10, 3, '#c0282d');
      g.R(sx + 4, 76, 10, 3, '#1d2c6a'); g.R(sx + 7, 77, 2, 1, '#fff');
      g.R(sx + 4, 86, 10, 10, '#f0c8a0'); g.R(sx + 6, 89, 2, 2, '#120c18'); g.R(sx + 11, 89, 2, 2, '#120c18');
      g.R(sx + 6, 95, 6, 8, '#f4f4f4');
      g.R(sx, 102, 18, 28, '#1d2c6a'); g.R(sx + 7, 102, 4, 10, '#f4f4f4'); g.R(sx + 2, 130, 5, 18, '#c0282d'); g.R(sx + 11, 130, 5, 18, '#c0282d');
      // carimbo TAXA
      const st = seg(t, 220, 300);
      const stx = lerp(sx - 6, qx + 14, st), sty = lerp(104, qy + 16, st) - Math.sin(st * Math.PI) * 18;
      g.R(stx, sty, 14, 10, '#7a4a20'); g.R(stx - 2, sty + 10, 18, 5, '#8a1f1a');
      if (t > 300) {
        g.ctx.save(); g.ctx.translate(qx + 20, qy + 30); g.ctx.rotate(-0.25);
        g.ctx.strokeStyle = '#e8412c'; g.ctx.lineWidth = 2; g.ctx.strokeRect(-20, -8, 40, 16);
        g.text('TAXA', 0, 3, '#e8412c', 8, 'center', true); g.ctx.restore();
      }
      // Flávio com o envelope
      const fx = lerp(-24, qx - 40, seg(t, 0, 120));
      g.spr(walkF(g, t < 120), fx, 128);
      const ek = seg(t, 140, 200);
      const ex = lerp(fx + 16, sx - 10, ek), ey = lerp(140, 112, ek);
      if (t < 300) { g.R(ex, ey, 18, 12, '#e9dcb0'); g.R(ex, ey, 18, 1, '#b8a878'); g.text('PIX', ex + 9, ey + 9, '#120c18', 5, 'center', true); }
      if (t > 330) {
        g.R(fx + 18, 136, 4, 6, '#e7b088'); g.R(fx + 19, 132, 2, 4, '#e7b088');
        g.bubble('Thank you!', fx + 10, 118);
      }
      frameFX(g);
    }
  },

  // Fase 3: o tesouraço no piso da saúde
  postinho: {
    dur: 600,
    draw(t, g) {
      const { W, H } = g;
      if (t < 280) {
        g.R(0, 0, W, H, '#1c1a14');
        g.R(0, 150, W, 42, '#2a241a');
        const p1 = Math.round(W * 0.3), p2 = Math.round(W * 0.72);
        g.R(p1, 90, 4, 60, '#c8b070'); g.R(p2, 90, 4, 60, '#c8b070');
        const cut = t > 170;
        const mid = (p1 + p2) / 2;
        if (!cut) { g.R(p1 + 4, 100, p2 - p1 - 4, 8, '#c0282d'); }
        else {
          const d = seg(t, 170, 230) * 40;
          g.ctx.fillStyle = '#c0282d';
          g.ctx.save(); g.ctx.translate(p1 + 4, 100); g.ctx.rotate(d / 60); g.ctx.fillRect(0, 0, mid - p1 - 4, 8); g.ctx.restore();
          g.ctx.save(); g.ctx.translate(p2, 100); g.ctx.rotate(-d / 60); g.ctx.fillRect(-(p2 - mid), 0, p2 - mid, 8); g.ctx.restore();
        }
        if (!cut) g.text('PISO DA SAÚDE', mid, 106, '#fff', 5, 'center', true);
        // tesoura gigante
        const k = seg(t, 80, 170);
        const tx = lerp(mid - 40, mid - 12, k), op = t < 170 ? 0.5 - Math.abs(Math.sin(t * 0.08)) * 0.3 : 0.05;
        g.ctx.save(); g.ctx.translate(tx, 104);
        for (const s of [-1, 1]) {
          g.ctx.save(); g.ctx.rotate(s * op);
          g.R(-30, -2, 34, 4, '#cfd6e0'); g.circ(-36, 0, 6, '#c0282d'); g.circ(-36, 0, 3, '#1c1a14');
          g.ctx.restore();
        }
        g.ctx.restore();
        g.text('TESOURAÇO', tx - 18, 92, '#ffd21f', 5, 'center');
        g.spr(walkF(g, false), tx - 56, 128);
        caption(g, 'GABINETE DO PRESIDENTE');
      } else {
        g.R(0, 0, W, H, '#0f1a16');
        for (let x = 0; x < W; x += 16) for (let y = 0; y < 150; y += 16) g.R(x + 1, y + 1, 14, 14, '#1c2e28');
        g.R(W / 2 - 10, 40, 20, 6, '#c0282d'); g.R(W / 2 - 3, 33, 6, 20, '#c0282d');
        const fl = (g.T >> 2) % 7 === 0 ? '#0f1a16' : '#cfe8d8';
        g.R(30, 8, 60, 3, fl); g.R(W - 90, 8, 60, 3, fl);
        g.R(0, 150, W, 42, '#3a4a44');
        const k = seg(t, 300, 520);
        g.ctx.strokeStyle = '#05070a'; g.ctx.lineWidth = 2;
        g.ctx.beginPath(); g.ctx.moveTo(0, 158);
        for (let x = 0; x <= W * k; x += 12) g.ctx.lineTo(x, 156 + ((x / 12) % 2 ? 6 : -2));
        g.ctx.stroke();
        if (k > 0.5) for (let i = 0; i < 8; i++) g.R((i * 47) % W, 160 + ((t + i * 13) % 30), 4, 4, '#3a4a44');
        caption(g, 'POSTINHO DO BAIRRO');
      }
      frameFX(g);
    }
  },

  // Fase 4: as amarras ambientais
  fumaca: {
    dur: 600,
    draw(t, g) {
      const { W, H } = g;
      const sk = g.ctx.createLinearGradient(0, 0, 0, H); sk.addColorStop(0, '#2a0e06'); sk.addColorStop(1, '#a04a1a');
      g.ctx.fillStyle = sk; g.ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 9; i++) { const x = i * 42 + 8; g.R(x + 8, 70, 6, 90, '#140806'); g.circ(x + 11, 64, 16, '#1c0a06'); }
      g.R(0, 156, W, 36, '#1a0c08');
      const px = Math.round(W * 0.4);
      g.R(px - 30, 132, 80, 24, '#3a2414'); g.R(px - 30, 132, 80, 3, '#5a3a20');
      g.spr(walkF(g, false), px, 110);
      // corrente nas mãos
      if (t < 270) { for (let i = 0; i < 9; i++) g.R(px - 10 + i * 5, 122, 4, 3, i % 2 ? '#8a8a8a' : '#b0b0b0'); }
      else { const d = (t - 270) * 0.8; for (let i = 0; i < 9; i++) g.R(px - 10 + i * 5 + (i < 4 ? -d : d), 122 + d * 0.6, 4, 3, '#8a8a8a'); }
      if (t > 40 && t < 300) g.bubble('Vamos acabar com essas amarras ambientais!', px + 10, 100, 160);
      if (t > 290) {
        const k = (t - 290) * 2.4;
        for (let i = 0; i < 5; i++) {
          const bx = px + 40 + k - i * 34;
          if (bx < -30 || bx > W + 30) continue;
          g.R(bx, 150, 22, 10, '#5a3a24'); g.R(bx + 18, 146, 7, 7, '#5a3a24'); g.R(bx + 22, 144, 2, 3, '#e9e2c8');
          const o = (g.T >> 2) % 2 ? 1 : -1;
          g.R(bx + 2 + o, 160, 2, 4, '#3a2414'); g.R(bx + 16 - o, 160, 2, 4, '#3a2414');
        }
        for (let i = 0; i < 4; i++) {
          const mx = px + 20 + k * 1.2 - i * 50;
          if (mx < -30 || mx > W + 30) continue;
          g.R(mx, 146, 12, 10, '#ff7a1a'); g.R(mx + 12, 149, 16, 4, '#cfd6e0');
          for (let j = 0; j < 4; j++) g.R(mx + 13 + j * 4, ((g.T >> 1) + j) % 2 ? 148 : 153, 2, 1, '#6a6a6a');
        }
      }
      frameFX(g);
    }
  },

  // Fase 5: Alerj, 2007
  territorio: {
    dur: 600,
    draw(t, g) {
      const { W, H, ctx } = g;
      g.R(0, 0, W, H, '#2a2014');
      for (let i = 0; i < 6; i++) g.R(20 + i * 56, 20, 30, 100, '#3a2c1c');
      g.R(0, 150, W, 42, '#3a2c1c');
      const px = Math.round(W * 0.3);
      g.R(px - 20, 104, 60, 46, '#4a3622'); g.R(px - 20, 104, 60, 3, '#6a5030');
      g.R(px + 8, 90, 2, 14, '#1a1410'); g.R(px + 6, 88, 6, 4, '#1a1410');
      g.spr(walkF(g, false), px - 4, 82);
      // o fardado
      const k = seg(t, 380, 560);
      const mx = lerp(px + 50, W - 60, k);
      g.R(mx + 2, 112, 10, 2, t > 470 ? '#0a0a0a' : '#2a3a5a'); g.R(mx + 3, 108, 8, 4, t > 470 ? '#0a0a0a' : '#2a3a5a');
      if (t > 470) g.R(mx + 9, 112, 6, 2, '#0a0a0a');
      g.R(mx + 3, 114, 8, 8, '#d9a07a'); g.R(mx + 5, 117, 1, 1, '#120c18'); g.R(mx + 9, 117, 1, 1, '#120c18');
      g.R(mx, 122, 14, 16, '#3a4a6a'); g.R(mx + 2, 138, 4, 12, '#2a3448'); g.R(mx + 8, 138, 4, 12, '#2a3448');
      // medalha
      const mk = seg(t, 60, 160);
      const medx = lerp(px + 18, mx + 3, mk), medy = lerp(110, 126, mk);
      g.R(medx, medy - 3, 2, 3, '#169c3c'); g.R(medx + 2, medy - 3, 2, 3, '#ffd21f'); g.circ(medx + 2, medy + 2, 3, '#ffd21f');
      if (t > 180 && t < 380) g.bubble('Não se pode, simplesmente, estigmatizar as milícias.', px + 8, 76, 170);
      if (t > 500) g.text('O CAPITÃO', mx + 7, 100, '#e8412c', 6, 'center');
      // sépia
      ctx.fillStyle = 'rgba(120,80,30,.18)'; ctx.fillRect(0, 0, W, H);
      caption(g, 'ALERJ · 7 DE FEVEREIRO DE 2007');
      frameFX(g);
    }
  },

  // Fase 6: Sala 2601
  inss: {
    dur: 600,
    draw(t, g) {
      const { W, H } = g;
      g.R(0, 0, W, H, '#3a3a2a');
      g.R(0, 150, W, 42, '#4a4a36');
      g.R(W - 70, 40, 50, 110, '#2a2a1e'); g.R(W - 70, 20, 50, 19, '#e9e2c8'); g.R(W - 70, 38, 50, 1, '#b8b098'); g.text('SALA DO', W - 45, 29, '#120c18', 5, 'center', true); g.text('CARECA', W - 45, 36, '#120c18', 5, 'center', true);
      // tomada e fio
      const sx = 26;
      g.R(sx, 96, 12, 14, '#e9e2c8'); g.R(sx + 3, 100, 2, 4, '#120c18'); g.R(sx + 7, 100, 2, 4, '#120c18');
      const pulled = t > 170;
      const ex = pulled ? lerp(sx + 12, sx + 70, seg(t, 170, 200)) : sx + 12, ey = pulled ? lerp(103, 150, seg(t, 170, 220)) : 103;
      g.ctx.strokeStyle = '#120c18'; g.ctx.lineWidth = 2;
      g.ctx.beginPath(); g.ctx.moveTo(ex, ey); g.ctx.quadraticCurveTo(W * 0.5, pulled ? 160 : 120, W - 120, 120); g.ctx.stroke();
      g.R(ex - 2, ey - 3, 6, 6, '#8a8a8a');
      g.text('SALÁRIO MÍNIMO', W * 0.42, pulled ? 150 : 112, '#ffd21f', 5, 'center');
      // mini INSS
      g.R(W - 132, 104, 22, 46, '#2449c9'); g.text('INSS', W - 121, 112, '#fff', 4, 'center', true);
      if (pulled && (g.T >> 2) % 2) for (let i = 0; i < 4; i++) g.R(sx + 14 + i * 3, 98 + (i % 2) * 6, 2, 2, '#ffd21f');
      const fx = lerp(-24, sx + 30, seg(t, 0, 120));
      g.spr(walkF(g, t < 120, true), fx, 128);
      // o careca carimbando
      const cx = W - 60;
      g.R(cx - 24, 132, 40, 4, '#5a4a2a');
      g.R(cx, 104, 10, 10, '#e6b08a'); g.R(cx + 2, 107, 2, 1, '#120c18'); g.R(cx + 6, 107, 2, 1, '#120c18');
      g.R(cx - 2, 114, 14, 18, '#3a3a4a');
      const up = (g.T >> 4) % 2;
      g.R(cx - 12, up ? 116 : 124, 8, 6, '#7a4a20');
      for (let i = 0; i < Math.min(8, Math.floor(t / 40)); i++) { g.R(cx - 22 + (i % 3) * 3, 128 - i * 2, 14, 4, '#e9dcb0'); }
      g.text('DESCONTO', cx - 15, 140, '#e8412c', 4, 'center', true);
      frameFX(g);
    }
  },

  // Fase 7: a Constituição em chamas
  praca: {
    dur: 600,
    draw(t, g) {
      const { W, H } = g;
      const sk = g.ctx.createLinearGradient(0, 0, 0, H); sk.addColorStop(0, '#1a0404'); sk.addColorStop(1, '#7a1a12');
      g.ctx.fillStyle = sk; g.ctx.fillRect(0, 0, W, H);
      const cx = W - 80;
      g.R(cx - 8, 60, 6, 70, '#120808'); g.R(cx + 2, 60, 6, 70, '#120808'); g.R(cx - 60, 126, 130, 8, '#120808');
      g.ctx.fillStyle = '#120808'; g.ctx.beginPath(); g.ctx.arc(cx - 34, 126, 12, Math.PI, 0); g.ctx.fill();
      g.R(0, 150, W, 42, '#2a1414');
      const fx = Math.round(W * 0.4);
      g.spr(g.pai[0], fx - 34, 130);
      g.spr(g.banq[1], fx + 30, 130);
      // a mala do Banqueiro: tampa aberta, dinheiro voando, "DARK HORSE" escrito dentro
      { const mx = fx + 46, my = 136;
        g.R(mx, my - 18, 34, 3, '#4a3218'); g.R(mx + 1, my - 16, 32, 15, '#e8dcb8'); // tampa aberta, forro claro
        g.text('DARK', mx + 17, my - 9.5, '#7a1a12', 4, 'center', true); g.text('HORSE', mx + 17, my - 4, '#7a1a12', 4, 'center', true);
        g.R(mx, my, 34, 14, '#6a4a24'); g.R(mx, my, 34, 2, '#8a6a3a'); g.R(mx + 15, my + 5, 4, 3, '#ffd21f');
        for (let i = 0; i < 4; i++) g.R(mx + 2 + i * 8, my - 1, 6, 2, i % 2 ? '#3a8a4a' : '#5aa86a'); // maços de nota na boca da mala
        for (let i = 0; i < 6; i++) { const k = ((t * 0.9 + i * 23) % 70) / 70; const nx = mx + 6 + i * 4 + Math.sin(t * 0.1 + i) * 6 + k * (i % 2 ? 22 : -14), ny = my - 4 - k * 46;
          g.ctx.globalAlpha = 1 - k; g.R(nx, ny, 6, 3, '#5aa86a'); g.R(nx + 2, ny + 1, 2, 1, '#2a6a3a'); g.ctx.globalAlpha = 1; }
      }
      g.spr(walkF(g, false), fx, 128);
      // Constituição erguida
      const up = seg(t, 40, 120);
      const bx = fx + 4, by = lerp(140, 104, up);
      const burn = seg(t, 200, 460);
      if (burn < 1) {
        g.R(bx, by, 14, 18 * (1 - burn * 0.8), '#2a6a3a'); g.R(bx + 1, by + 1, 12, 2, '#ffd21f');
        if (burn < 0.3) g.text('CF', bx + 7, by + 12, '#ffd21f', 5, 'center', true);
      }
      if (t > 170 && t < 210) g.circ(bx + 18, by - 2, 2, '#ffd21f');
      if (t > 200) {
        for (let i = 0; i < 10; i++) {
          const k = ((t * 1.3 + i * 17) % 40) / 40;
          g.circ(bx + 7 + Math.sin(i + t * 0.1) * 5, by - k * 22, 3 * (1 - k) + 1, k < 0.5 ? '#ffd21f' : '#e8412c');
        }
        for (let i = 0; i < 6; i++) {
          const k = ((t - 200) * 0.6 + i * 40) % 200;
          g.R(bx + k * (i % 2 ? 1 : -0.8), by - 10 - k * 0.3 + Math.sin(k * 0.1) * 6, 5, 4, i % 2 ? '#e9dcb0' : '#a8402a');
        }
      }
      if (t > 230) g.bubble('Com maioria no Congresso, vamos mudar a Constituição.', fx + 10, 96, 170);
      caption(g, 'PRAÇA DOS TRÊS PODERES', 1 - seg(t, 120, 160));
      frameFX(g);
    }
  }
};
