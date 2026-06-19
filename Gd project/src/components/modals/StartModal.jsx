import { useState } from 'react'
import './WriteModal.css'
import './StartModal.css'

// 시작 카드 생성 모달: 앱 진입 시 공모전 주제 또는 탐색 키워드를 입력해 씨드카드를 생성
// onClose: X 버튼 클릭 시 모달 닫기
// onSubmit(topic): 시작 카드 생성 버튼 클릭 시 호출
function StartModal({ onClose, onSubmit }) {
  const [topic, setTopic] = useState('')

  const isSubmittable = topic.trim() !== ''

  const handleSubmit = () => {
    if (!isSubmittable) return
    onSubmit(topic.trim())
  }

  return (
    // 오버레이: 캔버스 전체를 덮어 모달 외부 클릭을 차단
    <div className="modal-overlay">
      <div className="start-modal">

        {/* 헤더 행: 제목(좌) / X 닫기(우) */}
        <div className="start-modal-header">
          <h2 className="start-modal-title">시작 카드 생성</h2>
          <button className="start-close-btn" onClick={onClose}>
            <img src="/close_modal.svg" width={26} height={26} alt="닫기" />
          </button>
        </div>

        {/* 바디: 안내 텍스트 + textarea + 생성 버튼 */}
        <div className="start-modal-body">
          <div className="start-modal-input-group">
            <p className="start-modal-guide">참여 중인 공모전 주제나 탐색하고 싶은 키워드를 자유롭게 입력하세요</p>
            <textarea
              className="start-modal-textarea"
              placeholder="AI 기술 기반 혁신적인 제품 및 서비스 아이디어 / AI와 자동차"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          {/* 시작 카드 생성 버튼: 입력 시 파란색으로 활성화 */}
          <button
            className={`start-modal-btn${isSubmittable ? ' start-modal-btn--active' : ''}`}
            onClick={handleSubmit}
            disabled={!isSubmittable}
          >
            시작 카드 생성
          </button>
        </div>

      </div>
    </div>
  )
}

export default StartModal
