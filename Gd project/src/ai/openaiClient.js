// OpenAI Chat Completions 공통 클라이언트
// seedCard.js, deriveCard.js, uxEval.js가 이 파일의 callOpenAI를 공유한다.
// (기존에 seedCard.js의 인라인 fetch와 deriveCard.js의 로컬 callOpenAI로 중복돼 있던 것을 통합)

// VITE_USE_AI_MOCK=true 이면 OpenAI를 호출하지 않고 mock 데이터를 사용
export const USE_MOCK = import.meta.env.VITE_USE_AI_MOCK === 'true'

// OpenAI API 키 (.env의 VITE_OPENAI_API_KEY)
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY

// temperature 프리셋 (호출 성격에 맞춰 사용)
// - 아이디어 본문 생성: 겹치지 않는 다양한 발상이 필요 → 높게
// - UX 평가: 규칙 준수·일관성이 필요 → 낮게
export const TEMP_CREATIVE = 0.9
export const TEMP_ANALYTIC = 0.4

// 공통 OpenAI 호출 함수
// messages:    [{role, content}] 배열
// schema:      { name, schema } 형태의 JSON Schema (Structured Outputs)
// temperature: 응답 무작위성 (0~2). 생략 시 창의(0.9) 기본값
// signal:      AbortSignal (생략 가능) — 모달에서 생성 중 X 아이콘으로 취소 시 fetch 자체를 중단시키는 데 사용
// 반환값:      파싱된 JSON 객체
export async function callOpenAI(messages, schema, temperature = TEMP_CREATIVE, signal) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature,
      messages,
      response_format: {
        type: 'json_schema',
        json_schema: { name: schema.name, strict: true, schema: schema.schema },
      },
    }),
    signal,
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`OpenAI API 오류 (${response.status}): ${errText}`)
  }

  const data = await response.json()
  const choice = data.choices[0]

  // 토큰 한도에서 응답이 잘리면 JSON이 닫히지 않은 채로 오므로 JSON.parse가 실패한다.
  // 파싱 에러로 넘기지 않고 원인을 명시해 던진다.
  if (choice.finish_reason === 'length') {
    throw new Error('OpenAI 응답이 토큰 한도에서 잘렸습니다 (JSON 불완전)')
  }

  return JSON.parse(choice.message.content)
}
