import './GradientBorder.css'

// active일 때만 자식 바깥에 회전하는 그라디언트 링을 씌우는 래퍼.
// 자식 자신의 크기·패딩·border는 건드리지 않고, ::before로 2px 링만 덧그린다
// (HomePage F1 Mono Blue 시안: #CFE6FF → --color-primary → #2F5DA8).
function GradientBorder({ active, radius, children }) {
  return (
    <div
      className={`gradient-border${active ? ' gradient-border--active' : ''}`}
      style={radius ? { borderRadius: radius } : undefined}
    >
      {children}
    </div>
  )
}

export default GradientBorder
