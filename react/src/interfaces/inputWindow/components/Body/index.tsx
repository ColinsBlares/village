import React from 'react';
import styles from './index.module.css';
import { sanitizeHtml } from '@utils/sanitizeHtml';
import { setInputField, useInputWindowStore } from '../../store';

function Description() {
	const description = useInputWindowStore(state => state.description);

	return (
		<div
			className={styles.description}
			dangerouslySetInnerHTML={{ __html: sanitizeHtml(description || '') }}
		/>
	);
}

function Hint() {
	const hint = useInputWindowStore(state => state.hint);

	return <div className={styles.hint}>{hint}</div>;
}

function Field() {
	const inputHint = useInputWindowStore(state => state.inputHint);
	const value = useInputWindowStore(state => state.value);

	return (
		<input
			className={styles.field}
			placeholder={inputHint}
			value={value}
			onChange={function (event) {
				setInputField('value', event.target.value);
			}}
		/>
	);
}

const DescriptionView = React.memo(Description);
const HintView = React.memo(Hint);
const FieldView = React.memo(Field);

function Body() {
	return (
		<div className={styles.body}>
			<DescriptionView />
			<HintView />
			<FieldView />
		</div>
	);
}

export default React.memo(Body);
