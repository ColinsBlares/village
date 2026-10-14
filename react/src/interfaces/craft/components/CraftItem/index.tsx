import React, { memo } from 'react';
import styles from './index.module.css';
import {
	canCraftItem,
	currentItemOf,
	formatCraftTime,
	isDeficit,
	itemDescription,
	itemImage,
	itemName,
	materialCount,
	prettyParams,
	skillInfo,
} from '../../logic';
import { onClickCraft, toggleParams, useCraftStore } from '../../store';

function CraftItem() {
	const viewTick = useCraftStore(state => state.viewTick);
	const inventoryTick = useCraftStore(state => state.inventoryTick);
	const paramsShow = useCraftStore(state => state.paramsShow);
	const skill = useCraftStore(state => state.skill);
	const crafter = useCraftStore(state => state.crafter);
	const item = currentItemOf(crafter);
	if (!item) return null;

	const params = prettyParams(item.itemId, item.params);
	const allowed = canCraftItem(item, skill);
	const skillNow = skillInfo(skill);
	const skillNeed = skillInfo(item.skill);
	const deficitSkill = item.skill > skill;
	const progress = skillNow ? ((skill - skillNow.min) / (skillNow.max - skillNow.min)) * 100 : 0;

	return (
		<div className={styles.root} data-tick={viewTick + inventoryTick}>
			{paramsShow ? (
				<div className={styles.params}>
					{params.map(function (param: any, index: number) {
						return (
							<div key={index} className={styles.param}>
								<div>{param.name}</div>
								<div>{param.value}</div>
							</div>
						);
					})}
				</div>
			) : (
				<div className={styles.icon} style={{ backgroundImage: "url('" + itemImage(item.itemId) + "')" }} />
			)}
			<div className={styles.title}>
				<div className={styles.name}>{itemName(item.itemId)}</div>
				<div className={paramsShow ? styles.details + ' ' + styles.detailsActive : styles.details} onClick={toggleParams}>
					<i className="fas fa-ellipsis-h" />
				</div>
			</div>
			<div className={styles.description}>
				<div className={styles.materials}>
					{item.materials.map(function (mat, index) {
						const deficit = isDeficit(mat);
						return (
							<div key={index} className={deficit ? styles.material + ' ' + styles.deficit : styles.material}>
								<div>{itemName(mat.itemId)}</div>
								<div>
									{materialCount(mat.itemId)}/{mat.count}
								</div>
							</div>
						);
					})}
				</div>
				<div className={deficitSkill ? styles.skill + ' ' + styles.deficit : styles.skill}>
					<div className={styles.skillTitle}>
						<div>Навык</div>
						<div>
							{skillNow ? skillNow.level : 0}/{skillNeed ? skillNeed.level : 0} lvl
						</div>
					</div>
					<div className={styles.progress}>
						<div className={styles.fill} style={{ width: progress + '%' }} />
					</div>
				</div>
				<div>{itemDescription(item.itemId)}</div>
			</div>
			{allowed ? <div className={styles.time}>{formatCraftTime(item.time)}</div> : null}
			<div className={allowed ? styles.make : styles.make + ' ' + styles.disabled} onClick={onClickCraft}>
				Изготовить
			</div>
		</div>
	);
}

export default memo(CraftItem);
