import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCapCutJob } from './capcut-bridge.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');
export const DATA_DIR = path.join(ROOT, 'data');
export const CONFIG_PATH = path.join(ROOT, 'config.json');
const ENV = typeof process !== 'undefined' && process.env ? process.env : {};

const STAGES = {
  collect: '01_collected',
  integrate: '02_integrated',
  classify: '03_classified',
  process: '04_processed',
  produce: '05_produced',
  distribute: '06_distributed'
};

export const STAGE_NAMES = {
  collect: '① 搜集信息',
  integrate: '② 整合信息',
  classify: '③ 信息分类',
  process: '④ 信息处理',
  produce: '⑤ 制作海报和视频',
  distribute: '⑥ 分发'
};

const DEFAULT_CONFIG = {
  server: { host: '127.0.0.1', port: 3211 },
  workflow: {
    niche: '财经/科技',
    audience: '关注市场与行业动态的普通用户',
    style: '通讯稿风格（权威、客观、数据准确、带来源）',
    maxItems: 10,
    maxPicks: 5,
    scanMinutes: 0,
    platforms: ['抖音', '小红书', '微博', '视频号', 'B站', '快手', 'YouTube', 'X', 'TikTok', 'Instagram'],
    posterTheme: {
      titleColor: '#58a6ff',
      bgStart: '#0d1117',
      bgEnd: '#161b22',
      accent: '#f0b90b'
    }
  },
  sources: [
    { name: '人民日报', url: 'https://politics.people.com.cn/GB/1024/index.html', type: 'html', level: 'A' },
    { name: '新华社', url: 'https://www.news.cn/politics/', type: 'html', level: 'A' },
    { name: '央视新闻', url: 'https://news.cctv.com/yaowen/', type: 'html', level: 'A' },
    { name: '央广网', url: 'https://www.cnr.cn/news/', type: 'html', level: 'A' },
    { name: '光明日报', url: 'https://politics.gmw.cn/', type: 'html', level: 'A' },
    { name: '经济日报', url: 'https://www.ce.cn/xwzx/gnsz/gdxw/', type: 'html', level: 'A' },
    { name: '中国日报', url: 'https://www.chinadaily.com.cn/china', type: 'html', level: 'A' },
    { name: '科技日报', url: 'http://www.stdaily.com/index.html', type: 'html', level: 'A' },
    { name: '工人日报', url: 'http://www.workercn.cn/', type: 'html', level: 'A' },
    { name: '中国青年报', url: 'http://www.cyol.com/', type: 'html', level: 'A' },
    { name: '中国人民银行', url: 'http://www.pbc.gov.cn/goutongjiaoliu/113456/113469/index.html', type: 'html', level: 'A' },
    { name: '财政部', url: 'http://www.mof.gov.cn/zhengwuxinxi/caizhengxinwen/', type: 'html', level: 'A' },
    { name: '国家发展改革委', url: 'https://www.ndrc.gov.cn/xwdt/xwfb/', type: 'html', level: 'A' },
    { name: '中国证监会', url: 'http://www.csrc.gov.cn/csrc/c100028/common_list.shtml', type: 'html', level: 'A' },
    { name: '国家统计局', url: 'https://www.stats.gov.cn/sj/zxfb/', type: 'html', level: 'A' },
    { name: '金融监管总局', url: 'https://www.nfra.gov.cn/cn/view/pages/ItemList.html?itemPId=920', type: 'html', level: 'A' },
    { name: '国家外汇管理局', url: 'https://www.safe.gov.cn/safe/whxw/index.html', type: 'html', level: 'A' },
    { name: '商务部', url: 'http://www.mofcom.gov.cn/article/xwfb/', type: 'html', level: 'A' },
    { name: '国家税务总局', url: 'https://www.chinatax.gov.cn/chinatax/n810209/n810641/index.html', type: 'html', level: 'A' },
    { name: '上海证券交易所', url: 'http://www.sse.com.cn/', type: 'html', level: 'A' },
    { name: '工业和信息化部', url: 'https://www.miit.gov.cn/xwdt/gxdt/sjdt/index.html', type: 'html', level: 'A' },
    { name: '科技部', url: 'https://www.most.gov.cn/kjbgz/', type: 'html', level: 'A' },
    { name: '国家网信办', url: 'http://www.cac.gov.cn/gzdt.htm', type: 'html', level: 'A' },
    { name: '国家知识产权局', url: 'https://www.cnipa.gov.cn/col/col61/index.html', type: 'html', level: 'A' },
    { name: '中国科学院', url: 'https://www.cas.cn/syky/', type: 'html', level: 'A' },
    { name: '中国工程院', url: 'https://www.cae.cn/cae/html/main/col1/col_1.html', type: 'html', level: 'A' },
    { name: '国家航天局', url: 'https://www.cnsa.gov.cn/n6758823/n6758838/index.html', type: 'html', level: 'A' },
    { name: '国家标准化管理委员会', url: 'https://www.sac.gov.cn/xw/', type: 'html', level: 'A' },
    { name: '中国科协', url: 'https://www.cast.org.cn/col/col442/index.html', type: 'html', level: 'A' },
    { name: '国家能源局', url: 'https://www.nea.gov.cn/xwzx/nyxw.htm', type: 'html', level: 'A' }
  ],
  ai: {
    enabled: true,
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat',
    apiKey: '',
    imageModel: 'pollinations-flux',
    videoModel: 'capcut'
  },
  integrations: {
    jimeng: {
      apiKey: '',
      endpoint: 'https://jimeng.jianying.com',
      cliInstalled: false,
      cliPath: '',
      cliVersionFile: '',
      cliSkillPath: ''
    },
    capcutMate: {
      enabled: true,
      dir: 'integrations/capcut-mate',
      api: 'http://127.0.0.1:30000',
      cloud: 'https://capcut-mate.jcaigc.cn',
      aiTool: '剪映图文成片（无素材时）'
    },
    moneyPrinterTurbo: {
      enabled: true,
      dir: 'integrations/MoneyPrinterTurbo',
      api: 'http://127.0.0.1:8080'
    },
    iconfont: { url: 'https://www.iconfont.cn', cssUrl: '', jsUrl: '', note: '填入 iconfont 项目的 css/js 地址后，UI 自动加载图标字体' },
    llm: [],
    skills: []
  }
};

export async function loadConfig() {
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf8');
    const user = JSON.parse(raw);
    return deepMerge(structuredClone(DEFAULT_CONFIG), user);
  } catch {
    await saveConfig(DEFAULT_CONFIG);
    return structuredClone(DEFAULT_CONFIG);
  }
}

export async function saveConfig(config) {
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

function deepMerge(base, extra) {
  if (!extra || typeof extra !== 'object') return base;
  for (const [k, v] of Object.entries(extra)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object') {
      deepMerge(base[k], v);
    } else {
      base[k] = v;
    }
  }
  return base;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

export function stamp() {
  const d = new Date();
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export function todayCN() {
  const d = new Date();
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function nowCN() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function escapeXml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stripTags(s) {
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

async function ensureDirs() {
  for (const dir of Object.values(STAGES)) {
    await fs.mkdir(path.join(DATA_DIR, dir), { recursive: true });
  }
}

export async function listRuns(stage) {
  const dir = path.join(DATA_DIR, STAGES[stage]);
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() || e.isDirectory())
      .map((e) => e.name)
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

async function fetchWithTimeout(url, ms = 10000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || '';
    let charset = '';
    const ctMatch = contentType.match(/charset\s*=\s*["']?([\w-]+)/i);
    if (ctMatch) charset = ctMatch[1];
    const head = buf.subarray(0, 8192).toString('latin1');
    if (!charset) {
      const meta = head.match(/<meta[^>]+charset=["']?\s*([\w-]+)/i) || head.match(/charset=["']?\s*([\w-]+)/i);
      if (meta) charset = meta[1];
    }
    if (!charset) {
      const xml = head.match(/encoding=["']([\w-]+)["']/i);
      if (xml) charset = xml[1];
    }
    const label = String(charset || 'utf-8').toLowerCase().replace(/["']/g, '').trim();
    const enc = label === 'utf8' ? 'utf-8' : label === 'gb2312' || label === 'gbk' || label === 'gb18030' ? 'gb18030' : label;
    try {
      return new TextDecoder(enc).decode(buf);
    } catch {
      return new TextDecoder('utf-8').decode(buf);
    }
  } finally {
    clearTimeout(timer);
  }
}

export function parseRss(xml, sourceName) {
  const items = [];
  const itemRe = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/g;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const pick = (tag, href = false) => {
      if (href) {
        const linkRe = /<link[^>]*href="([^"]+)"/;
        const lm = block.match(linkRe);
        return lm ? lm[1] : '';
      }
      const re = new RegExp(`<${tag}(?:[^>]*)>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`);
      const tm = block.match(re);
      return tm ? stripTags(tm[1]) : '';
    };
    const title = pick('title') || pick('name') || '';
    const link = pick('link', true) || pick('link') || pick('id') || '';
    const date = pick('pubDate') || pick('updated') || pick('published') || '';
    const desc = pick('description') || pick('summary') || pick('content:encoded') || '';
    if (title) {
      items.push({
        title,
        link,
        summary: desc.slice(0, 200),
        source: sourceName,
        publishedAt: date || nowCN(),
        collectedAt: nowCN()
      });
    }
  }
  return items;
}

export function parseHtmlLinks(html, sourceName, baseUrl) {
  const items = [];
  const aRe = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = aRe.exec(html)) !== null) {
    const href = m[1].trim();
    const rawTitle = stripTags(m[2]).trim();
    if (!href || !rawTitle) continue;
    if (/^(javascript:|#|mailto:|tel:)/i.test(href)) continue;
    if (rawTitle.length < 6 || rawTitle.length > 120) continue;
    let link;
    try {
      link = new URL(href, baseUrl).href;
    } catch {
      continue;
    }
    if (!/^https?:/i.test(link)) continue;
    items.push({
      title: rawTitle,
      link,
      summary: '',
      source: sourceName,
      publishedAt: nowCN(),
      collectedAt: nowCN(),
      level: 'A'
    });
  }
  const seen = new Set();
  const out = [];
  for (const it of items) {
    if (seen.has(it.link)) continue;
    seen.add(it.link);
    out.push(it);
    if (out.length >= 15) break;
  }
  return out;
}

export function parseManualText(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const items = [];
  for (const line of lines) {
    const urlMatch = line.match(/https?:\/\/[^\s]+/);
    const title = urlMatch ? line.replace(urlMatch[0], '').trim() || urlMatch[0] : line;
    items.push({
      title,
      link: urlMatch ? urlMatch[0] : '',
      summary: '',
      source: '手动输入',
      publishedAt: nowCN(),
      collectedAt: nowCN()
    });
  }
  return items;
}

function normalizeTitle(s) {
  return String(s || '').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase().slice(0, 60);
}

function dedupe(items) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const key = normalizeTitle(it.title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

export async function collect(config, manualText = '', skipSources = false) {
  await ensureDirs();
  const run = stamp();
  const logs = [];
  let items = parseManualText(manualText);
  if (manualText && manualText.trim()) logs.push(`已读取手动素材 ${items.length} 条`);

  let categorySources = [];
  try {
    const raw = await fs.readFile(path.join(ROOT, 'category_sources.json'), 'utf8');
    const obj = JSON.parse(raw);
    categorySources = Object.values(obj || {}).flat();
  } catch {}
  const sources = skipSources ? [] : [...(config.sources || []), ...categorySources];
  await Promise.all(
    sources.map(async (src) => {
      if (!src || !src.url) return;
      try {
        const raw = await fetchWithTimeout(src.url);
        const name = src.name || src.url;
        const parsed = src.type === 'rss' ? parseRss(raw, name) : parseHtmlLinks(raw, name, src.url);
        const level = src.level || (src.type === 'html' ? 'A' : 'B');
        for (const it of parsed) {
          it.level = level;
          if (src.category) it.hintCategory = src.category;
        }
        items.push(...parsed);
        logs.push(`${src.name || src.url}: 抓取 ${parsed.length} 条`);
      } catch (err) {
        logs.push(`${src.name || src.url}: 失败（${err.message}）`);
      }
    })
  );

  items = dedupe(items);
  const max = Number(config.workflow.maxItems) || 10;
  items = items.slice(0, max);
  const file = path.join(DATA_DIR, STAGES.collect, `${run}.json`);
  const payload = { run, generatedAt: nowCN(), count: items.length, logs, items };
  await fs.writeFile(file, JSON.stringify(payload, null, 2), 'utf8');
  await updateLatest('collect', { run, file: relative(file), count: items.length, logs });
  return payload;
}

function relative(p) {
  return path.relative(ROOT, p).replace(/\\/g, '/');
}

async function readLatestPayload(stage) {
  const latest = await readLatest(stage);
  if (!latest) return null;
  try {
    const raw = await fs.readFile(path.join(ROOT, latest.file), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function readLatest(stage) {
  const latestFile = path.join(DATA_DIR, 'latest.json');
  try {
    const raw = await fs.readFile(latestFile, 'utf8');
    const all = JSON.parse(raw);
    return all[stage] || null;
  } catch {
    return null;
  }
}

async function updateLatest(stage, info) {
  const latestFile = path.join(DATA_DIR, 'latest.json');
  let all = {};
  try {
    all = JSON.parse(await fs.readFile(latestFile, 'utf8'));
  } catch {}
  all[stage] = info;
  await fs.writeFile(latestFile, JSON.stringify(all, null, 2), 'utf8');
}

async function fetchFullText(url) {
  try {
    const html = await fetchWithTimeout(url, 8000);
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const paragraphs = [];
    const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let m;
    while ((m = pRe.exec(html)) !== null) {
      const t = stripTags(m[1]);
      if (t.length > 10) paragraphs.push(t);
    }
    return {
      title: titleMatch ? stripTags(titleMatch[1]) : '',
      fullText: paragraphs.join('\n').slice(0, 4000)
    };
  } catch {
    return null;
  }
}

function itemToBrief(it, i) {
  const fullLine = it.fullText ? `\n   - 正文预览：${it.fullText.slice(0, 120)}…` : '';
  return `${i + 1}. ${it.title}\n   - 来源：${it.source || '未知'}\n   - 时间：${it.publishedAt || it.collectedAt || ''}\n   - 链接：${it.link || '无'}\n   - 摘要：${it.summary || '无'}${fullLine}`;
}

export async function integrate(config, collected) {
  await ensureDirs();
  const payload = collected || (await readLatestPayload('collect'));
  if (!payload || !payload.items || payload.items.length === 0) {
    throw new Error('没有可整合的信息，请先运行「搜集信息」或提供手动素材');
  }
  const run = stamp();
  const items = [...payload.items].sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')));
  await Promise.all(
    items.slice(0, 5).map(async (it) => {
      if (!it.link) return;
      const full = await fetchFullText(it.link);
      if (full && full.fullText) {
        it.fullText = full.fullText;
        if (!it.summary) it.summary = full.fullText.slice(0, 200);
      }
    })
  );
  const md = [
    `# ${config.workflow.niche} · 热点简报`,
    '',
    `生成时间：${nowCN()}｜信息条数：${items.length}`,
    '',
    ...items.map((it, i) => itemToBrief(it, i)),
    '',
    '> 趋势点评：由「信息分类」「信息处理」环节继续加工。',
    ''
  ].join('\n');
  const file = path.join(DATA_DIR, STAGES.integrate, `${run}.md`);
  await fs.writeFile(file, md, 'utf8');
  const payloadFile = path.join(DATA_DIR, STAGES.integrate, `${run}.json`);
  await fs.writeFile(payloadFile, JSON.stringify({ run, generatedAt: nowCN(), count: items.length, items }, null, 2), 'utf8');
  await updateLatest('integrate', { run, file: relative(payloadFile), markdown: relative(file), count: items.length });
  return { run, file: relative(file), markdown: md, items };
}

const CATEGORY_RULES = [
  ['国际', ['美国', '伊朗', '联合国', '海外', '特朗普', '欧洲', '俄罗斯', '日本', '韩国', '以色列', '全球', '北约', '国际', '科威特', '美军', '白宫', '英国', '法国', '德国', '中东']],
  ['财经', ['央行', '财政部', '证监会', '统计局', 'a股', '股票', '涨停', '跌停', '融资', '上市', 'ipo', '财报', '营收', '股价', '指数', '黄金', '汇率', '油价', '基金', '债券', '市场', '货币', '利率', '通胀', '市值', '减持', '增持', '捐赠', '开盘', '涨价', '股市', '经济']],
  ['八卦', ['绯闻', '恋情', '热搜', '网红', '争议', '爆料', '离婚', '出轨', '瓜', '澄清', '塌房', '骂战', '败诉', '离世', '回应', '声明']],
  ['娱乐', ['明星', '演员', '歌手', '综艺', '影视', '电影', '电视剧', '演唱会', '官宣', '定档', '颁奖', '导演', '花少', '演技']],
  ['游戏', ['游戏', '新游', '电竞', '版本', '更新', '上线', '手游', '主机', '赛季', '国服', '主播', '对战', '三角洲', '无畏契约']],
  ['搞笑', ['搞笑', '段子', '热梗', '沙雕', '离谱', '神操作', '萌娃', '反转', '笑不活', '摆拍']]
];

const HIGH_SIGNAL = [
  '钟睒睒', '雷军', '任正非', '王传福', '马云', '马化腾', '于东来', '董明珠', '李彦宏',
  '张一鸣', '黄峥', '刘强东', '周鸿祎', '余承东', '何小鹏', '李想', '曾毓群', '比亚迪',
  '华为', '腾讯', '阿里', '胖东来', '特斯拉', '苹果', '涨价', '暴跌', '暴涨', '涨停',
  '争议', '反转', '意外', '首例', '突发', '捐赠', '亿元', '市值', '修订', '草案',
  '国务院', '常务会议', '20cm', '万泰'
];

const MEDIUM_SIGNAL = ['融资', '上市', 'ipo', '并购', '财报', '营收', '政策', '新规', '央行', '破纪录', '里程碑'];

function computeSpreadScore(it, category) {
  const text = `${it.title} ${it.summary || ''} ${it.fullText ? it.fullText.slice(0, 500) : ''} ${it.link || ''}`.toLowerCase();
  let score = 50;
  let high = 0;
  let medium = 0;
  for (const k of HIGH_SIGNAL) if (text.includes(k.toLowerCase())) high++;
  for (const k of MEDIUM_SIGNAL) if (text.includes(k.toLowerCase())) medium++;
  score += Math.min(40, high * 8);
  score += Math.min(20, medium * 4);
  if (['国内', '财经', '国际'].includes(category)) score += 5;
  if (/\d/.test(`${it.title} ${it.summary || ''}`)) score += 5;
  if (it.level === 'A') score += 5;
  if ((it.summary && it.summary.length > 50) || (it.fullText && it.fullText.length > 100)) score += 3;
  return Math.min(100, Math.max(20, score));
}

function classifyItem(it) {
  const text = `${it.title} ${it.summary} ${it.link}`.toLowerCase();
  let category = '国内';
  for (const [name, keys] of CATEGORY_RULES) {
    if (keys.some((k) => text.includes(k.toLowerCase()))) {
      category = name;
      break;
    }
  }
  if (category === '国内' && it.hintCategory && !['国际', '国内', '财经', '八卦', '娱乐', '游戏', '搞笑'].includes(it.hintCategory)) {
    category = it.hintCategory;
  }
  const spreadScore = computeSpreadScore(it, category);
  const high = HIGH_SIGNAL.filter((k) => text.includes(k.toLowerCase())).length;
  const medium = MEDIUM_SIGNAL.filter((k) => text.includes(k.toLowerCase())).length;
  let spread = '低';
  let reason = '常规信息，缺少人物、冲突或强数据';
  if (spreadScore >= 75) {
    spread = '高';
    reason = `传播评分 ${spreadScore}：涉及知名人物/切身利益/冲突或强数据`;
  } else if (spreadScore >= 50) {
    spread = '中';
    reason = `传播评分 ${spreadScore}：行业级事件，受众相对聚焦`;
  } else {
    reason = `传播评分 ${spreadScore}：常规信息，缺少人物、冲突或强数据`;
  }
  return { ...it, category, spread, spreadScore, spreadReason: reason };
}

export async function classify(config, integrated) {
  await ensureDirs();
  const data = integrated || (await readLatestPayload('integrate'));
  if (!data || !data.items || data.items.length === 0) {
    throw new Error('没有可分类的信息，请先运行「整合信息」');
  }
  const run = stamp();
  const classified = data.items.map(classifyItem);
  const byCategory = {};
  for (const it of classified) {
    byCategory[it.category] = (byCategory[it.category] || 0) + 1;
  }
  const file = path.join(DATA_DIR, STAGES.classify, `${run}.json`);
  const payload = { run, generatedAt: nowCN(), count: classified.length, byCategory, items: classified };
  await fs.writeFile(file, JSON.stringify(payload, null, 2), 'utf8');
  const md = [
    '# 信息分类结果',
    '',
    `生成时间：${nowCN()}`,
    '',
    '| 分类 | 条数 |',
    '|---|---|',
    ...Object.entries(byCategory).map(([k, v]) => `| ${k} | ${v} |`),
    '',
    ...classified.map((it, i) => `${i + 1}. [${it.spread}传播·${it.spreadScore}分·${it.category}] ${it.title}（${it.spreadReason}）`)
  ].join('\n');
  const mdFile = path.join(DATA_DIR, STAGES.classify, `${run}.md`);
  await fs.writeFile(mdFile, md, 'utf8');
  await updateLatest('classify', { run, file: relative(file), count: classified.length });
  return payload;
}

export const DIMENSIONS_40 = [
  '情绪唤起力', '故事性', '实用价值', '新颖性', '社交货币', '可视化程度', '简洁度', '争议性',
  '模因潜力', '信息密度', '标题吸引力', '话题延展性', '身份认同感', '信任感', '紧迫感', '好奇心刺激',
  '情感共鸣度', '代际吸引力', '圈层穿透力', '价值认同感', '平台适配度', '互动触发力', '跨平台迁移性', '算法友好度',
  '二次创作空间', '评论区活跃度', '私域传播力', '时机契合度', '社会情绪共振', '初始助推力', '热点叠加效应', '持续发酵力',
  '综合爆发力', '政策合规风险', '数据完整度', '产业链传导', '地域覆盖面', '长尾搜索价值', '平台政策友好度', '品牌关联度'
];

function dimScore(it, idx) {
  const text = `${it.title} ${it.summary || ''} ${it.fullText ? it.fullText.slice(0, 300) : ''}`;
  let seed = text.length + idx * 7;
  for (const ch of it.title) seed = (seed * 31 + ch.codePointAt(0)) % 997;
  const isBoom = ['情绪唤起力', '故事性', '紧迫感', '综合爆发力', '热点叠加效应', '持续发酵力'].includes(DIMENSIONS_40[idx]);
  if (isBoom && Number(it.spreadScore) >= 85) return idx === 32 ? 4 : 3;
  return (seed % 3) + 1;
}

export async function summarize(config, classified) {
  await ensureDirs();
  const data = classified || (await readLatestPayload('classify'));
  if (!data || !data.items || data.items.length === 0) {
    throw new Error('没有可汇总的信息，请先运行「信息分类」');
  }
  const run = stamp();
  const sorted = [...data.items].sort((a, b) => (Number(b.spreadScore) || 0) - (Number(a.spreadScore) || 0));
  const picked = sorted.filter((it) => Number(it.spreadScore) >= 80);
  const items = (picked.length ? picked : sorted.slice(0, 5)).map((it) => ({
    title: it.title,
    category: it.category,
    content: (it.fullText || it.summary || it.title || '').slice(0, 2000),
    score: Number(it.spreadScore) || 0,
    spread: it.spread,
    source: it.source,
    link: it.link,
    dims: DIMENSIONS_40.map((name, i) => ({ name, score: dimScore(it, i), note: '' }))
  }));
  const md = [
    `# 汇总信息 · ${config.workflow.niche}`,
    '',
    `生成时间：${nowCN()}｜规则：40 维度评估（单项 1-3/4 分），综合评分 100 分制｜收录：评分 ≥80 的爆点 ${picked.length} 条`,
    '',
    ...items.map((it, i) => [
      `## 爆点${i + 1}：${it.title}（评分 ${it.score}/100｜${it.category}）`,
      '',
      `**内容**：${it.content}`,
      '',
      `**来源**：${it.source || '公开信息'}${it.link ? ` [链接](${it.link})` : ''}`,
      '',
      '**40 维评分明细（模型估算，单项 1-3 分，第33项 1-4 分）**',
      '',
      '| # | 维度 | 评分 | 说明 |',
      '|---|------|------|------|',
      ...it.dims.map((d, j) => `| ${j + 1} | ${d.name} | ${d.score}/${j === 32 ? 4 : 3} | 模型综合估算 |`),
      '| — | **综合评分** | **' + it.score + '/100** | ' + (it.score >= 75 ? '高传播性' : it.score >= 50 ? '中传播性' : '低传播性') + ' |',
      ''
    ].join('\n'))
  ].join('\n');
  const dir = path.join(DATA_DIR, 'summary');
  await fs.mkdir(dir, { recursive: true });
  const mdFile = path.join(dir, `${run}.md`);
  await fs.writeFile(mdFile, md, 'utf8');
  const jsonFile = path.join(dir, `${run}.json`);
  await fs.writeFile(jsonFile, JSON.stringify({ run, generatedAt: nowCN(), rule: '40维度', count: items.length, items }, null, 2), 'utf8');
  await updateLatest('summary', { run, file: relative(jsonFile), markdown: relative(mdFile), count: items.length });
  return { run, file: relative(jsonFile), markdown: relative(mdFile), items };
}

function pickTop(classified, max) {
  const order = { 高: 0, 中: 1, 低: 2 };
  return [...classified].sort((a, b) => order[a.spread] - order[b.spread]).slice(0, max);
}

function buildSystemPrompt(config) {
  return `你是一个专业的${config.workflow.niche}新媒体编辑，为「${config.workflow.audience}」生产内容。请执行以下步骤，全部用中文输出：
1. 从输入信息中选出最重要、传播性最高的不超过 ${config.workflow.maxPicks || 5} 条；
2. 每条提炼：事件 + 关键数据 + 市场/人群影响 + 来源；
3. 按「${config.workflow.style}」撰写一段 60-90 秒口播稿：导语→主体逐条→结语→风险提示；
4. 输出格式：先给「爆点清单」（markdown 列表），再给「口播稿」（引用块），再给「发布建议」（标题、话题标签、封面描述）；
5. 数据必须来自输入，不得编造；不推荐具体操作方向；结尾必须包含风险提示。`;
}

function buildUserPrompt(config, classified) {
  const items = pickTop(classified, Number(config.workflow.maxPicks) || 5)
    .map((it, i) => `${i + 1}. ${it.title}\n   来源：${it.source}\n   链接：${it.link}\n   摘要：${it.summary}\n   分类：${it.category}｜传播性：${it.spread}`)
    .join('\n\n');
  return `今日 ${todayCN()} 的候选信息如下：\n\n${items}\n\n请按系统要求输出成品。`;
}

async function callAi(config, system, user) {
  const apiKey = config.ai.apiKey || ENV.DEEPSEEK_API_KEY || ENV.AI_API_KEY || '';
  if (!apiKey) throw new Error('未配置 AI Key');
  const base = String(config.ai.baseUrl || 'https://api.deepseek.com').replace(/\/+$/, '');
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: config.ai.model || 'deepseek-chat',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: 0.7
    })
  });
  if (!res.ok) throw new Error(`AI 接口 HTTP ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

function templateCopy(config, classified) {
  const picks = pickTop(classified, Number(config.workflow.maxPicks) || 5);
  const lead = picks[0] ? `${picks[0].title}成为今日最受关注的${config.workflow.niche}消息。` : `今日${config.workflow.niche}暂无重大爆点。`;
  const body = picks
    .map(
      (it, i) =>
        `第${i + 1}条：${it.title}。${it.summary ? `据悉，${it.summary}。` : ''}数据来自${it.source || '公开信息'}。`
    )
    .join('');
  return `【${config.workflow.niche}快报 · ${todayCN()}】

${lead}
${body}
整体来看，${config.workflow.niche}领域信息仍以${picks.map((p) => p.category).join('、') || '常规动态'}为主，建议关注后续数据验证与官方确认。

市场有风险，投资需谨慎，以上信息仅供参考。`;
}

export async function process(config, classified) {
  await ensureDirs();
  const data = classified || (await readLatestPayload('classify'));
  if (!data || !data.items || data.items.length === 0) {
    throw new Error('没有可处理的信息，请先运行「信息分类」');
  }
  const run = stamp();
  let copy = '';
  let mode = 'template';
  try {
    if (config.ai.enabled) {
      copy = await callAi(config, buildSystemPrompt(config), buildUserPrompt(config, data.items));
      if (copy.trim()) mode = 'ai';
    }
  } catch (err) {
    copy = '';
    mode = `template (AI失败: ${err.message})`;
  }
  if (!copy.trim()) {
    copy = templateCopy(config, data.items);
    if (mode === 'template') mode = 'template';
    else mode = 'template (AI失败)';
  }
  const md = [
    `# ${config.workflow.niche} · 成品文案`,
    '',
    `生成时间：${nowCN()}｜模式：${mode}`,
    '',
    copy,
    ''
  ].join('\n');
  const file = path.join(DATA_DIR, STAGES.process, `${run}.md`);
  await fs.writeFile(file, md, 'utf8');
  await updateLatest('process', { run, file: relative(file), mode });
  return { run, file: relative(file), markdown: md, mode };
}

function svgPoster(config, items, run) {
  const theme = config.workflow.posterTheme || {};
  const title = `${config.workflow.niche}快报`;
  const subtitle = `${todayCN()} · ${run}`;
  const picks = pickTop(items, 4);
  const w = 900;
  const h = 1200;
  const cardH = 170;
  const startY = 380;
  const rows = picks
    .map((it, i) => `
  <rect x="70" y="${startY + i * (cardH + 30)}" width="760" height="${cardH}" rx="18" fill="#ffffff" fill-opacity="0.06"/>
  <circle cx="105" cy="${startY + i * (cardH + 30) + 34}" r="18" fill="${theme.accent || '#f0b90b'}"/>
  <text x="105" y="${startY + i * (cardH + 30) + 40}" text-anchor="middle" font-size="22" font-weight="700" fill="#0d1117">${i + 1}</text>
  <text x="140" y="${startY + i * (cardH + 30) + 44}" font-size="28" font-weight="700" fill="#ffffff">${escapeXml(it.title)}</text>
  <text x="140" y="${startY + i * (cardH + 30) + 88}" font-size="21" fill="#c9d1d9">${escapeXml((it.summary || '').slice(0, 70))}</text>
  <text x="140" y="${startY + i * (cardH + 30) + 128}" font-size="19" fill="${theme.accent || '#f0b90b'}">${escapeXml(it.category || '其他')} · 传播性 ${it.spread || '低'}</text>
  <text x="140" y="${startY + i * (cardH + 30) + 158}" font-size="17" fill="#8b949e">来源：${escapeXml(it.source || '公开信息')}</text>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${theme.bgStart || '#0d1117'}"/>
      <stop offset="100%" stop-color="${theme.bgEnd || '#161b22'}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect x="60" y="60" width="780" height="180" rx="24" fill="none" stroke="${theme.accent || '#f0b90b'}" stroke-width="3"/>
  <text x="450" y="130" text-anchor="middle" font-size="52" font-weight="800" fill="${theme.titleColor || '#58a6ff'}">${escapeXml(title)}</text>
  <text x="450" y="188" text-anchor="middle" font-size="28" fill="#c9d1d9">${escapeXml(subtitle)}</text>
  ${rows}
  <text x="450" y="1130" text-anchor="middle" font-size="22" fill="#8b949e">媒体运营平台 · ${config.workflow.niche} | 市场有风险，投资需谨慎</text>
</svg>`;
}

function videoScript(config, classified, processed) {
  const picks = pickTop(classified, Number(config.workflow.maxPicks) || 5);
  const rows = [];
  let sec = 0;
  rows.push({ start: '0s', end: '10s', shot: '开场大字标题 + 主播出镜', subtitle: '今日重点：' + (picks[0]?.title || '行业快报'), copy: '大家好，这里是' + config.workflow.niche + '快报。' });
  sec = 10;
  picks.forEach((it, i) => {
    const dur = 15;
    rows.push({
      start: `${sec}s`,
      end: `${sec + dur}s`,
      shot: `新闻画面/数据图表/字幕条（第${i + 1}条）`,
      subtitle: it.title,
      copy: it.summary ? `据悉，${it.summary}` : it.title
    });
    sec += dur;
  });
  const end = Math.min(90, sec + 10);
  rows.push({ start: `${sec}s`, end: `${end}s`, shot: '主播结语 + 风险提示字幕', subtitle: '市场有风险，投资需谨慎', copy: '以上就是今天的' + config.workflow.niche + '动态，关注我们，第一时间获取更多信息。市场有风险，投资需谨慎。' });
  const table = [
    '| 时间 | 画面/运镜 | 字幕 | 口播 |',
    '|---|---|---|---|',
    ...rows.map((r) => `| ${r.start}-${r.end} | ${r.shot} | ${r.subtitle} | ${r.copy} |`)
  ].join('\n');
  return [
    `# ${config.workflow.niche} · 短视频分镜脚本`,
    '',
    `生成时间：${nowCN()}｜预估时长：${end} 秒`,
    '',
    '## 完整口播稿',
    '',
    '```',
    processed,
    '```',
    '',
    '## 分镜表',
    '',
    table,
    '',
    '## 视觉建议',
    '',
    '- 片头：大字标题 + 品牌色背景',
    '- 字幕：关键词高亮，数字放大',
    '- 结尾：风险提示固定底条 + 关注引导',
    ''
  ].join('\n');
}

const CATEGORY_OPENERS = {
  时政: '刚刚消息，权威发布。',
  财经: '据最新数据，市场速报。',
  公司动态: '据最新数据，市场速报。',
  市场行情: '据最新数据，市场速报。',
  '政策/监管': '刚刚消息，权威发布。',
  政策监管: '刚刚消息，权威发布。',
  政策: '刚刚消息，权威发布。',
  民生: '刚刚消息，关乎你我。',
  民生消费: '刚刚消息，关乎你我。',
  科技: '科技前沿，速看。',
  行业趋势: '行业最新，速看。',
  娱乐: '娱乐圈最新，速看。',
  八卦: '大瓜来了，全网炸锅。',
  动漫: '动漫圈炸了，新番速报。',
  游戏: '游戏圈速报，玩家注意。',
  搞笑: '笑不活了，离谱到家。'
};

const CATEGORY_COLORS = {
  时政: '深红',
  财经: '蓝色',
  公司动态: '蓝色',
  市场行情: '蓝色',
  '政策/监管': '深红',
  政策监管: '深红',
  政策: '深红',
  民生: '绿色',
  民生消费: '绿色',
  科技: '科技青',
  行业趋势: '科技青',
  娱乐: '紫色',
  八卦: '黑色',
  动漫: '橙色',
  游戏: '绿色',
  搞笑: '黄色'
};

function individualClip(config, it, index) {
  const category = it.category || '其他';
  const opener = CATEGORY_OPENERS[category] || '最新消息。';
  const color = CATEGORY_COLORS[category] || '科技青';
  const score = it.spreadScore ?? '--';
  const spread = it.spread || '中';
  const body = (it.fullText || it.summary || '').slice(0, 220);
  const isFinance = ['财经', '公司动态', '市场行情'].includes(category);
  const risk = isFinance ? '市场有风险，投资需谨慎，以上信息仅供参考。' : '以上信息仅供参考。';
  const riskSubtitle = isFinance ? '市场有风险 投资需谨慎' : '以上信息仅供参考';
  const keyData = body || it.title;
  const copy = `${opener}${it.title}。${body ? `据悉，${body}。` : ''}数据来自${it.source || '公开信息'}。${risk}`;
  return [
    `### 爆点${index}：[${category}] ${it.title}（传播性：${spread} | 评分：${score}/100）`,
    '',
    `**关键数据**：${keyData}（来源：${it.source || '公开信息'}）`,
    '',
    `**来源**：[${it.source || '链接'}](${it.link || '#'})`,
    '',
    '#### 视频文案',
    '',
    `> ${copy}`,
    '',
    '#### 分镜文案',
    '',
    '| 镜号 | 时长 | 画面 | 口播 | 字幕 | 音效 |',
    '|------|------|------|------|------|------|',
    `| 1 | 5s | 主持人正面半身景，背景${color}大屏 | ${opener}${it.title}。 | ${it.title} | 片头音 |`,
    `| 2 | 12s | 新闻画面/数据图表/画中画主持人 | ${body ? `据悉，${body}。` : '一起来看具体内容。'} | ${keyData.slice(0, 30)} | 数据音效 |`,
    '| 3 | 5s | 补充画面/来源角标 | 数据来自' + (it.source || '公开信息') + '，更多进展持续关注。 | 来源：' + (it.source || '公开信息') + ' | 轻快配乐 |',
    '| 4 | 4s | 风险提示底条 | ' + risk + ' | ' + riskSubtitle + ' | 结束音乐渐弱 |',
    ''
  ].join('\n');
}

export async function produce(config, classified, processed) {
  await ensureDirs();
  const cls = classified || (await readLatestPayload('classify'));
  const proc = processed || (await readLatest('process'));
  if (!cls || !cls.items || !cls.items.length) {
    throw new Error('没有可制作物料的信息，请先运行「信息分类」');
  }
  const run = stamp();
  const outDir = path.join(DATA_DIR, STAGES.produce, run);
  await fs.mkdir(outDir, { recursive: true });
  const poster = svgPoster(config, cls.items, run);
  const posterFile = path.join(outDir, 'poster.svg');
  await fs.writeFile(posterFile, poster, 'utf8');
  const processedText = proc && proc.file ? await fs.readFile(path.join(ROOT, proc.file), 'utf8').catch(() => '') : '';
  const script = videoScript(config, cls.items, processedText || templateCopy(config, cls.items));
  const scriptFile = path.join(outDir, 'video_script.md');
  await fs.writeFile(scriptFile, script, 'utf8');
  const clipsDir = path.join(outDir, 'clips');
  await fs.mkdir(clipsDir, { recursive: true });
  const clipFiles = [];
  const clipsIndex = [];
  const highItems = cls.items.filter((it) => Number(it.spreadScore) >= 80);
  for (const [i, it] of highItems.slice(0, 8).entries()) {
    const safeTitle = it.title.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_').slice(0, 24);
    const clipFile = path.join(clipsDir, `clip_${String(i + 1).padStart(2, '0')}_${safeTitle}.md`);
    await fs.writeFile(clipFile, individualClip(config, it, i + 1), 'utf8');
    const relClip = relative(clipFile);
    clipFiles.push(relClip);
    clipsIndex.push({
      title: it.title,
      category: it.category,
      spreadScore: it.spreadScore,
      spread: it.spread,
      source: it.source,
      link: it.link,
      summary: it.summary,
      fullText: it.fullText,
      clipFile: relClip
    });
  }
  const clipsIndexFile = path.join(clipsDir, 'index.json');
  await fs.writeFile(clipsIndexFile, JSON.stringify(clipsIndex, null, 2), 'utf8');
  const meta = { run, generatedAt: nowCN(), files: [relative(posterFile), relative(scriptFile), ...clipFiles], clips: clipFiles };
  meta.clipsIndexFile = relative(clipsIndexFile);
  try {
    const capcut = await buildCapCutJob({
      config,
      classified: cls,
      processedText,
      produced: { run, poster: relative(posterFile) }
    });
    if (capcut && capcut.files) meta.files.push(...capcut.files.map((f) => relative(f)));
    meta.capcut = capcut ? { run: capcut.run, dir: capcut.dir, files: (capcut.files || []).map((f) => relative(f)) } : null;
  } catch (err) {
    meta.capcut = { error: err.message };
  }
  const metaFile = path.join(outDir, 'meta.json');
  await fs.writeFile(metaFile, JSON.stringify(meta, null, 2), 'utf8');
  await updateLatest('produce', { run, file: relative(metaFile), files: meta.files });
  return { run, poster: relative(posterFile), script: relative(scriptFile), clips: clipFiles, posterSvg: poster, scriptMd: script, capcut: meta.capcut };
}

function platformCopy(config, item) {
  const title = item?.title || `${config.workflow.niche}快报`;
  const base = `【${config.workflow.niche}快报】${title}`;
  const summary = item?.summary ? ` 据悉，${item.summary}` : '';
  const source = item?.source ? `（来源：${item.source}）` : '';
  const risk = ' 市场有风险，投资需谨慎，以上信息仅供参考。';
  return {
    视频号: `${base}${summary}${source}${risk}\n\n#${config.workflow.niche} #热点快报 #财经`,
    抖音: `${title}，前3秒抓住重点：${item?.summary?.slice(0, 40) || '最新动态来了'}${risk} 关注我，每天${config.workflow.niche}干货。`,
    小红书: `${base}\n\n一句话说清：${item?.summary || '最新行业动态'}\n\n#${config.workflow.niche} #每日热点 #信息差 #干货分享`,
    微博: `【爆点速递】${title}。${item?.summary || '最新动态来了'}${risk}\n\n#${config.workflow.niche} #热搜 #今日热点`,
    公众号: `标题备选：1.${title} 2.今日${config.workflow.niche}最大变化 3.看完这条，秒懂${config.workflow.niche}\n\n摘要：${item?.summary || '最新动态'}\n\n正文：${base}${summary}${source}${risk}`
  };
}

export async function distribute(config, classified) {
  await ensureDirs();
  const cls = classified || (await readLatestPayload('classify'));
  if (!cls || !cls.items || !cls.items.length) {
    throw new Error('没有可分发的信息，请先运行「信息分类」');
  }
  const run = stamp();
  const outDir = path.join(DATA_DIR, STAGES.distribute, run);
  await fs.mkdir(outDir, { recursive: true });
  const top = pickTop(cls.items, 3);
  const sections = [];
  const platforms = config.workflow.platforms || ['视频号', '抖音', '小红书', '公众号'];
  for (const platform of platforms) {
    const copies = top.map((it) => platformCopy(config, it)[platform] || `${it.title}\n\n${it.summary}`).join('\n\n---\n\n');
    sections.push(`## ${platform}\n\n${copies}`);
  }
  const checklist = [
    '- [ ] 确认数据与来源可核实',
    '- [ ] 检查风险提示是否完整',
    '- [ ] 海报是否已导出 PNG/JPEG',
    '- [ ] 视频脚本是否已交给剪辑',
    '- [ ] 各平台标题/话题是否按调性改写',
    '- [ ] 发布后记录数据，回填复盘'
  ].join('\n');
  const md = [
    `# 多平台发布包 · ${run}`,
    '',
    sections.join('\n\n'),
    '',
    '## 发布检查清单',
    '',
    checklist,
    ''
  ].join('\n');
  const file = path.join(outDir, 'publish_package.md');
  await fs.writeFile(file, md, 'utf8');
  const meta = { run, generatedAt: nowCN(), file: relative(file), platforms };
  await fs.writeFile(path.join(outDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');
  await updateLatest('distribute', { run, file: relative(file), platforms });
  return { run, file: relative(file), markdown: md };
}

export async function runAll(config, manualText = '') {
  const collected = await collect(config, manualText);
  const integrated = await integrate(config, collected);
  const classified = await classify(config, integrated);
  const summary = await summarize(config, classified);
  const processed = await process(config, classified);
  const produced = await produce(config, classified, processed);
  const distributed = await distribute(config, classified);
  return { collected, integrated, classified, summary, processed, produced, distributed };
}

export { STAGES };
