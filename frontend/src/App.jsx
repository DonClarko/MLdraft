import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import DraftSimulator from './pages/DraftSimulator'
import HeroDatabase from './pages/HeroDatabase'
import TierLists from './pages/TierLists'
import AdminPanel from './pages/AdminPanel'
import AdminLogin from './pages/AdminLogin'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/draft" element={<DraftSimulator />} />
            <Route path="/heroes" element={<HeroDatabase />} />
            <Route path="/tier-lists" element={<TierLists />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute>
                  <AdminPanel />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1f1f1f',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
            },
          }}
        />
      </div>
    </Router>
  )
}

export default App
