import { Lightbulb } from 'lucide-react'
import './InputTopic.css'

// 입력 주제: 씨드카드 세부정보패널에서만 표시되는 정보
// 사용자가 홈 화면 입력창에 적은 아이디어 주제를 전구 아이콘 박스로 표시 (읽기 전용)
// (파생카드에는 입력 주제가 없으므로 씨드카드 전용으로 분리)
function InputTopic({ topic }) {
  return (
    <section className="panel-section">
      <p className="panel-label">입력 주제</p>

      {/* 회색 박스 + 전구 아이콘 + 주제 텍스트
          아이콘 색은 --color-body2와 값이 같지만 그 토큰은 '본문 텍스트 색'이므로
          아이콘에는 토큰을 쓰지 않고 값으로 둔다 */}
      <div className="input-topic-box">
        <Lightbulb className="input-topic-icon" size={18} strokeWidth={2} color="#4d4d4d" />
        <p className="input-topic-text">{topic}</p>
      </div>
    </section>
  )
}

export default InputTopic
