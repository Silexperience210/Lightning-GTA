import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, 
  Crown, 
  Zap,
  Target,
  Skull,
  ArrowRight,
  Wallet
} from 'lucide-react';

export function GameOverScreen() {
  const { 
    player, 
    session, 
    leaderboard, 
    setPhase
  } = useGameStore();

  const winner = session?.winner;
  const isWinner = winner?.id === player?.id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-yellow-900/30 to-slate-900 p-4">
      <div className="max-w-2xl mx-auto">
        <Card className={`${
          isWinner 
            ? 'bg-gradient-to-br from-yellow-900/40 to-orange-900/40 border-yellow-500/50' 
            : 'bg-slate-900/80 border-slate-700'
        } backdrop-blur-sm`}>
          <CardHeader className="text-center">
            <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-4 ${
              isWinner ? 'bg-yellow-500/20' : 'bg-slate-700/50'
            }`}>
              {isWinner ? (
                <Crown className="w-12 h-12 text-yellow-400" />
              ) : (
                <Trophy className="w-12 h-12 text-slate-400" />
              )}
            </div>
            <CardTitle className={`text-3xl font-bold ${
              isWinner ? 'text-yellow-400' : 'text-white'
            }`}>
              {isWinner ? 'Victory!' : 'Game Over'}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {isWinner 
                ? 'You are the last hunter standing!' 
                : `${winner?.name} won the round`}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Winner Display */}
            {winner && (
              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg p-6 text-center border border-yellow-500/30">
                <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Crown className="w-8 h-8 text-white" />
                </div>
                <p className="text-2xl font-bold text-white">{winner.name}</p>
                <div className="flex justify-center gap-6 mt-3">
                  <div>
                    <p className="text-3xl font-bold text-green-400">{winner.kills}</p>
                    <p className="text-xs text-slate-400">Kills</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-yellow-400">{winner.satsEarned}</p>
                    <p className="text-xs text-slate-400">Sats Won</p>
                  </div>
                </div>
              </div>
            )}

            {/* Your Performance */}
            <div className="bg-slate-800/50 rounded-lg p-4">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-400" />
                Your Performance
              </h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">{player?.kills}</p>
                  <p className="text-xs text-slate-500">Kills</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-400">{player?.deaths}</p>
                  <p className="text-xs text-slate-500">Deaths</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-400">{player?.satsEarned}</p>
                  <p className="text-xs text-slate-500">Earned</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-400">{player?.satsLost}</p>
                  <p className="text-xs text-slate-500">Lost</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-700">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Net Profit/Loss:</span>
                  <span className={`text-2xl font-bold ${
                    (player?.satsEarned || 0) - (player?.satsLost || 0) >= 0 
                      ? 'text-green-400' 
                      : 'text-red-400'
                  }`}>
                    {(player?.satsEarned || 0) - (player?.satsLost || 0) >= 0 ? '+' : ''}
                    {(player?.satsEarned || 0) - (player?.satsLost || 0)} sats
                  </span>
                </div>
              </div>
            </div>

            {/* Final Leaderboard */}
            <div className="bg-slate-800/50 rounded-lg p-4">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Final Standings
              </h3>
              <div className="space-y-2">
                {leaderboard.map((entry, index) => (
                  <div 
                    key={entry.id}
                    className={`flex items-center justify-between p-3 rounded ${
                      entry.id === winner?.id 
                        ? 'bg-yellow-500/20 border border-yellow-500/50' 
                        : entry.id === player?.id 
                          ? 'bg-blue-500/20 border border-blue-500/50'
                          : 'bg-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {index === 0 && <Crown className="w-4 h-4 text-yellow-400" />}
                      <span className={`w-6 font-bold ${
                        index === 0 ? 'text-yellow-400' : 'text-slate-500'
                      }`}>
                        #{index + 1}
                      </span>
                      <span className="text-white">{entry.name}</span>
                      {entry.id === player?.id && (
                        <Badge className="bg-blue-600">You</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-slate-400">
                        <Skull className="w-3 h-3 inline mr-1" />
                        {entry.deaths}
                      </span>
                      <span className="text-green-400">
                        <Target className="w-3 h-3 inline mr-1" />
                        {entry.kills}
                      </span>
                      <span className="text-yellow-400 font-bold">
                        <Zap className="w-3 h-3 inline mr-1" />
                        {entry.satsEarned}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={() => setPhase('lobby')}
                className="flex-1 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold py-4"
              >
                Play Again
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                onClick={() => setPhase('login')}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                <Wallet className="w-5 h-5 mr-2" />
                Withdraw
              </Button>
            </div>

            {/* Info */}
            <div className="text-center text-sm text-slate-500">
              <p>Your remaining balance: <span className="text-yellow-400">{player?.balance} sats</span></p>
              <p className="mt-1">Withdraw anytime from the main menu</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
