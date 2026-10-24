import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'npcEditor',
	order: 109,
	load: function () { return import('./runtime'); },
	global: 'npcEditor',
	isOpen: function (bag) { return !!bag.show; },
	methods: ['hide'],
	events: ['npcEditor.open', 'npcEditor.setData', 'npcEditor.hide'],
});
