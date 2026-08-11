import './ModalSkeleton.css'

// 모달 선택지 로딩 스켈레톤: AI가 선택지를 생성하는 동안 ModalOption 자리를 대신 채운다
// 실제 선택지와 같은 자리·같은 간격을 미리 차지해 로딩이 끝났을 때 레이아웃이 튀는 것을 줄인다
// count: 표시할 스켈레톤 박스 개수 (실제로 생성될 선택지 개수를 넘겨야 자리 수가 맞는다)
function ModalSkeleton({ count = 3 }) {
  return (
    // role="status" + aria-label: 화면에 보이는 내용이 없으므로 스크린리더에는 로딩 중임을 문구로 전달
    <div className="modal-skeleton" role="status" aria-label="선택지 생성 중">
      {Array.from({ length: count }, (_, i) => (
        // 회색 박스 자체는 의미 없는 장식 요소이므로 스크린리더에서 제외
        <div key={i} className="modal-skeleton-item" aria-hidden="true" />
      ))}
    </div>
  )
}

export default ModalSkeleton
