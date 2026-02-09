import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Skull, 
  RefreshCw, 
  LogOut, 
  Eye,
  Trophy,
  Target
} from 'lucide-react';

export function SpectateScreen() {
  const { 
    player, 
    session, 
    leaderboard, 
    rebuy, 
    setPhase,
    showQrCode,
    currentInvoice
  } = useGameStore();

  const handleRebuy = async () => {
    await rebuy();
  };

  const alivePlayers = session?.players.filter(p => p.isAlive) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900/30 to-slate-900 p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="bg-slate-900/80 border-red-500/30 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
              <Skull className="w-10 h-10 text-red-500" />
            </div>
            <CardTitle className="text-3xl font-bold text-white">
              You Died!
            </CardTitle>
            <CardDescription className="text-slate-400">
              Your sats have been looted
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Death Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-red-400">{player?.satsLost}</p>
                <p className="text-xs text-slate-500">Sats Lost</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-400">{player?.kills}</p>
                <p className="text-xs text-slate-500">Your Kills</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-yellow-400">{player?.satsEarned}</p>
                <p className="text-xs text-slate-500">Total Earned</p>
              </div>
            </div>

            {/* Current Leaderboard */}
            <div className="bg-slate-800/50 rounded-lg p-4">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Current Standings
              </h3>
              <div className="space-y-2">
                {leaderboard.slice(0, 5).map((entry, index) => (
                  <div 
                    key={entry.id}
                    className={`flex items-center justify-between p-2 rounded ${
                      entry.id === player?.id ? 'bg-red-500/20 border border-red-500/50' : 'bg-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 w-6">#{index + 1}</span>
                      <span className="text-white">{entry.name}</span>
                      {entry.isAlive && (
                        <Badge className="bg-green-600 text-xs">Alive</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-green-400">{entry.kills}K</span>
                      <span className="text-yellow-400">{entry.satsEarned}sats</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Alive Players */}
            <div className="bg-slate-800/50 rounded-lg p-4">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-400" />
                Spectating ({alivePlayers.length} alive)
              </h3>
              <div className="flex flex-wrap gap-2">
                {alivePlayers.map(p => (
                  <Badge key={p.id} className="bg-slate-700">
                    <Target className="w-3 h-3 mr-1" />
                    {p.name} ({p.health}HP)
                  </Badge>
                ))}
              </div>
            </div>

            {/* Rebuy QR Code */}
            {showQrCode && currentInvoice && (
              <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                <p className="text-white mb-2">Scan to Rebuy (1000 sats)</p>
                <div className="bg-white p-4 rounded-lg inline-block">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentInvoice.paymentRequest)}`}
                    alt="Payment QR"
                    className="w-48 h-48"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Payment will be detected automatically
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              {!showQrCode && (
                <Button
                  onClick={handleRebuy}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-4"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Rebuy (1000 sats)
                </Button>
              )}
              <Button
                onClick={() => setPhase('lobby')}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                <LogOut className="w-5 h-5 mr-2" />
                Leave
              </Button>
            </div>

            {/* Info */}
            <div className="text-center text-sm text-slate-500">
              <p>Rebuy to respawn with 10 PV and 1000 sats</p>
              <p className="mt-1">Or spectate until the round ends</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
