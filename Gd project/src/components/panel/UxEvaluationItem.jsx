import { useState } from 'react'
import Tooltip from './Tooltip'
import './UxEvaluationItem.css'

// UX 평가요소 항목: 평가요소명 pill + (보완 필요 시 경고 아이콘 + tooltip) + 평가 내용 텍스트
// name:             string  — 평가요소명 (창의성, 실현 가능성 등)
// needsImprovement: boolean — true이면 ux_warn 아이콘 표시, 클릭 시 tooltip 팝업
// evaluation:       string  — 해당 평가요소에 대한 세부 평가 내용
function UxEvaluationItem({ name, needsImprovement = false, evaluation }) {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false)

  return (
    <div className="ux-evaluation-item">
      <div className="ux-evaluation-item__pill">
        <span className="ux-evaluation-item__name">{name}</span>

        {/* 보완 필요 시: ux_warn 아이콘 + 클릭 tooltip */}
        {needsImprovement && (
          <div className="ux-evaluation-item__icon-wrap">
            <button
              className="ux-evaluation-item__icon-btn"
              onClick={() => setIsTooltipOpen((prev) => !prev)}
              aria-label="보완이 필요한 항목"
            >
              <img src="/ux_warn.svg" width={18} height={18} alt="" />
            </button>

            {/* 아이콘 위에 나타나는 tooltip: 삼각형 오른쪽 정렬 (아이콘 위치에 맞춤) */}
            {isTooltipOpen && (
              <div className="ux-evaluation-item__tooltip">
                <Tooltip text="보완이 필요한 항목" arrowPosition="left" />
              </div>
            )}
          </div>
        )}
      </div>

      <p className="ux-evaluation-item__text">{evaluation}</p>
    </div>
  )
}

export default UxEvaluationItem
