import React, { memo } from 'react';
import { pageCount, PAGE_W } from '../../grid';
import { setHomePage, usePhoneOsStore } from '../../store';
import styles from './index.module.css';

function PageDots() {
	const page = usePhoneOsStore(state => {
		const count = pageCount(state.home);
		const approx = Math.round(-state.pageOffset / PAGE_W);
		if (approx < 0) {
			return 0;
		}
		if (approx > count - 1) {
			return Math.max(0, count - 1);
		}
		return approx;
	});
	const count = usePhoneOsStore(state => pageCount(state.home));
	if (count < 2) {
		return null;
	}
	const dots = [];
	for (let index = 0; index < count; index += 1) {
		dots.push(index);
	}

	return (
		<div className={styles.dots}>
			{dots.map(function (index) {
				return (
					<button
						key={index}
						type="button"
						className={styles.dot + (index === page ? ' ' + styles.on : '')}
						aria-label={'Страница ' + (index + 1)}
						onClick={function () {
							setHomePage(index);
						}}
					/>
				);
			})}
		</div>
	);
}

export default memo(PageDots);
