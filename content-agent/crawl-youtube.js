// 유튜브 채널 자막(대본) 크롤링 → txt 파일로 저장
// 자동 생성 자막 또는 수동 자막을 텍스트로 추출

const fs = require('fs');
const path = require('path');

// ⚠️ 여기에 채널 핸들 또는 채널 ID 입력
const CHANNEL_HANDLE = '@bsn_';

(async () => {
  const outputDir = path.join(__dirname, 'columns', 'youtube-scripts');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  console.log('');
  console.log('📥 유튜브 자막 크롤링 시작');
  console.log(`🎬 채널: ${CHANNEL_HANDLE}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  try {
    // 1. 채널 페이지에서 영상 목록 가져오기
    console.log('📡 채널 영상 목록 가져오는 중...');

    const channelUrl = `https://www.youtube.com/${CHANNEL_HANDLE}/videos`;
    const res = await fetch(channelUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'ko-KR' }
    });
    const html = await res.text();

    // 영상 ID 추출
    const videoIds = [...new Set(
      (html.match(/\"videoId\":\"([a-zA-Z0-9_-]{11})\"/g) || [])
        .map(m => m.match(/\"([a-zA-Z0-9_-]{11})\"/)[1])
    )].slice(0, 100); // 최대 100개

    console.log(`📄 ${videoIds.length}개 영상 발견\n`);

    let count = 0;

    for (const videoId of videoIds) {
      try {
        // 영상 정보 가져오기
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const videoRes = await fetch(videoUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'ko-KR' }
        });
        const videoHtml = await videoRes.text();

        // 제목 추출
        const titleMatch = videoHtml.match(/<title>([\s\S]*?) - YouTube<\/title>/);
        const title = titleMatch ? titleMatch[1].trim() : videoId;

        // 업로드 날짜 추출
        const dateMatch = videoHtml.match(/\"publishDate\":\"(\d{4}-\d{2}-\d{2})\"/);
        const dateStr = dateMatch ? dateMatch[1] : 'unknown';

        // 2022년 이전 영상 스킵
        if (dateStr !== 'unknown' && dateStr < '2022-01-01') {
          console.log(`  ⬜ [스킵] ${title.slice(0, 40)}... (2022년 이전)`);
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }

        // 자막 URL 추출
        const captionMatch = videoHtml.match(/\"captionTracks\":\[([\s\S]*?)\]/);

        let transcript = '';

        if (captionMatch) {
          // 자막 트랙에서 한국어 자막 URL 찾기
          const captionData = captionMatch[1];
          const urlMatch = captionData.match(/\"baseUrl\":\"([\s\S]*?)\"/);

          if (urlMatch) {
            let captionUrl = urlMatch[1].replace(/\\u0026/g, '&');

            // 자막 XML 가져오기
            const captionRes = await fetch(captionUrl);
            const captionXml = await captionRes.text();

            // XML에서 텍스트만 추출
            transcript = captionXml
              .replace(/<\/?text[^>]*>/g, '\n')
              .replace(/<[^>]*>/g, '')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
              .replace(/\n{2,}/g, '\n')
              .trim();
          }
        }

        if (!transcript) {
          console.log(`  ⬜ [${count + 1}] ${title.slice(0, 40)}... (자막 없음)`);
          count++;
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }

        // 파일 저장
        const safeName = title.replace(/[\\/:*?"<>|]/g, '').slice(0, 50).trim();
        const filename = `${dateStr}_${safeName}.txt`;
        const filepath = path.join(outputDir, filename);

        const fileContent = `제목: ${title}\n날짜: ${dateStr}\nURL: https://www.youtube.com/watch?v=${videoId}\n\n${'='.repeat(50)}\n\n${transcript}`;

        fs.writeFileSync(filepath, fileContent, 'utf-8');
        count++;
        console.log(`  ✅ [${count}] ${title.slice(0, 40)}...`);

        // 요청 간격 (차단 방지)
        await new Promise(r => setTimeout(r, 2000));

      } catch (err) {
        console.log(`  ❌ 에러: ${err.message.slice(0, 50)}`);
        continue;
      }
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📁 총 ${count}개 영상 자막 저장 완료!`);
    console.log(`📂 저장 위치: ${outputDir}`);
    console.log('');

  } catch (err) {
    console.error('❌ 에러:', err.message);
    console.log('');
    console.log('💡 채널 핸들이 맞는지 확인하세요.');
    console.log(`   현재 설정: ${CHANNEL_HANDLE}`);
    console.log(`   확인: https://www.youtube.com/${CHANNEL_HANDLE}`);
    process.exit(1);
  }
})();
