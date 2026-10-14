import React, { memo } from 'react';
import styles from './index.module.css';
import { useGovernmentBadgeStore } from '../../store';
import bcsd from '@imgs/governmentBadge/BCSD.svg';
import fib from '@imgs/governmentBadge/FIB.svg';
import lspd from '@imgs/governmentBadge/LSPD.svg';

const EMBLEMS: { [type: string]: string } = {
	bcsd: bcsd,
	fib: fib,
	lspd: lspd,
};

function Emblem() {
	const type = useGovernmentBadgeStore(state => state.type);
	const src = EMBLEMS[type];

	if (!src) {
		return null;
	}

	return <img className={styles.emblem} src={src} alt="" />;
}

export default memo(Emblem);
