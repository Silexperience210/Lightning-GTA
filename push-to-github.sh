#!/bin/bash
# Script pour pousser Sat Hunter sur GitHub
# Usage: ./push-to-github.sh VOTRE_TOKEN_GITHUB

if [ -z "$1" ]; then
    echo "❌ Erreur: Token GitHub manquant"
    echo ""
    echo "Usage: ./push-to-github.sh ghp_VOTRE_TOKEN"
    echo ""
    echo "Pour créer un token GitHub:"
    echo "1. Allez sur https://github.com/settings/tokens"
    echo "2. Cliquez 'Generate new token (classic)'"
    echo "3. Cochez 'repo' pour les permissions"
    echo "4. Générez et copiez le token"
    exit 1
fi

TOKEN=$1
REPO_URL="https://quentinmaurin:${TOKEN}@github.com/quentinmaurin/sathunter.git"

echo "🚀 Push de Sat Hunter sur GitHub..."

# Configuration git
git config user.email "sathunter@game.com"
git config user.name "Sat Hunter"

# Ajouter le remote
git remote remove origin 2>/dev/null
git remote add origin "$REPO_URL"

# Push
git branch -M main
git push -u origin main --force

if [ $? -eq 0 ]; then
    echo "✅ Push réussi!"
    echo ""
    echo "Prochaines étapes sur Railway:"
    echo "1. Allez sur https://railway.app"
    echo "2. Redéployez le service"
    echo "3. Vérifiez les logs"
else
    echo "❌ Push échoué - vérifiez votre token"
fi
