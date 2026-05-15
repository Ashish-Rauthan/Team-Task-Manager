import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';

import AppLayout    from './components/layout/AppLayout';
import LoginPage    from './pages/auth/LoginPage';
import SignupPage   from './pages/auth/SignupPage';
import Dashboard    from './pages/dashboard/Dashboard';
import ProjectsPage from './pages/projects/ProjectsPage';
import ProjectDetail from './pages/projects/ProjectDetail';
import TasksPage    from './pages/tasks/TasksPage';
import TaskDetail   from './pages/tasks/TaskDetail';
import UsersPage    from './pages/dashboard/UsersPage';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner spinner-lg" /></div>;
  return user ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner spinner-lg" /></div>;
  return user ? <Navigate to="/dashboard" replace /> : children;
};

const AdminRoute = ({ children }) => {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner spinner-lg" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1c2030',
              color: '#e8eaf2',
              border: '1px solid #2a2f45',
              borderRadius: '10px',
              fontSize: '0.875rem',
            },
            success: { iconTheme: { primary: '#34d399', secondary: '#0d0f14' } },
            error:   { iconTheme: { primary: '#f87171', secondary: '#0d0f14' } },
          }}
        />
        <Routes>
          {/* Public */}
          <Route path="/login"  element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />

          {/* Protected */}
          <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"                      element={<Dashboard />} />
            <Route path="projects"                       element={<ProjectsPage />} />
            <Route path="projects/:projectId"            element={<ProjectDetail />} />
            <Route path="projects/:projectId/tasks"      element={<TasksPage />} />
            <Route path="projects/:projectId/tasks/:taskId" element={<TaskDetail />} />
            <Route path="my-tasks"                       element={<TasksPage myTasks />} />
            <Route path="users" element={<AdminRoute><UsersPage /></AdminRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}