"use strict";

const catalog = require("./catalog");

function parseRoute(raw) {
	if (!raw) return [];
	if (Array.isArray(raw)) return raw;
	try {
		const data = JSON.parse(raw);
		return Array.isArray(data) ? data : [];
	} catch (e) {
		return [];
	}
}

module.exports = {
	list: [],

	async init() {
		await this.ensureColumns();
		this.list = await db.Models.Npc.findAll();
		this.list.forEach(npc => this.spawn(npc));
		console.log(`[NPC] Загружено NPC: ${this.list.length}`);
	},

	async ensureColumns() {
		let rows = [];
		try {
			rows = await db.sequelize.query("SHOW COLUMNS FROM Npcs", {
				type: db.sequelize.QueryTypes.SELECT,
			});
		} catch (e) {
			return;
		}
		const have = {};
		rows.forEach(row => {
			have[row.Field] = true;
		});
		const add = [];
		if (!have.kind) add.push("ADD COLUMN kind VARCHAR(16) NOT NULL DEFAULT 'civil'");
		if (!have.weapon) add.push("ADD COLUMN weapon VARCHAR(48) NULL");
		if (!have.ammo) add.push("ADD COLUMN ammo INT NOT NULL DEFAULT 0");
		if (!have.health) add.push("ADD COLUMN health INT NOT NULL DEFAULT 200");
		if (!have.armor) add.push("ADD COLUMN armor INT NOT NULL DEFAULT 0");
		if (!have.aggroRange) add.push("ADD COLUMN aggroRange FLOAT NOT NULL DEFAULT 25");
		if (!add.length) return;
		await db.sequelize.query("ALTER TABLE Npcs " + add.join(", "));
	},

	getById(id) {
		return this.list.find(npc => npc.id === id);
	},

	getByKey(key) {
		return this.list.find(npc => npc.key === key);
	},

	getPosition(key) {
		const npc = this.getByKey(key);
		if (!npc) return null;
		if (npc.live) return { x: npc.live.x, y: npc.live.y, z: npc.live.z, h: npc.h };
		if (npc.ped && mp.peds.exists(npc.ped)) {
			const pos = npc.ped.position;
			return { x: pos.x, y: pos.y, z: pos.z, h: npc.ped.heading || npc.h };
		}
		return { x: npc.x, y: npc.y, z: npc.z, h: npc.h };
	},

	payload(npc) {
		return {
			id: npc.id,
			key: npc.key,
			name: npc.name,
			behavior: npc.behavior || "idle",
			scenario: npc.scenario || "",
			animDict: npc.animDict || "",
			animName: npc.animName || "",
			speed: npc.speed || 1,
			kind: npc.kind || "civil",
			weapon: npc.weapon || "",
			ammo: npc.ammo || 0,
			health: npc.health || 200,
			armor: npc.armor || 0,
			aggroRange: npc.aggroRange || 25,
			x: npc.x,
			y: npc.y,
			z: npc.z,
			route: parseRoute(npc.route),
			routeIndex: npc.routeIndex || 0,
		};
	},

	spawn(npc) {
		this.despawn(npc);
		if (!npc.enabled) return;
		const pos = new mp.Vector3(npc.x, npc.y, npc.z);
		const moving = npc.behavior === "route" && parseRoute(npc.route).length > 0;
		let ped;
		try {
			ped = mp.peds.new(mp.joaat(npc.model), pos, {
				heading: npc.h || 0,
				frozen: !moving,
				dynamic: !!moving,
				invincible: (npc.kind || "civil") !== "hostile",
				dimension: npc.dimension || 0,
			});
		} catch (e) {
			console.log(`[NPC] Не удалось создать ${npc.key}`, e);
			return;
		}
		npc.ped = ped;
		npc.routeIndex = npc.routeIndex || 0;
		ped.setVariable("npc", this.payload(npc));
		ped.npcKey = npc.key;

		const shape = mp.colshapes.newSphere(npc.x, npc.y, npc.z, 2.2);
		shape.dimension = npc.dimension || 0;
		shape.isNpcShape = true;
		shape.npcId = npc.id;
		shape.npcKey = npc.key;
		shape.npcName = npc.name;
		npc.shape = shape;

		if (npc.blip) {
			npc.mapBlip = mp.blips.new(480, pos, {
				name: npc.name,
				color: 2,
				shortRange: true,
			});
		}
	},

	despawn(npc) {
		if (npc.ped && mp.peds.exists(npc.ped)) npc.ped.destroy();
		npc.ped = null;
		if (npc.shape && mp.colshapes.exists(npc.shape)) npc.shape.destroy();
		npc.shape = null;
		if (npc.mapBlip && mp.blips.exists(npc.mapBlip)) npc.mapBlip.destroy();
		npc.mapBlip = null;
	},

	syncVariable(npc) {
		if (!npc.ped || !mp.peds.exists(npc.ped)) return;
		npc.ped.setVariable("npc", this.payload(npc));
	},

	toClient(npc) {
		return {
			id: npc.id,
			key: npc.key,
			name: npc.name,
			model: npc.model,
			x: npc.x,
			y: npc.y,
			z: npc.z,
			h: npc.h,
			dimension: npc.dimension,
			behavior: npc.behavior,
			scenario: npc.scenario || "",
			animDict: npc.animDict || "",
			animName: npc.animName || "",
			speed: npc.speed || 1,
			route: parseRoute(npc.route),
			dialog: npc.dialog || "",
			blip: !!npc.blip,
			enabled: !!npc.enabled,
			kind: npc.kind || "civil",
			weapon: npc.weapon || "",
			ammo: npc.ammo || 0,
			health: npc.health || 200,
			armor: npc.armor || 0,
			aggroRange: npc.aggroRange || 25,
		};
	},

	editorPayload() {
		return {
			npcs: this.list.map(npc => this.toClient(npc)),
			behaviors: [
				{ value: "idle", label: "Стоит" },
				{ value: "scenario", label: "Сценарий" },
				{ value: "anim", label: "Анимация" },
				{ value: "route", label: "Маршрут" },
			],
			scenarios: [
				"WORLD_HUMAN_STAND_IMPATIENT",
				"WORLD_HUMAN_GUARD_STAND",
				"WORLD_HUMAN_CLIPBOARD",
				"WORLD_HUMAN_AA_SMOKE",
				"WORLD_HUMAN_BINOCULARS",
				"WORLD_HUMAN_HANG_OUT_STREET",
			],
			kinds: catalog.kinds,
			models: catalog.models,
			weapons: catalog.weapons,
			anims: catalog.anims,
		};
	},

	openEditor(player) {
		if (!player.character || player.character.admin < 6) return;
		player.call("npcEditor.open", [this.editorPayload()]);
	},

	pushEditor(player, selectId) {
		player.call("npcEditor.data", [this.editorPayload(), selectId || 0]);
	},

	async create(player, data) {
		if (!player.character || player.character.admin < 6) return null;
		let key = String((data && data.key) || "npc_" + Date.now())
			.replace(/\s+/g, "_")
			.slice(0, 64);
		const exists = await db.Models.Npc.findOne({ where: { key } });
		if (exists) key = (key + "_" + Date.now()).slice(0, 64);
		const npc = await db.Models.Npc.create({
			key,
			name: (data && data.name) || "NPC",
			model: (data && data.model) || "a_m_y_business_01",
			x: player.position.x,
			y: player.position.y,
			z: player.position.z,
			h: player.heading || 0,
			dimension: player.dimension || 0,
			behavior: "idle",
			speed: 1,
			blip: true,
			enabled: true,
			route: "[]",
		});
		this.list.push(npc);
		this.spawn(npc);
		return npc;
	},

	async save(player, payload) {
		if (!player.character || player.character.admin < 6) return null;
		let data = payload;
		if (typeof payload === "string") {
			try {
				data = JSON.parse(payload);
			} catch (e) {
				return null;
			}
		}
		const npc = this.getById(data.id);
		if (!npc) return null;
		if (data.key && data.key !== npc.key) {
			const taken = this.list.find(item => item.key === data.key && item.id !== npc.id);
			if (!taken) npc.key = String(data.key).slice(0, 64);
		}
		npc.name = data.name || npc.name;
		npc.model = data.model || npc.model;
		npc.behavior = data.behavior || "idle";
		npc.scenario = data.scenario || null;
		npc.animDict = data.animDict || null;
		npc.animName = data.animName || null;
		npc.speed = parseFloat(data.speed) || 1;
		npc.dialog = data.dialog || null;
		npc.kind = data.kind === "hostile" ? "hostile" : "civil";
		npc.weapon = data.weapon || null;
		npc.ammo = parseInt(data.ammo, 10) || 0;
		npc.health = parseInt(data.health, 10) || 200;
		npc.armor = parseInt(data.armor, 10) || 0;
		npc.aggroRange = parseFloat(data.aggroRange) || 25;
		npc.blip = !!data.blip;
		npc.enabled = !!data.enabled;
		if (data.route) npc.route = JSON.stringify(data.route);
		if (data.usePos) {
			npc.x = player.position.x;
			npc.y = player.position.y;
			npc.z = player.position.z;
			npc.h = player.heading || 0;
			npc.dimension = player.dimension || 0;
		}
		await npc.save();
		this.spawn(npc);
		return npc;
	},

	async addRoutePoint(player, id) {
		const npc = this.getById(id);
		if (!npc || !player.character || player.character.admin < 6) return;
		const route = parseRoute(npc.route);
		route.push({
			x: player.position.x,
			y: player.position.y,
			z: player.position.z,
		});
		npc.route = JSON.stringify(route);
		npc.behavior = "route";
		await npc.save();
		this.spawn(npc);
	},

	async clearRoute(player, id) {
		const npc = this.getById(id);
		if (!npc || !player.character || player.character.admin < 6) return;
		npc.route = "[]";
		npc.routeIndex = 0;
		await npc.save();
		this.spawn(npc);
	},

	async remove(player, id) {
		if (!player.character || player.character.admin < 6) return;
		const npc = this.getById(id);
		if (!npc) return;
		this.despawn(npc);
		await npc.destroy();
		this.list = this.list.filter(item => item.id !== id);
	},

	setRouteIndex(id, index) {
		const npc = this.getById(id);
		if (!npc) return;
		npc.routeIndex = index;
	},

	setLive(id, x, y, z) {
		const npc = this.getById(parseInt(id, 10));
		if (!npc) return;
		npc.live = { x: parseFloat(x), y: parseFloat(y), z: parseFloat(z) };
	},

	pause(player, npc) {
		if (!player || !npc || !npc.ped || !mp.peds.exists(npc.ped)) return;
		npc.pausedBy = player.id;
		npc.ped.setVariable("npcPause", player.id);
	},

	pauseByKey(player, key) {
		this.pause(player, this.getByKey(key));
	},

	resume(player) {
		this.list.forEach(npc => {
			if (!player || npc.pausedBy !== player.id) return;
			npc.pausedBy = null;
			if (npc.ped && mp.peds.exists(npc.ped)) npc.ped.setVariable("npcPause", 0);
		});
	},

	async setRoute(player, id, points) {
		if (!player.character || player.character.admin < 6) return null;
		const npc = this.getById(parseInt(id, 10));
		if (!npc) return null;
		const route = Array.isArray(points) ? points : [];
		npc.route = JSON.stringify(
			route
				.filter(point => point && isFinite(parseFloat(point.x)))
				.map(point => ({
					x: parseFloat(point.x),
					y: parseFloat(point.y),
					z: parseFloat(point.z),
				})),
		);
		if (route.length) npc.behavior = "route";
		await npc.save();
		this.spawn(npc);
		return npc;
	},

	interact(player, id, x, y, z) {
		const npc = this.getById(parseInt(id, 10));
		if (!npc || npc.kind === "hostile") return;
		const pos = player.position;
		const tx = parseFloat(x);
		const ty = parseFloat(y);
		const tz = parseFloat(z);
		const dx = pos.x - tx;
		const dy = pos.y - ty;
		const dz = pos.z - tz;
		if (!isFinite(tx) || Math.sqrt(dx * dx + dy * dy + dz * dz) > 5) return;
		this.pause(player, npc);
		const lines = String(npc.dialog || "...")
			.split("|")
			.map(line => line.trim())
			.filter(Boolean);
		player.call("quests.dialog.open", [
			{
				questId: 0,
				npcName: npc.name,
				lines: lines.length ? lines : ["..."],
				choices: [{ handle: "close", text: "Понятно" }],
			},
		]);
	},
};
