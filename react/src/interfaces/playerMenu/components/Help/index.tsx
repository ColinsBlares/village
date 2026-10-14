import React, { memo, useState } from 'react';
import styles from './index.module.css';
import { HELP_MESSAGES, HelpMessage } from '../../data';
import { setInputFocus } from '../../store';
import communicationImg from '@imgs/playerMenu/communication.svg';
import arrowImg from '@imgs/playerMenu/help-arrow.svg';

function Help() {
	const [message, setMessage] = useState('');
	const [currentAnswer, setCurrentAnswer] = useState<number | null>(null);
	const query = message.toLowerCase();
	const searchResult = HELP_MESSAGES.filter(function (record) {
		return record.question.toLowerCase().indexOf(query) !== -1;
	});

	function showAnswer(index: number, item: HelpMessage) {
		if (!item.answer) return;
		setCurrentAnswer(currentAnswer === index ? null : index);
	}

	return (
		<div className={styles.help}>
			<div className={styles.head}>Введите интересующий вас вопрос:</div>
			<input
				placeholder="Введите вопрос..."
				value={message}
				maxLength={120}
				onChange={function (event) { setMessage(event.target.value); }}
				onFocus={function () { setInputFocus(true); }}
				onBlur={function () { setInputFocus(false); }}
			/>
			<div className={styles.head}>Ответы на вопросы</div>
			<div className={styles.messages}>
				{searchResult.map(function (item, index) {
					const focused = currentAnswer === index;
					const className = focused ? styles.message + ' ' + styles.focus : styles.message;
					return (
						<div key={item.question} className={className} onClick={function () { showAnswer(index, item); }}>
							<div className={styles.img}>
								<img src={communicationImg} alt="" />
							</div>
							<div className={styles.qw}>{item.question}</div>
							{item.answer ? (
								<div className={styles.arrow}>
									<img src={arrowImg} alt="" />
								</div>
							) : null}
							{focused ? <div className={styles.answer}>{item.answer}</div> : null}
						</div>
					);
				})}
			</div>
		</div>
	);
}

export default memo(Help);
