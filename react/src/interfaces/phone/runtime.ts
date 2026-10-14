import Phone from './components/Phone';
import { registerPhoneEvents } from './events';
import { initPhoneNavigation } from './navigation';
import { usePhoneStore } from './store';

export default {
    id: 'phone',
    Component: Phone,
    order: 1,
    useVisible: () => !!usePhoneStore((state) => state.isLoad),
    register: registerPhoneEvents,
    init: initPhoneNavigation,
};

export function readOpen() {
	return !!usePhoneStore.getState().isLoad;
}

export function subscribe(listener) {
	const store = usePhoneStore;
	return store.subscribe(listener);
}
