import { create } from 'zustand';
import { gameTrigger } from '../game';
import { seedContacts, seedRecents, type Contact, type Recent } from './data';

export type PhoneTab = 'recents' | 'contacts' | 'keypad';
export type PhoneScreen = 'main' | 'contact' | 'add' | 'incoming' | 'active';

interface PhoneAppState {
	tab: PhoneTab;
	screen: PhoneScreen;
	number: string;
	contacts: Contact[];
	recents: Recent[];
	peerName: string;
	peerPhone: string;
	contactId: string | null;
	seconds: number;
	muted: boolean;
	speaker: boolean;
}

export const usePhoneAppStore = create<PhoneAppState>(() => ({
	tab: 'recents',
	screen: 'main',
	number: '',
	contacts: seedContacts,
	recents: seedRecents,
	peerName: '',
	peerPhone: '',
	contactId: null,
	seconds: 0,
	muted: false,
	speaker: false,
}));

export function setTab(tab: PhoneTab) {
	usePhoneAppStore.setState({ tab, screen: 'main' });
}

export function typeDigit(digit: string) {
	usePhoneAppStore.setState(state => ({ number: (state.number + digit).slice(0, 16) }));
}

export function eraseDigit() {
	usePhoneAppStore.setState(state => ({ number: state.number.slice(0, -1) }));
}

export function lookupContact(phone: string) {
	const digits = phone.replace(/\D/g, '');
	if (!digits) {
		return null;
	}
	return (
		usePhoneAppStore.getState().contacts.find(item => item.phone.replace(/\D/g, '') === digits) || null
	);
}

export function openContact(id: string) {
	const contact = usePhoneAppStore.getState().contacts.find(item => item.id === id);
	if (!contact) {
		return;
	}
	usePhoneAppStore.setState({
		screen: 'contact',
		contactId: id,
		peerName: contact.name,
		peerPhone: contact.phone,
	});
}

export function openAdd() {
	usePhoneAppStore.setState({ screen: 'add' });
}

export function backToMain() {
	usePhoneAppStore.setState({ screen: 'main', contactId: null });
}

export function saveContact(name: string, phone: string) {
	const trimmed = name.trim();
	const number = phone.trim();
	if (!trimmed || !number) {
		return;
	}
	const id = 'c' + Date.now();
	usePhoneAppStore.setState(state => ({
		contacts: [...state.contacts, { id, name: trimmed, phone: number }].sort((a, b) =>
			a.name.localeCompare(b.name, 'ru'),
		),
		screen: 'main',
		tab: 'contacts',
	}));
}

export function deleteContact(id: string) {
	usePhoneAppStore.setState(state => ({
		contacts: state.contacts.filter(item => item.id !== id),
		recents: state.recents.filter(item => item.contactId !== id),
		screen: 'main',
		contactId: null,
	}));
}

function pushRecent(name: string, phone: string, contactId: string | null, kind: Recent['kind']) {
	const id = 'r' + Date.now();
	usePhoneAppStore.setState(state => ({
		recents: [{ id, name, phone, contactId, kind, when: 'только что' }, ...state.recents].slice(0, 24),
	}));
}

export function startCall(name: string, phone: string, contactId: string | null) {
	if (!phone) {
		return;
	}
	usePhoneAppStore.setState({
		screen: 'active',
		peerName: name || phone,
		peerPhone: phone,
		contactId,
		seconds: 0,
		muted: false,
		speaker: false,
	});
	gameTrigger('phone.call.start', phone);
}

export function callNumber() {
	const state = usePhoneAppStore.getState();
	const phone = state.number.trim();
	if (!phone) {
		return;
	}
	const known = lookupContact(phone);
	startCall(known ? known.name : phone, phone, known ? known.id : null);
}

export function callContact(id: string) {
	const contact = usePhoneAppStore.getState().contacts.find(item => item.id === id);
	if (!contact) {
		return;
	}
	startCall(contact.name, contact.phone, contact.id);
}

export function showIncoming(name: string, phone: string, contactId: string | null) {
	usePhoneAppStore.setState({
		screen: 'incoming',
		peerName: name,
		peerPhone: phone,
		contactId,
	});
}

export function answerCall() {
	usePhoneAppStore.setState({ screen: 'active', seconds: 0, muted: false, speaker: false });
	gameTrigger('phone.call.in.ans', 1);
}

export function declineCall() {
	const state = usePhoneAppStore.getState();
	pushRecent(state.peerName, state.peerPhone, state.contactId, 'missed');
	usePhoneAppStore.setState({ screen: 'main' });
	gameTrigger('phone.call.in.ans', 0);
}

export function dropIncoming() {
	const state = usePhoneAppStore.getState();
	if (state.screen !== 'incoming' && state.screen !== 'active') {
		return;
	}
	pushRecent(state.peerName, state.peerPhone, state.contactId, state.screen === 'incoming' ? 'missed' : 'out');
	usePhoneAppStore.setState({ screen: 'main' });
}

export function applyCallAnswer(answer: number) {
	if (answer === 0) {
		usePhoneAppStore.setState({ screen: 'active', seconds: 0, muted: false, speaker: false });
		return;
	}
	dropIncoming();
}

export function endCall() {
	const state = usePhoneAppStore.getState();
	pushRecent(state.peerName, state.peerPhone, state.contactId, 'out');
	usePhoneAppStore.setState({ screen: 'main', tab: 'recents' });
	gameTrigger('phone.call.end');
}

export function toggleMute() {
	usePhoneAppStore.setState(state => ({ muted: !state.muted }));
}

export function toggleSpeaker() {
	usePhoneAppStore.setState(state => ({ speaker: !state.speaker }));
}

export function tickCall() {
	usePhoneAppStore.setState(state => ({ seconds: state.seconds + 1 }));
}
