import React, { memo } from 'react';
import { getFactionData } from '../../data';
import { sortByKey, textSplice, WantedRecord } from '../../data/factories';
import { mapCaseSvgPaths } from '../../svgPaths';
import { showLoad, useMapCaseStore } from '../../store';
import board from '../board.module.css';
import styles from './index.module.css';

const STARS = [1, 2, 3, 4, 5];

function Wanted() {
	const type = useMapCaseStore(state => state.type);
	const tick = useMapCaseStore(state => state.tick);
	void tick;
	const data = getFactionData(type);
	const wanted = data ? data.windowsData.wanted : null;
	if (!wanted) return null;

	const sorted = sortByKey(wanted.list, wanted.sortMod.mod);
	if (wanted.sortMod.mod === 'danger') sorted.reverse();

	function open(record: WantedRecord) {
		showLoad();
		data.getProfile(record);
	}

	return (
		<div className={board.board}>
			<div className={board.title}>Список разыскиваемых</div>
			<div className={board.table}>
				<div className={board.head}>
					<div className={board.headCell + ' ' + board.first} onClick={function () { wanted.sortMod.update('num'); }}>
						<div>#</div>
						<SortIcon on={wanted.sortMod.mod === 'num'} />
					</div>
					<div className={board.headCell} onClick={function () { wanted.sortMod.update('name'); }}>
						<div>Имя и фамилия</div>
						<SortIcon on={wanted.sortMod.mod === 'name'} />
					</div>
					<div className={board.headCell}>Причина</div>
					<div className={board.headCell} onClick={function () { wanted.sortMod.update('danger'); }}>
						<div>Опасность</div>
						<SortIcon on={wanted.sortMod.mod === 'danger'} />
					</div>
				</div>
				<div className={board.body}>
					{sorted.map(function (record: WantedRecord, index: number) {
						return (
							<div
								key={record.id != null ? record.id : index}
								className={board.record + ' ' + styles.row}
								onClick={function () { open(record); }}
							>
								<div className={board.first}><div className={board.align}>{record.num}</div></div>
								<div><div className={board.align}>{record.name}</div></div>
								<div><div className={board.align}>{textSplice(record.description, 32)}</div></div>
								<div>
									<div className={board.align}>
										{STARS.map(function (n) {
											return (
												<svg key={n} className={record.danger >= n ? styles.star + ' ' + styles.fill : styles.star} viewBox="0 0 14 14">
													<path d={mapCaseSvgPaths.dangerStar[0]} />
												</svg>
											);
										})}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}

function SortIcon(props: { on: boolean }) {
	return (
		<svg className={props.on ? board.sort + ' ' + board.sortOn : board.sort} viewBox="0 0 9 16">
			<path d={mapCaseSvgPaths.tableSortArrows[0]} />
			<path d={mapCaseSvgPaths.tableSortArrows[1]} />
		</svg>
	);
}

export default memo(Wanted);
