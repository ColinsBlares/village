import React, { memo } from 'react';
import styles from './index.module.css';
import { headerImage } from '../../headers';
import { useSelectMenuStore } from '../../store';

function Header() {
	const header = useSelectMenuStore(state => (state.menu ? state.menu.header : ''));
	const headerImg = useSelectMenuStore(state => (state.menu ? state.menu.headerImg : ''));
	const loader = useSelectMenuStore(state => state.loader);

	if (headerImg) {
		const src = headerImage(headerImg);
		const className = loader ? styles.headerImg + ' ' + styles.inactive : styles.headerImg;
		const style: React.CSSProperties = {
			backgroundImage: src ? 'url("' + src + '")' : undefined,
		};
		return <div className={className} style={style} />;
	}

	const className = loader ? styles.header + ' ' + styles.inactive : styles.header;
	return <div className={className}>{header}</div>;
}

export default memo(Header);
