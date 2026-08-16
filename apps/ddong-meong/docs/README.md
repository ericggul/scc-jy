# 똥멍 / ddong-meong

## 한 문장 정의

**똥멍은 똥 싸는 동안의 몇 분을 4분 33초짜리 명상 형식으로 다루는, 최정윤
(Jeanyoon Choi)의 유머러스한 인터랙티브 웹앱이자 전시장 연동 작업이다.**

모바일에서는 배변의 사적인 순간을 과하게 차분하고 정중한 명상 경험으로
대한다. 전시장 화면은 그 세션의 집계와 흐름을 별도 화면으로 드러낸다. 풍자는
모바일 UI의 해설이 아니라 두 화면의 관계에서 발생한다.

## 정식 구조

이 앱에는 번호별 변형이나 버전 선택이 없다. 정식 경로는 다음과 같다.

- `/` — QR 진입, splash와 닉네임 흐름
- `/main` — 8개 콘텐츠 목록
- `/<content-slug>` — 각 4분 33초 콘텐츠
- `/screen` — 전시장 화면
- `/testing/<visual>` — 내부 배경 실험 화면; 검색 비노출

기존 `/4/...` 주소는 같은 번호 없는 정식 주소로 영구 리디렉션한다. `/1`, `/2`,
`/3`은 더 이상 제공하지 않는다.

QR 캠페인에는 루트 주소에 선택적 위치 맥락을 붙일 수 있다.

```text
/?institution=kaist&building=n25
/?institution=kaist&building=n25&floor=2&gender=women
/?location=kaist/n25
/?institution=kaist&building=n25&context.zone=east
```

`institution`, `building`, `floor`, `gender`와 최대 12개의 `context.<name>` 값은
현재 브라우저 탭 안에서만 다음 세션으로 전달된다. 위치 정보는 UI에 별도
표시하지 않는다.

## 현재 콘텐츠 계약

모든 콘텐츠는 273초(4분 33초)와 27개의 안정된 reader 문장을 유지한다. 제목,
카드 사진, 설명, reader 원고, interactive-accumulation profile과 socket 세션
제목은 같은 slug로 연결된다. 새 콘텐츠를 만들 때는
[콘텐츠 확장 매뉴얼](./content-manual.md)을 따른다.

## 구현 경계

- `components/mobile/`은 QR 진입, 콘텐츠 목록, reader, 세션을 담당한다.
- `components/screen/`은 전시장 화면을 담당한다.
- `components/model/`은 콘텐츠와 세션 도메인 데이터를 담당한다.
- `components/transport/`와 `socket/experiments/ddong-meong.mjs`는 똥멍만의
  소켓 이벤트와 추상 세션 상태를 담당한다.
- 카드 사진은 `public/meditations/`, 오디오는 `public/audio/`, flush 아이콘은
  `public/icons/`에 둔다.

서버는 세션·시간·상호작용·위치 맥락 같은 도메인 상태만 다룬다. 브라우저는
각자 색, 크기, 애니메이션과 레이아웃을 파생한다.

## 검색·공유·분석

루트 layout은 `똥멍: 똥싸며 멍때리기`를 기본 제목으로 사용하며, 모든 페이지
제목도 같은 이름을 포함한다. sitemap, robots, canonical URL, Open Graph와
Twitter 카드, WebApplication JSON-LD는 UI를 바꾸지 않고 `app/`에서 제공한다.
공유 카드는 현재 `public/meditations/thick-poop-imagination.png`를 공통으로
쓴다. `public/llms.txt`는 작품의 성격·작가·해석 경계를 짧은 기계 판독용
텍스트로 제공한다.

Google Analytics 측정 ID는 `G-N5RM30V2JJ`다. `localhost`, `.local`, loopback과
사설 LAN 주소에서는 Google tag를 로드하지 않는다. QR의 `institution`,
`building`, `floor`, `gender`, `context.*` 값은 GA page URL로 보내지 않는다.
캠페인 비교가 필요하면 `utm_source`, `utm_medium`, `utm_campaign`,
`utm_content`, `utm_term`만 사용한다.
