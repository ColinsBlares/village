import React, { memo, useEffect, useRef, useState } from 'react';
import editPen from '@imgs/mapCase/edit_pen.svg';
import errorGray from '@imgs/mapCase/error_gray.svg';
import stopwatch from '@imgs/mapCase/stopwatch.svg';
import { mapCaseWnewsAdsData } from '../../data/wnews';
import { setCurrentOverWindow, setInputFocus, showLoad } from '../../store';
import styles from './index.module.css';

function PublicationForm() {
	const adData = mapCaseWnewsAdsData.adData;
	const textRef = useRef<HTMLDivElement>(null);
	const [header, setHeader] = useState('Текст объявления:');
	const [text, setText] = useState(adData.ad.text || '');
	const [editMod, setEditMod] = useState(false);
	const [refuseMod, setRefuseMod] = useState(false);

	useEffect(function () {
		if (textRef.current) textRef.current.innerText = adData.ad.text || '';
	}, []);

	function update(event: React.FormEvent<HTMLDivElement>) {
		const node = event.currentTarget;
		if (node.innerText.length > adData.maxLength) {
			node.innerText = text;
			return;
		}
		setText(node.innerText);
	}

	function send() {
		if (!text) return;
		showLoad();
		setCurrentOverWindow(null);
		adData.send(Object.assign({}, adData.ad, { text: text }));
	}

	function refuse() {
		if (refuseMod) {
			if (!text) return;
			showLoad();
			setCurrentOverWindow(null);
			adData.refuse(Object.assign({}, adData.ad, { text: text }));
			return;
		}
		setHeader('Причина отказа:');
		if (textRef.current) textRef.current.innerText = '';
		setText('');
		setEditMod(true);
		setRefuseMod(true);
	}

	return (
		<div className={styles.box}>
			<div className={styles.title}>{header}</div>
			<div
				ref={textRef}
				className={editMod ? styles.text + ' ' + styles.focus : styles.text}
				contentEditable={editMod}
				onInput={update}
				onKeyPress={function (event) {
					if (event.keyCode == 13) event.preventDefault();
				}}
				onFocus={function () { setInputFocus(true); }}
				onBlur={function () { setInputFocus(false); }}
			/>
			<div className={styles.line} />
			<div className={styles.author}>
				<span>Автор:</span> {adData.ad.author}
			</div>
			<div className={refuseMod ? styles.btns + ' ' + styles.refuse : styles.btns}>
				{refuseMod ? null : (
					<div className={styles.btn} onClick={function () { setEditMod(true); }}>
						<div><img src={editPen} alt="" /></div>
						<div className={styles.cont}>РЕДАКТИРОВАТЬ ТЕКСТ</div>
					</div>
				)}
				{refuseMod ? null : (
					<div className={styles.btn + ' ' + styles.send} onClick={send}>
						<div><img src={stopwatch} alt="" /></div>
						<div className={styles.cont}>ОТПРАВИТЬ</div>
					</div>
				)}
				<div className={styles.btn} onClick={refuse}>
					<div><img src={errorGray} alt="" /></div>
					<div className={styles.cont}>ОТКАЗАТЬ</div>
				</div>
			</div>
		</div>
	);
}

export default memo(PublicationForm);
