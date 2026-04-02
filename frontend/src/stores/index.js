import { create } from 'zustand'

// ===== DRAFT MODE SEQUENCES =====
// Exact ML Bang Bang draft formats

// Classic Ranked - 3 bans per team (6 total), split phases like tournament
const CLASSIC_3BAN_SEQUENCE = [
  // Ban Phase 1 - 2 bans each, alternating
  { type: 'ban', team: 'blue', count: 1, label: 'Ban Phase 1' },
  { type: 'ban', team: 'red', count: 1, label: 'Ban Phase 1' },
  { type: 'ban', team: 'blue', count: 1, label: 'Ban Phase 1' },
  { type: 'ban', team: 'red', count: 1, label: 'Ban Phase 1' },
  // Pick Phase 1 - B1, R2, B2, R1
  { type: 'pick', team: 'blue', count: 1, label: 'Pick Phase 1' },
  { type: 'pick', team: 'red', count: 2, label: 'Pick Phase 1' },
  { type: 'pick', team: 'blue', count: 2, label: 'Pick Phase 1' },
  { type: 'pick', team: 'red', count: 1, label: 'Pick Phase 1' },
  // Ban Phase 2 - 1 ban each, alternating
  { type: 'ban', team: 'red', count: 1, label: 'Ban Phase 2' },
  { type: 'ban', team: 'blue', count: 1, label: 'Ban Phase 2' },
  // Pick Phase 2 - R1, B2, R1
  { type: 'pick', team: 'red', count: 1, label: 'Pick Phase 2' },
  { type: 'pick', team: 'blue', count: 2, label: 'Pick Phase 2' },
  { type: 'pick', team: 'red', count: 1, label: 'Pick Phase 2' },
]

// Ranked Game (RG) - 5 bans per team (10 total), split ban/pick phases
const RANKED_5BAN_SEQUENCE = [
  // Ban Phase 1 - 3 bans each, alternating
  { type: 'ban', team: 'blue', count: 1, label: 'Ban Phase 1' },
  { type: 'ban', team: 'red', count: 1, label: 'Ban Phase 1' },
  { type: 'ban', team: 'blue', count: 1, label: 'Ban Phase 1' },
  { type: 'ban', team: 'red', count: 1, label: 'Ban Phase 1' },
  { type: 'ban', team: 'blue', count: 1, label: 'Ban Phase 1' },
  { type: 'ban', team: 'red', count: 1, label: 'Ban Phase 1' },
  // Pick Phase 1 - B1, R2, B2, R1
  { type: 'pick', team: 'blue', count: 1, label: 'Pick Phase 1' },
  { type: 'pick', team: 'red', count: 2, label: 'Pick Phase 1' },
  { type: 'pick', team: 'blue', count: 2, label: 'Pick Phase 1' },
  { type: 'pick', team: 'red', count: 1, label: 'Pick Phase 1' },
  // Ban Phase 2 - 2 bans each, alternating
  { type: 'ban', team: 'red', count: 1, label: 'Ban Phase 2' },
  { type: 'ban', team: 'blue', count: 1, label: 'Ban Phase 2' },
  { type: 'ban', team: 'red', count: 1, label: 'Ban Phase 2' },
  { type: 'ban', team: 'blue', count: 1, label: 'Ban Phase 2' },
  // Pick Phase 2 - R4, B4-B5, R5
  { type: 'pick', team: 'red', count: 1, label: 'Pick Phase 2' },
  { type: 'pick', team: 'blue', count: 2, label: 'Pick Phase 2' },
  { type: 'pick', team: 'red', count: 1, label: 'Pick Phase 2' },
]

// Tournament (MCL/MPL) - Same structure as 5-ban ranked
const TOURNAMENT_5BAN_SEQUENCE = [
  // Ban Phase 1 - 3 bans each, alternating
  { type: 'ban', team: 'blue', count: 1, label: 'Ban Phase 1' },
  { type: 'ban', team: 'red', count: 1, label: 'Ban Phase 1' },
  { type: 'ban', team: 'blue', count: 1, label: 'Ban Phase 1' },
  { type: 'ban', team: 'red', count: 1, label: 'Ban Phase 1' },
  { type: 'ban', team: 'blue', count: 1, label: 'Ban Phase 1' },
  { type: 'ban', team: 'red', count: 1, label: 'Ban Phase 1' },
  // Pick Phase 1 - B1, R2, B2, R1
  { type: 'pick', team: 'blue', count: 1, label: 'Pick Phase 1' },
  { type: 'pick', team: 'red', count: 2, label: 'Pick Phase 1' },
  { type: 'pick', team: 'blue', count: 2, label: 'Pick Phase 1' },
  { type: 'pick', team: 'red', count: 1, label: 'Pick Phase 1' },
  // Ban Phase 2 - 2 bans each, alternating
  { type: 'ban', team: 'red', count: 1, label: 'Ban Phase 2' },
  { type: 'ban', team: 'blue', count: 1, label: 'Ban Phase 2' },
  { type: 'ban', team: 'red', count: 1, label: 'Ban Phase 2' },
  { type: 'ban', team: 'blue', count: 1, label: 'Ban Phase 2' },
  // Pick Phase 2 - R4, B4-B5, R5
  { type: 'pick', team: 'red', count: 1, label: 'Pick Phase 2' },
  { type: 'pick', team: 'blue', count: 2, label: 'Pick Phase 2' },
  { type: 'pick', team: 'red', count: 1, label: 'Pick Phase 2' },
]

// Mode configs
export const DRAFT_MODES = {
  classic: {
    id: 'classic',
    name: 'Classic Ranked',
    description: '3 Bans per team • Split phases',
    bansPerTeam: 3,
    sequence: CLASSIC_3BAN_SEQUENCE,
    icon: '⚔️',
  },
  ranked: {
    id: 'ranked',
    name: 'Ranked Game (RG)',
    description: '5 Bans per team • Split phases',
    bansPerTeam: 5,
    sequence: RANKED_5BAN_SEQUENCE,
    icon: '🏅',
  },
  tournament: {
    id: 'tournament',
    name: 'Tournament (MCL/MPL)',
    description: '5 Bans per team • Pro format',
    bansPerTeam: 5,
    sequence: TOURNAMENT_5BAN_SEQUENCE,
    icon: '🏆',
  },
}

// Get draft sequence for a given mode
const getSequence = (mode) => DRAFT_MODES[mode]?.sequence || RANKED_5BAN_SEQUENCE

// Draft Store
export const useDraftStore = create((set, get) => ({
  // Draft mode
  draftMode: 'ranked', // 'classic' | 'ranked' | 'tournament'

  // Draft state
  phase: 'ban', // 'ban' | 'pick' | 'complete'
  currentTeam: 'blue', // 'blue' | 'red'
  currentStep: 0, // Index in sequence (which turn)
  turnActionsLeft: 1, // How many actions left in current turn
  
  // Teams
  blueBans: [],
  redBans: [],
  bluePicks: [],
  redPicks: [],
  
  // AI suggestions
  suggestions: [],
  teamAnalysis: null,
  
  // All heroes
  heroes: [],

  // Set draft mode
  setDraftMode: (mode) => {
    if (DRAFT_MODES[mode]) {
      set({ draftMode: mode })
      get().resetDraft()
    }
  },
  
  // Get current action info
  getCurrentAction: () => {
    const { currentStep, draftMode } = get()
    const seq = getSequence(draftMode)
    if (currentStep >= seq.length) return null
    return seq[currentStep]
  },
  
  // Get turn info
  getTurnInfo: () => {
    const { currentStep, turnActionsLeft, draftMode } = get()
    const seq = getSequence(draftMode)
    if (currentStep >= seq.length) return null
    const action = seq[currentStep]
    return {
      ...action,
      actionsLeft: turnActionsLeft,
      totalActions: action.count
    }
  },
  
  // Actions
  setHeroes: (heroes) => set({ heroes }),
  
  setSuggestions: (suggestions, teamAnalysis) => set({ suggestions, teamAnalysis }),
  
  // Select a hero (ban or pick)
  selectHero: (heroId) => {
    const { currentStep, turnActionsLeft, blueBans, redBans, bluePicks, redPicks, draftMode } = get()
    const seq = getSequence(draftMode)
    
    if (currentStep >= seq.length) return false
    
    const action = seq[currentStep]
    
    // Add the hero to appropriate list
    if (action.type === 'ban') {
      if (action.team === 'blue') {
        set({ blueBans: [...blueBans, heroId] })
      } else {
        set({ redBans: [...redBans, heroId] })
      }
    } else {
      if (action.team === 'blue') {
        set({ bluePicks: [...bluePicks, heroId] })
      } else {
        set({ redPicks: [...redPicks, heroId] })
      }
    }
    
    // Check if turn is complete
    const newActionsLeft = turnActionsLeft - 1
    
    if (newActionsLeft <= 0) {
      // Move to next turn
      get().moveToNextTurn()
    } else {
      // Stay in same turn, decrement actions left
      set({ turnActionsLeft: newActionsLeft })
    }
    
    return true
  },
  
  // Move to next turn
  moveToNextTurn: () => {
    const { currentStep, draftMode } = get()
    const seq = getSequence(draftMode)
    const nextStep = currentStep + 1
    
    if (nextStep >= seq.length) {
      set({ phase: 'complete', currentStep: nextStep, currentTeam: 'blue', turnActionsLeft: 0 })
    } else {
      const nextAction = seq[nextStep]
      set({ 
        currentStep: nextStep,
        currentTeam: nextAction.team,
        phase: nextAction.type,
        turnActionsLeft: nextAction.count
      })
    }
  },
  
  // Skip remaining bans in current turn (when timer expires)
  skipRemainingBans: () => {
    const { currentStep, turnActionsLeft, phase, blueBans, redBans, draftMode } = get()
    const seq = getSequence(draftMode)
    
    if (phase !== 'ban' || currentStep >= seq.length) return
    
    const action = seq[currentStep]
    
    // Add null for each remaining ban
    const skippedBans = Array(turnActionsLeft).fill(null)
    
    if (action.team === 'blue') {
      set({ blueBans: [...blueBans, ...skippedBans] })
    } else {
      set({ redBans: [...redBans, ...skippedBans] })
    }
    
    // Move to next turn
    get().moveToNextTurn()
  },

  // Legacy methods for compatibility
  banHero: (heroId) => {
    const { phase } = get()
    if (phase === 'ban') {
      return get().selectHero(heroId)
    }
    return false
  },
  
  pickHero: (heroId) => {
    const { phase } = get()
    if (phase === 'pick') {
      return get().selectHero(heroId)
    }
    return false
  },
  
  undoLastAction: () => {
    // This is more complex with grouped turns, disable for now
  },
  
  resetDraft: () => {
    const { draftMode } = get()
    const seq = getSequence(draftMode)
    set({
      phase: 'ban',
      currentTeam: seq[0].team,
      currentStep: 0,
      turnActionsLeft: seq[0].count,
      blueBans: [],
      redBans: [],
      bluePicks: [],
      redPicks: [],
      suggestions: [],
      teamAnalysis: null
    })
  },
  
  // Check if hero is available
  isHeroAvailable: (heroId) => {
    const { blueBans, redBans, bluePicks, redPicks } = get()
    const allSelected = [...blueBans, ...redBans, ...bluePicks, ...redPicks].filter(id => id !== null)
    return !allSelected.includes(heroId)
  },
  
  // Get all unavailable hero IDs
  getUnavailableHeroes: () => {
    const { blueBans, redBans, bluePicks, redPicks } = get()
    return [...blueBans, ...redBans, ...bluePicks, ...redPicks]
  },
  
  // Get phase info for display
  getPhaseInfo: () => {
    const { currentStep, draftMode } = get()
    const seq = getSequence(draftMode)
    if (currentStep >= seq.length) return { phase: 3, name: 'Draft Complete' }
    return { phase: 1, name: seq[currentStep].label }
  }
}))

// Auth Store
export const useAuthStore = create((set) => ({
  isAuthenticated: !!localStorage.getItem('admin_token'),
  token: localStorage.getItem('admin_token'),
  
  login: (token) => {
    localStorage.setItem('admin_token', token)
    set({ isAuthenticated: true, token })
  },
  
  logout: () => {
    localStorage.removeItem('admin_token')
    set({ isAuthenticated: false, token: null })
  }
}))

// Heroes Store (for caching)
export const useHeroesStore = create((set) => ({
  heroes: [],
  loading: false,
  error: null,
  
  setHeroes: (heroes) => set({ heroes, loading: false, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false })
}))
