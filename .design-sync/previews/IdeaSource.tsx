// 아이디어 출처 — 파생카드 사이드패널에서 "이 카드가 어느 카드에서 나왔는지"를 보여준다.
// 클릭하면 캔버스가 부모카드로 이동한다(정적 렌더에서는 이동이 일어나지 않는다).
import { IdeaSource } from 'gd-project'

const panel = { width: 336 }

// 부모카드는 React Flow 노드 형태({ id, data })로 통째로 넘긴다
export const Default = () => (
  <div style={panel}>
    <IdeaSource
      parentCard={{ id: 'seed-1', data: { title: '대학생을 위한 아이디어 발산 도구' } }}
    />
  </div>
)

// 제목이 긴 부모카드 — 말줄임 처리 확인
export const LongTitle = () => (
  <div style={panel}>
    <IdeaSource
      parentCard={{
        id: 'card-7',
        data: { title: '아이디어 카드를 팀원과 함께 편집하고 회고까지 남길 수 있는 협업 캔버스' },
      }}
    />
  </div>
)
