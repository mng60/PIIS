import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const DIFFICULTY_CONFIG = {
  1: { skillLevel: 0,  movetime: 300  }, // Principiante
  2: { skillLevel: 8,  movetime: 600  }, // Intermedio
  3: { skillLevel: 15, movetime: 1200 }, // Avanzado
  4: { skillLevel: 20, movetime: 2500 }, // Maestro
};

class StockfishService {
  constructor() {
    this._engine = null;
    this._resolve = null;
    this._lines = [];
    this._doneWhen = null;
    this._pending = Promise.resolve();
    this._available = false;
    this._readyPromise = new Promise(res => { this._resolveReady = res; });
    this._init();
  }

  _handleLine(line) {
    if (!line) return;

    if (!this._available && line === 'readyok') {
      this._available = true;
      this._resolveReady(true);
      console.log('[Stockfish] Engine ready');
    }

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
  }

  _init() {
    try {
      const initEngine = require('stockfish');

      // Callback form: devuelve el objeto engine ANTES de que cargue el WASM.
      // Esto nos permite asignar engine.print antes de que Emscripten lo capture.
      const engineRef = initEngine('lite-single', (err, engine) => {
        if (err) {
          console.error('[Stockfish] Init error:', err);
          this._resolveReady(false);
          return;
        }
        this._engine = engine;
        engine.sendCommand('uci');
        engine.sendCommand('setoption name Hash value 16');
        engine.sendCommand('isready');
      });

      // WASM overrides engine.print to call engine.listener; assign listener, not print.
      engineRef.listener = (line) => this._handleLine(line);

    } catch (e) {
      console.error('[Stockfish] Init failed:', e.message);
      this._resolveReady(false);
    }
  }

  async waitUntilReady(timeoutMs = 12000) {
    return Promise.race([
      this._readyPromise,
      new Promise(res => setTimeout(() => res(false), timeoutMs)),
    ]);
  }

  _send(commands, doneWhen) {
    if (!this._available || !this._engine) {
      return Promise.reject(new Error('Stockfish no disponible'));
    }
    const prev = this._pending;
    const task = prev.then(() =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          this._resolve = null;
          this._lines = [];
          this._doneWhen = null;
          reject(new Error('Stockfish timeout'));
        }, 20000);

        this._lines = [];
        this._doneWhen = doneWhen;
        this._resolve = (lines) => { clearTimeout(timer); resolve(lines); };
        for (const cmd of commands) this._engine.sendCommand(cmd);
      })
    );
    this._pending = task.catch(() => {});
    return task;
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
      const cpM = line.match(/score cp (-?\d+)/);
      if (cpM) cp = parseInt(cpM[1]);
      const mateM = line.match(/score mate (-?\d+)/);
      if (mateM) mate = parseInt(mateM[1]);
    }
    if (mate !== null) return mate > 0 ? 9999 : -9999;
    return cp ?? 0;
  }

  get isAvailable() { return this._available; }
}

export default new StockfishService();
