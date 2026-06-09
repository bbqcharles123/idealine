# 모달 UI 핸드오프 문서

> 마지막 작업 세션 기준으로 작성. 새 세션에서 이 문서를 먼저 읽고 작업을 이어나갈 것.

---

## 모달 종류 및 역할

| 모달 | 파일 | 단계 | 역할 |
|---|---|---|---|
| 확장하기 | `ExpandModal.jsx` | 3단계 | BCC 사고도구로 파생카드 생성 |
| 변형하기 | `TransformModal.jsx` | 2단계 | ERRC 프레임워크로 파생카드 생성 |
| 직접작성 | `WriteModal.jsx` | 단일 | 사용자 직접 입력으로 파생카드 생성 |

모달은 `App.jsx`의 `activeModal` 상태로 제어 (`null` / `'expand'` / `'transform'` / `'write'`).

---

## 완료된 작업

### 공통 컴포넌트

**`ModalProgress.jsx` — 단일 연속 바로 완전 재설계**
- 기존: N개의 개별 막대 (height 10px, 흰 배경 + 테두리)
- 현재: 단일 연속 바 (height 6px, `#ebebeb` 배경) + 위에 `"단계명 | 현재/전체"` 헤더 행
- `stepLabel` prop 추가됨 (필수)

```jsx
<ModalProgress
  stepLabel="방향 선택"   // 단계별 레이블 문자열
  totalSteps={3}
  currentStep={step}     // 1-based
/>
```

**`ModalOption.css`** — `border-radius: 4px` → `var(--radius-element)`

**`ModalButton.css`** — `border-radius: 4px` → `var(--radius-element)`

---

### ExpandModal (3단계: 방향 선택 → 도구 선택 → 아이디어 발전)

Figma 시안:
- Step 1: `node-id=1571-1465`
- Step 2: `node-id=1572-1527`
- Step 3: `node-id=1572-1490`

**완료된 CSS 변경 (`ExpandModal.css`)**
| 항목 | 전 | 후 |
|---|---|---|
| `.expand-modal` border-radius | 없음 | `var(--radius-container)` |
| `.expand-modal` overflow | 없음 | `hidden` |
| `.expand-modal-content` top | `92px` | `64px` |
| `.expand-question-box` border-radius | 없음 | `var(--radius-element)` |
| `.expand-tool-chip` border-radius | `4px` | `var(--radius-element)` |
| `.expand-regenerate-btn` border-radius | `4px` | `var(--radius-element)` |
| `.expand-regenerate-btn` padding | `4px 6px` | `4px 8px` |
| `.expand-modal-footer` gap | `18px` | `20px` |

**완료된 JSX 변경 (`ExpandModal.jsx`)**
```jsx
<ModalProgress
  stepLabel={['방향 선택', '도구 선택', '아이디어 발전'][step - 1]}
  totalSteps={3}
  currentStep={step}
/>
```

---

### TransformModal (2단계: 방향 선택 → 아이디어 발전)

Figma 시안:
- Step 1: `node-id=1573-1564`
- Step 2: `node-id=1573-1589`

**완료된 CSS 변경 (`TransformModal.css`)** — ExpandModal과 동일 패턴 적용
| 항목 | 전 | 후 |
|---|---|---|
| `.transform-modal` border-radius | 없음 | `var(--radius-container)` |
| `.transform-modal` overflow | 없음 | `hidden` |
| `.transform-modal-content` top | `92px` | `64px` |
| `.transform-question-box` border-radius | 없음 | `var(--radius-element)` |
| `.transform-tool-chip` border-radius | `4px` | `var(--radius-element)` |
| `.transform-regenerate-btn` border-radius | `4px` | `var(--radius-element)` |
| `.transform-regenerate-btn` padding | `4px 6px` | `4px 8px` |
| `.transform-modal-footer` gap | `18px` | `20px` |

**완료된 JSX 변경 (`TransformModal.jsx`)**
```jsx
<ModalProgress
  stepLabel={['방향 선택', '아이디어 발전'][step - 1]}
  totalSteps={2}
  currentStep={step}
/>
```

---

### 모달 오버레이 (`WriteModal.css` → 공유)

`.modal-overlay` background: `rgba(0,0,0,0.3)` → `rgba(0,0,0,0.15)` 변경 완료.
3개 모달 모두 `WriteModal.css`를 import해서 이 클래스를 공유함.

---

## 남은 작업

### WriteModal — 시안 미확인 ⬜

WriteModal의 Figma 시안을 아직 확인하지 않았음.  
새 세션에서 시안을 확인한 뒤 ExpandModal/TransformModal에 적용한 것과 동일한 패턴으로 수정 필요:

예상 수정 항목 (시안 확인 후 결정):
- `.write-modal` → `border-radius: var(--radius-container)`, `overflow: hidden`
- `.write-modal-content` top 위치 조정 (현재 `92px` → 시안 확인 필요)
- `.modal-input` border-radius: `4px` → `var(--radius-element)`
- `.modal-textarea` border-radius: `4px` → `var(--radius-element)`
- `.write-modal-footer` gap 확인

---

## CSS 공유 구조 주의사항

```
WriteModal.css       ← 공통 클래스 정의
  .modal-overlay     ← 오버레이 (3개 모달 공유)
  .modal-close-btn   ← X 버튼 (3개 모달 공유)
  .modal-subtitle    ← 부제 텍스트
  .modal-label       ← 섹션 라벨
  .modal-sublabel    ← 보조 안내 텍스트
  .modal-input       ← 텍스트 input
  .modal-textarea    ← 답변 textarea

ExpandModal.css      ← ExpandModal 전용 (WriteModal.css 먼저 import)
TransformModal.css   ← TransformModal 전용 (WriteModal.css 먼저 import)
```

`WriteModal.css`의 공통 클래스를 수정하면 3개 모달 모두 영향받음.

---

## 적용된 디자인 토큰 (`tokens.css`)

| 토큰 | 값 | 적용 위치 |
|---|---|---|
| `--radius-container` | 16px | `.expand-modal`, `.transform-modal` |
| `--radius-element` | 8px | chip, 버튼, question-box, option, ModalButton, ModalProgress |

---

## 관련 파일 목록

```
src/components/modals/
├── WriteModal.jsx / WriteModal.css     ← 공통 클래스 포함, 시안 미확인
├── ExpandModal.jsx / ExpandModal.css   ✅ 완료
├── TransformModal.jsx / TransformModal.css  ✅ 완료
├── ModalButton.jsx / ModalButton.css   ✅ radius 적용
├── ModalOption.jsx / ModalOption.css   ✅ radius 적용
├── ModalProgress.jsx / ModalProgress.css   ✅ 단일 바로 재설계
src/data/
├── bccData.js      ← BCC 방향성/도구 데이터 (ExpandModal용)
├── transformData.js ← ERRC 방향성/도구 데이터 (TransformModal용)
```
