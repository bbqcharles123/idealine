// UX 평가기준 태그 — 아코디언 본문 하단에 나열되는 pill.
// needsImprovement가 true면 노란 배경 + 경고 아이콘으로 바뀐다.
import { UxCriterionTag } from 'gd-project'

// 기본 — 회색 pill
export const Normal = () => <UxCriterionTag name="차별성" />

// 보완 필요 — 노란 배경 + 경고 아이콘
export const NeedsImprovement = () => (
  <UxCriterionTag name="수익성" needsImprovement={true} />
)

// 실제 아코디언 본문처럼 여러 개를 나열한 모습
export const TagRow = () => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, width: 320 }}>
    <UxCriterionTag name="시장성" needsImprovement={true} />
    <UxCriterionTag name="수익성" needsImprovement={true} />
    <UxCriterionTag name="차별성" />
    <UxCriterionTag name="확장성" />
    <UxCriterionTag name="실현 가능성" />
  </div>
)
