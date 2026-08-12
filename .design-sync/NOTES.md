# design-sync 저장소 노트

이 저장소를 claude.ai/design에 동기화할 때 알아야 할 것들.
재동기화 시 `.design-sync/config.json`과 함께 이 파일을 먼저 읽을 것.

## 이 저장소의 성격

- 디자인 시스템 **라이브러리가 아니라 애플리케이션**이다. 라이브러리 빌드도,
  `.d.ts`도 없다. 그래서 표준 경로(컴파일된 dist + 타입) 대신 아래 우회로를 쓴다.
- 실제 패키지는 저장소 루트가 아니라 **`Gd project/`** 안에 있다.
  `--node-modules "Gd project/node_modules"` 로 패키지 위치를 알려 줘야 한다.

## 빌드 명령 (이 두 줄이 전부)

```sh
node .ds-sync/package-build.mjs --config .design-sync/config.json \
  --node-modules "Gd project/node_modules" --entry "Gd project/ds-entry.js" --out ./ds-bundle
node .ds-sync/package-validate.mjs ./ds-bundle
```

`--entry` 경로는 **cwd 기준**이다. `./ds-entry.js` 처럼 패키지 기준으로 쓰면
PKG_DIR이 저장소 루트로 잡혀 `package.json`을 못 찾고 죽는다.

## 왜 `Gd project/ds-entry.js`(배럴)가 필요한가

이 저장소의 컴포넌트는 **전부 `export default`** 다. 컨버터가 진입점을 자동
합성할 때 쓰는 `export * from '...'` 는 default를 재공개하지 않으므로,
그대로 두면 `window.Idealine`이 비어 모든 프리뷰가 깨진다.
배럴에서 `export { default as X }` 로 전부 다시 내보낸다.

배럴은 앱이 import하지 않는다. 컴포넌트를 추가하면 **배럴과
`config.json`의 `componentSrcMap` 양쪽에 추가**해야 한다.

## 해결한 문제들

- **폰트(Pretendard)** — 앱은 `index.html`의 CDN `<link>`로만 로드해서
  CSS 스크랩에 `@font-face`가 안 잡혔다 → `[FONT_MISSING]`.
  `.design-sync/fonts/PretendardVariable.woff2`(2.0MB 가변 폰트)를 저장소에 넣고
  `cfg.extraFonts`로 번들의 `fonts/`에 싣는다. CDN `@import`는 쓰지 않는다:
  claude.ai/design 렌더러가 외부 요청을 막으면 전부 fallback 폰트가 된다.
  - 참고: 검증기의 원격 폰트 허용 목록은 Google/Typekit/Bunny뿐이라
    jsdelivr `@import`는 `[FONT_REMOTE]`로 인정되지 않는다.
  - CSS `@import`는 파일 최상단에만 유효하다. `cfg.cssEntry`는 내용을
    `_ds_bundle.css` **끝에** 덧붙이므로 거기 `@import`를 넣으면 무효가 된다.

- **아이콘 전부 깨짐** — 컴포넌트가 `<img src="/header_home.svg">` 처럼
  `public/` 루트 절대경로를 쓴다. 앱에서는 Vite가 서빙하지만 claude.ai/design에는
  그 경로가 없어 전부 404.
  → `.design-sync/gen-icons-css.mjs`가 `public/*.svg` 45개를 base64 data URI로
  바꿔 `img[src="/x.svg"] { content: url(...) }` 규칙(`.design-sync/icons.css`,
  77KB)을 만든다. `ds-entry.js`가 이 CSS를 import해 번들에 싣는다.
  앱 소스는 건드리지 않았다.
  **`public/`의 SVG가 바뀌면 `node .design-sync/gen-icons-css.mjs`를 다시 돌리고
  재빌드할 것.** 자동 실행되지 않는다.

- **컨텍스트 제공자** — `CanvasHeader`/`CanvasCard`는 `useNavigate`,
  `SeedCard`/`LayerStackNode`/`IdeaSource`는 `@xyflow/react`를 쓴다.
  배럴이 `MemoryRouter`와 `ReactFlowProvider`를 export하고
  `cfg.provider`가 둘을 중첩해 감싼다.

- **playwright** — 렌더 검증에 필요. 이 PC 캐시에는 `chromium-1228`이 있고
  이는 **playwright 1.61.0** 이 핀한 버전이다. 최신(1.62.x)은 1234를 요구해
  `Executable doesn't exist`로 실패한다.
  `cd .ds-sync && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i playwright@1.61.0`

## 카드 배치 override (cfg.overrides)

첫 빌드에서 `[GRID_OVERFLOW]`가 11개 떴다. 전부 프레젠테이션 문제이고
`config.json`의 `overrides`로 해결했다. 새 프리뷰를 추가하면 다시 뜰 수 있다.

- `CanvasHeader` → `cardMode: single` — `position: fixed`라 그리드 셀 밖으로 나간다.
  프리뷰에서도 조상에 `transform: translateZ(0)`을 줘서 가둬야 한다.
- 나머지 10개(`Toolbar` `ModalOption` `ModalProgress` `ModalSkeleton` `IdeaSource`
  `InputTopic` `QAContent` `RecReason` `UxAreaAccordion` `UxEvaluationItem`)
  → `cardMode: column` — 사이드패널(336px)·모달(468px) 폭에 맞춘 프리뷰라
  기본 다단 그리드 셀보다 넓다.

## 알려진 렌더 경고 (Known render warns)

재동기화 시 아래가 다시 보이면 새 문제가 아니다.

- `SidePanel`이 floor card로 나오는 것 — 프리뷰를 의도적으로 작성하지 않았다.
  앱 상태(cards/edges/selectedCardId)를 통째로 받는 컨테이너라 시안 조립용 부품이
  아니기 때문이다. 필요해지면 프리뷰를 추가하면 된다.
- 최종 상태: 렌더 27/27 clean, 경고 0.

## 프리뷰 작성 시 알아 둘 것

- 프리뷰는 `.design-sync/previews/<Name>.tsx`, import는 패키지명 **`'gd-project'`** 로 한다.
  (→ `window.Idealine`의 실제 번들 컴포넌트로 연결된다)
- named export 하나 = 카드 셀 하나. 채점 키는 export 이름과 정확히 같아야 한다.
- 폭을 감싸 주는 게 좋다: 사이드패널 부품은 336px, 모달 부품은 468px.
- 클릭으로만 열리는 것(UxItemName 툴팁, CanvasHeader 편집 모드)은 정적 렌더에
  나오지 않는다. 별도 상태 prop이 없으므로 스토리로 만들 수 없다.
- 서브에이전트 없이 전부 직접 작성했다(19개 규모라 팬아웃 이득이 없음).

## 재동기화 시 주의 (Re-sync risks)

- **`.design-sync/icons.css`는 생성물이다.** `public/`의 SVG가 추가·변경·삭제되면
  조용히 낡는다. 재동기화 전 `gen-icons-css.mjs`를 먼저 돌릴 것.
- **`ds-entry.js`도 손으로 유지한다.** 컴포넌트를 새로 만들어도 자동으로
  동기화 대상이 되지 않는다. 배럴 + `componentSrcMap` 둘 다 갱신해야 한다.
- **props 계약이 약하다.** 소스가 `.jsx`라 `.d.ts`는 JSX 구조분해에서
  추정된 것이다. 디자인 에이전트가 props를 잘못 쓰면 `cfg.dtsPropsFor`에
  손으로 써 넣는 것이 정답이다.
- **폰트 파일은 v1.3.9로 고정**되어 있다. 앱의 `index.html` CDN 버전을 올리면
  `.design-sync/fonts/`의 woff2와 어긋난다.
- `App`·`HomePage`는 의도적으로 제외했다(앱 루트, 재사용 대상 아님).
- **`conventions.md`는 손으로 쓴 문서다.** 토큰명·클래스명·컴포넌트명을 직접 열거하고
  있으므로 `tokens.css`를 고치거나 컴포넌트를 이름 바꾸면 조용히 거짓말이 된다.
  재동기화 시 열거된 이름이 빌드 산출물에 아직 있는지 확인할 것.
- **프리뷰 내용은 실제 데이터가 아니다.** UX 평가 문구·질문·답변은 이 서비스 맥락에
  맞게 지어낸 예시다. 실제 AI 응답 형식이 바뀌면 프리뷰가 현실과 어긋날 수 있다.
- 이 동기화는 `chore/design-sync` 브랜치에서 진행했다.
  원본 작업 브랜치는 `experiment/layer-stack-node-v2`.
