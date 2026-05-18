# 구현 진행 상황

## 완료된 항목

### 프로젝트 세팅
- Vite + React + @xyflow/react + @dagrejs/dagre 설치
- ReactFlowProvider로 App 전체 감싸기 (main.jsx)
- Pretendard 폰트: index.html `<link>` 태그로 로드 (CDN)
- 전역 CSS: box-sizing, margin/padding reset, font-family 적용 (index.css)
- @xyflow/react/dist/base.css import (style.css 아님)

### 파일 구조
```
src/
├── components/
│   ├── SeedCard.jsx + SeedCard.css       ✅
│   ├── DerivedCard.jsx + DerivedCard.css ✅
│   ├── Toolbar.jsx + Toolbar.css         ✅
│   ├── SidePanel.jsx                     ⬜ 파일만 존재
│   └── modals/                           ⬜ 폴더만 존재
├── utils/
│   └── layout.js                         ✅
└── App.jsx                               ✅
```

### SeedCard
- 레이아웃: 제목 + 본문 + 우상단 정보 아이콘(ⓘ)
- Handle: source (Position.Bottom) — 시각적으로 숨김, 기능 유지
- selected 상태: 파란 테두리 (bg #EEF5FF / border #589CFE / box-shadow 0 0 0 2px)
- highlighted 상태: 주황 테두리 (bg #FFF7ED / border #F59E0B / box-shadow 0 0 0 1px)
- box-shadow 방식으로 border 두께 변경 없음 → 레이아웃 이동 없음
- 정보 아이콘: position absolute / top 18px / right 16px / 24×24px
- 스타일 스펙: width 356px / padding 18px 22px / 제목 18px 600 / 본문 16px 500

### DerivedCard
- SeedCard와 동일한 카드 기본 스타일 + 상태
- Handle: target (Position.Top) + source (Position.Bottom)
- 태그 버튼: 카드 상단에 조건부 렌더링 (tagType이 null이면 미표시)
  - expand (확장/BCC): bg #E8F5E9 / 텍스트 #2E7D32 / 아이콘 tag_btn_bcc_copy.svg / 화살표 arrow_forward_bcc.svg
  - transform (변형/ERRC): bg #EDE8F9 / 텍스트 #7B61C4 / 아이콘 tag_btn_errc_ban.svg / 화살표 arrow_forward_errc.svg
  - 직접 쓰기: tagType = null → 태그 버튼 없음
- 태그 버튼 스펙: padding 4px 8px / border-radius 4px / 도구명 14px 600 lh18px / 아이콘-텍스트 간격 4px / 텍스트-화살표 간격 6px
- 태그 버튼 화살표: 배경색에 맞는 색상 아이콘 별도 파일 관리 (CSS filter 부적합 — 특정 색상 변환 복잡)

### Toolbar CSS 수정 ✅
- `width: 427px` → `width: max-content`: flex 아이템 overflow로 padding-right 8px이 보이지 않던 문제 해결
- `.toolbar-collection-wrapper`에 `flex-shrink: 0` 추가
- 툴팁 `bottom: calc(100% + 4px)` (6px → 4px 조정)

### activeModal 버그 수정 ✅
- `handleNodeClick`, `handlePaneClick`에 `setActiveModal(null)` 추가
- 모달 미구현 상태에서 다른 카드 클릭 시 이전 툴바 active 상태가 유지되는 버그 방지
- 주석으로 "모달 구현 전 임시 처리" 명시 (모달 구현 후에는 오버레이가 차단하므로 실질적 동작 없음)

### ModalButton 컴포넌트 ✅
- 파일: `src/components/modals/ModalButton.jsx` + `ModalButton.css`
- `variant`: `'filled'` (주 동작) | `'outline'` (보조 동작 - 이전으로)
- `filled` + `disabled={false}` → 파란 배경 #589cfe, 흰 텍스트
- `filled` + `disabled={true}` → 회색 배경 #d5d5d5, 회색 텍스트 #9e9e9e
- `outline` → 흰 배경, 파란 테두리 #589cfe, 파란 텍스트 (항상 활성)
- `width` prop: 기본 144px (시작카드생성 모달), 확장/변형/직접작성 모달은 222 전달
- Figma의 `disabled/active/line` 3가지 → `variant(filled/outline)` + `disabled(boolean)` 조합으로 재구조화

**설계 결정사항**
- `disabled/active`는 같은 filled 스타일 안에서의 상태 변화, `line`은 스타일 자체가 다른 별도 버튼 → 같은 축으로 묶으면 의미 모호 → variant + disabled 분리
- Notion 이해 페이지에 설계 근거 정리: https://www.notion.so/3642a8746cb180f79ccccff7c0a5465c

### WriteModal 컴포넌트 ✅
- 파일: `src/components/modals/WriteModal.jsx` + `WriteModal.css`
- 구조: 오버레이(rgba 0,0,0,0.3) + 모달 박스(690×714px)
- X 버튼(close_modal.svg): onClose 호출 → activeModal null
- 아이디어 제목 input + 아이디어 설명 textarea
- 버튼 활성 조건: 제목 + 설명 모두 입력(trim 기준)
- 오버레이 클릭으로 닫기 없음 (X 버튼만) — 실수로 진행 내용 사라지는 UX 문제 방지

**공통 CSS 클래스** (WriteModal.css에 정의, 확장/변형 모달에서 재사용)
- `.modal-overlay`, `.modal-close-btn`
- `.modal-input`: height 48px / border 1px #d5d5d5 / border-radius 4px / padding 14px 12px
- `.modal-textarea`: height 112px / border 1px #d5d5d5 / border-radius 4px / padding 14px 12px
- `.modal-label`: 14px SemiBold #555555 / lh 18px
- `.modal-sublabel`: 14px Regular #4d4d4d / lh 18px
- `.modal-subtitle`: 14px Regular #4d4d4d / lh 18px

### App.jsx — 카드 생성 로직 ✅ (직접작성)
- `handleWriteSubmit(title, description)`: 새 파생카드(tagType null) + 엣지를 `setCards`/`setEdges`에 추가 → 레이아웃은 `useNodesInitialized` useEffect가 자동 처리
- WriteModal을 `activeModal === 'write'`일 때 렌더링 (ReactFlow 외부, overlay로 전체 화면 덮음)

### Toolbar ✅
- 위치: `<Panel position="bottom-center">` — 뷰포트 하단 중앙 고정 (카드 드래그/캔버스 이동 무관)
- 표시 조건: `selectedCardId`가 있을 때만 표시 (infoCardId만 있을 때는 미표시)
- 구조: [확장하기] [변형하기] [직접작성] | [모음추가 아이콘]

**컨테이너 스펙**
- width 427px / height 48px / border-radius 6px / bg #ffffff
- box-shadow: 0px 8px 40px 0 rgba(0,0,0,0.12)
- Panel marginBottom: 20px

**버튼 스펙**
- padding 8px 12px / border-radius 6px / 아이콘 24px / 아이콘-텍스트 간격 4px
- 버튼 간격(gap): 16px
- 텍스트: 14px 600 lh18px / default #222222 / active #ffffff
- 배경: default #ffffff / hover #E6E6E6 / active #1A6FD4
- active 아이콘 흰색: CSS `filter: brightness(0) invert(1)` (별도 파일 불필요)
- active 조건: `activeModal === 해당버튼의 modal값` (모달이 열려 있는 동안 유지)

**구분선 스펙**
- width 0.8px / height 24px / color #D5D5D5
- 직접작성↔구분선↔모음추가 양쪽 간격: 20px (margin: 0 20px)

**모음추가 버튼**
- wrapper: 36×36px / 아이콘만 표시 (텍스트 없음)
- hover 시 "모음추가" 툴팁 표시 (CSS :hover로 처리)

**아이콘 파일** (public 폴더)
- toolbar_btn_expand.svg / toolbar_btn_change.svg / toolbar_btn_make_card.svg / toolbar_btn_add list.svg

**App.jsx 연동**
- 확장하기 클릭 → `setActiveModal('expand')`
- 변형하기 클릭 → `setActiveModal('transform')`
- 직접작성 클릭 → `setActiveModal('write')`
- 모음추가: TODO

### App.jsx 상태 관리
- `selectedCardId`: 카드 직접 클릭 → 파란 테두리 + 툴바 표시
- `infoCardId`: ⓘ 클릭 → 파란 테두리 + 사이드패널 열기 (툴바 없음)
- `isSelected`: `card.id === selectedCardId || card.id === infoCardId`로 계산 후 data에 주입
- `parentId`: edges에서 `target === selectedCardId`인 edge의 source → highlighted 대상
- `onPaneClick`: selectedCardId, infoCardId 모두 null 초기화
- React Flow 내장 `selected` prop 미사용 (충돌 방지, data.isSelected로 직접 관리)
- `activeModal`: null | 'expand' | 'transform' | 'write' — 툴바 active 상태 및 모달 표시 제어

### 엣지 스타일
- type: smoothstep / stroke: #000 / strokeWidth: 3
- defaultEdgeOptions로 전체 엣지에 일괄 적용 (커스텀 엣지 불필요)

### 코드 주석
- SeedCard.jsx, DerivedCard.jsx, layout.js, App.jsx 전체에 한국어 블록 주석 추가 완료

### Dagre 레이아웃 가변 높이 수정 ✅

**문제 원인 2가지**
1. Dagre graph 싱글톤(`dagreGraph`)이 module-level에 선언되어 이전 레이아웃 데이터가 누적됨
2. `NODE_HEIGHT: 200` 고정값 → 실제 카드 높이 초과 시 카드끼리 겹침

**해결 방식**: `useNodesInitialized` + `node.measured` 접근법 (Notion 가이드 기반)
- `node.measured`: React Flow가 렌더링 후 실제 DOM 크기를 자동으로 저장하는 속성
- `useNodesInitialized()`: 모든 노드 크기 측정 완료 시 `false → true` (새 노드 추가 시 반복)
- `useEffect([nodesInitialized])`: 측정 완료 시점에 자동으로 레이아웃 재계산

**layout.js 수정**
- 매 호출 시 `dagreGraph.nodes().forEach(id => dagreGraph.removeNode(id))`로 누적 초기화
- `node.measured?.width ?? 356`, `node.measured?.height ?? 200`으로 실제 DOM 크기 사용
- `nodesep: 40, ranksep: 60` 추가 (카드 간 여백)
- 좌상단 좌표 변환 시에도 측정된 크기 기준으로 계산

**App.jsx 수정**
- `useNodesInitialized`, `useReactFlow`, `useEffect` import 추가
- `useEffect([nodesInitialized])`: `getNodes()`로 측정된 노드 배열 획득 → 레이아웃 계산 → `setCards`로 위치만 업데이트
- `handleWriteSubmit`: `getLayoutedElements` 직접 호출 제거 → `setCards`/`setEdges`만 추가 (의존 배열도 `[selectedCardId]`로 단순화)
- `ReactFlowProvider`가 main.jsx에서 App 전체를 감싸므로 App 컴포넌트 내에서 직접 hooks 사용 가능 (별도 분리 불필요)

---

## 미완료 / 나중에 해야 할 항목

### 컴포넌트
- [x] **직접작성 모달** ✅
- [x] **ModalButton 컴포넌트** ✅
- [x] **카드 생성 로직 (직접작성)** ✅
- [ ] **확장하기 모달**: BCC 사고도구(11개) 선택 → AI 질문 생성 → 사용자 답변 → 파생카드 생성 (3단계)
- [ ] **변형하기 모달**: ERRC 프레임워크(4가지) 선택 → AI 질문 생성 → 사용자 답변 → 파생카드 생성 (3단계)
- [ ] **다중 선택 툴바**: Shift+클릭으로 카드 여러 개 선택 시 별도 툴바 표시
  - 구조: "아이디어 카드 N개 선택됨" | [모음추가 버튼(파란 배경, 텍스트+아이콘)]
  - `selectedCardIds: string[]` 추가, React Flow `onSelectionChange` 활용
  - `selectedCardIds.length === 1` → 기존 툴바 / `> 1` → 다중 툴바 / `=== 0` → 숨김
- [ ] **사이드패널 (SidePanel)**: ⓘ 클릭 시 우측에서 열리는 패널. 탭: 생성 정보(info) / UX 평가(ux)
- [ ] **시작 모달 (StartModal)**: 앱 진입 시 씨드카드 초기 아이디어 입력 (AI API 연동 필요)
- [ ] **태그 버튼 Popover**: DerivedCard 태그 버튼 클릭 시 도구 설명 팝오버

### 기능
- [ ] **모음추가 기능**: 선택된 카드를 별도 모음 공간에 추가 (단일/다중 선택 모두)
- [ ] **카드 생성 로직 (확장하기/변형하기)**: 모달 완료 후 tagType 포함 파생카드 + edge 추가
- [x] **Dagre 레이아웃 가변 높이** ✅
- [ ] **AI API 연동**: Claude API를 사용한 질문 생성 및 아이디어 파생

### 아이콘
- [ ] BCC 사고도구 아이콘 나머지 10개 (현재 복제 1개만 있음)
- [ ] ERRC 프레임워크 아이콘 나머지 3개 (현재 제거 1개만 있음)

---

## 다음 구현 순서

1. **확장하기 모달** — 3단계 플로우 (도구 선택 → AI 질문 → 답변 → 파생카드)
   - Step 1: BCC 11개 도구 중 방향 선택
   - Step 2: AI 질문 생성 (AI API 연동 전까지 임시 질문 사용 가능)
   - Step 3: 답변 입력 → 파생카드 생성 (tagType: 'expand')
   - 공통 CSS 클래스(modal-input, modal-textarea 등) WriteModal.css에서 재사용
2. **변형하기 모달** — 확장하기와 동일 구조, ERRC 4가지 프레임워크 (tagType: 'transform')
3. **다중 선택 툴바** — onSelectionChange 연동, 다중 툴바 UI
4. **사이드패널** — infoCardId 연동
5. **태그 버튼 Popover**
6. **시작 모달 + AI API 연동**
