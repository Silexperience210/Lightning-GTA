import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import type { 
  Player, 
  GameSession, 
  Weapon, 
  PlayerClass,
  DamageEvent,
  KillEvent,
  LeaderboardEntry,
  LightningInvoice,
  GamePhase 
} from '@/types/game';

interface GameState {
  // Connection
  socket: Socket | null;
  isConnected: boolean;
  
  // Player
  player: Player | null;
  
  // Game Session
  session: GameSession | null;
  
  // Game State
  phase: GamePhase;
  
  // Payment
  currentInvoice: LightningInvoice | null;
  paymentVerified: boolean;
  
  // Game Data
  weapons: Weapon[];
  classes: PlayerClass[];
  leaderboard: LeaderboardEntry[];
  
  // Combat
  lastDamageEvent: DamageEvent | null;
  lastKillEvent: KillEvent | null;
  
  // UI
  showQrCode: boolean;
  errorMessage: string | null;
  
  // Actions
  connect: () => void;
  disconnect: () => void;
  initPlayer: (name: string) => Promise<boolean>;
  createPayment: () => Promise<boolean>;
  verifyPayment: () => Promise<boolean>;
  joinSession: (sessionId: string) => Promise<boolean>;
  startGame: () => void;
  selectClass: (classType: string) => Promise<boolean>;
  shoot: (targetId: string, hitZone: string, isBackstab: boolean) => void;
  updatePosition: (position: {x: number, y: number, z: number}, rotation: {x: number, y: number, z: number}) => void;
  purchaseWeapon: (weaponId: string) => Promise<boolean>;
  equipWeapon: (weaponId: string) => void;
  rebuy: () => Promise<boolean>;
  withdraw: (bolt11: string) => Promise<boolean>;
  setPhase: (phase: GamePhase) => void;
  clearError: () => void;
}

const SERVER_URL = import.meta.env.VITE_SERVER_URL || '';

export const useGameStore = create<GameState>((set, get) => ({
  // Initial state
  socket: null,
  isConnected: false,
  player: null,
  session: null,
  phase: 'login',
  currentInvoice: null,
  paymentVerified: false,
  weapons: [],
  classes: [],
  leaderboard: [],
  lastDamageEvent: null,
  lastKillEvent: null,
  showQrCode: false,
  errorMessage: null,

  // Connect to server
  connect: () => {
    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('Connected to server');
      set({ isConnected: true, errorMessage: null });
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      set({ isConnected: false });
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      set({ errorMessage: 'Connection failed. Retrying...' });
    });

    // Game events
    socket.on('game:started', (data) => {
      set({ 
        phase: 'game',
        session: {
          ...get().session!,
          status: 'active',
          startTime: data.startTime,
          players: data.players
        }
      });
    });

    socket.on('game:ended', (data) => {
      set({ 
        phase: 'gameOver',
        session: {
          ...get().session!,
          status: 'ended',
          winner: data.winner
        },
        leaderboard: data.leaderboard
      });
    });

    socket.on('player:joined', (data) => {
      const session = get().session;
      if (session) {
        set({
          session: {
            ...session,
            players: [...session.players, data]
          }
        });
      }
    });

    socket.on('player:left', (data) => {
      const session = get().session;
      if (session) {
        set({
          session: {
            ...session,
            players: session.players.filter(p => p.id !== data.id)
          }
        });
      }
    });

    socket.on('player:update', (data) => {
      const session = get().session;
      if (session) {
        const players = session.players.map(p => 
          p.id === data.id ? { ...p, position: data.position, rotation: data.rotation } : p
        );
        set({ session: { ...session, players } });
      }
    });

    socket.on('player:respawn', (data) => {
      const session = get().session;
      if (session) {
        const players = session.players.map(p => 
          p.id === data.id ? { ...p, isAlive: true, position: data.position } : p
        );
        set({ session: { ...session, players } });
      }
    });

    // Combat events
    socket.on('combat:hit', (data: DamageEvent) => {
      set({ lastDamageEvent: data });
      // Update player balance
      const player = get().player;
      if (player) {
        set({
          player: {
            ...player,
            balance: player.balance + data.satsTransferred,
            satsEarned: player.satsEarned + data.satsTransferred
          }
        });
      }
    });

    socket.on('combat:damage', (data: DamageEvent) => {
      set({ lastDamageEvent: data });
      // Update player health
      const player = get().player;
      if (player && player.id === data.targetId) {
        set({
          player: {
            ...player,
            health: data.targetHealth,
            satsLost: player.satsLost + data.satsTransferred
          }
        });
        
        // Check if dead
        if (data.targetHealth <= 0) {
          set({ phase: 'spectate' });
        }
      }
    });

    socket.on('combat:kill', (data: KillEvent) => {
      set({ lastKillEvent: data });
    });

    // Leaderboard
    socket.on('leaderboard:update', (data: LeaderboardEntry[]) => {
      set({ leaderboard: data });
    });

    // Payment confirmation
    socket.on('payment:confirmed', (data) => {
      set({ 
        paymentVerified: true,
        showQrCode: false,
        player: get().player ? { ...get().player!, balance: data.balance } : null
      });
    });

    set({ socket });
  },

  // Disconnect
  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  // Initialize player
  initPlayer: (name: string) => {
    return new Promise((resolve) => {
      const { socket } = get();
      if (!socket) {
        set({ errorMessage: 'Not connected to server' });
        resolve(false);
        return;
      }

      socket.emit('player:init', { playerName: name }, (response: any) => {
        if (response.success) {
          set({ 
            player: {
              id: response.player.id,
              name: response.player.name,
              walletId: response.player.walletId,
              invoiceKey: response.player.invoiceKey,
              balance: response.player.balance,
              health: response.player.health,
              maxHealth: response.player.maxHealth,
              classType: response.player.classType,
              position: { x: 0, y: 0, z: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              isAlive: true,
              kills: 0,
              deaths: 0,
              satsEarned: 0,
              satsLost: 0,
              weapons: ['pistol'],
              currentWeapon: 'pistol',
              isSimulated: response.player.simulated
            }
          });
          resolve(true);
        } else {
          set({ errorMessage: response.error || 'Failed to initialize player' });
          resolve(false);
        }
      });
    });
  },

  // Create payment invoice
  createPayment: () => {
    return new Promise((resolve) => {
      const { socket } = get();
      if (!socket) {
        set({ errorMessage: 'Not connected to server' });
        resolve(false);
        return;
      }

      socket.emit('payment:create', {}, (response: any) => {
        if (response.success) {
          set({ 
            currentInvoice: response.invoice,
            showQrCode: true
          });
          resolve(true);
        } else {
          set({ errorMessage: response.error || 'Failed to create invoice' });
          resolve(false);
        }
      });
    });
  },

  // Verify payment
  verifyPayment: () => {
    return new Promise((resolve) => {
      const { socket, currentInvoice } = get();
      if (!socket || !currentInvoice) {
        set({ errorMessage: 'No pending payment' });
        resolve(false);
        return;
      }

      socket.emit('payment:verify', { checkingId: currentInvoice.checkingId }, (response: any) => {
        if (response.success && response.verified) {
          set({ 
            paymentVerified: true,
            showQrCode: false,
            player: get().player ? { ...get().player!, balance: response.balance } : null
          });
          resolve(true);
        } else if (response.success && !response.verified) {
          // Payment still pending - don't show error, just return false
          console.log('[Payment] Still pending...');
          resolve(false);
        } else {
          set({ errorMessage: response.error || 'Payment verification failed' });
          resolve(false);
        }
      });
    });
  },

  // Join session
  joinSession: (sessionId: string) => {
    return new Promise((resolve) => {
      const { socket } = get();
      if (!socket) {
        set({ errorMessage: 'Not connected to server' });
        resolve(false);
        return;
      }

      socket.emit('session:join', { sessionId }, (response: any) => {
        if (response.success) {
          set({ 
            session: {
              id: response.session.id,
              status: response.session.status,
              players: response.session.players,
              maxPlayers: response.session.maxPlayers
            },
            phase: 'lobby'
          });
          resolve(true);
        } else {
          set({ errorMessage: response.error || 'Failed to join session' });
          resolve(false);
        }
      });
    });
  },

  // Start game
  startGame: () => {
    const { socket } = get();
    if (socket) {
      socket.emit('session:start', {}, (response: any) => {
        if (!response.success) {
          set({ errorMessage: response.error || 'Failed to start game' });
        }
      });
    }
  },

  // Select class
  selectClass: (classType: string) => {
    return new Promise((resolve) => {
      const { socket } = get();
      if (!socket) {
        resolve(false);
        return;
      }

      socket.emit('player:class', { classType }, (response: any) => {
        if (response.success) {
          set({ 
            player: get().player ? { 
              ...get().player!, 
              classType: response.classType,
              maxHealth: response.maxHealth
            } : null
          });
          resolve(true);
        } else {
          set({ errorMessage: response.error });
          resolve(false);
        }
      });
    });
  },

  // Shoot at player
  shoot: (targetId: string, hitZone: string, isBackstab: boolean) => {
    const { socket, player } = get();
    if (socket && player) {
      socket.emit('combat:shoot', {
        targetId,
        hitZone,
        weaponId: player.currentWeapon,
        isBackstab
      });
    }
  },

  // Update position
  updatePosition: (position, rotation) => {
    const { socket } = get();
    if (socket) {
      socket.emit('player:move', { position, rotation });
    }
  },

  // Purchase weapon
  purchaseWeapon: (weaponId: string) => {
    return new Promise((resolve) => {
      const { socket } = get();
      if (!socket) {
        resolve(false);
        return;
      }

      socket.emit('shop:purchase', { weaponId }, (response: any) => {
        if (response.success) {
          const player = get().player;
          if (player) {
            const weapon = get().weapons.find(w => w.id === weaponId);
            set({
              player: {
                ...player,
                weapons: [...player.weapons, weaponId],
                balance: player.balance - (weapon?.price || 0)
              }
            });
          }
          resolve(true);
        } else {
          set({ errorMessage: response.message });
          resolve(false);
        }
      });
    });
  },

  // Equip weapon
  equipWeapon: (weaponId: string) => {
    const { socket } = get();
    if (socket) {
      socket.emit('player:equip', { weaponId }, (response: any) => {
        if (response.success) {
          set({
            player: get().player ? { ...get().player!, currentWeapon: weaponId } : null
          });
        }
      });
    }
  },

  // Rebuy
  rebuy: () => {
    return new Promise((resolve) => {
      const { socket } = get();
      if (!socket) {
        resolve(false);
        return;
      }

      socket.emit('player:rebuy', {}, (response: any) => {
        if (response.success) {
          set({ 
            currentInvoice: response.invoice,
            showQrCode: true
          });
          resolve(true);
        } else {
          set({ errorMessage: response.error });
          resolve(false);
        }
      });
    });
  },

  // Withdraw
  withdraw: (bolt11: string) => {
    return new Promise((resolve) => {
      const { socket } = get();
      if (!socket) {
        resolve(false);
        return;
      }

      socket.emit('player:withdraw', { bolt11 }, (response: any) => {
        if (response.success) {
          resolve(true);
        } else {
          set({ errorMessage: response.error });
          resolve(false);
        }
      });
    });
  },

  // Set phase
  setPhase: (phase: GamePhase) => {
    set({ phase });
  },

  // Clear error
  clearError: () => {
    set({ errorMessage: null });
  }
}));
