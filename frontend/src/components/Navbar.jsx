import { Link, useLocation } from 'react-router-dom'
import { Menu, X, Swords, Users, List, Settings, Home } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '../stores'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()
  const { isAuthenticated } = useAuthStore()

  const navLinks = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/draft', label: 'Draft Simulator', icon: Swords },
    { path: '/heroes', label: 'Heroes', icon: Users },
    { path: '/tier-lists', label: 'Tier Lists', icon: List },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <nav className="bg-black/30 backdrop-blur-lg border-b border-white/10 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-r from-ml-blue-500 to-ml-blue-700 rounded-lg flex items-center justify-center">
              <Swords className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-ml-blue-400 to-ml-gold-400 bg-clip-text text-transparent">
              ML Draft AI
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    isActive(link.path)
                      ? 'bg-ml-blue-600 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              )
            })}
            
            {/* Admin link */}
            <Link
              to={isAuthenticated ? '/admin' : '/admin/login'}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                location.pathname.startsWith('/admin')
                  ? 'bg-ml-gold-600 text-black'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Admin</span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-white/70 hover:text-white"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 space-y-2">
            {navLinks.map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(link.path)
                      ? 'bg-ml-blue-600 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{link.label}</span>
                </Link>
              )
            })}
            <Link
              to={isAuthenticated ? '/admin' : '/admin/login'}
              onClick={() => setIsOpen(false)}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                location.pathname.startsWith('/admin')
                  ? 'bg-ml-gold-600 text-black'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span>Admin Panel</span>
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
