// 카드뉴스 HTML에 로컬 이미지를 base64로 embed
const fs = require('fs');
const path = require('path');

const inputName = process.argv[2] || 'cardnews-12.html';
const htmlFile = path.join(__dirname, inputName);
const outFile = path.join(__dirname, inputName.replace('.html', '-embed.html'));

let html = fs.readFileSync(htmlFile, 'utf-8');

// './images/owm1.jpg' 같은 로컬 이미지 모두 찾기
const matches = [...html.matchAll(/url\(['"]?(\.\/images\/[^'"\)]+)['"]?\)/g)];
console.log(`발견된 로컬 이미지: ${matches.length}개`);

const seen = new Set();
for (const m of matches) {
  const relPath = m[1];
  if (seen.has(relPath)) continue;
  seen.add(relPath);

  const absPath = path.join(__dirname, relPath);
  if (!fs.existsSync(absPath)) {
    console.log(`  ⚠️ 파일 없음: ${absPath}`);
    continue;
  }
  const ext = path.extname(absPath).slice(1).toLowerCase();
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
  const buf = fs.readFileSync(absPath);
  const base64 = buf.toString('base64');
  const dataUrl = `data:${mime};base64,${base64}`;
  console.log(`  ✓ ${relPath} (${(buf.length / 1024 / 1024).toFixed(1)} MB)`);

  // HTML 내 모든 해당 경로를 data URL로 치환
  html = html.split(relPath).join(dataUrl);
}

// 안내 문구 제거 (embed 버전에선 불필요)
html = html.replace(/<div class="notice">[\s\S]*?<\/div>\s*<div class="download-all">/, '<div class="download-all">');

fs.writeFileSync(outFile, html, 'utf-8');
const size = fs.statSync(outFile).size;
console.log(`\n✅ 생성: cardnews-12-embed.html (${(size / 1024 / 1024).toFixed(1)} MB)`);
console.log(`   이 파일은 이미지가 내장돼서 다운로드도 정상 작동합니다.`);
