const fs = require('fs');

const input = process.argv[2];
const s = fs.readFileSync(input, 'utf8');

function clean(html) {
  return html
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<\/(?:p|h[1-6]|li|div|pre|blockquote|tr)>/g, '\n')
    .replace(/<hr[^>]*>/g, '\n---\n')
    .replace(/<td[^>]*>/g, ' | ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function findMatchingDivEnd(text, start) {
  let depth = 0;
  let pos = start;
  while (pos < text.length) {
    const openIdx = text.indexOf('<div', pos);
    const closeIdx = text.indexOf('</div>', pos);
    if (openIdx === -1 && closeIdx === -1) return text.length;
    if (openIdx !== -1 && (closeIdx === -1 || openIdx < closeIdx)) {
      depth++;
      pos = openIdx + 4;
    } else {
      depth--;
      if (depth === 0) return closeIdx + 6;
      pos = closeIdx + 6;
    }
  }
  return text.length;
}

const userRe = /<div class="user-message-query-text">([\s\S]*?)<\/div>/g;

let m;
let userCount = 0;

console.log('===== USER MESSAGES =====');
while ((m = userRe.exec(s)) !== null) {
  userCount++;
  console.log(`\n----- USER ${userCount} -----\n${clean(m[1])}`);
}

console.log('\n\n===== AGENT TURNS =====');

const turnRe = /<div class="turn__agent-message"[^>]*>([\s\S]*?)<\/div>/g;
let turnCount = 0;
let idx = 0;
while ((idx = s.indexOf('class="turn__agent-message"', idx)) !== -1) {
  const openTagStart = s.lastIndexOf('<div', idx);
  const openTagEnd = s.indexOf('>', idx) + 1;
  const end = findMatchingDivEnd(s, openTagStart);
  const inner = s.slice(openTagEnd, end - '</div>'.length);
  turnCount++;
  console.log(`\n----- TURN ${turnCount} -----\n${clean(inner)}`);
  idx = end;
}

console.log(`\n\nTOTAL: user=${userCount} turns=${turnCount}`);
