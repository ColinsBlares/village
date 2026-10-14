import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'auth',
	order: 200,
	load: function () { return import('./runtime'); },
	global: 'auth',
	methods: ["showLoginResult","showRegisterResult","showRecoveryResult","showEmailConfirmResult","showChangelist"],
});
