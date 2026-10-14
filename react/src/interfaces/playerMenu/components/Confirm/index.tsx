import React, { memo } from 'react';
import styles from './index.module.css';
import { acceptConfirmation, closeConfirmation, setInputFocus, setPromoCode, usePlayerMenuStore } from '../../store';

function Confirm() {
	const confirmation = usePlayerMenuStore(state => state.confirmation);
	const codeMod = usePlayerMenuStore(state => state.codeMod);
	const code = usePlayerMenuStore(state => state.code);

	if (!confirmation) return null;

	return (
		<div className={styles.blur}>
			<div className={styles.confirmation}>
				<div className={styles.head}>{confirmation.head}</div>
				<div className={styles.description} dangerouslySetInnerHTML={{ __html: confirmation.description }} />
				{codeMod ? (
					<div>
						<input
							placeholder="Введите промокод..."
							value={code}
							onChange={function (event) { setPromoCode(event.target.value); }}
							onKeyPress={function (event) {
								if (event.key === 'Enter') acceptConfirmation();
							}}
							onFocus={function () { setInputFocus(true); }}
							onBlur={function () { setInputFocus(false); }}
						/>
					</div>
				) : null}
				<div className={styles.actions}>
					<div className={styles.btn + ' ' + styles.left} onClick={acceptConfirmation}>
						{confirmation.leftWord}
					</div>
					<div className={styles.btn} onClick={closeConfirmation}>
						{confirmation.rightWord}
					</div>
				</div>
			</div>
		</div>
	);
}

export default memo(Confirm);
