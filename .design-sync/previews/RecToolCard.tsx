// 추천 도구 카드 — 직접작성 카드의 도구 레이어·사이드패널에 뜨는 카드.
// toolType 하나로 테두리·액센트 바·라벨 색과 설명 문구가 모두 결정된다(내부 고정값).
import { RecToolCard } from 'gd-project'

// 확장하기 — 녹색 계열
export const Expand = () => <RecToolCard toolType="expand" />

// 변형하기 — 보라 계열
export const Transform = () => <RecToolCard toolType="transform" />

// 두 도구를 나란히 — 색 대비와 설명 문구 차이를 한눈에
export const BothTools = () => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
    <RecToolCard toolType="expand" />
    <RecToolCard toolType="transform" />
  </div>
)
