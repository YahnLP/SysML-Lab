// Copie le fichier autonome produit par Vite à la racine : index.html est servi tel quel par GitHub Pages.
import { copyFileSync } from 'node:fs';
copyFileSync('dist/index.html', 'index.html');
console.log('index.html mis à jour (fichier autonome, hors-ligne).');
