import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import './CanvasCard.css'

// 홈 화면 작업공간에서 반복 사용되는 캔버스 카드 컴포넌트
// title은 최대 2줄 (white-space: pre-line으로 줄바꿈 지원)
// cardCount는 각 도구별 파생카드 수의 합산으로 자동 계산
// locked: 생성 중(isSubmitting)일 때 true — 이동은 막되 클릭 자체는 살려두고
// 클릭 시 Figma Frame 1731 오버레이를 2초간 보여준 뒤 사라지게 한다.
// 평소 dim은 부모(HomePage)의 작업공간 전체 스크림이 담당하므로 카드 자체엔
// opacity를 걸지 않는다 — 잠금 안내가 떠 있는 동안만 카드 자체 테두리를 투명하게
// 바꿔(canvas-card--hint-active) 오버레이 자체 테두리와 겹치지 않게 한다.
function CanvasCard({ id, title, expandCount, transformCount, writeCount, locked }) {
  const navigate = useNavigate()
  const [showLockHint, setShowLockHint] = useState(false)
  const hideTimerRef = useRef(null)

  // 언마운트 시 타이머 정리
  useEffect(() => () => clearTimeout(hideTimerRef.current), [])

  // 파생 카드 총 수 = 각 도구별 생성 수의 합
  const cardCount = expandCount + transformCount + writeCount

  const handleClick = () => {
    if (locked) {
      // 이동 대신 안내를 2초간 표시 (연속 클릭 시 타이머만 재시작해 깜빡임 방지)
      setShowLockHint(true)
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = setTimeout(() => setShowLockHint(false), 2000)
      return
    }
    navigate(`/canvas/${id}`)
  }

  return (
    <div className={`canvas-card${showLockHint ? ' canvas-card--hint-active' : ''}`} onClick={handleClick}>

      {/* 제목 영역: 1~2줄, 나머지 공간 차지해서 하단 정보를 밀어내림 */}
      <p className="canvas-card__title">{title}</p>

      {/* 파생 카드 수 + 태그 배지: 카드 하단 고정 */}
      <div className="canvas-card__bottom">
        <p className="canvas-card__card-count">{cardCount}개 파생 카드 생성</p>
        <div className="canvas-card__badges">

          {/* 확장하기 배지 */}
          {expandCount > 0 && (
            <span className="canvas-card__badge canvas-card__badge--expand">
              <img src="/panel_bcc_expand.svg" width={14} height={14} alt="" />
              확장하기 {expandCount}
            </span>
          )}

          {/* 변형하기 배지 */}
          {transformCount > 0 && (
            <span className="canvas-card__badge canvas-card__badge--transform">
              <img src="/panel_errc_transform.svg" width={14} height={14} alt="" />
              변형하기 {transformCount}
            </span>
          )}

          {/* 직접작성 배지 */}
          {writeCount > 0 && (
            <span className="canvas-card__badge canvas-card__badge--write">
              <img src="/toolbar_btn_make_card.svg" width={14} height={14} alt="" />
              직접작성 {writeCount}
            </span>
          )}

        </div>
      </div>

      {/* 잠금 안내 오버레이 (Figma Frame 1731, node 2629:23102) */}
      {showLockHint && (
        <div className="canvas-card__lock-overlay">
          <Lock size={24} color="var(--color-primary)" />
          <p className="canvas-card__lock-text">생성이 끝나면 이동할 수 있어요</p>
        </div>
      )}
    </div>
  )
}

export default CanvasCard
