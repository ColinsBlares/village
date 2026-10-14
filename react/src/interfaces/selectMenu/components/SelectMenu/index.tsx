import React, { memo } from 'react';
import styles from './index.module.css';
import { useSelectMenuStore } from '../../store';
import Header from '../Header';
import Content from '../Content';
import Selector from '../Selector';
import Notification from '../Notification';
import TextField from '../TextField';
import Loader from '../Loader';

function SelectMenu() {
	const loader = useSelectMenuStore(state => state.loader);
	const className = loader ? styles.root + ' ' + styles.inactive : styles.root;

	return (
		<div id="selectMenu" className={className}>
			<Header />
			<Content />
			<Selector />
			<Notification />
			<TextField />
			<Loader />
		</div>
	);
}

export default memo(SelectMenu);
