import React, { memo } from 'react';
import styles from './index.module.css';

interface RemoveButtonProps {
	inset: boolean;
	onRemove: () => void;
}

function RemoveButton({ inset, onRemove }: RemoveButtonProps) {
	return (
		<button
			type="button"
			data-remove="true"
			aria-label="Убрать"
			className={styles.remove + (inset ? ' ' + styles.inset : '')}
			onPointerDown={function (event) {
				event.stopPropagation();
			}}
			onClick={function (event) {
				event.stopPropagation();
				onRemove();
			}}
		>
			<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
				<path d="M2 2.2 8 8M8 2.2 2 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
			</svg>
		</button>
	);
}

export default memo(RemoveButton);
