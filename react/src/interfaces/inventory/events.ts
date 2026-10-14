import { handleKeyUp, handleMouseMove, handleMouseUp, handleWindowClick } from './model';

let bound = false;

export function registerInventoryEvents() {
	if (bound || typeof window === 'undefined') return;
	bound = true;
	window.addEventListener('keyup', handleKeyUp);
	window.addEventListener('click', handleWindowClick);
	window.addEventListener('mousemove', handleMouseMove);
	window.addEventListener('mouseup', handleMouseUp);
}
