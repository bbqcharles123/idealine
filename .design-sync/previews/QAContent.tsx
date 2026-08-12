// 질문 & 응답 블록 — 파생카드 사이드패널에서 "무엇을 물었고 사용자가 뭐라 답했는지"를 보여준다.
// highlights는 answer 문자열의 문자 인덱스 범위로, AI가 도구를 적용한 위치를 표시한다.
import { QAContent } from 'gd-project'

const panel = { width: 336 }

const 확장답변 =
  '카드를 복제해서 같은 아이디어를 다른 사용자층에 각각 맞춰 보고 싶다. 학생용과 실무자용을 따로 두면 필요한 기능이 갈릴 것 같다.'

// 확장하기 도구 — 하이라이트 없는 기본 형태
export const Expand = () => (
  <div style={panel}>
    <QAContent
      tagType="expand"
      question="이 아이디어를 어떻게 넓혀 나가고 싶으신가요?"
      answer={확장답변}
    />
  </div>
)

// 확장하기 + 하이라이트 — '복제해서'와 '다른 사용자층에'가 도구 적용 지점
export const ExpandWithHighlights = () => (
  <div style={panel}>
    <QAContent
      tagType="expand"
      question="이 아이디어를 어떻게 넓혀 나가고 싶으신가요?"
      answer={확장답변}
      highlights={[
        { start: 3, end: 8 },
        { start: 17, end: 25 },
      ]}
    />
  </div>
)

// 변형하기 도구 — 하이라이트 색이 보라 계열로 바뀐다
export const Transform = () => (
  <div style={panel}>
    <QAContent
      tagType="transform"
      question="이 아이디어를 어떻게 달리 만들어 보고 싶으신가요?"
      answer="추천 도구를 자동으로 고르지 말고, 사용자가 직접 고르게 두면 어떨까. 자동 추천은 편하지만 왜 그 도구인지 납득이 안 될 때가 있다."
      highlights={[{ start: 0, end: 16 }]}
    />
  </div>
)

// 짧은 응답 — 사용자가 한 줄만 적었을 때의 레이아웃
export const ShortAnswer = () => (
  <div style={panel}>
    <QAContent
      tagType="expand"
      question="어떤 요소를 결합해 보고 싶으신가요?"
      answer="아이디어 카드와 회고 노트."
    />
  </div>
)
