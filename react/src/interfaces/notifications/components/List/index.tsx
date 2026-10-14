import React from 'react';
import styles from './index.module.css';
import Item from '../Item';
import { useNotificationsStore } from '../../store';

function List() {
	const hashes = useNotificationsStore(function (state) {
		const messages = state.messages;
		let result = '';
		for (let i = 0; i < messages.length; i++) {
			result += (i ? ',' : '') + messages[i].hash;
		}
		return result;
	});

	const ids = hashes ? hashes.split(',') : [];

	return (
		<div className={styles.list}>
			{ids.map(function (id) {
				return <Item key={id} hash={Number(id)} />;
			})}
		</div>
	);
}

export default React.memo(List);
