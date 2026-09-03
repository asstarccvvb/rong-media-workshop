import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const MONEYPRINTER_DIR = path.join(__dirname, '..', 'integrations', 'MoneyPrinterTurbo');

export async function moneyPrinterInfo(config) {
  const cfg = (config.integrations && config.integrations.moneyPrinterTurbo) || {};
  const dir = path.isAbsolute(cfg.dir)
    ? cfg.dir
    : path.join(__dirname, '..', cfg.dir || 'integrations/MoneyPrinterTurbo');
  let exists = false;
  try {
    await fs.access(path.join(dir, 'pyproject.toml'));
    exists = true;
  } catch {}
  const api = String(cfg.api || 'http://127.0.0.1:8080').replace(/\/+$/, '');
  let online = false;
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 2500);
    const r = await fetch(`${api}/docs`, { signal: ac.signal });
    online = r.ok;
    clearTimeout(timer);
  } catch {}
  return { dir, exists, online, api };
}

export async function uploadLocalMaterial(api, absFile, filename) {
  const data = await fs.readFile(absFile);
  const form = new FormData();
  form.append('file', new Blob([data], { type: 'application/octet-stream' }), filename);
  const r = await fetch(`${api}/api/v1/video_materials`, { method: 'POST', body: form });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(`MoneyPrinterTurbo 素材上传失败：${(j && j.message) || r.status}`);
  }
  return (j.data && j.data.file) || filename;
}
