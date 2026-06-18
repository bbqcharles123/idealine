import './UXItem.css'

// UX 평가 항목 하나: 평가 기준명(창의성 등)과 AI 평가 내용을 표시
// 헤더(평가 기준명)와 바디(평가 내용) 두 영역으로 분리된 카드 형태
// AI 연동 후 content는 카드 data에서 받아오게 될 예정
function UXItem({ criterion, content }) {
  return (
    <div className="ux-item">
      {/* 헤더: 평가 기준명 (회색 배경, 상단 모서리 둥글게) */}
      <p className="ux-item__criterion">{criterion}</p>
      {/* 바디: AI 평가 내용 (흰 배경, 하단 모서리 둥글게) */}
      <p className="ux-item__content">{content}</p>
    </div>
  )
}

export default UXItem
