import { Handle, Position } from '@xyflow/react'
import './DerivedCard.css'

// tagType별 도구 상징 아이콘 경로 매핑
// expand: BCC 사고도구(확장하기) / transform: ERRC 프레임워크(변형하기)
const TAG_ICON = {
  expand: '/tag_btn_bcc_copy.svg',
  transform: '/tag_btn_errc_ban.svg',
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
          <img src={TAG_ICON[tagType]} width={16} height={16} alt="" />
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
