// 추천 이유 — 직접작성 카드 전용. AI가 왜 그 도구를 권했는지 설명하는 박스.
// reason이 비어 있으면 아무것도 렌더하지 않는다.
import { RecReason } from 'gd-project'

const panel = { width: 336 }

export const Default = () => (
  <div style={panel}>
    <RecReason reason="작성하신 내용이 기존 아이디어의 대상을 좁히는 방향이라, 요소의 구조와 관계를 다시 배치하는 '확장하기' 도구가 이어 가기에 적합합니다." />
  </div>
)

// 긴 설명 — 실제 AI 응답은 두세 문장으로 나오는 경우가 많다
export const LongReason = () => (
  <div style={panel}>
    <RecReason reason="작성하신 카드는 사용자층을 나누는 데 초점이 맞춰져 있습니다. 이런 경우 요소를 덜어내거나 강도를 조절하는 '변형하기'보다는, 관계를 다시 엮어 보는 '확장하기' 쪽에서 더 많은 갈래가 나옵니다. 특히 '분할·분리' 도구를 먼저 시도해 보시길 권합니다." />
  </div>
)
