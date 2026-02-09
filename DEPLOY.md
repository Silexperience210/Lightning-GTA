# 🚀 Déploiement Sat Hunter - Guide Facile

## Option 1: Railway (Recommandé - Gratuit)

Railway est gratuit et super simple. Suivez ces étapes :

### Étape 1: Créer un compte Railway

1. Allez sur https://railway.app
2. Cliquez sur "Start for Free"
3. Connectez-vous avec GitHub

### Étape 2: Créer un nouveau projet

1. Cliquez sur "New Project"
2. Sélectionnez "Deploy from GitHub repo"
3. Connectez votre compte GitHub
4. Créez un nouveau repository GitHub et poussez ce code :

```bash
# Dans le dossier sat-hunter
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/VOTRE_USERNAME/sat-hunter.git
git push -u origin main
```

### Étape 3: Déployer

1. Dans Railway, sélectionnez votre repo `sat-hunter`
2. Railway détecte automatiquement la configuration
3. Cliquez sur "Deploy"

### Étape 4: Configurer les variables d'environnement

1. Allez dans l'onglet "Variables" de votre service
2. Ajoutez ces variables :

```
LNBITS_URL=https://demo.lnbits.com
LNBITS_ADMIN_KEY=4be11f67dc3b41598307c4dc87b35f89
LNBITS_INVOICE_KEY=68c078793bcb4a8d81719401e24cb587
GAME_ENTRY_COST=1000
NODE_ENV=production
```

3. Redéployez (Railway le fait automatiquement)

### Étape 5: Obtenir l'URL

1. Allez dans l'onglet "Settings"
2. Dans "Public Networking", cliquez sur "Generate Domain"
3. Votre jeu est en ligne ! 🎉

---

## Option 2: Render (Gratuit)

### Étape 1: Créer un compte

1. Allez sur https://render.com
2. Connectez-vous avec GitHub

### Étape 2: New Web Service

1. Cliquez sur "New +" → "Web Service"
2. Connectez votre repo GitHub
3. Configurez :

```
Name: sat-hunter
Runtime: Node
Build Command: cd server && npm install && cd ../app && npm install && npm run build
Start Command: cd server && npm start
```

4. Ajoutez les variables d'environnement (même que Railway)
5. Cliquez sur "Create Web Service"

---

## Option 3: Déploiement Manuel (VPS)

Si vous avez un serveur VPS (DigitalOcean, Hetzner, etc.) :

```bash
# 1. Connectez-vous au serveur
ssh root@votre-ip

# 2. Installez Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Clonez le repo
git clone https://github.com/VOTRE_USERNAME/sat-hunter.git
cd sat-hunter

# 4. Installez les dépendances
npm run install:all

# 5. Build le frontend
npm run build

# 6. Créez le fichier .env
cat > server/.env << EOF
PORT=3001
LNBITS_URL=https://demo.lnbits.com
LNBITS_ADMIN_KEY=4be11f67dc3b41598307c4dc87b35f89
LNBITS_INVOICE_KEY=68c078793bcb4a8d81719401e24cb587
GAME_ENTRY_COST=1000
NODE_ENV=production
EOF

# 7. Démarrez avec PM2
npm install -g pm2
cd server && pm2 start server.js --name sat-hunter
pm2 startup
pm2 save

# 8. Configurez Nginx (optionnel mais recommandé)
```

---

## 🧪 Test Local (Avant Déploiement)

```bash
# Terminal 1 - Backend
cd server
npm install
npm start

# Terminal 2 - Frontend
cd app
npm install
npm run dev

# Ouvrez http://localhost:5173
```

---

## 🔧 Dépannage

### Problème: "Cannot connect to server"
- Vérifiez que `VITE_SERVER_URL` est vide dans `app/.env`
- Vérifiez que CORS est bien configuré

### Problème: "LNbits API Error"
- Vérifiez vos clés LNbits dans les variables d'environnement
- Assurez-vous que le wallet a des fonds pour créer des invoices

### Problème: Build échoue
```bash
# Nettoyez et réinstallez
rm -rf node_modules app/node_modules server/node_modules
rm -rf app/dist
npm run install:all
npm run build
```

---

## 📊 Monitoring

Sur Railway/Render, allez dans l'onglet "Logs" pour voir :
- Connexions des joueurs
- Paiements Lightning
- Erreurs éventuelles

---

## 💰 Coûts

| Service | Gratuit | Limites |
|---------|---------|---------|
| Railway | Oui | 500h/mois, s'endort après inactivité |
| Render | Oui | 750h/mois, s'endort après 15min |
| LNbits | Oui | Dépend du nœud (demo.lnbits.com est gratuit) |

---

Besoin d'aide ? Ouvrez une issue sur GitHub ou contactez-moi !
