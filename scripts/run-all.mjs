import { loadConfig, runAll } from './pipeline.mjs';

const manualFile = process.argv[2];
let manualText = '';
if (manualFile) {
  const { readFile } = await import('node:fs/promises');
  manualText = await readFile(manualFile, 'utf8');
}

try {
  const config = await loadConfig();
  const result = await runAll(config, manualText);
  console.log('全流程运行完成：');
  console.log('  ① 搜集信息 ->', result.collected.run, `(${result.collected.count} 条)`);
  console.log('  ② 整合信息 ->', result.integrated.file);
  console.log('  ③ 信息分类 ->', result.classified.run, `(${result.classified.count} 条)`);
  console.log('  ④ 信息处理 ->', result.processed.file);
  console.log('  ⑤ 海报/视频 ->', result.produced.poster, '+', result.produced.script);
  console.log('  ⑥ 分发 ->', result.distributed.file);
} catch (err) {
  console.error('运行失败：', err.message);
  process.exitCode = 1;
}
