import React, { memo } from 'react';
import { IconDirection, IconInfo } from './icons';
import styles from './index.module.css';
import { openContact, showIncoming, startCall, usePhoneAppStore } from './store';

function Recents() {
	const recents = usePhoneAppStore(state => state.recents);

	return (
		<div className={styles.screen}>
			<h1 className={styles.title}>Недавние</h1>
			<div className={styles.scroll}>
				{recents.map(function (item) {
					const missed = item.kind === 'missed';
					return (
						<div key={item.id} className={styles.row}>
							<button
								type="button"
								className={styles.hit}
								onClick={function () {
									if (missed) {
										showIncoming(item.name, item.phone, item.contactId);
										return;
									}
									startCall(item.name, item.phone, item.contactId);
								}}
							>
								<span className={styles.mark + (missed ? ' ' + styles.missed : '')}>
									<IconDirection out={item.kind === 'out'} />
								</span>
								<span className={styles.who}>
									<strong className={missed ? styles.missed : ''}>{item.name}</strong>
									<span>мобильный</span>
								</span>
								<span className={styles.when}>{item.when}</span>
							</button>
							{item.contactId ? (
								<button
									type="button"
									className={styles.info}
									aria-label="Контакт"
									onClick={function () {
										openContact(item.contactId as string);
									}}
								>
									<IconInfo />
								</button>
							) : null}
						</div>
					);
				})}
			</div>
		</div>
	);
}

export default memo(Recents);
