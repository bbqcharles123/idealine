import './RecReason.css'

// 사이드패널 추천 이유 박스: 직접작성 카드 전용
// reason: AI가 생성한 도구 추천 이유 텍스트 (없으면 렌더링하지 않음)
function RecReason({ reason }) {
  if (!reason) return null

  return (
    <div className="rec-reason">
      <p className="rec-reason__title">추천 이유</p>
      <p className="rec-reason__body">{reason}</p>
    </div>
  )
}

export default RecReason
