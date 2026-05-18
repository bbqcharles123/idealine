import { useState, useCallback, useMemo } from 'react'
import { ReactFlow, applyNodeChanges, Panel } from '@xyflow/react'
import SeedCard from './components/SeedCard'
import DerivedCard from './components/DerivedCard'
import Toolbar from './components/Toolbar'

// React Flow에 커스텀 노드 타입 등록
// 'seed' → SeedCard 컴포넌트, 'derived' → DerivedCard 컴포넌트
const nodeTypes = {
  seed: SeedCard,
  derived: DerivedCard,
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
    },
  },
  {
    id: 'derived-1',
    type: 'derived',
    position: { x: 200, y: 400 },
    data: {
      title: '근무 유형별 루틴 자동 전환',
      description:
        '재택·출근 등 그날의 근무 유형을 감지해 각각에 맞는 루틴으로 자동 전환되는 기능. 출근일에는 아침 준비 시간을 반영해 운동을 저녁으로 재배치하고, 재택일에는 이동 시간이 없는 만큼 오전 루틴을 더 촘촘하게 구성한다. 하나의 루틴을 억지로 따르는 대신 삶의 패턴에 맞게 복제된 루틴이 상황에 따라 작동한다.',
      tagType: 'expand',
      tagName: '복제',
    },
  },
  {
    id: 'derived-2',
    type: 'derived',
    position: { x: 600, y: 400 },
    data: {
      title: '온디맨드 루틴 피드',
      description:
        '푸시 알림을 제거하고 사용자가 앱을 여는 순간 현재 시간·위치·패턴 데이터를 즉시 분석해 지금 이 순간에 맞는 루틴을 바로 제시하는 방식. 알림에 의해 끌려가는 루틴이 아니라 사용자가 필요할 때 능동적으로 확인하는 경험으로 전환하여 알림 피로 없이 루틴 유지율을 높인다.',
      tagType: 'transform',
      tagName: '제거',
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

  // 캔버스에 표시되는 전체 카드(노드) 배열
  const [cards, setCards] = useState(DUMMY_CARDS)

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
  }, [])

  // 캔버스 빈 공간 클릭: 모든 선택 상태 해제
  const handlePaneClick = useCallback(() => {
    setSelectedCardId(null)
    setInfoCardId(null)
  }, [])

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
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        deleteKeyCode={null}        // 키보드 Delete/Backspace로 카드가 삭제되지 않도록 비활성화
        onNodesChange={handleNodesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        defaultEdgeOptions={{
          type: 'smoothstep',       // 연결선 곡선 스타일
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
