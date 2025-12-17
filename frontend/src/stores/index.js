import { create } from 'zustand'

// ML Bang Bang Draft Sequence - Grouped turns with count
// Each turn has 30 seconds to complete all actions
const DRAFT_SEQUENCE = [
  // Ban Phase
  { type: 'ban', team: 'blue', count: 3 },   // 0 - Blue bans 3 heroes
  { type: 'ban', team: 'red', count: 3 },    // 1 - Red bans 3 heroes
  { type: 'ban', team: 'blue', count: 2 },   // 2 - Blue bans 2 heroes
  { type: 'ban', team: 'red', count: 2 },    // 3 - Red bans 2 heroes
  
  // Pick Phase
  { type: 'pick', team: 'blue', count: 1 },  // 4 - Blue picks 1 hero
  { type: 'pick', team: 'red', count: 2 },   // 5 - Red picks 2 heroes
  { type: 'pick', team: 'blue', count: 2 },  // 6 - Blue picks 2 heroes
  { type: 'pick', team: 'red', count: 2 },   // 7 - Red picks 2 heroes
  { type: 'pick', team: 'blue', count: 2 },  // 8 - Blue picks 2 heroes
  { type: 'pick', team: 'red', count: 1 },   // 9 - Red picks 1 hero
]

// Draft Store
export const useDraftStore = create((set, get) => ({
  // Draft state
  phase: 'ban', // 'ban' | 'pick' | 'complete'
  currentTeam: 'blue', // 'blue' | 'red'
  currentStep: 0, // Index in DRAFT_SEQUENCE (which turn)
  turnActionsLeft: 3, // How many actions left in current turn
  
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
  
  // Get current action info
  getCurrentAction: () => {
    const { currentStep } = get()
    if (currentStep >= DRAFT_SEQUENCE.length) return null
    return DRAFT_SEQUENCE[currentStep]
  },
  
  // Get turn info
  getTurnInfo: () => {
    const { currentStep, turnActionsLeft } = get()
    if (currentStep >= DRAFT_SEQUENCE.length) return null
    const action = DRAFT_SEQUENCE[currentStep]
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
    const { currentStep, turnActionsLeft, blueBans, redBans, bluePicks, redPicks } = get()
    
    if (currentStep >= DRAFT_SEQUENCE.length) return false
    
    const action = DRAFT_SEQUENCE[currentStep]
    
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
    const { currentStep } = get()
    const nextStep = currentStep + 1
    
    if (nextStep >= DRAFT_SEQUENCE.length) {
      set({ phase: 'complete', currentStep: nextStep, currentTeam: 'blue', turnActionsLeft: 0 })
    } else {
      const nextAction = DRAFT_SEQUENCE[nextStep]
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
    const { currentStep, turnActionsLeft, phase, blueBans, redBans } = get()
    
    if (phase !== 'ban' || currentStep >= DRAFT_SEQUENCE.length) return
    
    const action = DRAFT_SEQUENCE[currentStep]
    
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
    // Could be implemented later if needed
  },
  
  resetDraft: () => set({
    phase: 'ban',
    currentTeam: 'blue',
    currentStep: 0,
    turnActionsLeft: 3,
    blueBans: [],
    redBans: [],
    bluePicks: [],
    redPicks: [],
    suggestions: [],
    teamAnalysis: null
  }),
  
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
    const { currentStep } = get()
    if (currentStep <= 3) return { phase: 1, name: 'Ban Phase' }
    if (currentStep <= 9) return { phase: 2, name: 'Pick Phase' }
    return { phase: 3, name: 'Draft Complete' }
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
