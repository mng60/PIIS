import http from 'node:http';
import https from 'node:https';

function buildResponse(status, statusText, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    text: async () => body,
    json: async () => JSON.parse(body),
  };
}

export async function fetchCompat(url, options = {}) {
  const { timeoutMs, ...rest } = options;

  if (typeof globalThis.fetch === 'function') {
    const fetchOptions = { ...rest };
    if (!fetchOptions.signal && timeoutMs) {
      fetchOptions.signal = AbortSignal.timeout(timeoutMs);
    }
    return globalThis.fetch(url, fetchOptions);
  }

  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const client = target.protocol === 'https:' ? https : http;
    const req = client.request(
      target,
      {
        method: rest.method || 'GET',
        headers: rest.headers || {},
      },
      (res) => {
        const chunks = [];

        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          resolve(buildResponse(res.statusCode || 0, res.statusMessage || '', body));
        });
      }
    );

    req.on('error', reject);

    if (timeoutMs) {
      req.setTimeout(timeoutMs, () => {
        req.destroy(new Error(`Request timeout after ${timeoutMs}ms`));
      });
    }

    if (rest.signal) {
      if (rest.signal.aborted) {
        req.destroy(new Error('Request aborted'));
      } else {
        rest.signal.addEventListener('abort', () => {
          req.destroy(new Error('Request aborted'));
        }, { once: true });
      }
    }

    if (rest.body) {
      req.write(rest.body);
    }

    req.end();
  });
}
