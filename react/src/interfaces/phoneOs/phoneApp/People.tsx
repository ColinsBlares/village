import React, { memo, useMemo } from 'react';
import { IconPlus } from './icons';
import styles from './index.module.css';
import { openAdd, openContact, usePhoneAppStore } from './store';

function People() {
	const contacts = usePhoneAppStore(state => state.contacts);
	const groups = useMemo(
		function () {
			const map = new Map<string, typeof contacts>();
			contacts.forEach(function (item) {
				const letter = item.name.slice(0, 1).toUpperCase();
				const list = map.get(letter) || [];
				list.push(item);
				map.set(letter, list);
			});
			return Array.from(map.entries());
		},
		[contacts],
	);

	return (
		<div className={styles.screen}>
			<div className={styles.bar}>
				<span />
				<button type="button" className={styles.link} onClick={openAdd} aria-label="Добавить контакт">
					<IconPlus />
				</button>
			</div>
			<h1 className={styles.title}>Контакты</h1>
			<div className={styles.scroll}>
				{groups.map(function ([letter, list]) {
					return (
						<div key={letter}>
							<div className={styles.letter}>{letter}</div>
							{list.map(function (item) {
								return (
									<button
										key={item.id}
										type="button"
										className={styles.row}
										onClick={function () {
											openContact(item.id);
										}}
									>
										<span className={styles.who}>
											<strong>{item.name}</strong>
										</span>
									</button>
								);
							})}
						</div>
					);
				})}
			</div>
		</div>
	);
}

export default memo(People);
