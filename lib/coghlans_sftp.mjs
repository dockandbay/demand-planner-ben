// Coghlans SFTP browser — server-side helper (Ben, 2026-09-08).
// SFTP runs over SSH (TCP). Webshare gives us a STATIC-IP HTTP proxy we must egress through, so we open an
// HTTP CONNECT tunnel to the SFTP host and hand the raw socket to ssh2-sftp-client (its `sock` option).
//
// Config — all via env (Diviyaj wires the real values; NEVER commit the password):
//   COGHLANS_SFTP_HOST      default 152.67.109.140   (the SFTP server)
//   COGHLANS_SFTP_PORT      default 22
//   COGHLANS_SFTP_USER      default dok
//   COGHLANS_SFTP_PASSWORD  (required — no default; set locally in .env)
//   WEBSHARE_PROXY_HOST     default 104.165.164.165  (the static-IP HTTP proxy to egress through; blank = direct)
//   WEBSHARE_PROXY_PORT     default 80               (OPEN QUESTION — confirm Webshare's HTTP proxy port)
//   WEBSHARE_PROXY_USER / WEBSHARE_PROXY_PASSWORD    (OPEN QUESTION — Webshare proxy Basic-auth, if required)
//
// Read-only: it lists directories only (no upload/delete/rename). A single connection per request, always closed.

import http from 'http';
import net from 'net';
import SftpClient from 'ssh2-sftp-client';

export function coghlansSftpConfig() {
  return {
    host: process.env.COGHLANS_SFTP_HOST || '152.67.109.140',
    port: parseInt(process.env.COGHLANS_SFTP_PORT || '22', 10),
    user: process.env.COGHLANS_SFTP_USER || 'dok',
    password: process.env.COGHLANS_SFTP_PASSWORD || '',
    proxyHost: process.env.WEBSHARE_PROXY_HOST || '104.165.164.165',
    proxyPort: parseInt(process.env.WEBSHARE_PROXY_PORT || '80', 10),
    proxyUser: process.env.WEBSHARE_PROXY_USER || '',
    proxyPassword: process.env.WEBSHARE_PROXY_PASSWORD || '',
  };
}

// Is the browser usable? (password present at minimum.)
export function coghlansSftpReady() {
  return !!(process.env.COGHLANS_SFTP_PASSWORD || '');
}

// Open an HTTP CONNECT tunnel through the Webshare proxy to destHost:destPort → resolves a connected socket.
function proxyTunnel({ proxyHost, proxyPort, proxyUser, proxyPassword, destHost, destPort, timeoutMs = 15000 }) {
  return new Promise((resolve, reject) => {
    const headers = { Host: `${destHost}:${destPort}` };
    if (proxyUser) headers['Proxy-Authorization'] = 'Basic ' + Buffer.from(`${proxyUser}:${proxyPassword}`).toString('base64');
    const req = http.request({ host: proxyHost, port: proxyPort, method: 'CONNECT', path: `${destHost}:${destPort}`, headers, agent: false, timeout: timeoutMs });
    let settled = false;
    req.on('connect', (res, socket) => {
      settled = true;
      if (res.statusCode !== 200) { try { socket.destroy(); } catch {} reject(new Error(`Webshare proxy CONNECT failed (${res.statusCode} ${res.statusMessage || ''}). Check WEBSHARE_PROXY_PORT / proxy auth.`)); return; }
      resolve(socket);
    });
    req.on('timeout', () => { if (!settled) { settled = true; req.destroy(); reject(new Error('Webshare proxy CONNECT timed out — check WEBSHARE_PROXY_HOST/PORT.')); } });
    req.on('error', (e) => { if (!settled) { settled = true; reject(new Error('Webshare proxy connection error: ' + (e && e.message || e))); } });
    req.end();
  });
}

// Open a direct TCP socket (no proxy) — used when WEBSHARE_PROXY_HOST is blank.
function directSocket({ host, port, timeoutMs = 15000 }) {
  return new Promise((resolve, reject) => {
    const s = net.connect({ host, port });
    const to = setTimeout(() => { s.destroy(); reject(new Error('SFTP host connection timed out.')); }, timeoutMs);
    s.once('connect', () => { clearTimeout(to); resolve(s); });
    s.once('error', (e) => { clearTimeout(to); reject(new Error('SFTP host connection error: ' + (e && e.message || e))); });
  });
}

// List a directory. Returns { path, entries:[{name,type,size,modifyTime,longname}] } sorted folders-first.
// type: 'd' folder, '-' file, 'l' symlink (ssh2-sftp-client convention).
export async function coghlansSftpList(dirPath) {
  const cfg = coghlansSftpConfig();
  if (!cfg.password) { const e = new Error('Coghlans SFTP is not configured — set COGHLANS_SFTP_PASSWORD (and confirm the Webshare proxy port/auth) in the environment.'); e.notConfigured = true; throw e; }
  const path = (dirPath && String(dirPath)) || '/';
  // Basic hardening: reject obviously malformed paths (no NUL, must be absolute-ish); the SFTP server enforces real perms.
  if (path.indexOf('\0') >= 0) throw new Error('Invalid path.');
  const sftp = new SftpClient();
  let sock = null;
  try {
    sock = cfg.proxyHost
      ? await proxyTunnel({ proxyHost: cfg.proxyHost, proxyPort: cfg.proxyPort, proxyUser: cfg.proxyUser, proxyPassword: cfg.proxyPassword, destHost: cfg.host, destPort: cfg.port })
      : await directSocket({ host: cfg.host, port: cfg.port });
    await sftp.connect({ sock, username: cfg.user, password: cfg.password, readyTimeout: 20000 });
    const raw = await sftp.list(path);
    const entries = (raw || []).map((e) => ({ name: e.name, type: e.type, size: e.size, modifyTime: e.modifyTime, longname: e.longname || '' }))
      .sort((a, b) => (a.type === 'd' && b.type !== 'd' ? -1 : b.type === 'd' && a.type !== 'd' ? 1 : String(a.name).localeCompare(String(b.name))));
    return { path, entries };
  } finally {
    try { await sftp.end(); } catch {}
    try { if (sock && !sock.destroyed) sock.destroy(); } catch {}
  }
}
