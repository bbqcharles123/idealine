// 확장 2단계 선택지 생성(tool_examples) 측정 스크립트
//
// [무엇을 재는가]
// 현재 앱이 실제로 쓰는 조건 하나만 돌려서, 만들어진 선택지 문장의 상태를 지표와 시트로 남긴다.
//   - 도구 정의: 프롬프트 전용 텍스트(TOOL_PROMPT_DESC.expand)
//   - 프롬프트: buildToolExamplesPrompt (앱과 같은 함수)
// 프롬프트를 고칠 때마다 돌려서 보완점을 찾는 용도다.
//
// [예전에는 A/B 비교 스크립트였다]
// 원래는 도구 정의로 화면용 텍스트(TOOL_LAYER_DESC)를 넣는 조건 A와
// 프롬프트 전용 텍스트(TOOL_PROMPT_DESC)를 넣는 조건 B를 나란히 돌려 비교했다.
// 그 비교는 이미 끝났고(프롬프트 전용 텍스트를 쓰기로 확정), 앞으로 화면용 정의로 되돌릴 일이 없다.
// 두 조건을 계속 돌리면 호출이 두 배로 들면서 이제 쓰지 않는 조건의 결과가 리포트에 섞여
// 오히려 읽기 어려워지므로 단일 조건으로 정리했다.
// 그때의 결과는 scripts/results에 남아 있고, 그 B 조건 수치가 지금 상태의 비교 기준선이다.
//
// [프롬프트는 앱과 같은 함수로 만든다]
// src/ai/prompts/toolExamplesPrompt.js를 그대로 import한다.
// 프롬프트를 여기에 복사해 두면 나중에 앱 쪽만 고쳐졌을 때 조용히 어긋나고,
// 테스트는 "앱이 실제로 쓰지 않는 프롬프트"를 측정하게 된다.
//
// [실행]
//   cd "Gd project"
//   node scripts/testToolExamples.mjs
// 결과는 scripts/results/ 아래에 3개 파일로 저장된다.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildToolExamplesPrompt, buildToolExamplesSchema } from '../src/ai/prompts/toolExamplesPrompt.js'
import { TOOL_PROMPT_DESC } from '../src/data/toolPromptDesc.js'
import { BCC_DIRECTIONS } from '../src/data/bccData.js'

// ──────────────────────────────────────────────────────────
// 설정 — 실험 조건을 여기서만 바꾼다
// ──────────────────────────────────────────────────────────

// 테스트에 쓸 부모 카드 본문.
// 앱에서 확장 모달을 열 때 넘어가는 값과 같은 성격(카드의 description)이어야 한다.
// 도구를 적용할 구체적 요소(식사 계획·장보기·가사 분담·예산)가 들어 있는 문장을 골랐다.
// — 요소가 없으면 도구별 차이가 드러날 자리 자체가 없어서 실험이 성립하지 않는다.
const IDEA = `자취를 시작한 대학생을 위해 식사 계획, 장보기 목록, 가사 분담, 예산 관리를 한 화면에서 처리하는 자취 생활 통합 앱입니다. 흩어진 앱을 오가느라 관리를 포기하는 문제를 줄이는 것이 목적입니다.`

// 방향성당 반복 횟수.
// temperature가 0.9라 한 번만 뽑으면 프롬프트 효과인지 무작위성인지 구분할 수 없다.
const REPEAT = 5

// 앱과 동일해야 하는 호출 조건 (openaiClient.js 기준)
const MODEL = 'gpt-4o-mini'
const TEMPERATURE = 0.9 // callOpenAI가 인자 없이 호출되면 쓰는 TEMP_CREATIVE 값

// ──────────────────────────────────────────────────────────
// 준비: 경로, API 키
// ──────────────────────────────────────────────────────────

const HERE = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(HERE, '..')
const RESULT_DIR = join(HERE, 'results')

// .env에서 키를 읽는다. Vite가 아니라 Node로 실행하므로 직접 파싱해야 한다.
// 환경변수로 넘겼다면(OPENAI_API_KEY) 그쪽을 우선한다.
function readApiKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY
  const envPath = join(PROJECT_ROOT, '.env')
  if (!existsSync(envPath)) {
    throw new Error(`.env를 찾지 못했습니다: ${envPath}`)
  }
  const line = readFileSync(envPath, 'utf-8')
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith('VITE_OPENAI_API_KEY='))
  if (!line) throw new Error('.env에 VITE_OPENAI_API_KEY가 없습니다')
  return line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')
}

// ──────────────────────────────────────────────────────────
// OpenAI 호출 — openaiClient.js의 callOpenAI와 같은 요청 형태를 쓴다
// (openaiClient.js 자체는 import.meta.env를 써서 Node에서 실행되지 않는다)
// ──────────────────────────────────────────────────────────
async function callOpenAI(apiKey, messages, schema) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: TEMPERATURE,
      messages,
      response_format: {
        type: 'json_schema',
        json_schema: { name: schema.name, strict: true, schema: schema.schema },
      },
    }),
  })
  if (!res.ok) throw new Error(`OpenAI API 오류 (${res.status}): ${await res.text()}`)
  const data = await res.json()
  const choice = data.choices[0]
  if (choice.finish_reason === 'length') throw new Error('응답이 토큰 한도에서 잘렸습니다')
  return JSON.parse(choice.message.content)
}

// ──────────────────────────────────────────────────────────
// 지표 계산
//
// 아래 ①②는 "문장이 획일적인가"를 기계적으로 재는 프록시일 뿐이다.
// 진짜 목표는 ③(도구를 구별할 수 있는가)이고 그건 사람이 판정해야 한다.
// ①②가 좋아져도 ③이 그대로면 실패로 봐야 한다.
// ──────────────────────────────────────────────────────────

// ① 문장 골격 반복
// 종결부: 마지막 어절에서 문장부호를 뗀 것 (예: "할 수 있습니다." → "있습니다")
function endingOf(text) {
  const t = text.trim().replace(/[.!?"'”’)\]]+$/g, '')
  const tokens = t.split(/\s+/)
  return tokens[tokens.length - 1] ?? ''
}

// 한 그룹(같은 호출에서 나온 2~3개 예시) 안에서 종결부가 겹치는 정도. 0=전부 다름, 1=전부 같음
function endingRepeatRatio(examples) {
  if (examples.length < 2) return 0
  const endings = examples.map((e) => endingOf(e.example))
  const unique = new Set(endings).size
  return (examples.length - unique) / (examples.length - 1)
}

// 연결어미: 문장을 "~하여 ~함으로써" 식으로 잇는 표현
const CONNECTOR_RE = /하여|함으로써|으로써|를 통해|을 통해|하면서/

// ② 효용 어휘: 조작 방식이 아니라 "좋아진다"는 효과를 말하는 단어
const UTILITY_RE = /가치|효율|향상|개선|편리|만족|최적화|극대화|강화|높일|높이|줄일|줄이/g

function metricsOf(groups) {
  const allExamples = groups.flatMap((g) => g.examples)
  const endingRepeat = groups.reduce((s, g) => s + endingRepeatRatio(g.examples), 0) / groups.length
  const connectorRate =
    allExamples.filter((e) => CONNECTOR_RE.test(e.example)).length / allExamples.length
  const utilityHits = allExamples.map((e) => (e.example.match(UTILITY_RE) ?? []).length)
  return {
    예시_수: allExamples.length,
    종결부_반복률: +endingRepeat.toFixed(3),
    연결어미_포함률: +connectorRate.toFixed(3),
    효용어휘_포함_예시_비율: +(utilityHits.filter((n) => n > 0).length / allExamples.length).toFixed(3),
    효용어휘_예시당_평균: +(utilityHits.reduce((a, b) => a + b, 0) / allExamples.length).toFixed(2),
    평균_글자수: Math.round(allExamples.reduce((s, e) => s + e.example.length, 0) / allExamples.length),
  }
}

// ──────────────────────────────────────────────────────────
// 실행
// ──────────────────────────────────────────────────────────

// 도구 정의는 프롬프트 전용 텍스트 하나만 쓴다 (앱이 실제로 넘기는 것과 동일)
const TOOL_DESC = TOOL_PROMPT_DESC.expand

const DIRECTIONS = BCC_DIRECTIONS.map((d) => ({
  label: d.label,
  toolNames: d.tools.map((t) => t.name),
}))

async function main() {
  const apiKey = readApiKey()
  const total = DIRECTIONS.length * REPEAT
  console.log(`총 ${total}회 호출 (방향성 ${DIRECTIONS.length} × 반복 ${REPEAT})\n`)

  const groups = [] // { direction, round, examples }
  let done = 0

  for (const direction of DIRECTIONS) {
    const { system, user } = buildToolExamplesPrompt(IDEA, direction, TOOL_DESC)
    const schema = buildToolExamplesSchema(direction.toolNames)

    for (let round = 1; round <= REPEAT; round++) {
      let res
      try {
        res = await callOpenAI(apiKey, [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ], schema)
      } catch (err) {
        // 일시적 실패는 한 번만 재시도한다 (계속 실패하면 그 회차를 건너뛴다)
        console.log(`  재시도: ${err.message}`)
        try {
          res = await callOpenAI(apiKey, [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ], schema)
        } catch (err2) {
          console.log(`  실패로 건너뜀: ${err2.message}`)
          done++
          continue
        }
      }

      // 도구 순서대로 정렬 (앱의 normalizeExamples와 같은 처리)
      // 응답 필드는 스키마 이름(toolName/optionText)을 따르지만,
      // 이 스크립트 내부의 집계·리포트 형식은 기존 { name, example }을 그대로 쓴다.
      // → 예전 결과 파일과 같은 형식이라 지난 기록과 그대로 비교할 수 있다.
      const examples = direction.toolNames.map((name) => ({
        name,
        example: res.options.find((o) => o.toolName === name)?.optionText?.trim() ?? '(누락)',
      }))
      groups.push({ direction: direction.label, round, examples })

      done++
      process.stdout.write(`\r진행 ${done}/${total}`)
    }
  }
  console.log('\n')

  // 지표 집계 (단일 조건이므로 한 줄)
  const summary = metricsOf(groups)
  console.table([summary])

  // ── 결과 파일 저장 ──
  mkdirSync(RESULT_DIR, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

  // 1) 원자료 — 프롬프트와 모든 응답
  const raw = {
    실행시각: new Date().toISOString(),
    설정: { MODEL, TEMPERATURE, REPEAT, IDEA },
    지표: summary,
    // 실제로 보낸 프롬프트를 그대로 남긴다 — 나중에 "이 결과가 어느 프롬프트에서 나왔는지"를
    // 결과 파일만 보고 알 수 있어야 지난 기록과 비교할 때 근거가 된다.
    프롬프트샘플: buildToolExamplesPrompt(IDEA, DIRECTIONS[0], TOOL_DESC),
    결과: groups,
  }
  const rawPath = join(RESULT_DIR, `${stamp}-raw.json`)
  writeFileSync(rawPath, JSON.stringify(raw, null, 2), 'utf-8')

  // 2) 결과 시트 — 방향성별로 회차를 이어 놓아 눈으로 읽는 용도
  //    같은 도구가 회차마다 어떤 대상을 고르는지, 도구끼리 침범하지 않는지를 여기서 본다.
  let cmp = `# tool_examples 결과 (${stamp})\n\n`
  cmp += `- 모델 ${MODEL} / temperature ${TEMPERATURE} / 방향성당 ${REPEAT}회\n`
  cmp += `- 도구 정의: 프롬프트 전용 텍스트(TOOL_PROMPT_DESC.expand)\n`
  cmp += `- 지표: ${JSON.stringify(summary)}\n\n`
  for (const d of DIRECTIONS) {
    cmp += `## ${d.label}\n\n`
    for (let round = 1; round <= REPEAT; round++) {
      const g = groups.find((x) => x.direction === d.label && x.round === round)
      cmp += `### ${round}회차\n\n`
      if (!g) { cmp += `- (실패)\n\n`; continue }
      for (const e of g.examples) cmp += `- **${e.name}**(${e.example.length}자): ${e.example}\n`
      cmp += '\n'
    }
  }
  const cmpPath = join(RESULT_DIR, `${stamp}-결과.md`)
  writeFileSync(cmpPath, cmp, 'utf-8')

  // 3) 블라인드 판정 시트 — 도구명을 가린 문장을 보고 어느 도구인지 맞춰 보는 용도
  //    도구 구별성은 숫자로 잴 수 없어서 사람이 판정해야 하는데,
  //    도구명이 보이면 "그렇게 읽히도록" 판단이 기울므로 가린 채로 본다.
  //    정답은 raw.json에만 들어 있다.
  // 1~2회차만 뽑는다. 전 회차를 다 넣으면 사람이 판정할 양이 너무 많아진다.
  // (조건이 둘이던 때는 1회차만으로 8묶음이 나왔는데, 단일 조건이 된 지금 같은 양을 유지하는 수치다)
  const blindGroups = groups
    .filter((g) => g.round <= 2)
    .map((g, i) => ({ ...g, no: i + 1 }))
    .sort(() => Math.random() - 0.5)

  let blind = `# 블라인드 도구 판정 시트 (${stamp})\n\n`
  blind += `각 묶음의 문장이 아래 도구 중 어느 것인지 맞춰 보세요.\n`
  blind += `문장만 읽고 도구를 되짚을 수 있으면 도구별 차이가 드러난 것이고,\n`
  blind += `헷갈리면 문장이 서로 구별되지 않는 것입니다.\n`
  blind += `정답은 같은 시각의 -raw.json에 있습니다.\n\n`
  for (const g of blindGroups) {
    blind += `## 묶음 ${g.no}\n\n`
    blind += `후보 도구: ${[...g.examples.map((e) => e.name)].sort().join(' / ')}\n\n`
    const shuffled = [...g.examples].sort(() => Math.random() - 0.5)
    shuffled.forEach((e, i) => { blind += `${String.fromCharCode(97 + i)}) ${e.example}\n\n` })
  }
  const blindPath = join(RESULT_DIR, `${stamp}-블라인드.md`)
  writeFileSync(blindPath, blind, 'utf-8')

  console.log('저장 완료:')
  console.log(' -', rawPath)
  console.log(' -', cmpPath)
  console.log(' -', blindPath)
}

main().catch((err) => {
  console.error('\n실행 실패:', err.message)
  process.exit(1)
})
