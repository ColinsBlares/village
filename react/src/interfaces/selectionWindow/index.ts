import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'selectionWindow',
	order: 126,
	load: function () { return import('./runtime'); },
	global: 'selectionWindow',
	methods: ["select","accept","decline"],
});
