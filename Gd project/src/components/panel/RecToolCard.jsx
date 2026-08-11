import './RecToolCard.css'

// 도구 유형별 색상·아이콘·레이블·설명 설정 (설명은 고정 문구)
// color는 테두리·액센트 바 배경·레이블 글자 세 곳에 함께 쓰인다.
// --color-expand-text / --color-transform-text와 값이 같지만 그 토큰은 '텍스트 색'이라
// 테두리·배경 용도까지 포괄하지 않으므로 토큰을 쓰지 않고 값으로 둔다.
const TOOL_CONFIG = {
  expand: {
    color: '#2E7D32',
    icon:  '/panel_bcc_expand.svg',
    label: '확장하기',
    desc:  '요소의 구조와 관계를 재배치',
  },
  transform: {
    color: '#7B61C4',
    icon:  '/panel_errc_transform.svg',
    label: '변형하기',
    desc:  '요소의 강도와 존재를 조정',
  },
}

// 사이드패널 추천 도구 카드: 직접작성 카드 전용
// 카드(border + padding 12px 16px) 내부 좌측에 4px 액센트 바를 절대 배치
// bar(4px) + gap(12px) = 좌측 padding(16px) — 너비는 콘텐츠 기준
function RecToolCard({ toolType }) {
  const config = TOOL_CONFIG[toolType]
  if (!config) return null

  return (
    <div className="rec-tool-card" style={{ borderColor: config.color }}>
      {/* 좌측 액센트 바: 절대 배치, overflow:hidden으로 모서리 클립 */}
      <div className="rec-tool-card__bar" style={{ background: config.color }} />

      {/* 도구 아이콘 + 레이블 */}
      <div className="rec-tool-card__header">
        <img src={config.icon} width={18} height={18} alt="" />
        <span className="rec-tool-card__label" style={{ color: config.color }}>
          {config.label}
        </span>
      </div>

      {/* 도구 방향 설명 */}
      <p className="rec-tool-card__desc">{config.desc}</p>
    </div>
  )
}

export default RecToolCard
