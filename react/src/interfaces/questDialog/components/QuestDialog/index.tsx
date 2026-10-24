import React, { memo, useEffect, useRef, useState } from 'react';
import styles from './index.module.css';
import { DialogChoice, useQuestDialogStore } from '../../store';
import { triggerMp } from '../../../questEditor/mp';

function DialogText(props: { text: string; onDone: () => void }) {
	const text = props.text;
	const [count, setCount] = useState(0);
	const timerRef = useRef<number | null>(null);

	useEffect(() => {
		setCount(0);
		if (!text) {
			props.onDone();
			return undefined;
		}
		let current = 0;
		timerRef.current = window.setInterval(function () {
			current += 1;
			setCount(current);
			if (current >= text.length) {
				if (timerRef.current !== null) window.clearInterval(timerRef.current);
				props.onDone();
			}
		}, 24);
		return function () {
			if (timerRef.current !== null) window.clearInterval(timerRef.current);
		};
	}, [text]);

	function skip() {
		if (count >= text.length) return;
		if (timerRef.current !== null) window.clearInterval(timerRef.current);
		setCount(text.length);
		props.onDone();
	}

	return (
		<div className={styles.text} onClick={skip}>
			{text.slice(0, count)}
			{count < text.length ? <span className={styles.caret} /> : null}
		</div>
	);
}

const TypedText = memo(DialogText);

function ChoiceGrid(props: { questId: number; choices: DialogChoice[] }) {
	const buttons = props.choices.slice();
	if (!buttons.some(function (choice) { return choice.handle === 'close'; })) {
		buttons.push({ handle: 'leave', text: 'Отойти' });
	}
	const count = buttons.length;
	const cols = count <= 1 ? 1 : count === 2 || count === 4 ? 2 : 3;
	const className = styles.choices + ' ' + styles['cols' + cols];

	return (
		<div className={className}>
			{buttons.map(function (choice) {
				return (
					<button
						key={choice.handle + choice.text}
						type="button"
						className={styles.choice}
						onClick={function () {
							if (!props.questId || choice.handle === 'close' || choice.handle === 'leave') {
								triggerMp('quests.dialog.close');
								return;
							}
							triggerMp('callRemote', 'quests.dialog.choice', props.questId, choice.handle);
						}}
					>
						{choice.text}
					</button>
				);
			})}
		</div>
	);
}

const Choices = memo(ChoiceGrid);

function QuestDialogView() {
	const show = useQuestDialogStore(state => state.show);
	const questId = useQuestDialogStore(state => state.questId);
	const npcName = useQuestDialogStore(state => state.npcName);
	const lines = useQuestDialogStore(state => state.lines);
	const choices = useQuestDialogStore(state => state.choices);
	const [ready, setReady] = useState(false);
	const text = lines.join('\n');

	useEffect(() => {
		setReady(false);
	}, [show, text, npcName]);

	if (!show) return null;

	return (
		<div className={styles.root}>
			<div className={styles.card}>
				<div className={styles.name}>{npcName}</div>
				<TypedText
					text={text}
					onDone={function () {
						setReady(true);
					}}
				/>
				{ready ? <Choices questId={questId} choices={choices} /> : null}
			</div>
		</div>
	);
}

export default memo(QuestDialogView);
