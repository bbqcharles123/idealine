import { useState, useCallback, useMemo, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
import { ReactFlow, applyNodeChanges, Panel, useNodesInitialized, useReactFlow } from '@xyflow/react'
import SeedCard from './components/SeedCard'
import DerivedCard from './components/DerivedCard'
import LayerStackNode from './components/LayerStackNode'
import Toolbar from './components/Toolbar'
import WriteModal from './components/modals/WriteModal'
import ExpandModal from './components/modals/ExpandModal'
import TransformModal from './components/modals/TransformModal'
import StartModal from './components/modals/StartModal'
import SidePanel from './components/SidePanel'
import CanvasHeader from './components/CanvasHeader'
import { getLayoutedElements } from './utils/layout'
import { generateDerivedCard, phrasesToHighlights, generateWriteCard } from './ai/deriveCard'

// React Flow에 커스텀 노드 타입 등록
const nodeTypes = {
  seed: SeedCard,
  derived: DerivedCard,
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

  // 시작 모달 표시 여부
  const [isStartModalOpen, setIsStartModalOpen] = useState(false)

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

  // React Flow 스토어에서 최신 노드 배열 가져오는 함수
  const { getNodes } = useReactFlow()

  // Firestore에서 캔버스 데이터 초기 로드
  useEffect(() => {
    if (!canvasId || canvasId === 'new') {
      setLoadingCanvas(false)
      setIsStartModalOpen(true)
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
  }, [effectiveCardId, canvasId, cards, edges])

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

  // 시작 모달 완료
  const handleStartSubmit = useCallback(() => {
    setIsStartModalOpen(false)
  }, [])

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
    } catch (err) {
      console.error('직접작성 카드 생성 실패:', err)
      alert('카드 생성에 실패했습니다. 다시 시도해주세요.')
    }
  }, [effectiveCardId, canvasId, cards, edges])

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
          onWriteLayerToggle: card.data?.toolType === 'write' ? handleWriteLayerToggle : undefined,
        },
      })),
    [cards, selectedCardId, infoCardId, parentId, handleInfoClick, handleToolOpen, handleWriteLayerToggle]
  )

  // Firestore 로드 완료 전에는 빈 화면 표시
  if (loadingCanvas) {
    return <div style={{ width: '100%', height: '100vh', background: '#F1F3F4' }} />
  }

  return (
    <div style={{ width: '100%', height: '100vh', background: '#F1F3F4' }}>
      {/* 캔버스 상단 고정 헤더 */}
      <CanvasHeader title={canvasTitle} onTitleChange={setCanvasTitle} />

      {/* 시작 카드 생성 모달 */}
      {isStartModalOpen && (
        <StartModal
          onClose={() => setIsStartModalOpen(false)}
          onSubmit={handleStartSubmit}
        />
      )}

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
          style: { stroke: '#9E9E9E', strokeWidth: 1.5 },
          pathOptions: { borderRadius: 8 },
        }}
        fitView
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
