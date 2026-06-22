// 확장/변형 모달에서 사용하는 AI 호출 함수 모음
// seedCard.js와 동일한 fetch 패턴을 쓰되, 공통 호출 부분을 callOpenAI로 묶었다.

import { TOOL_LAYER_DESC } from '../data/toolLayerDesc.js'
import { getFrameworkContext, getDirectionReasoning } from '../data/frameworkDesc.js'
import { mockToolExamples, mockQuestion, mockDerivedCard, mockWriteCard } from './__mock__.js'

// VITE_USE_AI_MOCK=true 이면 OpenAI를 호출하지 않고 mock 데이터를 즉시 반환
const USE_MOCK = import.meta.env.VITE_USE_AI_MOCK === 'true'

// OpenAI API 키 (.env의 VITE_OPENAI_API_KEY)
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY

// 공통 OpenAI 호출 함수
// messages: [{role, content}] 배열
// schema:   { name, schema } 형태의 JSON Schema (Structured Outputs)
// 반환값:   파싱된 JSON 객체
async function callOpenAI(messages, schema) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      // 아이디어 발산이라 다양성을 위해 약간 높게 설정 (seedCard와 동일)
      temperature: 0.9,
      messages,
      response_format: {
        type: 'json_schema',
        json_schema: { name: schema.name, strict: true, schema: schema.schema },
      },
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`OpenAI API 오류 (${response.status}): ${errText}`)
  }

  const data = await response.json()
  return JSON.parse(data.choices[0].message.content)
}

// 도구 유형별 한글 라벨 (프롬프트에 사용)
const TOOL_TYPE_LABEL = { expand: '확장하기', transform: '변형하기' }

// UX 평가 프레임워크 설명 (seedCard.js와 동일 규칙 — 프롬프트에 재사용)
const UX_RULE = `[UX 평가 규칙]
평가요소는 아래 7개로 고정되어 있으며, 새로운 항목을 만들지 마세요. 각 요소를 채점만 하세요.
- Business 영역: 창의성, 실현 가능성
- Human 영역: 사용 기대성, 효율 기대성, 명료성, 매력성
- Social 영역: 사회적 도움성

- areas: 위 3개 영역을 key(business/human/social) 순서대로 모두 포함하고, 각 영역의 criteria에는 그 영역에 속한 평가요소를 정확히 넣으세요.
- area의 status: 그 영역 criteria 중 하나라도 needsImprovement가 true이면 'supplement', 모두 false이면 'satisfied'.
- evaluationItems: 위 7개 평가요소를 모두 포함하고, needsImprovement 값은 areas의 criteria와 일치시키세요.
- needsImprovement: 해당 평가요소가 보완이 필요하면 true, 충분하면 false.
- 모든 평가 텍스트는 한국어로, 근거를 담아 구체적으로 작성하세요.`

// UX 평가 JSON Schema 조각 (seedCard.js와 동일 — 여러 스키마에서 재사용)
const UX_DATA_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'areas', 'evaluationItems'],
  properties: {
    summary: { type: 'string', description: '종합요약 (2~3문장)' },
    areas: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['key', 'name', 'status', 'evaluation', 'criteria'],
        properties: {
          key:        { type: 'string', enum: ['business', 'human', 'social'] },
          name:       { type: 'string', enum: ['Business', 'Human', 'Social'] },
          status:     { type: 'string', enum: ['satisfied', 'supplement'] },
          evaluation: { type: 'string' },
          criteria: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name', 'needsImprovement'],
              properties: {
                name:             { type: 'string' },
                needsImprovement: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
    evaluationItems: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'needsImprovement', 'evaluation'],
        properties: {
          name:             { type: 'string' },
          needsImprovement: { type: 'boolean' },
          evaluation:       { type: 'string' },
        },
      },
    },
  },
}

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
// ──────────────────────────────────────────────────────────
const DERIVED_SCHEMA = {
  name: 'derived_card',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'description', 'highlightPhrases', 'uxData'],
    properties: {
      title:       { type: 'string', description: '파생 아이디어 제목 (한 줄)' },
      description: { type: 'string', description: '파생 아이디어 본문 (2~3문장)' },
      highlightPhrases: {
        type: 'array',
        description: 'answer(사용자 답변) 안에서 도구가 적용된 핵심 부분의 문구. 반드시 answer에 그대로 등장하는 부분 문자열이어야 함',
        items: { type: 'string' },
      },
      uxData: UX_DATA_SCHEMA,
    },
  },
}

export async function generateDerivedCard(parentDescription, question, answer, toolName, toolType) {
  if (USE_MOCK) return mockDerivedCard(toolName, answer)
  const system = `당신은 아이디어 발산 도구의 AI 어시스턴트입니다.
사용자가 '${TOOL_TYPE_LABEL[toolType]}'의 '${toolName}' 도구로 답변한 내용을 바탕으로, 발전된 파생 아이디어 카드를 생성하고 UX 관점에서 평가합니다.

[아이디어 작성 규칙]
- title: 발전된 아이디어를 한 줄로 표현한 제목
- description: 부모 아이디어와 사용자 답변을 반영해 발전시킨 본문 2~3문장
- highlightPhrases: 사용자 답변(answer)에서 '${toolName}' 도구가 적용된 핵심 부분을 그대로 발췌한 문구들. 반드시 answer에 글자 그대로 존재하는 부분 문자열만 넣으세요. 없으면 빈 배열.

${UX_RULE}`

  const user = `[부모 아이디어]
${parentDescription}

[질문]
${question}

[사용자 답변]
${answer}

이 답변을 반영한 파생 아이디어 카드와 UX 평가를 작성해주세요.`

  return callOpenAI(
    [{ role: 'system', content: system }, { role: 'user', content: user }],
    DERIVED_SCHEMA
  )
}

// ──────────────────────────────────────────────────────────
// 호출 6: 직접작성 카드 생성
// title, description: 사용자가 직접 입력한 아이디어 제목·설명
// 반환값: { writeRec, writeExpect, writeRecReason, uxData }
//   - writeRec: 'expand'(확장하기) | 'transform'(변형하기) — 추천 도구 카테고리
//   - writeExpect: 추천 도구 적용 시 기대효과 (도구레이어 설명)
//   - writeRecReason: 추천 이유 (상세패널)
// ──────────────────────────────────────────────────────────
const WRITE_SCHEMA = {
  name: 'write_card',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['writeRec', 'writeExpect', 'writeRecReason', 'uxData'],
    properties: {
      writeRec:       { type: 'string', enum: ['expand', 'transform'] },
      writeExpect:    { type: 'string', description: '추천 도구로 이 아이디어를 발전시켰을 때의 기대효과 (1~2문장)' },
      writeRecReason: { type: 'string', description: '이 도구를 추천하는 이유 (1~2문장)' },
      uxData: UX_DATA_SCHEMA,
    },
  },
}

export async function generateWriteCard(title, description) {
  if (USE_MOCK) return mockWriteCard()
  const system = `당신은 아이디어 발산 도구의 AI 어시스턴트입니다.
사용자가 직접 작성한 아이디어를 더 발전시키기 위해, 다음 두 접근 중 어떤 것이 더 적합한지 추천하고 그 아이디어를 UX 관점에서 평가합니다.

[추천 대상 도구]
- expand(확장하기): 요소의 구조와 관계를 재배치하는 접근 (없애기·합치기·뒤집기·외부에서 가져오기 등)
- transform(변형하기): 요소의 강도와 존재를 조정하는 접근 (증가·감소·창출·제거)

[작성 규칙]
- writeRec: 이 아이디어를 발전시키기에 더 적합한 'expand' 또는 'transform' 하나를 선택하세요.
- writeExpect: 추천한 접근으로 이 아이디어를 발전시켰을 때 기대되는 효과를 1~2문장으로 작성하세요.
- writeRecReason: 왜 그 접근을 추천하는지 이 아이디어의 특성에 근거해 1~2문장으로 작성하세요.
- writeExpect와 writeRecReason 문장에는 'expand', 'transform' 같은 영문 코드를 절대 쓰지 말고, 반드시 한글 이름인 '확장하기' 또는 '변형하기'로 표현하세요.

${UX_RULE}`

  const user = `[아이디어 제목]
${title}

[아이디어 설명]
${description}

이 아이디어에 적합한 발전 도구를 추천하고 UX 평가를 작성해주세요.`

  return callOpenAI(
    [{ role: 'system', content: system }, { role: 'user', content: user }],
    WRITE_SCHEMA
  )
}

// highlightPhrases(문구 배열)를 answer 기준 {start, end} 인덱스 배열로 변환
// - answer에서 문구 위치를 찾아 인덱스로 계산 (LLM의 글자수 오류 회피)
// - 찾지 못한 문구는 건너뜀, 겹치는 구간은 제거 (QAContent는 비중첩 구간 가정)
export function phrasesToHighlights(answer, phrases) {
  const found = []
  for (const phrase of phrases ?? []) {
    if (!phrase) continue
    const start = answer.indexOf(phrase)
    if (start === -1) continue
    found.push({ start, end: start + phrase.length })
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
