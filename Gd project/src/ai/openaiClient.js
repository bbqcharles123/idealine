// OpenAI Chat Completions 공통 클라이언트
// seedCard.js, deriveCard.js, uxEval.js가 이 파일의 callOpenAI를 공유한다.
// (기존에 seedCard.js의 인라인 fetch와 deriveCard.js의 로컬 callOpenAI로 중복돼 있던 것을 통합)

// VITE_USE_AI_MOCK=true 이면 OpenAI를 호출하지 않고 mock 데이터를 사용
export const USE_MOCK = import.meta.env.VITE_USE_AI_MOCK === 'true'

// VITE_AI_DEBUG=true 이면 모든 AI 호출의 프롬프트·응답을 브라우저 콘솔에 출력한다.
// USE_MOCK과는 별개다 — mock은 "호출을 안 하는" 스위치, 이건 "실제 호출의 속을 들여다보는" 스위치.
//
// 왜 필요한가:
// 프롬프트는 템플릿 리터럴로 런타임에 조립된다(getFrameworkContext·CRITERIA_TEXT·TOOL_LAYER_DESC 등이 끼어든다).
// 그래서 소스를 읽는 것만으로는 최종적으로 모델에게 보낸 문자열을 알 수 없고,
// "내가 설계한 조건이 실제로 프롬프트에 들어갔는가"를 확인할 방법이 없다. 그 눈 역할을 한다.
//
// 사용법: 프로젝트 루트 .env에 아래 한 줄을 추가하고 dev 서버를 재시작한다.
//   VITE_AI_DEBUG=true
export const AI_DEBUG = import.meta.env.VITE_AI_DEBUG === 'true'

// OpenAI API 키 (.env의 VITE_OPENAI_API_KEY)
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY

// temperature 프리셋 (호출 성격에 맞춰 사용)
// - 아이디어 본문 생성: 겹치지 않는 다양한 발상이 필요 → 높게
// - UX 평가: 규칙 준수·일관성이 필요 → 낮게
export const TEMP_CREATIVE = 0.9
export const TEMP_ANALYTIC = 0.4

// ──────────────────────────────────────────────────────────
// 디버그 로깅 (AI_DEBUG가 false면 아래 함수들은 전부 즉시 return → 프로덕션 영향 없음)
//
// 로그 라벨은 새로 만들지 않고 schema.name을 그대로 쓴다.
// 이미 호출마다 고유하기 때문이다:
//   seed_content / tool_examples / tool_question / derived_card / write_card / ux_eval
// → callOpenAI의 시그니처를 바꾸지 않아도 어느 호출의 로그인지 구분된다.
//
// 요청과 응답을 "하나의 그룹으로 묶지 않고" 각각 독립된 그룹으로 찍는 이유:
// generateWriteCard는 본문 생성과 UX 평가를 병렬로 실행한다(Promise.all).
// 그룹을 열어둔 채 await하면 두 호출의 로그가 서로의 그룹 안에 섞여 들어가 읽을 수 없게 된다.
// 각 그룹을 동기적으로 열고 닫으면 병렬 호출에서도 로그가 깨지지 않는다.
//
// 그룹은 groupCollapsed(접힘)가 아니라 group(펼침)으로 연다.
// DevTools의 'Save as...'는 화면에 렌더된 줄만 파일에 쓰기 때문이다.
// 접힌 그룹은 헤더 한 줄만 남고 속이 통째로 빠지므로, 로그를 파일로 남겨 나중에 검토하려면
// 매번 22개 남짓한 그룹을 손으로 펼쳐야 한다. 펼친 채로 열면 저장만으로 전부 담긴다.
// (콘솔이 길어지는 대신 기록이 온전해진다 — AI_DEBUG일 때만 나오는 디버그 전용 출력이라 감수한다)
// ──────────────────────────────────────────────────────────

// 요청 로그: 모델에게 실제로 보낸 messages를 역할별로 원문 그대로 출력한다.
function logRequest(label, temperature, messages) {
  if (!AI_DEBUG) return
  console.group(`%c[AI ▶ 요청] ${label}`, 'color:#1565C0;font-weight:bold', `temp=${temperature}`)
  for (const m of messages) {
    // 객체째로 찍으면 줄바꿈이 \n으로 이스케이프되어 프롬프트를 눈으로 읽을 수 없다.
    // 문자열만 따로 넘겨야 조립된 프롬프트가 원래 줄바꿈 그대로 보인다.
    console.log(`%c── ${m.role} ──`, 'color:#616161')
    console.log(m.content)
  }
  console.groupEnd()
}

// 응답 로그: 파싱된 결과와 함께, 응답이 잘리지 않았는지(finish_reason)·토큰을 얼마나 썼는지도 남긴다.
function logSuccess(label, startedAt, parsed, finishReason, usage) {
  if (!AI_DEBUG) return
  const ms = Math.round(performance.now() - startedAt)
  console.group(`%c[AI ◀ 응답] ${label}`, 'color:#2E7D32;font-weight:bold', `${ms}ms`)
  // 같은 값을 두 번 찍는다 — 용도가 다르기 때문이다.
  // 객체: 브라우저에서 접었다 펴며 탐색하기 좋다.
  // JSON 문자열: 콘솔은 객체를 찍을 때 긴 문자열을 '…'로 줄이고 배열을 Array(3)으로만 표시하는데,
  //   'Save as...'로 로그를 파일에 저장하면 그 축약된 모습 그대로 저장된다.
  //   그러면 highlightPhrases 같은 값의 실제 내용을 나중에 확인할 수 없다.
  //   문자열로 넘기면 축약이 일어나지 않아 응답 전문이 파일에 남는다.
  console.log(parsed)
  console.log(JSON.stringify(parsed, null, 2))
  // usage도 객체라 그대로 찍으면 prompt_tokens_details 같은 중첩 값이 '{…}'로 축약된다.
  // 그 안에 cached_tokens(프롬프트 캐싱이 실제로 걸렸는지)가 들어 있어 문자열로 펼쳐 남긴다.
  console.log('finish_reason:', finishReason, '/ tokens:', JSON.stringify(usage))
  console.groupEnd()
}

// 실패 로그: 기존 throw는 그대로 두고 기록만 남긴다 (에러 처리 동작은 바뀌지 않는다).
// 취소(AbortError)는 사용자가 X 아이콘을 눌러 의도적으로 중단한 것이므로 오류와 구분해서 표시한다.
function logFailure(label, startedAt, err) {
  if (!AI_DEBUG) return
  const ms = Math.round(performance.now() - startedAt)
  if (err?.name === 'AbortError') {
    console.log(`%c[AI ⏹ 취소] ${label}`, 'color:#616161', `${ms}ms`)
    return
  }
  console.group(`%c[AI ✕ 실패] ${label}`, 'color:#C62828;font-weight:bold', `${ms}ms`)
  // 에러 객체도 그대로 찍으면 저장 시 축약된다.
  // message는 원인(HTTP 상태·응답 본문)을, stack은 어느 호출에서 났는지를 담고 있어 둘 다 문자열로 남긴다.
  console.log(err)
  console.log(`${err?.name ?? 'Error'}: ${err?.message ?? String(err)}`)
  console.log(err?.stack ?? '(stack 없음)')
  console.groupEnd()
}

// 후처리 로그: AI 응답이 화면에 나가기 전, 코드가 값을 바꾸는 지점을 기록한다.
//
// 왜 필요한가:
// callOpenAI의 로그는 fetch 경계까지만 찍는다. 그런데 응답을 받은 뒤 코드가 값을 다시 만든다.
//   - uxEval의 toUxData: status('보완'/'충족')는 AI가 아니라 코드가 계산한다
//   - deriveCard의 phrasesToHighlights: 못 찾은 문구·겹친 구간을 조용히 버린다
// 그래서 이 로그가 없으면 "AI가 만든 것"과 "화면에 나간 것"이 어긋나도 원인을 짚을 수 없다.
//
// label: 어느 호출의 후처리인지 (callOpenAI의 schema.name과 같은 값을 쓴다)
// note:  무엇을 했는지 한 줄 요약 (그룹 헤더에 그대로 표시된다)
// data:  변환 결과. 축약을 피하려고 문자열로 펼쳐 남긴다
export function logTransform(label, note, data) {
  if (!AI_DEBUG) return
  console.group(`%c[AI ⇄ 후처리] ${label}`, 'color:#6A1B9A;font-weight:bold', note)
  console.log(JSON.stringify(data, null, 2))
  console.groupEnd()
}

// 공통 OpenAI 호출 함수
// messages:    [{role, content}] 배열
// schema:      { name, schema } 형태의 JSON Schema (Structured Outputs)
// temperature: 응답 무작위성 (0~2). 생략 시 창의(0.9) 기본값
// signal:      AbortSignal (생략 가능) — 모달에서 생성 중 X 아이콘으로 취소 시 fetch 자체를 중단시키는 데 사용
// 반환값:      파싱된 JSON 객체
export async function callOpenAI(messages, schema, temperature = TEMP_CREATIVE, signal) {
  const startedAt = performance.now()
  logRequest(schema.name, temperature, messages)

  // try/catch는 로그를 남기기 위한 것일 뿐이다. 잡은 에러는 그대로 다시 던지므로
  // 호출부(모달)의 오류 처리는 이전과 완전히 동일하게 동작한다.
  try {
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

    const parsed = JSON.parse(choice.message.content)
    logSuccess(schema.name, startedAt, parsed, choice.finish_reason, data.usage)
    return parsed
  } catch (err) {
    logFailure(schema.name, startedAt, err)
    throw err
  }
}
