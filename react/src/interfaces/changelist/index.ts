import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'changelist',
	order: 210,
	load: function () { return import('./runtime'); },
	global: 'changelist',
	methods: ["initLikes","setLikes"],
	hotkey: { event: 'keyup', codes: [114], requireEnable: true, busy: ['chat', 'terminal', 'interaction', 'mapCase', 'phone', 'playerMenu', 'inventory'] },
});
