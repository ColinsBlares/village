import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'selectItems',
	order: 131,
	load: function () { return import('./runtime'); },
	global: 'selectItems',
	hotkey: { event: 'keydown', codes: [9], mode: 'open', when: function () { var inventory = (window as any).inventory; return !!(inventory && inventory.enable && !inventory.handsBlock); } },
});
