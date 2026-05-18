import { useState } from 'react'
import ModalButton from './ModalButton'
import './WriteModal.css'

// 직접작성 모달: 사용자가 제목과 설명을 직접 입력해 파생카드를 생성
// onClose: X 버튼 클릭 시 모달 닫기
// onSubmit(title, description): 파생 카드 생성하기 버튼 클릭 시 카드 생성 요청
function WriteModal({ onClose, onSubmit }) {
  // 사용자 입력 상태
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  // 제목과 설명이 모두 입력된 경우에만 생성 버튼 활성화
  const isSubmittable = title.trim() !== '' && description.trim() !== ''

  const handleSubmit = () => {
    if (!isSubmittable) return
    onSubmit(title.trim(), description.trim())
  }

  return (
    // 오버레이: 캔버스 전체를 덮어 모달 외부 클릭을 차단
    <div className="modal-overlay">
      <div className="write-modal">

        {/* X 닫기 버튼 */}
        <button className="modal-close-btn" onClick={onClose}>
          <img src="/close_modal.svg" width={32} height={32} alt="닫기" />
        </button>

        {/* 콘텐츠 영역: 헤더 + 입력 필드 */}
        <div className="write-modal-content">

          {/* 헤더: 모달 제목 + 부제 */}
          <div className="write-modal-header">
            <h2 className="write-modal-title">직접작성</h2>
            <p className="modal-subtitle">내 생각을 직접 입력해 새로운 아이디어 카드를 만듭니다</p>
          </div>

          {/* 아이디어 제목 입력 필드 */}
          <div className="write-modal-field">
            <label className="modal-label">아이디어 제목</label>
            <input
              className="modal-input"
              type="text"
              placeholder="한 줄로 아이디어를 표현해주세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* 아이디어 설명 입력 필드 */}
          <div className="write-modal-field write-modal-field--desc">
            <div className="write-modal-desc-header">
              <label className="modal-label">아이디어 설명</label>
              <p className="modal-sublabel">누구를 위해, 어떤 불편함을, 어떻게 해결하는지 작성해주세요</p>
            </div>
            <textarea
              className="modal-textarea"
              placeholder="루틴 관리가 어려운 직장인을 위해, 매일 같은 알림을 무시하게 되는 문제를 해결한다. 앱을 열면 지금 상태에 맞는 루틴이 바로 보여 알림 없이도 루틴을 유지할 수 있다."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        {/* 하단 버튼: 제목+설명 모두 입력 시 활성 */}
        <div className="write-modal-footer">
          <ModalButton
            variant="filled"
            disabled={!isSubmittable}
            width={222}
            onClick={handleSubmit}
          >
            파생 카드 생성하기
          </ModalButton>
        </div>

      </div>
    </div>
  )
}

export default WriteModal
