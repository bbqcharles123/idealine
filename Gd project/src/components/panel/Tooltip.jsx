import './Tooltip.css'

// 공통 Tooltip 컴포넌트
// text:          string                        — tooltip 표시 텍스트
// arrowPosition: 'left' | 'center' | 'right'  — 삼각형 포인터의 수평 위치
//                사용 컨텍스트(아이콘 위치)에 따라 달리 전달
function Tooltip({ text, arrowPosition = 'center' }) {
  return (
    <div className={`tooltip tooltip--arrow-${arrowPosition}`}>
      {text}
      <span className="tooltip__arrow" />
    </div>
  )
}

export default Tooltip
