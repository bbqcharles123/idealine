import './UxAreaTag.css'

// 영역명 태그: 평가요소가 속한 UX 영역(Business/Human/Social)을 pill로 표시
// area: string — 영역명
function UxAreaTag({ area }) {
  return <span className="ux-area-tag">{area}</span>
}

export default UxAreaTag
