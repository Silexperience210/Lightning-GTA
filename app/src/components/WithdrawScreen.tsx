import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, ArrowLeft, Wallet, AlertCircle, Check, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function WithdrawScreen() {
  const { player, withdraw, setPhase, session } = useGameStore();
  const [bolt11, setBolt11] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vérifier si le joueur est en partie active
  const isInGame = session?.status === 'active';

  const handleWithdraw = async () => {
    if (!bolt11.trim()) {
      setError('Please enter a Lightning invoice');
      return;
    }

    if (!bolt11.startsWith('lnbc')) {
      setError('Invalid Lightning invoice format');
      return;
    }

    setWithdrawing(true);
    setError(null);

    try {
      const result = await withdraw(bolt11.trim());
      if (result) {
        setSuccess(true);
        setBolt11('');
      } else {
        setError('Withdrawal failed. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Withdrawal failed');
    } finally {
      setWithdrawing(false);
    }
  };

  if (isInGame) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900/30 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-900/80 border-red-500/30 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              Cannot Withdraw
            </CardTitle>
            <CardDescription className="text-slate-400">
              You cannot withdraw during an active game
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Alert className="bg-yellow-500/20 border-yellow-500/50">
              <AlertCircle className="h-4 w-4 text-yellow-400" />
              <AlertDescription className="text-yellow-200">
                Finish or leave the current game to withdraw your sats.
              </AlertDescription>
            </Alert>

            <div className="text-center text-sm text-slate-500">
              <p>Your balance: <span className="text-yellow-400 font-bold">{player?.balance} sats</span></p>
            </div>

            <Button
              onClick={() => setPhase('game')}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Game
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900/30 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-900/80 border-green-500/30 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              Withdrawal Successful!
            </CardTitle>
            <CardDescription className="text-slate-400">
              Your sats have been sent to your wallet
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-slate-500">
              <p>Remaining balance: <span className="text-yellow-400 font-bold">{player?.balance} sats</span></p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setSuccess(false)}
                variant="outline"
                className="flex-1 border-slate-600"
              >
                Withdraw More
              </Button>
              <Button
                onClick={() => setPhase('lobby')}
                className="flex-1 bg-gradient-to-r from-orange-500 to-yellow-500"
              >
                Back to Lobby
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-900/80 border-purple-500/30 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-full flex items-center justify-center mb-4">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            Withdraw Sats
          </CardTitle>
          <CardDescription className="text-slate-400">
            Send your sats to any Lightning wallet
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <Alert className="bg-red-500/20 border-red-500/50">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-200">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Balance Display */}
          <div className="bg-slate-800/50 rounded-lg p-4 text-center">
            <p className="text-sm text-slate-400 mb-1">Available Balance</p>
            <p className="text-3xl font-bold text-yellow-400">{player?.balance} sats</p>
          </div>

          {/* Invoice Input */}
          <div className="space-y-2">
            <label className="text-sm text-slate-400">Lightning Invoice (bolt11)</label>
            <Input
              type="text"
              placeholder="lnbc..."
              value={bolt11}
              onChange={(e) => setBolt11(e.target.value)}
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 font-mono text-sm"
            />
            <p className="text-xs text-slate-500">
              Paste a Lightning invoice from your wallet
            </p>
          </div>

          {/* Withdraw Button */}
          <Button
            onClick={handleWithdraw}
            disabled={withdrawing || !bolt11.trim()}
            className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold h-12"
          >
            {withdrawing ? (
              <>
                <Zap className="w-5 h-5 mr-2 animate-pulse" />
                Processing...
              </>
            ) : (
              <>
                <Wallet className="w-5 h-5 mr-2" />
                Withdraw Sats
              </>
            )}
          </Button>

          {/* Help Link */}
          <a 
            href="https://walletofsatoshi.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 text-sm text-slate-400 hover:text-orange-400 transition-colors"
          >
            Need a Lightning wallet?
            <ExternalLink className="w-3 h-3" />
          </a>

          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => setPhase('lobby')}
            className="w-full text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Lobby
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
