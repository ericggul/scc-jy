# 똥멍 콘텐츠 확장 매뉴얼

## 목표

너무 사적인 배변의 작은 사건을, 명상 서비스가 과하게 정중하게 다루는 4분
33초짜리 사물극으로 만든다. 모바일 UI에 웰니스 산업 비판이나 의료 조언을
직접 쓰지 않는다.

## 반드시 맞출 것

- `components/model/scripts/<slug>.ts`의 27문장 reader 원고
- `components/model/guided-meditations.ts`의 slug, 제목, 설명, 이미지 경로
- `public/meditations/<slug>.png`의 가로 카드 사진
- `components/mobile/background/profiles.ts`의 interaction/accumulation profile
- `socket/experiments/ddong-meong.mjs`의 동일 slug와 제목

카드 사진은 Korean everyday bathroom 또는 public restroom의 deadpan editorial
photo로, 사람·신체 부위·노골적 배설물·텍스트·로고 없이 장면의 구체적인 세
단서를 담는다.

## 물질과 상호작용

배경은 낙하의 시작·중간·도착과 화면 하단의 단일 축적층을 보여야 한다. 색이나
속도만 달리한 재사용 대신 실루엣, cadence, 공간 경로 중 둘 이상을 바꾼다.
reader 시작 뒤 자동 낙하가 반복되어야 하며, 탭·드래그·홀드는 자동 낙하와
구별되는 즉각적인 응답을 만들어야 한다.

## 완료 전 점검

- 제목, 사진, 원고, profile, socket 제목이 한 slug를 공유하는가?
- 사진의 사물이 reader 원고에서 실제로 돌아오는가?
- 27문장과 273초, 기존 reader·audio·flush 흐름을 유지했는가?
- 자동·탭·드래그·홀드 모두에서 낙하가 명확한가?
- UI에 의료 조언이나 사회 비평의 표어를 새로 넣지 않았는가?
