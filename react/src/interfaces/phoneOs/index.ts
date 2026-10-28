import { defineScreen } from '@utils/defineScreen';

const preview =
	import.meta.env.DEV && typeof location !== 'undefined' && location.search.indexOf('phoneOs') !== -1;

export default defineScreen({
	id: 'phoneOs',
	order: 40,
	load: function () {
		return import('./runtime');
	},
	global: 'phoneOs',
	eager: preview,
	methods: ['lock', 'unlock', 'pushNotice'],
	events: [
		'phone.show',
		'phone.load',
		'phone.message.list',
		'phone.message.load',
		'phone.message.set',
		'phone.contact.mine.update',
		'phone.call.in',
		'phone.call.end',
		'phone.call.ans',
		'phone.app.add',
		'phone.app.remove',
		'taxi.client.location',
		'taxi.client.order.ans',
		'taxi.client.order.ready',
		'taxi.client.order.inTaxi',
		'taxi.client.order.destination',
		'taxi.client.order.cancel',
		'taxi.client.order.error',
		'phone.test.notice',
		'phone.test.taxi',
	],
	isOpen: function (bag: { show?: boolean; shell?: string }) {
		return !!bag.show || (!!bag.shell && bag.shell !== 'off');
	},
});
