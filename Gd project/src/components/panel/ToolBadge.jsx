import './ToolBadge.css'

// 도구 유형별 헤더 아이콘·레이블 설정
const HEADER = {
  expand:    { icon: '/panel_bcc_expand.svg',     label: '확장하기' },
  transform: { icon: '/panel_errc_transform.svg', label: '변형하기' },
}

// 도구명별 태그 아이콘 경로 (기존 칩 아이콘 재사용)
const TAG_ICON = {
  expand: {
    '제거':       '/chip_bcc_eraser.svg',
    '대체':       '/chip_bcc_replace.svg',
    '분할·분리':  '/chip_bcc_scissors.svg',
    '용도통합':   '/chip_bcc_layers.svg',
    '결합':       '/chip_bcc_combine.svg',
    '복제':       '/chip_bcc_copy.svg',
    '역전':       '/chip_bcc_reverse.svg',
    '재정의':     '/chip_bcc_refresh.svg',
    '유추':       '/chip_bcc_lightbulb.svg',
    '연결':       '/chip_bcc_link.svg',
    '속성 의존성': '/chip_bcc_branch.svg',
  },
  transform: {
    '증가': '/chip_errc_trending_up.svg',
    '감소': '/chip_errc_trending_down.svg',
    '창출': '/chip_errc_sparkles.svg',
    '제거': '/chip_errc_ban.svg',
  },
}

// 사이드패널 사용 도구 배지 컴포넌트
// tagType에 따라 색상·아이콘이 달라지며, 좌측 액센트 바 + 상하 2열로 구성
function ToolBadge({ tagType, tagName }) {
  const header  = HEADER[tagType]
  const tagIcon = TAG_ICON[tagType]?.[tagName]

  return (
    <div className={`tool-badge tool-badge--${tagType}`}>

      {/* 좌측 액센트 바: 도구 유형 색상 */}
      <div className={`tool-badge__bar tool-badge__bar--${tagType}`} />

      {/* 콘텐츠 영역 */}
      <div className="tool-badge__body">

        {/* 상단: 도구 프레임워크 아이콘 + 레이블 */}
        <div className="tool-badge__header">
          <img src={header.icon} width={14} height={14} alt="" />
          <span className={`tool-badge__label tool-badge__label--${tagType}`}>
            {header.label}
          </span>
        </div>

        {/* 하단: 구체적인 도구명 pill 태그 */}
        <div className={`tool-badge__tag tool-badge__tag--${tagType}`}>
          {tagIcon && <img src={tagIcon} width={10} height={10} alt="" />}
          <span className={`tool-badge__tag-name tool-badge__tag-name--${tagType}`}>
            {tagName}
          </span>
        </div>

      </div>
    </div>
  )
}

export default ToolBadge
