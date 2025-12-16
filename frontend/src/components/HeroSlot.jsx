import { Shield, Sword, Target, Wand2, Crosshair, Heart } from 'lucide-react'

export default function HeroSlot({ 
  hero = null, 
  team = 'blue', 
  type = 'pick', // 'pick' or 'ban'
  index = 0,
  isActive = false,
  onClick
}) {
  const roleIcons = {
    tank: Shield,
    fighter: Sword,
    assassin: Target,
    mage: Wand2,
    marksman: Crosshair,
    support: Heart
  }

  const roleColors = {
    tank: 'bg-blue-600',
    fighter: 'bg-orange-600',
    assassin: 'bg-purple-600',
    mage: 'bg-pink-600',
    marksman: 'bg-yellow-600',
    support: 'bg-green-600'
  }

  const teamColors = {
    blue: {
      border: isActive ? 'border-ml-blue-500' : 'border-ml-blue-500/30',
      bg: 'bg-ml-blue-500/10',
      glow: 'shadow-lg shadow-ml-blue-500/30',
      text: 'text-ml-blue-400'
    },
    red: {
      border: isActive ? 'border-ml-red-500' : 'border-ml-red-500/30',
      bg: 'bg-ml-red-500/10',
      glow: 'shadow-lg shadow-ml-red-500/30',
      text: 'text-ml-red-400'
    }
  }

  const colors = teamColors[team]
  const RoleIcon = hero ? (roleIcons[hero.role?.toLowerCase()] || Shield) : null

  return (
    <div
      onClick={onClick}
      className={`
        relative w-20 h-24 rounded-xl border-2 transition-all duration-300
        ${colors.border} ${colors.bg}
        ${isActive ? `${colors.glow} animate-pulse` : ''}
        ${onClick ? 'cursor-pointer hover:scale-105' : ''}
      `}
    >
      {hero ? (
        <div className="flex flex-col items-center justify-center h-full p-2">
          {/* Hero Avatar */}
          <div className={`w-12 h-12 rounded-lg ${roleColors[hero.role?.toLowerCase()] || 'bg-gray-600'} flex items-center justify-center overflow-hidden`}>
            {hero.image_url ? (
              <img src={hero.image_url} alt={hero.name} className="w-full h-full object-cover" />
            ) : (
              <RoleIcon className="w-6 h-6 text-white" />
            )}
          </div>
          
          {/* Hero Name */}
          <div className="text-xs text-white font-medium mt-1 truncate w-full text-center">
            {hero.name}
          </div>

          {/* Ban overlay */}
          {type === 'ban' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/30 rounded-xl"></div>
              <span className="relative text-red-500 text-3xl font-bold opacity-50">✕</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full">
          <div className={`w-12 h-12 rounded-lg border-2 border-dashed ${colors.border} flex items-center justify-center`}>
            {type === 'ban' ? (
              <span className="text-2xl opacity-30">🚫</span>
            ) : (
              <span className="text-2xl opacity-30">?</span>
            )}
          </div>
          <div className={`text-xs ${colors.text} mt-1 opacity-50`}>
            {type === 'ban' ? `Ban ${index + 1}` : `Pick ${index + 1}`}
          </div>
        </div>
      )}

      {/* Active indicator */}
      {isActive && (
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
          <div className={`w-2 h-2 rounded-full ${team === 'blue' ? 'bg-ml-blue-500' : 'bg-ml-red-500'} animate-ping`}></div>
        </div>
      )}
    </div>
  )
}
