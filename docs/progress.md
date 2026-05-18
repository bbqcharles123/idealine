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

---

## 미완료 / 나중에 해야 할 항목

### 컴포넌트
- [ ] **다중 선택 툴바**: Shift+클릭으로 카드 여러 개 선택 시 별도 툴바 표시
  - 구조: "아이디어 카드 N개 선택됨" | [모음추가 버튼(파란 배경, 텍스트+아이콘)]
  - `selectedCardIds: string[]` 추가, React Flow `onSelectionChange` 활용
  - `selectedCardIds.length === 1` → 기존 툴바 / `> 1` → 다중 툴바 / `=== 0` → 숨김
- [ ] **사이드패널 (SidePanel)**: ⓘ 클릭 시 우측에서 열리는 패널. 탭: 생성 정보(info) / UX 평가(ux)
- [ ] **확장하기 모달**: BCC 사고도구(11개) 선택 → AI 질문 생성 → 사용자 답변 → 파생카드 생성 (3단계)
- [ ] **변형하기 모달**: ERRC 프레임워크(4가지) 선택 → AI 질문 생성 → 사용자 답변 → 파생카드 생성 (3단계)
- [ ] **직접작성 모달**: 사용자가 직접 아이디어 입력 → 파생카드 생성
- [ ] **시작 모달 (StartModal)**: 앱 진입 시 씨드카드 초기 아이디어 입력 (AI API 연동 필요)
- [ ] **태그 버튼 Popover**: DerivedCard 태그 버튼 클릭 시 도구 설명 팝오버

### 기능
- [ ] **모음추가 기능**: 선택된 카드를 별도 모음 공간에 추가 (단일/다중 선택 모두)
- [ ] **카드 생성 로직**: 모달 완료 후 파생카드 + edge를 cards/edges 배열에 추가
- [ ] **Dagre 레이아웃 자동 배치**: 카드 추가 시 getLayoutedElements 호출. layout.js NODE_HEIGHT: 200 고정값 → 실제 카드 높이로 교체 필요
- [ ] **AI API 연동**: Claude API를 사용한 질문 생성 및 아이디어 파생

### 아이콘
- [ ] BCC 사고도구 아이콘 나머지 10개 (현재 복제 1개만 있음)
- [ ] ERRC 프레임워크 아이콘 나머지 3개 (현재 제거 1개만 있음)

---

## 다음 구현 순서

1. **모달 (확장/변형/직접작성)** — 툴바 버튼 클릭 → activeModal 연동 → 모달 UI
2. **카드 생성 로직** — 모달 완료 → cards/edges 업데이트 → Dagre 레이아웃 → activeModal null 초기화
3. **다중 선택 툴바** — onSelectionChange 연동, 다중 툴바 UI
4. **사이드패널** — infoCardId 연동
5. **태그 버튼 Popover**
6. **시작 모달 + AI API 연동**
