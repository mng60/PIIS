import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';

const isWindows = process.platform === 'win32';

function runCommand(command, args, cwd, name) {
  const child = spawn(command, args, {
    cwd,
    shell: isWindows,
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

const rootDir = process.cwd();
const serverDir = new URL('../server/', import.meta.url);
const children = [];

if (!(await isPortFree(3001))) {
  console.error('Port 3001 is already in use. Stop the old API process or free that port before running `npm run dev:full`.');
  process.exit(1);
}

children.push(runCommand('npm', ['run', 'dev'], serverDir, 'api'));
children.push(runCommand('npm', ['run', 'dev'], rootDir, 'web'));

function shutdown(signal) {
  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
