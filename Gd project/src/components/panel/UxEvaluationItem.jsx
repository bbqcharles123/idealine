import UxItemName from './UxItemName'
import './UxEvaluationItem.css'

// UX 평가요소 항목 카드: 항목명 pill + 세부 평가 텍스트 세로 배치
// name:             string  — 평가요소명 (창의성, 실현 가능성 등)
// needsImprovement: boolean — 보완 필요 시 항목명 pill에 경고 아이콘 표시
// evaluation:       string  — 해당 평가요소에 대한 세부 평가 내용
function UxEvaluationItem({ name, needsImprovement = false, evaluation }) {
  return (
    <div className="ux-evaluation-item">

      {/* 항목명 pill */}
      <UxItemName name={name} needsImprovement={needsImprovement} />

      {/* 세부 평가 내용 */}
      <p className="ux-evaluation-item__text">{evaluation}</p>
    </div>
  )
}

export default UxEvaluationItem
