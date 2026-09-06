// ERRC(Eliminate, Reduce, Raise, Create) 프레임워크 데이터
// 변형하기 모달에서 사용하는 4개 방향성 — 각 방향성에 도구가 1:1로 매핑됨
//
// bccData.js와 같은 원칙으로 구조와 식별자만 담는다.
// 도구 설명 텍스트는 화면용(toolLayerDesc.js) / 프롬프트 도구 정의(toolPromptDesc.js) /
// 프롬프트 방향성(frameworkDesc.js)에 따로 있다.
//
// [실제로 읽히는 필드]
//   label       — 변형 모달 1단계 방향성 선택지로 화면에 그대로 표시 (TransformModal)
//   tool.name   — 도구명. AI 호출(generateQuestion)에 넘기는 값
//   tool.icon   — 변형 모달 2단계 도구 칩 아이콘
//
// [question 필드를 삭제한 이유]
// AI 연동 전 하드코딩 값이었고("AI 생활 루틴 코치 앱" 기준), 지금은 generateQuestion이
// 아이디어 본문에 맞춰 질문을 만든다. 읽는 코드가 없어 죽은 텍스트로만 남아 있었다.
//
// 확장(BCC)은 방향성 하나에 도구가 여러 개라 tools 배열을 쓰지만,
// 여기는 1:1이라 tool 단수 객체다 — 그래서 예시 선택 단계(확장 2단계)가 없다.
export const ERRC_DIRECTIONS = [
  {
    label: '지금보다 더 강하게 밀어붙여야 할 것이 있다',
    tool: { name: '증가', icon: '/modal_infoui_errc_trending_up.svg' },
  },
  {
    label: '너무 복잡하거나 과한 부분을 줄이고 싶다',
    tool: { name: '감소', icon: '/modal_infoui_errc_trending_down.svg' },
  },
  {
    label: '아직 없지만 있으면 좋을 것을 새로 만들고 싶다',
    tool: { name: '창출', icon: '/modal_infoui_errc_sparkles.svg' },
  },
  {
    label: '당연하다고 여겼던 것을 과감하게 없애고 싶다',
    tool: { name: '제거', icon: '/modal_infoui_errc_ban.svg' },
  },
]
