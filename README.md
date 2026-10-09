# 📅 Planify - Planning Hebdomadaire & Réseau d'Amis

Application web moderne, réactive et en **noir & blanc (monochrome)** avec gestion de comptes et partage de plannings entre amis.

---

## ✨ Nouvelles Fonctionnalités

### 👤 1. Authentification & Comptes Utilisateurs
- **Création de compte obligatoire** : chaque utilisateur possède son propre profil avec un nom, une adresse email et un pseudo unique `@pseudo`.
- **Comptes démo pré-intégrés** pour tester immédiatement sans inscription manuelle :
  - **Alice Martin** (`@alice_design` / Designer UI/UX)
  - **Lucas Dubois** (`@lucas_dev` / Développeur Fullstack)
  - **Sarah Benali** (`@sarah_pm` / Chef de projet)
- Chaque utilisateur possède son propre planning hebdomadaire distinct, sauvegardé localement.
- Possibilité de se déconnecter et de changer de compte à tout moment.

### 👥 2. Réseau & Demandes d'Amis (Bouton "Réseau / Amis")
- **Annuaire de tous les comptes créés** : consultez la liste de tous les membres inscrits sur l'application.
- **Envoi de demandes d'amis** en 1 clic (+ Ajouter en ami).
- **Gestion des demandes reçues & envoyées** : acceptez ou refusez les demandes d'amis.
- Badge de notification en temps réel dans la barre supérieure indiquant le nombre de demandes reçues en attente.

### 👁️ 3. Consultation du Planning des Amis
- Une fois amis, un bouton **« Voir son planning »** apparaît sur le profil de l'ami (accessible dans la barre latérale ou via la fenêtre Réseau).
- **Mode consultation en lecture seule** :
  - Affiche les créneaux et l'emploi du temps complet de votre ami(e) pour la semaine active.
  - Bannière dédiée : `Vous consultez le planning de [Nom de l'ami] (Lecture seule)` avec bouton rapide `[Revenir à mon planning]`.
  - Protection contre les modifications accidentelles du planning de l'ami.

### 🖤 4. Design Noir & Blanc et Thème Noir
- Esthétique monochrome 100% noir, blanc et nuances de gris.
- Bouton dédié **« Thème Noir » / « Thème Blanc »** pour basculer instantanément en mode OLED sombre.

---

## 🚀 Lancement

```bash
# Serveur de développement
npm run dev

# Construction de production
npm run build
```

URL de l'application : **[http://localhost:5173/](http://localhost:5173/)**
