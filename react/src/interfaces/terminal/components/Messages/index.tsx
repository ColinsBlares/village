import React, { memo, useEffect, useRef } from 'react';
import styles from './index.module.css';
import { useTerminalStore } from '../../store';
import Message from '../Message';

function Messages() {
	const messages = useTerminalStore(state => state.messages);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(
		function () {
			const id = window.setTimeout(function () {
				if (ref.current) ref.current.scrollTop = 999999;
			}, 10);
			return function () {
				window.clearTimeout(id);
			};
		},
		[messages],
	);

	return (
		<div className={styles.content} ref={ref}>
			{messages.map(function (mess, index) {
				return <Message key={index} type={mess.type} text={mess.text} />;
			})}
		</div>
	);
}

export default memo(Messages);
