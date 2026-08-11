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
- 씨드카드 (type: 'seed' → SeedCard): Handle source — Position.Bottom
- 파생카드 (type: 'layerstack' → LayerStackNode): Handle target — Position.Top
  - source Handle은 도구 레이어 안쪽(peek 하단)에 배치
    → 펼침/접힘 시에도 "보이는 하단"을 따라가므로 엣지가 끊기지 않음
  - 레이어 구조(서랍 방식): 아이디어 레이어(z:2) + 도구 레이어(z:1 idle → z:3 expanded)
  - useUpdateNodeInternals로 전환 애니메이션(480ms) 동안 핸들 위치를 매 프레임 재측정

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

### 공통 (씨드·파생)
```
title: string
description: string       — 캔버스 카드에 표시되는 본문 (AI 생성)
uxData: object            — UX 평가 탭 데이터 (AI 생성)
```

### 씨드카드 추가
```
topic: string             — 사용자가 입력한 원문 주제 (사이드패널 '입력 주제')
```

### 파생카드 — 확장/변형 (toolType: 'expand' | 'transform')
```
toolType: 'expand' | 'transform'
tagName: string           — 도구명 (예: '복제', '제거')
question: string          — 모달에서 제시한 질문 (사이드패널 Q&A)
answer: string            — 사용자가 textarea에 입력한 원문 (사이드패널 Q&A)
highlights: {start,end}[] — AI 강조 문구를 answer 인덱스로 변환한 값
```

### 파생카드 — 직접작성 (toolType: 'write')
```
toolType: 'write'
writeRec: 'expand' | 'transform'  — AI 추천 카테고리 (도구레이어·RecToolCard)
writeExpect: string               — 기대효과 (도구레이어 설명)
writeRecReason: string            — 추천 이유 (사이드패널)
```
※ write 카드는 question/answer/tagName 없음

### App.jsx가 렌더링 시 주입 (App.jsx:403-409)
```
isSelected: boolean          — selectedCardId || infoCardId
isHighlighted: boolean       — 선택된 카드의 직속 부모
onInfoClick: fn
onToolOpen / onToolExpand / onToolCollapse: fn   — 도구 레이어 서랍 제어
onWriteLayerToggle: fn                            — toolType === 'write'일 때만 주입
```

## ReactFlow 설정
- deleteKeyCode={null}
- base.css import (style.css 아님)
- nodeTypes: { seed: SeedCard, layerstack: LayerStackNode }
- ReactFlowProvider로 App 전체 감싸기 (main.jsx)
- defaultEdgeOptions: type smoothstep / stroke #9E9E9E / strokeWidth 1.5 / borderRadius 8
- React Flow 내장 selected prop 미사용 → data.isSelected로 직접 관리

## 선택/하이라이트 로직
- isSelected: `card.id === selectedCardId || card.id === infoCardId`
- parentId: `edges.find(e => e.target === selectedCardId)?.source ?? null`
- onPaneClick: selectedCardId, infoCardId 모두 null

## CSS 규칙
- 컴포넌트명을 클래스 접두사로 사용 (`.seed-card`, `.derived-card`)
- 테두리 상태 변경은 border 두께 변경 대신 box-shadow 사용 (레이아웃 이동 방지)

## 파일 구조
프로젝트 루트는 `Gd project/`.
```
Gd project/src/
├── ai/            — OpenAI 호출 (seedCard·deriveCard·uxEval / openaiClient / __mock__)
├── components/
│   ├── modals/    — StartModal·ExpandModal·TransformModal·WriteModal + 공용 파트
│   ├── panel/     — SidePanel 내부 파트 (UX 평가·추천도구·Q&A 등)
│   └── *.jsx      — SeedCard·LayerStackNode·SidePanel·Toolbar·CanvasCard·CanvasHeader
├── data/          — BCC·ERRC 정적 데이터, 도구·프레임워크 설명 텍스트
├── pages/         — HomePage (작업공간 목록)
├── utils/         — layout.js (Dagre 트리 레이아웃)
├── firebase.js    — Firestore 연동
└── App.jsx        — 캔버스 화면, 카드/엣지 상태 관리
```

## 작업 방식
- 코드 작성 전 반드시 무엇을 어떻게 할 것인지 한국어로 먼저 설명할 것
- 설명 후 승인을 받은 다음 코드 작성을 진행할 것
- 모르는 개념이 생기면 질문할 수 있도록 충분히 설명할 것
- 모든 답변과 설명은 한국어로 할 것
- 작성한 코드의 각 블록에 역할을 설명하는 한국어 주석을 달 것

## 참고
- 구현 진행 상황 전체: `docs/progress.md`
