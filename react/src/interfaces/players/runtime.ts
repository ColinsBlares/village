import Players from './components/PlayersList';
import { registerPlayerEvents } from './events';
import { useVisibilityStore } from '@utils/visibility/store';

export default {
	id: 'players',
	Component: Players,
	order: 6,
	useVisible: () => useVisibilityStore(state => state.players),
	register: registerPlayerEvents,
};
