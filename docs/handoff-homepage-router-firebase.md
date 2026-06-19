# 핸드오프: 홈 화면 + 라우터 + Firebase 연동 계획

## 이번 세션에서 완료한 작업

### 1. React Router 도입 (`react-router-dom` v7)

**설치 위치:** `idealine/Gd project/`

**`src/main.jsx` 구조 변경**
- 기존: `ReactFlowProvider`가 `App` 전체를 감쌈
- 변경 후: `BrowserRouter > Routes`로 라우팅 추가, `ReactFlowProvider`는 캔버스 라우트에만 적용

```jsx
<BrowserRouter>
  <Routes>
    <Route path="/"           element={<HomePage />} />
    <Route path="/canvas/:id" element={<ReactFlowProvider><App /></ReactFlowProvider>} />
  </Routes>
</BrowserRouter>
```

---

### 2. 홈 화면 구현

#### 파일 목록
| 파일 | 역할 |
|---|---|
| `src/pages/HomePage.jsx` | 홈 화면 페이지 |
| `src/pages/HomePage.css` | 홈 화면 스타일 |
| `src/components/CanvasCard.jsx` | 작업공간 캔버스 카드 (반복 사용 컴포넌트) |
| `src/components/CanvasCard.css` | 캔버스 카드 스타일 |

#### 레이아웃 구조 (flex column)

```
.home-page  (flex column, height: 100%, overflow: hidden)
  ├── .home-page__logo        (position: absolute, top: 20px, left: 80px)
  ├── .home-page__content     (flex: 1, 세로 중앙 정렬, padding-bottom: 475px)
  │     ├── .home-page__hero  (타이틀 + 서브타이틀, width: 486px)
  │     └── .home-page__input-wrap  (입력창, width: 642px)
  └── .home-page__workspace   (position: absolute, bottom: 0, width: 1280px)
```

**핵심 레이아웃 로직:**
- `home-page__content`에 `padding-bottom: 475px` → 작업공간 패널 높이만큼 하단 확보
  - `justify-content: center`의 중앙 기준이 패널 위 공간에 맞춰짐
  - 창 높이가 달라져도 히어로+입력창이 패널 위에서 수직 중앙 유지
- `home-page__workspace`는 `position: absolute; bottom: 0` → flex 흐름 밖에서 하단 고정
  - 전체보기 클릭 시 위로 커지며 입력창 덮음 (의도된 UX)

#### 작업공간 패널 동작
- **접힘 (기본):** `height: 475px` + `overflow: hidden` → 카드가 잘려 보임 (12개 항상 렌더링)
- **펼침 (전체보기):** `height: calc(100% - 184px)` + `overflow-y: auto` → 내부 스크롤
- CSS `transition: height 0.35s cubic-bezier(0.4, 0, 0.2, 1)` 슬라이드업 애니메이션
- 펼침 상단 여백 `184px`은 Figma 시안 기준

#### CanvasCard 데이터 모델
```jsx
// props
{ id, title, expandCount, transformCount, writeCount }

// cardCount는 내부에서 자동 계산
const cardCount = expandCount + transformCount + writeCount
```

- `cardCount`를 별도로 받지 않음 → 세 도구 카운트의 합산이므로 외부 주입 시 불일치 방지
- `title`은 `white-space: pre-line` → `\n`으로 2줄 지원
- 클릭 시 `navigate('/canvas/:id')`

#### 입력창 동작
- 입력값 없음 → 제출 버튼 회색 (`#d5d5d5`)
- 입력값 있음 → 제출 버튼 파란색 (`#589cfe`)
- 엔터 또는 버튼 클릭 → `navigate('/canvas/new')`
- **AI 연동 위치:** `handleSubmit` 함수 안에 API 호출 추가 예정

---

### 3. CanvasHeader 홈 버튼 연결

**`src/components/CanvasHeader.jsx`**
- `useNavigate` import 추가
- 홈 버튼 `onClick={() => navigate('/')}` 연결
- 캔버스 화면 → 홈 화면 이동 완성

---

## 현재 파일 구조 (전체)

```
src/
├── components/
│   ├── SeedCard.jsx / SeedCard.css               ✅
│   ├── DerivedCard.jsx / DerivedCard.css         ✅
│   ├── Toolbar.jsx / Toolbar.css                 ✅
│   ├── SidePanel.jsx / SidePanel.css             ✅
│   ├── CanvasHeader.jsx / CanvasHeader.css       ✅ (홈 버튼 연결 완료)
│   ├── LayerStackNode.jsx / LayerStackNode.css   ✅
│   ├── CanvasCard.jsx / CanvasCard.css           ✅ (이번 세션 신규)
│   ├── panel/
│   │   ├── IdeaCardContent.jsx + .css            ✅
│   │   ├── PanelTool.jsx + .css                  ✅
│   │   ├── QAContent.jsx + .css                  ✅
│   │   ├── UXItem.jsx + .css                     ✅
│   │   ├── InputTopic.jsx + .css                 ✅
│   │   ├── IdeaSource.jsx + .css                 ✅
│   │   ├── ToolBadge.jsx + .css                  ✅
│   │   ├── RecReason.jsx + .css                  ✅
│   │   ├── RecToolCard.jsx + .css                ✅
│   │   ├── Tooltip.jsx + .css                    ✅
│   │   ├── UxAreaAccordion.jsx + .css            ✅
│   │   ├── UxCriterionTag.jsx + .css             ✅
│   │   ├── UxEvaluationItem.jsx + .css           ✅
│   │   ├── UxStatusBadge.jsx + .css              ✅
│   │   └── UxItem.jsx + .css                     ✅
│   └── modals/
│       ├── ModalButton.jsx + .css                ✅
│       ├── ModalOption.jsx + .css                ✅
│       ├── ModalProgress.jsx + .css              ✅
│       ├── WriteModal.jsx + .css                 ✅
│       ├── ExpandModal.jsx + .css                ✅
│       ├── TransformModal.jsx + .css             ✅
│       └── StartModal.jsx + .css                 (파일은 있으나 미완성)
├── pages/
│   ├── HomePage.jsx                              ✅ (이번 세션 신규)
│   └── HomePage.css                             ✅ (이번 세션 신규)
├── data/
│   ├── bccData.js                                ✅
│   ├── transformData.js                          ✅
│   └── toolLayerDesc.js                         ✅
├── utils/
│   └── layout.js                                 ✅
├── App.jsx                                       ✅ (캔버스 화면)
├── main.jsx                                      ✅ (라우터 추가 완료)
├── index.css                                     ✅
└── tokens.css                                    ✅
```

---

## 다음 세션: Firebase 연동

### 왜 필요한가
현재 홈 화면의 `DUMMY_CANVASES`는 하드코딩된 더미 데이터다. 새로고침하면 캔버스/카드/엣지 데이터가 전부 사라진다. Firebase Firestore로 영속성을 부여해야 한다.

### 연동 범위
Authentication은 불필요 (단일 사용자), **Firestore만 연동**한다.

### Firestore 데이터 구조 (설계안)

```
canvases/                         ← 컬렉션
  {canvasId}/                     ← 문서 (홈 화면 카드 1개 = 캔버스 1개)
    title: string                 ← 캔버스 제목
    topic: string                 ← 입력창에서 사용자가 입력한 주제
    createdAt: timestamp
    expandCount: number           ← 확장하기로 만든 파생카드 수
    transformCount: number        ← 변형하기로 만든 파생카드 수
    writeCount: number            ← 직접작성으로 만든 파생카드 수
    cards: array                  ← 전체 카드 배열 (id, type, position, data)
    edges: array                  ← 전체 엣지 배열 (id, source, target)
```

### 연동이 필요한 위치

| 위치 | 현재 | Firebase 연동 후 |
|---|---|---|
| `HomePage.jsx` 더미 데이터 | `DUMMY_CANVASES` 하드코딩 | Firestore `canvases` 컬렉션 실시간 구독 |
| `HomePage.jsx` 입력창 제출 | `navigate('/canvas/new')` | Firestore에 새 캔버스 문서 생성 후 해당 id로 이동 |
| `App.jsx` 초기 카드/엣지 | `DUMMY_CARDS` 하드코딩 | URL의 `:id`로 Firestore 문서 조회해 로드 |
| `App.jsx` 카드 생성 핸들러 | `setCards`/`setEdges` state만 업데이트 | Firestore 문서 업데이트도 함께 실행 |

### 설치 명령어 (다음 세션 시작 시)

```bash
cd "idealine/Gd project"
npm install firebase
```

### 진행 순서 (권장)

1. Firebase 프로젝트 생성 + Firestore 활성화
2. `src/firebase.js` — Firebase 초기화 파일 생성
3. `HomePage.jsx` — `DUMMY_CANVASES` → Firestore 실시간 구독으로 교체
4. `HomePage.jsx` 입력창 — 새 캔버스 문서 Firestore에 생성
5. `App.jsx` — `:id`로 캔버스 데이터 로드
6. `App.jsx` 카드 생성 핸들러 — Firestore 동기화 추가

---

## 미완료 캔버스 기능 (참고)

`progress.md` 미완료 항목 중 Firebase 연동과 병행 또는 이후에 처리할 것들:

- **StartModal → 홈 입력창으로 대체됨** (StartModal.jsx는 삭제 또는 미사용 처리 가능)
- **AI API 연동**: Claude API — 씨드카드 생성(입력창 제출 시), 질문 생성(모달 Step), 파생카드 description 생성
- **다중 선택 툴바**: Shift+클릭 다중 선택
- **커스텀 엣지 (TreeEdge)**: 씨드카드 하단 엣지 분산 문제 근본 해결
- **태그 버튼 Popover**: DerivedCard 태그 버튼 클릭 시 도구 설명

---

## 기술 스택 요약

| 항목 | 내용 |
|---|---|
| 프레임워크 | React 19 + Vite |
| 라우터 | react-router-dom v7 |
| 캔버스 | @xyflow/react v12 + @dagrejs/dagre |
| 스타일 | 일반 CSS (Tailwind 미사용, CSS Modules 미사용) |
| 아이콘 | SVG 파일 (`/public/*.svg`) |
| 디자인 토큰 | `src/tokens.css` CSS 변수 |
| DB (예정) | Firebase Firestore |
| AI (예정) | Claude API |
| 폰트 | Pretendard (CDN) |

## CLAUDE.md 위치

`idealine/CLAUDE.md` — 프로젝트 컨텍스트, 작업 방식 규칙, 디자인 시안 링크 포함.
새 세션 시작 시 이 파일을 먼저 읽을 것.
