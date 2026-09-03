// 확장/변형/직접작성 모달에서 사용하는 AI 호출 함수 모음
// 본문 생성(창의)과 UX 평가(분석)를 분리하고, 공통 호출은 openaiClient의 callOpenAI를 사용한다.

import { TOOL_LAYER_DESC } from '../data/toolLayerDesc.js'
// 확장 2단계 예시 생성 전용 도구 정의 — 화면용(toolLayerDesc)과 달리 기대효과 서술을 뺀 텍스트
import { TOOL_EXAMPLE_DESC } from '../data/toolExampleDesc.js'
import { getFrameworkContext } from '../data/frameworkDesc.js'
// 확장 2단계 예시 생성의 요청 사양(프롬프트 문장·응답 스키마).
// Vite 전용 코드가 없는 순수 모듈이라 Node 테스트 스크립트도 같은 함수를 부를 수 있다.
// → 앱이 실제로 보내는 프롬프트와 테스트가 측정하는 프롬프트가 어긋날 수 없다.
import { buildToolExamplesPrompt, buildToolExamplesSchema } from './prompts/toolExamplesPrompt.js'
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
// 반환값: [{ name, example }] — 입력한 도구 순서대로
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
function normalizeExamples(examples, toolNames) {
  const ordered = toolNames.map((name) => ({
    name,
    example: examples.find((e) => e.name === name)?.example?.trim() ?? '',
  }))

  const missing = ordered.filter((e) => e.example === '').map((e) => e.name)

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

  // 프롬프트에 넣을 도구 정의는 화면용(TOOL_LAYER_DESC)이 아니라 프롬프트 전용(TOOL_EXAMPLE_DESC)을 쓴다.
  // 화면용 문구는 "~해보세요. ~새로운 가치가 생깁니다" 형태라 도구마다 동일한 기대효과 수사가
  // 정의의 절반을 차지하고, 그 문장 골격을 모델이 그대로 따라 써서 예시가 도구와 무관하게
  // 같은 형태로 수렴하는 원인이 된다. TOOL_EXAMPLE_DESC는 조작 방식만 남긴 텍스트다.
  const { system, user } = buildToolExamplesPrompt(
    cardDescription,
    direction,
    TOOL_EXAMPLE_DESC.expand,
  )

  const result = await callOpenAI(
    [{ role: 'system', content: system }, { role: 'user', content: user }],
    buildToolExamplesSchema(direction.toolNames)
  )
  // 개수가 모자라면 여기서 throw → 호출부(모달)의 catch가 통신 실패와 동일하게 처리한다
  return normalizeExamples(result.examples, direction.toolNames)
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
  // 프롬프트 컨텍스트: 도구 자체의 정의(toolLayerDesc) + 방향성 프레임워크 설명
  const toolDef = TOOL_LAYER_DESC[toolType]?.[toolName] ?? ''
  const frameworkCtx = getFrameworkContext(toolType, toolName)

  // system: 어떤 아이디어가 들어오든 동일하게 적용되는 '처리 규칙'
  // (호출마다 달라지는 실제 데이터는 아래 user에만 둔다)
  const system = `당신은 아이디어 발산 도구의 AI 어시스턴트입니다.
'${TOOL_TYPE_LABEL[toolType]}' 과정에서 선택된 '${toolName}' 사고도구를 사용자가 자신의 아이디어에 적용해 보도록 유도하는 질문을 1개 만듭니다.

[도구 설명]
${toolName}: ${toolDef}
${frameworkCtx}

- 질문은 위 도구의 사고 방향에 정확히 맞아야 합니다.
- [아이디어]에 언급된 구체적 요소(기능·대상·상황) 중 이 도구를 적용하기 적합한 대상을 스스로 하나 찾아, 질문에 명시적으로 언급하세요.
- 질문은 이 아이디어의 맥락에 맞게 구체적이어야 합니다.
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
        description: 'answer(사용자 답변) 안에서 도구가 적용된 핵심 부분의 문구. 반드시 answer에 그대로 등장하는 부분 문자열이어야 함',
        items: { type: 'string' },
      },
    },
  },
}

// 파생카드 본문 생성(창의): 부모 아이디어 + 사용자 답변으로 발전된 아이디어를 만든다.
// signal: AbortSignal (생략 가능) — 생성 중 X 아이콘으로 취소 시 이 호출을 중단
// 반환값: { title, description, highlightPhrases }
async function generateDerivedContent(parentDescription, question, answer, toolName, toolType, signal) {
  if (USE_MOCK) return mockDerivedContent(toolName, answer)
  // 도구 자체의 정의(toolLayerDesc)를 질문 생성(generateQuestion)과 동일하게 함께 넘긴다.
  // highlightPhrases는 "답변에서 이 도구가 적용된 부분"을 가려내는 판별 작업인데,
  // 도구명만 주면 판단 기준이 없어 도구와 무관한 부연 설명까지 뽑히는 문제가 있었다.
  // toolType으로 조회하므로 이름이 같은 expand '제거'와 transform '제거'도 각자의 정의로 구분된다.
  const toolDef = TOOL_LAYER_DESC[toolType]?.[toolName] ?? ''
  // 정의가 비어 있으면(데이터 누락) 섹션 자체를 넣지 않는다.
  // "결합: " 같은 빈 설명은 기준을 주지 못하면서 있는 것처럼만 보인다.
  const toolDefSection = toolDef ? `\n\n[도구 설명]\n${toolName}: ${toolDef}` : ''

  const system = `당신은 아이디어 발산 도구의 AI 어시스턴트입니다.
사용자가 '${TOOL_TYPE_LABEL[toolType]}'의 '${toolName}' 도구로 답변한 내용을 바탕으로, 발전된 파생 아이디어 카드를 생성합니다.${toolDefSection}

[아이디어 작성 규칙]
- title: 발전된 아이디어를 한 줄로 표현한 제목
- description: 부모 아이디어와 사용자 답변을 반영해 발전시킨 본문 2~3문장
- highlightPhrases: 사용자 답변(answer)에서 '${toolName}' 도구가 적용된 핵심 부분을 그대로 발췌한 문구들. 반드시 answer에 글자 그대로 존재하는 부분 문자열만 넣으세요. 없으면 빈 배열.`

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
// signal: AbortSignal (생략 가능) — 모달에서 생성 중 X 아이콘으로 취소 시 두 호출 모두 중단시키기 위해 그대로 전달
// onProgress: 생략 가능 — 대기 UI 체크리스트 갱신용. 호출 A 완료 시 'content', 호출 B 완료 시 'uxEval'을 넘긴다.
// 반환값: { title, description, highlightPhrases, uxData }  ← 기존과 동일
export async function generateDerivedCard(parentDescription, question, answer, toolName, toolType, signal, onProgress) {
  // 1) 본문 생성 (창의, temperature 높음)
  const content = await generateDerivedContent(parentDescription, question, answer, toolName, toolType, signal)
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
