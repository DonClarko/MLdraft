import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token')
      window.location.href = '/admin/login'
    }
    return Promise.reject(error)
  }
)

// Heroes API
export const heroesApi = {
  getAll: (params = {}) => api.get('/heroes', { params }),
  getById: (id) => api.get(`/heroes/${id}`),
  create: (data) => api.post('/heroes', data),
  update: (id, data) => api.put(`/heroes/${id}`, data),
  delete: (id) => api.delete(`/heroes/${id}`),
  bulkCreate: (heroes) => api.post('/heroes/bulk', heroes),
}

// Tier Lists API
export const tierListsApi = {
  getAll: (activeOnly = true) => api.get('/tier-lists', { params: { active_only: activeOnly } }),
  getByRole: (role) => api.get(`/tier-lists/${role}`),
  getById: (id) => api.get(`/tier-lists/id/${id}`),
  create: (data) => api.post('/tier-lists', data),
  update: (id, data) => api.put(`/tier-lists/${id}`, data),
  delete: (id) => api.delete(`/tier-lists/${id}`),
  addEntry: (tierListId, entry) => api.post(`/tier-lists/${tierListId}/entries`, entry),
}

// Counters API
export const countersApi = {
  getAll: () => api.get('/counters'),
  getByHeroId: (heroId) => api.get(`/counters/${heroId}`),
  getCounteredBy: (heroId) => api.get(`/counters/by/${heroId}`),
  create: (data) => api.post('/counters', data),
  update: (id, data) => api.put(`/counters/${id}`, data),
  delete: (id) => api.delete(`/counters/${id}`),
  bulkCreate: (counters) => api.post('/counters/bulk', counters),
}

// Synergies API
export const synergiesApi = {
  getAll: () => api.get('/synergies'),
  getByHeroId: (heroId) => api.get(`/synergies/${heroId}`),
  create: (data) => api.post('/synergies', data),
  update: (id, data) => api.put(`/synergies/${id}`, data),
  delete: (id) => api.delete(`/synergies/${id}`),
  bulkCreate: (synergies) => api.post('/synergies/bulk', synergies),
}

// Draft API
export const draftApi = {
  getSuggestions: (data) => api.post('/draft/suggest', data),
  analyze: (data) => api.post('/draft/analyze', data),
  save: (data) => api.post('/draft/save', data),
  getHistory: (limit = 10) => api.get('/draft/history', { params: { limit } }),
  getAvailableHeroes: (bans = '', bluePicks = '', redPicks = '') =>
    api.get('/draft/available-heroes', {
      params: { bans, blue_picks: bluePicks, red_picks: redPicks },
    }),
}

// Auth API
export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  verify: () => api.get('/auth/verify'),
  logout: () => api.post('/auth/logout'),
}

export default api
