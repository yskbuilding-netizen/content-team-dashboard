// 링크드인 즉시 발행
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const LinkedIn = require('./linkedin');

const linkedinText = `빌딩 담보대출 한도는 용도에 따라 갈립니다.

임대용으로 매입하면 한도가 보수적으로 잡힙니다. 임차인 공실 위험을 은행이 같이 부담해야 하니까요.

반대로 사옥용으로 직접 쓴다고 하면 한도가 올라갑니다. 회사가 직접 입주해서 쓰니 은행 입장에서 현금흐름이 훨씬 안정적이거든요.

여기에 재무제표 깨끗하고 매출·영업이익이 안정적이면 시설자금대출이 추가로 얹어집니다. 합산 LTV 80~90%까지 열리는 경우도 있습니다. 100억 빌딩이면 80~90억까지 대출이 나올 수 있고, 자기자본 10~20억으로 매입이 가능한 케이스도 있다는 얘기입니다.

작년에 만난 한 제조업 대표님 사례입니다. 100억 빌딩에 LTV 88%, 88억까지 한도가 나왔습니다. 취득세까지 다 합쳐도 자기자본 약 17억으로 매입했습니다.

다만 이 한도가 모든 법인에 열리는 건 아닙니다.

부동산 임대업만 등록된 법인이나 신규법인은 최근 대출 자체가 잘 안 나옵니다. 매입 목적 페이퍼 법인을 은행이 갈수록 깐깐하게 보고 있고, 신규법인은 재무제표가 없어서 한도 산정 자체가 어렵습니다.

사옥용 90% 한도는 실제로 사업하고 매출이 잡히는 법인에 주로 열리는 한도입니다. 빌딩 매입을 위해 법인을 옮길 계획이라면 최소 2~3년 전부터 준비하셔야 합니다.

지금 시장은 직접 사용 목적의 매수 법인에 우호적입니다. 막연히 "90% 나오겠지"가 아니라, 매물 보기 전에 먼저 은행에 연락해서 내 법인 상황부터 파악하는 게 우선입니다.

#사옥매입 #빌딩대출 #시설자금대출 #법인부동산 #BSN #빌사남`;

(async () => {
  console.log('');
  console.log('🚀 링크드인 발행 시작');
  console.log('━━━━━━━━━━━━━━━━━━━━');
  console.log(`글자수: ${linkedinText.length}자`);
  console.log('');

  if (!LinkedIn.isConfigured()) {
    console.error('❌ LinkedIn API 미설정');
    process.exit(1);
  }

  const result = await LinkedIn.publish(linkedinText);

  if (!result.success) {
    console.error('❌ 발행 실패:', result.error);
    process.exit(1);
  }

  console.log('✅ 링크드인 발행 완료!');
  console.log(`🔗 ${result.url || 'https://www.linkedin.com'}`);
  console.log('');
})();
