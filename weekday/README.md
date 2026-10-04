# TOPIA Weekday Class 랜딩 페이지

TOPIA어학원 중계캠퍼스 저학년 매일반(Weekday Class) 인스타그램 광고용 랜딩 페이지입니다.
상담 신청 정보는 구글 스프레드시트 "Weekday Class 상담 신청 (랜딩 페이지)"에 저장됩니다.

## 구성

| 파일 | 내용 |
| --- | --- |
| `index.html` | 페이지 본문 (B안 디자인) |
| `styles.css` | Weekday Class 디자인 시스템 색·서체·컴포넌트 + 페이지 스타일 |
| `app.js` | 상담 신청 폼 검증·전송, UTM 수집, Meta 픽셀 (설정 시) |
| `config.js` | **설정 파일** – 저장 주소(endpoint)와 Meta 픽셀 ID |
| `assets/img/` | 대표 이미지, TOPIA어학원 워드마크 |
| `apps-script/Code.gs` | 구글 시트에 신청을 저장하는 Apps Script 코드 |

외부 라이브러리 없이 HTML·CSS·JS만으로 동작합니다. 서체는 Pretendard(jsDelivr)와 Fraunces(Google Fonts)를 불러옵니다.

## 신청 데이터 흐름

1. 학부모가 폼을 제출하면 `app.js`가 `config.js`의 `endpoint`(Apps Script 웹 앱)로 JSON을 POST합니다. (`Content-Type: text/plain` – 사전 요청 없이 전송)
2. `Code.gs`의 `doPost`가 값을 다시 검증하고 시트 첫 번째 탭에 한 줄을 추가합니다.
   - 접수일시(Asia/Seoul) · 학부모 성함 · 연락처 · 자녀 학년 · 재학 학교 · 궁금한 점 · 개인정보 동의 · 유입 경로(UTM) · 페이지 주소 · 처리 상태(신규) · 담당자 · 메모
3. 응답이 `{"ok": true}`이면 완료 화면을 보여 주고, Meta 픽셀이 설정되어 있으면 `Lead` 이벤트를 보냅니다.

스팸 방지: 화면에 보이지 않는 `website` 칸이 채워져 오면 저장하지 않습니다. 셀 수식 주입(`=`, `+`, `-`, `@`로 시작)은 막습니다.

## Apps Script 배포 설정

- 시트 → 확장 프로그램 → Apps Script → `Code.gs` 붙여 넣기
- 배포 → 새 배포 → 웹 앱
  - 다음 사용자 인증 정보로 실행: **나**
  - 액세스 권한이 있는 사용자: **모든 사용자** (로그인하지 않은 학부모도 저장할 수 있어야 함)
- 코드를 고친 뒤에는 "배포 관리 → 수정 → 새 버전"으로 다시 배포해야 반영됩니다. (주소는 그대로)
- 새 신청 알림 메일: `Code.gs` 맨 위 `NOTIFY_EMAIL`에 주소 입력 후 재배포

## 홈페이지로 옮길 때 (개발팀 참고)

- 이 폴더 전체를 홈페이지 하위 경로(예: `/weekday/`)에 그대로 올리면 동작합니다. 경로는 모두 상대 경로입니다.
- 픽셀: `config.js`의 `pixelId`에 Meta 픽셀 ID 입력
- 광고 링크에는 UTM을 붙여 주세요. 예: `?utm_source=instagram&utm_medium=paid&utm_campaign=weekday_dec&utm_content=feed_a`
- 저장 위치를 CM으로 바꾸려면 `config.js`의 `endpoint`를 CM API 주소로 바꾸고, 같은 JSON 형식을 받도록 구현하면 됩니다.

## 남은 확인 사항

- 캠퍼스 주소 표기 (하단 `[캠퍼스 주소]`)
- 개인정보 보유 기간 문구("상담 종료 후 1년")가 사내 개인정보 처리방침과 맞는지
- 학원 광고 표시 의무(등록번호·교습비) 관할 교육청 기준 확인
