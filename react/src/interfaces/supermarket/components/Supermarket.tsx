import React, { memo } from 'react';
import styles from './Supermarket.module.css';
import { useSupermarketStore } from '../store';
import Close from './Close';
import Heading from './Heading';
import Tabs from './Tabs';
import Goods from './Goods';
import NumberPanel from './NumberPanel';
import Notice from './Notice';
import Stage from './Stage';
import Loader from './Loader';

function Supermarket() {
	const loader = useSupermarketStore(state => state.loader);
	const screen = useSupermarketStore(state => state.screen);
	const shadeClass = loader ? styles.shade + ' ' + styles.busy : styles.shade;

	return (
		<div className={styles.root}>
			<div className={shadeClass}>
				<Close />
				<div className={styles.layout}>
					<section className={styles.catalog}>
						<Heading />
						<Tabs />
						{screen === 'number' ? <NumberPanel /> : <Goods />}
						<Notice />
					</section>
					<Stage />
				</div>
				<Loader />
			</div>
		</div>
	);
}

export default memo(Supermarket);
