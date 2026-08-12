// 캔버스 상단 헤더 — 홈 버튼 + 편집 가능한 캔버스 제목.
//
// 이 컴포넌트는 position: fixed(top 24 / left 28)로 뷰포트에 붙는다.
// 프리뷰 카드 안에 가두려면 조상에 transform을 주어 고정 위치의 기준
// 컨테이닝 블록을 만들어야 한다. 그렇지 않으면 카드 밖으로 빠져나간다.
import { CanvasHeader } from 'gd-project'

const stage: React.CSSProperties = {
  position: 'relative',
  transform: 'translateZ(0)', // fixed의 기준을 이 박스로 바꾼다
  width: 560,
  height: 110,
  background: 'var(--color-background, #F1F3F4)',
  borderRadius: 8,
  overflow: 'hidden',
}

// 기본 — 캔버스 이름이 짧을 때
export const Default = () => (
  <div style={stage}>
    <CanvasHeader title="아이디어 발산 서비스" />
  </div>
)

// 긴 제목 — 최대 325px에서 잘린다
export const LongTitle = () => (
  <div style={stage}>
    <CanvasHeader title="졸업작품 캡스톤 아이디어 정리용 캔버스 2차" />
  </div>
)

// 기본 제목 — 새 작업공간을 만들었을 때의 초기값
export const Untitled = () => (
  <div style={stage}>
    <CanvasHeader title="제목 없는 캔버스" />
  </div>
)
