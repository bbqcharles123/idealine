import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './CanvasHeader.css'

// 캔버스 상단 고정 헤더: 홈 버튼 + (편집 가능한) 캔버스 제목
// position: fixed로 ReactFlow 캔버스 위에 올라와 항상 표시됨
function CanvasHeader({ title, onTitleChange }) {
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
          className={`canvas-header__title-box${isEditing ? ' canvas-header__title-box--editing' : ''}`}
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

        {/* 편집 버튼: 편집 중이 아닐 때만, 그룹 hover 시 fade-in */}
        {!isEditing && (
          <button
            className="canvas-header__edit-btn"
            onClick={startEditing}
            aria-label="제목 편집"
          >
            <img src="/header_edit.svg" width={24} height={24} alt="" />
          </button>
        )}
      </div>
    </div>
  )
}

export default CanvasHeader
