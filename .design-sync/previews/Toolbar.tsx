// 툴바 — 카드를 하나 고르면 화면 하단 중앙에 뜨는 pill 형태의 도구 모음.
// activeModal이 열린 도구를 파랗게, recTool이 AI 추천 도구를 민트색 + 툴팁으로 표시한다.
import { Toolbar } from 'gd-project'

// 툴팁이 버튼 위로 올라오므로 위쪽 여백을 준다
const stage = { padding: '48px 16px 16px' }

// 기본 — 아무 도구도 열리지 않은 상태
export const Default = () => (
  <div style={stage}>
    <Toolbar />
  </div>
)

// 확장하기 모달이 열린 상태 — 해당 버튼이 파랗게 활성
export const ExpandActive = () => (
  <div style={stage}>
    <Toolbar activeModal="expand" />
  </div>
)

// 변형하기 모달이 열린 상태
export const TransformActive = () => (
  <div style={stage}>
    <Toolbar activeModal="transform" />
  </div>
)

// AI 추천 상태 — 직접작성 카드의 도구 레이어를 펼쳤을 때.
// 추천 버튼이 민트색이 되고 '추천하는 도구' 툴팁이 위에 뜬다
export const Recommended = () => (
  <div style={stage}>
    <Toolbar recTool="expand" />
  </div>
)
