import React, { memo } from 'react';
import styles from './index.module.css';
import { chooseCharacter, chooseLeft, chooseRight, useCharacterInfoStore } from '../../store';

function Selector() {
	const show = useCharacterInfoStore(state => state.show);
	const length = useCharacterInfoStore(state => state.characters.length);
	const i = useCharacterInfoStore(state => state.i);
	const slots = useCharacterInfoStore(state => state.slots);
	const limitSlots = useCharacterInfoStore(state => state.limitSlots);

	if (!(show && length)) {
		return null;
	}

	const leftDisabled = i <= 0;
	const rightDisabled = i == slots || i == limitSlots - 1 || i == length;
	const enterDisabled = i > length - 1;
	const leftClass = leftDisabled ? styles.arrow + ' ' + styles.disabled : styles.arrow;
	const rightClass = rightDisabled ? styles.arrow + ' ' + styles.disabled : styles.arrow;
	const enterClass = enterDisabled ? styles.disabled : '';

	return (
		<div className={styles.selector}>
			<div className={styles.row}>
				<div className={leftClass} onClick={chooseLeft}>
					&lt;
				</div>
				<button type="button" className={enterClass} onClick={chooseCharacter}>
					Выбрать
				</button>
				<div className={rightClass} onClick={chooseRight}>
					&gt;
				</div>
			</div>
		</div>
	);
}

export default memo(Selector);
