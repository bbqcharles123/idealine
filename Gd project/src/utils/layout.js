import dagre from '@dagrejs/dagre'

// Dagre 그래프 인스턴스: 모듈 레벨에서 한 번 생성 후 재사용
const dagreGraph = new dagre.graphlib.Graph()
dagreGraph.setDefaultEdgeLabel(() => ({}))

// node.measured가 없을 때 사용하는 기본값
const FALLBACK_WIDTH = 356
const FALLBACK_HEIGHT = 200

// 노드와 엣지 배열을 받아 Dagre로 자동 배치된 위치가 적용된 노드 배열을 반환
// nodes에는 React Flow가 렌더링 후 채워주는 node.measured(실제 DOM 크기)가 포함되어야 정확한 배치 가능
// direction: 'TB' (위→아래) 또는 'LR' (왼쪽→오른쪽)
export function getLayoutedElements(nodes, edges, direction = 'TB') {
  // 이전 호출에서 등록된 노드가 누적되지 않도록 매 호출마다 초기화
  // (싱글톤 그래프 인스턴스를 재사용하기 때문에 초기화하지 않으면 삭제된 노드가 잔류함)
  dagreGraph.nodes().forEach((id) => dagreGraph.removeNode(id))

  // 그래프 방향 및 카드 간 간격 설정
  // nodesep: 같은 rank(행) 내 카드 간 수평 간격 / ranksep: rank(행) 간 수직 간격
  dagreGraph.setGraph({ rankdir: direction, nodesep: 40, ranksep: 60 })

  // 각 노드를 Dagre에 등록
  // node.measured: React Flow가 렌더링 후 실제 DOM 크기를 자동으로 저장하는 속성
  // 실제 크기가 있으면 사용하고, 아직 측정 전이면 기본값으로 대체
  nodes.forEach((node) => {
    const width = node.measured?.width ?? FALLBACK_WIDTH
    const height = node.measured?.height ?? FALLBACK_HEIGHT
    dagreGraph.setNode(node.id, { width, height })
  })

  // 연결 관계 등록 (Dagre가 rank 배치 계산에 사용)
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  // Dagre 레이아웃 알고리즘 실행 → 각 노드의 중심 좌표(x, y) 계산
  dagre.layout(dagreGraph)

  // Dagre 중심 좌표 → React Flow 좌상단 좌표 변환
  // Dagre는 노드 중심 기준 좌표를 반환하므로, 실제 크기의 절반을 빼서 좌상단 기준으로 변환
  const layoutedNodes = nodes.map((node) => {
    const { x, y } = dagreGraph.node(node.id)
    const width = node.measured?.width ?? FALLBACK_WIDTH
    const height = node.measured?.height ?? FALLBACK_HEIGHT
    return {
      ...node,
      position: {
        x: x - width / 2,
        y: y - height / 2,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}
