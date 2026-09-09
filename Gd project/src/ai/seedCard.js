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
// 구성: [입력 범위](topicScope.js) → [사용 맥락] → [작성 규칙](ideaRules.js 두 함수를 묶는 헤더)
// [작성 규칙] 헤더는 이 파일이 씌운다 — 규칙이 모듈에서 오더라도 프롬프트에는 규칙 구역이 하나로 보여야
// 하고, 다른 호출(예시·질문·추천 생성)이 모두 같은 이름의 블록에 규칙을 모으고 있어 이름을 맞췄다.
// [입력 범위]만 이 블록 밖에 남긴다 — 맨 위에 놓인 위치 자체가 "최우선"의 근거라서,
// 다른 규칙과 나란한 하위 항목이 되면 우선순위가 사라진다.
// 이 파일이 직접 갖는 문장은 씨드 호출에만 해당하는 [사용 맥락]뿐이다.
// [사용 맥락]은 산출물이 화면에서 어떻게 쓰이는지를 적는 블록이고, 다섯 호출이 같은 이름을 쓴다.
// 예전 이름 [역할과 목적]은 "무엇을 해야 한다"를 부르는 말이라 규칙이 흘러들었다
// — 파생 본문 쪽에서 실제로 그 일이 일어나 지시문 3줄이 이 블록에 쌓여 있었다.
// 나머지 두 종류는 파생카드 생성도 같은 문장을 써야 하므로 별도 모듈에서 가져온다.
const SYSTEM_PROMPT = `당신은 아이디어 발산 도구의 AI 어시스턴트입니다.
사용자가 입력한 주제를 바탕으로, 구체적이고 실현 가능한 제품/서비스 아이디어 1개를 생성합니다.

${buildTopicScopeRule()}

[사용 맥락]
당신이 생성하는 아이디어는 사용자가 그대로 발전시키거나, 다른 아이디어들이 파생되는 출발점으로 사용됩니다.

[작성 규칙]
${buildIdeaWritingRule()}

${buildFeasibilityRule()}`

// 씨드카드 본문 생성(창의): 주제(topic)로 아이디어 제목·본문을 만든다.
// 반환값: { title, description }
async function generateSeedContent(topic) {
  if (USE_MOCK) return mockSeedContent(topic)
  // [요청] 블록의 형식은 다섯 호출이 같다 — 데이터 블록의 역할을 한 줄씩 적고,
  // 마지막에 무엇을 만드는지 한 문장. 규칙은 system의 [작성 규칙]에만 두고 여기서 되풀이하지 않는다.
  // (예전에는 이 블록이 5줄이었는데 그중 3줄이 [입력 범위]와 ▸아이디어 작성 규칙을 거의 그대로
  //  다시 적은 것이었다. 같은 규칙이 두 곳에 있으면 한쪽만 고쳐졌을 때 조용히 어긋난다)
  //
  // 사용자 입력과 지시문을 대괄호 블록으로 분리한다(파생·평가 호출과 동일한 형식).
  // 입력이 한 줄 키워드든 여러 문장이든 [사용자 입력 주제] 블록 전체가 '재료'로 묶이므로,
  // 입력에 명령형 문장이 섞여 들어와도 지시문과 같은 평면에 놓이지 않는다.
  const user = `[사용자 입력 주제]
${topic}

[요청]
[사용자 입력 주제]는 사용자가 직접 입력한 원문이며, 이 아이디어가 다루어야 할 범위입니다.
이 주제로 아이디어 1개를 title 1개와 description 1개로 작성합니다.`
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
