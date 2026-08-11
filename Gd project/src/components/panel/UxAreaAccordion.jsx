import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import UxStatusBadge from './UxStatusBadge'
import UxCriterionTag from './UxCriterionTag'
import './UxAreaAccordion.css'

// UX 영역별 평가 아코디언 컴포넌트
// area: {
//   name: string              — 'Business' | 'Human' | 'Social'
//   status: string            — 'supplement' | 'satisfied'
//   evaluation: string        — 영역 평가 텍스트
//   criteria: [{ name, needsImprovement }]  — 해당 영역의 UX 평가요소 목록
// }
// defaultOpen: 초기 펼침 여부 (기본 true)
function UxAreaAccordion({ area, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const needsImprovement = area.status === 'supplement'

  return (
    <div className="ux-area-accordion">

      {/* 헤더: 영역명 + 상태 배지 + 화살표 */}
      <button
        className="ux-area-accordion__header"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <div className="ux-area-accordion__title-group">
          <span className="ux-area-accordion__name">{area.name}</span>
          <UxStatusBadge needsImprovement={needsImprovement} />
        </div>
        {/* 화살표 아이콘 색: --color-label과 값이 같지만 그 토큰은 '라벨 텍스트 색'이므로
            아이콘에는 토큰을 쓰지 않고 값으로 둔다 */}
        {isOpen
          ? <ChevronUp size={20} color="#555" strokeWidth={1.5} />
          : <ChevronDown size={20} color="#555" strokeWidth={1.5} />
        }
      </button>

      {/* 본문: 평가 텍스트 + 평가요소 태그 목록 (열린 상태에서만 렌더링) */}
      {isOpen && (
        <div className="ux-area-accordion__body">
          <p className="ux-area-accordion__evaluation">{area.evaluation}</p>
          <div className="ux-area-accordion__criteria">
            {area.criteria.map((criterion) => (
              <UxCriterionTag
                key={criterion.name}
                name={criterion.name}
                needsImprovement={criterion.needsImprovement}
              />
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

export default UxAreaAccordion
