// OpenAI API 키 (.env의 VITE_OPENAI_API_KEY)
// 클라이언트에서 직접 호출하므로 빌드 시 번들에 포함됨 (데모/과제용으로만 사용)
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY

// AI에게 출력 형식을 강제하기 위한 JSON Schema (Structured Outputs)
// strict: true 로 지정하면 모델이 이 구조를 정확히 지켜서 응답한다.
const SEED_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'description', 'uxData'],
  properties: {
    title:       { type: 'string', description: '아이디어 제목 (한 줄)' },
    description: { type: 'string', description: '아이디어 본문 (2~3문장, 누구를 위해 어떤 문제를 어떻게 해결하는지)' },
    uxData: {
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
              evaluation: { type: 'string', description: '해당 영역 평가 텍스트' },
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
              evaluation:       { type: 'string', description: '해당 평가요소 세부 평가 텍스트' },
            },
          },
        },
      },
    },
  },
}

// 시스템 프롬프트: AI의 역할과 고정 평가 프레임워크, 작성 규칙을 정의
const SYSTEM_PROMPT = `당신은 아이디어 발산 도구의 AI 어시스턴트입니다.
사용자가 입력한 공모전 주제나 키워드를 바탕으로, 구체적이고 실현 가능한 제품/서비스 아이디어 1개를 생성하고 그 아이디어를 UX 관점에서 평가합니다.

[아이디어 작성 규칙]
- title: 아이디어를 한 줄로 표현한 제목 (예: "AI 생활 루틴 코치 앱")
- description: 누구를 위해, 어떤 불편함을, 어떻게 해결하는지를 담은 2~3문장의 본문

[UX 평가 규칙]
평가요소는 아래 7개로 고정되어 있으며, 새로운 항목을 만들지 마세요. 각 요소를 채점만 하세요.
- Business 영역: 창의성, 실현 가능성
- Human 영역: 사용 기대성, 효율 기대성, 명료성, 매력성
- Social 영역: 사회적 도움성

- areas: 위 3개 영역을 key(business/human/social) 순서대로 모두 포함하고, 각 영역의 criteria에는 그 영역에 속한 평가요소를 정확히 넣으세요.
- area의 status: 그 영역 criteria 중 하나라도 needsImprovement가 true이면 'supplement', 모두 false이면 'satisfied'.
- evaluationItems: 위 7개 평가요소를 모두 포함하고, needsImprovement 값은 areas의 criteria와 일치시키세요.
- needsImprovement: 해당 평가요소가 보완이 필요하면 true, 충분하면 false.
- 모든 평가 텍스트는 한국어로, 근거를 담아 구체적으로 작성하세요.`

// 씨드카드 생성: 주제(topic)를 받아 아이디어 본문 + UX 평가 데이터를 한 번에 생성
// fetch로 OpenAI Chat Completions API를 직접 호출한다.
// 반환값: { title, description, uxData }
export async function generateSeedCard(topic) {
  // OpenAI Chat Completions 엔드포인트로 POST 요청
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Authorization 헤더에 API 키를 Bearer 토큰으로 전달
      Authorization: `Bearer ${API_KEY}`,
    },
    // 요청 본문(body): 모델 / 메시지 / 출력 형식을 JSON 문자열로 변환해 전송
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      // temperature: 응답의 다양성(창의성) 정도 (0~2). 아이디어 발산이라 약간 높게 설정
      temperature: 0.9,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `주제/키워드: ${topic}\n\n이 주제에 맞는 아이디어 1개를 생성하고 UX 평가를 작성해주세요.` },
      ],
      // Structured Outputs: 위에서 정의한 JSON Schema를 정확히 따르도록 강제
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'seed_card',
          strict: true,
          schema: SEED_SCHEMA,
        },
      },
    }),
  })

  // HTTP 오류(401 키 오류, 429 한도 초과 등)를 명시적으로 처리
  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`OpenAI API 오류 (${response.status}): ${errText}`)
  }

  // 응답을 JSON으로 파싱 → 실제 생성 텍스트는 choices[0].message.content에 JSON 문자열로 들어 있음
  const data = await response.json()
  return JSON.parse(data.choices[0].message.content)
}
