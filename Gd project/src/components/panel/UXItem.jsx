import './UXItem.css'

// UX 평가 항목 하나: 평가 기준명(창의성 등)과 AI 평가 내용을 표시
// AI 연동 후 content는 카드 data에서 받아오게 될 예정
function UXItem({ criterion, content }) {
  return (
    <div className="ux-item">
      <p className="ux-item__criterion">{criterion}</p>
      <p className="ux-item__content">{content}</p>
    </div>
  )
}

export default UXItem