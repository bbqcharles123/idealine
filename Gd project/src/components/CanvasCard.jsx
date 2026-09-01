import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import DerivedCountBadge from './DerivedCountBadge'
import './CanvasCard.css'

// 홈 화면 작업공간에서 반복 사용되는 캔버스 카드 컴포넌트 (Figma node 2816:846)
//
// 카드가 싣는 정보는 제목과 도구별 배지 둘뿐이다.
// 예전에 있던 'n개 파생 카드 생성' 줄은 뺐다 — 바로 아래 배지들의 합이라 새 정보가
// 없고(그 줄의 값 자체가 세 개수의 덧셈이었다), 8과 9를 구분해야 하는 결정이 이
// 화면에는 없다. 규모의 대략적인 인상은 배지가 몇 개 떠 있는지로 이미 전달된다.
//
// title은 최대 2줄 (white-space: pre-line으로 줄바꿈 지원, 3줄째부터는 말줄임)
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

  // 파생 카드가 하나도 없는 캔버스인지 — 씨드카드만 만들어 두고 아직 아무 도구도
  // 쓰지 않은 상태다. 이때는 배지 세 개가 모두 스스로 렌더를 건너뛰어(개수 0)
  // 카드에 제목만 남으므로, 그 자리를 '파생 카드 없음' 배지가 대신 채운다.
  //
  // ?? 0 을 붙인 이유: 이 세 필드가 없는 오래된 문서가 오면 undefined가 되는데,
  // undefined <= 0 은 false라 배지가 '확장하기 undefined'로 그려진다.
  const expand    = expandCount ?? 0
  const transform = transformCount ?? 0
  const write     = writeCount ?? 0
  const hasNoDerived = expand + transform + write === 0

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

      {/* 제목 영역: 높이 44px(2줄) 고정.
          1줄짜리 제목이어도 상자는 44px를 유지한다 — 그래야 아래 배지 행이
          제목 줄 수와 무관하게 같은 자리에 놓여, 카드가 여러 장 늘어섰을 때
          배지들이 가로로 정렬된다. */}
      <p className="canvas-card__title">{title}</p>

      {/* 도구별 생성 개수 배지 — 개수가 0인 도구는 배지 쪽에서 스스로 렌더를 건너뛴다.
          셋 다 0이면 배지 행이 통째로 비므로 '파생 카드 없음' 하나로 대신한다. */}
      <div className="canvas-card__badges">
        {hasNoDerived ? (
          <DerivedCountBadge type="empty" />
        ) : (
          <>
            <DerivedCountBadge type="expand"    count={expand} />
            <DerivedCountBadge type="transform" count={transform} />
            <DerivedCountBadge type="write"     count={write} />
          </>
        )}
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
