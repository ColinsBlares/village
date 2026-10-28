import { beginCallPeek, dismissCallPeek, installApp, pushNotice, revealOnto, setPhoneOsVisible, usePhoneOsStore } from './store';
import { applyCallAnswer, dropIncoming, lookupContact, showIncoming, usePhoneAppStore } from './phoneApp/store';
import { loadGameDialogs, pushGameMessage, loadGameMessages } from './messagesApp/store';
import {
	failTaxi,
	loadTaxiLocation,
	markTaxiBoarded,
	markTaxiReady,
	resetTaxi,
	setTaxiDestination,
	showTaxiSearch,
	takeTaxiOrder,
	taxiUserCancel,
} from './taxiApp/store';

function presentIncoming(number: string) {
	const known = lookupContact(number);
	showIncoming(known ? known.name : number, number, known ? known.id : null);
	const state = usePhoneOsStore.getState();
	if (state.show && state.shell !== 'leaving' && state.shell !== 'off') {
		revealOnto('phone');
		return;
	}
	beginCallPeek();
}

export function registerPhoneOsEvents(gameEvents: GameEvents) {
	gameEvents.on('phone.show', function (flag: boolean) {
		setPhoneOsVisible(!!flag);
	});

	gameEvents.on('phone.load', function (info: { contacts?: { name: string; number: string }[]; number?: string }) {
		const contacts = (info.contacts || []).map(function (contact, index) {
			return {
				id: 'g' + index + '-' + contact.number,
				name: contact.name,
				phone: contact.number,
			};
		});
		if (info.number) {
			contacts.push({ id: 'mine', name: 'Мой номер', phone: info.number });
		}
		if (contacts.length) {
			usePhoneAppStore.setState({ contacts: contacts });
		}
	});

	gameEvents.on('phone.call.in', function (number: string) {
		presentIncoming(String(number || ''));
	});

	gameEvents.on('phone.call.end', function () {
		dropIncoming();
		dismissCallPeek();
	});

	gameEvents.on('phone.call.ans', function (answer: number) {
		applyCallAnswer(Number(answer));
		if (Number(answer) !== 0) {
			dismissCallPeek();
		}
	});

	gameEvents.on('phone.message.list', function (dialogs: unknown) {
		loadGameDialogs(dialogs);
	});

	gameEvents.on('phone.message.load', function (messages: unknown, number: string) {
		loadGameMessages(number, messages);
	});

	gameEvents.on('phone.message.set', function (message: string, number: string) {
		pushGameMessage(String(message || ''), String(number || ''));
	});

	gameEvents.on('phone.contact.mine.update', function (_oldNumber: string, newNumber: string) {
		usePhoneAppStore.setState(state => ({
			contacts: state.contacts.map(function (contact) {
				if (contact.id !== 'mine') {
					return contact;
				}
				return { ...contact, phone: newNumber };
			}),
		}));
	});

	gameEvents.on('phone.app.add', function (appName: string) {
		if (appName) {
			installApp(String(appName));
		}
	});

	gameEvents.on('phone.app.remove', function () {
		return undefined;
	});

	gameEvents.on('taxi.client.location', function (area: string, street: string) {
		loadTaxiLocation(String(area || ''), String(street || ''));
	});

	gameEvents.on('taxi.client.order.ans', function (order: { name?: string; model?: string; number?: string }) {
		if (!order) {
			return;
		}
		takeTaxiOrder({
			name: order.name || 'Водитель',
			model: order.model || '',
			number: order.number || '',
		});
	});

	gameEvents.on('taxi.client.order.ready', function () {
		markTaxiReady();
	});

	gameEvents.on('taxi.client.order.inTaxi', function () {
		markTaxiBoarded();
	});

	gameEvents.on('taxi.client.order.destination', function (area: string, street: string, price: number) {
		setTaxiDestination(String(area || ''), String(street || ''), Number(price) || 0);
	});

	gameEvents.on('taxi.client.order.cancel', function (reason?: string) {
		resetTaxi(typeof reason === 'string' ? reason : undefined);
	});

	gameEvents.on('taxi.client.order.error', function (reason?: string) {
		failTaxi(typeof reason === 'string' ? reason : undefined);
	});

	gameEvents.on('phone.test.notice', function (appId: string, title: string, text: string) {
		pushNotice({
			id: 'test-' + Date.now(),
			appId: String(appId || 'news'),
			title: String(title || 'Уведомление'),
			text: String(text || ''),
			time: 'сейчас',
		});
	});

	gameEvents.on('phone.test.taxi', function (step: string, model: string) {
		const car = String(model || 'BMW M80');
		revealOnto('taxi');
		if (step === 'search') {
			showTaxiSearch();
			return;
		}
		if (step === 'found') {
			takeTaxiOrder({ name: 'Тест', model: car, number: 'TEST' });
			return;
		}
		if (step === 'ready') {
			markTaxiReady();
			return;
		}
		if (step === 'board') {
			markTaxiBoarded();
			return;
		}
		if (step === 'dest') {
			setTaxiDestination('Вайнвуд', 'Бульвар', 350);
			return;
		}
		if (step === 'cancel') {
			failTaxi(car !== 'BMW M80' ? car : taxiUserCancel);
			return;
		}
		failTaxi(car !== 'BMW M80' ? car : undefined);
	});
}

