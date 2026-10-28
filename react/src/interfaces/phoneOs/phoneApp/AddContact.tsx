import React, { memo, useState } from 'react';
import { IconPerson } from './icons';
import styles from './index.module.css';
import { backToMain, saveContact } from './store';

function AddContact() {
	const [name, setName] = useState('');
	const [phone, setPhone] = useState('');
	const [tone, setTone] = useState(true);
	const ready = name.trim().length > 0 && phone.trim().length > 0;

	return (
		<div className={styles.screen}>
			<div className={styles.bar}>
				<button type="button" className={styles.link} onClick={backToMain}>
					Отмена
				</button>
				<button
					type="button"
					className={styles.link}
					disabled={!ready}
					onClick={function () {
						saveContact(name, phone);
					}}
				>
					Готово
				</button>
			</div>
			<div className={styles.scroll}>
				<div className={styles.avatar}>
					<IconPerson />
				</div>
				<p className={styles.hint}>Новый контакт</p>
				<div className={styles.group}>
					<input
						className={styles.field}
						placeholder="Имя"
						value={name}
						onChange={function (event) {
							setName(event.target.value);
						}}
					/>
					<input
						className={styles.field}
						placeholder="Телефон"
						value={phone}
						inputMode="tel"
						onChange={function (event) {
							setPhone(event.target.value);
						}}
					/>
					<div className={styles.toggle}>
						<span>Рингтон</span>
						<button
							type="button"
							className={styles.switch + (tone ? ' ' + styles.switchOn : '')}
							aria-label="Рингтон"
							onClick={function () {
								setTone(function (value) {
									return !value;
								});
							}}
						>
							<i />
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default memo(AddContact);
