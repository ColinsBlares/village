import React, { memo } from 'react';
import styles from './index.module.css';
import { isCreateVisible, onClickCreateCharacter, useCharacterInfoStore } from '../../store';

function CreateCharacter() {
	const visible = useCharacterInfoStore(isCreateVisible);

	if (!visible) {
		return null;
	}

	return (
		<div className={styles.create} onClick={onClickCreateCharacter}>
			<div className={styles.inner}>
				<div className={styles.plus}>+</div>
				<div className={styles.text}>
					Создать
					<br />
					персонажа
				</div>
			</div>
		</div>
	);
}

export default memo(CreateCharacter);
