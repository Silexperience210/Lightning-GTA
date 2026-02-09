import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, User, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function LoginScreen() {
  const [playerName, setPlayerName] = useState('');
  const { initPlayer, setPhase, isConnected, errorMessage, clearError } = useGameStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    if (!playerName.trim()) return;
    
    const success = await initPlayer(playerName.trim());
    if (success) {
      setPhase('payment');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-900/80 border-purple-500/30 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-full flex items-center justify-center mb-4 animate-pulse">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-white">
            <span className="bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-500 bg-clip-text text-transparent">
              Sat Hunter
            </span>
          </CardTitle>
          <CardDescription className="text-slate-400">
            Lightning-Powered PvP Arena
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {!isConnected && (
            <Alert className="mb-4 bg-yellow-500/20 border-yellow-500/50">
              <AlertCircle className="h-4 w-4 text-yellow-400" />
              <AlertDescription className="text-yellow-200">
                Connecting to server...
              </AlertDescription>
            </Alert>
          )}

          {errorMessage && (
            <Alert className="mb-4 bg-red-500/20 border-red-500/50">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-200">
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Enter your hunter name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="pl-10 bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-orange-500 focus:ring-orange-500/20"
                maxLength={20}
              />
            </div>
            
            <Button
              type="submit"
              disabled={!playerName.trim() || !isConnected}
              className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold py-3 transition-all duration-200 disabled:opacity-50"
            >
              {!isConnected ? 'Connecting...' : 'Enter Arena'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            <p>1000 sats = 10 PV</p>
            <p className="mt-1">Kill to earn • Die to lose</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
