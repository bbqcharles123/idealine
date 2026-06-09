import './ModalProgress.css'

// 모달 진행도 바: 확장하기(totalSteps=3), 변형하기(totalSteps=2)에서 공통으로 사용
// stepLabel: 현재 단계 이름 (예: "방향 선택")
// totalSteps: 전체 단계 수
// currentStep: 현재 단계 (1-based) → 채움 너비 비율 계산에 사용
function ModalProgress({ stepLabel, totalSteps, currentStep }) {
  const fillPercent = (currentStep / totalSteps) * 100

  return (
    <div className="modal-progress">
      {/* 헤더: 단계 이름(좌) + 단계 카운터(우) */}
      <div className="modal-progress-header">
        <span>{stepLabel}</span>
        <span>{currentStep}/{totalSteps}</span>
      </div>
      {/* 단일 연속 바 */}
      <div className="modal-progress-track">
        <div
          className="modal-progress-fill"
          style={{ width: `${fillPercent}%` }}
        />
      </div>
    </div>
  )
}

export default ModalProgress
