import Tooltip from './Tooltip'
import './Toolbar.css'

// 각 버튼의 설정값: id, 아이콘 경로, 표시 텍스트, 연결된 activeModal 값
const TOOLBAR_BUTTONS = [
  { id: 'expand',    icon: '/toolbar_btn_expand.svg',    label: '확장하기', modal: 'expand'    },
  { id: 'transform', icon: '/toolbar_btn_change.svg',    label: '변형하기', modal: 'transform' },
  { id: 'write',     icon: '/toolbar_btn_make_card.svg', label: '직접작성', modal: 'write'     },
]

// 툴바: 카드 1개 선택 시 뷰포트 하단 중앙에 고정 표시
// activeModal: 해당 버튼이 active 상태(파란 배경)
// recTool: write 카드 도구 레이어 펼침 시 추천 버튼 하이라이트(민트 배경) + tooltip 표시
function Toolbar({ activeModal, onExpand, onTransform, onWrite, recTool }) {
  const handlers = {
    expand:    onExpand,
    transform: onTransform,
    write:     onWrite,
  }

  return (
    <div className="toolbar">
      {TOOLBAR_BUTTONS.map(({ id, icon, label, modal }) => {
        const isActive = activeModal === modal
        // active 상태가 아닐 때만 rec 상태 적용
        const isRec = !isActive && recTool === modal
        return (
          <div key={id} className="toolbar-btn-wrap">
            {/* tooltip: rec 상태인 버튼 위에만 표시.
                offset={8} — 삼각형 끝이 툴바 상단에서 4px 위에 놓이려면
                버튼 기준으로 툴바 padding-top 4px 만큼 더 띄워야 한다 (4 + 4). */}
            {isRec && (
              <Tooltip
                text="추천하는 도구"
                placement="top"
                arrowPosition="center"
                offset={8}
              />
            )}
            <button
              className={`toolbar-btn${isActive ? ' active' : ''}${isRec ? ' rec' : ''}`}
              onClick={handlers[id]}
            >
              <img src={icon} width={24} height={24} alt="" />
              <span className="toolbar-btn-label">{label}</span>
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default Toolbar
