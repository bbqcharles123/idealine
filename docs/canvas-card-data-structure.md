# idealine — Canvas 카드 데이터 구조 분석

> 작성일: 2026-06-18  
> 분석 대상: `Gd project/src/App.jsx`, `src/data/*.js`

---

## 1. 카드 데이터 저장 방식

카드 데이터는 **`App.jsx`의 컴포넌트 로컬 state**로 관리된다.  
별도 전역 상태 라이브러리(Redux, Zustand 등)는 사용하지 않는다.

```js
// App.jsx
const [cards, setCards] = useState(DUMMY_CARDS)  // 카드 배열
const [edges, setEdges] = useState(DUMMY_EDGES)  // 연결선 배열
```

- `DUMMY_CARDS` / `DUMMY_EDGES` 는 같은 파일(App.jsx) 최상단에 **하드코딩된 상수**로 정의되어 있다.
- 카드 배열(`cards`)은 React Flow의 **Node 배열 형식**을 그대로 따른다.

---

## 2. 카드 필드 목록 (Node 구조)

### 2-1. React Flow Node 공통 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | `string` | 고유 식별자 (예: `'seed-1'`, `'derived-1'`) |
| `type` | `'seed'` \| `'layerstack'` | 렌더링할 커스텀 노드 컴포넌트 결정 |
| `position` | `{ x: number, y: number }` | 캔버스 상 초기 좌표 (Dagre가 레이아웃 후 덮어씀) |
| `data` | `object` | 카드 내부 데이터 (아래 참고) |

> **참고:** CLAUDE.md에는 `'derived'` 타입이 정의되어 있으나,  
> 현재 더미 데이터는 파생카드에 `'layerstack'` 타입을 사용하고 있다.

---

### 2-2. `data` 객체 필드 — 카드 종류별 비교

#### 씨드카드 (`type: 'seed'`)

| 필드 | 타입 | 설명 |
|------|------|------|
| `title` | `string` | 카드 제목 (아이디어명) |
| `description` | `string` | 카드 본문 |
| `topic` | `string` | 홈 화면에서 입력한 주제 (사이드패널 생성정보 탭 표시용) |

#### 파생카드 (`type: 'layerstack'`) — 확장/변형 생성

| 필드 | 타입 | 설명 |
|------|------|------|
| `title` | `string` | 카드 제목 |
| `description` | `string` | AI가 생성한 카드 본문 (AI 연동 전: `answer` 값 임시 사용) |
| `toolType` | `'expand'` \| `'transform'` \| `'write'` | **카드 생성 방식 구분 필드** |
| `tagName` | `string` | 사용된 도구명 (예: `'복제'`, `'제거'`) |
| `question` | `string` | 모달에서 사용자에게 제시한 질문 텍스트 |
| `answer` | `string` | 사용자가 모달 textarea에 입력한 원문 (사이드패널 Q&A 표시) |
| `highlights` | `Array<{ start: number, end: number }>` | 답변 원문에서 하이라이트할 구간 (character index 기준) |

#### 파생카드 (`type: 'layerstack'`) — 직접작성 생성

| 필드 | 타입 | 설명 |
|------|------|------|
| `title` | `string` | 카드 제목 |
| `description` | `string` | 카드 본문 |
| `toolType` | `'write'` | **카드 생성 방식 구분 필드** |
| `writeRec` | `'expand'` \| `'transform'` | AI 추천 다음 도구 (AI 연동 전: `'expand'` 하드코딩) |
| `writeRecReason` | `string` | 추천 이유 텍스트 (AI 연동 전: 하드코딩 더미값) |

> **`tagName`, `question`, `answer`, `highlights`** 필드는 `toolType: 'write'`인 카드에는 존재하지 않는다.

---

### 2-3. 렌더링 시 동적 주입 필드 (state에는 저장되지 않음)

`App.jsx`의 `useMemo`에서 매 렌더링마다 카드 배열에 주입 후 React Flow에 전달.  
`cards` state 자체에는 저장되지 않는다.

| 필드 | 타입 | 주입 조건 |
|------|------|-----------|
| `isSelected` | `boolean` | `card.id === selectedCardId \|\| card.id === infoCardId` |
| `isHighlighted` | `boolean` | `card.id === parentId` (선택된 카드의 직속 부모) |
| `onInfoClick` | `function` | 전체 카드 |
| `onToolOpen` | `function` | 전체 카드 |
| `onWriteLayerToggle` | `function \| undefined` | `toolType === 'write'`인 카드만 |

---

## 3. 카드 생성 방식 구분 필드

### `data.toolType`

```
'expand'    → 확장하기 모달로 생성 (BCC 사고도구 사용)
'transform' → 변형하기 모달로 생성 (ERRC 프레임워크 사용)
'write'     → 직접작성 모달로 생성 (사용자가 title/description 직접 입력)
```

씨드카드에는 `toolType` 필드가 없다.

### `data.tagName` (확장/변형 카드에만 존재)

어떤 세부 도구가 사용되었는지 표시:

- **확장하기(BCC)**: `'제거'`, `'대체'`, `'분할·분리'`, `'용도통합'`, `'결합'`, `'복제'`, `'역전'`, `'재정의'`, `'유추'`, `'연결'`, `'속성 의존성'`
- **변형하기(ERRC)**: `'증가'`, `'감소'`, `'창출'`, `'제거'`
- **직접작성**: `tagName` 없음 (`undefined`)

---

## 4. Canvas 전체 상태 관리 위치

**`App.jsx` — 단일 컴포넌트 로컬 state (전역 상태 관리 없음)**

```js
canvasTitle        : string         // 캔버스 제목 (헤더 표시)
cards              : Node[]         // 전체 카드 배열
edges              : Edge[]         // 전체 엣지 배열
selectedCardId     : string | null  // 카드 클릭 → 파란 테두리 + 툴바
infoCardId         : string | null  // ⓘ 클릭 → 파란 테두리 + 사이드패널
sidePanelTab       : 'info' | 'ux'  // 사이드패널 활성 탭
activeModal        : null | 'expand' | 'transform' | 'write'
modalStep          : 1 | 2 | 3
modalSelection     : object
modalUserInput     : string
writeRecTool       : null | 'expand' | 'transform'  // write 레이어 추천 도구
writeLayerCardId   : string | null  // write 레이어가 펼쳐진 카드 ID
```

**파생 계산값** (`useMemo`로 계산, state 아님):
- `parentId` — 선택된 카드의 직속 부모 카드 ID (엣지 배열에서 역추적)
- `effectiveCardId` — `selectedCardId ?? writeLayerCardId` (툴바/모달 기준 카드)
- `selectedCard`, `infoCard`, `infoParentCard` — 해당 ID로 찾은 카드 객체
- `nodes` — `cards`에 `isSelected`, `isHighlighted`, 핸들러를 주입한 최종 배열

---

## 5. 하드코딩 더미 데이터 위치

### `src/App.jsx` (25~107번째 줄)

```
DUMMY_CARDS  : 씨드카드 1개 + 파생카드 3개
DUMMY_EDGES  : 씨드 → 파생 연결 3개
```

| 카드 ID | 생성 방식 | 사용 도구 |
|---------|-----------|-----------|
| `seed-1` | 씨드카드 | — |
| `derived-1` | 확장하기 | `복제` (BCC) |
| `derived-2` | 변형하기 | `제거` (ERRC) |
| `derived-write-1` | 직접작성 | — |

더미 데이터 기준 아이디어 주제: **"AI 생활 루틴 코치 앱"**

---

### `src/data/bccData.js`

BCC(Breakthrough Creative Cognition) 확장하기 도구 데이터.  
4개 방향성 × 총 11개 도구. 각 도구는 `name`, `icon`, `example`, `question` 필드를 가진다.

### `src/data/transformData.js`

ERRC(Eliminate, Reduce, Raise, Create) 변형하기 도구 데이터.  
4개 방향성 × 4개 도구 (방향성당 1:1 매핑). 각 도구는 `name`, `icon`, `question` 필드를 가진다.

### `src/data/toolLayerDesc.js`

도구 레이어 UI에 표시되는 기법 설명 텍스트.  
`TOOL_LAYER_DESC[toolType][tagName]` 형태로 조회.  
`expand` 11종, `transform` 4종.

---

## 요약

```
카드 데이터 저장: App.jsx 로컬 state (cards: Node[])
생성방식 구분:   data.toolType ('expand' | 'transform' | 'write')
세부 도구 구분:  data.tagName (BCC 11종 / ERRC 4종 / write는 없음)
전역 상태:      없음 — 모든 캔버스 상태가 App.jsx 단일 컴포넌트에 집중
더미 데이터:    App.jsx 상단 DUMMY_CARDS 상수 + src/data/*.js 3개 파일
```
