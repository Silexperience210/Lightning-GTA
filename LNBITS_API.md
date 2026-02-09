# LNbits API Documentation - Sat Hunter

## Vue d'ensemble

Sat Hunter utilise l'API LNbits pour gérer tous les aspects des paiements Lightning : création de wallets, génération d'invoices, transferts P2P et retraits.

## Endpoints LNbits Utilisés

### 1. Création de Wallet Utilisateur

**Endpoint:** `POST /api/v1/wallets`

**Description:** Crée un nouveau wallet LNbits pour chaque joueur à son arrivée.

**Headers:**
```http
X-Api-Key: {LNBITS_ADMIN_KEY}
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "SatHunter_PlayerName_1699123456789"
}
```

**Response:**
```json
{
  "id": "wallet_id_string",
  "name": "SatHunter_PlayerName_1699123456789",
  "adminkey": "admin_key_string",
  "inkey": "invoice_key_string"
}
```

**Usage dans Sat Hunter:**
```javascript
// server/services/lnbits.js
async createUserWallet(playerName) {
  const response = await axios.post(
    `${LNBITS_URL}/api/v1/wallets`,
    { name: `SatHunter_${playerName}_${Date.now()}` },
    { headers: { 'X-Api-Key': ADMIN_KEY } }
  );
  
  return {
    walletId: response.data.id,
    adminKey: response.data.adminkey,
    invoiceKey: response.data.inkey
  };
}
```

---

### 2. Création d'Invoice (Entrée Payante)

**Endpoint:** `POST /api/v1/payments`

**Description:** Génère une invoice Lightning pour l'entrée du joueur (1000 sats).

**Headers:**
```http
X-Api-Key: {PLAYER_INVOICE_KEY}
Content-Type: application/json
```

**Request Body:**
```json
{
  "out": false,
  "amount": 1000,
  "memo": "Sat Hunter Entry - PlayerName",
  "webhook": "https://your-domain.com/webhook/payment"
}
```

**Response:**
```json
{
  "payment_hash": "payment_hash_string",
  "payment_request": "lnbc10u1p3...",
  "checking_id": "checking_id_string"
}
```

**Usage dans Sat Hunter:**
```javascript
// Créer l'invoice d'entrée
async createEntryInvoice(player) {
  const invoice = await axios.post(
    `${LNBITS_URL}/api/v1/payments`,
    {
      out: false,
      amount: 1000,
      memo: `Sat Hunter Entry - ${player.name}`,
      webhook: WEBHOOK_URL
    },
    { headers: { 'X-Api-Key': player.lnbitsInvoiceKey } }
  );
  
  return {
    paymentHash: invoice.data.payment_hash,
    paymentRequest: invoice.data.payment_request,
    checkingId: invoice.data.checking_id
  };
}
```

---

### 3. Vérification de Paiement

**Endpoint:** `GET /api/v1/payments/{checking_id}`

**Description:** Vérifie si une invoice a été payée.

**Headers:**
```http
X-Api-Key: {PLAYER_INVOICE_KEY}
```

**Response:**
```json
{
  "paid": true,
  "details": {
    "checking_id": "checking_id_string",
    "pending": false,
    "amount": 1000000,
    "fee": 0,
    "memo": "Sat Hunter Entry - PlayerName",
    "time": 1699123456,
    "bolt11": "lnbc10u1p3...",
    "preimage": "preimage_string",
    "payment_hash": "payment_hash_string",
    "extra": {},
    "wallet_id": "wallet_id_string",
    "webhook": "https://your-domain.com/webhook/payment",
    "webhook_status": "success"
  }
}
```

**Usage dans Sat Hunter:**
```javascript
// Vérifier le statut du paiement
async checkPayment(checkingId, invoiceKey) {
  const response = await axios.get(
    `${LNBITS_URL}/api/v1/payments/${checkingId}`,
    { headers: { 'X-Api-Key': invoiceKey } }
  );
  
  return {
    paid: response.data.paid,
    details: response.data
  };
}
```

---

### 4. Transfert Interne P2P (Dégâts)

**Endpoint:** `POST /api/v1/payments`

**Description:** Transfère des sats du wallet de la cible vers l'attaquant (P2P atomique).

**Processus en 2 étapes:**

#### Étape 1: Créer une invoice pour le receveur
```javascript
// Attacker creates invoice to receive sats
const receiveInvoice = await axios.post(
  `${LNBITS_URL}/api/v1/payments`,
  {
    out: false,
    amount: damageAmount,  // ex: 300 sats for 3 PV
    memo: `Damage reward from ${targetName}`
  },
  { headers: { 'X-Api-Key': attacker.lnbitsInvoiceKey } }
);
```

#### Étape 2: Payer l'invoice depuis le wallet de la cible
```javascript
// Target pays the invoice
const payment = await axios.post(
  `${LNBITS_URL}/api/v1/payments`,
  {
    out: true,
    bolt11: receiveInvoice.data.payment_request
  },
  { headers: { 'X-Api-Key': target.lnbitsAdminKey } }
);
```

**Usage complet dans Sat Hunter:**
```javascript
// server/services/lnbits.js
async internalTransfer(fromAdminKey, toWalletId, amount, memo) {
  // Étape 1: Créer invoice pour le receveur
  const invoiceResponse = await axios.post(
    `${LNBITS_URL}/api/v1/payments`,
    { out: false, amount, memo: `${memo}_in` },
    { headers: { 'X-Api-Key': toWalletId } }
  );
  
  // Étape 2: Payer depuis l'envoyeur
  const paymentResponse = await axios.post(
    `${LNBITS_URL}/api/v1/payments`,
    { out: true, bolt11: invoiceResponse.data.payment_request },
    { headers: { 'X-Api-Key': fromAdminKey } }
  );
  
  return {
    success: paymentResponse.data.paid,
    paymentHash: paymentResponse.data.payment_hash
  };
}

// Usage dans le combat
async processDamageTransfer(attacker, target, damage) {
  const satsToTransfer = damage * 100;  // 1 PV = 100 sats
  
  const result = await lnbits.internalTransfer(
    target.lnbitsAdminKey,      // From target
    attacker.lnbitsWalletId,    // To attacker
    satsToTransfer,
    `Damage from ${attacker.name}`
  );
  
  if (result.success) {
    // Update game state
    target.balance -= satsToTransfer;
    attacker.balance += satsToTransfer;
  }
  
  return result;
}
```

---

### 5. Obtenir le Solde

**Endpoint:** `GET /api/v1/wallet`

**Description:** Récupère le solde actuel d'un wallet.

**Headers:**
```http
X-Api-Key: {PLAYER_INVOICE_KEY}
```

**Response:**
```json
{
  "id": "wallet_id_string",
  "name": "SatHunter_PlayerName_1699123456789",
  "balance": 1000000
}
```

**Note:** Le solde est en millisatoshi (msats). Diviser par 1000 pour obtenir les sats.

**Usage dans Sat Hunter:**
```javascript
async getWalletBalance(invoiceKey) {
  const response = await axios.get(
    `${LNBITS_URL}/api/v1/wallet`,
    { headers: { 'X-Api-Key': invoiceKey } }
  );
  
  return Math.floor(response.data.balance / 1000); // Convert msats to sats
}
```

---

### 6. Payer une Invoice (Retrait)

**Endpoint:** `POST /api/v1/payments`

**Description:** Permet au joueur de retirer ses sats en payant une invoice externe.

**Headers:**
```http
X-Api-Key: {PLAYER_ADMIN_KEY}
Content-Type: application/json
```

**Request Body:**
```json
{
  "out": true,
  "bolt11": "lnbc..."
}
```

**Response:**
```json
{
  "checking_id": "checking_id_string",
  "payment_hash": "payment_hash_string",
  "paid": true
}
```

**Usage dans Sat Hunter:**
```javascript
// Withdrawal handler
async withdrawSats(player, bolt11) {
  // Vérifier que le joueur n'est pas en partie
  if (player.isInActiveGame) {
    throw new Error('Cannot withdraw during active game');
  }
  
  const response = await axios.post(
    `${LNBITS_URL}/api/v1/payments`,
    { out: true, bolt11 },
    { headers: { 'X-Api-Key': player.lnbitsAdminKey } }
  );
  
  return {
    success: response.data.paid,
    paymentHash: response.data.payment_hash
  };
}
```

---

### 7. Historique des Paiements

**Endpoint:** `GET /api/v1/payments?limit={limit}`

**Description:** Récupère l'historique des transactions d'un wallet.

**Headers:**
```http
X-Api-Key: {PLAYER_INVOICE_KEY}
```

**Response:**
```json
[
  {
    "checking_id": "checking_id_string",
    "pending": false,
    "amount": 1000000,
    "fee": 0,
    "memo": "Sat Hunter Entry - PlayerName",
    "time": 1699123456,
    "bolt11": "lnbc10u1p3...",
    "preimage": "preimage_string",
    "payment_hash": "payment_hash_string",
    "extra": {},
    "wallet_id": "wallet_id_string"
  }
]
```

**Usage dans Sat Hunter:**
```javascript
async getPaymentHistory(invoiceKey, limit = 50) {
  const response = await axios.get(
    `${LNBITS_URL}/api/v1/payments?limit=${limit}`,
    { headers: { 'X-Api-Key': invoiceKey } }
  );
  
  return response.data.map(tx => ({
    id: tx.checking_id,
    amount: Math.abs(tx.amount) / 1000,  // Convert to sats
    type: tx.amount > 0 ? 'incoming' : 'outgoing',
    memo: tx.memo,
    timestamp: tx.time,
    paymentHash: tx.payment_hash
  }));
}
```

---

## Webhook Configuration

### Configuration du Webhook LNbits

**URL:** `POST /webhook/payment`

**Payload reçu:**
```json
{
  "payment_hash": "payment_hash_string",
  "checking_id": "checking_id_string",
  "amount": 1000000,
  "fee": 0,
  "memo": "Sat Hunter Entry - PlayerName",
  "time": 1699123456,
  "bolt11": "lnbc10u1p3...",
  "preimage": "preimage_string",
  "wallet_id": "wallet_id_string",
  "webhook": "https://your-domain.com/webhook/payment",
  "webhook_status": "pending"
}
```

**Handler côté serveur:**
```javascript
// server/server.js
app.post('/webhook/payment', (req, res) => {
  const { checking_id, amount, wallet_id } = req.body;
  
  // Find pending payment
  const playerId = pendingPayments.get(checking_id);
  if (!playerId) {
    return res.json({ received: true, status: 'unknown' });
  }
  
  const player = gameState.getPlayer(playerId);
  if (!player) {
    return res.json({ received: true, status: 'player_not_found' });
  }
  
  // Verify wallet matches
  if (player.lnbitsWalletId !== wallet_id) {
    return res.json({ received: true, status: 'wallet_mismatch' });
  }
  
  // Credit player
  const satsReceived = amount / 1000;
  player.balance += satsReceived;
  
  // Notify player
  io.to(playerId).emit('payment:confirmed', {
    success: true,
    balance: player.balance,
    amount: satsReceived
  });
  
  // Remove from pending
  pendingPayments.delete(checking_id);
  
  res.json({ received: true, status: 'credited' });
});
```

---

## Flux Complets

### Flux d'Entrée (Entry Flow)

```
1. Joueur entre son nom
   └──► Frontend: player:init
       └──► Backend: Crée wallet LNbits
           └──► LNbits POST /api/v1/wallets
               └──► Retourne: walletId, adminKey, invoiceKey

2. Joueur demande à entrer
   └──► Frontend: payment:create
       └──► Backend: Crée invoice
           └──► LNbits POST /api/v1/payments (out: false, amount: 1000)
               └──► Retourne: paymentRequest, checkingId
                   └──► Frontend: Affiche QR code

3. Joueur paie l'invoice
   └──► Wallet Lightning ──► LNbits Network
       └──► LNbits appelle webhook
           └──► Backend POST /webhook/payment
               └──► Vérifie et crédite le joueur
                   └──► Frontend: payment:confirmed
                       └──► Joueur spawn avec 10 PV
```

### Flux de Combat (Combat Flow)

```
1. Attaquant tire
   └──► Frontend: combat:shoot
       └──► Backend: Valide le tir
           ├──► Vérifie distance
           ├──► Vérifie fire rate
           └──► Vérifie solde cible

2. Calcul des dégâts
   └──► damage = weapon × zone × class
       └──► sats = damage × 100

3. Transfert P2P
   └──► LNbits: Crée invoice pour attaquant
       └──► LNbits: Cible paie l'invoice
           └──► Transfert atomique confirmé

4. Mise à jour état
   └──► Cible: health -= damage
       └──► Cible: balance -= sats
           └──► Attaquant: balance += sats
               └──► Broadcast: combat:hit, combat:damage
```

### Flux de Kill (Kill Flow)

```
1. Cible atteint 0 PV
   └──► Backend: Détecte kill
       └──► Calcul: satsRestants = cible.balance

2. Sweep automatique
   └──► LNbits: Transfère tout le solde
       └──► Attaquant reçoit: satsRestants

3. Élimination
   └──► Cible: isAlive = false
       └──► Cible: phase = 'spectate'
           └──► Frontend: Affiche écran spectateur

4. Vérification fin de partie
   └──► Si 1 joueur vivant:
       └──► game:ended
           └──► Frontend: Affiche écran victoire
```

---

## Gestion des Erreurs

### Erreurs Courantes

```javascript
// 1. Solde insuffisant
{
  error: 'Insufficient balance',
  code: 'INSUFFICIENT_BALANCE',
  required: 1000,
  available: 500
}

// 2. Invoice expirée
{
  error: 'Invoice expired',
  code: 'INVOICE_EXPIRED',
  expired_at: 1699123456
}

// 3. Paiement échoué
{
  error: 'Payment failed',
  code: 'PAYMENT_FAILED',
  details: 'No route found'
}

// 4. Rate limit
{
  error: 'Rate limit exceeded',
  code: 'RATE_LIMIT',
  retry_after: 60
}
```

### Retry Logic

```javascript
async function withRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // Exponential backoff
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
}

// Usage
const result = await withRetry(() => 
  lnbits.internalTransfer(fromKey, toWallet, amount, memo)
);
```

---

## Configuration Requise

### Clés LNbits Nécessaires

1. **Admin Key** (serveur uniquement)
   - Créer des wallets
   - Effectuer des paiements sortants
   - Accéder à toutes les fonctions

2. **Invoice Key** (partagée avec client)
   - Créer des invoices
   - Vérifier les paiements
   - Voir le solde
   - Voir l'historique

### Variables d'Environnement

```env
# Required
LNBITS_URL=https://legend.lnbits.com
LNBITS_ADMIN_KEY=your_super_admin_key

# Optional (for specific extensions)
LNBITS_INVOICE_KEY=your_invoice_key
LNBITS_READ_KEY=your_read_key

# Webhook
WEBHOOK_URL=https://your-game.com/webhook/payment
```

---

## Latence & Performance

### Temps de Réponse Typiques

| Opération | Latence Typique | Latence Max |
|-----------|----------------|-------------|
| Créer wallet | 200ms | 500ms |
| Créer invoice | 150ms | 300ms |
| Vérifier paiement | 100ms | 200ms |
| Transfert interne | 100ms | 200ms |
| Obtenir solde | 80ms | 150ms |
| Payer invoice | 200ms | 500ms |

### Optimisations

```javascript
// 1. Cache des soldes (5 secondes)
const balanceCache = new Map();

async function getCachedBalance(invoiceKey) {
  const cached = balanceCache.get(invoiceKey);
  if (cached && Date.now() - cached.time < 5000) {
    return cached.balance;
  }
  
  const balance = await lnbits.getWalletBalance(invoiceKey);
  balanceCache.set(invoiceKey, { balance, time: Date.now() });
  return balance;
}

// 2. Batch transfers (pour les kills)
async function batchTransfer(attacker, targets) {
  // Process all transfers in parallel
  const transfers = targets.map(t => 
    lnbits.internalTransfer(t.adminKey, attacker.walletId, t.balance)
  );
  
  await Promise.all(transfers);
}

// 3. Connection pooling
const axiosInstance = axios.create({
  baseURL: LNBITS_URL,
  timeout: 5000,
  keepAlive: true,
  maxSockets: 50
});
```

---

## Sécurité

### Bonnes Pratiques

1. **Ne jamais exposer l'admin key côté client**
2. **Valider tous les montants côté serveur**
3. **Utiliser des webhooks pour les confirmations**
4. **Implémenter des rate limits**
5. **Logger toutes les transactions**

### Checklist Sécurité

- [ ] Admin key uniquement côté serveur
- [ ] Vérifier les soldes avant chaque transfert
- [ ] Valider les webhooks (signature)
- [ ] Rate limiting sur les endpoints
- [ ] Timeout sur les requêtes LNbits
- [ ] Retry avec exponential backoff
- [ ] Circuit breaker pour les pannes
- [ ] Monitoring des transactions suspectes
