import { useState } from 'react'
import Tooltip from './Tooltip'
import './UxItemName.css'

// 평가요소명 pill: 회색 배경 라벨 + (보완 필요 시 경고 아이콘 + 클릭 tooltip)
// name:             string  — 평가요소명 (창의성, 실현 가능성 등)
// needsImprovement: boolean — true이면 ux_warn 아이콘 표시, 클릭 시 tooltip 팝업
function UxItemName({ name, needsImprovement = false }) {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false)

  return (
    <div className="ux-item-name">
      <span className="ux-item-name__text">{name}</span>

      {/* 보완 필요 시: ux_warn 아이콘 + 클릭 tooltip */}
      {needsImprovement && (
        <div className="ux-item-name__icon-wrap">
          <button
            className="ux-item-name__icon-btn"
            onClick={() => setIsTooltipOpen((prev) => !prev)}
            aria-label="보완이 필요한 항목"
          >
            <img src="/ux_warn.svg" width={18} height={18} alt="" />
          </button>

          {/* 아이콘 위에 나타나는 tooltip: 삼각형 왼쪽 정렬 (아이콘 위치에 맞춤) */}
          {isTooltipOpen && (
            <div className="ux-item-name__tooltip">
              <Tooltip text="보완이 필요한 항목" arrowPosition="left" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default UxItemName
