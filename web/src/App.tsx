import { Navigate, Route, Routes } from 'react-router-dom'
import { Topbar } from './components/Topbar'
import { DesignSystemPage } from './pages/DesignSystem'

function App() {
  return (
    <div className="min-h-screen bg-paper text-carbon">
      <Topbar />
      <Routes>
        <Route path="/" element={<Navigate to="/design-system" replace />} />
        <Route path="/design-system" element={<DesignSystemPage />} />
        <Route path="*" element={<Navigate to="/design-system" replace />} />
      </Routes>
    </div>
  )
}

export default App
