import { Link } from 'react-router-dom'
import { Swords, Users, List, Sparkles, ChevronRight, Trophy, Zap, Target } from 'lucide-react'

export default function HomePage() {
  const features = [
    {
      icon: Swords,
      title: 'Draft Simulator',
      description: 'Simulate real ML drafts with banning and picking phases',
      link: '/draft',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Sparkles,
      title: 'AI Recommendations',
      description: 'Get smart hero suggestions based on tier lists and counters',
      link: '/draft',
      color: 'from-yellow-500 to-orange-500'
    },
    {
      icon: Users,
      title: 'Hero Database',
      description: 'Browse all 140+ Mobile Legends heroes with details',
      link: '/heroes',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: List,
      title: 'Tier Lists',
      description: 'View current meta tier lists for every role',
      link: '/tier-lists',
      color: 'from-green-500 to-emerald-500'
    }
  ]

  const stats = [
    { icon: Trophy, value: '140+', label: 'Heroes' },
    { icon: Target, value: '6', label: 'Roles' },
    { icon: Zap, value: 'Real-time', label: 'AI Analysis' }
  ]

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero Section */}
      <section className="text-center py-16">
        <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-ml-gold-500/20 text-ml-gold-400 text-sm font-medium mb-6">
          <Sparkles className="w-4 h-4" />
          <span>AI-Powered Draft Analysis</span>
        </div>
        
        <h1 className="text-5xl md:text-6xl font-bold mb-6">
          <span className="bg-gradient-to-r from-ml-blue-400 via-ml-gold-400 to-ml-red-400 bg-clip-text text-transparent">
            ML Draft AI
          </span>
        </h1>
        
        <p className="text-xl text-white/70 max-w-2xl mx-auto mb-8">
          Simulate Mobile Legends drafts with AI-powered hero recommendations based on 
          tier lists, counter picks, and team synergies.
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to="/draft"
            className="inline-flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-ml-blue-600 to-ml-blue-700 hover:from-ml-blue-500 hover:to-ml-blue-600 text-white rounded-xl font-semibold text-lg transition-all transform hover:scale-105 shadow-lg shadow-ml-blue-500/30"
          >
            <Swords className="w-5 h-5" />
            <span>Start Draft</span>
          </Link>
          
          <Link
            to="/tier-lists"
            className="inline-flex items-center space-x-2 px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold text-lg transition-all"
          >
            <List className="w-5 h-5" />
            <span>View Tier Lists</span>
          </Link>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-8 mt-12">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <stat.icon className="w-8 h-8 mx-auto mb-2 text-ml-gold-400" />
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-sm text-white/50">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16">
        <h2 className="text-2xl font-bold text-white text-center mb-8">Features</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <Link
              key={index}
              to={feature.link}
              className="group glass-panel p-6 hover:bg-white/10 transition-all"
            >
              <div className="flex items-start space-x-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center flex-shrink-0`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-ml-gold-400 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-white/60">{feature.description}</p>
                </div>
                
                <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/70 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16">
        <h2 className="text-2xl font-bold text-white text-center mb-8">How It Works</h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: '1',
              title: 'Ban Phase',
              description: 'Each team bans 5 heroes they don\'t want the enemy to use'
            },
            {
              step: '2',
              title: 'Pick Phase',
              description: 'Alternate picks with AI suggestions for optimal heroes'
            },
            {
              step: '3',
              title: 'Analysis',
              description: 'Get team composition analysis and win probability'
            }
          ].map((item, index) => (
            <div key={index} className="text-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-ml-blue-500 to-ml-gold-500 flex items-center justify-center text-xl font-bold text-white mx-auto mb-4">
                {item.step}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-white/60">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 text-center">
        <div className="glass-panel p-12 bg-gradient-to-r from-ml-blue-500/10 to-ml-gold-500/10">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Draft?</h2>
          <p className="text-white/70 mb-6">
            Start practicing your draft skills with AI assistance
          </p>
          <Link
            to="/draft"
            className="inline-flex items-center space-x-2 px-8 py-4 bg-ml-gold-500 hover:bg-ml-gold-400 text-black rounded-xl font-semibold text-lg transition-all"
          >
            <Swords className="w-5 h-5" />
            <span>Launch Draft Simulator</span>
          </Link>
        </div>
      </section>
    </div>
  )
}
