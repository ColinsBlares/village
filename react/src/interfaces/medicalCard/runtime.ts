import MedicalCard from './components/MedicalCard';
import { initMedicalCardLegacyBridge, useMedicalCardStore } from './store';

export default {
	id: 'medicalCard',
	Component: MedicalCard,
	useVisible: () => useMedicalCardStore(state => state.show),
	init: initMedicalCardLegacyBridge,
};

export function readOpen() {
	return !!useMedicalCardStore.getState().show;
}

export function subscribe(listener) {
	const store = useMedicalCardStore;
	return store.subscribe(listener);
}
