import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { AlertTriangle, BarChart3, Clock, Crown, History, Play, RotateCcw, Search, Sparkles, Swords, Undo2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDraftStore, DRAFT_MODES } from '../stores'
import { heroesApi, draftApi } from '../services/api'

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

const SKILL_SECTION_LABELS = {
  passive: 'Passive',
  skill_1: 'Skill 1',
  skill_2: 'Skill 2',
  skill_3: 'Skill 3',
  skill_4: 'Skill 4',
  ultimate: 'Ultimate'
}

// Role icons as colored circles
const getRoleColor = (role) => ROLE_COLORS[role?.toLowerCase()] || 'bg-gray-500'

function parseHeroSkills(skills) {
  if (!skills) {
    return []
  }

  try {
    const parsed = typeof skills === 'string' ? JSON.parse(skills) : skills
    if (!parsed || !Array.isArray(parsed.abilities)) {
      return []
    }

    return parsed.abilities.filter((ability) => ability?.name && ability?.description)
  } catch (error) {
    console.error('Failed to parse hero skills:', error)
    return []
  }
}

function formatSkillSection(skill) {
  return SKILL_SECTION_LABELS[skill.slot] || skill.section || 'Skill'
}

function parseStoredJson(value, fallback) {
  if (!value) {
    return fallback
  }

  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function formatSavedDate(value) {
  if (!value) {
    return 'Unknown time'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

function buildDraftVerdict(draftResult) {
  if (draftResult?.verdict) {
    return {
      winner: draftResult.verdict.winner,
      edge: draftResult.verdict.edge,
      winProbability: draftResult.verdict.win_probability,
      verdict: draftResult.verdict.label,
      reasons: draftResult.verdict.summary_reasons || [],
    }
  }

  if (!draftResult?.blue_team || !draftResult?.red_team) {
    return null
  }

  const blueTeam = draftResult.blue_team
  const redTeam = draftResult.red_team
  const blueWin = blueTeam.win_probability || 50
  const redWin = redTeam.win_probability || 50
  const winner = blueWin >= redWin ? 'blue' : 'red'
  const leadingTeam = winner === 'blue' ? blueTeam : redTeam
  const trailingTeam = winner === 'blue' ? redTeam : blueTeam
  const edge = Math.abs(blueWin - redWin)

  const reasons = []
  if ((leadingTeam.synergy_count || 0) > (trailingTeam.synergy_count || 0)) {
    reasons.push('Mas maganda ang combo at follow-up ng lineup na ito')
  }
  if ((leadingTeam.strengths || []).length > (trailingTeam.strengths || []).length) {
    reasons.push('Mas kumpleto ang draft structure base sa team strengths')
  }
  if ((leadingTeam.weaknesses || []).length < (trailingTeam.weaknesses || []).length) {
    reasons.push('Mas kaunti ang obvious draft weaknesses nila')
  }
  if ((leadingTeam.average_tier || 'C') !== (trailingTeam.average_tier || 'C')) {
    reasons.push(`Mas mataas ang average tier nila: ${leadingTeam.average_tier}`)
  }

  return {
    winner,
    edge,
    winProbability: winner === 'blue' ? blueWin : redWin,
    verdict: edge >= 12 ? 'Malinaw ang draft edge' : edge >= 6 ? 'May lamang sa draft' : 'Halos dikit ang draft',
    reasons: reasons.slice(0, 3),
  }
}

export default function DraftSimulator() {
  const [heroes, setHeroes] = useState([])
  const [loading, setLoading] = useState(true)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [suggestionGroups, setSuggestionGroups] = useState({ counter: [], synergy: [], safe: [] })
  const [avoidSuggestions, setAvoidSuggestions] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('lanes') // 'lanes' or 'roles'
  const [selectedLane, setSelectedLane] = useState('all')
  const [selectedRole, setSelectedRole] = useState('all')
  const [hoverPopup, setHoverPopup] = useState(null)
  const [mobileSkillSheet, setMobileSkillSheet] = useState(null)
  const [isMobileViewport, setIsMobileViewport] = useState(false)
  const [draftResult, setDraftResult] = useState(null)
  const [draftResultLoading, setDraftResultLoading] = useState(false)
  const [draftHistory, setDraftHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [savedDraftId, setSavedDraftId] = useState(null)
  const [savingDraftResult, setSavingDraftResult] = useState(false)
  const [timer, setTimer] = useState(30)
  const [draftStarted, setDraftStarted] = useState(false)
  const hoverTimeoutRef = useRef(null)
  const hideTimeoutRef = useRef(null)
  
  const {
    draftMode,
    setDraftMode,
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

  const recommendationMeta = useMemo(() => {
    const meta = new Map()

    suggestions.slice(0, 3).forEach((suggestion, index) => {
      meta.set(suggestion.hero.id, {
        rank: index + 1,
        tags: [],
        avoid: false,
      })
    })

    const mergeTag = (items, tag) => {
      items.forEach((suggestion) => {
        const current = meta.get(suggestion.hero.id) || { rank: null, tags: [], avoid: false }
        if (!current.tags.includes(tag)) {
          current.tags.push(tag)
        }
        meta.set(suggestion.hero.id, current)
      })
    }

    mergeTag(suggestionGroups.counter || [], 'Counter')
    mergeTag(suggestionGroups.synergy || [], 'Synergy')
    mergeTag(suggestionGroups.safe || [], 'Safe')

    ;(avoidSuggestions || []).forEach((suggestion) => {
      const current = meta.get(suggestion.hero.id) || { rank: null, tags: [], avoid: false }
      current.avoid = true
      meta.set(suggestion.hero.id, current)
    })

    return meta
  }, [avoidSuggestions, suggestionGroups.counter, suggestionGroups.safe, suggestionGroups.synergy, suggestions])

  const quickPicks = useMemo(() => suggestions.slice(0, 3), [suggestions])
  const draftVerdict = useMemo(() => buildDraftVerdict(draftResult), [draftResult])
  const blueStandouts = draftResult?.blue_team?.standout_picks || []
  const redStandouts = draftResult?.red_team?.standout_picks || []

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const response = await draftApi.getHistory(6)
      setDraftHistory(response.data || [])
    } catch (error) {
      console.error('Error fetching draft history:', error)
    } finally {
      setHistoryLoading(false)
    }
  }, [])

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
    const updateViewportMode = () => {
      const supportsHover = window.matchMedia('(hover: hover)').matches
      setIsMobileViewport(window.innerWidth < 1024 || !supportsHover)
    }

    updateViewportMode()
    window.addEventListener('resize', updateViewportMode)

    return () => window.removeEventListener('resize', updateViewportMode)
  }, [])

  useEffect(() => {
    if (!isMobileViewport) {
      setMobileSkillSheet(null)
    }
  }, [isMobileViewport])

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

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

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
      setSuggestionGroups(response.data.suggestion_groups || { counter: [], synergy: [], safe: [] })
      setAvoidSuggestions(response.data.avoid_suggestions || [])
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

  useEffect(() => {
    const fetchDraftResult = async () => {
      if (phase !== 'complete' || bluePicks.length === 0 || redPicks.length === 0) {
        return
      }

      setDraftResultLoading(true)
      try {
        const response = await draftApi.analyze({
          bans: [...blueBans, ...redBans],
          blue_picks: bluePicks,
          red_picks: redPicks,
          current_team: 'blue'
        })
        setDraftResult(response.data)
      } catch (error) {
        console.error('Error analyzing completed draft:', error)
        toast.error('Failed to analyze completed draft')
      } finally {
        setDraftResultLoading(false)
      }
    }

    if (phase === 'complete') {
      fetchDraftResult()
    } else {
      setDraftResult(null)
      setSavedDraftId(null)
    }
  }, [phase, blueBans, redBans, bluePicks, redPicks])

  useEffect(() => {
    const saveCompletedDraft = async () => {
      if (phase !== 'complete' || !draftResult || !draftVerdict || savingDraftResult || savedDraftId) {
        return
      }

      setSavingDraftResult(true)
      try {
        const response = await draftApi.save({
          blue_bans: JSON.stringify(blueBans),
          red_bans: JSON.stringify(redBans),
          blue_picks: JSON.stringify(bluePicks),
          red_picks: JSON.stringify(redPicks),
          winner: draftVerdict.winner,
          verdict: draftVerdict.verdict,
          analysis_summary: draftVerdict.reasons.join(' | '),
          blue_win_probability: draftResult.blue_team?.win_probability,
          red_win_probability: draftResult.red_team?.win_probability,
          standout_picks: JSON.stringify({
            blue: blueStandouts,
            red: redStandouts,
          }),
        })
        setSavedDraftId(response.data?.id || true)
        fetchHistory()
      } catch (error) {
        console.error('Error saving completed draft:', error)
      } finally {
        setSavingDraftResult(false)
      }
    }

    saveCompletedDraft()
  }, [
    phase,
    draftResult,
    draftVerdict,
    savingDraftResult,
    savedDraftId,
    blueBans,
    redBans,
    bluePicks,
    redPicks,
    blueStandouts,
    redStandouts,
    fetchHistory,
  ])

  // Handle hero selection
  const handleHeroClick = (hero) => {
    clearHoverPreview()
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

  const clearHoverPreview = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
    setHoverPopup(null)
  }, [])

  const closeMobileSkillSheet = useCallback(() => {
    setMobileSkillSheet(null)
  }, [])

  const getPopupPosition = useCallback((element) => {
    const rect = element.getBoundingClientRect()
    const popupWidth = 360
    const popupHeight = 420
    const gap = 12
    const margin = 16

    let left = rect.right + gap
    if (left + popupWidth > window.innerWidth - margin) {
      left = rect.left - popupWidth - gap
    }
    left = Math.max(margin, left)

    let top = rect.top
    if (top + popupHeight > window.innerHeight - margin) {
      top = window.innerHeight - popupHeight - margin
    }
    top = Math.max(margin, top)

    return { left, top }
  }, [])

  const showHoverPreview = useCallback((hero, element) => {
    if (isMobileViewport) {
      return
    }

    const skills = parseHeroSkills(hero.skills)
    if (skills.length === 0) {
      return
    }

    setHoverPopup({
      hero,
      skills,
      position: getPopupPosition(element)
    })
  }, [getPopupPosition, isMobileViewport])

  const handleHeroHoverStart = useCallback((hero, element) => {
    if (isMobileViewport) {
      return
    }

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }

    hoverTimeoutRef.current = setTimeout(() => {
      showHoverPreview(hero, element)
      hoverTimeoutRef.current = null
    }, 550)
  }, [isMobileViewport, showHoverPreview])

  const handleHeroHoverMove = useCallback((hero, element) => {
    if (isMobileViewport) {
      return
    }

    setHoverPopup((current) => {
      if (!current || current.hero.id !== hero.id) {
        return current
      }

      return {
        ...current,
        position: getPopupPosition(element)
      }
    })
  }, [getPopupPosition, isMobileViewport])

  const handleHeroHoverEnd = useCallback((heroId) => {
    if (isMobileViewport) {
      return
    }

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }

    hideTimeoutRef.current = setTimeout(() => {
      setHoverPopup((current) => (current?.hero.id === heroId ? null : current))
      hideTimeoutRef.current = null
    }, 180)
  }, [isMobileViewport])

  const handlePickSlotClick = useCallback((hero) => {
    if (!hero || !isMobileViewport) {
      return
    }

    const skills = parseHeroSkills(hero.skills)
    if (skills.length === 0) {
      return
    }

    setMobileSkillSheet({ hero, skills })
  }, [isMobileViewport])

  const handlePopupMouseEnter = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
  }, [])

  const handlePopupMouseLeave = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
    }

    hideTimeoutRef.current = setTimeout(() => {
      setHoverPopup(null)
      hideTimeoutRef.current = null
    }, 120)
  }, [])

  useEffect(() => () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
    }
  }, [])

  // Start draft
  const handleStartDraft = () => {
    setDraftStarted(true)
    setDraftResult(null)
    setSavedDraftId(null)
    setTimer(30)
    toast.success('Draft started!')
  }

  // Reset draft and go back to start screen
  const handleResetDraft = () => {
    clearHoverPreview()
    resetDraft()
    setDraftStarted(false)
    setTimer(30)
    setSuggestionGroups({ counter: [], synergy: [], safe: [] })
    setAvoidSuggestions([])
    setMobileSkillSheet(null)
    setDraftResult(null)
    setSavedDraftId(null)
  }

  const renderQuickPickPanel = (sideTeam) => {
    if (!draftStarted || phase === 'complete' || phase !== 'pick') {
      return null
    }

    const shouldShow = (currentTeam === 'blue' && sideTeam === 'red') || (currentTeam === 'red' && sideTeam === 'blue')
    if (!shouldShow) {
      return null
    }

    const focusTeamLabel = currentTeam === 'blue' ? 'Blue' : 'Red'
    const accentClasses = sideTeam === 'red'
      ? 'border-red-500/25 bg-red-500/10'
      : 'border-blue-500/25 bg-blue-500/10'

    return (
      <div className={`mb-4 rounded-xl border p-3 backdrop-blur-sm ${accentClasses}`}>
        <div className="mb-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-ml-gold-400" />
            <h3 className="text-sm font-bold text-white">AI Recommendations</h3>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/60">
              For {focusTeamLabel} pick
            </span>
          </div>

          {avoidSuggestions.length > 0 && (
            <div className="flex items-center gap-2 text-[11px] text-red-200/90">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Risky now: {avoidSuggestions.slice(0, 2).map((item) => item.hero.name).join(', ')}</span>
            </div>
          )}
        </div>

        {quickPicks.length > 0 ? (
          <div className="space-y-2">
            {quickPicks.map((suggestion, index) => (
              <button
                key={suggestion.hero.id}
                onClick={() => handleHeroClick(suggestion.hero)}
                className="w-full rounded-xl border border-ml-gold-500/20 bg-black/20 p-3 text-left transition hover:border-ml-gold-400/50 hover:bg-white/10"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${index === 0 ? 'bg-ml-gold-400 text-black' : 'bg-white/10 text-white'}`}>
                    #{index + 1}
                  </span>
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    {suggestion.hero.global_rg_win_rate != null && (
                      <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200">
                        WR {Number(suggestion.hero.global_rg_win_rate).toFixed(1)}%
                      </span>
                    )}
                    {suggestion.lane_fit && (
                      <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-200">
                        {suggestion.lane_fit}
                      </span>
                    )}
                    <span className="rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2 py-0.5 text-[10px] text-yellow-300">
                      Tier {suggestion.tier}
                    </span>
                  </div>
                </div>
                <div className="text-sm font-semibold text-white">{suggestion.hero.name}</div>
                <div className="mt-1 text-xs text-white/65">{suggestion.reasons[0] || 'Good fit for this draft state'}</div>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 bg-black/10 px-3 py-4 text-sm text-white/50">
            Start the draft to get live recommendations.
          </div>
        )}
      </div>
    )
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
        onClick={hero ? () => handlePickSlotClick(hero) : undefined}
        onMouseEnter={hero ? (event) => handleHeroHoverStart(hero, event.currentTarget) : undefined}
        onMouseMove={hero ? (event) => handleHeroHoverMove(hero, event.currentTarget) : undefined}
        onMouseLeave={hero ? () => handleHeroHoverEnd(hero.id) : undefined}
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
          ${hero && isMobileViewport ? 'cursor-pointer' : ''}
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
    const heroMeta = recommendationMeta.get(hero.id)
    const isRecommended = Boolean(heroMeta?.rank)
    const isAvoid = Boolean(heroMeta?.avoid)
    
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
          ${isRecommended ? 'ring-2 ring-ml-gold-400/80 shadow-[0_0_18px_rgba(245,158,11,0.22)]' : ''}
          ${isAvoid && !isRecommended ? 'ring-1 ring-red-400/70' : ''}
          ${getRoleColor(hero.role)} bg-opacity-20
        `}
      >
        {isRecommended && !isUnavailable && (
          <div className="absolute left-1.5 top-1.5 z-10 rounded-full bg-ml-gold-400 px-2 py-0.5 text-[10px] font-bold text-black shadow-lg">
            AI #{heroMeta.rank}
          </div>
        )}

        {isAvoid && !isUnavailable && !isRecommended && (
          <div className="absolute left-1.5 top-1.5 z-10 rounded-full border border-red-400/30 bg-red-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-lg">
            Risky
          </div>
        )}

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

        {heroMeta?.tags?.length > 0 && !isUnavailable && (
          <div className="mt-1 flex flex-wrap justify-center gap-1">
            {heroMeta.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="rounded-full border border-white/10 bg-black/30 px-1.5 py-0.5 text-[9px] text-white/80">
                {tag}
              </span>
            ))}
          </div>
        )}

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
            Pumili ng draft format at simulahin ang pick/ban phase ng Mobile Legends
          </p>
          
          {/* Draft Mode Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-3xl mx-auto">
            {Object.values(DRAFT_MODES).map((mode) => (
              <button
                key={mode.id}
                onClick={() => setDraftMode(mode.id)}
                className={`
                  relative p-5 rounded-xl border-2 transition-all text-left
                  ${draftMode === mode.id 
                    ? 'border-yellow-500 bg-yellow-500/10 shadow-[0_0_20px_rgba(234,179,8,0.2)]' 
                    : 'border-white/10 bg-gray-800/50 hover:border-white/30 hover:bg-gray-800/80'
                  }
                `}
              >
                {draftMode === mode.id && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                    <span className="text-black text-xs font-bold">✓</span>
                  </div>
                )}
                <div className="text-2xl mb-2">{mode.icon}</div>
                <div className="text-white font-bold text-lg">{mode.name}</div>
                <div className="text-gray-400 text-sm mt-1">{mode.description}</div>
                <div className="mt-3 flex gap-2">
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                    {mode.bansPerTeam} Bans
                  </span>
                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                    5 Picks
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className="mx-auto mb-8 max-w-5xl rounded-2xl border border-white/10 bg-gray-900/55 p-5">
            <div className="mb-4 flex items-center gap-2">
              <History className="h-5 w-5 text-cyan-300" />
              <h3 className="text-lg font-bold text-white">Recent Draft History</h3>
            </div>

            {historyLoading ? (
              <div className="text-sm text-white/50">Loading recent drafts...</div>
            ) : draftHistory.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {draftHistory.map((draft) => {
                  const standout = parseStoredJson(draft.standout_picks, { blue: [], red: [] })
                  const standoutNames = [
                    ...(standout.blue || []).map((item) => item.hero?.name).filter(Boolean),
                    ...(standout.red || []).map((item) => item.hero?.name).filter(Boolean),
                  ].slice(0, 2)

                  return (
                    <div key={draft.id} className="rounded-xl border border-white/10 bg-black/15 p-4 text-left">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${draft.winner === 'blue' ? 'bg-blue-500/15 text-blue-300' : 'bg-red-500/15 text-red-300'}`}>
                          {draft.winner === 'blue' ? 'Blue edge' : draft.winner === 'red' ? 'Red edge' : 'Even'}
                        </span>
                        <span className="text-[11px] text-white/45">{formatSavedDate(draft.created_at)}</span>
                      </div>
                      <div className="text-sm font-semibold text-white">{draft.verdict || 'Saved draft'}</div>
                      <div className="mt-1 text-xs text-white/60">{draft.analysis_summary || 'No summary saved.'}</div>
                      {standoutNames.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {standoutNames.map((name) => (
                            <span key={name} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/75">
                              {name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-sm text-white/50">No saved drafts yet.</div>
            )}
          </div>

          {/* Draft Format Info */}
          <div className="bg-gray-800/50 rounded-xl p-6 mb-8 border border-white/10 max-w-lg mx-auto">
            <h3 className="text-xl font-semibold text-white mb-4">
              {DRAFT_MODES[draftMode].icon} {DRAFT_MODES[draftMode].name}
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-blue-900/30 rounded-lg p-3 border border-blue-500/30">
                <div className="text-blue-400 font-semibold mb-1">Blue Team</div>
                <div className="text-gray-400">{DRAFT_MODES[draftMode].bansPerTeam} Bans • 5 Picks</div>
                <div className="text-xs text-gray-500 mt-1">First Pick</div>
              </div>
              <div className="bg-red-900/30 rounded-lg p-3 border border-red-500/30">
                <div className="text-red-400 font-semibold mb-1">Red Team</div>
                <div className="text-gray-400">{DRAFT_MODES[draftMode].bansPerTeam} Bans • 5 Picks</div>
                <div className="text-xs text-gray-500 mt-1">Last Pick</div>
              </div>
            </div>
            {draftMode === 'classic' ? (
              <div className="mt-3 text-xs text-yellow-400/80 bg-yellow-500/10 rounded-lg p-2">
                Split draft: Ban Phase 1 (2 each) → Pick Phase 1 → Ban Phase 2 (1 each) → Pick Phase 2
              </div>
            ) : (
              <div className="mt-3 text-xs text-yellow-400/80 bg-yellow-500/10 rounded-lg p-2">
                Split draft: Ban Phase 1 (3 each) → Pick Phase 1 → Ban Phase 2 (2 each) → Pick Phase 2
              </div>
            )}
            <div className="mt-3 text-xs text-gray-500">
              {DRAFT_MODES[draftMode].sequence.length} steps total • 30 seconds per turn
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
            {renderQuickPickPanel('blue')}
            
            {/* Blue Bans - Horizontal row */}
            <div className="flex justify-center gap-2 mb-4">
              {Array.from({ length: DRAFT_MODES[draftMode].bansPerTeam }, (_, index) => renderBanSlot(blueBans[index], 'blue', index))}
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
            {/* Mode Badge */}
            <div className="flex justify-center mb-2">
              <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-3 py-0.5 rounded-full font-medium">
                {DRAFT_MODES[draftMode].icon} {DRAFT_MODES[draftMode].name}
              </span>
            </div>
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
        </div>

        {/* Right Side - Red Team */}
        <div className="col-span-12 lg:col-span-3 order-3">
          <div className="bg-gradient-to-b from-red-900/40 to-red-950/60 rounded-xl p-4 border border-red-500/30">
            <h3 className="text-base font-bold text-red-400 mb-3 text-center">RED TEAM</h3>
            {renderQuickPickPanel('red')}
            
            {/* Red Bans - Horizontal row */}
            <div className="flex justify-center gap-2 mb-4">
              {Array.from({ length: DRAFT_MODES[draftMode].bansPerTeam }, (_, index) => renderBanSlot(redBans[index], 'red', index))}
            </div>
            
            {/* Red Picks - Vertical list */}
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((index) => renderPickSlot(redPicks[index], 'red', index))}
            </div>
          </div>
        </div>
      </div>

      {hoverPopup && (
        <div
          className="fixed z-40 w-[22rem] rounded-xl border border-white/10 bg-gray-900/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-sm"
          style={{
            left: hoverPopup.position.left,
            top: hoverPopup.position.top,
          }}
          onMouseEnter={handlePopupMouseEnter}
          onMouseLeave={handlePopupMouseLeave}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-white">{hoverPopup.hero.name}</h3>
              <p className="text-sm text-gray-400 capitalize">
                {hoverPopup.hero.role}{hoverPopup.hero.secondary_role ? `/${hoverPopup.hero.secondary_role}` : ''}
              </p>
              {hoverPopup.hero.specialty && (
                <p className="mt-1 text-sm text-white/60">{hoverPopup.hero.specialty}</p>
              )}
            </div>
            <span className="rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-medium text-yellow-400">
              Skills
            </span>
          </div>

          <div className="grid max-h-[20rem] gap-2 overflow-y-auto pr-1">
            {hoverPopup.skills.map((skill, index) => (
              <div key={`${skill.slot}-${skill.name}-${index}`} className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] uppercase tracking-wide text-yellow-300/80">
                  {formatSkillSection(skill)}
                </p>
                <h4 className="mt-1 text-sm font-semibold text-white">{skill.name}</h4>

                {skill.labels?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {skill.labels.map((label) => (
                      <span key={label} className="rounded-full border border-blue-400/20 bg-blue-500/10 px-2 py-0.5 text-[11px] text-blue-200">
                        {label}
                      </span>
                    ))}
                  </div>
                )}

                <p className="mt-2 text-sm leading-6 text-white/75">{skill.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {mobileSkillSheet && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/75 lg:hidden" onClick={closeMobileSkillSheet}>
          <div
            className="max-h-[80vh] w-full rounded-t-3xl border border-white/10 bg-gray-950 p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white">{mobileSkillSheet.hero.name}</h3>
                <p className="text-sm text-gray-400 capitalize">
                  {mobileSkillSheet.hero.role}{mobileSkillSheet.hero.secondary_role ? `/${mobileSkillSheet.hero.secondary_role}` : ''}
                </p>
                <p className="mt-1 text-xs text-white/45">Tap outside to close</p>
              </div>
              <button
                onClick={closeMobileSkillSheet}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/70"
              >
                Close
              </button>
            </div>

            <div className="grid max-h-[65vh] gap-2 overflow-y-auto pr-1">
              {mobileSkillSheet.skills.map((skill, index) => (
                <div key={`${skill.slot}-${skill.name}-${index}`} className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-yellow-300/80">
                    {formatSkillSection(skill)}
                  </p>
                  <h4 className="mt-1 text-sm font-semibold text-white">{skill.name}</h4>

                  {skill.labels?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {skill.labels.map((label) => (
                        <span key={label} className="rounded-full border border-blue-400/20 bg-blue-500/10 px-2 py-0.5 text-[11px] text-blue-200">
                          {label}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="mt-2 text-sm leading-6 text-white/75">{skill.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Draft Complete Modal */}
      {phase === 'complete' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[28px] border border-white/20 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.16),transparent_28%),linear-gradient(180deg,rgba(17,24,39,0.98),rgba(3,7,18,0.98))] p-6 md:p-8 shadow-2xl shadow-black/50">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.28em] text-yellow-300/80">Draft Analyst Desk</div>
                <h2 className="text-2xl md:text-4xl font-bold text-white">Draft Complete</h2>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/55">
                <BarChart3 className="h-4 w-4 text-cyan-300" />
                <span>{savingDraftResult ? 'Saving draft insight...' : savedDraftId ? `Saved to history #${savedDraftId}` : 'Waiting for save...'}</span>
              </div>
            </div>

            <div className={`mb-6 rounded-2xl border p-4 md:p-5 ${draftVerdict?.winner === 'blue' ? 'border-blue-500/40 bg-blue-500/10' : draftVerdict?.winner === 'red' ? 'border-red-500/40 bg-red-500/10' : 'border-white/10 bg-white/5'}`}>
              {draftResultLoading ? (
                <div className="text-center text-white/60">Analyzing draft result...</div>
              ) : draftVerdict ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className={`text-sm font-semibold uppercase tracking-[0.2em] ${draftVerdict.winner === 'blue' ? 'text-blue-300' : 'text-red-300'}`}>
                      {draftVerdict.winner === 'blue' ? 'Blue Team Advantage' : 'Red Team Advantage'}
                    </div>
                    <div className="mt-1 text-2xl font-bold text-white">{draftVerdict.verdict}</div>
                    <div className="mt-1 text-sm text-white/70">
                      {draftVerdict.winner === 'blue' ? 'Blue' : 'Red'} has a {draftVerdict.winProbability}% draft win probability with a {draftVerdict.edge.toFixed(1)}% edge.
                    </div>
                  </div>

                  {draftVerdict.reasons.length > 0 && (
                    <div className="grid gap-2 md:grid-cols-3">
                      {draftVerdict.reasons.map((reason) => (
                        <div key={reason} className="rounded-xl border border-white/10 bg-black/15 px-3 py-3 text-sm text-white/80">
                          {reason}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-blue-500/20 bg-blue-950/30 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <div className="text-xs uppercase tracking-[0.2em] text-blue-300/70">Blue MVP Picks</div>
                          <div className="text-lg font-semibold text-white">Standout Heroes</div>
                        </div>
                        <Crown className="h-5 w-5 text-blue-300" />
                      </div>
                      <div className="space-y-3">
                        {blueStandouts.length > 0 ? blueStandouts.map((item, index) => (
                          <div key={`${item.hero.id}-${index}`} className="rounded-xl border border-white/10 bg-black/15 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-white">{item.hero.name}</div>
                                <div className="text-xs text-blue-200/75">{item.lane_fit || item.hero.role} • Tier {item.tier}</div>
                              </div>
                              <span className="rounded-full bg-blue-500/15 px-2 py-1 text-[11px] text-blue-200">Impact {item.score}</span>
                            </div>
                            <div className="mt-2 space-y-1 text-xs text-white/75">
                              {item.reasons.slice(0, 2).map((reason) => <div key={reason}>• {reason}</div>)}
                            </div>
                          </div>
                        )) : <div className="text-sm text-white/45">No standout picks found.</div>}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-red-500/20 bg-red-950/30 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <div className="text-xs uppercase tracking-[0.2em] text-red-300/70">Red MVP Picks</div>
                          <div className="text-lg font-semibold text-white">Standout Heroes</div>
                        </div>
                        <Swords className="h-5 w-5 text-red-300" />
                      </div>
                      <div className="space-y-3">
                        {redStandouts.length > 0 ? redStandouts.map((item, index) => (
                          <div key={`${item.hero.id}-${index}`} className="rounded-xl border border-white/10 bg-black/15 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-white">{item.hero.name}</div>
                                <div className="text-xs text-red-200/75">{item.lane_fit || item.hero.role} • Tier {item.tier}</div>
                              </div>
                              <span className="rounded-full bg-red-500/15 px-2 py-1 text-[11px] text-red-200">Impact {item.score}</span>
                            </div>
                            <div className="mt-2 space-y-1 text-xs text-white/75">
                              {item.reasons.slice(0, 2).map((reason) => <div key={reason}>• {reason}</div>)}
                            </div>
                          </div>
                        )) : <div className="text-sm text-white/45">No standout picks found.</div>}
                      </div>
                    </div>
                  </div>

                  {draftResult && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-blue-500/20 bg-blue-900/20 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-semibold text-blue-300">Blue Draft Insight</span>
                          <span className="text-sm text-blue-200">{draftResult.blue_team.win_probability}%</span>
                        </div>
                        <div className="text-xs text-white/55">Strengths</div>
                        <div className="mt-1 space-y-1 text-sm text-white/80">
                          {(draftResult.blue_team.strengths || []).slice(0, 3).map((item) => (
                            <div key={item}>• {item}</div>
                          ))}
                        </div>
                        <div className="mt-3 text-xs text-white/55">Weaknesses</div>
                        <div className="mt-1 space-y-1 text-sm text-white/70">
                          {(draftResult.blue_team.weaknesses || []).slice(0, 2).map((item) => (
                            <div key={item}>• {item}</div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl border border-red-500/20 bg-red-900/20 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-semibold text-red-300">Red Draft Insight</span>
                          <span className="text-sm text-red-200">{draftResult.red_team.win_probability}%</span>
                        </div>
                        <div className="text-xs text-white/55">Strengths</div>
                        <div className="mt-1 space-y-1 text-sm text-white/80">
                          {(draftResult.red_team.strengths || []).slice(0, 3).map((item) => (
                            <div key={item}>• {item}</div>
                          ))}
                        </div>
                        <div className="mt-3 text-xs text-white/55">Weaknesses</div>
                        <div className="mt-1 space-y-1 text-sm text-white/70">
                          {(draftResult.red_team.weaknesses || []).slice(0, 2).map((item) => (
                            <div key={item}>• {item}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-white/60">No draft insight available yet.</div>
              )}
            </div>
            
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 mb-6">
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

