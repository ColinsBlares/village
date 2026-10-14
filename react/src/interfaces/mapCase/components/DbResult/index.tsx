import React, { memo } from 'react';
import { getFactionData } from '../../data';
import { DbRecord, sortByKey, textSplice } from '../../data/factories';
import { mapCaseSvgPaths } from '../../svgPaths';
import { showLoad, useMapCaseStore } from '../../store';
import board from '../board.module.css';

function DbResult() {
	const type = useMapCaseStore(state => state.type);
	const tick = useMapCaseStore(state => state.tick);
	void tick;
	const data = getFactionData(type);
	const result = data ? data.windowsData.dbResult : null;
	if (!result) return null;
	const sorted = sortByKey(result.list, result.sortMod.mod);

	function open(record: DbRecord) {
		showLoad();
		data.getProfile(record);
	}

	return (
		<div className={board.board}>
			<div className={board.title}>Результат: {result.list.length}</div>
			<div className={board.table}>
				<div className={board.head}>
					<div className={board.headCell + ' ' + board.first} onClick={function () { result.sortMod.update('num'); }}>
						<div>#</div>
						<SortIcon on={result.sortMod.mod === 'num'} />
					</div>
					<div className={board.headCell} onClick={function () { result.sortMod.update('name'); }}>
						<div>Имя и фамилия</div>
						<SortIcon on={result.sortMod.mod === 'name'} />
					</div>
					<div className={board.headCell} onClick={function () { result.sortMod.update('phone'); }}>
						<div>Номер телефона</div>
						<SortIcon on={result.sortMod.mod === 'phone'} />
					</div>
					<div className={board.headCell} onClick={function () { result.sortMod.update('address'); }}>
						<div>Проживание</div>
						<SortIcon on={result.sortMod.mod === 'address'} />
					</div>
				</div>
				<div className={board.body}>
					{sorted.map(function (record: DbRecord) {
						return (
							<div key={record.id} className={board.record} onClick={function () { open(record); }}>
								<div className={board.first}><div className={board.align}>{record.num}</div></div>
								<div><div className={board.align}>{record.name}</div></div>
								<div><div className={board.align}>{record.phone}</div></div>
								<div><div className={board.align}>{textSplice(record.address, 28)}</div></div>
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

export default memo(DbResult);
