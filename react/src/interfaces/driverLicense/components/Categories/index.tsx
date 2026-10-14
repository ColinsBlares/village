import React, { memo } from 'react';
import styles from './index.module.css';
import { useDriverLicenseStore } from '../../store';
import bOff from '@imgs/driverLicense/b.svg';
import bOn from '@imgs/driverLicense/b-on.svg';
import pOff from '@imgs/driverLicense/p.svg';
import pOn from '@imgs/driverLicense/p-on.svg';
import mOff from '@imgs/driverLicense/m.svg';
import mOn from '@imgs/driverLicense/m-on.svg';
import aOff from '@imgs/driverLicense/a.svg';
import aOn from '@imgs/driverLicense/a-on.svg';
import airOff from '@imgs/driverLicense/air.svg';
import airOn from '@imgs/driverLicense/air-on.svg';
import boatOff from '@imgs/driverLicense/boat.svg';
import boatOn from '@imgs/driverLicense/boat-on.svg';

const ICONS: { [name: string]: { off: string; on: string } } = {
	b: { off: bOff, on: bOn },
	p: { off: pOff, on: pOn },
	m: { off: mOff, on: mOn },
	a: { off: aOff, on: aOn },
	air: { off: airOff, on: airOn },
	boat: { off: boatOff, on: boatOn },
};

function Categories() {
	const catNames = useDriverLicenseStore(state => state.catNames);
	const categories = useDriverLicenseStore(state => state.categories);
	const items = [];

	for (let index = 0; index < catNames.length; index++) {
		const name = catNames[index];
		const active = !!categories[index];
		const pack = ICONS[name];
		const src = pack ? (active ? pack.on : pack.off) : '';
		const className = active ? styles.category + ' ' + styles.active : styles.category;

		items.push(
			<div key={name + index} className={className}>
				<div className={styles.label}>{name}</div>
				{src ? <img src={src} alt="" /> : null}
			</div>,
		);
	}

	return <div className={styles.infoB}>{items}</div>;
}

export default memo(Categories);
