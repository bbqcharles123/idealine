import { useState, useRef } from 'react'
import ModalButton from './ModalButton'
import ModalErrorMessage from './ModalErrorMessage'
import GenerationProgress from './GenerationProgress'
import './WriteModal.css'

// 직접작성 모달: 사용자가 제목과 설명을 직접 입력해 파생카드를 생성
// onClose: X 버튼 클릭 시 모달 닫기
// onSubmit(title, description, signal, onProgress): 파생 카드 생성하기 버튼 클릭 시 카드 생성 요청
//   onProgress(stage): 'content' | 'uxEval' | 'cardAdded' 완료 시 호출 — 생성 중 체크리스트 갱신용
function WriteModal({ onClose, onSubmit }) {
  // 사용자 입력 상태
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  // 카드 생성(호출 6) 진행 중 여부 — 제출 버튼 로딩 표시
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 생성 중 대기 UI 체크리스트 진행 상태 — 도구 추천(content)/UX 평가(uxEval)/카드 추가 각 완료 여부.
  // content·uxEval은 generateWriteCard가, cardAdded는 App의 handleWriteSubmit이 알려준다.
  // (확장·변형과 달리 content·uxEval은 병렬 실행이라 서로 완료 순서가 정해져 있지 않다)
  const [genProgress, setGenProgress] = useState({ content: false, uxEval: false, cardAdded: false })

  // 카드 생성 실패 여부 — 하단에 오류 문구를 띄우고 제출 버튼을 '다시 생성하기'로 바꾼다
  // 제목·설명은 사용자가 쓴 그대로 남아 있으므로 그 자리에서 바로 재시도할 수 있다
  const [submitError, setSubmitError] = useState(false)

  // 진행 중인 카드 생성 요청의 AbortController.
  // ref로 두는 이유: X 아이콘/취소 버튼 클릭 시 렌더링을 거치지 않고 "지금 날아가고 있는 그 요청"을 바로 중단시켜야 하기 때문
  const abortControllerRef = useRef(null)

  // 제목과 설명이 모두 입력된 경우에만 생성 버튼 활성화
  const isSubmittable = title.trim() !== '' && description.trim() !== ''

  // AI 생성이 끝날 때까지 버튼 로딩 표시
  // 성공 시 부모가 모달을 닫고, 실패 시 모달을 유지한 채 하단 오류 문구로 알리고 재시도를 받는다.
  // 추천 도구 생성과 UX 평가 중 하나만 실패해도 카드를 만들지 않는다 —
  // 아이디어와 도구레이어·UX 평가가 모두 갖춰져야 완성된 카드이고,
  // 모달을 통과한 카드는 AI 데이터가 전부 채워져 있음을 보장하기 위해서다.
  const handleSubmit = async () => {
    if (!isSubmittable) return
    const controller = new AbortController()
    abortControllerRef.current = controller
    setIsSubmitting(true)
    // 재시도를 시작하는 순간 이전 오류 표시를 지운다 (다시 실패하면 catch에서 다시 켜진다)
    setSubmitError(false)
    // 재시도 시 체크리스트를 처음부터 다시 채워나가도록 초기화
    setGenProgress({ content: false, uxEval: false, cardAdded: false })
    try {
      await onSubmit(title.trim(), description.trim(), controller.signal, (stage) => {
        setGenProgress((prev) => ({ ...prev, [stage]: true }))
      })
    } catch (err) {
      // X 아이콘/취소 버튼으로 사용자가 직접 중단시킨 경우(AbortError)는 실패가 아니라 취소이므로
      // 오류 문구를 띄우지 않는다 (아래 handleCloseOrCancel이 입력 화면으로 되돌려준다)
      if (err.name !== 'AbortError') {
        console.error('직접작성 카드 생성 실패:', err)
        setSubmitError(true)
      }
    } finally {
      setIsSubmitting(false)
      abortControllerRef.current = null
    }
  }

  // X 아이콘/취소 버튼 클릭: 생성 중이면 진행 중인 AI 호출만 중단하고 입력 화면에 그대로 남긴다.
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
      <div className={`write-modal${submitError ? ' write-modal--submit-error' : ''}`}>

        {/* 상단 그룹: 헤더 행 + 입력 필드 묶음 */}
        <div className="write-modal-top-group">

          {/* 헤더 행: 제목+부제(좌) / X 닫기(우) */}
          <div className="write-modal-header-row">
            <div className="write-modal-header">
              <h2 className="write-modal-title">직접작성</h2>
              {/* '내 생각을'에서 '내'를 뺀 이유: 부제는 앱이 사용자에게 설명하는 문장이라 화자가 앱인데,
                  '내'는 사용자 시점이라 화자가 뒤섞인다. 빼면 확장·변형 부제와 구조도 완전히 같아진다
                  (셋 다 주어 없이 목적어로 시작 → "생각을 / 아이디어의 구조를 / 아이디어의 요소를") */}
              <p className="modal-subtitle">생각을 직접 입력해 새로운 아이디어 카드를 만듭니다</p>
            </div>
            <button className="write-close-btn" onClick={handleCloseOrCancel}>
              <img src="/close_modal.svg" width={26} height={26} alt="닫기" />
            </button>
          </div>

          {/* 필드 + 생성 중 진행 영역 묶음. 생성 중엔 간격이 22px로 좁아진다
              (Figma node-id 2611-2005/2611-2004, ExpandModal의 expand-modal-body와 동일 패턴) */}
          <div className={`write-modal-body${isSubmitting ? ' write-modal-body--generating' : ''}`}>

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
                  disabled={isSubmitting}
                />
              </div>

              {/* 아이디어 설명 입력 필드: 라벨(상) + 서브라벨+textarea 묶음(하) */}
              <div className="write-modal-field write-modal-field--desc">
                <label className="modal-label">아이디어 설명</label>
                <div className="write-modal-desc-body">
                  {/* 서브라벨: 무엇을 쓸지 알려주는 안내. 확장·변형에서 AI 질문이 놓이는 자리를
                      직접작성에서는 이 고정 질문이 대신한다(그 두 모달과 역할이 같다).
                      의문형인 이유: 아래 placeholder가 '…작성해주세요'로 끝나므로 명령형을 쓰면
                      같은 어미가 두 줄 연속으로 겹친다. 또 지시문은 할 일을 명령하지만 질문은
                      생각을 유도하므로, 백지에서 시작하는 이 화면의 목적에 더 맞는다.
                      네 항목(대상·불편함·해결·효익)을 조사와 어순까지 보여줘 따라 쓰면 문장이 된다 */}
                  <p className="modal-sublabel">누구를 위해, 어떤 불편함을, 어떻게 해결해서 무엇이 좋아지나요?</p>
                  {/* placeholder는 칸의 정체만 말한다. 이전에는 루틴 앱 예시 문장이 들어 있었는데,
                      주제와 무관하게 고정돼 어떤 캔버스에서 열어도 같은 예시가 떴고, 3줄을 채워
                      이미 입력된 칸처럼 보였다. 안내는 사라지지 않는 서브라벨이 전담하고,
                      여기는 ExpandModal·TransformModal의 '질문에 답변을 작성해주세요'와 같은
                      골격(X을 작성해주세요)으로 맞춘다 */}
                  <textarea
                    className="modal-textarea"
                    placeholder="아이디어 설명을 작성해주세요"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

            </div>

            {/* 생성 중: 3단계 체크리스트(도구 추천/UX 평가/카드 추가) + 취소 버튼(완료되면 완료 배지로 전환)
                도구 추천(content)과 UX 평가(uxEval)는 병렬 실행이라 서로 완료 순서와 무관하게 각자 done된다 */}
            {isSubmitting && (
              <GenerationProgress
                steps={['도구 추천', 'UX 평가', '카드 추가']}
                stepStates={[
                  genProgress.content ? 'done' : 'run',
                  genProgress.uxEval ? 'done' : 'run',
                  (genProgress.content && genProgress.uxEval)
                    ? (genProgress.cardAdded ? 'done' : 'run')
                    : 'wait',
                ]}
                allDone={genProgress.cardAdded}
                onCancel={handleCloseOrCancel}
              />
            )}

          </div>
        </div>

        {/* 하단 영역: 오류 문구(생성 실패 시) + 버튼
            생성 중엔 취소 버튼이 GenerationProgress 안에 있고 이 영역엔 그릴 게 없으므로,
            아예 렌더링하지 않는다 (ExpandModal과 동일 — 비워두기만 하면 write-modal의 gap이 그대로 남아 하단에 빈 공간이 생긴다) */}
        {!isSubmitting && (
          <div className="write-modal-footer">

            {/* 카드 생성 실패 안내: 재시도 수단은 아래 '다시 생성하기' 버튼이 맡으므로 문구만 둔다 */}
            {submitError && <ModalErrorMessage message="파생 카드를 만들지 못했어요" />}

            <ModalButton
              variant={submitError ? 'danger' : 'filled'}
              disabled={!isSubmittable}
              width={209}
              onClick={handleSubmit}
            >
              {submitError ? '다시 생성하기' : '파생 카드 생성하기'}
            </ModalButton>
          </div>
        )}

      </div>
    </div>
  )
}

export default WriteModal
