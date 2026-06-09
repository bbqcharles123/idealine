# LayerStackNode 구현 핸드오프

> 작성일: 2026-06-08  
> 다음 세션에서 이어서 작업할 내용

---

## 1. 컴포넌트 역할

`LayerStackNode` = 기존 `DerivedCard`의 대체 컴포넌트.  
**역할은 동일**: 확장하기 / 변형하기 / 직접작성 도구로 만들어진 **파생카드**.  
단, 카드(아이디어 레이어) + 도구 레이어가 겹쳐 있는 스택 구조.

```
┌───────────────────────────────┐  ← 아이디어 레이어 (z:2, 흰색 카드)
│  제목                     ⓘ  │
│  본문 텍스트...               │
│                               │
├───────────────────────────────┤  ← 카드 하단 경계
│  [아이콘]  복제               │  ← peek strip (42px 중 34px, 항상 표시)
└───────────────────────────────┘
       ↑ 도구 레이어 (z:1, 배경색)
```

peek 클릭 시 → 도구 레이어가 카드 위로 올라와 도구 설명 표시:

```
┌───────────────────────────────┐  ← 도구 레이어 (z:3)
│  [아이콘]  복제               │  ← tool-header
│  이 도구에 대한 설명 텍스트   │  ← tool-desc
│                               │
│       아이디어 확인하기        │  ← peek strip (클릭 시 접힘)
└───────────────────────────────┘
```

---

## 2. 완료된 작업

### SeedCard
- [x] `SeedCard.css` Figma 시안 반영 완료
  - border-radius, padding, box-shadow, info 버튼 위치
  - selected/highlighted 상태 base shadow 유지 + 2px ring
  - 색상/폰트 모두 `tokens.css` 변수로 교체

### LayerStackNode
- [x] `LayerStackNode.css` Figma 시안 반영
  - 카드 padding `20px 24px`, box-shadow `0 4px 18px 0 rgba(0,0,0,0.12)`
  - tool 레이어 border 제거 (새 시안 반영)
  - PEEK_HEIGHT = 42px / peek strip = 34px 분리
  - tool-header/desc/peek 폰트 크기·굵기 수정
  - selected/highlighted 토큰 적용 + base shadow 유지
- [x] `LayerStackNode.jsx` 구조 수정
  - TAG_ICON 매핑 추가 (tagName 기반 동적 아이콘)
  - PEEK_HEIGHT 42px 업데이트
  - write 타입 TOOL_CONFIG 추가 (bg #E0F2F1, textColor #00695C)
  - peek 스트립: idle(`[아이콘] tagName`) / expanded(`아이디어 확인하기`) 전환
  - lsn__return 별도 버튼 제거 → peek이 복귀 버튼 역할

---

## 3. 다음에 할 작업: TAG_DESC 추가

### 문제
현재 tool-desc가 `TOOL_CONFIG.desc`의 **toolType 단위 generic 텍스트**를 사용:
```js
// 현재 (잘못됨)
TOOL_CONFIG.expand.desc = '이미 있는 요소를 하나 더 추가하되...'  // 모든 expand 카드 동일
TOOL_CONFIG.transform.desc = '기존 요소를 증가·감소·창출·제거해보세요...'
```

### 목표
tagName별로 고유한 설명 텍스트를 연결:
```js
// 목표
TAG_DESC.expand['복제'] = '복제 도구만의 설명'
TAG_DESC.expand['제거'] = '제거 도구만의 설명'
TAG_DESC.transform['증가'] = '증가 도구만의 설명'
// ...
```

### 결정된 방식
새 파일 `src/data/toolLayerDesc.js`를 만들어 관리.  
`bccData.js` / `transformData.js`는 모달용이므로 건드리지 않음.

### 기존 참고 데이터 (bccData.js)
각 도구에 `example`(구체적 사례)과 `question`(질문) 이 이미 있음.  
도구레이어 desc는 **도구 기법 자체를 설명하는 짧은 instructional 텍스트** (Figma 스타일).  
→ `bccData.example`과 다른 성격: bccData는 AI 생활 루틴 앱에 특정된 사례, 도구레이어는 기법 안내.

### 필요한 텍스트 목록

| toolType | tagName | 작성 필요 여부 |
|----------|---------|--------------|
| expand | 제거 | ✏️ |
| expand | 대체 | ✏️ |
| expand | 분할·분리 | ✏️ |
| expand | 용도통합 | ✏️ |
| expand | 결합 | ✏️ |
| expand | 복제 | ✏️ (Figma 예시: "이미 있는 요소를 하나 더 추가하되 조금 다르게 변형해보세요. 같은 듯 다른 요소가 새로운 가능성을 열어줍니다") |
| expand | 역전 | ✏️ |
| expand | 재정의 | ✏️ |
| expand | 유추 | ✏️ |
| expand | 연결 | ✏️ |
| expand | 속성 의존성 | ✏️ |
| transform | 증가 | ✏️ |
| transform | 감소 | ✏️ |
| transform | 창출 | ✏️ |
| transform | 제거 | ✏️ (Figma 예시: "업계에서 당연하게 제공하던 요소를 과감히 없애보세요. 없앴을 때 오히려 더 명확하고 강한 서비스가 될 수 있습니다") |
| write | (없음) | 별도 desc 불필요 (TOOL_CONFIG.write.desc 유지) |

### 구현 방법 (다음 세션)

**Step 1**: `src/data/toolLayerDesc.js` 생성
```js
export const TOOL_LAYER_DESC = {
  expand: {
    '복제': '...',
    '제거': '...',
    // 11개 도구 전부
  },
  transform: {
    '증가': '...',
    '감소': '...',
    '창출': '...',
    '제거': '...',
  },
}
```

**Step 2**: `LayerStackNode.jsx`에서 import 후 연결
```js
import { TOOL_LAYER_DESC } from '../data/toolLayerDesc.js'

// tool-desc 렌더링 부분
const tagDesc = TOOL_LAYER_DESC[toolType]?.[tagName] ?? tool.desc

// JSX
<p className="lsn__tool-desc" style={{ color: tool.textColor }}>{tagDesc}</p>
```

---

## 4. 핵심 파일 경로

| 파일 | 상태 |
|------|------|
| `src/components/LayerStackNode.jsx` | ✅ 완료 (TAG_ICON, peek 로직) |
| `src/components/LayerStackNode.css` | ✅ 완료 (Figma 시안 반영) |
| `src/components/SeedCard.jsx` | ✅ 완료 |
| `src/components/SeedCard.css` | ✅ 완료 (토큰 적용) |
| `src/tokens.css` | ✅ 참조용 (색상/폰트 토큰) |
| `src/data/bccData.js` | 참조용 (모달용 BCC 도구 데이터) |
| `src/data/transformData.js` | 참조용 (모달용 ERRC 도구 데이터) |
| `src/data/toolLayerDesc.js` | ⬜ **미생성 — 다음 세션에서 작성** |

---

## 5. App.jsx에서 LayerStackNode로 넘기는 data 구조

```js
// 카드 생성 시 (handleExpandSubmit 등에서)
data: {
  title: string,
  description: string,
  tagType: 'expand' | 'transform' | null,  // LayerStackNode에서 toolType으로 사용
  tagName: string | null,                   // 도구명: '복제', '제거' 등
  question: string | undefined,
  answer: string | undefined,
  isSelected: boolean,      // App.jsx에서 주입
  isHighlighted: boolean,   // App.jsx에서 주입
  onInfoClick: function,    // App.jsx에서 주입
}
```

> **주의**: LayerStackNode는 `tagType`을 `toolType`으로 받음.  
> App.jsx에서 카드 데이터를 넘길 때 필드명 일치 확인 필요.

---

## 6. Figma 시안 참조

- 기본 카드 (idle): `https://www.figma.com/design/yZ41AtAYIZrZvdfuUmhFbL/캡스톤-겨울?node-id=1550-8409`
- 도구레이어 단독 (expanded 기준): `https://www.figma.com/design/yZ41AtAYIZrZvdfuUmhFbL/캡스톤-겨울?node-id=1550-8532`
- expanded peek "아이디어 확인하기": `https://www.figma.com/design/yZ41AtAYIZrZvdfuUmhFbL/캡스톤-겨울?node-id=1551-8550`

---

## 7. Figma MCP 주의사항 (memory에 저장됨)

MCP `get_design_context`가 Tailwind CSS로 반환 → 실제 CSS 값은 항상 **Figma Dev Mode**에서 확인.  
특히 `box-shadow` blur 값: MCP는 절반으로 반환 (`drop-shadow` 필터 변환 때문).  
→ 예: Dev Mode `box-shadow: 0 4px 18px 0` ← MCP는 `drop-shadow(0 4px 9px)`로 반환.
