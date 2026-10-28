import React, { memo } from 'react';
import { usePhoneOsStore } from '../store';
import AddContact from './AddContact';
import ContactCard from './ContactCard';
import { IconContacts, IconKeypad, IconRecents } from './icons';
import Incoming from './Incoming';
import Keypad from './Keypad';
import People from './People';
import Recents from './Recents';
import ActiveCall from './ActiveCall';
import styles from './index.module.css';
import { setTab, usePhoneAppStore, type PhoneTab } from './store';

const tabs: { id: PhoneTab; label: string; icon: React.ReactNode }[] = [
	{ id: 'recents', label: 'Недавние', icon: <IconRecents /> },
	{ id: 'contacts', label: 'Контакты', icon: <IconContacts /> },
	{ id: 'keypad', label: 'Клавиши', icon: <IconKeypad /> },
];

function TabBar() {
	const tab = usePhoneAppStore(state => state.tab);

	return (
		<div className={styles.tabs}>
			{tabs.map(function (item) {
				const on = item.id === tab;
				return (
					<button
						key={item.id}
						type="button"
						className={styles.tab + (on ? ' ' + styles.tabOn : '')}
						onClick={function () {
							setTab(item.id);
						}}
					>
						{item.icon}
						{item.label}
					</button>
				);
			})}
		</div>
	);
}

const MemoTabBar = memo(TabBar);

function Main() {
	const tab = usePhoneAppStore(state => state.tab);

	return (
		<>
			{tab === 'recents' ? <Recents /> : null}
			{tab === 'contacts' ? <People /> : null}
			{tab === 'keypad' ? <Keypad /> : null}
			<MemoTabBar />
		</>
	);
}

const MemoMain = memo(Main);

function PhoneApp() {
	const theme = usePhoneOsStore(state => state.theme);
	const screen = usePhoneAppStore(state => state.screen);

	return (
		<div className={styles.root} data-theme={theme}>
			{screen === 'main' ? <MemoMain /> : null}
			{screen === 'contact' ? <ContactCard /> : null}
			{screen === 'add' ? <AddContact /> : null}
			{screen === 'incoming' ? <Incoming /> : null}
			{screen === 'active' ? <ActiveCall /> : null}
		</div>
	);
}

export default memo(PhoneApp);
