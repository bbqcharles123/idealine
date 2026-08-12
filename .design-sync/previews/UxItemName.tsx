// 평가요소명 pill — 보완이 필요하면 경고 아이콘이 붙고, 누르면 툴팁이 열린다.
// (툴팁 열림은 클릭으로만 발생하므로 정적 렌더에서는 닫힌 상태만 보인다)
import { UxItemName } from 'gd-project'

// 기본 — 이름만
export const Plain = () => <UxItemName name="창의성" />

// 보완 필요 — 경고 아이콘이 붙는다
export const NeedsImprovement = () => (
  <UxItemName name="실현 가능성" needsImprovement={true} />
)

// 평가요소 목록처럼 세로로 쌓은 모습
export const ItemList = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 320 }}>
    <UxItemName name="창의성" />
    <UxItemName name="실현 가능성" needsImprovement={true} />
    <UxItemName name="사용자 가치" />
    <UxItemName name="차별성" needsImprovement={true} />
  </div>
)
