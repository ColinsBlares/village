import React, { memo } from 'react';
import arrow from '@imgs/selectMenu/arrow.png';
import arrowOff from '@imgs/selectMenu/arrow-off.png';
import styles from './index.module.css';

interface ArrowProps {
	direction: 'up' | 'down' | 'left' | 'right';
	active: boolean;
	variant?: 'color';
}

function Arrow(props: ArrowProps) {
	const image = props.active ? arrow : arrowOff;
	let className = styles.arrow + ' ' + styles[props.direction];
	if (props.variant === 'color') className += ' ' + styles.color;
	return <div className={className} style={{ backgroundImage: 'url("' + image + '")' }} />;
}

export default memo(Arrow);
