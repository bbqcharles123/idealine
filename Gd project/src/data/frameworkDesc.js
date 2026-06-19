// 확장(BCC)/변형(ERRC) 사고 프레임워크 설명
// 1단계 방향성별로 "어떤 도구가 왜 이 방향성에 속하는지" 설명 텍스트.
// 화면 표시용이 아니라 AI 프롬프트에 컨텍스트로 주입해 예시·질문 품질을 높이는 용도.

// 확장(BCC): 4개 방향성 — 각 방향성에 속한 도구들과 그 묶음의 사고 논리
const BCC_FRAMEWORK = [
  {
    label: '지금 있는 기능이나 요소를 없애거나 다른 것으로 바꿔보고 싶다',
    tools: ['제거', '대체', '분할·분리'],
    reasoning:
      '세 도구 모두 기존에 존재하는 요소를 건드리는 방식입니다. 없애거나, 다른 것으로 바꾸거나, 나누는 행위가 같은 사고 방향입니다.',
  },
  {
    label: '기존 요소를 합치거나 새로운 요소를 더해보고 싶다',
    tools: ['용도통합', '결합', '복제'],
    reasoning:
      '세 도구 모두 더하는 방향의 사고입니다. 두 역할을 하나로 합치거나, 서로 다른 것을 연결하거나, 기존 요소를 복제해서 추가하는 방식이 같은 사고 방향입니다.',
  },
  {
    label: '당연하다고 여겼던 것을 반대로 뒤집거나 새롭게 정의해보고 싶다',
    tools: ['역전', '재정의'],
    reasoning:
      '두 도구 모두 기존의 전제를 뒤집는 방식입니다. 역전은 위치·순서·속성을 반대로 하고, 재정의는 고객과 문제 자체를 새롭게 봅니다. 둘 다 당연하다고 생각한 것을 의심하는 사고 방향입니다.',
  },
  {
    label: '전혀 다른 분야나 상황에서 힌트를 가져와 적용해보고 싶다',
    tools: ['유추', '연결', '속성 의존성'],
    reasoning:
      '세 도구 모두 외부에서 실마리를 찾는 방식입니다. 유추는 다른 시스템의 원리를 가져오고, 연결은 관련 없는 두 요소를 잇고, 속성 의존성은 외부 환경과 내부 속성 간의 새로운 관계를 만듭니다. 모두 현재 아이디어 밖에서 보는 사고 방향입니다.',
  },
]

// 변형(ERRC): 4개 방향성 — 방향성과 도구가 1:1
const ERRC_FRAMEWORK = [
  {
    label: '지금보다 더 강하게 밀어붙여야 할 것이 있다',
    tools: ['증가'],
    reasoning:
      '증가는 현재 있는 요소의 수준을 표준 이상으로 높이는 것입니다. 이미 있는데 더 강화하고 싶다는 욕구와 일치합니다.',
  },
  {
    label: '너무 복잡하거나 과한 부분을 줄이고 싶다',
    tools: ['감소'],
    reasoning:
      '감소는 현재 있는 요소를 표준 이하로 낮추는 것입니다. 줄여내면 오히려 좋아질 것 같다는 직관과 연결됩니다.',
  },
  {
    label: '아직 없지만 있으면 좋을 것을 새로 만들고 싶다',
    tools: ['창출'],
    reasoning:
      '창출은 기존에 없는 요소를 새롭게 만드는 것입니다. 지금 없는 것에 집중하는 사고 방향입니다.',
  },
  {
    label: '당연하다고 여겼던 것을 과감하게 없애고 싶다',
    tools: ['제거'],
    reasoning:
      'ERRC의 제거는 업계에서 당연하게 여겨지는 요소를 없애는 것입니다. BCC의 제거와 비슷해 보이지만, ERRC 제거는 업계 표준에 대한 질문이라는 점에서 다릅니다.',
  },
]

// toolType('expand'|'transform')에 해당하는 프레임워크 배열 반환
function getFramework(toolType) {
  return toolType === 'expand' ? BCC_FRAMEWORK : ERRC_FRAMEWORK
}

// 특정 도구가 속한 방향성의 설명을 문자열로 반환 (질문 생성 프롬프트용)
// 예: "이 도구는 '...' 방향성에 속합니다. <reasoning>"
export function getFrameworkContext(toolType, toolName) {
  const dir = getFramework(toolType).find((d) => d.tools.includes(toolName))
  if (!dir) return ''
  return `이 도구는 '${dir.label}' 방향성에 속합니다. ${dir.reasoning}`
}

// 특정 방향성(label)의 설명을 반환 (도구 예시 생성 프롬프트용 — 호출 2에서 사용 예정)
export function getDirectionReasoning(toolType, directionLabel) {
  const dir = getFramework(toolType).find((d) => d.label === directionLabel)
  return dir ? dir.reasoning : ''
}
