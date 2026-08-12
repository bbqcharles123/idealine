// 모달 진행도 — 단계 이름(좌) + n/N 카운터(우) + 채움 바.
// 확장하기는 3단계, 변형하기는 2단계다.
import { ModalProgress } from 'gd-project'

const modalBody = { width: 468 }

// 확장하기 1단계
export const ExpandStep1 = () => (
  <div style={modalBody}>
    <ModalProgress stepLabel="방향 선택" totalSteps={3} currentStep={1} />
  </div>
)

// 확장하기 2단계
export const ExpandStep2 = () => (
  <div style={modalBody}>
    <ModalProgress stepLabel="도구 선택" totalSteps={3} currentStep={2} />
  </div>
)

// 마지막 단계 — 바가 가득 찬다
export const FinalStep = () => (
  <div style={modalBody}>
    <ModalProgress stepLabel="내용 작성" totalSteps={3} currentStep={3} />
  </div>
)

// 변형하기 — 2단계짜리
export const TwoStep = () => (
  <div style={modalBody}>
    <ModalProgress stepLabel="방향 선택" totalSteps={2} currentStep={1} />
  </div>
)
