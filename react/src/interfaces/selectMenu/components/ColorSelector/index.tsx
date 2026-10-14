import React, { memo } from 'react';
import styles from './index.module.css';
import Arrow from '../Arrow';
import { useSelectMenuStore } from '../../store';
import { currentItem, isColorVisible } from '../../view';

function ColorSelector() {
	const activeIndex = useSelectMenuStore(state => {
		const item = currentItem(state.menu);
		return item ? item.i : 0;
	});
	const packed = useSelectMenuStore(state => {
		const item = currentItem(state.menu);
		if (!item || !item.values) return '';
		const parts: string[] = [];
		for (let index = 0; index < item.values.length; index++) {
			if (!isColorVisible(item, index, state.maxColorValues)) continue;
			parts.push(index + ':' + item.values[index]);
		}
		return parts.join('|');
	});
	const canLeft = useSelectMenuStore(state => {
		const item = currentItem(state.menu);
		return !!(item && item.j > 0);
	});
	const canRight = useSelectMenuStore(state => {
		const item = currentItem(state.menu);
		if (!item || !item.values) return false;
		return item.j < item.values.length - state.maxColorValues;
	});
	const loader = useSelectMenuStore(state => state.loader);

	const swatches: Array<{ index: number; color: string }> = [];
	if (packed) {
		const parts = packed.split('|');
		for (let i = 0; i < parts.length; i++) {
			const pair = parts[i].split(':');
			swatches.push({ index: Number(pair[0]), color: pair.slice(1).join(':') });
		}
	}

	const className = loader ? styles.selector + ' ' + styles.inactive : styles.selector;

	return (
		<div className={className}>
			<Arrow direction="left" active={canLeft} variant="color" />
			{swatches.map(swatch => {
				const swatchClass = swatch.index === activeIndex ? styles.swatch + ' ' + styles.active : styles.swatch;
				return <div key={swatch.index} className={swatchClass} style={{ background: swatch.color }} />;
			})}
			<Arrow direction="right" active={canRight} variant="color" />
		</div>
	);
}

export default memo(ColorSelector);
