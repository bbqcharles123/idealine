import { useState } from 'react'
import ModalButton from './ModalButton'
import ModalOption from './ModalOption'
import ModalProgress from './ModalProgress'
import { BCC_DIRECTIONS } from '../../data/bccData'
import { generateQuestion, generateToolExamples } from '../../ai/deriveCard'
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

  // Step 3 질문: AI가 생성한 질문 텍스트와 로딩 상태
  const [aiQuestion, setAiQuestion] = useState('')
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false)

  // Step 2 도구 예시: AI가 생성한 [{name, example}] 배열과 로딩 상태
  const [toolExamples, setToolExamples] = useState([])
  const [isLoadingExamples, setIsLoadingExamples] = useState(false)

  // 파생카드 생성(호출 5) 진행 중 여부 — 제출 버튼 로딩 표시
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 현재 선택된 방향성 객체
  const currentDirection = selectedDirectionIdx !== null ? BCC_DIRECTIONS[selectedDirectionIdx] : null

  // 현재 선택된 도구 객체 (Step 3에서 도구명·질문 표시에 사용)
  const currentTool = currentDirection && selectedToolIdx !== null
    ? currentDirection.tools[selectedToolIdx]
    : null

  // 도구 예시 생성(호출 2): 선택된 방향성의 도구들에 대해 아이디어 적용 예시를 받아옴
  // Step 2 진입 시 호출
  const fetchExamples = async () => {
    if (!currentDirection) return
    setIsLoadingExamples(true)
    try {
      const examples = await generateToolExamples(selectedCard?.data?.description ?? '', {
        label: currentDirection.label,
        toolNames: currentDirection.tools.map((t) => t.name),
      })
      setToolExamples(examples)
    } catch (err) {
      console.error('예시 생성 실패:', err)
      setToolExamples([])
    } finally {
      setIsLoadingExamples(false)
    }
  }

  // 질문 생성(호출 3): 선택된 도구 + 부모 카드 본문으로 AI 질문을 받아옴
  // Step 3 진입 시와 재생성 버튼에서 공용으로 사용
  const fetchQuestion = async () => {
    if (!currentTool) return
    setIsLoadingQuestion(true)
    try {
      // 2단계에서 선택한 도구의 예시를 함께 전달 → 질문이 그 적용 방향을 이어받음
      const selectedExample = toolExamples.find((e) => e.name === currentTool.name)?.example ?? ''
      const res = await generateQuestion(selectedCard?.data?.description ?? '', currentTool.name, 'expand', selectedExample)
      setAiQuestion(res.question)
    } catch (err) {
      console.error('질문 생성 실패:', err)
      setAiQuestion('질문 생성에 실패했습니다. 재생성을 눌러주세요.')
    } finally {
      setIsLoadingQuestion(false)
    }
  }

  // 다음 단계로 이동: Step 1 → 2 진입 시 예시 생성, Step 2 → 3 진입 시 질문 생성
  const handleNext = () => {
    const next = step + 1
    setStep(next)
    if (next === 2) fetchExamples()
    if (next === 3) fetchQuestion()
  }

  // 이전 단계로 이동: Step 2 → 1로 돌아갈 때 도구 선택·생성된 예시 초기화
  // Step 3 → 2로 돌아갈 때 답변·생성된 질문 초기화
  const handleBack = () => {
    if (step === 2) {
      setSelectedToolIdx(null)
      setToolExamples([])
    }
    if (step === 3) {
      setAnswer('')
      setAiQuestion('')
    }
    setStep((s) => s - 1)
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
      <div className="expand-modal">

        {/* 상단 그룹: 헤더 행 + 진행도/단계 본문 */}
        <div className="expand-modal-top-group">

          {/* 헤더 행: 제목+부제(좌) / X 닫기(우) */}
          <div className="expand-modal-header-row">
            <div className="expand-modal-header">
              <h2 className="expand-modal-title">확장하기</h2>
              <p className="modal-subtitle">아이디어의 구조를 바꿔 새로운 가능성을 탐색합니다</p>
            </div>
            <button className="expand-close-btn" onClick={onClose}>
              <img src="/close_modal.svg" width={26} height={26} alt="닫기" />
            </button>
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

            {/* Step 2: 해당 방향성의 도구 예시 선택 (예시는 AI 생성) */}
            {step === 2 && currentDirection && (
              <div className="expand-modal-step">
                <p className="expand-modal-question">어떤 방식이 좋을지 선택해주세요</p>
                <div className="expand-modal-options">
                  {isLoadingExamples ? (
                    <p className="expand-modal-loading">예시 생성 중…</p>
                  ) : (
                    currentDirection.tools.map((tool, i) => (
                      <ModalOption
                        key={i}
                        // 도구명(고정)에 맞는 AI 예시를 찾아 표시, 없으면 빈 문자열
                        text={toolExamples.find((e) => e.name === tool.name)?.example ?? ''}
                        isSelected={selectedToolIdx === i}
                        onClick={() => setSelectedToolIdx(i)}
                      />
                    ))
                  )}
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
                    {/* 재생성 버튼: 같은 도구로 질문을 다시 생성 (로딩 중 비활성화) */}
                    <button className="expand-regenerate-btn" onClick={fetchQuestion} disabled={isLoadingQuestion}>
                      <img src="/repeat.svg" width={18} height={18} alt="" />
                      <span>재생성</span>
                    </button>
                  </div>
                  {/* 질문 텍스트 박스: 생성 중에는 로딩 문구, 완료되면 AI 질문 표시 */}
                  <div className="expand-question-box">
                    <p>{isLoadingQuestion ? '질문 생성 중…' : aiQuestion}</p>
                  </div>
                </div>

                {/* 답변 섹션: 질문 생성 중에는 입력 비활성화 */}
                <div className="expand-answer-section">
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
        <div className="expand-modal-footer">
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

          {/* Step 2: 이전으로 + 다음으로 */}
          {step === 2 && (
            <>
              <ModalButton variant="outline" width={209} onClick={handleBack}>
                이전으로
              </ModalButton>
              <ModalButton
                variant="filled"
                disabled={selectedToolIdx === null || isLoadingExamples}
                width={209}
                onClick={handleNext}
              >
                다음으로
              </ModalButton>
            </>
          )}

          {/* Step 3: 이전으로 + 파생 카드 생성하기 */}
          {step === 3 && (
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

export default ExpandModal
