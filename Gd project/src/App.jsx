import { useState, useCallback, useMemo, useEffect } from 'react'
import { ReactFlow, applyNodeChanges, Panel, useNodesInitialized, useReactFlow } from '@xyflow/react'
import SeedCard from './components/SeedCard'
import DerivedCard from './components/DerivedCard'
import LayerStackNode from './components/LayerStackNode'
import Toolbar from './components/Toolbar'
import WriteModal from './components/modals/WriteModal'
import ExpandModal from './components/modals/ExpandModal'
import TransformModal from './components/modals/TransformModal'
import SidePanel from './components/SidePanel'
import { getLayoutedElements } from './utils/layout'

// React Flow에 커스텀 노드 타입 등록
// 'seed' → SeedCard 컴포넌트, 'derived' → DerivedCard 컴포넌트
// 'layerstack' → LayerStackNode (레이어 스택 구조 검증용)
const nodeTypes = {
  seed: SeedCard,
  derived: DerivedCard,
  layerstack: LayerStackNode,
}

// 개발/테스트용 더미 카드 데이터 (AI API 연동 전 캔버스 동작 확인용)
const DUMMY_CARDS = [
  {
    id: 'seed-1',
    type: 'seed',
    position: { x: 400, y: 100 },
    data: {
      title: 'AI 생활 루틴 코치 앱',
      description:
        'AI가 사용자의 하루 일정, 위치, 생활 패턴 데이터를 분석해 개인 맞춤형 생활 루틴을 제안하는 서비스이다. 사용자의 피로도와 집중 시간대를 고려해 업무, 휴식, 운동 시간을 자동으로 추천하고 루틴을 지속적으로 최적화한다.',
      // 사이드패널 생성정보 탭에서 표시할 시작 모달 입력 주제 (시작 모달 구현 전 더미값)
      topic: 'AI 기술 기반 혁신적인 제품 및 서비스 아이디어',
    },
  },
  {
    id: 'derived-1',
    type: 'derived',
    position: { x: 200, y: 400 },
    data: {
      title: '근무 유형별 루틴 자동 전환',
      // AI가 사용자 답변을 바탕으로 생성한 카드 본문 (캔버스 카드에 표시)
      description:
        '재택·출근 등 그날의 근무 유형을 감지해 각각에 맞는 루틴으로 자동 전환되는 기능. 출근일에는 아침 준비 시간을 반영해 운동을 저녁으로 재배치하고, 재택일에는 이동 시간이 없는 만큼 오전 루틴을 더 촘촘하게 구성한다. 하나의 루틴을 억지로 따르는 대신 삶의 패턴에 맞게 복제된 루틴이 상황에 따라 작동한다.',
      // 사용자가 모달 답변 textarea에 직접 입력한 원문 (사이드패널 질문&응답에 표시)
      answer:
        '재택근무 하는 날이랑 출근하는 날 루틴이 완전히 달라요. 출근 날은 아침에 준비 시간이 필요해서 운동을 저녁으로 밀어야 하는데, 앱은 매일 같은 시간에 운동하라고 추천하거든요.',
      tagType: 'expand',
      tagName: '복제',
      question: '지금 하나의 루틴으로 관리하기 어렵다고 느끼는 상황이 있다면 어떤 경우인가요?',
    },
  },
  {
    id: 'derived-2',
    type: 'derived',
    position: { x: 600, y: 400 },
    data: {
      title: '온디맨드 루틴 피드',
      // AI가 사용자 답변을 바탕으로 생성한 카드 본문 (캔버스 카드에 표시)
      description:
        '푸시 알림을 제거하고 사용자가 앱을 여는 순간 현재 시간·위치·패턴 데이터를 즉시 분석해 지금 이 순간에 맞는 루틴을 바로 제시하는 방식. 알림에 의해 끌려가는 루틴이 아니라 사용자가 필요할 때 능동적으로 확인하는 경험으로 전환하여 알림 피로 없이 루틴 유지율을 높인다.',
      // 사용자가 모달 답변 textarea에 직접 입력한 원문 (사이드패널 질문&응답에 표시)
      answer:
        '알림이요. 아침에 일어나자마자 루틴 알림이 오는데 그냥 무시하게 되더라고요. 차라리 알림 없이 앱을 열면 지금 상태에 맞는 루틴이 바로 보이는 게 나을 것 같아요.',
      tagType: 'transform',
      tagName: '제거',
      question: '루틴 앱에서 당연하게 제공되는 알림, 일정 직접 입력, 피로도 수동 체크 중 없애도 오히려 사용 경험이 더 나아질 것 같은 요소가 있나요?',
    },
  },
]

// [테스트] 레이어 스택 검증용 노드 3개 (확장하기 / 변형하기 / 직접작성)
const LAYER_STACK_TEST_NODES = [
  {
    id: 'ls-expand',
    type: 'layerstack',
    position: { x: 900, y: 100 },
    data: {
      title: '확장하기 레이어 스택 테스트',
      description: '카드 영역 클릭 시 노드 선택, 하단 초록 탭 클릭 시 도구 레이어 확장, 드래그 시 두 레이어 함께 이동.',
      toolType: 'expand',
    },
  },
  {
    id: 'ls-transform',
    type: 'layerstack',
    position: { x: 1300, y: 100 },
    data: {
      title: '변형하기 레이어 스택 테스트',
      description: '카드 영역 클릭 시 노드 선택, 하단 보라 탭 클릭 시 도구 레이어 확장, 드래그 시 두 레이어 함께 이동.',
      toolType: 'transform',
    },
  },
  {
    id: 'ls-write',
    type: 'layerstack',
    position: { x: 1100, y: 450 },
    data: {
      title: '직접작성 레이어 스택 테스트',
      description: '도구 레이어 없음. 카드만 렌더링되어 기존 파생카드와 동일하게 동작해야 한다.',
      toolType: null,
    },
  },
]

// 더미 카드 간 연결 관계 (씨드카드 → 두 파생카드)
const DUMMY_EDGES = [
  { id: 'e-seed1-derived1', source: 'seed-1', target: 'derived-1' },
  { id: 'e-seed1-derived2', source: 'seed-1', target: 'derived-2' },
]

function App() {
  // 시작 모달 표시 여부 (true = 앱 진입 시 모달 표시, AI API 연동 후 활성화 예정)
  const [isStartModalOpen, setIsStartModalOpen] = useState(false)

  // 캔버스에 표시되는 전체 카드(노드) 배열 (레이어 스택 테스트 노드 포함)
  const [cards, setCards] = useState([...DUMMY_CARDS, ...LAYER_STACK_TEST_NODES])

  // 카드 간 연결선(엣지) 배열
  const [edges, setEdges] = useState(DUMMY_EDGES)

  // 카드를 직접 클릭했을 때 선택된 카드 ID → 파란 테두리 + 툴바 표시
  const [selectedCardId, setSelectedCardId] = useState(null)

  // ⓘ 버튼을 클릭했을 때 선택된 카드 ID → 파란 테두리 + 사이드패널 열기 (툴바 없음)
  const [infoCardId, setInfoCardId] = useState(null)

  // 사이드패널 현재 활성 탭 ('info': 생성 정보 / 'ux': UX 평가)
  const [sidePanelTab, setSidePanelTab] = useState('info')

  // 현재 열려 있는 모달 종류 (null: 닫힘 / 'expand': 확장하기 / 'transform': 변형하기 / 'write': 직접작성)
  const [activeModal, setActiveModal] = useState(null)

  // 모달의 현재 단계 (1 → 2 → 3 순서로 진행)
  const [modalStep, setModalStep] = useState(1)

  // 모달 각 단계에서 사용자가 선택한 값
  const [modalSelection, setModalSelection] = useState({})

  // 모달에서 사용자가 직접 입력한 텍스트
  const [modalUserInput, setModalUserInput] = useState('')

  // React Flow가 모든 노드의 DOM 크기 측정을 완료했는지 여부
  // 새 노드가 추가되면 false → true로 다시 순환하므로, 카드 추가 시 자동으로 레이아웃 재계산 트리거됨
  const nodesInitialized = useNodesInitialized()

  // 현재 React Flow 스토어에 등록된 노드 배열을 가져오는 함수
  // node.measured(실제 DOM 크기)가 채워진 상태로 반환됨
  const { getNodes } = useReactFlow()

  // 모든 노드 크기 측정 완료 시 Dagre 레이아웃 재계산
  // nodesInitialized가 true가 될 때마다 실행: 초기 로드 시 + 새 카드 추가 시
  useEffect(() => {
    if (!nodesInitialized) return

    // node.measured가 채워진 최신 노드 배열로 레이아웃 계산
    const measuredNodes = getNodes()
    const { nodes: layoutedNodes } = getLayoutedElements(measuredNodes, edges)

    // 레이아웃 결과를 cards 상태에 반영 (위치만 업데이트, 나머지 data는 보존)
    setCards((prev) =>
      prev.map((card) => {
        const layouted = layoutedNodes.find((n) => n.id === card.id)
        return layouted ? { ...card, position: layouted.position } : card
      })
    )
  }, [nodesInitialized]) // eslint-disable-line react-hooks/exhaustive-deps

  // 선택된 파생카드의 바로 위 부모 카드 ID 계산
  // → 해당 부모 카드에 주황 테두리(highlighted) 표시
  // selectedCardId가 없거나 씨드카드이면 null 반환
  const parentId = useMemo(() => {
    if (!selectedCardId) return null
    const edge = edges.find((e) => e.target === selectedCardId)
    return edge?.source ?? null
  }, [selectedCardId, edges])

  // ⓘ 버튼 클릭 핸들러: 사이드패널 열기 + 툴바 숨김
  const handleInfoClick = useCallback((id) => {
    setInfoCardId(id)
    setSelectedCardId(null)
  }, [])

  // 카드 클릭 핸들러: 툴바 표시 + 사이드패널 닫힘
  const handleNodeClick = useCallback((event, node) => {
    setSelectedCardId(node.id)
    setInfoCardId(null)
    // 모달 구현 전 임시 처리: 모달이 없는 상태에서 다른 카드를 클릭하면
    // 이전 툴바 버튼의 active 상태가 유지되는 버그 방지.
    // 모달 구현 후에는 오버레이가 모든 클릭을 차단하므로 실질적으로 동작하지 않음.
    setActiveModal(null)
  }, [])

  // 캔버스 빈 공간 클릭: 모든 선택 상태 해제
  const handlePaneClick = useCallback(() => {
    setSelectedCardId(null)
    setInfoCardId(null)
    // 모달 구현 전 임시 처리: 모달이 없는 상태에서 캔버스를 클릭하면
    // 툴바가 사라지면서 active 상태가 남는 버그 방지.
    // 모달 구현 후에는 오버레이가 모든 클릭을 차단하므로 실질적으로 동작하지 않음.
    setActiveModal(null)
  }, [])

  // 선택된 카드 데이터: ExpandModal에 전달 (AI 연동 시 Step 2 예시 생성에 사용 예정)
  const selectedCard = cards.find((c) => c.id === selectedCardId) ?? null

  // 사이드패널에 표시할 카드 데이터 (raw cards 사용 — isSelected 등 주입 전 원본)
  const infoCard = cards.find((c) => c.id === infoCardId) ?? null

  // 아이디어 출처 섹션용 직속 부모 카드
  const infoParentCard = useMemo(() => {
    if (!infoCardId) return null
    const edge = edges.find((e) => e.target === infoCardId)
    if (!edge) return null
    return cards.find((c) => c.id === edge.source) ?? null
  }, [infoCardId, edges, cards])

  // 확장하기 모달 완료: 새 파생카드(tagType: 'expand') + 엣지를 상태에 추가
  // AI 연동 전 임시: title = toolName + " 적용 아이디어", description = answer(placeholder), answer = 사용자 원문
  const handleExpandSubmit = useCallback((answer, toolName, question) => {
    const newId = `derived-${Date.now()}`

    setCards((prev) => [
      ...prev,
      {
        id: newId,
        type: 'derived',
        position: { x: 0, y: 0 },
        data: { title: `${toolName} 적용 아이디어`, description: answer, answer, tagType: 'expand', tagName: toolName, question },
      },
    ])

    setEdges((prev) => [
      ...prev,
      { id: `e-${selectedCardId}-${newId}`, source: selectedCardId, target: newId },
    ])

    setActiveModal(null)
  }, [selectedCardId])

  // 변형하기 모달 완료: 새 파생카드(tagType: 'transform') + 엣지를 상태에 추가
  // AI 연동 전 임시: title = toolName + " 적용 아이디어", description = answer(placeholder), answer = 사용자 원문
  const handleTransformSubmit = useCallback((answer, toolName, question) => {
    const newId = `derived-${Date.now()}`

    setCards((prev) => [
      ...prev,
      {
        id: newId,
        type: 'derived',
        position: { x: 0, y: 0 },
        data: { title: `${toolName} 적용 아이디어`, description: answer, answer, tagType: 'transform', tagName: toolName, question },
      },
    ])

    setEdges((prev) => [
      ...prev,
      { id: `e-${selectedCardId}-${newId}`, source: selectedCardId, target: newId },
    ])

    setActiveModal(null)
  }, [selectedCardId])

  // 직접작성 모달 완료: 새 파생카드 + 엣지를 상태에 추가
  // 레이아웃 재계산은 useNodesInitialized useEffect가 자동 처리
  // (새 노드가 추가되면 React Flow가 크기를 측정하고 nodesInitialized가 true가 되면서 레이아웃 실행됨)
  const handleWriteSubmit = useCallback((title, description) => {
    const newId = `derived-${Date.now()}`

    // 새 파생카드: tagType null = 직접작성 (태그 버튼 없음)
    // position은 임시값 — useEffect에서 Dagre가 실제 위치로 덮어씀
    setCards((prev) => [
      ...prev,
      {
        id: newId,
        type: 'derived',
        position: { x: 0, y: 0 },
        data: { title, description, tagType: null, tagName: null },
      },
    ])

    // 선택된 카드 → 새 파생카드 연결 엣지 추가
    setEdges((prev) => [
      ...prev,
      { id: `e-${selectedCardId}-${newId}`, source: selectedCardId, target: newId },
    ])

    setActiveModal(null)
  }, [selectedCardId])

  // 카드 드래그 등 React Flow 내부 노드 변경사항 처리 (위치 이동 등)
  const handleNodesChange = useCallback((changes) => {
    setCards((prev) => applyNodeChanges(changes, prev))
  }, [])

  // 렌더링 직전 카드 배열에 동적 상태값(isSelected, isHighlighted, 핸들러) 주입
  // cards 배열에는 저장하지 않고 매 렌더링마다 계산해서 React Flow에 전달
  const nodes = useMemo(
    () =>
      cards.map((card) => ({
        ...card,
        data: {
          ...card.data,
          // 카드 직접 클릭 또는 ⓘ 클릭 시 모두 파란 테두리 표시
          isSelected: card.id === selectedCardId || card.id === infoCardId,
          // 선택된 카드의 바로 위 부모 카드에만 주황 테두리 표시
          isHighlighted: card.id === parentId,
          onInfoClick: handleInfoClick,
        },
      })),
    [cards, selectedCardId, infoCardId, parentId, handleInfoClick]
  )

  return (
    <div style={{ width: '100%', height: '100vh', background: '#F1F3F4' }}>
      {/* 확장하기 모달: activeModal이 'expand'일 때만 표시 */}
      {activeModal === 'expand' && (
        <ExpandModal
          selectedCard={selectedCard}
          onClose={() => setActiveModal(null)}
          onSubmit={handleExpandSubmit}
        />
      )}

      {/* 변형하기 모달: activeModal이 'transform'일 때만 표시 */}
      {activeModal === 'transform' && (
        <TransformModal
          selectedCard={selectedCard}
          onClose={() => setActiveModal(null)}
          onSubmit={handleTransformSubmit}
        />
      )}

      {/* 직접작성 모달: activeModal이 'write'일 때만 표시 */}
      {activeModal === 'write' && (
        <WriteModal
          onClose={() => setActiveModal(null)}
          onSubmit={handleWriteSubmit}
        />
      )}

      {/* 사이드패널: ⓘ 클릭 시 화면 우측 고정 표시 */}
      {infoCardId && (
        <SidePanel
          card={infoCard}
          parentCard={infoParentCard}
          tab={sidePanelTab}
          onTabChange={setSidePanelTab}
          onClose={() => setInfoCardId(null)}
        />
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        deleteKeyCode={null}        // 키보드 Delete/Backspace로 카드가 삭제되지 않도록 비활성화
        onNodesChange={handleNodesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        defaultEdgeOptions={{
          type: 'step',             // 연결선 직각 스타일 (모든 엣지가 핸들 정중앙 한 점에서 출발)
          style: { stroke: '#000', strokeWidth: 3 },
        }}
        fitView                     // 초기 렌더링 시 모든 카드가 화면에 맞게 자동 조정
      >
        {/* 단일 카드 선택 시 하단 중앙에 툴바 고정 표시 */}
        {selectedCardId && (
          <Panel position="bottom-center" style={{ marginBottom: '20px' }}>
            <Toolbar
              activeModal={activeModal}
              onExpand={() => setActiveModal('expand')}
              onTransform={() => setActiveModal('transform')}
              onWrite={() => setActiveModal('write')}
              onAddToCollection={() => {/* TODO: 모음추가 기능 */}}
            />
          </Panel>
        )}
      </ReactFlow>
    </div>
  )
}

export default App
