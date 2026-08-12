// 평가요소 항목 — 항목명 pill 아래에 세부 평가 문장이 붙는 한 덩어리.
import { UxEvaluationItem } from 'gd-project'

const panel = { width: 336 }

// 기본 — 기준을 만족한 항목
export const Plain = () => (
  <div style={panel}>
    <UxEvaluationItem
      name="창의성"
      evaluation="아이디어를 '고르는' 행위로 발산을 유도하는 접근이 흔치 않다. 빈 화면에서 시작하는 기존 도구와 확실히 구분된다."
    />
  </div>
)

// 보완 필요 — 항목명에 경고 아이콘이 붙는다
export const NeedsImprovement = () => (
  <div style={panel}>
    <UxEvaluationItem
      name="실현 가능성"
      needsImprovement={true}
      evaluation="AI 호출이 카드 생성마다 발생해 응답 지연과 비용이 함께 늘어난다. 캐싱이나 배치 생성 없이는 카드가 20개만 넘어가도 체감이 나빠진다."
    />
  </div>
)

// 여러 항목을 쌓은 실제 배치
export const ItemStack = () => (
  <div style={{ ...panel, display: 'flex', flexDirection: 'column', gap: 16 }}>
    <UxEvaluationItem
      name="창의성"
      evaluation="아이디어를 '고르는' 행위로 발산을 유도하는 접근이 흔치 않다."
    />
    <UxEvaluationItem
      name="실현 가능성"
      needsImprovement={true}
      evaluation="AI 호출이 카드 생성마다 발생해 응답 지연과 비용이 함께 늘어난다."
    />
    <UxEvaluationItem
      name="사용자 가치"
      evaluation="막막함을 줄여 준다는 점에서 초기 기획 단계 사용자에게 분명한 쓸모가 있다."
    />
  </div>
)
