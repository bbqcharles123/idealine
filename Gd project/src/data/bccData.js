// BCC(Breakthrough Creative Cognition) 사고도구 데이터
// 4개 방향성과 각 방향성에 속한 도구 목록 정의
//
// [이 파일이 담는 것 — 구조와 식별자만]
// 도구를 설명하는 텍스트는 여기 두지 않는다. 설명은 용도별로 파일이 나뉘어 있다.
//   화면(도구 레이어)  : toolLayerDesc.js
//   프롬프트(예시 생성) : toolExampleDesc.js
//   프롬프트(방향성)    : frameworkDesc.js
// 이 파일에 설명이 함께 있으면 같은 도구에 대한 문장이 한 벌 더 늘어나,
// 나중에 "이 도구를 어떻게 정의했더라"를 찾을 때 어느 것이 실제로 쓰이는지 알 수 없게 된다.
//
// [실제로 읽히는 필드]
//   label        — 확장 모달 1단계 방향성 선택지로 화면에 그대로 표시 (ExpandModal)
//   tools[].name — 도구명의 단일 출처. AI 호출에 넘기는 toolNames이자 응답 스키마 enum의 원본이고,
//                  toolExampleDesc.js의 키 순서도 이 배열 순서를 따른다
//   tools[].icon — 확장 모달 3단계 도구 칩 아이콘
//
// [example·question 필드를 삭제한 이유]
// AI 연동 전에 화면을 채우려고 하드코딩해 둔 값이었다("AI 생활 루틴 코치 앱" 기준).
// 지금은 예시를 generateToolExamples가, 질문을 generateQuestion이 만들어 쓰므로
// 이 필드들을 읽는 코드가 한 곳도 없었다 — 남겨두면 죽은 텍스트가 도구 설명 후보로 오인된다.
export const BCC_DIRECTIONS = [
  {
    label: '지금 있는 기능이나 요소를 없애거나 다른 것으로 바꿔보고 싶다',
    tools: [
      { name: '제거',      icon: '/modal_infoui_bcc_eraser.svg' },
      { name: '대체',      icon: '/modal_infoui_bcc_replace.svg' },
      { name: '분할·분리', icon: '/modal_infoui_bcc_scissors.svg' },
    ],
  },
  {
    label: '기존 요소를 합치거나 새로운 요소를 더해보고 싶다',
    tools: [
      { name: '용도통합', icon: '/modal_infoui_bcc_layers.svg' },
      { name: '결합',     icon: '/modal_infoui_bcc_combine.svg' },
      { name: '복제',     icon: '/modal_infoui_bcc_copy.svg' },
    ],
  },
  {
    label: '당연하다고 여겼던 것을 반대로 뒤집거나 새롭게 정의해보고 싶다',
    tools: [
      { name: '역전',   icon: '/modal_infoui_bcc_reverse.svg' },
      { name: '재정의', icon: '/modal_infoui_bcc_refresh.svg' },
    ],
  },
  {
    label: '전혀 다른 분야나 상황에서 힌트를 가져와 적용해보고 싶다',
    tools: [
      { name: '유추',        icon: '/modal_infoui_bcc_lightbulb.svg' },
      { name: '연결',        icon: '/modal_infoui_bcc_link.svg' },
      { name: '속성 의존성', icon: '/modal_infoui_bcc_branch.svg' },
    ],
  },
]
