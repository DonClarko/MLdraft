import { useState, useEffect } from 'react'
import { List, Shield, Sword, Target, Wand2, Crosshair, Heart, Calendar, ChevronRight, Map, Trees, Flame, Navigation } from 'lucide-react'
import toast from 'react-hot-toast'
import { tierListsApi } from '../services/api'

// Lanes for tier lists
const LANES = ['gold_lane', 'exp_lane', 'mid_lane', 'jungle', 'roamer']
const TIERS = ['S', 'A', 'B', 'C', 'D']

// Role icons for hero classification display
const roleIcons = {
  tank: Shield,
  fighter: Sword,
  assassin: Target,
  mage: Wand2,
  marksman: Crosshair,
  support: Heart
}

// Lane icons and colors
const laneIcons = {
  gold_lane: Crosshair,
  exp_lane: Sword,
  mid_lane: Wand2,
  jungle: Trees,
  roamer: Navigation
}

const laneColors = {
  gold_lane: 'from-yellow-500 to-amber-600',
  exp_lane: 'from-orange-500 to-red-600',
  mid_lane: 'from-pink-500 to-purple-600',
  jungle: 'from-green-500 to-emerald-600',
  roamer: 'from-blue-500 to-cyan-600'
}

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

const tierColors = {
  S: 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black',
  A: 'bg-gradient-to-r from-purple-500 to-violet-600 text-white',
  B: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white',
  C: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
  D: 'bg-gradient-to-r from-gray-500 to-slate-500 text-white'
}

const tierBorderColors = {
  S: 'border-yellow-500/50',
  A: 'border-purple-500/50',
  B: 'border-blue-500/50',
  C: 'border-green-500/50',
  D: 'border-gray-500/50'
}

export default function TierLists() {
  const [tierLists, setTierLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedLane, setSelectedLane] = useState('gold_lane')

  // Fetch tier lists
  useEffect(() => {
    const fetchTierLists = async () => {
      try {
        const response = await tierListsApi.getAll(true)
        setTierLists(response.data)
      } catch (error) {
        console.error('Error fetching tier lists:', error)
        toast.error('Failed to load tier lists')
      } finally {
        setLoading(false)
      }
    }
    fetchTierLists()
  }, [])

  // Get tier list for selected lane
  const currentTierList = tierLists.find(tl => tl.lane === selectedLane)

  // Group entries by tier
  const entriesByTier = currentTierList?.entries?.reduce((acc, entry) => {
    const tier = entry.tier || 'C'
    if (!acc[tier]) acc[tier] = []
    acc[tier].push(entry)
    return acc
  }, {}) || {}

  const LaneIcon = laneIcons[selectedLane]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-ml-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/70">Loading tier lists...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Tier Lists</h1>
          <p className="text-white/60 mt-1">Current meta rankings by lane/position</p>
        </div>
        {currentTierList && (
          <div className="flex items-center space-x-2 text-white/50">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">{currentTierList.version}</span>
          </div>
        )}
      </div>

      {/* Lane Selector */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {LANES.map((lane) => {
          const LIcon = laneIcons[lane]
          const isSelected = selectedLane === lane
          return (
            <button
              key={lane}
              onClick={() => setSelectedLane(lane)}
              className={`
                flex flex-col items-center p-4 rounded-xl transition-all
                ${isSelected 
                  ? `bg-gradient-to-r ${laneColors[lane]} text-white shadow-lg` 
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
                }
              `}
            >
              <LIcon className="w-8 h-8 mb-2" />
              <span className="text-sm font-medium">{laneNames[lane]}</span>
              <span className="text-xs text-white/50 mt-1">{laneDescriptions[lane]}</span>
            </button>
          )
        })}
      </div>

      {/* Tier List Display */}
      {currentTierList ? (
        <div className="glass-panel p-6">
          {/* Header */}
          <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-white/10">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${laneColors[selectedLane]} flex items-center justify-center`}>
              <LaneIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{laneNames[selectedLane]} Tier List</h2>
              <p className="text-sm text-white/50">
                {currentTierList.entries?.length || 0} heroes ranked • {laneDescriptions[selectedLane]}
              </p>
            </div>
          </div>

          {/* Tiers */}
          <div className="space-y-6">
            {TIERS.map((tier) => {
              const entries = entriesByTier[tier] || []
              
              return (
                <div key={tier} className={`rounded-xl border ${tierBorderColors[tier]} overflow-hidden`}>
                  {/* Tier Header */}
                  <div className={`${tierColors[tier]} px-4 py-2 font-bold text-lg`}>
                    Tier {tier}
                  </div>
                  
                  {/* Heroes in tier */}
                  <div className="p-4 bg-white/5">
                    {entries.length > 0 ? (
                      <div className="flex flex-wrap gap-3">
                        {entries.map((entry) => {
                          const heroRole = entry.hero?.role?.toLowerCase()
                          const HeroRoleIcon = roleIcons[heroRole] || Shield
                          
                          return (
                            <div
                              key={entry.id}
                              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                            >
                              <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${laneColors[selectedLane]} flex items-center justify-center`}>
                                {entry.hero?.image_url ? (
                                  <img src={entry.hero.image_url} alt={entry.hero.name} className="w-full h-full object-cover rounded-lg" />
                                ) : (
                                  <HeroRoleIcon className="w-4 h-4 text-white" />
                                )}
                              </div>
                              <span className="font-medium text-white">{entry.hero?.name}</span>
                              {/* Show hero's role classification */}
                              <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-white/50 capitalize">
                                {entry.hero?.role}
                                {entry.hero?.secondary_role && `/${entry.hero.secondary_role}`}
                              </span>
                              {entry.notes && (
                                <span className="text-xs text-white/50 hidden md:inline">
                                  • {entry.notes}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-white/30 text-sm">No heroes in this tier</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-8 pt-4 border-t border-white/10">
            <h3 className="text-sm font-medium text-white/50 mb-3">Tier Legend</h3>
            <div className="flex flex-wrap gap-4">
              {[
                { tier: 'S', desc: 'Must ban/pick - Meta defining' },
                { tier: 'A', desc: 'Very strong - Top tier picks' },
                { tier: 'B', desc: 'Good - Solid choices' },
                { tier: 'C', desc: 'Average - Situational picks' },
                { tier: 'D', desc: 'Below average - Niche use' },
              ].map(({ tier, desc }) => (
                <div key={tier} className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${tierColors[tier]}`}>
                    {tier}
                  </span>
                  <span className="text-xs text-white/50">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-12 text-center">
          <List className="w-16 h-16 mx-auto text-white/20 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Tier List Available</h3>
          <p className="text-white/50">
            No tier list has been created for {laneNames[selectedLane]} yet.
          </p>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
        {LANES.map((lane) => {
          const tl = tierLists.find(t => t.lane === lane)
          const sCount = tl?.entries?.filter(e => e.tier === 'S').length || 0
          const Icon = laneIcons[lane]
          
          return (
            <button
              key={lane}
              onClick={() => setSelectedLane(lane)}
              className={`glass-panel p-4 text-left hover:bg-white/10 transition-colors ${
                selectedLane === lane ? 'ring-2 ring-ml-blue-500' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className="w-5 h-5 text-white/50" />
                <ChevronRight className="w-4 h-4 text-white/30" />
              </div>
              <div className="text-2xl font-bold text-white">{sCount}</div>
              <div className="text-xs text-white/50">{laneNames[lane]} S-Tier</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
