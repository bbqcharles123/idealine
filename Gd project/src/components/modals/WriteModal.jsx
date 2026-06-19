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

  // 카드 생성(호출 6) 진행 중 여부 — 제출 버튼 로딩 표시
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 제목과 설명이 모두 입력된 경우에만 생성 버튼 활성화
  const isSubmittable = title.trim() !== '' && description.trim() !== ''

  // AI 생성이 끝날 때까지 버튼 로딩 표시 (성공 시 부모가 모달을 닫음)
  const handleSubmit = async () => {
    if (!isSubmittable) return
    setIsSubmitting(true)
    try {
      await onSubmit(title.trim(), description.trim())
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    // 오버레이: 캔버스 전체를 덮어 모달 외부 클릭을 차단
    <div className="modal-overlay">
      <div className="write-modal">

        {/* 상단 그룹: 헤더 행 + 입력 필드 묶음 */}
        <div className="write-modal-top-group">

          {/* 헤더 행: 제목+부제(좌) / X 닫기(우) */}
          <div className="write-modal-header-row">
            <div className="write-modal-header">
              <h2 className="write-modal-title">직접작성</h2>
              <p className="modal-subtitle">내 생각을 직접 입력해 새로운 아이디어 카드를 만듭니다</p>
            </div>
            <button className="write-close-btn" onClick={onClose}>
              <img src="/close_modal.svg" width={26} height={26} alt="닫기" />
            </button>
          </div>

          {/* 입력 필드 묶음: 제목 필드 + 설명 필드 */}
          <div className="write-modal-fields">

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

            {/* 아이디어 설명 입력 필드: 라벨(상) + 서브라벨+textarea 묶음(하) */}
            <div className="write-modal-field write-modal-field--desc">
              <label className="modal-label">아이디어 설명</label>
              <div className="write-modal-desc-body">
                <p className="modal-sublabel">누구를 위해, 어떤 불편함을, 어떻게 해결하는지 작성해주세요</p>
                <textarea
                  className="modal-textarea"
                  placeholder="루틴 관리가 어려운 직장인을 위해, 매일 같은 알림을 무시하게 되는 문제를 해결한다. 앱을 열면 지금 상태에 맞는 루틴이 바로 보여 알림 없이도 루틴을 유지할 수 있다."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

          </div>
        </div>

        {/* 하단 버튼: 제목+설명 모두 입력 시 활성 */}
        <div className="write-modal-footer">
          <ModalButton
            variant="filled"
            disabled={!isSubmittable || isSubmitting}
            width={209}
            onClick={handleSubmit}
          >
            {isSubmitting ? '생성 중…' : '파생 카드 생성하기'}
          </ModalButton>
        </div>

      </div>
    </div>
  )
}

export default WriteModal
