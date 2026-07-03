import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProjectsPage from './pages/ProjectsPage';
import EditorPage from './pages/EditorPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminProjectsPage from './pages/AdminProjectsPage';

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/login" element={user ? <Navigate to="/projects" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/projects" replace /> : <RegisterPage />} />

      {/* Rutas protegidas (cualquier usuario autenticado) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<EditorPage />} />
      </Route>

      {/* Rutas de admin */}
      <Route element={<AdminRoute />}>
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/projects" element={<AdminProjectsPage />} />
      </Route>

      {/* Redirecciones */}
      <Route path="/" element={<Navigate to="/projects" replace />} />
      <Route path="*" element={<Navigate to="/projects" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
