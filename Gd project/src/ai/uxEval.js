// UX 평가 공통 모듈
// 씨드카드(seedCard.js)와 파생/직접작성 카드(deriveCard.js)가 공유하는
// "UX 평가 규칙 텍스트(UX_RULE)" · "UX 평가 응답 스키마(UX_DATA_SCHEMA)" ·
// "UX 평가 전용 호출(generateUxEval)"을 한곳에서 관리한다.
// → 평가 규칙이나 응답 구조를 바꿀 때 이 파일 한 곳만 수정하면 모든 카드에 동시 반영된다.

import { callOpenAI, USE_MOCK, TEMP_ANALYTIC } from './openaiClient.js'
import { mockUxData } from './__mock__.js'

// UX 평가 규칙 텍스트 (시스템 프롬프트에 ${UX_RULE} 형태로 삽입)
export const UX_RULE = `[UX 평가 규칙]
평가요소는 아래 7개로 고정되어 있으며, 새로운 항목을 만들지 마세요. 각 요소를 채점만 하세요.
- Business 영역: 창의성, 실현 가능성
- Human 영역: 사용 기대성, 효율 기대성, 명료성, 매력성
- Social 영역: 사회적 도움성

- areas: 위 3개 영역을 key(business/human/social) 순서대로 모두 포함하고, 각 영역의 criteria에는 그 영역에 속한 평가요소를 정확히 넣으세요.
- area의 status: 그 영역 criteria 중 하나라도 needsImprovement가 true이면 'supplement', 모두 false이면 'satisfied'.
- evaluationItems: 위 7개 평가요소를 모두 포함하고, needsImprovement 값은 areas의 criteria와 일치시키세요.
- needsImprovement: 해당 평가요소가 보완이 필요하면 true, 충분하면 false.
- summary: 아이디어 전체에 대한 종합요약을 2~3문장으로 작성하세요.
- areas의 evaluation: 해당 영역 전반에 대한 평가를 2문장으로 작성하세요. (그 영역에 속한 평가요소들을 근거로, 잘된 점과 보완할 점을 나누어 서술)
- evaluationItems의 evaluation: 해당 평가요소에 대한 세부 평가를 2문장으로 작성하세요. (아이디어의 어떤 점이 그렇게 판단되는지 근거를 들고, 이어서 그 판단의 함의나 보완점을 서술)
- 위 두 evaluation은 짧은 단문으로 쓰세요. 한 문장에는 한 가지 근거만 담고, 접속어미로 여러 절을 이어붙여 문장을 늘이지 마세요. 수식어나 군더더기 표현은 넣지 마세요.
- 모든 평가 텍스트는 한국어로, 근거를 담아 구체적으로 작성하세요.`

// UX 평가 응답 JSON Schema 조각 (Structured Outputs — 각 카드 스키마의 uxData 필드에 재사용)
export const UX_DATA_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'areas', 'evaluationItems'],
  properties: {
    summary: { type: 'string', description: '종합요약 (2~3문장)' },
    areas: {
      type: 'array',
      description: 'Business / Human / Social 3개 영역 평가',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['key', 'name', 'status', 'evaluation', 'criteria'],
        properties: {
          key:        { type: 'string', enum: ['business', 'human', 'social'] },
          name:       { type: 'string', enum: ['Business', 'Human', 'Social'] },
          status:     { type: 'string', enum: ['satisfied', 'supplement'] },
          evaluation: { type: 'string', description: '해당 영역 평가 텍스트 (2문장)' },
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
      description: '7개 평가요소별 세부 평가',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'needsImprovement', 'evaluation'],
        properties: {
          name:             { type: 'string' },
          needsImprovement: { type: 'boolean' },
          evaluation:       { type: 'string', description: '해당 평가요소 세부 평가 텍스트 (2문장)' },
        },
      },
    },
  },
}

// callOpenAI 형식({ name, schema })에 맞춘 UX 평가 응답 스키마
const UX_EVAL_SCHEMA = { name: 'ux_eval', schema: UX_DATA_SCHEMA }

// UX 평가 전용 호출: 이미 만들어진 아이디어(title, description)를 UX 관점에서만 평가한다.
// 낮은 temperature(TEMP_ANALYTIC)로 규칙 준수·평가 일관성을 우선한다.
// 반환값: uxData 객체 (summary, areas, evaluationItems)
export async function generateUxEval(title, description) {
  if (USE_MOCK) return mockUxData()

  const system = `당신은 제품/서비스 아이디어를 UX 관점에서 평가하는 전문가입니다.
주어진 아이디어를 아래 규칙에 따라 정확하고 일관되게 평가하세요.

${UX_RULE}`

  const user = `[아이디어 제목]
${title}

[아이디어 설명]
${description}

이 아이디어에 대한 UX 평가를 작성해주세요.`

  return callOpenAI(
    [{ role: 'system', content: system }, { role: 'user', content: user }],
    UX_EVAL_SCHEMA,
    TEMP_ANALYTIC,
  )
}
