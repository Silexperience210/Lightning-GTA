<div align="center">

![Sat Hunter Banner](https://img.shields.io/badge/⚡%20Sat%20Hunter-Lightning%20PvP-orange?style=for-the-badge&logo=bitcoin&logoColor=white)

[![Bitcoin](https://img.shields.io/badge/Bitcoin-Lightning-FF9900?style=flat-square&logo=bitcoin&logoColor=white)](https://bitcoin.org)
[![LNbits](https://img.shields.io/badge/LNbits-API-673AB7?style=flat-square)](https://lnbits.com)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-000000?style=flat-square&logo=threedotjs&logoColor=white)](https://threejs.org)
[![Socket.io](https://img.shields.io/badge/Socket.io-Realtime-010101?style=flat-square&logo=socketdotio&logoColor=white)](https://socket.io)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)

**🎮 Vie = Argent | 1 PV = 100 Sats | Kill to Earn, Die to Lose**

[🚀 Jouer Maintenant](#déploiement) • [📖 Documentation](#documentation) • [⚡ API LNbits](./LNBITS_API.md)

</div>

---

## 🎯 Concept

**Sat Hunter** est un jeu PvP multijoueur browser avec une économie circulaire 100% **Bitcoin Lightning**. Chaque point de vie (PV) représente 100 sats - tirez pour gagner, mourez pour perdre.

```
╔═══════════════════════════════════════════════════════════════╗
║                    ⚡ SAT HUNTER ⚡                            ║
║                                                               ║
║   💰 Entrée: 1000 sats = 10 PV                                ║
║   🔫 Headshot = 300 sats  |  Body = 100 sats  |  Leg = 50    ║
║   💀 Kill = Récupérez 100% du solde restant                   ║
║   🔄 Rebuy = 1000 sats pour respawn                           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## ✨ Fonctionnalités

### 🎮 Gameplay
- **3 Classes** : Tank (+50% PV), Assassin (x2 backstab), Hacker (voir soldes)
- **4 Armes** : Pistol, SMG, Sniper, Rocket Launcher (débloquées par grade)
- **Matchmaking temps réel** avec Socket.io
- **Moteur 3D** Three.js avec contrôles FPS (WASD + souris)
- **Leaderboard en temps réel**

### ⚡ Économie Lightning
- Paiements via **LNbits API**
- Transferts P2P atomiques (< 200ms)
- Wallets dédiés par joueur
- Retrait automatique à tout moment

### 🛡️ Anti-Cheat
- Validation serveur obligatoire
- Vérification des soldes avant/après chaque hit
- Rate limiting sur les tirs
- Server authority sur tout le gameplay

---

## 🚀 Déploiement Rapide

### Option 1: Railway (Gratuit - Recommandé)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/your-template-id)

```bash
# 1. Fork ce repo
# 2. Connectez Railway à votre GitHub
# 3. Configurez les variables d'environnement
# 4. Déployez !
```

### Option 2: Docker

```bash
docker-compose up -d
```

### Option 3: Local

```bash
# Backend
cd server && npm install && npm start

# Frontend (autre terminal)
cd app && npm install && npm run dev
```

---

## 📋 Configuration

Créez un fichier `.env` dans le dossier `server/` :

```env
# LNbits Configuration (obligatoire)
LNBITS_URL=https://demo.lnbits.com
LNBITS_ADMIN_KEY=votre_admin_key
LNBITS_INVOICE_KEY=votre_invoice_key

# Game Settings
GAME_ENTRY_COST=1000
MAX_PLAYERS_PER_SESSION=10

# Server
PORT=3001
NODE_ENV=production
```

> 🔑 Obtenez vos clés sur [demo.lnbits.com](https://demo.lnbits.com)

---

## 🎮 Contrôles

| Touche | Action |
|--------|--------|
| `W/A/S/D` | Déplacement |
| `Souris` | Visée |
| `Clic Gauche` | Tirer |
| `Tab` | Leaderboard |
| `ESC` | Menu |

---

## 🏆 Classes

| Classe | Bonus | Malus |
|--------|-------|-------|
| 🛡️ **Tank** | +50% PV (15 PV) | -30% vitesse |
| ⚔️ **Assassin** | x2 dégâts backstab | - |
| 👁️ **Hacker** | Voir soldes ennemis | - |

---

## 🔫 Armes

| Arme | Dégâts | Prix | Grade |
|------|--------|------|-------|
| 🔫 Pistol | 1 PV | Gratuit | 🥉 Bronze |
| 🔫 SMG | 1.5 PV | 1000 sats | 🥈 Argent |
| 🎯 Sniper | 5 PV | 5000 sats | 🥇 Or |
| 🚀 Rocket | 10 PV | 20000 sats | 💎 Platine |

---

## 💰 Système de Dégâts

```
Headshot = Dégâts × 3
Body     = Dégâts × 1
Leg      = Dégâts × 0.5

Sats transférés = Dégâts × 100 (1 PV = 100 sats)
```

---

## 📡 API Endpoints

### HTTP
```
GET  /health                    → Health check
GET  /api/sessions              → Liste des sessions
GET  /api/weapons               → Liste des armes
GET  /api/classes               → Liste des classes
GET  /api/payment/:checkingId  → Vérifier paiement
POST /webhook/payment           → Webhook LNbits
```

### Socket.io Events

**Client → Server:**
- `player:init` - Initialiser joueur
- `payment:create` - Créer invoice
- `session:join` - Rejoindre session
- `combat:shoot` - Tirer
- `player:move` - Mettre à jour position

**Server → Client:**
- `game:started` - Partie démarrée
- `combat:hit` - Tir confirmé
- `combat:damage` - Dégâts reçus
- `leaderboard:update` - Nouveau classement

---

## 📁 Structure du Projet

```
Lightning-GTA/
├── 📁 app/                    # Frontend React + Three.js
│   ├── src/
│   │   ├── components/        # UI Screens
│   │   ├── store/             # Zustand state
│   │   └── types/             # TypeScript types
│   └── dist/                  # Build production
├── 📁 server/                 # Backend Node.js
│   ├── server.js              # Point d'entrée
│   ├── services/
│   │   └── lnbits.js          # Intégration LNbits
│   └── game/
│       └── GameState.js       # État du jeu
├── 📄 ARCHITECTURE.md         # Architecture détaillée
├── 📄 LNBITS_API.md           # Documentation LNbits
├── 📄 Dockerfile              # Configuration Docker
├── 📄 docker-compose.yml      # Docker Compose
├── 📄 railway.json            # Configuration Railway
└── 📄 README.md               # Ce fichier
```

---

## 🛠️ Stack Technique

```
Frontend:  React 18 + TypeScript + Vite + Tailwind CSS
3D:        Three.js + React Three Fiber + React Three Drei
State:     Zustand
Networking: Socket.io Client

Backend:   Node.js + Express + Socket.io
Payments:  LNbits API
Cache:     Redis (optionnel)
Deploy:    Railway / Docker / VPS
```

---

## 📊 Monitoring

Sur Railway/Render, consultez les logs pour voir :
- ✅ Connexions des joueurs
- ⚡ Paiements Lightning
- 🎮 Événements de jeu
- ❌ Erreurs éventuelles

---

## 🤝 Contribution

Les contributions sont les bienvenues !

1. 🍴 Fork le projet
2. 🌿 Créez une branche (`git checkout -b feature/amazing`)
3. 💾 Commit (`git commit -m 'Add amazing feature'`)
4. 📤 Push (`git push origin feature/amazing`)
5. 🔄 Ouvrez une Pull Request

---

## 📝 License

MIT License - voir [LICENSE](LICENSE)

---

## 🙏 Remerciements

- [LNbits](https://lnbits.com) - API Lightning
- [Three.js](https://threejs.org) - Moteur 3D
- [Socket.io](https://socket.io) - Networking temps réel
- [Bitcoin](https://bitcoin.org) - La meilleure monnaie

---

<div align="center">

## ⚡ Built by Silexperience ⚡

[![Twitter](https://img.shields.io/badge/Twitter-@Silexperience-1DA1F2?style=flat-square&logo=twitter&logoColor=white)](https://twitter.com/)
[![GitHub](https://img.shields.io/badge/GitHub-Silexperience210-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/Silexperience210)

**[⭐ Star ce repo](#) si vous aimez le projet !**

</div>
