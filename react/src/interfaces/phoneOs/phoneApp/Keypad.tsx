import React, { memo } from 'react';
import { IconBackspace, IconHandset } from './icons';
import styles from './index.module.css';
import { callNumber, eraseDigit, typeDigit, usePhoneAppStore } from './store';

const keys = [
	{ digit: '1', letters: '' },
	{ digit: '2', letters: 'ABC' },
	{ digit: '3', letters: 'DEF' },
	{ digit: '4', letters: 'GHI' },
	{ digit: '5', letters: 'JKL' },
	{ digit: '6', letters: 'MNO' },
	{ digit: '7', letters: 'PQRS' },
	{ digit: '8', letters: 'TUV' },
	{ digit: '9', letters: 'WXYZ' },
	{ digit: '*', letters: '' },
	{ digit: '0', letters: '+' },
	{ digit: '#', letters: '' },
];

function Keypad() {
	const number = usePhoneAppStore(state => state.number);
	const contacts = usePhoneAppStore(state => state.contacts);
	const digits = number.replace(/\D/g, '');
	const known = digits
		? contacts.find(function (item) {
				return item.phone.replace(/\D/g, '') === digits;
			})
		: null;

	return (
		<div className={styles.pad}>
			<div className={styles.dial}>
				<div className={styles.number}>{number}</div>
				<div className={styles.sub}>{known ? known.name : ''}</div>
			</div>
			<div className={styles.keys}>
				{keys.map(function (item) {
					return (
						<button
							key={item.digit}
							type="button"
							className={styles.key}
							onClick={function () {
								typeDigit(item.digit);
							}}
						>
							<b>{item.digit}</b>
							<span>{item.letters}</span>
						</button>
					);
				})}
			</div>
			<div className={styles.callRow}>
				<button type="button" className={styles.call} disabled={!number} onClick={callNumber} aria-label="Позвонить">
					<IconHandset />
				</button>
				<button type="button" className={styles.erase} disabled={!number} onClick={eraseDigit} aria-label="Стереть">
					<IconBackspace />
				</button>
			</div>
		</div>
	);
}

export default memo(Keypad);
