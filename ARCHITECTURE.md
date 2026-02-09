# Sat Hunter - Architecture Technique

## Vue d'ensemble

Sat Hunter est un jeu PvP multijoueur browser avec une économie circulaire 100% Bitcoin Lightning. Chaque point de vie (PV) représente 100 sats, créant un gameplay où la vie = argent.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SAT HUNTER ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │   Frontend   │────▶│   Backend    │────▶│    LNbits    │                │
│  │  React/Three │◀────│  Node/Socket │◀────│   Lightning  │                │
│  │    .js       │     │     .io      │     │     API      │                │
│  └──────────────┘     └──────────────┘     └──────────────┘                │
│         │                    │                    │                         │
│         │                    │                    │                         │
│         ▼                    ▼                    ▼                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         GAME STATE (Redis)                          │   │
│  │  • Players: {id, wallet, health, balance, position, ...}           │   │
│  │  • Sessions: {id, status, players[], leaderboard}                  │   │
│  │  • Transactions: Payment history, pending invoices                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Flux de Paiement Lightning

### 1. Entrée dans le Jeu (Entry Payment)

```
Joueur ──► Frontend ──► Backend ──► LNbits API
  │          │            │            │
  │          │            │            ▼
  │          │            │    ┌───────────────┐
  │          │            │    │ Create Wallet │
  │          │            │    │ for Player    │
  │          │            │    └───────────────┘
  │          │            │            │
  │          │            │            ▼
  │          │            │    ┌───────────────┐
  │          │            │    │ Create Invoice│
  │          │            │    │ 1000 sats     │
  │          │            │    └───────────────┘
  │          │            │            │
  │          │            ▼            │
  │          │    ┌───────────────┐    │
  │          │    │ Store Pending │    │
  │          │    │ Payment State │    │
  │          │    └───────────────┘    │
  │          │            │            │
  │          ▼            │            │
  │    ┌───────────┐      │            │
  │    │ Display   │      │            │
  │    │ QR Code   │      │            │
  │    └───────────┘      │            │
  │          │            │            │
  │          │            │◄───────────┘
  │          │            │
  │          │            ▼
  │          │    ┌───────────────┐
  │          │    │ Webhook:      │
  │          │    │ Payment Paid  │
  │          │    └───────────────┘
  │          │            │
  │          ▼            │
  │    ┌───────────┐      │
  └───►│ Spawn with│◄─────┘
       │ 10 PV     │
       └───────────┘
```

### 2. Transfert P2P de Sats (Combat)

```
Attacker ──► Shoot ──► Backend Validation ──► LNbits Transfer
   │           │              │                     │
   │           │              │                     ▼
   │           │              │         ┌─────────────────────┐
   │           │              │         │ Internal Transfer   │
   │           │              │         │ Target → Attacker   │
   │           │              │         │ Amount: damage*100  │
   │           │              │         └─────────────────────┘
   │           │              │                     │
   │           │              ▼                     │
   │           │    ┌─────────────────┐             │
   │           │    │ Verify Balances │             │
   │           │    │ Anti-cheat Check│             │
   │           │    └─────────────────┘             │
   │           │              │                     │
   │           │              │◄────────────────────┘
   │           │              │
   │           ▼              │
   │    ┌─────────────┐       │
   └───►│ +Sats       │◄──────┘
        │ Target -PV  │
        └─────────────┘
```

### 3. Kill & Sweep

```
Target HP = 0 ──► Kill Event ──► Backend ──► LNbits Sweep
     │               │              │              │
     │               │              │              ▼
     │               │              │    ┌─────────────────┐
     │               │              │    │ Transfer ALL    │
     │               │              │    │ remaining sats  │
     │               │              │    │ from target     │
     │               │              │    └─────────────────┘
     │               │              │              │
     │               │              ▼              │
     │               │    ┌─────────────────┐      │
     │               │    │ Update Game     │      │
     │               │    │ State (dead)    │      │
     │               │    └─────────────────┘      │
     │               │              │              │
     │               ▼              │              │
     │        ┌─────────────┐       │              │
     └───────►│ Spectate    │◄──────┘◄─────────────┘
              │ Mode        │
              └─────────────┘
```

## Schéma de Base de Données

### Players Collection

```typescript
interface Player {
  // Identification
  id: string;                    // Socket ID
  name: string;                  // Display name
  
  // LNbits Wallet
  lnbitsWalletId: string;        // Wallet ID
  lnbitsAdminKey: string;        // Admin key (server only)
  lnbitsInvoiceKey: string;      // Invoice key
  
  // Game State
  health: number;                // Current PV (1-15)
  maxHealth: number;             // Max PV based on class
  balance: number;               // Sats in wallet
  
  // Position
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  
  // Class & Equipment
  classType: 'tank' | 'assassin' | 'hacker';
  weapons: string[];             // Owned weapon IDs
  currentWeapon: string;         // Equipped weapon
  
  // Stats
  kills: number;
  deaths: number;
  damageDealt: number;
  satsEarned: number;
  satsLost: number;
  
  // State
  isAlive: boolean;
  isConnected: boolean;
  sessionId: string | null;
  
  // Meta
  createdAt: number;
  lastActive: number;
}
```

### Sessions Collection

```typescript
interface GameSession {
  id: string;                    // Session ID
  status: 'waiting' | 'active' | 'ended';
  
  // Players
  players: Record<string, Player>;
  maxPlayers: number;            // Default: 10
  
  // Timing
  createdAt: number;
  startTime: number | null;
  endTime: number | null;
  
  // Results
  winner: {
    id: string;
    name: string;
    kills: number;
    satsEarned: number;
  } | null;
  
  // Leaderboard
  leaderboard: LeaderboardEntry[];
}
```

### Transactions Collection

```typescript
interface Transaction {
  id: string;                    // Transaction ID
  type: 'entry' | 'damage' | 'kill' | 'purchase' | 'withdrawal';
  
  // Parties
  fromPlayer: string | null;     // Null for entry
  toPlayer: string | null;       // Null for withdrawal
  
  // Amount
  amount: number;                // Sats
  
  // Context
  sessionId: string | null;
  weaponId?: string;             // For purchases
  damageAmount?: number;         // For damage (PV)
  hitZone?: 'head' | 'body' | 'leg';
  
  // LNbits
  paymentHash?: string;
  checkingId?: string;
  
  // Meta
  timestamp: number;
  confirmed: boolean;
}
```

### PendingPayments Collection

```typescript
interface PendingPayment {
  checkingId: string;
  playerId: string;
  type: 'entry' | 'rebuy';
  amount: number;
  createdAt: number;
  expiresAt: number;
}
```

## Configuration des Classes

```typescript
const CLASSES = {
  tank: {
    healthMultiplier: 1.5,       // 15 PV max
    speedMultiplier: 0.7,        // -30% speed
    damageMultiplier: 1,
    description: '+50% HP, slower movement'
  },
  assassin: {
    healthMultiplier: 1,         // 10 PV max
    speedMultiplier: 1.3,        // +30% speed
    damageMultiplier: 2,         // x2 on backstab
    backstabMultiplier: 2,
    description: 'x2 damage on backstab'
  },
  hacker: {
    healthMultiplier: 1,         // 10 PV max
    speedMultiplier: 1,
    damageMultiplier: 1,
    canSeeBalances: true,        // See enemy wallets
    description: 'See enemy balances'
  }
};
```

## Configuration des Armes

```typescript
const WEAPONS = {
  pistol: {
    damage: 1,                   // 1 PV (100 sats)
    fireRate: 500,               // ms between shots
    range: 50,                   // meters
    price: 0,                    // Free
    requiredGrade: 'bronze'
  },
  smg: {
    damage: 1.5,                 // 1.5 PV (150 sats)
    fireRate: 150,               // Fast
    range: 40,
    price: 1000,                 // sats
    requiredGrade: 'silver'
  },
  sniper: {
    damage: 5,                   // 5 PV (500 sats)
    fireRate: 2000,              // Slow
    range: 200,                  // Long range
    price: 5000,
    requiredGrade: 'gold'
  },
  rocket: {
    damage: 10,                  // 10 PV (1000 sats)
    fireRate: 3000,              // Very slow
    range: 100,
    price: 20000,
    requiredGrade: 'platinum'
  }
};
```

## Système de Dégâts

### Multiplicateurs de Zone

```typescript
const HIT_ZONES = {
  head: { multiplier: 3 },      // Headshot = 3x damage
  body: { multiplier: 1 },       // Body = normal
  leg:  { multiplier: 0.5 }      // Leg = half damage
};
```

### Formule de Dégâts

```
damage = weapon.damage × zone.multiplier × class.damageMultiplier

satsTransferred = damage × 100  // 1 PV = 100 sats

// Exemple: Assassin avec Sniper, headshot
damage = 5 × 3 × 2 = 30 PV (3000 sats!)
```

## Système de Progression (Grades)

```typescript
const GRADES = {
  bronze:   { minPoints: 0,    unlocks: ['pistol'] },
  silver:   { minPoints: 500,  unlocks: ['pistol', 'smg'] },
  gold:     { minPoints: 2000, unlocks: ['pistol', 'smg', 'sniper'] },
  platinum: { minPoints: 5000, unlocks: ['pistol', 'smg', 'sniper', 'rocket'] }
};

// Points calculation
points = (kills × 100) + (assists × 50) + (survivalMinutes × 10)
```

## Anti-Cheat Measures

### 1. Server Authority

```typescript
// All damage calculations happen server-side
// Client only sends: targetId, hitZone, weaponId, timestamp

socket.on('combat:shoot', (data) => {
  // Server validates:
  // - Distance check
  // - Fire rate check
  // - Line of sight (optional)
  // - Balance verification
  
  const target = players.get(data.targetId);
  
  // Verify target has enough sats
  if (target.balance < damage * 100) {
    return; // Invalid shot
  }
  
  // Process damage
  applyDamage(attacker, target, damage);
});
```

### 2. Balance Verification

```typescript
async function verifyAndTransfer(attacker, target, amount) {
  // Get actual balance from LNbits
  const targetBalance = await lnbits.getBalance(target.invoiceKey);
  
  if (targetBalance < amount) {
    throw new Error('Insufficient balance');
  }
  
  // Perform transfer
  await lnbits.internalTransfer(
    target.adminKey,
    attacker.walletId,
    amount
  );
  
  // Verify transfer succeeded
  const newBalance = await lnbits.getBalance(target.invoiceKey);
  if (newBalance !== targetBalance - amount) {
    // Rollback or alert
  }
}
```

### 3. Rate Limiting

```typescript
const RATE_LIMITS = {
  pistol: 500,      // 2 shots/sec
  smg: 150,         // 6.6 shots/sec
  sniper: 2000,     // 0.5 shots/sec
  rocket: 3000      // 0.33 shots/sec
};

function canShoot(player, weaponId) {
  const now = Date.now();
  const lastShot = player.lastShot || 0;
  const fireRate = RATE_LIMITS[weaponId];
  
  return now - lastShot >= fireRate;
}
```

## Latence Optimisation (< 200ms)

### 1. Transferts Internes LNbits

```typescript
// Use internal transfers instead of on-chain
await lnbits.internalTransfer(
  fromAdminKey,
  toWalletId,
  amount
);
// Typical latency: 50-100ms
```

### 2. Mise à Jour d'État Optimiste

```typescript
// Update game state immediately, confirm later
function applyDamageOptimistic(attacker, target, damage) {
  // Update immediately for UI
  target.health -= damage;
  attacker.balance += damage * 100;
  target.balance -= damage * 100;
  
  // Send to server
  socket.emit('combat:shoot', { targetId: target.id, ... });
  
  // If server rejects, rollback
  socket.on('combat:rejected', () => {
    target.health += damage;
    attacker.balance -= damage * 100;
    target.balance += damage * 100;
  });
}
```

### 3. Position Interpolation

```typescript
// Client-side interpolation for smooth movement
function interpolatePosition(player, targetPosition, deltaTime) {
  const lerpFactor = 1 - Math.exp(-deltaTime * 10);
  player.position.lerp(targetPosition, lerpFactor);
}
```

## Sécurité des Fonds

### 1. Pas de Custody (Auto-Withdrawal)

```typescript
// Players can withdraw at any time (when not in game)
socket.on('player:withdraw', async ({ bolt11 }) => {
  const player = getPlayer(socket.id);
  const session = getSession(player.sessionId);
  
  // Block withdrawal during active game
  if (session?.status === 'active') {
    return { error: 'Cannot withdraw during active game' };
  }
  
  // Process withdrawal
  await lnbits.payInvoice(player.adminKey, bolt11);
});
```

### 2. Wallets Séparés par Partie

```typescript
// Each player gets a dedicated LNbits wallet
const wallet = await lnbits.createUserWallet(playerName);

// Wallet is only used for this game session
// Remaining balance can be withdrawn or used for rebuy
```

## Événements Socket.io

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `player:init` | `{ playerName }` | Initialize player |
| `payment:create` | `{}` | Create entry invoice |
| `payment:verify` | `{ checkingId }` | Verify payment |
| `session:join` | `{ sessionId }` | Join game session |
| `session:start` | `{}` | Start game (host) |
| `player:move` | `{ position, rotation }` | Update position |
| `combat:shoot` | `{ targetId, hitZone, weaponId }` | Shoot at target |
| `player:class` | `{ classType }` | Change class |
| `shop:purchase` | `{ weaponId }` | Buy weapon |
| `player:equip` | `{ weaponId }` | Equip weapon |
| `player:rebuy` | `{}` | Request rebuy |
| `player:withdraw` | `{ bolt11 }` | Withdraw sats |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `game:started` | `{ sessionId, players }` | Game started |
| `game:ended` | `{ winner, leaderboard }` | Game ended |
| `player:joined` | `{ id, name, classType }` | Player joined |
| `player:left` | `{ id, name }` | Player left |
| `player:update` | `{ id, position, rotation }` | Position update |
| `combat:hit` | `{ targetId, damage, sats }` | Hit confirmed |
| `combat:damage` | `{ attackerId, damage, sats }` | Took damage |
| `combat:kill` | `{ killerId, victimId, sats }` | Kill event |
| `leaderboard:update` | `LeaderboardEntry[]` | New leaderboard |
| `payment:confirmed` | `{ balance, health }` | Payment verified |

## Configuration Environment

```env
# Server
PORT=3001
NODE_ENV=production

# LNbits
LNBITS_URL=https://legend.lnbits.com
LNBITS_ADMIN_KEY=your_admin_key
LNBITS_INVOICE_KEY=your_invoice_key

# Game
GAME_ENTRY_COST=1000
MAX_PLAYERS_PER_SESSION=10

# Redis
REDIS_URL=redis://localhost:6379

# Webhook
WEBHOOK_URL=https://your-domain.com/webhook/payment
```

## Métriques & Monitoring

```typescript
// Key metrics to track
interface Metrics {
  // Performance
  averageTransferLatency: number;
  p99TransferLatency: number;
  
  // Game
  totalGamesPlayed: number;
  averageGameDuration: number;
  averagePlayersPerGame: number;
  
  // Economy
  totalSatsTransacted: number;
  totalSatsWithdrawn: number;
  averageSatsPerGame: number;
  
  // Engagement
  playerRetentionRate: number;
  averageSessionCount: number;
  rebuyRate: number;
}
```
