import React, { memo, useMemo, useState } from 'react';
import styles from './AdminPanel.module.css';
import {
	closeAdminPanel,
	setAdminPanelTab,
	useAdminPanelStore,
} from '../store';

const TABS = [
	{ id: 'commands', title: 'Команды' },
	{ id: 'players', title: 'Управление игроками' },
	{ id: 'reports', title: 'Чаты с игроками' },
];

type PlayerAction = {
	command: string;
	title: string;
	args?: string;
	placeholder?: string;
};

const PLAYER_ACTION_GROUPS: Array<{ title: string; actions: PlayerAction[] }> = [
	{
		title: 'Телепорт и здоровье',
		actions: [
			{ command: '/goto', title: 'Телепортироваться к игроку' },
			{ command: '/gethere', title: 'Телепортировать игрока к себе' },
			{ command: '/sethp', title: 'Изменить здоровье', placeholder: 'Здоровье (0–100)' },
		],
	},
	{
		title: 'Деньги',
		actions: [
			{ command: '/addcash', title: 'Выдать наличные', placeholder: 'Сумма' },
			{ command: '/addmoney', title: 'Пополнить счёт', placeholder: 'Сумма' },
			{ command: '/removecash', title: 'Забрать наличные', placeholder: 'Сумма' },
			{ command: '/removemoney', title: 'Снять со счёта', placeholder: 'Сумма' },
		],
	},
	{
		title: 'Наказания',
		actions: [
			{ command: '/mute', title: 'Выдать мут', placeholder: 'Минуты и причина' },
			{ command: '/kick', title: 'Кикнуть игрока', placeholder: 'Причина' },
			{ command: '/warn', title: 'Выдать варн', placeholder: 'Причина' },
			{ command: '/ban', title: 'Забанить игрока', placeholder: 'Дни и причина' },
			{ command: '/jail', title: 'Посадить в тюрьму', placeholder: 'Минуты и причина' },
			{ command: '/unwarn', title: 'Снять все варны' },
		],
	},
	{
		title: 'Водительские лицензии',
		actions: [
			{ command: '/licensegive', title: 'Выдать: автомобиль', args: 'car' },
			{ command: '/licensegive', title: 'Выдать: пассажирский транспорт', args: 'passenger' },
			{ command: '/licensegive', title: 'Выдать: мотоцикл', args: 'bike' },
			{ command: '/licensegive', title: 'Выдать: грузовой транспорт', args: 'truck' },
			{ command: '/licensegive', title: 'Выдать: воздушный транспорт', args: 'air' },
			{ command: '/licensegive', title: 'Выдать: водный транспорт', args: 'boat' },
			{ command: '/licenseremove', title: 'Забрать: автомобиль', args: 'car' },
			{ command: '/licenseremove', title: 'Забрать: пассажирский транспорт', args: 'passenger' },
			{ command: '/licenseremove', title: 'Забрать: мотоцикл', args: 'bike' },
			{ command: '/licenseremove', title: 'Забрать: грузовой транспорт', args: 'truck' },
			{ command: '/licenseremove', title: 'Забрать: воздушный транспорт', args: 'air' },
			{ command: '/licenseremove', title: 'Забрать: водный транспорт', args: 'boat' },
			{ command: '/pgivelic', title: 'Выдать лицензию на оружие' },
			{ command: '/gunlicenseremove', title: 'Забрать лицензию на оружие' },
		],
	},
];

function dateText(value: any) {
	if (!value) return '—';
	const date = new Date(value);
	return isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function notify(text: string) {
	const notifications = (window as any).notifications;
	if (notifications && notifications.push) notifications.push('error', text);
}

function AdminPanel() {
	const show = useAdminPanelStore(state => state.show);
	const data = useAdminPanelStore(state => state.data);
	const activeTab = useAdminPanelStore(state => state.activeTab);
	const auditData = useAdminPanelStore(state => state.auditData);
	const historyData = useAdminPanelStore(state => state.historyData);
	const [commandSearch, setCommandSearch] = useState('');
	const [selectedCommand, setSelectedCommand] = useState('');
	const [commandArgs, setCommandArgs] = useState('');
	const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
	const [playerSearch, setPlayerSearch] = useState('');
	const [selectedPlayerAction, setSelectedPlayerAction] = useState<PlayerAction | null>(null);
	const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
	const [showClosedReports, setShowClosedReports] = useState(false);
	const [reportMessage, setReportMessage] = useState('');
	const [reportResolution, setReportResolution] = useState('');
	const [reportNote, setReportNote] = useState('');
	const [playerNote, setPlayerNote] = useState('');
	const [staffNote, setStaffNote] = useState('');
	const [staffCharacterId, setStaffCharacterId] = useState('');
	const [staffLevel, setStaffLevel] = useState('1');
	const [historyId, setHistoryId] = useState('');
	const [auditSearch, setAuditSearch] = useState('');
	const [auditTargetId, setAuditTargetId] = useState('');
	const [selectedAudit, setSelectedAudit] = useState<any>(null);
	const [confirm, setConfirm] = useState<{ title: string; action: () => void } | null>(null);

	const commands = Array.isArray(data.commands) ? data.commands : [];
	const players = Array.isArray(data.players) ? data.players : [];
	const staff = Array.isArray(data.staff) ? data.staff : [];
	const reports = Array.isArray(data.reports) ? data.reports : [];
	const notifications = Array.isArray(data.notifications) ? data.notifications : [];
	const notes = Array.isArray(data.notes) ? data.notes : [];
	const selectedPlayer = players.find((player: any) => player.id === selectedPlayerId) || null;
	const visibleReports = reports.filter((report: any) => showClosedReports ? report.status === 'closed' : report.status === 'open');
	const selectedReport = visibleReports.find((report: any) => report.id === selectedReportId) || visibleReports[0] || null;
	const selectedCommandData = commands.find((command: any) => command.name === selectedCommand) || commands[0] || null;
	const filteredPlayers = useMemo(function () {
		const query = playerSearch.trim().toLowerCase();
		if (!query) return players;
		return players.filter((player: any) =>
			`${player.id} ${player.characterId} ${player.name}`.toLowerCase().includes(query),
		);
	}, [players, playerSearch]);

	const filteredCommands = useMemo(function () {
		const query = commandSearch.trim().toLowerCase();
		if (!query) return commands;
		return commands.filter((command: any) =>
			`${command.name} ${command.description} ${command.args}`.toLowerCase().includes(query),
		);
	}, [commands, commandSearch]);

	function sendCommand(commandName: string, rawArgs: string) {
		const command = commands.find((item: any) => item.name === commandName);
		if (!command) return notify('Выберите доступную команду');
		const args = rawArgs.trim().split(/\s+/).filter(Boolean);
		const run = function () {
			mp.trigger('callRemote', 'admin.panel.execute', JSON.stringify({ command: commandName, args }));
			setConfirm(null);
			window.setTimeout(function () {
				mp.trigger('callRemote', 'admin.panel.load');
			}, 500);
		};
		if (/ban|warn|donate|cash|money|admin|veh|house|biz|property|mass|off|kick|jail|license|teleport/i.test(commandName)) {
			setConfirm({
				title: `Подтвердите команду ${commandName}${rawArgs ? ` ${rawArgs}` : ''}`,
				action: run,
			});
		} else {
			run();
		}
	}

	function selectCommand(name: string, usePlayer: boolean) {
		setSelectedCommand(name);
		const target = usePlayer && selectedPlayer ? String(selectedPlayer.id) : '';
		setCommandArgs(target);
	}

	function runPlayerAction() {
		if (!selectedPlayer || !selectedPlayerAction) return;
		sendCommand(
			selectedPlayerAction.command,
			`${selectedPlayer.id} ${commandArgs}`.trim(),
		);
	}

	function searchAudit() {
		mp.trigger('callRemote', 'admin.panel.audit', JSON.stringify({
			search: auditSearch,
			targetCharacterId: auditTargetId,
		}));
	}

	function loadHistory() {
		if (!historyId.trim()) return notify('Введите ID персонажа');
		mp.trigger('callRemote', 'admin.panel.history', historyId.trim());
	}

	function sendReportReply() {
		if (!selectedReport || !reportMessage.trim()) return;
		mp.trigger('callRemote', 'admin.panel.report.reply', JSON.stringify({
			reportId: selectedReport.id,
			message: reportMessage.trim(),
		}));
		setReportMessage('');
		window.setTimeout(function () { mp.trigger('callRemote', 'admin.panel.load'); }, 400);
	}

	function updateReport(action: string) {
		if (!selectedReport) return;
		const resolution = reportResolution.trim();
		if (action === 'close' && (!resolution || resolution.length > 300)) {
			return notify('Укажите результат рассмотрения (до 300 символов)');
		}
		const run = function () {
			mp.trigger('callRemote', 'admin.panel.report.update', JSON.stringify({
				reportId: selectedReport.id,
				action,
				resolution,
			}));
			window.setTimeout(function () { mp.trigger('callRemote', 'admin.panel.load'); }, 400);
			if (action === 'close') setReportResolution('');
			setConfirm(null);
		};
		if (action === 'close') {
			setConfirm({
				title: `Закрыть жалобу #${selectedReport.id} с результатом: ${resolution}`,
				action: run,
			});
		} else {
			run();
		}
	}

	function addNote(note: string, params: any) {
		if (!note.trim()) return notify('Введите текст заметки');
		mp.trigger('callRemote', 'admin.panel.note.add', JSON.stringify({ ...params, note: note.trim() }));
		setPlayerNote('');
		setReportNote('');
		setStaffNote('');
		window.setTimeout(function () { mp.trigger('callRemote', 'admin.panel.load'); }, 400);
	}

	function updateStaff() {
		const characterId = Number(staffCharacterId);
		const level = Number(staffLevel);
		if (!Number.isInteger(characterId) || characterId <= 0 || !Number.isInteger(level) || level < 0 || level > 5) {
			return notify('Укажите ID персонажа и уровень от 0 до 5');
		}
		const run = function () {
			mp.trigger('callRemote', 'admin.panel.staff.update', JSON.stringify({ characterId, level }));
			window.setTimeout(function () { mp.trigger('callRemote', 'admin.panel.load'); }, 500);
		};
		setConfirm({
			title: `${level === 0 ? 'Снять права администратора' : `Назначить ${level} уровень`} для персонажа #${characterId}?`,
			action: run,
		});
	}

	function updateNotification(notificationId: number, action: string) {
		mp.trigger('callRemote', 'admin.panel.notification.update', JSON.stringify({ notificationId, action }));
		window.setTimeout(function () { mp.trigger('callRemote', 'admin.panel.load'); }, 400);
	}

	function reportMessages() {
		if (!selectedReport) return [];
		return (data.reportMessages || []).filter((message: any) => message.reportId === selectedReport.id);
	}

	if (!show) return null;

	return (
		<div className={styles.overlay}>
			<div className={styles.window}>
				<header className={styles.header}>
					<div>
						<div className={styles.title}>Центр администрации</div>
						<div className={styles.subtitle}>{data.self && data.self.name} · {data.self && data.self.level} уровень · обработано жалоб: {data.self && data.self.processedReports || 0}</div>
					</div>
					<div className={styles.headerActions}>
						<button onClick={function () { mp.trigger('callRemote', 'admin.panel.load'); }}>Обновить</button>
						<button className={styles.close} onClick={closeAdminPanel}>Закрыть ×</button>
					</div>
				</header>
				<div className={styles.layout}>
					<nav className={styles.nav}>
						{TABS.map(function (tab) {
							const className = activeTab === tab.id ? styles.navItem + ' ' + styles.active : styles.navItem;
							return <button key={tab.id} className={className} onClick={function () { setAdminPanelTab(tab.id); }}>{tab.title}</button>;
						})}
					</nav>
					<main className={styles.content}>
						{activeTab === 'commands' ? (
							<section>
								<h2>Поиск административных команд</h2>
								<input value={commandSearch} onChange={event => setCommandSearch(event.target.value)} placeholder="Команда, описание или параметр" />
								<div className={styles.commandLayout}>
									<div className={styles.list}>
										{filteredCommands.map((command: any) => (
											<button key={command.name} className={selectedCommandData && command.name === selectedCommandData.name ? styles.selected : ''} onClick={function () { selectCommand(command.name, false); }}>
												<strong>{command.name}</strong><span>{command.description}</span>
											</button>
										))}
									</div>
									<div className={styles.detail}>
										{selectedCommandData ? (
											<>
												<h3>{selectedCommandData.name}</h3>
												<p>{selectedCommandData.description}</p>
												<div className={styles.muted}>Доступ: {selectedCommandData.access} уровень · {selectedCommandData.args || 'без параметров'}</div>
												<label>Параметры команды<input value={commandArgs} onChange={event => setCommandArgs(event.target.value)} placeholder={selectedCommandData.args || 'Параметры'} /></label>
												<button className={styles.primary} onClick={function () { sendCommand(selectedCommandData.name, commandArgs); }}>Выполнить</button>
											</>
										) : <div className={styles.muted}>Для вашего уровня нет доступных команд.</div>}
									</div>
								</div>
							</section>
						) : null}

						{activeTab === 'players' ? (
							<section>
								<h2>Управление игроками онлайн</h2>
								<div className={styles.split}>
									<div className={styles.list}>
										<input
											value={playerSearch}
											onChange={event => setPlayerSearch(event.target.value)}
											placeholder="Поиск по имени или ID"
										/>
										{filteredPlayers.map((player: any) => (
											<button key={player.id} className={player.id === selectedPlayerId ? styles.selected : ''} onClick={function () {
												setSelectedPlayerId(player.id);
												setStaffCharacterId(String(player.characterId));
												setSelectedPlayerAction(null);
												setCommandArgs('');
											}}>
												<strong>#{player.id} · {player.name}</strong>
												<span>Персонаж #{player.characterId} · ${player.cash} наличными · ${player.bank} в банке{player.admin ? ` · администратор ${player.admin} ур.` : ''}</span>
											</button>
										))}
									</div>
									<div className={styles.detail}>
										{selectedPlayer ? (
											<>
												<div className={styles.profileHeader}>
													<div>
														<h3>{selectedPlayer.name} <small>(ID {selectedPlayer.id})</small></h3>
														<p>Персонаж #{selectedPlayer.characterId} · организация #{selectedPlayer.factionId || '—'}</p>
													</div>
													<div className={styles.profileStats}>
														<span>Наличные <strong>${selectedPlayer.cash}</strong></span>
														<span>Банк <strong>${selectedPlayer.bank}</strong></span>
														<span>Варны <strong>{selectedPlayer.warnNumber}</strong></span>
														<span>Розыск <strong>{selectedPlayer.wanted}</strong></span>
														<span>Арест <strong>{selectedPlayer.arrestTime ? `${Math.ceil(selectedPlayer.arrestTime / 60000)} мин.` : 'нет'}</strong></span>
													</div>
												</div>
												<h3>Лицензии</h3>
												<div className={styles.licenseList}>
													{[
														['car', 'Автомобиль'],
														['passenger', 'Пассажирский транспорт'],
														['bike', 'Мотоцикл'],
														['truck', 'Грузовой транспорт'],
														['air', 'Воздушный транспорт'],
														['boat', 'Водный транспорт'],
														['weapon', 'Оружие'],
													].map((license: any[]) => (
														<span key={license[0]} className={selectedPlayer.licenses && selectedPlayer.licenses[license[0]] ? styles.licenseOwned : ''}>
															{license[1]} · {selectedPlayer.licenses && selectedPlayer.licenses[license[0]] ? 'есть' : 'нет'}
														</span>
													))}
												</div>
												<h3>Быстрое управление</h3>
												<div className={styles.actionGroups}>
													{PLAYER_ACTION_GROUPS.map(group => {
														const availableActions = group.actions.filter(action =>
															commands.some((command: any) => command.name === action.command),
														);
														if (!availableActions.length) return null;
														return (
															<div className={styles.actionGroup} key={group.title}>
																<strong>{group.title}</strong>
																<div className={styles.actionButtons}>
																	{availableActions.map((action: PlayerAction) => (
																		<button
																			key={`${action.command}-${action.args || action.title}`}
																			className={selectedPlayerAction === action ? styles.selected : ''}
																			onClick={function () {
																				setSelectedPlayerAction(action);
																				setCommandArgs(action.args || '');
																			}}
																		>
																			{action.title}
																		</button>
																	))}
																</div>
															</div>
														);
													})}
												</div>
												{selectedPlayerAction ? (
													<div className={styles.playerActionForm}>
														<strong>{selectedPlayerAction.title} · {selectedPlayerAction.command}</strong>
														{selectedPlayerAction.placeholder ? (
															<label>Параметры<input
																value={commandArgs}
																onChange={event => setCommandArgs(event.target.value)}
																placeholder={selectedPlayerAction.placeholder}
															/></label>
														) : null}
														<button className={styles.primary} onClick={runPlayerAction}>
															Выполнить для {selectedPlayer.name}
														</button>
													</div>
												) : <div className={styles.muted}>Выберите действие. Доступные операции зависят от вашего уровня администратора.</div>}
												<div className={styles.muted}>Полная библиотека команд доступна во вкладке «Команды».</div>
											</>
										) : <div className={styles.muted}>Выберите игрока для просмотра и управления.</div>}
									</div>
								</div>
							</section>
						) : null}

						{activeTab === 'staff' ? (
							<section>
								<h2>Состав администрации</h2>
								<div className={styles.split}>
									<div className={styles.list}>
										{staff.map((member: any) => (
											<button key={member.id} className={String(member.id) === staffCharacterId ? styles.selected : ''} onClick={function () {
												setStaffCharacterId(String(member.id));
												setStaffLevel(String(member.admin));
											}}>
												<strong>#{member.id} · {member.name}</strong><span>{member.admin} уровень · {member.minutes} мин. · действия: {member.recentActions} · открытые дела: {member.assignedReports} · закрытые: {member.processedReports}</span>
											</button>
										))}
									</div>
									<div className={styles.detail}>
										<p>Изменять состав может только администратор 6 уровня. Свой уровень и уровень равного/старшего администратора менять нельзя.</p>
										<label>ID персонажа<input value={staffCharacterId} onChange={event => setStaffCharacterId(event.target.value)} /></label>
										<label>Новый уровень<select value={staffLevel} onChange={event => setStaffLevel(event.target.value)}>
											<option value="0">0 — снять права</option>
											<option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option>
										</select></label>
										<button className={styles.primary} onClick={updateStaff}>Изменить состав</button>
										<label>Заметка о сотруднике<textarea value={staffNote} onChange={event => setStaffNote(event.target.value)} maxLength={512} /></label>
										<button onClick={function () { addNote(staffNote, { staffCharacterId: Number(staffCharacterId) }); }}>Сохранить заметку</button>
										<div className={styles.notes}>
											{notes.filter((note: any) => note.staffCharacterId === Number(staffCharacterId)).map((note: any) => <p key={note.id}>{note.authorName}: {note.note} <small>{dateText(note.createdAt)}</small></p>)}
										</div>
									</div>
								</div>
							</section>
						) : null}

						{activeTab === 'reports' ? (
							<section>
								<h2>Жалобы и модерация</h2>
								<div className={styles.reportToolbar}>
									<span>{showClosedReports ? 'Последние закрытые жалобы' : `Активные жалобы · ${reports.filter((report: any) => report.status === 'open').length}`}</span>
									<button onClick={function () { setShowClosedReports(!showClosedReports); setSelectedReportId(null); }}>
										{showClosedReports ? 'Показать активные' : 'Показать закрытые'}
									</button>
								</div>
								<div className={styles.split}>
									<div className={styles.list}>
										{visibleReports.map((report: any) => (
											<button key={report.id} className={selectedReport && report.id === selectedReport.id ? styles.selected : ''} onClick={function () {
												setSelectedReportId(report.id);
												setReportResolution('');
											}}>
												<strong>#{report.id} · {report.playerName}</strong>
												<span>{report.status === 'open' ? 'Активна' : 'Закрыта'} · {report.assignedAdminName ? `в работе: ${report.assignedAdminName} · ` : ''}{dateText(report.createdAt)}</span>
											</button>
										))}
										{visibleReports.length === 0 ? <div className={styles.muted}>{showClosedReports ? 'Закрытых жалоб пока нет.' : 'Активных жалоб нет.'}</div> : null}
									</div>
									<div className={styles.detail}>
										{selectedReport ? (
											<>
												<h3>Жалоба #{selectedReport.id} · {selectedReport.playerName}</h3>
												<p>Персонаж #{selectedReport.playerCharacterId} · создана {dateText(selectedReport.createdAt)}</p>
												{selectedReport.assignedAdminName ? <p>Ответственный: {selectedReport.assignedAdminName}</p> : <p>Жалоба ещё не принята в работу.</p>}
												{selectedReport.evidenceUrl ? (
													<p>Доказательства: {/^https?:\/\//i.test(selectedReport.evidenceUrl) ?
														<a className={styles.evidenceLink} href={selectedReport.evidenceUrl} target="_blank" rel="noreferrer">{selectedReport.evidenceUrl}</a> :
														<span>{selectedReport.evidenceUrl}</span>}</p>
												) : <p className={styles.muted}>Доказательства не приложены.</p>}
												<div className={styles.chat}>
													{reportMessages().map((message: any) => <div key={message.id} className={message.authorAdmin ? styles.adminMessage : styles.playerMessage}>
														<strong>{message.authorName}</strong><span>{message.message}</span><small>{dateText(message.createdAt)}</small>
													</div>)}
												</div>
												{selectedReport.status === 'open' ? (
													<>
														<div className={styles.reportActions}>
															{selectedReport.assignedAdminCharacterId === data.self.characterId ? (
																<span>Жалоба закреплена за вами.</span>
															) : selectedReport.assignedAdminCharacterId ? (
																<span>Жалобу обрабатывает {selectedReport.assignedAdminName || 'другой администратор'}.</span>
															) : (
																<button className={styles.primary} onClick={function () { updateReport('claim'); }}>Принять в работу</button>
															)}
															<button disabled={Number(data.self && data.self.level) < 2} onClick={function () {
																mp.trigger('callRemote', 'admin.panel.report.goto', String(selectedReport.id));
															}}>Телепортироваться к заявителю</button>
														</div>
														{selectedReport.assignedAdminCharacterId === data.self.characterId ? <>
															<label>Ответ игроку<textarea value={reportMessage} onChange={event => setReportMessage(event.target.value)} maxLength={512} /></label>
															<button className={styles.primary} onClick={sendReportReply} disabled={!reportMessage.trim()}>Ответить</button>
															<label>Результат рассмотрения<textarea value={reportResolution} onChange={event => setReportResolution(event.target.value)} maxLength={300} placeholder="Опишите итог и принятые меры" /></label>
															<div className={styles.row}>
																<button onClick={function () { updateReport('close'); }} disabled={!reportResolution.trim()}>Закрыть жалобу</button>
															</div>
														</> : null}
													</>
												) : <div className={styles.resolution}>
													<strong>Результат рассмотрения</strong>
													<p>{selectedReport.resolution || 'Результат не указан.'}</p>
													<span>Закрыта {dateText(selectedReport.closedAt)} · ответственный: {selectedReport.assignedAdminName || 'не указан'}</span>
												</div>}
											</>
										) : <div className={styles.muted}>Новых репортов нет.</div>}
									</div>
								</div>
							</section>
						) : null}

						{activeTab === 'audit' ? (
							<section>
								<h2>Журнал действий администрации</h2>
								<div className={styles.row}>
									<input value={auditSearch} onChange={event => setAuditSearch(event.target.value)} placeholder="Администратор, игрок, команда или причина" />
									<input value={auditTargetId} onChange={event => setAuditTargetId(event.target.value)} placeholder="ID персонажа" />
									<button className={styles.primary} onClick={searchAudit}>Фильтр</button>
								</div>
								<div className={styles.auditList}>
									{auditData.map((action: any) => <button key={action.id} onClick={function () { setSelectedAudit(action); }}>
										<strong>{action.command} · {action.adminName} → {action.targetName || 'без цели'}</strong>
										<span>{dateText(action.date)} · {action.reason || 'причина не указана'} · {action.outcome}</span>
									</button>)}
								</div>
								{selectedAudit ? (
									<div className={styles.actionCard}>
										<button className={styles.closeCard} onClick={function () { setSelectedAudit(null); }}>×</button>
										<h3>Карточка действия #{selectedAudit.id}</h3>
										<p><b>Кто:</b> {selectedAudit.adminName} (#{selectedAudit.adminCharacterId})</p>
										<p><b>Над кем:</b> {selectedAudit.targetName || '—'}{selectedAudit.targetCharacterId ? ` (#${selectedAudit.targetCharacterId})` : ''}</p>
										<p><b>Когда:</b> {dateText(selectedAudit.date)}</p>
										<p><b>Что:</b> {selectedAudit.command}</p>
										<p><b>Причина/параметры:</b> {selectedAudit.reason || '—'}</p>
										<pre>{JSON.stringify(JSON.parse(selectedAudit.details || '{}'), null, 2)}</pre>
									</div>
								) : null}
							</section>
						) : null}

						{activeTab === 'history' ? (
							<section>
								<h2>История игрока</h2>
								<div className={styles.row}>
									<input value={historyId} onChange={event => setHistoryId(event.target.value)} placeholder="ID персонажа" />
									<button className={styles.primary} onClick={loadHistory}>Загрузить карточку</button>
								</div>
								{historyData ? (
									<div className={styles.history}>
										<h3>{historyData.character.name} · персонаж #{historyData.character.id}</h3>
										<p>Аккаунт #{historyData.character.accountId} · создан {dateText(historyData.character.creationDate)} · наличные ${historyData.character.cash}, банк ${historyData.character.bank}</p>
										<p>Варны: {historyData.character.warnNumber} · бан до {dateText(historyData.character.banDate)} · организация #{historyData.character.factionId || '—'} · работа #{historyData.character.job || '—'}</p>
										<h4>Персонажи аккаунта</h4>{historyData.characters.map((item: any) => <div key={item.id}>#{item.id} {item.name} · {dateText(item.creationDate)} · admin {item.admin} · фракция {item.factionId || '—'} · лицензии {item.carLicense ? 'легк. ' : ''}{item.passengerLicense ? 'пасс. ' : ''}{item.bikeLicense ? 'мото ' : ''}{item.truckLicense ? 'груз. ' : ''}{item.airLicense ? 'воздух ' : ''}{item.boatLicense ? 'вода' : ''}</div>)}
										<h4>Наказания и административные действия</h4>{historyData.audits.map((item: any) => <div key={item.id}>{dateText(item.date)} · {item.command} · {item.adminName} · {item.reason || item.details}</div>)}
										<h4>Репорты</h4>{historyData.reports.map((item: any) => <div key={item.id}>#{item.id} · {item.status} · {dateText(item.createdAt)}</div>)}
										<h4>Имущество</h4>
										{historyData.houses.map((item: any) => <div key={`house-${item.id}`}>Дом #{item.id} · ${item.price} · владелец {item.characterNick || '—'}</div>)}
										{historyData.businesses.map((item: any) => <div key={`biz-${item.id}`}>Бизнес #{item.id} {item.name} · ${item.price} · владелец {item.characterNick || '—'}</div>)}
										{historyData.vehicles.map((item: any) => <div key={item.id}>Авто #{item.id} · {item.modelName} · {item.plate} · {item.parkingDate ? 'на парковке' : 'активен'}</div>)}
										<h4>История и заметки</h4>{historyData.logs.map((item: any) => <div key={`log-${item.id}`}>{dateText(item.date)} · {item.text}</div>)}{historyData.notes.map((item: any) => <div key={`note-${item.id}`}>{dateText(item.createdAt)} · {item.authorName}: {item.note}</div>)}
									</div>
								) : <div className={styles.muted}>Введите ID персонажа, чтобы открыть доступную серверу историю.</div>}
							</section>
						) : null}

						{activeTab === 'notifications' ? (
							<section>
								<h2>Центр уведомлений</h2>
								<div className={styles.auditList}>
									{notifications.map((notice: any) => <div key={notice.id} className={styles.notice}>
										<div><strong>{notice.type}</strong> · {dateText(notice.createdAt)}<p>{notice.message}</p><small>{notice.assignedAdminCharacterId ? `Ответственный #${notice.assignedAdminCharacterId}` : 'Ответственный не назначен'}{notice.acknowledgedByCharacterId ? ` · просмотрено #${notice.acknowledgedByCharacterId}` : ''}</small></div>
										<div className={styles.row}>
											<button onClick={function () { updateNotification(notice.id, 'assign'); }}>Назначить мне</button>
											<button onClick={function () { updateNotification(notice.id, 'acknowledge'); }}>Отметить</button>
										</div>
									</div>)}
								</div>
							</section>
						) : null}
					</main>
				</div>
				{confirm ? <div className={styles.confirmBackdrop}>
					<div className={styles.confirm}>
						<h3>Подтверждение опасной операции</h3>
						<p>{confirm.title}</p>
						<div className={styles.row}>
							<button className={styles.primary} onClick={confirm.action}>Подтвердить</button>
							<button onClick={function () { setConfirm(null); }}>Отмена</button>
						</div>
					</div>
				</div> : null}
			</div>
		</div>
	);
}

export default memo(AdminPanel);
