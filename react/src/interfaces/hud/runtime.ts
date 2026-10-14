import Hud from './components/Hud';
import { registerHudEvents } from './events';
import { initHudLegacyBridge } from './store';
import { useVisibilityStore } from '@utils/visibility/store';

export default {
	id: 'hud',
	Component: Hud,
	order: 0,
	useVisible: () => useVisibilityStore(state => state.hud),
	init: initHudLegacyBridge,
	register: registerHudEvents,
};
