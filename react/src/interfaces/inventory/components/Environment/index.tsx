import React, { memo } from 'react';
import { getPlaceWeight, toggleShowPockets } from '../../model';
import { useInventoryStore } from '../../store';
import Pocket from '../Pocket';
import styles from './index.module.css';

function Environment() {
	const environment = useInventoryStore(function (store) {
		return store.environment;
	});
	const debug = useInventoryStore(function (store) {
		return store.debug;
	});
	const itemsInfo = useInventoryStore(function (store) {
		return store.itemsInfo;
	});
	void itemsInfo;

	return (
		<div className={styles.environment}>
			{environment.map(function (place) {
				const weight = +getPlaceWeight(place).toFixed(1);
				return (
					<div className={styles.container} key={place.sqlId}>
						<div
							className={place.showPockets ? styles.header : styles.headerHidden}
							onClick={function () {
								toggleShowPockets(place);
							}}
						>
							<div className={styles.title}>{place.header + ' ' + (debug ? place.sqlId : '')}</div>
							<div>{weight} кг</div>
						</div>
						<Pocket place={place} scope="environment" contextMenu={false} />
					</div>
				);
			})}
		</div>
	);
}

export default memo(Environment);
