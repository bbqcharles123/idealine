# AI 호출 계약서 — 무엇을 무엇이 보장하는가

이 문서의 목적은 **"AI 응답이 내 의도대로 나왔는지 판단할 기준"** 을 코드 옆에 남겨 두는 것이다.

UI는 클릭해 보면 잘못된 구현이 드러난다. 그런데 AI 호출은 텍스트가 나오기만 하면 성공처럼 보인다.
프롬프트에 넣은 조건이 실제로 반영됐는지, 스키마가 응답을 강제하는지, 후처리가 이상한 값을 걸러내는지 —
화면만 봐서는 알 수 없다. 그래서 호출마다 **요구사항을 적고, 그 요구사항이 어느 층에서 지켜지는지** 표로 남긴다.

---

## 읽는 법

### 보장 층위 4단계

| 표기 | 의미 | 강도 |
|---|---|---|
| **스키마** | OpenAI strict 모드가 구조적으로 차단. 어길 방법이 없다 | 가장 강함 |
| **코드** | 후처리 함수가 검사해 `throw` 또는 `console.warn` | 강함 |
| **프롬프트만** | 문장으로 부탁만 함. 모델이 어겨도 그대로 통과한다 | 약함 |
| ❌ | 아무 장치 없음 | **다음 작업 후보** |

### strict 모드가 지원하지 않는 것 (= 스키마로 막을 수 없는 것)

아래 ❌가 반복해서 나오는 근본 원인이다. 이건 우리 설계 실수가 아니라 API 제약이다.

- `minItems` / `maxItems` — **배열 길이를 강제할 수 없다**
- `minLength` / `maxLength` / `pattern` — **빈 문자열·문장 수·형식을 강제할 수 없다**
- `minimum` / `maximum` — 숫자 범위

지원되는 것: `type`, `properties`, `required`, `items`, `enum`, `additionalProperties`, `description`

### 확인 도구

`.env`에 `VITE_AI_DEBUG=true`를 넣고 dev 서버를 재시작하면
모든 호출의 프롬프트 원문·응답·소요시간이 브라우저 콘솔에 찍힌다.
로그 라벨은 아래 각 절의 `schema.name`과 같다. (`src/ai/openaiClient.js`)

---

## 전체 지도

호출은 6개이고, 전부 `callOpenAI`(openaiClient.js:86)를 지난다.

| # | schema.name | 함수 | 파일 | temp | 언제 |
|---|---|---|---|---|---|
| 1 | `seed_content` | `generateSeedContent` | seedCard.js:33 | CREATIVE | 씨드카드 생성 |
| 2 | `tool_examples` | `generateToolExamples` | deriveCard.js:75 | CREATIVE | 확장 모달 2단계 진입 |
| 3 | `tool_question` | `generateQuestion` | deriveCard.js:127 | CREATIVE | 확장 3단계 / 변형 2단계 |
| 4 | `derived_card` | `generateDerivedContent` | deriveCard.js:198 | CREATIVE | 파생카드 생성 |
| 5 | `write_card` | `generateWriteContent` | deriveCard.js:269 | ANALYTIC | 직접작성 카드 생성 |
| 6 | `ux_eval` | `generateUxEval` | uxEval.js:186 | ANALYTIC | 위 1·4·5 직후 (공용) |

**실행 순서 특징**

- `generateSeedCard`(seedCard.js:46) / `generateDerivedCard`(deriveCard.js:231) → 본문 생성 후 **순차**로 UX 평가
  (UX 평가는 *생성된* 본문을 평가해야 하므로 기다려야 한다)
- `generateWriteCard`(deriveCard.js:305) → **병렬** (`Promise.all`)
  (본문·UX 평가 모두 *사용자가 입력한* title·description을 쓰므로 서로를 기다릴 이유가 없다)

---

## 1. `seed_content` — 씨드카드 본문

- **위치**: `generateSeedContent` (seedCard.js:33) / 스키마 seedCard.js:10
- **호출부**: `HomePage.jsx:145`
- **입력**: `topic` (사용자가 입력한 원문 주제)
- **출력**: `title`, `description` → 씨드카드 `data.title` / `data.description`
- **temperature**: CREATIVE(0.9) — 겹치지 않는 발상이 필요

| 요구사항 | 보장 |
|---|---|
| `title`·`description` 두 키가 반드시 온다 | **스키마** (`required`) |
| 정의 안 된 키가 섞이지 않는다 | **스키마** (`additionalProperties:false`) |
| `title`이 빈 문자열이 아니다 | ❌ |
| `description`이 빈 문자열이 아니다 | ❌ |
| `description`이 2~3문장이다 | 프롬프트만 (seedCard.js:29) |
| `description`에 "누구를 위해/어떤 문제를/어떻게"가 담긴다 | 프롬프트만 |

> ❌ 빈 문자열이 오면 **제목도 본문도 없는 씨드카드**가 그대로 만들어진다.
> 캔버스에 카드는 있는데 내용이 비어 있는 상태가 되고, 그 카드에서 파생된 모든 카드가 빈 부모를 참조하게 된다.

---

## 2. `tool_examples` — 확장 모달 2단계 선택지

- **위치**: `generateToolExamples` (deriveCard.js:75) / 스키마 생성 함수 `buildExamplesSchema` (deriveCard.js:25)
- **호출부**: `ExpandModal.jsx:88`
- **입력**: 부모 카드 `description`, 선택한 방향성 `label` + `toolNames`, `getDirectionReasoning('expand', label)`
- **출력**: `examples: [{ name, example }]` → 2단계 선택지 카드
- **temperature**: CREATIVE(0.9)

**이 호출만 스키마가 함수인 이유**: 도구 목록이 사용자의 1단계 선택에 따라 런타임에 정해지므로,
`enum`에 넣을 값을 미리 상수로 쓸 수 없다.

| 요구사항 | 보장 |
|---|---|
| `name`이 입력한 도구명과 **글자까지 일치**한다 | **스키마** (`enum: toolNames`, deriveCard.js:40) |
| 도구 개수만큼 예시가 **전부** 온다 | **코드** (`normalizeExamples`가 부족하면 throw, deriveCard.js:65-71) |
| 화면 표시 순서가 도구 순서와 같다 | **코드** (`normalizeExamples`가 재정렬) |
| `example`이 빈 문자열이 아니다 | **코드** (빈 문자열도 누락으로 간주해 throw) |
| `example`이 1~2문장이다 | 프롬프트만 (deriveCard.js:84) |
| 각 도구의 고유한 사고 방향이 드러난다 | 프롬프트만 (deriveCard.js:85) |

> **이 호출이 6개 중 가장 잘 방어되어 있다.** 다른 호출을 손볼 때 참고할 기준선.
> `enum`으로 이름을 고정한 이유는 화면이 `find(e => e.name === tool.name)`로 짝을 짓기 때문이다(ExpandModal.jsx:280, 120).
> 이름이 한 글자만 달라도 빈 선택지가 렌더되고 클릭까지 된다.
>
> 개수 검증을 **스키마가 아니라 코드로** 한 이유는 strict 모드에 `minItems`가 없어서다.
> 부분 누락은 통신이 성공한 상태라 `catch`에도 안 걸리므로, 코드가 직접 throw해서
> 화면 상태를 로딩/실패/정상 3가지로 고정한다.

---

## 3. `tool_question` — 도구 적용 질문

- **위치**: `generateQuestion` (deriveCard.js:127) / 스키마 `QUESTION_SCHEMA` (deriveCard.js:115)
- **호출부**: `ExpandModal.jsx:121`(확장 3단계), `TransformModal.jsx:74`(변형 2단계)
- **입력**: 부모 카드 `description`, `toolName`, `toolType`, `TOOL_LAYER_DESC[toolType][toolName]`,
  `getFrameworkContext(toolType, toolName)`, 그리고 **확장에서만** 2단계에서 고른 `selectedExample`
- **출력**: `question` → 모달 질문 + 파생카드 `data.question`
- **temperature**: CREATIVE(0.9)

| 요구사항 | 보장 |
|---|---|
| `question` 키가 반드시 온다 | **스키마** |
| 질문이 빈 문자열이 아니다 | **간접** — 빈 문자열이면 두 모달 모두 생성 버튼을 비활성화 (ExpandModal.jsx:128, TransformModal.jsx:113·315) |
| 질문이 그 도구의 사고 방향과 맞는다 | 프롬프트만 |
| 확장일 때 2단계에서 고른 예시의 방향을 이어받는다 | 프롬프트만 |
| 질문이 1개다 (여러 개를 한 문자열에 넣지 않는다) | 프롬프트만 |

> "간접"은 스키마나 AI 모듈이 아니라 **화면이 막고 있다**는 뜻이다.
> `aiQuestion`이 falsy면 버튼이 비활성화되므로 빈 질문으로 카드가 만들어지지는 않는다.
> ExpandModal·TransformModal 둘 다 같은 방식이며, 의도된 설계라는 것도 주석에 적혀 있다.
> 다만 방어가 AI 모듈이 아니라 두 모달에 각각 복제되어 있으므로,
> 나중에 질문을 쓰는 화면이 하나 더 생기면 그곳에서 누락될 수 있다.

---

## 4. `derived_card` — 파생카드 본문

- **위치**: `generateDerivedContent` (deriveCard.js:198) / 스키마 `DERIVED_CONTENT_SCHEMA` (deriveCard.js:177)
- **호출부**: `App.jsx:377` (`generateDerivedCard` 경유)
- **입력**: 부모 `description`, `question`, 사용자 `answer`, `toolName`, `toolType`
- **출력**: `title`, `description`, `highlightPhrases`
  → 앞의 둘은 카드 본문, `highlightPhrases`는 `phrasesToHighlights`(deriveCard.js:349)를 거쳐
  `{start,end}` 인덱스 배열이 되어 사이드패널 Q&A 하이라이트로 쓰인다
- **temperature**: CREATIVE(0.9)

| 요구사항 | 보장 |
|---|---|
| 세 키가 반드시 온다 | **스키마** |
| `highlightPhrases`가 배열이고 원소가 문자열이다 | **스키마** (`items`) |
| 하이라이트 문구가 `answer`에 실제로 존재한다 | **코드** — 못 찾으면 `console.warn` 후 그 문구만 버림 (deriveCard.js:369) |
| 띄어쓰기가 달라도 하이라이트를 잃지 않는다 | **코드** (`findIgnoringWhitespace`, deriveCard.js:322) |
| 하이라이트 구간이 겹치지 않는다 | **코드** (`phrasesToHighlights` 후반부) |
| `title`이 빈 문자열이 아니다 | ❌ |
| `description`이 빈 문자열이 아니다 | ❌ |
| `description`이 2~3문장이다 | 프롬프트만 |
| 부모 아이디어와 사용자 답변이 **둘 다** 반영된다 | 프롬프트만 |

> `highlightPhrases`는 스키마로 절대 표현할 수 없는 요구사항("answer의 부분 문자열")을
> **코드로 받아낸 좋은 사례**다. 실패해도 조용히 넘어가지 않고 `console.warn`을 남긴다.
>
> 반면 `title`·`description`은 무방비다. `answer`를 무시하고 부모 본문만 복사해 와도 알 수 없다.

---

## 5. `write_card` — 직접작성 카드 추천 도구

- **위치**: `generateWriteContent` (deriveCard.js:269) / 스키마 `WRITE_CONTENT_SCHEMA` (deriveCard.js:250)
- **호출부**: `App.jsx:432` (`generateWriteCard` 경유, UX 평가와 **병렬**)
- **입력**: 사용자가 직접 쓴 `title`, `description`
- **출력**: `writeRec`(도구레이어 RecToolCard), `writeExpect`(도구레이어 설명), `writeRecReason`(사이드패널)
- **temperature**: ANALYTIC(0.4) — 발산이 아니라 분류·근거 서술이므로 일관성 우선

| 요구사항 | 보장 |
|---|---|
| `writeRec`이 `'expand'` 또는 `'transform'` 뿐이다 | **스키마** (`enum`, deriveCard.js:257) |
| 세 키가 반드시 온다 | **스키마** |
| `writeExpect`·`writeRecReason`에 영문 `expand`/`transform`이 노출되지 않는다 | 프롬프트만 (deriveCard.js:280-281) |
| `writeRec`과 `writeRecReason`이 **서로 모순되지 않는다** | ❌ |
| 각 1~2문장이다 | 프롬프트만 |
| 추천 근거가 이 아이디어의 특성에 기반한다 (일반론이 아니다) | 프롬프트만 |

> **영문 누출**: `writeRec`은 값이 영문이어야 하는데(코드가 쓰는 값),
> `writeExpect`·`writeRecReason`은 화면에 그대로 보이는 한국어 문장이라 영문이 섞이면 안 된다.
> 같은 응답 안에서 한쪽은 영문, 한쪽은 한글을 요구하는 구조라 모델이 헷갈리기 쉬운 자리다.
> temperature를 ANALYTIC으로 낮춘 것도 이 억제가 목적이라고 주석에 적혀 있다(deriveCard.js:265).
> 그런데 실제로 새어 나왔는지 확인할 방법이 없다.
>
> **모순**: `writeRec: 'expand'`인데 `writeRecReason`이 변형하기를 설명하는 경우.
> 스키마는 각 필드를 따로 볼 뿐 **필드 사이의 일관성은 보지 않는다.**

---

## 6. `ux_eval` — UX 평가 (1·4·5 공용)

- **위치**: `generateUxEval` (uxEval.js:186) / 스키마 `UX_EVAL_SCHEMA` (uxEval.js:106)
- **입력**: 이미 만들어진 `title`, `description` + `UX_RULE`(uxEval.js:70~, `CRITERIA_TEXT` 포함)
- **출력**: `evaluations`(7개) / `areas`(3개) / `summary`
  → `toUxData`(uxEval.js:156)가 화면용 `{ summary, areas, evaluationItems }`로 조립
- **temperature**: ANALYTIC(0.4)

| 요구사항 | 보장 |
|---|---|
| 평가요소가 **정확히 7개**, 정해진 키로 온다 | **스키마** — 배열이 아니라 고정 키 객체 (uxEval.js:118) |
| 영역이 **정확히 3개**(business/human/social) 온다 | **스키마** (같은 방식) |
| `needsImprovement`가 boolean이다 | **스키마** |
| 영역 `status`가 평가요소와 어긋나지 않는다 | **코드** — 모델에게 받지 않고 `toUxData`가 계산 (uxEval.js:173) |
| 영역 `criteria` 목록이 평가요소와 어긋나지 않는다 | **코드** (같은 이유) |
| 7개가 전부 true거나 전부 false가 아니다 | 프롬프트만 (uxEval.js:81) |
| `evaluation`이 판정(`needsImprovement`)의 실제 근거다 | 프롬프트만 (uxEval.js:83-89) |
| 각 2문장, summary 2~3문장 | 프롬프트만 (uxEval.js:92) |
| 평가 텍스트가 빈 문자열이 아니다 | ❌ |

> **7개 고정을 스키마로 받아낸 방법**이 이 파일의 핵심 설계다.
> 배열 + `minItems: 7`은 strict 모드가 지원하지 않으므로,
> **배열을 고정 키 객체로 뒤집어** "모든 키가 필수"라는 strict 모드 규칙을 이용했다.
> `criteria`/`status`를 모델에게 받지 않고 코드로 계산한 것도 같은 발상 —
> **모델에게 물어보지 않으면 어긋날 수 없다.**
>
> **하지만 "전부 true 금지"는 프롬프트뿐이다.** 7개가 전부 true로 오면
> `toUxData`가 3개 영역을 전부 `'supplement'`로 계산해서,
> "무엇을 먼저 보완할지 알려준다"는 이 기능의 목적 자체가 무의미해진다.
> 그런데 화면에는 정상적으로 렌더되므로 **눈으로는 알아챌 수 없다.**
> 논문 기반 지표를 쓰는 기능인 만큼, 평가가 한쪽으로 쏠렸는지는 확인 가치가 크다.

---

## 다음 작업 후보

위 표의 ❌와 "프롬프트만" 중 실제로 위험한 것들. **아직 아무것도 구현하지 않았다.**

`VITE_AI_DEBUG=true`로 실제 응답을 여러 번 관찰한 뒤,
**진짜로 발생하는 것부터** 고친다. 발생하지 않는 문제에 방어 코드를 넣는 것은
검증되지 않은 추측을 코드로 굳히는 일이라 오히려 손해다.

| 우선순위 | 문제 | 어디 | 고친다면 |
|---|---|---|---|
| 높음 | 빈 문자열이 어디서도 안 막힘 | `seed_content`, `derived_card`, `ux_eval` | `normalizeExamples`처럼 공용 검증 함수를 만들어 `callOpenAI` 이후에 통과시키기 |
| 높음 | UX 평가 7개 전부 true/false 쏠림 | `ux_eval` | `toUxData`에서 감지해 `console.warn` (throw는 과함 — 실제로 그럴 수도 있는 판정이므로) |
| 중간 | write 카드 영문 누출 | `write_card` | `writeExpect`·`writeRecReason`에 `expand`/`transform` 포함 여부 검사 후 warn |
| 중간 | `writeRec` ↔ `writeRecReason` 모순 | `write_card` | 자동 검증이 어려움. 로그로 사례를 모아 프롬프트를 고치는 쪽이 현실적 |
| 낮음 | 문장 수 규칙 | 전부 | 스키마로 불가. 지켜지는지 로그로 관찰만 |

### 검증 함수를 넣는다면 지킬 원칙

기존 `normalizeExamples`(deriveCard.js:59)와 `phrasesToHighlights`(deriveCard.js:349)가 이미
서로 다른 두 전략을 보여 준다. 새로 만들 때도 둘 중 하나를 의식적으로 고른다.

- **`throw`** — 그 값이 없으면 기능이 성립하지 않을 때.
  화면 상태를 로딩/실패/정상 3가지로 고정할 수 있다. (예: 도구 예시 누락)
- **`console.warn` 후 진행** — 없어도 나머지가 동작할 때.
  조용히 버리면 "왜 안 뜨지"만 남으므로 흔적은 반드시 남긴다. (예: 하이라이트 문구)
