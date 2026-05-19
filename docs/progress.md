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
│   ├── SeedCard.jsx + SeedCard.css               ✅
│   ├── DerivedCard.jsx + DerivedCard.css         ✅
│   ├── Toolbar.jsx + Toolbar.css                 ✅
│   ├── SidePanel.jsx + SidePanel.css             ✅
│   ├── panel/
│   │   ├── IdeaCardContent.jsx + .css            ✅
│   │   ├── PanelTool.jsx + .css                  ✅
│   │   ├── QAContent.jsx + .css                  ✅
│   │   └── UXItem.jsx + .css                     ✅
│   └── modals/
│       ├── ModalButton.jsx + ModalButton.css     ✅
│       ├── ModalOption.jsx + ModalOption.css     ✅
│       ├── ModalProgress.jsx + ModalProgress.css ✅
│       ├── WriteModal.jsx + WriteModal.css       ✅
│       ├── ExpandModal.jsx + ExpandModal.css     ✅
│       └── TransformModal.jsx + TransformModal.css ✅
├── data/
│   ├── bccData.js                                ✅
│   └── transformData.js                          ✅
├── utils/
│   └── layout.js                                 ✅
└── App.jsx                                       ✅
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
  - expand (확장/BCC): bg #E8F5E9 / 텍스트 #2E7D32 / 화살표 arrow_forward_bcc.svg
  - transform (변형/ERRC): bg #EDE8F9 / 텍스트 #7B61C4 / 화살표 arrow_forward_errc.svg
  - 직접 쓰기: tagType = null → 태그 버튼 없음
- 태그 버튼 스펙: padding 4px 8px / border-radius 4px / 도구명 14px 600 lh18px / 아이콘-텍스트 간격 4px / 텍스트-화살표 간격 6px
- 태그 버튼 화살표: 배경색에 맞는 색상 아이콘 별도 파일 관리 (CSS filter 부적합 — 특정 색상 변환 복잡)
- **아이콘 동적화** ✅: `TAG_ICON[tagType][tagName]` 중첩 구조로 도구별 아이콘 개별 매핑
  - BCC와 ERRC 모두 '제거' 도구명이 존재하지만 tagType으로 구분해 각각 eraser/ban 아이콘 사용

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
- type: step / stroke: #000 / strokeWidth: 3
- defaultEdgeOptions로 전체 엣지에 일괄 적용

### 엣지 레이아웃 버그 수정 ✅

**발견된 문제 2가지**
1. **엣지가 카드 뒤에 가려지는 현상**: 직접작성 모달로 카드를 생성하고 레이아웃이 재계산될 때, 엣지 경로 위에 다른 카드가 위치하면 카드(HTML) 가 엣지(SVG)를 덮어버림. 노드를 드래그하면 해소됨.
2. **씨드카드 하단 엣지 출발점이 여러 개로 갈라지는 현상**: 같은 소스 핸들에 여러 엣지가 연결될 때 React Flow가 겹침 방지를 위해 각 엣지의 `sourceX`를 핸들 폭 기준으로 자동 분산시킴. edge type과 무관하게 발생.

**문제 1 해결: Dagre nodesep·ranksep 조정**

`nodesep`과 `ranksep`은 Dagre 레이아웃 알고리즘의 간격 설정값이다.
- `nodesep`: 같은 rank(행) 안에서 카드끼리의 수평 간격 (픽셀)
- `ranksep`: rank(행)와 rank(행) 사이의 수직 간격 (픽셀)

이 두 값을 늘려 카드 간 여백을 확보함으로써, 레이아웃 재계산 직후 엣지 경로 위에 다른 카드가 겹치는 상황을 줄임.
- `nodesep: 40 → 60` (layout.js)
- `ranksep: 60 → 100` (layout.js)

`elevateEdgesOnSelect`(엣지 선택 시 노드 위로 올리기) 방식은 사용자가 노드를 자유롭게 이동할 때 의도치 않은 z-index 동작을 유발할 수 있어 채택하지 않음.

**문제 2 부분 완화: edge type smoothstep → step 변경**

`step` 타입은 핸들 정중앙에서 수직으로 출발하는 직각 경로를 그리므로, `smoothstep`보다 갈라짐이 덜 두드러짐. 단, React Flow의 sourceX 분산 동작 자체는 edge type과 무관하게 유지되므로 완전한 해결은 아님.

**근본 해결은 커스텀 엣지로 구현 예정** (→ 미완료 항목 참고)

### ModalOption 컴포넌트 ✅
- 파일: `src/components/modals/ModalOption.jsx` + `ModalOption.css`
- 확장하기 Step 1/2, 변형하기 Step 1/2에서 공통으로 재사용
- props: `text`, `isSelected`, `onClick`
- Default: white bg / border 1px #d5d5d5 / 텍스트 14px Regular #4d4d4d
- Selected: bg #eef5ff / border-color #589cfe / box-shadow 0 0 0 1px #589cfe → 2px 테두리 효과 (레이아웃 이동 없음)

### ModalProgress 컴포넌트 ✅
- 파일: `src/components/modals/ModalProgress.jsx` + `ModalProgress.css`
- 확장하기(totalSteps=3), 변형하기(totalSteps=2) 모두 대응
- props: `totalSteps`, `currentStep`
- 막대 너비: `flex: 1`로 균등 분배 → 3개일 때 174px, 2개일 때 273px 자동 계산
- 완료 막대: bg #589cfe / 미완료 막대: bg white + border 1px #d5d5d5

### 확장하기 모달 ✅
- 파일: `src/components/modals/ExpandModal.jsx` + `ExpandModal.css`
- 모달 크기: 690×714px (WriteModal과 동일)
- WriteModal.css 공통 클래스(`.modal-overlay`, `.modal-close-btn`, `.modal-label`, `.modal-textarea`) 재사용

**3단계 플로우**
- Step 1: 방향성 선택 (4개) — selectedDirectionIdx가 있으면 다음으로 활성
- Step 2: 해당 방향성의 BCC 도구 예시 선택 (2~3개) — selectedToolIdx가 있으면 다음으로 활성
- Step 3: 선택된 도구 기반 질문 + 답변 textarea — answer.trim()이 있으면 파생 카드 생성하기 활성

**Step 3 질문 영역**
- 좌측: "질문" 라벨 + 도구명 칩 (bg #f2f2f2, `currentTool.icon` 16px — 도구별 동적 렌더링)
- 우측: "재생성" 버튼 (border 1px #d5d5d5, repeat.svg 18px) — AI 연동 전 disabled UI만 구현
- 질문 박스: bg #eef5ff / padding 14px 12px / 16px Medium #333

**이전으로 동작**
- Step 2 → 1: selectedToolIdx 초기화
- Step 3 → 2: answer 초기화

**BCC 방향성-도구 구조** (`src/data/bccData.js`)
- 방향성 1 (없애거나/바꾸기): 제거, 대체, 분할·분리
- 방향성 2 (합치거나/더하기): 용도통합, 결합, 복제
- 방향성 3 (뒤집거나/재정의): 역전, 재정의
- 방향성 4 (외부에서 힌트): 유추, 연결, 속성 의존성
- 각 도구: `{ name, icon, example, question }` — icon은 모달 도구칩용 SVG 경로, example/question은 하드코딩 (AI 연동 시 교체)

**App.jsx 추가 사항**
- `selectedCard`: `cards.find(c => c.id === selectedCardId)` — ExpandModal에 전달 (AI 연동 시 Step 2 예시 생성에 활용 예정)
- `handleExpandSubmit(answer, toolName)`: tagType: 'expand', tagName: toolName 파생카드 생성
- AI 연동 전 임시: title = `${toolName} 적용 아이디어`, description = answer

**아이콘** (public 폴더)
- `modal_infoui_bcc_{iconname}.svg`: Step 3 도구 칩 아이콘 (16px) — 도구별 개별 파일
- `repeat.svg`: 재생성 버튼 아이콘 (18px)

### 변형하기 모달 ✅
- 파일: `src/components/modals/TransformModal.jsx` + `TransformModal.css`
- ERRC(Eliminate, Reduce, Raise, Create) 프레임워크 기반 2단계 플로우
- WriteModal.css 공통 클래스 + TransformModal.css 전용 스타일 분리

**2단계 플로우**
- Step 1: 방향성 선택 (4개) — 방향성과 도구가 1:1 매핑이므로 선택 즉시 도구 결정
- Step 2: 선택된 도구 기반 질문 + 답변 textarea — answer.trim()이 있으면 파생 카드 생성하기 활성

**Step 2 질문 영역**
- 좌측: "질문" 라벨 + 도구명 칩 (bg #f2f2f2, `currentTool.icon` 16px — 도구별 동적 렌더링)
- 우측: "재생성" 버튼 (border 1px #d5d5d5, repeat.svg 18px) — AI 연동 전 disabled UI만 구현
- 질문 박스: bg #eef5ff / padding 14px 12px / 16px Medium #333

**이전으로 동작**
- Step 2 → 1: answer 초기화 (selectedDirectionIdx 유지)

**ERRC 방향성-도구 구조** (`src/data/transformData.js`)
- 방향성 1 (강화): 증가 (trending_up)
- 방향성 2 (감소): 감소 (trending_down)
- 방향성 3 (신설): 창출 (sparkles)
- 방향성 4 (제거): 제거 (ban)
- 각 도구: `{ name, icon, question }` — icon은 모달 도구칩용 SVG 경로, question은 하드코딩 (AI 연동 시 교체)
- BCC의 '제거(eraser)'와 ERRC의 '제거(ban)'는 같은 도구명이지만 프레임워크가 다름 — tagType으로 구분

**App.jsx 추가 사항**
- `handleTransformSubmit(answer, toolName)`: tagType: 'transform', tagName: toolName 파생카드 생성
- AI 연동 전 임시: title = `${toolName} 적용 아이디어`, description = answer

**아이콘** (public 폴더)
- `modal_infoui_errc_{iconname}.svg`: Step 2 도구 칩 아이콘 (16px) — 도구별 개별 파일

### 아이콘 체계 정리 ✅ (최종 확정)

**네이밍 규칙**
```
chip_{framework}_{iconname}.svg         도구 컬러 칩 아이콘 (카드 태그버튼 + 패널 하위칩 공용)
modal_infoui_{framework}_{iconname}.svg 모달 도구칩 (항상 회색 #f2f2f2)
panel_{framework}_{type}.svg            패널 전용 아이콘 (상위칩 프레임워크 아이콘)
```

**설계 결정**: `tag_btn_` prefix는 태그버튼 전용임을 시사하지만, 동일 아이콘이 패널 하위칩에도 재사용되므로 context-neutral한 `chip_`으로 일괄 rename. 두 UI의 배경색이 동일(BCC #e8f5e9 / ERRC #ede8f9)하므로 같은 파일 재사용 가능.

**BCC 아이콘 매핑** (11개 도구)
| 도구 | 컬러칩 (태그버튼+패널하위) | 모달칩 |
|---|---|---|
| 제거 | chip_bcc_eraser | modal_infoui_bcc_eraser |
| 대체 | chip_bcc_replace | modal_infoui_bcc_replace |
| 분할·분리 | chip_bcc_scissors | modal_infoui_bcc_scissors |
| 용도통합 | chip_bcc_layers | modal_infoui_bcc_layers |
| 결합 | chip_bcc_combine | modal_infoui_bcc_combine |
| 복제 | chip_bcc_copy | modal_infoui_bcc_copy |
| 역전 | chip_bcc_reverse | modal_infoui_bcc_reverse |
| 재정의 | chip_bcc_refresh | modal_infoui_bcc_refresh |
| 유추 | chip_bcc_lightbulb | modal_infoui_bcc_lightbulb |
| 연결 | chip_bcc_link | modal_infoui_bcc_link |
| 속성 의존성 | chip_bcc_branch | modal_infoui_bcc_branch |

**ERRC 아이콘 매핑** (4개 도구)
| 도구 | 컬러칩 (태그버튼+패널하위) | 모달칩 |
|---|---|---|
| 증가 | chip_errc_trending_up | modal_infoui_errc_trending_up |
| 감소 | chip_errc_trending_down | modal_infoui_errc_trending_down |
| 창출 | chip_errc_sparkles | modal_infoui_errc_sparkles |
| 제거 | chip_errc_ban | modal_infoui_errc_ban |

**패널 상위칩 아이콘** (프레임워크 전용, bg 색이 하위칩과 다름)
| 프레임워크 | 파일 | 배경색 |
|---|---|---|
| 확장하기 (BCC) | panel_bcc_expand.svg | #d8edd9 |
| 변형하기 (ERRC) | panel_errc_transform.svg | #d4cbef |

### 코드 주석
- SeedCard.jsx, DerivedCard.jsx, layout.js, App.jsx 전체에 한국어 블록 주석 추가 완료

### 사이드패널 ✅
- 파일: `src/components/SidePanel.jsx` + `SidePanel.css`
- 위치: `position: fixed; right: 0; top: 0` — 캔버스 위 오버레이 (z-index: 50, 모달 아래)
- 크기: 380px × 100vh, 슬라이드인 애니메이션 (`@keyframes sidePanelSlideIn`)
- 헤더: "카드 정보" 18px SemiBold + `close_sidepanel.svg` 닫기 버튼
- 탭바: 생성 정보 | UX 평가 (활성 탭 bg #589cfe 흰 텍스트, 비활성 bg white 텍스트 #555)
- 콘텐츠: overflow-y auto (스크롤 가능)

**카드 유형별 생성 정보 탭 구성**

| 섹션 | 씨드카드 | 직접작성 파생카드 | 확장/변형 파생카드 |
|---|---|---|---|
| 카드 유형 | "씨드카드" | "파생카드" | "파생카드" |
| 입력 주제 | ✅ 텍스트 | ❌ | ❌ |
| 아이디어 출처 | ❌ | ✅ IdeaCardContent | ✅ IdeaCardContent |
| 사용 도구 | ❌ | "직접작성" 텍스트 | ✅ PanelTool 칩 |
| 질문 & 응답 | ❌ | ❌ | ✅ QAContent |

**UX 평가 탭**: 씨드카드·파생카드 모두 7개 UXItem 더미 표시 (씨드카드 예외 없음. AI 연동 후 card.data.uxItems로 교체 예정)

**서브컴포넌트** (`src/components/panel/`)

- **IdeaCardContent**: 부모 카드 내용 표시 (bg #f7f7f7, 제목 16px Medium #333, 설명 14px Regular #4d4d4d)
- **PanelTool**: 프레임워크 상위칩 + 도구 하위칩 + L자형 연결선 (CSS border-left+border-bottom)
  - 상위칩 BCC: bg #d8edd9, 텍스트 #2e7d32 / 상위칩 ERRC: bg #d4cbef, 텍스트 #7b61c4
  - 하위칩 BCC: bg #e8f5e9 / 하위칩 ERRC: bg #ede8f9 (chip_* 아이콘 재사용)
  - 하위칩 들여쓰기: left 28px (상위칩 대비)
- **QAContent**: 질문(bg #eef5ff, 텍스트 #0c447c) + 답변(bg #f7f7f7) border로 묶인 구조
- **UXItem**: bg #f7f7f7, 항목명 14px SemiBold #555 + 평가 텍스트 14px Regular #4d4d4d

**카드 data 추가 필드**
- 씨드카드: `topic` — 시작 모달 입력 주제 (현재 더미값, 시작 모달 구현 후 실제값 사용)
- 확장/변형 파생카드: `question` — 모달에서 제시된 질문 텍스트
- 확장/변형 파생카드: `answer` — 사용자가 모달 textarea에 직접 입력한 원문 (사이드패널 Q&A 응답 표시용)
  - `description`: AI가 answer를 프롬프트에 넘겨 생성한 카드 본문 (AI 연동 전에는 answer와 동일값 임시 사용)
  - 두 필드 분리 이유: 카드 본문(AI 생성)과 Q&A 응답(사용자 원문)이 서로 다른 텍스트

**모달 시그니처 변경**
- ExpandModal / TransformModal `onSubmit(answer, toolName)` → `onSubmit(answer, toolName, question)`
- App.jsx `handleExpandSubmit` / `handleTransformSubmit`: card data에 `question` + `answer` 별도 저장

**App.jsx 추가 사항**
- `infoCard`: `cards.find(c => c.id === infoCardId)` (raw cards, 주입 전 원본 사용)
- `infoParentCard`: `edges.find(e => e.target === infoCardId)?.source`로 부모 카드 계산
- SidePanel 렌더링: `infoCardId`가 있을 때 모달들 바로 아래 배치

### 사이드패널 CSS Figma 검증 ✅

Figma MCP로 생성 정보 탭(1267:4973), UX 평가 탭(1267:5003), 탭 버튼(682:1624) 스펙 추출 후 CSS 전수 비교.

**수정된 항목**

| 파일 | 항목 | 수정 전 | 수정 후 |
|---|---|---|---|
| SidePanel.css | `.side-panel` box-shadow | `-2px 0 16px rgba(0,0,0,0.12)` | 제거 (Figma에 없음) |
| SidePanel.css | `.panel-value` line-height | `1` (14px 고정) | `normal` (Figma auto) |
| SidePanel.css | `.panel-ux-empty` | 존재 | 제거 (미사용 클래스) |
| SidePanel.css | `.side-panel-tabs-wrap` padding-top | `22px` | `26px` (헤더 52px + 26px = 탭 top 78px) |
| SidePanel.css | `.side-panel-tabs` padding | `4px` | `0 12px` |
| SidePanel.css | `.side-panel-tabs` gap | `4px` | `20px` |
| SidePanel.css | `.panel-tab` width | `flex: 1` (가변) | `146px` 고정 |
| SidePanel.css | `.panel-tab` padding | — | `10px 0` |
| SidePanel.css | `.panel-tab` line-height | — | `18px` |
| UXItem.css | `.ux-item__content` line-height | `1.5` | `normal` (Figma auto) |

**일치 확인된 항목**: 탭바 border/radius, 활성탭 색상, 섹션 gap(28px/20px), IdeaCardContent/QAContent/UXItem 전체 색상·폰트·padding

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
- [x] **확장하기 모달** ✅
- [x] **변형하기 모달** ✅
- [x] **카드 생성 로직 (변형하기)** ✅
- [ ] **다중 선택 툴바**: Shift+클릭으로 카드 여러 개 선택 시 별도 툴바 표시
  - 구조: "아이디어 카드 N개 선택됨" | [모음추가 버튼(파란 배경, 텍스트+아이콘)]
  - `selectedCardIds: string[]` 추가, React Flow `onSelectionChange` 활용
  - `selectedCardIds.length === 1` → 기존 툴바 / `> 1` → 다중 툴바 / `=== 0` → 숨김
- [x] **사이드패널 (SidePanel)** ✅
- [ ] **시작 모달 (StartModal)**: 앱 진입 시 씨드카드 초기 아이디어 입력 (AI API 연동 필요)
- [ ] **태그 버튼 Popover**: DerivedCard 태그 버튼 클릭 시 도구 설명 팝오버

### 기능
- [ ] **모음추가 기능**: 선택된 카드를 별도 모음 공간에 추가 (단일/다중 선택 모두)
- [x] **카드 생성 로직 (확장하기)** ✅
- [x] **Dagre 레이아웃 가변 높이** ✅
- [ ] **AI API 연동**: Claude API를 사용한 질문 생성 및 아이디어 파생

### 엣지
- [ ] **커스텀 엣지 (TreeEdge)**: 씨드카드 하단 엣지 출발점 갈라짐 근본 해결
  - 원인: React Flow가 같은 핸들에 연결된 여러 엣지의 `sourceX`를 자동 분산시킴 (edge type 무관)
  - 해결 방향: 커스텀 엣지 컴포넌트에서 `useReactFlow().getNode(source)`로 소스 노드를 직접 조회해 `node.position.x + node.measured.width / 2`를 trueSourceX로 계산, `getSmoothStepPath`에 보정된 좌표를 전달
  - 파일: `src/components/TreeEdge.jsx` 신규 생성 + App.jsx `edgeTypes` 등록

### 아이콘
- [x] BCC 도구 컬러칩 아이콘 11개 (`chip_bcc_*`) ✅ — tag_btn_bcc_*에서 rename
- [x] BCC 사고도구 모달칩 아이콘 11개 ✅
- [x] ERRC 도구 컬러칩 아이콘 4개 (`chip_errc_*`) ✅ — tag_btn_errc_*에서 rename
- [x] ERRC 프레임워크 모달칩 아이콘 4개 ✅
- [x] 패널 상위칩 아이콘 2개 (`panel_bcc_expand.svg`, `panel_errc_transform.svg`) ✅
- [x] 사이드패널 닫기 아이콘 (`close_sidepanel.svg`) ✅

---

## 다음 구현 순서

1. **다중 선택 툴바** — Shift+클릭 다중 선택, onSelectionChange 연동, N개 선택 툴바 UI
2. **태그 버튼 Popover** — DerivedCard 태그 버튼 클릭 시 도구 설명 팝오버
3. **시작 모달 + AI API 연동** — Claude API 연동, 질문/아이디어 자동 생성
