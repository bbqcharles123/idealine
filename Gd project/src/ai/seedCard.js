// 씨드카드(시작 아이디어) 생성 모듈
// 본문 생성(창의, 높은 temperature)과 UX 평가(분석, 낮은 temperature)를 2개의 호출로 분리한다.
// 공개 함수 generateSeedCard의 반환 형태({ title, description, uxData })는 기존과 동일하게 유지.

import { mockSeedContent } from './__mock__.js'
import { generateUxEval } from './uxEval.js'
import { callOpenAI, USE_MOCK, TEMP_CREATIVE } from './openaiClient.js'

// 씨드카드 "본문" 생성 스키마 (uxData 제외 — UX 평가는 generateUxEval로 분리)
const SEED_CONTENT_SCHEMA = {
  name: 'seed_content',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'description'],
    properties: {
      title:       { type: 'string', description: '아이디어 제목 (한 줄)' },
      description: { type: 'string', description: '아이디어 본문 (2~3문장, 누구를 위해 어떤 문제를 어떻게 해결하는지)' },
    },
  },
}

// 본문 생성 시스템 프롬프트 (아이디어 발상만 담당 — UX 평가 규칙은 여기 없음)
const SYSTEM_PROMPT = `당신은 아이디어 발산 도구의 AI 어시스턴트입니다.
사용자가 입력한 공모전 주제나 키워드를 바탕으로, 구체적이고 실현 가능한 제품/서비스 아이디어 1개를 생성합니다.

[아이디어 작성 규칙]
- title: 아이디어를 한 줄로 표현한 제목 (예: "AI 생활 루틴 코치 앱")
- description: 누구를 위해, 어떤 불편함을, 어떻게 해결하는지를 담은 2~3문장의 본문`

// 씨드카드 본문 생성(창의): 주제(topic)로 아이디어 제목·본문을 만든다.
// 반환값: { title, description }
async function generateSeedContent(topic) {
  if (USE_MOCK) return mockSeedContent(topic)
  const user = `주제/키워드: ${topic}\n\n이 주제에 맞는 아이디어 1개를 생성해주세요.`
  return callOpenAI(
    [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: user }],
    SEED_CONTENT_SCHEMA,
    TEMP_CREATIVE,
  )
}

// 씨드카드 생성(공개 함수): 본문 생성 → 생성된 본문으로 UX 평가를 순차 실행해 합쳐 반환한다.
// (UX 평가는 만들어진 아이디어를 평가해야 하므로 본문 생성 이후에 실행 — 순차)
// 반환값: { title, description, uxData }  ← 기존과 동일
export async function generateSeedCard(topic) {
  // 1) 본문 생성 (창의, temperature 높음)
  const content = await generateSeedContent(topic)
  // 2) 생성된 본문을 대상으로 UX 평가 (분석, temperature 낮음)
  const uxData = await generateUxEval(content.title, content.description)
  return { ...content, uxData }
}
