import { useState, useRef } from 'react'
import ModalButton from './ModalButton'
import ModalOption from './ModalOption'
import ModalProgress from './ModalProgress'
import ModalSkeleton from './ModalSkeleton'
import ModalErrorNotice from './ModalErrorNotice'
import ModalErrorMessage from './ModalErrorMessage'
import GenerationProgress from './GenerationProgress'
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

  // 질문 생성 실패 여부 — 오류 안내 UI 표시 조건
  // 오류 문구를 aiQuestion에 넣지 않고 별도 상태로 두는 이유:
  // aiQuestion은 파생카드 생성 AI의 입력이자 카드에 저장되는 '질문' 데이터라서,
  // 오류 문구를 넣으면 그 문구가 질문으로 취급돼 카드에 그대로 남는다.
  const [questionError, setQuestionError] = useState(false)

  // Step 2 도구 예시: AI가 생성한 [{name, example}] 배열과 로딩 상태
  const [toolExamples, setToolExamples] = useState([])
  const [isLoadingExamples, setIsLoadingExamples] = useState(false)
  // 예시 생성 실패 여부 — 선택지 자리를 오류 안내 UI로 바꾸고 '다음으로'를 막는다
  const [examplesError, setExamplesError] = useState(false)

  // 파생카드 생성(호출 5) 진행 중 여부 — 제출 버튼 로딩 표시
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 생성 중 대기 UI 체크리스트 진행 상태 — 아이디어 생성(호출 A)/UX 평가(호출 B)/카드 추가 각 완료 여부.
  // content·uxEval은 generateDerivedCard가, cardAdded는 App의 createDerivedCard가 알려준다.
  const [genProgress, setGenProgress] = useState({ content: false, uxEval: false, cardAdded: false })

  // 파생카드 생성 실패 여부 — 하단에 오류 문구를 띄우고 제출 버튼을 '다시 생성하기'로 바꾼다
  // 실패해도 모달을 닫지 않으므로 사용자가 쓴 답변은 그대로 남아 바로 재시도할 수 있다
  const [submitError, setSubmitError] = useState(false)

  // 진행 중인 파생카드 생성 요청의 AbortController.
  // ref로 두는 이유: X 아이콘 클릭 시 렌더링을 거치지 않고 "지금 날아가고 있는 그 요청"을 바로 중단시켜야 하기 때문
  const abortControllerRef = useRef(null)

  // 생성 결과가 "어떤 선택을 기준으로" 만들어졌는지 기록하는 키
  // 앞으로 이동할 때 현재 선택과 비교해, 선택이 그대로면 AI를 다시 호출하지 않는다.
  // (뒤로 갔다가 같은 선택으로 되돌아왔을 때 예시·질문이 바뀌는 것을 방지)
  // AI 호출이 성공했을 때만 기록하므로, 실패한 경우에는 다음 진입 시 자동으로 재시도된다.
  const [examplesKey, setExamplesKey] = useState(null)  // 예시 생성 기준: 방향성 인덱스
  const [questionKey, setQuestionKey] = useState(null)  // 질문 생성 기준: '방향성-도구' 인덱스

  // 현재 선택 기준으로 만든 질문 키 (도구 인덱스는 방향성마다 의미가 달라 방향성과 함께 묶는다)
  const currentQuestionKey = `${selectedDirectionIdx}-${selectedToolIdx}`

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
    // 재시도를 시작하는 순간 오류 상태를 풀어 스켈레톤이 보이게 한다
    setExamplesError(false)
    try {
      const examples = await generateToolExamples(selectedCard?.data?.description ?? '', {
        label: currentDirection.label,
        toolNames: currentDirection.tools.map((t) => t.name),
      })
      setToolExamples(examples)
      // 성공한 경우에만 생성 기준을 기록 → 이후 같은 방향성으로 재진입하면 재생성하지 않는다
      setExamplesKey(selectedDirectionIdx)
    } catch (err) {
      console.error('예시 생성 실패:', err)
      // 선택지는 비워둔 채 오류 상태만 켠다.
      // 예시가 하나라도 비면 generateToolExamples가 통신 실패와 동일하게 throw하므로,
      // '일부만 채워진 선택지'가 화면에 나오는 경우는 없다.
      setToolExamples([])
      setExamplesError(true)
      // 이전 단계에서 고른 도구가 남아 있으면 예시 없이 3단계로 넘어갈 수 있어 함께 비운다
      setSelectedToolIdx(null)
      // 실패 시 기준을 비워, 다음에 2단계로 들어올 때 다시 시도하도록 한다
      setExamplesKey(null)
    } finally {
      setIsLoadingExamples(false)
    }
  }

  // 질문 생성(호출 3): 선택된 도구 + 부모 카드 본문으로 AI 질문을 받아옴
  // Step 3 진입 시와 재생성 버튼에서 공용으로 사용
  const fetchQuestion = async () => {
    if (!currentTool) return
    setIsLoadingQuestion(true)
    // 재시도를 시작하는 순간 오류 상태를 풀어 로딩 문구가 보이게 한다
    setQuestionError(false)
    try {
      // 2단계에서 선택한 도구의 예시를 함께 전달 → 질문이 그 적용 방향을 이어받음
      const selectedExample = toolExamples.find((e) => e.name === currentTool.name)?.example ?? ''
      const res = await generateQuestion(selectedCard?.data?.description ?? '', currentTool.name, 'expand', selectedExample)
      setAiQuestion(res.question)
      // 성공한 경우에만 생성 기준을 기록 → 이후 같은 도구로 재진입하면 재생성하지 않는다
      setQuestionKey(currentQuestionKey)
    } catch (err) {
      console.error('질문 생성 실패:', err)
      // 질문은 비워둔 채 오류 상태만 켠다.
      // aiQuestion이 빈 문자열이어야 '파생 카드 생성하기'가 비활성 상태로 유지되어,
      // 질문 없이 카드가 만들어지는 것을 막을 수 있다.
      setAiQuestion('')
      setQuestionError(true)
      // 실패 시 기준을 비워, 다음에 3단계로 들어올 때 다시 시도하도록 한다
      setQuestionKey(null)
    } finally {
      setIsLoadingQuestion(false)
    }
  }

  // 다음 단계로 이동
  // 선택이 직전 생성 기준과 같으면 기존 결과를 그대로 재사용하고, 달라졌을 때만 AI를 다시 호출한다.
  const handleNext = () => {
    const next = step + 1
    setStep(next)

    // Step 1 → 2: 방향성이 바뀐 경우에만 도구 예시를 새로 생성
    if (next === 2 && examplesKey !== selectedDirectionIdx) {
      setToolExamples([])
      fetchExamples()
    }

    // Step 2 → 3: 도구 선택이 바뀐 경우에만 질문을 새로 생성
    // 질문이 바뀌면 이전 답변은 다른 질문에 대한 답이 되므로 함께 비운다
    if (next === 3 && questionKey !== currentQuestionKey) {
      setAnswer('')
      setAiQuestion('')
      fetchQuestion()
    }
  }

  // 이전 단계로 이동: 선택·생성 결과를 지우지 않고 단계만 되돌린다
  // (지우지 않아야 같은 선택으로 되돌아왔을 때 기존 예시·질문·답변을 그대로 이어서 쓸 수 있음)
  const handleBack = () => {
    setStep((s) => s - 1)
  }

  // 파생 카드 생성 제출: AI 생성(호출 5)이 끝날 때까지 버튼 로딩 표시
  // 성공 시 부모(App)가 모달을 닫음, 실패 시 모달을 유지한 채 하단 오류 문구로 알리고 재시도를 받는다
  const handleSubmit = async () => {
    if (!answer.trim() || !currentTool || !aiQuestion) return
    const controller = new AbortController()
    abortControllerRef.current = controller
    setIsSubmitting(true)
    // 재시도를 시작하는 순간 이전 오류 표시를 지운다 (다시 실패하면 catch에서 다시 켜진다)
    setSubmitError(false)
    // 재시도 시 체크리스트를 처음부터 다시 채워나가도록 초기화
    setGenProgress({ content: false, uxEval: false, cardAdded: false })
    try {
      await onSubmit(answer.trim(), currentTool.name, aiQuestion, controller.signal, (stage) => {
        setGenProgress((prev) => ({ ...prev, [stage]: true }))
      })
    } catch (err) {
      // X 아이콘으로 사용자가 직접 중단시킨 경우(AbortError)는 실패가 아니라 취소이므로
      // 오류 문구를 띄우지 않는다 (아래 handleCloseOrCancel이 답변 화면으로 되돌려준다)
      if (err.name !== 'AbortError') {
        console.error('파생 카드 생성 실패:', err)
        setSubmitError(true)
      }
    } finally {
      setIsSubmitting(false)
      abortControllerRef.current = null
    }
  }

  // X 아이콘 클릭: 생성 중이면 진행 중인 AI 호출만 중단하고 질문-답변 화면에 그대로 남긴다.
  // (모달을 닫아버리면 요청이 배경에서 계속 진행되다 뒤늦게 카드가 생기는 문제가 있었음)
  // 생성 중이 아니면 기존과 동일하게 모달을 닫는다.
  const handleCloseOrCancel = () => {
    if (isSubmitting) {
      abortControllerRef.current?.abort()
    } else {
      onClose()
    }
  }

  return (
    // 오버레이: 캔버스 전체를 덮어 모달 외부 클릭을 차단
    <div className="modal-overlay">
      {/* 생성 실패 시에는 본문과 하단 사이 간격을 줄여, 오류 문구가 늘린 만큼을 상쇄한다 */}
      <div className={`expand-modal${submitError ? ' expand-modal--submit-error' : ''}`}>

        {/* 상단 그룹: 헤더 행 + 진행도/단계 본문 */}
        <div className="expand-modal-top-group">

          {/* 헤더 행: 제목+부제(좌) / X 닫기(우) */}
          <div className="expand-modal-header-row">
            <div className="expand-modal-header">
              <h2 className="expand-modal-title">확장하기</h2>
              <p className="modal-subtitle">아이디어의 구조를 바꿔 새로운 가능성을 탐색합니다</p>
            </div>
            <button className="expand-close-btn" onClick={handleCloseOrCancel}>
              <img src="/close_modal.svg" width={26} height={26} alt="닫기" />
            </button>
          </div>

          {/* 진행도 + 단계 본문
              생성 중엔 간격이 22px로 좁아진다 (Figma Frame 1697/1710, node-id 2582-2473 기준) */}
          <div className={`expand-modal-body${isSubmitting ? ' expand-modal-body--generating' : ''}`}>

            {/* 3단계 진행도 바 — 생성 중엔 체크리스트가 그 역할을 대신하므로 숨긴다 */}
            {!isSubmitting && (
              <ModalProgress
                stepLabel={['방향 선택', '도구 선택', '아이디어 발전'][step - 1]}
                totalSteps={3}
                currentStep={step}
              />
            )}

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
                      onClick={() => {
                        // 방향성이 바뀌면 도구 목록 자체가 달라지므로 이전 도구 선택을 해제
                        // (같은 인덱스가 다른 도구를 가리켜 선택이 잘못 유지되는 것을 방지)
                        if (i !== selectedDirectionIdx) setSelectedToolIdx(null)
                        setSelectedDirectionIdx(i)
                      }}
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
                    // 스켈레톤 개수는 방향성마다 도구 수가 다르므로 실제 선택지 개수에 맞춰 넘긴다
                    <ModalSkeleton count={currentDirection.tools.length} />
                  ) : examplesError ? (
                    // 실패했을 때는 선택지 목록 전체를 오류 안내 UI로 교체한다
                    <ModalErrorNotice
                      variant="panel"
                      message="선택지를 만들지 못했어요"
                      onRetry={fetchExamples}
                    />
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
                    {/* 재생성 버튼: 이미 생성된 질문이 마음에 들지 않을 때 새 질문을 받는 용도.
                        오류 상태에서는 바꿀 질문 자체가 없으므로 숨기고, 복구는 오류 UI의 '다시 생성'이 맡는다.
                        질문 생성 중(isLoadingQuestion)일 때는 물론, 파생카드 생성 중(isSubmitting)에도 비활성화한다.
                        이미 제출한 답변으로 카드를 만드는 중이라 질문을 바꿀 이유가 없고,
                        누르면 AI 호출이 중복으로 나가며 방금 제출한 답변과 무관한 질문으로 바뀐다 */}
                    {!questionError && (
                      <button
                        className="expand-regenerate-btn"
                        onClick={fetchQuestion}
                        disabled={isLoadingQuestion || isSubmitting}
                      >
                        <img src="/repeat.svg" width={18} height={18} alt="" />
                        <span>재생성</span>
                      </button>
                    )}
                  </div>
                  {/* 실패했을 때는 질문 박스 대신 오류 안내 UI로 교체한다.
                      생성 중에는 로딩 문구, 완료되면 AI 질문 표시.
                      로딩 문구는 실제 질문과 같은 크기·굵기를 쓰되 색만 낮춰 임시 문구임을 구분한다 */}
                  {questionError ? (
                    <ModalErrorNotice
                      variant="bar"
                      message="질문을 만들지 못했어요"
                      onRetry={fetchQuestion}
                    />
                  ) : (
                    <div className="expand-question-box">
                      <p className={isLoadingQuestion ? 'expand-question-placeholder' : undefined}>
                        {isLoadingQuestion ? '질문 생성 중' : aiQuestion}
                      </p>
                    </div>
                  )}
                </div>

                {/* 답변 섹션: 질문 생성 중(isLoadingQuestion)과 파생카드 생성 중(isSubmitting)에는 입력 비활성화
                    handleSubmit은 버튼을 누른 시점의 answer 값을 넘기므로,
                    생성 중에 고친 내용은 AI에도 카드에도 반영되지 않고 사라진다.
                    반영되지 않을 수정을 애초에 막아 사용자가 착각하지 않도록 한다 */}
                <div className="expand-answer-section">
                  <label className="modal-label">답변</label>
                  <textarea
                    className="modal-textarea"
                    placeholder="질문에 답변을 작성해주세요"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    disabled={isLoadingQuestion || isSubmitting}
                  />
                </div>

              </div>
            )}

            {/* 생성 중: 3단계 체크리스트 + 취소 버튼(완료되면 완료 배지로 전환) */}
            {isSubmitting && (
              <GenerationProgress
                stepStates={[
                  genProgress.content ? 'done' : 'run',
                  genProgress.content ? (genProgress.uxEval ? 'done' : 'run') : 'wait',
                  genProgress.uxEval ? (genProgress.cardAdded ? 'done' : 'run') : 'wait',
                ]}
                allDone={genProgress.cardAdded}
                onCancel={handleCloseOrCancel}
              />
            )}

          </div>
        </div>

        {/* 하단 영역: 오류 문구(생성 실패 시) + 버튼 행
            생성 중엔 취소 버튼이 GenerationProgress 안에 있고 이 영역엔 그릴 게 없으므로,
            아예 렌더링하지 않는다 — 비워두기만 하면 .expand-modal의 52px gap이 그대로 남아 하단에 빈 공간이 생긴다 */}
        {!isSubmitting && (
        <div className="expand-modal-footer">

          {/* 파생카드 생성 실패 안내: 재시도 수단은 아래 '다시 생성하기' 버튼이 맡으므로 문구만 둔다 */}
          {submitError && <ModalErrorMessage message="파생 카드를 만들지 못했어요" />}

          <div className="expand-modal-footer-buttons">
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
                  disabled={selectedToolIdx === null || isLoadingExamples || examplesError}
                  width={209}
                  onClick={handleNext}
                >
                  다음으로
                </ModalButton>
              </>
            )}

            {/* Step 3: 생성 중엔 취소 버튼이 GenerationProgress 안으로 옮겨갔으므로 여기선 아무것도 그리지 않는다.
                (생성 중엔 단계 이동 자체가 의미 없고, 취소 수단은 X 아이콘과 같은 handleCloseOrCancel로 충분하다)
                생성 중이 아니면 이전으로 + 파생 카드 생성하기(실패 시 빨간 '다시 생성하기'로 전환). */}
            {step === 3 && !isSubmitting && (
              <>
                <ModalButton variant="outline" width={209} onClick={handleBack}>
                  이전으로
                </ModalButton>
                <ModalButton
                  variant={submitError ? 'danger' : 'filled'}
                  disabled={answer.trim() === '' || isLoadingQuestion || !aiQuestion}
                  width={209}
                  onClick={handleSubmit}
                >
                  {submitError ? '다시 생성하기' : '파생 카드 생성하기'}
                </ModalButton>
              </>
            )}
          </div>
        </div>
        )}

      </div>
    </div>
  )
}

export default ExpandModal
