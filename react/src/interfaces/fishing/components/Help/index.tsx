import React, { memo } from 'react';
import styles from './index.module.css';
import { useFishingStore } from '../../store';

function Help() {
	const isStarted = useFishingStore(state => state.isStarted);
	const isFetch = useFishingStore(state => state.isFetch);

	return (
		<div className={styles.help}>
			<table>
				<tbody>
					{!isStarted ? (
						<tr>
							<th>
								<span className={styles.button}>ЛКМ</span>
							</th>
							<th>
								<span>Забросить удочку</span>
							</th>
						</tr>
					) : null}
					{isFetch ? (
						<tr>
							<th>
								<span className={styles.button}>Space</span>
							</th>
							<th>
								<span>Вытянуть</span>
							</th>
						</tr>
					) : null}
					{!isFetch ? (
						<tr>
							<th>
								<span className={styles.button}>Esc</span>
							</th>
							<th>
								<span>Выйти</span>
							</th>
						</tr>
					) : null}
				</tbody>
			</table>
		</div>
	);
}

export default memo(Help);
