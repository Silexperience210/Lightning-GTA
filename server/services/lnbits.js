const axios = require('axios');

const LNBITS_URL = process.env.LNBITS_URL || 'https://demo.lnbits.com';
const ADMIN_KEY = process.env.LNBITS_ADMIN_KEY;
const INVOICE_KEY = process.env.LNBITS_INVOICE_KEY;

class LNbitsService {
  constructor() {
    this.baseURL = LNBITS_URL;
    this.adminKey = ADMIN_KEY;
    this.invoiceKey = INVOICE_KEY;

    console.log('[LNbits] URL:', this.baseURL);
    console.log('[LNbits] Admin Key:', this.adminKey ? 'SET' : 'MISSING');
    console.log('[LNbits] Invoice Key:', this.invoiceKey ? 'SET' : 'MISSING');
  }

  async createUserWallet(playerName) {
    console.log(`[LNbits] Creating wallet for: ${playerName}`);
    const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      walletId: playerId,
      adminKey: this.adminKey,
      invoiceKey: this.invoiceKey,
      balance: 0,
      playerName: playerName
    };
  }

  async createInvoice(invoiceKey, amount, memo = 'Sat Hunter Entry') {
    const key = invoiceKey || this.invoiceKey;

    if (!key) {
      throw new Error('No LNbits invoice key configured');
    }

    try {
      console.log(`[LNbits] Creating invoice: ${amount} sats`);

      const response = await axios.post(
        `${this.baseURL}/api/v1/payments`,
        { 
          out: false, 
          amount, 
          memo,
          webhook: process.env.WEBHOOK_URL || null
        },
        { 
          headers: { 'X-Api-Key': key, 'Content-Type': 'application/json' },
          timeout: 15000
        }
      );

      console.log('[LNbits] Invoice created:', response.data.payment_hash.substring(0, 20));

      return {
        paymentHash: response.data.payment_hash,
        paymentRequest: response.data.payment_request,
        checkingId: response.data.checking_id
      };
    } catch (error) {
      console.error('[LNbits] Error:', error.message);
      throw new Error(`Failed to create invoice: ${error.message}`);
    }
  }

  /**
   * Vérifier le statut d'un paiement - MÉTHODE 1: Par payment_hash
   */
  async checkPaymentStatus(invoiceKey, paymentHash) {
    const key = invoiceKey || this.invoiceKey;

    if (!key) {
      console.error('[LNbits] No invoice key for check');
      return { paid: false, error: 'No invoice key' };
    }

    if (!paymentHash) {
      console.error('[LNbits] No payment hash provided');
      return { paid: false, error: 'No payment hash' };
    }

    try {
      console.log(`[LNbits] Checking payment by hash: ${paymentHash.substring(0, 20)}...`);

      const response = await axios.get(
        `${this.baseURL}/api/v1/payments/${paymentHash}`,
        { 
          headers: { 'X-Api-Key': key },
          timeout: 15000
        }
      );

      const isPaid = response.data.paid === true;
      console.log(`[LNbits] Payment status by hash: ${isPaid ? '✓ PAID' : '○ PENDING'}`);

      return {
        paid: isPaid,
        details: response.data
      };
    } catch (error) {
      console.error('[LNbits] Error checking payment by hash:', error.message);
      if (error.response && error.response.status === 404) {
        return { paid: false, error: 'Payment not found', notFound: true };
      }
      return { paid: false, error: error.message };
    }
  }

  /**
   * Vérifier le statut - MÉTHODE 2: Par historique des paiements
   * Plus fiable car liste tous les paiements
   */
  async checkPaymentByHistory(invoiceKey, paymentHash) {
    const key = invoiceKey || this.invoiceKey;

    if (!key) {
      return { paid: false, error: 'No invoice key' };
    }

    try {
      console.log(`[LNbits] Checking payment by history: ${paymentHash.substring(0, 20)}...`);

      const response = await axios.get(
        `${this.baseURL}/api/v1/payments?limit=100`,
        { 
          headers: { 'X-Api-Key': key },
          timeout: 15000
        }
      );

      // Chercher le paiement par hash
      const payment = response.data.find(p => p.payment_hash === paymentHash);

      if (payment) {
        const isPaid = payment.paid === true;
        console.log(`[LNbits] Payment found in history: ${isPaid ? '✓ PAID' : '○ PENDING'}`);
        return {
          paid: isPaid,
          details: payment
        };
      }

      console.log('[LNbits] Payment not found in history');
      return { paid: false, error: 'Payment not found in history' };
    } catch (error) {
      console.error('[LNbits] Error checking history:', error.message);
      return { paid: false, error: error.message };
    }
  }

  /**
   * Vérifier le statut - MÉTHODE 3: Par balance du wallet
   * Si la balance a augmenté, le paiement a été reçu
   */
  async checkPaymentByBalance(invoiceKey, expectedAmount) {
    const key = invoiceKey || this.invoiceKey;

    if (!key) {
      return { paid: false, error: 'No invoice key' };
    }

    try {
      console.log(`[LNbits] Checking payment by balance, expecting: ${expectedAmount} sats`);

      const response = await axios.get(
        `${this.baseURL}/api/v1/wallet`,
        { 
          headers: { 'X-Api-Key': key },
          timeout: 15000
        }
      );

      // Balance est en millisats
      const balanceSats = Math.floor(response.data.balance / 1000);
      console.log(`[LNbits] Current balance: ${balanceSats} sats`);

      // Si balance >= expectedAmount, considérer comme payé
      if (balanceSats >= expectedAmount) {
        console.log(`[LNbits] Balance sufficient! Payment detected.`);
        return { 
          paid: true, 
          balance: balanceSats,
          method: 'balance'
        };
      }

      return { 
        paid: false, 
        balance: balanceSats,
        needed: expectedAmount 
      };
    } catch (error) {
      console.error('[LNbits] Error checking balance:', error.message);
      return { paid: false, error: error.message };
    }
  }

  /**
   * Vérification COMBINÉE - Utilise toutes les méthodes
   * Priorité: Balance > History > Payment Hash
   * (demo.lnbits.com a des bugs avec payment_hash)
   */
  async verifyPaymentCombined(invoiceKey, paymentHash, expectedAmount) {
    console.log(`[LNbits] Starting combined verification...`);

    // Méthode 1: Par balance (LA PLUS FIABLE sur demo.lnbits.com)
    console.log(`[LNbits] Checking by balance first...`);
    const balanceResult = await this.checkPaymentByBalance(invoiceKey, expectedAmount);
    if (balanceResult.paid) {
      console.log(`[LNbits] ✓ PAID detected by balance: ${balanceResult.balance} sats`);
      return { paid: true, method: 'balance', balance: balanceResult.balance };
    }
    console.log(`[LNbits] Balance: ${balanceResult.balance}/${expectedAmount} sats - not enough`);

    // Méthode 2: Par historique
    console.log(`[LNbits] Checking by history...`);
    const historyResult = await this.checkPaymentByHistory(invoiceKey, paymentHash);
    if (historyResult.paid) {
      console.log(`[LNbits] ✓ PAID detected by history`);
      return { paid: true, method: 'history', details: historyResult.details };
    }

    // Méthode 3: Par payment_hash (souvent bugué sur demo.lnbits.com)
    console.log(`[LNbits] Checking by payment hash...`);
    const statusResult = await this.checkPaymentStatus(invoiceKey, paymentHash);
    if (statusResult.paid) {
      console.log(`[LNbits] ✓ PAID detected by payment_hash`);
      return { paid: true, method: 'payment_hash', details: statusResult.details };
    }

    // Aucune méthode n'a trouvé le paiement
    console.log(`[LNbits] ✗ Payment not verified by any method`);
    return { 
      paid: false, 
      error: 'Payment not verified by any method',
      balance: balanceResult.balance || 0
    };
  }

  async getWalletBalance(invoiceKey) {
    const key = invoiceKey || this.invoiceKey;
    if (!key) return 0;

    try {
      const response = await axios.get(
        `${this.baseURL}/api/v1/wallet`,
        { 
          headers: { 'X-Api-Key': key },
          timeout: 15000
        }
      );
      return Math.floor(response.data.balance / 1000);
    } catch (error) {
      console.error('[LNbits] Error getting balance:', error.message);
      return 0;
    }
  }

  async internalTransfer(fromAdminKey, toWalletId, amount, memo = 'Transfer') {
    const admin = fromAdminKey || this.adminKey;
    const invoice = toWalletId || this.invoiceKey;

    if (!admin || !invoice) {
      console.error('[LNbits] Missing keys for transfer');
      return { success: false, error: 'Missing API keys' };
    }

    try {
      console.log(`[LNbits] Transferring ${amount} sats...`);

      const invoiceResponse = await axios.post(
        `${this.baseURL}/api/v1/payments`,
        { out: false, amount, memo },
        { headers: { 'X-Api-Key': invoice }, timeout: 15000 }
      );

      const paymentResponse = await axios.post(
        `${this.baseURL}/api/v1/payments`,
        { out: true, bolt11: invoiceResponse.data.payment_request },
        { headers: { 'X-Api-Key': admin }, timeout: 15000 }
      );

      console.log('[LNbits] Transfer result:', paymentResponse.data.paid);
      return {
        success: paymentResponse.data.paid,
        paymentHash: paymentResponse.data.payment_hash
      };
    } catch (error) {
      console.error('[LNbits] Transfer error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async payInvoice(adminKey, bolt11) {
    const key = adminKey || this.adminKey;

    if (!key) {
      console.error('[LNbits] No admin key for withdrawal');
      throw new Error('No admin key configured');
    }

    if (!bolt11 || !bolt11.startsWith('lnbc')) {
      throw new Error('Invalid Lightning invoice');
    }

    try {
      console.log('[LNbits] Processing withdrawal...');

      const response = await axios.post(
        `${this.baseURL}/api/v1/payments`,
        { out: true, bolt11 },
        { 
          headers: { 'X-Api-Key': key },
          timeout: 30000
        }
      );

      console.log('[LNbits] Withdrawal result:', response.data.paid ? 'SUCCESS' : 'FAILED');

      return {
        paid: response.data.paid,
        paymentHash: response.data.payment_hash,
        checkingId: response.data.checking_id,
        fee: response.data.fee || 0
      };
    } catch (error) {
      console.error('[LNbits] Withdrawal error:', error.message);
      if (error.response) {
        console.error('[LNbits] Status:', error.response.status);
        console.error('[LNbits] Data:', error.response.data);
      }
      throw new Error(`Withdrawal failed: ${error.message}`);
    }
  }

  async getPaymentHistory(invoiceKey) {
    const key = invoiceKey || this.invoiceKey;
    if (!key) return [];

    try {
      const response = await axios.get(
        `${this.baseURL}/api/v1/payments?limit=50`,
        { 
          headers: { 'X-Api-Key': key },
          timeout: 15000
        }
      );
      return response.data;
    } catch (error) {
      console.error('[LNbits] Error getting history:', error.message);
      return [];
    }
  }
}

module.exports = new LNbitsService();
