import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Zap, Bitcoin, ChevronRight, Users, Trophy, Target } from 'lucide-react';

export function HeroScreen() {
  const [playerName, setPlayerName] = useState('');
  const [isEntering, setIsEntering] = useState(false);
  const { initPlayer, setPhase, isConnected } = useGameStore();

  const handleEnter = async () => {
    if (!playerName.trim()) return;
    setIsEntering(true);
    const success = await initPlayer(playerName.trim());
    if (success) {
      setPhase('payment');
    }
    setIsEntering(false);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/hero-bg.png)' }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/80" />
      </div>

      {/* Animated Lightning Effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-1 h-32 bg-yellow-400/50 animate-pulse blur-sm transform -rotate-12" />
        <div className="absolute top-1/3 right-1/3 w-1 h-24 bg-purple-400/50 animate-pulse blur-sm transform rotate-12 delay-300" />
      </div>

      {/* Character Images */}
      <div className="absolute bottom-0 left-0 w-1/3 h-[80vh] hidden lg:block">
        <img 
          src="/hero-satoshi.png" 
          alt="Satoshi"
          className="h-full w-auto object-contain object-bottom drop-shadow-2xl"
          style={{ filter: 'drop-shadow(0 0 30px rgba(249, 115, 22, 0.5))' }}
        />
      </div>
      
      <div className="absolute bottom-0 right-0 w-1/3 h-[80vh] hidden lg:block">
        <img 
          src="/hero-shooter.png" 
          alt="Shooter"
          className="h-full w-auto object-contain object-bottom ml-auto drop-shadow-2xl"
          style={{ filter: 'drop-shadow(0 0 30px rgba(168, 85, 247, 0.5))' }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* Logo Section */}
        <div className="text-center mb-8">
          {/* Bitcoin Icon */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-orange-500 blur-3xl opacity-50 animate-pulse" />
              <Bitcoin className="relative w-20 h-20 text-orange-400" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-2">
            <span className="bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-500 bg-clip-text text-transparent drop-shadow-lg">
              LIGHTNING
            </span>
          </h1>
          <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-white drop-shadow-2xl">
            GTA
          </h2>

          {/* Tagline */}
          <p className="mt-4 text-xl md:text-2xl text-gray-300 font-light tracking-wide">
            <span className="text-orange-400 font-bold">Vie = Argent</span> • 
            <span className="text-yellow-400 font-bold"> 1 PV = 100 Sats</span>
          </p>
        </div>

        {/* Stats Cards */}
        <div className="flex gap-4 mb-8 flex-wrap justify-center">
          <div className="bg-black/60 backdrop-blur-md border border-orange-500/30 rounded-lg px-6 py-3">
            <div className="flex items-center gap-2 text-orange-400">
              <Zap className="w-5 h-5" />
              <span className="font-bold">Lightning PvP</span>
            </div>
          </div>
          <div className="bg-black/60 backdrop-blur-md border border-purple-500/30 rounded-lg px-6 py-3">
            <div className="flex items-center gap-2 text-purple-400">
              <Target className="w-5 h-5" />
              <span className="font-bold">Kill to Earn</span>
            </div>
          </div>
          <div className="bg-black/60 backdrop-blur-md border border-yellow-500/30 rounded-lg px-6 py-3">
            <div className="flex items-center gap-2 text-yellow-400">
              <Trophy className="w-5 h-5" />
              <span className="font-bold">Die to Lose</span>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <div className="w-full max-w-md">
          <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Enter the Arena</h3>
              <p className="text-gray-400">1000 sats = 10 PV to start</p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Enter your hunter name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleEnter()}
                  className="w-full bg-white/5 border-white/20 text-white placeholder:text-gray-500 h-14 text-lg px-4 focus:border-orange-500 focus:ring-orange-500/20"
                  maxLength={20}
                />
              </div>

              <Button
                onClick={handleEnter}
                disabled={!playerName.trim() || !isConnected || isEntering}
                className="w-full h-14 bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500 hover:from-orange-600 hover:via-yellow-600 hover:to-orange-600 text-white font-bold text-lg transition-all duration-300 disabled:opacity-50 group"
              >
                {isEntering ? (
                  'Connecting...'
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-2 group-hover:animate-pulse" />
                    ENTER GAME
                    <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </div>

            {!isConnected && (
              <p className="text-center text-yellow-400 mt-4 text-sm">
                Connecting to server...
              </p>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              Multiplayer
            </span>
            <span>•</span>
            <span>3 Classes</span>
            <span>•</span>
            <span>4 Weapons</span>
            <span>•</span>
            <span className="text-orange-400">Bitcoin Lightning</span>
          </div>
        </div>
      </div>

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none" />
    </div>
  );
}
