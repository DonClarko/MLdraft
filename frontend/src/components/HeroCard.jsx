import { Shield, Sword, Target, Wand2, Crosshair, Heart } from 'lucide-react'

export default function HeroCard({ 
  hero, 
  onClick, 
  selected = false, 
  banned = false, 
  picked = false,
  showTier = false,
  tier = null,
  compact = false,
  disabled = false
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

  const tierColors = {
    S: 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black',
    A: 'bg-gradient-to-r from-purple-500 to-violet-600 text-white',
    B: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white',
    C: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
    D: 'bg-gradient-to-r from-gray-500 to-slate-500 text-white'
  }

  const RoleIcon = roleIcons[hero.role?.toLowerCase()] || Shield
  
  const isUnavailable = banned || picked || disabled

  const handleClick = () => {
    if (!isUnavailable && onClick) {
      onClick(hero)
    }
  }

  if (compact) {
    return (
      <button
        onClick={handleClick}
        disabled={isUnavailable}
        className={`
          relative flex items-center space-x-2 p-2 rounded-lg border transition-all duration-200
          ${isUnavailable 
            ? 'opacity-40 cursor-not-allowed border-white/5 bg-white/5' 
            : selected 
              ? 'border-ml-blue-500 bg-ml-blue-500/20 ring-2 ring-ml-blue-500/50' 
              : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 cursor-pointer'
          }
        `}
      >
        {/* Hero Image */}
        <div className={`w-10 h-10 rounded-lg ${roleColors[hero.role?.toLowerCase()] || 'bg-gray-600'} flex items-center justify-center overflow-hidden`}>
          {hero.image_url ? (
            <img src={hero.image_url} alt={hero.name} className="w-full h-full object-cover" />
          ) : (
            <RoleIcon className="w-5 h-5 text-white" />
          )}
        </div>

        {/* Hero Info */}
        <div className="flex-1 text-left">
          <div className="text-sm font-medium text-white truncate">{hero.name}</div>
          <div className="text-xs text-white/50 capitalize">
            {hero.role}{hero.secondary_role && `/${hero.secondary_role}`}
          </div>
        </div>

        {/* Tier Badge */}
        {showTier && tier && (
          <span className={`px-2 py-0.5 rounded text-xs font-bold ${tierColors[tier]}`}>
            {tier}
          </span>
        )}

        {/* Status Indicators */}
        {banned && (
          <div className="absolute inset-0 bg-red-500/20 rounded-lg flex items-center justify-center">
            <span className="text-red-400 font-bold text-xs">BANNED</span>
          </div>
        )}
        {picked && (
          <div className="absolute inset-0 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <span className="text-blue-400 font-bold text-xs">PICKED</span>
          </div>
        )}
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={isUnavailable}
      className={`
        relative flex flex-col items-center p-3 rounded-xl border transition-all duration-200
        ${isUnavailable 
          ? 'opacity-40 cursor-not-allowed border-white/5 bg-white/5' 
          : selected 
            ? 'border-ml-blue-500 bg-ml-blue-500/20 ring-2 ring-ml-blue-500/50 transform scale-105' 
            : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 hover:transform hover:scale-105 cursor-pointer'
        }
      `}
    >
      {/* Hero Image */}
      <div className={`w-16 h-16 rounded-xl ${roleColors[hero.role?.toLowerCase()] || 'bg-gray-600'} flex items-center justify-center overflow-hidden mb-2`}>
        {hero.image_url ? (
          <img src={hero.image_url} alt={hero.name} className="w-full h-full object-cover" />
        ) : (
          <RoleIcon className="w-8 h-8 text-white" />
        )}
      </div>

      {/* Hero Name */}
      <div className="text-sm font-medium text-white text-center truncate w-full">
        {hero.name}
      </div>

      {/* Role */}
      <div className="flex items-center space-x-1 mt-1">
        <span className={`w-2 h-2 rounded-full ${roleColors[hero.role?.toLowerCase()] || 'bg-gray-600'}`}></span>
        <span className="text-xs text-white/50 capitalize">
          {hero.role}{hero.secondary_role && `/${hero.secondary_role}`}
        </span>
      </div>

      {/* Tier Badge */}
      {showTier && tier && (
        <span className={`mt-2 px-2 py-0.5 rounded text-xs font-bold ${tierColors[tier]}`}>
          Tier {tier}
        </span>
      )}

      {/* Status Overlays */}
      {banned && (
        <div className="absolute inset-0 bg-red-500/30 rounded-xl flex items-center justify-center">
          <span className="text-red-400 font-bold">BANNED</span>
        </div>
      )}
      {picked && (
        <div className="absolute inset-0 bg-green-500/30 rounded-xl flex items-center justify-center">
          <span className="text-green-400 font-bold">PICKED</span>
        </div>
      )}
    </button>
  )
}
