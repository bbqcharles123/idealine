import dagre from '@dagrejs/dagre'

// Dagre 그래프 인스턴스: 노드와 엣지의 위치를 자동 계산하는 레이아웃 엔진
// 모듈 레벨에서 한 번만 생성해 재사용
const dagreGraph = new dagre.graphlib.Graph()
dagreGraph.setDefaultEdgeLabel(() => ({}))

// 레이아웃 계산에 사용할 카드 크기 기준값
// NODE_HEIGHT는 실제 카드 높이가 가변이므로 현재 고정값(200)을 사용 중
// 추후 실제 DOM 높이를 측정해 전달하는 방식으로 개선 필요
const NODE_WIDTH = 356
const NODE_HEIGHT = 200

// 노드와 엣지 배열을 받아 Dagre로 자동 배치된 위치가 적용된 노드 배열을 반환
// direction: 'TB' (위→아래) 또는 'LR' (왼쪽→오른쪽)
export function getLayoutedElements(nodes, edges, direction = 'TB') {
  // 그래프 방향 설정 (rankdir: TB = Top to Bottom)
  dagreGraph.setGraph({ rankdir: direction })

  // Dagre 그래프에 각 노드 등록 (id와 크기 정보 전달)
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  })

  // Dagre 그래프에 각 엣지 등록 (연결 관계만 전달, 위치는 Dagre가 계산)
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  // Dagre 레이아웃 알고리즘 실행 → 각 노드의 중심 좌표(x, y)가 계산됨
  dagre.layout(dagreGraph)

  // Dagre가 계산한 중심 좌표를 React Flow 좌표계(좌상단 기준)로 변환
  // Dagre는 노드 중심 좌표를 반환하므로, width/height의 절반을 빼서 좌상단 좌표로 변환
  const layoutedNodes = nodes.map((node) => {
    const { x, y } = dagreGraph.node(node.id)
    return {
      ...node,
      position: {
        x: x - NODE_WIDTH / 2,
        y: y - NODE_HEIGHT / 2,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}
