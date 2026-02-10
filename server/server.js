require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const lnbits = require('./services/lnbits');
const gameState = require('./game/GameState');

const app = express();
const server = http.createServer(app);

// Configuration CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Socket.io avec CORS
const io = new Server(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling']
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    players: gameState.players.size,
    sessions: gameState.sessions.size
  });
});

// API Routes
app.get('/api/sessions', (req, res) => {
  res.json(gameState.getAvailableSessions());
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../app/dist')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../app/dist/index.html'));
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // =====================================================
  // PLAYER INITIALIZATION
  // =====================================================
  socket.on('player:init', async (data, callback) => {
    try {
      const { playerName } = data;
      console.log(`[Player:Init] Creating player: ${playerName}`);

      // Create virtual wallet for player
      const walletData = await lnbits.createUserWallet(playerName);
      
      // Create player in game state
      const player = gameState.createPlayer(socket.id, playerName, walletData);
      
      console.log(`[Player:Init] Player created: ${player.name} (${player.id})`);
      
      callback({
        success: true,
        player: {
          id: player.id,
          name: player.name,
          walletId: player.lnbitsWalletId,
          invoiceKey: player.lnbitsInvoiceKey,
          balance: player.balance,
          health: player.health,
          maxHealth: player.maxHealth,
          classType: player.classType,
          simulated: player.simulated
        }
      });
    } catch (error) {
      console.error('[Player:Init] Error:', error.message);
      callback({ success: false, error: error.message });
    }
  });

  // =====================================================
  // PAYMENT - CREATE INVOICE
  // =====================================================
  socket.on('payment:create', async (data, callback) => {
    try {
      const player = gameState.getPlayer(socket.id);
      if (!player) {
        return callback({ success: false, error: 'Player not found' });
      }

      console.log(`[Payment:Create] Creating invoice for ${player.name}`);

      const invoice = await lnbits.createInvoice(
        player.lnbitsInvoiceKey,
        gameState.ENTRY_COST,
        `Sat Hunter Entry - ${player.name}`
      );

      // Store pending payment
      gameState.pendingPayments.set(invoice.checkingId, {
        playerId: socket.id,
        amount: gameState.ENTRY_COST,
        timestamp: Date.now()
      });

      console.log(`[Payment:Create] Invoice created: ${invoice.paymentHash.substring(0, 20)}...`);

      callback({
        success: true,
        invoice: {
          paymentHash: invoice.paymentHash,
          paymentRequest: invoice.paymentRequest,
          checkingId: invoice.checkingId
        }
      });
    } catch (error) {
      console.error('[Payment:Create] Error:', error.message);
      callback({ success: false, error: error.message });
    }
  });

  // =====================================================
  // PAYMENT - VERIFY (POLLING)
  // =====================================================
  socket.on('payment:verify', async (data, callback) => {
    try {
      const { checkingId } = data;
      const player = gameState.getPlayer(socket.id);
      
      if (!player) {
        return callback({ success: false, error: 'Player not found' });
      }

      console.log(`[Payment:Verify] Checking payment for ${player.name}`);

      const status = await lnbits.checkPaymentStatus(player.lnbitsInvoiceKey, checkingId);

      if (status.paid) {
        console.log(`[Payment:Verify] Payment CONFIRMED for ${player.name}`);
        
        // Update player balance
        player.balance = gameState.ENTRY_COST;
        player.paymentVerified = true;

        // Remove from pending
        gameState.pendingPayments.delete(paymentHash);

        callback({
          success: true,
          verified: true,
          balance: player.balance,
          message: 'Payment confirmed!'
        });
      } else {
        console.log(`[Payment:Verify] Payment still pending for ${player.name}`);
        callback({
          success: true,
          verified: false,
          message: 'Payment pending...'
        });
      }
    } catch (error) {
      console.error('[Payment:Verify] Error:', error.message);
      callback({ success: false, error: error.message });
    }
  });

  // =====================================================
  // SESSION - JOIN
  // =====================================================
  socket.on('session:join', (data, callback) => {
    try {
      const { sessionId } = data;
      const player = gameState.getPlayer(socket.id);
      
      if (!player) {
        return callback({ success: false, error: 'Player not found' });
      }

      if (!player.paymentVerified && player.balance < gameState.ENTRY_COST) {
        return callback({ success: false, error: 'Payment required' });
      }

      // Get or create session
      let session = gameState.getSession(sessionId);
      if (!session) {
        session = gameState.createSession(sessionId);
        console.log(`[Session] Created new session: ${sessionId}`);
      }

      // Add player to session
      const added = gameState.addPlayerToSession(sessionId, player);
      if (!added) {
        return callback({ success: false, error: 'Session full or already started' });
      }

      // Join socket room
      socket.join(sessionId);

      console.log(`[Session:Join] ${player.name} joined session ${sessionId}`);

      // Notify other players
      socket.to(sessionId).emit('player:joined', {
        id: player.id,
        name: player.name,
        classType: player.classType,
        isAlive: player.isAlive
      });

      callback({
        success: true,
        session: {
          id: session.id,
          status: session.status,
          players: Object.values(session.players).map(p => ({
            id: p.id,
            name: p.name,
            classType: p.classType,
            isAlive: p.isAlive
          })),
          maxPlayers: session.maxPlayers
        }
      });
    } catch (error) {
      console.error('[Session:Join] Error:', error.message);
      callback({ success: false, error: error.message });
    }
  });

  // =====================================================
  // SESSION - START GAME
  // =====================================================
  socket.on('session:start', (data, callback) => {
    try {
      const player = gameState.getPlayer(socket.id);
      if (!player || !player.sessionId) {
        return callback({ success: false, error: 'Not in a session' });
      }

      const session = gameState.getSession(player.sessionId);
      if (!session) {
        return callback({ success: false, error: 'Session not found' });
      }

      if (session.status !== 'waiting') {
        return callback({ success: false, error: 'Game already started' });
      }

      if (Object.keys(session.players).length < 2) {
        return callback({ success: false, error: 'Need at least 2 players' });
      }

      // Start the session
      gameState.startSession(player.sessionId);

      console.log(`[Session:Start] Game started in session ${player.sessionId}`);

      // Notify all players
      io.to(player.sessionId).emit('game:started', {
        startTime: Date.now(),
        players: Object.values(session.players).map(p => ({
          id: p.id,
          name: p.name,
          position: p.position,
          health: p.health,
          maxHealth: p.maxHealth,
          classType: p.classType
        }))
      });

      callback({ success: true });
    } catch (error) {
      console.error('[Session:Start] Error:', error.message);
      callback({ success: false, error: error.message });
    }
  });

  // =====================================================
  // PLAYER - CHANGE CLASS
  // =====================================================
  socket.on('player:class', (data, callback) => {
    try {
      const { classType } = data;
      const player = gameState.getPlayer(socket.id);
      
      if (!player) {
        return callback({ success: false, error: 'Player not found' });
      }

      const success = gameState.changeClass(socket.id, classType);
      if (!success) {
        return callback({ success: false, error: 'Invalid class type' });
      }

      console.log(`[Player:Class] ${player.name} changed to ${classType}`);

      callback({
        success: true,
        classType: player.classType,
        maxHealth: player.maxHealth
      });
    } catch (error) {
      console.error('[Player:Class] Error:', error.message);
      callback({ success: false, error: error.message });
    }
  });

  // =====================================================
  // COMBAT - SHOOT
  // =====================================================
  socket.on('combat:shoot', async (data) => {
    try {
      const { targetId, hitZone, weaponId, isBackstab } = data;
      const attacker = gameState.getPlayer(socket.id);
      const target = gameState.getPlayer(targetId);

      if (!attacker || !target) return;
      if (!attacker.isAlive || !target.isAlive) return;
      if (attacker.sessionId !== target.sessionId) return;

      // Check fire rate
      const weapon = gameState.WEAPONS[weaponId];
      if (!weapon) return;

      const now = Date.now();
      if (now - attacker.lastShot < weapon.fireRate) return;
      attacker.lastShot = now;

      // Calculate damage
      const damage = gameState.calculateDamage(weaponId, hitZone, attacker.classType, isBackstab);

      // Apply damage
      const result = gameState.applyDamage(targetId, damage);

      // Calculate sats transferred
      const satsTransferred = Math.floor(damage * gameState.HEALTH_TO_SATS_RATIO);

      console.log(`[Combat] ${attacker.name} hit ${target.name} for ${damage.toFixed(1)} damage (${hitZone})`);

      // Emit hit event to attacker
      socket.emit('combat:hit', {
        targetId,
        damage,
        hitZone,
        satsTransferred,
        targetHealth: result.newHealth
      });

      // Emit damage event to target
      io.to(targetId).emit('combat:damage', {
        attackerId: socket.id,
        damage,
        hitZone,
        satsTransferred,
        targetHealth: result.newHealth
      });

      // Update attacker stats
      attacker.damageDealt += damage;

      // Handle kill
      if (result.killed) {
        const killResult = gameState.processKill(socket.id, targetId);

        console.log(`[Combat] ${attacker.name} KILLED ${target.name}, looted ${killResult.satsLooted} sats`);

        // Emit kill event
        const killEvent = {
          killerId: socket.id,
          killerName: attacker.name,
          targetId,
          targetName: target.name,
          satsLooted: killResult.satsLooted,
          weaponId
        };

        io.to(attacker.sessionId).emit('combat:kill', killEvent);

        // Update leaderboard
        const leaderboard = gameState.updateLeaderboard(attacker.sessionId);
        io.to(attacker.sessionId).emit('leaderboard:update', leaderboard);
      }
    } catch (error) {
      console.error('[Combat:Shoot] Error:', error.message);
    }
  });

  // =====================================================
  // PLAYER - MOVE
  // =====================================================
  socket.on('player:move', (data) => {
    try {
      const { position, rotation } = data;
      const player = gameState.getPlayer(socket.id);
      
      if (!player || !player.isAlive) return;

      // Update position
      player.position = position;
      player.rotation = rotation;

      // Broadcast to other players in session
      if (player.sessionId) {
        socket.to(player.sessionId).emit('player:update', {
          id: socket.id,
          position,
          rotation
        });
      }
    } catch (error) {
      console.error('[Player:Move] Error:', error.message);
    }
  });

  // =====================================================
  // SHOP - PURCHASE WEAPON
  // =====================================================
  socket.on('shop:purchase', (data, callback) => {
    try {
      const { weaponId } = data;
      const player = gameState.getPlayer(socket.id);
      
      if (!player) {
        return callback({ success: false, message: 'Player not found' });
      }

      const result = gameState.purchaseWeapon(socket.id, weaponId);
      callback(result);

      if (result.success) {
        console.log(`[Shop] ${player.name} purchased ${weaponId}`);
      }
    } catch (error) {
      console.error('[Shop:Purchase] Error:', error.message);
      callback({ success: false, message: error.message });
    }
  });

  // =====================================================
  // PLAYER - EQUIP WEAPON
  // =====================================================
  socket.on('player:equip', (data, callback) => {
    try {
      const { weaponId } = data;
      const player = gameState.getPlayer(socket.id);
      
      if (!player) {
        return callback({ success: false, error: 'Player not found' });
      }

      if (!player.weapons.includes(weaponId)) {
        return callback({ success: false, error: 'Weapon not owned' });
      }

      player.currentWeapon = weaponId;
      console.log(`[Player:Equip] ${player.name} equipped ${weaponId}`);

      callback({ success: true, weaponId });
    } catch (error) {
      console.error('[Player:Equip] Error:', error.message);
      callback({ success: false, error: error.message });
    }
  });

  // =====================================================
  // PLAYER - REBUY
  // =====================================================
  socket.on('player:rebuy', async (data, callback) => {
    try {
      const player = gameState.getPlayer(socket.id);
      if (!player) {
        return callback({ success: false, error: 'Player not found' });
      }

      if (player.isAlive) {
        return callback({ success: false, error: 'Player is still alive' });
      }

      console.log(`[Player:Rebuy] Creating rebuy invoice for ${player.name}`);

      // Create new invoice for rebuy
      const invoice = await lnbits.createInvoice(
        player.lnbitsInvoiceKey,
        gameState.ENTRY_COST,
        `Sat Hunter Rebuy - ${player.name}`
      );

      // Store pending payment
      gameState.pendingPayments.set(invoice.checkingId, {
        playerId: socket.id,
        amount: gameState.ENTRY_COST,
        isRebuy: true,
        timestamp: Date.now()
      });

      callback({
        success: true,
        invoice: {
          paymentHash: invoice.paymentHash,
          paymentRequest: invoice.paymentRequest,
          checkingId: invoice.checkingId
        }
      });
    } catch (error) {
      console.error('[Player:Rebuy] Error:', error.message);
      callback({ success: false, error: error.message });
    }
  });

  // =====================================================
  // PLAYER - WITHDRAW
  // =====================================================
  socket.on('player:withdraw', async (data, callback) => {
    try {
      const { bolt11 } = data;
      const player = gameState.getPlayer(socket.id);
      
      if (!player) {
        return callback({ success: false, error: 'Player not found' });
      }

      // Check if player is in active game
      if (player.sessionId) {
        const session = gameState.getSession(player.sessionId);
        if (session && session.status === 'active') {
          return callback({ success: false, error: 'Cannot withdraw during active game' });
        }
      }

      // Validate invoice format
      if (!bolt11 || !bolt11.startsWith('lnbc')) {
        return callback({ success: false, error: 'Invalid Lightning invoice' });
      }

      console.log(`[Player:Withdraw] Processing withdrawal for ${player.name}`);
      console.log(`[Player:Withdraw] Invoice: ${bolt11.substring(0, 50)}...`);

      // Process withdrawal via LNbits
      const result = await lnbits.payInvoice(player.lnbitsAdminKey, bolt11);

      if (result.paid) {
        console.log(`[Player:Withdraw] Withdrawal successful for ${player.name}`);
        
        // Update player balance (deduct the amount - LNbits handles the actual amount)
        // The actual amount is determined by the invoice
        callback({
          success: true,
          message: 'Withdrawal successful!',
          paymentHash: result.paymentHash,
          fee: result.fee
        });
      } else {
        console.log(`[Player:Withdraw] Withdrawal failed for ${player.name}`);
        callback({ success: false, error: 'Withdrawal failed - payment rejected' });
      }
    } catch (error) {
      console.error('[Player:Withdraw] Error:', error.message);
      callback({ success: false, error: error.message });
    }
  });

  // =====================================================
  // LEADERBOARD - GET
  // =====================================================
  socket.on('leaderboard:get', (data, callback) => {
    try {
      const player = gameState.getPlayer(socket.id);
      if (!player || !player.sessionId) {
        return callback({ success: false, error: 'Not in a session' });
      }

      const leaderboard = gameState.updateLeaderboard(player.sessionId);
      callback({ success: true, leaderboard });
    } catch (error) {
      console.error('[Leaderboard:Get] Error:', error.message);
      callback({ success: false, error: error.message });
    }
  });

  // =====================================================
  // DISCONNECT
  // =====================================================
  socket.on('disconnect', (reason) => {
    console.log(`[Socket] Client disconnected: ${socket.id}, reason: ${reason}`);
    
    const player = gameState.getPlayer(socket.id);
    if (player) {
      // Notify other players in session
      if (player.sessionId) {
        socket.to(player.sessionId).emit('player:left', {
          id: player.id,
          name: player.name
        });
      }
      
      // Remove player from game state
      gameState.removePlayer(socket.id);
      console.log(`[Player] Removed: ${player.name}`);
    }
  });
});

// Start server
const PORT = parseInt(process.env.PORT) || 3001;

server.listen(PORT, '0.0.0.0', () => {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║           SAT HUNTER SERVER v1.0.0                     ║');
  console.log('║           Lightning-Powered PvP Game                   ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║  Server running on port: ${PORT}                      `);
  console.log(`║  Environment: ${process.env.NODE_ENV || 'development'} `);
  console.log(`║  LNbits URL: ${process.env.LNBITS_URL || 'demo.lnbits.com'}`);
  console.log('╚════════════════════════════════════════════════════════╝');
});

module.exports = { app, server, io };
