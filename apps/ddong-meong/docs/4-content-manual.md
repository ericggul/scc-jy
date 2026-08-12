# 똥멍 4 콘텐츠 확장 매뉴얼

`ddong-meong/4`에 콘텐츠를 더할 때의 기준이다. 이 문서는 제목만 추가하는
카탈로그 작업을 막기 위한 제작 계약이며, 다음 작업자가 같은 정서와 구현
연결을 유지할 수 있게 한다.

## 한 문장 목표

**너무 사적인 배변의 작은 사건을, 명상 서비스가 과하게 정중하게 다루는
4분 33초짜리 사물극으로 만든다.**

모바일 화면은 attention economy나 웰니스 산업 비판을 설명하지 않는다. 웃음은
고상한 명상 형식과 구수하고 민망한 사건이 한 화면에 너무 진지하게 놓일 때
생긴다. 비판은 모바일과 screen의 기록·공개 관계에서만 구조적으로 남긴다.

## 반드시 보존할 것

- 작업 범위는 `/4`다. `/3`은 현재 상태를 보존한다.
- 한 콘텐츠는 **27개의 안정된 문장**과 **273초(4분 33초)**를 가진다.
- 제목, 카드 사진, 카드 설명, reader 원고, `AccumulationProfile`, socket의
  세션 제목은 같은 slug로 맞물린다.
- 카드의 자연 사진이나 일반적인 풍경 사진으로 빠져나가지 않는다. 사진에는
  상황을 읽게 하는 구체적인 욕실 사물이 있어야 한다.
- 기존 카드·reader·flush·오디오·QR 진입 화면의 형상과 상호작용을 콘텐츠 추가
  과정에서 재설계하지 않는다.

## 미디어아트 background의 여섯 가지 강제 조건

background는 단순한 갈색 분위기나 제목별 색상 테마가 아니다. 이 작업에서
사용자는 설명을 읽지 않아도 **무언가 배출되어 아래로 떨어지고, 누르면 자기
자리에서 더 떨어진다**는 사실을 보아야 한다. 새 콘텐츠를 만들 때 아래 여섯
조건을 모두 충족하지 못하면 profile 추가를 멈춘다.

1. **낙하가 직관적이어야 한다.** 화면 위에서 출발해 아래의 기존 축적층으로
   향하는 시작·중간·도착이 있어야 한다. `/3`에서 이어진 하단의 쌓인 똥은
   공통 배경 상태로 보존한다. 개별 낙하 입자는 그 표면에서 사라지되, 그 위에
   별도의 잔류 zone·가짜 웅덩이·두 번째 축적층을 만들지 않는다. 연기, 배경
   노이즈, 추상 파도만으로 낙하를 대체하지 않는다.
2. **서로 다른 운동 문법이어야 한다.** 같은 stream에 색·속도만 바꿔
   이름을 붙이지 않는다. 최소한 실루엣(알갱이/끈/덩어리), cadence(단발/이어짐/
   분기), 공간 경로(한 줄/코일/여러 갈래) 중 둘 이상이 기존 콘텐츠와 달라야
   한다.
3. **내용의 사건과 연결돼야 한다.** `급함`이면 압력과 빠른 도착, `기다림`이면
   뜸과 머뭇거림, `서로의 얼룩`이면 서로 어긋나는 분기가 보이는 식이다. 제목의
   속담 뜻을 그림으로 번역하지 말고, 그 장면의 시간감을 물질에 옮긴다.
4. **미디어아트이면서 calm해야 한다.** 변기·인체·똥 아이콘을 문자 그대로
   그리지 않는다. 제한된 흙빛 팔레트, 낮은 광택, 유기적 불규칙성, 충분한 여백을
   쓴다. 다만 너무 희미해서 배출 동작이 안 보이면 calm이 아니라 실패다.
5. **성능 예산 안에 있어야 한다.** 기존 30fps render loop, profile별 고정
   particle/solid 수, 자동 품질 하향의 범위에서 만든다. 새 material kind는 기존
   shader branch를 보존하고, 무한 생성·DOM particle·프레임별 React state를
   넣지 않는다.
6. **자동과 상호작용이 모두 작동해야 한다.** reader가 시작된 뒤 자동 낙하가
   스스로 반복되어야 하며, 탭은 즉시 한 번의 명확한 낙하, 드래그는 이동 경로의
   연속 낙하, 홀드는 지속 낙하를 만들어야 한다. 새 profile은 `interaction`
   값으로 이 세 반응의 양·세기·속도를 내용에 맞춰 정한다.

자동 낙하를 끈다고 해서 interaction-only 콘텐츠를 만드는 일은 금지다. 반대로
손가락을 눌러도 자동 효과와 구별되지 않는 약한 변화만 나오는 것도 금지다.

## 좋은 출발점

속담, 지역 표현, 가족 단톡방의 말, 화장실에서 혼자 떠오르는 과장된 상상처럼
이미 리듬과 관점을 가진 한국어가 좋다. 속담을 제목으로 쓸 때는 뜻풀이를
제목이나 카드 설명으로 바꾸지 않는다. 속담이 만든 어긋난 장면 하나를 고른다.

| 출발 말 | 사물극의 질문 | 방 안의 세 단서 |
| --- | --- | --- |
| 개똥도 약에 쓰려면 없다 | 왜 찾는 순간에만 없는가 | 산책줄 · 빈 갈색 병 · 빈 접시 |
| 똥 누러 갈 적 마음 다르고 올 적 마음 다르다 | 같은 문을 통과했는데 왜 마음이 달라졌나 | 떨어진 가방 · 닫힌 문 · 가지런한 슬리퍼 |
| 똥 묻은 개가 겨 묻은 개 나무란다 | 왜 남의 작은 얼룩이 먼저 보이나 | 거울 · 두 켤레 슬리퍼 · 접은 수건 |

출발 말이 없더라도 이 세 칸을 먼저 채운다. 세 단서가 나오지 않으면 아직
카드 사진과 원고가 분리된 상태다.

## 톤의 기준

### 해야 할 것

- 한 문장은 욕실 안에서 실제로 볼 법한 물건, 소리, 자세, 민망한 생각을
  하나만 다룬다.
- 자기를 너무 대단하게 만들지 않고, 그 순간의 사람이 조금 우스워질 여지를
  둔다.
- 문장 하나쯤은 약간 엉뚱하게 정확해야 한다. 예: `회의록은 남기지
  않습니다.`, `화장실에서 성찰도 길어지면 피곤해집니다.`
- 끝은 교훈이 아니라 작고 물리적인 행동으로 닫는다. 손 씻기, 슬리퍼 찾기,
  가방 들기, 문 열기, 물 내리기 같은 행동이 좋다.

### 하지 말 것

- `쾌변도 스펙이 된다`, `구독으로 낫지 않는다`, KPI, 알고리즘, 생산성처럼
  비판 대상을 직접 선언하지 않는다.
- 의학적 조언, 치료 약속, 배변 상태의 정상/비정상 판정을 넣지 않는다.
- `호흡을 느껴보세요`, `몸을 받아들이세요`만 반복해 어느 콘텐츠에도 붙는
  추상 명상문으로 만들지 않는다.
- 사람, 동물, 실제 배설물을 사진에 노골적으로 보여주거나 똥 이모지·cartoon
  오브젝트로 농담을 대신하지 않는다.
- 속담을 윤리 수업으로 끝내지 않는다. 상황의 어색함을 남기고 멈춘다.

## 27문장 구조

원고는 각 줄이 reader에서 독립적으로 지나간다. 한 문장에 설명을 두 겹으로
쌓지 않는다. 아래는 고정 문구가 아니라 리듬의 뼈대다.

| 문장 위치 | 역할 |
| --- | --- |
| 1–4 | 사건을 즉시 선언하고 욕실 안으로 들어온다. |
| 5–8 | 사진 속 사물 세 개 중 둘 이상을 불러온다. |
| 9–13 | 너무 진지해진 생각을 한 번 밀어 올린다. |
| 14–18 | 속담이나 그 어긋남을 직접 한 번만 회수한다. |
| 19–23 | 생각을 작은 물리 행동으로 되돌린다. |
| 24–27 | 교훈 대신 느슨한 퇴장, 물 내림, 손 씻기로 닫는다. |

속담 자체는 원고에서 한두 번이면 충분하다. 제목을 다시 읽는 것으로 원고를
채우지 않는다.

## 사진과 ImageGen

카드 사진은 `public/ddong-meong/4/meditations/<slug>.png`에 둔다. 기본 문법은
`photorealistic-natural`, 가로 16:9, Korean everyday bathroom, deadpan editorial
photograph다. ssamjang brown/cream 계열은 유지하되 콘텐츠마다 하나의 색·시간
단서를 다르게 둔다.

프롬프트에는 반드시 다음을 넣는다.

```text
Asset type: horizontal 16:9 card artwork for a Korean satirical toilet meditation.
Primary request: <한 문장 상황>.
Scene/backdrop: Korean everyday bathroom or public restroom.
Composition/framing: <세 단서가 모두 보이는 wide frame>.
Lighting/mood: <상황의 시간대와 색>.
Constraints: no people, no visible body parts, no bodily waste,
no text, no labels, no logos, no watermark, no cartoon poop.
```

사진을 생성한 뒤에는 실제 파일을 열어 세 단서가 모두 읽히는지 확인한다. 화면에
노출되는 소품과 원고의 소품이 다르면 사진을 다시 만들거나 원고를 바꾼다.

## 물질 profile 선택

`components/ddong-meong/4/mobile/background/profiles.ts`의 수치는 제목에 맞춘
색 테마가 아니라 시간적 행동을 만들어야 한다.

| 물질 형식 | 쓸 상황 | 파라미터 방향 |
| --- | --- | --- |
| `filament` | 부재, 탐색, 실마리가 거의 없는 날 | 긴 휴지, 좁은 lane, 낮은 pressure |
| `viscous-stream` | 급함 뒤의 안정, 한 번에 이어지는 사건 | 굵은 lane, 앞은 빠르고 뒤는 긴 pause |
| `solid-form` | 굵기, 덩어리, 조형적 기대 | 적은 solid count, 큰 point, 느린 flow |
| `heavy-column` | 급똥처럼 압력이 분명한 날 | 넓은 lane, 짧은 fall, 높은 pressure |
| `drifting-mist` | 변비, 오래 기다림, 대화가 잘 안 되는 날 | 드문 emission, 긴 fall, 낮은 flow |
| `liquid-burst` | 허세, 비교, 서로 다른 판단이 부딪히는 날 | 짧은 burst, 큰 drift, 불규칙한 third emission |
| `pellet-cluster` | 필요한데 없는 물건처럼, 띄엄띄엄 도착하는 작은 사건 | 눈에 읽히는 둥근 알갱이, 단발 cadence, 짧은 3개 묶음 |
| `segmented-rope` | 급함이 풀려서 몸의 리듬이 느슨해지는 장면 | 입자 전체가 다섯 개의 연결 마디를 이뤄, 한 덩이의 굵은 배설물이 내려감 |
| `counter-plop` | 둘 이상의 시선·말·얼룩이 서로 간섭하는 장면 | 입자가 좌우의 짧은 덩이 두 개를 만들고, 번갈아 field 아래로 내려감 |

새 profile은 `guidedAccumulationProfiles`에 모든 slug가 한 번씩 들어가야 한다.
기존 `materialKind`를 재사용할 때에도 앞의 여섯 조건 중 ‘서로 다른 운동 문법’을
만족하는지 먼저 검토한다. 색, pause, pressure만 바꾼 재사용은 허용하지 않는다.

### 자동 낙하와 손가락 낙하의 제작 계약

`AccumulationProfile`은 다음 두 층을 모두 가진다.

- `emission`과 `fall`은 입력이 없어도 반복되는 자동 낙하의 cadence·압력·경로를
  정한다. reader 시작 뒤 첫 phrase에서 물질이 보일 만큼 `coreAlpha`, 크기,
  particle/solid 수를 정한다.
- `interaction`은 탭·드래그·홀드의 응답을 정한다. 탭은 `pressAccumulationAmount`
  와 `pressVisualStrength`, 드래그는 `traceVolumeDistancePx`와
  `traceVisualStrength`, 홀드는 `holdStartDelayMs`, `holdIntervalMs`,
  `holdAccumulationAmount`로 다룬다.

기존 material kind로 가능한 차이가 아니라면 `AccumulationMaterialKind`와 shader에
새 branch를 추가한다. 그 branch는 자동 layer와 press/trace/hold layer 모두에
명시적으로 구현해야 한다. 한 쪽만 그린 branch는 완료가 아니다.

## 현재 8개 콘텐츠의 매핑

| slug | 제목의 사건 | 카드 사물 | 물질 |
| --- | --- | --- | --- |
| `morning-urgent` | 모닝똥 급함 | 아이스커피 · 사원증 · 슬리퍼 | 빠른 점성 흐름 |
| `emergency-chill` | 급똥 뒤 칠링 | 떨어진 가방 · 공중화장실 칸 | 넓은 압력 기둥 |
| `celebrity-applause` | 배변 레드카펫 | 플래시 · 벨벳 로프 · 변기 | 불규칙 burst |
| `thick-poop-imagination` | 굵기 상상 | 과장된 갈색 조형물 · 변기 | 느린 단단한 형태 |
| `constipation-dialogue` | 변비와 대화 | 자두주스 · 책 · 플라스틱 의자 | 드문 마른 흐름 |
| `dog-poop-remedy` | 필요한 순간의 부재 | 산책줄 · 빈 갈색 병 · 빈 접시 | 띄엄띄엄 떨어지는 둥근 알갱이 묶음 |
| `before-after-poop` | 들어갈 때와 나올 때의 마음 | 떨어진 가방 · 닫힌 문 · 슬리퍼 | 다섯 마디가 붙은 한 덩이의 굵은 배설물 |
| `muddy-dog-husk` | 서로의 얼룩 보기 | 거울 · 두 슬리퍼 · 수건 | 좌우에서 번갈아 떨어지는 두 개의 짧은 배설물 덩이 |

## 구현 순서

1. `model/scripts/<slug>.ts`에 `defineReadingScript(slug, [...27개])`를 만든다.
2. `model/guided-meditations.ts`에 slug, 제목, 설명, image path, script를 넣는다.
3. 새 카드 사진을 `public/ddong-meong/4/meditations/<slug>.png`로 복사한다.
4. `mobile/background/profiles.ts`에 profile을 만들고
   `guidedAccumulationProfiles`에 추가한다.
5. 새 운동 문법이 필요하면 `AccumulationMaterialKind`와 shader의 background,
   automatic, press/trace/hold 경로를 함께 추가한다. 기존 콘텐츠의 branch는
   바꾸지 않는다.
6. `apps/ddong-meong/socket/experiments/4/index.mjs`의 `contents`에 똑같은 slug와
   제목을 등록한다.
7. background lab에서 관찰할 필요가 있으면 registry에 고유 test slug를 추가한다.
8. 아래 검증을 통과한 뒤에만 “추가됨”이라고 기록한다.

## 완료 점검

```text
- [ ] 제목이 속담의 뜻풀이·사회 비평 표어가 아닌가?
- [ ] 카드 사진의 세 단서가 원고에 실제로 등장하는가?
- [ ] 원고는 정확히 27문장인가?
- [ ] 4분 33초, 기존 reader, audio, flush 동작을 바꾸지 않았는가?
- [ ] profile이 해당 slug에만 연결되고 파라미터의 시간적 이유가 있는가?
- [ ] 입력하지 않아도 자동 낙하가 보이고 반복되는가?
- [ ] 탭·드래그·홀드 각각이 자동 낙하와 구별되는 즉각적이고 충분한 낙하를
  만드는가?
- [ ] 기존 콘텐츠와 실루엣·cadence·공간 경로 중 둘 이상이 다른가?
- [ ] 30fps loop와 고정 geometry/particle 예산을 유지하는가?
- [ ] socket contents의 제목과 카드 제목이 같은가?
- [ ] pnpm exec tsc --noEmit, pnpm lint, ddong-meong socket tests를 통과했는가?
```

새로운 시도는 `4.md`에 콘텐츠·사진·profile의 관계와 실제 관찰 여부를 한 줄
이상 추가한다. 제대로 관찰하지 않은 브라우저 결과를 문서에 성공으로 쓰지
않는다.
