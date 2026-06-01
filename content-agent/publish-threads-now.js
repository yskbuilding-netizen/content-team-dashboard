// 스레드 즉시 발행
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const Threads = require('./threads');

const threadsText = `사옥으로 사면 대출이 90%까지 나올 수 있다.
임대용이랑은 한도 자체가 다르다.

회사가 직접 들어가서 쓰면 은행이 안전하게 본다.
재무제표 깨끗하고 매출 잘 나오면 시설자금대출이 더 얹어진다.
합쳐서 LTV 80~90%까지 가능한 케이스가 있다.

작년에 만난 제조업 대표님. 100억 빌딩에 88억 대출. 취득세까지 자기자본 17억으로 매입했다.

단, 부동산 임대업만 있는 법인이나 신규법인은 요즘 대출 자체가 잘 안 나온다.

사옥 매입 생각 있으면 매물보다 은행 먼저 가라.`;

(async () => {
  console.log('');
  console.log('🚀 스레드 발행 시작');
  console.log('━━━━━━━━━━━━━━━━━━━━');
  console.log(threadsText);
  console.log('━━━━━━━━━━━━━━━━━━━━');
  console.log(`글자수: ${threadsText.length}자`);
  console.log('');

  if (!Threads.isConfigured()) {
    console.error('❌ Threads API 미설정');
    process.exit(1);
  }

  const result = await Threads.publish(threadsText);

  if (!result.success) {
    console.error('❌ 발행 실패:', result.error);
    process.exit(1);
  }

  console.log('✅ 스레드 발행 완료!');
  console.log(`🔗 ${result.url || 'https://www.threads.net/@bsn__official'}`);
  console.log('');
})();
