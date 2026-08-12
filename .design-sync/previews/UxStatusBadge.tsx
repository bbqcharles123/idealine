// UX 영역 평가 상태 배지 — 보완/충족 두 상태가 전부다.
import { UxStatusBadge } from 'gd-project'

// 기준을 만족한 영역
export const Satisfied = () => <UxStatusBadge needsImprovement={false} />

// 보완이 필요한 영역
export const NeedsImprovement = () => <UxStatusBadge needsImprovement={true} />

// 두 상태를 나란히 — 실제 사이드패널에서 영역별로 섞여 나타난다
export const BothStates = () => (
  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
    <UxStatusBadge needsImprovement={false} />
    <UxStatusBadge needsImprovement={true} />
  </div>
)
