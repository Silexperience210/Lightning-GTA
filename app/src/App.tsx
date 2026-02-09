import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { HeroScreen } from '@/components/HeroScreen';
import { PaymentScreen } from '@/components/PaymentScreen';
import { LobbyScreen } from '@/components/LobbyScreen';
import { GameCanvas } from '@/components/GameCanvas';
import { WeaponShop } from '@/components/WeaponShop';
import { SpectateScreen } from '@/components/SpectateScreen';
import { GameOverScreen } from '@/components/GameOverScreen';
import { WithdrawScreen } from '@/components/WithdrawScreen';
import { Toaster } from '@/components/ui/sonner';

function App() {
  const { phase, connect, disconnect } = useGameStore();

  useEffect(() => {
    // Connect to server on mount
    connect();
    
    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Render the appropriate screen based on game phase
  const renderScreen = () => {
    switch (phase) {
      case 'login':
        return <HeroScreen />;
      case 'payment':
        return <PaymentScreen />;
      case 'lobby':
        return <LobbyScreen />;
      case 'game':
        return <GameCanvas />;
      case 'shop':
        return <WeaponShop />;
      case 'spectate':
        return <SpectateScreen />;
      case 'gameOver':
        return <GameOverScreen />;
      case 'withdraw':
        return <WithdrawScreen />;
      default:
        return <HeroScreen />;
    }
  };

  return (
    <>
      {renderScreen()}
      <Toaster />
    </>
  );
}

export default App;
