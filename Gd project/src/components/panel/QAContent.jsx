import './QAContent.css'

// answer 텍스트를 highlights 범위(character index) 기준으로 세그먼트 배열로 분할
// highlights: [{start, end}, ...] — AI가 준 문구를 deriveCard.js의 phrasesToHighlights가
//   answer 기준 문자 인덱스로 변환해 카드에 저장해 둔 값. 비어 있으면 전체를 일반 텍스트로 낸다.
//   (AI가 답변에 없는 표현을 만들거나 구간이 겹치면 그쪽에서 버려지므로 빈 배열이 정상적으로 들어온다)
//
// 구간은 서로 겹치지 않는다고 가정한다 — 아래에서 pos를 앞으로만 밀며 slice를 이어 붙이므로,
// 겹친 구간이 들어오면 같은 글자가 두 번 렌더된다. 겹침 제거는 phrasesToHighlights가 끝내고 넘긴다.
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
// highlights: [{start, end}] — 답변 중 도구가 적용된 구간. SidePanel이 card.data.highlights를 그대로 넘긴다.
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
