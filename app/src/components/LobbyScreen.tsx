import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Play, LogOut, Swords, Shield, Eye, Zap, Plus, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface GameClass {
  id: 'tank' | 'assassin' | 'hacker';
  name: string;
  image: string;
  description: string;
  stats: { health: string; speed: string; damage: string };
}

const CLASSES: GameClass[] = [
  { 
    id: 'tank', 
    name: 'Tank', 
    image: '/images/class-tank.jpg',
    description: '+50% HP but slower movement',
    stats: { health: '15 PV', speed: 'Slow', damage: 'Normal' }
  },
  { 
    id: 'assassin', 
    name: 'Assassin', 
    image: '/images/class-assassin.jpg',
    description: 'x2 damage on backstab attacks',
    stats: { health: '10 PV', speed: 'Fast', damage: 'High' }
  },
  { 
    id: 'hacker', 
    name: 'Hacker', 
    image: '/images/class-hacker.jpg',
    description: 'See enemy wallet balances',
    stats: { health: '10 PV', speed: 'Normal', damage: 'Normal' }
  }
];

export function LobbyScreen() {
  const { 
    player, 
    session, 
    startGame, 
    selectClass, 
    setPhase,
    joinSession
  } = useGameStore();
  
  const [selectedClass, setSelectedClass] = useState<'tank' | 'assassin' | 'hacker'>(player?.classType || 'assassin');
  const [joining, setJoining] = useState(false);

  const handleClassSelect = async (classId: 'tank' | 'assassin' | 'hacker') => {
    const success = await selectClass(classId);
    if (success) {
      setSelectedClass(classId);
    }
  };

  const handleJoinSession = async () => {
    setJoining(true);
    const sessionId = `arena-${Date.now()}`;
    await joinSession(sessionId);
    setJoining(false);
  };

  const canStart = session && Object.keys(session.players).length >= 2;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">
              <span className="bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">
                Sat Hunter
              </span>
            </h1>
            <p className="text-slate-400">Choose your class and enter the arena</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-white font-medium">{player?.name}</p>
              <p className="text-orange-400 text-sm">{player?.balance} sats</p>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setPhase('login')}
              className="text-slate-400 hover:text-white"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <Tabs defaultValue="class" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800/50">
            <TabsTrigger value="class">Select Class</TabsTrigger>
            <TabsTrigger value="lobby">Lobby {session && `(${session.players.length})`}</TabsTrigger>
          </TabsList>

          <TabsContent value="class" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {CLASSES.map((cls) => {
                const Icon = cls.icon;
                const isSelected = selectedClass === cls.id;
                
                return (
                  <Card 
                    key={cls.id}
                    className={`cursor-pointer transition-all duration-200 ${
                      isSelected 
                        ? 'bg-purple-900/50 border-purple-500 ring-2 ring-purple-500/50' 
                        : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'
                    }`}
                    onClick={() => handleClassSelect(cls.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-2 ${
                        isSelected ? 'bg-purple-500' : 'bg-slate-700'
                      }`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <CardTitle className="text-white">{cls.name}</CardTitle>
                      <CardDescription className="text-slate-400">
                        {cls.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Health:</span>
                          <span className={isSelected ? 'text-purple-300' : 'text-slate-300'}>
                            {cls.stats.health}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Speed:</span>
                          <span className={isSelected ? 'text-purple-300' : 'text-slate-300'}>
                            {cls.stats.speed}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Damage:</span>
                          <span className={isSelected ? 'text-purple-300' : 'text-slate-300'}>
                            {cls.stats.damage}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="lobby" className="mt-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Game Lobby
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      {session 
                        ? `${session.players.length} / ${session.maxPlayers} players` 
                        : 'Join a session to start'}
                    </CardDescription>
                  </div>
                  {!session && (
                    <Button 
                      onClick={handleJoinSession}
                      disabled={joining}
                      className="bg-gradient-to-r from-orange-500 to-yellow-500"
                    >
                      {joining ? 'Joining...' : 'Join Session'}
                    </Button>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                {session ? (
                  <>
                    <div className="space-y-2 mb-6">
                      {session.players.map((p, index) => (
                        <div 
                          key={p.id}
                          className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-slate-500 w-6">#{index + 1}</span>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              p.id === player?.id ? 'bg-orange-500' : 'bg-slate-600'
                            }`}>
                              <span className="text-white text-sm font-bold">
                                {p.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-white font-medium">
                                {p.name} {p.id === player?.id && '(You)'}
                              </p>
                              <p className="text-xs text-slate-400">
                                {p.classType?.charAt(0).toUpperCase() + p.classType?.slice(1)}
                              </p>
                            </div>
                          </div>
                          <Badge variant={p.isAlive ? 'default' : 'secondary'}>
                            {p.isAlive ? 'Ready' : 'Dead'}
                          </Badge>
                        </div>
                      ))}
                    </div>

                    <Button
                      onClick={startGame}
                      disabled={!canStart}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-4"
                    >
                      <Play className="w-5 h-5 mr-2" />
                      {canStart ? 'Start Game' : 'Need 2+ Players'}
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Zap className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">No active session</p>
                    <p className="text-slate-500 text-sm mt-1">Click "Join Session" to find a game</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-slate-800/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-orange-400">{player?.balance}</p>
            <p className="text-xs text-slate-500">Sats</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{player?.health}</p>
            <p className="text-xs text-slate-500">Health (PV)</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{player?.kills}</p>
            <p className="text-xs text-slate-500">Kills</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">{player?.satsEarned}</p>
            <p className="text-xs text-slate-500">Earned</p>
          </div>
        </div>
      </div>
    </div>
  );
}
