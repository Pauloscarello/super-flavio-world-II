# Super Flávio World I e II

Ao abrir o jogo, o jogador escolhe o cartucho:

- **Super Flávio World** — o jogo original (v1), sem mudanças no conteúdo. Ganhou só o link "trocar cartucho" na tela de título.
- **Super Flávio World II · O Brasil sob Flávio** — a nova versão (Trilha B).

Links diretos: `…/#1` abre a v1 e `…/#2` abre a v2.

## Como rodar

```
npm install
npm run dev      # servidor local em http://localhost:3000
npm run build    # gera a pasta dist/ para publicar
```

Versão em arquivo único (abre direto no navegador, sem servidor):

```
npx vite build -c vite.single.config.ts   # gera dist-arquivo-unico/index.html
```

A pasta `dist-arquivo-unico/` já vem com uma versão pronta para testar.

## Onde está cada coisa

| Arquivo | O que tem |
|---|---|
| `src/App.tsx` | Tela de escolha do cartucho |
| `src/v1/Game1.tsx` + `src/game/*` | Jogo original (v1) |
| `src/v2/Game2.tsx` | Telas da v2 (título, seleção de personagem, urna, créditos) |
| `src/v2/engine2.ts` | Motor da v2: física, regras de cada fase, chefões, desenho, fluxo |
| `src/v2/levels2.ts` | Mapas das 7 fases e cores do "Brasil Invertido" |
| `src/v2/texts2.ts` | **Textos aprovados**: missão, vitória amarga, "O que aconteceu", placar e urna |
| `src/v2/cutscenes2.ts` | Cutscenes (prólogo + uma antes de cada fase) |
| `src/v2/sprites2.ts` | Personagens: os 6 brasileiros, o Flávio presidente, o pai e o Banqueiro |
| `src/v2/music2.ts` | Trilha sonora sombria (chiptune em tom menor, instrumento temático por fase) |
| `src/v2/sources2.ts` | Fontes exibidas nas telas "O que aconteceu" e no placar |

Para mudar um texto, edite `src/v2/texts2.ts`. Para mudar uma fonte, `src/v2/sources2.ts`.

## Regras da v2

- Controles da v1: ← → andar, Z pular, X = a ação da fase (uma por fase). Esc pausa, M liga/desliga o som.
- Antes de cada fase, uma cutscene do Flávio (Z ou "Pular" avança).
- Todo chefão ataca num ritmo fixo e depois fica parado, piscando, por até 6 segundos. Acertou nesse intervalo, ele volta à ativa. Três acertos vencem — e a vitória é sempre amarga.
- Ao zerar as 7 fases: placar final e a urna, com o Brasil "desinvertido".
- O progresso fica salvo no navegador (`sfw2-done`), separado do da v1.

| Fase | Personagem | Ação (X) | Chefão |
|---|---|---|---|
| 1 · Busão das 5h | Jéssica | correr | O Relógio Flexível |
| 2 · A Barraca da Dona Neide | Dona Neide | arrancar adesivo de TAXA | O Taxador do Pix |
| 3 · Plantão no Postinho | Dona Cida | correr | O Tesourão |
| 4 · Fumaça | Raimundo | carimbar NEGADO (no chefão) | O Licenciador |
| 5 · Território | Kauã | esconder | O Capitão |
| 6 · A Fila do INSS | Seu Arlindo | bengalada (+ pulo duplo) | A Calculadora Desvinculadora |
| 7 · Praça dos Três Poderes | à escolha | a do personagem | Flávio |
