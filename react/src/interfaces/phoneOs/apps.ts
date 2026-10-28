import wallpaper from '@imgs/phone/os/wallpaper.jpg';
import family from '@imgs/phone/os/family.png';
import familyWidget from '@imgs/phone/os/family-widget.png';
import facetime from '@imgs/phone/os/facetime.png';
import gallery from '@imgs/phone/os/gallery.png';
import camera from '@imgs/phone/os/camera.png';
import settings from '@imgs/phone/os/settings.png';
import health from '@imgs/phone/os/health.png';
import notes from '@imgs/phone/os/notes.png';
import bank from '@imgs/phone/os/bank.png';
import taxi from '@imgs/phone/os/taxi.png';
import car from '@imgs/phone/os/car.png';
import gas from '@imgs/phone/os/gas.png';
import clock from '@imgs/phone/os/clock.png';
import phone from '@imgs/phone/os/phone.png';
import safari from '@imgs/phone/os/safari.png';
import messages from '@imgs/phone/os/messages.png';
import music from '@imgs/phone/os/music.png';
import appstore from '@imgs/phone/os/appstore.svg';
import weather from '@imgs/phone/os/weather.svg';
import maps from '@imgs/phone/os/maps.svg';
import calc from '@imgs/phone/os/calc.svg';
import calendar from '@imgs/phone/os/calendar.svg';
import news from '@imgs/phone/os/news.svg';
import radio from '@imgs/phone/os/radio.svg';
import jobs from '@imgs/phone/os/jobs.svg';
import delivery from '@imgs/phone/os/delivery.svg';

export {
	wallpaper,
	family,
	familyWidget,
	facetime,
	gallery,
	camera,
	settings,
	health,
	notes,
	bank,
	taxi,
	car,
	gas,
	clock,
	phone,
	safari,
	messages,
	music,
	appstore,
	weather,
	maps,
	calc,
	calendar,
	news,
	radio,
	jobs,
	delivery,
};

export interface PhoneApp {
	key: string;
	id: string;
	name: string;
	icon: string;
	x: number;
	y: number;
}

export const topApps: PhoneApp[] = [
	{ key: 'facetime', id: 'facetime', name: 'FaceTime', icon: facetime, x: 147.587, y: 57 },
	{ key: 'gallery-top', id: 'gallery', name: 'Галерея', icon: gallery, x: 208.239, y: 57 },
	{ key: 'camera', id: 'camera', name: 'Камера', icon: camera, x: 147.587, y: 132 },
	{ key: 'settings', id: 'settings', name: 'Настройки', icon: settings, x: 208.239, y: 132 },
];

export const gridApps: PhoneApp[] = [
	{ key: 'health', id: 'health', name: 'Здоровье', icon: health, x: 27.294, y: 359 },
	{ key: 'notes', id: 'notes', name: 'Заметки', icon: notes, x: 87.946, y: 359 },
	{ key: 'clock', id: 'clock', name: 'Время', icon: clock, x: 148.598, y: 359 },
	{ key: 'gallery-row', id: 'gallery', name: 'Галерея', icon: gallery, x: 209.25, y: 359 },
	{ key: 'bank', id: 'bank', name: 'Банк', icon: bank, x: 27.294, y: 434 },
	{ key: 'taxi', id: 'taxi', name: 'Такси', icon: taxi, x: 87.946, y: 434 },
	{ key: 'car', id: 'car', name: 'Машина', icon: car, x: 147.587, y: 434 },
	{ key: 'gas', id: 'gas', name: 'АЗС', icon: gas, x: 208.239, y: 434 },
];

export const dockApps: PhoneApp[] = [
	{ key: 'phone', id: 'phone', name: 'Телефон', icon: phone, x: 26.283, y: 538 },
	{ key: 'safari', id: 'safari', name: 'Safari', icon: safari, x: 86.935, y: 538 },
	{ key: 'messages', id: 'messages', name: 'Сообщения', icon: messages, x: 148.598, y: 538 },
	{ key: 'music', id: 'music', name: 'Музыка', icon: music, x: 209.25, y: 538 },
];

const info = new Map<string, { name: string; icon: string }>();

topApps.concat(gridApps, dockApps).forEach(function (app) {
	if (!info.has(app.id)) {
		info.set(app.id, { name: app.name, icon: app.icon });
	}
});

info.set('family', { name: 'Семья', icon: family });
info.set('appstore', { name: 'App Store', icon: appstore });
info.set('weather', { name: 'Погода', icon: weather });
info.set('maps', { name: 'Карты', icon: maps });
info.set('calc', { name: 'Калькулятор', icon: calc });
info.set('calendar', { name: 'Календарь', icon: calendar });
info.set('news', { name: 'Новости', icon: news });
info.set('radio', { name: 'Радио', icon: radio });
info.set('jobs', { name: 'Работа', icon: jobs });
info.set('delivery', { name: 'Доставка', icon: delivery });

export function appInfo(id: string) {
	return info.get(id) || null;
}
