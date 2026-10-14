import Auth from './components/Auth';
import { registerAuthEvents } from './events';
import { initAuthLegacyBridge } from './store';
import { useVisibilityStore } from '@utils/visibility/store';

export default {
	id: 'auth',
	Component: Auth,
	order: 200,
	useVisible: () => useVisibilityStore(state => state.auth),
	init: initAuthLegacyBridge,
	register: registerAuthEvents,
};
