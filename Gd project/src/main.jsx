import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ReactFlowProvider } from '@xyflow/react'
import './index.css'
import App from './App.jsx'
import HomePage from './pages/HomePage.jsx'
import ToolGuidePage from './pages/ToolGuidePage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* BrowserRouter: URL 기반 라우팅 활성화 */}
    <BrowserRouter>
      <Routes>
        {/* 홈 화면 — ReactFlow 불필요하므로 Provider 밖에 위치 */}
        <Route path="/" element={<HomePage />} />
        {/* 전시용 도구 안내 — 아이패드 가로 거치 전용. 캔버스와 무관하므로 Provider 밖 */}
        <Route path="/tool-guide" element={<ToolGuidePage />} />
        {/* 캔버스 화면 — ReactFlowProvider로만 감싸기 */}
        <Route
          path="/canvas/:id"
          element={
            <ReactFlowProvider>
              <App />
            </ReactFlowProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
