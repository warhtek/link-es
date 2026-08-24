import { Navigate, Route, Routes } from 'react-router-dom'
import { Topbar } from './components/Topbar'
import { DesignSystemPage } from './pages/DesignSystem'
import { HomePage } from './pages/Home'
import { LoginPage } from './pages/Login'
import { RegistroPage } from './pages/Registro'
import { PerfilPage } from './pages/Perfil'
import { BuscarPage } from './pages/Buscar'
import { OnboardingProveedorPage } from './pages/proveedor/Onboarding'
import { PerfilPublicoPage } from './pages/proveedores/PerfilPublico'

function App() {
  return (
    <div className="min-h-screen bg-paper text-carbon">
      <Topbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/buscar" element={<BuscarPage />} />
        <Route path="/proveedores/:id" element={<PerfilPublicoPage />} />
        <Route path="/design-system" element={<DesignSystemPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegistroPage />} />
        <Route path="/perfil" element={<PerfilPage />} />
        <Route path="/proveedor/onboarding" element={<OnboardingProveedorPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
