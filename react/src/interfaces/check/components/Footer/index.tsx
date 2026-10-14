import React, { memo } from 'react';
import styles from './index.module.css';
import { payCheck, refuseCheck } from '../../store';

function Footer() {
	return (
		<div className={styles.footer}>
			<div>
				<div className={styles.pay} onClick={payCheck}>
					<div className={styles.noevent}>Оплатить</div>
					<svg className={styles.line + ' ' + styles.noevent}>
						<line x1="0" y1="0" x2="100%" y2="0" />
					</svg>
				</div>
			</div>
			<div>
				<div className={styles.nopay} onClick={refuseCheck}>
					<div className={styles.noevent}>Отказаться</div>
					<svg className={styles.line + ' ' + styles.noevent}>
						<line x1="0" y1="0" x2="100%" y2="0" />
					</svg>
				</div>
			</div>
		</div>
	);
}

export default memo(Footer);
