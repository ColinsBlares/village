import React, { memo } from 'react';
import { getItem, onBinMouse } from '../../model';
import { useInventoryStore } from '../../store';
import styles from './index.module.css';

function Bin() {
	const dragItem = useInventoryStore(function (store) {
		return store.dragItem;
	});
	const equipment = useInventoryStore(function (store) {
		return store.equipment;
	});
	void equipment;

	if (!dragItem || !getItem(dragItem.sqlId)) return null;

	return (
		<div
			className={styles.bin}
			onMouseEnter={function () {
				onBinMouse('mouseenter');
			}}
			onMouseLeave={function () {
				onBinMouse('mouseleave');
			}}
		>
			<svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M16.8557 4.54545C16.8557 3.05494 18.019 1.9656 19.5095 1.9656H30.4187C31.9087 1.9656 33.072 3.05494 33.072 4.54545V7.37101H35.0376V4.54545C35.0376 1.97136 32.9928 0 30.4187 0H19.5095C16.9354 0 14.8901 1.97136 14.8901 4.54545V7.37101H16.8557V4.54545Z" fill="white" />
				<path d="M13.341 50.0001H36.5841C38.8252 50.0001 40.5643 48.0287 40.5643 45.5775V15.2335H9.36035V45.5775C9.36035 48.0287 11.0994 50.0001 13.341 50.0001ZM31.2277 19.9263C31.2277 19.3835 31.6677 18.9435 32.2105 18.9435C32.7532 18.9435 33.1933 19.3835 33.1933 19.9263V43.1449C33.1933 43.6877 32.7532 44.1277 32.2105 44.1277C31.6677 44.1277 31.2277 43.6877 31.2277 43.1449V19.9263ZM23.9795 19.9263C23.9795 19.3835 24.4196 18.9435 24.9623 18.9435C25.5051 18.9435 25.9451 19.3835 25.9451 19.9263V43.1449C25.9451 43.6877 25.5051 44.1277 24.9623 44.1277C24.4196 44.1277 23.9795 43.6877 23.9795 43.1449V19.9263ZM16.7314 19.9263C16.7314 19.3835 17.1714 18.9435 17.7142 18.9435C18.2569 18.9435 18.697 19.3835 18.697 19.9263V43.1449C18.697 43.6877 18.2569 44.1277 17.7142 44.1277C17.1714 44.1277 16.7314 43.6877 16.7314 43.1449V19.9263Z" fill="white" />
				<path d="M8.353 13.2679H41.5715C42.9286 13.2679 44.0285 12.168 44.0285 10.8109C44.0285 9.45378 42.9286 8.35388 41.5715 8.35388H8.353C6.99589 8.35388 5.896 9.45378 5.896 10.8109C5.896 12.168 6.99589 13.2679 8.353 13.2679Z" fill="white" />
			</svg>
		</div>
	);
}

export default memo(Bin);
