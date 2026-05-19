import './ModalOption.css'

// 모달 선택지 컴포넌트: 확장하기 Step 1/2, 변형하기 Step 1/2에서 공통으로 사용
// text: 선택지 텍스트
// isSelected: 선택 여부 → 파란 테두리 + 파란 배경
// onClick: 선택 시 호출
function ModalOption({ text, isSelected, onClick }) {
  return (
    <button
      className={`modal-option${isSelected ? ' modal-option--selected' : ''}`}
      onClick={onClick}
    >
      {text}
    </button>
  )
}

export default ModalOption
