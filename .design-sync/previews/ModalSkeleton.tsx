// 선택지 로딩 스켈레톤 — AI가 선택지를 만드는 동안 ModalOption 자리를 대신 채운다.
// count는 실제로 생성될 선택지 개수와 맞춰야 로딩이 끝날 때 레이아웃이 튀지 않는다.
import { ModalSkeleton } from 'gd-project'

const modalBody = { width: 468 }

// 기본값 3개 — 확장하기 Step 1의 선택지 수
export const Default = () => (
  <div style={modalBody}>
    <ModalSkeleton />
  </div>
)

// 4개 — 선택지가 넷인 단계
export const FourItems = () => (
  <div style={modalBody}>
    <ModalSkeleton count={4} />
  </div>
)

// 2개 — 선택지가 적은 단계
export const TwoItems = () => (
  <div style={modalBody}>
    <ModalSkeleton count={2} />
  </div>
)
