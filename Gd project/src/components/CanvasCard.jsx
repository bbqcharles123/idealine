import { useNavigate } from 'react-router-dom'
import './CanvasCard.css'

// 홈 화면 작업공간에서 반복 사용되는 캔버스 카드 컴포넌트
// title은 최대 2줄 (white-space: pre-line으로 줄바꿈 지원)
// cardCount는 각 도구별 파생카드 수의 합산으로 자동 계산
function CanvasCard({ id, title, expandCount, transformCount, writeCount }) {
  const navigate = useNavigate()

  // 파생 카드 총 수 = 각 도구별 생성 수의 합
  const cardCount = expandCount + transformCount + writeCount

  return (
    <div className="canvas-card" onClick={() => navigate(`/canvas/${id}`)}>

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
    </div>
  )
}

export default CanvasCard
