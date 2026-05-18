# 아이디어 발산 서비스 — 프로젝트 컨텍스트

## 서비스 개요
아이디어 카드(노드)를 생성하고 확장/변형하는 아이디어 발산 도구.
씨드카드(초기 아이디어)에서 파생카드가 트리 구조로 생성된다.

## 기술 스택
- React (Vite)
- React Flow (@xyflow/react) — 캔버스 및 카드 트리 구현
- Dagre (@dagrejs/dagre) — 트리 레이아웃 자동 계산
- CSS (일반 CSS, Tailwind 미사용, CSS Modules 미사용)

## 디자인 시안
- Figma: https://www.figma.com/design/yZ41AtAYIZrZvdfuUmhFbL/%EC%BA%A1%EC%8A%A4%ED%86%A4-%EA%B2%A8%EC%9A%B8?node-id=1066-8207&p=f&t=4raZ6r5rqtZmFPXD-0
- 디자인 구현 노트: https://www.notion.so/3612a8746cb180a4b58bd4d919515690
- 캔버스 배경색: #F1F3F4 / 카드 width: 356px 고정, height: 가변

## 카드 종류
- 씨드카드 (type: 'seed'): Handle source — Position.Bottom
- 파생카드 (type: 'derived'): Handle target — Position.Top, source — Position.Bottom

## App.jsx 상태 구조
```
isStartModalOpen: boolean        — 시작 모달 (초기값 true)
cards: Node[]                    — 전체 카드 배열
edges: Edge[]                    — 전체 엣지 배열
selectedCardId: string | null    — 카드 직접 클릭 → 파란 테두리 + 툴바
infoCardId: string | null        — ⓘ 클릭 → 파란 테두리 + 사이드패널 (툴바 없음)
sidePanelTab: 'info' | 'ux'
activeModal: null | 'expand' | 'transform' | 'write'
modalStep: 1 | 2 | 3
modalSelection: object
modalUserInput: string
```

## 카드 data 구조
```
// SeedCard / DerivedCard 공통
title: string
description: string
isSelected: boolean    — App.jsx에서 주입 (selectedCardId || infoCardId)
isHighlighted: boolean — App.jsx에서 주입 (선택된 카드의 부모)
onInfoClick: fn

// DerivedCard 추가
tagType: 'expand' | 'transform' | null   — null이면 태그 버튼 없음 (직접쓰기)
tagName: string | null                   — 도구명 (예: '복제', '제거')
```

## ReactFlow 설정
- deleteKeyCode={null}
- base.css import (style.css 아님)
- nodeTypes: { seed: SeedCard, derived: DerivedCard }
- ReactFlowProvider로 App 전체 감싸기 (main.jsx)
- defaultEdgeOptions: type smoothstep / stroke #000 / strokeWidth 3
- React Flow 내장 selected prop 미사용 → data.isSelected로 직접 관리

## 선택/하이라이트 로직
- isSelected: `card.id === selectedCardId || card.id === infoCardId`
- parentId: `edges.find(e => e.target === selectedCardId)?.source ?? null`
- onPaneClick: selectedCardId, infoCardId 모두 null

## CSS 규칙
- 컴포넌트명을 클래스 접두사로 사용 (`.seed-card`, `.derived-card`)
- 테두리 상태 변경은 border 두께 변경 대신 box-shadow 사용 (레이아웃 이동 방지)

## 파일 구조
```
src/
├── components/
│   ├── SeedCard.jsx / SeedCard.css       ✅ 완료
│   ├── DerivedCard.jsx / DerivedCard.css ✅ 완료
│   ├── SidePanel.jsx                     ⬜ 미구현
│   └── modals/                           ⬜ 미구현
├── utils/
│   └── layout.js                         ✅ 완료
└── App.jsx                               ✅ 완료 (더미 데이터 포함)
```

## 작업 방식
- 코드 작성 전 반드시 무엇을 어떻게 할 것인지 한국어로 먼저 설명할 것
- 설명 후 승인을 받은 다음 코드 작성을 진행할 것
- 모르는 개념이 생기면 질문할 수 있도록 충분히 설명할 것
- 모든 답변과 설명은 한국어로 할 것
- 작성한 코드의 각 블록에 역할을 설명하는 한국어 주석을 달 것

## 참고
- 구현 진행 상황 전체: `docs/progress.md`
