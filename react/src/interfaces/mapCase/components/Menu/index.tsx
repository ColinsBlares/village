import React, { memo } from 'react';
import { getFactionData } from '../../data';
import { setMenuFocus, showLoad, useMapCaseStore } from '../../store';
import styles from './index.module.css';

function Menu() {
	const type = useMapCaseStore(state => state.type);
	const menuFocus = useMapCaseStore(state => state.menuFocus);
	const userName = useMapCaseStore(state => state.userName);
	const tick = useMapCaseStore(state => state.tick);
	const data = getFactionData(type);
	void tick;
	if (!data) return <div className={styles.menu} />;

	const names = Object.keys(data.menuBody);

	return (
		<div className={styles.menu}>
			<div className={styles.header}>
				<div className={styles.menuTop}>
					<div dangerouslySetInnerHTML={{ __html: data.menuHeader }} />
					{data.menuHeaderName ? (
						<img className={styles.headerName} src={data.menuHeaderName} alt="" />
					) : null}
				</div>
				<div className={styles.menuBottom}>
					<div>
						<img src={data.menuHeaderImg} alt="" />
					</div>
					<div>
						{data.menuTitle}
						<br />
						<span>{userName}</span>
					</div>
				</div>
			</div>
			<div className={styles.body}>
				{names.map(function (name) {
					const item = data.menuBody[name];
					const focused = menuFocus === name;
					return (
						<div
							key={name}
							className={focused ? styles.item + ' ' + styles.focus : styles.item}
							onClick={function () {
								setMenuFocus(name);
							}}
						>
							<div>
								<svg viewBox="0 0 20 20">
									{item.img.map(function (path: string, index: number) {
										return <path key={index} d={path} />;
									})}
								</svg>
							</div>
							<div>{item.title}</div>
						</div>
					);
				})}
				{data.emergencyCall ? (
					<div
						className={styles.emergency}
						onClick={function () {
							data.emergencyCall();
							showLoad();
						}}
					>
						Экстренный вызов
					</div>
				) : null}
			</div>
		</div>
	);
}

export default memo(Menu);
