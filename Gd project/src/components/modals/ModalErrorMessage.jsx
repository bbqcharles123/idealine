import { TriangleAlert } from 'lucide-react'
import './ModalErrorMessage.css'

// 하단 버튼 바로 위에 놓이는 오류 문구 한 줄.
// ModalErrorNotice와 달리 배경 박스도, 자체 재시도 버튼도 없다.
// 만들지 못한 "자리"가 따로 없는 실패(파생카드 생성 실패)를 알리는 용도라
// 대신 차지할 영역이 없고, 재시도는 하단의 '다시 생성하기' 버튼이 맡기 때문이다.
//
// message: 무엇을 만들지 못했는지 알리는 문구 (예: '파생 카드를 만들지 못했어요')
function ModalErrorMessage({ message }) {
  return (
    <div className="modal-error-message">
      {/* 아이콘(lucide 기본 color: currentColor)은 컨테이너의 오류 색을 상속받는다.
          absoluteStrokeWidth: strokeWidth를 화면상 px로 고정해 size와 무관하게 1.5px로 렌더한다 */}
      <TriangleAlert size={18} strokeWidth={1.5} absoluteStrokeWidth />
      <p>{message}</p>
    </div>
  )
}

export default ModalErrorMessage
