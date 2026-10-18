// La configuration web du projet Firebase « faelorenn ». Publique par conception :
// la sécurité vient des règles Firestore et des domaines autorisés, pas de ces valeurs.
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCd-OefEJNENwQdAAMUXjbfCw4A7XvpgRM',
  authDomain: 'faelorenn.firebaseapp.com',
  projectId: 'faelorenn',
  storageBucket: 'faelorenn.firebasestorage.app',
  messagingSenderId: '245606488740',
  appId: '1:245606488740:web:665bcd81e5ab3ad137a431'
};

// Sur cet ordinateur, « ?emulateur » dans l'adresse branche le site sur les émulateurs Firebase
// (firebase emulators:start) au lieu du vrai projet : pour les essais, sans toucher aux vraies données.
const FIREBASE_EMULATEUR = (() => {
  if(!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return false;
  try{
    if(new URLSearchParams(location.search).has('emulateur')) sessionStorage.setItem('faelorenn.emulateur', '1');
    return sessionStorage.getItem('faelorenn.emulateur') === '1';
  }catch(e){ return false; }
})();
