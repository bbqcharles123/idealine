// 말풍선 툴팁 — 아이콘 옆에 붙어 설명을 띄운다.
// arrowPosition은 툴팁을 띄우는 아이콘의 수평 위치에 맞춰 삼각형을 옮긴다.
import { Tooltip } from 'gd-project'

// 아이콘이 왼쪽에 있을 때 (UxItemName의 경고 아이콘이 이 형태)
export const ArrowLeft = () => (
  <div style={{ padding: 16 }}>
    <Tooltip text="보완이 필요한 항목" arrowPosition="left" />
  </div>
)

// 기본값 — 삼각형이 가운데
export const ArrowCenter = () => (
  <div style={{ padding: 16 }}>
    <Tooltip text="추천하는 도구" arrowPosition="center" />
  </div>
)

// 아이콘이 오른쪽에 있을 때
export const ArrowRight = () => (
  <div style={{ padding: 16 }}>
    <Tooltip text="이 카드의 세부 정보" arrowPosition="right" />
  </div>
)

// 긴 문장 — 줄바꿈 동작 확인
export const LongText = () => (
  <div style={{ padding: 16, width: 260 }}>
    <Tooltip text="이 영역은 평가 기준을 충분히 만족하지 못했습니다" arrowPosition="left" />
  </div>
)
