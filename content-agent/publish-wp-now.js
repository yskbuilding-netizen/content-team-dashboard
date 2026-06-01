// 워드프레스 발행
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const Publisher = require('./publisher');

const title = '사옥으로 사면 대출 최대 90%까지 나올 수 있다 — 빌딩 담보대출 한도는 용도에 따라 갈린다';

const body = `사옥용으로 직접 쓴다고 하면 대출이 잘 나오는 편이다. 사업자가 직접 입주해 현금흐름이 안정적이기 때문이다.

여기에 재무제표가 깨끗하고 매출·영업이익이 안정적이면 시설자금대출이 더 얹어진다. 합산 LTV 80~90%까지 열릴 수 있다. 100억 빌딩이면 80~90억까지 대출이 나올 수 있다는 뜻이다. 케이스에 따라 자기자본 10~20억으로 100억 빌딩 매입이 가능한 경우도 있다.

작년에 본 한 제조업 대표는 100억 빌딩에 LTV 88%, 88억까지 한도가 나왔다. 취득세까지 자기자본 약 17억 정도로 매입했다.


/ 단, 이런 경우는 한도 받기 어렵다 /

부동산 임대업만 등록된 법인과 신규법인은 최근 대출 받기가 어렵다.

사옥용 90% 한도는 실제로 사업하고 매출이 잡히는 법인에 주로 열리는 한도다. 빌딩 매입을 위해 법인을 옮길 계획이 있다면 최소 2~3년 전부터 준비해야 한다.

지금 시장은 직접 사용 목적의 매수 법인에 우호적이다. 이 시장에서 가장 유리한 사람은 실제 사업을 운영 중인 사옥 매수자다.

막연히 "90% 나오겠지"가 아니라, 먼저 은행에 연락해서 내 법인 상황을 파악하는 게 우선이다.`;

function convertToHtml(text) {
  return text.split('\n').map(line => {
    const t = line.trim();
    const m = t.match(/^\/\s*(.+?)\s*\/$/);
    if (m) return `<h2>${m[1]}</h2>`;
    return line;
  }).join('\n');
}

const article = {
  title,
  content: convertToHtml(body),
  tags: ['사옥매입', '빌딩대출', '시설자금대출', 'LTV', '법인부동산', '꼬마빌딩', '상업용부동산', '빌딩투자', 'BSN', '빌사남'],
  summary: '사옥용으로 직접 쓴다고 하면 빌딩 담보대출이 최대 LTV 90%까지 나올 수 있다. 재무제표 양호 + 시설자금대출 조합 시 100억 빌딩에 80~90억까지 한도. 단, 부동산 임대업만 등록된 법인이나 신규법인은 최근 대출 자체가 잘 안 나온다.'
};

(async () => {
  console.log('\n📤 워드프레스 발행...');
  console.log(`📌 ${title}\n`);
  const result = await Publisher.publishToWordPress(article);
  if (!result.success) { console.error('❌', result.error); process.exit(1); }
  console.log('✅ 임시저장 완료');
  console.log(`🔗 ${result.postUrl}`);
  console.log(`✏️ ${result.editUrl}\n`);
})();
