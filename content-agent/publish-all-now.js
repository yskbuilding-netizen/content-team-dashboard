// 스레드 + 링크드인 동시 발행
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const Threads = require('./threads');
const LinkedIn = require('./linkedin');

const sharedText = `"40억에 사서 100억에 팔면 60억 벌었다."

근데 손에 남는 건 30억이다.
법인으로 사면 40억.

명의 하나로 10억이 갈린다.

왜?

8년 보유 기준.

▸ 부대비용 10억
취득세 1.8억
중개·법무 0.5억
리모델링 6.5억
재산세 0.8억
매각 중개 0.9억

40억대는 종부세 X.
차익 60억 - 부대 10억 = 과세 대상 50억.

▸ 개인 매도
양도세 49.5%
8년 장특공 16%
세금 약 20억

▸ 법인 매도
법인세 + 지방세 22%
장특공 없음
세금 약 10억

▸ 실제 수익
개인 30억
법인 40억

법인의 진짜 매력은 재투자다.
차익을 개인으로 빼는 매수자 거의 못 봤다.
다음 빌딩에 재투자한다.
자산이 눈덩이처럼 불어난다.
가족 법인이면 증여·상속까지 풀린다.

매입 명의부터 설계하라.`;

(async () => {
  console.log('\n🚀 스레드 + 링크드인 발행\n━━━━━━━━━━━━━━━━━━━━━━━━');

  console.log('\n📱 [1/2] 스레드 발행 중...');
  if (Threads.isConfigured()) {
    const r = await Threads.publish(sharedText);
    if (r.success) {
      console.log('  ✅ 스레드 발행 완료');
      console.log('  🔗 ' + (r.url || 'https://www.threads.net/@bsn__official'));
    } else console.log('  ❌ ' + r.error);
  } else console.log('  ⚠️ 스레드 API 미설정');

  console.log('\n💼 [2/2] 링크드인 발행 중...');
  if (LinkedIn.isConfigured()) {
    const r = await LinkedIn.publish(sharedText);
    if (r.success) {
      console.log('  ✅ 링크드인 발행 완료');
      console.log('  🔗 ' + (r.url || 'https://www.linkedin.com'));
    } else console.log('  ❌ ' + r.error);
  } else console.log('  ⚠️ 링크드인 API 미설정');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━\n✅ 완료!\n');
})();
