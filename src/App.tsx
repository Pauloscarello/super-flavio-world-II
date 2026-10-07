import { useEffect, useState } from 'react';
import Game1 from './v1/Game1.tsx';
import Game2 from './v2/Game2.tsx';

// Tela inicial: escolha do cartucho. O I abre o jogo original; o II abre O Brasil sob Flávio.
export default function App() {
  const [game, setGame] = useState<0 | 1 | 2>(() => {
    const h = window.location.hash;
    return h === '#1' ? 1 : h === '#2' ? 2 : 0;
  });
  const [sel, setSel] = useState(1); // o II vem selecionado
  let zeroDone = false;
  try { zeroDone = parseInt(localStorage.getItem('sfw-done') || '0', 10) === 127; } catch (_) {}

  const open = (n: 1 | 2) => {
    try { history.replaceState(null, '', '#' + n); } catch (_) {}
    setGame(n);
  };
  const exit = () => {
    try { history.replaceState(null, '', window.location.pathname); } catch (_) {}
    document.documentElement.classList.remove('txt-open');
    setGame(0);
  };

  useEffect(() => {
    if (game) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') { setSel(0); e.preventDefault(); }
      else if (e.code === 'ArrowRight') { setSel(1); e.preventDefault(); }
      else if (e.code === 'KeyZ' || e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); open(sel === 0 ? 1 : 2); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [game, sel]);

  if (game === 1) return <Game1 key="g1" onExit={exit} />;
  if (game === 2) return <Game2 key="g2" onExit={exit} />;

  return (
    <div className="carts px">
      <h1>Escolha o cartucho</h1>
      <div className="cart-row">
        <button className={'cart c1' + (sel === 0 ? ' on' : '')} onMouseEnter={() => setSel(0)} onClick={() => open(1)}>
          <span className="shell"><span className="lbl">
            <span className="cs">Super</span>
            <span className="cf">Flávio</span>
            <span className="cw">World</span>
            <span className="ct">A ficha corrida<br />2000–2026</span>
          </span></span>
          {zeroDone && <span className="seal">Zerado</span>}
        </button>
        <button className={'cart c2' + (sel === 1 ? ' on' : '')} onMouseEnter={() => setSel(1)} onClick={() => open(2)}>
          <span className="shell"><span className="lbl">
            <span className="cs">Super</span>
            <span className="cf">Flávio</span>
            <span className="cw">World II</span>
            <span className="ct">O Brasil sob Flávio<br />2027–?</span>
          </span></span>
          <span className="seal new">Novo</span>
        </button>
      </div>
      <p className="hint">◀ ▶ escolhe · Z ou toque para jogar</p>
      <p className="disc2">Paródia baseada em fatos reais. Fontes checadas e exibidas após cada fase.</p>
    </div>
  );
}
