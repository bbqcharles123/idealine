import './Toolbar.css'

// 각 버튼의 설정값: id, 아이콘 경로, 표시 텍스트, 연결된 activeModal 값
const TOOLBAR_BUTTONS = [
  { id: 'expand',    icon: '/toolbar_btn_expand.svg',    label: '확장하기', modal: 'expand'    },
  { id: 'transform', icon: '/toolbar_btn_change.svg',    label: '변형하기', modal: 'transform' },
  { id: 'write',     icon: '/toolbar_btn_make_card.svg', label: '직접작성', modal: 'write'     },
]

// 툴바: 카드 1개 선택 시 뷰포트 하단 중앙에 고정 표시
// activeModal 값에 따라 해당 버튼이 active 상태(파란 배경)로 표시됨
function Toolbar({ activeModal, onExpand, onTransform, onWrite, onAddToCollection }) {
  // 버튼 id → 클릭 핸들러 매핑
  const handlers = {
    expand:    onExpand,
    transform: onTransform,
    write:     onWrite,
  }

  return (
    <div className="toolbar">
      {/* 메인 버튼 3개: 확장하기 / 변형하기 / 직접작성 */}
      <div className="toolbar-main">
        {TOOLBAR_BUTTONS.map(({ id, icon, label, modal }) => (
          <button
            key={id}
            className={`toolbar-btn${activeModal === modal ? ' active' : ''}`}
            onClick={handlers[id]}
          >
            <img src={icon} width={24} height={24} alt="" />
            <span className="toolbar-btn-label">{label}</span>
          </button>
        ))}
      </div>

      {/* 구분선 */}
      <div className="toolbar-divider" />

      {/* 모음추가 버튼: 아이콘만 표시, hover 시 툴팁 */}
      <div className="toolbar-collection-wrapper">
        <button
          className="toolbar-btn toolbar-btn--icon-only"
          onClick={onAddToCollection}
        >
          <img src="/toolbar_btn_add list.svg" width={24} height={24} alt="" />
        </button>
        <span className="toolbar-tooltip">모음추가</span>
      </div>
    </div>
  )
}

export default Toolbar
