import path from 'node:path';
import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const CAPCUT_MATE_DIR = path.join(__dirname, '..', 'integrations', 'capcut-mate');

export async function capcutMateInfo(config) {
  const cfg = (config.integrations && config.integrations.capcutMate) || {};
  const dir = path.isAbsolute(cfg.dir) ? cfg.dir : path.join(__dirname, '..', cfg.dir || 'integrations/capcut-mate');
  let exists = false;
  let venv = false;
  try {
    await fs.access(path.join(dir, 'main.py'));
    exists = true;
    await fs.access(path.join(dir, '.venv'));
    venv = true;
  } catch {}
  const api = String(cfg.api || 'http://127.0.0.1:30000').replace(/\/+$/, '');
  let online = false;
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 2500);
    const r = await fetch(`${api}/docs`, { signal: ac.signal });
    online = r.ok;
    clearTimeout(timer);
  } catch {}
  return {
    dir,
    exists,
    venv,
    online,
    api,
    cloud: cfg.cloud || 'https://capcut-mate.jcaigc.cn',
    aiTool: cfg.aiTool || '剪映图文成片'
  };
}

function runDetached(cmd, args, cwd) {
  const child = spawn(cmd, args, {
    cwd,
    detached: true,
    stdio: 'ignore',
    shell: true,
    windowsHide: true
  });
  child.unref();
  return child.pid;
}

export async function startCapcutMate(config) {
  const info = await capcutMateInfo(config);
  if (!info.exists) return { ok: false, error: '未找到内置 CapCut Mate，请先克隆到 integrations/capcut-mate' };
  if (info.online) return { ok: true, already: true, ...info };
  if (!info.venv) {
    runDetached('uv', ['sync', '--extra', 'windows'], info.dir);
  }
  const pid = runDetached('uv', ['run', 'main.py'], info.dir);
  return { ok: true, pid, already: false, ...info };
}

