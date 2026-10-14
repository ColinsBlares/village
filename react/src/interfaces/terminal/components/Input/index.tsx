import React, { memo, useEffect, useRef } from 'react';
import styles from './index.module.css';
import { onInputDown, onInputEnter, onInputUp, setTerminalInput, useTerminalStore } from '../../store';

function Input() {
	const inputText = useTerminalStore(state => state.inputText);
	const ref = useRef<HTMLInputElement>(null);

	useEffect(function () {
		const id = window.setTimeout(function () {
			if (ref.current) ref.current.focus();
		}, 100);
		return function () {
			window.clearTimeout(id);
		};
	}, []);

	return (
		<div className={styles.footer}>
			<input
				ref={ref}
				className={styles.input}
				type="text"
				value={inputText}
				placeholder="classic command..."
				onChange={function (e) {
					setTerminalInput(e.target.value);
				}}
				onKeyUp={function (e) {
					if (e.keyCode === 13) onInputEnter();
					else if (e.keyCode === 38) onInputUp();
					else if (e.keyCode === 40) onInputDown();
				}}
			/>
		</div>
	);
}

export default memo(Input);
