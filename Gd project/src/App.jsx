import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
import { ReactFlow, applyNodeChanges, Panel, useNodesInitialized, useReactFlow } from '@xyflow/react'
import SeedCard from './components/SeedCard'
import LayerStackNode from './components/LayerStackNode'
import Toolbar from './components/Toolbar'
import WriteModal from './components/modals/WriteModal'
import ExpandModal from './components/modals/ExpandModal'
import TransformModal from './components/modals/TransformModal'
import SidePanel from './components/SidePanel'
import CanvasHeader from './components/CanvasHeader'
import { getLayoutedElements } from './utils/layout'
import { generateDerivedCard, phrasesToHighlights, generateWriteCard } from './ai/deriveCard'

// React Flow에 커스텀 노드 타입 등록
// seed: 씨드카드 / layerstack: 파생카드(레이어 스택 방식)
const nodeTypes = {
  seed: SeedCard,
  layerstack: LayerStackNode,
}

// Firestore 문서를 업데이트하는 헬퍼
// cards/edges 배열을 저장할 때, expandCount/transformCount/writeCount도 함께 갱신
async function syncToFirestore(canvasId, nextCards, nextEdges) {
  if (!canvasId || canvasId === 'new') return

  const expandCount  = nextCards.filter((c) => c.data?.toolType === 'expand').length
  const transformCount = nextCards.filter((c) => c.data?.toolType === 'transform').length
  const writeCount   = nextCards.filter((c) => c.data?.toolType === 'write').length

  // React Flow 내부 전용 필드(measured, selected 등)와 함수 props는 Firestore에 저장하지 않음
  // JSON 직렬화/역직렬화로 함수와 undefined 값을 한 번에 제거 (Firestore는 undefined 거부)
  const serializableCards = nextCards.map(({ id, type, position, data }) =>
    JSON.parse(JSON.stringify({ id, type, position, data }))
  )

  await updateDoc(doc(db, 'canvases', canvasId), {
    cards: serializableCards,
    edges: JSON.parse(JSON.stringify(nextEdges)),
    expandCount,
    transformCount,
    writeCount,
  })
}

function App() {
  // URL 파라미터에서 캔버스 id 추출 (/canvas/:id)
  const { id: canvasId } = useParams()

  // 캔버스 제목
  const [canvasTitle, setCanvasTitle] = useState('')

  // Firestore 로드 상태
  const [loadingCanvas, setLoadingCanvas] = useState(true)

  // 캔버스에 표시되는 전체 카드(노드) 배열
  const [cards, setCards] = useState([])

  // 카드 간 연결선(엣지) 배열
  const [edges, setEdges] = useState([])

  // 카드를 직접 클릭했을 때 선택된 카드 ID → 파란 테두리 + 툴바 표시
  const [selectedCardId, setSelectedCardId] = useState(null)

  // ⓘ 버튼을 클릭했을 때 선택된 카드 ID → 파란 테두리 + 사이드패널 열기 (툴바 없음)
  const [infoCardId, setInfoCardId] = useState(null)

  // 사이드패널 현재 활성 탭
  const [sidePanelTab, setSidePanelTab] = useState('info')

  // 현재 열려 있는 모달 종류
  const [activeModal, setActiveModal] = useState(null)

  // write 카드 도구 레이어 펼침 시 추천 도구
  const [writeRecTool, setWriteRecTool] = useState(null)

  // write 카드 도구 레이어가 펼쳐진 카드 ID
  const [writeLayerCardId, setWriteLayerCardId] = useState(null)

  // React Flow 노드 크기 측정 완료 여부
  const nodesInitialized = useNodesInitialized()

  // React Flow 스토어에서 최신 노드 배열 가져오는 함수 + 뷰포트를 노드에 맞추는 함수
  const { getNodes, fitView } = useReactFlow()

  // 캔버스 진입 후 화면 맞추기를 이미 실행했는지 여부
  // 최초 1회만 true가 되며, 이후 파생카드 생성 시에는 사용자가 맞춰둔 위치·확대를 건드리지 않는다
  const hasFitViewRef = useRef(false)

  // 첫 화면 맞추기가 끝났는지 여부
  // 카드가 좌측 상단에 그려진 프레임이 보이지 않도록, 이 값이 true가 될 때까지 캔버스를 감춰둔다
  const [isViewportReady, setIsViewportReady] = useState(false)

  // Firestore에서 캔버스 데이터 초기 로드
  useEffect(() => {
    // 유효한 캔버스 id가 없으면 로드할 것이 없다
    // 씨드카드 생성은 홈 화면에서 이루어지므로, 정상 흐름에서는 이 분기에 도달하지 않는다
    if (!canvasId || canvasId === 'new') {
      setLoadingCanvas(false)
      return
    }

    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'canvases', canvasId))
        if (snap.exists()) {
          const data = snap.data()
          setCanvasTitle(data.title ?? '')
          setCards(data.cards ?? [])
          setEdges(data.edges ?? [])
        }
      } catch (err) {
        console.error('캔버스 로드 실패:', err)
      } finally {
        setLoadingCanvas(false)
      }
    }

    load()
  }, [canvasId])

  // 모든 노드 크기 측정 완료 시 Dagre 레이아웃 재계산
  useEffect(() => {
    if (!nodesInitialized) return

    const measuredNodes = getNodes()
    const { nodes: layoutedNodes } = getLayoutedElements(measuredNodes, edges)

    setCards((prev) =>
      prev.map((card) => {
        const layouted = layoutedNodes.find((n) => n.id === card.id)
        return layouted ? { ...card, position: layouted.position } : card
      })
    )

    // 캔버스 진입 직후 첫 레이아웃일 때만 화면을 카드에 맞춘다
    // ReactFlow의 fitView prop은 Dagre 재배치 이전 좌표로 계산되어 카드가 화면 밖으로 밀리므로,
    // 재배치가 화면에 반영된 다음 프레임에 직접 호출한다
    // duration을 주지 않아 애니메이션 없이 즉시 중앙에 맞춘 뒤, 그 다음에 캔버스를 보여준다
    // fitView가 뷰포트에 반영되는 것을 기다리고(await) 한 프레임 더 넘긴 뒤 공개해야
    // 카드가 좌측 상단에 있는 프레임이 새어 나오지 않는다
    if (!hasFitViewRef.current) {
      hasFitViewRef.current = true
      requestAnimationFrame(async () => {
        await fitView({ padding: 0.2, maxZoom: 1 })
        requestAnimationFrame(() => setIsViewportReady(true))
      })
    }
  }, [nodesInitialized]) // eslint-disable-line react-hooks/exhaustive-deps

  // 선택된 파생카드의 바로 위 부모 카드 ID 계산
  const parentId = useMemo(() => {
    if (!selectedCardId) return null
    const edge = edges.find((e) => e.target === selectedCardId)
    return edge?.source ?? null
  }, [selectedCardId, edges])

  // 도구 레이어 클릭 핸들러
  const handleToolOpen = useCallback((cardId) => {
    setInfoCardId((prev) => (prev !== null && prev !== cardId ? null : prev))
  }, [])

  // 펼친 노드별 { descendants, delta } 저장 — 접힘 시 복귀에 사용
  // (상태가 아닌 ref로 관리해 불필요한 리렌더링 방지)
  const expandedNodeDeltasRef = useRef({})

  // LayerStackNode.css의 --overlap과 반드시 동일하게 유지
  const TOOL_OVERLAP = 20
  // LayerStackNode.jsx의 PEEK_HEIGHT와 반드시 동일하게 유지 (idle 시 카드 아래 노출 높이)
  const PEEK_HEIGHT = 42

  // 도구 레이어 펼침: 실제 도구 레이어 DOM 높이를 받아 하위 노드를 아래로 밀어냄
  // delta = 도구 레이어가 펼쳐지며 "카드 아래로 보이는 하단"이 자라난 양
  //       = (펼친 후 도구 레이어가 카드 하단 아래로 뻗는 높이) - (idle 시 노출 높이)
  //       = (toolHeight - OVERLAP) - PEEK_HEIGHT
  // 이 값만큼만 하위 노드를 내리면, 각 노드가 펼치기 전 가지고 있던 간격을
  // 실제 위치와 무관하게 그대로 보존한다 (사용자가 노드를 옮긴 뒤에도 겹치지 않음)
  // delta > 0 인 경우에만 이동 (도구 레이어가 기존 peek보다 더 내려오지 않으면 이동 불필요)
  const handleToolExpand = useCallback((nodeId, toolHeight) => {
    const delta = toolHeight - TOOL_OVERLAP - PEEK_HEIGHT
    if (delta <= 0) return

    // BFS로 nodeId의 모든 하위 노드(자식·손자·...) ID 수집
    const descendants = []
    const visited = new Set()
    const queue = [nodeId]
    while (queue.length) {
      const cur = queue.shift()
      edges.filter((e) => e.source === cur).forEach((e) => {
        if (!visited.has(e.target)) {
          visited.add(e.target)
          descendants.push(e.target)
          queue.push(e.target)
        }
      })
    }
    if (descendants.length === 0) return

    expandedNodeDeltasRef.current[nodeId] = { descendants, delta }
    setCards((prev) =>
      prev.map((card) =>
        descendants.includes(card.id)
          ? { ...card, position: { ...card.position, y: card.position.y + delta } }
          : card
      )
    )
  }, [edges])

  // 도구 레이어 접힘: 펼칠 때 이동한 만큼 하위 노드를 원래 위치로 복귀
  const handleToolCollapse = useCallback((nodeId) => {
    const entry = expandedNodeDeltasRef.current[nodeId]
    if (!entry) return
    const { descendants, delta } = entry
    delete expandedNodeDeltasRef.current[nodeId]
    setCards((prev) =>
      prev.map((card) =>
        descendants.includes(card.id)
          ? { ...card, position: { ...card.position, y: card.position.y - delta } }
          : card
      )
    )
  }, [])

  // write 카드 도구 레이어 펼침/접힘 핸들러
  const handleWriteLayerToggle = useCallback((isOpen, recTool, cardId) => {
    setWriteRecTool(isOpen ? recTool : null)
    setWriteLayerCardId(isOpen ? cardId : null)
  }, [])

  // ⓘ 버튼 클릭 핸들러
  const handleInfoClick = useCallback((id) => {
    setInfoCardId(id)
    setSelectedCardId(null)
    setWriteRecTool(null)
    setWriteLayerCardId(null)
  }, [])

  // 카드 클릭 핸들러
  const handleNodeClick = useCallback((event, node) => {
    setSelectedCardId(node.id)
    setInfoCardId(null)
    setActiveModal(null)
    setWriteRecTool(null)
    setWriteLayerCardId(null)
  }, [])

  // 캔버스 빈 공간 클릭: 모든 선택 상태 해제
  const handlePaneClick = useCallback(() => {
    setSelectedCardId(null)
    setInfoCardId(null)
    setActiveModal(null)
    setWriteRecTool(null)
    setWriteLayerCardId(null)
  }, [])

  // 카드 생성 직후 새 카드로 선택을 옮긴다 (카드를 직접 클릭한 것과 같은 상태)
  // 왜 부모 선택을 유지하지 않는가:
  //  1) 화면을 건드리지 않고 "무엇이 생겼는지" 알리는 유일한 신호다.
  //     파생카드는 파란 배경·테두리(isSelected), 부모는 노란 배경·테두리(isHighlighted)가 되어
  //     생성 결과와 그 출처가 한눈에 구분된다. (뷰포트는 자동 조정하지 않기로 했으므로 카메라는 그대로 둔다)
  //  2) 부모 선택을 유지하면 생성 직후 파란 카드가 방금 만든 카드가 아니라 예전 부모다.
  //     그 상태에서 툴바의 확장하기를 누르면 새 카드가 아니라 부모에서 또 파생되어 대상이 어긋난다.
  // 부모로 다른 도구를 쓰고 싶으면 노란색으로 표시된 부모를 한 번 클릭하면 된다.
  const selectNewCard = useCallback((newId) => {
    setSelectedCardId(newId)
    setInfoCardId(null)
    setWriteRecTool(null)
    setWriteLayerCardId(null)
  }, [])

  // 툴바 및 모달 연산의 기준 카드 ID
  const effectiveCardId = selectedCardId ?? writeLayerCardId

  // 선택된 카드 데이터
  const selectedCard = cards.find((c) => c.id === effectiveCardId) ?? null

  // 사이드패널에 표시할 카드 데이터
  const infoCard = cards.find((c) => c.id === infoCardId) ?? null

  // 아이디어 출처 섹션용 직속 부모 카드
  const infoParentCard = useMemo(() => {
    if (!infoCardId) return null
    const edge = edges.find((e) => e.target === infoCardId)
    if (!edge) return null
    return cards.find((c) => c.id === edge.source) ?? null
  }, [infoCardId, edges, cards])

  // 파생카드 생성 공통 로직(호출 5): AI로 본문·하이라이트·UX평가를 받아 카드 추가
  // toolType: 'expand' | 'transform'
  const createDerivedCard = useCallback(async (answer, toolName, question, toolType) => {
    // 부모 카드 본문을 AI 입력으로 사용
    const parent = cards.find((c) => c.id === effectiveCardId)
    const result = await generateDerivedCard(parent?.data?.description ?? '', question, answer, toolName, toolType)

    // AI가 반환한 강조 문구를 answer 기준 {start,end} 인덱스로 변환
    const highlights = phrasesToHighlights(answer, result.highlightPhrases)

    const newId = `derived-${Date.now()}`
    const newCard = {
      id: newId,
      type: 'layerstack',
      position: { x: 0, y: 0 },
      data: {
        title: result.title,
        description: result.description,
        answer,                  // 사용자 원문 (사이드패널 Q&A)
        question,                // 모달 질문 (사이드패널 Q&A)
        highlights,              // Q&A 답변 하이라이트
        uxData: result.uxData,   // UX 평가 탭
        toolType,
        tagName: toolName,
      },
    }
    const newEdge = { id: `e-${effectiveCardId}-${newId}`, source: effectiveCardId, target: newId }
    const nextCards = [...cards, newCard]
    const nextEdges = [...edges, newEdge]

    setCards(nextCards)
    setEdges(nextEdges)
    syncToFirestore(canvasId, nextCards, nextEdges)
    setActiveModal(null)
    // 모달을 닫으면서 방금 만든 파생카드를 선택 상태로 만든다
    selectNewCard(newId)
  }, [effectiveCardId, canvasId, cards, edges, selectNewCard])

  // 확장하기 모달 완료
  const handleExpandSubmit = useCallback(async (answer, toolName, question) => {
    try {
      await createDerivedCard(answer, toolName, question, 'expand')
    } catch (err) {
      console.error('파생 카드 생성 실패:', err)
      alert('파생 카드 생성에 실패했습니다. 다시 시도해주세요.')
    }
  }, [createDerivedCard])

  // 변형하기 모달 완료
  const handleTransformSubmit = useCallback(async (answer, toolName, question) => {
    try {
      await createDerivedCard(answer, toolName, question, 'transform')
    } catch (err) {
      console.error('파생 카드 생성 실패:', err)
      alert('파생 카드 생성에 실패했습니다. 다시 시도해주세요.')
    }
  }, [createDerivedCard])

  // 직접작성 모달 완료(호출 6): AI로 추천 도구·기대효과·추천이유·UX평가를 받아 카드 추가
  const handleWriteSubmit = useCallback(async (title, description) => {
    try {
      const result = await generateWriteCard(title, description)
      const newId = `derived-${Date.now()}`
      const newCard = {
        id: newId,
        type: 'layerstack',
        position: { x: 0, y: 0 },
        data: {
          title,
          description,
          toolType: 'write',
          writeRec: result.writeRec,             // 추천 카테고리 (도구레이어·RecToolCard)
          writeExpect: result.writeExpect,       // 기대효과 (도구레이어 설명)
          writeRecReason: result.writeRecReason, // 추천 이유 (상세패널)
          uxData: result.uxData,                 // UX 평가 탭
        },
      }
      const newEdge = { id: `e-${effectiveCardId}-${newId}`, source: effectiveCardId, target: newId }
      const nextCards = [...cards, newCard]
      const nextEdges = [...edges, newEdge]

      setCards(nextCards)
      setEdges(nextEdges)
      syncToFirestore(canvasId, nextCards, nextEdges)
      setActiveModal(null)
      // 모달을 닫으면서 방금 만든 직접작성 카드를 선택 상태로 만든다
      selectNewCard(newId)
    } catch (err) {
      console.error('직접작성 카드 생성 실패:', err)
      alert('카드 생성에 실패했습니다. 다시 시도해주세요.')
    }
  }, [effectiveCardId, canvasId, cards, edges, selectNewCard])

  // 카드 드래그 등 React Flow 내부 노드 변경사항 처리
  const handleNodesChange = useCallback((changes) => {
    setCards((prev) => applyNodeChanges(changes, prev))
  }, [])

  // 렌더링 직전 카드 배열에 동적 상태값 주입
  const nodes = useMemo(
    () =>
      cards.map((card) => ({
        ...card,
        data: {
          ...card.data,
          isSelected: card.id === selectedCardId || card.id === infoCardId,
          isHighlighted: card.id === parentId,
          onInfoClick: handleInfoClick,
          onToolOpen: handleToolOpen,
          onToolExpand: handleToolExpand,
          onToolCollapse: handleToolCollapse,
          onWriteLayerToggle: card.data?.toolType === 'write' ? handleWriteLayerToggle : undefined,
        },
      })),
    [cards, selectedCardId, infoCardId, parentId, handleInfoClick, handleToolOpen, handleToolExpand, handleToolCollapse, handleWriteLayerToggle]
  )

  // Firestore 로드 완료 전에는 빈 화면 표시
  if (loadingCanvas) {
    return <div style={{ width: '100%', height: '100vh', background: 'var(--color-background)' }} />
  }

  return (
    <div style={{ width: '100%', height: '100vh', background: 'var(--color-background)' }}>
      {/* 캔버스 상단 고정 헤더 */}
      <CanvasHeader title={canvasTitle} onTitleChange={setCanvasTitle} />

      {/* 확장하기 모달 */}
      {activeModal === 'expand' && (
        <ExpandModal
          selectedCard={selectedCard}
          onClose={() => setActiveModal(null)}
          onSubmit={handleExpandSubmit}
        />
      )}

      {/* 변형하기 모달 */}
      {activeModal === 'transform' && (
        <TransformModal
          selectedCard={selectedCard}
          onClose={() => setActiveModal(null)}
          onSubmit={handleTransformSubmit}
        />
      )}

      {/* 직접작성 모달 */}
      {activeModal === 'write' && (
        <WriteModal
          onClose={() => setActiveModal(null)}
          onSubmit={handleWriteSubmit}
        />
      )}

      {/* 사이드패널 */}
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
        deleteKeyCode={null}
        onNodesChange={handleNodesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        defaultEdgeOptions={{
          type: 'smoothstep',
          // 엣지 선 색: --color-disabled와 값이 같지만 엣지는 '비활성 상태'가 아니므로
          // 의미가 맞지 않아 토큰을 쓰지 않고 값으로 둔다
          style: { stroke: '#9E9E9E', strokeWidth: 1.5 },
          pathOptions: { borderRadius: 8 },
        }}
        // 첫 화면 맞추기 전까지 감춰서 카드가 좌측 상단에 있는 순간이 보이지 않게 한다
        // 카드가 없는 새 캔버스는 맞출 대상이 없으므로 바로 보여준다
        style={{ opacity: isViewportReady || cards.length === 0 ? 1 : 0 }}
      >
        {(selectedCardId || writeLayerCardId) && (
          <Panel position="bottom-center" style={{ marginBottom: '20px' }}>
            <Toolbar
              activeModal={activeModal}
              onExpand={() => setActiveModal('expand')}
              onTransform={() => setActiveModal('transform')}
              onWrite={() => setActiveModal('write')}
              recTool={
                selectedCardId === null || selectedCardId === writeLayerCardId
                  ? writeRecTool
                  : null
              }
            />
          </Panel>
        )}
      </ReactFlow>
    </div>
  )
}

export default App
