import { useEffect } from 'react';

export default function WinCelebrationOverlay({ onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 8000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-[49] backdrop-blur-sm flex items-center justify-center cursor-pointer"
      style={{ backgroundColor: 'rgba(0,0,0,0.82)' }}
      onClick={onDismiss}
    >
      <div className="text-center select-none" onClick={e => e.stopPropagation()}>
        <div className="text-8xl mb-4" style={{ animation: 'bounce 1s infinite' }}>🏆</div>
        <h1 className="text-5xl font-extrabold text-yellow-400 mb-3 drop-shadow-lg">¡Felicidades!</h1>
        <p className="text-xl text-white/80 mb-6">¡Has ganado el torneo!</p>
        <div className="flex justify-center gap-6 text-5xl">
          <span style={{ display: 'inline-block', animation: 'bounce 1s infinite 0.1s' }}>🎉</span>
          <span style={{ display: 'inline-block', animation: 'bounce 1s infinite 0.3s' }}>⭐</span>
          <span style={{ display: 'inline-block', animation: 'bounce 1s infinite 0.5s' }}>🎊</span>
        </div>
        <p className="text-gray-400 text-sm mt-8">Haz clic en cualquier lugar para continuar</p>
      </div>
    </div>
  );
}
