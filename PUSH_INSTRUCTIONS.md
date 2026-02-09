# 🚀 Instructions de Push GitHub - Sat Hunter

## Problème: Token GitHub invalide

Le token GitHub fourni a expiré ou est invalide. Voici comment procéder:

---

## Option 1: Créer un nouveau token GitHub (Recommandé)

### Étape 1: Générer un nouveau token
1. Allez sur https://github.com/settings/tokens
2. Cliquez sur **"Generate new token (classic)"**
3. Donnez un nom: `Sat Hunter Deploy`
4. Cochez la permission **`repo`** (accès complet au repository)
5. Cliquez **"Generate token"**
6. **Copiez immédiatement le token** (il ne s'affiche qu'une fois!)

### Étape 2: Push avec le nouveau token

```bash
# Allez dans le dossier du projet
cd /tmp/sathunter-push

# Configurez git
git config user.email "sathunter@game.com"
git config user.name "Sat Hunter"

# Ajoutez le remote avec le NOUVEAU token
git remote add origin https://quentinmaurin:GH_NOUVEAU_TOKEN@github.com/quentinmaurin/sathunter.git

# Push
git branch -M main
git push -u origin main --force
```

---

## Option 2: Utiliser le script fourni

```bash
cd /tmp/sathunter-push
./push-to-github.sh GH_NOUVEAU_TOKEN
```

---

## Option 3: Push manuel avec téléchargement

1. Téléchargez le fichier `sathunter-complete.zip`
2. Dézippez-le sur votre machine locale
3. Ouvrez un terminal dans le dossier dézippé
4. Exécutez:

```bash
git init
git add -A
git commit -m "Complete Sat Hunter with payment verification and withdraw"
git remote add origin https://github.com/quentinmaurin/sathunter.git
# Entrez vos identifiants GitHub quand demandé
git push -u origin main --force
```

---

## ✅ Après le push - Déploiement Railway

1. Allez sur https://railway.app/dashboard
2. Sélectionnez votre projet Sat Hunter
3. Cliquez sur **"Redeploy"** ou attendez le déploiement auto
4. Vérifiez les logs pour confirmer le démarrage

### Variables d'environnement Railway (à vérifier):
```
LNBITS_URL=https://demo.lnbits.com
LNBITS_ADMIN_KEY=votre_clef_admin
LNBITS_INVOICE_KEY=votre_clef_invoice
PORT=3001
NODE_ENV=production
```

---

## 🔧 Fonctionnalités incluses dans ce push

### ✅ Vérification de paiement (Polling)
- Le frontend vérifie automatiquement toutes les 3 secondes
- Endpoint: `payment:verify` dans server.js
- Fonction `checkPaymentStatus()` dans lnbits.js

### ✅ Withdraw des sats
- Écran WithdrawScreen.tsx créé
- Handler `player:withdraw` dans server.js
- Fonction `payInvoice()` dans lnbits.js
- Le joueur peut withdraw à tout moment (hors partie active)

### ✅ Handlers Socket.io complets
- `player:init` - Création joueur
- `payment:create` - Création invoice
- `payment:verify` - Vérification paiement
- `session:join` - Rejoindre session
- `session:start` - Démarrer partie
- `combat:shoot` - Tirer sur un joueur
- `player:withdraw` - Retirer des sats
- `shop:purchase` - Acheter une arme
- `player:rebuy` - Rebuy après mort
- `leaderboard:get` - Classement

---

## 📁 Fichiers principaux modifiés/créés

```
server/
├── server.js          # ✅ Complet avec tous les handlers
├── services/
│   └── lnbits.js      # ✅ Avec checkPaymentStatus et payInvoice
└── game/
    └── GameState.js   # ✅ Logique de jeu

app/src/
├── components/
│   ├── PaymentScreen.tsx   # ✅ Avec polling auto
│   └── WithdrawScreen.tsx  # ✅ Nouveau composant
└── store/
    └── gameStore.ts        # ✅ Avec withdraw()
```

---

## 🆘 Support

Si vous avez des problèmes:
1. Vérifiez que le token a la permission `repo`
2. Assurez-vous que le repository `quentinmaurin/sathunter` existe
3. Vérifiez les logs Railway après déploiement
