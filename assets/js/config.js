/* ------------------------------------------------------------------
   Configuration du site Joli Macabre — le seul fichier à modifier
   pour brancher un numéro ou un e-mail. Site 100 % statique :
   aucun back-end, aucun service tiers payant.

   • phone : numéro du studio au format international (ex. "+33612345678").
             Vide = aucun bouton « Appeler » ni « SMS » n'est affiché.
   • email : adresse e-mail du studio. Vide = aucun bouton e-mail.
   • Les liens Instagram ouvrent la messagerie privée (ig.me).
------------------------------------------------------------------- */
window.JM_CONFIG = {
  studioName: 'Joli Macabre',
  address: '244 avenue de Strasbourg, 54000 Nancy',
  phone: '',
  email: '',
  instagram: {
    studio: 'joli_macabre',
    lea: 'livealittle.ttt',
    crevure: 'la_petite_crevure'
  },
  // 0 = dimanche … 6 = samedi ; [ouverture, fermeture] en heures décimales
  hours: { 1: [11, 18], 2: [11, 18], 3: [11, 18], 4: [11, 18], 5: [11, 18], 6: [11, 18], 0: null },
  timezone: 'Europe/Paris'
};
