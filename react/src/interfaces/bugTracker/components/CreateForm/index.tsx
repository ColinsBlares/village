import React, { memo } from 'react';
import styles from './index.module.css';
import {
	addBugStep,
	createBug,
	onKeyDownStep,
	setBugFormExpected,
	setBugFormName,
	setBugFormResult,
	setBugStep,
	stepPlaceholder,
	useBugTrackerStore,
} from '../../store';

function CreateForm() {
	const form = useBugTrackerStore(state => state.form);

	return (
		<div className={styles.form}>
			<div className={styles.header}>Новая ошибка</div>
			<div className={styles.info}>
				<div>Название:</div>
				<input
					className={styles.input}
					type="text"
					placeholder="Восстановление HP бронежилета"
					value={form.name}
					onChange={function (e) {
						setBugFormName(e.target.value);
					}}
				/>
				<div>Шаги воспроизведения:</div>
				<div className={styles.steps}>
					{form.steps.map(function (step, index) {
						return (
							<div key={index}>
								<input
									className={styles.input}
									type="text"
									placeholder={stepPlaceholder(index)}
									value={step}
									onChange={function (e) {
										setBugStep(index, e.target.value);
									}}
									onKeyDown={function (e) {
										onKeyDownStep(e.keyCode, index);
									}}
								/>
							</div>
						);
					})}
					<div className={styles.button} onClick={addBugStep}>
						Добавить шаг
					</div>
				</div>
				<div>Результат:</div>
				<input
					className={styles.input}
					type="text"
					placeholder="HP бронежилета откатывается на первоначальное значение"
					value={form.result}
					onChange={function (e) {
						setBugFormResult(e.target.value);
					}}
				/>
				<div>Ожидаемый результат:</div>
				<input
					className={styles.input}
					type="text"
					placeholder="HP бронежилета не откатывается"
					value={form.expectedResult}
					onChange={function (e) {
						setBugFormExpected(e.target.value);
					}}
					onKeyDown={function (e) {
						if (e.keyCode == 13) createBug();
					}}
				/>
			</div>
			<div className={styles.button} onClick={createBug}>
				Создать
			</div>
		</div>
	);
}

export default memo(CreateForm);
