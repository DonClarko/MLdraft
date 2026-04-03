import { useMemo, useState } from 'react'
import { ChevronDown, ShieldCheck, ShieldX, Sparkles, Swords, TrendingUp, Users } from 'lucide-react'

function getReasonTone(reason) {
  const normalized = reason.toLowerCase()

  if (normalized.includes('risky') || normalized.includes('unsafe') || normalized.includes('countered')) {
    return 'bg-red-500/10 text-red-300 border-red-500/20'
  }

  if (normalized.includes('synergy') || normalized.includes('follow') || normalized.includes('capitalize') || normalized.includes('support')) {
    return 'bg-green-500/10 text-green-300 border-green-500/20'
  }

  if (normalized.includes('punish') || normalized.includes('pressure') || normalized.includes('tools into') || normalized.includes('counters')) {
    return 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20'
  }

  return 'bg-white/5 text-white/70 border-white/10'
}

export default function SuggestionPanel({ suggestions = [], suggestionGroups = { counter: [], synergy: [], safe: [] }, avoidSuggestions = [], teamAnalysis = null, onSelectHero, loading = false }) {
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [activeTab, setActiveTab] = useState('overall')

  const tabs = useMemo(() => [
    { id: 'overall', label: 'Best Picks', items: suggestions, icon: Sparkles, empty: 'Start the draft to see best picks' },
    { id: 'counter', label: 'Best Counter', items: suggestionGroups.counter || [], icon: Swords, empty: 'No clear counter picks yet' },
    { id: 'synergy', label: 'Best Synergy', items: suggestionGroups.synergy || [], icon: TrendingUp, empty: 'No standout synergy picks yet' },
    { id: 'safe', label: 'Best Safe Pick', items: suggestionGroups.safe || [], icon: ShieldCheck, empty: 'No safe blind picks available yet' },
    { id: 'avoid', label: 'Avoid Picks', items: avoidSuggestions, icon: ShieldX, empty: 'No major avoid picks detected yet' },
  ], [avoidSuggestions, suggestionGroups.counter, suggestionGroups.safe, suggestionGroups.synergy, suggestions])

  const activeItems = tabs.find((tab) => tab.id === activeTab) || tabs[0]

  if (loading) {
    return (
      <div className="glass-panel p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Sparkles className="w-5 h-5 text-ml-gold-400" />
          <h3 className="text-lg font-bold text-white">AI Suggestions</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/5">
                <div className="w-12 h-12 rounded-lg bg-white/10"></div>
                <div className="flex-1">
                  <div className="h-4 bg-white/10 rounded w-24 mb-2"></div>
                  <div className="h-3 bg-white/10 rounded w-32"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="glass-panel p-5 space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-ml-gold-400" />
          <h3 className="text-lg font-bold text-white">AI Recommendations</h3>
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/60">
            {suggestions.length} live picks
          </span>
        </div>

        <button
          onClick={() => setIsCollapsed((current) => !current)}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <span>{isCollapsed ? 'Show AI panel' : 'Hide AI panel'}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = tab.id === activeTab

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${isActive ? 'border-ml-gold-500/50 bg-ml-gold-500/15 text-ml-gold-300' : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-[11px]">
                    {tab.items.length}
                  </span>
                </button>
              )
            })}
          </div>

          {activeItems.items.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
              <div className="space-y-3">
                {activeItems.items.map((suggestion, index) => (
              <button
                key={suggestion.hero.id}
                onClick={() => onSelectHero(suggestion.hero)}
                className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-ml-gold-500/50 transition-all group"
              >
                <div className="flex items-start space-x-3">
                  {/* Rank */}
                  <div className={`
                    w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm
                    ${index === 0 ? 'bg-ml-gold-500 text-black' : 
                      index === 1 ? 'bg-gray-400 text-black' : 
                      index === 2 ? 'bg-amber-700 text-white' : 
                      'bg-white/10 text-white'}
                  `}>
                    #{index + 1}
                  </div>

                  {/* Hero Info */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-white">{suggestion.hero.name}</span>
                      {suggestion.lane_fit && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/20">
                          {suggestion.lane_fit}
                        </span>
                      )}
                      {suggestion.hero.global_rg_win_rate != null && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                          WR {Number(suggestion.hero.global_rg_win_rate).toFixed(1)}%
                        </span>
                      )}
                      <span className={`
                        px-2 py-0.5 rounded text-xs font-bold
                        ${suggestion.tier === 'S' ? 'bg-yellow-500/20 text-yellow-400' :
                          suggestion.tier === 'A' ? 'bg-purple-500/20 text-purple-400' :
                          suggestion.tier === 'B' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-gray-500/20 text-gray-400'}
                      `}>
                        Tier {suggestion.tier}
                      </span>
                      <span className="text-xs text-ml-gold-400 font-medium">
                        Score: {suggestion.score}
                      </span>
                    </div>
                    
                    {/* Reasons */}
                    <div className="flex flex-wrap gap-1">
                      {suggestion.reasons.slice(0, 4).map((reason, i) => (
                        <span key={i} className={`text-xs px-2 py-0.5 rounded border ${getReasonTone(reason)}`}>
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Arrow indicator */}
                  <TrendingUp className="w-5 h-5 text-ml-gold-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
                ))}
              </div>

              <div className="rounded-lg border border-white/10 bg-black/10 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-white">Quick Comparison</h4>
                  <span className="text-[11px] text-white/45">Current draft read</span>
                </div>

                {avoidSuggestions.length > 0 ? (
                  <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h5 className="text-sm font-bold text-red-300">Avoid Picks</h5>
                      <span className="text-[11px] text-red-200/80">High risk right now</span>
                    </div>
                    <div className="space-y-2">
                      {avoidSuggestions.slice(0, 3).map((suggestion) => (
                        <div key={suggestion.hero.id} className="rounded-lg border border-red-500/15 bg-black/10 p-3">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-medium text-white">{suggestion.hero.name}</span>
                            {suggestion.lane_fit && (
                              <span className="px-2 py-0.5 rounded text-[11px] bg-white/10 text-white/70">
                                {suggestion.lane_fit}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {suggestion.reasons.slice(0, 2).map((reason, index) => (
                              <span key={index} className="text-[11px] px-2 py-0.5 rounded border bg-red-500/10 text-red-200 border-red-500/20">
                                {reason}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2">
                  {tabs.filter((tab) => tab.id !== activeTab && tab.id !== 'avoid').slice(0, 3).map((tab) => {
                    const preview = tab.items[0]

                    return (
                      <div key={tab.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-white/45">{tab.label}</div>
                        {preview ? (
                          <>
                            <div className="text-sm font-semibold text-white">{preview.hero.name}</div>
                            <div className="mt-1 text-xs text-white/65">{preview.reasons[0] || 'Solid option for this draft state'}</div>
                          </>
                        ) : (
                          <div className="text-xs text-white/45">{tab.empty}</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-white/50">
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{activeItems.empty}</p>
            </div>
          )}

          {/* Team Analysis */}
          {teamAnalysis && (
            <div className="border-t border-white/10 pt-6">
              <div className="flex items-center space-x-2 mb-4">
                <Users className="w-5 h-5 text-ml-blue-400" />
                <h3 className="text-lg font-bold text-white">Team Analysis</h3>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="p-4 rounded-lg bg-ml-blue-500/10 border border-ml-blue-500/30">
                  <h4 className="font-medium text-ml-blue-400 mb-2">Your Team</h4>

                  {teamAnalysis.your_team?.roles && (
                    <div className="mb-3">
                      <div className="text-xs text-white/50 mb-1">Roles</div>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(teamAnalysis.your_team.roles).map(([role, count]) => (
                          <span key={role} className="text-xs px-2 py-0.5 rounded bg-white/10 text-white capitalize">
                            {role}: {count}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {teamAnalysis.your_team?.strengths?.length > 0 && (
                    <div className="mb-2">
                      <div className="text-xs text-green-400 mb-1">Strengths</div>
                      {teamAnalysis.your_team.strengths.map((s, i) => (
                        <div key={i} className="text-xs text-white/70">✓ {s}</div>
                      ))}
                    </div>
                  )}

                  {teamAnalysis.your_team?.weaknesses?.length > 0 && (
                    <div>
                      <div className="text-xs text-red-400 mb-1">Weaknesses</div>
                      {teamAnalysis.your_team.weaknesses.map((w, i) => (
                        <div key={i} className="text-xs text-white/70">✗ {w}</div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-lg bg-ml-red-500/10 border border-ml-red-500/30">
                  <h4 className="font-medium text-ml-red-400 mb-2">Enemy Team</h4>

                  {teamAnalysis.enemy_team?.roles && (
                    <div className="mb-3">
                      <div className="text-xs text-white/50 mb-1">Roles</div>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(teamAnalysis.enemy_team.roles).map(([role, count]) => (
                          <span key={role} className="text-xs px-2 py-0.5 rounded bg-white/10 text-white capitalize">
                            {role}: {count}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {teamAnalysis.enemy_team?.strengths?.length > 0 && (
                    <div className="mb-2">
                      <div className="text-xs text-green-400 mb-1">Strengths</div>
                      {teamAnalysis.enemy_team.strengths.map((s, i) => (
                        <div key={i} className="text-xs text-white/70">✓ {s}</div>
                      ))}
                    </div>
                  )}

                  {teamAnalysis.enemy_team?.weaknesses?.length > 0 && (
                    <div>
                      <div className="text-xs text-red-400 mb-1">Weaknesses</div>
                      {teamAnalysis.enemy_team.weaknesses.map((w, i) => (
                        <div key={i} className="text-xs text-white/70">✗ {w}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
