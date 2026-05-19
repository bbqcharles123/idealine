import { Handle, Position } from '@xyflow/react'
import './DerivedCard.css'

// tagType + tagName 조합으로 도구별 아이콘 경로 매핑 (chip_bcc_* / chip_errc_*)
// BCC(확장하기)와 ERRC(변형하기) 모두 '제거'라는 도구명이 있지만 아이콘이 다르므로 중첩 구조로 관리
const TAG_ICON = {
  expand: {
    '제거':      '/chip_bcc_eraser.svg',
    '대체':      '/chip_bcc_replace.svg',
    '분할·분리': '/chip_bcc_scissors.svg',
    '용도통합':  '/chip_bcc_layers.svg',
    '결합':      '/chip_bcc_combine.svg',
    '복제':      '/chip_bcc_copy.svg',
    '역전':      '/chip_bcc_reverse.svg',
    '재정의':    '/chip_bcc_refresh.svg',
    '유추':      '/chip_bcc_lightbulb.svg',
    '연결':      '/chip_bcc_link.svg',
    '속성 의존성': '/chip_bcc_branch.svg',
  },
  transform: {
    '증가': '/chip_errc_trending_up.svg',
    '감소': '/chip_errc_trending_down.svg',
    '창출': '/chip_errc_sparkles.svg',
    '제거': '/chip_errc_ban.svg',
  },
}

// tagType별 화살표 아이콘 경로 매핑 (배경색에 맞춰 색상이 다름)
const ARROW_ICON = {
  expand: '/arrow_forward_bcc.svg',
  transform: '/arrow_forward_errc.svg',
}

// 파생카드: 씨드카드 또는 다른 파생카드에서 확장/변형/직접작성으로 생성된 아이디어 카드
// React Flow nodeTypes에 'derived'로 등록되어 있음
function DerivedCard({ id, data }) {
  // tagType: 어떤 도구로 만들어진 카드인지 (expand | transform | null)
  // tagName: 구체적인 도구명 (예: '복제', '제거')
  // null이면 직접작성으로 생성된 카드 → 태그 버튼 없음
  const { title, description, isSelected, isHighlighted, onInfoClick, tagType, tagName } = data ?? {}

  return (
    <div className={`derived-card${isSelected ? ' selected' : ''}${isHighlighted ? ' highlighted' : ''}`}>

      {/* 상단 연결 핸들: 부모 카드에서 이 카드로 선이 들어오는 도착점 */}
      <Handle type="target" position={Position.Top} />

      {/* 태그 버튼: 이 카드를 만드는 데 사용된 도구를 표시
          tagType이 null이면(직접작성) 렌더링하지 않음
          nodrag 클래스로 버튼 클릭 시 카드가 드래그되지 않도록 방지 */}
      {tagType && (
        <button className={`card-tag-btn card-tag-btn--${tagType} nodrag`}>
          <img src={TAG_ICON[tagType]?.[tagName]} width={16} height={16} alt="" />
          <span className="tag-name">{tagName}</span>
          <img className="tag-arrow" src={ARROW_ICON[tagType]} width={16} height={16} alt="" />
        </button>
      )}

      {/* 정보 아이콘 버튼: 클릭 시 사이드패널 열기
          stopPropagation으로 카드 클릭 이벤트가 동시에 발생하지 않도록 차단 */}
      <button
        className="card-info-btn nodrag"
        onClick={(e) => {
          e.stopPropagation()
          onInfoClick?.(id)
        }}
      >
        <img src="/info.svg" width={24} height={24} alt="정보" />
      </button>

      {/* 카드 제목 */}
      <p className="card-title">{title}</p>

      {/* 카드 본문 */}
      <p className="card-body">{description}</p>

      {/* 하단 연결 핸들: 이 카드에서 다음 파생카드로 선이 뻗어나가는 출발점 */}
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

export default DerivedCard
