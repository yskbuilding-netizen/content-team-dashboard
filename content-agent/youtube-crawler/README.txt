빌사남TV 자막 크롤러 사용법
================================

[준비]
1. Python 3.8+ 설치 (없으면 https://www.python.org/downloads/)
   설치 시 "Add Python to PATH" 체크 필수.

[실행]
- 방법 A: 「실행하기.bat」 더블클릭
- 방법 B: CMD에서
    python crawl_bsn_tv.py "https://www.youtube.com/@빌사남TV/videos"

[채널 URL 확인 방법]
1) 유튜브에서 "빌사남TV" 검색
2) 채널 페이지 들어간 뒤 주소창에서 @핸들 부분 복사
   예) https://www.youtube.com/@빌사남TV → 뒤에 /videos 붙이기
3) 그 URL을 bat 파일 인자로 넣거나 crawl_bsn_tv.py 의 CHANNEL_URL_DEFAULT 수정

[결과물]
- transcripts/                       ← 영상별 .txt 파일 (제목 + 본문)
- transcripts/_index.json            ← 영상 리스트 메타데이터

[옵션 조정]
- 날짜 변경: crawl_bsn_tv.py 의 DATE_AFTER = "20230101"
- 언어 우선순위: LANGS = "ko,ko-KR,a.ko,en"
  (a.ko = 자동생성 한국어 자막)

[문제 해결]
- 429 / 봇 차단 메시지가 뜨면 IP가 잠시 차단된 겁니다.
  30분~1시간 후 재시도하거나, 같은 폴더에 쿠키를 추가:
    yt-dlp 명령에 --cookies-from-browser chrome 옵션을 추가하려면
    crawl_bsn_tv.py download_subs 함수의 cmd 리스트에 해당 옵션을 넣으세요.
- 이미 받은 파일은 자동 skip 되므로 중단 후 재실행해도 됩니다.
