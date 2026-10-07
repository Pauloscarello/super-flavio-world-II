// Fases da v2 (Trilha B). Mapas em blocos de 16 px; fases horizontais têm 12 linhas,
// o Postinho é vertical. Cada fase termina numa arena de chefão.
import { TS, hr } from '../game/sources.ts';
import { TX } from './texts2.ts';

export interface LevelDef2 {
  id: string; n: number; name: string; area: string; hero: string; theme: string;
  w: number; rows: number; arenaX: number; boss: string; cut: string; music: string;
  src: string[]; deathHead: string; deathSub: string;
  make: (b: any) => void;
}

export interface LevelData2 {
  w: number; rows: number; g: string[][]; ents: any[]; start: { x: number; y: number };
  arenaX: number; i?: number; id?: string; D?: LevelDef2; th?: any;
}

export const THEMES2: Record<string, any> = {
  busao: { sky: ['#140c22', '#4a2e4e'], top: '#4a4a4e', fill: '#2a2230', dot: '#1e1824', brick: '#4a2a34', block: '#3a3040', plat: '#7a5a6a' },
  feira: { sky: ['#1e140e', '#6a5236'], top: '#6a5a3a', fill: '#3a2c20', dot: '#2c2018', brick: '#5a3a2a', block: '#4a3a2c', plat: '#8a6a4a' },
  postinho: { sky: ['#06100c', '#1c3a2e'], top: '#5a7a6a', fill: '#24302c', dot: '#1a2420', brick: '#2e4a40', block: '#3a4a44', plat: '#8ab0a0' },
  fumaca: { sky: ['#1e0804', '#8a3a12'], top: '#3a2a1a', fill: '#1e120c', dot: '#140c08', brick: '#4a2a1a', block: '#3a2418', plat: '#6a4a2a' },
  territorio: { sky: ['#0e1230', '#3a2c58'], top: '#5a5060', fill: '#2e2834', dot: '#241f2a', brick: '#6a3a2a', block: '#4a3a40', plat: '#6a5a70' },
  inss: { sky: ['#20221a', '#5a5a42'], top: '#7a7a5a', fill: '#3a3a2c', dot: '#2c2c22', brick: '#5a5a44', block: '#4a4a3a', plat: '#9a9a7a' },
  praca: { sky: ['#160202', '#6a140e'], top: '#4a2a26', fill: '#2a1414', dot: '#1e0e0e', brick: '#4a2020', block: '#3a1c1c', plat: '#7a3a30' }
};

const t = (n: number) => TX[String(n)];

export const LEVELS2: LevelDef2[] = [
  {
    id: 'busao', n: 1, name: t(1).nome, area: t(1).area, hero: 'jessica', theme: 'busao', w: 164, rows: 12, arenaX: 126, boss: 'relogio', cut: 'busao', music: 'busao',
    src: ['pec6x1', 'met6x1', 'datafolha', 'dieese'], deathHead: 'Banco de horas zerado!', deathSub: 'Seu 13º virou 13 reais.',
    make(b) {
      b.g(0, 31); b.relogio(18, 14, 28); b.col(30, 7, 9, 'X'); b.e('walk', 12, 9, { skin: 'gerente', vx: -0.4 }); b.e('walk', 24, 9, { skin: 'gerente', vx: 0.4 });
      b.bus(31, 41, 0.7);
      b.g(42, 77); b.relogio(56, 50, 72); b.col(74, 7, 9, 'X'); b.p(61, 7, 4); b.e('walk', 47, 9, { skin: 'gerente', vx: -0.45 }); b.e('walk', 66, 9, { skin: 'gerente', vx: 0.45 });
      b.bus(77, 88, 0.9);
      b.g(89, 125); b.relogio(102, 96, 116); b.col(118, 7, 9, 'X'); b.p(108, 7, 4); b.e('walk', 93, 9, { skin: 'gerente', vx: -0.5 }); b.e('walk', 110, 9, { skin: 'gerente', vx: 0.5 }); b.e('walk', 122, 9, { skin: 'gerente', vx: -0.5 });
      b.sign(6, 'PEC DO HORÁRIO FLEXÍVEL', 'assinada por Flávio Bolsonaro');
      b.sign(52, '71% QUEREM O FIM DA 6X1', 'Flávio, não.');
      b.sign(96, 'SALÁRIO MÍNIMO COM BOLSONARO', 'sem aumento real');
      b.g(126, 163);
    }
  },
  {
    id: 'feira', n: 2, name: t(2).nome, area: t(2).area, hero: 'neide', theme: 'feira', w: 156, rows: 12, arenaX: 118, boss: 'taxador', cut: 'feira', music: 'feira',
    src: ['ustr', 'istoepix', 'reuterspix', 'thanks', 'cesta'], deathHead: 'Pix taxado!', deathSub: 'Essa transação custou um pastel.',
    make(b) {
      b.g(0, 42); b.p(11, 7, 4); b.p(30, 7, 4); b.e('walk', 25, 9, { skin: 'maqui', vx: -0.45 }); b.e('walk', 38, 9, { skin: 'maqui', vx: 0.45 });
      b.g(46, 82); b.p(52, 7, 4); b.p(68, 7, 4); b.e('walk', 58, 9, { skin: 'maqui', vx: -0.5 }); b.e('walk', 76, 9, { skin: 'maqui', vx: 0.5 });
      b.g(86, 155); b.p(94, 7, 4); b.e('walk', 100, 9, { skin: 'maqui', vx: -0.5 }); b.e('walk', 108, 9, { skin: 'maqui', vx: 0.5 });
      for (const x of [8, 19, 34, 50, 62, 74, 90, 104]) b.cliente(x);
      b.sign(16, 'CESTA 76% MAIS CARA', 'COM BOLSONARO');
      b.sign(60, 'RÁDIO DA FEIRA', 'Flávio manda relatório de 86 páginas para Trump');
      b.sign(98, 'ACEITAMOS PIX', 'por enquanto');
    }
  },
  {
    id: 'postinho', n: 3, name: t(3).nome, area: t(3).area, hero: 'cida', theme: 'postinho', w: 34, rows: 64, arenaX: 0, boss: 'tesourao', cut: 'postinho', music: 'postinho',
    src: ['farmacia', 'folhapisos', 'cnnpec', 'absorv'], deathHead: 'Remédio esgotado.', deathSub: 'Volte com R$ 89,90.',
    make(b) {
      const R = 64;
      b.g(0, 33, R - 2);
      b.col(0, 0, R - 1, 'X'); b.col(33, 0, R - 1, 'X');
      const xs = [3, 12, 21, 12];
      let k = 0;
      for (let y = R - 5; y >= 14; y -= 3, k++) {
        const x = xs[k % xs.length] + (k % 8 >= 4 ? 1 : 0);
        b.p(x, y, 8);
        if (k % 2 === 0) b.coin(x + 3, y - 1, 2);
      }
      b.p(11, 11, 11, '^');
      // arena do Tesourão (topo): plataformas que podem ser cortadas
      for (const [x, y, n] of [[2, 9, 5], [9, 9, 5], [20, 9, 5], [27, 9, 5], [5, 6, 5], [24, 6, 5]]) b.p(x, y, n, '=');
      b.sign(4, 'FARMÁCIA POPULAR', 'Bolsonaro propôs cortar 59%', R - 7);
    }
  },
  {
    id: 'fumaca', n: 4, name: t(4).nome, area: t(4).area, hero: 'raimundo', theme: 'fumaca', w: 160, rows: 12, arenaX: 124, boss: 'licenciador', cut: 'fumaca', music: 'fumaca',
    src: ['oeco', 'boiada', 'pl2159', 'amarras'], deathHead: 'Licença aprovada por decurso de prazo.', deathSub: 'Mais uma árvore no chão.',
    make(b) {
      b.g(0, 159);
      for (let x = 7; x < 118; x += 9) b.p(x, 7, 4);
      for (const x of [9, 26, 44, 62, 80, 98, 112]) b.muda(x + 1, 6);
      for (const x of [16, 40, 64, 88, 106]) b.clareira(x);
      for (const x of [22, 50, 74, 96]) b.e('fogo', x, 9, { w: 12, h: 14, vx: 0 });
      for (const x of [34, 58, 84, 116]) b.e('walk', x, 9, { skin: 'serra', vx: -0.5, popTxt: 'SERRA DESLIGADA' });
      b.sign(3, 'VAMOS ACABAR COM AS AMARRAS AMBIENTAIS', '— Flávio');
      b.sign(70, 'DESMATAMENTO +60%', 'COM BOLSONARO');
    }
  },
  {
    id: 'territorio', n: 5, name: t(5).nome, area: t(5).area, hero: 'kaua', theme: 'territorio', w: 162, rows: 12, arenaX: 126, boss: 'capitao', cut: 'territorio', music: 'territorio',
    src: ['milicia2007', 'medalha', 'marielle', 'emenda', 'cac', 'mjsp'], deathHead: 'Taxa de proteção vencida.', deathSub: 'A milícia mandou lembranças.',
    make(b) {
      b.g(0, 161);
      for (const x of [9, 19, 29, 40, 51, 62, 73, 84, 95, 106, 116]) b.cover(x, hr(x) > 0.5 ? 'caixa' : 'muro');
      for (const x of [15, 38, 60, 82, 104]) b.porta(x);
      for (const [x0, x1] of [[12, 26], [32, 47], [54, 70], [76, 92], [98, 114]]) b.cobrador(x0, x1);
      b.sign(44, 'COMISSÃO DE SEGURANÇA', 'Flávio faltou a 72% das sessões');
      b.sign(88, 'CAC', '1 milhão de armas com Bolsonaro');
    }
  },
  {
    id: 'inss', n: 6, name: t(6).nome, area: t(6).area, hero: 'arlindo', theme: 'inss', w: 156, rows: 12, arenaX: 118, boss: 'calculadora', cut: 'inss', music: 'inss',
    src: ['folhapisos', 'bijos', 'reforma', 'careca', 'cgu'], deathHead: 'Benefício desvinculado.', deathSub: 'Desconto não autorizado: -R$ 45,00.',
    make(b) {
      b.g(0, 28); b.p(10, 7, 3); b.p(20, 6, 3);
      b.g(32, 58); b.p(40, 7, 3); b.p(50, 7, 3);
      b.g(62, 88); b.p(70, 7, 3); b.p(80, 6, 3);
      b.g(92, 155); b.p(100, 7, 3); b.p(108, 7, 3);
      for (const x of [14, 44, 74, 104]) b.e('walk', x, 9, { skin: 'senha', vx: -0.35 });
      b.sign(24, 'SALA DO CARECA', 'empresa de Flávio + 16 empresas do Careca do INSS');
      b.sign(84, 'FILA PREFERENCIAL', 'senha 999');
    }
  },
  {
    id: 'praca', n: 7, name: t(7).nome, area: t(7).area, hero: 'pick', theme: 'praca', w: 108, rows: 12, arenaX: 70, boss: 'flavio', cut: 'praca', music: 'praca',
    src: ['anistia', 'indulto', 'stf', 'constituicao'], deathHead: 'Constituição queimada.', deathSub: 'Tente de novo: ela ainda pode ser salva.',
    make(b) {
      b.g(0, 107); b.p(18, 7, 4); b.p(34, 7, 4); b.p(50, 7, 4);
      b.sign(8, 'MUDAR A CONSTITUIÇÃO', '— Flávio, 06/10/2026');
      // arena: três plataformas
      b.p(74, 7, 4); b.p(83, 5, 4); b.p(92, 7, 4);
    }
  }
];

export function build2(D: LevelDef2): LevelData2 {
  const w = D.w, R = D.rows;
  const g: string[][] = [...Array(R)].map(() => Array(w).fill(' '));
  const L: LevelData2 = { w, rows: R, g, ents: [], start: { x: 2 * TS, y: (R - 4) * TS }, arenaX: D.arenaX };
  const gy = R - 2;
  const b = {
    g(x0: number, x1: number, top = gy) { for (let x = x0; x <= x1; x++) for (let y = top; y < R; y++) g[y][x] = '#'; },
    p(x: number, y: number, n: number, c = '-') { for (let i = 0; i < n; i++) g[y][x + i] = c; },
    t(x: number, y: number, c: string) { g[y][x] = c; },
    col(x: number, y0: number, y1: number, c: string) { for (let y = y0; y <= y1; y++) g[y][x] = c; },
    coin(x: number, y: number, n = 1) { for (let i = 0; i < n; i++) L.ents.push({ k: 'coin', x: (x + i) * TS + 3, y: y * TS + 4, w: 10, h: 12 }); },
    e(k: string, x: number, y: number, o: any = {}) { L.ents.push(Object.assign({ k, x: x * TS + 1, y: y * TS, w: 14, h: 14, vx: -0.5, vy: 0, ph: Math.floor(hr(x) * 70) }, o)); },
    sign(x: number, a: string, s: string, y = gy) { L.ents.push({ k: 'sign', x: x * TS, y: y * TS, w: 0, h: 0, a, s, bg: true }); },
    relogio(x: number, x0: number, x1: number) { L.ents.push({ k: 'relogio', x: x * TS, y: gy * TS - 26, w: 14, h: 26, xmin: x0 * TS, xmax: x1 * TS + 1, vx: 0 }); },
    bus(x0: number, x1: number, sp: number) { L.ents.push({ k: 'bus', x: x0 * TS, y: gy * TS - 6, w: 56, h: 30, x0: x0 * TS, x1: x1 * TS - 56 + 16, vx: sp, plat: true }); },
    cliente(x: number) { L.ents.push({ k: 'cliente', x: x * TS, y: gy * TS - 22, w: 12, h: 22, vx: hr(x) > 0.5 ? 0.3 : -0.3, vy: 0, taxed: false, ph: Math.floor(hr(x * 3) * 99) }); },
    muda(x: number, y: number) { L.ents.push({ k: 'muda', x: x * TS + 3, y: y * TS + 2, w: 10, h: 14 }); },
    clareira(x: number) { L.ents.push({ k: 'clareira', x: x * TS, y: gy * TS - 4, w: 32, h: 4, planted: false, bg: true }); },
    cover(x: number, kind: string) { L.ents.push({ k: 'cover', x: x * TS, y: gy * TS - 24, w: 20, h: 24, kind, bg: true }); },
    porta(x: number) { L.ents.push({ k: 'porta', x: x * TS, y: gy * TS - 30, w: 18, h: 30, done: false, bg: true }); },
    cobrador(x0: number, x1: number) { L.ents.push({ k: 'cobrador', x: ((x0 + x1) / 2) * TS, y: gy * TS - 20, w: 12, h: 20, xmin: x0 * TS, xmax: x1 * TS, vx: 0.45 }); }
  };
  D.make(b);
  return L;
}
