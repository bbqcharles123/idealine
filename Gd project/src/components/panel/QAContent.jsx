import './QAContent.css'

// 질문&응답 컴포넌트: 사이드패널에서 모달에서 제시된 질문과 사용자의 답변을 표시
// 질문(파란 배경 #eef5ff) + 답변(회색 배경 #f7f7f7)이 border로 묶인 구조
function QAContent({ question, answer }) {
  return (
    <div className="qa-content">
      <div className="qa-content__question">
        <p>{question}</p>
      </div>
      <div className="qa-content__answer">
        <p>{answer}</p>
      </div>
    </div>
  )
}

export default QAContent