import { create } from 'zustand';
import { useVisibilityStore } from '@utils/visibility/store';

export interface AuthUpdateItem {
	date: string;
}

export interface AuthState {
	loginOrEmail: string;
	password: string;
	rememberMe: boolean;
	password2: string;
	login: string;
	email: string;
	code: string;
	prompt: string;
	form: number;
	promptShowTime: number;
	recoveryCodeSent: boolean;
	recoveryCodeConfirmed: boolean;
	recoveryCompleted: boolean;
	updates: AuthUpdateItem[];
}

const AUTH_HEADERS = [
	'Войти в аккаунт',
	'Создание аккаунта',
	'Восстановление аккаунта',
	'Подтверждение почты',
];

const FIELD_KEYS: Array<keyof AuthState> = [
	'loginOrEmail',
	'password',
	'rememberMe',
	'password2',
	'login',
	'email',
	'code',
	'form',
	'promptShowTime',
	'recoveryCodeSent',
	'recoveryCodeConfirmed',
	'recoveryCompleted',
];

let loginMessages = [
	'Заполните поле логина или почты!',
	'Некорректное значение логина или почты!',
	'Неверный пароль!',
	'todo',
	'Неверный логин или пароль!',
	'Неверный Social Club!',
	'Аккаунт уже авторизован!',
	'Вход в аккаунт выполнен успешно',
	'Аккаунт заблокирован',
];

let registerMessages = [
	'Вы уже зарегистрировали учетную запись!',
	'Логин должен состоять из 5-20 символов!',
	'Пароль должен состоять из 6-20 символов!',
	'Email должен быть менее 40 символов!',
	'Некорректный логин!',
	'Некорректный email!',
	'Логин занят!',
	'Email занят!',
	'Аккаунт с вашим Social Club уже зарегистрирован!',
	'Аккаунт зарегистрирован успешно',
];

let emailConfirmMessages = [
	'Код подтверждения неверный!',
	'Подтверждение почты прошло успешно',
	'На данный момент подтвердить почту невозможно',
];

let recoveryMessages: Array<string | null> = [
	'Заполните поле логина или почты!',
	'Некорректное значение логина или почты!',
	'Аккаунт не найден',
	null,
	'Неверный код подтверждения',
	null,
	'Пароль должен состоять из 6-20 символов!',
	'Подтвердите код',
	'Аккаунт восстановлен',
	null,
];

const LOGIN_PATTERN = /^[0-9a-z_\.-]{5,20}$/i;
const EMAIL_PATTERN = /^[0-9a-z-_\.]+\@[0-9a-z-_]{1,}\.[a-z]{1,}$/i;

let promptTimer: number | null = null;

function readUpdates(): AuthUpdateItem[] {
	if (typeof window === 'undefined') {
		return [];
	}

	const changelist = (window as any).changelist;
	if (!changelist || !changelist.list || typeof changelist.list.slice !== 'function') {
		return [];
	}

	return changelist.list.slice().reverse();
}

export function getAuthHeader(form: number) {
	return AUTH_HEADERS[form] || '';
}

export const useAuthStore = create<AuthState>(() => ({
	loginOrEmail: '',
	password: '',
	rememberMe: false,
	password2: '',
	login: '',
	email: '',
	code: '',
	prompt: '',
	form: 0,
	promptShowTime: 10000,
	recoveryCodeSent: false,
	recoveryCodeConfirmed: false,
	recoveryCompleted: false,
	updates: readUpdates(),
}));

function setLoaderShow(flag: boolean) {
	const loader = (window as any).loader;
	if (!loader) {
		return;
	}
	loader.show = flag;
}

function isLoaderShown() {
	const loader = (window as any).loader;
	return !!(loader && loader.show == true);
}

export function setPrompt(val: string) {
	const oldVal = useAuthStore.getState().prompt;
	if (promptTimer !== null && (!val || !oldVal)) {
		window.clearTimeout(promptTimer);
		promptTimer = null;
	}

	useAuthStore.setState({ prompt: val });

	if (oldVal || !val) {
		return;
	}

	promptTimer = window.setTimeout(function () {
		promptTimer = null;
		useAuthStore.setState({ prompt: '' });
	}, useAuthStore.getState().promptShowTime);
}

export function setAuthField(key: keyof AuthState, value: any) {
	if (key === 'prompt') {
		setPrompt(value == null ? '' : String(value));
		return;
	}

	useAuthStore.setState({ [key]: value } as Partial<AuthState>);
}

export function showAuth(flag: boolean) {
	const next = !!flag;
	const prev = useVisibilityStore.getState().auth;

	if (next) {
		useAuthStore.setState({ updates: readUpdates() });
	}

	useVisibilityStore.setState({ auth: next });

	if (prev === next) {
		return;
	}

	const busy = (window as any).busy;
	if (!busy) {
		return;
	}

	if (next) {
		busy.add('auth', true, true);
	} else {
		busy.remove('auth', true);
	}
}

export function showChangelist(i: number) {
	const changelist = (window as any).changelist;
	if (!changelist) {
		return;
	}

	changelist.i = i;
	changelist.show = true;
}

export function submitLogin() {
	if (isLoaderShown()) {
		return;
	}

	const state = useAuthStore.getState();
	setPrompt('');

	if (!state.loginOrEmail) {
		setPrompt('Введите логин или email');
		return;
	}

	if (!LOGIN_PATTERN.test(state.loginOrEmail) && !EMAIL_PATTERN.test(state.loginOrEmail)) {
		setPrompt('Некорректное значение');
		return;
	}

	if (state.password.length < 6 || state.password.length > 20) {
		setPrompt('Пароль должен содержать от 6 до 20 символов');
		return;
	}

	setLoaderShow(true);
	mp.trigger(
		'auth.login',
		JSON.stringify({
			loginOrEmail: state.loginOrEmail.toLowerCase(),
			password: state.password,
			rememberMe: state.rememberMe,
		}),
	);
}

export function submitRegister(emailCode?: number) {
	if (isLoaderShown()) {
		return;
	}

	const state = useAuthStore.getState();

	if (!state.login) {
		setPrompt('Введите логин');
		return;
	}
	if (!state.email) {
		setPrompt('Введите Email');
		return;
	}
	if (!state.password.length) {
		setPrompt('Введите пароль');
		return;
	}
	if (!state.password2.length) {
		setPrompt('Повторите пароль');
		return;
	}
	if (state.login.length < 5 || state.login.length > 20) {
		setPrompt('Логин должен содержать от 5 до 20 символов');
		return;
	}
	if (state.email.length > 40) {
		setPrompt('Email должен быть менее 40 символов');
		return;
	}
	if (!LOGIN_PATTERN.test(state.login)) {
		setPrompt('Разрешенные символы: буквы латинского алфавита, цифры, дефис или знак подчеркивания');
		return;
	}
	if (state.password.length < 6 || state.password.length > 20) {
		setPrompt('Пароль должен содержать от 6 до 20 символов');
		return;
	}
	if (!EMAIL_PATTERN.test(state.email)) {
		setPrompt('Некорректный email');
		return;
	}
	if (state.password2 != state.password) {
		setPrompt('Пароли не совпадают');
		return;
	}

	setLoaderShow(true);
	mp.trigger(
		'auth.register',
		JSON.stringify({
			login: state.login.toLowerCase(),
			email: state.email,
			password: state.password,
			emailCode: emailCode,
		}),
	);
}

export function submitRecovery() {
	const state = useAuthStore.getState();

	if (state.recoveryCodeSent) {
		if (!state.code) {
			setPrompt('Введите код');
			return;
		}

		setLoaderShow(true);
		mp.trigger('callRemote', 'auth.recovery.confirm', state.code);
		setAuthField('code', '');
		return;
	}

	if (state.recoveryCodeConfirmed) {
		if (!state.password.length) {
			setPrompt('Введите пароль');
			return;
		}
		if (!state.password2.length) {
			setPrompt('Повторите пароль');
			return;
		}
		if (state.password.length < 6 || state.password.length > 20) {
			setPrompt('Пароль должен содержать от 6 до 20 символов');
			return;
		}
		if (state.password2 != state.password) {
			setPrompt('Пароли не совпадают');
			return;
		}

		setLoaderShow(true);
		mp.trigger('callRemote', 'auth.recovery.password', state.password);
		return;
	}

	if (!state.loginOrEmail) {
		setPrompt('Введите логин или Email');
		return;
	}

	if (!LOGIN_PATTERN.test(state.loginOrEmail) && !EMAIL_PATTERN.test(state.loginOrEmail)) {
		setPrompt('Некорректное значение');
		return;
	}

	setLoaderShow(true);
	mp.trigger('callRemote', 'auth.recovery', state.loginOrEmail);
}

export function confirmEmail(confirm: number) {
	if (!confirm) {
		mp.trigger('callRemote', 'auth.email.confirm', 0);
		showAuth(false);
		return;
	}

	mp.trigger('callRemote', 'auth.email.confirm.code', useAuthStore.getState().code);
}

export function showLoginResult(code: number) {
	const message = loginMessages[code];
	if (!message) {
		return;
	}

	setPrompt(message);
	if (code == 7) {
		showAuth(false);
	}
	setLoaderShow(false);
}

export function showRegisterResult(code: number) {
	const message = registerMessages[code];
	if (!message) {
		return;
	}

	setPrompt(message);
	if (code == 9) {
		setAuthField('form', 3);
		mp.trigger('callRemote', 'auth.email.confirm', 1);
	}
	setLoaderShow(false);
}

export function showEmailConfirmResult(code: number) {
	const message = emailConfirmMessages[code];
	if (!message) {
		return;
	}

	setPrompt(message);
	if (code == 1) {
		showAuth(false);
	}
	setLoaderShow(false);
}

export function showRecoveryResult(code: number) {
	setLoaderShow(false);

	if (code == 3) {
		setAuthField('recoveryCodeSent', true);
		return;
	}

	if (code == 5) {
		useAuthStore.setState({
			recoveryCodeSent: false,
			recoveryCodeConfirmed: true,
		});
		return;
	}

	if (code == 8) {
		useAuthStore.setState({
			recoveryCodeConfirmed: false,
			recoveryCompleted: true,
			rememberMe: false,
			password: '',
			form: 0,
		});
		mp.trigger('auth.remember.clear');
	}

	if (code == 9) {
		showAuth(false);
		(window as any).notifications.push('error', 'Превышено количество попыток (вы были кикнуты)');
		return;
	}

	const message = recoveryMessages[code];
	if (!message) {
		return;
	}

	setPrompt(message);
}

function bindAccessor(
	target: any,
	key: string,
	getter: () => any,
	setter: (val: any) => void,
) {
	Object.defineProperty(target, key, {
		configurable: true,
		enumerable: true,
		get: getter,
		set: setter,
	});
}

export function initAuthLegacyBridge() {
	if (typeof window === 'undefined') {
		return;
	}

	const win = window as any;
	const target = win.auth || {};
	const fieldSeed: Partial<AuthState> = {};

	FIELD_KEYS.forEach(function (key) {
		if (Object.prototype.hasOwnProperty.call(target, key)) {
			(fieldSeed as any)[key] = target[key];
		}
	});

	if (Object.prototype.hasOwnProperty.call(target, 'prompt')) {
		setPrompt(target.prompt == null ? '' : String(target.prompt));
	}

	if (Object.keys(fieldSeed).length > 0) {
		useAuthStore.setState(fieldSeed);
	}

	if (Object.prototype.hasOwnProperty.call(target, 'show')) {
		showAuth(!!target.show);
	}

	bindAccessor(
		target,
		'show',
		function () {
			return useVisibilityStore.getState().auth;
		},
		function (val: any) {
			showAuth(!!val);
		},
	);

	bindAccessor(
		target,
		'prompt',
		function () {
			return useAuthStore.getState().prompt;
		},
		function (val: any) {
			setPrompt(val == null ? '' : String(val));
		},
	);

	bindAccessor(
		target,
		'header',
		function () {
			return getAuthHeader(useAuthStore.getState().form);
		},
		function () {},
	);

	bindAccessor(
		target,
		'updates',
		function () {
			return useAuthStore.getState().updates;
		},
		function () {},
	);

	FIELD_KEYS.forEach(function (key) {
		bindAccessor(
			target,
			key,
			function () {
				return useAuthStore.getState()[key];
			},
			function (val: any) {
				setAuthField(key, val);
			},
		);
	});

	bindAccessor(
		target,
		'loginMessages',
		function () {
			return loginMessages;
		},
		function (val: string[]) {
			loginMessages = val;
		},
	);
	bindAccessor(
		target,
		'registerMessages',
		function () {
			return registerMessages;
		},
		function (val: string[]) {
			registerMessages = val;
		},
	);
	bindAccessor(
		target,
		'emailConfirmMessages',
		function () {
			return emailConfirmMessages;
		},
		function (val: string[]) {
			emailConfirmMessages = val;
		},
	);
	bindAccessor(
		target,
		'recoveryMessages',
		function () {
			return recoveryMessages;
		},
		function (val: Array<string | null>) {
			recoveryMessages = val;
		},
	);

	target.showLoginResult = showLoginResult;
	target.showRegisterResult = showRegisterResult;
	target.showRecoveryResult = showRecoveryResult;
	target.showEmailConfirmResult = showEmailConfirmResult;
	target.showChangelist = showChangelist;

	win.auth = target;
}
