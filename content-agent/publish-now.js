// 즉시 발행 스크립트 (수정한 글을 이미지와 함께 워드프레스에 업로드)
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const WP_SITE_URL = process.env.WP_SITE_URL;
const WP_USERNAME = process.env.WP_USERNAME;
const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD;

function authHeader() {
  const credentials = Buffer.from(`${WP_USERNAME}:${WP_APP_PASSWORD}`).toString('base64');
  return `Basic ${credentials}`;
}

// Unsplash 무료 이미지 (상업용 가능, 빌딩/금융 관련)
const IMAGES = {
  featured: {
    url: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=1600&q=80',
    filename: 'seoul-building-main.jpg',
    alt: '서울 도심 빌딩'
  },
  rate: {
    url: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=1200&q=80',
    filename: 'interest-rate.jpg',
    alt: '금리와 빌딩 투자'
  },
  location: {
    url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80',
    filename: 'prime-location.jpg',
    alt: '강남 핵심 상권 빌딩'
  },
  prepare: {
    url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1200&q=80',
    filename: 'investment-prepare.jpg',
    alt: '투자 준비'
  }
};

// 이미지를 다운받아 워드프레스 미디어 라이브러리에 업로드
async function uploadImage(imageInfo) {
  console.log(`  ⬇️  다운로드: ${imageInfo.filename}`);
  const imgRes = await fetch(imageInfo.url);
  if (!imgRes.ok) throw new Error(`이미지 다운로드 실패: ${imgRes.status}`);
  const buffer = Buffer.from(await imgRes.arrayBuffer());

  console.log(`  ⬆️  업로드: ${imageInfo.filename}`);
  const uploadRes = await fetch(`${WP_SITE_URL}/wp-json/wp/v2/media`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader(),
      'Content-Type': 'image/jpeg',
      'Content-Disposition': `attachment; filename="${imageInfo.filename}"`
    },
    body: buffer
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`업로드 실패 ${uploadRes.status}: ${err}`);
  }

  const media = await uploadRes.json();
  console.log(`  ✅ 완료: ID=${media.id}`);
  return { id: media.id, url: media.source_url };
}

// 태그 생성/조회
async function getOrCreateTags(tagNames) {
  const ids = [];
  for (const name of tagNames) {
    try {
      const searchRes = await fetch(
        `${WP_SITE_URL}/wp-json/wp/v2/tags?search=${encodeURIComponent(name)}`,
        { headers: { 'Authorization': authHeader() } }
      );
      const existing = await searchRes.json();
      if (Array.isArray(existing) && existing.length > 0) {
        ids.push(existing[0].id);
      } else {
        const createRes = await fetch(`${WP_SITE_URL}/wp-json/wp/v2/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': authHeader() },
          body: JSON.stringify({ name })
        });
        if (createRes.ok) {
          const tag = await createRes.json();
          ids.push(tag.id);
        }
      }
    } catch (err) {
      console.error(`태그 에러 (${name}):`, err.message);
    }
  }
  return ids;
}

(async () => {
  try {
    console.log('');
    console.log('📤 빌사남 칼럼 워드프레스 업로드');
    console.log('=====================================');
    console.log('');

    // 1. 이미지 업로드
    console.log('🖼️  이미지 업로드 중...');
    const featured = await uploadImage(IMAGES.featured);
    const rateImg = await uploadImage(IMAGES.rate);
    const locationImg = await uploadImage(IMAGES.location);
    const prepareImg = await uploadImage(IMAGES.prepare);
    console.log('');

    // 2. 본문 작성 (이미지 포함)
    const content = `<p>2022년 하반기, 담보대출금리가 7%를 넘어가면서 빌딩 시장은 얼어붙었다. 거래량은 반토막이 났고, 매물은 쌓였다. 그로부터 3년, 시장의 분위기가 다시 바뀌고 있다.</p>

<p>2026년 4월 기준, 재무상태가 괜찮은 법인은 3%대 금리로 대출이 가능하다. 불과 2년 전과 비교하면 절반 수준이다. 필자가 현장에서 만나는 투자자들도 이런 변화를 체감하고 있다. 작년까지만 해도 관망하던 분들이 올해 들어 다시 매물을 찾기 시작했다.</p>

<h2>1. 금리가 빌딩 시장을 결정한다</h2>

<figure class="wp-block-image size-large">
<img src="${rateImg.url}" alt="${IMAGES.rate.alt}" />
</figure>

<p>빌딩은 대부분 대출을 끼고 매입한다. 100% 현금으로 사는 경우는 거의 없다. 매매가의 절반 이상을 레버리지로 조달하는 것이 일반적이다. 결국 금리가 오르고 내리는 것은 시장의 온도를 결정하는 핵심 변수다.</p>

<p>금리가 1% 떨어지면 30억짜리 빌딩의 연간 이자는 3천만 원 줄어든다. 한 달 임대료 몇 개월치가 고스란히 수익으로 바뀌는 셈이다. 반대로 1% 오르면 그만큼 부담이 늘어난다. 같은 건물, 같은 임차인이라도 금리에 따라 수익률이 완전히 달라진다.</p>

<p>2023년 1분기, 빌딩 시장은 사실상 멈춰 있었다. 모두가 금리가 어디까지 오를지 눈치만 보고 있던 시기다. 그러다 2024년 초부터 금리가 내려가기 시작했고, 거래가 다시 살아났다. 지금은 안정세에 접어든 구간이다.</p>

<h2>2. 싸게 사는 것보다 잘 사는 것이 중요하다</h2>

<figure class="wp-block-image size-large">
<img src="${locationImg.url}" alt="${IMAGES.location.alt}" />
</figure>

<p>금리가 내려간다고 아무 빌딩이나 사면 안 된다. 시장이 좋을 때는 어디든 팔리지만, 어려워지면 팔리는 곳만 팔린다. 이것이 환금성이다.</p>

<p>강남, 역삼, 신사, 청담. 이런 지역은 시장이 어려워도 매수 대기자가 있다. 반대로 외곽의 어중간한 건물은 급매로 내놔도 반응이 없다. 필자는 매입 전에 반드시 그 지역의 거래량부터 확인한다. 거래가 많은 곳이 곧 매수 수요가 많은 곳이고, 가격이 떨어져도 회복이 빠르다.</p>

<p>싸게 사려다 입지를 포기하는 실수가 가장 흔하다. 가격이 싼 데는 이유가 있다. 도로가 좁거나, 유동인구가 적거나, 상권이 약한 경우다. 이런 건물은 공실이 계속 나고, 임대료는 떨어지고, 결국 헐값에 처분하게 된다.</p>

<h2>3. 지금 준비할 것</h2>

<figure class="wp-block-image size-large">
<img src="${prepareImg.url}" alt="${IMAGES.prepare.alt}" />
</figure>

<p>금리가 낮아졌다고 바로 매입하라는 얘기가 아니다. 지금은 준비하는 시기다.</p>

<p><strong>첫째, 가용자금을 정리하라.</strong> 예금, 주식 등 현금화 가능한 자산과 추가로 담보 제공할 수 있는 부동산을 파악해야 한다.</p>

<p><strong>둘째, 은행 지점장을 만나라.</strong> 주거래은행만이 아니라 세 곳 이상 비교해야 한다. 같은 금액이라도 금리가 1% 차이 나는 경우가 흔하다.</p>

<p><strong>셋째, 투자지역을 좁혀라.</strong> 서울 안에서도 거래가 꾸준한 지역, 외국인 관광객이 찾는 상권 위주로 후보지를 정해두어야 한다.</p>

<p>연초는 은행 대출 한도가 가장 넉넉한 시기다. 상반기 안에 준비를 끝내는 것이 유리하다. 상반기가 지났다면 하반기가 시작되는 7월이 대출 받기에 좋은 시기다.</p>

<h2>결론</h2>

<p>금리는 시장을 움직이는 가장 강한 변수다. 그러나 금리만 보고 투자하면 안 된다. 좋은 입지의 건물을 제값에 사는 것, 환금성이 보장된 지역을 고르는 것, 감당 가능한 수준의 대출을 받는 것. 이 세 가지 원칙은 금리와 상관없이 지켜야 한다.</p>

<p><strong>지금은 분명 괜찮은 시기다. 하지만 준비된 사람에게만 그 기회가 보인다.</strong></p>`;

    // 3. 태그 생성
    console.log('🏷️  태그 생성 중...');
    const tagIds = await getOrCreateTags([
      '빌딩투자', '금리인하', '꼬마빌딩', '상권분석',
      '환금성', '대출전략', '서울빌딩', '2026년부동산', '강남빌딩', '빌사남'
    ]);
    console.log(`  ✅ 태그 ${tagIds.length}개 준비 완료`);
    console.log('');

    // 4. 포스트 발행
    console.log('📝 포스트 발행 중...');
    const postRes = await fetch(`${WP_SITE_URL}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader()
      },
      body: JSON.stringify({
        title: '금리 인하기, 지금 빌딩을 사야 하는 이유',
        content,
        status: 'draft', // 임시저장 (검토 후 공개)
        excerpt: '2026년 금리 인하기, 빌딩 투자를 준비해야 할 시기다. 금리만 보지 말고 입지, 환금성, 감당 가능한 대출 이 세 가지 원칙을 지켜야 한다.',
        tags: tagIds,
        featured_media: featured.id // 대표이미지 설정
      })
    });

    if (!postRes.ok) {
      const err = await postRes.text();
      throw new Error(`포스트 생성 실패 ${postRes.status}: ${err}`);
    }

    const post = await postRes.json();

    console.log('');
    console.log('✅ 워드프레스 업로드 완료!');
    console.log('=====================================');
    console.log(`📌 제목: ${post.title.rendered}`);
    console.log(`🖼️  대표이미지: 설정 완료`);
    console.log(`🏷️  태그: ${tagIds.length}개`);
    console.log(`📊 상태: 임시저장 (draft)`);
    console.log('');
    console.log(`🔗 미리보기: ${post.link}`);
    console.log(`✏️ 편집: ${WP_SITE_URL}/wp-admin/post.php?post=${post.id}&action=edit`);
    console.log('');
    console.log('👉 워드프레스에서 확인 후 "공개" 버튼을 눌러 발행하세요.');
    console.log('');
  } catch (err) {
    console.error('');
    console.error('❌ 에러 발생:', err.message);
    console.error('');
    process.exit(1);
  }
})();
