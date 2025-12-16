import { useState, useEffect, useCallback } from 'react'
import { Search, Filter, RotateCcw, Undo2, Play, Pause } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDraftStore } from '../stores'
import { heroesApi, draftApi } from '../services/api'
import HeroCard from '../components/HeroCard'
import HeroSlot from '../components/HeroSlot'
import SuggestionPanel from '../components/SuggestionPanel'

const ROLES = ['all', 'tank', 'fighter', 'assassin', 'mage', 'marksman', 'support']

export default function DraftSimulator() {
  const [heroes, setHeroes] = useState([])
  const [loading, setLoading] = useState(true)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState('all')
  
  const {
    phase,
    currentTeam,
    blueBans,
    redBans,
    bluePicks,
    redPicks,
    suggestions,
    teamAnalysis,
    setSuggestions,
    banHero,
    pickHero,
    undoLastAction,
    resetDraft,
    isHeroAvailable,
    getUnavailableHeroes
  } = useDraftStore()

  // Fetch heroes on mount
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

  // Fetch suggestions when draft state changes
  const fetchSuggestions = useCallback(async () => {
    if (phase === 'complete') return
    
    setSuggestionsLoading(true)
    try {
      const response = await draftApi.getSuggestions({
        bans: [...blueBans, ...redBans],
        blue_picks: bluePicks,
        red_picks: redPicks,
        current_team: currentTeam
      })
      setSuggestions(response.data.suggestions, response.data.team_analysis)
    } catch (error) {
      console.error('Error fetching suggestions:', error)
    } finally {
      setSuggestionsLoading(false)
    }
  }, [blueBans, redBans, bluePicks, redPicks, currentTeam, phase, setSuggestions])

  useEffect(() => {
    if (heroes.length > 0) {
      fetchSuggestions()
    }
  }, [fetchSuggestions, heroes.length])

  // Handle hero selection
  const handleHeroClick = (hero) => {
    if (!isHeroAvailable(hero.id)) return

    if (phase === 'ban') {
      banHero(hero.id)
      toast.success(`${hero.name} banned by ${currentTeam} team`)
    } else if (phase === 'pick') {
      pickHero(hero.id)
      toast.success(`${hero.name} picked by ${currentTeam} team`)
    }
  }

  // Filter heroes
  const filteredHeroes = heroes.filter(hero => {
    const matchesSearch = hero.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = selectedRole === 'all' || hero.role === selectedRole
    return matchesSearch && matchesRole
  })

  // Get hero by ID
  const getHeroById = (id) => heroes.find(h => h.id === id)

  // Get phase text
  const getPhaseText = () => {
    if (phase === 'ban') {
      return `Ban Phase - ${currentTeam === 'blue' ? 'Blue' : 'Red'} Team's Turn`
    } else if (phase === 'pick') {
      return `Pick Phase - ${currentTeam === 'blue' ? 'Blue' : 'Red'} Team's Turn`
    }
    return 'Draft Complete!'
  }

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
      {/* Phase Header */}
      <div className="text-center mb-8">
        <div className={`
          inline-flex items-center space-x-2 px-6 py-3 rounded-full font-semibold text-lg
          ${phase === 'complete' 
            ? 'bg-green-500/20 text-green-400' 
            : currentTeam === 'blue' 
              ? 'bg-ml-blue-500/20 text-ml-blue-400 phase-indicator' 
              : 'bg-ml-red-500/20 text-ml-red-400 phase-indicator'
          }
        `}>
          {phase !== 'complete' && (
            <Play className="w-5 h-5" />
          )}
          <span>{getPhaseText()}</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Left Side - Blue Team */}
        <div className="lg:col-span-1 order-2 lg:order-1">
          <div className="glass-panel p-4 sticky top-20">
            <h3 className="text-lg font-bold text-ml-blue-400 mb-4 flex items-center">
              <span className="w-3 h-3 rounded-full bg-ml-blue-500 mr-2"></span>
              Blue Team
            </h3>
            
            {/* Bans */}
            <div className="mb-4">
              <div className="text-sm text-white/50 mb-2">Bans</div>
              <div className="flex flex-wrap gap-2">
                {[0, 1, 2, 3, 4].map((index) => (
                  <HeroSlot
                    key={`blue-ban-${index}`}
                    hero={getHeroById(blueBans[index])}
                    team="blue"
                    type="ban"
                    index={index}
                    isActive={phase === 'ban' && currentTeam === 'blue' && blueBans.length === index}
                  />
                ))}
              </div>
            </div>

            {/* Picks */}
            <div>
              <div className="text-sm text-white/50 mb-2">Picks</div>
              <div className="flex flex-wrap gap-2">
                {[0, 1, 2, 3, 4].map((index) => (
                  <HeroSlot
                    key={`blue-pick-${index}`}
                    hero={getHeroById(bluePicks[index])}
                    team="blue"
                    type="pick"
                    index={index}
                    isActive={phase === 'pick' && currentTeam === 'blue' && bluePicks.length === index}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Center - Hero Selection */}
        <div className="lg:col-span-2 order-1 lg:order-2">
          {/* Controls */}
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

            {/* Actions */}
            <button
              onClick={undoLastAction}
              className="btn-secondary flex items-center space-x-2"
              disabled={blueBans.length + redBans.length + bluePicks.length + redPicks.length === 0}
            >
              <Undo2 className="w-4 h-4" />
              <span>Undo</span>
            </button>
            
            <button
              onClick={resetDraft}
              className="btn-danger flex items-center space-x-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
          </div>

          {/* Role Filter */}
          <div className="flex flex-wrap gap-2 mb-6">
            {ROLES.map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
                  selectedRole === role
                    ? 'bg-ml-blue-600 text-white'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          {/* Hero Grid */}
          <div className="glass-panel p-4 max-h-[600px] overflow-y-auto">
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
              {filteredHeroes.map((hero) => {
                const unavailableIds = getUnavailableHeroes()
                const isBanned = [...blueBans, ...redBans].includes(hero.id)
                const isPicked = [...bluePicks, ...redPicks].includes(hero.id)
                
                return (
                  <HeroCard
                    key={hero.id}
                    hero={hero}
                    onClick={handleHeroClick}
                    banned={isBanned}
                    picked={isPicked}
                    disabled={phase === 'complete'}
                  />
                )
              })}
            </div>
            
            {filteredHeroes.length === 0 && (
              <div className="text-center py-12 text-white/50">
                No heroes found
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Red Team & Suggestions */}
        <div className="lg:col-span-1 order-3 space-y-6">
          {/* Red Team */}
          <div className="glass-panel p-4">
            <h3 className="text-lg font-bold text-ml-red-400 mb-4 flex items-center">
              <span className="w-3 h-3 rounded-full bg-ml-red-500 mr-2"></span>
              Red Team
            </h3>
            
            {/* Bans */}
            <div className="mb-4">
              <div className="text-sm text-white/50 mb-2">Bans</div>
              <div className="flex flex-wrap gap-2">
                {[0, 1, 2, 3, 4].map((index) => (
                  <HeroSlot
                    key={`red-ban-${index}`}
                    hero={getHeroById(redBans[index])}
                    team="red"
                    type="ban"
                    index={index}
                    isActive={phase === 'ban' && currentTeam === 'red' && redBans.length === index}
                  />
                ))}
              </div>
            </div>

            {/* Picks */}
            <div>
              <div className="text-sm text-white/50 mb-2">Picks</div>
              <div className="flex flex-wrap gap-2">
                {[0, 1, 2, 3, 4].map((index) => (
                  <HeroSlot
                    key={`red-pick-${index}`}
                    hero={getHeroById(redPicks[index])}
                    team="red"
                    type="pick"
                    index={index}
                    isActive={phase === 'pick' && currentTeam === 'red' && redPicks.length === index}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* AI Suggestions */}
          <SuggestionPanel
            suggestions={suggestions}
            teamAnalysis={teamAnalysis}
            onSelectHero={handleHeroClick}
            loading={suggestionsLoading}
          />
        </div>
      </div>

      {/* Draft Complete Modal */}
      {phase === 'complete' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-panel p-8 max-w-2xl w-full">
            <h2 className="text-2xl font-bold text-white text-center mb-6">Draft Complete!</h2>
            
            <div className="grid grid-cols-2 gap-8 mb-6">
              {/* Blue Team */}
              <div>
                <h3 className="text-lg font-bold text-ml-blue-400 mb-4 text-center">Blue Team</h3>
                <div className="space-y-2">
                  {bluePicks.map((heroId, index) => {
                    const hero = getHeroById(heroId)
                    return hero ? (
                      <HeroCard key={heroId} hero={hero} compact />
                    ) : null
                  })}
                </div>
              </div>

              {/* Red Team */}
              <div>
                <h3 className="text-lg font-bold text-ml-red-400 mb-4 text-center">Red Team</h3>
                <div className="space-y-2">
                  {redPicks.map((heroId, index) => {
                    const hero = getHeroById(heroId)
                    return hero ? (
                      <HeroCard key={heroId} hero={hero} compact />
                    ) : null
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <button onClick={resetDraft} className="btn-primary">
                New Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
