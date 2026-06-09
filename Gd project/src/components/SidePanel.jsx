import IdeaCardContent from './panel/IdeaCardContent'
import PanelTool from './panel/PanelTool'
import QAContent from './panel/QAContent'
import UXItem from './panel/UXItem'
import './SidePanel.css'

// UX 평가 7개 항목 — AI 연동 전 더미 데이터 (실제 서비스에서는 카드 data에서 받아옴)
const UX_DUMMY = [
  {
    criterion: '창의성',
    content:   '근무 유형이라는 외부 조건과 루틴 구성을 연동한 접근은 기존 앱에서 보기 드문 차별화 포인트다.',
  },
  {
    criterion: '실현 가능성',
    content:   '캘린더 또는 사용자 입력 기반 감지는 현 기술로 구현 가능하나, 자동 감지 정확도 확보가 관건이다.',
  },
  {
    criterion: '사용 기대성',
    content:   '매일 루틴을 수동으로 조정해온 직장인 사용자에게 반복 사용 유인이 충분히 형성될 것으로 보인다.',
  },
  {
    criterion: '효율 기대성',
    content:   '루틴 재배치 작업을 자동화해 매일 발생하는 소규모 의사결정 비용을 실질적으로 줄여줄 수 있다.',
  },
  {
    criterion: '명료성',
    content:   '\'근무 유형에 따라 루틴이 바뀐다\'는 핵심 개념은 단순해 사용자가 별도 설명 없이도 직관적으로 이해된다.',
  },
  {
    criterion: '매력성',
    content:   '나의 생활 패턴을 앱이 알아서 맞춰준다는 경험은 개인화 선호가 높은 사용자층에게 소구력이 크다.',
  },
  {
    criterion: '사회적 도움성',
    content:   '유연근무 확산 속 루틴 유지 어려움을 완화해, 직장인의 자기관리 지속성 향상에 기여할 수 있다.',
  },
]

// 사이드패널: 카드의 ⓘ 아이콘 클릭 시 화면 우측에서 슬라이드인으로 표시되는 정보 패널
// card: 현재 정보를 표시할 카드 (씨드카드 or 파생카드)
// parentCard: 아이디어 출처로 표시할 직속 부모 카드 (파생카드일 때만 존재)
// tab: 현재 활성 탭 ('info': 생성 정보 / 'ux': UX 평가)
// onTabChange: 탭 전환 콜백
// onClose: X 버튼 클릭 시 패널 닫기
function SidePanel({ card, parentCard, tab, onTabChange, onClose }) {
  if (!card) return null

  const isSeedCard    = card.type === 'seed'
  const isDerivedCard = card.type === 'layerstack'

  // toolType이 있는 파생카드 = 확장/변형으로 생성 → 사용 도구 칩 + 질문&응답 표시
  // toolType이 null인 파생카드 = 직접작성 → "직접작성" 텍스트만 표시
  const hasToolUsed = isDerivedCard && card.data.toolType !== null

  return (
    <div className="side-panel">

      {/* 헤더: 제목 + 닫기 버튼 */}
      <div className="side-panel-header">
        <h2 className="side-panel-title">카드 정보</h2>
        <button className="side-panel-close" onClick={onClose}>
          <img src="/close_sidepanel.svg" width={24} height={24} alt="닫기" />
        </button>
      </div>

      {/* 탭바: 생성 정보 | UX 평가 */}
      <div className="side-panel-tabs-wrap">
        <div className="side-panel-tabs">
          <button
            className={`panel-tab${tab === 'info' ? ' panel-tab--active' : ''}`}
            onClick={() => onTabChange('info')}
          >
            생성 정보
          </button>
          <button
            className={`panel-tab${tab === 'ux' ? ' panel-tab--active' : ''}`}
            onClick={() => onTabChange('ux')}
          >
            UX 평가
          </button>
        </div>
      </div>

      {/* 콘텐츠 영역: 스크롤 가능 */}
      <div className="side-panel-body">

        {/* ── 생성 정보 탭 ── */}
        {tab === 'info' && (
          <div className="panel-info">

            {/* 공통: 카드 유형 */}
            <section className="panel-section">
              <p className="panel-label">카드 유형</p>
              <p className="panel-value">{isSeedCard ? '씨드카드' : '파생카드'}</p>
            </section>

            {/* 씨드카드 전용: 입력 주제 */}
            {isSeedCard && (
              <section className="panel-section">
                <p className="panel-label">입력 주제</p>
                <p className="panel-value">{card.data.topic}</p>
              </section>
            )}

            {/* 파생카드 전용: 아이디어 출처 (직속 부모 카드) */}
            {isDerivedCard && parentCard && (
              <section className="panel-section">
                <p className="panel-label">아이디어 출처</p>
                <IdeaCardContent
                  title={parentCard.data.title}
                  description={parentCard.data.description}
                />
              </section>
            )}

            {/* 파생카드 전용: 사용 도구
                확장/변형 → PanelTool 칩 UI / 직접작성 → 텍스트 */}
            {isDerivedCard && (
              <section className="panel-section">
                <p className="panel-label">사용 도구</p>
                {hasToolUsed ? (
                  <PanelTool tagType={card.data.toolType} tagName={card.data.tagName} />
                ) : (
                  <p className="panel-value">직접작성</p>
                )}
              </section>
            )}

            {/* 확장/변형 파생카드 전용: 질문 & 응답 */}
            {hasToolUsed && (
              <section className="panel-section">
                <p className="panel-label">질문 &amp; 응답</p>
                <QAContent
                  question={card.data.question}
                  answer={card.data.answer}
                />
              </section>
            )}

          </div>
        )}

        {/* ── UX 평가 탭 ── */}
        {/* AI 연동 후에는 UX_DUMMY 대신 card.data.uxItems를 사용 예정 */}
        {tab === 'ux' && (
          <div className="panel-ux">
            {UX_DUMMY.map(({ criterion, content }) => (
              <UXItem key={criterion} criterion={criterion} content={content} />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}

export default SidePanel