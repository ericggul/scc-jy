# Multi-Device Web Artwork (MDWA)

이 문서는 SCC 및 향후 관련 프로젝트를 다루는 에이전트와 협업자가 Jeanyoon Choi의 Multi-Device Web Artwork(MDWA)를 일관되게 이해하기 위한 작업 문서다. 2022–2026년의 작품 계보뿐 아니라, 2026–27년에 발전 중인 `Parametric Interface`와 `State-based Architecture`를 현재의 핵심 이론으로 반영한다.

이 문서의 구분은 중요하다.

- **확립된 기반**: 여러 작품에서 반복적으로 구현되었거나 논문화가 진행된 MDWA의 매체적 특징.
- **2026–27 핵심 이론**: 앞으로의 MDWA를 설계하는 중심 원리. `Parametric Interface`와 `State-based Architecture`가 여기에 해당한다.
- **확장 가설**: 그래프, 미적분, 복잡계, 데투른망과 연결되는 유망한 방향. 아직 완결된 이론이나 검증된 과학적 모델로 과장하지 않는다.
- **작품별 진단**: 이론을 실제 작품에 비추어 가능성과 한계를 함께 기록한다.

## 1. 한 문장 정의

**MDWA는 웹으로 연결된 관객 소유 디바이스와 여러 설치 디바이스를 하나의 상호작용적·다채널 시스템으로 조직하고, 그 연결관계와 상태변화를 작품의 재료로 사용하는 매체다.**

작품은 단일 화면이나 개별 웹페이지에 있지 않다. 모바일, 화면, 프로젝터, 오디오, 서버, 관객, 공간 사이의 관계 전체에 존재한다. 따라서 MDWA의 최소 단위는 화면의 이미지가 아니라 **연결된 시스템**이다.

## 2. 무엇이 MDWA를 MDWA로 만드는가

단순히 화면이 많거나 같은 웹페이지를 여러 디바이스에서 여는 것만으로는 MDWA가 되지 않는다. 다음 특성이 중요하다.

### 2.1 웹은 배포 수단이 아니라 매체다

- 브라우저는 작품을 즉시 진입할 수 있게 하는 공통 실행 환경이다.
- 관객은 자신의 휴대폰을 설치의 일부로 가져오는 Bring Your Own Device 방식으로 참여한다.
- 웹 링크는 작품의 모듈이자 재설치 가능한 악보처럼 기능할 수 있다.
- WebSocket과 같은 실시간 통신은 기술적 편의가 아니라 디바이스 사이의 관계를 구성하는 재료다.

### 2.2 작품은 분산되어 있다

- 서로 다른 화면은 같은 이미지를 복제하는 대신 서로 다른 역할과 관점을 갖는다.
- 한 디바이스의 입력이 다른 디바이스의 출력과 연결된다.
- 전체 작품은 개별 노드가 아니라 노드 사이의 동기화, 지연, 분기, 충돌, 상태변화에서 출현한다.

### 2.3 모바일은 리모컨이 아니라 악기다

모바일 인터페이스의 중심은 모바일 화면 자체가 아니다. 관객이 모바일을 통해 주변 디바이스와 공간에 영향을 미치는 관계가 중심이다. 관객은 설치를 조작하는 사용자이면서 동시에 시스템을 연주하는 performer가 된다.

### 2.4 인터랙션은 장식이 아니라 서사와 시스템의 원인이다

좋은 MDWA에서 클릭, 스크롤, 기울기, 흔들기, 카메라, 이동, 이탈은 단순한 시각 효과를 발생시키는 입력이 아니다. 이들은 다음을 바꿀 수 있어야 한다.

- 작품의 상태
- 화면 사이의 연결관계
- 사용되는 매개변수와 계산 규칙
- 관객의 역할
- 작품이 제시하는 비평적 관점

### 2.5 Embedded Reality

MDWA는 디지털을 현실과 분리된 가상세계로 보내기보다, 현실의 디바이스·사람·공간 사이에 내재시킨다. 여기서 몰입은 헤드셋 안의 완결된 환영만을 뜻하지 않는다. 여러 실제 디바이스가 하나의 유기적 시스템처럼 반응할 때, 순수하게 디지털인 관계가 물리성과 공동성을 획득하는 상태를 가리킨다.

## 3. MDWA의 기존 이론적 기반

### 3.1 Instrumental Interaction

관객의 모바일은 입력 도구이고 주변 설치 디바이스는 영향을 받는 대상이다. 모바일을 기울이거나 흔들고, 스크롤하고, 손가락을 움직이는 행위는 브라우저 안의 조작을 넘어 공간 전체를 연주한다.

### 3.2 Cross-Device Interaction

디바이스 사이의 입력과 출력은 분리되면서도 동기화된다. 이 구조는 한 화면의 GUI에서 불가능한 상호작용을 만든다. 예를 들어 모바일의 이탈이 여섯 개 설치 화면의 전역 상태를 바꾸거나, 한 사람의 흔들기가 여러 화면의 3D 공간을 동시에 붕괴시킬 수 있다.

### 3.3 Parametric Mapping

관객의 raw input이 화면 효과와 직접 일대일 대응하는 대신 중간의 의미적·미학적 매개변수를 거친다.

```text
audience input -> parameter layer -> multi-channel output
```

예를 들어 흔들기의 가속도 값은 단지 오브젝트의 좌표가 아니라 `불안정성`, `균열`, `저항의 강도`와 같은 고차 매개변수로 번역될 수 있다. 작가는 이 mapping을 설계하는 instrument designer다.

이 개념은 아래의 **Parametric Interface**와 연결되지만 동일하지 않다. Parametric Mapping이 입력과 출력 사이의 번역에 초점을 둔다면, Parametric Interface는 일상적 UI 자체를 wrapper와 parameter의 합성으로 분해한다.

### 3.4 Semantic Interaction과 Phenomenological Interaction

- **입자적·semantic interaction**: 버튼, 선택, 언어, 분류처럼 의미가 분명하고 discrete한 상호작용.
- **파동적·phenomenological interaction**: 기울기, 흔들기, 속도, 몸의 움직임처럼 연속적이고 감각적인 상호작용.

MDWA는 어느 한쪽만 택하지 않는다. 의미를 가진 discrete 선택과 연속적인 bodily modulation을 결합하는 것이 중요하다.

## 4. 2026–27 핵심 이론 I: Parametric Interface

### 4.1 기본 도식

Everyday Interface 또는 Everyday UI를 다음과 같이 이해한다.

```text
I = W(a, b, c, ...)
```

- `W`: 인터페이스의 시각적·행동적 wrapper. 예: SNS feed, 뉴스 페이지, 메신저, 금융 차트, 지도, 광고, 이메일.
- `a, b, c`: wrapper 안에서 선택·정렬·표현되는 데이터와 상태 parameter.
- `I`: wrapper와 parameter가 결합되어 사용자가 경험하는 구체적인 인터페이스.

예를 들어 SNS feed는 하나의 고정된 형상이 아니라 다음과 같은 결합으로 볼 수 있다.

```text
SNS = FeedWrapper(author, content, engagement, rank, time, ...)
```

이 도식의 목적은 UI를 그대로 모방하는 데 있지 않다. 인터페이스를 분해하고, parameter를 다른 화면 및 다른 wrapper와 재결합하고, 관객 입력에 따라 연속적으로 조정할 수 있는 예술적 재료로 만드는 데 있다.

### 4.2 MDWA에서의 역할

여러 화면이 있을 때 각각을 독립된 페이지가 아니라 서로 다른 wrapper로 볼 수 있다.

```text
Screen_1 = W_1(p_1, p_2, p_3)
Screen_2 = W_2(p_1, p_4, p_5)
Mobile   = W_m(control(p_1, p_2, ...))
```

하나의 parameter 변화가 서로 다른 wrapper에서 전혀 다른 감각적 결과를 낼 수 있다. 따라서 MDWA의 다채널성은 같은 값을 복제하는 것이 아니라, **하나의 시스템 상태를 서로 다른 인터페이스 언어로 번역하는 것**이다.

### 4.3 Parametric Interface가 가능하게 하는 작업

- 일상적 UI를 낯설게 재배치하기.
- 여러 UI에 흩어진 parameter를 하나의 시스템으로 통합하기.
- 관객 입력으로 wrapper의 내용뿐 아니라 mapping과 규칙까지 바꾸기.
- 상업적 인터페이스가 숨기는 데이터 관계와 행동 유도를 노출하기.
- 하나의 parameter를 뉴스, SNS, 차트, 광고, 사운드 등 서로 다른 표현으로 동시에 관찰하기.

### 4.4 직접 대응을 넘어서는 mapping

MDWA의 목표는 항상 `A를 입력하면 화면에 A가 나타난다`는 직접 대응이 아니다.

```text
direct mapping:       A -> A'
parametric mapping:   A -> p(A) -> W(p)
integrative mapping:  A(t) -> integral/accumulation -> system-state change
```

중간 parameter와 누적·변형 규칙이 있을 때 관객의 작은 행위가 개별 화면 효과를 넘어 전체 시스템의 형상과 상태를 바꿀 수 있다.

## 5. 2026–27 핵심 이론 II: State-based Architecture and Narrative

### 5.1 선형 서사의 한계

기존 인터랙티브 작품도 종종 다음과 같은 선형 단계로 진행된다.

```text
State A -> State B -> State C -> Ending
```

관객이 transition을 촉발하더라도 도착 순서가 미리 고정되어 있다면, 이는 상호작용적인 연출이지만 본질적으로는 progressive linear storytelling일 수 있다.

반포자이즘의 deeper links는 parameter와 인터페이스를 추가하며 다른 차원을 여는 초기 실험이다. 그러나 전체 작품은 여전히 `2D -> 3D -> beyond`라는 선형 상승 서사로 읽힐 수 있다.

### 5.2 상태 기반 구조

State-based Architecture는 작품을 장면의 순서가 아니라 상태와 전이의 네트워크로 설계한다.

```text
H = (S, T)

S = {s_1, s_2, ..., s_n}        artwork states
T = {t_ij}                       possible transitions
t_ij = condition(interaction, time, collective state, system data)
```

각 state는 단순한 화면 장면이 아니라 다음의 묶음이다.

- 활성화된 디바이스와 wrapper
- parameter 값과 허용 범위
- 화면 사이의 topology
- 관객에게 가능한 interaction
- 내러티브와 권력관계
- 시스템의 기억과 누적 상태

한 state에서 다음 state로 이동하는 조건은 클릭 하나뿐 아니라 집단행동, 임계값, 시간, 확률, 외부 데이터, 상호작용의 부재가 될 수 있다.

### 5.3 Statechart와 Markov 모델의 구분

- **Statechart**는 계층적 상태, 병렬 상태, 조건부 transition, history 등을 설계하는 데 유용하다.
- **Markov chain**은 다음 상태가 확률적 transition에 의해 결정될 때 유용하다.

모든 state-based MDWA가 Markov chain일 필요는 없다. 확률과 전이행렬이 실제 시스템에 구현되지 않았다면 Markov라는 말을 단지 비유로 사용하지 않는다.

### 5.4 목표

향후 MDWA는 관객이 콘텐츠만 바꾸는 단계를 넘어 다음을 가능하게 할 수 있다.

- 여러 state 사이의 비선형 이동
- 이전 interaction history에 따른 다른 transition
- 여러 상태의 동시 활성화
- 되돌아감, 반복, 우회, 막힘
- 관객 집단 사이의 충돌로 발생하는 예상하지 못한 state
- 디바이스 관계망 자체의 재배선
- 정해진 결말보다 emergent trajectory

## 6. 상호작용의 입자설과 파동설

이것은 완결된 과학 이론이 아니라 interaction design을 점검하기 위한 작업 가설이다.

### 6.1 입자적 interaction

- 버튼, 카드, 선택지, hyperlink처럼 경계가 분명하다.
- discrete event와 semantic meaning이 중심이다.
- 실용적 UI와 전통적 GUI가 여기에 강하다.
- 장점은 명료한 의미이고 한계는 감각적 연속성과 bodily engagement의 약화다.

### 6.2 파동적 interaction

- 흔들기, 기울기, 속도, 방향, 몸의 이동처럼 연속적이다.
- intensity, rhythm, accumulation, resonance가 중심이다.
- 미디어아트의 bodily interaction이 여기에 강하다.
- 장점은 감각적 몰입이고 한계는 의미적·비평적 정밀성의 약화다.

### 6.3 좋은 MDWA interaction

좋은 interaction은 두 성격을 결합할 수 있다. 관객은 무엇을 선택하고 있는지 이해하면서도, 그 선택을 연속적으로 연주하고 조정할 수 있어야 한다.

`Finger Skating`은 이에 대한 primitive interaction pattern이다. discrete control로 구성된 UI 위에서 손가락을 떼지 않고 이동하며 연속적으로 선택한다. 선택 대상은 입자적이지만 행위는 파동적이다. 상세한 구현 규칙은 [finger-skating.md](./finger-skating.md)를 따른다.

## 7. 이전 작품과 상호작용 사례

| 작품 | 주요 문제 | 대표 interaction | state/narrative 역할 | 현재 이론에서의 위치 |
|---|---|---|---|---|
| MDWA Performances (2022–23) | 분산된 참여와 performer 없는 performance | 다수 관객의 모바일 입력 | 알고리즘 안에서 집단 퍼포먼스 생성 | 공동성·분산성의 초기 실험 |
| ≠ / Nonequality (2023) | 논리적 요소가 만드는 비논리적 전체, `=`에서 `≠`로 | hyperlink 탐색, interaction acceleration | `Ja -> Nein`, 질서 -> 혼돈의 단계 전환 | 다채널 narrative와 semantic interaction의 정립 |
| SoTA (2024–26) | AI 모델의 표상적 frontend와 추상적 backend | scroll, mobile orientation, disengagement | 관객의 이탈이 전역 state transition을 촉발 | interaction-as-transition과 public AI engagement의 검증 |
| Omega (2025–26) | 인간 정체성의 vectorisation과 저항 | questionnaire, 흔들기, 회전, 카메라 | 분류된 vector space에서 bodily deconstruction으로 이동 | semantic + phenomenological interaction의 결합. 다만 저항이 시스템에 미리 허용된 play라는 한계 |
| Banpo-Xism / integral (2025–26) | 위치·브랜드·가격으로 구성된 한국 아파트 신화 | doom-scrolling, deeper link, grid, continuous deformation, multi-user input | 2D 좌표계를 수행한 뒤 parameter를 추가하여 고차원 manifold로 변형 | Parametric Interface와 미적분적 interaction의 primitive. 여전히 큰 흐름은 선형적 |
| Goldfishes (proposed 2027) | 미디어 hype와 집단적 emergent behaviour | 다수 관객 입력, 외부 signal, threshold-triggered model change | signal-following swarm에서 집단적 field-like behaviour로 이동하는 구상 | graph·complex-system·state architecture를 통합할 잠재력이 있으나 아직 제안 단계 |

## 8. 확장 가설 A: MDWA의 그래프 이론적 확장

### 8.1 왜 MDWA는 결국 그래프적인가

MDWA를 다음과 같은 그래프로 볼 수 있다.

```text
G = (V, E)
```

- `V`: 모바일, 화면, 프로젝터, 서버, 데이터 source, 관객 또는 agent와 같은 node.
- `E`: 데이터 흐름, 영향, 동기화, 관찰, 제어, 지연, 피드백 관계.

중요한 것은 디바이스의 수가 아니라 `E`, 즉 어떤 노드가 누구에게 어떤 방향과 강도로 영향을 주는가이다. 같은 화면을 한 대 더 추가하는 것은 topology를 바꾸지 않을 수 있다. 반대로 하나의 edge를 재배선하면 작품의 권력관계와 서사가 완전히 달라질 수 있다.

### 8.2 세 종류의 그래프

향후 설계에서는 적어도 다음을 구분할 수 있다.

- **Device graph**: 어떤 물리적 디바이스가 연결되는가.
- **Parameter/dependency graph**: 어떤 parameter가 어떤 output과 state에 영향을 주는가.
- **State graph**: 작품이 어떤 상태 사이를 이동할 수 있는가.

WebSocket으로 모두 연결되어 있다는 사실만으로 예술적으로 의미 있는 그래프가 생기는 것은 아니다. 연결의 방향, 가중치, 가시성, 가변성과 관객이 topology를 바꿀 수 있는지가 작품의 핵심이다.

### 8.3 산업공학·복잡계·공정과의 연결

복잡계, 공급망, 공정, 조직, 금융, 미디어 생태계를 표현하는 그래프는 MDWA의 구조로 번역될 수 있다. 여기서 목표는 기존 그래프를 여러 화면에 나눠 보여주는 것이 아니다. 관객이 edge와 flow를 경험하고, node 사이의 국소 변화가 전체 시스템에 어떻게 전파되는지 체험하게 만드는 것이다.

`V에서 E로, E에서 전체 field/system으로`라는 문장은 2026–27 MDWA의 선언적 방향으로 사용할 수 있다. 다만 이를 보편적 시대정신이라는 확정 사실보다 작가의 시대 진단이자 연구 명제로 취급한다.

## 9. 확장 가설 B: MDWA의 미적분적 확장

### 9.1 전체 시스템과 부분 관측

전체 contemporary system을 `F`라고 하고, 그 시스템을 구성하는 변수를 `x_1, x_2, ..., x_n`이라고 두자.

```text
F = F(x_1, x_2, ..., x_n)
```

각 화면은 전체 `F`를 그대로 보여주는 대신 특정 변수에 대한 변화율, 국소 관측, 저차원 projection을 wrapper로 표현할 수 있다.

```text
Screen_1 = W_1(partial F / partial x_1)
Screen_2 = W_2(partial F / partial x_2)
Screen_3 = W_3(partial F / partial x_3)
```

여기서 `partial F / partial x_i`는 실제 미분식으로 구현될 수도 있고, 아직은 특정 변수 변화에 대한 시스템의 국소 반응을 뜻하는 설계 도식일 수도 있다. 두 경우를 문서와 작품 설명에서 혼동하지 않는다.

### 9.2 장님과 코끼리

- 코끼리는 한 번에 인지할 수 없는 거대한 전체 시스템 `F`다.
- 각 장님은 특정 변수, projection, interface를 통해 일부만 접한다.
- 여러 화면은 여러 장님이 서로 다른 부분을 만지는 장면을 동시에 제시한다.

MDWA는 전체를 완전히 재현한다고 주장하지 않는다. 대신 다음 두 가지를 가능하게 할 수 있다.

1. 부분들이 유기적으로 연결된 규모와 대략적 형상을 감각하게 한다.
2. 우리가 매일 접하는 2D 인터페이스가 복잡계의 제한된 projection임을 드러낸다.

이때 `F`는 hyperobject와 연결될 수 있지만, 철학적 비유와 수학적 모델을 동일시하지 않는다.

### 9.3 인터랙션의 미분적·적분적 힘

전통적 직접 조작은 다음처럼 표현할 수 있다.

```text
I do A -> screen shows A'
```

미적분적 MDWA는 다음 관계를 탐구한다.

```text
local/differential:  delta x_i -> partial change of F -> W_i(partial response)
accumulative:        A(t) -> integral over time -> global state or form
dimensional:         interaction adds/opens parameter x_(n+1)
```

즉, 한 번의 행위는 작은 국소 변화일 수 있지만 시간에 따라 누적되거나 다른 관객의 행위와 적분되어 전체 형상을 바꾼다. 반포자이즘에서는 관객이 parameter를 더하고 조절하면서 고차원 형상을 만들고, 그 부분적 3D·2D·1D projection을 여러 화면에서 보여주는 primitive가 구현되었다.

### 9.4 힘의 의지와의 연결: 아직 질문으로 유지

`A -> A'`와 `A -> integral A`의 차이가 더 큰 행위성과 변형 능력을 만드는가? 작은 행위가 누적되어 시스템의 차원이나 규칙을 바꿀 때, 이를 니체의 힘의 의지와 연결할 수 있는가?

현재는 흥미로운 철학적 질문이지만 증명된 관계가 아니다. 향후 작품에서는 다음을 구체화해야 한다.

- 무엇이 실제로 누적되는가.
- 누적값은 언제 질적 state transition을 만드는가.
- 관객은 누적과 결과의 관계를 감각할 수 있는가.
- 누적이 단지 큰 visual effect가 아니라 기존 질서를 재구성하는 행위성을 만드는가.

## 10. Supplementary: 복잡계와 emergence

핵심 질문은 다음과 같다.

> MDWA는 어떻게 복잡계를 설계하고, 관객이 그 복잡계를 이해하거나 경험하게 할 수 있는가?

가능한 구성요소는 다음과 같다.

- 국소 규칙을 가진 다수 agent
- node와 edge의 동적 변화
- positive/negative feedback
- 시간 지연과 비동기성
- 임계값과 phase transition
- 확률적 transition
- order parameter와 collective state
- bottom-up emergence

그러나 단순히 많은 오브젝트가 움직이거나 예상하지 못한 visual pattern이 나온다고 emergence라고 부르지 않는다. 각 작품은 최소한 다음을 명시해야 한다.

- agent 또는 node는 무엇인가.
- local rule은 무엇인가.
- 관객은 어떤 parameter를 바꾸는가.
- 어떤 collective variable을 관측하는가.
- phase 또는 state의 차이를 어떻게 판별하는가.
- 작품의 비평적 의미와 모델의 구조가 어디에서 만나는가.

## 11. Supplementary: Parametric Detournement와 V-Effekt

일상적 인터페이스의 wrapper와 parameter 조합을 다음처럼 두자.

```text
W_1(x_1, x_2, x_3)
W_2(y_1, y_2, y_3)
W_3(z_1, z_2, z_3)
```

익숙한 mapping을 교환하면 일상적 UI에 distancing effect를 만들 수 있다.

```text
W_1(y_1, y_2, y_3)
W_2(z_1, z_2, z_3)
W_3(x_1, x_2, x_3)
```

더 세밀한 교차 조합도 가능하다.

```text
W_1(x_1, y_2, z_3)
W_2(y_1, z_2, x_3)
W_3(z_1, x_2, y_3)
```

예를 들어 금융 volatility가 메신저 typing indicator로, SNS engagement가 지도상의 고도차로, 이메일 urgency가 광고 가격으로 표현될 수 있다. 익숙한 wrapper가 잘못된 parameter를 말할 때 인터페이스의 자연스러움이 깨지고, 원래 UI가 숨기던 관습과 권력이 드러날 수 있다.

이 방향은 데투른망, 다다이즘의 collage, 초현실주의 montage, Brecht의 V-Effekt와 연결해 연구할 수 있다. 그러나 단순한 무작위 섞기는 충분하지 않다. `right thing in the wrong place`가 비평적 효과를 가지려면 왜 그 wrapper와 parameter의 오배치가 대상 시스템의 숨은 관계를 드러내는지 설명되어야 한다.

## 12. Goldfishes (2027 제안)의 가능성과 한계

Goldfishes는 현재 완성 작품이 아니라 D-IEP Emergence Art+Science Fellowship을 위해 작성된 제안이다. 중심 projection의 goldfish-like agents가 AI, quantum, metaverse, market panic, breaking news와 같은 단기 hype signal을 따라가고, 주변 화면의 뉴스·SNS·meme·금융차트·dashboard·광고·Slack·email interface가 함께 반응한다. 다수 관객의 모바일 입력이 누적되면 threshold 이후 swarm model이 passive signal-following에서 collective field-like behaviour로 변화하는 구상이다.

### 12.1 가능성

#### 그래프적 MDWA에 가장 자연스럽게 접근할 수 있다

- fish agent, hype source, audience, media channel을 node로 정의할 수 있다.
- follow, influence, amplification, imitation, avoidance를 edge로 정의할 수 있다.
- 관객은 signal의 크기만 바꾸는 대신 edge weight나 topology를 바꿀 수 있다.
- 중심 swarm과 주변 media UI가 서로 피드백하는 directed graph를 만들 수 있다.

#### Parametric Interface의 좋은 시험대다

주변 화면은 이미 news feed, SNS, chart, dashboard, advertisement, Slack, email이라는 Everyday Wrapper의 집합으로 구상되어 있다. 각 wrapper를 명시적으로 parameter화하면 같은 hype system을 서로 다른 방식으로 관측하게 할 수 있다.

```text
NewsWrapper(urgency, repetition, source concentration, novelty)
SocialWrapper(engagement, imitation, polarization, decay)
MarketWrapper(volatility, momentum, liquidity, attention)
MessageWrapper(interruption, unread count, response latency, hierarchy)
```

Wrapper 사이의 parameter를 의도적으로 교환하면 hype ecology에 대한 detournement도 가능하다.

#### State-based Architecture로 확장할 수 있다

현재의 `passive following -> threshold -> collective behaviour`를 단일 선형 전환으로 두지 않고, 여러 가능한 state와 transition으로 만들 수 있다.

```text
dispersed <-> aligned <-> clustered
                    |-> polarized
                    |-> saturated
                    |-> signal rejection
                    |-> self-generated hype
```

다수 관객 집단의 다른 행동, interaction history, stochastic rule에 따라 다른 trajectory가 발생한다면 Goldfishes는 기존 작품보다 강한 비선형 narrative를 가질 수 있다.

#### 복잡계가 내용과 형식을 동시에 구성할 수 있다

Goldfishes는 복잡계를 화면에 설명하는 데 그치지 않고 작품 자체를 agent-based complex system으로 만들 가능성이 있다. local rule, external field, phase transition, order parameter를 실제 구현하면 과학적 구조와 미디어 비평이 같은 시스템 안에서 작동할 수 있다.

#### 미적분적 mapping을 시험할 수 있다

- 개별 모바일 입력은 국소적인 `delta x_i`가 될 수 있다.
- 시간에 따른 관객 입력의 누적은 `integral A(t)`가 될 수 있다.
- 각 주변 화면은 전체 hype field `F`의 다른 partial observable을 wrapper로 보여줄 수 있다.
- finger skating과 같은 continuous-discrete interaction은 hype source를 선택하면서 그 강도와 경로를 연속적으로 조절하게 할 수 있다.

### 12.2 현재 한계

#### 현재 narrative는 여전히 선형적이다

현 제안의 핵심 transition은 `수동적 signal following -> interaction 누적 -> threshold -> 능동적 collective mode`다. 이는 phase transition의 언어를 사용하지만, 아직은 하나의 예정된 climax에 가깝다. 비선형 state graph와 복수의 가능한 결과는 정의되어 있지 않다.

#### 그래프 구조가 아직 작품으로 설계되지 않았다

WebSocket으로 화면을 연결하는 것은 통신 구조이지 곧바로 예술적 graph theory가 아니다. node와 edge의 의미, 방향, weight, 재배선 조건, 관객이 topology에 미치는 영향이 아직 없다.

#### Parametric Interface가 아직 interface 목록에 머문다

뉴스, SNS, meme, chart, Slack, email이 주변에 등장한다는 것만으로 Parametric Interface가 되지 않는다. 각 wrapper의 parameter schema, 공통 parameter, cross-wrapper mapping, 의도적인 오배치가 설계되어야 한다.

#### emergence와 phase transition이 아직 연구 영감 수준이다

현재 문서는 active matter, sociohydrodynamics, agent-based modelling, stochastic modelling을 연구 연결점으로 제시하지만 정확한 local rule, order parameter, phase 판별 기준은 의도적으로 열어두고 있다. 이는 초기 fellowship 제안으로는 적절하지만 완성 작품에서 그대로 남으면 과학 언어가 비유에 머물 수 있다.

#### hype 비평이 도식적 우화가 될 위험이 있다

`금붕어는 눈앞의 신호만 좇는다`는 은유는 직관적이지만, 관객과 대중을 기억력이 짧은 수동적 군집으로 단순화할 수 있다. 실제 media system의 platform incentives, source hierarchy, economic feedback, strategic actors가 생략되면 복잡계 비평이 개인 행동에 대한 도덕적 풍자로 축소될 수 있다.

#### collective interaction이 하나의 숫자로 환원될 수 있다

모든 관객 행동을 단일 `hype intensity`나 threshold로 합산하면 참여자의 차이와 충돌이 사라진다. 집단성을 만들기 위해서는 합계뿐 아니라 분포, 군집, 반대 방향, temporal sequence, minority influence 등을 보존할 필요가 있다.

#### 미적분 관계가 아직 정의되지 않았다

무엇이 `F`이고 각 화면이 정확히 어떤 partial derivative, projection 또는 observable인지 정해져 있지 않다. 실제 미분·적분 모델을 사용할지, 설계 도식으로 사용할지를 구현 단계에서 명확히 구분해야 한다.

#### state transition의 의미가 비평적으로 연결되어야 한다

swarm이 더 collective하거나 field-like해지는 것이 왜 hype에 대한 비판 또는 대안인지 아직 분명하지 않다. collective behaviour가 해방, 또 다른 군집 순응, polarization, 혹은 self-generated media가 되는지에 따라 작품의 메시지가 달라진다.

### 12.3 Goldfishes에서 우선 검증할 최소 질문

Goldfishes를 한 번에 모든 이론의 증명으로 만들지 않는다. 우선 다음을 작게 검증하는 편이 좋다.

1. 3–5개의 명확한 swarm state와 transition condition을 정의할 수 있는가.
2. 관객이 scalar intensity뿐 아니라 graph edge 또는 parameter mapping을 바꿀 수 있는가.
3. 하나의 공통 system parameter가 3개 이상의 Everyday Wrapper에서 어떻게 다르게 나타나는가.
4. 어떤 local interaction이 실제 collective emergence를 만드는가.
5. 관객이 국소적 행동과 전체 변화의 관계를 감각할 수 있는가.
6. hype를 따르는 상태 외에 거부, 포화, 분열, 자체 신호 생성과 같은 복수의 결과가 가능한가.

## 13. 앞으로의 방향

### 13.1 화면 수에서 관계의 설계로

MDWA의 발전은 더 많은 디바이스를 추가하는 데 있지 않다. edge, dependency, topology, feedback을 작품의 주재료로 다루는 방향으로 이동해야 한다.

### 13.2 연출된 transition에서 비선형 state ecology로

관객이 미리 정해진 다음 장면을 재생시키는 구조를 넘어, interaction history와 집단행동에 따라 다른 상태와 연결관계가 발생하도록 한다.

### 13.3 UI 제작에서 Parametric Interface 구성으로

Everyday UI를 wrapper와 parameter로 해체하고, 여러 wrapper 사이의 parameter 이동·교환·충돌을 설계한다.

### 13.4 직접 mapping에서 미적분적 interaction으로

개별 행동의 즉시 효과뿐 아니라 국소 변화, 시간적 누적, 다수 관객의 적분, 새로운 차원의 개방을 설계한다.

### 13.5 복잡계 시각화에서 복잡계 자체의 설계로

복잡계를 설명하는 콘텐츠가 아니라 local rule, feedback, emergence, phase transition을 가진 작품 시스템을 만든다.

### 13.6 단일 관객의 중앙 통제에서 multi-agent topology로

한 명의 모바일이 모든 화면을 지휘하는 one-to-many 구조를 넘어, 여러 관객·agent·screen이 서로 다른 권한과 정보를 갖고 관계망을 바꾸도록 한다.

## 14. 에이전트 작업 원칙

향후 SCC에서 MDWA 관련 실험을 만들거나 설명할 때 다음을 따른다.

- MDWA를 단순한 멀티스크린 또는 socket demo로 축소하지 않는다.
- 구현 전에 node, edge, parameter, wrapper, state, transition을 먼저 명시한다.
- 화면별 역할과 전체 시스템에서의 관계를 구분한다.
- raw input과 artistic parameter mapping을 구분한다.
- interaction이 visual decoration인지 state/system intervention인지 점검한다.
- 선형 단계가 있다면 비선형이라고 과장하지 않는다.
- 수학 용어를 실제 계산 모델로 쓰는지 철학적·설계적 비유로 쓰는지 표시한다.
- emergence, Markov, phase transition, derivative, integral 같은 용어는 구현 또는 판별 기준 없이 장식적으로 사용하지 않는다.
- Parametric Interface와 State-based Architecture를 2026–27 MDWA의 중심 설계축으로 취급한다.
- Goldfishes는 아직 2027 제안 단계이며 완성·검증된 작품처럼 서술하지 않는다.

## 15. 관련 문서

- [Finger Skating](./finger-skating.md): discrete control과 continuous gesture를 결합하는 interaction pattern.
- Google Drive, `2026-MDWA Siggraph Art Paper`: MDWA의 web, multi-device, artwork 방법론 초고.
- Google Drive, `Banpo-Xism Leonardo Publication Plan`: 반포자이즘의 좌표계, 고차원 manifold, system art 논문화 초고.
- Google Drive, `Omega - SIGGRAPH`: semantic classification과 phenomenological resistance, 심사 피드백.
- `/Users/jeongyoonchoi/Desktop/Side_Project/2026/diep-goldfishes-latex/main.tex`: Goldfishes 2027 concept note.

