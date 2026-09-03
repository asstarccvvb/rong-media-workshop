import { parseRss, parseHtmlLinks, parseManualText } from './pipeline.mjs';

const xml = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <item>
      <title><![CDATA[测试标题A]]></title>
      <link>https://a.com</link>
      <pubDate>Wed, 02 Sep 2026 10:00:00 GMT</pubDate>
      <description><![CDATA[<p>摘要A</p>]]></description>
    </item>
    <item>
      <title>测试标题B</title>
      <link>https://b.com</link>
      <pubDate>Wed, 02 Sep 2026 11:00:00 GMT</pubDate>
      <description>摘要B</description>
    </item>
  </channel>
</rss>`;

const rssItems = parseRss(xml, '样例源');
console.log('RSS 解析条数:', rssItems.length);
for (const it of rssItems) {
  console.log(' -', it.title, '|', it.link, '|', it.publishedAt, '|', it.summary);
}

const manual = parseManualText('钟睒睒捐赠万泰生物3300万股 https://a.com\n石头科技20CM涨停 报135元/股 市值350亿元 https://b.com');
console.log('手动素材解析条数:', manual.length);
for (const it of manual) {
  console.log(' -', it.title, '|', it.link);
}

const html = `<html><body>
<a href="/politics/20260902/123.html">国务院常务会议审议通过审计法实施条例修订草案</a>
<a href="https://www.example.com/finance/456.html">央行开展公开市场操作 维护流动性合理充裕</a>
<a href="javascript:void(0)">无效链接</a>
<a href="#">空链接</a>
<a href="/short">短标题</a>
</body></html>`;
const htmlItems = parseHtmlLinks(html, '样例官网', 'https://www.example.com/');
console.log('官网 HTML 解析条数:', htmlItems.length);
for (const it of htmlItems) {
  console.log(' -', it.title, '|', it.link);
}

if (rssItems.length !== 2 || manual.length !== 2 || htmlItems.length !== 2) {
  console.error('自检失败');
  process.exit(1);
}
console.log('自检通过');
