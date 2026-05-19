import './IdeaCardContent.css'

// 아이디어 출처 카드: 사이드패널 생성정보 탭에서 직속 부모 카드의 내용을 표시
function IdeaCardContent({ title, description }) {
  return (
    <div className="idea-card-content">
      <p className="idea-card-content__title">{title}</p>
      <p className="idea-card-content__body">{description}</p>
    </div>
  )
}

export default IdeaCardContent