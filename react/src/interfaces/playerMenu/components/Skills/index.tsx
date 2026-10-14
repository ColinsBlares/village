import React, { memo, useState } from 'react';
import styles from './index.module.css';
import { SkillItem, usePlayerMenuStore } from '../../store';
import scrollImg from '@imgs/playerMenu/skill-scroll.svg';

function Skills() {
	const skills = usePlayerMenuStore(state => state.skills);
	const [count, setCount] = useState(0);
	const lines: Array<Array<SkillItem | null>> = [];

	for (let i = 0; i < skills.length; i += 2) {
		lines.push([skills[i], skills[i + 1] ? skills[i + 1] : null]);
	}

	const downDisabled = count > lines.length - 4;

	function onClickArrow(isDown: boolean) {
		if (!isDown && count == 0) return;
		if (isDown && downDisabled) return;
		setCount(isDown ? count + 1 : count - 1);
	}

	return (
		<div className={styles.skills}>
			<div className={styles.header}>Навыки</div>
			<div className={styles.body}>
				<div className={styles.arrow + ' ' + styles.top} onClick={function () { onClickArrow(false); }}>
					<img className={count == 0 ? styles.disable : undefined} src={scrollImg} alt="" />
				</div>
				<div className={styles.board}>
					{lines.map(function (pair, index) {
						if (index < count || index >= count + 3) return null;
						return (
							<div className={styles.line} key={index}>
								{pair.map(function (skill, skillIndex) {
									if (!skill) return null;
									const full = skill.value == 100;
									const width = skill.value > 1 ? skill.value + '%' : '1vh';
									return (
										<div className={styles.skill} key={skillIndex}>
											<div>{skill.head}</div>
											<div className={full ? styles.val + ' ' + styles.paint : styles.val}>
												{+Number(skill.value).toFixed(2)}%
											</div>
											<div className={styles.progress}>
												<div style={{ width: width }} />
											</div>
										</div>
									);
								})}
							</div>
						);
					})}
				</div>
				<div className={styles.arrow} onClick={function () { onClickArrow(true); }}>
					<img className={downDisabled ? styles.disable : undefined} src={scrollImg} alt="" />
				</div>
			</div>
		</div>
	);
}

export default memo(Skills);
