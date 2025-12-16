import { Sparkles, TrendingUp, Shield, Swords, Users } from 'lucide-react'
import HeroCard from './HeroCard'

export default function SuggestionPanel({ suggestions = [], teamAnalysis = null, onSelectHero, loading = false }) {
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
    <div className="glass-panel p-6 space-y-6">
      {/* AI Suggestions */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <Sparkles className="w-5 h-5 text-ml-gold-400" />
          <h3 className="text-lg font-bold text-white">AI Recommendations</h3>
        </div>
        
        {suggestions.length > 0 ? (
          <div className="space-y-3">
            {suggestions.map((suggestion, index) => (
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
                      {suggestion.reasons.slice(0, 3).map((reason, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded bg-white/5 text-white/70">
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
        ) : (
          <div className="text-center py-8 text-white/50">
            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Start the draft to see AI recommendations</p>
          </div>
        )}
      </div>

      {/* Team Analysis */}
      {teamAnalysis && (
        <div className="border-t border-white/10 pt-6">
          <div className="flex items-center space-x-2 mb-4">
            <Users className="w-5 h-5 text-ml-blue-400" />
            <h3 className="text-lg font-bold text-white">Team Analysis</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Your Team */}
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

            {/* Enemy Team */}
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
    </div>
  )
}
