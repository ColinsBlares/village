import React, { memo } from 'react';
import { usePhoneOsStore } from '../store';
import { categories, storeEntries, type StoreEntry } from './catalog';
import GetButton from './GetButton';
import styles from './index.module.css';
import { closeDetail, openDetail, setStoreQuery, setStoreTab, useStoreApp, type StoreTab } from './store';

function Row({ item }: { item: StoreEntry }) {
	return (
		<button
			type="button"
			className={styles.row}
			onClick={function () {
				openDetail(item.key);
			}}
		>
			<img src={item.icon} alt="" draggable={false} />
			<span className={styles.meta}>
				<strong>{item.name}</strong>
				<span>{item.subtitle}</span>
			</span>
			<GetButton appKey={item.key} appId={item.id} />
		</button>
	);
}

const MemoRow = memo(Row);

function Today() {
	const featured = storeEntries.filter(function (item) {
		return item.featured;
	});
	const rest = storeEntries.filter(function (item) {
		return !item.featured;
	});

	return (
		<div className={styles.screen}>
			<h1 className={styles.title}>Сегодня</h1>
			<div className={styles.scroll}>
				{featured.map(function (item) {
					return (
						<button
							key={item.key}
							type="button"
							className={styles.feature}
							onClick={function () {
								openDetail(item.key);
							}}
						>
							<div className={styles.featureTop}>
								<img src={item.icon} alt="" draggable={false} />
								<span>
									<strong>{item.name}</strong>
									<em>{item.category}</em>
								</span>
								<GetButton appKey={item.key} appId={item.id} />
							</div>
							<p>{item.about}</p>
						</button>
					);
				})}
				<h2 className={styles.section}>Можно загрузить</h2>
				{rest.slice(0, 5).map(function (item) {
					return <MemoRow key={item.key} item={item} />;
				})}
			</div>
		</div>
	);
}

const MemoToday = memo(Today);

function Catalog() {
	return (
		<div className={styles.screen}>
			<h1 className={styles.title}>Приложения</h1>
			<div className={styles.scroll}>
				{categories.map(function (category) {
					const items = storeEntries.filter(function (item) {
						return item.category === category;
					});
					if (!items.length) {
						return null;
					}
					return (
						<div key={category}>
							<h2 className={styles.section}>{category}</h2>
							{items.map(function (item) {
								return <MemoRow key={item.key} item={item} />;
							})}
						</div>
					);
				})}
			</div>
		</div>
	);
}

const MemoCatalog = memo(Catalog);

function Search() {
	const query = useStoreApp(state => state.query);
	const needle = query.trim().toLowerCase();
	const items = storeEntries.filter(function (item) {
		if (!needle) {
			return true;
		}
		return (item.name + ' ' + item.subtitle + ' ' + item.category).toLowerCase().indexOf(needle) >= 0;
	});

	return (
		<div className={styles.screen}>
			<div className={styles.search}>
				<input
					value={query}
					placeholder="Поиск"
					onChange={function (event) {
						setStoreQuery(event.target.value);
					}}
				/>
			</div>
			<div className={styles.scroll}>
				{items.map(function (item) {
					return <MemoRow key={item.key} item={item} />;
				})}
				{items.length ? null : <p className={styles.empty}>Ничего не нашлось</p>}
			</div>
		</div>
	);
}

const MemoSearch = memo(Search);

function Detail() {
	const detailKey = useStoreApp(state => state.detailKey);
	const item = storeEntries.find(function (entry) {
		return entry.key === detailKey;
	});
	if (!item) {
		return null;
	}

	return (
		<div className={styles.screen}>
			<div className={styles.bar}>
				<button type="button" className={styles.link} onClick={closeDetail}>
					Назад
				</button>
			</div>
			<div className={styles.scroll}>
				<div className={styles.hero}>
					<img src={item.icon} alt="" draggable={false} />
					<div>
						<h1>{item.name}</h1>
						<p>{item.subtitle}</p>
						<GetButton appKey={item.key} appId={item.id} />
					</div>
				</div>
				<p className={styles.about}>{item.about}</p>
				<div className={styles.facts}>
					<span>
						<em>Категория</em>
						<strong>{item.category}</strong>
					</span>
					<span>
						<em>Размер</em>
						<strong>18 МБ</strong>
					</span>
					<span>
						<em>Возраст</em>
						<strong>4+</strong>
					</span>
				</div>
			</div>
		</div>
	);
}

const MemoDetail = memo(Detail);

const tabs: { id: StoreTab; label: string }[] = [
	{ id: 'today', label: 'Сегодня' },
	{ id: 'apps', label: 'Приложения' },
	{ id: 'search', label: 'Поиск' },
];

function Tabs() {
	const tab = useStoreApp(state => state.tab);
	return (
		<div className={styles.tabs}>
			{tabs.map(function (item) {
				const on = item.id === tab;
				return (
					<button
						key={item.id}
						type="button"
						className={styles.tab + (on ? ' ' + styles.tabOn : '')}
						onClick={function () {
							setStoreTab(item.id);
						}}
					>
						{item.label}
					</button>
				);
			})}
		</div>
	);
}

const MemoTabs = memo(Tabs);

function AppStore() {
	const theme = usePhoneOsStore(state => state.theme);
	const detailKey = useStoreApp(state => state.detailKey);
	const tab = useStoreApp(state => state.tab);

	return (
		<div className={styles.root} data-theme={theme}>
			{detailKey ? <MemoDetail /> : null}
			{!detailKey && tab === 'today' ? <MemoToday /> : null}
			{!detailKey && tab === 'apps' ? <MemoCatalog /> : null}
			{!detailKey && tab === 'search' ? <MemoSearch /> : null}
			{detailKey ? null : <MemoTabs />}
		</div>
	);
}

export default memo(AppStore);
