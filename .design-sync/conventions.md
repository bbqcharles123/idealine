## 이 디자인 시스템을 쓰는 법

**아이디어 발산 서비스(idealine)**의 실제 컴포넌트다. 아이디어 카드(노드)를 만들고
확장·변형하는 도구이고, 화면은 캔버스 / 모달 / 우측 사이드패널 세 축으로 구성된다.

### 감싸기 — 일부 컴포넌트는 provider가 없으면 죽는다

| provider | 필요한 컴포넌트 | 없으면 |
|---|---|---|
| `ReactFlowProvider` | `SeedCard`, `LayerStackNode`, `IdeaSource` | 렌더 중 throw |
| `MemoryRouter` (또는 앱의 라우터) | `CanvasHeader`, `CanvasCard` | `useNavigate` 오류 |

둘 다 번들에서 export된다. 확실하지 않으면 화면 전체를 두 provider로 감싸라 —
필요 없는 컴포넌트에는 아무 영향이 없다.

```jsx
<ReactFlowProvider>
  <MemoryRouter>
    <div style={{ background: 'var(--color-background)', minHeight: '100vh' }}>
      {/* 화면 내용 */}
    </div>
  </MemoryRouter>
</ReactFlowProvider>
```

`CanvasHeader`는 `position: fixed`다. 카드나 좁은 컨테이너 안에 넣으려면
조상에 `transform: translateZ(0)`을 주어 고정 기준을 만들어야 한다.

### 스타일 방식 — CSS 변수 + 일반 CSS. 유틸리티 클래스가 아니다

Tailwind도 CSS Modules도 쓰지 않는다. 새로 만드는 레이아웃은 **인라인 style이나
일반 CSS에 아래 토큰을 `var()`로** 쓴다. 임의의 hex 값을 새로 만들지 마라.

- **주 색**: `--color-primary` (#589CFE). 주 동작 버튼, 활성 상태, 진행 바, 선택 테두리 전부 이 하나다.
- **텍스트**: `--color-heading1` `--color-heading2-3` `--color-body1` `--color-body2` `--color-label` `--color-caption` `--color-disabled`
- **표면**: `--color-background`(앱 바탕 #F1F3F4) `--color-white`(카드·모달) `--color-surface`(연회색 내부 박스) `--color-track`
- **테두리**: `--color-border`, `--color-disabled-bg`
- **도구 의미색**: `--color-expand-bg/-text`(확장=녹색) `--color-transform-bg/-text`(변형=보라) `--color-write-bg/-text`(직접작성=청록)
- **평가 상태**: `--color-status-warn-bg/-text`(보완) `--color-status-ok-bg/-text`(충족)
- **선택/하이라이트**: `--color-selected-bg`, `--color-highlighted-bg`, `--color-highlighted-border`
- **서체**: `--font-size-heading1|heading2|heading3|body1|body2|label|caption|nano`,
  `--font-weight-bold|semibold|medium|regular`, `--font-family-base`(Pretendard)
- **모서리**: `--radius-pill`(999) `--radius-card`(28) `--radius-container`(16) `--radius-element`(8)

기존 컴포넌트의 클래스명은 컴포넌트명을 접두사로 쓴다(`.seed-card` `.lsn` `.tool-badge`
`.modal-btn` `.modal-option` `.qa-content` `.ux-area-accordion` `.toolbar` `.canvas-header`
`.rec-tool-card`). **이 클래스들을 직접 붙이지 마라** — 컴포넌트가 알아서 붙인다.
새로 만드는 레이아웃 요소에는 새 클래스명을 지어도 된다.

### 이 서비스만의 규칙

- **카드 폭은 356px 고정**, 높이는 가변이다.
- **선택 상태에서 border 두께를 바꾸지 마라.** `box-sizing: border-box` 때문에 내부가 밀린다.
  border는 1px로 두고 색만 바꾼 뒤, 늘어나는 두께는 바깥쪽 `box-shadow` 링으로 덧댄다.
  (선택 = border 1px + ring 1px = 총 2px)
- 두께가 변하지 않는 요소(모달 선택지)는 `border-color`만 바꾼다.
- 모달 하단 버튼 폭: 시작카드생성 144px, 확장·변형·직접작성 222px.
- 사이드패널 폭은 384px다. 패널 안에 넣을 컴포넌트는 약 336px 콘텐츠 폭을 기준으로 배치한다.

### 진짜 정보가 있는 곳

- `styles.css`와 그 `@import` 대상 — 토큰 정의와 전체 컴포넌트 CSS. 색이나 간격을 정하기 전에 읽어라.
- `components/<그룹>/<이름>/<이름>.prompt.md` — 컴포넌트별 props와 예시.
- 그룹은 셋이다: `general`(캔버스·헤더·툴바·패널), `modals`(모달과 그 부품), `panel`(사이드패널 부품).

### 조립 예시

```jsx
// 모달 부품으로 새 단계 화면 만들기 — 레이아웃은 토큰으로, 부품은 라이브러리로
<div style={{
  width: 532, padding: 32, background: 'var(--color-white)',
  borderRadius: 'var(--radius-container)', display: 'flex',
  flexDirection: 'column', gap: 24,
}}>
  <h2 style={{ fontSize: 'var(--font-size-heading3)', fontWeight: 'var(--font-weight-bold)',
               color: 'var(--color-heading2-3)' }}>
    어떤 방향으로 넓혀 볼까요?
  </h2>

  <ModalProgress stepLabel="방향 선택" totalSteps={3} currentStep={1} />

  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <ModalOption text="기존 요소를 합쳐 새로운 쓰임을 만들고 싶다" isSelected />
    <ModalOption text="단계 하나를 덜어내 더 빠르게 쓰이게 하고 싶다" isSelected={false} />
  </div>

  <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
    <ModalButton variant="outline" width={222}>이전으로</ModalButton>
    <ModalButton width={222}>다음으로</ModalButton>
  </div>
</div>
```

### props 계약에 대한 주의

이 저장소는 TypeScript가 아니라 `.jsx`다. `.d.ts`는 소스에서 추정한 것이라
실제보다 느슨할 수 있다. props를 확신할 수 없으면 `.prompt.md`의 예시를 먼저 따르라.
