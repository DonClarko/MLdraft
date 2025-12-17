import { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  Users, List, Swords, Link2, Settings, LogOut, Plus, Edit2, Trash2, 
  Save, X, Search, ChevronDown, ChevronUp, Shield, Sword, Target, Wand2, Crosshair, Heart
} from 'lucide-react'
import toast from 'react-hot-toast'
import { heroesApi, tierListsApi, countersApi, synergiesApi } from '../services/api'
import { useAuthStore } from '../stores'

const ROLES = ['tank', 'fighter', 'assassin', 'mage', 'marksman', 'support']
const TIERS = ['S', 'A', 'B', 'C', 'D']
const STRENGTHS = ['soft', 'medium', 'hard']
const SYNERGY_STRENGTHS = ['weak', 'medium', 'strong']

const roleIcons = {
  tank: Shield,
  fighter: Sword,
  assassin: Target,
  mage: Wand2,
  marksman: Crosshair,
  support: Heart
}

// Admin Sidebar Navigation
function AdminNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuthStore()

  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: Settings },
    { path: '/admin/heroes', label: 'Heroes', icon: Users },
    { path: '/admin/tier-lists', label: 'Tier Lists', icon: List },
    { path: '/admin/counters', label: 'Counters', icon: Swords },
    { path: '/admin/synergies', label: 'Synergies', icon: Link2 },
  ]

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
    toast.success('Logged out successfully')
  }

  return (
    <div className="glass-panel p-4 sticky top-20">
      <h2 className="text-lg font-bold text-ml-gold-400 mb-4">Admin Panel</h2>
      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-ml-gold-500/20 text-ml-gold-400' 
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
      
      <div className="mt-6 pt-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center space-x-2 px-3 py-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors w-full"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  )
}

// Dashboard
function AdminDashboard() {
  const [stats, setStats] = useState({ heroes: 0, tierLists: 0, counters: 0, synergies: 0 })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [heroesRes, tierListsRes, countersRes, synergiesRes] = await Promise.all([
          heroesApi.getAll(),
          tierListsApi.getAll(false),
          countersApi.getAll(),
          synergiesApi.getAll()
        ])
        setStats({
          heroes: heroesRes.data.length,
          tierLists: tierListsRes.data.length,
          counters: countersRes.data.length,
          synergies: synergiesRes.data.length
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
      }
    }
    fetchStats()
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Heroes', value: stats.heroes, icon: Users, color: 'blue' },
          { label: 'Tier Lists', value: stats.tierLists, icon: List, color: 'purple' },
          { label: 'Counters', value: stats.counters, icon: Swords, color: 'red' },
          { label: 'Synergies', value: stats.synergies, icon: Link2, color: 'green' },
        ].map((stat) => (
          <div key={stat.label} className="glass-panel p-4">
            <stat.icon className={`w-8 h-8 text-${stat.color}-400 mb-2`} />
            <div className="text-3xl font-bold text-white">{stat.value}</div>
            <div className="text-sm text-white/50">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="glass-panel p-6">
        <h2 className="text-lg font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4">
          <Link to="/admin/heroes" className="btn-primary text-center">
            Manage Heroes
          </Link>
          <Link to="/admin/tier-lists" className="btn-primary text-center">
            Edit Tier Lists
          </Link>
          <Link to="/admin/counters" className="btn-secondary text-center">
            Add Counters
          </Link>
          <Link to="/admin/synergies" className="btn-secondary text-center">
            Add Synergies
          </Link>
        </div>
      </div>
    </div>
  )
}

// Heroes Manager
function HeroesManager() {
  const [heroes, setHeroes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingHero, setEditingHero] = useState(null)
  const [formData, setFormData] = useState({
    name: '', role: 'tank', specialty: '', description: '', image_url: ''
  })
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchHeroes()
  }, [])

  const fetchHeroes = async () => {
    try {
      const response = await heroesApi.getAll()
      setHeroes(response.data)
    } catch (error) {
      toast.error('Failed to load heroes')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingHero) {
        await heroesApi.update(editingHero.id, formData)
        toast.success('Hero updated!')
      } else {
        await heroesApi.create(formData)
        toast.success('Hero created!')
      }
      fetchHeroes()
      resetForm()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this hero?')) return
    try {
      await heroesApi.delete(id)
      toast.success('Hero deleted!')
      fetchHeroes()
    } catch (error) {
      toast.error('Failed to delete hero')
    }
  }

  const handleEdit = (hero) => {
    setEditingHero(hero)
    setFormData({
      name: hero.name,
      role: hero.role,
      specialty: hero.specialty || '',
      description: hero.description || '',
      image_url: hero.image_url || ''
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingHero(null)
    setFormData({ name: '', role: 'tank', specialty: '', description: '', image_url: '' })
  }

  const filteredHeroes = heroes.filter(h => 
    h.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Heroes Manager</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Add Hero</span>
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-panel p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">
                {editingHero ? 'Edit Hero' : 'Add Hero'}
              </h2>
              <button onClick={resetForm} className="text-white/50 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="input-field"
                >
                  {ROLES.map(role => (
                    <option key={role} value={role} className="bg-gray-800">{role}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Specialty</label>
                <input
                  type="text"
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  className="input-field"
                  placeholder="e.g., Crowd Control/Initiator"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Image URL</label>
                <input
                  type="text"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="input-field"
                  placeholder="https://..."
                />
              </div>

              <div className="flex space-x-3">
                <button type="button" onClick={resetForm} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingHero ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
          <input
            type="text"
            placeholder="Search heroes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Heroes Table */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="text-left px-4 py-3 text-white/70 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-white/70 font-medium">Role</th>
                <th className="text-left px-4 py-3 text-white/70 font-medium">Specialty</th>
                <th className="text-right px-4 py-3 text-white/70 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-white/50">Loading...</td>
                </tr>
              ) : filteredHeroes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-white/50">No heroes found</td>
                </tr>
              ) : (
                filteredHeroes.map((hero) => (
                  <tr key={hero.id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-white">{hero.name}</td>
                    <td className="px-4 py-3 text-white/70 capitalize">{hero.role}</td>
                    <td className="px-4 py-3 text-white/50">{hero.specialty || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleEdit(hero)}
                        className="p-2 text-white/50 hover:text-white"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(hero.id)}
                        className="p-2 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Tier Lists Manager
// Lane-based tier list constants
const LANES = ['gold_lane', 'exp_lane', 'mid_lane', 'jungle', 'roamer']

const laneNames = {
  gold_lane: 'Gold Lane',
  exp_lane: 'Exp Lane',
  mid_lane: 'Mid Lane',
  jungle: 'Jungle',
  roamer: 'Roamer'
}

const laneDescriptions = {
  gold_lane: 'Marksmen & late-game carries',
  exp_lane: 'Fighters & offlane heroes',
  mid_lane: 'Mages & burst damage',
  jungle: 'Assassins & junglers',
  roamer: 'Tanks & supports'
}

// Default roles to show for each lane
const laneDefaultRoles = {
  gold_lane: ['marksman'],
  exp_lane: ['fighter', 'tank'],
  mid_lane: ['mage'],
  jungle: ['assassin', 'fighter'],
  roamer: ['tank', 'support']
}

const ALL_ROLES = ['tank', 'fighter', 'assassin', 'mage', 'marksman', 'support']

function TierListsManager() {
  const [tierLists, setTierLists] = useState([])
  const [heroes, setHeroes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedLane, setSelectedLane] = useState('gold_lane')
  const [editing, setEditing] = useState(false)
  const [entries, setEntries] = useState({})
  const [showAllHeroes, setShowAllHeroes] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRoleFilter, setSelectedRoleFilter] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [tierListsRes, heroesRes] = await Promise.all([
        tierListsApi.getAll(false),
        heroesApi.getAll()
      ])
      setTierLists(tierListsRes.data)
      setHeroes(heroesRes.data)
      
      // Initialize entries from existing tier lists
      const entriesMap = {}
      tierListsRes.data.forEach(tl => {
        entriesMap[tl.lane] = tl.entries?.reduce((acc, entry) => {
          acc[entry.hero_id] = entry.tier
          return acc
        }, {}) || {}
      })
      setEntries(entriesMap)
    } catch (error) {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleTierChange = (heroId, tier) => {
    setEntries(prev => ({
      ...prev,
      [selectedLane]: {
        ...prev[selectedLane],
        [heroId]: tier
      }
    }))
  }

  const handleSave = async () => {
    try {
      const currentTierList = tierLists.find(tl => tl.lane === selectedLane)
      const laneEntries = entries[selectedLane] || {}
      
      const formattedEntries = Object.entries(laneEntries)
        .filter(([_, tier]) => tier)
        .map(([heroId, tier]) => ({
          hero_id: parseInt(heroId),
          tier
        }))

      if (currentTierList) {
        await tierListsApi.update(currentTierList.id, {
          entries: formattedEntries,
          is_active: true
        })
      } else {
        await tierListsApi.create({
          lane: selectedLane,
          version: 'Current Patch',
          is_active: true,
          entries: formattedEntries
        })
      }
      
      toast.success('Tier list saved!')
      fetchData()
      setEditing(false)
    } catch (error) {
      toast.error('Failed to save tier list')
    }
  }

  // All heroes can potentially be ranked in any lane
  const laneEntries = entries[selectedLane] || {}

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Tier Lists Manager</h1>
        {editing ? (
          <div className="flex space-x-2">
            <button onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} className="btn-primary flex items-center space-x-2">
              <Save className="w-4 h-4" />
              <span>Save</span>
            </button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="btn-primary flex items-center space-x-2">
            <Edit2 className="w-4 h-4" />
            <span>Edit</span>
          </button>
        )}
      </div>

      {/* Lane Selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {LANES.map(lane => (
          <button
            key={lane}
            onClick={() => { 
              setSelectedLane(lane); 
              setShowAllHeroes(false); 
              setSelectedRoleFilter(null);
              setSearchQuery('');
            }}
            className={`px-4 py-2 rounded-lg ${
              selectedLane === lane 
                ? 'bg-ml-blue-600 text-white' 
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            {laneNames[lane]}
          </button>
        ))}
      </div>

      {/* Heroes Grid */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-white">{laneNames[selectedLane]} Tier List</h2>
          <button
            onClick={() => { setShowAllHeroes(!showAllHeroes); setSelectedRoleFilter(null); }}
            className={`text-sm px-3 py-1 rounded-lg ${
              showAllHeroes 
                ? 'bg-ml-blue-600 text-white' 
                : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
          >
            {showAllHeroes ? 'Show Default Roles' : 'Show All Heroes'}
          </button>
        </div>
        
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search hero name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-ml-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Role Filters */}
        {showAllHeroes && (
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setSelectedRoleFilter(null)}
              className={`px-3 py-1.5 text-sm rounded-lg ${
                selectedRoleFilter === null
                  ? 'bg-ml-blue-600 text-white'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              All Roles
            </button>
            {ALL_ROLES.map(role => (
              <button
                key={role}
                onClick={() => setSelectedRoleFilter(role)}
                className={`px-3 py-1.5 text-sm rounded-lg capitalize ${
                  selectedRoleFilter === role
                    ? 'bg-ml-blue-600 text-white'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        )}

        <p className="text-sm text-white/50 mb-4">
          {laneDescriptions[selectedLane]} • Showing: {
            showAllHeroes 
              ? (selectedRoleFilter ? selectedRoleFilter : 'All roles')
              : laneDefaultRoles[selectedLane].join(', ')
          }
        </p>
        
        {loading ? (
          <div className="text-center py-8 text-white/50">Loading...</div>
        ) : (
          <div className="grid gap-3">
            {heroes
              .filter(hero => {
                // Search filter
                if (searchQuery && !hero.name.toLowerCase().includes(searchQuery.toLowerCase())) {
                  return false;
                }
                // Role filter
                if (showAllHeroes) {
                  if (selectedRoleFilter) {
                    return hero.role === selectedRoleFilter || hero.secondary_role === selectedRoleFilter;
                  }
                  return true;
                }
                // Default view: show default roles + any hero already ranked in this lane
                const defaultRoles = laneDefaultRoles[selectedLane];
                const isDefaultRole = defaultRoles.includes(hero.role) || 
                       (hero.secondary_role && defaultRoles.includes(hero.secondary_role));
                const isRankedInLane = laneEntries[hero.id] != null;
                return isDefaultRole || isRankedInLane;
              })
              .map(hero => {
              return (
                <div key={hero.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/8 transition-colors">
                  <div className="flex items-center space-x-4 min-w-0 flex-1">
                    {/* Hero Icon Placeholder */}
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-ml-blue-600 to-ml-blue-800 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-lg">{hero.name.charAt(0)}</span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-white font-semibold text-lg block">{hero.name}</span>
                      {/* Show hero's role classification */}
                      <span className="text-sm text-white/50 capitalize">
                        {hero.role}
                        {hero.secondary_role && ` / ${hero.secondary_role}`}
                      </span>
                    </div>
                  </div>
                
                {editing ? (
                  <div className="flex items-center gap-3 ml-4">
                    {TIERS.map(tier => (
                      <button
                        key={tier}
                        onClick={() => handleTierChange(hero.id, tier)}
                        className={`w-12 h-12 rounded-xl font-bold text-lg transition-all ${
                          laneEntries[hero.id] === tier
                            ? tier === 'S' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/30 scale-110' :
                              tier === 'A' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30 scale-110' :
                              tier === 'B' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-110' :
                              tier === 'C' ? 'bg-green-500 text-white shadow-lg shadow-green-500/30 scale-110' :
                              'bg-gray-500 text-white shadow-lg shadow-gray-500/30 scale-110'
                            : 'bg-white/10 text-white/50 hover:bg-white/20 hover:scale-105'
                        }`}
                      >
                        {tier}
                      </button>
                    ))}
                    <button
                      onClick={() => handleTierChange(hero.id, null)}
                      className="w-12 h-12 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:scale-105 transition-all ml-2"
                    >
                      <X className="w-5 h-5 mx-auto" />
                    </button>
                  </div>
                ) : (
                  <span className={`px-4 py-2 rounded-lg font-bold text-base ${
                    laneEntries[hero.id] === 'S' ? 'bg-yellow-500/20 text-yellow-400' :
                    laneEntries[hero.id] === 'A' ? 'bg-purple-500/20 text-purple-400' :
                    laneEntries[hero.id] === 'B' ? 'bg-blue-500/20 text-blue-400' :
                    laneEntries[hero.id] === 'C' ? 'bg-green-500/20 text-green-400' :
                    laneEntries[hero.id] === 'D' ? 'bg-gray-500/20 text-gray-400' :
                    'bg-white/5 text-white/30'
                  }`}>
                    {laneEntries[hero.id] || 'Unranked'}
                  </span>
                )}
              </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// Counters Manager
function CountersManager() {
  const [counters, setCounters] = useState([])
  const [heroes, setHeroes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    hero_id: '', countered_by_id: '', strength: 'medium', explanation: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [countersRes, heroesRes] = await Promise.all([
        countersApi.getAll(),
        heroesApi.getAll()
      ])
      setCounters(countersRes.data)
      setHeroes(heroesRes.data)
    } catch (error) {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await countersApi.create({
        ...formData,
        hero_id: parseInt(formData.hero_id),
        countered_by_id: parseInt(formData.countered_by_id)
      })
      toast.success('Counter added!')
      fetchData()
      setShowForm(false)
      setFormData({ hero_id: '', countered_by_id: '', strength: 'medium', explanation: '' })
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add counter')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this counter?')) return
    try {
      await countersApi.delete(id)
      toast.success('Counter deleted!')
      fetchData()
    } catch (error) {
      toast.error('Failed to delete')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Counter Matchups</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Add Counter</span>
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-panel p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Add Counter</h2>
              <button onClick={() => setShowForm(false)} className="text-white/50 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Hero (gets countered)</label>
                <select
                  value={formData.hero_id}
                  onChange={(e) => setFormData({ ...formData, hero_id: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="" className="bg-gray-800">Select hero...</option>
                  {heroes.map(h => (
                    <option key={h.id} value={h.id} className="bg-gray-800">{h.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Countered By</label>
                <select
                  value={formData.countered_by_id}
                  onChange={(e) => setFormData({ ...formData, countered_by_id: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="" className="bg-gray-800">Select counter hero...</option>
                  {heroes.map(h => (
                    <option key={h.id} value={h.id} className="bg-gray-800">{h.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Strength</label>
                <select
                  value={formData.strength}
                  onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                  className="input-field"
                >
                  {STRENGTHS.map(s => (
                    <option key={s} value={s} className="bg-gray-800 capitalize">{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Explanation</label>
                <textarea
                  value={formData.explanation}
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                  className="input-field"
                  rows={3}
                  placeholder="Why is this a counter?"
                />
              </div>

              <div className="flex space-x-3">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Counters List */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="text-left px-4 py-3 text-white/70 font-medium">Hero</th>
                <th className="text-left px-4 py-3 text-white/70 font-medium">Countered By</th>
                <th className="text-left px-4 py-3 text-white/70 font-medium">Strength</th>
                <th className="text-left px-4 py-3 text-white/70 font-medium">Explanation</th>
                <th className="text-right px-4 py-3 text-white/70 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-white/50">Loading...</td></tr>
              ) : counters.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-white/50">No counters added yet</td></tr>
              ) : (
                counters.map((counter) => (
                  <tr key={counter.id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-white">{counter.hero?.name}</td>
                    <td className="px-4 py-3 text-red-400">{counter.countered_by?.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs capitalize ${
                        counter.strength === 'hard' ? 'bg-red-500/20 text-red-400' :
                        counter.strength === 'medium' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {counter.strength}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/50 text-sm max-w-xs truncate">{counter.explanation || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDelete(counter.id)} className="p-2 text-red-400 hover:text-red-300">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Synergies Manager
function SynergiesManager() {
  const [synergies, setSynergies] = useState([])
  const [heroes, setHeroes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    hero_1_id: '', hero_2_id: '', strength: 'medium', explanation: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [synergiesRes, heroesRes] = await Promise.all([
        synergiesApi.getAll(),
        heroesApi.getAll()
      ])
      setSynergies(synergiesRes.data)
      setHeroes(heroesRes.data)
    } catch (error) {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await synergiesApi.create({
        ...formData,
        hero_1_id: parseInt(formData.hero_1_id),
        hero_2_id: parseInt(formData.hero_2_id)
      })
      toast.success('Synergy added!')
      fetchData()
      setShowForm(false)
      setFormData({ hero_1_id: '', hero_2_id: '', strength: 'medium', explanation: '' })
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add synergy')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this synergy?')) return
    try {
      await synergiesApi.delete(id)
      toast.success('Synergy deleted!')
      fetchData()
    } catch (error) {
      toast.error('Failed to delete')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Hero Synergies</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Add Synergy</span>
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-panel p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Add Synergy</h2>
              <button onClick={() => setShowForm(false)} className="text-white/50 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Hero 1</label>
                <select
                  value={formData.hero_1_id}
                  onChange={(e) => setFormData({ ...formData, hero_1_id: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="" className="bg-gray-800">Select hero...</option>
                  {heroes.map(h => (
                    <option key={h.id} value={h.id} className="bg-gray-800">{h.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Hero 2</label>
                <select
                  value={formData.hero_2_id}
                  onChange={(e) => setFormData({ ...formData, hero_2_id: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="" className="bg-gray-800">Select hero...</option>
                  {heroes.map(h => (
                    <option key={h.id} value={h.id} className="bg-gray-800">{h.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Strength</label>
                <select
                  value={formData.strength}
                  onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                  className="input-field"
                >
                  {SYNERGY_STRENGTHS.map(s => (
                    <option key={s} value={s} className="bg-gray-800 capitalize">{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Explanation</label>
                <textarea
                  value={formData.explanation}
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                  className="input-field"
                  rows={3}
                  placeholder="How do they synergize?"
                />
              </div>

              <div className="flex space-x-3">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Synergies List */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="text-left px-4 py-3 text-white/70 font-medium">Hero 1</th>
                <th className="text-left px-4 py-3 text-white/70 font-medium">Hero 2</th>
                <th className="text-left px-4 py-3 text-white/70 font-medium">Strength</th>
                <th className="text-left px-4 py-3 text-white/70 font-medium">Explanation</th>
                <th className="text-right px-4 py-3 text-white/70 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-white/50">Loading...</td></tr>
              ) : synergies.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-white/50">No synergies added yet</td></tr>
              ) : (
                synergies.map((synergy) => (
                  <tr key={synergy.id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-white">{synergy.hero_1?.name}</td>
                    <td className="px-4 py-3 text-green-400">{synergy.hero_2?.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs capitalize ${
                        synergy.strength === 'strong' ? 'bg-green-500/20 text-green-400' :
                        synergy.strength === 'medium' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {synergy.strength}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/50 text-sm max-w-xs truncate">{synergy.explanation || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDelete(synergy.id)} className="p-2 text-red-400 hover:text-red-300">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Main Admin Panel Component
export default function AdminPanel() {
  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-1">
        <AdminNav />
      </div>
      <div className="lg:col-span-4">
        <Routes>
          <Route path="/" element={<AdminDashboard />} />
          <Route path="/heroes" element={<HeroesManager />} />
          <Route path="/tier-lists" element={<TierListsManager />} />
          <Route path="/counters" element={<CountersManager />} />
          <Route path="/synergies" element={<SynergiesManager />} />
        </Routes>
      </div>
    </div>
  )
}
