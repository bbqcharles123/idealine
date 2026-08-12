// UX 영역 태그 — 평가요소가 속한 영역을 pill로 표시하는 가장 작은 단위.
import { UxAreaTag } from 'gd-project'

// 단일 태그
export const Single = () => <UxAreaTag area="Business" />

// 서비스가 쓰는 세 영역 전체
export const AllAreas = () => (
  <div style={{ display: 'flex', gap: 8 }}>
    <UxAreaTag area="Business" />
    <UxAreaTag area="Human" />
    <UxAreaTag area="Social" />
  </div>
)
