// 씨드카드(시작 아이디어) 생성 모듈
// 본문 생성(창의, 높은 temperature)과 UX 평가(분석, 낮은 temperature)를 2개의 호출로 분리한다.
// 공개 함수 generateSeedCard의 반환 형태({ title, description, uxData })는 기존과 동일하게 유지.

import { mockSeedContent } from './__mock__.js'
import { generateUxEval } from './uxEval.js'
import { callOpenAI, USE_MOCK, TEMP_CREATIVE } from './openaiClient.js'
// 사용자 입력 주제(topic)를 다루는 규칙 — 파생카드 쪽과 정책을 함께 관리하기 위해 분리
import { buildTopicScopeRule } from './prompts/topicScope.js'
// 아이디어 본문의 품질 규칙 — 파생카드 생성(deriveCard.js)과 같은 문장을 쓰기 위해 분리
import { buildIdeaWritingRule, buildFeasibilityRule } from './prompts/ideaRules.js'

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
//
// 구성: [입력 범위](topicScope.js) → [역할과 목적] → [아이디어 작성 규칙]·[실현 가능성 기준](ideaRules.js)
// 이 파일이 직접 갖는 문장은 씨드 호출에만 해당하는 [역할과 목적]뿐이다.
// 나머지 두 종류는 파생카드 생성도 같은 문장을 써야 하므로 별도 모듈에서 가져온다.
const SYSTEM_PROMPT = `당신은 아이디어 발산 도구의 AI 어시스턴트입니다.
사용자가 입력한 주제를 바탕으로, 구체적이고 실현 가능한 제품/서비스 아이디어 1개를 생성합니다.

${buildTopicScopeRule()}

[역할과 목적]
- 당신이 생성하는 아이디어는 사용자가 그대로 발전시키거나, 다른 아이디어들이 파생되는 출발점으로 사용됩니다.

${buildIdeaWritingRule()}

${buildFeasibilityRule()}`

// 씨드카드 본문 생성(창의): 주제(topic)로 아이디어 제목·본문을 만든다.
// 반환값: { title, description }
async function generateSeedContent(topic) {
  if (USE_MOCK) return mockSeedContent(topic)
  // 사용자 입력과 지시문을 대괄호 블록으로 분리한다(파생·평가 호출과 동일한 형식).
  // 입력이 한 줄 키워드든 여러 문장이든 [사용자 입력 주제] 블록 전체가 '재료'로 묶이므로,
  // 입력에 명령형 문장이 섞여 들어와도 지시문과 같은 평면에 놓이지 않는다.
  const user = `[사용자 입력 주제]
${topic}

[요청]
위 [사용자 입력 주제]는 사용자가 직접 입력한 원문(verbatim)이다.
거기에 이미 언급된 대상·상황·문제·해결 방법은 그대로 유지하고(keep as-is),
언급되지 않은 요소만 주제와 자연스럽게 연결되는 내용으로 새로 채운다.
이 조건을 만족하는 아이디어 1개를 title 1개와 description 1개로 생성한다.
description은 [아이디어 작성 규칙]의 4가지 요소를 모두 포함한 2~3문장으로 작성한다.`
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
