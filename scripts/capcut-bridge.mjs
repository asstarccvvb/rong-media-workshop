import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const CAPCUT_PROJECT = 'C:\\Users\\xh\\Documents\\ChatGPT\\视频';
export const JOBS_DIR = process.env.CAPCUT_JOBS_DIR || path.join(CAPCUT_PROJECT, 'jobs');

function pad(n) {
  return String(n).padStart(2, '0');
}

function fmtSrtTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  const ms = Math.floor((sec - s) * 1000);
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)},${String(ms).padStart(3, '0')}`;
}

export function textToSrt(text, segSeconds = 3) {
  const cleaned = String(text || '')
    .replace(/```/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
  const segments = cleaned
    .split(/(?<=[。！？!?；;])|\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const cues = [];
  let t = 0;
  for (const seg of segments) {
    const dur = Math.max(2, Math.min(6, Math.ceil(seg.length / 12)));
    cues.push({ start: t, end: t + dur, text: seg });
    t += dur;
  }
  return cues
    .map((c, i) => `${i + 1}\n${fmtSrtTime(c.start)} --> ${fmtSrtTime(c.end)}\n${c.text}\n`)
    .join('\n');
}

export function srtToCaptions(srt) {
  const out = [];
  const cueRe = /(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})\n([\s\S]*?)(?=\n\n|\n\d+\n|$)/g;
  let m;
  while ((m = cueRe.exec(srt)) !== null) {
    const toMs = (h, mm, s, ms) => ((Number(h) * 3600 + Number(mm) * 60 + Number(s)) * 1000 + Number(ms));
    out.push({
      start: toMs(m[1], m[2], m[3], m[4]) * 1000,
      end: toMs(m[5], m[6], m[7], m[8]) * 1000,
      text: m[9].trim()
    });
  }
  return out;
}

export async function buildCapCutJob({ config, classified, processedText, produced }, opts = {}) {
  const run = produced.run || new Date().toISOString().slice(0, 16).replace(/[-T:]/g, '');
  const jobDir = path.join(JOBS_DIR, run);
  await fs.mkdir(jobDir, { recursive: true });

  const title = `爆点速递 · ${run}`;
  const width = Number(opts.width) || 1920;
  const height = Number(opts.height) || 1080;
  const srt = textToSrt(processedText || '');
  const srtFile = path.join(jobDir, 'subtitles.srt');
  await fs.writeFile(srtFile, srt, 'utf8');

  const voiceFile = path.join(jobDir, 'voiceover.txt');
  await fs.writeFile(voiceFile, processedText || '', 'utf8');

  const items = (classified && classified.items ? classified.items : []).slice(0, 5);
  const rawImages = opts.images || [];
  const rawVideos = opts.videos || [];
  const noRawMaterial = rawImages.length === 0 && rawVideos.length === 0;
  const capcutMate = (config.integrations && config.integrations.capcutMate) || {};
  const aiTool = noRawMaterial ? String(capcutMate.aiTool || '剪映图文成片') : null;
  const materials = {
    run,
    title,
    poster: produced.poster || null,
    images: rawImages,
    videos: rawVideos,
    hasRawMaterial: !noRawMaterial,
    news: items.map((it) => ({
      title: it.title,
      source: it.source,
      link: it.link,
      category: it.category,
      spread: it.spread
    }))
  };
  const materialsFile = path.join(jobDir, 'materials.json');
  await fs.writeFile(materialsFile, JSON.stringify(materials, null, 2), 'utf8');

  const job = {
    run,
    title,
    draft: {
      width,
      height,
      name: opts.title || title
    },
    assets: {
      poster: produced.poster ? path.resolve(produced.poster) : null,
      images: rawImages,
      videos: rawVideos
    },
    subtitles: srtFile,
    voiceover: {
      textFile: voiceFile,
      audioFile: null
    },
    captions: srtToCaptions(srt),
    steps: noRawMaterial
      ? ['open_jianying_ai_tool', 'use_voiceover_text', 'gen_video']
      : ['create_draft', 'add_images', 'add_captions', 'add_audios', 'gen_video'],
    aiTool,
    apiBase: capcutMate.api || 'http://127.0.0.1:30000',
    cloudBase: capcutMate.cloud || 'https://capcut-mate.jcaigc.cn',
    capcutMateDir: capcutMate.dir || 'integrations/capcut-mate',
    notes: noRawMaterial
      ? '本任务没有可用视频/图片素材：交给剪映“图文成片/AI成片”，使用 voiceover.txt 作为文案，由剪映 AI 自动匹配画面并成片；剪映内核已内置 integrations/capcut-mate。'
      : '读取本目录 job.json，按 steps 调用 CapCut Mate API（http://localhost:30000/openapi/capcut-mate/v1）；素材可通过本地文件服务器（如 127.0.0.1:8901）提供 URL；配音用剪映内置 TTS 或 edge-tts 生成后 add_audios。'
  };
  const jobFile = path.join(jobDir, 'job.json');
  await fs.writeFile(jobFile, JSON.stringify(job, null, 2), 'utf8');

  const readme = [
    `# 剪映自动制作任务 · ${run}`,
    '',
    `标题：${title}`,
    '',
    '## 本目录内容',
    '',
    '- `job.json`：CapCut Mate 执行清单（草稿尺寸、字幕、步骤）',
    '- `subtitles.srt`：自动生成的字幕',
    '- `voiceover.txt`：配音文本（可在剪映内用 TTS 配音）',
    '- `materials.json`：素材清单（海报 + 本期新闻条目）',
    '',
    '## 执行方式',
    '',
    noRawMaterial
      ? '1. 无素材：打开剪映「图文成片 / AI成片」，粘贴 voiceover.txt 为文案，AI 自动配画面后导出；'
      : '1. 启动 CapCut Mate（integrations/capcut-mate，localhost:30000）与剪映；'
    ,
    '2. 按 `job.json.steps` 调用 CapCut Mate API；',
    '3. 有素材时按 create_draft → add_images/videos → add_captions → add_audios → gen_video；',
    '4. 配音：将 `voiceover.txt` 交给剪映 TTS，或先 `edge-tts` 生成 mp3 再 add_audios。',
    ''
  ].join('\n');
  const readmeFile = path.join(jobDir, 'README.md');
  await fs.writeFile(readmeFile, readme, 'utf8');

  return {
    run,
    dir: jobDir,
    files: [readmeFile, jobFile, srtFile, voiceFile, materialsFile]
  };
}
