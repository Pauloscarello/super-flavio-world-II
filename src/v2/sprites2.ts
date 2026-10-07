// Sprites da v2: os brasileiros jogáveis (cores vivas) e os vilões (paleta escura).
// Cada sprite é desenhado a partir de linhas de caracteres; cada caractere é uma cor da paleta.

export type Frames = { stand: HTMLCanvasElement[]; walk: HTMLCanvasElement[]; jump: HTMLCanvasElement[]; hide?: HTMLCanvasElement[] };

export function mk(rows: string[], pal: Record<string, string>, flip = false): HTMLCanvasElement {
  const w = Math.max(...rows.map(r => r.length));
  const h = rows.length;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d')!;
  rows.forEach((r, j) => {
    for (let i = 0; i < r.length; i++) {
      const ch = r[i];
      if (ch && pal[ch]) { x.fillStyle = pal[ch]; x.fillRect(flip ? w - 1 - i : i, j, 1, 1); }
    }
  });
  return c;
}

const LEGS: Record<string, string[]> = {
  stand: ['...kbbbbbbbk..', '...kbbbkbbbk..', '...kffk.kffk..', '..kkkkk.kkkkk.'],
  walk: ['...kbbbbbbbk..', '..kbbbk.kbbbk.', '..kffk...kffk.', '.kkkk.....kkkk'],
  jump: ['...kbbbbbbbbk.', '..kbbbk..kbbbk', '..kffk....kffk', '.kkkk......kkk']
};
const SKIRT: Record<string, string[]> = {
  stand: ['..kbbbbbbbbbk.', '...ksk..ksk...', '...kfk..kfk...', '..kkkk..kkkk..'],
  walk: ['..kbbbbbbbbbk.', '..ksk....ksk..', '..kfk....kfk..', '.kkkk....kkkk.'],
  jump: ['..kbbbbbbbbbk.', '..ksk.....ksk.', '..kfk.....kfk.', '.kkk.......kkk']
};

const BASE: Record<string, string> = { k: '#120c18', r: '#9b3b35', f: '#2a2230' };

// Jéssica, 27, atendente de supermercado: rabo de cavalo, uniforme vermelho com crachá
const JESS = [
  '....kkkkkk....', '...khhhhhhk...', '..khhhhhhhhkkk', '..khhssssshkhk', '..khsskssksk.k',
  '..khsskssksk..', '..kSssssssk...', '..kSssrrssk...', '...kssssssk...', '....kssssk....',
  '...kyyyyyyk...', '..kyywwyyyyk..', '.kyyyyyyyyyyk.', '.ksyyyyyyyyysk', '.kssyyyyyyyssk', '..kkyyyyyyykk.'
];
// Dona Neide, 58, pasteleira: coque, avental branco sobre blusa estampada
const NEIDE = [
  '.....kkkk.....', '....khhhhk....', '...kkhhhhkk...', '..khhhhhhhhk..', '..khssssssshk.',
  '..khsksssksk..', '..kSssssssssk.', '..kSssrrrsssk.', '...kssssssk...', '....kssssk....',
  '...kgggggggk..', '..kgwwwwwwwgk.', '.kggwwwwwwwggk', '.ksgwwwwwwwgsk', '.kssgwwwwwgssk', '..kkwwwwwwwkk.'
];
// Dona Cida, 71: cabelo branco, óculos, blusa lilás
const CIDA = [
  '....kkkkkk....', '...khhhhhhk...', '..khhhhhhhhk..', '.khhhhhhhhhhk.', '.khhssssssshk.',
  '..khkkskkkskk.', '..kSkwskkwsk..', '..kSssssssssk.', '...kssrrsssk..', '....kssssk....',
  '...kyyyyyyyk..', '..kyyyyyyyyyk.', '.kyyyyyyyyyyyk', '.ksyyyyyyyyysk', '.kssyyyyyyyssk', '..kkyyyyyyykk.'
];
// Raimundo, 34, brigadista: capacete amarelo, farda laranja
const RAIM = [
  '....kkkkkk....', '...kgggggggk..', '..kgggggggggk.', '.kkkkkkkkkkkkk', '..khhsssssssk.',
  '..khsskssksk..', '..kSssssssssk.', '..kSssrrrsssk.', '...kssssssk...', '....kssssk....',
  '...kyyyyyyyk..', '..kyywyyywyyk.', '.kyyyyyyyyyyyk', '.ksywwwwwwwysk', '.kssyyyyyyyssk', '..kkyyyyyyykk.'
];
// Kauã, 19, entregador de delivery: boné, moletom escuro e a bag vermelha nas costas
const KAUA = [
  '....kkkkkk....', '...kgggggggk..', '..kgggggggggkk', '..khhssssssk..', '..khsskssksk..',
  '..kSsskssksk..', '..kSssssssssk.', '...kssrrssk...', '...kssssssk...', 'kkkkkssssk....',
  'kwwwkyyyyyyk..', 'kwwwkyyyyyyyk.', 'kwgwkyyyyyyyyk', 'kwwwkyyyyyyysk', 'kwwwkyyyyyyssk', 'kkkkkyyyyyykk.'
];
// Seu Arlindo, 66: careca com cabelo branco dos lados, óculos, cardigã bege
const ARL = [
  '....kkkkkk....', '...ksssssssk..', '..khssssssshk.', '..khssssssshk.', '..khssssssshk.',
  '..khkkskkkskk.', '..kSkwskkwsk..', '..kSssssssssk.', '...kssrrsssk..', '....kssssk....',
  '...kyyyyyyyk..', '..kyygwwgyyyk.', '.kyyyyyyyyyyyk', '.ksyyyyyyyyysk', '.kssyyyyyyyssk', '..kkyyyyyyykk.'
];

export const HEROES: Record<string, { name: string; top: string[]; pal: Record<string, string>; skirt?: boolean }> = {
  jessica: { name: 'Jéssica', top: JESS, pal: { h: '#2b1a12', s: '#c98b62', S: '#a86e4a', y: '#1f9a4a', g: '#1f9a4a', w: '#ffffff', b: '#2a2f4a' } },
  // a mesma Jéssica na fase final, de camiseta amarela
  jessica7: { name: 'Jéssica', top: JESS, pal: { h: '#2b1a12', s: '#c98b62', S: '#a86e4a', y: '#f2c81f', g: '#f2c81f', w: '#1f9a4a', b: '#2a2f4a' } },
  neide: { name: 'Dona Neide', top: NEIDE, pal: { h: '#6d6460', s: '#9a6440', S: '#7d4f30', y: '#e05a8a', g: '#ff9a3c', w: '#fbfbf6', b: '#3a5aa8' }, skirt: true },
  cida: { name: 'Dona Cida', top: CIDA, pal: { h: '#f2f2f2', s: '#f0c39c', S: '#d6a27c', y: '#b07ad8', g: '#b07ad8', w: '#cfe8ff', b: '#4a3a6a' }, skirt: true },
  raimundo: { name: 'Raimundo', top: RAIM, pal: { h: '#1e1410', s: '#8a5a36', S: '#6e4426', y: '#ff7a1a', g: '#ffd21f', w: '#f4f4f4', b: '#4a3a24' } },
  kaua: { name: 'Kauã', top: KAUA, pal: { h: '#140c08', s: '#8a5a36', S: '#6b4024', y: '#4a5a7a', g: '#e8412c', w: '#e8412c', b: '#20304a' } },
  arlindo: { name: 'Seu Arlindo', top: ARL, pal: { h: '#e6e6e6', s: '#e6b08a', S: '#c8906a', y: '#c9b48a', g: '#8a6a40', w: '#f4f4f4', b: '#5a5a62' } }
};

export function heroFrames(id: string): Frames {
  const H = HEROES[id];
  const pal = Object.assign({}, BASE, H.pal);
  const legs = H.skirt ? SKIRT : LEGS;
  const out: any = {};
  for (const f of ['stand', 'walk', 'jump'] as const) {
    out[f] = [mk(H.top.concat(legs[f]), pal, false), mk(H.top.concat(legs[f]), pal, true)];
  }
  // agachado (escondido): só a parte de cima, mais escura
  const dark = Object.assign({}, pal);
  for (const k in dark) if (k !== 'k') dark[k] = shade(dark[k], 0.45);
  const crouch = H.top.slice(0, 16).concat(['..kkkkkkkkkk..']);
  out.hide = [mk(crouch, dark, false), mk(crouch, dark, true)];
  return out as Frames;
}

export function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * k), g = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// ---------------- Vilões ----------------

// Flávio presidente: a versão corrompida do Flavinho da v1. Mais largo, sobrancelha franzida,
// sorriso torto, terno escuro e faixa presidencial verde e amarela.
const FLAVIO_TOP = [
  '......kkkkkk......', '....kkhhhhhhkk....', '...khhhhhhhhhhk...', '..khhhhhhhhhhhhk..', '..khhssssssssshk..',
  '..khkkkssssskkkk..', '..kSskksssssskksk.', '..kSsskssssskssk..', '..kSsssssssssssk..', '...kssrrrrrrrssk..',
  '...ksssswwwrrssk..', '....kssssssssk....', '...kddddwwddddk...', '..kdddyywwddddddk.', '.kdddddyygdddddddk', '.kdddddddyggdddddk',
  '.ksddddddddyygddsk', '.kssddddddddyggssk', '..kkddddddddddykk.', '...kddddddddddk...'
];
const FLAVIO_LEGS: Record<string, string[]> = {
  stand: ['...kddddkddddk....', '...kddddkddddk....', '...kffffkffffk....', '..kkkkkk.kkkkkk...'],
  walk: ['...kdddk..kdddk...', '..kdddk....kdddk..', '..kfffk....kfffk..', '.kkkkk......kkkkk.'],
  jump: ['..kdddk....kdddk..', '.kdddk......kdddk.', '.kfffk......kfffk.', 'kkkk..........kkkk']
};
const FLAVIO_PAL = { k: '#0c0a10', h: '#3a2614', s: '#e7b088', S: '#c68b64', r: '#6a1e1e', w: '#f4f0e0', d: '#24301a', y: '#ffd21f', g: '#169c3c', f: '#121212' };

// O pai: cabelo grisalho, uniforme de presidiário listrado preto e branco
const PAI_TOP = [
  '....kkkkkk....', '...khhhhhhk...', '..khhhhhhhhk..', '..khsssssshk..', '..khsksssksk..',
  '..kSsssssssk..', '..kSsrrrrrsk..', '...kssssssk...', '....kssssk....', '...kwwwwwwk...',
  '..kddddddddk..', '.kwwwwwwwwwwk.', '.kddddddddddk.', '.swwwwwwwwwws.', '.kddddddddddk.', '..kwwwwwwwwk..'
];
const PAI_LEGS = ['...kddddddk...', '...kwwkkwwk...', '...kddk.kddk..', '..kkkkk.kkkkk.'];
const PAI_PAL = { k: '#0c0a10', h: '#b8b4ae', s: '#f0c49c', S: '#d4a07a', r: '#8a3a30', w: '#f2f2f2', d: '#1a1a1a' };

// O Banqueiro: topete alto, cabelo comprido até a nuca, óculos escuros, terno azul, camisa branca
const BANQ_TOP = [
  '...kkkkkkkk...', '..khhhhhhhhkk.', '.khhhhhhhhhhhk', '.khhhsssssshhk', '.khhgggkgggshk',
  '.khhsssssssshk', '.khhSssrrrsshk', '..khkssssssk..', '....kssssk....', '...kddwwddk...',
  '..kdddwwdddk..', '.kddddwwddddk.', '.kddddyddddk..', '.ksdddddddddsk', '.kssddddddddsk', '..kkddddddkk..'
];
const BANQ_LEGS = ['...kddddddk...', '...kdddkdddk..', '...kffk.kffk..', '..kkkkk.kkkkk.'];
const BANQ_PAL = { k: '#0c0a10', g: '#08080c', h: '#2a1a10', s: '#f0c8a0', S: '#d2a47e', r: '#8a3a30', w: '#f4f4f4', d: '#1d2c5a', y: '#c0c8d8', f: '#111' };

export type Villains = { flavio: Frames; pai: HTMLCanvasElement[]; banq: HTMLCanvasElement[] };
export function villainFrames(): Villains {
  const fl: any = {};
  for (const f of ['stand', 'walk', 'jump'] as const) fl[f] = [mk(FLAVIO_TOP.concat(FLAVIO_LEGS[f]), FLAVIO_PAL), mk(FLAVIO_TOP.concat(FLAVIO_LEGS[f]), FLAVIO_PAL, true)];
  return {
    flavio: fl,
    pai: [mk(PAI_TOP.concat(PAI_LEGS), PAI_PAL), mk(PAI_TOP.concat(PAI_LEGS), PAI_PAL, true)],
    banq: [mk(BANQ_TOP.concat(BANQ_LEGS), BANQ_PAL), mk(BANQ_TOP.concat(BANQ_LEGS), BANQ_PAL, true)]
  };
}
