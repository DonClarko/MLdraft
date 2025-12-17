import { useState, useEffect, useCallback } from 'react'
import { Search, RotateCcw, Undo2, Clock, Play } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDraftStore } from '../stores'
import { heroesApi, draftApi } from '../services/api'
import SuggestionPanel from '../components/SuggestionPanel'

// Lane filters matching ML Bang Bang
const LANES = [
  { id: 'all', name: 'All Lanes', icon: '⚔️' },
  { id: 'exp_lane', name: 'Exp Lane', icon: '🛡️' },
  { id: 'gold_lane', name: 'Gold Lane', icon: '💰' },
  { id: 'mid_lane', name: 'Mid Lane', icon: '🔮' },
  { id: 'roaming', name: 'Roaming', icon: '🌟' },
  { id: 'jungling', name: 'Jungling', icon: '🌲' }
]

// Role filters
const ROLES = [
  { id: 'all', name: 'All Roles', icon: '👥' },
  { id: 'tank', name: 'Tank', icon: '🛡️' },
  { id: 'fighter', name: 'Fighter', icon: '⚔️' },
  { id: 'assassin', name: 'Assassin', icon: '🗡️' },
  { id: 'mage', name: 'Mage', icon: '🔮' },
  { id: 'marksman', name: 'Marksman', icon: '🎯' },
  { id: 'support', name: 'Support', icon: '💚' }
]

// Map roles to lanes for filtering
const ROLE_TO_LANE = {
  fighter: ['exp_lane', 'gold_lane'],
  tank: ['roaming', 'exp_lane'],
  assassin: ['jungling', 'mid_lane'],
  mage: ['mid_lane', 'gold_lane'],
  marksman: ['gold_lane'],
  support: ['roaming']
}

// Role colors
const ROLE_COLORS = {
  tank: 'bg-blue-500',
  fighter: 'bg-orange-500',
  assassin: 'bg-purple-500',
  mage: 'bg-pink-500',
  marksman: 'bg-yellow-500',
  support: 'bg-green-500'
}

// Role icons as colored circles
const getRoleColor = (role) => ROLE_COLORS[role?.toLowerCase()] || 'bg-gray-500'

export default function DraftSimulator() {
  const [heroes, setHeroes] = useState([])
  const [loading, setLoading] = useState(true)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('lanes') // 'lanes' or 'roles'
  const [selectedLane, setSelectedLane] = useState('all')
  const [selectedRole, setSelectedRole] = useState('all')
  const [timer, setTimer] = useState(30)
  const [draftStarted, setDraftStarted] = useState(false)
  
  const {
    phase,
    currentTeam,
    currentStep,
    turnActionsLeft,
    blueBans,
    redBans,
    bluePicks,
    redPicks,
    suggestions,
    teamAnalysis,
    setSuggestions,
    banHero,
    pickHero,
    skipRemainingBans,
    undoLastAction,
    resetDraft,
    isHeroAvailable,
    getPhaseInfo,
    getTurnInfo
  } = useDraftStore()

  // Timer countdown effect - only counts down, doesn't handle skip
  useEffect(() => {
    if (phase === 'complete' || !draftStarted) return
    
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          return 0 // Signal timer expired
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(interval)
  }, [phase, draftStarted])

  // Handle timer expiry - skip remaining bans when timer hits 0
  useEffect(() => {
    if (timer === 0 && draftStarted && phase === 'ban') {
      skipRemainingBans()
      setTimer(30) // Reset timer after skip
    }
  }, [timer, draftStarted, phase, skipRemainingBans])

  // Reset timer on step change (new turn)
  useEffect(() => {
    if (draftStarted) {
      setTimer(30)
    }
  }, [currentStep, draftStarted])

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
    if (phase === 'complete' || !draftStarted) return
    
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
  }, [blueBans, redBans, bluePicks, redPicks, currentTeam, phase, setSuggestions, draftStarted])

  useEffect(() => {
    if (heroes.length > 0 && draftStarted) {
      fetchSuggestions()
    }
  }, [fetchSuggestions, heroes.length, draftStarted])

  // Handle hero selection
  const handleHeroClick = (hero) => {
    if (!draftStarted || !isHeroAvailable(hero.id)) return

    if (phase === 'ban') {
      banHero(hero.id)
    } else if (phase === 'pick') {
      pickHero(hero.id)
    }
    setTimer(30)
  }

  // Filter heroes by lane or role
  const filteredHeroes = heroes.filter(hero => {
    const matchesSearch = hero.name.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (filterType === 'lanes') {
      if (selectedLane === 'all') return matchesSearch
      const heroLanes = ROLE_TO_LANE[hero.role?.toLowerCase()] || []
      const matchesLane = heroLanes.includes(selectedLane)
      return matchesSearch && matchesLane
    } else {
      if (selectedRole === 'all') return matchesSearch
      const matchesRole = hero.role?.toLowerCase() === selectedRole
      return matchesSearch && matchesRole
    }
  })

  // Get hero by ID
  const getHeroById = (id) => heroes.find(h => h.id === id)

  // Start draft
  const handleStartDraft = () => {
    setDraftStarted(true)
    setTimer(30)
    toast.success('Draft started!')
  }

  // Reset draft and go back to start screen
  const handleResetDraft = () => {
    resetDraft()
    setDraftStarted(false)
    setTimer(30)
  }

  // Render ban slot (circular style like ML)
  const renderBanSlot = (heroId, team, index) => {
    const hero = heroId ? getHeroById(heroId) : null
    const isSkipped = heroId === null
    const currentBanCount = team === 'blue' ? blueBans.length : redBans.length
    // Only highlight slots within the current turn's range
    // e.g., if Blue needs to ban 3 and has banned 1, highlight index 1, 2 (not 3, 4)
    const targetEndIndex = currentBanCount + turnActionsLeft
    const isActive = draftStarted && phase === 'ban' && currentTeam === team && 
                     index >= currentBanCount && index < targetEndIndex
    const isFilled = hero || isSkipped
    
    return (
      <div
        key={`${team}-ban-${index}`}
        className="flex flex-col items-center"
      >
        <div
          className={`
            relative w-12 h-12 md:w-14 md:h-14 rounded-full border-2
            ${isFilled ? 'bg-gray-800' : 'bg-gray-900/50'}
            ${isActive 
              ? team === 'blue' 
                ? 'border-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]' 
                : 'border-red-400 shadow-[0_0_10px_rgba(248,113,113,0.5)]'
              : team === 'blue' 
                ? 'border-blue-500/40' 
                : 'border-red-500/40'
            }
            overflow-hidden
          `}
        >
          {isFilled ? (
            <div className="flex items-center justify-center h-full bg-gray-800">
              <span className="text-red-500 text-2xl font-bold">✕</span>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className={`text-xl ${team === 'blue' ? 'text-blue-400/50' : 'text-red-400/50'}`}>?</span>
            </div>
          )}
        </div>
        {/* Hero name and role below the ban circle */}
        <div className="mt-1 text-center w-16">
          <div className={`text-[10px] font-medium truncate ${isFilled ? 'text-white/80' : 'text-white/30'}`}>
            {hero ? hero.name : isSkipped ? 'Skipped' : 'Ban ' + (index + 1)}
          </div>
          <div className="text-[8px] text-gray-500 truncate capitalize">
            {hero ? hero.role : ''}
          </div>
        </div>
      </div>
    )
  }

  // Render pick slot (vertical player style like ML)
  const renderPickSlot = (heroId, team, index) => {
    const hero = getHeroById(heroId)
    const currentPickCount = team === 'blue' ? bluePicks.length : redPicks.length
    // Only highlight slots within the current turn's range
    const targetEndIndex = currentPickCount + turnActionsLeft
    const isActive = draftStarted && phase === 'pick' && currentTeam === team && 
                     index >= currentPickCount && index < targetEndIndex
    
    return (
      <div
        key={`${team}-pick-${index}`}
        className={`
          relative flex items-center gap-2 p-2 rounded-lg
          ${hero 
            ? team === 'blue' ? 'bg-blue-900/40' : 'bg-red-900/40'
            : team === 'blue' ? 'bg-blue-900/20' : 'bg-red-900/20'
          }
          ${isActive 
            ? team === 'blue' 
              ? 'border-2 border-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]' 
              : 'border-2 border-red-400 shadow-[0_0_10px_rgba(248,113,113,0.5)]'
            : 'border border-transparent'
          }
        `}
      >
        {/* Hero Avatar */}
        <div className={`
          w-12 h-12 md:w-14 md:h-14 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center
          ${hero 
            ? getRoleColor(hero.role) 
            : team === 'blue' ? 'bg-blue-800/50' : 'bg-red-800/50'
          }
        `}>
          {hero ? (
            <span className="text-white text-xl font-bold">{hero.name?.charAt(0)}</span>
          ) : (
            <span className={`text-lg ${team === 'blue' ? 'text-blue-400/50' : 'text-red-400/50'}`}>?</span>
          )}
        </div>
        
        {/* Player info */}
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium truncate ${team === 'blue' ? 'text-blue-200' : 'text-red-200'}`}>
            {hero ? hero.name : `Player ${index + 1}`}
          </div>
          <div className="text-xs text-gray-400 capitalize truncate">
            {hero ? (hero.role + (hero.secondary_role ? `/${hero.secondary_role}` : '')) : 'Waiting...'}
          </div>
        </div>
      </div>
    )
  }

  // Hero card for the grid - ML Bang Bang style with name/role below
  const renderHeroCard = (hero) => {
    const isBanned = [...blueBans, ...redBans].includes(hero.id)
    const isPicked = [...bluePicks, ...redPicks].includes(hero.id)
    const isUnavailable = isBanned || isPicked || !draftStarted || phase === 'complete'
    
    return (
      <button
        key={hero.id}
        onClick={() => handleHeroClick(hero)}
        disabled={isUnavailable}
        className={`
          relative flex flex-col items-center p-2 rounded-lg transition-all duration-150
          ${isUnavailable 
            ? 'opacity-40 cursor-not-allowed' 
            : 'hover:bg-white/10 cursor-pointer hover:scale-105'
          }
          ${getRoleColor(hero.role)} bg-opacity-20
        `}
      >
        {/* Hero Image */}
        <div className={`
          w-14 h-14 md:w-16 md:h-16 rounded-lg overflow-hidden mb-1
          ${getRoleColor(hero.role)}
          ${isBanned ? 'grayscale' : ''}
        `}>
          {hero.image_url ? (
            <img 
              src={hero.image_url} 
              alt={hero.name} 
              className="w-full h-full object-cover"
              onError={(e) => e.target.src = '/placeholder-hero.png'}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-lg font-bold">
              {hero.name?.charAt(0)}
            </div>
          )}
        </div>

        {/* Hero Name */}
        <div className="text-[11px] md:text-xs font-medium text-white text-center truncate w-full leading-tight">
          {hero.name}
        </div>

        {/* Role */}
        <div className="text-[9px] md:text-[10px] text-gray-400 capitalize truncate w-full text-center">
          {hero.role}{hero.secondary_role && `/${hero.secondary_role}`}
        </div>

        {/* Status Overlay */}
        {isBanned && (
          <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
            <span className="text-red-500 text-2xl">✕</span>
          </div>
        )}
        {isPicked && (
          <div className="absolute inset-0 bg-green-500/30 rounded-lg flex items-center justify-center">
            <span className="text-green-400 text-lg">✓</span>
          </div>
        )}
      </button>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/70">Loading heroes...</p>
        </div>
      </div>
    )
  }

  const phaseInfo = getPhaseInfo()

  // Start Screen - Before draft begins
  if (!draftStarted) {
    return (
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center py-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            ML Draft Simulator
          </h1>
          <p className="text-lg text-gray-400 mb-8">
            Practice your drafting skills with real ML Bang Bang draft format
          </p>
          
          {/* Draft Format Info */}
          <div className="bg-gray-800/50 rounded-xl p-6 mb-8 border border-white/10 max-w-lg mx-auto">
            <h3 className="text-xl font-semibold text-white mb-4">Draft Format</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-blue-900/30 rounded-lg p-3 border border-blue-500/30">
                <div className="text-blue-400 font-semibold mb-1">Blue Team</div>
                <div className="text-gray-400">5 Bans • 5 Picks</div>
                <div className="text-xs text-gray-500 mt-1">First Pick</div>
              </div>
              <div className="bg-red-900/30 rounded-lg p-3 border border-red-500/30">
                <div className="text-red-400 font-semibold mb-1">Red Team</div>
                <div className="text-gray-400">5 Bans • 5 Picks</div>
                <div className="text-xs text-gray-500 mt-1">Last Pick</div>
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              20 steps total • 30 seconds per turn
            </div>
          </div>

          <button
            onClick={handleStartDraft}
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xl font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg shadow-purple-500/30"
          >
            <Play className="w-6 h-6" />
            Start Draft
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1600px] mx-auto px-2 md:px-4">
      {/* Main Draft Layout */}
      <div className="grid grid-cols-12 gap-2 md:gap-4">
        
        {/* Left Side - Blue Team */}
        <div className="col-span-12 lg:col-span-3 order-2 lg:order-1">
          <div className="bg-gradient-to-b from-blue-900/40 to-blue-950/60 rounded-xl p-4 border border-blue-500/30">
            <h3 className="text-base font-bold text-blue-400 mb-3 text-center">BLUE TEAM</h3>
            
            {/* Blue Bans - Horizontal row */}
            <div className="flex justify-center gap-2 mb-4">
              {[0, 1, 2, 3, 4].map((index) => renderBanSlot(blueBans[index], 'blue', index))}
            </div>
            
            {/* Blue Picks - Vertical list */}
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((index) => renderPickSlot(bluePicks[index], 'blue', index))}
            </div>
          </div>
        </div>

        {/* Center - Phase Header & Hero Selection */}
        <div className="col-span-12 lg:col-span-6 order-1 lg:order-2">
          {/* Phase Header with Timer */}
          <div className="bg-gradient-to-r from-blue-900/50 via-gray-900/80 to-red-900/50 rounded-xl p-3 mb-3 border border-white/10">
            <div className="grid grid-cols-3 items-center">
              {/* Blue Team Indicator */}
              <div className="flex items-center gap-2 justify-start">
                <div className={`w-2.5 h-2.5 rounded-full ${currentTeam === 'blue' && phase !== 'complete' ? 'bg-blue-400' : 'bg-blue-600/50'}`}></div>
                <span className={`text-sm font-semibold ${currentTeam === 'blue' ? 'text-blue-400' : 'text-blue-400/50'}`}>Blue</span>
                {currentTeam === 'blue' && phase !== 'complete' && (
                  <span className="text-[10px] bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded">Your turn</span>
                )}
              </div>

              {/* Center Phase Info */}
              <div className="text-center">
                <div className="text-base md:text-lg font-bold text-white">
                  {phaseInfo.name}
                </div>
                <div className={`
                  inline-flex items-center justify-center gap-2 px-3 py-1 rounded-full text-sm mx-auto
                  ${phase === 'complete' 
                    ? 'bg-green-500/20 text-green-400' 
                    : timer <= 10 
                      ? 'bg-red-500/20 text-red-400' 
                      : 'bg-yellow-500/20 text-yellow-400'
                  }
                `}>
                  <Clock className="w-4 h-4" />
                  <span className="text-xl font-bold font-mono w-8 text-center">{timer}</span>
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  {phase !== 'complete' ? (
                    <>
                      {turnActionsLeft} {phase === 'ban' ? 'ban' : 'pick'}{turnActionsLeft > 1 ? 's' : ''} left
                    </>
                  ) : (
                    'Draft Complete'
                  )}
                </div>
              </div>

              {/* Red Team Indicator */}
              <div className="flex items-center gap-2 justify-end">
                {currentTeam === 'red' && phase !== 'complete' && (
                  <span className="text-[10px] bg-red-500/30 text-red-300 px-2 py-0.5 rounded">Your turn</span>
                )}
                <span className={`text-sm font-semibold ${currentTeam === 'red' ? 'text-red-400' : 'text-red-400/50'}`}>Red</span>
                <div className={`w-2.5 h-2.5 rounded-full ${currentTeam === 'red' && phase !== 'complete' ? 'bg-red-400' : 'bg-red-600/50'}`}></div>
              </div>
            </div>
          </div>

          {/* Filter Type Toggle */}
          <div className="flex flex-col gap-2 mb-3">
            {/* Toggle Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setFilterType('lanes')
                  setSelectedRole('all')
                }}
                className={`
                  px-3 py-1 rounded-lg text-sm font-medium transition-all
                  ${filterType === 'lanes'
                    ? 'bg-yellow-500/30 text-yellow-400 border border-yellow-500/50'
                    : 'bg-white/5 text-white/50 hover:bg-white/10 border border-transparent'
                  }
                `}
              >
                All Lanes
              </button>
              <button
                onClick={() => {
                  setFilterType('roles')
                  setSelectedLane('all')
                }}
                className={`
                  px-3 py-1 rounded-lg text-sm font-medium transition-all
                  ${filterType === 'roles'
                    ? 'bg-purple-500/30 text-purple-400 border border-purple-500/50'
                    : 'bg-white/5 text-white/50 hover:bg-white/10 border border-transparent'
                  }
                `}
              >
                All Roles
              </button>
            </div>

            {/* Filter Options */}
            <div className="flex items-center gap-1.5">
              {filterType === 'lanes' ? (
                LANES.map((lane) => (
                  <button
                    key={lane.id}
                    onClick={() => setSelectedLane(lane.id)}
                    className={`
                      flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all text-sm
                      ${selectedLane === lane.id 
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' 
                        : 'bg-white/5 text-white/60 hover:bg-white/10 border border-transparent'
                      }
                    `}
                  >
                    <span>{lane.icon}</span>
                    <span>{lane.name}</span>
                  </button>
                ))
              ) : (
                ROLES.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    className={`
                      flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all text-sm
                      ${selectedRole === role.id 
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50' 
                        : 'bg-white/5 text-white/60 hover:bg-white/10 border border-transparent'
                      }
                    `}
                  >
                    <span>{role.icon}</span>
                    <span>{role.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Search and Controls */}
          <div className="flex flex-wrap gap-2 mb-3">
            <div className="flex-1 min-w-[180px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
                <input
                  type="text"
                  placeholder="Search heroes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-blue-500/50"
                />
              </div>
            </div>
            <button
              onClick={undoLastAction}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/70 hover:text-white transition-all text-sm"
              disabled={currentStep === 0}
            >
              <Undo2 className="w-4 h-4" />
              <span className="hidden sm:inline">Undo</span>
            </button>
            <button
              onClick={handleResetDraft}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:text-red-300 transition-all text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>

          {/* Hero Grid - 6 columns horizontal, ML Style */}
          <div className="bg-gray-900/60 rounded-xl p-3 border border-white/10 max-h-[350px] overflow-y-auto">
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
              {filteredHeroes.map((hero) => renderHeroCard(hero))}
            </div>
            
            {filteredHeroes.length === 0 && (
              <div className="text-center py-12 text-white/50">
                No heroes found
              </div>
            )}
          </div>

          {/* AI Suggestions - Below hero grid */}
          <div className="mt-3">
            <SuggestionPanel
              suggestions={suggestions}
              teamAnalysis={teamAnalysis}
              onSelectHero={handleHeroClick}
              loading={suggestionsLoading}
            />
          </div>
        </div>

        {/* Right Side - Red Team */}
        <div className="col-span-12 lg:col-span-3 order-3">
          <div className="bg-gradient-to-b from-red-900/40 to-red-950/60 rounded-xl p-4 border border-red-500/30">
            <h3 className="text-base font-bold text-red-400 mb-3 text-center">RED TEAM</h3>
            
            {/* Red Bans - Horizontal row */}
            <div className="flex justify-center gap-2 mb-4">
              {[0, 1, 2, 3, 4].map((index) => renderBanSlot(redBans[index], 'red', index))}
            </div>
            
            {/* Red Picks - Vertical list */}
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((index) => renderPickSlot(redPicks[index], 'red', index))}
            </div>
          </div>
        </div>
      </div>

      {/* Draft Complete Modal */}
      {phase === 'complete' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl p-6 md:p-8 max-w-3xl w-full border border-white/20">
            <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-6">🏆 Draft Complete!</h2>
            
            <div className="grid grid-cols-2 gap-4 md:gap-6 mb-6">
              {/* Blue Team */}
              <div className="bg-blue-900/30 rounded-xl p-3 md:p-4 border border-blue-500/30">
                <h3 className="text-lg font-bold text-blue-400 mb-3 text-center">Blue Team</h3>
                <div className="space-y-2">
                  {bluePicks.map((heroId) => {
                    const hero = getHeroById(heroId)
                    return hero ? (
                      <div key={heroId} className="flex items-center gap-2 bg-blue-900/30 rounded-lg p-2">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${getRoleColor(hero.role)}`}>
                          <span className="text-white text-lg font-bold">{hero.name?.charAt(0)}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-white font-medium text-sm truncate">{hero.name}</div>
                          <div className="text-[10px] text-gray-400 capitalize">{hero.role}</div>
                        </div>
                      </div>
                    ) : null
                  })}
                </div>
              </div>

              {/* Red Team */}
              <div className="bg-red-900/30 rounded-xl p-3 md:p-4 border border-red-500/30">
                <h3 className="text-lg font-bold text-red-400 mb-3 text-center">Red Team</h3>
                <div className="space-y-2">
                  {redPicks.map((heroId) => {
                    const hero = getHeroById(heroId)
                    return hero ? (
                      <div key={heroId} className="flex items-center gap-2 bg-red-900/30 rounded-lg p-2">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${getRoleColor(hero.role)}`}>
                          <span className="text-white text-lg font-bold">{hero.name?.charAt(0)}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-white font-medium text-sm truncate">{hero.name}</div>
                          <div className="text-[10px] text-gray-400 capitalize">{hero.role}</div>
                        </div>
                      </div>
                    ) : null
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <button 
                onClick={handleResetDraft} 
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all"
              >
                New Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

