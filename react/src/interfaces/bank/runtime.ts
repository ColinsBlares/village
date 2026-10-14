import './bank.css';
import Bank from './components/Main';
import { registerBankEvents } from './events';
import { initBankNavigation } from './navigation';
import { useVisibilityStore } from '@utils/visibility/store';

export default {
	id: 'bank',
	Component: Bank,
	order: 5,
	useVisible: () => useVisibilityStore(state => state.bank),
	register: registerBankEvents,
	init: initBankNavigation,
};
