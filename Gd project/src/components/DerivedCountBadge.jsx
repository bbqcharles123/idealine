import './DerivedCountBadge.css'

// 도구 유형별 아이콘·레이블 설정
// (panel/ToolBadge.jsx의 HEADER 맵과 같은 방식 — 아이콘은 기존 public/ 에셋을 재사용한다)
//
// empty는 도구가 아니라 "파생 카드가 하나도 없는 상태"를 가리키는 항목이다.
// 아이콘이 없고(icon: null) 개수도 붙지 않는다 — 셀 대상 자체가 없는 상태라
// '0'을 적으면 성취 없음을 수치로 못 박아 읽히기 때문이다.
// 같은 맵에 둔 이유: 배지의 형식(pill·padding·글자 크기·행간)이 도구 배지와 완전히
// 같아서, 형식을 공유하는 것들을 한자리에 모아두는 편이 갈라놓는 것보다 낫다.
const TOOL = {
  expand:    { icon: '/panel_bcc_expand.svg',      label: '확장하기' },
  transform: { icon: '/panel_errc_transform.svg',  label: '변형하기' },
  write:     { icon: '/toolbar_btn_make_card.svg', label: '직접작성' },
  empty:     { icon: null,                         label: '파생 카드 없음' },
}

// 캔버스 카드에서 "어떤 도구로 몇 개가 만들어졌는지" 알려주는 pill 배지
// Figma node 2803:650 (확장 2799:579 / 변형 2799:584 / 직접작성 2799:589)
// 파생 카드 없음: Figma node 2813:764
//
// type   — 아이콘·배경색·글자색·레이블을 한꺼번에 결정한다
//          ('empty'는 도구가 아니라 파생 카드가 하나도 없는 상태를 가리킨다)
// count  — 그 도구로 실제 생성된 파생 카드 수 ('empty'에는 넘기지 않는다)
//
// count가 0이면 아무것도 렌더하지 않는다. 만들어지지 않은 도구는 카드에 표시하지
// 않는 것이 기존 동작이고, 그 판단을 호출부마다 반복하지 않도록 여기로 모았다.
function DerivedCountBadge({ type, count }) {
  const tool = TOOL[type]
  if (!tool) return null

  // 'empty'만 count 검사를 건너뛴다. 도구 배지는 "0개면 감춘다"가 규칙이지만,
  // 이 배지는 그 0개인 상황 자체를 알리는 것이라 같은 규칙을 적용하면 영영 안 뜬다.
  const isEmpty = type === 'empty'
  if (!isEmpty && count <= 0) return null

  return (
    <span className={`derived-count-badge derived-count-badge--${type}`}>
      {/* 아이콘이 있는 도구 배지에서만 <img>를 그린다.
          empty는 아이콘이 없어도 padding 4 + 행간 14 + padding 4 = 22px로
          다른 배지와 높이가 같다 (아이콘 14px과 행간 14px이 같은 값이라서). */}
      {tool.icon && <img src={tool.icon} width={14} height={14} alt="" />}
      {isEmpty ? tool.label : `${tool.label} ${count}`}
    </span>
  )
}

export default DerivedCountBadge
