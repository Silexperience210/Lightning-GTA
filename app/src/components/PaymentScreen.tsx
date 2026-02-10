import { useEffect, useState, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Copy, Check, RefreshCw, AlertCircle, Clock } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function PaymentScreen() {
  const { 
    player, 
    currentInvoice, 
    createPayment, 
    verifyPayment, 
    setPhase, 
    showQrCode,
    errorMessage,
    clearError
  } = useGameStore();

  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [autoCheck, setAutoCheck] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [checkCount, setCheckCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!currentInvoice) {
      createPayment();
    }
  }, []);

  useEffect(() => {
    if (!currentInvoice || !autoCheck) return;

    intervalRef.current = setInterval(async () => {
      console.log('[Payment] Auto-checking payment status...');
      setCheckCount(prev => prev + 1);
      const success = await verifyPayment();
      if (success) {
        console.log('[Payment] Payment confirmed! Redirecting to lobby...');
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        setPhase('lobby');
      } else {
        setLastCheck(new Date());
        // Payment pending - continue polling
      }
    }, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [currentInvoice, autoCheck, verifyPayment, setPhase]);

  const handleCopy = () => {
    if (currentInvoice?.paymentRequest) {
      navigator.clipboard.writeText(currentInvoice.paymentRequest);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCheckPayment = async () => {
    setChecking(true);
    clearError();
    const success = await verifyPayment();
    setChecking(false);
    if (success) {
      setPhase('lobby');
    }
  };

  const toggleAutoCheck = () => {
    setAutoCheck(!autoCheck);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-900/80 border-purple-500/30 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-full flex items-center justify-center mb-4 animate-pulse">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            Pay to Enter
          </CardTitle>
          <CardDescription className="text-slate-400">
            Send 1000 sats to spawn with 10 PV
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {errorMessage && (
            <Alert className="bg-red-500/20 border-red-500/50">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-200">
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}

          {autoCheck && (
            <div className="flex items-center justify-center gap-2 text-sm text-green-400">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Auto-checking payment every 3 seconds...</span>
            </div>
          )}

          {checkCount > 0 && (
            <div className="text-center text-xs text-slate-500">
              Checks: {checkCount} | Last: {lastCheck?.toLocaleTimeString() || 'Never'}
            </div>
          )}

          {lastCheck && (
            <div className="text-center text-xs text-slate-500">
              Last check: {lastCheck.toLocaleTimeString()}
            </div>
          )}

          {showQrCode && currentInvoice && (
            <>
              <div className="bg-white p-4 rounded-lg mx-auto w-fit">
                <QRCodeSVG 
                  value={currentInvoice.paymentRequest}
                  size={200}
                  level="M"
                  includeMargin={false}
                />
              </div>

              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-2">Lightning Invoice:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs text-slate-300 break-all font-mono">
                    {currentInvoice.paymentRequest.substring(0, 50)}...
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleCheckPayment}
                  disabled={checking}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                >
                  {checking ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  {checking ? 'Checking...' : "I've Paid"}
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAutoCheck}
                className="w-full text-slate-400 hover:text-white"
              >
                <Clock className="w-4 h-4 mr-2" />
                {autoCheck ? 'Disable Auto-Check' : 'Enable Auto-Check'}
              </Button>
            </>
          )}

          {!showQrCode && !currentInvoice && (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-orange-400 mb-4" />
              <p className="text-slate-400">Generating invoice...</p>
            </div>
          )}

          <div className="text-center text-sm text-slate-500 pt-4 border-t border-slate-700">
            <p>Player: <span className="text-orange-400">{player?.name}</span></p>
            <p className="mt-1">Amount: <span className="text-yellow-400">1000 sats</span></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
