import './QAContent.css'

// answer 텍스트를 highlights 범위(character index) 기준으로 세그먼트 배열로 분할
// highlights: [{start, end}, ...] — AI API 연동 후 채워질 예정, 없으면 일반 텍스트
function buildSegments(text, highlights) {
  if (!text || !highlights?.length) return [{ text, highlighted: false }]

  const sorted = [...highlights].sort((a, b) => a.start - b.start)
  const segments = []
  let pos = 0

  for (const { start, end } of sorted) {
    if (pos < start) segments.push({ text: text.slice(pos, start), highlighted: false })
    segments.push({ text: text.slice(start, end), highlighted: true })
    pos = end
  }
  if (pos < text.length) segments.push({ text: text.slice(pos), highlighted: false })

  return segments
}

// 도구 유형별 하이라이트 배경색
const HIGHLIGHT_COLOR = {
  expand:    'var(--color-expand-bg)',
  transform: 'var(--color-transform-bg)',
}

// 질문 & 응답 컴포넌트
// question:   모달에서 제시된 질문 텍스트
// answer:     사용자가 입력한 응답 텍스트
// tagType:    'expand' | 'transform' — 하이라이트 색상 결정에 사용
// highlights: [{start, end}] — AI가 도구 적용 위치를 반환할 때 사용 (현재 미연동)
function QAContent({ question, answer, tagType, highlights }) {
  const segments = buildSegments(answer, highlights)
  const highlightColor = HIGHLIGHT_COLOR[tagType] ?? HIGHLIGHT_COLOR.expand

  return (
    <div className="qa-content" style={{ '--qa-highlight-color': highlightColor }}>

      {/* Q 행: 배지 + 질문 텍스트 */}
      <div className="qa-content__row">
        <div className="qa-content__badge">Q</div>
        <p className="qa-content__question-text">{question}</p>
      </div>

      {/* A 행: 배지 + 답변 박스 */}
      <div className="qa-content__row">
        <div className="qa-content__badge">A</div>
        <div className="qa-content__answer-box">
          <p className="qa-content__answer-text">
            {segments.map((seg, i) =>
              seg.highlighted ? (
                <mark key={i} className="qa-content__highlight">{seg.text}</mark>
              ) : (
                <span key={i}>{seg.text}</span>
              )
            )}
          </p>
        </div>
      </div>

    </div>
  )
}

export default QAContent
