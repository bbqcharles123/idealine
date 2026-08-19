import { useState } from 'react'
import IdeaSource from './panel/IdeaSource'
import InputTopic from './panel/InputTopic'
import ToolBadge from './panel/ToolBadge'
import QAContent from './panel/QAContent'
import RecToolCard from './panel/RecToolCard'
import RecReason from './panel/RecReason'
import UxAreaAccordion from './panel/UxAreaAccordion'
import UxEvaluationItem from './panel/UxEvaluationItem'
import './SidePanel.css'

// UX 평가 더미 데이터 — UI 확인용 가상 텍스트 (실제 서비스에서는 카드 data에서 받아옴)
// AI 연동이 끝난 뒤로는 화면에 연결하지 않는다. 실제 평가가 없을 때 이 값으로 대신 채우면
// 사용자가 자기 아이디어와 무관한 평가를 진짜 결과로 읽게 되기 때문이다. (아래 uxData 주석 참고)
// 레이아웃을 눈으로 확인할 때만 uxData 자리에 잠시 끼워 쓰는 용도로 남겨둔다.
// eslint-disable-next-line no-unused-vars
const UX_DUMMY = {
  summary:
    '알림 피로 문제를 해결하는 방향성은 명확하고 사용자 경험 측면의 잠재력이 높습니다. 다만 실시간 컨텍스트 분석 구현의 기술적 복잡도가 이 아이디어의 핵심 변수입니다.',
  areas: [
    {
      key:        'business',
      name:       'Business',
      status:     'supplement',
      evaluation: '푸시 알림 제거라는 역발상은 기존 루틴 앱과 차별점이 뚜렷합니다. 실시간 컨텍스트 분석의 기술 복잡도는 추가 검토가 필요합니다.',
      criteria: [
        { name: '창의성',     needsImprovement: false },
        { name: '실현 가능성', needsImprovement: true  },
      ],
    },
    {
      key:        'human',
      name:       'Human',
      status:     'satisfied',
      evaluation: '앱을 열면 즉시 루틴이 제시되는 구조는 마찰이 적고 반복 사용 동기가 충분합니다.',
      criteria: [
        { name: '사용 기대성', needsImprovement: false },
        { name: '효율 기대성', needsImprovement: false },
        { name: '명료성',     needsImprovement: false },
        { name: '매력성',     needsImprovement: false },
      ],
    },
    {
      key:        'social',
      name:       'Social',
      status:     'satisfied',
      evaluation: '알림 피로는 광범위한 사회적 문제입니다. 능동적 루틴 확인 방식은 대안적 UX 모델로 확산 가능성이 있습니다.',
      criteria: [
        { name: '사회적 도움성', needsImprovement: false },
      ],
    },
  ],
  // 평가 요소 섹션: 평가요소별 세부 평가 내용 (AI 연동 전 더미)
  evaluationItems: [
    { name: '창의성',     needsImprovement: false, evaluation: '재택근무일과 출근일을 감지해 루틴을 자동 전환하는 방식은 기존 루틴 앱에서 보편적으로 다루지 않는 접근입니다.' },
    { name: '실현 가능성', needsImprovement: true,  evaluation: '캘린더 연동 또는 위치 데이터로 구현 가능하나 루틴 분기 학습을 위한 데이터 축적 기간이 선행되어야 합니다.' },
    { name: '사용 기대성', needsImprovement: false, evaluation: '재택과 출근을 반복하는 사용자라면 매일 루틴을 수동 조정하는 불편을 직접 경험했을 가능성이 높습니다.' },
    { name: '효율 기대성', needsImprovement: false, evaluation: '앱을 여는 것만으로 당일 상황에 맞는 루틴이 자동 제공되어 별도 설정 변경이 필요 없습니다.' },
    { name: '명료성',     needsImprovement: false, evaluation: '재택일과 출근일이라는 구분 기준이 직관적으로 이해되며 별도 설명 없이도 작동 방식을 예측할 수 있습니다.' },
    { name: '매력성',     needsImprovement: false, evaluation: '내 상황을 앱이 먼저 파악해 맞춰준다는 경험은 수동 조작 없이 작동한다는 점에서 실사용 매력도가 높습니다.' },
    { name: '사회적 도움성', needsImprovement: false, evaluation: '상황을 고려하지 않은 획일적 루틴 권고로 인한 피로감을 줄여 지속 가능한 생활 습관 형성에 기여합니다.' },
  ],
}

// 사이드패널: 카드의 ⓘ 아이콘 클릭 시 화면 우측에서 슬라이드인으로 표시되는 정보 패널
// card: 현재 정보를 표시할 카드 (씨드카드 or 파생카드)
// parentCard: 아이디어 출처로 표시할 직속 부모 카드 (파생카드일 때만 존재)
// tab: 현재 활성 탭 ('info': 생성 정보 / 'ux': UX 평가)
// onTabChange: 탭 전환 콜백
// onClose: X 버튼 클릭 시 패널 닫기
function SidePanel({ card, parentCard, tab, onTabChange, onClose }) {
  // 닫기 애니메이션 진행 여부 — true이면 슬라이드아웃 클래스 적용
  const [isClosing, setIsClosing] = useState(false)

  if (!card) return null

  const isSeedCard    = card.type === 'seed'
  const isDerivedCard = card.type === 'layerstack'

  // 확장/변형으로 생성된 파생카드 = 사용 도구 칩 + 질문&응답 표시
  const hasToolUsed = isDerivedCard && (card.data.toolType === 'expand' || card.data.toolType === 'transform')

  // 직접작성 파생카드 = 사용 도구 섹션 제거, 추천 도구·추천 이유 섹션으로 대체
  const isWriteCard = isDerivedCard && card.data.toolType === 'write'

  // UX 평가 데이터: 카드에 AI가 생성한 uxData를 그대로 사용한다.
  // UX_DUMMY로 폴백하지 않는 이유:
  // 카드는 UX 평가까지 성공해야 만들어지므로(실패 시 모달이 카드를 만들지 않음) 값이 없을 수 없다.
  // 그런데도 비어 있다면 그 규칙이 깨졌다는 뜻인데, 더미로 채우면 사용자가 자기 아이디어와 무관한
  // 평가를 진짜 결과로 읽게 된다. 실패를 가리지 않도록 탭을 비운 채 경고만 남긴다.
  // (AI 연동 이전에 만들어져 Firestore에 남아 있는 옛 카드가 여기에 해당할 수 있다)
  const uxData = card.data.uxData
  if (!uxData) console.warn('[SidePanel] uxData가 없는 카드입니다:', card.id)

  // areas 순서대로 evaluationItems를 그룹핑: { 'Business': [...], 'Human': [...], 'Social': [...] }
  // areas[].criteria를 기준으로 각 항목이 어느 영역에 속하는지 파악해 배열에 push
  const itemsByArea = {}
  uxData?.areas.forEach((area) => { itemsByArea[area.name] = [] })
  uxData?.evaluationItems.forEach((item) => {
    uxData.areas.forEach((area) => {
      if (area.criteria.some((c) => c.name === item.name)) {
        itemsByArea[area.name].push(item)
      }
    })
  })

  // X 버튼 클릭: 슬라이드아웃 애니메이션(200ms) 실행 후 실제 닫기 호출
  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => onClose(), 200)
  }

  return (
    <div className={`side-panel${isClosing ? ' side-panel--closing' : ''}`}>

      {/* 헤더: 제목 + 닫기 버튼 */}
      <div className="side-panel-header">
        <h2 className="side-panel-title">카드 정보</h2>
        <button className="side-panel-close" onClick={handleClose}>
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

            {/* 씨드카드 전용: 입력 주제 (전구 아이콘 박스) */}
            {isSeedCard && <InputTopic topic={card.data.topic} />}

            {/* 파생카드 전용: 아이디어 출처 (직속 부모 카드로 이동하는 버튼) */}
            {isDerivedCard && parentCard && (
              <section className="panel-section">
                <p className="panel-label">아이디어 출처</p>
                <IdeaSource parentCard={parentCard} />
              </section>
            )}

            {/* 확장/변형 파생카드 전용: 사용 도구 칩 */}
            {hasToolUsed && (
              <section className="panel-section">
                <p className="panel-label">사용 도구</p>
                <ToolBadge tagType={card.data.toolType} tagName={card.data.tagName} />
              </section>
            )}

            {/* 직접작성 파생카드 전용: 추천 도구 카드 */}
            {isWriteCard && (
              <section className="panel-section">
                <p className="panel-label">추천 도구</p>
                <RecToolCard toolType={card.data.writeRec} />
              </section>
            )}

            {/* 직접작성 파생카드 전용: 추천 이유 박스 (AI 생성 텍스트) */}
            {isWriteCard && (
              <RecReason reason={card.data.writeRecReason} />
            )}

            {/* 확장/변형 파생카드 전용: 질문 & 응답 */}
            {hasToolUsed && (
              <section className="panel-section">
                <p className="panel-label">질문 &amp; 응답</p>
                <QAContent
                  question={card.data.question}
                  answer={card.data.answer}
                  tagType={card.data.toolType}
                  highlights={card.data.highlights}
                />
              </section>
            )}

          </div>
        )}

        {/* ── UX 평가 탭 ── */}
        {/* 카드의 uxData(AI 생성)를 표시. uxData가 없으면 아무것도 그리지 않는다
            (없을 수 없는 값이라 빈 상태 화면을 따로 두지 않고, 원인은 위의 콘솔 경고로 확인한다) */}
        {tab === 'ux' && uxData && (
          <div className="panel-ux">

            {/* 종합요약 */}
            <div className="panel-ux__section panel-ux__section--summary">
              <p className="panel-label">종합요약</p>
              <div className="panel-ux__summary-box">
                <p className="panel-ux__summary-text">{uxData.summary}</p>
              </div>
            </div>

            {/* 영역별 평가: Business / Human / Social 아코디언 */}
            {/* 회색 컨테이너(.panel-ux__areas) 안에 흰색 영역 카드를 간격으로 구분해 나열 */}
            <div className="panel-ux__section panel-ux__section--areas">
              <p className="panel-label">영역별 평가</p>
              <div className="panel-ux__areas">
                {uxData.areas.map((area) => (
                  <UxAreaAccordion key={area.key} area={area} defaultOpen={false} />
                ))}
              </div>
            </div>

            {/* 평가 요소: 영역별로 그룹핑된 평가요소 카드 목록 */}
            <div className="panel-ux__section panel-ux__section--items">
              <p className="panel-label">평가 요소</p>
              <div className="panel-ux__evaluation-items">
                {uxData.areas.map((area) => (
                  <div key={area.name} className="panel-ux__evaluation-group">
                    <p className="panel-ux__evaluation-group-label">{area.name}</p>
                    <div className="panel-ux__evaluation-group-cards">
                      {itemsByArea[area.name].map((item) => (
                        <UxEvaluationItem
                          key={item.name}
                          name={item.name}
                          needsImprovement={item.needsImprovement}
                          evaluation={item.evaluation}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}

export default SidePanel