#!/bin/bash

echo "🚀 Déploiement Sat Hunter sur Railway"
echo "======================================"
echo ""

# Vérifier si Railway CLI est installé
if ! command -v railway &> /dev/null; then
    echo "📦 Installation de Railway CLI..."
    npm install -g @railway/cli
fi

# Vérifier si l'utilisateur est connecté
if ! railway whoami &> /dev/null; then
    echo "🔑 Connexion à Railway..."
    railway login
fi

# Initialiser le projet si ce n'est pas déjà fait
if [ ! -f .railway/config.json ]; then
    echo "🆕 Création d'un nouveau projet Railway..."
    railway init
fi

# Déployer
echo "📤 Déploiement en cours..."
railway up

# Configurer les variables d'environnement
echo ""
echo "⚙️ Configuration des variables d'environnement..."
echo "Vous allez devoir configurer ces variables dans Railway:"
echo ""
echo "  LNBITS_URL=https://demo.lnbits.com"
echo "  LNBITS_ADMIN_KEY=4be11f67dc3b41598307c4dc87b35f89"
echo "  LNBITS_INVOICE_KEY=68c078793bcb4a8d81719401e24cb587"
echo "  GAME_ENTRY_COST=1000"
echo "  NODE_ENV=production"
echo ""
echo "Allez sur https://railway.app et cliquez sur votre projet > Variables"
echo ""

# Générer le domaine
echo "🌐 Génération du domaine public..."
railway domain

echo ""
echo "✅ Déploiement terminé !"
echo "Votre jeu sera accessible dans quelques minutes."
echo ""
