import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'characterInfo',
	order: 100,
	load: function () { return import('./runtime'); },
	global: 'characterInfo',
	methods: ["addCharacter","addCoins","pretty"],
	globals: [
		{ name: 'characterSelector', methods: ['left', 'right', 'enter'] },
		{ name: 'createCharacter', methods: ['onClickCreateCharacter'] },
		{ name: 'characterAddSlot', methods: ['addSlot'] },
	],
});
