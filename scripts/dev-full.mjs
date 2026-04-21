import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';

const isWindows = process.platform === 'win32';

function runCommand(command, args, cwd, name) {
  const executable = isWindows && command === 'npm' ? 'npm.cmd' : command;
  const child = spawn(executable, args, {
    cwd,
    shell: false,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: process.env,
  });

  child.stdout.on('data', chunk => process.stdout.write(`[${name}] ${chunk}`));
  child.stderr.on('data', chunk => process.stderr.write(`[${name}] ${chunk}`));

  child.on('exit', code => {
    if (code !== 0 && code !== null) {
      console.error(`[${name}] exited with code ${code}`);
    }
  });

  return child;
}

async function isPortFree(port) {
  const server = createServer();

  try {
    server.listen(port, '127.0.0.1');
    await once(server, 'listening');
    return true;
  } catch {
    return false;
  } finally {
    if (server.listening) {
      server.close();
      await once(server, 'close');
    }
  }
}

async function isApiHealthy() {
  try {
    const response = await fetch('http://localhost:3001/api/health');
    if (!response.ok) return false;
    const data = await response.json();
    return data?.ok === true;
  } catch {
    return false;
  }
}

const rootDir = process.cwd();
const serverDir = new URL('../server/', import.meta.url);
const children = [];

if (await isPortFree(3001)) {
  children.push(runCommand('npm', ['run', 'dev'], serverDir, 'api'));
} else if (await isApiHealthy()) {
  console.log('[api] Reusing existing API on http://localhost:3001');
} else {
  console.error('Port 3001 is already in use, but it is not responding as this API. Stop that process or free the port before running `npm run dev`.');
  process.exit(1);
}

children.push(runCommand('npm', ['run', 'dev:web'], rootDir, 'web'));

function shutdown(signal) {
  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
