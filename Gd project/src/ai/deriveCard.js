// 확장/변형/직접작성 모달에서 사용하는 AI 호출 함수 모음
// 본문 생성(창의)과 UX 평가(분석)를 분리하고, 공통 호출은 openaiClient의 callOpenAI를 사용한다.

// 프롬프트 전용 도구 정의 — 화면용(toolLayerDesc)과 달리 기대효과 서술을 뺀 텍스트.
// 예시·질문·본문 세 호출이 모두 이걸 쓴다(화면용 텍스트는 LayerStackNode에서만 읽는다).
import { TOOL_PROMPT_DESC } from '../data/toolPromptDesc.js'
import { getFrameworkContext } from '../data/frameworkDesc.js'
// 확장 2단계 예시 생성의 요청 사양(프롬프트 문장·응답 스키마).
// Vite 전용 코드가 없는 순수 모듈이라 Node 테스트 스크립트도 같은 함수를 부를 수 있다.
// → 앱이 실제로 보내는 프롬프트와 테스트가 측정하는 프롬프트가 어긋날 수 없다.
import { buildToolExamplesPrompt, buildToolExamplesSchema } from './prompts/toolExamplesPrompt.js'
// 사용자 입력 주제(topic)를 다루는 규칙 — 씨드카드 쪽과 정책을 함께 관리하기 위해 분리
import { buildTopicBoundaryRule } from './prompts/topicScope.js'
// 아이디어 본문 품질 규칙 — 씨드카드 생성(seedCard.js)과 같은 문장을 쓰기 위해 분리한 모듈
import { buildIdeaWritingRule, buildFeasibilityRule } from './prompts/ideaRules.js'
// 직접작성 카드 전용 — 도구명 없이 확장하기/변형하기가 무엇을 할 수 있는지 설명한 텍스트
import { WRITE_TOOL_DESC } from '../data/writeToolDesc.js'
import { mockToolExamples, mockQuestion, mockDerivedContent, mockWriteContent } from './__mock__.js'
// UX 평가 전용 호출 (seedCard.js와 공유하는 공통 모듈)
import { generateUxEval } from './uxEval.js'
// 공통 OpenAI 클라이언트
import { callOpenAI, USE_MOCK, TEMP_CREATIVE, TEMP_ANALYTIC, logTransform } from './openaiClient.js'

// 도구 유형별 한글 라벨 (프롬프트에 사용)
const TOOL_TYPE_LABEL = { expand: '확장하기', transform: '변형하기' }

// ──────────────────────────────────────────────────────────
// 호출 2: 도구별 예시 생성 (확장 모달 2단계 선택지)
// cardDescription: 부모 카드 본문
// direction: { label, toolNames: ['제거','대체', ...] } — 선택한 방향성과 그 도구명들
// 반환값: [{ toolName, optionText }] — 입력한 도구 순서대로
//   (필드명을 name/example에서 바꾼 이유는 prompts/toolExamplesPrompt.js 주석 참고)
// ──────────────────────────────────────────────────────────
// 프롬프트 문장과 응답 스키마는 prompts/toolExamplesPrompt.js로 옮겼다.
// (테스트 스크립트가 같은 함수를 부르게 해서 프롬프트가 두 벌로 갈라지지 않도록)
//
// 응답 검증 + 정렬: 도구 수만큼 예시가 모두 채워졌는지 확인하고, 도구 순서대로 재정렬해 반환한다.
//
// strict 모드 Structured Outputs는 타입과 필수 필드만 보장할 뿐 배열 길이는 보장하지 않는다.
// (minItems/maxItems는 strict 모드가 지원하지 않아 스키마로 개수를 강제할 방법이 없다)
// 그래서 도구가 3개인데 예시가 2개만 오는 '부분 누락'이 실제로 발생할 수 있고,
// 이 경우 통신은 성공했으므로 호출부의 catch에도 걸리지 않는다.
// 그대로 넘기면 예시를 못 찾은 도구가 빈 선택지로 렌더되고 클릭까지 되므로,
// 하나라도 비면 호출 실패와 동일하게 throw해 모달의 오류 처리로 넘긴다.
// → 화면이 가질 수 있는 상태를 로딩/실패/정상 3가지로 고정한다.
function normalizeExamples(options, toolNames) {
  const ordered = toolNames.map((toolName) => ({
    toolName,
    optionText: options.find((o) => o.toolName === toolName)?.optionText?.trim() ?? '',
  }))

  const missing = ordered.filter((o) => o.optionText === '').map((o) => o.toolName)

  // 스키마는 배열 길이를 강제하지 못해 '부분 누락'이 실제로 발생한다.
  // 그때 callOpenAI는 통신 성공이므로 [AI ◀ 응답]을 성공으로 남기고, 실패 판정은 여기서 난다.
  // 이 기록이 없으면 "로그는 성공인데 화면은 오류"인 모순이 생겨 원인을 짚을 수 없다.
  logTransform(
    'tool_examples',
    missing.length > 0
      ? 'normalizeExamples: 누락 ' + missing.length + '개 → 호출 실패와 동일하게 처리'
      : 'normalizeExamples: 도구 ' + toolNames.length + '개 전부 수신',
    { 요청한_도구: toolNames, 누락: missing },
  )
  if (missing.length > 0) {
    throw new Error(
      `도구 예시 누락 (${toolNames.length}개 중 ${toolNames.length - missing.length}개 수신): ${missing.join(', ')}`
    )
  }

  return ordered
}

export async function generateToolExamples(cardDescription, direction) {
  if (USE_MOCK) return mockToolExamples(direction)

  // 프롬프트에 넣을 도구 정의는 화면용(TOOL_LAYER_DESC)이 아니라 프롬프트 전용(TOOL_PROMPT_DESC)을 쓴다.
  // 화면용 문구는 "~해보세요. ~새로운 가치가 생깁니다" 형태라 도구마다 동일한 기대효과 수사가
  // 정의의 절반을 차지하고, 그 문장 골격을 모델이 그대로 따라 써서 예시가 도구와 무관하게
  // 같은 형태로 수렴하는 원인이 된다. TOOL_PROMPT_DESC는 조작 방식만 남긴 텍스트다.
  const { system, user } = buildToolExamplesPrompt(
    cardDescription,
    direction,
    TOOL_PROMPT_DESC.expand,
  )

  const result = await callOpenAI(
    [{ role: 'system', content: system }, { role: 'user', content: user }],
    buildToolExamplesSchema(direction.toolNames)
  )
  // 개수가 모자라면 여기서 throw → 호출부(모달)의 catch가 통신 실패와 동일하게 처리한다
  return normalizeExamples(result.options, direction.toolNames)
}

// ──────────────────────────────────────────────────────────
// 호출 3·4: 질문 생성 (확장 3단계 / 변형 2단계 공용)
// cardDescription: 부모 카드 본문
// toolName: 선택한 도구명 (예: '제거')
// toolType: 'expand' | 'transform'
// 반환값: { question }
//
// 확장 2단계의 적용 예시(selectedExample)는 의도적으로 받지 않는다.
// 예시는 "AI가 이미 만들어낸 완성된 해법 하나"이므로, 이걸 질문 생성 재료로 쓰면
// 질문이 '도구가 적용된 질문'이 아니라 '그 예시를 더 파고드는 질문'이 되고,
// 사용자 답변도 그 예시의 소재 범위를 벗어나지 못한다(디자인 고착).
// → 예시는 2단계 화면에서 도구를 이해하고 고르는 용도로만 쓰고,
//   질문의 구체성은 부모 카드 본문(아직 해법이 아닌 '재료')에서 가져온다.
// ──────────────────────────────────────────────────────────
const QUESTION_SCHEMA = {
  name: 'tool_question',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['question'],
    properties: {
      question: { type: 'string', description: '사용자가 해당 도구를 적용해 아이디어를 발전시키도록 유도하는 질문 1개' },
    },
  },
}

export async function generateQuestion(cardDescription, toolName, toolType) {
  if (USE_MOCK) return mockQuestion(toolName)
  // 프롬프트 컨텍스트: 도구 자체의 정의(toolPromptDesc) + 방향성 프레임워크 설명
  // 예시 생성(generateToolExamples)과 같은 정의를 써야 2단계에서 고른 예시와
  // 3단계 질문이 같은 도구 해석 위에 놓인다.
  const toolDef = TOOL_PROMPT_DESC[toolType]?.[toolName] ?? ''
  // 방향성 label — 사용자가 이 도구에 도달한 경위(맥락)일 뿐 도구의 정의가 아니라서,
  // [도구 설명] 안에 넣지 않고 별도 섹션으로 분리한다.
  // 예전에는 [도구 설명] 헤더 아래에 붙어 있어서 방향성 문장이 그 도구의 정의처럼 읽혔고,
  // 묶인 다른 도구의 서술까지 도구 정의 자리에 실렸다(자세한 경위는 frameworkDesc.js 주석).
  // 방향성을 못 찾으면 빈 문자열이 오므로 섹션 자체를 넣지 않는다 — 빈 헤더는 정보를 주지 못한다.
  const frameworkCtx = getFrameworkContext(toolType, toolName)
  const contextSection = frameworkCtx ? `\n\n[선택 맥락]\n${frameworkCtx}` : ''

  // system: 어떤 아이디어가 들어오든 동일하게 적용되는 '처리 규칙'
  // (호출마다 달라지는 실제 데이터는 아래 user에만 둔다)
  //
  // [요소 예시 열거(기능·대상·상황)를 뺀 이유]
  // 괄호 안 열거는 예시로 적었지만 모델에게는 허용 목록으로 읽힌다.
  // 아이디어에 적힌 구체적 요소는 그 셋 말고도 얼마든지 있다(데이터·제약·시점·비용·관계 등).
  // 열거가 오히려 고를 수 있는 범위를 좁혔다. 대신 요소의 조건("아이디어에 실제로 적혀 있는")만
  // 남겼다 — 예시 생성 프롬프트도 열거 없이 같은 형태로 쓴다(toolExamplesPrompt.js).
  // "그 표현 그대로"와 "지어내지 않습니다"를 덧붙인 건, 요소를 모델이 요약·일반화해 버리면
  // 사용자가 자기 아이디어의 어느 부분을 말하는 것인지 알아보지 못하기 때문이다.
  //
  // ['맥락에 맞게 구체적이어야 합니다'를 바꾼 이유]
  // 이 문장은 검사할 수 없다. 무엇이 맥락이고 어디부터 구체적인지 기준이 없어서,
  // 모델이 지켰는지 여부를 자기도 판정할 수 없다. 게다가 질문의 목적(도구를 적용하도록 유도)은
  // system 첫 문단이 이미 말하고 있어 내용도 겹쳤다.
  // → 판정 가능한 형태로 바꿨다: 요소를 바꿔치기했을 때 질문이 그대로 성립하면 실패.
  //   같은 계열의 검사를 예시 생성 프롬프트도 쓴다(그쪽은 도구를 바꿔치기한다).
  //
  // 이 규칙들은 보장이 아니라 유도다. 질문 생성에는 아직 측정 스크립트가 없어
  // (scripts/testToolExamples.mjs는 예시 생성 전용) 효과는 확인되지 않았다.
  const system = `당신은 아이디어 발산 도구의 AI 어시스턴트입니다.
'${TOOL_TYPE_LABEL[toolType]}' 과정에서 선택된 '${toolName}' 사고도구를 사용자가 자신의 아이디어에 적용해 보도록 유도하는 질문을 1개 만듭니다.

[도구 설명]
${toolName}: ${toolDef}${contextSection}

- 질문은 위 도구의 사고 방향에 정확히 맞아야 합니다.
- [아이디어]에 실제로 적혀 있는 구체적 요소 중 이 도구를 적용하기 적합한 것을 스스로 하나 골라, 그 표현 그대로 질문에 넣으세요. 아이디어에 없는 요소를 새로 지어내지 않습니다.
- 고른 요소를 다른 아이디어의 요소로 바꿔 넣어도 질문이 그대로 성립한다면 실패입니다. 이 아이디어이기 때문에 물을 수 있는 질문이어야 합니다.
- 사용자가 답하기 쉽도록 열린 질문 1개만, 한국어로 작성하세요.`

  // user: 이번 호출에만 해당하는 데이터 (부모 카드 본문 + 적용할 도구명)
  const user = `[아이디어]
${cardDescription}

[적용할 도구]
${toolName}

이 도구를 적용하도록 유도하는 질문을 작성해주세요.`

  return callOpenAI(
    [{ role: 'system', content: system }, { role: 'user', content: user }],
    QUESTION_SCHEMA
  )
}

// ──────────────────────────────────────────────────────────
// 호출 5: 파생카드 생성 (확장/변형 제출 공용)
// parentDescription: 부모 카드 본문
// question: 모달에서 제시된 질문
// answer: 사용자가 입력한 답변
// toolName: 적용한 도구명
// toolType: 'expand' | 'transform'
// 반환값: { title, description, highlightPhrases, uxData }
//   - highlightPhrases: answer 안에서 강조할 문구(문자열) 배열
//     → 호출하는 쪽에서 answer.indexOf()로 {start,end} 인덱스로 변환
//   - 본문 생성(창의)과 UX 평가(분석)를 분리해 호출하고, 결과를 합쳐 반환한다.
// ──────────────────────────────────────────────────────────
// 파생카드 "본문" 생성 스키마 (uxData 제외 — UX 평가는 generateUxEval로 분리)
const DERIVED_CONTENT_SCHEMA = {
  name: 'derived_card',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'description', 'highlightPhrases'],
    properties: {
      title:       { type: 'string', description: '파생 아이디어 제목 (한 줄)' },
      description: { type: 'string', description: '파생 아이디어 본문 (2~3문장)' },
      highlightPhrases: {
        type: 'array',
        description: 'answer(사용자 답변) 안에서 도구의 조작 대상·조작 결과에 해당하는 문구. 반드시 answer에 그대로 등장하는 부분 문자열이어야 함',
        items: { type: 'string' },
      },
    },
  },
}

// 파생카드 본문 생성(창의): 부모 아이디어 + 사용자 답변으로 발전된 아이디어를 만든다.
// topic: 사용자가 홈 화면에서 입력한 원문 주제 (씨드카드 data.topic에서 조회해 전달)
// signal: AbortSignal (생략 가능) — 생성 중 X 아이콘으로 취소 시 이 호출을 중단
// 반환값: { title, description, highlightPhrases }
async function generateDerivedContent(parentDescription, topic, question, answer, toolName, toolType, signal) {
  if (USE_MOCK) return mockDerivedContent(toolName, answer)
  // 도구 자체의 정의(toolPromptDesc)를 질문 생성(generateQuestion)과 동일하게 함께 넘긴다.
  // highlightPhrases는 "답변에서 이 도구가 적용된 부분"을 가려내는 판별 작업인데,
  // 도구명만 주면 판단 기준이 없어 도구와 무관한 부연 설명까지 뽑히는 문제가 있었다.
  // 판별 기준으로는 조작 방식 서술이 맞다 — 화면용의 기대효과 수사는 판별에 기여하지 않는다.
  // toolType으로 조회하므로 이름이 같은 expand '제거'와 transform '제거'도 각자의 정의로 구분된다.
  const toolDef = TOOL_PROMPT_DESC[toolType]?.[toolName] ?? ''
  // 정의가 비어 있으면(데이터 누락) 섹션 자체를 넣지 않는다.
  // "결합: " 같은 빈 설명은 기준을 주지 못하면서 있는 것처럼만 보인다.
  const toolDefSection = toolDef ? `\n\n[도구 설명]\n${toolName}: ${toolDef}` : ''

  // 주제 경계 규칙. topic이 없으면(구버전 캔버스) 빈 문자열이 오므로 섹션 자체를 넣지 않는다.
  const boundaryRule = buildTopicBoundaryRule(topic)
  const topicSection = boundaryRule ? `\n\n${boundaryRule}` : ''

  // system 구성:
  //   [도구 설명](toolPromptDesc) → [주제 경계](topicScope) → [역할과 목적](이 호출 전용)
  //   → [아이디어 작성 규칙]·[실현 가능성 기준](ideaRules) → [하이라이트 규칙](이 호출 전용)
  //
  // [역할과 목적]은 씨드 프롬프트에도 같은 이름의 섹션이 있지만 내용이 달라 공유하지 않는다.
  // 씨드는 "발산의 출발점"이고, 파생은 완결된 아이디어이면서 동시에 다음 확장·변형의 부모다.
  // 부모 관계 문장(부모를 그대로 다시 쓰지 않는다)도 성격이 같아 이 섹션으로 모았다.
  //   — 예전에는 buildIdeaWritingRule() 뒤에 한 줄로 붙어 있어서, 공용 규칙의 일부인지
  //     이 호출만의 조건인지 프롬프트만 봐서는 갈리지 않았다.
  //
  // ["답변을 옮겨 적지 말고 기능으로 정리하라"를 넣은 이유]
  // 실제 생성된 카드 중 description이 사용자 답변과 거의 같은 것들이 있었다.
  // 답변은 질문에 대한 대답이라 사례 나열이나 구어체인 경우가 많은데, 그게 그대로 본문이 되면
  // 카드가 '아이디어'가 아니라 '답변 복사본'이 되어 다음 확장·변형의 재료로 쓰기 어렵다.
  // (관찰된 형태: "스트레스 높으면 마그네슘 재료를, 수면의 질이 낮으면 캐모마일차를…"처럼
  //  답변이 나열한 사례가 그대로 본문에 옮겨진 카드. 여기서 아이디어에 해당하는 것은
  //  개별 사례가 아니라 "사용자 상태를 판단해 추천 재료를 다르게 한다"는 동작 규칙이다.)
  // 이 사례 자체는 프롬프트에 넣지 않는다 — 식단·건강 도메인이 무관한 주제의 파생카드까지
  // 그 틀로 끌고 갈 위험이 있어서, 구조("무엇을 판단해 무엇을 다르게 하는지")만 규칙으로 옮겼다.
  //
  // 답변의 구체성이 사라지는 것 아니냐는 우려는 하이라이트가 받는다 —
  // 사용자 답변 원문은 사이드패널에 그대로 남고 도구가 적용된 자리가 표시되므로,
  // description까지 답변 문장을 보존할 필요가 없다. 역할이 갈린다.
  //
  // 뒤의 두 규칙 블록은 씨드카드 생성이 쓰는 문장을 그대로 가져온다.
  // 파생카드도 캔버스에 놓이면 씨드와 똑같이 사용자가 발전시키는 재료이고 UX 평가 대상이므로,
  // 좋은 아이디어의 기준이 달라야 할 이유가 없다. 예전에는 여기 title·description 규칙을
  // 한 줄씩만 적어 둬서, 씨드 본문은 대상·상황·문제·해결이 갖춰지는데 파생 본문은
  // "2~3문장"만 지키면 되는 상태로 품질 기준이 벌어졌다.
  //
  // highlightPhrases 규칙은 가져오지 않고 여기 남긴다 — 씨드 응답에는 없는 필드라
  // 공용 규칙에 섞으면 씨드 프롬프트가 존재하지 않는 출력 필드를 설명하게 된다.
  //
  // [하이라이트 규칙을 도구별로 쓰지 않고 정의에서 유도하게 한 이유]
  // 예전 규칙은 "'${toolName}' 도구가 적용된 핵심 부분"이 전부여서, 도구 이름만 갈릴 뿐
  // 무엇을 핵심으로 볼지는 모델의 상식에 맡겨져 있었다. 그렇다고 도구 15개(expand 11 + transform 4)의
  // 판별 기준을 따로 쓰면, toolPromptDesc가 이미 겪은 문제(정의가 서로 겹쳐 도구가 안 갈림)가
  // 기준 쪽에서 재발하고 도구가 늘 때마다 두 벌을 같이 고쳐야 한다.
  // TOOL_PROMPT_DESC는 효과 서술을 빼고 조작 방식만 남긴 덕에 15개가 모두
  // "무엇을(대상) 어떻게 한다(결과)" 골격을 공유한다 → 그 두 자리를 답변에서 찾으라고 하면
  // 도구별 기준이 정의로부터 자동으로 따라 나온다. 규칙은 한 벌로 끝나고 도구가 늘어도 그대로다.
  //
  // 특정 도구의 예시(예: '대체'는 무엇이 무엇으로 바뀌었는지)는 일부러 넣지 않는다.
  // 한 도구의 사례가 다른 도구의 발췌 형태까지 그 틀로 끌고 가기 때문이다
  // (같은 성분의 전염을 toolLayerDesc → 예시 생성에서 이미 관찰했다).
  // 발췌 개수 상한도 두지 않는다 — 답변마다 조작이 드러나는 자리 수가 다른데
  // 상한이 기준처럼 읽히면 있는 자리를 못 넣거나 빈 자리를 채우게 된다.
  // 과다 발췌가 실제로 관찰되면 그때 상한을 얹는다.
  //
  // 발췌 길이("최소 단위로 자르라")와 겹침 금지도 같은 이유로 넣지 않았다.
  // 둘 다 모델이 지켰는지 스스로 판정할 수 없는 조건이고 — 특히 겹침 판정은 문자 위치 계산을
  // 요구하는데, 좌표 대신 문구를 받기로 한 이유가 바로 모델이 글자 수를 못 세기 때문이다.
  // 겹친 구간은 phrasesToHighlights가 뒤엣것을 버려 렌더는 어차피 지켜진다(손실은 로그에 남는다).
  // → 처음부터 조건을 많이 걸지 않고, logTransform의 overlap/notFound 비율을 보고 필요한 것만 얹는다.
  //
  // 대신 규칙 앞에 이 필드가 화면에서 무엇을 하는지를 적었다.
  // 조건을 덜어낸 자리를 목적으로 메우는 쪽이 낫다고 봤다 — 발췌 후보가 여럿일 때
  // "어느 쪽이 규칙에 맞나"는 판정이 안 되지만 "어느 쪽이 사용자에게 알아보이나"는 방향이 잡힌다.
  // 읽는 사람이 답변을 쓴 본인이라는 점(자기 문장에서 알아볼 수 있는 덩어리여야 한다)과,
  // 사용자가 도구를 의식하지 않고 답했다는 점(본인도 모르는 적용 지점을 짚어주는 일이다)이
  // 발췌 단위를 정하는 실질적 기준이 된다. 길이 규칙을 빼도 조각 단어가 덜 나오길 기대한 부분이다.
  const system = `당신은 아이디어 발산 도구의 AI 어시스턴트입니다.
사용자가 '${TOOL_TYPE_LABEL[toolType]}'의 '${toolName}' 도구로 답변한 내용을 바탕으로, 발전된 파생 아이디어 카드를 생성합니다.${toolDefSection}${topicSection}

[역할과 목적]
- 생성하는 파생 아이디어는 그 자체로 완결된 아이디어인 동시에, 사용자가 여기서 다시 확장·변형을 이어가는 재료로도 사용됩니다.
- 부모 아이디어에 사용자 답변을 반영해 발전시킨 내용으로 작성합니다. 부모 아이디어를 그대로 다시 쓰지 않습니다.
- 사용자 답변은 아이디어의 재료이지 본문이 아닙니다. 답변의 문장을 옮겨 적지 말고, 답변에서 파악한 내용을 제품·서비스의 기능으로 정리해 작성합니다.
- 답변에 개별 사례가 나열되어 있으면 사례를 그대로 옮기지 말고, 그 사례들이 공통으로 따르는 동작 규칙(무엇을 판단해 무엇을 다르게 하는지)으로 서술합니다.

${buildIdeaWritingRule()}

${buildFeasibilityRule()}

[하이라이트 규칙]
highlightPhrases는 사용자 답변(answer)에서 위 [도구 설명]의 조작이 실제로 일어난 자리를 발췌한 것입니다.
사용자는 도구를 의식하지 않고 질문에 답했을 뿐이어서, 자기 답변의 어느 부분이 '${toolName}' 도구를 적용한 결과인지 모르는 상태입니다.
발췌한 문구는 사용자가 자기 답변을 다시 읽을 때 그 자리에 표시되어, 본인이 어디에 도구를 적용했는지 알아보게 하는 데 쓰입니다.
- [도구 설명]의 정의를 "무엇을(조작 대상)"과 "어떻게 되었는지(조작 결과)" 두 자리로 읽으세요.
- 답변에서 그 자리를 채운 표현을 발췌하세요. 답변에 나타난 자리만 넣습니다.
- 반드시 답변에 글자 그대로 존재하는 부분 문자열만 넣으세요. 글자를 고치거나 요약하지 않습니다.
- 답변이 아니라 [부모 아이디어]에 있던 표현, 그리고 이유·기대효과·부연 설명은 넣지 않습니다.
- 어느 자리도 답변에서 찾을 수 없으면 빈 배열을 반환하세요.`

  const user = `[부모 아이디어]
${parentDescription}

[질문]
${question}

[사용자 답변]
${answer}

이 답변을 반영한 파생 아이디어 카드를 작성해주세요.`

  return callOpenAI(
    [{ role: 'system', content: system }, { role: 'user', content: user }],
    DERIVED_CONTENT_SCHEMA,
    TEMP_CREATIVE,
    signal,
  )
}

// 파생카드 생성(공개 함수): 본문 생성 → 생성된 본문으로 UX 평가를 순차 실행해 합쳐 반환한다.
// topic: 사용자가 홈 화면에서 입력한 원문 주제 (씨드카드 data.topic에서 조회해 전달)
// signal: AbortSignal (생략 가능) — 모달에서 생성 중 X 아이콘으로 취소 시 두 호출 모두 중단시키기 위해 그대로 전달
// onProgress: 생략 가능 — 대기 UI 체크리스트 갱신용. 호출 A 완료 시 'content', 호출 B 완료 시 'uxEval'을 넘긴다.
// 반환값: { title, description, highlightPhrases, uxData }  ← 기존과 동일
export async function generateDerivedCard(parentDescription, topic, question, answer, toolName, toolType, signal, onProgress) {
  // 1) 본문 생성 (창의, temperature 높음)
  const content = await generateDerivedContent(parentDescription, topic, question, answer, toolName, toolType, signal)
  onProgress?.('content')
  // 2) 생성된 본문을 대상으로 UX 평가 (분석, temperature 낮음)
  const uxData = await generateUxEval(content.title, content.description, signal)
  onProgress?.('uxEval')
  return { ...content, uxData }
}

// ──────────────────────────────────────────────────────────
// 호출 6: 직접작성 카드 생성
// title, description: 사용자가 직접 입력한 아이디어 제목·설명
// 반환값: { writeRec, writeExpect, writeRecReason, uxData }
//   - writeRec: 'expand'(확장하기) | 'transform'(변형하기) — 추천 도구 카테고리
//   - writeExpect: 추천 도구 적용 시 기대효과 (도구레이어 설명)
//   - writeRecReason: 추천 이유 (상세패널)
// ──────────────────────────────────────────────────────────
// 직접작성 카드 "본문" 생성 스키마 (uxData 제외 — UX 평가는 generateUxEval로 분리)
const WRITE_CONTENT_SCHEMA = {
  name: 'write_card',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['writeRec', 'writeExpect', 'writeRecReason'],
    properties: {
      writeRec:       { type: 'string', enum: ['expand', 'transform'] },
      writeExpect:    { type: 'string', description: '추천 도구로 이 아이디어를 발전시켰을 때의 기대효과 (1~2문장)' },
      writeRecReason: { type: 'string', description: '이 도구를 추천하는 이유 (1~2문장)' },
    },
  },
}

// 직접작성 카드 추천 도구 생성(분석): 사용자 아이디어에 맞는 추천 도구·기대효과·추천이유를 만든다.
// 새 아이디어 발산이 아니라 판단·근거 서술이므로 낮은 temperature(TEMP_ANALYTIC)를 사용한다.
// (분류 성격인 writeRec의 일관성 확보 + expand/transform 영문 누출 억제 목적)
// signal: AbortSignal (생략 가능) — 생성 중 X 아이콘/취소 버튼으로 취소 시 이 호출을 중단
// 반환값: { writeRec, writeExpect, writeRecReason }
async function generateWriteContent(title, description, signal) {
  if (USE_MOCK) return mockWriteContent()
  const system = `당신은 아이디어 발산 도구의 AI 어시스턴트입니다.
사용자가 직접 작성한 아이디어를 더 발전시키기 위해, 다음 두 접근 중 어떤 것이 더 적합한지 추천합니다.

[추천 대상 도구]
- ${TOOL_TYPE_LABEL.expand}: ${WRITE_TOOL_DESC.expand}
- ${TOOL_TYPE_LABEL.transform}: ${WRITE_TOOL_DESC.transform}

[작성 규칙]
- writeRec: 이 아이디어를 발전시키기에 더 적합한 쪽을 선택하세요. (${TOOL_TYPE_LABEL.expand} 선택 시 writeRec="expand", ${TOOL_TYPE_LABEL.transform} 선택 시 writeRec="transform")
- writeExpect: 추천한 접근으로 이 아이디어를 발전시켰을 때 기대되는 효과를 1~2문장으로, 반드시 '${TOOL_TYPE_LABEL.expand}' 또는 '${TOOL_TYPE_LABEL.transform}'이라는 한글 이름만 사용해 작성하세요.
- writeRecReason: 왜 그 접근을 추천하는지 이 아이디어의 특성에 근거해 1~2문장으로, 반드시 '${TOOL_TYPE_LABEL.expand}' 또는 '${TOOL_TYPE_LABEL.transform}'이라는 한글 이름만 사용해 작성하세요.`

  const user = `[아이디어 제목]
${title}

[아이디어 설명]
${description}

이 아이디어에 적합한 발전 도구를 추천해주세요.`

  return callOpenAI(
    [{ role: 'system', content: system }, { role: 'user', content: user }],
    WRITE_CONTENT_SCHEMA,
    TEMP_ANALYTIC,
    signal,
  )
}

// 직접작성 카드 생성(공개 함수): 본문 생성과 UX 평가를 병렬 실행해 합쳐 반환한다.
// (본문·UX 평가 모두 사용자가 직접 입력한 title·description을 입력으로 쓰므로 병렬 가능 → 지연 최소화)
// signal: AbortSignal (생략 가능) — 모달에서 생성 중 X 아이콘/취소 버튼으로 취소 시 두 호출 모두 중단시키기 위해 그대로 전달
// onProgress: 생략 가능 — 대기 UI 체크리스트 갱신용. 두 호출은 병렬이라 완료 순서가 정해져 있지 않으므로,
//   각자 끝나는 즉시 'content'/'uxEval'을 알린다 (Promise.all에 바로 넘기면 둘 다 끝나야만 알 수 있어 개별 완료 시점을 잃는다)
// 반환값: { writeRec, writeExpect, writeRecReason, uxData }  ← 기존과 동일
export async function generateWriteCard(title, description, signal, onProgress) {
  const contentP = generateWriteContent(title, description, signal).then((r) => {
    onProgress?.('content')
    return r
  })
  const uxP = generateUxEval(title, description, signal).then((r) => {
    onProgress?.('uxEval')
    return r
  })
  const [content, uxData] = await Promise.all([contentP, uxP])
  return { ...content, uxData }
}

// 공백을 무시하고 answer에서 문구 위치를 찾는다 (정확 일치 실패 시의 구제 수단)
// AI는 answer를 그대로 복사하는 게 아니라 다시 생성하므로, 띄어쓰기가 달라지는 경우가 있다.
// (사용자 "알림기능" → AI "알림 기능") 이런 차이로 하이라이트를 통째로 잃지 않도록 한다.
// answer에서 공백을 뺀 문자열로 찾은 뒤, 원문 인덱스로 되돌려 반환한다.
function findIgnoringWhitespace(answer, phrase) {
  const strippedPhrase = phrase.replace(/\s+/g, '')
  if (!strippedPhrase) return null

  // 공백을 제거한 answer + "압축 문자열의 각 글자 → 원문 인덱스" 대응표를 만든다
  let compact = ''
  const indexMap = []
  for (let i = 0; i < answer.length; i++) {
    if (/\s/.test(answer[i])) continue
    compact += answer[i]
    indexMap.push(i)
  }

  const at = compact.indexOf(strippedPhrase)
  if (at === -1) return null

  // 압축 문자열에서의 위치를 원문 인덱스로 환산 (구간 안의 공백은 그대로 포함됨)
  return {
    start: indexMap[at],
    end:   indexMap[at + strippedPhrase.length - 1] + 1,
  }
}

// highlightPhrases(문구 배열)를 answer 기준 {start, end} 인덱스 배열로 변환
// - answer에서 문구 위치를 찾아 인덱스로 계산 (LLM의 글자수 오류 회피)
// - 정확히 일치하지 않으면 공백을 무시하고 한 번 더 찾는다
// - 그래도 못 찾은 문구는 건너뜀, 겹치는 구간은 제거 (QAContent는 비중첩 구간 가정)
export function phrasesToHighlights(answer, phrases) {
  const found = []

  // 문구별 매칭 경로 기록 (후처리 로그용)
  //   exact    답변에 그대로 있어 찾음
  //   loose    공백을 무시하고 재탐색해 찾음 (AI가 띄어쓰기를 바꿔 쓴 경우)
  //   notFound 못 찾아 버림 (AI가 답변에 없는 표현을 만들어낸 경우)
  //   overlap  찾았으나 앞 구간과 겹쳐 버림
  // 초기값을 notFound로 두고 찾을 때마다 덮어쓴다 — 어느 분기로도 안 걸리면 못 찾은 것이다.
  const trace = []

  for (const phrase of phrases ?? []) {
    if (!phrase) continue

    const entry = { phrase, result: 'notFound' }
    trace.push(entry)

    const start = answer.indexOf(phrase)
    if (start !== -1) {
      entry.result = 'exact'
      found.push({ start, end: start + phrase.length, entry })
      continue
    }

    // 정확 일치 실패 → 공백 무시하고 재탐색
    const loose = findIgnoringWhitespace(answer, phrase)
    if (loose) {
      entry.result = 'loose'
      found.push({ ...loose, entry })
      continue
    }

    // 재탐색으로도 못 찾음 = AI가 answer에 없는 표현을 만들어낸 경우.
    // 조용히 버리면 "하이라이트가 안 뜨는" 증상만 남아 원인 파악이 어려우므로 경고를 남긴다.
    console.warn('[highlight] 답변에서 찾지 못한 문구라 하이라이트를 건너뜁니다:', phrase)
  }

  //ai가 생성한 하이라이트문구 겹치는 부분 조정하는 코드

  found.sort((a, b) => a.start - b.start)

  const result = []
  let lastEnd = -1
  for (const h of found) {
    if (h.start >= lastEnd) {
      // entry는 로그용 참조이므로 카드 데이터에 섞이지 않도록 start/end만 담아 내보낸다
      result.push({ start: h.start, end: h.end })
      lastEnd = h.end
    } else {
      h.entry.result = 'overlap'
    }
  }

  // AI가 준 문구 수와 실제 하이라이트 수가 다르면 여기서 드러난다.
  // (응답 로그의 highlightPhrases는 'AI가 만든 것', 이 로그는 '화면에 나간 것')
  logTransform(
    'derived_card',
    'phrasesToHighlights: 문구 ' + trace.length + '개 → 하이라이트 ' + result.length + '개',
    trace,
  )

  return result
}
