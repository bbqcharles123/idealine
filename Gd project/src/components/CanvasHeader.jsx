import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LoaderCircle, TriangleAlert } from 'lucide-react'
import Tooltip from './Tooltip'
import './CanvasHeader.css'

// 저장 상태별 배지 문구 — 툴팁과 aria-label에 같은 값을 쓴다
// (마우스 사용자와 스크린리더 사용자가 같은 정보를 받아야 한다)
const SAVE_STATE_LABEL = {
  pending: '저장 중',
  failed:  '제목을 저장하지 못했어요',
}

// 캔버스 상단 고정 헤더: 홈 버튼 + (편집 가능한) 캔버스 제목
// position: fixed로 ReactFlow 캔버스 위에 올라와 항상 표시됨
//
// saveState — 제목 저장 상태. 셋 다 편집 버튼이 쓰던 40px 슬롯 하나만 채우므로
//             내용이 바뀌어도 헤더 폭이 변하지 않는다
//   'idle'    정상. 슬롯은 비어 있고, 제목 그룹에 hover할 때만 연필이 나타난다
//   'pending' 지연. 흰 원 + 회전 스피너를 상시 표시 (밑줄은 쓰지 않는다 — 잘못된 게 없다)
//   'failed'  실패. 빨강을 채운 경고 배지 + 제목 빨간 밑줄을 상시 표시
function CanvasHeader({ title, onTitleChange, saveState = 'idle' }) {
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(title)
  const inputRef = useRef(null)

  // 보이지 않는 측정 span: draft와 동일한 폰트로 텍스트 픽셀 너비를 측정
  const measureRef = useRef(null)

  // 측정된 텍스트 픽셀 너비 (draft가 바뀔 때마다 업데이트)
  const [inputWidth, setInputWidth] = useState(0)

  // draft가 바뀔 때마다 측정 span의 실제 너비를 읽어 inputWidth 갱신
  // useLayoutEffect: 브라우저 페인트 전에 너비를 확정해 타이핑 시 잔상(1프레임 어긋남) 방지
  useLayoutEffect(() => {
    if (measureRef.current) {
      setInputWidth(measureRef.current.offsetWidth)
    }
  }, [draft])

  // 편집 모드 진입 시 input에 포커스 + 기존 텍스트 전체 선택
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // 편집 중이 아닐 때 외부 title 변경 시 draft 동기화
  useEffect(() => {
    if (!isEditing) setDraft(title)
  }, [title, isEditing])

  // 편집 시작: 편집 진입 전에 측정값을 미리 읽어 첫 렌더 flash 방지
  const startEditing = () => {
    if (measureRef.current) setInputWidth(measureRef.current.offsetWidth)
    setDraft(title)
    setIsEditing(true)
  }

  const commit = () => {
    const trimmed = draft.trim()
    onTitleChange?.(trimmed || title)
    setIsEditing(false)
  }

  const cancel = () => {
    setDraft(title)
    setIsEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') commit()
    else if (e.key === 'Escape') cancel()
  }

  // 제목 박스 너비: 텍스트 픽셀 너비 + 좌우 padding 8px씩, 최대 325px
  // 최소 16px (빈 입력 시 커서 공간 확보)
  const editBoxWidth = Math.min(Math.max(inputWidth, 16) + 16, 325)

  // 배지를 띄우는 두 상태. 서로 배타적이라 슬롯을 다툴 일이 없다
  const isPending = saveState === 'pending'
  const isFailed = saveState === 'failed'
  const hasBadge = isPending || isFailed

  // 밑줄은 파랑(편집 중) / 빨강(저장 안 됨) 두 값만 갖는다.
  // 편집 중에는 지금 하는 동작을 가리키는 파랑이 우선한다
  const titleBoxState = isEditing
    ? ' canvas-header__title-box--editing'
    : isFailed
      ? ' canvas-header__title-box--failed'
      : ''

  return (
    <div className="canvas-header">
      {/* 홈 버튼: 클릭 시 홈 화면으로 이동 */}
      <button className="canvas-header__home-btn" onClick={() => navigate('/')}>
        <img src="/header_home.svg" width={24} height={24} alt="홈" />
      </button>

      {/* 보이지 않는 측정용 span: 같은 폰트로 draft 텍스트의 픽셀 너비 측정
          화면 밖 고정 위치에 두어 레이아웃에 영향 없음 */}
      <span ref={measureRef} className="canvas-header__title-measure" aria-hidden="true">
        {draft || ' '}
      </span>

      {/* 제목 그룹: 제목 박스 + hover 시 편집 버튼 */}
      <div className="canvas-header__title-group">
        {/* 제목 박스: 편집 중일 때 JS로 계산된 너비 + 파란 밑줄 적용 */}
        <div
          className={`canvas-header__title-box${titleBoxState}`}
          style={isEditing ? { width: `${editBoxWidth}px` } : undefined}
        >
          {isEditing ? (
            // 편집 모드: 너비는 title-box가 결정, input은 내부를 꽉 채움
            <input
              ref={inputRef}
              className="canvas-header__title-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={handleKeyDown}
            />
          ) : (
            // 보기 모드: 텍스트 클릭 시 편집 진입
            <p className="canvas-header__title" onClick={startEditing}>{title}</p>
          )}
        </div>

        {/* 40px 슬롯: 저장 상태에 따라 배지 또는 편집 버튼이 들어간다.
            배지는 상태를 알리기만 할 뿐 누를 수 없다 — 재시도 수단은 제목 클릭(편집)이 이미 맡고 있다.
            그래서 button이 아닌 div로 두고 cursor도 default로 유지한다.
            다만 툴팁이 마우스에만 뜨면 키보드 사용자에게 오류가 전달되지 않으므로
            tabIndex로 포커스를 받게 하고, role로 스크린리더에도 알린다. */}
        {hasBadge ? (
          <div
            className={`canvas-header__badge canvas-header__badge--${saveState}`}
            tabIndex={0}
            role={isFailed ? 'alert' : 'status'}
            aria-label={SAVE_STATE_LABEL[saveState]}
          >
            {isFailed ? (
              <TriangleAlert size={24} color="#FFFFFF" />
            ) : (
              /* 아이콘 stroke 색은 토큰을 쓰지 않는다.
                 #767676은 --color-caption과 값이 같지만 그 토큰은 '텍스트' 용도라
                 의미가 맞지 않는다 (--color-white 역시 '배경' 용도).
                 회색인 이유: 지연은 경고가 아니라 진행 중이라 색으로 무게를 주지 않는다.
                 상시 표시되는 상태이므로 진한 색이면 실패보다 눈에 띄어 위계가 뒤집힌다 */
              <LoaderCircle size={24} color="#767676" />
            )}
            {/* 헤더는 top:24px이라 위쪽에 툴팁을 놓을 공간이 없다 → 배지 아래로 띄운다 */}
            <Tooltip
              text={SAVE_STATE_LABEL[saveState]}
              placement="bottom"
              arrowPosition="center"
            />
          </div>
        ) : (
          /* 편집 버튼: 편집 중이 아닐 때만, 그룹 hover 시 fade-in */
          !isEditing && (
            <button
              className="canvas-header__edit-btn"
              onClick={startEditing}
              aria-label="제목 편집"
            >
              <img src="/header_edit.svg" width={24} height={24} alt="" />
            </button>
          )
        )}
      </div>
    </div>
  )
}

export default CanvasHeader
