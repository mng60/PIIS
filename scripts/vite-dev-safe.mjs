import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const originalExec = childProcess.exec;

childProcess.exec = (command, ...args) => {
  if (process.platform === 'win32' && String(command).trim().toLowerCase() === 'net use') {
    const callback = typeof args.at(-1) === 'function' ? args.at(-1) : null;
    process.nextTick(() => callback?.(null, '', ''));
    return {
      stdout: null,
      stderr: null,
      stdin: null,
      kill() {},
      on() { return this; },
      once() { return this; },
      removeListener() { return this; },
    };
  }

  return originalExec(command, ...args);
};

syncBuiltinESMExports();

await import(pathToFileURL(resolve('node_modules/vite/bin/vite.js')).href);
