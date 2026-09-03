const $ = (sel) => document.querySelector(sel);
const NS = 'http://www.w3.org/2000/svg';
const GRAPH_W = 2030;
const GRAPH_H = 912;
const GRAPH_CX = 1015;
const GRAPH_CY = 456;

let config = null;
let statusData = null;
let contentData = null;
let classifyHistory = null;
let extraCategories = [];
let summaryData = null;
let flatItems = [];
let activeNodeId = null;
let pinned = false;
let currentDownload = null;
let nodeMap = {};
let edgeEls = [];
let graphDragMode = false;
let dragState = null;
let graphPosCache = null;
const GRAPH_POS_KEY = 'neo_graph_pos_v1';
let currentView = 'home';
let currentCat = '国内';
let producedMap = {};
let infoMode = 'classify';
let infoCategory = '国内';
let infoDateFilter = '';
let infoRunFilter = '';

const CATEGORIES = ['国际', '国内', '财经', '八卦', '娱乐', '游戏', '搞笑'];
const COMIC_CATS = ['娱乐', '八卦', '搞笑', '游戏'];
const PLATFORMS = ['抖音', '小红书', '微博', '视频号', 'B站', '快手', 'YouTube', 'X', 'TikTok', 'Instagram'];
const PLATFORM_REQUIREMENTS = {
  抖音: '需要提供：抖音账号（自动发布需开放平台授权）+ 视频/封面文件；文案、话题已自动生成',
  小红书: '需要提供：小红书账号（专业号更佳）+ 图文/视频素材；自动发布需开发者授权',
  微博: '需要提供：微博账号 + 图片/视频素材；自动发布需开放平台授权与内容审核',
  视频号: '需要提供：已认证视频号 + 视频文件/封面；自动发布需视频号助手或 API 授权',
  B站: '需要提供：B站 UP 主账号 + 视频/封面；自动发布需 B站开放平台授权',
  快手: '需要提供：快手账号 + 视频/封面；自动发布需快手开放平台授权',
  YouTube: '需要提供：YouTube 频道 + 视频/封面文件；自动发布需 Google OAuth 2.0（Client ID / Secret + Refresh Token）',
  X: '需要提供：X 账号 + 图文/视频素材；自动发布需 X API v2（OAuth 1.0a / OAuth 2.0 凭据）',
  TikTok: '需要提供：TikTok 企业号/开发者账号 + 视频文件；自动发布需 Content Posting API 授权',
  Instagram: '需要提供：Instagram 商业号 + 图文/视频素材；自动发布需 Meta Graph API（Facebook 开发者应用）'
};
const PLATFORM_AUTH_FIELDS = {
  抖音: ['账号名', '开放平台 AppKey', 'AppSecret', '回调/扫码授权'],
  小红书: ['账号名', 'AppID', 'AppSecret', '授权回调地址'],
  微博: ['账号名', 'AppKey', 'AppSecret', '授权回调地址'],
  视频号: ['账号名', '视频号助手扫码', '公众号 AppID（如需）', '授权确认'],
  B站: ['账号名', '开放平台 AppKey', 'AppSecret', '回调地址'],
  快手: ['账号名', 'AppKey', 'AppSecret', '授权回调地址'],
  YouTube: ['频道名', 'Google Client ID', 'Client Secret', 'Refresh Token', '频道 ID'],
  X: ['账号名', 'API Key', 'API Secret', 'Access Token', 'Access Token Secret'],
  TikTok: ['账号名', 'Client Key', 'Client Secret', 'Access Token', 'TikTok 用户/企业号 ID'],
  Instagram: ['账号名', 'App ID', 'App Secret', 'Access Token', 'Instagram 商业账号 ID']
};
const PLATFORM_TYPE_DEFAULT = {
  抖音: '视频',
  小红书: '图文',
  微博: '图文',
  视频号: '视频',
  B站: '视频',
  快手: '视频',
  YouTube: '视频',
  X: '图文',
  TikTok: '视频',
  Instagram: '图文'
};

const STAGES = [
  { key: 'collect', label: '全网采集', color: '#0a84ff', desc: '央媒10 + 官方TOP10 + 国际站点 + 本地素材，全文抓取' },
  { key: 'integrate', label: '智能整合', color: '#5ac8fa', desc: '去重、清洗、交叉验证，生成热点简报' },
  { key: 'classify', label: '信息汇总', color: '#af52de', desc: '分类浏览 + 40维评分 + 及时/每日/每周选题' },
  { key: 'process', label: '文案处理', color: '#ff375f', desc: 'AI / 模板生成成品文案与口播稿' },
  { key: 'produce', label: '内容制作', color: '#ff9f0a', desc: '视频脚本 / 图文排版 / 封面生成 + 剪映执行' },
  { key: 'distribute', label: '矩阵分发', color: '#34c759', desc: '抖音/小红书/微博/视频号/YouTube/X/TikTok/Instagram 账号矩阵与发布审核' },
  { key: 'git', label: '版本/PR', color: '#af52de', desc: '本地提交与 Pull Request 管理' }
];

const SATS = [
  { key: 'ai', label: 'AI 引擎', color: '#ff375f', desc: '基础模型 / 图片模型 / 视频模型' },
  { key: 'data', label: '数据仓库', color: '#0a84ff', desc: '全部流程存档与历史数据' },
  { key: 'heat', label: '热度榜', color: '#ff9f0a', desc: '微博 / 抖音 / 小红书实时热榜' },
  { key: 'assets', label: '素材资产', color: '#5ac8fa', desc: '海报、脚本、发布包等产出目录' }
];

const GRAPH_CHILDREN = {
  collect: ['央媒信源', '分类TOP10', '本地素材'],
  integrate: ['去重清洗', '交叉验证', '热点简报'],
  classify: ['分类浏览', '及时选题', '每日选题', '每周选题'],
  produce: ['视频制作', '图文制作', '封面制作'],
  distribute: ['抖音', '小红书', '微博', '视频号', 'B站', '快手', 'YouTube', 'X', 'TikTok', 'Instagram'],
  git: ['本地提交', 'Pull Request'],
  ai: ['基础模型', '图片模型', '视频模型'],
  heat: ['微博热榜', '抖音热榜', '小红书热榜'],
  assets: ['海报', '视频脚本', '发布包'],
  data: ['采集', '整合', '分类', '汇总', '制作', '分发']
};

async function api(path, options) {
  const res = await fetch(path, options);
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || `请求失败 (${res.status})`);
    if (data.output) err.output = data.output;
    throw err;
  }
  return data;
}

function toast(msg, isError = false) {
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'toast' + (isError ? ' error' : '');
  el.hidden = false;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => (el.hidden = true), 4200);
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function spreadClass(spread) {
  if (spread === '高') return 'high';
  if (spread === '中') return 'mid';
  return 'low';
}

async function refresh() {
  statusData = await api('/api/status');
  config = await api('/api/config');
  applyIconFont();
  syncContentAiSelects();
  renderGraph();
  renderPipeline();
  await Promise.all([loadContent(), loadSummary(), loadProduced()]);
  await loadCategoryExtras();
  renderCurrentView();
}

function syncContentAiSelects() {
  const vm = $('#video-model');
  if (!vm || !config || !config.ai) return;
  const val = config.ai.model || 'deepseek-chat';
  if (!Array.from(vm.options).some((o) => o.value === val)) {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = val + '（AI 引擎配置）';
    vm.appendChild(opt);
  }
  vm.value = val;
}

function applyIconFont() {
  const ic = (config && config.integrations && config.integrations.iconfont) || {};
  const urls = [];
  if (Array.isArray(ic.cssUrls)) urls.push(...ic.cssUrls.filter(Boolean));
  if (ic.cssUrl && !urls.includes(ic.cssUrl)) urls.unshift(ic.cssUrl);
  for (const href of urls) {
    if (document.querySelector(`link[href="${CSS.escape(href)}"]`)) continue;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }
  if (ic.jsUrl && !document.querySelector(`script[src="${CSS.escape(ic.jsUrl)}"]`)) {
    const script = document.createElement('script');
    script.src = ic.jsUrl;
    document.head.appendChild(script);
  }
}

/* ---------------- 视图切换 ---------------- */

function switchView(view) {
  const rawView = view;
  const isReviewNav = rawView === 'review';
  if (view === 'classify' || view === 'summary') {
    view = 'info';
    if (rawView === 'classify') {
      infoMode = 'classify';
      if (currentCat) infoCategory = currentCat;
    } else if (infoMode === 'classify') {
      infoMode = 'daily';
    }
  }
  currentView = view;
  if (view !== 'home') closeAssistantWidget();
  document.querySelectorAll('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  document.querySelectorAll('.view').forEach((el) => {
    const id = el.id.replace('view-', '');
    if (view === 'info') el.hidden = id !== 'info';
    else el.hidden = id !== view;
  });
  document.querySelectorAll('[data-home-only]').forEach((el) => {
    el.hidden = view !== 'home';
  });
  if (view === 'info') {
    renderInfoView();
  }
  if (view === 'home') {
    ensureAssistantPanel();
    renderGraph();
    loadLocalSessions().catch(() => {});
    renderHomeHot();
  }
  if (view === 'produce') {
    renderProduceView();
    refreshContentForProduce();
    loadCapcutStatus();
    refreshEngineStatus();
  }
  if (view === 'review') {
    renderReviewModule();
  }
  if (view === 'distribute') renderDistributeView();
  if (view === 'analytics') renderAnalytics();
  if (view === 'schedule') refreshScanStatus();
  if (view === 'publish') loadAudit();
}

async function refreshContentForProduce() {
  await Promise.all([loadContent(), loadSummary()]);
  renderProduceView();
}

function renderCurrentView() {
  switchView(currentView);
}

function hotFeedItems() {
  if (!contentData || !contentData.byCategory) return [];
  const out = [];
  for (const [cat, list] of Object.entries(contentData.byCategory || {})) {
    for (const it of list || []) {
      const score = Number(it.spreadScore ?? it.score ?? 0) || 0;
      if (score >= 60) out.push({ ...it, cat });
    }
  }
  return out.sort((a, b) => (Number(b.spreadScore ?? b.score ?? 0) || 0) - (Number(a.spreadScore ?? a.score ?? 0) || 0)).slice(0, 30);
}

function renderHomeHot() {
  const list = $('#home-hot-list');
  if (!list) return;
  const items = hotFeedItems();
  if (!items.length) {
    list.innerHTML = '<div class="empty-note">暂无 60 分以上热点<br /><span class="hint">运行扫描/汇总后自动出现</span></div>';
    return;
  }
  list.innerHTML = items.map((it) => `
    <button class="hot-item" data-hot="${esc(it.title)}">
      <span class="hot-top"><span class="cc-row-spread ${spreadClass(it.spread)}">${esc(it.spread || '中')}</span><span class="hot-score">${it.spreadScore ?? it.score ?? '--'}/100</span></span>
      <span class="hot-title">${esc(it.title)}</span>
      <span class="hot-meta"><span class="batch-tag new">${esc(it.cat || it.category || '综合')}</span><span class="hint">${esc(it.source || '公开信息')}</span></span>
    </button>`).join('');
  list.querySelectorAll('.hot-item').forEach((b) => {
    b.addEventListener('click', () => {
      const it = items.find((x) => x.title === b.dataset.hot);
      if (it) openItemDetail(it, 'a');
    });
  });
}

document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

/* ---------------- 信息汇总（融合视图） ---------------- */

function infoOverviewText(it) {
  const body = String(it.fullText || it.content || it.summary || '').replace(/\s+/g, ' ').trim();
  const meta = `该信息归类为「${it.category || '未分类'}」，基础传播评分 ${it.spreadScore ?? it.score ?? '--'}/100，来源：${it.source || '公开信息'}。`;
  const out = body ? body : it.title || '';
  const text = (out.length >= 90 ? out : out + '。' + meta);
  return text.slice(0, 240);
}

async function ensureClassifyHistory() {
  if (!classifyHistory) {
    try {
      classifyHistory = await api('/api/classify-history?limit=80');
    } catch {
      classifyHistory = { runs: [] };
    }
  }
  return classifyHistory;
}

function formatRunClock(run) {
  const m = String(run || '').match(/^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})$/);
  return m ? `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}` : String(run || '');
}

function shortRunClock(run) {
  const m = String(run || '').match(/^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})$/);
  return m ? `${m[2]}-${m[3]} ${m[4]}:${m[5]}` : String(run || '').slice(-11);
}

function timeToolbarHtml(runs, activeRun, activeDate) {
  const list = (runs || []).slice(0, 16).reverse();
  const hint = activeRun
    ? `所选档期 ${formatRunClock(activeRun)}`
    : activeDate
      ? `正在查看 ${activeDate}`
      : '全部时间 · 点击时间线任意档期查看';
  return `
    <div class="time-toolbar">
      <input type="date" id="info-date-filter" value="${esc(activeDate)}" title="按日期查看" />
      <button class="btn ghost" id="info-date-clear" title="回到全部档期">全部时间</button>
      <span class="hint">${hint}</span>
    </div>
    <div class="timeline-wrap">
      <div class="timeline-bar">
        ${list.map((r) => `
          <button class="timeline-item ${activeRun === r.run ? 'active' : ''}" data-time-run="${esc(r.run)}" title="${esc(formatRunClock(r.run))}">
            <span class="tl-dot"></span><span class="tl-label">${esc(shortRunClock(r.run))}</span>
          </button>`).join('')}
      </div>
    </div>`;
}

function bindTimeline(zone) {
  const dateInput = zone && zone.querySelector('#info-date-filter');
  if (dateInput) dateInput.addEventListener('change', () => {
    infoDateFilter = dateInput.value;
    infoRunFilter = '';
    renderInfoView();
  });
  zone && zone.querySelector('#info-date-clear')?.addEventListener('click', () => {
    infoDateFilter = '';
    infoRunFilter = '';
    renderInfoView();
  });
  zone && zone.querySelectorAll('[data-time-run]').forEach((b) => b.addEventListener('click', () => {
    infoRunFilter = b.dataset.timeRun;
    infoDateFilter = '';
    renderInfoView();
  }));
}

async function loadInfoRuns() {
  if (infoRunFilter) {
    const all = (await ensureClassifyHistory()).runs || [];
    const hit = all.filter((r) => r.run === infoRunFilter);
    if (hit.length) return hit;
    try {
      const r = await api('/api/classify-history?limit=500');
      return (r && r.runs || []).filter((x) => x.run === infoRunFilter);
    } catch {
      return [];
    }
  }
  const date = String(infoDateFilter || '').replace(/-/g, '');
  if (!date) return (await ensureClassifyHistory()).runs || [];
  try {
    const r = await api(`/api/classify-history?limit=500&date=${date}`);
    return (r && r.runs) || [];
  } catch {
    return [];
  }
}

function infoCategoriesFromRuns(runs) {
  const set = new Set(CATEGORIES);
  extraCategories.forEach((c) => set.add(c));
  (runs || []).forEach((run) => (run.items || []).forEach((it) => {
    if (it.category && !CATEGORIES.includes(it.category)) set.add(it.category);
  }));
  return Array.from(set);
}

async function renderInfoView() {
  const zone = $('#info-zone');
  if (!zone) return;
  document.querySelectorAll('#view-info .info-mode-bar .btn').forEach((b) => {
    const active = b.dataset.info === infoMode;
    b.classList.toggle('primary', active);
    b.classList.toggle('ghost', !active);
  });
  $('#info-hint').textContent = infoMode === 'classify'
    ? '按分类浏览信息；每条含约200字概述与制作入口'
    : (infoMode === 'live' ? '及时选题：当前档期按分类聚合分析与决策'
      : infoMode === 'daily' ? '每日选题：按分类聚合分析与决策' : '每周选题：按分类聚合趋势、预判与决策');
  if (infoMode === 'live' || infoMode === 'daily' || infoMode === 'weekly') {
    await renderTopicInfo(infoMode);
  } else {
    await renderInfoClassify();
  }
}

async function renderInfoClassify() {
  const zone = $('#info-zone');
  const allRuns = (await ensureClassifyHistory()).runs || [];
  const runs = await loadInfoRuns();
  const cats = infoCategoriesFromRuns(runs);
  if (!cats.includes(infoCategory)) infoCategory = '国内';
  const heatCats = ['微博TOP10', '抖音TOP10'];
  const chips = cats.concat(heatCats);
  const isHeat = heatCats.includes(infoCategory);
  let html = timeToolbarHtml(allRuns, infoRunFilter, infoDateFilter) + `<div class="chip-row">`;
  chips.forEach((cat) => {
    const extra = extraCategories.includes(cat);
    html += extra
      ? `<span class="chip-wrap"><button class="chip ${cat === infoCategory ? 'active' : ''}" data-cat="${esc(cat)}">${esc(cat)}</button><button class="chip-del" data-del-cat="${esc(cat)}" title="删除">×</button></span>`
      : `<button class="chip ${cat === infoCategory ? 'active' : ''}" data-cat="${esc(cat)}">${esc(cat)}</button>`;
  });
  html += `<button class="chip add-cat" data-add-cat="1">＋ 新增分类</button></div>`;
  if (isHeat) {
    const key = infoCategory === '微博TOP10' ? 'weibo' : 'douyin';
    const rows = (contentData && contentData.c && contentData.c[key]) || [];
    html += `<div class="classify-list">${rows.length ? rows.map((r) => `<div class="classify-row"><span class="score">#${r.rank}</span><span class="title">${esc(r.title)}</span></div>`).join('') : '<div class="empty-note">暂无热度榜数据</div>'}</div>`;
    zone.innerHTML = html;
    bindInfoZoneClicks(zone, [], runs);
    return;
  }
  const seen = new Set();
  const unique = [];
  const olderTitles = new Set();
  runs.slice(1).forEach((run) => (run.items || []).forEach((it) => {
    olderTitles.add((it.title || '').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase().slice(0, 60));
  }));
  const runPicked = !!infoRunFilter;
  runs.forEach((run, ri) => {
    (run.items || []).filter((it) => it.category === infoCategory).forEach((it) => {
      const key = (it.title || '').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase().slice(0, 60);
      if (!key || seen.has(key)) return;
      seen.add(key);
      const batch = runPicked ? '所选档期' : ri === 0 ? (olderTitles.has(key) ? '本次更新' : '新增') : '历史';
      unique.push({ it, run: run.run, generatedAt: run.generatedAt, latest: !runPicked && ri === 0, batch });
    });
  });
  if (!unique.length) {
    zone.innerHTML = html + '<div class="empty-note">「' + esc(infoCategory) + '」暂无信息，请先运行全流程</div>';
    bindInfoZoneClicks(zone, [], runs);
    return;
  }
  const itemsHtml = unique.map(({ it, run, generatedAt, latest, batch }) => {
    const made = producedMap[it.title];
    const timeLabel = formatRunClock(generatedAt || run);
    const linkHtml = it.link
      ? `<a href="${esc(it.link)}" target="_blank" rel="noopener">查看原文 ↗</a>`
      : '<span class="muted">无原文链接</span>';
    return `<div class="classify-row info-item-row">
      <div class="info-item-top">
        <span class="title info-title-open" data-title="${esc(it.title)}" title="点击查看全网深度整合">${esc(it.title)}</span>
        <span class="run-tag ${latest ? '' : 'old'}">${runPicked ? '所选' : latest ? '最新' : '历史'}</span>
        <span class="cc-row-spread ${spreadClass(it.spread)}">${esc(it.spread || '中')}</span>
        <span class="score">${it.spreadScore ?? '--'}/100</span>
        ${made ? `<span class="made-badge" title="制作于 ${esc(made.run)}">已制作</span>` : ''}
      </div>
      <div class="info-overview">${esc(infoOverviewText(it))}</div>
      <div class="info-meta-line">
        <span class="batch-tag ${batch === '新增' ? 'new' : batch === '本次更新' ? 'upd' : 'old'}">${esc(batch)}</span>
        <span class="info-time">${esc(timeLabel)}</span>
        <span class="info-source">来源：${esc(it.source || '公开信息')}${linkHtml}</span>
      </div>
      <div class="info-item-actions">
        <button class="btn primary info-video" data-title="${esc(it.title)}">制作视频</button>
        <button class="btn ghost info-article" data-title="${esc(it.title)}">制作图文</button>
        <button class="btn ghost info-dims" data-title="${esc(it.title)}">查看维度</button>
      </div>
    </div>`;
  }).join('');
  zone.innerHTML = html + `<div class="waterfall">${itemsHtml}</div>`;
  bindInfoZoneClicks(zone, unique.map((u) => u.it), runs);
}

function bindInfoZoneClicks(zone, items, runs) {
  bindTimeline(zone);
  zone.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => {
    infoCategory = b.dataset.cat;
    renderInfoView();
  }));
  zone.querySelectorAll('[data-del-cat]').forEach((b) => b.addEventListener('click', async () => {
    const cat = b.dataset.delCat;
    if (!confirm(`删除分类「${cat}」及其采集源？`)) return;
    try {
      await api('/api/category/delete', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: cat }) });
      extraCategories = extraCategories.filter((x) => x !== cat);
      if (infoCategory === cat) infoCategory = '国内';
      await renderInfoView();
    } catch (err) {
      toast(err.message, true);
    }
  }));
  zone.querySelector('[data-add-cat]')?.addEventListener('click', () => $('#add-category-dialog').showModal());
  const byTitle = new Map(items.map((it) => [it.title, it]));
  zone.querySelectorAll('.info-video').forEach((b) => b.addEventListener('click', () => goMakeItem(b.dataset.title, 'video', byTitle.get(b.dataset.title))));
  zone.querySelectorAll('.info-article').forEach((b) => b.addEventListener('click', () => goMakeItem(b.dataset.title, 'article', byTitle.get(b.dataset.title))));
  zone.querySelectorAll('.info-dims').forEach((b) => b.addEventListener('click', () => {
    const it = byTitle.get(b.dataset.title);
    if (it) openItemDetail(it, 'a');
  }));
  zone.querySelectorAll('.info-title-open').forEach((el) => el.addEventListener('click', () => {
    const it = byTitle.get(el.dataset.title);
    if (it) openItemDetail(it, 'a');
  }));
}

async function renderTopicInfo(mode) {
  const zone = $('#info-zone');
  if (!zone) return;
  const allRuns = (await ensureClassifyHistory()).runs || [];
  zone.innerHTML = '<div class="empty-note">正在按分类分析学习、预判与决策…</div>';
  try {
    const data = await api('/api/item/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        mode,
        run: infoRunFilter || undefined,
        date: infoDateFilter ? String(infoDateFilter).replace(/-/g, '') : undefined
      })
    });
    const cats = data.byCategory || [];
    try {
      const counts = JSON.parse(localStorage.getItem('neo_topic_counts')) || {};
      counts[mode] = (data.candidates || []).length;
      localStorage.setItem('neo_topic_counts', JSON.stringify(counts));
    } catch {}
    if (!cats.length) {
      zone.innerHTML = timeToolbarHtml(allRuns, infoRunFilter, infoDateFilter) + '<div class="empty-note">暂无该周期的分类数据，请先运行一键全流程，或切换时间线档期。</div>';
      bindTimeline(zone);
      return;
    }
    const cards = cats.map((c) => `
      <div class="info-cat-card">
        <div class="info-cat-head"><strong>${esc(c.category)}</strong>
          <span>${c.count} 条 · 平均 ${c.avgScore}/100</span>
          <span class="hint">来源：${esc(c.sources || '')}</span>
        </div>
        <div class="info-topic-title">选题：${esc((c.top && c.top[0] && c.top[0].title) || '暂无推荐')}${c.top && c.top[0] && c.top[0].count > 1 ? `（已出现 ${c.top[0].count} 次）` : ''}</div>
        <div class="topic-grid">
          <div class="topic-card"><h4>基础分析</h4><p>${esc(c.analysis || '')}</p><p class="topic-learn">${esc(c.learning || '')}</p></div>
        </div>
        <div class="topic-candidates">
          ${(c.top || []).map((t) => `
            <div class="topic-row">
              <span class="topic-rank">出现 ${t.count} 次</span>
              <span class="topic-title">${esc(t.title || '')}</span>
              <span class="topic-score">${t.score ?? t.spreadScore ?? '--'}/100</span>
              <span class="row-actions">
                <button class="btn ghost topic-video" data-title="${esc(t.title)}">视频</button>
                <button class="btn ghost topic-article" data-title="${esc(t.title)}">图文</button>
              </span>
            </div>`).join('') || '<div class="topic-row"><span class="topic-title">暂无候选条目</span></div>'}
        </div>
        <details class="topic-details"><summary>展开：预判与决策</summary>
          <p class="topic-learn">${esc(c.prediction || '')}</p>
          <p>${esc(c.decision || '')}</p>
        </details>
      </div>`).join('');
    const period = data.period || {};
    const periodText = [
      period.toRun ? `截至 ${formatRunClock(period.toRun)}` : '',
      period.fromRun ? `最早 ${formatRunClock(period.fromRun)}` : '',
      data.mode
    ].filter(Boolean).join('｜');
    zone.innerHTML = timeToolbarHtml(allRuns, infoRunFilter, infoDateFilter)
      + `<div class="topic-summary">${esc(data.analysis || '')}<div class="period-hint">${esc(periodText)}</div></div>`
      + `<div class="waterfall topic-waterfall">${cards}</div>`;
    bindTimeline(zone);
    zone.querySelectorAll('.topic-video').forEach((b) => b.addEventListener('click', () => goMakeItem(b.dataset.title, 'video')));
    zone.querySelectorAll('.topic-article').forEach((b) => b.addEventListener('click', () => goMakeItem(b.dataset.title, 'article')));
  } catch (err) {
    zone.innerHTML = timeToolbarHtml(allRuns, infoRunFilter, infoDateFilter) + `<div class="empty-note">${esc(err.message)}</div>`;
    bindTimeline(zone);
  }
}

async function goMakeItem(title, kind, it) {
  switchView('produce');
  showProdPane(kind === 'video' ? 'video' : 'article');
  await refreshContentForProduce();
  for (const sel of [$('#video-select'), $('#article-select')]) {
    if (!sel) continue;
    if (!Array.from(sel.options).some((o) => o.value === title)) {
      const opt = document.createElement('option');
      opt.value = title;
      opt.textContent = `${title}（${it && (it.spreadScore ?? it.score) || '--'}/100）`;
      sel.appendChild(opt);
    }
    sel.value = title;
  }
  if (kind === 'video') loadVideoScript();
  toast(`已进入${kind === 'video' ? '视频' : '图文'}制作：${title}`);
}

/* ---------------- 图谱 ---------------- */

function nodePositions() {
  const cx = GRAPH_CX;
  const cy = GRAPH_CY;
  const pos = { hub: { x: cx, y: cy } };
  STAGES.forEach((s, i) => {
    const j = (hash01(s.key + '|stage|' + i) - 0.5) * 2;
    const a = ((-90 + i * (360 / STAGES.length) + j * 4.2) * Math.PI) / 180;
    const r = 335 + j * 18;
    pos[s.key] = { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });
  SATS.forEach((s, i) => {
    const j = (hash01(s.key + '|sat|' + i) - 0.5) * 2;
    const step = 360 / SATS.length;
    const a = ((-90 + (i + 0.5) * step + j * 5.5) * Math.PI) / 180;
    const r = 570 + j * 20;
    pos[s.key] = { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });
  if (pos.assets) {
    const j = (hash01('assets|move-down') - 0.5) * 2;
    pos.assets = { x: GRAPH_CX - 590 + j * 16, y: GRAPH_CY - 236 + j * 16 };
  }
  if (pos.heat) {
    const j = (hash01('heat|move-up') - 0.5) * 2;
    pos.heat = { x: GRAPH_CX - 390 + j * 16, y: GRAPH_CY + 190 + j * 16 };
  }
  if (pos.data) {
    const j = (hash01('data|move-up') - 0.5) * 2;
    pos.data = { x: GRAPH_CX + 380 + j * 16, y: GRAPH_CY + 190 + j * 16 };
  }
  if (pos.distribute) {
    const j = (hash01('distribute|upper-left') - 0.5) * 2;
    pos.distribute = { x: GRAPH_CX - 460 + j * 14, y: GRAPH_CY - 25 + j * 14 };
  }
  if (pos.classify) {
    pos.classify.y -= 90;
  }
  const saved = graphPositions();
  for (const [key, p] of Object.entries(pos)) {
    const sp = saved[key];
    if (sp && Number.isFinite(sp.x) && Number.isFinite(sp.y)) pos[key] = { x: sp.x, y: sp.y };
  }
  return pos;
}

function hash01(s) {
  let h = 2166136261;
  for (let i = 0; i < String(s).length; i++) {
    h ^= String(s).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 10000 / 10000;
}

function graphPositions() {
  if (!graphPosCache) {
    try {
      graphPosCache = JSON.parse(localStorage.getItem(GRAPH_POS_KEY)) || {};
    } catch {
      graphPosCache = {};
    }
  }
  return graphPosCache;
}

function saveGraphPosition(id, x, y) {
  const all = graphPositions();
  all[id] = { x, y };
  localStorage.setItem(GRAPH_POS_KEY, JSON.stringify(all));
}

function clearGraphPositions() {
  graphPosCache = null;
  localStorage.removeItem(GRAPH_POS_KEY);
}

function deleteSelectedFlowLine() {
  if (!selectedFlowLine) return;
  const all = flowStorage('neo_flow_links');
  const { title, platform, cat, mode } = selectedFlowLine;
  if (all[title] && all[title][platform] && all[title][platform][cat]) {
    delete all[title][platform][cat][mode];
    if (!Object.keys(all[title][platform][cat]).length) delete all[title][platform][cat];
    if (!Object.keys(all[title][platform]).length) delete all[title][platform];
    if (!Object.keys(all[title]).length) delete all[title];
    saveFlowStorage('neo_flow_links', all);
  }
  selectedFlowLine = null;
  const btn = $('#btn-flow-del-line');
  if (btn) btn.hidden = true;
  renderDistributionFlow();
  toast('已删除选中的连线');
}

function svgGraphPoint(e) {
  const svg = $('#graph');
  if (!svg || !svg.getScreenCTM) return null;
  return new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
}

function nodeStoreId(g) {
  if (!g) return '';
  if (g.dataset.id) return g.dataset.id;
  const parent = g.dataset.parent;
  const label = g.dataset.label;
  const idx = (GRAPH_CHILDREN[parent] || []).indexOf(label);
  return parent + '|child|' + Math.max(0, idx);
}

function setGraphFocus(on) {
  const stage = document.querySelector('#view-home .graph-stage');
  if (stage) stage.classList.toggle('focus', Boolean(on));
}

function focusBranch(id) {
  const related = new Set(['hub']);
  const mainKeys = new Set([...STAGES.map((s) => s.key), ...SATS.map((s) => s.key)]);
  if (id === 'hub') {
    mainKeys.forEach((k) => related.add(k));
  } else {
    related.add(id);
    for (const line of edgeEls) {
      const a = line.dataset.from;
      const b = line.dataset.to;
      if (a === id && mainKeys.has(b)) related.add(b);
      if (b === id && mainKeys.has(a)) related.add(a);
    }
  }
  for (const main of Array.from(related)) {
    if (!mainKeys.has(main)) continue;
    (GRAPH_CHILDREN[main] || []).forEach((label) => related.add(main + '|' + label));
  }
  if (nodeMap[id]) showDetail(id);
  for (const [key, g] of Object.entries(nodeMap)) g.classList.toggle('active', related.has(key));
  for (const line of edgeEls) {
    line.classList.toggle('active', related.has(line.dataset.from) && related.has(line.dataset.to));
  }
  setGraphFocus(true);
  pinned = true;
}

function childPos(parentKey, index, count) {
  const pp = nodePositions()[parentKey];
  if (!pp) return { x: GRAPH_CX, y: GRAPH_CY };
  const isSat = SATS.some((s) => s.key === parentKey);
  const j = (hash01(parentKey + '|child|' + index) - 0.5) * 2;
  if (parentKey === 'distribute') {
    const side = pp.x >= GRAPH_CX ? 1 : -1;
    const span = (Math.PI / 180) * 110;
    const mid = side === 1 ? -0.35 : Math.PI + 0.35;
    const a = mid - span / 2 + (count === 1 ? 0 : (index / (count - 1)) * span);
    const r = 212 + j * 8;
    return {
      x: Math.min(GRAPH_W - 80, Math.max(90, pp.x + Math.cos(a) * r)),
      y: Math.min(GRAPH_H - 60, Math.max(70, pp.y + Math.sin(a) * r * 0.82))
    };
  }
  if (parentKey === 'data') {
    const row = Math.floor(index / 2);
    const col = index % 2;
    const colX = pp.x + 130 + col * 190 + j * 8;
    const rowY = pp.y + 80 + row * 72 + j * 10;
    return {
      x: Math.min(GRAPH_W - 80, Math.max(90, colX)),
      y: Math.min(GRAPH_H - 60, Math.max(70, rowY))
    };
  }
  if (parentKey === 'heat') {
    const row = Math.floor(index / 2);
    const col = index % 2;
    const colX = pp.x - 130 - col * 190 + j * 8;
    const rowY = pp.y + 70 + row * 72 + j * 10;
    return {
      x: Math.min(GRAPH_W - 80, Math.max(90, colX)),
      y: Math.min(GRAPH_H - 60, Math.max(70, rowY))
    };
  }
  if (parentKey === 'assets') {
    const row = Math.floor(index / 2);
    const col = index % 2;
    const colX = pp.x - 100 + col * 150 + j * 8;
    const rowY = pp.y - 70 - row * 70 + j * 10;
    return {
      x: Math.min(GRAPH_W - 80, Math.max(90, colX)),
      y: Math.min(GRAPH_H - 60, Math.max(70, rowY))
    };
  }
  if (count >= 5) {
    const side = pp.x >= GRAPH_CX ? 1 : -1;
    const span = (Math.PI / 180) * Math.min(160, count * 21);
    const mid = side === 1 ? 0 : Math.PI;
    const a = mid - span / 2 + (count === 1 ? 0 : (index / (count - 1)) * span);
    const r = 225 + j * 10;
    return {
      x: Math.min(GRAPH_W - 90, Math.max(90, pp.x + Math.cos(a) * r)),
      y: Math.min(GRAPH_H - 70, Math.max(70, pp.y + Math.sin(a) * r * 0.9))
    };
  }
  if (isSat) {
    const side = pp.x >= GRAPH_CX ? 1 : -1;
    const down = pp.y <= GRAPH_CY ? 1 : -1;
    const col = Math.floor(index / 2);
    const row = index % 2;
    const colX = pp.x + side * (170 + col * 160) + j * 8;
    const rowY = pp.y + down * (row ? 165 : 95) + j * 10;
    return {
      x: Math.min(GRAPH_W - 90, Math.max(90, colX)),
      y: Math.min(GRAPH_H - 70, Math.max(70, rowY))
    };
  }
  if (parentKey === 'produce') {
    const col = Math.floor(index / 2);
    const row = index % 2;
    const colX = pp.x + 120 + col * 170 + j * 10;
    const rowY = pp.y - (row ? 115 : 55) + j * 12;
    return {
      x: Math.min(GRAPH_W - 90, Math.max(90, colX)),
      y: Math.min(GRAPH_H - 70, Math.max(70, rowY))
    };
  }
  let side = pp.x < GRAPH_CX ? -1 : 1;
  const col = Math.floor(index / 2);
  const row = index % 2;
  const colX = pp.x + side * (120 + col * 170) + j * 12;
  const rowY = pp.y + (row ? 55 : -55) + j * 14;
  return {
    x: Math.min(GRAPH_W - 90, Math.max(90, colX)),
    y: Math.min(GRAPH_H - 70, Math.max(70, rowY))
  };
}

function stageLatestInfo(key) {
  const s = statusData && statusData.stages && statusData.stages[key];
  return (s && s.latest) || null;
}

function stageRunCount(key) {
  const s = statusData && statusData.stages && statusData.stages[key];
  return (s && Array.isArray(s.runs) && s.runs.length) || 0;
}

function graphNodeMetrics(id) {
  const now = new Date();
  const scanMin = (config && config.workflow && config.workflow.scanMinutes) || 0;
  if (id === 'hub') {
    const total = Object.values((statusData && statusData.stages) || {}).reduce((n, s) => n + (s.runs ? s.runs.length : 0), 0);
    return `在线 · ${scanMin ? `每${scanMin}分扫描` : '手动扫描'} · ${total} 轮`;
  }
  if (id === 'collect') {
    const l = stageLatestInfo('collect');
    return `最新 ${l ? l.count : 0} 条 · ${stageRunCount('collect')} 档`;
  }
  if (id === 'integrate') {
    const l = stageLatestInfo('integrate');
    return `已整合 ${l ? l.count : 0} 条`;
  }
  if (id === 'classify') {
    const l = stageLatestInfo('classify');
    return `分类 ${l ? l.count : 0} 条 · ≥80 ${(contentData && contentData.byCategory ? Object.values(contentData.byCategory).flat().filter((x) => Number(x.spreadScore || 0) >= 80).length : 0)} 条`;
  }
  if (id === 'process') {
    const l = stageLatestInfo('process');
    return l && l.count != null ? `文案 ${l.count} 份` : l ? '文案 已生成' : '文案 待处理';
  }
  if (id === 'produce') {
    const l = stageLatestInfo('produce');
    return `产出 ${Object.keys(producedMap || {}).length} 条${l && l.run ? ' · ' + l.run : ''}`;
  }
  if (id === 'distribute') {
    const slot = Math.floor(now.getTime() / 60000);
    const h = hash01('dist|' + slot);
    return `今日发布 ${1 + Math.floor(h * 9)} 篇 · 曝光 ${3 + Math.floor(h * 30)}w`;
  }
  if (id === 'git') {
    const g = statusData && statusData.git || {};
    return `${g.dirty ? '有改动' : '干净'} · ${g.branch || 'master'}${g.ahead ? ' · 待推送' + g.ahead : ''}`;
  }
  if (id === 'ai') {
    return `模型 ${(config && config.ai && config.ai.model) || '未配置'}${(config && config.ai && config.ai.apiKey) ? ' · Key 已配' : ''}`;
  }
  if (id === 'data') {
    return `存档 ${Object.keys((statusData && statusData.stages) || {}).reduce((n, k) => n + stageRunCount(k), 0)} 档`;
  }
  if (id === 'heat') {
    const c = contentData && contentData.c || {};
    return `微博 ${(c.weibo || []).length} · 抖音 ${(c.douyin || []).length}`;
  }
  if (id === 'assets') {
    return `素材 ${Object.keys(producedMap || {}).length} 条产出`;
  }
  return '';
}

function topicCountFor(label) {
  let counts = {};
  try {
    counts = JSON.parse(localStorage.getItem('neo_topic_counts')) || {};
  } catch {}
  const n = counts[label === '及时选题' ? 'live' : label === '每日选题' ? 'daily' : label === '每周选题' ? 'weekly' : ''] || 0;
  return n ? `选题 ${n} 条` : '选题 等待数据';
}

function graphChildMetrics(parent, label) {
  const now = new Date();
  const slot = Math.floor(now.getTime() / 60000);
  if (parent === 'distribute') {
    const h = hash01('platform|' + label + '|' + slot);
    return `发稿 ${1 + Math.floor(h * 9)} · 阅读 ${3 + Math.floor(h * 97)}k · 热度 ${58 + Math.floor(h * 42)}`;
  }
  if (parent === 'classify') {
    if (['及时选题', '每日选题', '每周选题'].includes(label)) return topicCountFor(label);
    if (label === '分类浏览') return `${CATEGORIES.length + (extraCategories || []).length} 类`;
  }
  if (parent === 'collect') {
    const l = stageLatestInfo('collect');
    if (label === '央媒信源') return `${((config && config.sources) || []).length} 官方源`;
    if (label === '分类TOP10') return `${CATEGORIES.length + (extraCategories || []).length} 类源`;
    if (label === '本地素材') return `可上传批次`;
    return `${l ? l.count : 0} 条`;
  }
  if (parent === 'integrate') {
    const l = stageLatestInfo('integrate');
    return `${l ? l.count : 0} 条`;
  }
  if (parent === 'produce') {
    const h = hash01('produce|' + label + '|' + slot);
    return `已产出 ${Math.floor(h * 3) + (Object.keys(producedMap || {}).length ? 1 : 0)} 份`;
  }
  if (parent === 'git') {
    const g = statusData && statusData.git || {};
    if (label === '本地提交') return `${g.last ? '最近提交' : '暂无提交'}`;
    if (label === 'Pull Request') return `${g.ahead ? g.ahead + ' 待推送' : '已同步'}`;
  }
  if (parent === 'ai') {
    const key = (config && config.ai && config.ai.apiKey) ? '已配置' : '未配置';
    return label.includes('模型') ? key : '默认';
  }
  if (parent === 'heat') {
    const c = contentData && contentData.c || {};
    const key = label === '微博热榜' ? 'weibo' : label === '抖音热榜' ? 'douyin' : '';
    const list = key ? (c[key] || []) : [];
    return list.length ? `TOP ${list.length}` : '暂无榜单';
  }
  if (parent === 'assets') {
    const h = hash01('assets|' + label + '|' + slot);
    return `${1 + Math.floor(h * 8)} 份`;
  }
  if (parent === 'data') {
    const keyMap = { 采集: 'collect', 整合: 'integrate', 分类: 'classify', 汇总: 'process', 制作: 'produce', 分发: 'distribute' };
    const key = keyMap[label];
    const l = key ? stageLatestInfo(key) : null;
    return l ? `${l.count || '已'} 条记录` : '暂无记录';
  }
  return '';
}

function renderGraph() {
  const svg = $('#graph');
  if (!svg) return;
  svg.innerHTML = '';
  nodeMap = {};
  edgeEls = [];
  const pos = nodePositions();
  const edges = [];
  for (const s of STAGES) edges.push(['hub', s.key]);
  for (const s of SATS) edges.push(['hub', s.key]);
  edges.push(['collect', 'heat'], ['process', 'ai'], ['classify', 'data'], ['integrate', 'data'], ['produce', 'assets'], ['distribute', 'git']);
  for (const [a, b] of edges) {
    const line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', pos[a].x);
    line.setAttribute('y1', pos[a].y);
    line.setAttribute('x2', pos[b].x);
    line.setAttribute('y2', pos[b].y);
    line.setAttribute('class', 'edge');
    line.dataset.from = a;
    line.dataset.to = b;
    svg.appendChild(line);
    edgeEls.push(line);
  }
  const addNode = (id, label, sub, color, r, dataText = '') => {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'node-g');
    g.dataset.id = id;
    g.style.setProperty('--node-color', color);
    const ring = document.createElementNS(NS, 'circle');
    ring.setAttribute('class', 'node-ring');
    ring.setAttribute('cx', pos[id].x);
    ring.setAttribute('cy', pos[id].y);
    ring.setAttribute('r', r);
    ring.setAttribute('stroke', color);
    const pulse = document.createElementNS(NS, 'circle');
    pulse.setAttribute('class', 'node-pulse');
    pulse.setAttribute('cx', pos[id].x);
    pulse.setAttribute('cy', pos[id].y);
    pulse.setAttribute('r', r + 6);
    pulse.setAttribute('stroke', color);
    const core = document.createElementNS(NS, 'circle');
    core.setAttribute('class', 'node-core');
    core.setAttribute('cx', pos[id].x);
    core.setAttribute('cy', pos[id].y);
    core.setAttribute('r', Math.max(8, r * 0.42));
    core.setAttribute('fill', color);
    const labelEl = document.createElementNS(NS, 'text');
    labelEl.setAttribute('class', 'node-label');
    labelEl.setAttribute('x', pos[id].x);
    labelEl.setAttribute('y', pos[id].y + r + 24);
    labelEl.textContent = label;
    const subEl = document.createElementNS(NS, 'text');
    subEl.setAttribute('class', 'node-sub');
    subEl.setAttribute('x', pos[id].x);
    subEl.setAttribute('y', pos[id].y + r + 40);
    subEl.textContent = sub;
    g.append(ring, pulse, core, labelEl, subEl);
    if (dataText) {
      const dataEl = document.createElementNS(NS, 'text');
      dataEl.setAttribute('class', 'node-data');
      dataEl.setAttribute('x', pos[id].x);
      dataEl.setAttribute('y', pos[id].y + r + 58);
      dataEl.setAttribute('text-anchor', 'middle');
      dataEl.setAttribute('font-size', '12px');
      dataEl.setAttribute('fill', '#8a6240');
      dataEl.textContent = dataText;
      g.append(dataEl);
    }
    g.addEventListener('mouseenter', () => showDetail(id));
    g.addEventListener('mouseleave', () => { if (!pinned) clearDetail(); });
    g.addEventListener('click', () => {
      if (dragState && dragState.suppressClick) return;
      focusBranch(id);
    });
    g.addEventListener('dblclick', () => {
      if (dragState && dragState.suppressClick) return;
      const jump = {
        collect: 'home',
        integrate: 'home',
        classify: 'classify',
        process: 'produce',
        produce: 'produce',
        distribute: 'distribute',
        data: 'summary',
        heat: 'classify',
        assets: 'produce'
      }[id];
      if (jump) {
        if (id === 'heat') currentCat = '微博TOP10';
        setGraphFocus(false);
        pinned = false;
        switchView(jump);
      }
    });
    svg.appendChild(g);
    nodeMap[id] = g;
  };
  const stages = statusData.stages;
  addNode('hub', '媒体运营平台', 'MEDIA OS', '#ff9f0a', 58, graphNodeMetrics('hub'));
  for (const s of STAGES) {
    const info = stages && stages[s.key];
    const sub = s.key === 'git'
      ? (statusData.git ? statusData.git.branch : 'LOCAL')
      : (info && info.latest ? `RUN ${info.latest.run}` : 'WAITING');
    addNode(s.key, s.label, sub, s.color, 36, graphNodeMetrics(s.key));
  }
  for (const s of SATS) addNode(s.key, s.label, s.key.toUpperCase(), s.color, 27, graphNodeMetrics(s.key));

  for (const [parent, labels] of Object.entries(GRAPH_CHILDREN)) {
    const pp = pos[parent];
    if (!pp) continue;
    labels.forEach((label, i) => {
      const cp = childPos(parent, i, labels.length);
      const savedChild = graphPositions()[parent + '|child|' + i];
      if (savedChild && Number.isFinite(savedChild.x) && Number.isFinite(savedChild.y)) {
        cp.x = savedChild.x;
        cp.y = savedChild.y;
      }
      const line = document.createElementNS(NS, 'line');
      line.setAttribute('x1', pp.x);
      line.setAttribute('y1', pp.y);
      line.setAttribute('x2', cp.x);
      line.setAttribute('y2', cp.y);
      line.setAttribute('class', 'edge child-edge');
      line.dataset.from = parent;
      line.dataset.to = parent + '|' + label;
      svg.appendChild(line);
      edgeEls.push(line);
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'node-g node-child');
      g.style.setProperty('--node-color', parent === 'classify' || parent === 'git' ? '#af52de' : parent === 'produce' || parent === 'process' ? '#ff9f0a' : parent === 'distribute' || parent === 'platform' ? '#34c759' : '#8a8077');
      g.dataset.parent = parent;
      g.dataset.label = label;
      const ring = document.createElementNS(NS, 'circle');
      ring.setAttribute('class', 'node-ring');
      ring.setAttribute('cx', cp.x);
      ring.setAttribute('cy', cp.y);
      ring.setAttribute('r', 13);
      ring.setAttribute('stroke', g.style.getPropertyValue('--node-color'));
      const core = document.createElementNS(NS, 'circle');
      core.setAttribute('class', 'node-core');
      core.setAttribute('cx', cp.x);
      core.setAttribute('cy', cp.y);
      core.setAttribute('r', 5);
      core.setAttribute('fill', g.style.getPropertyValue('--node-color'));
      const title = document.createElementNS(NS, 'title');
      title.textContent = label;
      const text = document.createElementNS(NS, 'text');
      text.setAttribute('class', 'node-sub');
      text.setAttribute('x', cp.x);
      text.setAttribute('y', cp.y + 30);
      text.setAttribute('font-size', '14px');
      text.setAttribute('fill', parent === 'classify' || parent === 'git' ? '#8e4ec6' : parent === 'produce' || parent === 'process' ? '#b45309' : parent === 'distribute' || parent === 'platform' ? '#1a7f37' : '#6e6e73');
      text.textContent = label;
      const metrics = graphChildMetrics(parent, label);
      let dataText = null;
      if (metrics) {
        dataText = document.createElementNS(NS, 'text');
        dataText.setAttribute('class', 'node-data');
        dataText.setAttribute('x', cp.x);
        dataText.setAttribute('y', cp.y + 52);
        dataText.setAttribute('text-anchor', 'middle');
        dataText.setAttribute('font-size', '10.5px');
        dataText.setAttribute('fill', '#8a6240');
        dataText.textContent = metrics;
      }
      g.append(ring, core, title, text);
      if (dataText) g.append(dataText);
      g.addEventListener('click', () => {
        if (dragState && dragState.suppressClick) return;
        if (parent === 'classify') {
          if (label === '分类浏览') {
            infoMode = 'classify';
            infoCategory = '国内';
            switchView('classify');
          } else {
            infoMode = label === '及时选题' ? 'live' : label === '每日选题' ? 'daily' : 'weekly';
            switchView('summary');
          }
        } else if (parent === 'produce') {
          switchView('produce');
          showProdPane(label.includes('视频') ? 'video' : label.includes('图文') ? 'article' : 'image');
        } else if (parent === 'distribute') {
          switchView('distribute');
        } else if (parent === 'heat') {
          currentCat = label.replace('热榜', 'TOP10');
          if (label === '小红书热榜') currentCat = '小红书TOP10';
          switchView('classify');
        } else if (parent === 'ai') {
          openConfigForm();
        } else if (parent === 'collect') {
          if (label === '本地素材') {
            openLocalDialog();
            return;
          }
          switchView('home');
          showDetail(parent);
        } else if (parent === 'integrate') {
          switchView('home');
          showDetail(parent);
        } else if (parent === 'git') {
          showDetail('git');
        } else if (parent === 'data' || parent === 'assets') {
          showDetail(parent);
        }
        if (parent === 'distribute' && label) {
          const acctSelect = $('#acct-platform');
          if (acctSelect && acctSelect.options.length) acctSelect.value = label;
          if (typeof renderDistributeView === 'function') renderDistributeView();
        }
        if (parent === 'produce' && label) {
          const sel = label.includes('视频') ? $('#video-select') : $('#article-select');
          if (sel && sel.options.length) sel.value = sel.options[0].value;
        }
      });
      svg.appendChild(g);
      nodeMap[parent + '|' + label] = g;
    });
  }
}

function setActive(id) {
  activeNodeId = id;
  for (const [key, g] of Object.entries(nodeMap)) g.classList.toggle('active', key === id);
  for (const line of edgeEls) line.classList.toggle('active', line.dataset.from === id || line.dataset.to === id);
}

function clearDetail() {
  activeNodeId = null;
  setGraphFocus(false);
  const home = $('#view-home');
  if (home) home.classList.remove('detail-open');
  for (const g of Object.values(nodeMap)) g.classList.remove('active');
  for (const line of edgeEls) line.classList.remove('active');
  const box = $('#node-detail');
  if (box) box.innerHTML = '<div class="detail-empty"><span class="detail-scan"></span><p>将鼠标悬停在节点上<br />查看模块信息与操作</p></div>';
}

function fileChips(files) {
  return (files || []).map((f) => `<button class="file-chip" data-file="${esc(f)}">${esc(f.split('/').pop())}</button>`).join('');
}

function stageDetail(key) {
  const meta = STAGES.find((s) => s.key === key);
  if (key === 'git') {
    const g = statusData.git || {};
    const lines = [
      `BRANCH  ${g.branch || '未知'}`,
      `CHANGED ${g.changed ?? (g.dirty ? '有改动' : '0')} 个文件`,
      g.ahead ? `AHEAD   ${g.ahead} 个提交待推送` : 'AHEAD   同步',
      g.last ? `LAST    ${g.last}` : ''
    ].filter(Boolean);
    return `
      <div class="detail-head"><span class="detail-dot" style="color:${meta.color}"></span><h3>版本/PR</h3><span class="detail-status ${g.dirty ? 'running' : 'done'}">${g.dirty ? '有改动' : '干净'}</span></div>
      <p class="detail-desc">${meta.desc}。Git 与流程节点同级，可在此查看本地提交与远端推送状态。</p>
      <div class="detail-meta"><pre style="margin:0;font:inherit">${esc(lines.join('\n'))}</pre></div>
      <div class="detail-actions">
        <button class="btn ghost" id="git-refresh">刷新 Git 状态</button>
        <button class="btn primary" id="goto-git">打开 Git 终端</button>
      </div>`;
  }
  const s = statusData.stages[key];
  const latest = s.latest;
  const files = [];
  if (latest && latest.file) files.push(latest.file);
  if (latest && latest.files) files.push(...latest.files);
  const metaLines = latest
    ? [`RUN ${latest.run}`, latest.count != null ? `ITEMS ${latest.count}` : '', latest.mode ? `MODE ${latest.mode}` : '', `FILES ${files.length}`].filter(Boolean).join('\n')
    : 'STATUS WAITING\n暂无运行记录';
  return `
    <div class="detail-head"><span class="detail-dot" style="color:${meta.color}"></span><h3>${meta.label}</h3><span class="detail-status ${latest ? 'done' : 'idle'}">${latest ? '已完成' : '待运行'}</span></div>
    <p class="detail-desc">${meta.desc}</p>
    <div class="detail-meta"><pre style="margin:0;font:inherit">${esc(metaLines)}</pre></div>
    ${files.length ? `<div class="detail-files">${fileChips(files)}</div>` : ''}
    <div class="detail-actions"><button class="btn run-detail" data-stage="${key}">运行此环节</button></div>`;
}

function hubDetail() {
  const totalRuns = Object.values(statusData.stages).reduce((n, s) => n + (s.runs ? s.runs.length : 0), 0);
  const aiText = `${statusData.ai.enabled ? '已启用' : '未启用'}｜${statusData.ai.hasKey ? '已配置 Key' : '无 Key'}`;
  return `
    <div class="detail-head"><span class="detail-dot" style="color:#ff9f0a"></span><h3>媒体运营平台</h3><span class="detail-status done">ONLINE</span></div>
    <p class="detail-desc">搜集 → 整合 → 分类 → 汇总(40维) → 视频/图文制作 → 分发。悬停外围节点查看详情。</p>
    <div class="detail-meta"><pre style="margin:0;font:inherit">RUNTIME  127.0.0.1:3211
STAGES   6 + GIT
RUNS     ${totalRuns}
AI       ${esc(aiText)}
PLATFORM ${esc((config.workflow.platforms || []).join(' / '))}</pre></div>
    <div class="detail-actions"><button class="btn primary" id="hub-run-all">一键运行全流程</button><button class="btn ghost" id="hub-config">打开配置</button></div>`;
}

function satDetail(key) {
  const meta = SATS.find((s) => s.key === key);
  let body = '';
  let actions = '';
  if (key === 'ai') {
    body = `状态 ${statusData.ai.enabled ? 'ENABLED' : 'DISABLED'}\n密钥 ${statusData.ai.hasKey ? 'OK' : 'MISSING'}`;
    const img = config.ai.imageModel || 'pollinations-flux';
    const vid = config.ai.videoModel || 'capcut';
    const customImg = !img.startsWith('pollinations') && img !== 'jimeng' ? img : 'custom-image';
    const customVid = vid !== 'capcut' && vid !== 'jimeng' ? vid : 'custom-video';
    actions = `
      <div class="ai-model-box">
        <label>基础 AI 模型（文案/评分/脚本）
          <input id="detail-ai-model" type="text" value="${esc(config.ai.model || 'deepseek-chat')}" />
        </label>
        <label>图片生成模型
          <select id="detail-image-model">
            <option value="pollinations-flux" ${img === 'pollinations-flux' ? 'selected' : ''}>免费 Pollinations · FLUX（默认）</option>
            <option value="pollinations-turbo" ${img === 'pollinations-turbo' ? 'selected' : ''}>免费 Pollinations · Turbo</option>
            <option value="jimeng" ${img === 'jimeng' ? 'selected' : ''}>即梦图片（CLI/API）</option>
            <option value="${esc(customImg)}" ${customImg === img ? 'selected' : ''}>自定义图片模型：${esc(customImg)}（＋添加中配置）</option>
          </select>
        </label>
        <label>视频生成模型
          <select id="detail-video-model">
            <option value="capcut" ${vid === 'capcut' ? 'selected' : ''}>剪映 · 本地自动剪辑（默认）</option>
            <option value="moneyprinter" ${vid === 'moneyprinter' ? 'selected' : ''}>MoneyPrinterTurbo · 一键短视频</option>
            <option value="jimeng" ${vid === 'jimeng' ? 'selected' : ''}>即梦视频（CLI/API）</option>
            <option value="${esc(customVid)}" ${customVid === vid ? 'selected' : ''}>自定义视频模型：${esc(customVid)}（＋添加中配置）</option>
          </select>
        </label>
        <div class="head-actions">
          <button id="save-detail-ai" class="btn primary">保存模型选择</button>
          <button class="btn ghost" id="hub-config">打开完整配置</button>
        </div>
      </div>`;
  } else if (key === 'data') {
    body = STAGES.map((s) => `${s.key.toUpperCase().padEnd(10)} ${statusData.stages[s.key].runs.length} RUNS`).join('\n');
    actions = '<button class="btn ghost" id="goto-summary">打开汇总信息</button>';
  } else if (key === 'heat') {
    body = '微博 TOP10 已归档\n抖音 TOP10 已归档\n小红书 无公开实时接口';
    actions = '<button class="btn ghost" id="goto-classify-heat">打开热度榜</button>';
  } else if (key === 'git') {
    body = '本地版本：master\n状态 已提交，未推送\n需重新授权 GitHub 后开 PR';
  } else if (key === 'assets') {
    const produce = statusData.stages.produce.latest;
    body = produce && produce.files ? produce.files.join('\n') : '暂无产出';
    actions = '<button class="btn ghost" id="goto-produce">打开内容制作</button>';
  } else if (key === 'platform') {
    body = (config.workflow.platforms || []).map((p) => `· ${p}`).join('\n');
    actions = '<button class="btn ghost" id="goto-distribute">打开分发</button>';
  }
  return `
    <div class="detail-head"><span class="detail-dot" style="color:${meta.color}"></span><h3>${meta.label}</h3></div>
    <p class="detail-desc">${meta.desc}</p>
    <div class="detail-meta"><pre style="margin:0;font:inherit">${esc(body)}</pre></div>
    ${actions}`;
}

function showDetail(id) {
  setActive(id);
  const home = $('#view-home');
  if (home) home.classList.add('detail-open');
  const box = $('#node-detail');
  if (!box) return;
  box.innerHTML = id === 'hub' ? hubDetail() : STAGES.some((s) => s.key === id) ? stageDetail(id) : satDetail(id);
  box.querySelectorAll('.file-chip').forEach((chip) => chip.addEventListener('click', () => previewFile(chip.dataset.file)));
  const runBtn = box.querySelector('.run-detail');
  if (runBtn) runBtn.addEventListener('click', () => runStage(runBtn.dataset.stage, runBtn));
  const hubRun = box.querySelector('#hub-run-all');
  if (hubRun) hubRun.addEventListener('click', () => runFull());
  const gotoSummary = box.querySelector('#goto-summary');
  if (gotoSummary) gotoSummary.addEventListener('click', () => switchView('summary'));
  const gotoHeat = box.querySelector('#goto-classify-heat');
  if (gotoHeat) gotoHeat.addEventListener('click', () => { currentCat = '微博TOP10'; switchView('classify'); });
  const gotoProduce = box.querySelector('#goto-produce');
  if (gotoProduce) gotoProduce.addEventListener('click', () => switchView('produce'));
  const gotoDist = box.querySelector('#goto-distribute');
  if (gotoDist) gotoDist.addEventListener('click', () => switchView('distribute'));
  const saveAi = box.querySelector('#save-detail-ai');
  if (saveAi) saveAi.addEventListener('click', async () => {
    try {
      const ai = {
        enabled: !!(config.ai && config.ai.enabled),
        baseUrl: (config.ai && config.ai.baseUrl) || 'https://api.deepseek.com',
        model: String(box.querySelector('#detail-ai-model').value || 'deepseek-chat').trim(),
        apiKey: (config.ai && config.ai.apiKey) || '',
        imageModel: box.querySelector('#detail-image-model').value,
        videoModel: box.querySelector('#detail-video-model').value
      };
      await api('/api/config', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ai })
      });
      config = await api('/api/config');
      syncContentAiSelects();
      showDetail('ai');
      toast('AI 引擎模型已保存');
    } catch (err) {
      toast(err.message, true);
    }
  });
  const gitRefresh = box.querySelector('#git-refresh');
  if (gitRefresh) gitRefresh.addEventListener('click', async () => {
    gitRefresh.disabled = true;
    gitRefresh.textContent = '刷新中…';
    try {
      statusData = await api('/api/status');
      showDetail('git');
      toast('Git 状态已刷新');
    } catch (err) {
      toast(err.message, true);
      gitRefresh.disabled = false;
      gitRefresh.textContent = '刷新 Git 状态';
    }
  });
  const gotoGit = box.querySelector('#goto-git');
  if (gotoGit) gotoGit.addEventListener('click', () => toast('请在 Codex 对话或本地终端执行 git 提交/推送；远端 PR 需先重新授权 GitHub。'));
}

function renderPipeline() {
  const el = $('#pipeline');
  if (!el) return;
  el.innerHTML = '';
  for (const s of STAGES) {
    if (s.key === 'git') {
      const g = statusData.git || {};
      const card = document.createElement('div');
      card.className = 'stage';
      card.innerHTML = `
        <div class="stage-head"><span class="stage-num" style="color:${s.color};border-color:${s.color}">${STAGES.indexOf(s) + 1}</span><span class="stage-name">${s.label}</span><span class="stage-status ${g.dirty ? 'running' : 'done'}">${g.dirty ? '有改动' : '干净'}</span></div>
        <div class="stage-meta">${g.branch ? `分支 ${g.branch}` : '未检测到 Git 仓库'}${g.last ? `｜${g.last}` : ''}</div>
        <div class="stage-actions"><button class="btn git-detail" data-git-detail="1">查看 Git 状态</button></div>`;
      el.appendChild(card);
      continue;
    }
    const info = statusData.stages[s.key];
    const latest = info.latest;
    const files = [];
    if (latest && latest.file) files.push(latest.file);
    if (latest && latest.files) files.push(...latest.files);
    const card = document.createElement('div');
    card.className = 'stage';
    card.innerHTML = `
      <div class="stage-head"><span class="stage-num" style="color:${s.color};border-color:${s.color}">${STAGES.indexOf(s) + 1}</span><span class="stage-name">${s.label}</span><span class="stage-status">${latest ? '完成' : '待运行'}</span></div>
      <div class="stage-meta">${latest ? `最近 ${latest.run}${latest.count != null ? '｜' + latest.count + ' 条' : ''}` : '尚未运行'}</div>
      <div class="stage-files">${fileChips(files)}</div>
      <div class="stage-actions"><button class="btn run-stage" data-stage="${s.key}">运行</button></div>`;
    el.appendChild(card);
  }
  el.querySelectorAll('.run-stage').forEach((btn) => btn.addEventListener('click', () => runStage(btn.dataset.stage, btn)));
  el.querySelectorAll('.file-chip').forEach((chip) => chip.addEventListener('click', () => previewFile(chip.dataset.file)));
  el.querySelectorAll('.git-detail').forEach((btn) => btn.addEventListener('click', () => showDetail('git')));
}

async function runStage(stage, btn) {
  const manual = '';
  const b = btn;
  if (b) { b.disabled = true; b.textContent = '运行中…'; }
  try {
    await api('/api/run/' + stage, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ manualText: manual }) });
    toast(stage === 'all' ? '全流程运行完成' : `阶段完成`);
    await refresh();
  } catch (err) {
    toast(err.message, true);
  } finally {
    if (b) { b.disabled = false; b.textContent = stage === 'all' ? '一键运行全流程' : '运行'; }
  }
}

/* ---------------- 信息分类 ---------------- */

async function loadContent() {
  try {
    contentData = await api('/api/content');
    flatItems = [];
    for (const cat of CATEGORIES) {
      const list = (contentData.byCategory && contentData.byCategory[cat]) || [];
      for (const it of list) flatItems.push({ ...it, cat });
    }
    flatItems.sort((a, b) => (Number(b.spreadScore) || 0) - (Number(a.spreadScore) || 0));
  } catch {
    contentData = null;
    flatItems = [];
  }
}

async function loadProduced() {
  try {
    const r = await api('/api/produced');
    producedMap = (r && r.items) || {};
  } catch {
    producedMap = {};
  }
}

async function loadCategoryExtras() {
  try {
    const r = await api('/api/category/list');
    extraCategories = (r.extra || []).filter((c) => !CATEGORIES.includes(c));
    rebuildCategoryChips();
  } catch {
    extraCategories = [];
  }
}

function rebuildCategoryChips() {
  const row = $('#classify-chips');
  if (!row) return;
  row.querySelectorAll('.chip-dynamic').forEach((el) => el.remove());
  for (const cat of extraCategories) {
    const wrap = document.createElement('span');
    wrap.className = 'chip-wrap chip-dynamic';
    const b = document.createElement('button');
    b.className = 'chip';
    b.dataset.cat = cat;
    b.textContent = cat;
    b.addEventListener('click', () => { currentCat = cat; renderClassifyView(); });
    const del = document.createElement('button');
    del.className = 'chip-del';
    del.title = '删除该分类及其采集源';
    del.innerHTML = '×';
    del.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm(`确定删除分类「${cat}」吗？将同时移除它的 20 个采集源。`)) return;
      try {
        await api('/api/category/delete', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: cat })
        });
        extraCategories = extraCategories.filter((x) => x !== cat);
        if (currentCat === cat) {
          currentCat = '国内';
          classifyHistory = null;
        }
        rebuildCategoryChips();
        renderClassifyView();
        toast(`已删除分类「${cat}」`);
      } catch (err) {
        toast(err.message, true);
      }
    });
    wrap.append(b, del);
    row.appendChild(wrap);
  }
  const addBtn = document.createElement('button');
  addBtn.className = 'chip chip-dynamic add-cat';
  addBtn.textContent = '＋ 新增分类';
  addBtn.addEventListener('click', () => $('#add-category-dialog').showModal());
  row.appendChild(addBtn);
}

async function saveNewCategory() {
  const name = $('#new-category-name').value.trim();
  if (!name) {
    toast('请输入分类名称', true);
    return;
  }
  try {
    const r = await api('/api/category/add', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name })
    });
    $('#add-category-dialog').close();
    if (!r.exists && !extraCategories.includes(name)) extraCategories.push(name);
    rebuildCategoryChips();
    currentCat = name;
    classifyHistory = null;
    renderClassifyView();
    if (!$('#view-info').hidden) renderInfoView();
    toast(`已添加分类「${name}」，自动生成 ${r.count || 20} 个采集源`);
  } catch (err) {
    toast(err.message, true);
  }
}

async function renderClassifyView() {
  const listEl = $('#classify-list');
  if (!listEl) return;
  document.querySelectorAll('#classify-chips .chip[data-cat]').forEach((c) => c.classList.toggle('active', c.dataset.cat === currentCat));
  $('#classify-hint').textContent = `当前：${currentCat}`;
  listEl.innerHTML = '';
  if (currentCat === '微博TOP10' || currentCat === '抖音TOP10') {
    const key = currentCat === '微博TOP10' ? 'weibo' : 'douyin';
    const rows = (contentData && contentData.c && contentData.c[key]) || [];
    if (!rows.length) {
      listEl.innerHTML = '<div class="empty-note">暂无热度榜数据</div>';
      return;
    }
    for (const r of rows) {
      const row = document.createElement('div');
      row.className = 'classify-row';
      row.innerHTML = `<span class="score">#${r.rank}</span><span class="title">${esc(r.title)}</span>`;
      listEl.appendChild(row);
    }
    return;
  }
  if (!classifyHistory) {
    listEl.innerHTML = '<div class="empty-note">正在读取历史信息库…</div>';
    try {
      classifyHistory = await api('/api/classify-history');
    } catch {
      classifyHistory = { runs: [] };
    }
  }
  const runs = (classifyHistory && classifyHistory.runs) || [];
  const seen = new Set();
  const unique = [];
  runs.forEach((run, ri) => {
    (run.items || [])
      .filter((it) => it.category === currentCat)
      .forEach((it) => {
        const key = (it.title || '').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase().slice(0, 60);
        if (!key || seen.has(key)) return;
        seen.add(key);
        unique.push({ it, run: run.run, generatedAt: run.generatedAt, latest: ri === 0 });
      });
  });
  if (!unique.length) {
    listEl.innerHTML = `<div class="empty-note">「${esc(currentCat)}」暂无历史信息，请先运行「一键运行全流程」</div>`;
    return;
  }
  const sec = document.createElement('div');
  sec.className = 'classify-run';
  sec.innerHTML = `<div class="classify-run-head"><span class="run-dot latest"></span>
    <strong>${esc(currentCat)} · 已去重 ${unique.length} 条</strong>
    <span class="hint">跨档期自动去重，保留最新出现时间</span>
  </div>
  <div class="classify-rows"></div>`;
  const rowsBox = sec.querySelector('.classify-rows');
  unique.forEach(({ it, run, generatedAt, latest }) => {
    const made = producedMap[it.title];
    const row = document.createElement('div');
    row.className = 'classify-row';
    const actionHtml = made
      ? `<button class="btn ghost" disabled title="制作于 ${esc(made.run)}">已制作</button>`
      : `<button class="btn primary make-item" data-title="${esc(it.title)}">制作</button>`;
    row.innerHTML = `
      <span class="title">${esc(it.title)}</span>
      <span class="run-tag ${latest ? '' : 'old'}">${latest ? '最新' : esc(run || '历史')}</span>
      <span class="cc-row-spread ${spreadClass(it.spread)}">${esc(it.spread || '中')}</span>
      <span class="score">${it.spreadScore ?? '--'}/100</span>
      <span class="row-actions">${actionHtml}</span>`;
    row.addEventListener('click', (e) => {
      if (e.target.closest('.make-item')) return;
      openItemDetail(it, 'a');
    });
    const makeBtn = row.querySelector('.make-item');
    if (makeBtn) makeBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      makeBtn.disabled = true;
      makeBtn.textContent = '全流程制作中…';
      try {
        const r = await api('/api/item/make', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ title: it.title })
        });
        if (r.alreadyMade) {
          toast(`「${it.title}」已经制作过`);
        } else {
          toast(`「${it.title}」已自动跑完全流程，进入发布审核`);
        }
        await loadProduced();
        renderClassifyView();
      } catch (err) {
        toast(err.message, true);
        makeBtn.disabled = false;
        makeBtn.textContent = '制作';
      }
    });
    rowsBox.appendChild(row);
  });
  listEl.appendChild(sec);
  if (unique.some((x) => x.latest && producedMap[x.it.title])) {
    $('#classify-hint').textContent = `当前：${currentCat}（已过滤重复，制作状态已标注）`;
  }
}

document.querySelectorAll('#classify-chips .chip').forEach((chip) => {
  chip.addEventListener('click', () => { currentCat = chip.dataset.cat; renderClassifyView(); });
});

/* ---------------- 汇总信息 ---------------- */

async function loadSummary() {
  try {
    summaryData = await api('/api/summary');
  } catch {
    summaryData = { items: [] };
  }
}

function renderSummaryView() {
  const el = $('#summary-list');
  if (!el) return;
  el.innerHTML = '';
  const items = (summaryData && summaryData.items) || [];
  if (!items.length) {
    el.innerHTML = '<div class="empty-note">暂无评分≥80 的汇总内容。<br />请先运行「信息分类」，再点「重新汇总」。</div>';
    return;
  }
  for (const it of items) {
    const row = document.createElement('div');
    row.className = 'summary-row';
    row.innerHTML = `
      <div class="summary-row-head">
        <span class="title">${esc(it.title)}</span>
        <span class="cc-row-spread ${spreadClass(it.spread)}">${esc(it.spread || '中')}</span>
        <span class="score">${it.score}/100</span>
      </div>
      <div class="content">${esc((it.content || '').slice(0, 400))}</div>
      <div class="meta">${esc(it.category || '')}｜${esc(it.source || '公开信息')}${it.link ? '｜' + esc(it.link) : ''}｜40维评估</div>
      <div class="actions">
        <button class="btn primary act-video" data-title="${esc(it.title)}">制作视频</button>
        <button class="btn ghost act-article" data-title="${esc(it.title)}">图文制作</button>
        <button class="btn ghost act-detail" data-title="${esc(it.title)}">查看 40 维明细</button>
      </div>`;
    el.appendChild(row);
  }
  el.querySelectorAll('.act-video').forEach((b) => b.addEventListener('click', () => { selectItemByTitle(b.dataset.title); switchView('produce'); }));
  el.querySelectorAll('.act-article').forEach((b) => b.addEventListener('click', () => { selectItemByTitle(b.dataset.title); switchView('produce'); showProdPane('article'); }));
  el.querySelectorAll('.act-detail').forEach((b) => {
    b.addEventListener('click', () => {
      const it = (summaryData.items || []).find((x) => x.title === b.dataset.title);
      if (it) openSummaryDetail(it);
    });
  });
}

function openSummaryDetail(it) {
  $('#item-title').textContent = `40维评分 · ${it.title}`;
  const dimRows = (it.dims || []).map((d, i) => `<tr><td>${i + 1}</td><td>${esc(d.name)}</td><td>${d.score}</td><td>${esc(d.note || '模型综合估算')}</td></tr>`).join('');
  $('#item-body').innerHTML = `
    <div class="item-sec"><h4>内容</h4><div class="item-text">${esc(it.content || it.title)}</div></div>
    <div class="item-sec"><h4>基础评分</h4><div class="item-score-line"><span class="item-score-num">${it.score}</span><span>/100 · ${esc(it.spread || '中')}</span></div></div>
    <div class="item-sec"><h4>素材来源</h4><p>${esc(it.source || '公开信息')}${it.link ? `<br /><a href="${esc(it.link)}" target="_blank" rel="noopener">${esc(it.link)}</a>` : ''}</p></div>
    <div class="item-sec"><h4>40 维评分明细</h4><table class="heat-table"><thead><tr><th>#</th><th>维度</th><th>评分</th><th>说明</th></tr></thead><tbody>${dimRows}</tbody></table></div>`;
  $('#item-dialog').showModal();
}

async function loadTopicAnalysis(mode, btn) {
  const status = $('#topic-status');
  const panel = $('#topic-panel');
  if (!panel) return;
  if (status) status.textContent = '分析中…';
  if (btn) {
    document.querySelectorAll('#view-summary .topic-bar .btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
  }
  try {
    const data = await api('/api/item/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode })
    });
    const rows = (data.candidates || []).map((c) => `
      <div class="topic-row">
        <span class="topic-rank">${esc(c.category || '其他')}</span>
        <span class="topic-title">${esc(c.title)}</span>
        <span class="topic-count">出现 ${c.appears || 1} 次</span>
        <span class="topic-score">${c.score}/100</span>
        <button class="btn ghost topic-make" data-title="${esc(c.title)}">制作</button>
      </div>`).join('') || '<div class="empty-note">暂无候选选题</div>';
    panel.innerHTML = `
      <div class="topic-head"><strong>${esc(data.mode || '选题分析')}</strong><span class="hint">分析 → 学习 → 预判 → 决策</span></div>
      <div class="topic-grid">
        <div class="topic-card"><h4>分析 / 学习</h4><p>${esc(data.analysis || '')}</p></div>
        <div class="topic-card"><h4>预判</h4><p>${esc(data.prediction || '')}</p></div>
        <div class="topic-card"><h4>决策</h4><p>${esc(data.decision || '')}</p></div>
      </div>
      <div class="topic-candidates">${rows}</div>`;
    panel.hidden = false;
    panel.querySelectorAll('.topic-make').forEach((b) => b.addEventListener('click', async (e) => {
      const title = e.target.dataset.title;
      e.target.disabled = true;
      try {
        const r = await api('/api/item/make', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ title })
        });
        toast(r.alreadyMade ? `「${title}」已经制作过` : `「${title}」已自动跑完全流程`);
        await loadProduced();
        await loadTopicAnalysis(mode, btn || null);
      } catch (err) {
        toast(err.message, true);
      }
    }));
    if (status) status.textContent = `已生成 ${(data.candidates || []).length} 条候选`;
  } catch (err) {
    if (status) status.textContent = '';
    panel.innerHTML = `<div class="empty-note">${esc(err.message)}</div>`;
    panel.hidden = false;
  }
}

/* ---------------- 内容制作 ---------------- */

function buildItemOptions(select) {
  const items = (summaryData && summaryData.items && summaryData.items.length ? summaryData.items : flatItems);
  select.innerHTML = '';
  for (const it of items) {
    const opt = document.createElement('option');
    opt.value = it.title;
    opt.textContent = `${it.title}（${it.score ?? it.spreadScore ?? '--'}/100）`;
    select.appendChild(opt);
  }
}

function selectedFlatItem(title) {
  return flatItems.find((x) => x.title === title) || null;
}

function renderProduceView() {
  const ve = $('#video-engine');
  if (ve && config && config.ai && config.ai.videoModel) {
    ve.value = config.ai.videoModel;
  }
  buildItemOptions($('#video-select'));
  buildItemOptions($('#article-select'));
}

function selectItemByTitle(title) {
  for (const sel of [$('#video-select'), $('#article-select'), $('#dist-select')]) {
    if (!sel) continue;
    const opts = Array.from(sel.options);
    const hit = opts.find((o) => o.value === title);
    if (hit) sel.value = title;
  }
}

function defaultScriptForItem(it) {
  return `# ${it.title || '视频脚本'}

类别：${it.category || ''}｜评分：${it.spreadScore ?? it.score ?? '--'}/100｜来源：${it.source || '公开信息'}

## 口播稿
> 最新消息。${(it.content || it.fullText || it.summary || it.title || '')}。以上信息仅供参考。

## 分镜
| 镜号 | 时长 | 画面 | 口播 | 字幕 | 音效 |
|------|------|------|------|------|------|
| 1 | 5s | 主持人半身景 | 开场导语 | 标题 | 片头音 |
| 2 | 12s | 新闻画面/图表 | 具体内容 | 关键数据 | 数据音效 |
| 3 | 4s | 风险提示 | 以上信息仅供参考 | 风险提示 | 结束音 |
`;
}

async function loadVideoScript() {
  const title = $('#video-select').value;
  if (!title) return;
  const item = selectedFlatItem(title) || (summaryData.items || []).find((x) => x.title === title);
  let content = defaultScriptForItem(item || { title });
  if (item && item.clip && item.clip.clipFile) {
    try {
      const data = await api('/api/file?path=' + encodeURIComponent(item.clip.clipFile));
      content = data.content;
    } catch {}
  }
  $('#video-editor').value = content;
}

async function saveVideoScript() {
  const title = $('#video-select').value;
  const content = $('#video-editor').value;
  const safe = title.replace(/[\\/:*?"<>|]/g, '').slice(0, 30).replace(/\s+/g, '_') || 'script';
  const file = `data/edited/${Date.now()}_${safe}.md`;
  try {
    await api('/api/save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: file, content }) });
    toast('已保存：' + file);
  } catch (err) {
    toast(err.message, true);
  }
}

document.querySelectorAll('.prod-tab').forEach((btn) => {
  btn.addEventListener('click', () => showProdPane(btn.dataset.prod));
});

function showProdPane(prod) {
  document.querySelectorAll('.prod-tab').forEach((b) => b.classList.toggle('active', b.dataset.prod === prod));
  ['video', 'article', 'image'].forEach((p) => {
    const el = $('#prod-' + p);
    if (el) el.hidden = p !== prod;
  });
  if (prod === 'image') ensureCoverPrompt();
}

function currentSelectedItem() {
  const title = $('#video-select').value || $('#article-select').value || editingItemTitle || '';
  return flatItems.find((x) => x.title === title)
    || (summaryData && summaryData.items || []).find((x) => x.title === title)
    || { title, category: '' };
}

function setHomeFullscreen(on) {
  document.body.classList.toggle('home-fs', Boolean(on));
  const btn = $('#btn-home-fullscreen');
  if (btn) {
    btn.innerHTML = on
      ? '<i class="icon-mes tuichu"></i>退出全屏'
      : '<i class="icon-mes zonglan"></i>全屏展示';
  }
}

async function toggleHomeFullscreen() {
  const on = !document.body.classList.contains('home-fs');
  setHomeFullscreen(on);
  try {
    if (on) {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } else if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen();
    }
  } catch {}
}

function toggleHomePanel(panel) {
  const home = $('#view-home');
  if (!home) return;
  const map = { local: 'panel-local', board: 'panel-board', run: 'panel-run' };
  const cls = map[panel];
  const willOpen = !home.classList.contains(cls);
  Object.values(map).forEach((c) => home.classList.remove(c));
  if (willOpen) home.classList.add(cls);
  document.querySelectorAll('.home-dock .dock-btn[data-panel]').forEach((b) => {
    b.classList.toggle('active', willOpen && b.dataset.panel === panel);
  });
}

function ensureAssistantPanel() {
  openAssistantWidget();
}

function initDockParallax() {
  const home = $('#view-home');
  const dock = document.querySelector('.home-dock');
  if (!home || !dock) return;
  const reset = () => {
    dock.querySelectorAll('.dock-btn').forEach((b) => {
      b.style.setProperty('--mx', '0px');
      b.style.setProperty('--my', '0px');
    });
  };
  home.addEventListener('mousemove', (e) => {
    const r = home.getBoundingClientRect();
    const nx = r.width ? (e.clientX - r.left) / r.width - 0.5 : 0;
    const ny = r.height ? (e.clientY - r.top) / r.height - 0.5 : 0;
    dock.querySelectorAll('.dock-btn').forEach((b, i) => {
      const depth = 3 + (i % 5) * 3;
      b.style.setProperty('--mx', (nx * depth).toFixed(1) + 'px');
      b.style.setProperty('--my', (ny * depth).toFixed(1) + 'px');
    });
  });
  home.addEventListener('mouseleave', reset);
}

function onGraphPointerDown(e) {
  if (!graphDragMode) return;
  const svg = $('#graph');
  const g = e.target.closest('.node-g');
  if (!svg || !g) return;
  const ring = g.querySelector('.node-ring');
  if (!ring) return;
  const pt = svgGraphPoint(e);
  if (!pt) return;
  dragState = {
    id: nodeStoreId(g),
    g,
    startX: Number(ring.getAttribute('cx')) || 0,
    startY: Number(ring.getAttribute('cy')) || 0,
    originX: pt.x,
    originY: pt.y,
    moved: false,
    pointerId: e.pointerId
  };
  try {
    svg.setPointerCapture(e.pointerId);
  } catch {}
}

function onGraphPointerMove(e) {
  if (!dragState || e.pointerId !== dragState.pointerId) return;
  const pt = svgGraphPoint(e);
  if (!pt) return;
  const nx = dragState.startX + (pt.x - dragState.originX);
  const ny = dragState.startY + (pt.y - dragState.originY);
  if (Math.hypot(nx - dragState.startX, ny - dragState.startY) > 3) dragState.moved = true;
  dragState.g.setAttribute('transform', `translate(${nx - dragState.startX}, ${ny - dragState.startY})`);
  dragState.g.classList.add('dragging');
}

function onGraphPointerUp(e) {
  if (!dragState || e.pointerId !== dragState.pointerId) return;
  const svg = $('#graph');
  const moved = dragState.moved;
  if (moved) {
    const pt = svgGraphPoint(e);
    if (pt) {
      saveGraphPosition(dragState.id, dragState.startX + (pt.x - dragState.originX), dragState.startY + (pt.y - dragState.originY));
    }
    dragState.suppressClick = true;
    setTimeout(() => {
      if (dragState && dragState.suppressClick) dragState = null;
    }, 300);
    renderGraph();
    const resetBtn = $('#btn-graph-reset');
    if (resetBtn) resetBtn.hidden = false;
  } else {
    dragState = null;
  }
  try {
    svg && svg.releasePointerCapture && svg.releasePointerCapture(e.pointerId);
  } catch {}
}

function toggleGraphDragMode() {
  graphDragMode = !graphDragMode;
  const home = $('#view-home');
  if (home) home.classList.toggle('graph-drag-on', graphDragMode);
  const btn = $('#btn-graph-drag');
  if (btn) btn.textContent = graphDragMode ? '完成布局' : '✥ 拖动节点';
  const resetBtn = $('#btn-graph-reset');
  if (resetBtn) resetBtn.hidden = !graphDragMode || !Object.keys(graphPositions()).length;
  if (dragState) dragState = null;
}

function resetGraphPositions() {
  clearGraphPositions();
  renderGraph();
  const resetBtn = $('#btn-graph-reset');
  if (resetBtn) resetBtn.hidden = true;
  toast('图谱节点位置已恢复默认');
}

function renderAssistantHistory(history) {
  const log = $('#assistant-history');
  if (!log) return;
  log.innerHTML = '';
  const list = Array.isArray(history) ? history : [];
  if (!list.length) {
    const empty = document.createElement('div');
    empty.className = 'chat-msg ai';
    const pre = document.createElement('pre');
    pre.textContent = '你好，我是工作助手。可以直接输入：及时选题 / 每日选题 / 每周选题 / 整理日报 / 一键运行全流程，也可以配置 AI Key 后和我讨论选题与内容策略。';
    empty.appendChild(pre);
    log.appendChild(empty);
    return;
  }
  list.forEach((h) => {
    const div = document.createElement('div');
    div.className = 'chat-msg ' + (h.role === 'user' ? 'user' : 'ai');
    const pre = document.createElement('pre');
    pre.textContent = h.content || '';
    div.appendChild(pre);
    log.appendChild(div);
  });
  log.scrollTop = log.scrollHeight;
}

async function loadAssistantHistory() {
  try {
    const r = await api('/api/assistant/history');
    renderAssistantHistory(r.history || []);
  } catch {
    renderAssistantHistory([]);
  }
}

function openAssistantWidget() {
  const widget = $('#assistant-widget');
  const fab = $('#assistant-fab');
  if (widget) widget.hidden = false;
  if (fab) fab.hidden = true;
  loadAssistantHistory();
}

function closeAssistantWidget() {
  const widget = $('#assistant-widget');
  const fab = $('#assistant-fab');
  if (widget) widget.hidden = true;
  if (fab) fab.hidden = false;
}

function toggleAssistantPin() {
  const widget = $('#assistant-widget');
  const btn = $('#btn-assistant-pin');
  if (!widget || !btn) return;
  const pinned = widget.classList.toggle('pinned');
  btn.classList.toggle('primary', pinned);
  btn.textContent = pinned ? '已固定' : '固定';
  toast(pinned ? '工作助手已固定，跨页面保持显示' : '已取消固定');
}

let assistantDrag = null;

function onAssistantDragDown(e) {
  if (e.target.closest('button')) return;
  const widget = $('#assistant-widget');
  if (!widget || widget.hidden) return;
  const rect = widget.getBoundingClientRect();
  widget.style.left = rect.left + 'px';
  widget.style.top = rect.top + 'px';
  widget.style.right = 'auto';
  widget.style.bottom = 'auto';
  assistantDrag = { dx: e.clientX - rect.left, dy: e.clientY - rect.top, pointerId: e.pointerId };
  try {
    widget.setPointerCapture(e.pointerId);
  } catch {}
}

function onAssistantDragMove(e) {
  if (!assistantDrag || e.pointerId !== assistantDrag.pointerId) return;
  const widget = $('#assistant-widget');
  if (!widget) return;
  const x = Math.min(window.innerWidth - 80, Math.max(0, e.clientX - assistantDrag.dx));
  const y = Math.min(window.innerHeight - 60, Math.max(0, e.clientY - assistantDrag.dy));
  widget.style.left = x + 'px';
  widget.style.top = y + 'px';
}

function onAssistantDragEnd(e) {
  if (assistantDrag && e.pointerId === assistantDrag.pointerId) assistantDrag = null;
}

let fabDrag = null;
let fabDragSuppress = false;

function onFabDragDown(e) {
  const fab = $('#assistant-fab');
  if (!fab) return;
  const rect = fab.getBoundingClientRect();
  fabDrag = { dx: e.clientX - rect.left, dy: e.clientY - rect.top, startX: rect.left, startY: rect.top, moved: false, pointerId: e.pointerId };
  try {
    fab.setPointerCapture(e.pointerId);
  } catch {}
}

function onFabDragMove(e) {
  if (!fabDrag || e.pointerId !== fabDrag.pointerId) return;
  const fab = $('#assistant-fab');
  if (!fab) return;
  const x = Math.min(window.innerWidth - 140, Math.max(0, e.clientX - fabDrag.dx));
  const y = Math.min(window.innerHeight - 60, Math.max(0, e.clientY - fabDrag.dy));
  if (Math.abs(x - fabDrag.startX) > 3 || Math.abs(y - fabDrag.startY) > 3) fabDrag.moved = true;
  fab.style.left = x + 'px';
  fab.style.top = y + 'px';
  fab.style.right = 'auto';
  fab.style.bottom = 'auto';
}

function onFabDragEnd(e) {
  if (fabDrag && e.pointerId === fabDrag.pointerId) {
    if (fabDrag.moved) {
      fabDragSuppress = true;
      setTimeout(() => { fabDragSuppress = false; }, 200);
    }
    fabDrag = null;
  }
}

let currentReportFile = '';

function openReportEditor(report) {
  if (!report || !report.file) return;
  currentReportFile = report.file;
  $('#report-title').textContent = `修改${report.name || '报告'} · ${report.title || ''}`;
  $('#report-edit').value = report.content || '';
  $('#report-dialog').showModal();
}

async function saveReportEdit() {
  if (!currentReportFile) {
    toast('没有可保存的报告', true);
    return;
  }
  try {
    await api('/api/save', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: currentReportFile, content: $('#report-edit').value })
    });
    toast('报告修改已保存：' + currentReportFile);
    $('#report-dialog').close();
  } catch (err) {
    toast(err.message, true);
  }
}

async function sendHomeChat(text) {
  const msg = String(text || '').trim();
  if (!msg) return;
  const log = $('#assistant-history');
  const input = $('#home-chat-input');
  const addMsg = (who, body, cls = '') => {
    const div = document.createElement('div');
    div.className = 'chat-msg ' + who + ' ' + cls;
    const pre = document.createElement('pre');
    pre.textContent = body;
    div.appendChild(pre);
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  };
  addMsg('user', msg);
  input.value = '';
  addMsg('ai', '正在处理指令…', 'pending');
  try {
    const r = await api('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: msg })
    });
    log.querySelector('.chat-msg.ai.pending')?.remove();
    if (Array.isArray(r.history) && r.history.length) {
      renderAssistantHistory(r.history);
    } else {
      addMsg('ai', typeof r.reply === 'string' ? r.reply : JSON.stringify(r.reply, null, 2));
    }
    if (r.report && r.report.file) {
      toast(`报告已生成：${r.report.file}`);
      openReportEditor(r.report);
    }
    if (['run_all', 'item_made', 'composite_video', 'composite', 'summary'].includes(r.action)) {
      setTimeout(() => refresh().catch(() => {}), 800);
    }
  } catch (err) {
    log.querySelector('.chat-msg.ai.pending')?.remove();
    addMsg('ai', '执行失败：' + err.message);
  }
}

function ensureCoverPrompt() {
  if ($('#image-prompt').value.trim()) return;
  const item = currentSelectedItem();
  const comic = COMIC_CATS.includes(item.category || '');
  const body = (item.content || item.fullText || item.summary || '').slice(0, 100);
  const fmt = $('#cover-format').value || '1080x1920';
  const [w, h] = String(fmt).split('x');
  const orient = Number(w) >= Number(h) ? '横版 16:9' : '竖版 9:16';
  $('#image-prompt').value = `请生成一张${comic ? '手绘漫画风格' : '黑色科技风'}封面，主题：${item.title || '新媒体热点速递'}。要点：${body || '清晰信息层级、霓虹青色点缀、适合作为视频封面'}${comic ? '，夸张表情、网点、粗线条、气泡文字' : ''}。${orient}。`;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handleCoverUpload(file) {
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) {
    toast('图片超过 8MB，请压缩后上传', true);
    return;
  }
  try {
    const dataUrl = await fileToDataUrl(file);
    const r = await api('/api/upload-image', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: file.name, dataUrl })
    });
    $('#preview-title').textContent = '本地上传图片';
    $('#preview-body').innerHTML = `<img src="/api/file?path=${encodeURIComponent(r.file)}" style="max-width:100%;max-height:70vh" />`;
    $('#btn-download').hidden = false;
    $('#btn-export-png').hidden = true;
    currentDownload = r.file;
    $('#preview-dialog').showModal();
    toast('本地上传成功，可继续用 AI 生成或直接作为封面');
  } catch (err) {
    toast(err.message, true);
  }
}

async function uploadAsset(kind, file) {
  const dataUrl = await fileToDataUrl(file);
  return api('/api/upload-asset', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kind, name: file.name, dataUrl })
  });
}

let pendingLocalFiles = [];
let uploadedVideoFiles = [];

function openLocalDialog() {
  pendingLocalFiles = [];
  $('#local-progress').textContent = '尚未选择文件';
  loadLocalSessions();
  toggleHomePanel('local');
}

function pickLocalFiles(useFolder) {
  const input = useFolder ? $('#local-folder') : $('#local-files');
  input.value = '';
  input.click();
}

function onLocalFilesChosen(useFolder) {
  const input = useFolder ? $('#local-folder') : $('#local-files');
  pendingLocalFiles = Array.from(input.files || []).map((f) => ({
    file: f,
    relPath: useFolder ? (f.webkitRelativePath || f.name) : f.name
  }));
  const size = pendingLocalFiles.reduce((n, x) => n + x.file.size, 0);
  $('#local-progress').textContent = `已选择 ${pendingLocalFiles.length} 个文件，共 ${(size / 1024 / 1024).toFixed(1)} MB（单文件超 20MB 会跳过）`;
}

async function startLocalMake() {
  if (!pendingLocalFiles.length) {
    toast('请先选择文件或文件夹', true);
    return;
  }
  const session = 'm' + Date.now();
  const title = $('#local-title').value.trim() || `本地素材·${session}`;
  const btn = $('#btn-local-start');
  btn.disabled = true;
  btn.textContent = '上传中…';
  const files = [];
  let skipped = 0;
  for (const f of pendingLocalFiles) {
    if (f.file.size > 20 * 1024 * 1024) {
      skipped++;
      continue;
    }
    try {
      files.push({ name: f.file.name, relPath: f.relPath, dataUrl: await fileToDataUrl(f.file) });
    } catch {}
  }
  try {
    await api('/api/materials/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session, files })
    });
    btn.textContent = '正在生成视频/图文…';
    const r = await api('/api/materials/make', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session, title })
    });
    toast(`${r.ok ? '本地素材已开始制作' : '失败'}${skipped ? '（跳过 ' + skipped + ' 个大文件）' : ''}`);
    await refresh();
    switchView('produce');
  } catch (err) {
    toast(err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = '上传并开始制作';
  }
}

async function loadLocalSessions() {
  try {
    const r = await api('/api/materials/list');
    const box = $('#local-sessions');
    if (!box) return;
    box.innerHTML = '';
    if (!r.sessions || !r.sessions.length) {
      box.innerHTML = '<div class="empty-note">暂无历史本地素材批次</div>';
      return;
    }
    r.sessions.slice(0, 5).forEach((s) => {
      const div = document.createElement('div');
      div.className = 'classify-row';
      div.innerHTML = `<span class="title">${esc(s.session)}（${s.files.length} 个文件）</span><button class="btn ghost">用此素材制作</button>`;
      div.querySelector('button').addEventListener('click', async () => {
        try {
          await api('/api/materials/make', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ session: s.session, title: $('#local-title').value.trim() || `本地素材·${s.session}` })
          });
          await refresh();
          switchView('produce');
        } catch (err) {
          toast(err.message, true);
        }
      });
      box.appendChild(div);
    });
  } catch {}
}

/* 图文排版：蒸馏自 aws-wechat-article-formatting */
const THEMES = {
  default: { accent: '#0969da', bg: '#ffffff', text: '#1f2328' },
  grace: { accent: '#8b5cf6', bg: '#ffffff', text: '#2d2a3a' },
  modern: { accent: '#ea580c', bg: '#ffffff', text: '#27221e' },
  simple: { accent: '#111111', bg: '#ffffff', text: '#222222' },
  'traework-culture': { accent: '#9a6b3f', bg: '#fffdf8', text: '#3f352c' },
  'traework-finance': { accent: '#0f4c81', bg: '#ffffff', text: '#1f2937' },
  'traework-news': { accent: '#8c2f39', bg: '#ffffff', text: '#111827' },
  'traework-pop': { accent: '#b45309', bg: '#fffaf5', text: '#33241a' }
};

function traeworkThemeForCategory(category) {
  if (['财经'].includes(category)) return 'traework-finance';
  if (['时政', '国内', '国际'].includes(category)) return 'traework-news';
  if (['娱乐', '八卦', '搞笑', '游戏'].includes(category)) return 'traework-pop';
  return 'traework-culture';
}

function mdToHtml(md, themeName) {
  const theme = THEMES[themeName] || THEMES.default;
  const lines = String(md || '').split('\n');
  const out = [];
  let inQuote = false;
  let listType = null;
  const closeList = () => { if (listType) { out.push(`</${listType}>`); listType = null; } };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { closeList(); if (inQuote) { out.push('</blockquote>'); inQuote = false; } out.push(''); continue; }
    const escLine = esc(line.replace(/^#{1,6}\s*/, (m) => m).trim());
    if (line.startsWith('# ')) { closeList(); out.push(`<h1 style="font-size:22px;line-height:1.5;margin:0 0 12px;color:${theme.text}">${esc(line.slice(2).trim())}</h1>`); continue; }
    if (line.startsWith('## ')) { closeList(); out.push(`<h2 style="font-size:18px;line-height:1.5;margin:16px 0 10px;padding-left:10px;border-left:4px solid ${theme.accent};color:${theme.text}">${esc(line.slice(3).trim())}</h2>`); continue; }
    if (line.startsWith('> ')) { if (!inQuote) { out.push(`<blockquote style="margin:12px 0;padding:10px 14px;background:#f6f8fa;border-left:4px solid ${theme.accent};color:#444;font-size:14px;line-height:1.8">`); inQuote = true; } out.push(esc(line.slice(2).trim())); continue; }
    if (/^[-*] /.test(line)) { if (listType !== 'ul') { closeList(); out.push('<ul style="margin:10px 0;padding-left:22px">'); listType = 'ul'; } out.push(`<li style="margin:4px 0;line-height:1.8">${esc(line.replace(/^[-*] /, ''))}</li>`); continue; }
    if (/^\d+\. /.test(line)) { if (listType !== 'ol') { closeList(); out.push('<ol style="margin:10px 0;padding-left:22px">'); listType = 'ol'; } out.push(`<li style="margin:4px 0;line-height:1.8">${esc(line.replace(/^\d+\. /, ''))}</li>`); continue; }
    closeList();
    if (inQuote) { out.push('</blockquote>'); inQuote = false; }
    const img = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
    if (img) {
      out.push(`<p style="margin:0 0 12px;text-align:center"><img src="${esc(img[2])}" alt="${esc(img[1])}" style="max-width:100%;border-radius:10px;box-shadow:0 2px 12px rgba(0,0,0,.08)" /></p>`);
      continue;
    }
    out.push(`<p style="margin:0 0 12px;font-size:15px;line-height:1.9;color:${theme.text}">${escLine}</p>`);
  }
  closeList();
  if (inQuote) out.push('</blockquote>');
  return `<section style="background:${theme.bg};color:${theme.text};padding:22px 24px;max-width:640px;margin:0 auto;font-family:'Microsoft YaHei','PingFang SC',sans-serif">${out.join('\n')}</section>`;
}

function articleFromItem(it) {
  return `# ${it.title || ''}

${it.category || ''}｜传播性 ${it.spread || '中'}｜评分 ${it.spreadScore ?? it.score ?? '--'}/100｜来源 ${it.source || '公开信息'}

${it.content || it.fullText || it.summary || it.title || ''}

> 数据来源：${it.source || '公开信息'}${it.link ? ` ${it.link}` : ''}`;
}

function renderArticlePreview() {
  const md = $('#article-md').value || '';
  const chosen = $('#article-theme').value || 'traework';
  const item = selectedArticleItem();
  const themeName = chosen === 'traework' ? traeworkThemeForCategory(item.category || '') : chosen;
  const html = mdToHtml(md, themeName);
  const box = $('#article-preview-box');
  box.innerHTML = html;
  box._html = html;
}

function selectedArticleItem() {
  const title = $('#article-select').value;
  return flatItems.find((x) => x.title === title)
    || (summaryData && summaryData.items || []).find((x) => x.title === title)
    || (classifyHistory && classifyHistory.runs.flatMap((r) => r.items || []).find((x) => x.title === title))
    || { title, category: '', source: '', link: '' };
}

async function smartArticleLayout() {
  const item = selectedArticleItem();
  const md = $('#article-md').value || articleFromItem(item);
  let images = [];
  if (item.link) {
    try {
      images = (await api('/api/item-images?url=' + encodeURIComponent(item.link))).images || [];
    } catch {}
  }
  const theme = THEMES[traeworkThemeForCategory(item.category || '')] || THEMES.default;
  let coverHtml = '';
  if (images.length) {
    coverHtml = `<img src="${esc(images[0])}" alt="" style="width:100%;max-height:340px;object-fit:cover;border-radius:10px;margin-bottom:14px" />`;
  } else if (['时政', '国内'].includes(item.category || '')) {
    coverHtml = '<div style="background:#f1f3f5;color:#888;border-radius:10px;padding:26px;text-align:center;margin-bottom:14px">原文未提供可用图片，本图文不配图</div>';
  } else {
    try {
      const comic = COMIC_CATS.includes(item.category || '');
      const cv = await api('/api/make-cover', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: item.title || '图文封面', width: 1200, height: 630, style: comic ? 'comic' : '' })
      });
      coverHtml = cv.svg;
    } catch {}
  }
  const paragraphs = md
    .split(/\n+/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('# ') && !s.startsWith('> '))
    .slice(0, 12)
    .map((s) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.9;color:${theme.text}">${esc(s)}</p>`)
    .join('');
  const gallery = images.slice(1, 4).length
    ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin:14px 0">${images.slice(1, 4).map((u) => `<img src="${esc(u)}" alt="" style="width:32%;border-radius:8px;object-fit:cover" />`).join('')}</div>`
    : '';
  const html = `<section style="background:#fff;color:${theme.text};padding:24px;max-width:680px;margin:0 auto;font-family:'Microsoft YaHei','PingFang SC',sans-serif">
    <h1 style="font-size:24px;line-height:1.5;margin:0 0 8px">${esc(item.title || '')}</h1>
    <div style="font-size:12px;color:#888;border-bottom:1px solid #eee;padding-bottom:12px;margin-bottom:14px">${esc(item.category || '')} · ${esc(item.source || '公开信息')}${item.link ? ` · <a href="${esc(item.link)}">原文链接</a>` : ''}</div>
    ${coverHtml}
    ${paragraphs}
    ${gallery}
    <blockquote style="margin:16px 0 0;padding:12px 14px;background:#f6f8fa;border-left:4px solid ${theme.accent};color:#444;font-size:13px">数据来源：${esc(item.source || '公开信息')}</blockquote>
  </section>`;
  const box = $('#article-preview-box');
  box.innerHTML = html;
  box._html = html;
  toast(images.length ? `已引用原文图片 ${images.length} 张` : (['时政', '国内'].includes(item.category) ? '原文无图，不配图' : (COMIC_CATS.includes(item.category) ? '原文无图，已生成手绘漫画封面' : '原文无图，已生成基础封面')));
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('已复制');
  } catch {
    toast('复制失败，请手动选择复制', true);
  }
}

/* 分发文案 */
function platformCopyForItem(it) {
  const niche = (config.workflow.niche || '热点').replace(/[\/\s]/g, '');
  const title = it.title || '热点快报';
  const summary = (it.content || it.fullText || it.summary || '').slice(0, 60);
  const risk = '市场有风险，投资需谨慎，以上信息仅供参考。';
  return {
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
}

function loadAccounts() {
  try {
    const all = JSON.parse(localStorage.getItem('neo_dist_accounts_v2')) || {};
    PLATFORMS.forEach((p) => {
      if (!Array.isArray(all[p]) || !all[p].length) {
        all[p] = [
          { id: p + '_default_1', platform: p, category: '综合', nickname: p + '默认1', account: '', avatar: '', remark: '默认账号位', auth: {} },
          { id: p + '_default_2', platform: p, category: '综合', nickname: p + '默认2', account: '', avatar: '', remark: '默认账号位', auth: {} }
        ];
      }
    });
    return all;
  } catch {
    return {};
  }
}

function saveAccounts(accounts) {
  localStorage.setItem('neo_dist_accounts_v2', JSON.stringify(accounts));
}

function accountsFor(platform) {
  return loadAccounts()[platform] || [];
}

function avatarHtml(acct) {
  const letter = (acct.nickname || acct.platform || '号').slice(0, 1);
  return acct.avatar
    ? `<img class="acct-avatar" src="${esc(acct.avatar)}" alt="" referrerpolicy="no-referrer" />`
    : `<span class="acct-avatar acct-avatar-letter">${esc(letter)}</span>`;
}

let flowNodeDrag = null;
let pendingConnect = null;

function flowStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || {};
  } catch {
    return {};
  }
}

function safeEntries(obj) {
  return obj && typeof obj === 'object' && !Array.isArray(obj) ? Object.entries(obj) : [];
}

function saveFlowStorage(key, obj) {
  localStorage.setItem(key, JSON.stringify(obj));
}

function connectFlow(title, platform, mode, category = '综合') {
  if (!title || !platform) return false;
  const all = flowStorage('neo_flow_links');
  all[title] = all[title] || {};
  all[title][platform] = all[title][platform] || {};
  all[title][platform][category] = all[title][platform][category] || {};
  all[title][platform][category][mode] = true;
  saveFlowStorage('neo_flow_links', all);
  return true;
}

function connectFlowSmart(title, platform, mode, category = '综合') {
  connectFlow(title, platform, mode, category);
  const def = PLATFORM_TYPE_DEFAULT[platform];
  if (mode === '视频' && def === '视频') connectFlow(title, platform, '封面', category);
  if (mode === '图文' && def === '图文') connectFlow(title, platform, '封面', category);
  const synced = JSON.parse(localStorage.getItem('neo_publish_sync') || '{}');
  synced[title] = new Date().toISOString();
  localStorage.setItem('neo_publish_sync', JSON.stringify(synced));
}

const FLOW_MODE_COLORS = {
  视频: '#0ea5e9',
  图文: '#f97316',
  封面: '#a855f7',
  分发语: '#10b981'
};

const FLOW_CATS = ['综合', '财经', '娱乐', '八卦', '游戏', '搞笑', '国际', '国内'];

function renderDistributionFlow() {
  const canvas = $('#flow-canvas');
  if (!canvas) return;
  const flowTime = $('#flow-time');
  if (flowTime && !flowTime.value && localStorage.getItem('neo_flow_time')) {
    flowTime.value = localStorage.getItem('neo_flow_time');
  }
  const linksRaw = flowStorage('neo_flow_links');
  const links = linksRaw && typeof linksRaw === 'object' && !Array.isArray(linksRaw) ? linksRaw : {};
  const pos = flowStorage('neo_flow_pos');
  const catState = flowStorage('neo_flow_cat');
  let publishedTitles = [];
  let publishedMap = {};
  try {
    publishedMap = JSON.parse(localStorage.getItem('neo_flow_published') || '{}');
    publishedTitles = Object.keys(publishedMap);
  } catch {}
  const pubEl = $('#flow-published-list');
  if (pubEl) pubEl.textContent = publishedTitles.length ? `今日已发布：${publishedTitles.slice(0, 6).join('、')}` : '';
  const statusFilter = ($('#flow-status-filter') && $('#flow-status-filter').value) || 'all';
  let items = (flatItems || []).filter((it) => !publishedTitles.includes(it.title)).slice(0, 20);
  if (statusFilter === 'sent') items = (flatItems || []).filter((it) => publishedTitles.includes(it.title)).slice(0, 20);
  if (statusFilter === 'unsent') items = (flatItems || []).filter((it) => !publishedTitles.includes(it.title)).slice(0, 20);
  items = items.slice(0, 5);
  const selectedTitle = localStorage.getItem('neo_flow_selected') || '';
  const cw = Math.max(520, canvas.clientWidth - 40);
  const cx = 20;
  const px = Math.max(560, cw - 210);
  canvas.querySelectorAll('.flow-node').forEach((n) => n.remove());
  items.forEach((it, i) => {
    const key = 'c:' + it.title;
    const saved = pos[key];
    const node = document.createElement('div');
    node.className = 'flow-node content-node';
    node.dataset.key = key;
    node.dataset.title = it.title;
    node.dataset.category = it.category || '';
    node.style.left = (saved ? saved.x : cx) + 'px';
    node.style.top = (saved ? saved.y : 24 + i * 84) + 'px';
    if (it.title === selectedTitle) node.classList.add('flow-selected');
    node.innerHTML = `<strong>${esc(it.title)}</strong>
      <span class="flow-comps">
        ${['视频', '图文', '封面', '分发语'].map((c) => `<span class="flow-comp" data-comp="${c}"><i class="flow-port" data-comp="${c}"></i>${c}</span>`).join('')}
      </span>
      <span class="hint">${esc(it.category || '')} · ${it.spreadScore ?? ''}/100</span>
      <span class="flow-link-count">${Object.keys(links[it.title] || {}).length || 0} 平台</span>`;
    canvas.appendChild(node);
  });
  PLATFORMS.forEach((p, i) => {
    const key = 'p:' + p;
    const saved = pos[key];
    const node = document.createElement('div');
    node.className = 'flow-node platform-node';
    node.dataset.key = key;
    node.dataset.platform = p;
    node.style.left = (saved ? saved.x : px) + 'px';
    node.style.top = (saved ? saved.y : 16 + i * 72) + 'px';
    const platformLinks = Object.values(links || {}).filter((v) => v && v[p]).length;
    node.innerHTML = `<strong>${esc(p)}</strong>
      <span class="platform-comps">
        ${FLOW_CATS.map((c) => `<span class="platform-comp" data-platform="${esc(p)}" data-cat="${c}"><i class="platform-port" data-platform="${esc(p)}" data-cat="${c}"></i>${c}</span>`).join('')}
      </span>
      <span class="hint">已连接 ${platformLinks} 条内容</span>`;
    canvas.appendChild(node);
  });
  const linksSvg = $('#flow-lines');
  linksSvg.setAttribute('width', canvas.clientWidth);
  linksSvg.setAttribute('height', canvas.clientHeight);
  linksSvg.innerHTML = '';
  const r = canvas.getBoundingClientRect();
  const lines = [];
  for (const [title, platforms] of safeEntries(links)) {
    const c = canvas.querySelector(`.content-node[data-title="${CSS.escape(title)}"]`);
    if (!c) continue;
    for (const [pl, cats] of safeEntries(platforms)) {
      for (const [cat, modes] of safeEntries(cats)) {
        for (const mode of Object.keys(modes && typeof modes === 'object' ? modes : {})) {
          const cp = c.querySelector(`.flow-port[data-comp="${CSS.escape(mode)}"]`);
          const pp = canvas.querySelector(`.platform-port[data-platform="${CSS.escape(pl)}"][data-cat="${CSS.escape(cat)}"]`);
          if (!cp || !pp) continue;
          const cr = cp.getBoundingClientRect();
          const pr = pp.getBoundingClientRect();
          const color = FLOW_MODE_COLORS[mode] || '#f97316';
          const x1 = cr.left + cr.width / 2 - r.left;
          const y1 = cr.top + cr.height / 2 - r.top;
          const x2 = pr.left + pr.width / 2 - r.left;
          const y2 = pr.top + pr.height / 2 - r.top;
          const dx = Math.max(50, Math.abs(x2 - x1) * 0.42);
          lines.push(`<path class="flow-line" data-title="${esc(title)}" data-platform="${esc(pl)}" data-cat="${esc(cat)}" data-mode="${esc(mode)}" d="M ${x1} ${y1} C ${x1 + (x2 > x1 ? dx : -dx)} ${y1}, ${x2 - (x2 > x1 ? dx : -dx)} ${y2}, ${x2} ${y2}" stroke="${color}" />`);
        }
      }
    }
  }
  linksSvg.innerHTML = lines.join('');
  selectedFlowLine = null;
  const delBtn = $('#btn-flow-del-line');
  if (delBtn) delBtn.hidden = true;
  linksSvg.querySelectorAll('.flow-line').forEach((path) => {
    path.addEventListener('click', (e) => {
      e.stopPropagation();
      linksSvg.querySelectorAll('.flow-line.selected').forEach((p) => p.classList.remove('selected'));
      path.classList.add('selected');
      selectedFlowLine = { title: path.dataset.title, platform: path.dataset.platform, cat: path.dataset.cat, mode: path.dataset.mode };
      if (delBtn) delBtn.hidden = false;
    });
  });
  canvas.querySelectorAll('.content-node').forEach((n) => {
    n.addEventListener('click', (e) => {
      if (e.target.closest('.flow-port')) return;
      const it = flatItems.find((x) => x.title === n.dataset.title);
      openWorkbenchReview(it || { title: n.dataset.title, category: '', score: '' });
    });
  });
  canvas.querySelectorAll('.flow-port').forEach((p) => {
    p.addEventListener('pointerdown', startFlowPortDrag);
    p.addEventListener('click', (e) => {
      e.stopPropagation();
      if (portSuppressClick) { portSuppressClick = false; return; }
      const cnode = p.closest('.content-node');
      if (!cnode) return;
      const mode = p.dataset.comp;
      if (pendingPortLink && pendingPortLink.title === cnode.dataset.title && pendingPortLink.mode === mode) {
        pendingPortLink = null;
        toast('已取消端口选择');
      } else {
        pendingPortLink = { title: cnode.dataset.title, mode };
        toast(`已选中：${mode}，请点击平台分类端口`);
      }
      canvas.querySelectorAll('.content-node').forEach((c) => c.classList.toggle('connecting', pendingPortLink && c.dataset.title === pendingPortLink.title));
    });
  });
  canvas.querySelectorAll('.platform-port').forEach((pp) => {
    pp.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
    });
    pp.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!pendingPortLink) return;
      connectFlowSmart(pendingPortLink.title, pp.dataset.platform, pendingPortLink.mode, pp.dataset.cat);
      toast(`已连接：${pendingPortLink.mode} → ${pp.dataset.platform}·${pp.dataset.cat}`);
      pendingPortLink = null;
      renderDistributionFlow();
    });
  });
  canvas.querySelectorAll('.flow-node').forEach((n) => {
    n.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.flow-port,.platform-port,select,button')) return;
      const rect = n.getBoundingClientRect();
      flowNodeDrag = { key: n.dataset.key, dx: e.clientX - rect.left, dy: e.clientY - rect.top, pid: e.pointerId };
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {}
    });
  });
  bindFlowCanvasOnce(canvas);
}

let portDrag = null;
let pendingPortLink = null;
let portSuppressClick = false;
let selectedFlowLine = null;

function bindFlowCanvasOnce(canvas) {
  if (!canvas || canvas.dataset.bound) return;
  canvas.dataset.bound = '1';
  canvas.addEventListener('pointermove', (e) => {
    const cr = canvas.getBoundingClientRect();
    if (portDrag && e.pointerId === portDrag.pid) {
      if (Math.hypot(e.clientX - portDrag.x0, e.clientY - portDrag.y0) > 4) portDrag.moved = true;
      const temp = canvas.querySelector('#flow-temp-line');
      if (temp) {
        temp.setAttribute('x2', e.clientX - cr.left);
        temp.setAttribute('y2', e.clientY - cr.top);
      }
      return;
    }
    if (!flowNodeDrag || e.pointerId !== flowNodeDrag.pid) return;
    const node = canvas.querySelector(`[data-key="${CSS.escape(flowNodeDrag.key)}"]`);
    if (!node) return;
    const x = Math.min(cr.width - 80, Math.max(0, e.clientX - cr.left - flowNodeDrag.dx));
    const y = Math.min(cr.height - 60, Math.max(0, e.clientY - cr.top - flowNodeDrag.dy));
    node.style.left = x + 'px';
    node.style.top = y + 'px';
    const posAll = flowStorage('neo_flow_pos');
    posAll[flowNodeDrag.key] = { x, y };
    saveFlowStorage('neo_flow_pos', posAll);
  });
  canvas.addEventListener('pointerup', (e) => {
    if (portDrag && e.pointerId === portDrag.pid) {
      if (!portDrag.moved) {
        canvas.querySelector('#flow-temp-line')?.remove();
        portDrag = null;
        return;
      }
      const cr = canvas.getBoundingClientRect();
      const portEls = [...canvas.querySelectorAll('.platform-port')];
      let nearest = null;
      let best = 48;
      for (const pe of portEls) {
        const pr = pe.getBoundingClientRect();
        const d = Math.hypot(pr.left + pr.width / 2 - e.clientX, pr.top + pr.height / 2 - e.clientY);
        if (d < best) { best = d; nearest = pe; }
      }
      const target = nearest ? null : document.elementFromPoint(e.clientX, e.clientY);
      const platformPort = nearest || (target && target.closest ? target.closest('.platform-port') : null);
      const platformNode = (nearest || target) && (nearest ? nearest.closest('.platform-node') : (target && target.closest ? target.closest('.platform-node') : null));
      if (platformNode) {
        const platform = platformPort ? platformPort.dataset.platform : platformNode.dataset.platform;
        const category = platformPort ? platformPort.dataset.cat : '综合';
        connectFlowSmart(portDrag.title, platform, portDrag.mode, category);
        toast(`已连线：${portDrag.mode} → ${platform}·${category}`);
      }
      canvas.querySelector('#flow-temp-line')?.remove();
      portDrag = null;
      portSuppressClick = true;
      setTimeout(() => { portSuppressClick = false; }, 250);
      renderDistributionFlow();
      return;
    }
    if (flowNodeDrag) {
      flowNodeDrag = null;
      renderDistributionFlow();
    }
  });
  canvas.addEventListener('pointercancel', () => {
    canvas.querySelector('#flow-temp-line')?.remove();
    portDrag = null;
    flowNodeDrag = null;
  });
}

function startFlowPortDrag(e) {
  const cnode = e.target.closest('.content-node');
  const canvas = $('#flow-canvas');
  if (!cnode || !canvas) return;
  const cr = canvas.getBoundingClientRect();
  const rect = cnode.getBoundingClientRect();
  const svg = $('#flow-lines');
  const port = e.target.closest('.flow-port');
  const portRect = port ? port.getBoundingClientRect() : rect;
  const temp = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  temp.id = 'flow-temp-line';
  temp.setAttribute('x1', portRect.left + portRect.width / 2 - cr.left);
  temp.setAttribute('y1', portRect.top + portRect.height / 2 - cr.top);
  temp.setAttribute('x2', e.clientX - cr.left);
  temp.setAttribute('y2', e.clientY - cr.top);
  const mode = port ? port.dataset.comp : '视频';
  temp.setAttribute('stroke', FLOW_MODE_COLORS[mode] || '#f97316');
  svg.appendChild(temp);
  portDrag = { title: cnode.dataset.title, mode: port ? port.dataset.comp : '视频', pid: e.pointerId, moved: false, x0: e.clientX, y0: e.clientY };
  try {
    canvas.setPointerCapture(e.pointerId);
  } catch {}
}

let wbReviewItem = null;
let wbReviewTab = 'video';
let reviewDate = '';
let reviewStatusFilter = 'all';

function openWorkbenchReview(item) {
  if (!item) return;
  wbReviewItem = item;
  auditData = fallbackReviewPayload(item);
  $('#wb-review-title').textContent = `内容审核 · ${item.title}`;
  $('#workbench-review-dialog').showModal();
  renderWbReview();
}

function renderWbReview() {
  const tabs = document.querySelectorAll('#workbench-review-dialog [data-wb-tab]');
  tabs.forEach((b) => b.classList.toggle('active', b.dataset.wbTab === wbReviewTab));
  const body = $('#wb-review-preview');
  if (!body) return;
  const a = auditData || {};
  if (wbReviewTab === 'article') {
    body.innerHTML = `<div class="article-preview">${a.article && a.article.markdown ? mdToHtml(a.article.markdown, 'default') : '<p>暂无图文</p>'}</div>`;
  } else if (wbReviewTab === 'cover') {
    body.innerHTML = a.cover && a.cover.svg ? `<div class="poster-wrap">${a.cover.svg}</div>` : '<div class="view-note">封面待生成</div>';
  } else {
    const v = a.video || {};
    body.innerHTML = v.mp4
      ? `<video controls style="width:100%;max-height:62vh;border-radius:12px" src="/api/file?path=${encodeURIComponent(v.mp4)}"></video>`
      : '<div class="view-note">视频文件尚未渲染完成，成片生成后可直接播放审核。</div>';
  }
}

function approveWbReview() {
  if (!wbReviewItem) return;
  const approved = JSON.parse(localStorage.getItem('neo_review_approved') || '{}');
  approved[wbReviewItem.title] = new Date().toISOString();
  localStorage.setItem('neo_review_approved', JSON.stringify(approved));
  localStorage.setItem('neo_flow_selected', wbReviewItem.title);
  $('#workbench-review-dialog').close();
  renderReviewModule();
  toast(`「${wbReviewItem.title}」已通过并同步到分发平台`);
}

function openReviewPicker() {
  const list = $('#review-picker-list');
  if (!list) return;
  const items = (flatItems || []).slice(0, 20);
  list.innerHTML = items.length
    ? items.map((it) => `<div class="review-picker-item" data-title="${esc(it.title)}">
        <span class="review-title">${esc(it.title)}</span>
        <span class="hint">${esc(it.category || '')} · ${it.spreadScore ?? '--'}/100</span>
        <button class="btn primary review-picker-go"><i class="icon-mes ruzhishenhe"></i>审核</button>
      </div>`).join('')
    : '<div class="empty-note">暂无待审核内容</div>';
  list.querySelectorAll('.review-picker-go').forEach((b) => b.addEventListener('click', () => {
    const title = b.closest('.review-picker-item').dataset.title;
    const it = flatItems.find((x) => x.title === title);
    $('#review-picker-dialog').close();
    openWorkbenchReview(it || { title, category: '', score: '' });
  }));
  $('#review-picker-dialog').showModal();
}

async function renderReviewModule() {
  const list = $('#review-workbench');
  if (!list) return;
  let items = (flatItems || []).slice(0, 30);
  if (reviewDate) {
    const date = String(reviewDate).replace(/-/g, '');
    try {
      const r = await api('/api/classify-history?limit=300&date=' + date);
      const seen = new Set();
      items = [];
      ((r && r.runs) || []).forEach((run) => (run.items || []).forEach((it) => {
        const k = String(it.title || '').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
        if (k && !seen.has(k)) {
          seen.add(k);
          items.push(it);
        }
      }));
      items = items.slice(0, 30);
    } catch {}
  }
  let approved = {};
  try {
    approved = JSON.parse(localStorage.getItem('neo_review_approved') || '{}');
  } catch {}
  if (reviewStatusFilter === 'pending') items = items.filter((it) => !approved[it.title]);
  if (reviewStatusFilter === 'done') items = items.filter((it) => !!approved[it.title]);
  list.innerHTML = items.length
    ? items.map((it) => {
        const done = !!approved[it.title];
        return `<div class="review-wb-row ${done ? 'done' : ''}" data-title="${esc(it.title)}">
          <span class="review-row-title">${esc(it.title)}</span>
          <span class="batch-tag ${done ? 'new' : 'old'}">${done ? '已通过' : '待审核'}</span>
          <button class="btn primary review-wb-open"><i class="icon-mes ruzhishenhe"></i>审核</button>
        </div>`;
      }).join('')
    : '<div class="empty-note">当前筛选下暂无内容</div>';
  list.querySelectorAll('.review-wb-row').forEach((card) => {
    const title = card.dataset.title;
    const it = flatItems.find((x) => x.title === title);
    card.querySelector('.review-wb-open').addEventListener('click', () => {
      wbReviewTab = 'video';
      openWorkbenchReview(it || { title, category: '', score: '' });
    });
  });
}

function loadPickStore() {
  try {
    return JSON.parse(localStorage.getItem('neo_pick_by_item')) || {};
  } catch {
    return {};
  }
}

function savePickStore(store) {
  localStorage.setItem('neo_pick_by_item', JSON.stringify(store));
}

function picksForItem(title, platform, accts, itemCategory) {
  const store = loadPickStore();
  store[title] = store[title] || {};
  let entry = store[title][platform];
  if (!entry || entry.init !== true) {
    const old = entry && typeof entry === 'object' && !entry.picks ? entry : {};
    const picks = {};
    accts.forEach((a) => {
      picks[a.id] = old[a.id] !== undefined ? !!old[a.id] : (a.category === '综合' || a.category === itemCategory);
    });
    if (!accts.some((a) => picks[a.id])) accts.forEach((a) => { picks[a.id] = true; });
    entry = { init: true, picks, type: PLATFORM_TYPE_DEFAULT[platform] || '视频' };
    store[title][platform] = entry;
    savePickStore(store);
  }
  return entry;
}

function renderDistributeViewLegacy() {
  const title = $('#dist-select').value;
  const item = flatItems.find((x) => x.title === title) || (summaryData.items || []).find((x) => x.title === title);
  const grid = $('#dist-grid');
  grid.innerHTML = '';
  if (!item) {
    grid.innerHTML = '<div class="empty-note">请先在“汇总信息”中生成内容，或运行全流程</div>';
    return;
  }
  for (const platform of PLATFORMS) {
    const card = document.createElement('div');
    card.className = 'dist-card';
    const accts = accountsFor(platform);
    const picks = picksForItem(title, platform, accts, item.category || '国内');
    const typeDefault = picks.type || PLATFORM_TYPE_DEFAULT[platform] || '视频';
    const content = typeDefault === '图文' ? articleFromItem(item) : defaultScriptForItem(item);
    card.innerHTML = `<h3><span>${platform}</span><span class="count">账号 ${accts.length}/2000</span>
        <label class="type-label">默认发布
          <select class="type-select" data-platform="${platform}">
            <option value="图文" ${typeDefault === '图文' ? 'selected' : ''}>图文</option>
            <option value="视频" ${typeDefault === '视频' ? 'selected' : ''}>视频</option>
          </select>
        </label>
      </h3>
      <p class="dist-cat">本条分类：${esc(item.category || '国内')}｜默认已勾选：${esc(item.category || '综合')}号 + 综合号</p>
      <p class="dist-req">${esc(PLATFORM_REQUIREMENTS[platform] || '需要提供账号与素材')}</p>
      <div class="auth-needed">授权需提供：${esc((PLATFORM_AUTH_FIELDS[platform] || []).join(' · '))}</div>
      <div class="acct-list" data-platform="${platform}"></div>
      <div class="dist-content">
        <div class="dist-content-head">
          <span>${typeDefault === '图文' ? '图文内容（全信息）' : '视频内容（脚本）'}</span>
          <button class="btn ghost edit-content" data-platform="${platform}" data-type="${typeDefault}">修改</button>
        </div>
        <pre>${esc(content)}</pre>
      </div>
      <div class="head-actions">
        <button class="btn ghost add-acct" data-platform="${platform}">＋ 添加该平台账号</button>
      </div>`;
    grid.appendChild(card);
    const list = card.querySelector('.acct-list');
    accts.forEach((acct, idx) => {
      const checked = !!picks.picks[acct.id];
      const label = document.createElement('label');
      label.className = 'acct-item' + (checked ? ' picked' : '');
      label.innerHTML = `
        <input type="checkbox" class="pick-acct" data-platform="${platform}" data-id="${esc(acct.id)}" ${checked ? 'checked' : ''} />
        ${avatarHtml(acct)}
        <span class="acct-info"><strong>${esc(acct.nickname || '未命名')} <em class="acct-cat">[${esc(acct.category || '综合')}]</em></strong><small>${esc(acct.account || '未填账号')}${acct.remark ? ' · ' + esc(acct.remark) : ''}</small></span>
        <button class="btn ghost del-acct" data-platform="${platform}" data-id="${esc(acct.id)}" data-idx="${idx}">删除</button>`;
      list.appendChild(label);
    });
  }
  grid.querySelectorAll('.add-acct').forEach((b) => {
    b.addEventListener('click', () => openAddAccount(b.dataset.platform));
  });
  grid.querySelectorAll('.edit-content').forEach((btn) => {
    btn.addEventListener('click', () => openEditForPlatform(btn.dataset.type, item));
  });
  grid.querySelectorAll('.pick-acct').forEach((cb) => {
    cb.addEventListener('change', () => {
      const store = loadPickStore();
      store[title] = store[title] || {};
      store[title][cb.dataset.platform] = store[title][cb.dataset.platform] || {};
      store[title][cb.dataset.platform].picks = store[title][cb.dataset.platform].picks || {};
      store[title][cb.dataset.platform].picks[cb.dataset.id] = cb.checked;
      savePickStore(store);
      cb.closest('.acct-item').classList.toggle('picked', cb.checked);
    });
  });
  grid.querySelectorAll('.type-select').forEach((sel) => {
    sel.addEventListener('change', () => {
      const store = loadPickStore();
      store[title] = store[title] || {};
      store[title][sel.dataset.platform] = store[title][sel.dataset.platform] || { init: true, picks: {} };
      store[title][sel.dataset.platform].type = sel.value;
      savePickStore(store);
      toast(`${sel.dataset.platform} 本条默认发布类型：${sel.value}`);
      renderDistributeView();
    });
  });
  grid.querySelectorAll('.del-acct').forEach((btn) => {
    btn.addEventListener('click', () => {
      const all = loadAccounts();
      const list = all[btn.dataset.platform] || [];
      if (list.length <= 1) {
        toast('至少保留 1 个账号位', true);
        return;
      }
      all[btn.dataset.platform] = list.filter((a) => a.id !== btn.dataset.id);
      saveAccounts(all);
      renderDistributeView();
    });
  });
}

function openEditFromReview() {
  if (!wbReviewItem) return;
  const title = wbReviewItem.title;
  $('#article-select').value = title;
  if (!Array.from($('#article-select').options).some((o) => o.value === title)) {
    const opt = document.createElement('option');
    opt.value = title;
    opt.textContent = `${title}（${wbReviewItem.spreadScore ?? '--'}/100）`;
    $('#article-select').appendChild(opt);
  }
  $('#article-md').value = articleFromItem(wbReviewItem);
  renderArticlePreview();
  $('#workbench-review-dialog').close();
  switchView('produce');
  showProdPane('article');
  toast('已进入图文修改，改完后可重新生成并审核');
}

function renderDistributeView() {
  loadCustomPlatforms();
  rebuildAcctPlatformOptions();
  const grid = $('#dist-grid');
  if (!grid) return;
  grid.innerHTML = '';
  for (const platform of PLATFORMS) {
    const accts = accountsFor(platform);
    const card = document.createElement('div');
    card.className = 'dist-card';
    card.innerHTML = `<h3><span>${platform}</span><span class="count">账号 ${accts.length}/2000</span>
        <label class="type-label">默认发布
          <select class="type-select" data-platform="${platform}">
            <option value="图文" ${PLATFORM_TYPE_DEFAULT[platform] === '图文' ? 'selected' : ''}>图文</option>
            <option value="视频" ${PLATFORM_TYPE_DEFAULT[platform] === '视频' ? 'selected' : ''}>视频</option>
            <option value="文案+图片">文案+图片</option>
          </select>
        </label>
      </h3>
      <details class="dist-collapse">
        <summary>账号与授权（${accts.length}）</summary>
        <p class="dist-req">${esc(PLATFORM_REQUIREMENTS[platform] || '需要提供账号与素材')}</p>
        <div class="auth-needed">授权需提供：${esc((PLATFORM_AUTH_FIELDS[platform] || []).join(' · '))}</div>
        <div class="acct-list" data-platform="${platform}"></div>
        <div class="head-actions">
          <button class="btn ghost add-acct" data-platform="${platform}">＋ 添加该平台账号</button>
        </div>
      </details>`;
    grid.appendChild(card);
    const list = card.querySelector('.acct-list');
    accts.forEach((acct) => {
      const label = document.createElement('label');
      label.className = 'acct-item picked';
      label.innerHTML = `
        <input type="checkbox" class="pick-acct" checked />
        ${avatarHtml(acct)}
        <span class="acct-info"><strong>${esc(acct.nickname || '未命名')} <em class="acct-cat">[${esc(acct.category || '综合')}]</em></strong><small>${esc(acct.account || '未填账号')}${acct.remark ? ' · ' + esc(acct.remark) : ''}</small></span>
        <button class="btn ghost del-acct" data-platform="${platform}" data-id="${esc(acct.id)}">删除</button>`;
      list.appendChild(label);
    });
  }
  grid.querySelectorAll('.pick-acct').forEach((cb) => {
    cb.addEventListener('change', () => cb.closest('.acct-item').classList.toggle('picked', cb.checked));
  });
  grid.querySelectorAll('.add-acct').forEach((b) => b.addEventListener('click', () => openAddAccount(b.dataset.platform)));
  grid.querySelectorAll('.type-select').forEach((sel) => {
    sel.addEventListener('change', () => toast(`${sel.dataset.platform} 默认发布类型：${sel.value}`));
  });
  grid.querySelectorAll('.del-acct').forEach((btn) => {
    btn.addEventListener('click', () => {
      const all = loadAccounts();
      const list = all[btn.dataset.platform] || [];
      if (list.length <= 1) {
        toast('至少保留 1 个账号位', true);
        return;
      }
      all[btn.dataset.platform] = list.filter((a) => a.id !== btn.dataset.id);
      saveAccounts(all);
      renderDistributeView();
    });
  });
  renderDistributionFlow();
}

function openEditForPlatform(type, item, contentOverride = null) {
  if (!item || !item.title) return;
  editingItemTitle = item.title;
  if (type === '图文') {
    $('#article-select').value = item.title;
    if (!$('#article-select').querySelector(`option[value="${CSS.escape(item.title)}"]`)) {
      const opt = document.createElement('option');
      opt.value = item.title;
      opt.textContent = item.title;
      $('#article-select').appendChild(opt);
    }
    $('#article-md').value = contentOverride || articleFromItem(item);
    switchView('produce');
    showProdPane('article');
    renderArticlePreview();
    toast('图文内容已带入编辑区，修改后可预览/复制');
  } else {
    $('#video-select').value = item.title;
    if (!$('#video-select').querySelector(`option[value="${CSS.escape(item.title)}"]`)) {
      const opt = document.createElement('option');
      opt.value = item.title;
      opt.textContent = item.title;
      $('#video-select').appendChild(opt);
    }
    $('#video-editor').value = contentOverride || defaultScriptForItem(item);
    switchView('produce');
    showProdPane('video');
    toast('视频脚本已带入编辑区；修改后点「下一步」将重新生成视频');
  }
}

  const AUTH_FIELD_DEFS = {
  抖音: [['appKey', 'AppKey'], ['appSecret', 'AppSecret'], ['callback', '回调/扫码授权']],
  小红书: [['appId', 'AppID'], ['appSecret', 'AppSecret'], ['callback', '授权回调地址']],
  微博: [['appKey', 'AppKey'], ['appSecret', 'AppSecret'], ['callback', '授权回调地址']],
  视频号: [['scan', '视频号助手扫码'], ['appId', '公众号 AppID（如需）'], ['confirm', '授权确认']],
  B站: [['appKey', '开放平台 AppKey'], ['appSecret', 'AppSecret'], ['callback', '回调地址']],
  快手: [['appKey', 'AppKey'], ['appSecret', 'AppSecret'], ['callback', '授权回调地址']],
  YouTube: [['clientId', 'Google Client ID'], ['clientSecret', 'Client Secret'], ['refreshToken', 'Refresh Token'], ['channelId', '频道 ID']],
  X: [['apiKey', 'API Key'], ['apiSecret', 'API Secret'], ['accessToken', 'Access Token'], ['accessSecret', 'Access Token Secret']],
  TikTok: [['clientKey', 'Client Key'], ['clientSecret', 'Client Secret'], ['accessToken', 'Access Token'], ['openId', 'TikTok 用户/企业号 ID']],
  Instagram: [['appId', 'App ID'], ['appSecret', 'App Secret'], ['accessToken', 'Access Token'], ['businessId', '商业账号 ID']]
};

function renderAcctAuthFields() {
  const platform = $('#acct-platform').value;
  const box = $('#acct-auth-fields');
  box.innerHTML = (AUTH_FIELD_DEFS[platform] || []).map(([key, label]) => `
    <label>${label}
      <input type="text" data-auth="${key}" placeholder="授权时填写" />
    </label>`).join('');
}

function openAddAccount(platform = null) {
  if (platform) $('#acct-platform').value = platform;
  $('#acct-category').value = '综合';
  $('#acct-nickname').value = '';
  $('#acct-account').value = '';
  $('#acct-avatar').value = '';
  $('#acct-remark').value = '';
  renderAcctAuthFields();
  $('#add-account-dialog').showModal();
}

function rebuildAcctPlatformOptions() {
  const sel = $('#acct-platform');
  if (!sel) return;
  sel.innerHTML = PLATFORMS.map((p) => `<option value="${esc(p)}">${p}</option>`).join('');
}

function openAddPlatform() {
  $('#new-platform-name').value = '';
  $('#new-platform-type').value = '视频';
  $('#add-platform-dialog').showModal();
}

function saveNewPlatform() {
  const name = $('#new-platform-name').value.trim();
  const type = $('#new-platform-type').value;
  if (!name) {
    toast('请输入平台名称', true);
    return;
  }
  if (PLATFORMS.includes(name)) {
    toast('该平台已存在', true);
    return;
  }
  const custom = JSON.parse(localStorage.getItem('neo_custom_platforms') || '[]');
  custom.push({ name, type });
  localStorage.setItem('neo_custom_platforms', JSON.stringify(custom));
  PLATFORMS.push(name);
  PLATFORM_TYPE_DEFAULT[name] = type;
  PLATFORM_REQUIREMENTS[name] = `需要提供：${name} 账号 + 素材；自动发布需 ${name} 开放平台授权`;
  PLATFORM_AUTH_FIELDS[name] = ['账号名', 'AppKey', 'AppSecret', '授权回调地址'];
  AUTH_FIELD_DEFS[name] = [['appKey', 'AppKey'], ['appSecret', 'AppSecret'], ['callback', '授权回调地址']];
  rebuildAcctPlatformOptions();
  $('#add-platform-dialog').close();
  renderDistributeView();
  toast(`已添加平台：${name}`);
}

function loadCustomPlatforms() {
  try {
    const custom = JSON.parse(localStorage.getItem('neo_custom_platforms') || '[]');
    custom.forEach((c) => {
      if (!c || !c.name || PLATFORMS.includes(c.name)) return;
      PLATFORMS.push(c.name);
      PLATFORM_TYPE_DEFAULT[c.name] = c.type === '图文' ? '图文' : '视频';
      PLATFORM_REQUIREMENTS[c.name] = `需要提供：${c.name} 账号 + 素材；自动发布需 ${c.name} 开放平台授权`;
      PLATFORM_AUTH_FIELDS[c.name] = ['账号名', 'AppKey', 'AppSecret', '授权回调地址'];
      AUTH_FIELD_DEFS[c.name] = [['appKey', 'AppKey'], ['appSecret', 'AppSecret'], ['callback', '授权回调地址']];
    });
  } catch {}
}

function saveNewAccount() {
  const platform = $('#acct-platform').value;
  const nickname = $('#acct-nickname').value.trim();
  const account = $('#acct-account').value.trim();
  if (!nickname) {
    toast('请填写昵称', true);
    return;
  }
  const auth = {};
  document.querySelectorAll('#acct-auth-fields input[data-auth]').forEach((inp) => {
    if (inp.value.trim()) auth[inp.dataset.auth] = inp.value.trim();
  });
  const all = loadAccounts();
  all[platform] = all[platform] || [];
  if (all[platform].length >= 2000) {
    toast('最多绑定 2000 个账号', true);
    return;
  }
  all[platform].push({
    id: 'acct_' + Date.now() + '_' + all[platform].length,
    platform,
    category: $('#acct-category').value,
    nickname,
    account,
    avatar: $('#acct-avatar').value.trim(),
    remark: $('#acct-remark').value.trim(),
    auth
  });
  saveAccounts(all);
  $('#add-account-dialog').close();
  toast(`已添加 ${platform} 账号：${nickname}`);
  renderDistributeView();
}

async function makeVideo() {
  const title = $('#video-select').value || editingItemTitle || '';
  let ok = false;
  if (!title) {
    toast('请先选择条目', true);
    return false;
  }
  const mode = $('#video-mode').value;
  const format = $('#video-format').value;
  const [width, height] = format.split('x');
  const duration = $('#video-duration').value;
  const model = $('#video-model').value;
  const engineSel = $('#video-engine');
  const videoModel = (engineSel && engineSel.value) || (config && config.ai && config.ai.videoModel) || 'capcut';
  const script = $('#video-editor').value;
  const item = flatItems.find((x) => x.title === title) || (summaryData && summaryData.items || []).find((x) => x.title === title) || {};
  const btn = $('#btn-confirm-video');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '正在自动生成视频…';
  }
  try {
    const r = await api('/api/make-video', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title,
        mode,
        width,
        height,
        duration,
        model,
        videoModel,
        script,
        category: item.category,
        source: item.source,
        link: item.link,
        summary: item.content || item.fullText || item.summary || '',
        score: item.spreadScore ?? item.score,
        localFiles: uploadedVideoFiles || []
      })
    });
    const online = r.capcutMate && r.capcutMate.online;
    if (videoModel === 'moneyprinter') {
      toast(r.taskId ? `MoneyPrinterTurbo 任务已创建：${r.taskId}｜${r.statusUrl}` : 'MoneyPrinterTurbo 已受理任务');
    } else {
      toast(online
        ? (r.draftUrl ? `剪映草稿已创建：${r.draftUrl}` : `剪映任务已生成：${r.jobDir}（CapCut Mate 在线）`)
        : `剪映任务已生成：${r.jobDir}（CapCut Mate 未启动，可点击上方“启动”或手动执行 job.json）`);
    }
    ok = true;
  } catch (err) {
    toast(err.message, true);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '确认选用（默认 V1）';
    }
  }
  return ok;
}

async function loadCapcutStatus() {
  const box = $('#capcut-status');
  if (!box) return;
  const txt = $('#capcut-status-text');
  const btn = $('#btn-capcut-start');
  try {
    const s = await api('/api/capcut/status');
    if (s.online) {
      box.className = 'capcut-bar online';
      txt.textContent = `剪映内核在线：${s.api}｜内置 ${s.dir}`;
      if (btn) btn.hidden = true;
    } else if (s.exists) {
      box.className = 'capcut-bar offline';
      txt.textContent = s.venv
        ? `剪映内核未启动：${s.api}｜内置 ${s.dir}`
        : `内置目录已就绪，尚未安装依赖：${s.dir}`;
      if (btn) {
        btn.hidden = false;
        btn.textContent = s.venv ? '启动 CapCut Mate' : '安装依赖并启动';
      }
    } else {
      box.className = 'capcut-bar offline';
      txt.textContent = '未找到内置 CapCut Mate（integrations/capcut-mate）';
      if (btn) btn.hidden = false;
    }
  } catch {
    box.className = 'capcut-bar offline';
    txt.textContent = '剪映内核状态读取失败';
  }
}

async function refreshEngineStatus() {
  const eng = $('#video-engine');
  if (!eng) return;
  if (eng.value !== 'moneyprinter') {
    loadCapcutStatus();
    return;
  }
  const box = $('#capcut-status');
  if (!box) return;
  const txt = $('#capcut-status-text');
  const btn = $('#btn-capcut-start');
  try {
    const s = await api('/api/moneyprinter/status');
    box.className = s.online ? 'capcut-bar online' : 'capcut-bar offline';
    txt.textContent = s.online
      ? `MoneyPrinterTurbo 在线：${s.api}｜内置 ${s.dir}`
      : s.exists
        ? `MoneyPrinterTurbo 未启动：${s.api}｜内置 ${s.dir}（请先 python main.py）`
        : '未找到内置 MoneyPrinterTurbo（integrations/MoneyPrinterTurbo）';
    if (btn) btn.hidden = true;
  } catch {
    box.className = 'capcut-bar offline';
    txt.textContent = 'MoneyPrinterTurbo 状态读取失败';
    if (btn) btn.hidden = true;
  }
}

function syncCoverFormat() {
  const v = $('#video-format').value;
  $('#cover-format').value = v;
  toast('封面画幅已同步为 ' + v);
}

async function makeCoverSvg() {
  const format = $('#cover-format').value;
  const [width, height] = format.split('x');
  const title = $('#video-select').value || '热点封面';
  const item = flatItems.find((x) => x.title === title) || (summaryData && summaryData.items || []).find((x) => x.title === title) || {};
  const style = COMIC_CATS.includes(item.category) ? 'comic' : '';
  try {
    const r = await api('/api/make-cover', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title, width, height, style })
    });
    toast('封面已生成' + (style === 'comic' ? '（手绘漫画风格）' : ''));
    previewFile(r.file);
  } catch (err) {
    toast(err.message, true);
  }
}

async function makeCoverAi() {
  ensureCoverPrompt();
  const prompt = ($('#image-prompt').value || '').trim();
  if (!prompt) {
    toast('请填写图片提示词', true);
    return;
  }
  const format = $('#cover-format').value;
  const [width, height] = format.split('x');
  const btn = $('#btn-make-cover-ai');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'AI 生成中（约 10-60 秒）…';
  }
  try {
    const r = await api('/api/make-cover-ai', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        prompt,
        width,
        height,
        model: (config && config.ai && config.ai.imageModel) || 'pollinations-flux'
      })
    });
    toast('免费 AI 封面已生成');
    await previewFile(r.file);
  } catch (err) {
    toast(err.message, true);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'AI 免费生图';
    }
  }
}

/* 三候选生成与确认 */
const variantState = { video: [], article: [], cover: [] };
const variantSelected = { video: 0, article: 0, cover: 0 };

function currentItemTitle() {
  return $('#video-select').value || $('#article-select').value || '';
}

async function genVariants(kind) {
  const title = currentItemTitle();
  if (!title) {
    toast('请先选择条目', true);
    return;
  }
  const url = '/api/variants/' + kind;
  const body = { title };
  if (kind === 'cover') {
    const [w, h] = $('#cover-format').value.split('x');
    body.width = w;
    body.height = h;
  }
  try {
    const r = await api(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    variantState[kind] = r.variants || [];
    variantSelected[kind] = 0;
    renderVariants(kind);
    toast('已生成 3 个方案，默认选 V1');
  } catch (err) {
    toast(err.message, true);
  }
}

function renderVariants(kind) {
  const containerId = { video: 'video-variants', article: 'article-variants', cover: 'cover-variants' }[kind];
  const container = $('#' + containerId);
  if (!container) return;
  container.innerHTML = '';
  (variantState[kind] || []).forEach((v, i) => {
    const item = document.createElement('label');
    item.className = 'variant-item' + (variantSelected[kind] === i ? ' selected' : '');
    const preview = kind === 'cover'
      ? `<div class="cover-thumb">${v.svg || ''}</div>`
      : `<span class="variant-label">${esc(v.label || 'V' + (i + 1))}</span><span class="variant-text">${esc((v.content || '').slice(0, 180))}…</span>`;
    item.innerHTML = `<input type="radio" name="variant-${kind}" ${variantSelected[kind] === i ? 'checked' : ''} />${preview}`;
    item.addEventListener('click', () => {
      variantSelected[kind] = i;
      renderVariants(kind);
    });
    container.appendChild(item);
  });
}

async function confirmVariant(kind) {
  const list = variantState[kind] || [];
  const sel = list[variantSelected[kind]];
  if (!sel) {
    toast('请先生成 3 个方案', true);
    return;
  }
  const btn = $('#btn-confirm-' + (kind === 'article' ? 'article' : kind === 'cover' ? 'cover' : 'video'));
  if (btn) {
    btn.disabled = true;
    btn.textContent = '正在自动生成…';
  }
  try {
    if (kind === 'video') {
      $('#video-editor').value = sel.content;
      const made = await makeVideo();
      if (!made) return;
    } else if (kind === 'article') {
      $('#article-md').value = sel.content;
      renderArticlePreview();
      const safe = (currentItemTitle() || 'article').replace(/[\\/:*?"<>|]/g, '_').slice(0, 30);
      await api('/api/save', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path: `data/edited/${Date.now()}_${safe}_article.md`, content: sel.content })
      });
      toast('已自动生成图文内容并保存');
    } else if (kind === 'cover') {
      const path = `data/covers/${Date.now()}_cover.svg`;
      await api('/api/save', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path, content: sel.svg || sel.content || '' })
      });
      toast('已自动生成封面并保存');
    }
    setTimeout(() => switchView('review'), 600);
  } catch (err) {
    toast(err.message, true);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '确认选用（默认 V1）';
    }
  }
}

/* 一键全流程 → 发布审核 */
async function runFull() {
  const btn = $('#btn-run-all');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '全流程运行中…';
  }
  try {
    const sel = $('#run-scan-interval');
    const scanMinutes = Number(sel && !sel.hidden ? sel.value : (config && config.workflow && config.workflow.scanMinutes) || 0) || 0;
    const r = await api('/api/run/full', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scanMinutes })
    });
    toast('全流程完成：AI 内容已生成，等待你的修改意见（默认 10 秒自动继续）');
    await refresh();
    switchView('produce');
    refreshWorkflowStatus();
    autoDriveProduction().catch(() => {});
  } catch (err) {
    toast(err.message, true);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '一键运行全流程';
    }
  }
}

async function autoDriveProduction() {
  await new Promise((r) => setTimeout(r, 400));
  let title = '';
  try {
    const st = await api('/api/workflow/status');
    title = st.itemTitle || '';
  } catch {}
  const item = flatItems.find((x) => x.title === title) || (summaryData && summaryData.items || []).find((x) => x.title === title) || flatItems[0] || (summaryData && summaryData.items || [])[0];
  if (!item) {
    toast('暂无内容可用于自动生产', true);
    return;
  }
  const setOpt = (sel, t) => {
    if (!Array.from(sel.options).some((o) => o.value === t)) {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = `${t}（${item.spreadScore ?? item.score ?? '--'}/100）`;
      sel.appendChild(opt);
    }
    sel.value = t;
  };
  setOpt($('#video-select'), item.title);
  setOpt($('#article-select'), item.title);
  loadVideoScript();
  $('#article-md').value = articleFromItem(item);
  renderArticlePreview();
  showProdPane('video');
  if (!(variantState.video || []).length) await genVariants('video');
  await makeVideo();
  showProdPane('article');
  if (!(variantState.article || []).length) await genVariants('article');
  showProdPane('image');
  if (!(variantState.cover || []).length) await genVariants('cover');
  toast('视频/图文/封面自动生产完成');
  autoReviewDistributePublish(item).catch(() => {});
}

function autoApprovedTitle(title) {
  const approved = JSON.parse(localStorage.getItem('neo_review_approved') || '{}');
  approved[title] = new Date().toISOString();
  localStorage.setItem('neo_review_approved', JSON.stringify(approved));
}

function autoBuildPlatformLinks(item) {
  const links = flowStorage('neo_flow_links');
  const cat = item.category || '国内';
  PLATFORMS.forEach((platform) => {
    const accts = accountsFor(platform);
    const match = accts.find((a) => a.category === cat) || accts.find((a) => a.category === '综合') || accts[0];
    if (!match) return;
    const acctCat = match.category === '综合' ? '综合' : cat;
    const mode = PLATFORM_TYPE_DEFAULT[platform] === '视频' ? '视频' : '图文';
    connectFlowSmart(item.title, platform, mode, acctCat);
  });
  saveFlowStorage('neo_flow_links', links);
}

function publishAllFlowLinks() {
  const links = flowStorage('neo_flow_links');
  const published = flowStorage('neo_flow_published');
  Object.entries(links).forEach(([title, platforms]) => {
    published[title] = published[title] || {};
    Object.keys(platforms || {}).forEach((p) => { published[title][p] = true; });
  });
  saveFlowStorage('neo_flow_published', published);
}

async function autoReviewDistributePublish(item) {
  if (!item) return;
  await new Promise((r) => setTimeout(r, 10000));
  autoApprovedTitle(item.title);
  toast('内容审核自动通过');
  await new Promise((r) => setTimeout(r, 10000));
  autoBuildPlatformLinks(item);
  localStorage.setItem('neo_flow_selected', item.title);
  switchView('distribute');
  renderDistributionFlow();
  toast('已按分类/格式自动选择平台和账号');
  await new Promise((r) => setTimeout(r, 10000));
  publishAllFlowLinks();
  renderDistributionFlow();
  toast('确认完成，已自动一键发布（模拟）');
}

async function refreshWorkflowStatus() {
  let s;
  try {
    s = await api('/api/workflow/status');
  } catch {
    return;
  }
  const bar = $('#wf-bar');
  const auditBar = $('#audit-bar');
  if (!bar || !auditBar) return;
  const phaseText = {
    idle: '空闲',
    editing: 'AI 内容已生成（默认 V1）',
    manual: '已收到修改意见（人工模式）',
    audit: '进入发布审核',
    published: '已发布（模拟）'
  }[s.phase] || s.phase;
  if (s.phase === 'editing' || s.phase === 'manual') {
    bar.hidden = false;
    $('#wf-phase-text').textContent = phaseText;
    $('#wf-countdown').textContent = s.phase === 'editing' && s.remainingMs != null
      ? Math.ceil(s.remainingMs / 1000) + ' 秒后自动进入分发审核'
      : '已停止自动，请修改后点「立即进入下一步」';
    if (s.itemTitle) {
      const sel = $('#video-select');
      if (sel && Array.from(sel.options).some((o) => o.value === s.itemTitle)) sel.value = s.itemTitle;
    }
  } else {
    bar.hidden = true;
  }
  if (s.phase === 'audit') {
    auditBar.hidden = false;
    $('#audit-phase-text').textContent = '审核中（10 秒无人操作将自动通过）';
    $('#audit-countdown').textContent = s.remainingMs != null ? Math.ceil(s.remainingMs / 1000) + ' 秒后自动发布' : '';
  } else if (s.phase === 'published') {
    auditBar.hidden = false;
    $('#audit-phase-text').textContent = '已发布（模拟）';
    $('#audit-countdown').textContent = '';
  } else {
    auditBar.hidden = true;
  }
  if (s.phase === 'audit' || s.phase === 'published') loadAudit();
}

async function sendWorkflowFeedback() {
  const comment = $('#wf-comment').value.trim();
  if (!comment) {
    toast('请先填写修改意见', true);
    return;
  }
  try {
    const r = await api('/api/workflow/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ comment })
    });
    toast(r.message || '已提交');
    refreshWorkflowStatus();
  } catch (err) {
    toast(err.message, true);
  }
}

async function advanceWorkflow() {
  try {
    const r = await api('/api/workflow/advance', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ script: $('#video-editor').value })
    });
    toast(r.message || '已推进');
    if (r.phase === 'audit' || r.phase === 'published') {
      switchView('publish');
      loadAudit();
    }
    refreshWorkflowStatus();
  } catch (err) {
    toast(err.message, true);
  }
}

let reviewTab = 'video';
let reviewPlatform = '小红书';
let auditData = null;
let editingItemTitle = null;

async function loadContentReview() {
  try {
    await ensureClassifyHistory().catch(() => {});
    auditData = await api('/api/audit');
    if (!auditData || !auditData.item) auditData = fallbackReviewPayload();
    renderContentReview();
  } catch {
    auditData = fallbackReviewPayload();
    const box = $('#review-box');
    if (box) renderContentReview();
  }
}

function fallbackReviewPayload(override = null) {
  const title = override ? override.title : ($('#video-select').value || $('#article-select').value || editingItemTitle || (flatItems[0] && flatItems[0].title) || '当前内容');
  const item = override || flatItems.find((x) => x.title === title) || {};
  const cover = (variantState.cover || []).find((_, i) => i === variantSelected.cover);
  const platforms = {};
  PLATFORMS.forEach((p) => { platforms[p] = { copy: '', status: '待审核' }; });
  return {
    run: 'manual-' + Date.now(),
    item: { title, category: item.category || '综合', score: item.spreadScore ?? '', source: item.source || '内容制作' },
    video: { script: override ? defaultScriptForItem(item) : ($('#video-editor').value || defaultScriptForItem(item)), mp4: null },
    article: { markdown: override ? articleFromItem(item) : ($('#article-md').value || articleFromItem(item)) },
    cover: cover ? { svg: cover.svg || '' } : { svg: '' },
    platforms
  };
}

function reviewContentTypeOptions(selected) {
  return ['图文', '视频', '文案+图片'].map((v) => `<option value="${v}" ${selected === v ? 'selected' : ''}>${v}</option>`).join('');
}

function renderContentReview() {
  const box = $('#review-box');
  const left = $('#review-left');
  const right = $('#review-right');
  if (!box) return;
  if (!auditData || !auditData.item) {
    box.innerHTML = '<div class="empty-note">暂无待审核内容，请先完成内容制作。</div>';
    left.innerHTML = '';
    right.innerHTML = '';
    return;
  }
  const a = auditData;
  const platforms = Object.keys(a.platforms || {});
  if (platforms.length && !platforms.includes(reviewPlatform)) reviewPlatform = platforms[0];
  const runs = (classifyHistory && classifyHistory.runs) || [];
  const reviewItems = (flatItems || []).slice(0, 20);
  left.innerHTML = `
    ${runs.length ? `<div class="review-timeline">${runs.slice(0, 12).map((r) => `<span class="tl-chip" title="${esc(formatRunClock(r.run))}">${esc(shortRunClock(r.run))}</span>`).join('')}</div>` : '<p class="hint">暂无扫描时间轴</p>'}
    <div class="review-items">
      ${reviewItems.map((it) => `<div class="review-item ${a.item.title === it.title ? 'current' : ''}" data-review-title="${esc(it.title)}">
        <span class="review-title">${esc(it.title)}</span>
        <span class="hint">${esc(it.category || '')} · ${it.spreadScore ?? '--'}/100</span>
        <span class="head-actions"><button class="btn ghost review-open" data-title="${esc(it.title)}">查看</button><button class="btn primary review-approve" data-title="${esc(it.title)}">审核通过 → 分发</button></span>
      </div>`).join('') || '<div class="empty-note">暂无内容</div>'}
    </div>
    <div class="review-item-head">
      <h3>${esc(a.item.title)}</h3>
      <p class="hint">${esc(a.run)}｜${esc(a.item.category || '')}｜${a.item.score ?? '--'}/100</p>
    </div>
    <div class="review-tabs">
      ${['video', 'article', 'cover'].map((k) => `<button class="chip ${reviewTab === k ? 'active' : ''}" data-review-tab="${k}">${k === 'video' ? '视频' : k === 'article' ? '图文' : '封面'}</button>`).join('')}
    </div>
    <div class="review-platform-list">
      ${platforms.map((p) => {
        const accts = accountsFor(p);
        const picks = picksForItem(a.item.title, p, accts, a.item.category || '国内');
        const type = picks.type || PLATFORM_TYPE_DEFAULT[p] || '视频';
        return `<div class="review-platform ${reviewPlatform === p ? 'active' : ''}" data-review-platform="${esc(p)}">
          <strong>${esc(p)}</strong>
          <select class="review-type" data-platform="${esc(p)}">${reviewContentTypeOptions(type)}</select>
          <span class="hint">账号 ${accts.length} 个${accts.some((x) => x.category === '综合' || x.category === (a.item.category || '')) ? ' · 已匹配分类' : ''}</span>
        </div>`;
      }).join('')}
    </div>
    <div class="head-actions"><button id="btn-review-preview" class="btn ghost">预览：${esc(reviewPlatform)}</button></div>`;
  right.innerHTML = `<div class="review-preview"><div id="review-preview-body">${reviewPreviewHtml()}</div></div>`;
  left.querySelectorAll('.review-open').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    const it = flatItems.find((x) => x.title === b.dataset.title);
    if (it) auditData = fallbackReviewPayload(it);
    renderContentReview();
  }));
  left.querySelectorAll('.review-approve').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    const title = b.dataset.title;
    const approved = JSON.parse(localStorage.getItem('neo_review_approved') || '{}');
    approved[title] = new Date().toISOString();
    localStorage.setItem('neo_review_approved', JSON.stringify(approved));
    toast(`「${title}」审核通过，进入分发平台`);
    switchView('distribute');
  }));
  left.querySelectorAll('[data-review-tab]').forEach((b) => b.addEventListener('click', () => {
    reviewTab = b.dataset.reviewTab;
    renderContentReview();
  }));
  left.querySelectorAll('[data-review-platform]').forEach((el) => el.addEventListener('click', (e) => {
    if (e.target.closest('select')) return;
    reviewPlatform = el.dataset.reviewPlatform;
    renderContentReview();
  }));
  left.querySelectorAll('.review-type').forEach((sel) => sel.addEventListener('change', () => {
    const store = loadPickStore();
    const title = a.item.title;
    store[title] = store[title] || {};
    store[title][sel.dataset.platform] = store[title][sel.dataset.platform] || { init: true, picks: {} };
    store[title][sel.dataset.platform].type = sel.value;
    savePickStore(store);
    toast(`${sel.dataset.platform} 分发内容：${sel.value}`);
  }));
  $('#btn-review-preview')?.addEventListener('click', () => {
    right.innerHTML = `<div class="review-preview"><h4>${esc(reviewPlatform)} 展示效果</h4><div id="review-preview-body">${reviewPreviewHtml()}</div></div>`;
  });
}

function reviewPreviewHtml() {
  const a = auditData || {};
  if (reviewTab === 'article') {
    return `<div class="article-preview">${(a.article && a.article.markdown ? mdToHtml(a.article.markdown, 'default') : '<p>暂无图文</p>')}</div>`;
  }
  if (reviewTab === 'cover') {
    return (a.cover && a.cover.svg) ? `<div class="poster-wrap">${a.cover.svg}</div>` : '<div class="view-note">封面待生成，确认后可在分发中直接使用</div>';
  }
  const v = a.video || {};
  if (v.mp4) return `<video controls style="width:100%;max-height:60vh;border-radius:12px" src="/api/file?path=${encodeURIComponent(v.mp4)}"></video>`;
  return '<div class="view-note">视频文件尚未渲染完成，这里不审核文字脚本；成片生成后可直接播放查看。</div>';
}

function confirmContentReview() {
  if (!auditData || !auditData.item) {
    toast('没有待审核内容', true);
    return;
  }
  const a = auditData;
  const store = loadPickStore();
  store[a.item.title] = store[a.item.title] || {};
  document.querySelectorAll('.review-type').forEach((sel) => {
    store[a.item.title][sel.dataset.platform] = store[a.item.title][sel.dataset.platform] || { init: true, picks: {} };
    store[a.item.title][sel.dataset.platform].type = sel.value;
  });
  savePickStore(store);
  toast('内容审核完成，已进入分发平台');
  switchView('distribute');
}

async function loadAudit() {
  try {
    auditData = await api('/api/audit');
    if (!auditData || !auditData.item) {
      let synced = {};
      try { synced = JSON.parse(localStorage.getItem('neo_publish_sync') || '{}'); } catch {}
      const titles = Object.keys(synced);
      if (titles.length) {
        const it = flatItems.find((x) => x.title === titles[titles.length - 1]) || flatItems[0];
        auditData = fallbackReviewPayload(it);
      }
    }
    renderAudit();
  } catch {
    auditData = null;
    const box = $('#audit-box');
    if (box) box.innerHTML = '<div class="empty-note">无法读取发布审核数据</div>';
  }
}

function analyticsRows() {
  const rows = [];
  PLATFORMS.forEach((p) => accountsFor(p).forEach((a) => rows.push({ platform: p, account: a })));
  return rows;
}

function renderAnalytics() {
  const box = $('#analytics-box');
  if (!box) return;
  const date = $('#analytics-date').value || new Date().toISOString().slice(0, 10);
  const rows = analyticsRows();
  const stats = JSON.parse(localStorage.getItem('neo_account_stats') || '{}');
  const fields = [
    ['publish', '发布数'], ['reads', '阅读/播放'], ['likes', '点赞'], ['comments', '评论'],
    ['shares', '转发'], ['followers', '新增粉丝']
  ];
  box.innerHTML = `<div class="analytics-table-wrap"><table class="heat-table analytics-table">
    <thead><tr><th>平台</th><th>账号</th><th>分类</th>${fields.map((f) => `<th>${f[1]}</th>`).join('')}</tr></thead>
    <tbody>${rows.length ? rows.map((r) => {
      const key = `${date}|${r.platform}|${r.account.id}`;
      const row = stats[key] || {};
      return `<tr>
        <td>${esc(r.platform)}</td><td>${esc(r.account.nickname || r.account.account || r.account.id)}</td>
        <td>${esc(r.account.category || '综合')}</td>
        ${fields.map((f) => `<td><input type="number" class="analytics-input" data-key="${esc(key)}" data-field="${f[0]}" value="${Number(row[f[0]]) || 0}" /></td>`).join('')}
      </tr>`;
    }).join('') : '<tr><td colspan="9">暂无账号，请先在分发平台添加账号</td></tr>'}
    </tbody></table></div>`;
}

function saveAnalytics() {
  const all = JSON.parse(localStorage.getItem('neo_account_stats') || '{}');
  document.querySelectorAll('.analytics-input').forEach((inp) => {
    const key = inp.dataset.key;
    all[key] = all[key] || {};
    all[key][inp.dataset.field] = Number(inp.value) || 0;
  });
  localStorage.setItem('neo_account_stats', JSON.stringify(all));
  toast('账号数据已保存');
}

function generateAnalyticsReport() {
  const scope = $('#analytics-scope').value;
  const dateText = $('#analytics-date').value || new Date().toISOString().slice(0, 10);
  const d = new Date(dateText + 'T00:00:00');
  const all = JSON.parse(localStorage.getItem('neo_account_stats') || '{}');
  const rows = [];
  Object.entries(all).forEach(([key, v]) => {
    const parts = key.split('|');
    const dt = new Date(parts[0] + 'T00:00:00');
    const ok = scope === 'daily' ? dt.toDateString() === d.toDateString()
      : scope === 'weekly' ? (d - dt) <= 7 * 86400000 && dt <= d
        : scope === 'monthly' ? dt.getFullYear() === d.getFullYear() && dt.getMonth() === d.getMonth()
          : dt.getFullYear() === d.getFullYear();
    if (ok) rows.push({ platform: parts[1], account: parts[2], ...v });
  });
  const sum = (f) => rows.reduce((n, r) => n + (Number(r[f]) || 0), 0);
  const topPlatform = {};
  rows.forEach((r) => { topPlatform[r.platform] = (topPlatform[r.platform] || 0) + Number(r.reads || 0); });
  const best = Object.entries(topPlatform).sort((a, b) => b[1] - a[1])[0];
  const titles = { daily: '日报', weekly: '周报', monthly: '月报', yearly: '年报' };
  const title = `${titles[scope] || '报告'} · ${dateText}`;
  const lines = [
    `# ${title}`,
    '',
    `覆盖账号 ${rows.length} 条数据`,
    '',
    `发布 ${sum('publish')}｜阅读/播放 ${sum('reads')}｜点赞 ${sum('likes')}｜评论 ${sum('comments')}｜转发 ${sum('shares')}｜新增粉丝 ${sum('followers')}`,
    '',
    '## 发现问题',
    rows.length ? `- 主平台：${best ? best[0] : '暂无'}（阅读 ${best ? best[1] : 0}）\n- 互动率：${sum('reads') ? (sum('likes') / sum('reads') * 100).toFixed(2) + '%' : '无数据'}\n- 转化偏低平台需优化选题与封面。` : '- 暂无数据，请先填写各账号数据',
    '',
    '## 决策建议',
    '- 保留阅读高的账号/平台，提高发布频率；\n- 互动率低的账号改做内容类型测试；\n- 将低效账号分流到图文/短视频二次验证。'
  ];
  const box = $('#analytics-box');
  if (box) box.innerHTML = `<div class="analytics-report">${lines.join('\n').replace(/\n/g, '<br>')}</div><button id="btn-analytics-edit-back" class="btn ghost" style="margin-top:12px">返回编辑数据</button>`;
  $('#btn-analytics-edit-back')?.addEventListener('click', renderAnalytics);
}

function renderAudit() {
  const box = $('#audit-box');
  if (!box) return;
  box.innerHTML = '';
  if (!auditData || !auditData.item) {
    box.innerHTML = '<div class="empty-note">暂无发布审核数据。点击顶部「一键运行全流程」后会自动生成。</div>';
    return;
  }
  const a = auditData;
  const wrap = document.createElement('div');
  wrap.className = 'audit-item';
  wrap.innerHTML = `
    <h3>${esc(a.item.title)}</h3>
    <div class="meta">档期 ${esc(a.run)}｜${esc(a.item.category || '')}｜评分 ${a.item.score ?? '--'}/100｜来源 ${esc(a.item.source || '')}</div>
    <div class="audit-platforms"></div>`;
  const grid = wrap.querySelector('.audit-platforms');
  for (const [platform, p] of Object.entries(a.platforms || {})) {
    const card = document.createElement('div');
    card.className = 'audit-platform';
    const type = PLATFORM_TYPE_DEFAULT[platform] || '视频';
    const content = type === '图文' ? (a.article && a.article.markdown) || '' : (a.video && a.video.script) || '';
    const accts = accountsFor(platform);
    const picks = picksForItem(a.item.title, platform, accts, a.item.category || '国内');
    const selectedType = picks.type || type;
    card.innerHTML = `
      <h4><span>${esc(platform)}</span><span class="status">${esc(p.status || '待审核')}</span></h4>
      <label class="inline">分发内容
        <select class="audit-type" data-platform="${esc(platform)}">${reviewContentTypeOptions(selectedType)}</select>
      </label>
      <div class="audit-accts" data-platform="${platform}"></div>
      <div class="head-actions"><button class="btn primary audit-publish-platform" data-platform="${esc(platform)}" ${p.status === '已发布（模拟）' ? 'disabled' : ''}>发布</button></div>`;
    grid.appendChild(card);
    const acctBox = card.querySelector('.audit-accts');
    accts.forEach((acct) => {
      const checked = !!picks.picks[acct.id];
      const label = document.createElement('label');
      label.className = 'acct-item audit-acct-item' + (checked ? ' picked' : '');
      label.innerHTML = `<input type="checkbox" class="audit-pick-acct" data-id="${esc(acct.id)}" ${checked ? 'checked' : ''} />
        ${avatarHtml(acct)}
        <span class="acct-info"><strong>${esc(acct.nickname || '未命名')} <em class="acct-cat">[${esc(acct.category || '综合')}]</em></strong><small>${esc(acct.account || '未填账号')}</small></span>`;
      acctBox.appendChild(label);
      const sendRow = document.createElement('div');
      sendRow.className = 'audit-send-row';
      sendRow.innerHTML = `<span class="audit-send-title">${esc(a.item.title)}</span>
        <span>→ ${esc(acct.nickname || acct.account || '未命名账号')}（${esc(acct.category || '综合')}）</span>
        <span>类型：${esc(selectedType)}</span>
        <span class="audit-send-status ${p.status === '已发布（模拟）' ? 'ok' : ''}">${esc(p.status || '待审核')}</span>`;
      acctBox.appendChild(sendRow);
    });
  }
  grid.querySelectorAll('.audit-type').forEach((sel) => {
    sel.addEventListener('change', () => {
      const store = loadPickStore();
      store[a.item.title] = store[a.item.title] || {};
      store[a.item.title][sel.dataset.platform] = store[a.item.title][sel.dataset.platform] || { init: true, picks: {} };
      store[a.item.title][sel.dataset.platform].type = sel.value;
      savePickStore(store);
      toast(`${sel.dataset.platform} 分发内容：${sel.value}`);
    });
  });
  grid.querySelectorAll('.audit-pick-acct').forEach((cb) => {
    cb.addEventListener('change', () => {
      const store = loadPickStore();
      const title = a.item.title;
      store[title] = store[title] || {};
      const platform = cb.closest('.audit-accts').dataset.platform;
      store[title][platform] = store[title][platform] || { init: true, picks: {} };
      store[title][platform].picks[cb.dataset.id] = cb.checked;
      savePickStore(store);
      cb.closest('.acct-item').classList.toggle('picked', cb.checked);
    });
  });
  grid.querySelectorAll('.audit-publish-platform').forEach((btn) => {
    btn.addEventListener('click', () => publishAudit([btn.dataset.platform], btn));
  });
  box.appendChild(wrap);
  refreshVideoProgressEls();
}

async function refreshVideoProgressEls() {
  const els = Array.from(document.querySelectorAll('.video-progress'));
  if (!els.length) return;
  await Promise.all(els.map(async (el) => {
    const run = el.dataset.run;
    if (!run) return;
    try {
      const r = await api('/api/job-mp4?run=' + encodeURIComponent(run));
      if (r.found) {
        el.classList.add('done');
        const fill = el.querySelector('.progress-fill');
        const txt = el.querySelector('.progress-text');
        if (fill) fill.style.width = '100%';
        if (txt) txt.textContent = '制作完成：已生成 MP4，可点击「查看成片」播放';
        el.closest('.audit-platform')?.querySelectorAll('.play-video').forEach((b) => { b.disabled = false; });
      }
    } catch {}
  }));
}

async function playAuditVideo(a, run) {
  try {
    const r = await api('/api/job-mp4?run=' + encodeURIComponent(run));
    $('#preview-title').textContent = `视频预览 · ${a.item.title}`;
    $('#btn-download').hidden = !r.found;
    $('#btn-export-png').hidden = true;
    const body = $('#preview-body');
    if (r.found) {
      body.innerHTML = `<video controls autoplay style="width:100%;max-height:70vh" src="/api/file?path=${encodeURIComponent(r.file)}"></video>`;
      currentDownload = r.file;
    } else {
      body.innerHTML = `<pre>视频尚未渲染出 MP4。

已生成的剪映任务目录：${esc((a.video && a.video.capcutJob) || '无')}

请在剪映中打开该任务完成渲染后，MP4 会出现在任务目录或「视频」项目根目录，届时这里即可直接点击播放。

当前脚本：
${esc((a.video && a.video.script) || '')}</pre>`;
      currentDownload = null;
    }
    $('#preview-dialog').showModal();
  } catch (err) {
    toast(err.message, true);
  }
}

async function publishAudit(platforms = null, btn = null) {
  if (!auditData || !auditData.run) {
    toast('没有可发布的审核任务', true);
    return;
  }
  if (btn) {
    btn.disabled = true;
    btn.textContent = '发布中…';
  }
  try {
    const r = await api('/api/publish', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ run: auditData.run, platforms })
    });
    toast(platforms ? `已发布：${platforms.join('、')}` : '全部平台已发布');
    loadAudit();
  } catch (err) {
    toast(err.message, true);
    if (btn) {
      btn.disabled = false;
      btn.textContent = '发布';
    }
  }
}

async function publishAll() {
  publishAudit(null);
}

/* 定时任务 */
async function refreshScanStatus() {
  try {
    const s = await api('/api/scan/status');
    $('#scan-interval').value = String(s.scanMinutes || 0);
    $('#top-scan-interval').value = String(s.scanMinutes || 0);
    $('#scan-status').innerHTML = `扫描间隔：${s.scanMinutes ? s.scanMinutes + ' 分钟' : '关闭'}
上次扫描：${s.lastScanAt || '无'}
下次扫描：${s.nextScanAt || '—'}
运行中：${s.running ? '是' : '否'}`;
  } catch {
    $('#scan-status').textContent = '无法获取定时状态';
  }
}

async function saveSchedule() {
  const mins = Number($('#scan-interval').value) || 0;
  try {
    await api('/api/config', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ workflow: { scanMinutes: mins } })
    });
    config = await api('/api/config');
    toast(`定时扫描已${mins ? '开启：每 ' + mins + ' 分钟' : '关闭'}`);
    refreshScanStatus();
  } catch (err) {
    toast(err.message, true);
  }
}

async function runScanNow() {
  try {
    toast('开始扫描，请稍候…');
    const r = await api('/api/scan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    toast(r.ok ? '扫描完成' : '扫描失败：' + (r.error || ''));
    await refresh();
    refreshScanStatus();
  } catch (err) {
    toast(err.message, true);
  }
}

/* ---------------- 详情/预览 ---------------- */

function articlePreviewHTML(it) {
  return mdToHtml(articleFromItem(it), 'default');
}

async function openItemDetail(it, kind) {
  $('#item-title').textContent = `${kind === 'a' ? '深度详情' : '精简详情'} · ${it.category || ''}`;
  const score = it.spreadScore ?? '--';
  const text = (it.fullText || it.summary || it.title || '暂无正文').trim();
  const summaryHit = (summaryData && summaryData.items || []).find((x) => x.title === it.title);
  const dims = it.dims || (summaryHit && summaryHit.dims) || [];
  const dimRows = dims.length
    ? `<table class="heat-table"><thead><tr><th>#</th><th>维度</th><th>评分</th><th>说明</th></tr></thead><tbody>${dims.map((d, i) => `<tr><td>${i + 1}</td><td>${esc(d.name)}</td><td>${d.score}</td><td>${esc(d.note || '模型综合估算')}</td></tr>`).join('')}</tbody></table>`
    : '<p class="view-note">该条目尚未进入 40 维评分明细，请先在“信息汇总 → 重新汇总评分”后重试。</p>';
  let scriptHtml = '<p>暂无独立视频脚本（评分 ≥80 才会生成），可先运行「制作海报和视频」。</p>';
  if (it.clip && it.clip.clipFile) {
    try {
      const data = await api('/api/file?path=' + encodeURIComponent(it.clip.clipFile));
      scriptHtml = `<pre>${esc(data.content)}</pre>`;
    } catch {}
  }
  $('#item-body').innerHTML = `
    <div class="item-sec"><h4>内容</h4><div class="item-text">${esc(text)}</div></div>
    <div class="item-sec"><h4>全网深度整合</h4><div id="deep-box" class="deep-box">正在全网搜索并整合该条信息…</div></div>
    <div class="item-sec"><h4>基础评分</h4><div class="item-score-line"><span class="item-score-num">${score}</span><span>/100 · ${esc(it.spread || '中')}传播性</span></div><p>${esc(it.spreadReason || '')}</p></div>
    <div class="item-sec"><h4>素材来源</h4><p>${esc(it.source || '公开信息')}${it.link ? `<br /><a href="${esc(it.link)}" target="_blank" rel="noopener">${esc(it.link)}</a>` : ''}</p></div>
    <div class="item-sec"><h4>40 维评分明细</h4>${dimRows}</div>
    <div class="item-sec"><h4>视频脚本</h4>${scriptHtml}</div>
    <div class="item-sec"><h4>基础图文排版</h4>${articlePreviewHTML(it)}</div>`;
  $('#item-dialog').showModal();
  loadDeepDetail(it);
}

function deepItemHtml(r) {
  const reportRows = (r.reports || []).map((x) => `
    <div class="deep-report">
      <div class="deep-report-head"><span class="batch-tag new">${esc(hostLabel(x.link) || x.sourceName || '报道')}</span><span class="hint">${esc(x.publishedAt || '')}</span></div>
      <a href="${esc(x.link)}" target="_blank" rel="noopener"><strong>${esc(x.title || '')}</strong></a>
      ${x.summary ? `<p>${esc(x.summary)}</p>` : ''}
    </div>`).join('');
  const timelineRows = (r.timeline || []).map((t) => `<tr><td>${esc(t.time || '')}</td><td>${esc(t.source || '')}</td><td>${esc(t.summary || '')}</td></tr>`).join('');
  return `
    <p class="deep-overview">${esc(r.overview || '').replace(/\n/g, '<br />')}</p>
    <p class="deep-meta">全网查询：${esc(r.query || '')}｜检索时间：${esc(r.searchedAt || '')}｜本地相关：${r.localCount || 0} 条</p>
    ${(r.relatedTitles || []).length ? `<div class="deep-related">本地关联：${r.relatedTitles.map((t) => `<span class="file-chip">${esc(t)}</span>`).join('')}</div>` : ''}
    ${timelineRows ? `<h5>整合时间线</h5><div class="deep-table-wrap"><table class="heat-table"><thead><tr><th>时间</th><th>来源</th><th>内容</th></tr></thead><tbody>${timelineRows}</tbody></table></div>` : ''}
    ${reportRows ? `<h5>全网相关报道（${(r.reports || []).length} 条）</h5><div class="deep-reports">${reportRows}</div>` : ''}
    ${(r.reportSources || []).length ? `<div class="deep-sources">检索到信源：${r.reportSources.map((s) => `<span class="deep-source">${esc(s)}</span>`).join('')}</div>` : ''}
    <div class="head-actions" style="margin-top:10px"><button class="btn ghost" id="deep-retry">重新全网搜索</button></div>`;
}

function hostLabel(u) {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

async function loadDeepDetail(it) {
  const box = $('#deep-box');
  if (!box || !it || !it.title) return;
  box.innerHTML = '<p class="hint">正在搜索全网最新报道并整合本地记录…</p>';
  try {
    const r = await api('/api/item/deep', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: it.title,
        category: it.category,
        source: it.source,
        link: it.link,
        fullText: it.fullText,
        summary: it.summary
      })
    });
    box.innerHTML = deepItemHtml(r);
  } catch (err) {
    box.innerHTML = `<p class="view-note">深度整合失败：${esc(err.message)}</p><div class="head-actions"><button class="btn ghost" id="deep-retry">重试</button></div>`;
  }
  box.querySelector('#deep-retry')?.addEventListener('click', () => loadDeepDetail(it));
}

async function previewFile(file) {
  const isImg = /\.(png|jpe?g|gif|webp)$/i.test(file || '');
  if (isImg) {
    currentDownload = file;
    $('#preview-title').textContent = file.split('/').pop();
    $('#btn-download').hidden = false;
    $('#btn-export-png').hidden = true;
    $('#preview-body').innerHTML = `<img src="/api/file?path=${encodeURIComponent(file)}" style="max-width:100%;max-height:70vh;border-radius:10px" />`;
    $('#preview-dialog').showModal();
    return;
  }
  try {
    const data = await api('/api/file?path=' + encodeURIComponent(file));
    currentDownload = file;
    $('#preview-title').textContent = file.split('/').pop();
    $('#btn-download').hidden = false;
    const body = $('#preview-body');
    if (data.type === 'svg') {
      $('#btn-export-png').hidden = false;
      body.innerHTML = `<div class="poster-wrap">${data.content}</div>`;
    } else {
      $('#btn-export-png').hidden = true;
      body.innerHTML = '<pre></pre>';
      body.querySelector('pre').textContent = data.content;
    }
    $('#preview-dialog').showModal();
  } catch (err) {
    toast(err.message, true);
  }
}

/* ---------------- 事件绑定 ---------------- */

$('#btn-run-all').addEventListener('click', runFull);
$('#btn-config').addEventListener('click', openConfigForm);
$('#btn-add-integration').addEventListener('click', openAddDialog);
$('#btn-close-add').addEventListener('click', () => $('#add-dialog').close());
$('#btn-add-run').addEventListener('click', runAdd);
$('#add-kind').addEventListener('change', onAddKindChange);
$('#btn-close-key').addEventListener('click', () => $('#key-dialog').close());
$('#btn-key-ok').addEventListener('click', submitKey);
$('#btn-close-config').addEventListener('click', () => $('#config-dialog').close());
$('#btn-close-preview').addEventListener('click', () => $('#preview-dialog').close());
$('#btn-close-item').addEventListener('click', () => $('#item-dialog').close());
$('#btn-download').addEventListener('click', () => currentDownload && window.open('/api/download?path=' + encodeURIComponent(currentDownload), '_blank'));
$('#btn-export-png').addEventListener('click', exportPosterPng);
document.querySelectorAll('#view-info .info-mode-bar .btn').forEach((b) => {
  b.addEventListener('click', () => {
    infoMode = b.dataset.info;
    renderInfoView();
  });
});
$('#btn-info-rerun').addEventListener('click', async () => {
  try {
    await api('/api/run/summarize', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    toast('评分汇总完成');
    await loadSummary();
    await loadProduced();
    renderInfoView();
  } catch (err) {
    toast(err.message, true);
  }
});
$('#btn-run-summary').addEventListener('click', async () => {
  try {
    await api('/api/run/summarize', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    toast('汇总完成');
    await loadSummary();
    renderSummaryView();
  } catch (err) {
    toast(err.message, true);
  }
});

$('#btn-topic-live').addEventListener('click', (e) => loadTopicAnalysis('live', e.target));
$('#btn-topic-daily').addEventListener('click', (e) => loadTopicAnalysis('daily', e.target));
$('#btn-topic-weekly').addEventListener('click', (e) => loadTopicAnalysis('weekly', e.target));

$('#btn-load-script').addEventListener('click', loadVideoScript);
$('#video-select').addEventListener('change', () => {
  loadVideoScript();
  if (!$('#prod-image').hidden) ensureCoverPrompt();
});
$('#article-select').addEventListener('change', () => {
  const title = $('#article-select').value;
  const item = flatItems.find((x) => x.title === title) || (summaryData && summaryData.items || []).find((x) => x.title === title);
  $('#article-md').value = item ? articleFromItem(item) : '';
  renderArticlePreview();
  if (!$('#prod-image').hidden) ensureCoverPrompt();
});
$('#article-md').addEventListener('input', renderArticlePreview);
$('#video-engine').addEventListener('change', async (e) => {
  refreshEngineStatus();
  if (config && config.ai) {
    config.ai.videoModel = e.target.value;
    try {
      await api('/api/config', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ai: { videoModel: e.target.value } })
      });
      toast(`视频引擎已切换：${e.target.value === 'moneyprinter' ? 'MoneyPrinterTurbo' : e.target.value}`);
    } catch {}
  }
});
$('#btn-capcut-start').addEventListener('click', async () => {
  const btn = $('#btn-capcut-start');
  if (!btn) return;
  const old = btn.textContent;
  btn.disabled = true;
  btn.textContent = '正在安装/启动（后台进行）…';
  try {
    const r = await api('/api/capcut/start', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    toast(r.already ? 'CapCut Mate 已在线' : '已在后台安装/启动，首次需几分钟，请稍后刷新状态');
    setTimeout(loadCapcutStatus, 4000);
  } catch (err) {
    toast(err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = old;
  }
});
$('#btn-gen-video-variants').addEventListener('click', () => genVariants('video'));
$('#btn-confirm-video').addEventListener('click', () => confirmVariant('video'));
$('#btn-article-preview').addEventListener('click', renderArticlePreview);
$('#btn-smart-article').addEventListener('click', smartArticleLayout);
$('#btn-gen-article-variants').addEventListener('click', () => genVariants('article'));
$('#btn-confirm-article').addEventListener('click', () => confirmVariant('article'));
$('#btn-copy-html').addEventListener('click', () => {
  const html = $('#article-preview-box').innerHTML;
  if (html) copyText(html);
  else toast('请先生成预览', true);
});
$('#btn-article-auto').addEventListener('click', async () => {
  const item = selectedArticleItem();
  if (item && item.title) $('#article-md').value = articleFromItem(item);
  await smartArticleLayout();
  toast('已用 TraeWork 公众号排版生成（可继续修改 Markdown 后重新预览）');
});
$('#btn-image-copy').addEventListener('click', () => copyText($('#image-prompt').value));
$('#btn-image-from-item').addEventListener('click', () => {
  const item = flatItems.find((x) => x.title === $('#video-select').value) || flatItems.find((x) => x.title === $('#article-select').value);
  const comic = item && COMIC_CATS.includes(item.category);
  $('#image-prompt').value = `请生成一张${comic ? '手绘漫画风格' : '黑色科技风'}的传播海报，主题：${item ? item.title : '热点新闻'}。要点：${item && (item.content || item.fullText || item.summary) ? (item.content || item.fullText || item.summary).slice(0, 100) : '清晰的信息层级、霓虹青色点缀'}${comic ? '，夸张表情、网点阴影、粗线条描边、气泡文字' : ''}。竖版 9:16，适合抖音/小红书。`;
});
$('#btn-sync-cover').addEventListener('click', syncCoverFormat);
$('#btn-make-cover-svg').addEventListener('click', makeCoverSvg);
$('#btn-gen-cover-variants').addEventListener('click', () => genVariants('cover'));
$('#btn-confirm-cover').addEventListener('click', () => confirmVariant('cover'));
$('#btn-audit-refresh').addEventListener('click', loadAudit);
$('#btn-audit-publish').addEventListener('click', publishAll);
$('#btn-analytics-save').addEventListener('click', saveAnalytics);
$('#btn-analytics-report').addEventListener('click', generateAnalyticsReport);
$('#analytics-scope').addEventListener('change', renderAnalytics);
$('#analytics-date').addEventListener('change', renderAnalytics);
$('#btn-review-refresh').addEventListener('click', renderReviewModule);
$('#review-status-filter').addEventListener('change', (e) => {
  reviewStatusFilter = e.target.value;
  renderReviewModule();
});
$('#review-date').addEventListener('change', (e) => {
  reviewDate = e.target.value;
  renderReviewModule();
});
$('#btn-review-clear-date').addEventListener('click', () => {
  reviewDate = '';
  $('#review-date').value = '';
  renderReviewModule();
});
$('#btn-wf-send').addEventListener('click', sendWorkflowFeedback);
$('#btn-wf-next').addEventListener('click', advanceWorkflow);
$('#btn-add-account').addEventListener('click', () => openAddAccount());
$('#btn-add-platform').addEventListener('click', openAddPlatform);
$('#btn-open-review').addEventListener('click', openReviewPicker);
$('#btn-close-review-picker').addEventListener('click', () => $('#review-picker-dialog').close());
$('#btn-close-platform').addEventListener('click', () => $('#add-platform-dialog').close());
$('#btn-save-platform').addEventListener('click', saveNewPlatform);
$('#btn-flow-clear').addEventListener('click', () => {
  localStorage.removeItem('neo_flow_links');
  renderDistributionFlow();
  toast('已清空内容与平台的拉线连接');
});
$('#btn-flow-del-line').addEventListener('click', deleteSelectedFlowLine);
$('#flow-status-filter').addEventListener('change', () => renderDistributionFlow());
$('#btn-flow-confirm').addEventListener('click', () => {
  const time = $('#flow-time') && $('#flow-time').value;
  if (time) localStorage.setItem('neo_flow_time', time);
  toast('当前操作已保存');
  localStorage.setItem('neo_flow_saved', new Date().toISOString());
});
$('#btn-flow-publish').addEventListener('click', () => {
  const links = flowStorage('neo_flow_links');
  const published = flowStorage('neo_flow_published');
  Object.entries(links).forEach(([title, platforms]) => {
    published[title] = published[title] || {};
    Object.keys(platforms || {}).forEach((p) => {
      published[title][p] = true;
    });
  });
  saveFlowStorage('neo_flow_published', published);
  toast('已一键发布当前连接的全部平台（模拟）');
  renderDistributionFlow();
});
$('#btn-close-account').addEventListener('click', () => $('#add-account-dialog').close());
$('#btn-save-account').addEventListener('click', saveNewAccount);
$('#acct-platform').addEventListener('change', renderAcctAuthFields);
$('#btn-close-category').addEventListener('click', () => $('#add-category-dialog').close());
$('#btn-save-category').addEventListener('click', saveNewCategory);
$('#btn-home-fullscreen').addEventListener('click', toggleHomeFullscreen);
$('#btn-graph-drag').addEventListener('click', toggleGraphDragMode);
$('#btn-graph-reset').addEventListener('click', resetGraphPositions);
$('#graph').addEventListener('pointerdown', onGraphPointerDown);
$('#graph').addEventListener('pointermove', onGraphPointerMove);
$('#graph').addEventListener('pointerup', onGraphPointerUp);
$('#graph').addEventListener('pointercancel', onGraphPointerUp);
$('#btn-run-full-panel').addEventListener('click', runFull);
$('#btn-dock-assistant').addEventListener('click', openAssistantWidget);
$('#assistant-fab').addEventListener('click', () => {
  if (fabDragSuppress) return;
  openAssistantWidget();
});
$('#assistant-fab').addEventListener('pointerdown', onFabDragDown);
window.addEventListener('pointermove', onFabDragMove);
window.addEventListener('pointerup', onFabDragEnd);
window.addEventListener('pointercancel', onFabDragEnd);
$('#btn-assistant-close').addEventListener('click', closeAssistantWidget);
$('#btn-assistant-pin').addEventListener('click', toggleAssistantPin);
$('#btn-close-report').addEventListener('click', () => $('#report-dialog').close());
$('#btn-report-save').addEventListener('click', saveReportEdit);
$('#btn-close-wb-review').addEventListener('click', () => $('#workbench-review-dialog').close());
$('#btn-wb-review-approve').addEventListener('click', approveWbReview);
$('#btn-wb-review-edit').addEventListener('click', openEditFromReview);
document.querySelectorAll('#workbench-review-dialog [data-wb-tab]').forEach((b) => b.addEventListener('click', () => {
  wbReviewTab = b.dataset.wbTab;
  renderWbReview();
}));
document.querySelectorAll('#assistant-widget .shortcut').forEach((b) => {
  b.addEventListener('click', () => sendHomeChat(b.dataset.cmd));
});
document.querySelector('.assistant-widget-head').addEventListener('pointerdown', onAssistantDragDown);
window.addEventListener('pointermove', onAssistantDragMove);
window.addEventListener('pointerup', onAssistantDragEnd);
window.addEventListener('pointercancel', onAssistantDragEnd);
$('#btn-run-timer').addEventListener('click', () => {
  const sel = $('#run-scan-interval');
  if (!sel) return;
  sel.hidden = !sel.hidden;
  if (!sel.hidden && config && config.workflow) {
    sel.value = String(Number(config.workflow.scanMinutes) || 0);
  }
  const btn = $('#btn-run-timer');
  if (btn) btn.textContent = sel.hidden ? '定时设置' : '收起时间设置';
});
$('#run-scan-interval').addEventListener('change', async () => {
  const sel = $('#run-scan-interval');
  if (!sel) return;
  const mins = Number(sel.value) || 0;
  try {
    await api('/api/config', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ workflow: { scanMinutes: mins } })
    });
    if (config && config.workflow) config.workflow.scanMinutes = mins;
    const top = $('#top-scan-interval');
    if (top) top.value = String(mins);
    toast(mins ? `已设置每 ${mins} 分钟自动扫描一次` : '已关闭自动扫描（仅手动）');
  } catch (err) {
    toast(err.message, true);
  }
});
$('#hot-toggle').addEventListener('click', () => {
  const home = $('#view-home');
  home && home.classList.toggle('hot-min');
  const btn = $('#hot-toggle');
  if (btn) btn.textContent = home && home.classList.contains('hot-min') ? '＋' : '−';
});
document.querySelectorAll('.home-dock .dock-btn[data-panel]').forEach((b) => {
  b.addEventListener('click', () => {
    toggleHomePanel(b.dataset.panel);
    if (b.dataset.panel === 'local') loadLocalSessions();
  });
});
document.querySelectorAll('[data-close-panel]').forEach((b) => {
  b.addEventListener('click', () => toggleHomePanel(b.dataset.closePanel));
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const home = $('#view-home');
    if (home && ['panel-assistant', 'panel-board', 'panel-local', 'panel-run'].some((c) => home.classList.contains(c))) {
      ['panel-assistant', 'panel-board', 'panel-local', 'panel-run'].forEach((c) => home.classList.remove(c));
      document.querySelectorAll('.home-dock .dock-btn[data-panel]').forEach((x) => x.classList.remove('active'));
    }
  }
});
initDockParallax();
$('#home-chat-form').addEventListener('submit', (e) => {
  e.preventDefault();
  sendHomeChat($('#home-chat-input').value);
});
$('#btn-local-files').addEventListener('click', () => pickLocalFiles(false));
$('#btn-local-folder').addEventListener('click', () => pickLocalFiles(true));
$('#local-files').addEventListener('change', () => onLocalFilesChosen(false));
$('#local-folder').addEventListener('change', () => onLocalFilesChosen(true));
$('#btn-local-start').addEventListener('click', startLocalMake);
$('#btn-video-upload').addEventListener('click', () => $('#video-local-input').click());
$('#video-local-input').addEventListener('change', async (e) => {
  const files = Array.from(e.target.files || []);
  e.target.value = '';
  let ok = 0;
  let skip = 0;
  const status = $('#video-upload-status');
  if (status) status.textContent = '正在上传本地素材…';
  for (const f of files) {
    if (f.size > 200 * 1024 * 1024) { skip++; continue; }
    try {
      const r = await uploadAsset('video', f);
      uploadedVideoFiles.push(r.file);
      ok++;
    } catch (err) {
      toast(`上传失败：${f.name} ${err.message}`, true);
    }
  }
  if (status) status.textContent = `已上传 ${ok} 个本地素材${skip ? `（跳过 ${skip} 个超大文件）` : ''}，将随视频任务一起使用`;
  toast(`本地视频素材已上传 ${ok} 个`);
});
$('#btn-article-upload').addEventListener('click', () => $('#article-image-input').click());
$('#article-image-input').addEventListener('change', async (e) => {
  const files = Array.from(e.target.files || []);
  e.target.value = '';
  let ok = 0;
  const status = $('#article-upload-status');
  if (status) status.textContent = '正在上传图片…';
  for (const f of files) {
    if (f.size > 8 * 1024 * 1024) continue;
    try {
      const r = await uploadAsset('image', f);
      const md = $('#article-md');
      md.value += `\n\n![上传图片-${++ok}](${r.file})\n`;
    } catch (err) {
      toast(`图片上传失败：${f.name} ${err.message}`, true);
    }
  }
  if (status) status.textContent = ok ? `已插入 ${ok} 张本地图片，请点击“生成预览”查看` : '未插入图片（单张限 8MB）';
  if (ok) renderArticlePreview();
});
$('#btn-make-cover-ai').addEventListener('click', makeCoverAi);
$('#btn-cover-upload').addEventListener('click', () => $('#cover-upload').click());
$('#cover-upload').addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if (f) handleCoverUpload(f);
  e.target.value = '';
});
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) setHomeFullscreen(false);
});
$('#btn-save-schedule').addEventListener('click', saveSchedule);
$('#btn-scan-now').addEventListener('click', runScanNow);
$('#btn-top-scan').addEventListener('click', runScanNow);
$('#top-scan-interval').addEventListener('change', () => {
  $('#scan-interval').value = $('#top-scan-interval').value;
  saveSchedule();
});
$('#scan-interval').addEventListener('change', () => {
  $('#top-scan-interval').value = $('#scan-interval').value;
  saveSchedule();
});

document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'hub-config') openConfigForm();
});

function exportPosterPng() {
  const svg = $('#preview-body svg');
  if (!svg) return;
  const xml = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = svg.width.baseVal.value;
    canvas.height = svg.height.baseVal.value;
    canvas.getContext('2d').drawImage(img, 0, 0);
    canvas.toBlob((pngBlob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(pngBlob);
      a.download = 'poster.png';
      a.click();
    });
  };
  img.src = url;
}

let pendingAdd = null;

function setAddStatus(msg, isError = false) {
  const el = $('#add-status');
  if (!el) return;
  if (!msg) {
    el.hidden = true;
    return;
  }
  el.textContent = msg;
  el.className = 'add-status' + (isError ? ' error' : '');
  el.hidden = false;
}

function looksApi(src) {
  if (/^https?:\/\/(www\.)?github\.com/i.test(src || '') || /^[\w.-]+\/[\w.-]+(@|$)/.test(src || '')) return false;
  return /localhost|11434|v1|api\.|sk-|completions/i.test(src || '');
}

function openAddDialog() {
  $('#add-kind').value = 'auto';
  $('#add-fields').hidden = true;
  $('#add-source').value = '';
  $('#add-name').value = '';
  $('#add-base').value = '';
  $('#add-model').value = '';
  $('#add-key').value = '';
  setAddStatus('');
  $('#add-dialog').showModal();
}

function onAddKindChange() {
  const kind = $('#add-kind').value;
  $('#add-fields').hidden = !(kind === 'api' || kind === 'llm' || kind === 'jimeng');
  setAddStatus('');
}

async function runAdd() {
  let kind = $('#add-kind').value;
  const source = $('#add-source').value.trim();
  if (kind === 'auto') kind = looksApi(source) ? 'llm' : 'skill';
  if ((kind === 'skill') && !source) {
    toast('请粘贴 skill / 插件网址或名称', true);
    return;
  }
  const payload = {
    kind,
    source,
    name: $('#add-name').value.trim() || (kind === 'jimeng' ? '即梦' : source || '未命名'),
    baseUrl: $('#add-base').value.trim() || (source.startsWith('http') ? source : ''),
    model: $('#add-model').value.trim() || 'qwen2.5:3b',
    apiKey: $('#add-key').value.trim()
  };
  const btn = $('#btn-add-run');
  btn.disabled = true;
  btn.textContent = '处理中…';
  setAddStatus('');
  try {
    const r = await api('/api/install', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (r.needKey) {
      pendingAdd = payload;
      $('#key-title').textContent = `需要密钥 · ${r.name || '该服务'}`;
      $('#key-note').textContent = r.reason || '请输入 API Key 后继续添加';
      $('#key-input').value = '';
      $('#key-dialog').showModal();
    } else {
      const msg = r.message || (r.ok ? '添加成功' : '完成');
      if (r.partial) {
        setAddStatus(msg + (r.output ? '\n' + r.output : ''), true);
        toast('部分安装未完成，请查看状态提示', true);
      } else {
        setAddStatus(msg + (r.output ? '\n' + r.output : ''), false);
        toast(msg);
      }
      if (!r.cliPath && !r.skillPath) $('#add-dialog').close();
      await refresh();
    }
  } catch (err) {
    const detail = (err && err.output) || '';
    setAddStatus(err.message + (detail ? '\n' + detail : ''), true);
    toast(err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = '一键添加';
  }
}

async function submitKey() {
  if (!pendingAdd) return;
  const key = $('#key-input').value.trim();
  if (!key) {
    toast('密钥不能为空', true);
    return;
  }
  pendingAdd.apiKey = key;
  try {
    const r = await api('/api/install', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(pendingAdd)
    });
    const msg = r.message || '添加成功';
    setAddStatus(msg + (r.output ? '\n' + r.output : ''), !!r.partial);
    toast(r.partial ? '已添加，但部分环境未生效' : msg, !!r.partial);
    $('#key-dialog').close();
    $('#add-dialog').close();
    await refresh();
    pendingAdd = null;
  } catch (err) {
    setAddStatus(err.message, true);
    toast(err.message, true);
  }
}

function openConfigForm() {
  if (!config) return;
  const ensureOption = (sel, value, label) => {
    if (!sel || !value) return;
    const exists = Array.from(sel.options).some((o) => o.value === value);
    if (!exists) {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = `${label}：${value}`;
      sel.appendChild(opt);
    }
    sel.value = value;
  };
  $('#cfg-niche').value = config.workflow.niche;
  $('#cfg-audience').value = config.workflow.audience;
  $('#cfg-style').value = config.workflow.style;
  $('#cfg-platforms').value = (config.workflow.platforms || []).join(', ');
  $('#cfg-max-items').value = config.workflow.maxItems;
  $('#cfg-max-picks').value = config.workflow.maxPicks;
  $('#cfg-ai-enabled').checked = !!config.ai.enabled;
  $('#cfg-ai-url').value = config.ai.baseUrl;
  $('#cfg-ai-model').value = config.ai.model;
  $('#cfg-ai-key').value = config.ai.apiKey;
  $('#cfg-image-model').value = config.ai.imageModel || 'pollinations-flux';
  $('#cfg-video-model').value = config.ai.videoModel || 'capcut';
  ensureOption($('#cfg-image-model'), config.ai.imageModel || 'pollinations-flux', '自定义图片模型');
  ensureOption($('#cfg-video-model'), config.ai.videoModel || 'capcut', '自定义视频模型');
  $('#cfg-sources').value = JSON.stringify(config.sources || [], null, 2);
  $('#cfg-integrations').value = JSON.stringify(config.integrations || {}, null, 2);
  api('/api/sources').then((src) => {
    $('#cfg-category-sources').value = JSON.stringify(src.categories || {}, null, 2);
  }).catch(() => {
    $('#cfg-category-sources').value = '{}';
  });
  $('#config-dialog').showModal();
}

$('#btn-save-config').addEventListener('click', async () => {
  let sources;
  try {
    sources = JSON.parse($('#cfg-sources').value || '[]');
  } catch {
    toast('信息来源 JSON 格式错误', true);
    return;
  }
  let categorySources = null;
  const rawCat = $('#cfg-category-sources').value.trim();
  if (rawCat) {
    try {
      categorySources = JSON.parse(rawCat);
      if (!categorySources || typeof categorySources !== 'object' || Array.isArray(categorySources)) throw new Error('bad');
    } catch {
      toast('分类信息来源 JSON 格式错误', true);
      return;
    }
  }
  let integrations;
  try {
    integrations = JSON.parse($('#cfg-integrations').value || '{}');
  } catch {
    toast('集成配置 JSON 格式错误', true);
    return;
  }
  const body = {
    workflow: {
      niche: $('#cfg-niche').value,
      audience: $('#cfg-audience').value,
      style: $('#cfg-style').value,
      platforms: $('#cfg-platforms').value.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
      maxItems: Number($('#cfg-max-items').value),
      maxPicks: Number($('#cfg-max-picks').value)
    },
    sources,
    ...(categorySources ? { categorySources } : {}),
    integrations,
    ai: {
      enabled: $('#cfg-ai-enabled').checked,
      baseUrl: $('#cfg-ai-url').value,
      model: $('#cfg-ai-model').value,
      apiKey: $('#cfg-ai-key').value,
      imageModel: $('#cfg-image-model').value,
      videoModel: $('#cfg-video-model').value
    }
  };
  try {
    await api('/api/config', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    $('#config-dialog').close();
    toast('配置已保存');
    await refresh();
  } catch (err) {
    toast(err.message, true);
  }
});

function tickClock() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const el = $('#clock');
  if (el) el.textContent = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

tickClock();
setInterval(tickClock, 1000);

setInterval(async () => {
  if (currentView === 'home' && !document.hidden) {
    try {
      await loadContent();
      renderHomeHot();
    } catch {}
  }
}, 60000);

setInterval(() => {
  if (currentView === 'home' && !dragState) renderGraph();
}, 60000);

setInterval(() => {
  if (currentView === 'publish') refreshVideoProgressEls().catch(() => {});
}, 8000);
setInterval(refreshWorkflowStatus, 1000);
refresh().catch((err) => toast(err.message, true));
