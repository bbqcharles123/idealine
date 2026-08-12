// ─────────────────────────────────────────────────────────────
// public/*.svg → data URI CSS 생성기 (design-sync 전용)
//
// 왜 필요한가:
//   컴포넌트들이 아이콘을 <img src="/header_home.svg"> 처럼 루트 절대경로로
//   참조한다. 앱에서는 Vite가 public/을 루트로 서빙해 문제없지만,
//   claude.ai/design에는 그 경로에 파일이 없어 전부 404가 난다.
//
// 무엇을 하는가:
//   public/의 SVG를 base64 data URI로 바꿔, 해당 src를 가진 <img>를
//   CSS content로 덮어쓰는 규칙을 만든다. 앱 소스는 건드리지 않는다.
//   이 CSS는 ds-entry.js가 import하므로 _ds_bundle.css에 실리고,
//   claude.ai/design에서 만든 시안에도 그대로 적용된다.
//
// 실행:
//   node .design-sync/gen-icons-css.mjs
//   (public/ 의 SVG가 바뀌면 다시 돌린 뒤 재빌드할 것)
// ─────────────────────────────────────────────────────────────
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = join(HERE, '..')
const PUBLIC_DIR = join(REPO, 'Gd project', 'public')
const OUT = join(HERE, 'icons.css')

// public/ 의 SVG를 이름순으로 모은다 (순서 고정 → 빌드 결과가 결정적)
const files = readdirSync(PUBLIC_DIR).filter((f) => f.endsWith('.svg')).sort()

const rules = files.map((f) => {
  const b64 = readFileSync(join(PUBLIC_DIR, f)).toString('base64')
  // CSS 선택자 안에서 따옴표가 깨지지 않도록 파일명을 이스케이프
  const sel = `/${f}`.replace(/(["\\])/g, '\\$1')
  return `img[src="${sel}"] { content: url("data:image/svg+xml;base64,${b64}"); }`
})

const header = `/* 자동 생성 파일 — .design-sync/gen-icons-css.mjs 가 만든다. 직접 수정하지 말 것.
 *
 * public/ 의 SVG ${files.length}개를 data URI로 인라인해,
 * <img src="/xxx.svg"> 를 서버 없이 렌더되게 만든다.
 */\n`

writeFileSync(OUT, header + rules.join('\n') + '\n')
console.log(`icons.css: ${files.length} icons → ${OUT}`)
