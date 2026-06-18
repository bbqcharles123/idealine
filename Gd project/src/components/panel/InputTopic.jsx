import { Lightbulb } from 'lucide-react'
import './InputTopic.css'

// 입력 주제: 씨드카드 세부정보패널에서만 표시되는 정보
// 사용자가 시작 모달에서 입력한 아이디어 주제를 전구 아이콘 박스로 표시
// (파생카드에는 입력 주제가 없으므로 씨드카드 전용으로 분리)
function InputTopic({ topic }) {
  return (
    <section className="panel-section">
      <p className="panel-label">입력 주제</p>

      {/* 회색 박스 + 전구 아이콘 + 주제 텍스트 */}
      <div className="input-topic-box">
        <Lightbulb className="input-topic-icon" size={18} strokeWidth={2} color="#4d4d4d" />
        <p className="input-topic-text">{topic}</p>
      </div>
    </section>
  )
}

export default InputTopic
