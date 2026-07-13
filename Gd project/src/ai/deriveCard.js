// 확장/변형/직접작성 모달에서 사용하는 AI 호출 함수 모음
// 본문 생성(창의)과 UX 평가(분석)를 분리하고, 공통 호출은 openaiClient의 callOpenAI를 사용한다.

import { TOOL_LAYER_DESC } from '../data/toolLayerDesc.js'
import { getFrameworkContext, getDirectionReasoning } from '../data/frameworkDesc.js'
import { mockToolExamples, mockQuestion, mockDerivedContent, mockWriteContent } from './__mock__.js'
// UX 평가 전용 호출 (seedCard.js와 공유하는 공통 모듈)
import { generateUxEval } from './uxEval.js'
// 공통 OpenAI 클라이언트
import { callOpenAI, USE_MOCK, TEMP_CREATIVE, TEMP_ANALYTIC } from './openaiClient.js'

// 도구 유형별 한글 라벨 (프롬프트에 사용)
const TOOL_TYPE_LABEL = { expand: '확장하기', transform: '변형하기' }

// ──────────────────────────────────────────────────────────
// 호출 2: 도구별 예시 생성 (확장 모달 2단계 선택지)
// cardDescription: 부모 카드 본문
// direction: { label, toolNames: ['제거','대체', ...] } — 선택한 방향성과 그 도구명들
// 반환값: [{ name, example }] — 입력한 도구 순서대로
// ──────────────────────────────────────────────────────────
const EXAMPLES_SCHEMA = {
  name: 'tool_examples',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['examples'],
    properties: {
      examples: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'example'],
          properties: {
            name:    { type: 'string', description: '도구명 (입력한 도구명 그대로)' },
            example: { type: 'string', description: '이 도구를 아이디어에 적용했을 때의 구체적 예시 (1~2문장)' },
          },
        },
      },
    },
  },
}

export async function generateToolExamples(cardDescription, direction) {
  if (USE_MOCK) return mockToolExamples(direction)
  // 방향성 프레임워크 설명 (예시는 확장하기에서만 사용하므로 'expand' 고정)
  const reasoning = getDirectionReasoning('expand', direction.label)

  const system = `당신은 아이디어 발산 도구의 AI 어시스턴트입니다.
사용자가 선택한 발전 방향성에 속한 각 사고도구를, 주어진 아이디어에 실제로 적용하면 어떤 결과가 나올지 구체적인 예시를 작성합니다.
- 입력으로 주어진 도구만, 입력된 도구명 그대로 사용하세요.
- example은 해당 도구를 이 아이디어에 적용한 결과를 1~2문장으로 구체적으로 묘사하세요.
- 각 도구의 고유한 사고 방향이 예시에 분명히 드러나도록 작성하세요.`

  const user = `[아이디어]
${cardDescription}

[선택한 방향성]
${direction.label}
${reasoning}

[이 방향성의 도구 목록]
${direction.toolNames.join(', ')}

각 도구별로 이 아이디어에 적용한 예시를 작성해주세요.`

  const result = await callOpenAI(
    [{ role: 'system', content: system }, { role: 'user', content: user }],
    EXAMPLES_SCHEMA
  )
  return result.examples
}

// ──────────────────────────────────────────────────────────
// 호출 3·4: 질문 생성 (확장 3단계 / 변형 2단계 공용)
// cardDescription: 부모 카드 본문
// toolName: 선택한 도구명 (예: '제거')
// toolType: 'expand' | 'transform'
// selectedExample: 사용자가 2단계에서 선택한 적용 예시 (확장만 해당, 변형은 '')
// 반환값: { question }
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

export async function generateQuestion(cardDescription, toolName, toolType, selectedExample = '') {
  if (USE_MOCK) return mockQuestion(toolName)
  // 프롬프트 컨텍스트: 도구 자체의 정의(toolLayerDesc) + 방향성 프레임워크 설명
  const toolDef = TOOL_LAYER_DESC[toolType]?.[toolName] ?? ''
  const frameworkCtx = getFrameworkContext(toolType, toolName)

  const system = `당신은 아이디어 발산 도구의 AI 어시스턴트입니다.
'${TOOL_TYPE_LABEL[toolType]}' 과정에서 선택된 '${toolName}' 사고도구를 사용자가 자신의 아이디어에 적용해 보도록 유도하는 질문을 1개 만듭니다.

[도구 설명]
${toolName}: ${toolDef}
${frameworkCtx}

- 질문은 위 도구의 사고 방향에 정확히 맞아야 합니다.
- 사용자가 방금 선택한 적용 방향이 주어지면, 그 방향을 구체화하는 질문이어야 합니다.
- 질문은 이 아이디어의 맥락에 맞게 구체적이어야 합니다.
- 사용자가 답하기 쉽도록 열린 질문 1개만, 한국어로 작성하세요.`

  // 2단계에서 선택한 예시가 있으면 프롬프트에 적용 방향으로 추가
  const exampleSection = selectedExample
    ? `\n\n[사용자가 선택한 적용 방향]\n${selectedExample}`
    : ''

  const user = `[아이디어]
${cardDescription}

[적용할 도구]
${toolName}${exampleSection}

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
// 반환값: { title, description, highlightPhrases }
async function generateDerivedContent(parentDescription, question, answer, toolName, toolType) {
  if (USE_MOCK) return mockDerivedContent(toolName, answer)
  const system = `당신은 아이디어 발산 도구의 AI 어시스턴트입니다.
사용자가 '${TOOL_TYPE_LABEL[toolType]}'의 '${toolName}' 도구로 답변한 내용을 바탕으로, 발전된 파생 아이디어 카드를 생성합니다.

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
  )
}

// 파생카드 생성(공개 함수): 본문 생성 → 생성된 본문으로 UX 평가를 순차 실행해 합쳐 반환한다.
// 반환값: { title, description, highlightPhrases, uxData }  ← 기존과 동일
export async function generateDerivedCard(parentDescription, question, answer, toolName, toolType) {
  // 1) 본문 생성 (창의, temperature 높음)
  const content = await generateDerivedContent(parentDescription, question, answer, toolName, toolType)
  // 2) 생성된 본문을 대상으로 UX 평가 (분석, temperature 낮음)
  const uxData = await generateUxEval(content.title, content.description)
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
// 반환값: { writeRec, writeExpect, writeRecReason }
async function generateWriteContent(title, description) {
  if (USE_MOCK) return mockWriteContent()
  const system = `당신은 아이디어 발산 도구의 AI 어시스턴트입니다.
사용자가 직접 작성한 아이디어를 더 발전시키기 위해, 다음 두 접근 중 어떤 것이 더 적합한지 추천합니다.

[추천 대상 도구]
- ${TOOL_TYPE_LABEL.expand}: 요소의 구조와 관계를 재배치하는 접근 (없애기·합치기·뒤집기·외부에서 가져오기 등)
- ${TOOL_TYPE_LABEL.transform}: 요소의 강도와 존재를 조정하는 접근 (증가·감소·창출·제거)

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
  )
}

// 직접작성 카드 생성(공개 함수): 본문 생성과 UX 평가를 병렬 실행해 합쳐 반환한다.
// (본문·UX 평가 모두 사용자가 직접 입력한 title·description을 입력으로 쓰므로 병렬 가능 → 지연 최소화)
// 반환값: { writeRec, writeExpect, writeRecReason, uxData }  ← 기존과 동일
export async function generateWriteCard(title, description) {
  const [content, uxData] = await Promise.all([
    generateWriteContent(title, description),  // 본문 생성 (창의)
    generateUxEval(title, description),         // UX 평가 (분석)
  ])
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
  for (const phrase of phrases ?? []) {
    if (!phrase) continue

    const start = answer.indexOf(phrase)
    if (start !== -1) {
      found.push({ start, end: start + phrase.length })
      continue
    }

    // 정확 일치 실패 → 공백 무시하고 재탐색
    const loose = findIgnoringWhitespace(answer, phrase)
    if (loose) {
      found.push(loose)
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
      result.push(h)
      lastEnd = h.end
    }
  }
  return result
}
