import './KeywordChip.css'

/**
 * 키워드 칩 — 홈 화면에서 "무엇을 입력할지" 막힌 사용자에게 출발점을 주는 추천 키워드 하나.
 * Figma node 2880:2339(기본) / 2880:2341(선택)
 *
 * 누르면 입력창에 값을 채우기만 하고 제출하지는 않는다.
 * "1인 가구"를 고른 뒤 "1인 가구 식비"로 고쳐 쓰는 것이 오히려 기대되는 사용법이라,
 * 칩은 완성된 주제가 아니라 출발점이다.
 *
 * @param label     칩에 보일 키워드 (2~10자. 그 이상은 줄 구성이 깨진다 — HomePage의 KEYWORD_SETS 주석 참고)
 * @param selected  선택 상태. HomePage가 inputValue === label로 파생시켜 넘긴다
 * @param onSelect  클릭 시 label을 받아 처리하는 함수
 */
function KeywordChip({ label, selected = false, onSelect }) {
  return (
    <button
      type="button"
      className={`keyword-chip${selected ? ' keyword-chip--selected' : ''}`}
      onClick={() => onSelect(label)}
      // 선택 상태를 색으로만 전하면 스크린리더에는 아무것도 전달되지 않는다.
      // 라디오가 아니라 "눌린 채로 유지되는 버튼"이므로 aria-pressed를 쓴다.
      aria-pressed={selected}
    >
      {label}
    </button>
  )
}

export default KeywordChip
