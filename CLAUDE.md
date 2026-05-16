# 아이디어 발산 서비스 — 프로젝트 컨텍스트

## 서비스 개요
아이디어 카드(노드)를 생성하고 확장/변형하는 아이디어 발산 도구.
씨드카드(초기 아이디어)에서 파생카드가 트리 구조로 생성된다.

## 기술 스택
- React (Vite)
- React Flow (@xyflow/react) — 캔버스 및 카드 트리 구현
- Dagre (@dagrejs/dagre) — 트리 레이아웃 자동 계산
- CSS (일반 CSS, Tailwind 미사용)

## 디자인 시안
- Figma: https://www.figma.com/design/yZ41AtAYIZrZvdfuUmhFbL/%EC%BA%A1%EC%8A%A4%ED%86%A4-%EA%B2%A8%EC%9A%B8?node-id=1066-8207&p=f&t=4raZ6r5rqtZmFPXD-0
- 캔버스 배경색: #F1F3F4
- 카드 width: 356px 고정, height: 내용에 따라 가변

## 카드 종류
- 씨드카드 (type: 'seed'): Handle source — Position.Bottom
- 파생카드 (type: 'derived'): Handle target — Position.Top, source — Position.Bottom

## 상태 구조 (useState)
- isStartModalOpen: 시작 모달 열림 여부 (초기값 true)
- cards: 전체 카드 배열
- selectedCardId: 클릭 선택된 카드 id (툴바 표시용)
- infoCardId: ⓘ 클릭된 카드 id (사이드패널용)
- sidePanelTab: 'info' | 'ux'
- activeModal: null | 'expand' | 'transform' | 'write'
- modalStep: 1 | 2 | 3
- modalSelection: 각 단계 선택값
- modalUserInput: 사용자 직접 입력 내용

## ReactFlow 설정
- deleteKeyCode={null} — 키보드 삭제 기능 비활성화
- base.css import (style.css 아님)
- nodeTypes: { seed: SeedCard, derived: DerivedCard }
- ReactFlowProvider로 App 전체 감싸기

## 디자인 시안 구현 관련 내용정리
- Notion :https://www.notion.so/3612a8746cb180a4b58bd4d919515690


## 작업 방식
- 코드 작성 전 반드시 무엇을 어떻게 할 것인지 한국어로 먼저 설명할 것
- 설명 후 승인을 받은 다음 코드 작성을 진행할 것
- 모르는 개념이 생기면 질문할 수 있도록 충분히 설명할 것

## 파일 구조 (예정)
src/
├── components/
│   ├── SeedCard.jsx
│   ├── DerivedCard.jsx
│   ├── modals/
│   └── SidePanel.jsx
├── utils/
│   └── layout.js  (getLayoutedElements 함수)
└── App.jsx