// UX 영역별 평가 아코디언 — 사이드패널 'UX 평가' 탭의 주요 블록.
// 실제 데이터 형태: { name, status, evaluation, criteria: [{ name, needsImprovement }] }
import { UxAreaAccordion } from 'gd-project'

// 폭 제약: 사이드패널은 384px, 좌우 패딩을 뺀 실제 콘텐츠 폭에 맞춘다
const panel = { width: 336 }

// 보완이 필요한 영역 — 상태 배지가 '보완', 평가요소 태그 일부가 노란 경고
export const NeedsImprovement = () => (
  <div style={panel}>
    <UxAreaAccordion
      area={{
        name: 'Business',
        status: 'supplement',
        evaluation:
          '수익 모델이 아직 드러나지 않는다. 무료 아이디어 도구는 많으므로, 팀 단위 협업이나 결과물 내보내기처럼 돈을 낼 이유가 되는 지점을 한 군데는 정해 두는 편이 좋다.',
        criteria: [
          { name: '시장성', needsImprovement: true },
          { name: '수익성', needsImprovement: true },
          { name: '차별성', needsImprovement: false },
        ],
      }}
    />
  </div>
)

// 기준을 충족한 영역 — 상태 배지가 '충족', 태그는 전부 일반 회색
export const Satisfied = () => (
  <div style={panel}>
    <UxAreaAccordion
      area={{
        name: 'Human',
        status: 'satisfied',
        evaluation:
          '빈 화면 앞에서 막막해지는 순간을 도구가 대신 질문해 주는 방식으로 풀었다. 사용자가 아이디어를 "고르는" 행동만 하면 되므로 진입 부담이 낮다.',
        criteria: [
          { name: '사용성', needsImprovement: false },
          { name: '접근성', needsImprovement: false },
          { name: '만족도', needsImprovement: false },
        ],
      }}
    />
  </div>
)

// 접힌 상태 — 헤더만 남아 영역명과 상태만 훑을 수 있다
export const Collapsed = () => (
  <div style={panel}>
    <UxAreaAccordion
      defaultOpen={false}
      area={{
        name: 'Social',
        status: 'supplement',
        evaluation:
          '아이디어의 사회적 파급이나 부작용을 검토하는 단계가 없다.',
        criteria: [
          { name: '공공성', needsImprovement: true },
          { name: '지속가능성', needsImprovement: false },
        ],
      }}
    />
  </div>
)

// 세 영역을 쌓은 실제 배치 — UX 평가 탭에서 사용자가 보게 되는 모습
export const PanelStack = () => (
  <div style={{ ...panel, display: 'flex', flexDirection: 'column', gap: 12 }}>
    <UxAreaAccordion
      area={{
        name: 'Business',
        status: 'supplement',
        evaluation: '수익 모델이 아직 드러나지 않는다.',
        criteria: [
          { name: '시장성', needsImprovement: true },
          { name: '차별성', needsImprovement: false },
        ],
      }}
    />
    <UxAreaAccordion
      defaultOpen={false}
      area={{
        name: 'Human',
        status: 'satisfied',
        evaluation: '진입 부담이 낮다.',
        criteria: [{ name: '사용성', needsImprovement: false }],
      }}
    />
    <UxAreaAccordion
      defaultOpen={false}
      area={{
        name: 'Social',
        status: 'supplement',
        evaluation: '사회적 파급 검토가 없다.',
        criteria: [{ name: '공공성', needsImprovement: true }],
      }}
    />
  </div>
)
