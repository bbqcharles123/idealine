// 사용 도구 배지 — 파생카드가 어떤 도구로 만들어졌는지 사이드패널 상단에 표시한다.
// tagType이 색 계열(확장=녹색 / 변형=보라)을, tagName이 아이콘과 라벨을 결정한다.
import { ToolBadge } from 'gd-project'

// 확장하기 계열 — 녹색 액센트
export const Expand = () => <ToolBadge tagType="expand" tagName="복제" />

// 변형하기 계열 — 보라 액센트
export const Transform = () => <ToolBadge tagType="transform" tagName="증가" />

// 확장하기 도구 전체 — 태그마다 아이콘이 다르다
export const ExpandTools = () => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
    {['제거', '대체', '분할·분리', '용도통합', '결합', '복제'].map((name) => (
      <ToolBadge key={name} tagType="expand" tagName={name} />
    ))}
  </div>
)

// 변형하기 도구 전체 — ERRC 4종
export const TransformTools = () => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
    {['증가', '감소', '창출', '제거'].map((name) => (
      <ToolBadge key={name} tagType="transform" tagName={name} />
    ))}
  </div>
)
