import { create } from 'zustand'

// Draft Store
export const useDraftStore = create((set, get) => ({
  // Draft state
  phase: 'ban', // 'ban' | 'pick' | 'complete'
  currentTeam: 'blue', // 'blue' | 'red'
  currentPick: 0, // Index of current pick/ban
  
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
  
  // Actions
  setHeroes: (heroes) => set({ heroes }),
  
  setSuggestions: (suggestions, teamAnalysis) => set({ suggestions, teamAnalysis }),
  
  banHero: (heroId) => {
    const { currentTeam, blueBans, redBans, currentPick, phase } = get()
    
    if (phase !== 'ban') return
    
    if (currentTeam === 'blue') {
      set({ 
        blueBans: [...blueBans, heroId],
        currentTeam: 'red',
        currentPick: currentPick + 1
      })
    } else {
      set({ 
        redBans: [...redBans, heroId],
        currentTeam: 'blue',
        currentPick: currentPick + 1
      })
    }
    
    // Check if ban phase is complete (5 bans each = 10 total)
    const newBlueBans = currentTeam === 'blue' ? [...blueBans, heroId] : blueBans
    const newRedBans = currentTeam === 'red' ? [...redBans, heroId] : redBans
    
    if (newBlueBans.length >= 5 && newRedBans.length >= 5) {
      set({ phase: 'pick', currentTeam: 'blue', currentPick: 0 })
    }
  },
  
  pickHero: (heroId) => {
    const { currentTeam, bluePicks, redPicks, currentPick, phase } = get()
    
    if (phase !== 'pick') return
    
    // Pick order: Blue, Red, Red, Blue, Blue, Red, Red, Blue, Blue, Red
    const pickOrder = ['blue', 'red', 'red', 'blue', 'blue', 'red', 'red', 'blue', 'blue', 'red']
    
    if (currentTeam === 'blue') {
      set({ bluePicks: [...bluePicks, heroId] })
    } else {
      set({ redPicks: [...redPicks, heroId] })
    }
    
    const newPick = currentPick + 1
    
    // Check if pick phase is complete
    if (newPick >= 10) {
      set({ phase: 'complete', currentPick: newPick })
    } else {
      set({ 
        currentTeam: pickOrder[newPick],
        currentPick: newPick
      })
    }
  },
  
  undoLastAction: () => {
    const { phase, blueBans, redBans, bluePicks, redPicks, currentPick } = get()
    
    if (phase === 'ban') {
      if (blueBans.length + redBans.length === 0) return
      
      // Determine which team made the last ban
      const wasBlue = blueBans.length > redBans.length
      
      if (wasBlue) {
        set({
          blueBans: blueBans.slice(0, -1),
          currentTeam: 'blue',
          currentPick: currentPick - 1
        })
      } else {
        set({
          redBans: redBans.slice(0, -1),
          currentTeam: 'red',
          currentPick: currentPick - 1
        })
      }
    } else if (phase === 'pick' || phase === 'complete') {
      if (bluePicks.length + redPicks.length === 0) {
        // Go back to ban phase
        set({ phase: 'ban', currentTeam: 'red', currentPick: 9 })
        return
      }
      
      const pickOrder = ['blue', 'red', 'red', 'blue', 'blue', 'red', 'red', 'blue', 'blue', 'red']
      const lastPick = currentPick - 1
      const lastTeam = pickOrder[lastPick]
      
      if (lastTeam === 'blue') {
        set({
          bluePicks: bluePicks.slice(0, -1),
          currentTeam: 'blue',
          currentPick: lastPick,
          phase: 'pick'
        })
      } else {
        set({
          redPicks: redPicks.slice(0, -1),
          currentTeam: 'red',
          currentPick: lastPick,
          phase: 'pick'
        })
      }
    }
  },
  
  resetDraft: () => set({
    phase: 'ban',
    currentTeam: 'blue',
    currentPick: 0,
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
    return ![...blueBans, ...redBans, ...bluePicks, ...redPicks].includes(heroId)
  },
  
  // Get all unavailable hero IDs
  getUnavailableHeroes: () => {
    const { blueBans, redBans, bluePicks, redPicks } = get()
    return [...blueBans, ...redBans, ...bluePicks, ...redPicks]
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
