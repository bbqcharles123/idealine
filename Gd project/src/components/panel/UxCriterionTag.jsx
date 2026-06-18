import { CircleAlert } from 'lucide-react'
import './UxCriterionTag.css'

// UX 평가요소 태그: 해당 영역에 속하는 평가 기준을 pill 형태로 표시
// needsImprovement: false → 일반(회색 배경 #f5f5f5, #555 텍스트)
// needsImprovement: true  → 보완 필요(노란 배경 #FEF08A, 경고 아이콘 + #713f12 텍스트)
function UxCriterionTag({ name, needsImprovement = false }) {
  return (
    <span className={`ux-criterion-tag ux-criterion-tag--${needsImprovement ? 'supplement' : 'normal'}`}>
      {needsImprovement && (
        <CircleAlert size={12} className="ux-criterion-tag__icon" />
      )}
      {name}
    </span>
  )
}

export default UxCriterionTag
