import http from 'http';
import https from 'https';
import { URL } from 'url';

const apiUrl = process.env.API_URL || 'http://127.0.0.1:3000';
let readinessPromise: Promise<void> | null = null;

function requestReachability(): Promise<void> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(apiUrl);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    const request = client.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: '/api/users',
        method: 'GET',
        timeout: 5000,
      },
      (response) => {
        response.resume();
        resolve();
      }
    );

    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy(new Error('Timeout while waiting for backend readiness'));
    });
    request.end();
  });
}

export async function ensureBackendReady(timeoutMs = 30000) {
  if (readinessPromise) return readinessPromise;

  readinessPromise = new Promise<void>(async (resolve, reject) => {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      try {
        await requestReachability();
        return resolve();
      } catch {
        await new Promise((resolveWait) => setTimeout(resolveWait, 1000));
      }
    }

    reject(new Error(`Backend not available at ${apiUrl} after ${timeoutMs}ms`));
  });

  return readinessPromise;
}
