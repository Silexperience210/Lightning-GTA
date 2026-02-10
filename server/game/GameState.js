/**
 * GameState - Gestion de l'état du jeu et des sessions
 */
class GameState {
  constructor() {
    /** @type {Map<string, import('../types').Player>} */
    this.players = new Map();
    
    /** @type {Map<string, import('../types').GameSession>} */
    this.sessions = new Map();
    
    /** @type {Map<string, string>} */
    this.socketToPlayer = new Map();
    
    /** @type {Map<string, string>} */
    this.pendingPayments = new Map();

    // Configuration du jeu
    this.ENTRY_COST = 1000; // Sats pour entrer
    this.HEALTH_TO_SATS_RATIO = 100; // 1 PV = 100 sats
    this.MAX_PLAYERS_PER_SESSION = 10;
    
    // Armes disponibles
    this.WEAPONS = {
      pistol: { id: 'pistol', name: 'Pistol', damage: 1, fireRate: 500, range: 50, price: 0, requiredGrade: 'bronze', type: 'handgun' },
      smg: { id: 'smg', name: 'SMG', damage: 1.5, fireRate: 150, range: 40, price: 1000, requiredGrade: 'silver', type: 'automatic' },
      sniper: { id: 'sniper', name: 'Sniper Rifle', damage: 5, fireRate: 2000, range: 200, price: 5000, requiredGrade: 'gold', type: 'sniper' },
      rocket: { id: 'rocket', name: 'Rocket Launcher', damage: 10, fireRate: 3000, range: 100, price: 20000, requiredGrade: 'platinum', type: 'explosive' }
    };

    // Classes de joueurs
    this.CLASSES = {
      tank: { id: 'tank', name: 'Tank', healthMultiplier: 1.5, speedMultiplier: 0.7, damageMultiplier: 1 },
      assassin: { id: 'assassin', name: 'Assassin', healthMultiplier: 1, speedMultiplier: 1.3, damageMultiplier: 2, backstabMultiplier: 2 },
      hacker: { id: 'hacker', name: 'Hacker', healthMultiplier: 1, speedMultiplier: 1, damageMultiplier: 1, canSeeBalances: true }
    };

    // Zones de dégâts
    this.HIT_ZONES = {
      head: { multiplier: 3, name: 'head' },
      body: { multiplier: 1, name: 'body' },
      leg: { multiplier: 0.5, name: 'leg' }
    };
  }

  /**
   * Créer une nouvelle session de jeu
   * @param {string} sessionId - ID de session
   * @returns {import('../types').GameSession}
   */
  createSession(sessionId) {
    const session = {
      id: sessionId,
      status: 'waiting',
      players: {},
      maxPlayers: this.MAX_PLAYERS_PER_SESSION,
      startTime: null,
      endTime: null,
      winner: null,
      leaderboard: {},
      createdAt: Date.now()
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Obtenir une session par ID
   * @param {string} sessionId 
   * @returns {import('../types').GameSession|null}
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Ajouter un joueur à une session
   * @param {string} sessionId 
   * @param {import('../types').Player} player 
   * @returns {boolean}
   */
  addPlayerToSession(sessionId, player) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    if (Object.keys(session.players).length >= session.maxPlayers) return false;
    if (session.status !== 'waiting') return false;

    session.players[player.id] = player;
    player.sessionId = sessionId;
    return true;
  }

  /**
   * Retirer un joueur d'une session
   * @param {string} sessionId 
   * @param {string} playerId 
   */
  removePlayerFromSession(sessionId, playerId) {
    const session = this.sessions.get(sessionId);
    if (session && session.players[playerId]) {
      delete session.players[playerId];
      
      // Si plus de joueurs, supprimer la session
      if (Object.keys(session.players).length === 0) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * Démarrer une session
   * @param {string} sessionId 
   */
  startSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'active';
      session.startTime = Date.now();
      
      // Initialiser les positions des joueurs
      Object.values(session.players).forEach((player, index) => {
        player.position = this.getSpawnPosition(index);
        player.isAlive = true;
        player.health = 10;
        player.maxHealth = player.classType === 'tank' ? 15 : 10;
        if (player.classType === 'tank') player.health = 15;
      });
    }
  }

  /**
   * Obtenir une position de spawn
   * @param {number} index 
   * @returns {{x: number, y: number, z: number}}
   */
  getSpawnPosition(index) {
    const spawnPoints = [
      { x: -50, y: 0, z: -50 },
      { x: 50, y: 0, z: -50 },
      { x: -50, y: 0, z: 50 },
      { x: 50, y: 0, z: 50 },
      { x: 0, y: 0, z: -80 },
      { x: 0, y: 0, z: 80 },
      { x: -80, y: 0, z: 0 },
      { x: 80, y: 0, z: 0 },
      { x: -30, y: 0, z: -30 },
      { x: 30, y: 0, z: 30 }
    ];
    return spawnPoints[index % spawnPoints.length];
  }

  /**
   * Créer un nouveau joueur
   * @param {string} socketId 
   * @param {string} playerName 
   * @param {Object} walletData 
   * @returns {import('../types').Player}
   */
  createPlayer(socketId, playerName, walletData) {
    const player = {
      id: socketId,
      name: playerName,
      lnbitsWalletId: walletData.walletId,
      lnbitsAdminKey: walletData.adminKey,
      lnbitsInvoiceKey: walletData.invoiceKey,
      health: 10,
      maxHealth: 10,
      balance: this.ENTRY_COST,
      classType: 'assassin',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      isAlive: true,
      sessionId: null,
      kills: 0,
      deaths: 0,
      damageDealt: 0,
      satsEarned: 0,
      satsLost: 0,
      weapons: ['pistol'],
      currentWeapon: 'pistol',
      lastShot: 0,
      isConnected: true,
      simulated: walletData.simulated || false
    };

    this.players.set(socketId, player);
    this.socketToPlayer.set(socketId, socketId);
    return player;
  }

  /**
   * Obtenir un joueur par ID
   * @param {string} playerId 
   * @returns {import('../types').Player|null}
   */
  getPlayer(playerId) {
    return this.players.get(playerId) || null;
  }

  /**
   * Supprimer un joueur
   * @param {string} playerId 
   */
  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (player && player.sessionId) {
      this.removePlayerFromSession(player.sessionId, playerId);
    }
    this.players.delete(playerId);
    this.socketToPlayer.delete(playerId);
  }

  /**
   * Calculer les dégâts
   * @param {string} weaponId 
   * @param {string} hitZone 
   * @param {string} attackerClass 
   * @param {boolean} isBackstab 
   * @returns {number}
   */
  calculateDamage(weaponId, hitZone, attackerClass, isBackstab = false) {
    const weapon = this.WEAPONS[weaponId];
    const zone = this.HIT_ZONES[hitZone] || this.HIT_ZONES.body;
    const classData = this.CLASSES[attackerClass];

    let damage = weapon.damage * zone.multiplier;
    
    // Multiplicateur de classe
    damage *= classData.damageMultiplier;
    
    // Backstab pour assassin
    if (attackerClass === 'assassin' && isBackstab) {
      damage *= classData.backstabMultiplier;
    }

    return damage;
  }

  /**
   * Appliquer des dégâts à un joueur
   * @param {string} targetId 
   * @param {number} damage 
   * @returns {{newHealth: number, killed: boolean}}
   */
  applyDamage(targetId, damage) {
    const target = this.players.get(targetId);
    if (!target || !target.isAlive) {
      return { newHealth: 0, killed: false };
    }

    target.health -= damage;
    target.satsLost += damage * this.HEALTH_TO_SATS_RATIO;

    if (target.health <= 0) {
      target.health = 0;
      target.isAlive = false;
      target.deaths++;
      return { newHealth: 0, killed: true };
    }

    return { newHealth: target.health, killed: false };
  }

  /**
   * Traiter un kill
   * @param {string} attackerId 
   * @param {string} targetId 
   * @returns {{satsLooted: number}}
   */
  processKill(attackerId, targetId) {
    const attacker = this.players.get(attackerId);
    const target = this.players.get(targetId);

    if (!attacker || !target) return { satsLooted: 0 };

    attacker.kills++;
    
    // Calculer le butin (sats restants de la cible)
    const satsLooted = target.health * this.HEALTH_TO_SATS_RATIO;
    attacker.satsEarned += satsLooted;
    attacker.balance += satsLooted;

    return { satsLooted };
  }

  /**
   * Mettre à jour le leaderboard
   * @param {string} sessionId 
   */
  updateLeaderboard(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const leaderboard = Object.values(session.players)
      .map(p => ({
        id: p.id,
        name: p.name,
        kills: p.kills,
        deaths: p.deaths,
        damageDealt: p.damageDealt,
        satsEarned: p.satsEarned,
        satsLost: p.satsLost,
        balance: p.balance,
        isAlive: p.isAlive
      }))
      .sort((a, b) => b.kills - a.kills || b.satsEarned - a.satsEarned);

    session.leaderboard = leaderboard;
    return leaderboard;
  }

  /**
   * Obtenir les sessions disponibles
   * @returns {Array}
   */
  getAvailableSessions() {
    return Array.from(this.sessions.values())
      .filter(s => s.status === 'waiting' && Object.keys(s.players).length < s.maxPlayers)
      .map(s => ({
        id: s.id,
        playerCount: Object.keys(s.players).length,
        maxPlayers: s.maxPlayers,
        status: s.status
      }));
  }

  /**
   * Obtenir ou créer une session automatiquement
   * Si aucune session disponible, en crée une nouvelle
   * @returns {string} - ID de la session
   */
  getOrCreateAutoSession() {
    const available = this.getAvailableSessions();

    if (available.length > 0) {
      // Retourner la première session disponible
      return available[0].id;
    }

    // Créer une nouvelle session avec un nom auto
    const sessionNumber = this.sessions.size + 1;
    const sessionId = `Lobby-${sessionNumber}`;
    this.createSession(sessionId);
    console.log(`[GameState] Auto-created session: ${sessionId}`);
    return sessionId;
  }

  /**
   * Créer une session personnalisée
   * @param {string} sessionName - Nom de la session
   * @returns {string|null} - ID de la session ou null si nom déjà pris
   */
  createCustomSession(sessionName) {
    // Vérifier si le nom existe déjà
    for (const session of this.sessions.values()) {
      if (session.id.toLowerCase() === sessionName.toLowerCase()) {
        return null; // Nom déjà pris
      }
    }

    this.createSession(sessionName);
    console.log(`[GameState] Created custom session: ${sessionName}`);
    return sessionName;
  }

  /**
   * Acheter une arme
   * @param {string} playerId 
   * @param {string} weaponId 
   * @returns {{success: boolean, message: string}}
   */
  purchaseWeapon(playerId, weaponId) {
    const player = this.players.get(playerId);
    if (!player) return { success: false, message: 'Player not found' };

    const weapon = this.WEAPONS[weaponId];
    if (!weapon) return { success: false, message: 'Weapon not found' };

    if (player.weapons.includes(weaponId)) {
      return { success: false, message: 'Weapon already owned' };
    }

    if (player.balance < weapon.price) {
      return { success: false, message: 'Insufficient balance' };
    }

    // Vérifier le grade requis
    const gradePoints = this.calculateGradePoints(player);
    const requiredGrade = this.getGradeFromPoints(gradePoints);
    const gradeLevels = { bronze: 0, silver: 1, gold: 2, platinum: 3 };
    
    if (gradeLevels[requiredGrade] < gradeLevels[weapon.requiredGrade]) {
      return { success: false, message: `Requires ${weapon.requiredGrade} grade` };
    }

    player.balance -= weapon.price;
    player.weapons.push(weaponId);
    
    return { success: true, message: 'Weapon purchased successfully' };
  }

  /**
   * Calculer les points de grade
   * @param {import('../types').Player} player 
   * @returns {number}
   */
  calculateGradePoints(player) {
    return (player.kills * 100) + (player.damageDealt * 10);
  }

  /**
   * Obtenir le grade depuis les points
   * @param {number} points 
   * @returns {string}
   */
  getGradeFromPoints(points) {
    if (points >= 5000) return 'platinum';
    if (points >= 2000) return 'gold';
    if (points >= 500) return 'silver';
    return 'bronze';
  }

  /**
   * Changer la classe d'un joueur
   * @param {string} playerId 
   * @param {string} classType 
   */
  changeClass(playerId, classType) {
    const player = this.players.get(playerId);
    if (!player || !this.CLASSES[classType]) return false;

    player.classType = classType;
    
    // Mettre à jour la santé max
    const classData = this.CLASSES[classType];
    player.maxHealth = 10 * classData.healthMultiplier;
    
    return true;
  }

  /**
   * Réinitialiser un joueur pour rebuy
   * @param {string} playerId 
   */
  resetPlayerForRebuy(playerId) {
    const player = this.players.get(playerId);
    if (!player) return;

    player.health = player.maxHealth;
    player.balance = this.ENTRY_COST;
    player.isAlive = true;
    player.position = this.getSpawnPosition(Math.floor(Math.random() * 10));
    player.satsLost = 0;
  }
}

module.exports = new GameState();
