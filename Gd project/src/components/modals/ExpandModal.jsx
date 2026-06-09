import { useState } from 'react'
import ModalButton from './ModalButton'
import ModalOption from './ModalOption'
import ModalProgress from './ModalProgress'
import { BCC_DIRECTIONS } from '../../data/bccData'
import './WriteModal.css'
import './ExpandModal.css'

// 확장하기 모달: BCC 사고도구를 활용해 선택된 아이디어 카드에서 파생카드를 생성하는 3단계 플로우
// selectedCard: 현재 선택된 카드 데이터 (AI 연동 시 Step 2 예시 생성에 사용 예정)
// onClose: X 버튼 클릭 시 모달 닫기
// onSubmit(answer, toolName): 파생 카드 생성하기 클릭 시 호출
function ExpandModal({ selectedCard, onClose, onSubmit }) {
  // 현재 진행 단계 (1: 방향성 선택 / 2: 도구 선택 / 3: 질문 & 답변)
  const [step, setStep] = useState(1)

  // Step 1에서 선택한 방향성 인덱스 (BCC_DIRECTIONS 배열 기준)
  const [selectedDirectionIdx, setSelectedDirectionIdx] = useState(null)

  // Step 2에서 선택한 도구 인덱스 (선택된 방향성의 tools 배열 기준)
  const [selectedToolIdx, setSelectedToolIdx] = useState(null)

  // Step 3 답변 textarea 값
  const [answer, setAnswer] = useState('')

  // 현재 선택된 방향성 객체
  const currentDirection = selectedDirectionIdx !== null ? BCC_DIRECTIONS[selectedDirectionIdx] : null

  // 현재 선택된 도구 객체 (Step 3에서 도구명·질문 표시에 사용)
  const currentTool = currentDirection && selectedToolIdx !== null
    ? currentDirection.tools[selectedToolIdx]
    : null

  // 다음 단계로 이동
  const handleNext = () => setStep((s) => s + 1)

  // 이전 단계로 이동: Step 2 → 1로 돌아갈 때 Step 2 선택 초기화
  const handleBack = () => {
    if (step === 2) setSelectedToolIdx(null)
    if (step === 3) setAnswer('')
    setStep((s) => s - 1)
  }

  // 파생 카드 생성 제출: answer(답변), toolName(도구명), question(질문 텍스트) 전달
  const handleSubmit = () => {
    if (!answer.trim() || !currentTool) return
    onSubmit(answer.trim(), currentTool.name, currentTool.question)
  }

  return (
    // 오버레이: 캔버스 전체를 덮어 모달 외부 클릭을 차단
    <div className="modal-overlay">
      <div className="expand-modal">

        {/* X 닫기 버튼 */}
        <button className="modal-close-btn" onClick={onClose}>
          <img src="/close_modal.svg" width={32} height={32} alt="닫기" />
        </button>

        {/* 콘텐츠 영역: 헤더 + 진행도 + 단계별 본문 */}
        <div className="expand-modal-content">

          {/* 헤더: 모달 제목 + 부제 */}
          <div className="expand-modal-header">
            <h2 className="expand-modal-title">확장하기</h2>
            <p className="modal-subtitle">아이디어의 구조를 바꿔 새로운 가능성을 탐색합니다</p>
          </div>

          {/* 진행도 + 단계 본문 */}
          <div className="expand-modal-body">

            {/* 3단계 진행도 바 */}
            <ModalProgress
              stepLabel={['방향 선택', '도구 선택', '아이디어 발전'][step - 1]}
              totalSteps={3}
              currentStep={step}
            />

            {/* Step 1: 방향성 선택 */}
            {step === 1 && (
              <div className="expand-modal-step">
                <p className="expand-modal-question">이 아이디어를 어떻게 발전시켜 나가고 싶나요?</p>
                <div className="expand-modal-options">
                  {BCC_DIRECTIONS.map((dir, i) => (
                    <ModalOption
                      key={i}
                      text={dir.label}
                      isSelected={selectedDirectionIdx === i}
                      onClick={() => setSelectedDirectionIdx(i)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: 해당 방향성의 도구 예시 선택 */}
            {step === 2 && currentDirection && (
              <div className="expand-modal-step">
                <p className="expand-modal-question">어떤 방식이 좋을지 선택해주세요</p>
                <div className="expand-modal-options">
                  {currentDirection.tools.map((tool, i) => (
                    <ModalOption
                      key={i}
                      text={tool.example}
                      isSelected={selectedToolIdx === i}
                      onClick={() => setSelectedToolIdx(i)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: 질문 제시 + 답변 입력 */}
            {step === 3 && currentTool && (
              <div className="expand-modal-step expand-modal-step--answer">

                {/* 질문 섹션 */}
                <div className="expand-question-section">
                  {/* 헤더: 질문 라벨 + 도구 칩 (좌) / 재생성 버튼 (우) */}
                  <div className="expand-question-header">
                    <div className="expand-question-meta">
                      <span className="modal-label">질문</span>
                      {/* 선택된 BCC 도구명 칩: currentTool.icon으로 도구별 아이콘 동적 표시 */}
                      <div className="expand-tool-chip">
                        <img src={currentTool.icon} width={16} height={16} alt="" />
                        <span>{currentTool.name}</span>
                      </div>
                    </div>
                    {/* 재생성 버튼: AI API 연동 전 UI만 구현 (클릭 시 동작 없음) */}
                    <button className="expand-regenerate-btn" disabled>
                      <img src="/repeat.svg" width={18} height={18} alt="" />
                      <span>재생성</span>
                    </button>
                  </div>
                  {/* 질문 텍스트 박스 */}
                  <div className="expand-question-box">
                    <p>{currentTool.question}</p>
                  </div>
                </div>

                {/* 답변 섹션 */}
                <div className="expand-answer-section">
                  <label className="modal-label">답변</label>
                  <textarea
                    className="modal-textarea"
                    placeholder="질문에 답변을 작성해주세요"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                  />
                </div>

              </div>
            )}

          </div>
        </div>

        {/* 하단 버튼 영역 */}
        <div className="expand-modal-footer">
          {/* Step 1: 다음으로 버튼만 */}
          {step === 1 && (
            <ModalButton
              variant="filled"
              disabled={selectedDirectionIdx === null}
              width={222}
              onClick={handleNext}
            >
              다음으로
            </ModalButton>
          )}

          {/* Step 2: 이전으로 + 다음으로 */}
          {step === 2 && (
            <>
              <ModalButton variant="outline" width={222} onClick={handleBack}>
                이전으로
              </ModalButton>
              <ModalButton
                variant="filled"
                disabled={selectedToolIdx === null}
                width={222}
                onClick={handleNext}
              >
                다음으로
              </ModalButton>
            </>
          )}

          {/* Step 3: 이전으로 + 파생 카드 생성하기 */}
          {step === 3 && (
            <>
              <ModalButton variant="outline" width={222} onClick={handleBack}>
                이전으로
              </ModalButton>
              <ModalButton
                variant="filled"
                disabled={answer.trim() === ''}
                width={222}
                onClick={handleSubmit}
              >
                파생 카드 생성하기
              </ModalButton>
            </>
          )}
        </div>

      </div>
    </div>
  )
}

export default ExpandModal
