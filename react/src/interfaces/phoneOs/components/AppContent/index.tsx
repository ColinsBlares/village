import React, { memo } from 'react';
import { family, familyWidget, wallpaper } from '../../apps';
import PhoneApp from '../../phoneApp/PhoneApp';
import AppStore from '../../appStore/AppStore';
import MessagesApp from '../../messagesApp/MessagesApp';
import TaxiApp from '../../taxiApp/TaxiApp';
import { togglePhoneTheme, usePhoneOsStore } from '../../store';
import styles from './index.module.css';

function Row({ title, value }: { title: string; value: string }) {
	return (
		<div className={styles.row}>
			<span>{title}</span>
			<strong>{value}</strong>
		</div>
	);
}

function FamilyBody() {
	return (
		<div className={styles.stack}>
			<img className={styles.banner} src={familyWidget} alt="" draggable={false} />
			<h1 className={styles.heading}>Семья</h1>
			<Row title="Состав" value="6" />
			<Row title="Дом" value="Вайнвуд" />
			<Row title="Баланс" value="$128 400" />
		</div>
	);
}

function FaceTimeBody() {
	return (
		<div className={styles.stack}>
			<h1 className={styles.heading}>FaceTime</h1>
			<Row title="Дом" value="вчера" />
			<Row title="Работа" value="12:40" />
			<Row title="Семья" value="сегодня" />
		</div>
	);
}

function GalleryBody() {
	const shots = [family, familyWidget, wallpaper, family];
	return (
		<div className={styles.stack}>
			<h1 className={styles.heading}>Галерея</h1>
			<div className={styles.photos}>
				{shots.map(function (src, index) {
					return <img key={index} src={src} alt="" draggable={false} />;
				})}
			</div>
		</div>
	);
}

function CameraBody() {
	return (
		<div className={styles.camera}>
			<div className={styles.view} />
			<button type="button" className={styles.shutter} />
		</div>
	);
}

function SettingsBody() {
	const theme = usePhoneOsStore(state => state.theme);
	const dark = theme === 'dark';

	return (
		<div className={styles.stack}>
			<h1 className={styles.heading}>Настройки</h1>
			<Row title="Сотовая связь" value="LTE" />
			<Row title="Wi-Fi" value="Вкл" />
			<Row title="Звуки" value="Громко" />
			<Row title="Экран" value="Авто" />
			<button type="button" className={styles.themeRow} onClick={togglePhoneTheme}>
				<span>Тёмная тема</span>
				<span className={styles.switch + (dark ? ' ' + styles.switchOn : '')}>
					<i />
				</span>
			</button>
		</div>
	);
}

function HealthBody() {
	return (
		<div className={styles.stack}>
			<h1 className={styles.heading}>Здоровье</h1>
			<div className={styles.stat}>
				<strong>98</strong>
				<span>уд/мин</span>
			</div>
			<Row title="Шаги" value="6 420" />
			<Row title="Сон" value="7 ч 10 м" />
		</div>
	);
}

function NotesBody() {
	return (
		<div className={styles.stack}>
			<h1 className={styles.heading}>Заметки</h1>
			<div className={styles.note}>
				<strong>Встреча</strong>
				<span>Сегодня в 18:00 у мэрии</span>
			</div>
			<div className={styles.note}>
				<strong>Список</strong>
				<span>Бензин, еда, ключи от дома</span>
			</div>
		</div>
	);
}

function ClockBody() {
	const time = usePhoneOsStore(state => state.time);
	const dateLine = usePhoneOsStore(state => state.dateLine);
	return (
		<div className={styles.clock}>
			<div className={styles.clockTime}>{time}</div>
			<div className={styles.clockDate}>{dateLine}</div>
		</div>
	);
}

function BankBody() {
	return (
		<div className={styles.stack}>
			<h1 className={styles.heading}>Банк</h1>
			<div className={styles.card}>
				<span>Счёт</span>
				<strong>$24 580</strong>
			</div>
			<Row title="Наличные" value="$1 240" />
			<Row title="Последняя операция" value="−$80" />
		</div>
	);
}

function TaxiBody() {
	return <TaxiApp />;
}

function CarBody() {
	return (
		<div className={styles.stack}>
			<h1 className={styles.heading}>Машина</h1>
			<Row title="Модель" value="Sultan RS" />
			<Row title="Топливо" value="64%" />
			<Row title="Пробег" value="18 420 км" />
		</div>
	);
}

function GasBody() {
	return (
		<div className={styles.stack}>
			<h1 className={styles.heading}>АЗС</h1>
			<div className={styles.stat}>
				<strong>92</strong>
				<span>$ за литр</span>
			</div>
			<Row title="95" value="$1.84" />
			<Row title="98" value="$2.10" />
			<Row title="Дизель" value="$1.76" />
		</div>
	);
}

function PhoneBody() {
	return <PhoneApp />;
}

function AppStoreBody() {
	return <AppStore />;
}

function ExtraBody({ id }: { id: string }) {
	const card = extras[id];
	if (!card) {
		return null;
	}
	return (
		<div className={styles.stack}>
			<h1 className={styles.heading}>{card.title}</h1>
			<div className={styles.stat}>
				<strong>{card.value}</strong>
				<span>{card.unit}</span>
			</div>
			{card.rows.map(function (row) {
				return <Row key={row.title} title={row.title} value={row.value} />;
			})}
		</div>
	);
}

const extras: Record<string, { title: string; value: string; unit: string; rows: { title: string; value: string }[] }> = {
	weather: {
		title: 'Погода',
		value: '21°',
		unit: 'ясно',
		rows: [
			{ title: 'Ветер', value: '4 м/с' },
			{ title: 'Влажность', value: '46%' },
			{ title: 'Завтра', value: '18°' },
		],
	},
	maps: {
		title: 'Карты',
		value: '12',
		unit: 'мин в пути',
		rows: [
			{ title: 'Дом', value: 'Вайнвуд' },
			{ title: 'Работа', value: 'центр' },
			{ title: 'Пробки', value: 'умеренные' },
		],
	},
	calc: {
		title: 'Калькулятор',
		value: '0',
		unit: 'результат',
		rows: [
			{ title: 'Память', value: 'пусто' },
			{ title: 'Последнее', value: '128 + 40' },
		],
	},
	calendar: {
		title: 'Календарь',
		value: '28',
		unit: 'октября',
		rows: [
			{ title: '10:00', value: 'Встреча' },
			{ title: '18:30', value: 'Семья' },
			{ title: 'Завтра', value: 'свободно' },
		],
	},
	news: {
		title: 'Новости',
		value: '3',
		unit: 'свежих',
		rows: [
			{ title: 'Город', value: 'Набережная открыта' },
			{ title: 'Дороги', value: 'Пробки на бульваре' },
			{ title: 'Погода', value: 'Вечером дождь' },
		],
	},
	radio: {
		title: 'Радио',
		value: 'FM',
		unit: 'в эфире',
		rows: [
			{ title: 'Станция', value: 'Los Santos' },
			{ title: 'Трек', value: 'Night Drive' },
			{ title: 'Громкость', value: '70%' },
		],
	},
	jobs: {
		title: 'Работа',
		value: '4',
		unit: 'вакансии',
		rows: [
			{ title: 'Такси', value: '$40 / ч' },
			{ title: 'Доставка', value: '$35 / ч' },
			{ title: 'АЗС', value: '$28 / ч' },
		],
	},
	delivery: {
		title: 'Доставка',
		value: '2',
		unit: 'заказа',
		rows: [
			{ title: 'Пицца', value: 'едет' },
			{ title: 'Аптека', value: 'собран' },
			{ title: 'Адрес', value: 'Вайнвуд' },
		],
	},
};

function SafariBody() {
	return (
		<div className={styles.stack}>
			<div className={styles.url}>search.example</div>
			<div className={styles.page}>
				<strong>Новости города</strong>
				<span>Пробки на бульваре, открытие набережной и вечерний прогноз.</span>
			</div>
		</div>
	);
}

function MessagesBody() {
	return <MessagesApp />;
}

function MusicBody() {
	return (
		<div className={styles.player}>
			<div className={styles.cover} />
			<strong>Night Drive</strong>
			<span>Los Santos FM</span>
			<div className={styles.progress} />
		</div>
	);
}

const bodies: Record<string, React.ComponentType> = {
	family: FamilyBody,
	facetime: FaceTimeBody,
	gallery: GalleryBody,
	camera: CameraBody,
	settings: SettingsBody,
	health: HealthBody,
	notes: NotesBody,
	clock: ClockBody,
	bank: BankBody,
	taxi: TaxiBody,
	car: CarBody,
	gas: GasBody,
	phone: PhoneBody,
	appstore: AppStoreBody,
	weather: function WeatherBody() {
		return <ExtraBody id="weather" />;
	},
	maps: function MapsBody() {
		return <ExtraBody id="maps" />;
	},
	calc: function CalcBody() {
		return <ExtraBody id="calc" />;
	},
	calendar: function CalendarBody() {
		return <ExtraBody id="calendar" />;
	},
	news: function NewsBody() {
		return <ExtraBody id="news" />;
	},
	radio: function RadioBody() {
		return <ExtraBody id="radio" />;
	},
	jobs: function JobsBody() {
		return <ExtraBody id="jobs" />;
	},
	delivery: function DeliveryBody() {
		return <ExtraBody id="delivery" />;
	},
	safari: SafariBody,
	messages: MessagesBody,
	music: MusicBody,
};

function AppContent({ id }: { id: string }) {
	const Body = bodies[id] || FamilyBody;
	if (id === 'phone' || id === 'appstore' || id === 'messages' || id === 'taxi') {
		return (
			<div className={styles.phoneHost}>
				<Body />
			</div>
		);
	}
	return (
		<div className={styles.content}>
			<Body />
		</div>
	);
}

export default memo(AppContent);
