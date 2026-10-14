import './business.css';
import Business from './components/Business';
import { registerBusinessEvents } from './events';
import { useVisibilityStore } from '@utils/visibility/store';

export default {
	id: 'business',
	Component: Business,
	order: 4,
	useVisible: () => useVisibilityStore(state => state.business),
	register: registerBusinessEvents,
};
