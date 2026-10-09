'use strict';

/*
    Модуль семей (кланов), создаваемых игроками.
    Отдельная сущность от организаций (factions) и знакомств (familiar).
*/

var config = require('./config');
var notifs = require('../notifications');
var money = require('../money');
// Ленивые ссылки на смежные модули (инициализируются в init)
var vehicles = null;
var houses = null;

module.exports = {
	config,
	// Загруженные семьи
	families: [],
	// Быстрый доступ по id (id динамические)
	byId: {},
	// Блипы баз семей (по id семьи)
	blips: {},
	// Маркеры складов семей (по id семьи)
	storageHolders: {},
	// Маркер точки создания семьи
	createMarker: null,

	async init() {
		vehicles = call('vehicles');
		houses = call('houses');
		await this.loadFromDB();
		this.initBlips();
		this.families.forEach(family => {
			if (family.houseId) this.createStorageHolder(family);
		});
		this.createCreationPoint();
		setInterval(() => this.tickExp(), config.expTickInterval);
		console.log(`[FAMILY] Семьи загружены (${this.families.length} шт.)`);
	},
	async loadFromDB() {
		var rows = await db.Models.Family.findAll({
			include: [
				{
					model: db.Models.FamilyRank,
					as: 'ranks',
				},
			],
			order: ['id'],
		});
		rows.forEach(family => {
			family.ranks.sort((a, b) => a.rank - b.rank);
			this.byId[family.id] = family;
		});
		this.families = rows;
	},
	initBlips() {
		this.families.forEach(family => this.createFamilyBlip(family));
	},
	createFamilyBlip(family) {
		if (family.x == null) return;
		var pos = new mp.Vector3(family.x, family.y, family.z);
		this.blips[family.id] = mp.blips.new(
			family.blip || config.blipSprite,
			pos,
			{
				color: family.blipColor,
				name: `Семья ${family.name}`,
				shortRange: 10,
				scale: 0.9,
				dimension: 0,
			},
		);
	},
	createCreationPoint() {
		var p = config.createPoint;
		var pos = new mp.Vector3(p.x, p.y, p.z - 1);
		this.createMarker = mp.markers.new(1, pos, 1, {
			color: [255, 215, 0, 90],
			dimension: 0,
		});
		mp.blips.new(config.createBlipSprite, new mp.Vector3(p.x, p.y, p.z), {
			color: 5,
			name: 'Создание семьи',
			shortRange: 10,
			scale: 0.8,
			dimension: 0,
		});

		var col = mp.colshapes.newSphere(p.x, p.y, p.z, 1.5, 0);
		col.onEnter = player => {
			if (!player.character || player.vehicle) return;
			if (player.character.familyId)
				return notifs.error(
					player,
					`Вы уже состоите в семье`,
					`Создание семьи`,
				);
			player.nearFamilyCreate = true;
			player.call(`family.create.show`, [
				config.createPrice,
				config.colorNames,
			]);
		};
		col.onExit = player => {
			if (!player.nearFamilyCreate) return;
			delete player.nearFamilyCreate;
			player.call(`selectMenu.hide`);
		};
	},

	// ************** Получение данных **************
	getFamily(id) {
		if (!id) return null;
		return this.byId[id] || null;
	},
	getRank(family, rankNumber) {
		if (typeof family == 'number') family = this.getFamily(family);
		if (!family) return null;
		return family.ranks.find(r => r.rank == rankNumber) || null;
	},
	getRankById(family, rankId) {
		if (typeof family == 'number') family = this.getFamily(family);
		if (!family) return null;
		return family.ranks.find(r => r.id == rankId) || null;
	},
	getMinRank(family) {
		if (typeof family == 'number') family = this.getFamily(family);
		return family.ranks[0];
	},
	getMaxRank(family) {
		if (typeof family == 'number') family = this.getFamily(family);
		return family.ranks[family.ranks.length - 1];
	},
	getRankName(family, character) {
		if (typeof family == 'number') family = this.getFamily(family);
		if (!family) return null;
		var rank = this.getRankById(family, character.familyRank);
		return rank ? rank.name : null;
	},
	getRankNames(family) {
		if (typeof family == 'number') family = this.getFamily(family);
		return family.ranks.map(r => r.name);
	},
	getClientRanks(family) {
		if (typeof family == 'number') family = this.getFamily(family);
		return family.ranks.map(r => {
			return { name: r.name, rank: r.rank };
		});
	},
	getMaxMembers(family) {
		return config.maxMembers + (family.level - 1) * config.maxMembersPerLevel;
	},
	getMembers(player) {
		var members = [];
		mp.players.forEach(rec => {
			if (!rec.character) return;
			if (rec.character.familyId != player.character.familyId) return;
			members.push(rec);
		});
		return members;
	},
	async getMembersCount(family) {
		return await db.Models.Character.count({
			where: { familyId: family.id },
		});
	},
	// Заголовок для статистики/меню игрока
	getStatTitle(player) {
		if (!player.character || !player.character.familyId) return null;
		var family = this.getFamily(player.character.familyId);
		if (!family) return null;
		return `${family.name} [${family.tag}]`;
	},

	// ************** Права **************
	isLeader(player, familyId = null) {
		if (!familyId) familyId = player.character.familyId;
		var family = this.getFamily(familyId);
		if (!family) return false;
		return player.character.familyRank == this.getMaxRank(family).id;
	},
	canInvite(player) {
		var family = this.getFamily(player.character.familyId);
		if (!family) return false;
		var rank = this.getRankById(family, player.character.familyRank);
		return rank && rank.rank >= family.inviteRank;
	},
	canUval(player) {
		var family = this.getFamily(player.character.familyId);
		if (!family) return false;
		var rank = this.getRankById(family, player.character.familyRank);
		return rank && rank.rank >= family.uvalRank;
	},
	canGiveRank(player) {
		var family = this.getFamily(player.character.familyId);
		if (!family) return false;
		var rank = this.getRankById(family, player.character.familyRank);
		return rank && rank.rank >= family.giveRankRank;
	},

	// ************** Создание/состав **************
	createFamily(player, name, tag, colorIndex) {
		var header = `Создание семьи`;
		var character = player.character;
		if (character.familyId)
			return notifs.error(player, `Вы уже состоите в семье`, header);

		name = (name || '').trim();
		tag = (tag || '').trim();
		if (
			name.length < config.minNameLength ||
			name.length > config.maxNameLength
		)
			return notifs.error(
				player,
				`Название: ${config.minNameLength}-${config.maxNameLength} символов`,
				header,
			);
		console.log(tag, tag.length);
		if (tag.length <= config.minTagLength || tag.length >= config.maxTagLength)
			return notifs.error(
				player,
				`Тег: ${config.minTagLength}-${config.maxTagLength} символов`,
				header,
			);
		if (!/^[A-Za-z0-9]+$/.test(tag))
			return notifs.error(player, `Тег: только латиница и цифры`, header);
		if (this.families.find(f => f.name.toLowerCase() == name.toLowerCase()))
			return notifs.error(player, `Название занято`, header);
		if (this.families.find(f => f.tag.toLowerCase() == tag.toLowerCase()))
			return notifs.error(player, `Тег занят`, header);
		if (character.cash < config.createPrice)
			return notifs.error(player, `Необходимо $${config.createPrice}`, header);

		colorIndex = parseInt(colorIndex);
		var blipColor =
			config.blipColors[colorIndex] != null ? config.blipColors[colorIndex] : 1;

		money.removeCash(
			player,
			config.createPrice,
			async res => {
				if (!res)
					return notifs.error(player, `Ошибка списания средств`, header);
				try {
					var family = await db.Models.Family.create({
						name: name,
						tag: tag,
						leaderId: character.id,
						blip: config.blipSprite,
						blipColor: blipColor,
						level: 1,
						exp: 0,
						cash: 0,
						inviteRank: config.defaultAccess.inviteRank,
						uvalRank: config.defaultAccess.uvalRank,
						giveRankRank: config.defaultAccess.giveRankRank,
					});
					family.ranks = [];
					for (var i = 0; i < config.defaultRanks.length; i++) {
						var dr = config.defaultRanks[i];
						var rank = await db.Models.FamilyRank.create({
							familyId: family.id,
							name: dr.name,
							rank: dr.rank,
						});
						family.ranks.push(rank);
					}
					family.ranks.sort((a, b) => a.rank - b.rank);

					this.byId[family.id] = family;
					this.families.push(family);

					this.setLeader(family, player);
					this.log(family.id, character.id, 'create', `${name} [${tag}]`);

					notifs.success(player, `Семья "${name}" [${tag}] создана`, header);
					player.call(`selectMenu.hide`);
				} catch (e) {
					console.log(`[FAMILY] Ошибка создания семьи: ${e}`);
					money.addCash(
						player,
						config.createPrice,
						() => {},
						`Возврат за создание семьи`,
					);
					notifs.error(
						player,
						`Не удалось создать семью (имя/тег заняты)`,
						header,
					);
				}
			},
			`Создание семьи ${name}`,
		);
	},
	setLeader(family, player) {
		if (typeof family == 'number') family = this.getFamily(family);
		var character = player.character;
		character.familyId = family.id;
		character.familyRank = this.getMaxRank(family).id;
		character.save();
		family.leaderId = character.id;
		family.save();

		this.setFamilyData(player);
		mp.events.call(`player.family.changed`, player);
	},
	addMember(family, player) {
		if (typeof family == 'number') family = this.getFamily(family);
		var character = player.character;
		character.familyId = family.id;
		character.familyRank = this.getMinRank(family).id;
		character.save();

		this.setFamilyData(player);
		mp.events.call(`player.family.changed`, player);
	},
	deleteMember(player) {
		var character = player.character;
		character.familyId = null;
		character.familyRank = null;
		character.save();

		this.setFamilyData(player);
		mp.events.call(`player.family.changed`, player);
	},
	deleteOfflineMember(character) {
		character.familyId = null;
		character.familyRank = null;
		character.save();
	},
	setRank(player, rank) {
		var character = player.character;
		if (typeof rank == 'number') rank = this.getRank(character.familyId, rank);
		character.familyRank = rank.id;
		character.save();

		this.setFamilyData(player);
		mp.events.call(`player.familyRank.changed`, player);
	},
	setOfflineRank(character, rank) {
		character.familyRank = rank.id;
		character.save();
	},
	leaveFamily(player) {
		var header = `Семья`;
		if (!player.character.familyId)
			return notifs.error(player, `Вы не состоите в семье`, header);
		if (this.isLeader(player))
			return notifs.error(
				player,
				`Лидер не может выйти. Передайте лидерство или распустите семью`,
				header,
			);

		var family = this.getFamily(player.character.familyId);
		this.log(family.id, player.character.id, 'leave', player.name);
		this.deleteMember(player);
		notifs.info(player, `Вы покинули семью ${family.name}`, header);
	},
	transferLeadership(player, recId) {
		var header = `Передача лидерства`;
		if (!this.isLeader(player))
			return notifs.error(player, `Вы не лидер`, header);
		var rec = mp.players.at(recId);
		if (!rec || !rec.character)
			return notifs.error(player, `Игрок #${recId} не найден`, header);
		if (rec.character.familyId != player.character.familyId)
			return notifs.error(player, `${rec.name} не в вашей семье`, header);
		if (rec.id == player.id)
			return notifs.error(player, `Нельзя передать самому себе`, header);

		var family = this.getFamily(player.character.familyId);
		var maxRank = this.getMaxRank(family);
		// Старому лидеру — ранг ниже лидера, либо минимальный
		var demoteRank =
			family.ranks[family.ranks.length - 2] || this.getMinRank(family);

		rec.character.familyRank = maxRank.id;
		rec.character.save();
		family.leaderId = rec.character.id;
		family.save();
		player.character.familyRank = demoteRank.id;
		player.character.save();

		this.setFamilyData(player);
		this.setFamilyData(rec);
		this.log(family.id, player.character.id, 'transfer', rec.name);

		notifs.success(player, `Лидерство передано ${rec.name}`, header);
		notifs.success(rec, `${player.name} передал вам лидерство в семье`, header);
	},
	async disband(family) {
		if (typeof family == 'number') family = this.getFamily(family);
		if (!family) return;
		var familyId = family.id;

		// Онлайн участники
		mp.players.forEach(rec => {
			if (!rec.character) return;
			if (rec.character.familyId != familyId) return;
			rec.character.familyId = null;
			rec.character.familyRank = null;
			rec.character.save();
			this.setFamilyData(rec);
			notifs.warning(rec, `Семья ${family.name} распущена`, `Семья`);
		});
		// Оффлайн участники
		await db.Models.Character.update(
			{
				familyId: null,
				familyRank: null,
			},
			{
				where: { familyId: familyId },
			},
		);

		await db.Models.FamilyRank.destroy({ where: { familyId: familyId } });
		await db.Models.FamilyInventory.destroy({ where: { familyId: familyId } });
		this.removeStorageHolder(family);
		this.log(familyId, family.leaderId, 'disband', family.name);
		await family.destroy();

		if (this.blips[familyId] && mp.blips.exists(this.blips[familyId]))
			this.blips[familyId].destroy();
		delete this.blips[familyId];
		delete this.byId[familyId];
		var idx = this.families.findIndex(f => f.id == familyId);
		if (idx != -1) this.families.splice(idx, 1);
	},

	// ************** Общак **************
	depositCash(player, sum) {
		var header = `Общак семьи`;
		sum = parseInt(sum);
		if (isNaN(sum) || sum <= 0)
			return notifs.error(player, `Неверная сумма`, header);
		var family = this.getFamily(player.character.familyId);
		if (!family) return notifs.error(player, `Вы не состоите в семье`, header);
		if (player.character.cash < sum)
			return notifs.error(player, `Недостаточно наличных`, header);

		money.removeCash(
			player,
			sum,
			res => {
				if (!res) return notifs.error(player, `Ошибка списания`, header);
				family.cash += sum;
				family.save();
				this.pushCash(family);
				this.log(family.id, player.character.id, 'cash_deposit', `${sum}`);
				notifs.success(player, `Вы пополнили общак на $${sum}`, header);
			},
			`Пополнение общака семьи ${family.name}`,
		);
	},
	withdrawCash(player, sum) {
		var header = `Общак семьи`;
		sum = parseInt(sum);
		if (isNaN(sum) || sum <= 0)
			return notifs.error(player, `Неверная сумма`, header);
		var family = this.getFamily(player.character.familyId);
		if (!family) return notifs.error(player, `Вы не состоите в семье`, header);
		if (!this.isLeader(player))
			return notifs.error(
				player,
				`Снимать средства может только лидер`,
				header,
			);
		if (family.cash < sum)
			return notifs.error(player, `В общаке недостаточно средств`, header);

		money.addCash(
			player,
			sum,
			res => {
				if (!res) return notifs.error(player, `Ошибка выдачи`, header);
				family.cash -= sum;
				family.save();
				this.pushCash(family);
				this.log(family.id, player.character.id, 'cash_withdraw', `${sum}`);
				notifs.success(player, `Вы сняли из общака $${sum}`, header);
			},
			`Снятие из общака семьи ${family.name}`,
		);
	},
	pushCash(family) {
		mp.players.forEach(rec => {
			if (!rec.character) return;
			if (rec.character.familyId != family.id) return;
			rec.call(`family.cash.set`, [family.cash]);
		});
	},

	// ************** Настройки **************
	setBlipColor(family, colorIndex) {
		colorIndex = parseInt(colorIndex);
		var color = config.blipColors[colorIndex];
		if (color == null) return;
		family.blipColor = color;
		family.save();
		var blip = this.blips[family.id];
		if (blip && mp.blips.exists(blip)) blip.color = color;
	},
	changeTag(player, tag) {
		var header = `Смена тега`;
		tag = (tag || '').trim();
		var family = this.getFamily(player.character.familyId);
		if (!family) return notifs.error(player, `Вы не состоите в семье`, header);
		if (!this.isLeader(player))
			return notifs.error(player, `Только лидер`, header);
		if (tag == family.tag) return;
		if (tag.length < config.minTagLength || tag.length > config.maxTagLength)
			return notifs.error(
				player,
				`Тег: ${config.minTagLength}-${config.maxTagLength} символов`,
				header,
			);
		if (!/^[A-Za-z0-9]+$/.test(tag))
			return notifs.error(player, `Тег: только латиница и цифры`, header);
		if (this.families.find(f => f.tag.toLowerCase() == tag.toLowerCase()))
			return notifs.error(player, `Тег занят`, header);
		if (player.character.cash < config.renamePrice)
			return notifs.error(player, `Необходимо $${config.renamePrice}`, header);

		money.removeCash(
			player,
			config.renamePrice,
			res => {
				if (!res) return notifs.error(player, `Ошибка списания`, header);
				family.tag = tag;
				family.save();
				this.log(family.id, player.character.id, 'tag', tag);
				// Обновляем тег у всех участников
				mp.players.forEach(rec => {
					if (!rec.character || rec.character.familyId != family.id) return;
					this.setFamilyData(rec);
				});
				notifs.success(player, `Тег семьи изменён на [${tag}]`, header);
			},
			`Смена тега семьи ${family.name}`,
		);
	},

	// ************** Дом семьи **************
	getFamilyByHouseId(houseId) {
		if (!houseId) return null;
		return this.families.find(f => f.houseId == houseId) || null;
	},
	// Является ли игрок участником семьи, к которой привязан дом
	isFamilyHouseMember(player, houseId) {
		if (!player.character || !player.character.familyId) return false;
		var family = this.getFamilyByHouseId(houseId);
		return !!(family && family.id == player.character.familyId);
	},
	refreshBlip(family) {
		if (this.blips[family.id] && mp.blips.exists(this.blips[family.id]))
			this.blips[family.id].destroy();
		delete this.blips[family.id];
		this.createFamilyBlip(family);
	},
	// Маркер склада семьи в интерьере привязанного дома
	createStorageHolder(family) {
		if (!family.houseId) return;
		var house = houses.getHouseById(family.houseId);
		if (!house) return;
		var interior = house.info.Interior;
		// Смещение от шкафа владельца, чтобы маркеры не пересекались
		var pos = new mp.Vector3(interior.hX + 1.2, interior.hY, interior.hZ - 1);

		var marker = mp.markers.new(1, pos, 0.5, {
			color: [217, 143, 255, 70],
			dimension: family.houseId,
		});
		marker.familyId = family.id;
		marker.inventory = { items: [] };

		var col = mp.colshapes.newSphere(pos.x, pos.y, pos.z, 1.5, family.houseId);
		col.onEnter = player => {
			if (player.vehicle || !player.character) return;
			if (player.character.familyId != family.id) return;
			player.call(`prompt.showByName`, [`house_items_holder`]);
			mp.events.call(`family.storage.request`, player, marker);
		};
		col.onExit = player => {
			if (!player.character || player.character.familyId != family.id) return;
			player.call(`prompt.hide`);
			mp.events.call(`family.storage.clear`, player, marker);
		};
		marker.colshape = col;

		this.storageHolders[family.id] = marker;
		this.loadStorageItems(family, marker);
	},
	removeStorageHolder(family) {
		var holder = this.storageHolders[family.id];
		if (!holder) return;
		try {
			if (holder.colshape) holder.colshape.destroy();
			holder.destroy();
		} catch (e) {
			console.log(`[FAMILY] Ошибка удаления склада: ${e}`);
		}
		delete this.storageHolders[family.id];
	},
	async loadStorageItems(family, holder) {
		var dbItems = await db.Models.FamilyInventory.findAll({
			where: { familyId: family.id },
			order: [['parentId', 'ASC']],
			include: [
				{ model: db.Models.FamilyInventoryParam, as: 'params' },
				{ model: db.Models.InventoryItem, as: 'item' },
			],
		});
		holder.inventory.items = dbItems;
	},
	getStorageHolder(familyId) {
		return this.storageHolders[familyId] || null;
	},
	canUseStorage(player) {
		var family = this.getFamily(player.character.familyId);
		if (!family) return false;
		var rank = this.getRankById(family, player.character.familyRank);
		return rank && rank.rank >= config.warehouseRank;
	},
	bindHouse(player) {
		var header = `Дом семьи`;
		var family = this.getFamily(player.character.familyId);
		if (!family) return notifs.error(player, `Вы не состоите в семье`, header);
		if (!this.isLeader(player))
			return notifs.error(player, `Только лидер может привязать дом`, header);
		if (family.houseId)
			return notifs.error(player, `Дом уже привязан`, header);
		var house = houses.getHouseByCharId(player.character.id);
		if (!house)
			return notifs.error(player, `Вы не владеете домом`, header);
		if (this.getFamilyByHouseId(house.info.id))
			return notifs.error(player, `Этот дом уже привязан к семье`, header);

		family.houseId = house.info.id;
		family.x = house.info.pickupX;
		family.y = house.info.pickupY;
		family.z = house.info.pickupZ;
		family.d = 0;
		family.save();
		this.refreshBlip(family);
		this.createStorageHolder(family);
		this.log(family.id, player.character.id, 'house_bind', `${house.info.id}`);

		mp.players.forEach(rec => {
			if (!rec.character || rec.character.familyId != family.id) return;
			notifs.info(rec, `${player.name} привязал дом к семье`, family.name);
			this.setFamilyData(rec);
		});
	},
	unbindHouse(player) {
		var header = `Дом семьи`;
		var family = this.getFamily(player.character.familyId);
		if (!family) return notifs.error(player, `Вы не состоите в семье`, header);
		if (!this.isLeader(player))
			return notifs.error(player, `Только лидер может открепить дом`, header);
		if (!family.houseId)
			return notifs.error(player, `Дом не привязан`, header);

		family.houseId = null;
		family.x = null;
		family.y = null;
		family.z = null;
		family.d = null;
		family.save();
		this.removeStorageHolder(family);
		this.refreshBlip(family);
		this.log(family.id, player.character.id, 'house_unbind', null);

		mp.players.forEach(rec => {
			if (!rec.character || rec.character.familyId != family.id) return;
			notifs.info(rec, `${player.name} открепил дом от семьи`, family.name);
			this.setFamilyData(rec);
		});
	},

	// ************** Уровни и прокачка **************
	getExpForLevel(level) {
		return level * config.expBase;
	},
	// Начисление опыта всем семьям за онлайн-участников
	tickExp() {
		var online = {};
		mp.players.forEach(rec => {
			if (!rec.character || !rec.character.familyId) return;
			online[rec.character.familyId] = (online[rec.character.familyId] || 0) + 1;
		});
		for (var familyId in online) {
			this.addExp(this.getFamily(parseInt(familyId)), online[familyId] * config.expPerMember);
		}
	},
	addExp(family, amount) {
		if (typeof family == 'number') family = this.getFamily(family);
		if (!family || amount <= 0) return;
		family.exp += amount;
		var leveled = false;
		while (
			family.level < config.maxLevel &&
			family.exp >= this.getExpForLevel(family.level)
		) {
			family.exp -= this.getExpForLevel(family.level);
			family.level++;
			leveled = true;
		}
		if (family.level >= config.maxLevel) family.exp = 0;
		family.save();

		if (leveled) {
			this.log(family.id, family.leaderId, 'levelup', `${family.level}`);
			mp.players.forEach(rec => {
				if (!rec.character || rec.character.familyId != family.id) return;
				notifs.success(rec, `Семья достигла ${family.level} уровня!`, `Семья`);
				this.setFamilyData(rec);
			});
		} else {
			this.pushLevel(family);
		}
	},
	pushLevel(family) {
		var data = {
			level: family.level,
			exp: family.exp,
			expMax: this.getExpForLevel(family.level),
		};
		mp.players.forEach(rec => {
			if (!rec.character || rec.character.familyId != family.id) return;
			rec.call(`family.level.set`, [data]);
		});
	},

	// ************** Гараж семьи **************
	getMaxVehicles(family) {
		if (typeof family == 'number') family = this.getFamily(family);
		return config.maxVehicles + (family.level - 1) * config.maxVehiclesPerLevel;
	},
	// Заспавненный транспорт семьи
	getVehicles(family) {
		var familyId = typeof family == 'object' ? family.id : family;
		var list = [];
		mp.vehicles.forEach(veh => {
			if (!veh.db || veh.db.key != 'family') return;
			if (veh.db.owner != familyId) return;
			list.push(veh);
		});
		return list;
	},
	async getVehiclesCount(family) {
		return await db.Models.Vehicle.count({
			where: { key: 'family', owner: family.id },
		});
	},
	// Доступ к семейному авто по рангу (minRank — порядковый номер ранга)
	canUseVehicle(player, veh) {
		if (player.character.familyId != veh.owner) return false;
		if (!veh.db || !veh.db.minRank) return true;
		var fam = this.getFamily(veh.owner);
		if (!fam) return true;
		var minRank = this.getRank(fam, veh.db.minRank.rank);
		var myRank = this.getRankById(fam, player.character.familyRank);
		if (!minRank || !myRank) return true;
		return myRank.rank >= minRank.rank;
	},
	setVehicleMinRank(veh, rank) {
		if (!veh.db.minRank)
			veh.db.minRank = db.Models.FactionVehicleRank.build({
				vehicleId: veh.db.id,
				rank: rank,
			});
		veh.db.minRank.rank = rank;
		veh.db.minRank.save();
	},
	// Возврат свободного транспорта семьи на точку спавна
	respawnVehicles(family) {
		if (typeof family == 'number') family = this.getFamily(family);
		var count = 0;
		this.getVehicles(family).forEach(veh => {
			if (vehicles.getOccupants(veh).length) return;
			vehicles.respawn(veh);
			count++;
		});
		return count;
	},
	// Покупка транспорта в семейный гараж (спавн в позиции лидера)
	buyVehicle(player, modelIndex) {
		var header = `Покупка транспорта`;
		var family = this.getFamily(player.character.familyId);
		if (!family) return notifs.error(player, `Вы не состоите в семье`, header);
		if (!this.isLeader(player))
			return notifs.error(
				player,
				`Только лидер может покупать транспорт`,
				header,
			);
		var item = config.familyVehicles[modelIndex];
		if (!item) return notifs.error(player, `Модель не найдена`, header);
		if (player.vehicle)
			return notifs.error(player, `Выйдите из транспорта`, header);

		this.getVehiclesCount(family).then(async count => {
			var max = this.getMaxVehicles(family);
			if (count >= max)
				return notifs.error(
					player,
					`Достигнут лимит транспорта (${max})`,
					header,
				);
			if (family.cash < item.price)
				return notifs.error(
					player,
					`В общаке недостаточно средств ($${item.price})`,
					header,
				);

			var pos = player.position;
			var plate = vehicles.generateVehiclePlate();
			try {
				var dbVeh = await db.Models.Vehicle.create({
					key: 'family',
					owner: family.id,
					modelName: item.model,
					color1: 0,
					color2: 0,
					x: pos.x,
					y: pos.y,
					z: pos.z,
					h: player.heading,
					plate: plate,
					fuel: 60,
				});
				family.cash -= item.price;
				family.save();
				this.pushCash(family);
				vehicles.spawnVehicle(dbVeh, 0);
				this.log(
					family.id,
					player.character.id,
					'veh_buy',
					`${item.name} ${plate}`,
				);
				notifs.success(
					player,
					`Куплен ${item.name} за $${item.price} из общака`,
					header,
				);
			} catch (e) {
				console.log(`[FAMILY] Ошибка покупки авто: ${e}`);
				notifs.error(player, `Не удалось купить транспорт`, header);
			}
		});
	},

	// ************** Контракты **************
	takeContract(player) {
		var header = `Контракт семьи`;
		var family = this.getFamily(player.character.familyId);
		if (!family) return notifs.error(player, `Вы не состоите в семье`, header);
		var rank = this.getRankById(family, player.character.familyRank);
		if (!rank || rank.rank < config.contractRank)
			return notifs.error(player, `Недостаточно прав`, header);
		if (player.familyContract)
			return notifs.error(player, `У вас уже есть активный контракт`, header);

		var now = Date.now();
		if (family.contractCooldown && now < family.contractCooldown) {
			var mins = Math.ceil((family.contractCooldown - now) / 60000);
			return notifs.error(player, `Контракт будет доступен через ${mins} мин`, header);
		}

		var point = config.contractPoints[Math.floor(Math.random() * config.contractPoints.length)];
		player.familyContract = { x: point.x, y: point.y, z: point.z };
		player.call(`family.contract.start`, [player.familyContract]);
		notifs.info(player, `Контракт взят. Доставьте груз в отмеченную точку`, header);
	},
	completeContract(player) {
		var header = `Контракт семьи`;
		if (!player.familyContract) return;
		var family = this.getFamily(player.character.familyId);
		if (!family) {
			delete player.familyContract;
			return;
		}

		var target = player.familyContract;
		var pos = player.position;
		var dx = pos.x - target.x;
		var dy = pos.y - target.y;
		var dist = Math.sqrt(dx * dx + dy * dy);
		if (dist > 15) return;

		delete player.familyContract;
		player.call(`family.contract.clear`);

		family.cash += config.contractReward.cash;
		family.save();
		this.pushCash(family);
		this.addExp(family, config.contractReward.exp);
		family.contractCooldown = Date.now() + config.contractCooldown;
		this.log(
			family.id,
			player.character.id,
			'contract',
			`+$${config.contractReward.cash} +${config.contractReward.exp}exp`,
		);

		notifs.success(
			player,
			`Контракт выполнен! Общак +$${config.contractReward.cash}, опыт +${config.contractReward.exp}`,
			header,
		);
		mp.players.forEach(rec => {
			if (!rec.character || rec.character.familyId != family.id) return;
			if (rec.id == player.id) return;
			notifs.info(rec, `${player.name} выполнил контракт (+$${config.contractReward.cash})`, family.name);
		});
	},
	cancelContract(player) {
		if (!player.familyContract) return;
		delete player.familyContract;
		player.call(`family.contract.clear`);
		notifs.info(player, `Контракт отменён`, `Контракт семьи`);
	},

	// ************** Синхронизация с клиентом **************
	setFamilyData(player) {
		var character = player.character;
		var family = this.getFamily(character.familyId);
		player.setVariable('familyId', character.familyId || null);
		if (family) {
			player.setVariable('familyTag', family.tag);
			player.call(`family.set`, [this.clientData(player, family)]);
		} else {
			player.setVariable('familyTag', null);
			player.call(`family.clear`);
		}
		var playerMenu = call('playerMenu');
		if (playerMenu && !playerMenu.isEmpty && playerMenu.setFamily)
			playerMenu.setFamily(player);
	},
	clientData(player, family) {
		if (typeof family == 'number') family = this.getFamily(family);
		var rank = this.getRankById(family, player.character.familyRank);
		return {
			id: family.id,
			name: family.name,
			tag: family.tag,
			cash: family.cash,
			level: family.level,
			exp: family.exp,
			expMax: this.getExpForLevel(family.level),
			rankId: player.character.familyRank,
			rankName: rank ? rank.name : '-',
			rankNumber: rank ? rank.rank : 0,
			isLeader: this.isLeader(player),
			ranks: this.getClientRanks(family),
			inviteRank: family.inviteRank,
			uvalRank: family.uvalRank,
			giveRankRank: family.giveRankRank,
			vehRespawnPrice: config.vehRespawnPrice,
			houseId: family.houseId || null,
		};
	},

	// ************** Семейный чат **************
	sayChat(player, text) {
		if (!player.character.familyId)
			return notifs.error(player, `Вы не состоите в семье`, `Семья`);
		var fam = this.getFamily(player.character.familyId);
		if (!fam) return;
		mp.players.forEach(rec => {
			if (!rec.character || rec.character.familyId != fam.id) return;
			rec.call(`chat.message.split`, [
				text,
				`!{#d98fff}[Семья][${fam.tag}] ${player.character.name}[${player.id}]: `,
			]);
		});
	},

	// ************** Лог **************
	log(familyId, characterId, action, data = null) {
		db.Models.FamilyLog.create({
			familyId: familyId,
			characterId: characterId,
			action: action,
			data: data ? String(data) : null,
		}).catch(e => console.log(`[FAMILY] Ошибка лога: ${e}`));
	},
};
