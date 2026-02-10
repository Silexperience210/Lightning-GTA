export interface Player {
  id: string;
  name: string;
  walletId?: string;
  invoiceKey?: string;
  balance: number;
  health: number;
  maxHealth: number;
  classType: 'tank' | 'assassin' | 'hacker';
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  isAlive: boolean;
  kills: number;
  deaths: number;
  satsEarned: number;
  satsLost: number;
  weapons: string[];
  currentWeapon: string;
  isSimulated?: boolean;
}

export interface GameSession {
  id: string;
  status: 'waiting' | 'active' | 'ended';
  players: Player[];
  maxPlayers: number;
  startTime?: number;
  endTime?: number;
  winner?: Player;
}

export interface Weapon {
  id: string;
  name: string;
  damage: number;
  fireRate: number;
  range: number;
  price: number;
  requiredGrade: 'bronze' | 'silver' | 'gold' | 'platinum';
  type: string;
}

export interface PlayerClass {
  id: string;
  name: string;
  healthMultiplier: number;
  speedMultiplier: number;
  damageMultiplier: number;
  backstabMultiplier?: number;
  canSeeBalances?: boolean;
}

export interface DamageEvent {
  attackerId: string;
  attackerName: string;
  targetId: string;
  targetName: string;
  damage: number;
  hitZone: 'head' | 'body' | 'leg';
  satsTransferred: number;
  targetHealth: number;
  weapon: string;
}

export interface KillEvent {
  killerId: string;
  killerName: string;
  victimId: string;
  victimName: string;
  satsLooted: number;
  weapon: string;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  kills: number;
  deaths: number;
  damageDealt: number;
  satsEarned: number;
  satsLost: number;
  balance: number;
  isAlive: boolean;
}

export interface LightningInvoice {
  paymentRequest: string;
  checkingId: string;
  paymentHash: string;
  amount: number;
}

export type GamePhase = 'login' | 'payment' | 'lobby' | 'classSelect' | 'game' | 'shop' | 'spectate' | 'gameOver' | 'withdraw';
