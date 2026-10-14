import Speedometer from './components/Speedometer';
import { registerSpeedometerEvents } from './events';
import { initSpeedometerLegacyBridge } from './store';
import { useVisibilityStore } from '@utils/visibility/store';

export default {
	id: 'speedometer',
	Component: Speedometer,
	useVisible: () => useVisibilityStore(state => state.speedometer && state.hud),
	init: initSpeedometerLegacyBridge,
	register: registerSpeedometerEvents,
};
