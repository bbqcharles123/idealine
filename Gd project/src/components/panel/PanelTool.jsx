import './PanelTool.css'

// tagType별 프레임워크 상위칩 정보 (아이콘 + 라벨)
const FRAMEWORK = {
  expand:    { icon: '/panel_bcc_expand.svg',      label: '확장하기' },
  transform: { icon: '/panel_errc_transform.svg',  label: '변형하기' },
}

// tagType + tagName 조합으로 도구별 하위칩 아이콘 경로 매핑
// chip_bcc_* / chip_errc_*: 카드 태그버튼과 배경색이 동일해 같은 파일 재사용
const CHIP_ICON = {
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

// 사용 도구 칩 컴포넌트
// 상위칩(프레임워크명)과 하위칩(도구명)을 L자형 연결선으로 이어 계층 관계를 표시
function PanelTool({ tagType, tagName }) {
  const framework = FRAMEWORK[tagType]
  const toolIcon  = CHIP_ICON[tagType]?.[tagName]

  return (
    <div className="panel-tool">

      {/* 상위칩: 프레임워크 (확장하기 / 변형하기) */}
      <div className={`panel-tool__parent panel-tool__parent--${tagType}`}>
        <img src={framework.icon} width={18} height={18} alt="" />
        <span>{framework.label}</span>
      </div>

      {/* L자형 연결선: CSS border-left + border-bottom으로 구현 */}
      <div className="panel-tool__connector" />

      {/* 하위칩: 구체적인 도구명 (복제, 제거 등), 상위칩 대비 28px 오른쪽 들여쓰기 */}
      <div className={`panel-tool__child panel-tool__child--${tagType}`}>
        <img src={toolIcon} width={18} height={18} alt="" />
        <span>{tagName}</span>
      </div>

    </div>
  )
}

export default PanelTool