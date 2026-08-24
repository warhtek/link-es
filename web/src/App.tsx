import { Navigate, Route, Routes } from 'react-router-dom'
import { Topbar } from './components/Topbar'
import { DesignSystemPage } from './pages/DesignSystem'
import { LoginPage } from './pages/Login'
import { RegistroPage } from './pages/Registro'
import { PerfilPage } from './pages/Perfil'

function App() {
  return (
    <div className="min-h-screen bg-paper text-carbon">
      <Topbar />
      <Routes>
        <Route path="/" element={<Navigate to="/design-system" replace />} />
        <Route path="/design-system" element={<DesignSystemPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegistroPage />} />
        <Route path="/perfil" element={<PerfilPage />} />
        <Route path="*" element={<Navigate to="/design-system" replace />} />
      </Routes>
    </div>
  )
}

export default App
