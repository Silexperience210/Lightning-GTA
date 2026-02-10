import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Play, LogOut, Zap, Plus, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

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
    selectClass, 
    setPhase,
    createSession,
    joinAutoSession
  } = useGameStore();

  const [selectedClass, setSelectedClass] = useState<'tank' | 'assassin' | 'hacker'>(player?.classType || 'assassin');
  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');

  const handleClassSelect = async (classId: 'tank' | 'assassin' | 'hacker') => {
    const success = await selectClass(classId);
    if (success) {
      setSelectedClass(classId);
    }
  };

  const handleJoinAutoSession = async () => {
    setJoining(true);
    await joinAutoSession();
    setJoining(false);
  };

  const handleCreateSession = async () => {
    if (!newSessionName.trim() || newSessionName.trim().length < 3) return;
    setCreating(true);
    await createSession(newSessionName.trim());
    setCreating(false);
    setShowCreateDialog(false);
    setNewSessionName('');
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
                const isSelected = selectedClass === cls.id;

                return (
                  <Card 
                    key={cls.id}
                    className={`cursor-pointer transition-all duration-200 overflow-hidden ${
                      isSelected 
                        ? 'bg-purple-900/50 border-purple-500 ring-2 ring-purple-500/50' 
                        : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'
                    }`}
                    onClick={() => handleClassSelect(cls.id)}
                  >
                    <CardHeader className="pb-2 p-0">
                      <div className="relative w-full h-40 overflow-hidden">
                        <img 
                          src={cls.image} 
                          alt={cls.name}
                          className={`w-full h-full object-cover transition-transform duration-300 ${
                            isSelected ? 'scale-110' : 'scale-100'
                          }`}
                        />
                        <div className={`absolute inset-0 ${
                          isSelected ? 'bg-purple-500/30' : 'bg-black/40'
                        }`} />
                        <div className="absolute bottom-2 left-2">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            isSelected ? 'bg-purple-500 text-white' : 'bg-slate-700 text-slate-300'
                          }`}>
                            {cls.name}
                          </span>
                        </div>
                      </div>
                      <div className="p-4">
                        <CardDescription className="text-slate-400 text-sm">
                          {cls.description}
                        </CardDescription>
                      </div>
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
                      {session ? `Session: ${session.id}` : 'Join or create a session'}
                    </CardDescription>
                  </div>

                  <div className="flex gap-2">
                    {!session ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => setShowCreateDialog(true)}
                          className="border-purple-500/50 text-purple-400 hover:bg-purple-500/20"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create Session
                        </Button>
                        <Button
                          onClick={handleJoinAutoSession}
                          disabled={joining}
                          className="bg-gradient-to-r from-orange-500 to-yellow-500"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          {joining ? 'Joining...' : 'Quick Join'}
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={() => {/* TODO: start game */}}
                        disabled={!canStart}
                        className="bg-gradient-to-r from-green-500 to-emerald-500"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Start Game
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {session ? (
                  <>
                    <div className="space-y-2 mb-6">
                      {session.players.map((p: any, index: number) => (
                        <div 
                          key={p.id}
                          className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="bg-slate-600">
                              #{index + 1}
                            </Badge>
                            <span className="text-white font-medium">{p.name}</span>
                            <Badge 
                              className={p.classType === 'tank' ? 'bg-blue-500' : 
                                        p.classType === 'assassin' ? 'bg-red-500' : 'bg-green-500'}
                            >
                              {p.classType}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-yellow-400" />
                            <span className="text-orange-400">{p.balance} sats</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {!canStart && (
                      <p className="text-center text-slate-500 text-sm">
                        Need at least 2 players to start
                      </p>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto text-slate-600 mb-4" />
                    <p className="text-slate-400 mb-2">No active session</p>
                    <p className="text-slate-500 text-sm">
                      Click "Quick Join" to join an available session or "Create Session" to make your own
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Session Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Create New Session</DialogTitle>
              <DialogDescription className="text-slate-400">
                Give your session a unique name
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Session name (min 3 characters)"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  className="flex-1 border-slate-600 text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateSession}
                  disabled={creating || !newSessionName.trim() || newSessionName.trim().length < 3}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
                >
                  {creating ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
