import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import {
  ROOT,
  DATA_DIR,
  loadConfig,
  saveConfig,
  collect,
  integrate,
  classify,
  summarize,
  process,
  produce,
  distribute,
  runAll,
  listRuns,
  STAGES,
  STAGE_NAMES
} from './scripts/pipeline.mjs';
import { buildCapCutJob } from './scripts/capcut-bridge.mjs';
import { capcutMateInfo, startCapcutMate } from './scripts/capcut-mate.mjs';
import { moneyPrinterInfo, uploadLocalMaterial } from './scripts/moneyprinter.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const ENV = typeof process !== 'undefined' && process.env ? process.env : {};
const CAPCUT_PROJECT = 'C:\\Users\\xh\\Documents\\ChatGPT\\视频';
const execP = promisify(exec);
const deepCache = new Map();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function sendJson(res, status, data) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(body);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function listLocalFiles(session) {
  const safeSession = String(session || '').replace(/[\\/:*?"<>|]/g, '');
  const base = path.join(DATA_DIR, 'local_materials', safeSession);
  const out = [];
  const walk = async (dir, prefix) => {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        await walk(full, prefix ? path.join(prefix, e.name) : e.name);
        continue;
      }
      const st = await fs.stat(full).catch(() => null);
      out.push({
        name: e.name,
        rel: (prefix ? path.join(prefix, e.name) : e.name).replace(/\\/g, '/'),
        size: st ? st.size : 0
      });
    }
  };
  await walk(base, '');
  return out;
}

async function scanProducedIndexes() {
  const map = {};
  const root = path.join(DATA_DIR, '05_produced');
  let dirs = [];
  try {
    dirs = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return map;
  }
  for (const d of dirs.filter((x) => x.isDirectory()).sort((a, b) => b.name.localeCompare(a.name))) {
    const indexFile = path.join(root, d.name, 'clips', 'index.json');
    try {
      const list = JSON.parse(await fs.readFile(indexFile, 'utf8'));
      for (const it of list) {
        if (!map[it.title]) map[it.title] = { run: d.name, clipFile: it.clipFile || null, category: it.category };
      }
    } catch {}
  }
  return map;
}

async function findClassifyItem(title) {
  const norm = (s) => String(s || '').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
  const target = norm(title);
  const latest = await readLatestClassify().catch(() => null);
  if (latest && latest.items) {
    const hit = latest.items.find((it) => norm(it.title) === target);
    if (hit) return { item: hit, fromLatest: true };
  }
  const dir = path.join(DATA_DIR, '03_classified');
  let files = [];
  try {
    files = (await fs.readdir(dir)).filter((f) => f.endsWith('.json')).sort().reverse();
  } catch {}
  for (const f of files.slice(0, 40)) {
    try {
      const payload = JSON.parse(await fs.readFile(path.join(dir, f), 'utf8'));
      const hit = (payload.items || []).find((it) => norm(it.title) === target);
      if (hit) return { item: hit, fromLatest: false, run: f.replace(/\.json$/, '') };
    } catch {}
  }
  return null;
}

async function installJimengCli() {
  const gEnv = globalThis.process && globalThis.process.env ? globalThis.process.env : {};
  const home = gEnv.USERPROFILE || gEnv.HOME || ROOT;
  const base = 'https://lf3-static.bytednsdoc.com/obj/eden-cn/psj_hupthlyk/ljhwZthlaukjlkulzlp/dreamina_cli_beta';
  const binDir = path.join(home, 'bin');
  const cliPath = path.join(binDir, 'dreamina.exe');
  const skillDir = path.join(home, '.dreamina_cli', 'dreamina');
  const skillPath = path.join(skillDir, 'SKILL.md');
  const codexSkillDir = path.join(home, '.codex', 'skills', 'dreamina-cli');
  const codexSkillPath = path.join(codexSkillDir, 'SKILL.md');
  const versionPath = path.join(home, '.dreamina_cli', 'version.json');
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 240000);
  const download = async (url, dest) => {
    const res = await fetch(url, { signal: ac.signal, headers: { 'user-agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`下载失败 ${url}（HTTP ${res.status}）`);
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, buf);
    return buf.length;
  };
  try {
    const exeBytes = await download(`${base}/dreamina_cli_windows_amd64.exe`, cliPath);
    await download(`${base}/SKILL.md`, skillPath);
    await download(`${base}/SKILL.md`, codexSkillPath);
    await download('https://lf3-static.bytednsdoc.com/obj/eden-cn/psj_hupthlyk/ljhwZthlaukjlkulzlp/version.json', versionPath);
    const config = await loadConfig();
    config.integrations = config.integrations || {};
    config.integrations.jimeng = {
      ...(config.integrations.jimeng || {}),
      cliInstalled: true,
      cliPath,
      cliVersionFile: versionPath,
      cliSkillPath: skillPath,
      endpoint: config.integrations.jimeng && config.integrations.jimeng.endpoint || 'https://jimeng.jianying.com'
    };
    await saveConfig(config);
    return {
      ok: true,
      message: `即梦 CLI 安装完成（${(exeBytes / 1024 / 1024).toFixed(1)} MB）\nCLI：${cliPath}\n技能：${skillPath}\n已在“AI 引擎 → 图片/视频模型”中可选即梦。首次使用请登录：${cliPath} login`,
      cliPath,
      skillPath
    };
  } catch (err) {
    return { ok: false, error: `即梦 CLI 安装失败：${err.message}` };
  } finally {
    clearTimeout(timer);
  }
}

function isSafePath(p) {
  const resolved = path.isAbsolute(p) ? path.normalize(p) : path.resolve(ROOT, p);
  const allowed = [ROOT, CAPCUT_PROJECT];
  return allowed.some((root) => resolved === root || resolved.startsWith(root + path.sep));
}

let scanTimer = null;
let lastScanAt = null;
let nextScanAt = null;
let scanning = false;

async function runAutoScan() {
  if (scanning) return { skipped: true };
  scanning = true;
  try {
    const cfg = await loadConfig();
    const collected = await collect(cfg);
    const integrated = await integrate(cfg, collected);
    const classified = await classify(cfg, integrated);
    await summarize(cfg, classified);
    lastScanAt = new Date().toISOString();
    return { ok: true, lastScanAt };
  } catch (err) {
    console.error('自动扫描失败:', err.message);
    return { ok: false, error: err.message };
  } finally {
    scanning = false;
  }
}

function resetScheduler(cfg) {
  if (scanTimer) {
    clearInterval(scanTimer);
    scanTimer = null;
  }
  nextScanAt = null;
  const mins = Number((cfg && cfg.workflow && cfg.workflow.scanMinutes)) || 0;
  if (mins > 0) {
    nextScanAt = new Date(Date.now() + mins * 60000).toISOString();
    scanTimer = setInterval(async () => {
      await runAutoScan();
      const c = await loadConfig();
      const m = Number((c && c.workflow && c.workflow.scanMinutes)) || 0;
      nextScanAt = m > 0 ? new Date(Date.now() + m * 60000).toISOString() : null;
    }, mins * 60000);
  }
}

function runStampNow() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

async function loadCategorySources() {
  const file = path.join(ROOT, 'category_sources.json');
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return {};
  }
}

async function saveCategorySources(obj) {
  await fs.writeFile(path.join(ROOT, 'category_sources.json'), JSON.stringify(obj, null, 2), 'utf8');
}

function buildCategorySearchSources(name) {
  const kw = encodeURIComponent(name);
  const raw = [
    ['百度搜索', `https://www.baidu.com/s?wd=${kw}+%E6%9C%80%E6%96%B0`],
    ['微博搜索', `https://s.weibo.com/weibo?q=${kw}`],
    ['抖音搜索', `https://www.douyin.com/search/${kw}`],
    ['小红书搜索', `https://www.xiaohongshu.com/search_result?keyword=${kw}`],
    ['知乎搜索', `https://www.zhihu.com/search?type=content&q=${kw}`],
    ['B站搜索', `https://search.bilibili.com/all?keyword=${kw}`],
    ['今日头条搜索', `https://so.toutiao.com/search?keyword=${kw}`],
    ['腾讯新闻搜索', `https://new.qq.com/search?query=${kw}`],
    ['新浪新闻搜索', `https://search.sina.com.cn/?q=${kw}`],
    ['网易搜索', `https://www.163.com/search?keyword=${kw}`],
    ['搜狐搜索', `https://search.sohu.com/?keyword=${kw}`],
    ['凤凰网搜索', `https://so.ifeng.com/?q=${kw}`],
    ['澎湃新闻搜索', `https://www.thepaper.cn/searchResult?keyword=${kw}`],
    ['界面新闻搜索', `https://www.jiemian.com/search?keyword=${kw}`],
    ['36氪搜索', `https://36kr.com/search/articles/${kw}`],
    ['虎嗅搜索', `https://www.huxiu.com/search?s=${kw}`],
    ['人民网搜索', `http://search.people.com.cn/cnpeople/search.do?keyword=${kw}`],
    ['央视网搜索', `https://search.cctv.com/search.php?qtext=${kw}`],
    ['新华网搜索', `https://so.news.cn/#search/0/${kw}/1/`],
    ['中国网搜索', `http://search.china.com.cn/?q=${kw}`]
  ];
  return raw.map(([site, url]) => ({ name: `${site}·${name}`, url, type: 'html', level: 'B', category: name }));
}

async function extractImagesFromUrl(url) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'user-agent': 'Mozilla/5.0' } });
    clearTimeout(timer);
    if (!res.ok) return [];
    const html = await res.text();
    const out = [];
    const re = /<img[^>]+src=["']([^"']+)["']/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      try {
        const abs = new URL(m[1], url).href;
        if (/\.(jpe?g|png|webp|gif)(\?|$)/i.test(abs) || abs.includes('image')) out.push(abs);
      } catch {}
      if (out.length >= 6) break;
    }
    return out;
  } catch {
    return [];
  }
}

async function readLatestClassify() {
  const latestFile = path.join(DATA_DIR, 'latest.json');
  const latest = JSON.parse(await fs.readFile(latestFile, 'utf8'));
  if (!latest.classify || !latest.classify.file) return null;
  try {
    return JSON.parse(await fs.readFile(path.join(ROOT, latest.classify.file), 'utf8'));
  } catch {
    return null;
  }
}

function sanitizeText(s) {
  return String(s ?? '')
    .replace(/[\uFFFD]/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function cleanItemForDisplay(it) {
  if (!it || typeof it !== 'object') return null;
  const title = sanitizeText(it.title);
  if (!title || /\uFFFD/.test(String(it.title))) return null;
  return {
    ...it,
    title,
    summary: sanitizeText(it.summary),
    content: sanitizeText(it.content),
    fullText: sanitizeText(it.fullText)
  };
}

async function loadAssistantHistory(limit = 80) {
  const file = path.join(DATA_DIR, 'assistant', 'history.json');
  try {
    const arr = JSON.parse(await fs.readFile(file, 'utf8'));
    return Array.isArray(arr) ? arr.slice(-limit) : [];
  } catch {
    return [];
  }
}

async function appendAssistantHistory(entries) {
  const file = path.join(DATA_DIR, 'assistant', 'history.json');
  await fs.mkdir(path.dirname(file), { recursive: true });
  const all = await loadAssistantHistory(500);
  const now = cnNowText();
  all.push(...entries.map((e) => ({
    role: e.role === 'user' ? 'user' : 'assistant',
    content: String(e.content || ''),
    time: e.time || now
  })));
  await fs.writeFile(file, JSON.stringify(all.slice(-500), null, 2), 'utf8');
  return all.slice(-limitForHistory());
}

function limitForHistory() {
  return 80;
}

function escXmlS(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function videoVariant(item, n) {
  const body = (item.fullText || item.summary || item.title || '');
  const heads = [
    '权威速报，第一时间掌握关键信息。',
    '这件事刚刚发生，很多人还不知道。',
    '一组数据看懂今天最重要的动态。'
  ];
  const endings = [
    '关注我们，每天三分钟看懂全网热点。',
    '后续进展我们会持续跟进，先点个关注不迷路。',
    '把这条转发给关心的人，让信息跑得更快。'
  ];
  return `# 视频文案 V${n} · ${item.title || ''}

> ${heads[n - 1]}${body ? `据悉，${body.slice(0, 180)}。` : ''}数据来自${item.source || '公开信息'}。${endings[n - 1]}以上信息仅供参考。

## 分镜
| 镜号 | 时长 | 画面 | 口播 | 字幕 | 音效 |
|------|------|------|------|------|------|
| 1 | 5s | 主持人半身景 | 开场导语 | ${item.title || '标题'} | 片头音 |
| 2 | 12s | 新闻画面/图表 | 核心内容 | 关键数据 | 数据音效 |
| 3 | 4s | 风险提示 | 以上信息仅供参考 | 风险提示 | 结束音 |
`;
}

function articleVariant(item, n) {
  const body = (item.fullText || item.summary || item.title || '');
  if (n === 1) {
    return `# ${item.title || ''}

${item.category || ''}｜来源：${item.source || '公开信息'}

${body || '暂无正文'}

> 数据来源：${item.source || '公开信息'}${item.link ? ` ${item.link}` : ''}`;
  }
  if (n === 2) {
    return `# 深度解读 · ${item.title || ''}

## 事件概览
${body || '暂无正文'}

## 关键看点
- 数据：${item.spreadScore != null ? item.spreadScore + '/100' : '待补充'}
- 来源：${item.source || '公开信息'}
- 影响：${item.category || '其他'}领域值得持续关注

> 本文信息来自公开来源，仅供参考。`;
  }
  return `# 观点速递 · ${item.title || ''}

今天最值得关注的一条信息是：${item.title || ''}。

${body ? body.slice(0, 200) : ''}

这件事之所以重要，是因为它影响的不是一小部分人。接下来我们会继续盯进展。

> 来源：${item.source || '公开信息'}${item.link ? ` ${item.link}` : ''}`;
}

function coverVariant(item, n, width, height) {
  const colors = ['#22d3ee', '#a78bfa', '#fbbf24'];
  const accent = colors[n - 1];
  const title = item.title || '热点封面';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0d1117"/><stop offset="100%" stop-color="#161b22"/></linearGradient></defs>
  <rect width="${width}" height="${height}" fill="url(#g)"/>
  <rect x="${width * 0.04}" y="${height * 0.04}" width="${width * 0.92}" height="${height * 0.92}" rx="22" fill="none" stroke="${accent}" stroke-width="3"/>
  <text x="${width / 2}" y="${height * 0.42}" text-anchor="middle" font-size="${Math.min(width, height) * 0.065}" font-weight="800" fill="#fff">${escXmlS(title)}</text>
  <text x="${width / 2}" y="${height * 0.56}" text-anchor="middle" font-size="${Math.min(width, height) * 0.03}" fill="#9ca3af">封面方案 V${n} · ${item.category || '热点'}</text>
</svg>`;
}

function comicCoverSvg(title, width, height) {
  const w = width;
  const h = height;
  const cx = w / 2;
  const dots = [];
  for (let y = 30; y < h; y += 46) {
    for (let x = 30; x < w; x += 46) {
      dots.push(`<circle cx="${x}" cy="${y}" r="3" fill="#fbbf24" opacity="0.55"/>`);
    }
  }
  const bubble = `<g transform="translate(${w * 0.62}, ${h * 0.10})">
    <rect x="-30" y="-22" width="170" height="52" rx="18" fill="#fff" stroke="#111" stroke-width="4"/>
    <text x="55" y="9" text-anchor="middle" font-size="22" font-weight="900" fill="#111">爆点！</text>
  </g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#fff7e6"/>
  ${dots.join('')}
  <rect x="18" y="18" width="${w - 36}" height="${h - 36}" rx="26" fill="none" stroke="#111" stroke-width="8"/>
  <rect x="34" y="34" width="${w - 68}" height="${h - 68}" rx="20" fill="none" stroke="#111" stroke-width="2" stroke-dasharray="10 8"/>
  ${bubble}
  <path d="M${w * 0.10} ${h * 0.36} L${w * 0.90} ${h * 0.36} L${w * 0.90} ${h * 0.42} L${w * 0.10} ${h * 0.42} Z" fill="#111"/>
  <text x="${cx}" y="${h * 0.46}" text-anchor="middle" font-size="${Math.min(w, h) * 0.06}" font-weight="900" fill="#111">${escXmlS(title)}</text>
  <text x="${cx}" y="${h * 0.62}" text-anchor="middle" font-size="${Math.min(w, h) * 0.035}" font-weight="700" fill="#7c2d12">手绘漫画风 · 娱乐速递</text>
  <text x="${cx}" y="${h * 0.72}" text-anchor="middle" font-size="${Math.min(w, h) * 0.028}" fill="#555">无原图素材时自动生成 · 点击播放查看详情</text>
</svg>`;
}

const PLATFORM_LIST = ['抖音', '小红书', '微博', '视频号', 'B站', '快手', 'YouTube', 'X', 'TikTok', 'Instagram'];

function distributeCopyFor(config, item, platform) {
  const niche = String((config.workflow && config.workflow.niche) || '热点').replace(/[\/\s]/g, '');
  const title = item.title || '热点快报';
  const summary = (item.fullText || item.summary || '').slice(0, 60);
  const risk = '市场有风险，投资需谨慎，以上信息仅供参考。';
  const copies = {
    抖音: `【${title}】${summary || ''} ${risk} 关注我，每天${niche}干货。\n\n#${niche} #热点 #爆点速递`,
    小红书: `${title}\n\n一句话说清：${summary || '最新动态来了'}\n\n#${niche} #每日热点 #信息差 #干货分享`,
    微博: `【爆点速递】${title}。${summary || ''}${risk}\n\n#${niche} #热搜 #今日热点`,
    视频号: `【${niche}快报】${title}。${summary || ''}${risk}\n\n#${niche} #热点快报 #爆点速递`,
    B站: `【${niche}快报】${title}。${summary || ''}${risk}\n\n#${niche} #热点快报 #爆点速递 #B站`,
    快手: `【${niche}快报】${title}。${summary || ''}${risk}\n\n#${niche} #热点快报 #爆点速递 #快手`,
    YouTube: `${title}\n\n${summary || ''}\n\n${risk}\n\n#${niche} #Trending #News #Hot`,
    X: `【Breaking】${title}。${summary || ''}${risk}\n\n#${niche} #Hot #News #Trending`,
    TikTok: `#${niche} #hot #fyp #news ${title} ${summary || ''} ${risk}`,
    Instagram: `${title}\n\n${summary || '最新动态来了'}\n\n${risk}\n\n#${niche} #News #Daily #Info`
  };
  return copies[platform] || `${title}\n\n${summary || ''}`;
}

let workflow = { phase: 'idle', run: null, deadline: null, timer: null, comment: '', item: null };

function clearWfTimer() {
  if (workflow.timer) {
    clearTimeout(workflow.timer);
    workflow.timer = null;
  }
}

async function publishAuditRun(run, onlyPlatforms = null) {
  const latestFile = path.join(DATA_DIR, 'latest.json');
  const latest = JSON.parse(await fs.readFile(latestFile, 'utf8'));
  if (!latest.publish || latest.publish.run !== run) return { ok: false, error: '发布任务不存在' };
  const file = path.join(ROOT, latest.publish.file);
  const payload = JSON.parse(await fs.readFile(file, 'utf8'));
  for (const key of Object.keys(payload.platforms || {})) {
    if (onlyPlatforms && !onlyPlatforms.includes(key)) continue;
    payload.platforms[key].status = '已发布（模拟）';
    payload.platforms[key].publishedAt = new Date().toISOString();
  }
  await fs.writeFile(file, JSON.stringify(payload, null, 2), 'utf8');
  return { ok: true };
}

async function findRunMp4(run) {
  if (!run) return null;
  const dir = path.join(CAPCUT_PROJECT, 'jobs', run);
  try {
    const files = await fs.readdir(dir);
    const mp4 = files.find((f) => f.toLowerCase().endsWith('.mp4'));
    if (mp4) return path.join(dir, mp4);
  } catch {}
  try {
    const files = await fs.readdir(CAPCUT_PROJECT);
    const mp4 = files.find((f) => f.startsWith(run) && f.toLowerCase().endsWith('.mp4'));
    if (mp4) return path.join(CAPCUT_PROJECT, mp4);
  } catch {}
  return null;
}

async function buildAuditPayload(config, item, run, customScript = null) {
  const width = 1920;
  const height = 1080;
  const video = (customScript && customScript.trim()) || videoVariant(item, 1);
  const article = articleVariant(item, 1);
  const coverSvg = coverVariant(item, 1, width, height);
  const coverFile = path.join(DATA_DIR, 'covers', `${run}_cover.svg`);
  await fs.mkdir(path.dirname(coverFile), { recursive: true });
  await fs.writeFile(coverFile, coverSvg, 'utf8');
  let capcutJob = null;
  try {
    capcutJob = await buildCapCutJob(
      { config, classified: { items: [item] }, processedText: video, produced: { run, poster: '' } },
      { width, height, title: item.title }
    );
  } catch (err) {
    capcutJob = { error: err.message };
  }
  const mp4 = await findRunMp4(run);
  const mptCfg = (config.integrations && config.integrations.moneyPrinterTurbo) || {};
  const platforms = {};
  for (const platform of (config.workflow.platforms || PLATFORM_LIST)) {
    platforms[platform] = {
      copy: distributeCopyFor(config, item, platform),
      coverFile: path.relative(ROOT, coverFile).replace(/\\/g, '/'),
      videoScript: video,
      articleMd: article,
      status: '待审核'
    };
  }
  const payload = {
    run,
    generatedAt: new Date().toISOString(),
    item: {
      title: item.title,
      category: item.category,
      score: item.spreadScore,
      source: item.source,
      link: item.link
    },
    video: {
      variant: 1,
      script: video,
      engine: String((config.ai && config.ai.videoModel) || 'capcut'),
      capcutJob: capcutJob ? capcutJob.dir : null,
      mp4: mp4 ? mp4.replace(/\\/g, '/') : null,
      taskId: null,
      statusUrl: null,
      api: mptCfg.api || 'http://127.0.0.1:8080'
    },
    article: { variant: 1, markdown: article },
    cover: { variant: 1, file: path.relative(ROOT, coverFile).replace(/\\/g, '/'), svg: coverSvg },
    platforms
  };
  const dir = path.join(DATA_DIR, 'publish');
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${run}.json`);
  await fs.writeFile(file, JSON.stringify(payload, null, 2), 'utf8');
  const latestFile = path.join(DATA_DIR, 'latest.json');
  const latest = JSON.parse(await fs.readFile(latestFile, 'utf8'));
  latest.publish = { run, file: path.relative(ROOT, file).replace(/\\/g, '/') };
  await fs.writeFile(latestFile, JSON.stringify(latest, null, 2), 'utf8');
  return payload;
}

async function startWorkflow(config, result) {
  const items = (result.classified && result.classified.items || []).slice().sort((a, b) => (Number(b.spreadScore) || 0) - (Number(a.spreadScore) || 0));
  const item = items[0] || null;
  if (!item) return { error: '本次扫描没有可用内容' };
  clearWfTimer();
  const run = runStampNow();
  workflow = {
    phase: 'editing',
    run,
    deadline: Date.now() + 10000,
    timer: null,
    comment: '',
    item
  };
  const wfDir = path.join(DATA_DIR, 'workflow');
  await fs.mkdir(wfDir, { recursive: true });
  await fs.writeFile(path.join(wfDir, `${run}.json`), JSON.stringify({
    run,
    phase: 'editing',
    createdAt: new Date().toISOString(),
    deadline: workflow.deadline,
    comment: '',
    item: {
      title: item.title,
      category: item.category,
      score: item.spreadScore,
      source: item.source,
      link: item.link,
      fullText: item.fullText,
      summary: item.summary
    }
  }, null, 2), 'utf8');
  workflow.timer = setTimeout(async () => {
    if (workflow.phase === 'editing' && workflow.run === run && !workflow.comment) {
      await advanceToAudit(config);
    }
  }, 10000);
  return { ok: true, run, phase: 'editing', deadline: workflow.deadline };
}

async function makeItemFullFlow(config, item) {
  const produced = await produce(config, { items: [item] });
  const index = [{
    title: item.title,
    category: item.category,
    spreadScore: item.spreadScore,
    spread: item.spread,
    source: item.source,
    link: item.link,
    summary: item.summary,
    fullText: item.fullText,
    clipFile: produced.script || produced.clips && produced.clips[0] || null
  }];
  const indexFile = path.join(DATA_DIR, '05_produced', produced.run, 'clips', 'index.json');
  await fs.mkdir(path.dirname(indexFile), { recursive: true });
  await fs.writeFile(indexFile, JSON.stringify(index, null, 2), 'utf8');
  await startWorkflow(config, { classified: { items: [item] } });
  const audit = await advanceToAudit(config);
  return { produced, audit };
}

function parseClassifyRunDate(run) {
  const m = String(run || '').match(/^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})$/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
}

async function loadAllClassifyRuns(limit = 60) {
  const dir = path.join(DATA_DIR, '03_classified');
  let files = [];
  try {
    files = (await fs.readdir(dir)).filter((f) => f.endsWith('.json')).sort().reverse();
  } catch {
    return [];
  }
  const out = [];
  for (const f of files.slice(0, limit)) {
    try {
      const payload = JSON.parse(await fs.readFile(path.join(dir, f), 'utf8'));
      out.push({
        run: f.replace(/\.json$/, ''),
        date: parseClassifyRunDate(f),
        items: (payload.items || []).map(cleanItemForDisplay).filter(Boolean)
      });
    } catch {}
  }
  return out;
}

async function analyzeTopics(config, mode, opts = {}) {
  const runs = await loadAllClassifyRuns(80);
  const now = new Date();
  const today = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const asOfRun = String(opts.run || '').replace(/[^\d_]/g, '').slice(0, 13);
  const asOfDate = String(opts.date || '').replace(/\D/g, '').slice(0, 8);
  let pool = runs;
  if (asOfRun) pool = runs.filter((r) => String(r.run) <= asOfRun);
  else if (asOfDate) pool = runs.filter((r) => String(r.run) <= `${asOfDate}_2359`);
  const counts = {};
  const all = [];
  for (const run of pool) {
    let keep;
    if (mode === 'live') {
      keep = pool.indexOf(run) < 2;
    } else if (mode === 'daily') {
      keep = asOfRun ? String(run.run).startsWith(asOfRun.slice(0, 8)) : asOfDate ? String(run.run).startsWith(asOfDate) : String(run.run).startsWith(today);
    } else {
      const endDate = asOfRun ? parseClassifyRunDate(asOfRun) : asOfDate ? new Date(Number(asOfDate.slice(0, 4)), Number(asOfDate.slice(4, 6)) - 1, Number(asOfDate.slice(6, 8)), 23, 59) : now;
      keep = !!(run.date && endDate && (endDate - run.date) <= 7 * 24 * 3600 * 1000 && run.date <= endDate);
    }
    if (!keep) continue;
    for (const it of run.items) {
      if (!it.title) continue;
      const key = it.title.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase().slice(0, 60);
      counts[key] = counts[key] || { count: 0, item: it };
      counts[key].count += 1;
      all.push(it);
    }
  }
  const seen = new Set();
  const candidates = Object.values(counts)
    .map((e) => ({
      ...e.item,
      appears: e.count,
      score: Number(e.item.spreadScore) || Number(e.item.score) || 0
    }))
    .sort((a, b) => b.score - a.score || b.appears - a.appears)
    .slice(0, 6);
  const categoryCount = {};
  all.forEach((it) => { categoryCount[it.category || '未分类'] = (categoryCount[it.category || '未分类'] || 0) + 1; });
  const topCat = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0];
  const catBuckets = {};
  for (const it of all) {
    const cat = it.category || '未分类';
    catBuckets[cat] = catBuckets[cat] || [];
    catBuckets[cat].push(it);
  }
  const byCategory = Object.entries(catBuckets)
    .map(([cat, list]) => {
      const titleCount = {};
      for (const it of list) {
        const key = it.title.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase().slice(0, 60);
        titleCount[key] = titleCount[key] || { title: it.title, count: 0, score: Number(it.spreadScore) || Number(it.score) || 0 };
        titleCount[key].count += 1;
      }
      const tops = Object.values(titleCount).sort((a, b) => b.count - a.count || b.score - a.score).slice(0, 3);
      const avg = Math.round(list.reduce((n, it) => n + (Number(it.spreadScore) || Number(it.score) || 0), 0) / Math.max(1, list.length));
      const sources = [...new Set(list.map((it) => it.source || '公开信息'))].slice(0, 4).join('、');
      const repeat = tops.filter((t) => t.count >= 2).length;
      return {
        category: cat,
        count: list.length,
        avgScore: avg,
        sources,
        repeatTopics: repeat,
        top: tops,
        analysis: `「${cat}」共 ${list.length} 条，平均传播评分 ${avg}/100，主要来源：${sources}；重复主题 ${repeat} 个，说明该方向正在持续被市场/媒体关注。`,
        learning: repeat
          ? `学习结论：${tops.filter((t) => t.count >= 2).map((t) => `「${t.title.slice(0, 22)}」出现 ${t.count} 次`).join('、') || '无'}，可归为同一持续话题，不应拆成多条重复内容。`
          : `学习结论：本周期「${cat}」以新增话题为主，暂无明显重复发酵，适合做单点快讯。`,
        prediction: tops[0]
          ? `预判：「${tops[0].title.slice(0, 24)}」仍是「${cat}」内最可能继续发酵的方向；若后续再次出现，可升级为深度或系列选题。`
          : `预判：暂无明显延续信号。`,
        decision: repeat
          ? `决策：建议把「${cat}」重复主题合并成 1 条综述 + 数据长图，而非逐条单发；输出优先级高于单点快讯。`
          : `决策：建议从「${cat}」中选 1 条最高分内容制作视频/图文，其余作为后续储备。`
      };
    })
    .sort((a, b) => b.count - a.count || b.avgScore - a.avgScore);
  const names = { live: '及时选题', daily: '每日选题', weekly: '每周选题' };
  const analysis = candidates.length
    ? `共纳入 ${all.length} 条信息，去重后高潜候选 ${candidates.length} 条；高频分类「${topCat ? topCat[0] : '无'}」，信息集中在 ${all[0] ? (all[0].source || '多源') : '暂无'} 等来源。`
    : '暂无可分析信息，请先运行信息收集/分类。';
  const prediction = candidates[0]
    ? `预计「${candidates[0].title.slice(0, 30)}」在 24 小时内仍有发酵空间；同类话题继续出现时可升级为深度选题。`
    : '暂无预测依据。';
  const decision = candidates.length
    ? `建议优先制作：${candidates.slice(0, 3).map((c) => `${c.title.slice(0, 20)}（${c.score}/100）`).join('、')}；重复出现≥2次的条目应做合并解读而非单发。`
    : '建议先运行“一键运行全流程”。';
  return {
    mode: names[mode] || mode,
    byCategory,
    candidates: candidates.map((c) => ({
      title: c.title,
      category: c.category,
      score: c.score,
      appears: c.appears,
      source: c.source,
      link: c.link
    })),
    period: {
      run: asOfRun || null,
      date: asOfDate || null,
      fromRun: pool.length ? pool[pool.length - 1].run : null,
      toRun: pool.length ? pool[0].run : null
    },
    analysis,
    prediction,
    decision
  };
}

function cnNowText() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function cleanSearchText(s) {
  return String(s ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchRssText(url, ms = 12000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        accept: 'application/rss+xml, application/xml, text/xml, */*'
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function parseRssSearch(xml, feedName) {
  const out = [];
  const itemRe = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const titleMatch = block.match(/<title(?:[^>]*)>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const linkAttr = block.match(/<link[^>]*href="([^"]+)"/i);
    const linkTag = block.match(/<link(?:[^>]*)>([^<]+)<\/link>/i);
    const descMatch = block.match(/<(?:description|summary)(?:[^>]*)>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:description|summary)>/i);
    const dateMatch = block.match(/<pubDate(?:[^>]*)>([^<]+)<\/pubDate>/i) || block.match(/<published(?:[^>]*)>([^<]+)<\/published>/i) || block.match(/<updated(?:[^>]*)>([^<]+)<\/updated>/i);
    const title = cleanSearchText(titleMatch ? titleMatch[1] : '');
    const link = (linkAttr ? linkAttr[1] : linkTag ? linkTag[1] : '').trim();
    if (!title || !link) continue;
    out.push({
      title,
      link,
      summary: cleanSearchText(descMatch ? descMatch[1] : '').slice(0, 300),
      publishedAt: dateMatch ? dateMatch[1] : '',
      feed: feedName
    });
  }
  return out;
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

async function webSearchItem(query) {
  const q = encodeURIComponent(query);
  const urls = [
    ['Bing 资讯', `https://www.bing.com/news/search?q=${q}&format=rss`],
    ['Bing 网页', `https://www.bing.com/search?q=${q}&format=rss`],
    ['Google News', `https://news.google.com/rss/search?q=${q}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`]
  ];
  const tasks = urls.map(async ([name, url]) => {
    try {
      return parseRssSearch(await fetchRssText(url), name).map((r) => ({ ...r, sourceName: name }));
    } catch {
      return [];
    }
  });
  const groups = await Promise.all(tasks);
  const seen = new Set();
  const out = [];
  for (const list of groups) {
    for (const r of list) {
      const key = String(r.title || '').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase().slice(0, 60);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(r);
      if (out.length >= 12) break;
    }
    if (out.length >= 12) break;
  }
  return out;
}

async function deepIntegrateItem(item) {
  const title = sanitizeText(item.title) || '';
  const query = title.replace(/[【】\[\]《》()（）]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
  const found = await findClassifyItem(title).catch(() => null);
  const base = found && found.item ? found.item : item;
  const localText = sanitizeText(base.fullText || base.summary || base.content || '');
  const allRuns = await loadAllClassifyRuns(80);
  const normTitle = (s) => String(s || '').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
  const target = normTitle(title).slice(0, 40);
  const related = [];
  const localSources = new Set();
  for (const run of allRuns) {
    for (const it of run.items) {
      const nt = normTitle(it.title);
      if (!nt) continue;
      const same = nt.slice(0, 40) === target;
      const contains = target.length >= 12 && nt.includes(target);
      if (same || contains) {
        related.push({ run: run.run, title: sanitizeText(it.title), source: sanitizeText(it.source), link: it.link || '', score: it.spreadScore ?? it.score ?? '' });
        if (it.source) localSources.add(sanitizeText(it.source));
      }
    }
  }
  if (base.source) localSources.add(sanitizeText(base.source));
  const reports = await webSearchItem(query);
  const reportSources = [...new Set(reports.map((r) => hostOf(r.link) || r.sourceName).filter(Boolean))];
  const timeline = [];
  const nowText = cnNowText();
  timeline.push({
    time: nowText,
    source: '工作台采集',
    summary: `信息分类收录（${base.category || '未分类'}，传播评分 ${base.spreadScore ?? base.score ?? '--'}/100，来源 ${base.source || '公开信息'}）。`
  });
  if (localText) timeline.push({ time: nowText, source: '本地原文/摘要', summary: localText.slice(0, 220) });
  for (const r of reports.slice(0, 6)) {
    timeline.push({
      time: r.publishedAt ? cleanSearchText(r.publishedAt) : nowText,
      source: hostOf(r.link) || r.sourceName,
      summary: `${r.title}${r.summary ? '｜' + r.summary.slice(0, 160) : ''}`
    });
  }
  const overviewParts = [];
  overviewParts.push(`「${title}」${base.category ? `属于${base.category}方向，工作台基础传播评分 ${base.spreadScore ?? base.score ?? '--'}/100。` : '。'}`);
  if (localText) overviewParts.push(`本地已整理内容：${localText.slice(0, 260)}`);
  if (reports.length) overviewParts.push(`本次全网检索到 ${reports.length} 条相关报道（${reportSources.slice(0, 6).join('、')} 等），事件仍在持续被多个信源覆盖。`);
  else overviewParts.push('当前网络检索未能返回外部报道（可能被站点拦截或事件过新），已先整合本地历史记录。');
  const dedupTitles = [...new Set(related.map((r) => r.title))].slice(0, 6);
  return {
    title,
    category: base.category || item.category || '',
    source: base.source || item.source || '公开信息',
    link: base.link || item.link || '',
    score: base.spreadScore ?? base.score ?? item.spreadScore ?? '',
    spread: base.spread || item.spread || '',
    query,
    searchedAt: nowText,
    overview: overviewParts.join('\n'),
    localCount: related.length || (found && found.item ? 1 : 0),
    localSources: [...localSources],
    relatedTitles: dedupTitles,
    reports,
    reportSources,
    timeline
  };
}

async function buildPeriodReport(scope) {
  const valid = ['daily', 'weekly', 'monthly', 'yearly'].includes(scope) ? scope : 'daily';
  const runs = await loadAllClassifyRuns(300);
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const day = now.getDate();
  const pad = (n) => String(n).padStart(2, '0');
  const today = `${y}${pad(m)}${pad(day)}`;
  const keep = (r) => {
    if (!r.date) return false;
    const d = r.date;
    if (valid === 'daily') return `${y}${pad(m)}${pad(day)}` === String(r.run).slice(0, 8);
    if (valid === 'weekly') return (now - d) <= 7 * 24 * 3600 * 1000 && d <= now;
    if (valid === 'monthly') return d.getFullYear() === y && d.getMonth() + 1 === m;
    return d.getFullYear() === y;
  };
  const picked = runs.filter(keep);
  const items = picked.flatMap((r) => r.items || []).filter((it) => it && it.title);
  const catCount = {};
  const titleCount = {};
  const sourceSet = new Set();
  let scoreSum = 0;
  for (const it of items) {
    const cat = it.category || '未分类';
    catCount[cat] = (catCount[cat] || 0) + 1;
    const key = String(it.title).replace(/[^\p{L}\p{N}]/gu, '').toLowerCase().slice(0, 60);
    titleCount[key] = titleCount[key] || { title: it.title, count: 0, score: Number(it.spreadScore || it.score || 0) };
    titleCount[key].count += 1;
    if (it.source) sourceSet.add(it.source);
    scoreSum += Number(it.spreadScore || it.score || 0);
  }
  const topTitles = Object.values(titleCount).sort((a, b) => b.count - a.count || b.score - a.score).slice(0, 8);
  const names = { daily: '日报', weekly: '周报', monthly: '月报', yearly: '年报' };
  const name = names[valid];
  const dateText = `${y}年${m}月${day}日`;
  const title = `${name} · ${dateText}`;
  const lines = [
    `# ${title}`,
    '',
    `生成时间：${cnNowText()}`,
    `覆盖档期：${picked.length ? picked[0].run + ' ~ ' + picked[picked.length - 1].run : '无'}`,
    '',
    `共收集 ${items.length} 条有效信息，平均传播评分 ${items.length ? Math.round(scoreSum / items.length) : 0}/100。`,
    '',
    '## 分类分布',
    ...Object.entries(catCount).sort((a, b) => b[1] - a[1]).map(([c, n]) => `- ${c}：${n} 条`),
    '',
    '## 高频/高分话题',
    ...topTitles.map((t, i) => `${i + 1}. ${t.title}（出现 ${t.count} 次｜${t.score}/100）`),
    '',
    `## 主要来源`,
    ...(sourceSet.size ? [...sourceSet].slice(0, 12).map((s) => `- ${s}`) : ['- 暂无']),
    '',
    '> 数据来自工作台自动采集与分类汇总，仅供运营参考。'
  ];
  const content = lines.join('\n');
  const file = path.join(DATA_DIR, 'reports', `${today}_${valid}.md`);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content, 'utf8');
  return {
    scope: valid,
    name,
    title,
    content,
    count: items.length,
    file: path.relative(ROOT, file).replace(/\\/g, '/')
  };
}

async function chatReply(config, message, history = []) {
  const msg = String(message || '').trim();
  const lower = msg.toLowerCase();
  if (/(日|周|月|年)报/.test(msg)) {
    const scope = msg.includes('周报') ? 'weekly' : msg.includes('月报') ? 'monthly' : msg.includes('年报') ? 'yearly' : 'daily';
    const report = await buildPeriodReport(scope);
    return {
      reply: `已生成${report.name}：共 ${report.count} 条信息\n\n${report.content}`,
      action: 'report',
      report
    };
  }
  if (/一键|全流程|全网扫描|开始跑/.test(msg)) {
    const r = await runAll(config, '');
    return { reply: `已执行一键全流程（run ${r.run}）。正在生成内容，稍后到“发布审核”查看。`, action: 'run_all' };
  }
  if (/80|80分/.test(msg) && /视频|综合|合并|成片/.test(msg)) {
    const latest = await readLatestClassify();
    const high = ((latest && latest.items) || []).filter((it) => Number(it.spreadScore) >= 80);
    if (!high.length) return { reply: '当前没有评分 ≥80 的条目，请先运行全流程。', action: 'none' };
    const produced = await produce(config, { items: high });
    return {
      reply: `已把 ${high.length} 条 ≥80 分内容合并制作成综合视频：\n- 脚本：${produced.script}\n- 海报：${produced.poster}\n- 剪映任务：${produced.capcut && produced.capcut.dir ? produced.capcut.dir : '已写入 CapCut Mate 任务包'}\n可到“内容制作 → 视频制作”加载脚本查看。`,
      action: 'composite_video',
      produced
    };
  }
  if (/综合|合并|组合/.test(msg) && /视频|图文|海报/.test(msg)) {
    const latest = await readLatestClassify();
    if (!latest || !latest.items || !latest.items.length) return { reply: '暂无已分类信息，请先运行信息收集。', action: 'none' };
    const produced = await produce(config, { items: latest.items });
    return { reply: `已把当前 ${latest.items.length} 条信息综合制作：${produced.script}`, action: 'composite' };
  }
  if (/及时选题|立即选题|今日热点|热门/.test(msg)) {
    const t = await analyzeTopics(config, 'live');
    return { reply: `${t.mode}\n分析：${t.analysis}\n预判：${t.prediction}\n决策：${t.decision}\n候选：${t.candidates.map((c) => `「${c.title}」${c.score}/100`).join('、')}`, action: 'topic' };
  }
  if (/每日选题|每天选题|日报/.test(msg)) {
    const t = await analyzeTopics(config, 'daily');
    return { reply: `${t.mode}\n分析：${t.analysis}\n预判：${t.prediction}\n决策：${t.decision}\n候选：${t.candidates.map((c) => `「${c.title}」${c.score}/100`).join('、')}`, action: 'topic' };
  }
  if (/每周选题|周报|一周/.test(msg)) {
    const t = await analyzeTopics(config, 'weekly');
    return { reply: `${t.mode}\n分析：${t.analysis}\n预判：${t.prediction}\n决策：${t.decision}\n候选：${t.candidates.map((c) => `「${c.title}」${c.score}/100`).join('、')}`, action: 'topic' };
  }
  if (/汇总|评分/.test(msg)) {
    const r = await summarize(config);
    return { reply: `汇总完成：${r.file}`, action: 'summary' };
  }
  const found = await findClassifyItem(msg.replace(/^(帮我|请|制作|做|把|一下)\s*/g, '').replace(/^(视频|图文|海报)\s*/g, '').slice(0, 60));
  if (found) {
    const done = await scanProducedIndexes();
    if (done[found.item.title]) return { reply: `「${found.item.title}」已经制作过（run ${done[found.item.title].run}）。`, action: 'already' };
    const r = await makeItemFullFlow(config, found.item);
    return { reply: `「${found.item.title}」已完成单条全流程制作，正在进入发布审核（${r.audit && r.audit.phase || 'audit'}）。`, action: 'item_made' };
  }
  if (config.ai.apiKey) {
    try {
      const latest = await readLatestClassify();
      const context = ((latest && latest.items) || []).slice(0, 8).map((it) => `- ${it.title}（${it.category}｜${it.spreadScore}/100）`).join('\n');
      const base = String(config.ai.baseUrl || 'https://api.deepseek.com').replace(/\/+$/, '');
      const historyMsgs = (Array.isArray(history) ? history : []).slice(-16).map((h) => ({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: String(h.content || '')
      }));
      const aiRes = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${config.ai.apiKey}` },
        body: JSON.stringify({
          model: config.ai.model || 'deepseek-chat',
          messages: [
            { role: 'system', content: '你是媒体运营平台助手。可以讨论选题、内容策略、制作决策；不要虚构数据。若用户要求执行，请明确告诉他发送：一键运行全流程 / 及时选题 / 每日选题 / 每周选题 / 将80分以上综合成视频 / 制作《标题》。' },
            ...historyMsgs,
            { role: 'user', content: `当前热点候选：\n${context || '暂无'}\n\n请结合上面的历史对话继续：${msg}` }
          ],
          temperature: 0.7
        })
      });
      if (aiRes.ok) {
        const data = await aiRes.json();
        const answer = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (answer) return { reply: String(answer).trim(), action: 'chat' };
      }
    } catch {}
    return { reply: 'AI 回复失败，已退回指令模式。你可以说：综合80分以上出一个视频 / 每日选题 / 一键运行全流程 / 制作“标题”。', action: 'help' };
  }
  return {
    reply: '我可以执行这些指令：\n1. “将今天80分以上的综合成一个视频”\n2. “及时选题 / 每日选题 / 每周选题”\n3. “一键运行全流程”\n4. “制作《某条标题》”\n5. “汇总信息”\n\n当前未配置 AI Key，暂不能自由闲聊；配置后即可继续对话。',
    action: 'help'
  };
}

async function advanceToAudit(config) {
  if (!workflow.item || !workflow.run) return { error: '没有进行中的工作流' };
  clearWfTimer();
  const payload = await buildAuditPayload(config, workflow.item, workflow.run, workflow.customScript || null);
  workflow.phase = 'audit';
  workflow.deadline = Date.now() + 10000;
  workflow.timer = setTimeout(async () => {
    if (workflow.phase === 'audit' && workflow.run === payload.run) {
      await publishAuditRun(payload.run);
      workflow.phase = 'published';
      workflow.deadline = null;
    }
  }, 10000);
  return { ok: true, audit: payload, phase: 'audit', deadline: workflow.deadline };
}

async function serveStatic(req, res, urlPath) {
  let filePath = path.join(PUBLIC_DIR, urlPath === '/' ? 'index.html' : urlPath);
  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) filePath = path.join(filePath, 'index.html');
    const ext = path.extname(filePath).toLowerCase();
    const data = await fs.readFile(filePath);
    res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  } catch {
    sendJson(res, 404, { error: 'Not Found' });
  }
}

async function status() {
  const config = await loadConfig();
  const latestFile = path.join(DATA_DIR, 'latest.json');
  let latest = {};
  try {
    latest = JSON.parse(await fs.readFile(latestFile, 'utf8'));
  } catch {}
  const out = {};
  for (const key of Object.keys(STAGE_NAMES)) {
    out[key] = {
      name: STAGE_NAMES[key],
      latest: latest[key] || null,
      runs: await listRuns(key)
    };
  }
  let git = { available: true, branch: 'master', changed: 0, last: '' };
  try {
    const st = await execP('git status --short --branch', { cwd: ROOT, timeout: 6000, windowsHide: true });
    const lines = String(st.stdout || '').split(/\r?\n/).filter(Boolean);
    const head = (lines.shift() || '').replace(/^##\s*/, '');
    const branchMatch = head.match(/^([^\s.]+)/);
    const aheadMatch = head.match(/ahead\s+(\d+)/);
    git = {
      available: true,
      branch: branchMatch ? branchMatch[1] : 'master',
      changed: lines.length,
      ahead: aheadMatch ? Number(aheadMatch[1]) : 0,
      dirty: lines.length > 0
    };
    const lg = await execP('git log -1 --oneline', { cwd: ROOT, timeout: 6000, windowsHide: true });
    git.last = String(lg.stdout || '').trim();
  } catch {
    git = { available: false };
  }
  return {
    workflow: config.workflow,
    ai: { enabled: config.ai.enabled, model: config.ai.model, hasKey: !!(config.ai.apiKey || ENV.DEEPSEEK_API_KEY || ENV.AI_API_KEY) },
    stages: out,
    git
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
  const p = url.pathname;

  try {
    if (req.method === 'GET' && p === '/api/status') {
      sendJson(res, 200, await status());
      return;
    }

    if (req.method === 'GET' && p === '/api/config') {
      const config = await loadConfig();
      sendJson(res, 200, config);
      return;
    }

    if (req.method === 'GET' && p === '/api/capcut/status') {
      const config = await loadConfig();
      sendJson(res, 200, await capcutMateInfo(config));
      return;
    }

    if (req.method === 'POST' && p === '/api/capcut/start') {
      const config = await loadConfig();
      const result = await startCapcutMate(config);
      sendJson(result.ok ? 200 : 400, result);
      return;
    }

    if (req.method === 'GET' && p === '/api/moneyprinter/status') {
      const config = await loadConfig();
      sendJson(res, 200, await moneyPrinterInfo(config));
      return;
    }

    if (req.method === 'GET' && p === '/api/heat') {
      const heatDir = path.join(DATA_DIR, 'heat');
      let heat = null;
      try {
        const files = (await fs.readdir(heatDir)).filter((f) => f.endsWith('.json')).sort().reverse();
        if (files.length) heat = JSON.parse(await fs.readFile(path.join(heatDir, files[0]), 'utf8'));
      } catch {}
      sendJson(res, 200, heat || { available: false, note: '暂无热度榜数据' });
      return;
    }

    if (req.method === 'GET' && p === '/api/content') {
      const latestFile = path.join(DATA_DIR, 'latest.json');
      const latest = JSON.parse(await fs.readFile(latestFile, 'utf8'));
      let classify = null;
      if (latest.classify && latest.classify.file) {
        try {
          classify = JSON.parse(await fs.readFile(path.join(ROOT, latest.classify.file), 'utf8'));
        } catch {}
      }
      let clipsIndex = [];
      if (latest.produce && latest.produce.file) {
        try {
          const meta = JSON.parse(await fs.readFile(path.join(ROOT, latest.produce.file), 'utf8'));
          if (meta.clipsIndexFile) {
            clipsIndex = JSON.parse(await fs.readFile(path.join(ROOT, meta.clipsIndexFile), 'utf8'));
          }
        } catch {}
      }
      const items = ((classify && classify.items) || []).map(cleanItemForDisplay).filter(Boolean);
      const byTitle = new Map(clipsIndex.map((c) => [c.title, c]));
      const enrich = (it) => ({ ...it, clip: byTitle.get(it.title) || null });
      const a = {};
      const b = {};
      const byCategory = {};
      for (const cat of ['国际', '国内', '财经', '八卦', '娱乐', '游戏', '搞笑']) {
        byCategory[cat] = items.filter((it) => it.category === cat).map(enrich);
      }
      a['国内'] = byCategory['国内'];
      a['财经'] = byCategory['财经'];
      a['国际'] = byCategory['国际'];
      for (const cat of ['八卦', '娱乐', '游戏', '搞笑']) b[cat] = items.filter((it) => it.category === cat).map(enrich);
      const heatDir = path.join(DATA_DIR, 'heat');
      let heat = null;
      try {
        const files = (await fs.readdir(heatDir)).filter((f) => f.endsWith('.json')).sort().reverse();
        if (files.length) heat = JSON.parse(await fs.readFile(path.join(heatDir, files[0]), 'utf8'));
      } catch {}
      sendJson(res, 200, {
        a,
        b,
        byCategory,
        c: heat,
        updatedAt: classify ? classify.generatedAt : null,
        produceRun: latest.produce ? latest.produce.run : null
      });
      return;
    }

    if (req.method === 'GET' && p === '/api/classify-history') {
      const dir = path.join(DATA_DIR, '03_classified');
      const runs = [];
      const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 20, 1), 500);
      const dateFilter = String(url.searchParams.get('date') || '').replace(/\D/g, '');
      try {
        let files = (await fs.readdir(dir)).filter((f) => f.endsWith('.json')).sort().reverse();
        if (dateFilter) files = files.filter((f) => f.startsWith(dateFilter));
        files = files.slice(0, limit);
        for (const f of files) {
          try {
            const payload = JSON.parse(await fs.readFile(path.join(dir, f), 'utf8'));
            runs.push({
              run: payload.run || f.replace('.json', ''),
              generatedAt: payload.generatedAt || null,
              count: payload.count || (payload.items ? payload.items.length : 0),
              items: (payload.items || []).map(cleanItemForDisplay).filter(Boolean).map((it) => ({
                title: it.title,
                category: it.category,
                spread: it.spread,
                spreadScore: it.spreadScore,
                source: it.source,
                link: it.link,
                summary: it.summary,
                fullText: it.fullText
              }))
            });
          } catch {}
        }
      } catch {}
      sendJson(res, 200, { runs, latestRun: runs.length ? runs[0].run : null });
      return;
    }

    if (req.method === 'GET' && p === '/api/category/list') {
      const obj = await loadCategorySources();
      const defaults = ['国际', '国内', '财经', '八卦', '娱乐', '游戏', '搞笑'];
      const extra = Object.keys(obj).filter((k) => !defaults.includes(k));
      sendJson(res, 200, { defaults, extra, all: defaults.concat(extra) });
      return;
    }

    if (req.method === 'GET' && p === '/api/sources') {
      const config = await loadConfig();
      sendJson(res, 200, {
        official: config.sources || [],
        categories: await loadCategorySources()
      });
      return;
    }

    if (req.method === 'POST' && p === '/api/category/add') {
      const body = await readBody(req);
      const name = String(body.name || '').trim().slice(0, 12);
      if (!name) {
        sendJson(res, 400, { error: '请输入分类名称' });
        return;
      }
      const obj = await loadCategorySources();
      if (obj[name] && obj[name].length) {
        sendJson(res, 200, { ok: true, exists: true, name, count: obj[name].length });
        return;
      }
      const sources = buildCategorySearchSources(name);
      obj[name] = sources;
      await saveCategorySources(obj);
      sendJson(res, 200, { ok: true, exists: false, name, count: sources.length, sources });
      return;
    }

    if (req.method === 'POST' && p === '/api/category/delete') {
      const body = await readBody(req);
      const name = String(body.name || '').trim();
      const defaults = ['国际', '国内', '财经', '八卦', '娱乐', '游戏', '搞笑'];
      if (defaults.includes(name)) {
        sendJson(res, 400, { error: `「${name}」是内置分类，不可删除` });
        return;
      }
      const obj = await loadCategorySources();
      if (!obj[name]) {
        sendJson(res, 200, { ok: true, removed: false, name });
        return;
      }
      delete obj[name];
      await saveCategorySources(obj);
      sendJson(res, 200, { ok: true, removed: true, name });
      return;
    }

    if (req.method === 'GET' && p === '/api/item-images') {
      const targetUrl = url.searchParams.get('url') || '';
      if (!/^https?:\/\//i.test(targetUrl)) {
        sendJson(res, 200, { images: [] });
        return;
      }
      const images = await extractImagesFromUrl(targetUrl);
      sendJson(res, 200, { images });
      return;
    }

    if (req.method === 'GET' && p === '/api/summary') {
      const latestFile = path.join(DATA_DIR, 'latest.json');
      const latest = JSON.parse(await fs.readFile(latestFile, 'utf8'));
      let summary = null;
      if (latest.summary && latest.summary.file) {
        try {
          summary = JSON.parse(await fs.readFile(path.join(ROOT, latest.summary.file), 'utf8'));
        } catch {}
      }
      sendJson(res, 200, summary || { items: [], note: '暂无汇总数据，请先运行「信息分类→汇总信息」' });
      return;
    }

    if (req.method === 'GET' && p === '/api/scan/status') {
      const config = await loadConfig();
      sendJson(res, 200, {
        scanMinutes: Number((config.workflow && config.workflow.scanMinutes)) || 0,
        lastScanAt,
        nextScanAt,
        running: scanning
      });
      return;
    }

    if (req.method === 'POST' && p === '/api/scan') {
      const result = await runAutoScan();
      sendJson(res, 200, result);
      return;
    }

    if (req.method === 'POST' && p === '/api/save') {
      const body = await readBody(req);
      const file = body.path || '';
      if (!file || !isSafePath(file)) {
        sendJson(res, 400, { error: '非法路径' });
        return;
      }
      const full = path.isAbsolute(file) ? path.normalize(file) : path.join(ROOT, file);
      if (!full.startsWith(DATA_DIR + path.sep) && !full.startsWith(CAPCUT_PROJECT + path.sep)) {
        sendJson(res, 400, { error: '仅允许保存到数据目录' });
        return;
      }
      await fs.mkdir(path.dirname(full), { recursive: true });
      await fs.writeFile(full, String(body.content ?? ''), 'utf8');
      sendJson(res, 200, { ok: true, path: file });
      return;
    }

    if (req.method === 'POST' && p === '/api/upload-image') {
      const body = await readBody(req);
      const name = String(body.name || 'upload.png').replace(/[\\/:*?"<>|]/g, '_').slice(0, 60);
      const m = String(body.dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
      if (!m) {
        sendJson(res, 400, { error: '图片数据格式错误' });
        return;
      }
      const buf = Buffer.from(m[2], 'base64');
      const dir = path.join(DATA_DIR, 'uploads');
      await fs.mkdir(dir, { recursive: true });
      const file = path.join(dir, `${runStampNow()}_${name}`);
      await fs.writeFile(file, buf);
      sendJson(res, 200, { ok: true, file: path.relative(ROOT, file).replace(/\\/g, '/') });
      return;
    }

    if (req.method === 'POST' && p === '/api/upload-asset') {
      const body = await readBody(req);
      const kind = String(body.kind || 'asset').replace(/[^a-z0-9_-]/gi, '').slice(0, 24) || 'asset';
      const name = String(body.name || 'upload.bin').replace(/[\\/:*?"<>|]/g, '_').slice(0, 80);
      const m = String(body.dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
      if (!m) {
        sendJson(res, 400, { error: '文件数据格式错误' });
        return;
      }
      const buf = Buffer.from(m[2], 'base64');
      const dir = path.join(DATA_DIR, 'uploads', kind);
      await fs.mkdir(dir, { recursive: true });
      const file = path.join(dir, `${runStampNow()}_${name}`);
      await fs.writeFile(file, buf);
      sendJson(res, 200, { ok: true, kind, file: path.relative(ROOT, file).replace(/\\/g, '/') });
      return;
    }

    if (req.method === 'POST' && p === '/api/materials/upload') {
      const body = await readBody(req);
      const session = String(body.session || runStampNow()).replace(/[\\/:*?"<>|]/g, '_');
      const base = path.join(DATA_DIR, 'local_materials', session);
      const files = Array.isArray(body.files) ? body.files : [];
      let count = 0;
      for (const f of files) {
        const name = String(f.name || 'file').replace(/[\\/:*?"<>|]/g, '_');
        const rel = String(f.relPath || name).replace(/^[\\/]+/, '');
        const m = String(f.dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
        if (!m) continue;
        const target = path.join(base, rel);
        if (!target.startsWith(base + path.sep)) continue;
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, Buffer.from(m[2], 'base64'));
        count++;
      }
      sendJson(res, 200, { ok: true, session, count, dir: base });
      return;
    }

    if (req.method === 'GET' && p === '/api/materials/list') {
      const root = path.join(DATA_DIR, 'local_materials');
      const sessions = [];
      try {
        const dirs = await fs.readdir(root, { withFileTypes: true });
        for (const d of dirs.filter((x) => x.isDirectory()).sort((a, b) => b.name.localeCompare(a.name)).slice(0, 20)) {
          const files = [];
          const walk = async (dir, prefix) => {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const e of entries) {
              const full = path.join(dir, e.name);
              if (e.isDirectory()) await walk(full, path.join(prefix, e.name));
              else files.push(path.join(prefix, e.name).replace(/\\/g, '/'));
            }
          };
          await walk(path.join(root, d.name), '');
          sessions.push({ session: d.name, files });
        }
      } catch {}
      sendJson(res, 200, { sessions });
      return;
    }

    if (req.method === 'GET' && p === '/api/produced') {
      sendJson(res, 200, { items: await scanProducedIndexes() });
      return;
    }

    if (req.method === 'POST' && p === '/api/item/make') {
      const body = await readBody(req);
      const config = await loadConfig();
      const found = await findClassifyItem(String(body.title || ''));
      if (!found) {
        sendJson(res, 404, { error: '未找到该条目，请先运行信息分类' });
        return;
      }
      const done = await scanProducedIndexes();
      if (done[found.item.title]) {
        sendJson(res, 200, { ok: true, alreadyMade: true, status: done[found.item.title] });
        return;
      }
      const result = await makeItemFullFlow(config, found.item);
      sendJson(res, 200, { ok: true, alreadyMade: false, ...result });
      return;
    }

    if (req.method === 'POST' && p === '/api/item/analyze') {
      const body = await readBody(req);
      const mode = ['live', 'daily', 'weekly'].includes(body.mode) ? body.mode : 'daily';
      const config = await loadConfig();
      sendJson(res, 200, await analyzeTopics(config, mode, { run: body.run, date: body.date }));
      return;
    }

    if (req.method === 'POST' && p === '/api/item/deep') {
      const body = await readBody(req);
      const title = sanitizeText(body.title || '');
      if (!title) {
        sendJson(res, 400, { error: '缺少条目标题' });
        return;
      }
      let item = {
        title,
        category: sanitizeText(body.category),
        source: sanitizeText(body.source),
        link: sanitizeText(body.link),
        fullText: sanitizeText(body.fullText),
        summary: sanitizeText(body.summary)
      };
      try {
        const found = await findClassifyItem(title);
        if (found && found.item) item = { ...found.item, ...item };
      } catch {}
      const cacheKey = String(title).replace(/[^\p{L}\p{N}]/gu, '').toLowerCase().slice(0, 60);
      const hit = deepCache.get(cacheKey);
      if (hit && Date.now() - hit._at < 30 * 60 * 1000) {
        sendJson(res, 200, { ...hit, searchedAt: cnNowText() });
        return;
      }
      try {
        const data = await deepIntegrateItem(item);
        deepCache.set(cacheKey, { ...data, _at: Date.now() });
        sendJson(res, 200, data);
      } catch (err) {
        sendJson(res, 502, { error: `全网深度整合失败：${err.message}` });
      }
      return;
    }

    if (req.method === 'GET' && p === '/api/assistant/history') {
      sendJson(res, 200, { history: await loadAssistantHistory(80) });
      return;
    }

    if (req.method === 'POST' && p === '/api/assistant/history') {
      const body = await readBody(req);
      const role = body.role === 'user' ? 'user' : 'assistant';
      const content = String(body.content || '').slice(0, 8000);
      if (!content) {
        sendJson(res, 400, { error: '内容不能为空' });
        return;
      }
      const history = await appendAssistantHistory([{ role, content }]);
      sendJson(res, 200, { ok: true, history });
      return;
    }

    if (req.method === 'POST' && p === '/api/report') {
      const body = await readBody(req);
      const report = await buildPeriodReport(String(body.scope || 'daily'));
      sendJson(res, 200, report);
      return;
    }

    if (req.method === 'POST' && p === '/api/chat') {
      const body = await readBody(req);
      const config = await loadConfig();
      const history = await loadAssistantHistory(40);
      const result = await chatReply(config, body.message || '', history);
      await appendAssistantHistory([
        { role: 'user', content: String(body.message || '').slice(0, 4000) },
        { role: 'assistant', content: String(result.reply || '').slice(0, 8000) }
      ]);
      sendJson(res, 200, { ...result, history: await loadAssistantHistory(80) });
      return;
    }

    if (req.method === 'POST' && p === '/api/materials/make') {
      const body = await readBody(req);
      const session = String(body.session || '').replace(/[\\/:*?"<>|]/g, '');
      if (!session) {
        sendJson(res, 400, { error: '缺少素材会话' });
        return;
      }
      const title = String(body.title || `本地素材·${session}`).trim().slice(0, 50);
      const config = await loadConfig();
      const files = await listLocalFiles(session);
      const textExt = new Set(['.txt', '.md', '.markdown', '.csv', '.json', '.srt', '.vtt', '.html', '.htm', '.log', '.xml']);
      const textPieces = [];
      for (const f of files.slice(0, 12)) {
        const ext = path.extname(f.name || '').toLowerCase();
        if (!textExt.has(ext) || f.size > 200 * 1024) continue;
        try {
          const abs = path.join(DATA_DIR, 'local_materials', session, f.rel);
          const raw = await fs.readFile(abs, 'utf8');
          const snippet = raw.replace(/\s+/g, ' ').trim().slice(0, 1800);
          if (snippet) textPieces.push(`[${f.rel}]\n${snippet}`);
        } catch {}
      }
      const inventory = files.map((f) => `- ${f.rel}（${f.size < 1024 * 1024 ? Math.max(1, Math.round(f.size / 1024)) + 'KB' : (f.size / 1024 / 1024).toFixed(1) + 'MB'}）`).join('\n');
      const fullText = `本地素材：${title}\n共 ${files.length} 个文件：\n${inventory}${textPieces.length ? '\n\n提取的文本内容：\n' + textPieces.join('\n\n') : ''}`.slice(0, 8000);
      const collected = await collect(config, `${title}｜本地素材 ${files.length} 个`, true);
      collected.items = [{
        title,
        link: '',
        source: '本地素材上传',
        summary: fullText.slice(0, 260),
        fullText,
        collectedAt: new Date().toISOString()
      }];
      collected.count = 1;
      await fs.writeFile(path.join(DATA_DIR, STAGES.collect, `${collected.run}.json`), JSON.stringify(collected, null, 2), 'utf8');
      const integrated = await integrate(config, collected);
      const classified = await classify(config, integrated);
      await summarize(config, classified);
      const wf = await startWorkflow(config, { classified });
      if (wf.error) {
        sendJson(res, 404, { error: wf.error });
        return;
      }
      sendJson(res, 200, { ok: true, title, session, workflow: { run: wf.run, phase: wf.phase, deadline: wf.deadline } });
      return;
    }

    if (req.method === 'POST' && p === '/api/make-video') {
      const body = await readBody(req);
      const title = body.title || '';
      const config = await loadConfig();
      const videoModel = String(body.videoModel || config.ai.videoModel || 'capcut').trim();
      if (videoModel !== 'capcut' && videoModel !== 'moneyprinter') {
        const jimeng = (config.integrations && config.integrations.jimeng) || {};
        const hint = videoModel === 'jimeng'
          ? (jimeng.cliInstalled
            ? `即梦 CLI 已安装（${jimeng.cliPath}）。请先运行 ${jimeng.cliPath} login 完成登录；登录后可用 dreamina text2video 生成。`
            : '即梦 CLI 未安装，请在一键添加中粘贴 curl -s https://jimeng.jianying.com/cli | bash')
          : `已选择「${videoModel}」视频模型：请在「一键添加 API」中配置对应视频模型`;
        sendJson(res, 400, { error: hint });
        return;
      }
      const latestFile = path.join(DATA_DIR, 'latest.json');
      const latest = JSON.parse(await fs.readFile(latestFile, 'utf8'));
      let classify = null;
      if (latest.classify && latest.classify.file) {
        try {
          classify = JSON.parse(await fs.readFile(path.join(ROOT, latest.classify.file), 'utf8'));
        } catch {}
      }
      let item = (classify && classify.items || []).find((it) => it.title === title) || null;
      if (!item && latest.summary && latest.summary.file) {
        try {
          const sm = JSON.parse(await fs.readFile(path.join(ROOT, latest.summary.file), 'utf8'));
          const found = (sm.items || []).find((it) => it.title === title);
          if (found) {
            item = {
              title: found.title,
              category: found.category || '指定',
              spreadScore: found.score,
              source: found.source || '用户指定',
              link: found.link,
              summary: found.content || '',
              fullText: found.content || ''
            };
          }
        } catch {}
      }
      if (!item) {
        item = {
          title,
          category: String(body.category || '指定'),
          spreadScore: Number(body.score) || 80,
          source: String(body.source || '用户指定'),
          link: String(body.link || ''),
          summary: String(body.summary || ''),
          fullText: String(body.summary || '')
        };
      }
      if (videoModel === 'moneyprinter') {
        const mp = await moneyPrinterInfo(config);
        if (!mp.online) {
          sendJson(res, 400, {
            error: 'MoneyPrinterTurbo 未启动。请先在 integrations/MoneyPrinterTurbo 目录完成依赖安装后运行：python main.py（默认 http://127.0.0.1:8080）',
            engineInfo: mp
          });
          return;
        }
        const rawScript = String(body.script || '').trim() || String(item.fullText || item.summary || item.title || '');
        const cleanScript = rawScript
          .replace(/```/g, '')
          .replace(/^#{1,6}\s*/gm, '')
          .replace(/^>\s*/gm, '')
          .replace(/^\|.*\|$/gm, '')
          .replace(/^\s*[-*]\s+/gm, '')
          .split(/\n+/)
          .map((s) => s.trim())
          .filter(Boolean)
          .join('\n')
          .slice(0, 8000);
        const width = Number(String(body.width || '1920').split('x')[0]) || 1920;
        const height = Number(String(body.height || '1080').split('x')[1] || String(body.height || '1080')) || 1080;
        const aspect = width === height ? '1:1' : width > height ? '16:9' : '9:16';
        const localFiles = Array.isArray(body.localFiles) ? body.localFiles : [];
        const materials = [];
        for (const rel of localFiles) {
          const full = String(rel).replace(/\\/g, '/');
          if (!full.startsWith('data/')) continue;
          const abs = path.join(ROOT, full);
          if (!abs.startsWith(DATA_DIR + path.sep)) continue;
          try {
            const stored = await uploadLocalMaterial(mp.api, abs, path.basename(abs));
            materials.push({ provider: 'local', url: stored });
          } catch (err) {
            materials.push({ provider: 'pexels', url: '' });
          }
        }
        const payload = {
          video_subject: String(item.title || '热点短视频').slice(0, 500),
          video_script: cleanScript,
          video_terms: [String(item.category || '综合')],
          video_aspect: aspect,
          video_concat_mode: 'random',
          video_source: materials.length ? 'local' : 'pexels',
          video_materials: materials.length ? materials : null,
          video_count: 1,
          subtitle_enabled: true,
          voice_name: '',
          bgm_type: 'random'
        };
        const resp = await fetch(`${mp.api}/api/v1/videos`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok || (data.status && data.status >= 400)) {
          sendJson(res, 502, {
            error: `MoneyPrinterTurbo 任务创建失败：${(data && data.message) || resp.status}（请检查 integrations/MoneyPrinterTurbo 的 API Key 与 config.toml）`
          });
          return;
        }
        const taskId = (data.data && (data.data.task_id || data.data.taskId)) || '';
        sendJson(res, 200, {
          ok: true,
          engine: 'moneyprinter',
          mode: body.mode || 'auto',
          taskId,
          statusUrl: taskId ? `${mp.api}/api/v1/tasks/${taskId}` : `${mp.api}/docs`,
          engineInfo: mp,
          payload
        });
        return;
      }
      const d = new Date();
      const p = (n) => String(n).padStart(2, '0');
      const run = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
      const processedText = (body.script && body.script.trim()) || `${item.fullText || item.summary || item.title || ''}`;
      let rawImages = [];
      if (item.link && String(body.mode || 'auto') === 'auto') {
        try {
          rawImages = (await extractImagesFromUrl(item.link)).slice(0, 5);
        } catch {}
      }
      const job = await buildCapCutJob(
        {
          config,
          classified: { items: [item] },
          processedText,
          produced: { run, poster: '' }
        },
        {
          width: Number(String(body.width || '1920').split('x')[0]) || 1920,
          height: Number(String(body.height || '1080').split('x')[1] || String(body.height || '1080')) || 1080,
          title: item.title,
          images: rawImages
        }
      );
      const capcut = await capcutMateInfo(config);
      let draftUrl = null;
      if (capcut.online) {
        try {
          const dr = await fetch(`${capcut.api}/openapi/capcut-mate/v1/create_draft`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              width: Number(String(body.width || '1920').split('x')[0]) || 1920,
              height: Number(String(body.height || '1080').split('x')[1] || String(body.height || '1080')) || 1080
            })
          });
          const dj = await dr.json().catch(() => ({}));
          if (dj.draft_url) draftUrl = dj.draft_url;
        } catch {}
      }
      if (draftUrl) {
        await fs.writeFile(path.join(job.dir, 'capcut_draft_url.txt'), draftUrl, 'utf8');
        const jobFile = path.join(job.dir, 'job.json');
        try {
          const j = JSON.parse(await fs.readFile(jobFile, 'utf8'));
          j.draft_url = draftUrl;
          await fs.writeFile(jobFile, JSON.stringify(j, null, 2), 'utf8');
        } catch {}
      }
      sendJson(res, 200, {
        ok: true,
        mode: body.mode || 'auto',
        run,
        jobDir: job.dir,
        files: job.files,
        draftUrl,
        capcutMate: capcut,
        aiTool: (config.integrations && config.integrations.capcutMate && config.integrations.capcutMate.aiTool) || '剪映图文成片'
      });
      return;
    }

    if (req.method === 'POST' && p === '/api/make-cover') {
      const body = await readBody(req);
      const width = Number(String(body.width || '1920').split('x')[0]) || 1920;
      const height = Number(String(body.height || '1080').split('x')[1] || String(body.height || '1080')) || 1080;
      const title = String(body.title || '封面');
      const d = new Date();
      const p = (n) => String(n).padStart(2, '0');
      const file = path.join(DATA_DIR, 'covers', `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.svg`);
      await fs.mkdir(path.dirname(file), { recursive: true });
      const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const svg = String(body.style) === 'comic' ? comicCoverSvg(title, width, height) : `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0d1117"/><stop offset="100%" stop-color="#1f2937"/></linearGradient></defs>
  <rect width="${width}" height="${height}" fill="url(#g)"/>
  <rect x="${width * 0.05}" y="${height * 0.05}" width="${width * 0.9}" height="${height * 0.9}" rx="24" fill="none" stroke="#22d3ee" stroke-width="3"/>
  <text x="${width / 2}" y="${height * 0.42}" text-anchor="middle" font-size="${Math.min(width, height) * 0.07}" font-weight="800" fill="#58a6ff">${esc(title)}</text>
  <text x="${width / 2}" y="${height * 0.58}" text-anchor="middle" font-size="${Math.min(width, height) * 0.035}" fill="#9ca3af">媒体运营平台 · 封面</text>
</svg>`;
      await fs.writeFile(file, svg, 'utf8');
      sendJson(res, 200, { ok: true, file: path.relative(ROOT, file).replace(/\\/g, '/'), svg });
      return;
    }

    if (req.method === 'POST' && p === '/api/make-cover-ai') {
      const body = await readBody(req);
      const width = Number(String(body.width || '1080').split('x')[0]) || 1080;
      const height = Number(String(body.height || '1920').split('x')[1] || String(body.height || '1920')) || 1920;
      const prompt = String(body.prompt || body.title || '').trim();
      if (!prompt) {
        sendJson(res, 400, { error: '请填写图片提示词' });
        return;
      }
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 90000);
      try {
        const config = await loadConfig();
        const imageModel = String(body.model || config.ai.imageModel || 'pollinations-flux').trim();
        let buf = null;
        if (imageModel.startsWith('pollinations')) {
          const model = imageModel.replace(/^pollinations-?/, '') || 'flux';
          const enc = encodeURIComponent(prompt);
          const seed = Math.floor(Math.random() * 1000000);
          const imageUrl = `https://image.pollinations.ai/prompt/${enc}?width=${width}&height=${height}&nologo=true&model=${model}&seed=${seed}`;
          const resp = await fetch(imageUrl, {
            signal: ac.signal,
            headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
          });
          const ctype = String(resp.headers.get('content-type') || '');
          if (!resp.ok || !ctype.includes('image/')) {
            const text = await resp.text().catch(() => '');
            sendJson(res, 502, { error: `生图服务返回异常：${(text || ctype || resp.status).toString().slice(0, 200)}` });
            return;
          }
          buf = Buffer.from(await resp.arrayBuffer());
        } else {
          const llmList = (config.integrations && config.integrations.llm) || [];
          const jimeng = (config.integrations && config.integrations.jimeng) || {};
          if (imageModel === 'jimeng') {
            if (!jimeng.cliInstalled) {
              sendJson(res, 400, { error: '即梦 CLI 未安装。请在一键添加中粘贴：curl -s https://jimeng.jianying.com/cli | bash' });
              return;
            }
            sendJson(res, 400, { error: `即梦 CLI 已安装（${jimeng.cliPath}）。请先完成 ${jimeng.cliPath} login 登录，登录后即梦图片将可用。` });
            return;
          }
          const llm = llmList.find((x) => x && x.model === imageModel)
            || llmList.find((x) => x && x.name && /图片|image|draw|dall|flux|jimeng/i.test(x.name));
          if (!llm || !llm.apiKey || !llm.baseUrl) {
            sendJson(res, 400, { error: `图片模型「${imageModel}」尚未配置 API。请点击右上角「＋ 添加」配置后重试` });
            return;
          }
          const base = String(llm.baseUrl).replace(/\/+$/, '');
          const resp = await fetch(`${base}/images/generations`, {
            method: 'POST',
            signal: ac.signal,
            headers: { 'content-type': 'application/json', authorization: `Bearer ${llm.apiKey}` },
            body: JSON.stringify({
              model: llm.model || imageModel,
              prompt,
              size: `${width}x${height}`,
              response_format: 'b64_json'
            })
          });
          const data = await resp.json().catch(() => ({}));
          const b64 = data && data.data && data.data[0] && (data.data[0].b64_json || data.data[0].url);
          if (!resp.ok || !b64) {
            sendJson(res, 502, { error: `生图 API「${imageModel}」调用失败：${(data.error && (data.error.message || JSON.stringify(data.error))) || resp.status}` });
            return;
          }
          if (String(b64).startsWith('http')) {
            const imgResp = await fetch(b64, { signal: ac.signal });
            buf = Buffer.from(await imgResp.arrayBuffer());
          } else {
            buf = Buffer.from(b64, 'base64');
          }
        }
        await fs.mkdir(path.join(DATA_DIR, 'covers'), { recursive: true });
        const file = path.join(DATA_DIR, 'covers', `${Date.now()}_ai.png`);
        await fs.writeFile(file, buf);
        sendJson(res, 200, { ok: true, file: path.relative(ROOT, file).replace(/\\/g, '/') });
      } catch (err) {
        sendJson(res, 502, { error: `免费生图失败：${err.message}（可改用 SVG 或本地上传）` });
      } finally {
        clearTimeout(timer);
      }
      return;
    }

    if (req.method === 'POST' && p.startsWith('/api/variants/')) {
      const kind = p.slice('/api/variants/'.length);
      const body = await readBody(req);
      const classify = await readLatestClassify();
      const item = (classify && classify.items || []).find((it) => it.title === body.title) || null;
      if (!item) {
        sendJson(res, 404, { error: '未找到该条目' });
        return;
      }
      const width = Number(String(body.width || '1920').split('x')[0]) || 1920;
      const height = Number(String(body.height || '1080').split('x')[1] || String(body.height || '1080')) || 1080;
      if (kind === 'video') {
        const variants = [1, 2, 3].map((n) => ({ id: `v${n}`, label: `方案 V${n}`, content: videoVariant(item, n) }));
        sendJson(res, 200, { ok: true, variants });
        return;
      }
      if (kind === 'article') {
        const variants = [1, 2, 3].map((n) => ({ id: `v${n}`, label: `方案 V${n}`, content: articleVariant(item, n) }));
        sendJson(res, 200, { ok: true, variants });
        return;
      }
      if (kind === 'cover') {
        const variants = [1, 2, 3].map((n) => ({ id: `v${n}`, label: `方案 V${n}`, svg: coverVariant(item, n, width, height) }));
        sendJson(res, 200, { ok: true, variants });
        return;
      }
      sendJson(res, 404, { error: '未知类型' });
      return;
    }

    if (req.method === 'POST' && p === '/api/run/full') {
      const body = await readBody(req);
      const config = await loadConfig();
      const mins = Number(body.scanMinutes);
      if (Number.isFinite(mins)) {
        config.workflow.scanMinutes = mins;
        await saveConfig(config);
        resetScheduler(config);
      }
      const result = await runAll(config);
      const wf = await startWorkflow(config, result);
      if (wf.error) {
        sendJson(res, 404, { error: wf.error });
        return;
      }
      sendJson(res, 200, {
        ok: true,
        workflow: { run: wf.run, phase: wf.phase, deadline: wf.deadline },
        note: `AI 内容已生成（V1 默认）。${config.workflow.scanMinutes ? `已按每 ${config.workflow.scanMinutes} 分钟自动扫描。` : '自动扫描已关闭，仅本次运行。'}10 秒内无修改意见将自动进入分发审核，审核完成 10 秒无人操作将自动通过。`
      });
      return;
    }

    if (req.method === 'GET' && p === '/api/workflow/status') {
      sendJson(res, 200, {
        phase: workflow.phase,
        run: workflow.run,
        deadline: workflow.deadline,
        remainingMs: workflow.deadline ? Math.max(0, workflow.deadline - Date.now()) : null,
        comment: workflow.comment,
        itemTitle: workflow.item ? workflow.item.title : null
      });
      return;
    }

    if (req.method === 'POST' && p === '/api/workflow/feedback') {
      const body = await readBody(req);
      const comment = String(body.comment || '').trim();
      if (workflow.phase === 'editing' && comment) {
        clearWfTimer();
        workflow.comment = comment;
        workflow.phase = 'manual';
        workflow.deadline = null;
        sendJson(res, 200, { ok: true, phase: 'manual', message: '已记录修改意见，等待你点击「下一步」继续' });
        return;
      }
      sendJson(res, 200, { ok: false, phase: workflow.phase, message: '当前无需反馈或已离开修改窗口' });
      return;
    }

    if (req.method === 'POST' && p === '/api/workflow/advance') {
      const config = await loadConfig();
      const body = await readBody(req);
      if (body && body.script && String(body.script).trim()) workflow.customScript = String(body.script).trim();
      if (workflow.phase === 'editing' || workflow.phase === 'manual') {
        const r = await advanceToAudit(config);
        sendJson(res, 200, { ok: true, phase: r.phase || 'audit', audit: r.audit || null, message: '已进入发布审核（10 秒无人操作将自动通过）' });
        return;
      }
      if (workflow.phase === 'audit') {
        await publishAuditRun(workflow.run);
        workflow.phase = 'published';
        workflow.deadline = null;
        clearWfTimer();
        sendJson(res, 200, { ok: true, phase: 'published', message: '已自动/手动发布（模拟）' });
        return;
      }
      sendJson(res, 200, { ok: false, phase: workflow.phase, message: '当前工作流不可推进' });
      return;
    }

    if (req.method === 'POST' && p === '/api/run/one') {
      const body = await readBody(req);
      const title = String(body.title || '').trim();
      if (!title) {
        sendJson(res, 400, { error: '请提供要运行的标题' });
        return;
      }
      const config = await loadConfig();
      const manualText = `${title} https://example.com/manual-one`;
      const collected = await collect(config, manualText, true);
      const integrated = await integrate(config, collected);
      const classified = await classify(config, integrated);
      await summarize(config, classified);
      const wf = await startWorkflow(config, { classified });
      if (wf.error) {
        sendJson(res, 404, { error: wf.error });
        return;
      }
      sendJson(res, 200, {
        ok: true,
        title,
        workflow: { run: wf.run, phase: wf.phase, deadline: wf.deadline },
        note: '单条内容已生成（V1 默认），10 秒内无修改意见将自动进入分发审核。'
      });
      return;
    }

    if (req.method === 'GET' && p === '/api/audit') {
      const latestFile = path.join(DATA_DIR, 'latest.json');
      const latest = JSON.parse(await fs.readFile(latestFile, 'utf8'));
      let audit = null;
      if (latest.publish && latest.publish.file) {
        try {
          audit = JSON.parse(await fs.readFile(path.join(ROOT, latest.publish.file), 'utf8'));
        } catch {}
      }
      sendJson(res, 200, audit || { note: '暂无发布审核数据，请先运行「一键运行全流程」' });
      return;
    }

    if (req.method === 'POST' && p === '/api/publish') {
      const body = await readBody(req);
      const latestFile = path.join(DATA_DIR, 'latest.json');
      const latest = JSON.parse(await fs.readFile(latestFile, 'utf8'));
      const run = body.run || (latest.publish && latest.publish.run);
      if (!run || !latest.publish || latest.publish.run !== run) {
        sendJson(res, 404, { error: '未找到该发布任务' });
        return;
      }
      const file = path.join(ROOT, latest.publish.file);
      const payload = JSON.parse(await fs.readFile(file, 'utf8'));
      const onlyPlatforms = Array.isArray(body.platforms) && body.platforms.length ? body.platforms : null;
      for (const key of Object.keys(payload.platforms || {})) {
        if (onlyPlatforms && !onlyPlatforms.includes(key)) continue;
        payload.platforms[key].status = '已发布（模拟）';
        payload.platforms[key].publishedAt = new Date().toISOString();
      }
      await fs.writeFile(file, JSON.stringify(payload, null, 2), 'utf8');
      sendJson(res, 200, { ok: true, message: '发布任务已提交（模拟发布；接入平台 API 后为真实发布）' });
      return;
    }

    if (req.method === 'POST' && p === '/api/install') {
      const body = await readBody(req);
      const kind = String(body.kind || 'auto');
      const source = String(body.source || '').trim();
      const name = String(body.name || '').trim() || source || '未命名';
      const baseUrl = String(body.baseUrl || '').trim();
      const model = String(body.model || '').trim();
      const apiKey = String(body.apiKey || '').trim();

      if (/jimeng\.jianying\.com\/cli/i.test(source) || /curl[^\n]{0,120}jimeng\.jianying\.com\/cli/i.test(source)) {
        const result = await installJimengCli();
        sendJson(res, result.ok ? 200 : 500, result);
        return;
      }

      if (kind === 'api' || kind === 'llm' || kind === 'jimeng') {
        const isLocal = /localhost|127\.0\.0\.1|11434/i.test(baseUrl || source);
        if (!apiKey && !(isLocal && kind === 'llm')) {
          sendJson(res, 200, { needKey: true, reason: '该服务需要 API Key 才能使用', kind, name, baseUrl, model, source });
          return;
        }
        const config = await loadConfig();
        config.integrations = config.integrations || { jimeng: { apiKey: '', endpoint: '' }, llm: [], skills: [] };
        if (kind === 'jimeng') {
          config.integrations.jimeng = { apiKey, endpoint: baseUrl || 'https://jimeng.jianying.com', model: model || '' };
        } else {
          const list = Array.isArray(config.integrations.llm) ? config.integrations.llm : [];
          list.push({ name, baseUrl, model, apiKey });
          config.integrations.llm = list;
          if (kind === 'llm') {
            config.ai = {
              ...(config.ai || {}),
              enabled: true,
              baseUrl: baseUrl || config.ai.baseUrl || '',
              model: model || config.ai.model || '',
              apiKey: apiKey || config.ai.apiKey || ''
            };
          }
        }
        await saveConfig(config);
        sendJson(res, 200, {
          ok: true,
          message: kind === 'llm'
            ? `已添加大模型 ${name}，并已设为当前 AI 引擎（模型 ${model || config.ai.model || ''}）`
            : `已添加 ${name}（密钥已保存到本地配置）`
        });
        return;
      }

      if (!source) {
        sendJson(res, 400, { error: '请粘贴 skill / 插件网址或名称' });
        return;
      }
      if (/[;&|$()\r\n]/.test(source) || source.length > 300) {
        sendJson(res, 400, { error: '来源格式不合法' });
        return;
      }
      const isZcool = /^[\p{L}\p{N}_-]+$/u.test(source);
      const command = isZcool
        ? `npx zcool-skills add ${source} -g -y`
        : `npx skills add ${source} -g -y`;
      try {
        const { stdout, stderr } = await execP(command, { cwd: ROOT, timeout: 240000, windowsHide: true });
        const tail = (stdout || stderr || '').split('\n').filter(Boolean).slice(-12).join('\n');
        const partial = /failed to install|安装失败|✗/i.test(stdout || stderr || '');
        const config = await loadConfig();
        config.integrations = config.integrations || { skills: [] };
        const skills = Array.isArray(config.integrations.skills) ? config.integrations.skills : [];
        if (!skills.some((s) => s && (s.name === name || s.source === source))) {
          skills.push({ name, source, installedAt: new Date().toISOString() });
          config.integrations.skills = skills;
          await saveConfig(config);
        }
        sendJson(res, 200, { ok: true, partial, command, output: tail });
      } catch (err) {
        const tail = String(err.stdout || err.stderr || err.message || '').split('\n').filter(Boolean).slice(-12).join('\n');
        sendJson(res, 500, { error: '安装失败', output: tail });
      }
      return;
    }

    if (req.method === 'POST' && p === '/api/config') {
      const body = await readBody(req);
      if (!body || typeof body !== 'object' || Array.isArray(body) || body.raw !== undefined) {
        sendJson(res, 400, { error: '配置必须是 JSON 对象' });
        return;
      }
      const config = await loadConfig();
      const merged = { ...config, ...body };
      if (body.workflow) merged.workflow = { ...config.workflow, ...body.workflow };
      if (body.ai) merged.ai = { ...config.ai, ...body.ai };
      if (body.server) merged.server = { ...config.server, ...body.server };
      if (body.sources) merged.sources = body.sources;
      if (body.integrations) merged.integrations = { ...(config.integrations || {}), ...body.integrations };
      if (body.categorySources && typeof body.categorySources === 'object' && !Array.isArray(body.categorySources)) {
        await saveCategorySources(body.categorySources);
        delete merged.categorySources;
      }
      await saveConfig(merged);
      resetScheduler(await loadConfig());
      sendJson(res, 200, { ok: true, config: merged });
      return;
    }

    if (req.method === 'GET' && p === '/api/file') {
      const file = url.searchParams.get('path') || '';
      if (!file || !isSafePath(file)) {
        sendJson(res, 400, { error: '非法路径' });
        return;
      }
      const full = path.isAbsolute(file) ? path.normalize(file) : path.join(ROOT, file);
      const stat = await fs.stat(full);
      if (!stat.isFile()) throw new Error('不是文件');
      const ext = path.extname(full).toLowerCase();
      if (ext === '.svg') {
        const data = await fs.readFile(full, 'utf8');
        sendJson(res, 200, { type: 'svg', content: data });
      } else if (ext === '.mp4' || ext === '.mov' || ext === '.webm') {
        const data = await fs.readFile(full);
        res.writeHead(200, { 'content-type': 'video/mp4', 'accept-ranges': 'bytes' });
        res.end(data);
      } else if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) {
        const data = await fs.readFile(full);
        res.writeHead(200, { 'content-type': 'image/' + (ext === '.jpg' ? 'jpeg' : ext.slice(1)) });
        res.end(data);
      } else {
        const data = await fs.readFile(full, 'utf8');
        sendJson(res, 200, { type: ext.slice(1), content: data });
      }
      return;
    }

    if (req.method === 'GET' && p === '/api/job-mp4') {
      const run = url.searchParams.get('run') || '';
      const found = await findRunMp4(run);
      sendJson(res, 200, { found: !!found, file: found ? found.replace(/\\/g, '/') : null });
      return;
    }

    if (req.method === 'GET' && p === '/api/download') {
      const file = url.searchParams.get('path') || '';
      if (!file || !isSafePath(file)) {
        sendJson(res, 400, { error: '非法路径' });
        return;
      }
      const full = path.join(ROOT, file);
      const data = await fs.readFile(full);
      res.writeHead(200, {
        'content-type': 'application/octet-stream',
        'content-disposition': `attachment; filename="${encodeURIComponent(path.basename(full))}"`
      });
      res.end(data);
      return;
    }

    if (req.method === 'POST' && p.startsWith('/api/run/')) {
      const stage = p.slice('/api/run/'.length);
      const body = await readBody(req);
      const config = await loadConfig();
      let result;
      if (stage === 'all') {
        result = await runAll(config, body.manualText || '');
      } else if (stage === 'collect') {
        result = await collect(config, body.manualText || '');
      } else if (stage === 'integrate') {
        result = await integrate(config);
      } else if (stage === 'classify') {
        result = await classify(config);
      } else if (stage === 'process') {
        result = await process(config);
      } else if (stage === 'produce') {
        result = await produce(config);
      } else if (stage === 'distribute') {
        result = await distribute(config);
      } else if (stage === 'summarize') {
        result = await summarize(config);
      } else {
        sendJson(res, 404, { error: '未知阶段' });
        return;
      }
      sendJson(res, 200, { ok: true, result });
      return;
    }

    await serveStatic(req, res, p);
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
});

const config = await loadConfig();
const host = config.server.host || '127.0.0.1';
const port = Number(config.server.port) || 3211;
resetScheduler(config);
server.listen(port, host, () => {
  console.log('媒体运营平台已启动：');
  console.log(`  浏览器打开 http://${host}:${port}`);
  console.log('  按 Ctrl+C 停止服务');
});
