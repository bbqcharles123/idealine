import UxItemName from './UxItemName'
import UxAreaTag from './UxAreaTag'
import './UxEvaluationItem.css'

// UX 평가요소 항목 카드: 상단 행[항목명 pill + 영역명 태그] + 하단 평가 텍스트
// name:             string  — 평가요소명 (창의성, 실현 가능성 등)
// area:             string  — 소속 영역명 (Business | Human | Social), 우측 상단 태그
// needsImprovement: boolean — 보완 필요 시 항목명 pill에 경고 아이콘 표시
// evaluation:       string  — 해당 평가요소에 대한 세부 평가 내용
function UxEvaluationItem({ name, area, needsImprovement = false, evaluation }) {
  return (
    <div className="ux-evaluation-item">

      {/* 상단 행: 항목명(좌) + 영역명(우) 양끝 배치, 세로 중앙정렬 */}
      <div className="ux-evaluation-item__top">
        <UxItemName name={name} needsImprovement={needsImprovement} />
        {area && <UxAreaTag area={area} />}
      </div>

      {/* 하단: 세부 평가 내용 */}
      <p className="ux-evaluation-item__text">{evaluation}</p>
    </div>
  )
}

export default UxEvaluationItem
