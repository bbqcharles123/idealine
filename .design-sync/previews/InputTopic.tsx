// 입력 주제 — 씨드카드 사이드패널 전용. 사용자가 홈에서 적은 원문 주제를 읽기 전용으로 보여준다.
import { InputTopic } from 'gd-project'

const panel = { width: 336 }

// 한 줄짜리 주제
export const Short = () => (
  <div style={panel}>
    <InputTopic topic="대학생을 위한 아이디어 발산 도구" />
  </div>
)

// 여러 줄로 넘어가는 주제 — 실제 사용자는 문장으로 적는 경우가 많다
export const Long = () => (
  <div style={panel}>
    <InputTopic topic="기획 초기 단계에서 아이디어가 막혔을 때, 질문에 답하는 것만으로 새로운 방향을 얻을 수 있는 도구를 만들고 싶다." />
  </div>
)
