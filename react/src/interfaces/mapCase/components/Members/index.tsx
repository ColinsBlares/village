import React, { memo, useRef, useState } from 'react';
import { getFactionData } from '../../data';
import { mapCaseSvgPaths } from '../../svgPaths';
import { MemberRecord, sortByKey } from '../../data/factories';
import { showLoad, showVerification, useMapCaseStore } from '../../store';
import board from '../board.module.css';
import styles from './index.module.css';

function Members() {
	const type = useMapCaseStore(state => state.type);
	const tick = useMapCaseStore(state => state.tick);
	const bodyRef = useRef<HTMLDivElement>(null);
	const [modalShow, setModalShow] = useState(false);
	const [currentId, setCurrentId] = useState<number | null>(null);
	const [lastUsed, setLastUsed] = useState<MemberRecord | null>(null);
	const [modalTop, setModalTop] = useState('0px');
	void tick;

	const data = getFactionData(type);
	const members = data ? data.windowsData.members : null;
	if (!members) return null;

	const sorted = sortByKey(members.list, members.sortMod.mod);
	if (members.sortMod.mod === 'rank') sorted.reverse();

	function hideModal(event: React.MouseEvent<HTMLDivElement>) {
		const target = event.target as HTMLElement;
		if (target.closest('[data-action]')) return;
		setModalShow(false);
		setCurrentId(null);
	}

	function showModal(event: React.MouseEvent<HTMLDivElement>, record: MemberRecord) {
		const row = (event.currentTarget as HTMLElement).closest('[data-row]') as HTMLElement | null;
		const body = bodyRef.current;
		setCurrentId(record.id);
		setLastUsed(record);
		setModalShow(true);
		if (!row || !body) return;
		const offsetTop = row.offsetTop;
		const height = row.clientHeight;
		const scrollTop = body.scrollTop;
		const parentHeight = body.clientHeight;
		const modalHeight = window.innerHeight * 0.09;
		const compOffsetTop = offsetTop + height - scrollTop;
		const top = compOffsetTop > parentHeight * 1.25 ? offsetTop - modalHeight - scrollTop : compOffsetTop;
		setModalTop(top + 'px');
	}

	function acceptDismiss() {
		if (!lastUsed) return;
		showLoad();
		members.dismiss(lastUsed);
	}

	function acceptLower() {
		if (!lastUsed) return;
		showLoad();
		members.lowerRank(lastUsed);
	}

	function acceptRaise() {
		if (!lastUsed) return;
		showLoad();
		members.raiseRank(lastUsed);
	}

	return (
		<div className={board.board + ' members'}>
			<div className={board.title}>Список сотрудников</div>
			<div className={board.table} onClick={hideModal}>
				<div className={board.head}>
					<div className={board.headCell + ' ' + board.first} onClick={function () { members.sortMod.update('num'); }}>
						<div>#</div>
						<SortIcon on={members.sortMod.mod === 'num'} />
					</div>
					<div className={board.headCell} onClick={function () { members.sortMod.update('name'); }}>
						<div>Имя и фамилия</div>
						<SortIcon on={members.sortMod.mod === 'name'} />
					</div>
					<div className={board.headCell} onClick={function () { members.sortMod.update('rank'); }}>
						<div>{members.rankHead}</div>
						<SortIcon on={members.sortMod.mod === 'rank'} />
					</div>
					<div className={board.headCell}>Действие</div>
				</div>
				<div ref={bodyRef} className={board.body} onScroll={function () { setModalShow(false); setCurrentId(null); }}>
					{sorted.map(function (record: MemberRecord) {
						const focused = currentId === record.id;
						return (
							<div
								key={record.id}
								data-row="1"
								className={focused ? board.record + ' ' + board.recordOn + ' ' + styles.row + ' ' + styles.rowOn : board.record + ' ' + styles.row}
								style={{ pointerEvents: currentId !== null ? 'none' : 'auto' }}
							>
								<div className={board.first}>
									<div className={board.align}>{record.num}</div>
								</div>
								<div>
									<div className={board.align}>{record.name}</div>
								</div>
								<div>
									<div className={board.align}>{members.ranks[record.rank - 1]}</div>
								</div>
								<div>
									<div
										data-action="1"
										className={board.align + ' ' + board.btn + ' ' + styles.btn}
										onClick={function (event) { showModal(event, record); }}
									>
										Действие
										<svg className={styles.chevron} viewBox="0 0 12 6">
											<path d="M1 1L5.3753 4.50024C5.74052 4.79242 6.25948 4.79242 6.6247 4.50024L11 1" />
										</svg>
									</div>
								</div>
							</div>
						);
					})}
				</div>
				{modalShow ? (
					<div className={styles.modal} style={{ top: modalTop }}>
						<div className={styles.modalBtn} onClick={function () {
							showVerification('Вы действительно хотите повысить <br /><span>' + (lastUsed ? lastUsed.name : '') + '</span>?', acceptRaise);
						}}>Повысить</div>
						<div className={styles.modalBtn} onClick={function () {
							showVerification('Вы действительно хотите понизить <br /><span>' + (lastUsed ? lastUsed.name : '') + '</span>?', acceptLower);
						}}>Понизить</div>
						<div className={styles.modalBtn} onClick={function () {
							showVerification('Вы действительно хотите уволить <br /><span>' + (lastUsed ? lastUsed.name : '') + '</span>?', acceptDismiss);
						}}>Уволить</div>
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

export default memo(Members);
