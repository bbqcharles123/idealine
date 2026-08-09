import { useState } from 'react'
import ModalButton from './ModalButton'
import ModalOption from './ModalOption'
import ModalProgress from './ModalProgress'
import { ERRC_DIRECTIONS } from '../../data/transformData'
import { generateQuestion } from '../../ai/deriveCard'
import './WriteModal.css'
import './TransformModal.css'

// 변형하기 모달: ERRC 프레임워크를 활용해 선택된 아이디어 카드에서 파생카드를 생성하는 2단계 플로우
// selectedCard: 현재 선택된 카드 데이터 (AI 연동 시 Step 2 질문 생성에 사용 예정)
// onClose: X 버튼 클릭 시 모달 닫기
// onSubmit(answer, toolName): 파생 카드 생성하기 클릭 시 호출
function TransformModal({ selectedCard, onClose, onSubmit }) {
  // 현재 진행 단계 (1: 방향성 선택 / 2: 질문 & 답변)
  const [step, setStep] = useState(1)

  // Step 1에서 선택한 방향성 인덱스 (ERRC_DIRECTIONS 배열 기준)
  // 방향성과 도구가 1:1 매핑이므로 이 값으로 도구도 결정됨
  const [selectedDirectionIdx, setSelectedDirectionIdx] = useState(null)

  // Step 2 답변 textarea 값
  const [answer, setAnswer] = useState('')

  // Step 2 질문: AI가 생성한 질문 텍스트와 로딩 상태
  const [aiQuestion, setAiQuestion] = useState('')
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false)

  // 파생카드 생성(호출 5) 진행 중 여부 — 제출 버튼 로딩 표시
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 질문이 "어떤 방향성을 기준으로" 만들어졌는지 기록하는 키
  // Step 2 진입 시 현재 선택과 비교해, 선택이 그대로면 AI를 다시 호출하지 않는다.
  // (뒤로 갔다가 같은 방향성으로 되돌아왔을 때 질문이 바뀌는 것을 방지)
  // AI 호출이 성공했을 때만 기록하므로, 실패한 경우에는 다음 진입 시 자동으로 재시도된다.
  const [questionKey, setQuestionKey] = useState(null)

  // 현재 선택된 방향성 객체 (도구 정보 포함)
  const currentDirection = selectedDirectionIdx !== null ? ERRC_DIRECTIONS[selectedDirectionIdx] : null

  // 현재 선택된 도구 객체 (Step 2에서 도구명·질문 표시에 사용)
  const currentTool = currentDirection ? currentDirection.tool : null

  // 질문 생성(호출 4): 선택된 도구 + 부모 카드 본문으로 AI 질문을 받아옴
  // Step 2 진입 시와 재생성 버튼에서 공용으로 사용
  const fetchQuestion = async () => {
    if (!currentTool) return
    setIsLoadingQuestion(true)
    try {
      const res = await generateQuestion(selectedCard?.data?.description ?? '', currentTool.name, 'transform')
      setAiQuestion(res.question)
      // 성공한 경우에만 생성 기준을 기록 → 이후 같은 방향성으로 재진입하면 재생성하지 않는다
      setQuestionKey(selectedDirectionIdx)
    } catch (err) {
      console.error('질문 생성 실패:', err)
      setAiQuestion('질문 생성에 실패했습니다. 재생성을 눌러주세요.')
      // 실패 시 기준을 비워, 다음에 2단계로 들어올 때 다시 시도하도록 한다
      setQuestionKey(null)
    } finally {
      setIsLoadingQuestion(false)
    }
  }

  // Step 1 → 2로 이동
  // 방향성이 직전 질문의 생성 기준과 같으면 기존 질문을 그대로 재사용하고,
  // 달라졌을 때만 질문을 새로 생성한다 (질문이 바뀌면 이전 답변도 함께 비움)
  const handleNext = () => {
    setStep(2)
    if (questionKey !== selectedDirectionIdx) {
      setAnswer('')
      setAiQuestion('')
      fetchQuestion()
    }
  }

  // Step 2 → 1로 이동: 답변·질문을 지우지 않고 단계만 되돌린다
  // (지우지 않아야 같은 방향성으로 되돌아왔을 때 기존 질문·답변을 그대로 이어서 쓸 수 있음)
  const handleBack = () => {
    setStep(1)
  }

  // 파생 카드 생성 제출: AI 생성(호출 5)이 끝날 때까지 버튼 로딩 표시
  // 성공 시 부모(App)가 모달을 닫음, 실패 시 모달 유지하고 버튼 복구
  const handleSubmit = async () => {
    if (!answer.trim() || !currentTool || !aiQuestion) return
    setIsSubmitting(true)
    try {
      await onSubmit(answer.trim(), currentTool.name, aiQuestion)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    // 오버레이: 캔버스 전체를 덮어 모달 외부 클릭을 차단
    <div className="modal-overlay">
      <div className="transform-modal">

        {/* 상단 그룹: 헤더 행 + 진행도/단계 본문 */}
        <div className="transform-modal-top-group">

          {/* 헤더 행: 제목+부제(좌) / X 닫기(우) */}
          <div className="transform-modal-header-row">
            <div className="transform-modal-header">
              <h2 className="transform-modal-title">변형하기</h2>
              <p className="modal-subtitle">아이디어의 요소를 조정해 더 나은 방향을 찾습니다</p>
            </div>
            <button className="transform-close-btn" onClick={onClose}>
              <img src="/close_modal.svg" width={26} height={26} alt="닫기" />
            </button>
          </div>

          {/* 진행도 + 단계 본문 */}
          <div className="transform-modal-body">

            {/* 2단계 진행도 바 */}
            <ModalProgress
              stepLabel={['방향 선택', '아이디어 발전'][step - 1]}
              totalSteps={2}
              currentStep={step}
            />

            {/* Step 1: 방향성 선택 (= 도구 결정) */}
            {step === 1 && (
              <div className="transform-modal-step">
                <p className="transform-modal-question">이 아이디어를 어떻게 발전시켜 나가고 싶나요?</p>
                <div className="transform-modal-options">
                  {ERRC_DIRECTIONS.map((dir, i) => (
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

            {/* Step 2: 질문 제시 + 답변 입력 */}
            {step === 2 && currentTool && (
              <div className="transform-modal-step transform-modal-step--answer">

                {/* 질문 섹션 */}
                <div className="transform-question-section">
                  {/* 헤더: 질문 라벨 + 도구 칩 (좌) / 재생성 버튼 (우) */}
                  <div className="transform-question-header">
                    <div className="transform-question-meta">
                      <span className="modal-label">질문</span>
                      {/* 선택된 ERRC 도구명 칩: currentTool.icon으로 도구별 아이콘 동적 표시 */}
                      <div className="transform-tool-chip">
                        <img src={currentTool.icon} width={16} height={16} alt="" />
                        <span>{currentTool.name}</span>
                      </div>
                    </div>
                    {/* 재생성 버튼: 같은 도구로 질문을 다시 생성 (로딩 중 비활성화) */}
                    <button className="transform-regenerate-btn" onClick={fetchQuestion} disabled={isLoadingQuestion}>
                      <img src="/repeat.svg" width={18} height={18} alt="" />
                      <span>재생성</span>
                    </button>
                  </div>
                  {/* 질문 텍스트 박스: 생성 중에는 로딩 문구, 완료되면 AI 질문 표시 */}
                  <div className="transform-question-box">
                    <p>{isLoadingQuestion ? '질문 생성 중…' : aiQuestion}</p>
                  </div>
                </div>

                {/* 답변 섹션: 질문 생성 중에는 입력 비활성화 */}
                <div className="transform-answer-section">
                  <label className="modal-label">답변</label>
                  <textarea
                    className="modal-textarea"
                    placeholder="질문에 답변을 작성해주세요"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    disabled={isLoadingQuestion}
                  />
                </div>

              </div>
            )}

          </div>
        </div>

        {/* 하단 버튼 영역 */}
        <div className="transform-modal-footer">
          {/* Step 1: 다음으로 버튼만 */}
          {step === 1 && (
            <ModalButton
              variant="filled"
              disabled={selectedDirectionIdx === null}
              width={209}
              onClick={handleNext}
            >
              다음으로
            </ModalButton>
          )}

          {/* Step 2: 이전으로 + 파생 카드 생성하기 */}
          {step === 2 && (
            <>
              <ModalButton variant="outline" width={209} onClick={handleBack} disabled={isSubmitting}>
                이전으로
              </ModalButton>
              <ModalButton
                variant="filled"
                disabled={answer.trim() === '' || isLoadingQuestion || !aiQuestion || isSubmitting}
                width={209}
                onClick={handleSubmit}
              >
                {isSubmitting ? '생성 중…' : '파생 카드 생성하기'}
              </ModalButton>
            </>
          )}
        </div>

      </div>
    </div>
  )
}

export default TransformModal
