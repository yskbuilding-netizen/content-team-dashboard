// ========================================
// Daily Scheduler — 요일별 자동 콘텐츠 생성/발행
// 월: 시장분석 (뉴스기반)
// 수: 매입 노하우 (책+유튜브 기반)
// 금: 실전 사례 (뉴스+사례 결합)
// 토: 카드뉴스 자동 생성
// ========================================

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const fs = require('fs').promises;
const path = require('path');
const NewsScaper = require('./news-scraper');
const Generator = require('./generator');
const Publisher = require('./publisher');
const Threads = require('./threads');
const LinkedIn = require('./linkedin');

// 요일별 콘텐츠 전략
const SCHEDULE = {
  1: { // 월요일
    type: 'market_analysis',
    label: '시장 분석',
    useNews: true,
    topicHint: '최근 상업용 빌딩 시장 동향과 투자 전략',
    publishWeb: true,
    publishSocial: true
  },
  3: { // 수요일
    type: 'know_how',
    label: '매입 노하우',
    useNews: false,
    topicHint: '빌딩 매입 시 반드시 체크해야 할 것들',
    publishWeb: true,
    publishSocial: true
  },
  5: { // 금요일
    type: 'case_study',
    label: '실전 사례',
    useNews: true,
    topicHint: '최근 뉴스에서 본 실제 빌딩 거래 사례 분석',
    publishWeb: true,
    publishSocial: true
  },
  6: { // 토요일
    type: 'cardnews',
    label: '카드뉴스',
    useNews: false,
    topicHint: null, // 가장 최근 칼럼을 카드뉴스로 변환
    publishWeb: false,
    publishSocial: false,
    cardnewsOnly: true
  }
};

const Scheduler = {
  // 텔레그램 알림 (있으면)
  async notify(msg) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return;
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML' })
      });
    } catch (e) { console.error('알림 실패:', e.message); }
  },

  // 뉴스에서 오늘의 주제 도출
  async pickTopicFromNews(hint) {
    const news = await NewsScaper.fetchAll();
    if (news.length === 0) return hint;

    // 최근 5건 제목을 hint와 결합
    const headlines = news.slice(0, 5).map(n => `- ${n.title}`).join('\n');
    return `${hint}\n\n[최근 부동산 뉴스]\n${headlines}`;
  },

  // 메인 작업 실행
  async runDaily(forceDay = null) {
    const today = new Date();
    const dayOfWeek = forceDay !== null ? forceDay : today.getDay();
    const config = SCHEDULE[dayOfWeek];

    if (!config) {
      console.log(`📅 ${today.toLocaleDateString('ko-KR')}: 발행 안 하는 날`);
      return { skipped: true };
    }

    console.log(`\n🚀 ${today.toLocaleDateString('ko-KR')} ${config.label} 자동 발행 시작\n`);
    await this.notify(`🤖 빌사남 봇 시작\n📅 오늘: ${config.label}`);

    // 카드뉴스 전용 분기
    if (config.cardnewsOnly) {
      return await this.generateCardnews();
    }

    // 1. 뉴스 수집 + 주제 도출
    let topic = config.topicHint;
    let researchData = null;

    if (config.useNews) {
      console.log('📰 뉴스 수집 중...');
      const news = await NewsScaper.fetchAll();
      await NewsScaper.saveNews(news);

      if (news.length > 0) {
        const newsText = news.slice(0, 8).map(n =>
          `[${n.source || n.keyword}] ${n.title}\n${n.description}`
        ).join('\n\n');
        researchData = `[오늘의 부동산 뉴스]\n${newsText}`;
        topic = `${config.topicHint} (오늘 뉴스 기반)`;
      }
    }

    // 2. 워드프레스용 콘텐츠 생성
    console.log(`✍️ 콘텐츠 생성 중: ${topic.slice(0, 60)}...`);
    const wpContent = await Generator.generateContent(topic, 'wordpress', researchData);
    if (!wpContent.success) {
      const err = `❌ 생성 실패: ${wpContent.error}`;
      console.error(err);
      await this.notify(err);
      return { error: wpContent.error };
    }

    // 3. 워드프레스 발행 (임시저장)
    console.log('📤 워드프레스 발행...');
    const wpResult = await Publisher.publishToWordPress({
      title: wpContent.title,
      content: wpContent.content,
      tags: wpContent.tags,
      summary: wpContent.summary
    });

    if (wpResult.success) {
      console.log(`  ✅ ${wpResult.editUrl}`);
      await this.notify(
        `✅ 워드프레스 임시저장 완료\n\n` +
        `📌 ${wpContent.title}\n\n` +
        `검토 후 공개: ${wpResult.editUrl}`
      );
    } else {
      console.error(`  ❌ ${wpResult.error}`);
    }

    // 4. SNS 발행 (스레드 + 링크드인)
    if (config.publishSocial) {
      // 스레드용 짧은 콘텐츠 생성
      const threadsContent = await Generator.generateContent(topic, 'threads', researchData);
      if (threadsContent.success && Threads.isConfigured()) {
        const r = await Threads.publish(threadsContent.content);
        if (r.success) {
          console.log(`  ✅ 스레드 발행`);
          await this.notify(`📱 스레드 발행 완료`);
        }
      }

      // 링크드인 (워드프레스 본문 활용 가능)
      if (LinkedIn.isConfigured()) {
        const liText = `${wpContent.title}\n\n${wpContent.summary}\n\n자세히: ${wpResult.postUrl || 'buildingpartner.co.kr'}`;
        const r = await LinkedIn.publish(liText);
        if (r.success) {
          console.log(`  ✅ 링크드인 발행`);
          await this.notify(`💼 링크드인 발행 완료`);
        }
      }
    }

    console.log(`\n✅ ${config.label} 발행 완료`);
    return { success: true, type: config.type, wpEditUrl: wpResult.editUrl };
  },

  // 카드뉴스 자동 생성 (가장 최근 칼럼 기반)
  async generateCardnews() {
    console.log('🎨 카드뉴스 자동 생성\n');

    const draft = Generator.getLatestDraft('wordpress');
    if (!draft) {
      console.log('⚠️ 변환할 최근 칼럼이 없습니다');
      return { error: '최근 칼럼 없음' };
    }

    // formatter.js의 카드뉴스 변환 활용
    const Formatter = require('./formatter');
    if (!Formatter.toCardNews) {
      console.log('⚠️ formatter.js에 toCardNews 함수 없음 — 수동 작업 필요');
      return { error: 'formatter 미지원' };
    }

    const html = await Formatter.toCardNews(draft);
    const fileName = `cardnews-auto-${new Date().toISOString().slice(0, 10)}.html`;
    const filePath = path.join(__dirname, fileName);
    await fs.writeFile(filePath, html, 'utf-8');

    console.log(`✅ 카드뉴스 생성: ${fileName}`);
    await this.notify(`🎨 카드뉴스 생성됨\n${fileName}\n브라우저에서 열어 다운로드하세요.`);
    return { success: true, file: fileName };
  },

  // 크론 시작 (매일 오전 9시)
  startCron() {
    let cron;
    try {
      cron = require('node-cron');
    } catch (e) {
      console.log('⚠️ node-cron이 없습니다. 설치하세요: npm install node-cron');
      console.log('   대신 setInterval로 동작합니다 (매일 자정 체크)');
      return this.startInterval();
    }

    // 매일 오전 9시 발행
    cron.schedule('0 9 * * *', () => {
      console.log('\n⏰ 9시 자동 발행 트리거');
      this.runDaily().catch(e => console.error('실행 실패:', e.message));
    }, { timezone: 'Asia/Seoul' });

    console.log('⏰ 스케줄러 가동 — 매일 09:00 (KST) 자동 발행');
    console.log('   월/수/금: 칼럼 발행, 토: 카드뉴스 생성');
  },

  // node-cron 없을 때 폴백
  startInterval() {
    let lastDay = -1;
    setInterval(() => {
      const now = new Date();
      const day = now.getDate();
      // 매일 9시에 한 번만
      if (now.getHours() === 9 && day !== lastDay) {
        lastDay = day;
        this.runDaily().catch(e => console.error('실행 실패:', e.message));
      }
    }, 60 * 1000); // 1분마다 체크
    console.log('⏰ Interval 스케줄러 가동 (매일 09:00 KST)');
  }
};

// CLI 실행
if (require.main === module) {
  const arg = process.argv[2];
  if (arg === 'cron') {
    Scheduler.startCron();
    // 프로세스 유지
    process.stdin.resume();
  } else if (arg === 'now') {
    Scheduler.runDaily().then(r => {
      console.log('\n결과:', r);
      process.exit(0);
    });
  } else if (arg && /^[0-6]$/.test(arg)) {
    // 강제 요일 지정 (테스트용)
    Scheduler.runDaily(parseInt(arg)).then(r => {
      console.log('\n결과:', r);
      process.exit(0);
    });
  } else {
    console.log(`
사용법:
  node daily-scheduler.js cron     # 크론 모드 (24/7 가동)
  node daily-scheduler.js now      # 오늘 한 번만 실행
  node daily-scheduler.js 1        # 월요일 강제 실행 (테스트)
  node daily-scheduler.js 5        # 금요일 강제 실행 (테스트)
`);
  }
}

module.exports = Scheduler;
