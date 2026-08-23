import './Tooltip.css'

// 공통 Tooltip 컴포넌트 (Figma: 캡스톤 겨울 파일 Section 7 / Frame 1738·1739·1740)
//
// 위치 계산을 컴포넌트가 소유한다.
// 호출부는 감싸는 요소에 position: relative 만 주면 되고,
// bottom/top offset 을 직접 잡지 않는다. (삼각형 높이가 바뀌어도 호출부는 그대로)
//
// text:          string              — tooltip 표시 텍스트
// placement:     'top' | 'bottom'    — tooltip 이 트리거의 위/아래 중 어디에 뜨는가
//                                       top    → 삼각형이 아래를 향함
//                                       bottom → 삼각형이 위를 향함
// arrowPosition: 'left' | 'center'   — 몸통이 어느 쪽으로 뻗는가.
//                                       두 값 모두 삼각형 끝은 트리거의 수평 중심을 가리키므로,
//                                       트리거 크기(아이콘 18 / 배지 40 / 툴바 버튼 100)와 무관하게
//                                       호출부가 위치를 계산할 필요가 없다.
//                                       'right' 는 쓰이는 곳이 없어 두지 않았다 (Tooltip.css 참고)
// offset:        number              — 삼각형 끝과 트리거 사이의 간격(px). 기본 4
//                                       트리거에 자체 padding 이 있을 때만 값을 키운다
function Tooltip({ text, placement = 'top', arrowPosition = 'center', offset = 4 }) {
  return (
    <div
      className={`tooltip tooltip--${placement} tooltip--arrow-${arrowPosition}`}
      style={{ '--tooltip-offset': `${offset}px` }}
      role="tooltip"
    >
      {text}
      <span className="tooltip__arrow" />
    </div>
  )
}

export default Tooltip
