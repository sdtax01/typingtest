import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { Spinner } from './components/Metric';
import { AuthProvider } from './lib/auth';
import Home from './pages/Home';
import Configure from './pages/Configure';
import TestPage from './pages/Test';
import Results from './pages/Results';
import History from './pages/History';
import IsmSetup from './pages/IsmSetup';
import Login from './pages/Login';

const Admin = lazy(() => import('./pages/Admin'));

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="configure" element={<Configure />} />
            <Route path="test" element={<TestPage />} />
            <Route path="results/:id" element={<Results />} />
            <Route path="history" element={<History />} />
            <Route path="ism-setup" element={<IsmSetup />} />
            <Route path="login" element={<Login />} />
            <Route path="admin" element={<Suspense fallback={<Spinner />}><Admin /></Suspense>} />
            <Route path="*" element={<div className="p-10 text-center">पान सापडले नाही · Page not found</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
