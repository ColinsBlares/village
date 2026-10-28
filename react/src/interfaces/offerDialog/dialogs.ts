import { setLoaderShow } from '../loader/store';

export interface OfferDialogDef {
	title: string;
	text: string;
	price?: number;
	name?: string | null;
	playerId?: any;
	recId?: any;
	vehId?: any;
	medKnockTime?: number;
	knockTime?: number;
	on: (values: any) => void;
	yes: () => void;
	no: () => void;
	ignore: () => void;
}

export function prettyOffer(val: any) {
	return String(val).replace(/(\d)(?=(\d{3})+(\D|$))/g, '$1 ');
}

export const OFFER_DIALOGS: Record<string, OfferDialogDef> = {
	documents: {
		title: 'Документы',
		text: 'Carter Slade хочет показать вам паспорт',
		on: function (values) {
			this.text = '<span>' + values.name + '</span> хочет показать Вам ' + values.doc;
		},
		yes: function () {
			mp.trigger('callRemote', 'documents.offer.accept', 1);
		},
		no: function () {
			mp.trigger('callRemote', 'documents.offer.accept', 0);
			mp.trigger('offerDialog.close');
		},
		ignore: function () {
			mp.trigger('callRemote', 'documents.offer.accept', 0);
			mp.trigger('offerDialog.close');
		},
	},
	carservice_diagnostics: {
		title: 'Диагностика',
		text: 'Вы желаете провести диагностику вашего транспорта',
		price: 100,
		name: 'Cyrus Raider',
		on: function (values) {
			this.name = values.name;
			this.text =
				'Вы желаете провести диагностику вашего транспорта за <br /><span class="money">' +
				prettyOffer(values.price) +
				' $</span>?';
		},
		yes: function () {
			mp.trigger('callRemote', 'carservice.diagnostics.accept', 1);
			mp.trigger('offerDialog.close');
		},
		no: function () {
			mp.trigger('callRemote', 'carservice.diagnostics.accept', 0);
			mp.trigger('offerDialog.close');
		},
		ignore: function () {
			mp.trigger('callRemote', 'carservice.diagnostics.accept', 0);
			mp.trigger('offerDialog.close');
		},
	},
	house_sell: {
		title: 'Покупка дома',
		text: 'Swifty Swift предлагает вам купить его дом за 1`',
		price: 100,
		name: 'Cyrus Rader',
		on: function (values) {
			this.price = values.price;
			this.name = values.name;
			this.text =
				'Вы желаете приобрести дом за <br /><span class="money">' +
				prettyOffer(values.price) +
				' $</span>?';
		},
		yes: function () {
			mp.trigger('callRemote', 'house.sell.ans', 1);
		},
		no: function () {
			mp.trigger('callRemote', 'house.sell.ans', 2);
		},
		ignore: function () {
			mp.trigger('callRemote', 'house.sell.ans', 2);
		},
	},
	biz_sell: {
		title: 'Покупка бизнеса',
		text: 'Swifty Swift предлагает вам купить его бизнес',
		price: 100,
		name: 'Cy Raider',
		on: function (values) {
			this.price = values.price;
			this.name = values.name;
			this.text =
				'Вы желаете приобрести бизнес за <br /><span class="money">' +
				prettyOffer(values.price) +
				' $</span>?';
		},
		yes: function () {
			mp.trigger('callRemote', 'biz.sell.ans', 1);
		},
		no: function () {
			mp.trigger('callRemote', 'biz.sell.ans', 2);
		},
		ignore: function () {
			mp.trigger('callRemote', 'biz.sell.ans', 2);
		},
	},
	vehicles_sell: {
		title: 'Покупка транспорта',
		text: 'Carter Slade предлагает вам купить т/с "Glendale" (AYE741)',
		price: 228,
		on: function (values) {
			this.price = values.price;
			this.name = values.name;
			this.text =
				'Вы желаете приобрести т/с ' +
				values.model +
				' (' +
				values.plate +
				') за <br /><span class="money">' +
				prettyOffer(values.price) +
				' $</span>?';
		},
		yes: function () {
			mp.trigger('callRemote', 'vehicles.sell.offer.accept', 1);
			setLoaderShow(true);
			mp.trigger('offerDialog.close');
		},
		no: function () {
			mp.trigger('callRemote', 'vehicles.sell.offer.accept', 0);
			mp.trigger('offerDialog.close');
		},
		ignore: function () {
			mp.trigger('callRemote', 'vehicles.sell.offer.accept', 0);
			mp.trigger('offerDialog.close');
		},
	},
	faction_invite: {
		title: 'Приглашение',
		text: 'Carter Slade предлагает вам вступить в Groove Street',
		on: function (values) {
			this.text =
				'<span>' + values.name + '</span> предлагает вам вступить в ' + values.faction;
		},
		yes: function () {
			mp.trigger('callRemote', 'factions.invite.accept');
		},
		no: function () {
			mp.trigger('callRemote', 'factions.invite.cancel');
		},
		ignore: function () {
			mp.trigger('callRemote', 'factions.invite.cancel');
		},
	},
	family_invite: {
		title: 'Приглашение',
		text: 'Carter Slade предлагает вам вступить в семью',
		on: function (values) {
			this.text =
				'<span>' + values.name + '</span> приглашает вас в семью ' + values.family;
		},
		yes: function () {
			mp.trigger('callRemote', 'family.invite.accept');
		},
		no: function () {
			mp.trigger('callRemote', 'family.invite.cancel');
		},
		ignore: function () {
			mp.trigger('callRemote', 'family.invite.cancel');
		},
	},
	hospital_healing: {
		title: 'Лечение',
		text: 'Carter Slade предлагает вам лечение',
		price: 100,
		on: function (values) {
			this.name = values.name;
			this.text =
				'Вы желаете вылечиться за <br /><span class="money">' +
				prettyOffer(values.price) +
				' $</span>?';
			this.price = values.price;
		},
		yes: function () {
			mp.trigger('callRemote', 'hospital.healing.accept');
		},
		no: function () {
			mp.trigger('callRemote', 'hospital.healing.cancel');
		},
		ignore: function () {
			mp.trigger('callRemote', 'hospital.healing.cancel');
		},
	},
	farm_sell: {
		title: 'Покупка фермы',
		text: 'Carter Slade предлагает вам купить Ферму #99',
		price: 999,
		on: function (values) {
			this.text =
				'Вы желаете приобрести Ферму #' +
				values.farmId +
				' за <br /><span class="money">' +
				prettyOffer(values.price) +
				' $</span>?';
			this.price = values.price;
			this.name = values.name;
		},
		yes: function () {
			mp.trigger('callRemote', 'farms.sell.player.accept');
		},
		no: function () {
			mp.trigger('callRemote', 'farms.sell.player.cancel');
		},
		ignore: function () {
			mp.trigger('callRemote', 'farms.sell.player.cancel');
		},
	},
	carrier_job: {
		title: 'Аренда',
		text: 'Вы желаете арендовать рендовать грузовик за <span>100 $</span>?',
		price: 999,
		name: 'Parking',
		on: function (values) {
			this.text =
				'Вы желаете арендовать грузовик за <br /><span class="money">' +
				prettyOffer(values.price) +
				' $</span>?';
			this.price = values.price;
		},
		yes: function () {
			mp.trigger('callRemote', 'carrier.vehicle.buy');
		},
		no: function () {},
		ignore: function () {},
	},
	trade: {
		title: 'Запрос на обмен',
		text: 'Гражданин отправил вам запрос на обмен',
		playerId: null,
		on: function (values) {
			this.playerId = values.playerId;
			this.text = 'Гражданин [' + values.playerId + '] отправил вам запрос на обмен';
		},
		yes: function () {
			mp.trigger('callRemote', 'trade.accept', this.playerId);
		},
		no: function () {
			mp.trigger('callRemote', 'trade.decline', this.playerId);
		},
		ignore: function () {
			mp.trigger('callRemote', 'trade.decline', this.playerId);
		},
	},
	familiar: {
		title: 'Знакомство',
		text: 'Незнакомец (ID: 11) хочет пожать вам руку',
		playerId: null,
		on: function (values) {
			this.text = 'Незнакомец (ID: ' + values.playerId + ') хочет пожать вам руку';
			this.playerId = values.playerId;
		},
		yes: function () {
			mp.trigger('callRemote', 'familiar.accept', this.playerId);
		},
		no: function () {},
		ignore: function () {},
	},
	death: {
		title: 'Потеря сознания',
		text: 'Дождаться медиков?',
		medKnockTime: 0,
		knockTime: 0,
		on: function (data) {
			this.medKnockTime = data.medKnockTime;
			this.knockTime = data.knockTime;
		},
		yes: function () {
			mp.trigger('callRemote', 'death.wait', this.medKnockTime);
		},
		no: function () {
			mp.trigger('callRemote', 'death.wait', this.knockTime);
		},
		ignore: function () {
			mp.trigger('callRemote', 'death.wait', this.knockTime);
		},
	},
	vehicle_unload: {
		title: 'Разгрузка',
		text: 'Начать разгрузку боеприпасов?',
		vehId: null,
		on: function (values) {
			if (values.type == 'ammo') {
				this.text = 'Начать разгрузку боеприпасов?';
			} else if (values.type == 'medicines') {
				this.text = 'Начать разгрузку медикаментов?';
			}
			this.vehId = values.vehId;
		},
		yes: function () {
			mp.trigger('callRemote', 'factions.vehicle.unload.start', this.vehId);
		},
		no: function () {},
		ignore: function () {},
	},
	faction_cash_check: {
		title: 'Общак',
		text: 'Желаете пополнить общак The Ballas на сумму $999999?',
		on: function (values) {
			this.text =
				'Желаете пополнить общак <span>' +
				values.name +
				'</span> на сумму $' +
				values.sum +
				'?';
		},
		yes: function () {
			mp.trigger('callRemote', 'factions.cash.offer.accept');
		},
		no: function () {
			mp.trigger('callRemote', 'factions.cash.offer.cancel');
		},
		ignore: function () {
			mp.trigger('callRemote', 'factions.cash.offer.cancel');
		},
	},
	mafia_power_sell: {
		title: 'Крыша',
		text: 'Carter Slade предлагает вам крышу АЗС за $999',
		on: function (values) {
			this.text =
				values.player +
				' предлагает вам крышу ' +
				values.biz +
				' за $' +
				values.sum;
		},
		yes: function () {
			mp.trigger('callRemote', 'mafia.power.sell.accept');
		},
		no: function () {
			mp.trigger('callRemote', 'mafia.power.sell.cancel');
		},
		ignore: function () {
			mp.trigger('callRemote', 'mafia.power.sell.cancel');
		},
	},
	wedding_male: {
		title: 'Предложение',
		text: 'Вы хотите сделать Swifty Swift предложение?',
		recId: null,
		on: function (values) {
			this.recId = values.recId;
			this.text = 'Вы хотите сделать <span>' + values.name + '</span> предложение?';
		},
		yes: function () {
			mp.trigger('callRemote', 'wedding.add', this.recId);
		},
		no: function () {},
		ignore: function () {},
	},
	wedding_female: {
		title: 'Предложение',
		text: 'Carter Slade предлагает вам выйти замуж',
		on: function (values) {
			this.text = '<span>' + values.name + '</span> предлагает вам выйти замуж';
		},
		yes: function () {
			mp.trigger('callRemote', 'wedding.add.accept', this.recId);
		},
		no: function () {
			mp.trigger('callRemote', 'wedding.add.cancel', this.recId);
		},
		ignore: function () {
			mp.trigger('callRemote', 'wedding.add.cancel', this.recId);
		},
	},
	unarrest: {
		title: 'Освобождение',
		text: 'Carter Slade предлагает вас освободить',
		price: 999,
		name: null,
		on: function (values) {
			this.text =
				'Вы желаете выйти на свободу за <br /><span class="money">' +
				prettyOffer(values.price) +
				' $</span>?';
			this.price = values.price;
			this.name = values.name;
		},
		yes: function () {
			mp.trigger('callRemote', 'government.unarrest.accept');
		},
		no: function () {
			mp.trigger('callRemote', 'government.unarrest.cancel');
		},
		ignore: function () {
			mp.trigger('callRemote', 'government.unarrest.cancel');
		},
	},
	dice: {
		title: 'Игра в кости',
		text: 'Carter Slade предлагает вам сыграть в кости',
		price: 999,
		on: function (values) {
			this.text =
				'ID: ' +
				values.id +
				' предлагает вам сыграть в кости <br /><span class="money">$' +
				prettyOffer(values.amount) +
				'</span>';
			this.price = values.amount;
		},
		yes: function () {
			mp.trigger('callRemote', 'casino.dice.offer.accept', 1);
		},
		no: function () {
			mp.trigger('callRemote', 'casino.dice.offer.accept', 0);
		},
		ignore: function () {
			mp.trigger('callRemote', 'casino.dice.offer.accept', 0);
		},
	},
	winter_job: {
		title: 'Аренда',
		text: 'Вы желаете арендовать рендовать трактор за <span>100 $</span>?',
		on: function (values) {
			this.text =
				'Вы желаете арендовать трактор за <br /><span class="money">' +
				prettyOffer(values.price) +
				' $</span>?';
		},
		yes: function () {
			mp.trigger('callRemote', 'winter.vehicle.buy');
		},
		no: function () {},
		ignore: function () {},
	},
};
