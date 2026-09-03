// 확장하기 2단계(선택지 생성, tool_examples) 요청 사양
// — 모델에게 보낼 프롬프트 문장과 응답 스키마를 만드는 순수 함수만 둔다.
//
// [왜 deriveCard.js에서 분리했는가]
// deriveCard.js는 openaiClient.js(→ import.meta.env, Vite 전용)를 함께 불러온다.
// 그래서 Node로 실행하는 테스트 스크립트에서는 deriveCard.js를 import할 수 없고,
// 프롬프트를 테스트 쪽에 복사해 두면 나중에 한쪽만 고쳐졌을 때 조용히 어긋난다.
// (테스트가 "앱이 실제로 쓰지 않는 프롬프트"를 측정하게 되는데 겉으로는 멀쩡해 보인다)
// → 프롬프트 문장의 출처를 이 파일 하나로 만들고, 앱과 테스트가 같은 함수를 부른다.
//
// 이 파일은 브라우저 전용 API를 쓰지 않는다(순수 문자열 조립 + 정적 데이터 import).
// 그래야 Node에서도 그대로 실행된다 — 앞으로도 이 조건을 깨지 않도록 유지할 것.

import { getDirectionReasoning } from '../../data/frameworkDesc.js'

// 응답 스키마 (Structured Outputs)
// 도구명 목록을 enum으로 주입해 예시 생성 스키마를 만든다.
// name을 자유 문자열로 두면 모델이 '분할·분리'를 '분할/분리'처럼 살짝 다르게 써도 스키마를 통과하고,
// 화면에서 도구와 예시를 짝지을 때(find) 매칭에 실패해 빈 선택지가 된다.
// enum으로 고정하면 이름이 어긋나는 경우 자체가 사라진다. (strict 모드가 지원하는 키워드)
export function buildToolExamplesSchema(toolNames) {
  return {
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
              name:    { type: 'string', enum: toolNames, description: '도구명 (입력한 도구명 그대로)' },
              example: { type: 'string', description: '이 도구를 아이디어에 적용했을 때의 구체적 예시 (1~2문장)' },
            },
          },
        },
      },
    },
  }
}

// 프롬프트 조립: { system, user } 두 문자열을 만든다.
//
// cardDescription: 부모 카드 본문 (확장 모달을 연 카드의 description)
// direction:       { label, toolNames } — 1단계에서 사용자가 고른 방향성과 그 도구명들
// toolDescMap:     도구명 → 정의 문자열 맵.
//   앱은 프롬프트 전용 정의(TOOL_EXAMPLE_DESC.expand)를 넘긴다.
//   테스트 스크립트가 화면용 정의(TOOL_LAYER_DESC.expand)를 넘겨 A/B를 비교할 수 있도록
//   출처를 고정하지 않고 인자로 받는다 — 이 인자가 실험의 유일한 변수다.
export function buildToolExamplesPrompt(cardDescription, direction, toolDescMap) {
  // 방향성 프레임워크 설명 (예시는 확장하기에서만 사용하므로 'expand' 고정)
  const reasoning = getDirectionReasoning('expand', direction.label)

  // 도구별 정의 목록: 방향성 설명(reasoning)은 "이 도구들이 왜 한 묶음인지"만 알려주므로,
  // 도구끼리 서로 무엇이 다른지는 각 도구의 정의를 함께 줘야 한다.
  // 정의가 없는 도구명은 이름만 남긴다 — 데이터가 어긋나도 예시 생성 자체는 막히지 않도록.
  const toolList = direction.toolNames
    .map((name) => {
      const desc = toolDescMap?.[name] ?? ''
      return desc ? `- ${name}: ${desc}` : `- ${name}`
    })
    .join('\n')

  const system = `당신은 아이디어 발산 도구의 AI 어시스턴트입니다.
사용자가 선택한 발전 방향성에 속한 각 사고도구를, 주어진 아이디어에 실제로 적용하면 어떤 결과가 나올지 구체적인 예시를 작성합니다.
- 입력으로 주어진 도구만, 입력된 도구명 그대로 사용하세요.
- 도구 ${direction.toolNames.length}개 전부에 대해 하나씩 빠짐없이 작성하세요. 개수가 부족하면 응답 전체가 폐기됩니다.
- example은 해당 도구를 이 아이디어에 적용한 결과를 1~2문장으로 구체적으로 묘사하세요.
- 각 도구의 고유한 사고 방향이 예시에 분명히 드러나도록 작성하세요.`

  const user = `[아이디어]
${cardDescription}

[선택한 방향성]
${direction.label}
${reasoning}

[이 방향성의 도구 목록]
${toolList}

각 도구별로 이 아이디어에 적용한 예시를 작성해주세요.`

  return { system, user }
}
