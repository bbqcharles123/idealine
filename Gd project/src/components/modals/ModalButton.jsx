import './ModalButton.css'

// 모달 공통 버튼 컴포넌트
// variant: 'filled' (주 동작) | 'outline' (보조 동작 - 이전으로) | 'danger' (실패 후 재시도) | 'cancel' (생성 중 취소)
// filled + disabled={false} → 파란 배경 (--color-primary), 흰 텍스트, 클릭 가능
// filled + disabled={true}  → 연한 파랑 배경 (#e4eefb), 파랑 텍스트 (#93aece), 클릭 불가
// outline                   → 흰 배경, 파란 테두리, 파란 텍스트, 항상 클릭 가능
// danger                    → 빨간 배경 (--color-error-text), 흰 텍스트
// cancel                    → 회색 배경 (#d5d5d5), 진회색 텍스트 (#46484b), 항상 클릭 가능 (disabled 아님)
// width: 기본 144px (시작카드생성 모달), 확장/변형/직접작성 모달은 222 전달
function ModalButton({ variant = 'filled', disabled = false, width = 144, onClick, children }) {
  const className = [
    'modal-btn',
    `modal-btn--${variant}`,
    variant === 'filled' && disabled ? 'modal-btn--disabled' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      className={className}
      style={{ width: `${width}px` }}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export default ModalButton
