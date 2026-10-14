import React, { memo, useRef, useState } from 'react';
import road from '@imgs/mapCase/road.svg';
import { getFactionData } from '../../data';
import { CallRecord, prettyMoney, sortByKey, textSplice } from '../../data/factories';
import { mapCaseSvgPaths } from '../../svgPaths';
import { showLoad, useMapCaseStore } from '../../store';
import board from '../board.module.css';
import styles from './index.module.css';

function readDistance(record: CallRecord) {
	const hud = (window as any).hud;
	const local = hud && hud.localPos ? hud.localPos : { x: 0, y: 0 };
	if (!record.pos) return record.num || 0;
	return parseInt(
		String(Math.sqrt(Math.pow(local.x - record.pos.x, 2) + Math.pow(local.y - record.pos.y, 2))),
		10,
	);
}

function Calls() {
	const type = useMapCaseStore(state => state.type);
	const tick = useMapCaseStore(state => state.tick);
	const tableRef = useRef<HTMLDivElement>(null);
	const hintRef = useRef<HTMLDivElement>(null);
	const [hint, setHint] = useState<{ description: string; dist: string; top: number; left: number; opacity: number } | null>(null);
	void tick;

	const data = getFactionData(type);
	const calls = data ? data.windowsData.calls : null;
	if (!calls) return null;

	const sorted = sortByKey(calls.list.slice().map(function (record: CallRecord) {
		return Object.assign({}, record, { num: readDistance(record) });
	}), calls.sortMod.mod);

	function onSort(mod: string) {
		setHint(null);
		calls.sortMod.update(mod);
	}

	function onMove(event: React.MouseEvent<HTMLDivElement>, record: CallRecord) {
		const target = event.target as HTMLElement;
		if (!hint) {
			if (!target.getAttribute('data-record')) {
				setHint(null);
				return;
			}
		}
		const row = target.getAttribute('data-record') ? target : (target.closest('[data-record]') as HTMLElement | null);
		if (!row) {
			setHint(null);
			return;
		}
		const dist = readDistance(record);
		let offsetX = event.nativeEvent.offsetX + 15;
		let offsetY = event.nativeEvent.offsetY + row.offsetTop - (row.parentElement ? row.parentElement.scrollTop : 0) + 15;
		let opacity = 1;
		const hintEl = hintRef.current;
		const table = tableRef.current;
		if (hintEl && table) {
			if (offsetX + hintEl.offsetWidth > row.offsetWidth) offsetX = event.nativeEvent.offsetX - hintEl.offsetWidth - 2;
			if (offsetY + hintEl.offsetHeight > table.offsetHeight) offsetY -= hintEl.offsetHeight + 15;
		} else {
			opacity = 0;
		}
		setHint({
			description: record.description,
			dist: prettyMoney(dist),
			top: offsetY,
			left: offsetX,
			opacity: opacity,
		});
	}

	return (
		<div className={board.board}>
			<div className={board.title}>Вызовы</div>
			<div className={board.table} ref={tableRef} onMouseLeave={function () { setHint(null); }}>
				<div className={board.head}>
					<div className={board.headCell + ' ' + board.first} onClick={function () { onSort('num'); }}>
						<div>Км</div>
						<SortIcon on={calls.sortMod.mod === 'num'} />
					</div>
					<div className={board.headCell} onClick={function () { onSort('name'); }}>
						<div>Имя и фамилия</div>
						<SortIcon on={calls.sortMod.mod === 'name'} />
					</div>
					<div className={board.headCell}>Причина вызова</div>
					<div className={board.headCell}>Действие</div>
				</div>
				<div className={board.body}>
					{sorted.map(function (record: CallRecord, index: number) {
						const dist = readDistance(record);
						return (
							<div
								key={record.id != null ? record.id : index}
								data-record="1"
								className={board.record}
								onMouseMove={function (event) { onMove(event, record); }}
								onMouseOut={function () { setHint(null); }}
							>
								<div className={board.first + ' ' + styles.cell}>
									<div className={board.align}>{(dist / 1000).toFixed(1)}</div>
								</div>
								<div className={styles.cell}>
									<div className={board.align}>{record.name}({dist})</div>
								</div>
								<div className={styles.cell}>
									<div className={board.align}>{textSplice(record.description, 25)}</div>
								</div>
								<div className={styles.cell}>
									<div
										className={board.align + ' ' + board.btn + ' ' + styles.accept}
										onClick={function () {
											showLoad();
											calls.accept(record);
										}}
									>
										Принять
									</div>
								</div>
							</div>
						);
					})}
				</div>
				{hint ? (
					<div
						ref={hintRef}
						className={styles.hint}
						style={{ top: hint.top + 'px', left: hint.left + 'px', opacity: hint.opacity }}
					>
						<div className={styles.hintHead}>
							<img src={road} alt="" /> {hint.dist} м
						</div>
						{hint.description}
					</div>
				) : null}
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

export default memo(Calls);
