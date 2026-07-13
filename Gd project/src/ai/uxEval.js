// UX 평가 공통 모듈
// 씨드카드(seedCard.js)와 파생/직접작성 카드(deriveCard.js)가 공유하는
// "UX 평가요소 정의(UX_CRITERIA)" · "UX 평가 규칙 텍스트(UX_RULE)" ·
// "UX 평가 전용 호출(generateUxEval)"을 한곳에서 관리한다.
// → 평가 규칙이나 응답 구조를 바꿀 때 이 파일 한 곳만 수정하면 모든 카드에 동시 반영된다.
//
// 모델에게는 "평가 텍스트와 보완 여부"만 받고, 화면에 필요한 uxData 형태(evaluationItems 배열 +
// areas 배열)는 이 파일에서 조립한다. 이렇게 하면
//  - 평가요소 7개가 누락될 수 없고 (배열이 아니라 고정 키 객체로 받으므로)
//  - areas의 criteria/status가 evaluationItems와 어긋날 수 없다 (코드로 계산하므로)
// 반환 형태는 기존과 동일하므로 SidePanel 등 화면 코드는 이 파일을 신경 쓰지 않아도 된다.

import { callOpenAI, USE_MOCK, TEMP_ANALYTIC } from './openaiClient.js'
import { mockUxData } from './__mock__.js'

// UX 평가요소 정의 (논문: "초기 아이디어 판별을 위한 사전적 UX 평가 지표 연구", 이지은·유승헌)
// 논문 그림 8의 7개 평가요소를 그대로 데이터화한 것.
// - key: 모델 응답의 속성명 (한글 키는 피하고 영문 사용)
// - en:  영문명 — 한글 이름만 주면 모델이 뜻을 오해할 수 있으므로 함께 제시 (예: 명료성 → Clarity)
// - def: 논문이 정의한 평가 기준 — 정의 없이 이름만 주면 평가 일관성이 떨어진다
// - syn: 동의어(포괄요소) — 요소 간 경계를 뚜렷하게 해 준다 (예: 사용 기대성 vs 효율 기대성)
// 평가 기준을 손볼 때는 이 배열만 고치면 프롬프트와 응답 스키마가 함께 바뀐다.
const UX_CRITERIA = [
  { area: 'business', key: 'creativity',     ko: '창의성',       en: 'Creativity',
    def: '기존 아이디어들에 비해 새롭거나 혁신적이며 아이디어 고유의 가치가 돋보이는가',
    syn: 'Novelty 진귀성, Originality 독창성, Innovative 혁신성' },
  { area: 'business', key: 'feasibility',    ko: '실현 가능성',   en: 'Feasibility',
    def: '아이디어를 구체화할 때 생기는 기술·시간·비용 등 개발에 따른 현실적인 조건에 비추어 실현 가능한가',
    syn: '' },
  { area: 'human',    key: 'usefulness',     ko: '사용 기대성',   en: 'Usefulness',
    def: '사용자가 사용하기 쉽고 자주 사용하게 될 것으로 기대되는가',
    syn: 'Useful 사용성' },
  { area: 'human',    key: 'efficiency',     ko: '효율 기대성',   en: 'Efficiency',
    def: '사용자가 직관적으로 사용할 수 있으며 시간과 노동을 절약해 줄 것으로 기대되는가',
    syn: 'Productivity 생산성, Functionality 기능성' },
  { area: 'human',    key: 'clarity',        ko: '명료성',       en: 'Clarity',
    def: '소비자에게 명확하게 설명되고 이해될 수 있는가',
    syn: 'Learnability 학습성, Comprehensiveness 포괄성' },
  { area: 'human',    key: 'attractiveness', ko: '매력성',       en: 'Attractiveness',
    def: '소비자에게 매력적으로 느껴지는가',
    syn: 'Aesthetics 심미성' },
  { area: 'social',   key: 'helpfulness',    ko: '사회적 도움성', en: 'Helpfulness',
    def: '아이디어가 사회적·공동체적으로 도움이 될 것으로 기대되는가',
    syn: 'Influentialness 사회적 영향성' },
]

// UX 영역 3개 (화면에 표시되는 이름은 영문 그대로)
const UX_AREAS = [
  { key: 'business', name: 'Business' },
  { key: 'human',    name: 'Human'    },
  { key: 'social',   name: 'Social'   },
]

// UX_CRITERIA를 프롬프트용 텍스트로 변환 (영역별로 묶어서 나열)
// 모델이 응답에 쓸 속성명(key)을 함께 보여줘, 어떤 요소가 어떤 속성인지 헷갈리지 않게 한다.
const CRITERIA_TEXT = UX_AREAS
  .map(({ key, name }) => {
    const items = UX_CRITERIA
      .filter((c) => c.area === key)
      .map((c) => `- ${c.key} = ${c.ko} (${c.en}): ${c.def}` + (c.syn ? `\n  └ 포괄요소: ${c.syn}` : ''))
      .join('\n')
    return `● ${name} 영역\n${items}`
  })
  .join('\n')

// UX 평가 규칙 텍스트 (시스템 프롬프트에 ${UX_RULE} 형태로 삽입)
// evaluations → areas → summary 순으로 작성하게 해, 근거를 먼저 쓰고 판정이 뒤따르도록 한다.
// (판정을 먼저 쓰면 근거가 사후 정당화가 되므로 순서가 중요 — 응답 스키마의 필드 순서와 일치시킬 것)
export const UX_RULE = `[평가 관점]
당신이 평가하는 것은 아직 구현되지 않은 초기 단계의 아이디어입니다.
실물이나 프로토타입이 없다는 이유로 낮게 평가하지 마세요.
사용자가 이 아이디어를 접했을 때 어떤 경험을 하게 될지 예측하여 평가하는 사용 전(Before Usage) UX 평가입니다.

[평가요소 — 아래 7개로 고정되어 있으며, 새로운 항목을 만들지 마세요]
${CRITERIA_TEXT}

[보완/충족 판단 기준]
- needsImprovement = true: 그 평가요소가 이 아이디어의 뚜렷한 약점이며, 아이디어를 발전시킬 때 우선적으로 손봐야 하는 경우
- needsImprovement = false: 그 평가요소가 충분히 갖추어진 경우
- 어떤 아이디어든 리스크나 우려는 항상 덧붙일 수 있습니다. 일반적인 우려를 언급했다는 이유만으로 true로 판정하지 마세요. 뚜렷한 약점일 때만 true입니다.
- 초기 아이디어에는 강점과 약점이 함께 있습니다. 7개를 모두 true로 하거나 모두 false로 하면 무엇을 먼저 보완해야 할지 알 수 없습니다. 실제로 두드러지게 부족한 요소만 true로 하세요.

[작성 순서 — 반드시 이 순서대로 작성하세요]
1) evaluations: 7개 평가요소를 각각 평가합니다.
   - evaluation: 아이디어의 어떤 점 때문에 이 요소가 충분한지 또는 부족한지, 그 근거를 서술
   - needsImprovement: 위에 서술한 근거와 [보완/충족 판단 기준]에 따라 판정
2) areas: 1)의 결과를 근거로 Business / Human / Social 3개 영역을 평가합니다.
   - 그 영역에 속한 평가요소들을 근거로, 잘된 점과 보완할 점을 서술
3) summary: 위 평가 전체를 종합하여 아이디어에 대한 종합요약을 작성합니다.

[분량과 문체]
- evaluation(평가요소)과 areas(영역)의 평가 텍스트는 각각 2문장, summary는 2~3문장으로 쓰세요.
- 문장은 짧은 단문으로 쓰세요. 한 문장에는 한 가지 근거만 담고, 접속어미로 여러 절을 이어붙여 문장을 늘이지 마세요.
- 수식어나 군더더기 표현은 넣지 마세요. 충분하다고 판단되면 충분한 이유를 쓰고, 억지로 단점을 덧붙이지 마세요.
- 모든 문장은 '~입니다', '~합니다' 체의 한국어로 작성하세요.

[evaluation 작성 예시 — 이 길이와 문체를 따르세요]
(충족) "재택근무일과 출근일을 감지해 루틴을 자동 전환하는 접근입니다. 기존 루틴 앱에서 보편적으로 다루지 않는 방식입니다."
(보완) "캘린더 연동과 위치 데이터로 구현 가능합니다. 다만 루틴 분기 학습에 필요한 데이터 축적 기간이 선행되어야 합니다."`

// UX 평가 응답 스키마 (Structured Outputs)
// 배열이 아니라 "고정 키를 가진 객체"로 받는다.
// → strict 모드는 객체의 모든 키를 필수로 강제하므로 평가요소 7개가 누락될 수 없다.
//   (strict 모드는 배열의 minItems/maxItems를 지원하지 않아, 배열로 받으면 개수를 보장할 수 없다)
// criteria와 status는 모델에게 받지 않고 evaluationItems로부터 코드에서 계산한다. (불일치 원천 차단)
const UX_EVAL_SCHEMA = {
  name: 'ux_eval',
  schema: {
    type: 'object',
    additionalProperties: false,
    // 필드 순서 = 모델의 생성 순서 = 사고 순서 (평가요소 → 영역 → 종합요약)
    required: ['evaluations', 'areas', 'summary'],
    properties: {
      // 1) 평가요소 7개 — 근거(evaluation)를 서술한 뒤 보완 여부(needsImprovement)를 판정
      evaluations: {
        type: 'object',
        additionalProperties: false,
        required: UX_CRITERIA.map((c) => c.key),
        properties: Object.fromEntries(
          UX_CRITERIA.map((c) => [
            c.key,
            {
              type: 'object',
              additionalProperties: false,
              required: ['evaluation', 'needsImprovement'],
              properties: {
                evaluation:       { type: 'string',  description: `${c.ko} 평가 (2문장)` },
                needsImprovement: { type: 'boolean', description: '위 evaluation을 근거로 보완이 필요하면 true' },
              },
            },
          ]),
        ),
      },
      // 2) 영역 3개 — 위 평가요소 결과를 근거로 서술 (criteria/status는 코드에서 계산)
      areas: {
        type: 'object',
        additionalProperties: false,
        required: UX_AREAS.map((a) => a.key),
        properties: Object.fromEntries(
          UX_AREAS.map((a) => [
            a.key,
            { type: 'string', description: `${a.name} 영역 평가 (2문장)` },
          ]),
        ),
      },
      // 3) 종합요약 — 위 평가 전체를 읽고 마지막에 작성
      summary: { type: 'string', description: '종합요약 (2~3문장)' },
    },
  },
}

// 모델 응답(evaluations/areas/summary)을 화면이 쓰는 uxData 형태로 조립한다.
// - evaluationItems: 7개 평가요소를 UX_CRITERIA 순서대로 배열화
// - areas: 영역별 criteria(그 영역의 평가요소)와 status를 evaluationItems로부터 계산
//   status: criteria 중 하나라도 needsImprovement가 true이면 'supplement', 모두 false이면 'satisfied'
function toUxData(res) {
  const evaluationItems = UX_CRITERIA.map((c) => ({
    name:             c.ko,
    needsImprovement: res.evaluations[c.key].needsImprovement,
    evaluation:       res.evaluations[c.key].evaluation,
  }))

  const areas = UX_AREAS.map((a) => {
    const criteria = UX_CRITERIA
      .filter((c) => c.area === a.key)
      .map((c) => ({
        name:             c.ko,
        needsImprovement: res.evaluations[c.key].needsImprovement,
      }))
    return {
      key:        a.key,
      name:       a.name,
      status:     criteria.some((c) => c.needsImprovement) ? 'supplement' : 'satisfied',
      evaluation: res.areas[a.key],
      criteria,
    }
  })

  return { summary: res.summary, areas, evaluationItems }
}

// UX 평가 전용 호출: 이미 만들어진 아이디어(title, description)를 UX 관점에서만 평가한다.
// 낮은 temperature(TEMP_ANALYTIC)로 규칙 준수·평가 일관성을 우선한다.
// 반환값: uxData 객체 (summary, areas, evaluationItems)
export async function generateUxEval(title, description) {
  if (USE_MOCK) return mockUxData()

  const system = `당신은 초기 단계의 제품/서비스 아이디어를 사전적 UX 관점에서 평가하는 전문가입니다.
주어진 아이디어를 아래 규칙에 따라 정확하고 일관되게 평가하세요.

${UX_RULE}`

  const user = `[아이디어 제목]
${title}

[아이디어 설명]
${description}

이 아이디어에 대한 UX 평가를 작성해주세요.`

  const res = await callOpenAI(
    [{ role: 'system', content: system }, { role: 'user', content: user }],
    UX_EVAL_SCHEMA,
    TEMP_ANALYTIC,
  )
  return toUxData(res)
}
