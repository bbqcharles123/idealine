import './UxStatusBadge.css'

// 영역 평가 상태 배지: 보완(노란) / 충족(녹색)
// needsImprovement: true → 보완 / false → 충족
function UxStatusBadge({ needsImprovement }) {
  return (
    <span className={`ux-status-badge ux-status-badge--${needsImprovement ? 'supplement' : 'satisfied'}`}>
      {needsImprovement ? '보완' : '충족'}
    </span>
  )
}

export default UxStatusBadge
