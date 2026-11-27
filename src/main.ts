import './style.css';
import { route } from './views';

window.addEventListener('hashchange', route);
route();
