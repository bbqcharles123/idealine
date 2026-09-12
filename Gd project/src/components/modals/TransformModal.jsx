import { useState, useRef } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import ModalButton from './ModalButton'
import ModalOption from './ModalOption'
import ModalProgress from './ModalProgress'
import ModalErrorNotice from './ModalErrorNotice'
import ModalErrorMessage from './ModalErrorMessage'
import GenerationProgress from './GenerationProgress'
import { ERRC_DIRECTIONS } from '../../data/transformData'
import { generateQuestion } from '../../ai/deriveCard'
import './WriteModal.css'
import './TransformModal.css'

// 변형하기 모달: ERRC 프레임워크를 활용해 선택된 아이디어 카드에서 파생카드를 생성하는 2단계 플로우
// selectedCard: 현재 선택된 카드 데이터 (AI 연동 시 Step 2 질문 생성에 사용 예정)
// onClose: X 버튼 클릭 시 모달 닫기
// onSubmit(answer, toolName, question, signal, onProgress): 파생 카드 생성하기 클릭 시 호출
//   onProgress(stage): 'content' | 'uxEval' | 'cardAdded' 완료 시 호출 — 생성 중 체크리스트 갱신용
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

  // Step 2 답변 후보: 질문과 같은 호출로 함께 받아온 문장들 (generateQuestion이 정제해 넘겨준다)
  // 답을 떠올리지 못한 사용자가 골라 쓰는 용도이고, 고르면 그대로 answer에 들어간다.
  const [answerExamples, setAnswerExamples] = useState([])

  // 답변 후보 목록이 펼쳐져 있는지.
  // 펼친 동안에는 답변 textarea를 숨기고 그 자리에 목록을 놓는다 — 둘이 동시에 있으면
  // 모달이 답변칸 높이만큼 그대로 길어진다(시안 기준 875px). 자리를 번갈아 쓰면 745px에서 멈춘다.
  const [examplesOpen, setExamplesOpen] = useState(false)

  // 질문 생성 실패 여부 — 오류 안내 UI 표시 조건
  // 오류 문구를 aiQuestion에 넣지 않고 별도 상태로 두는 이유:
  // aiQuestion은 파생카드 생성 AI의 입력이자 카드에 저장되는 '질문' 데이터라서,
  // 오류 문구를 넣으면 그 문구가 질문으로 취급돼 카드에 그대로 남는다.
  const [questionError, setQuestionError] = useState(false)

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

  // 질문이 "어떤 방향성을 기준으로" 만들어졌는지 기록하는 키
  // Step 2 진입 시 현재 선택과 비교해, 선택이 그대로면 AI를 다시 호출하지 않는다.
  // (뒤로 갔다가 같은 방향성으로 되돌아왔을 때 질문이 바뀌는 것을 방지)
  // AI 호출이 성공했을 때만 기록하므로, 실패한 경우에는 다음 진입 시 자동으로 재시도된다.
  const [questionKey, setQuestionKey] = useState(null)

  // 현재 선택된 방향성 객체 (도구 정보 포함)
  const currentDirection = selectedDirectionIdx !== null ? ERRC_DIRECTIONS[selectedDirectionIdx] : null

  // 현재 선택된 도구 객체 (Step 2에서 도구명·질문 표시에 사용)
  const currentTool = currentDirection ? currentDirection.tool : null

  // ── '예시 답변' 버튼의 상태 ── (ExpandModal과 같은 규칙 — 두 모달의 답변 섹션은 동일해야 한다)
  // examplesLocked      = 다른 작업 진행 중이라 잠시 막는 것. 왜 안 눌리는지는 화면이 이미 말하고 있어
  //                       (질문 박스의 '질문 생성 중' / GenerationProgress) 색을 바꾸지 않고 cursor만 되돌린다.
  // examplesUnavailable = 후보를 못 만들어 계속 못 누르는 것. 이유를 말해주는 것이 화면에 없으므로
  //                       버튼 자신이 색으로 말해야 한다. 기준이 2개인 이유는 후보가 하나뿐이면
  //                       '이게 정답'으로 읽혀 강요가 되기 때문이다.
  // locked를 먼저 거르는 이유: 질문 생성 중에는 후보가 아직 안 왔을 뿐인데
  // length로만 판단하면 '못 만들었다' 색이 잘못 뜬다.
  const examplesLocked = isLoadingQuestion || isSubmitting
  const examplesUnavailable = !examplesLocked && answerExamples.length < 2
  const examplesDisabled = examplesLocked || examplesUnavailable

  // 답변칸이 비어 있는 동안에만 파란 강조 (Figma node 2911:3338)
  //
  // examplesLocked를 조건에 넣지 않는 이유: 넣으면 질문 생성 대기 동안 회색이었다가
  // 질문이 뜨는 순간 파랗게 변해, "일시적 잠금은 색을 바꾸지 않는다"는 규칙을 어긴다.
  // 3단계 진입 시점부터 파란 상태로 두고, 못 누른다는 사실은 cursor만 말한다.
  // examplesUnavailable은 넣는다 — "후보가 없다"는 파란 강조(=권함)와 뜻이 충돌하기 때문이다.
  const examplesHighlighted = answer.trim() === '' && !examplesUnavailable

  // 질문 생성(호출 4): 선택된 도구 + 부모 카드 본문으로 AI 질문을 받아옴
  // Step 2 진입 시와 재생성 버튼에서 공용으로 사용
  const fetchQuestion = async () => {
    if (!currentTool) return
    setIsLoadingQuestion(true)
    // 재시도를 시작하는 순간 오류 상태를 풀어 로딩 문구가 보이게 한다
    setQuestionError(false)
    // 질문이 새로 만들어지면 후보도 새 질문의 것으로 바뀐다.
    // 목록을 펼친 채로 두면 새 질문 아래에 이전 질문의 후보가 남으므로 함께 접고 비운다.
    setExamplesOpen(false)
    setAnswerExamples([])
    try {
      const res = await generateQuestion(selectedCard?.data?.description ?? '', currentTool.name, 'transform')
      setAiQuestion(res.question)
      // 질문과 후보는 한 응답에서 함께 온다(React 자동 배칭으로 한 번에 반영되므로
      // "질문은 떴는데 후보는 아직"인 중간 상태가 없다 — 후보용 로딩 플래그가 불필요한 이유).
      // 후보가 0~1개여도 질문 생성은 성공이다 — 그 경우는 버튼이 비활성으로 처리한다.
      setAnswerExamples(res.answerExamples ?? [])
      // 성공한 경우에만 생성 기준을 기록 → 이후 같은 방향성으로 재진입하면 재생성하지 않는다
      setQuestionKey(selectedDirectionIdx)
    } catch (err) {
      console.error('질문 생성 실패:', err)
      // 질문은 비워둔 채 오류 상태만 켠다.
      // aiQuestion이 빈 문자열이어야 '파생 카드 생성하기'가 비활성 상태로 유지되어,
      // 질문 없이 카드가 만들어지는 것을 막을 수 있다.
      setAiQuestion('')
      setQuestionError(true)
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
      <div className={`transform-modal${submitError ? ' transform-modal--submit-error' : ''}`}>

        {/* 상단 그룹: 헤더 행 + 진행도/단계 본문 */}
        <div className="transform-modal-top-group">

          {/* 헤더 행: 제목+부제(좌) / X 닫기(우) */}
          <div className="transform-modal-header-row">
            <div className="transform-modal-header">
              <h2 className="transform-modal-title">변형하기</h2>
              <p className="modal-subtitle">아이디어의 요소를 조정해 더 나은 방향을 찾습니다</p>
            </div>
            <button className="transform-close-btn" onClick={handleCloseOrCancel}>
              <img src="/close_modal.svg" width={26} height={26} alt="닫기" />
            </button>
          </div>

          {/* 진행도 + 단계 본문
              생성 중엔 간격이 22px로 좁아진다 (ExpandModal과 동일, Figma node-id 2611-2157 기준) */}
          <div className={`transform-modal-body${isSubmitting ? ' transform-modal-body--generating' : ''}`}>

            {/* 2단계 진행도 바 — 생성 중엔 체크리스트가 그 역할을 대신하므로 숨긴다 */}
            {!isSubmitting && (
              <ModalProgress
                stepLabel={['방향 선택', '아이디어 발전'][step - 1]}
                totalSteps={2}
                currentStep={step}
              />
            )}

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
                    {/* 재생성 버튼: 이미 생성된 질문이 마음에 들지 않을 때 새 질문을 받는 용도.
                        오류 상태에서는 바꿀 질문 자체가 없으므로 숨기고, 복구는 오류 UI의 '다시 생성하기'이 맡는다.
                        질문 생성 중(isLoadingQuestion)일 때는 물론, 파생카드 생성 중(isSubmitting)에도 비활성화한다.
                        이미 제출한 답변으로 카드를 만드는 중이라 질문을 바꿀 이유가 없고,
                        누르면 AI 호출이 중복으로 나가며 방금 제출한 답변과 무관한 질문으로 바뀐다 */}
                    {!questionError && (
                      <button
                        className="transform-regenerate-btn"
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
                    <div className="transform-question-box">
                      <p className={isLoadingQuestion ? 'transform-question-placeholder' : undefined}>
                        {isLoadingQuestion ? '질문 생성 중' : aiQuestion}
                      </p>
                    </div>
                  )}
                </div>

                {/* 답변 섹션: 질문 생성 중(isLoadingQuestion)과 파생카드 생성 중(isSubmitting)에는 입력 비활성화
                    handleSubmit은 버튼을 누른 시점의 answer 값을 넘기므로,
                    생성 중에 고친 내용은 AI에도 카드에도 반영되지 않고 사라진다.
                    반영되지 않을 수정을 애초에 막아 사용자가 착각하지 않도록 한다 */}
                <div className="transform-answer-section">
                  {/* 라벨 행: '답변'(좌) / 예시 답변 토글(우).
                      버튼은 2단계에 들어서는 순간부터 항상 렌더한다 — 조건부로 그렸다 지우면
                      질문 생성이 끝나는 순간 버튼이 튀어나와 라벨 행이 한 번 움직인다. */}
                  <div className="transform-answer-header">
                    <label className="modal-label">답변</label>
                    <button
                      className={
                        'transform-examples-btn'
                        + (examplesHighlighted ? ' transform-examples-btn--highlight' : '')
                        + (examplesUnavailable ? ' transform-examples-btn--unavailable' : '')
                      }
                      onClick={() => setExamplesOpen((prev) => !prev)}
                      disabled={examplesDisabled}
                      aria-expanded={examplesOpen}
                    >
                      <span>예시 답변</span>
                      {/* 화살표가 다음 동작을 말한다 — 사이드패널 UxAreaAccordion과 같은 어휘.
                          absoluteStrokeWidth로 18px에서도 획 두께 2px을 유지한다 */}
                      {examplesOpen
                        ? <ChevronUp size={18} strokeWidth={2} absoluteStrokeWidth />
                        : <ChevronDown size={18} strokeWidth={2} absoluteStrokeWidth />}
                    </button>
                  </div>

                  {/* 답변칸과 후보 목록은 같은 자리를 번갈아 쓴다.
                      고르면 목록이 닫히고 그 문장이 들어간 답변칸이 돌아오므로 그 자리에서 고쳐 쓸 수 있다. */}
                  {examplesOpen ? (
                    <div className="transform-examples-list">
                      {/* 1단계와 같은 ModalOption을 쓴다. isSelected를 넘기지 않는 이유:
                          고르는 즉시 목록이 닫히므로 '선택된 채로 남아 있는' 상태가 없다. */}
                      {answerExamples.map((text, i) => (
                        <ModalOption
                          key={i}
                          text={text}
                          onClick={() => {
                            setAnswer(text)
                            setExamplesOpen(false)
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                  <textarea
                    className="modal-textarea"
                    placeholder="질문에 답변을 작성해주세요"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    disabled={isLoadingQuestion || isSubmitting}
                  />
                  )}
                </div>

              </div>
            )}

            {/* 생성 중: 2단계 체크리스트(아이디어 생성/UX 평가/카드 추가) + 취소 버튼(완료되면 완료 배지로 전환) */}
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
            아예 렌더링하지 않는다 (ExpandModal과 동일 — 비워두기만 하면 .transform-modal의 gap이 그대로 남아 하단에 빈 공간이 생긴다) */}
        {!isSubmitting && (
        <div className="transform-modal-footer">

          {/* 파생카드 생성 실패 안내: 재시도 수단은 아래 '다시 생성하기' 버튼이 맡으므로 문구만 둔다 */}
          {submitError && <ModalErrorMessage message="파생 카드를 만들지 못했어요" />}

          <div className="transform-modal-footer-buttons">
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

            {/* Step 2: 생성 중엔 취소 버튼이 GenerationProgress 안으로 옮겨갔으므로 여기선 아무것도 그리지 않는다.
                (생성 중엔 단계 이동 자체가 의미 없고, 취소 수단은 X 아이콘과 같은 handleCloseOrCancel로 충분하다)
                생성 중이 아니면 이전으로 + 파생 카드 생성하기(실패 시 빨간 '다시 생성하기'로 전환). */}
            {step === 2 && !isSubmitting && (
              <>
                <ModalButton variant="outline" width={209} onClick={handleBack}>
                  이전으로
                </ModalButton>
                {/* examplesOpen을 막는 이유: 목록이 펼쳐진 동안에는 답변칸이 화면에 없다.
                    이때 이전에 써둔 답변이 남아 있으면, 사용자는 자기가 무엇으로 카드를 만들었는지
                    보지 못한 채 생성이 진행된다. 보이지 않는 값으로는 카드를 만들지 않는다. */}
                <ModalButton
                  variant={submitError ? 'danger' : 'filled'}
                  disabled={answer.trim() === '' || isLoadingQuestion || !aiQuestion || examplesOpen}
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

export default TransformModal
