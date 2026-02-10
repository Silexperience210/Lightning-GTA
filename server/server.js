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

// Webhook endpoint for LNbits payment notifications
app.post('/webhook/lnbits', (req, res) => {
  try {
    const { payment_hash, amount, pending } = req.body;
    console.log(`[Webhook] Received payment notification: ${payment_hash?.substring(0, 20)}..., amount: ${amount}, pending: ${pending}`);

    // Find player by payment hash
    for (const [playerId, player] of gameState.players) {
      if (gameState.pendingPayments.has(payment_hash)) {
        console.log(`[Webhook] Found pending payment for player: ${player.name}`);

        if (!pending) {
          // Payment confirmed
          player.balance = gameState.ENTRY_COST;
          player.paymentVerified = true;
          gameState.pendingPayments.delete(payment_hash);

          // Notify player via socket
          io.to(playerId).emit('payment:confirmed', {
            balance: player.balance,
            message: 'Payment confirmed via webhook!'
          });

          console.log(`[Webhook] Payment confirmed for ${player.name}`);
        }
        break;
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[Webhook] Error:', error.message);
    res.status(200).json({ received: true }); // Always return 200 to LNbits
  }
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
      const { paymentHash } = data;
      const player = gameState.getPlayer(socket.id);

      if (!player) {
        return callback({ success: false, error: 'Player not found' });
      }

      console.log(`[Payment:Verify] Received data:`, JSON.stringify(data));

      if (!paymentHash) {
        console.log(`[Payment:Verify] No payment hash provided`);
        return callback({ success: false, error: 'No payment hash provided' });
      }

      console.log(`[Payment:Verify] Checking payment for ${player.name}, hash: ${paymentHash.substring(0, 20)}...`);

      // Use combined verification (balance check is most reliable on demo.lnbits.com)
      const result = await lnbits.verifyPaymentCombined(
        player.lnbitsInvoiceKey,
        paymentHash,
        gameState.ENTRY_COST
      );

      if (result.paid) {
        console.log(`[Payment:Verify] ✓ Payment CONFIRMED for ${player.name} (method: ${result.method})`);

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
        return;
      }

      // Fallback: Check balance directly if combined method didn't work
      console.log(`[Payment:Verify] Combined check failed, trying direct balance check...`);
      const balance = await lnbits.getWalletBalance(player.lnbitsInvoiceKey);
      console.log(`[Payment:Verify] Wallet balance: ${balance} sats (need: ${gameState.ENTRY_COST})`);

      if (balance >= gameState.ENTRY_COST) {
        console.log(`[Payment:Verify] ✓ Payment CONFIRMED by balance for ${player.name}`);

        player.balance = gameState.ENTRY_COST;
        player.paymentVerified = true;
        gameState.pendingPayments.delete(paymentHash);

        callback({
          success: true,
          verified: true,
          balance: player.balance,
          message: 'Payment confirmed by balance!'
        });
        return;
      }

      console.log(`[Payment:Verify] Payment still pending for ${player.name}`);
      callback({
        success: true,
        verified: false,
        message: 'Payment pending...',
        debug: { balance, needed: gameState.ENTRY_COST }
      });
    } catch (error) {
      console.error('[Payment:Verify] Error:', error.message);
      callback({ success: false, error: error.message });
    }
  });