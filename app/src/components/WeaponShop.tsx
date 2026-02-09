import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  ShoppingCart, 
  Check, 
  Lock,
  Zap,
  Target,
  Crosshair,
  Bomb
} from 'lucide-react';
import type { Weapon } from '@/types/game';

const WEAPONS: Weapon[] = [
  { 
    id: 'pistol', 
    name: 'Pistol', 
    damage: 1, 
    fireRate: 500, 
    range: 50, 
    price: 0, 
    requiredGrade: 'bronze',
    type: 'handgun'
  },
  { 
    id: 'smg', 
    name: 'SMG', 
    damage: 1.5, 
    fireRate: 150, 
    range: 40, 
    price: 1000, 
    requiredGrade: 'silver',
    type: 'automatic'
  },
  { 
    id: 'sniper', 
    name: 'Sniper Rifle', 
    damage: 5, 
    fireRate: 2000, 
    range: 200, 
    price: 5000, 
    requiredGrade: 'gold',
    type: 'sniper'
  },
  { 
    id: 'rocket', 
    name: 'Rocket Launcher', 
    damage: 10, 
    fireRate: 3000, 
    range: 100, 
    price: 20000, 
    requiredGrade: 'platinum',
    type: 'explosive'
  }
];

const GRADE_COLORS: Record<string, string> = {
  bronze: 'bg-amber-700',
  silver: 'bg-slate-400',
  gold: 'bg-yellow-500',
  platinum: 'bg-cyan-400'
};

const WEAPON_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  pistol: Zap,
  smg: Target,
  sniper: Crosshair,
  rocket: Bomb
};

export function WeaponShop() {
  const { 
    player, 
    purchaseWeapon, 
    equipWeapon, 
    setPhase
  } = useGameStore();
  
  const [ownedWeapons, setOwnedWeapons] = useState<string[]>([]);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    if (player?.weapons) {
      setOwnedWeapons(player.weapons);
    }
  }, [player?.weapons]);

  // Calculate player grade based on stats
  const calculateGrade = () => {
    const kills = player?.kills || 0;
    const points = (kills * 100) + ((player?.satsEarned || 0) / 10);
    
    if (points >= 5000) return 'platinum';
    if (points >= 2000) return 'gold';
    if (points >= 500) return 'silver';
    return 'bronze';
  };

  const playerGrade = calculateGrade();
  const gradeLevels: Record<string, number> = { bronze: 0, silver: 1, gold: 2, platinum: 3 };

  const handlePurchase = async (weapon: Weapon) => {
    setPurchasing(weapon.id);
    const success = await purchaseWeapon(weapon.id);
    if (success) {
      setOwnedWeapons([...ownedWeapons, weapon.id]);
    }
    setPurchasing(null);
  };

  const handleEquip = (weaponId: string) => {
    equipWeapon(weaponId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setPhase('game')}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <ShoppingCart className="w-6 h-6" />
                Weapon Shop
              </h1>
              <p className="text-slate-400">Upgrade your arsenal with sats</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-yellow-400">{player?.balance} sats</p>
            <Badge className={GRADE_COLORS[playerGrade as keyof typeof GRADE_COLORS]}>
              {playerGrade.toUpperCase()} Grade
            </Badge>
          </div>
        </div>

        {/* Weapons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {WEAPONS.map((weapon) => {
            const Icon = WEAPON_ICONS[weapon.id] || Zap;
            const isOwned = ownedWeapons.includes(weapon.id);
            const canAfford = (player?.balance || 0) >= weapon.price;
            const hasGrade = gradeLevels[playerGrade] >= gradeLevels[weapon.requiredGrade];
            const canBuy = !isOwned && canAfford && hasGrade;

            return (
              <Card 
                key={weapon.id}
                className={`bg-slate-800/50 border-slate-700 ${
                  isOwned ? 'ring-2 ring-green-500/50' : ''
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        isOwned ? 'bg-green-600' : 'bg-slate-700'
                      }`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-white">{weapon.name}</CardTitle>
                        <CardDescription className="text-slate-400">
                          {weapon.type}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className={GRADE_COLORS[weapon.requiredGrade]}>
                      {weapon.requiredGrade}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
                    <div className="bg-slate-700/50 rounded p-2 text-center">
                      <p className="text-slate-400">Damage</p>
                      <p className="text-white font-bold">{weapon.damage}x</p>
                    </div>
                    <div className="bg-slate-700/50 rounded p-2 text-center">
                      <p className="text-slate-400">Fire Rate</p>
                      <p className="text-white font-bold">{weapon.fireRate}ms</p>
                    </div>
                    <div className="bg-slate-700/50 rounded p-2 text-center">
                      <p className="text-slate-400">Range</p>
                      <p className="text-white font-bold">{weapon.range}m</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      {weapon.price > 0 ? (
                        <p className="text-xl font-bold text-yellow-400">{weapon.price} sats</p>
                      ) : (
                        <p className="text-xl font-bold text-green-400">Free</p>
                      )}
                    </div>

                    {isOwned ? (
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-600">
                          <Check className="w-3 h-3 mr-1" />
                          Owned
                        </Badge>
                        {player?.currentWeapon === weapon.id ? (
                          <Badge className="bg-blue-600">Equipped</Badge>
                        ) : (
                          <Button 
                            size="sm"
                            onClick={() => handleEquip(weapon.id)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Equip
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Button
                        disabled={!canBuy || purchasing === weapon.id}
                        onClick={() => handlePurchase(weapon)}
                        className="bg-gradient-to-r from-orange-500 to-yellow-500 disabled:opacity-50"
                      >
                        {purchasing === weapon.id ? (
                          'Purchasing...'
                        ) : !hasGrade ? (
                          <>
                            <Lock className="w-4 h-4 mr-1" />
                            {weapon.requiredGrade}
                          </>
                        ) : !canAfford ? (
                          'Too expensive'
                        ) : (
                          'Buy'
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Stats */}
        <Card className="mt-6 bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Your Stats</CardTitle>
          </CardHeader>
          <CardContent>
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
                <p className="text-xs text-slate-500">Sats Earned</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-400">{ownedWeapons.length}</p>
                <p className="text-xs text-slate-500">Weapons</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
