import React, { memo, useRef } from 'react';
import styles from './BattlePass.module.css';
import {
	BattlePassTab,
	claimBattlePassPremiumReward,
	claimBattlePassPremiumTask,
	claimBattlePassReward,
	claimBattlePassTask,
	closeBattlePassCaseResult,
	openBattlePassCase,
	purchaseBattlePassPremium,
	setBattlePassShow,
	setBattlePassTab,
	useBattlePassStore,
} from '../store';

const tabs: Array<{ id: BattlePassTab; label: string }> = [
	{ id: 'tasks', label: 'Задания' },
	{ id: 'rewards', label: 'Награды' },
	{ id: 'top', label: 'Топ игроков' },
];

function formatTaskProgress(task: { metric: string; progress: number; target: number; unit: string }) {
	if (task.metric === 'cashSpent') {
		const progress = Math.floor(task.progress).toLocaleString('ru-RU');
		const target = Math.floor(task.target).toLocaleString('ru-RU');
		return `$${progress} / $${target}`;
	}
	if (task.metric === 'drivenMeters') {
		return `${task.progress.toFixed(1)} / ${task.target.toLocaleString('ru-RU')} ${task.unit}`;
	}
	return `${Math.floor(task.progress)} / ${task.target} ${task.unit}`;
}

function BattlePass() {
	const state = useBattlePassStore();
	const progress = Math.min(100, Math.round((state.points / 500) * 100));
	const unlockedLevel = state.rewards.reduce((level, reward) => (
		reward.unlocked ? Math.max(level, reward.level) : level
	), 0);
	const currentLevel = Math.max(1, unlockedLevel);
	const rewardTrackRef = useRef<HTMLDivElement>(null);
	const isRewardsTab = state.tab === 'rewards';

	return (
		<div className={styles.backdrop}>
			<section className={`${styles.panel} ${styles.panelRewards}`}>
				<header className={`${styles.header} ${styles.headerRewards}`}>
					<div>
						<div className={styles.kicker}>CLASSIC ROLEPLAY • СЕЗОН</div>
						<h1>Боевой пропуск</h1>
						<p className={styles.season}>{state.season}</p>
					</div>
					{isRewardsTab && (
						<div className={styles.levelControls}>
							<div className={styles.currentLevel}>
								<span>ВАШ УРОВЕНЬ</span>
								<strong>{currentLevel}</strong>
							</div>
							<button
								type="button"
								className={styles.scrollButton}
								onClick={() => rewardTrackRef.current?.scrollBy({ left: -360, behavior: 'smooth' })}
								aria-label="Предыдущие награды"
							>
								‹
							</button>
							<button
								type="button"
								className={styles.scrollButton}
								onClick={() => rewardTrackRef.current?.scrollBy({ left: 360, behavior: 'smooth' })}
								aria-label="Следующие награды"
							>
								›
							</button>
						</div>
					)}
					<button
						type="button"
						className={styles.close}
						onClick={() => setBattlePassShow(false)}
						aria-label="Закрыть боевой пропуск"
					>
						×
					</button>
				</header>

				{state.tab === 'tasks' && <div className={`${styles.progressBlock} ${styles.progressBlockSeason}`}>
					<div className={styles.progressLabels}>
						<span>Ваш прогресс</span>
						<strong>{state.points} <small>ОЧКОВ</small></strong>
					</div>
					<div className={styles.progressTrack}>
						<div className={styles.progressValue} style={{ width: progress + '%' }} />
					</div>
					<div className={styles.progressHint}>
						Играйте, выполняйте задания и забирайте награды сезона
					</div>
				</div>}

				<nav className={`${styles.tabs} ${styles.tabsRewards}`}>
					{tabs.map(tab => (
						<button
							type="button"
							key={tab.id}
							className={state.tab === tab.id ? styles.activeTab : ''}
							onClick={() => setBattlePassTab(tab.id)}
						>
							{tab.label}
						</button>
					))}
				</nav>

				<main className={`${styles.content} ${styles.contentRewards}`}>
					{state.loading && <div className={styles.message}>Загружаем данные пропуска...</div>}
					{!state.loading && state.error && <div className={styles.message}>{state.error}</div>}
					{!state.loading && !state.error && state.tab === 'tasks' && (
						<div className={`${styles.taskList} ${styles.taskScreen}`}>
							<div className={`${styles.sectionHeading} ${styles.taskHeading}`}>
								<div>
									<h2>Задания сезона</h2>
									<p>Выполняйте задания и получайте очки боевого пропуска</p>
								</div>
								<div className={styles.taskSummary}>
									<span className={styles.onlineTime}>В игре за сезон: <strong>{state.onlineMinutes} мин.</strong></span>
									<span className={styles.counter}>{state.tasks.filter(task => task.claimed).length}/{state.tasks.length} выполнено</span>
								</div>
							</div>
							<div className={`${styles.taskSectionTitle} ${styles.freeTaskTitle}`}>
								<span>Обычные задания</span><i />
							</div>
							{state.tasks.map(task => {
								const taskProgress = Math.min(100, Math.round((task.progress / task.target) * 100));
								return (
									<article className={styles.taskCard} key={task.id}>
										<div className={styles.taskIcon}>✦</div>
										<div className={styles.taskInfo}>
											<h3>{task.title}</h3>
											<p>{task.description}</p>
											<div className={styles.taskProgress}>
												<div className={styles.progressTrack}>
													<div className={styles.progressValue} style={{ width: taskProgress + '%' }} />
												</div>
												<span>{formatTaskProgress(task)}</span>
											</div>
										</div>
										<div className={styles.taskAction}>
											<span className={styles.points}>+{task.points} очков</span>
											<button
												type="button"
												disabled={!task.completed || task.claimed}
												onClick={() => claimBattlePassTask(task.id)}
											>
												{task.claimed ? 'Выполнено' : task.completed ? 'Забрать' : 'В процессе'}
											</button>
										</div>
									</article>
								);
							})}
							<div className={`${styles.premiumHeading} ${styles.premiumTaskHeading}`}>
								<div>
									<h2>Премиум-задания</h2>
									<p>
										{state.premiumEnabled
											? `Премиум-очки: ${state.premiumPoints} · выполняйте задания, чтобы продвигаться по премиум-ветке`
											: `Откройте премиум-доступ за ${state.premiumPrice} CC`}
									</p>
								</div>
								{!state.premiumEnabled && (
									<button type="button" className={styles.premiumButton} onClick={purchaseBattlePassPremium}>
										Открыть за {state.premiumPrice} CC
									</button>
								)}
							</div>
							{state.premiumTasks.map(task => {
								const taskProgress = Math.min(100, Math.round((task.progress / task.target) * 100));
								return (
									<article
										className={state.premiumEnabled ? styles.premiumTaskCard : styles.premiumTaskLocked}
										key={task.id}
									>
										<div className={styles.taskIcon}>★</div>
										<div className={styles.taskInfo}>
											<h3>{task.title}</h3>
											<p>{task.description}</p>
											<div className={styles.taskProgress}>
												<div className={styles.progressTrack}>
													<div className={styles.progressValue} style={{ width: taskProgress + '%' }} />
												</div>
												<span>{formatTaskProgress(task)}</span>
											</div>
										</div>
										<div className={styles.taskAction}>
											<span className={styles.premiumPoints}>+{task.points} премиум-очков</span>
											<button
												type="button"
												disabled={!state.premiumEnabled || !task.completed || task.claimed}
												onClick={() => claimBattlePassPremiumTask(task.id)}
											>
												{task.claimed ? 'Выполнено' : !state.premiumEnabled ? 'Премиум' : task.completed ? 'Забрать' : 'В процессе'}
											</button>
										</div>
									</article>
								);
							})}
						</div>
					)}
					{!state.loading && !state.error && state.tab === 'rewards' && (
						<div className={styles.rewardScreen}>
							<div className={`${styles.sectionHeading} ${styles.rewardHeading}`}>
								<div>
									<h2>Путь наград</h2>
									<p>Продвигайтесь по уровням и забирайте награды сезона</p>
								</div>
								<div className={styles.rewardActions}>
									<div className={styles.pointsBadge}>
										<strong>{state.points}</strong><span> / 500 очков</span>
									</div>
									{state.premiumEnabled ? (
										<>
											<span className={styles.premiumStatus}>
												ПРЕМИУМ · {state.premiumPoints} очков · кейсов: {state.premiumCases}
											</span>
											{state.premiumCases > 0 && (
												<button
													type="button"
													className={styles.premiumButton}
													disabled={state.caseOpening}
													onClick={openBattlePassCase}
												>
													{state.caseOpening ? 'Открываем...' : `Открыть кейс (${state.premiumCases})`}
												</button>
											)}
										</>
									) : (
										<button type="button" className={styles.premiumButton} onClick={purchaseBattlePassPremium}>
											Открыть премиум · {state.premiumPrice} CC
										</button>
									)}
								</div>
							</div>
							<div className={styles.rewardTracks}>
								<div className={styles.laneLabels} aria-hidden="true">
									<div className={styles.freeLaneLabel}>Обычный</div>
									<div className={styles.laneLabelGap} />
									<div className={styles.premiumLaneLabel}>Премиум</div>
								</div>
								<div className={styles.trackScroller} ref={rewardTrackRef}>
								<div className={styles.rewardTimeline}>
									<div className={styles.trackRail}>
										<div className={styles.trackRailFill} style={{ width: progress + '%' }} />
									</div>
									{state.rewards.map(reward => {
										const premiumReward = state.premiumRewards.find(item => item.level === reward.level);
										return (
											<div className={styles.trackLevel} key={reward.id}>
												<article className={reward.unlocked ? styles.trackFreeCardUnlocked : styles.trackFreeCard}>
													<div className={styles.trackCardLabel}>БЕСПЛАТНАЯ НАГРАДА</div>
													<div className={styles.trackRewardIcon}>$</div>
													<strong>${(reward.cash || 0).toLocaleString('ru-RU')}</strong>
													<span>{reward.requiredPoints} очков</span>
													<button
														type="button"
														disabled={!reward.unlocked || reward.claimed}
														onClick={() => claimBattlePassReward(reward.id)}
													>
														{reward.claimed ? 'Получено' : reward.unlocked ? 'Забрать' : 'Закрыто'}
													</button>
												</article>
												<div className={styles.trackMilestone}>
													<span className={reward.unlocked ? styles.trackNodeReached : styles.trackNode}>
														{reward.unlocked ? '✓' : reward.level}
													</span>
													<strong>УРОВЕНЬ {reward.level}</strong>
													<span>{reward.requiredPoints} очков</span>
												</div>
												{premiumReward && (
													<article className={
														!state.premiumEnabled
															? styles.trackPremiumLocked
															: premiumReward.unlocked
																? styles.trackPremiumCardUnlocked
																: styles.trackPremiumCard
													}>
														<div className={styles.trackCardLabel}>ПРЕМИУМ</div>
														<div className={styles.caseIcon}>CASE</div>
														<strong>Кейс ×{premiumReward.cases}</strong>
														<span>{premiumReward.requiredPoints} очков</span>
														<button
															type="button"
															disabled={!state.premiumEnabled || !premiumReward.unlocked || premiumReward.claimed}
															onClick={() => claimBattlePassPremiumReward(premiumReward.id)}
														>
															{premiumReward.claimed ? 'Получено' : !state.premiumEnabled ? 'Закрыто' : premiumReward.unlocked ? 'Забрать' : 'Закрыто'}
														</button>
													</article>
												)}
											</div>
										);
									})}
								</div>
								</div>
							</div>
							<div className={styles.trackHint}>Прокрутите шкалу или используйте стрелки, чтобы посмотреть уровни</div>
						</div>
					)}
					{!state.loading && !state.error && state.tab === 'top' && (
						<div className={styles.leaderScreen}>
							<div className={`${styles.sectionHeading} ${styles.leaderHeading}`}>
								<div>
									<h2>Топ игроков</h2>
									<p>Лидеры сезона по набранным очкам</p>
								</div>
								<div className={styles.leaderSeasonStats}>
									<span className={styles.onlineTime}>Участников: <strong>{state.leaderboard.length}</strong></span>
									<span className={styles.counter}>Ваше место&nbsp; #{state.rank || '—'}</span>
								</div>
							</div>
							<div className={styles.leaderboard}>
								<div className={styles.leaderTableHeading}>
									<span>МЕСТО</span><span>ИГРОК</span><span>ОЧКИ СЕЗОНА</span>
								</div>
								{state.leaderboard.map((player, index) => (
									<div className={index < 3 ? `${styles.leaderRow} ${styles.leaderPodium}` : styles.leaderRow} key={player.characterId}>
										<span className={index < 3 ? styles.topPosition : styles.position}>
											<span className={styles.rankMedal}>{index < 3 ? ['I', 'II', 'III'][index] : String(index + 1).padStart(2, '0')}</span>
										</span>
										<span className={styles.playerName}>{player.name}</span>
										<strong>{player.points} <small>очков</small></strong>
									</div>
								))}
								{state.leaderboard.length === 0 && (
									<div className={styles.message}>Пока нет участников с набранными очками.</div>
								)}
							</div>
							<div className={styles.yourRank}>
								<span>Ваше место</span>
								<strong>#{state.rank || '—'}</strong>
								<span>{state.points} очков</span>
							</div>
						</div>
					)}
				</main>
				{(state.caseOpening || state.casePrize != null) && (
					<div className={styles.caseOverlay}>
						<section
							className={styles.caseDialog}
							role="dialog"
							aria-modal="true"
							aria-labelledby="battle-pass-case-title"
							aria-live="polite"
						>
							<div className={state.caseOpening ? `${styles.caseStage} ${styles.caseStageOpening}` : `${styles.caseStage} ${styles.caseStageReveal}`}>
								<div className={styles.caseGlow} />
								<div className={styles.caseBox}>
									<span className={styles.caseBoxLock}>✦</span>
									<span className={styles.caseBoxLabel}>PREMIUM</span>
								</div>
								<div className={styles.caseSparkles} aria-hidden="true">✦　·　✧　·　✦</div>
							</div>
							<h2 id="battle-pass-case-title">{state.caseOpening ? 'Открываем кейс' : 'Кейс открыт!'}</h2>
							{state.caseOpening ? (
								<p className={styles.caseMessage}>Внутри может быть что-то ценное...</p>
							) : (
								<>
									<p className={styles.caseMessage}>Ваша награда</p>
									<strong className={styles.casePrizeAmount}>
										${(state.casePrize || 0).toLocaleString('ru-RU')}
									</strong>
									<button type="button" className={styles.caseContinue} onClick={closeBattlePassCaseResult}>
										Продолжить
									</button>
								</>
							)}
						</section>
					</div>
				)}
				<footer className={`${styles.footer} ${styles.footerRewards}`}>
					<span>B</span> открыть или закрыть пропуск
				</footer>
			</section>
		</div>
	);
}

export default memo(BattlePass);
