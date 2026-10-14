import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'terminal',
	order: 100,
	load: function () { return import('./runtime'); },
	global: 'terminal',
	methods: ["push","debug","initSavedCmds"],
	hotkey: { event: 'keyup', codes: [192, 1040], requireEnable: true, busy: ['chat'] },
});
