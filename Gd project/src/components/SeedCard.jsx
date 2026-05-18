import { Handle, Position } from '@xyflow/react'
import './SeedCard.css'

// 씨드카드: 사용자가 처음 입력하는 초기 아이디어 카드
// React Flow nodeTypes에 'seed'로 등록되어 있음
function SeedCard({ id, data }) {
  // App.jsx에서 주입된 data에서 필요한 값을 꺼냄
  // isSelected: 카드 클릭(툴바) 또는 ⓘ 클릭(사이드패널) 시 true → 파란 테두리
  // isHighlighted: 선택된 파생카드의 바로 위 부모일 때 true → 주황 테두리
  const { title, description, isSelected, isHighlighted, onInfoClick } = data ?? {}

  return (
    // 선택/하이라이트 상태에 따라 CSS 클래스를 동적으로 조합
    <div className={`seed-card${isSelected ? ' selected' : ''}${isHighlighted ? ' highlighted' : ''}`}>

      {/* 정보 아이콘 버튼: 클릭 시 사이드패널 열기
          stopPropagation으로 카드 클릭 이벤트가 동시에 발생하지 않도록 차단 */}
      <button
        className="card-info-btn"
        onClick={(e) => {
          e.stopPropagation()
          onInfoClick?.(id)
        }}
      >
        <img src="/info.svg" width={24} height={24} alt="정보" />
      </button>

      {/* 카드 제목 */}
      <p className="card-title">{title}</p>

      {/* 카드 본문 */}
      <p className="card-body">{description}</p>

      {/* 하단 연결 핸들: 이 카드에서 파생카드로 선이 뻗어나가는 출발점
          시각적으로는 숨겨져 있으나 React Flow 연결 기능은 유지 */}
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

export default SeedCard
