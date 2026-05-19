import './ModalProgress.css'

// 모달 진행도 바: 확장하기(totalSteps=3), 변형하기(totalSteps=2)에서 공통으로 사용
// totalSteps: 전체 단계 수 → 막대 개수 결정
// currentStep: 현재 단계 → 해당 인덱스까지의 막대를 파란색으로 채움
function ModalProgress({ totalSteps, currentStep }) {
  return (
    <div className="modal-progress">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className={`modal-progress-bar${i < currentStep ? ' modal-progress-bar--filled' : ''}`}
        />
      ))}
    </div>
  )
}

export default ModalProgress
