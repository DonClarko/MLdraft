import { useState, useEffect } from 'react'
import { Search, Filter, Shield, Sword, Target, Wand2, Crosshair, Heart, ChevronDown, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { heroesApi, countersApi, synergiesApi } from '../services/api'
import HeroCard from '../components/HeroCard'

const ROLES = ['all', 'tank', 'fighter', 'assassin', 'mage', 'marksman', 'support']

const roleIcons = {
  tank: Shield,
  fighter: Sword,
  assassin: Target,
  mage: Wand2,
  marksman: Crosshair,
  support: Heart
}

export default function HeroDatabase() {
  const [heroes, setHeroes] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState('all')
  const [selectedHero, setSelectedHero] = useState(null)
  const [heroCounters, setHeroCounters] = useState([])
  const [heroSynergies, setHeroSynergies] = useState([])
  const [detailsLoading, setDetailsLoading] = useState(false)

  // Fetch heroes
  useEffect(() => {
    const fetchHeroes = async () => {
      try {
        const response = await heroesApi.getAll()
        setHeroes(response.data)
      } catch (error) {
        console.error('Error fetching heroes:', error)
        toast.error('Failed to load heroes')
      } finally {
        setLoading(false)
      }
    }
    fetchHeroes()
  }, [])

  // Fetch hero details when selected
  useEffect(() => {
    if (!selectedHero) {
      setHeroCounters([])
      setHeroSynergies([])
      return
    }

    const fetchHeroDetails = async () => {
      setDetailsLoading(true)
      try {
        const [countersRes, synergiesRes] = await Promise.all([
          countersApi.getByHeroId(selectedHero.id),
          synergiesApi.getByHeroId(selectedHero.id)
        ])
        setHeroCounters(countersRes.data)
        setHeroSynergies(synergiesRes.data)
      } catch (error) {
        console.error('Error fetching hero details:', error)
      } finally {
        setDetailsLoading(false)
      }
    }
    fetchHeroDetails()
  }, [selectedHero])

  // Filter heroes (including secondary roles)
  const filteredHeroes = heroes.filter(hero => {
    const matchesSearch = hero.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = selectedRole === 'all' || 
                        hero.role === selectedRole || 
                        hero.secondary_role === selectedRole
    return matchesSearch && matchesRole
  })

  // Group heroes by role (including heroes with matching secondary role)
  const herosByRole = ROLES.slice(1).reduce((acc, role) => {
    acc[role] = filteredHeroes.filter(h => h.role === role || h.secondary_role === role)
    return acc
  }, {})

  const RoleIcon = selectedHero ? roleIcons[selectedHero.role] : null

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-ml-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/70">Loading heroes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Hero Database</h1>
          <p className="text-white/60 mt-1">{heroes.length} heroes available</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Hero List */}
        <div className="lg:col-span-2">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
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
          </div>

          {/* Role Filter */}
          <div className="flex flex-wrap gap-2 mb-6">
            {ROLES.map((role) => {
              const Icon = roleIcons[role]
              return (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
                    selectedRole === role
                      ? 'bg-ml-blue-600 text-white'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span>{role}</span>
                </button>
              )
            })}
          </div>

          {/* Heroes Grid */}
          {selectedRole === 'all' ? (
            // Show by role sections
            <div className="space-y-8">
              {ROLES.slice(1).map((role) => {
                const roleHeroes = herosByRole[role]
                if (roleHeroes.length === 0) return null
                
                const Icon = roleIcons[role]
                return (
                  <div key={role}>
                    <h2 className="flex items-center space-x-2 text-xl font-bold text-white mb-4 capitalize">
                      <Icon className="w-6 h-6" />
                      <span>{role}s</span>
                      <span className="text-sm text-white/50">({roleHeroes.length})</span>
                    </h2>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                      {roleHeroes.map((hero) => (
                        <HeroCard
                          key={hero.id}
                          hero={hero}
                          onClick={() => setSelectedHero(hero)}
                          selected={selectedHero?.id === hero.id}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            // Show filtered grid
            <div className="glass-panel p-4">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {filteredHeroes.map((hero) => (
                  <HeroCard
                    key={hero.id}
                    hero={hero}
                    onClick={() => setSelectedHero(hero)}
                    selected={selectedHero?.id === hero.id}
                  />
                ))}
              </div>
              
              {filteredHeroes.length === 0 && (
                <div className="text-center py-12 text-white/50">
                  No heroes found
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hero Details Panel */}
        <div className="lg:col-span-1">
          <div className="glass-panel p-6 sticky top-20">
            {selectedHero ? (
              <div>
                {/* Close button */}
                <button
                  onClick={() => setSelectedHero(null)}
                  className="absolute top-4 right-4 p-1 text-white/50 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Hero Header */}
                <div className="text-center mb-6">
                  <div className={`w-24 h-24 mx-auto rounded-xl bg-gradient-to-br from-${selectedHero.role === 'tank' ? 'blue' : selectedHero.role === 'fighter' ? 'orange' : selectedHero.role === 'assassin' ? 'purple' : selectedHero.role === 'mage' ? 'pink' : selectedHero.role === 'marksman' ? 'yellow' : 'green'}-500 to-${selectedHero.role === 'tank' ? 'blue' : selectedHero.role === 'fighter' ? 'orange' : selectedHero.role === 'assassin' ? 'purple' : selectedHero.role === 'mage' ? 'pink' : selectedHero.role === 'marksman' ? 'yellow' : 'green'}-700 flex items-center justify-center mb-4`}>
                    {selectedHero.image_url ? (
                      <img src={selectedHero.image_url} alt={selectedHero.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      RoleIcon && <RoleIcon className="w-12 h-12 text-white" />
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-white">{selectedHero.name}</h2>
                  <div className="flex items-center justify-center space-x-2 mt-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize
                      ${selectedHero.role === 'tank' ? 'bg-blue-500/20 text-blue-400' :
                        selectedHero.role === 'fighter' ? 'bg-orange-500/20 text-orange-400' :
                        selectedHero.role === 'assassin' ? 'bg-purple-500/20 text-purple-400' :
                        selectedHero.role === 'mage' ? 'bg-pink-500/20 text-pink-400' :
                        selectedHero.role === 'marksman' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }
                    `}>
                      {selectedHero.role}
                    </span>
                  </div>
                </div>

                {/* Specialty */}
                {selectedHero.specialty && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-white/50 mb-2">Specialty</h3>
                    <p className="text-white">{selectedHero.specialty}</p>
                  </div>
                )}

                {/* Description */}
                {selectedHero.description && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-white/50 mb-2">Description</h3>
                    <p className="text-white/70 text-sm">{selectedHero.description}</p>
                  </div>
                )}

                {/* Counters */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-white/50 mb-2">
                    Countered By ({heroCounters.length})
                  </h3>
                  {detailsLoading ? (
                    <div className="text-white/50 text-sm">Loading...</div>
                  ) : heroCounters.length > 0 ? (
                    <div className="space-y-2">
                      {heroCounters.map((counter) => (
                        <div key={counter.id} className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-white">{counter.countered_by?.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              counter.strength === 'hard' ? 'bg-red-500/30 text-red-400' :
                              counter.strength === 'medium' ? 'bg-orange-500/30 text-orange-400' :
                              'bg-yellow-500/30 text-yellow-400'
                            }`}>
                              {counter.strength}
                            </span>
                          </div>
                          {counter.explanation && (
                            <p className="text-xs text-white/60">{counter.explanation}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white/50 text-sm">No counter data available</p>
                  )}
                </div>

                {/* Synergies */}
                <div>
                  <h3 className="text-sm font-medium text-white/50 mb-2">
                    Synergies ({heroSynergies.length})
                  </h3>
                  {detailsLoading ? (
                    <div className="text-white/50 text-sm">Loading...</div>
                  ) : heroSynergies.length > 0 ? (
                    <div className="space-y-2">
                      {heroSynergies.map((synergy) => {
                        const partner = synergy.hero_1_id === selectedHero.id ? synergy.hero_2 : synergy.hero_1
                        return (
                          <div key={synergy.id} className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-white">{partner?.name}</span>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                synergy.strength === 'strong' ? 'bg-green-500/30 text-green-400' :
                                synergy.strength === 'medium' ? 'bg-blue-500/30 text-blue-400' :
                                'bg-gray-500/30 text-gray-400'
                              }`}>
                                {synergy.strength}
                              </span>
                            </div>
                            {synergy.explanation && (
                              <p className="text-xs text-white/60">{synergy.explanation}</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-white/50 text-sm">No synergy data available</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Shield className="w-16 h-16 mx-auto text-white/20 mb-4" />
                <p className="text-white/50">Select a hero to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
