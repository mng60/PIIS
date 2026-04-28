import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const DIFFICULTY_CONFIG = {
  1: { skillLevel: 0,  movetime: 200  }, // Principiante
  2: { skillLevel: 8,  movetime: 500  }, // Intermedio
  3: { skillLevel: 15, movetime: 1000 }, // Avanzado
  4: { skillLevel: 20, movetime: 2000 }, // Maestro
};

class StockfishService {
  constructor() {
    this._resolve = null;
    this._lines = [];
    this._doneWhen = null;
    this._pending = null;
    this._engine = null;
    this._available = false;
    this._init();
  }

  _init() {
    try {
      const Stockfish = require('stockfish');
      this._engine = Stockfish();
      this._engine.onmessage = (ev) => {
        const line = typeof ev === 'string' ? ev : String(ev?.data ?? ev ?? '');
        if (!this._resolve) return;
        this._lines.push(line);
        if (this._doneWhen(line)) {
          const r = this._resolve;
          const l = this._lines.slice();
          this._resolve = null;
          this._lines = [];
          this._doneWhen = null;
          r(l);
        }
      };
      this._engine.postMessage('uci');
      this._engine.postMessage('setoption name Hash value 16');
      this._engine.postMessage('isready');
      this._available = true;
    } catch (e) {
      console.error('[Stockfish] Init failed:', e.message);
      this._available = false;
    }
  }

  _send(commands, doneWhen) {
    if (!this._available || !this._engine) {
      return Promise.reject(new Error('Stockfish no disponible'));
    }
    const prev = this._pending ?? Promise.resolve();
    const next = prev.then(() =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          if (this._resolve) {
            this._resolve = null;
            this._lines = [];
            this._doneWhen = null;
          }
          reject(new Error('Stockfish timeout'));
        }, 15000);

        this._lines = [];
        this._doneWhen = doneWhen;
        this._resolve = (lines) => { clearTimeout(timer); resolve(lines); };
        for (const cmd of commands) this._engine.postMessage(cmd);
      })
    );
    this._pending = next.catch(() => {});
    return next;
  }

  async getBestMove(fen, difficulty = 2) {
    const cfg = DIFFICULTY_CONFIG[difficulty] ?? DIFFICULTY_CONFIG[2];
    const lines = await this._send(
      [
        'setoption name UCI_LimitStrength value false',
        `setoption name Skill Level value ${cfg.skillLevel}`,
        'ucinewgame',
        `position fen ${fen}`,
        `go movetime ${cfg.movetime}`,
      ],
      (line) => line.startsWith('bestmove')
    );
    const bl = lines.find(l => l.startsWith('bestmove'));
    if (!bl) return null;
    const move = bl.split(' ')[1];
    return move === '(none)' ? null : move;
  }

  async evaluatePosition(fen) {
    const lines = await this._send(
      [
        'setoption name UCI_LimitStrength value false',
        'setoption name Skill Level value 20',
        `position fen ${fen}`,
        'go depth 10',
      ],
      (line) => line.startsWith('bestmove')
    );
    let cp = null;
    let mate = null;
    for (const line of lines) {
      if (line.includes('score cp')) {
        const m = line.match(/score cp (-?\d+)/);
        if (m) cp = parseInt(m[1]);
      }
      if (line.includes('score mate')) {
        const m = line.match(/score mate (-?\d+)/);
        if (m) mate = parseInt(m[1]);
      }
    }
    if (mate !== null) return mate > 0 ? 9999 : -9999;
    return cp ?? 0;
  }

  get isAvailable() { return this._available; }
}

export default new StockfishService();
