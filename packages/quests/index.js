"use strict";

const graphUtil = require("./graph");
const nodeMeta = require("./nodeMeta");
const seeds = require("./seeds");

let notifs;
let money;
let inventory;
let jobsModule;

const builtinSignals = [
	{ name: "job.changed", label: "Смена работы", fields: ["jobId"] },
	{ name: "job.exp", label: "Опыт работы", fields: ["jobId", "exp"] },
	{ name: "faction.changed", label: "Смена фракции", fields: ["factionId"] },
	{ name: "vehicle.enter", label: "Сел в транспорт", fields: ["vehicleId"] },
	{ name: "death.spawn", label: "Респawn после смерти", fields: [] },
	{ name: "money.add", label: "Получены наличные", fields: ["amount", "reason"] },
	{ name: "money.remove", label: "Списаны наличные", fields: ["amount", "reason"] },
	{ name: "inventory.add", label: "Предмет в инвентарь", fields: ["itemId"] },
	{ name: "checkpoint.reach", label: "Достигнута точка", fields: [] },
];

module.exports = {
	quests: [],
	extraSignals: [],
	timers: {},

	init() {
		notifs = call("notifications");
		money = call("money");
		inventory = call("inventory");
		jobsModule = call("jobs");
	},

	async loadFromDb() {
		this.quests = await db.Models.Quest.findAll();
		console.log(`[QUESTS] Загружено квестов: ${this.quests.length}`);
	},

	async ensureSeeds() {
		await seeds.ensure(this.quests);
		await this.loadFromDb();
	},

	getQuestByKey(key) {
		return this.quests.find(q => q.key === key);
	},

	getQuestById(id) {
		return this.quests.find(q => q.id === id);
	},

	registerSignal(sig) {
		if (!sig || !sig.name) return;
		if (this.extraSignals.find(s => s.name === sig.name)) return;
		this.extraSignals.push({
			name: sig.name,
			label: sig.label || sig.name,
			fields: sig.fields || [],
		});
	},

	getSignalsList() {
		return builtinSignals.concat(this.extraSignals);
	},

	getNodeMeta() {
		return nodeMeta;
	},

	getEditorPayload(player) {
		const jobList = jobsModule.isEmpty
			? []
			: (jobsModule.jobs || []).map(j => ({ id: j.id, name: j.name }));
		const npcs = call("npcs");
		const npcList =
			!npcs || npcs.isEmpty
				? []
				: (npcs.list || []).map(npc => ({ key: npc.key, name: npc.name }));
		return {
			quests: this.quests.map(q => ({
				id: q.id,
				key: q.key,
				name: q.name,
				description: q.description,
				enabled: q.enabled,
				autoStart: q.autoStart,
				requireQuest: q.requireQuest,
				repeatable: q.repeatable,
				graph: graphUtil.parseGraph(q.graph),
			})),
			nodeTypes: nodeMeta,
			signals: this.getSignalsList(),
			jobs: jobList,
			npcs: npcList,
		};
	},

	npcPoint(data) {
		if (data && data.npcKey) {
			const npcs = call("npcs");
			if (npcs && !npcs.isEmpty && npcs.getPosition) {
				const pos = npcs.getPosition(data.npcKey);
				if (pos) return pos;
			}
		}
		return {
			x: parseFloat(data.x),
			y: parseFloat(data.y),
			z: parseFloat(data.z),
			h: parseFloat(data.h) || 0,
		};
	},

	parseVars(cq) {
		return graphUtil.parseVars(cq.vars);
	},

	async saveVars(cq, vars) {
		cq.vars = JSON.stringify(vars);
		await cq.save();
	},

	getActiveList(player) {
		if (!player.questStates) return [];
		return player.questStates.filter(cq => cq.status === "active");
	},

	findActive(player, questId) {
		return this.getActiveList(player).find(cq => cq.questId === questId);
	},

	async loadCharacterQuests(player) {
		if (!player.character) return;
		const rows = await db.Models.CharacterQuest.findAll({
			where: { characterId: player.character.id },
			include: [{ model: db.Models.Quest }],
		});
		player.questStates = rows;
	},

	async hasCompleted(characterId, questKey) {
		const quest = this.getQuestByKey(questKey);
		if (!quest) return false;
		const row = await db.Models.CharacterQuest.findOne({
			where: {
				characterId,
				questId: quest.id,
				status: "completed",
			},
		});
		return !!row;
	},

	async canStart(player, quest, opts = {}) {
		if (!player.character) return false;
		if (!quest.enabled && !opts.force) return false;
		const active = this.findActive(player, quest.id);
		if (active) return false;
		if (!quest.repeatable) {
			const done = await db.Models.CharacterQuest.findOne({
				where: {
					characterId: player.character.id,
					questId: quest.id,
					status: "completed",
				},
			});
			if (done) return false;
		}
		if (quest.requireQuest) {
			const ok = await this.hasCompleted(
				player.character.id,
				quest.requireQuest,
			);
			if (!ok) return false;
		}
		return true;
	},

	async startQuest(player, questKey, opts = {}) {
		const quest = this.getQuestByKey(questKey);
		if (!quest) return false;
		if (!(await this.canStart(player, quest, opts))) return false;

		const g = graphUtil.parseGraph(quest.graph);
		const start = graphUtil.getStartNode(g);
		if (!start) {
			notifs.error(player, "В квесте нет ноды start", quest.name);
			return false;
		}

		const tracked =
			opts.tracked !== undefined
				? opts.tracked
				: !this.getActiveList(player).some(cq => cq.tracked);

		const cq = await db.Models.CharacterQuest.create({
			characterId: player.character.id,
			questId: quest.id,
			status: "active",
			nodeId: start.id,
			vars: "{}",
			tracked,
		});
		cq.Quest = quest;
		if (!player.questStates) player.questStates = [];
		player.questStates.push(cq);

		await this.enterNode(player, cq);
		return true;
	},

	async resumeActive(player) {
		for (const cq of this.getActiveList(player)) {
			if (!cq.Quest) {
				cq.Quest = this.getQuestById(cq.questId);
			}
			if (cq.nodeId) await this.enterNode(player, cq, true);
		}
		this.syncTracker(player);
	},

	async tryAutoStart(player, mode) {
		for (const quest of this.quests) {
			if (quest.autoStart !== mode || !quest.enabled) continue;
			await this.startQuest(player, quest.key);
		}
	},

	async tryAutoStartReady(player) {
		for (const quest of this.quests) {
			if (quest.autoStart !== "onReady" || !quest.enabled) continue;
			await this.startQuest(player, quest.key);
		}
	},

	evaluateBranch(player, cq, data) {
		const cond = data.condition;
		const val = data.value;
		const vars = this.parseVars(cq);
		switch (cond) {
			case "noJob":
				return !player.character.job;
			case "hasJob":
				return !!player.character.job;
			case "jobId":
				return player.character.job === parseInt(val, 10);
			case "factionId":
				return player.character.factionId === parseInt(val, 10);
			case "cashGte":
				return player.character.cash >= parseInt(val, 10);
			case "hasItem":
				if (!inventory || inventory.isEmpty || !player.inventory) return false;
				return !!inventory.getItemByItemId(player, parseInt(val, 10));
			case "varEq":
				return String(vars[data.varName] || "") === String(val || "");
			case "questCompleted":
				return false;
			case "varGte": {
				const n = parseFloat(vars[data.varName] || 0);
				return n >= parseFloat(val || 0);
			}
			default:
				return false;
		}
	},

	async evaluateBranchAsync(player, cq, data) {
		if (data.condition === "questCompleted") {
			return this.hasCompleted(player.character.id, data.value);
		}
		return this.evaluateBranch(player, cq, data);
	},

	matchWaitFilter(cq, nodeData, signalName, signalData) {
		if ((nodeData.signal || "") !== signalName) return false;
		const op = nodeData.op || "any";
		if (op === "any") return true;
		const field = nodeData.field;
		if (!field) return true;
		const left = signalData[field];
		const right = nodeData.value;
		if (op === "eq") return String(left) === String(right);
		if (op === "gte") return parseFloat(left) >= parseFloat(right);
		return true;
	},

	clearTimer(player, cq) {
		if (!player.character || !cq) return;
		const key = player.character.id + ":" + cq.id;
		if (this.timers[key]) {
			clearTimeout(this.timers[key]);
			delete this.timers[key];
		}
	},

	dialogChoices(data) {
		const list = [];
		if (data.choice1) list.push({ handle: "c1", text: String(data.choice1) });
		if (data.choice2) list.push({ handle: "c2", text: String(data.choice2) });
		if (data.choice3) list.push({ handle: "c3", text: String(data.choice3) });
		if (!list.length) {
			list.push({ handle: "exec", text: "Продолжить" });
		}
		return list;
	},

	async advance(player, cq, sourceHandle) {
		this.clearTimer(player, cq);
		const quest = cq.Quest || this.getQuestById(cq.questId);
		if (!quest) return;
		const g = graphUtil.parseGraph(quest.graph);
		const edge = graphUtil.getEdge(g, cq.nodeId, sourceHandle);
		if (!edge) {
			console.log(
				`[QUESTS] Нет перехода ${cq.nodeId} -> ${sourceHandle} (${quest.key})`,
			);
			return;
		}
		cq.nodeId = edge.target;
		await cq.save();
		await this.enterNode(player, cq);
	},

	async completeQuest(player, cq, status) {
		cq.status = status || "completed";
		cq.tracked = false;
		await cq.save();
		player.call("quests.world.clear", []);
		this.syncTracker(player);
		await this.tryAutoStartReady(player);
	},

	async enterNode(player, cq, isResume) {
		const quest = cq.Quest || this.getQuestById(cq.questId);
		if (!quest) return;
		const g = graphUtil.parseGraph(quest.graph);
		const node = graphUtil.getNode(g, cq.nodeId);
		if (!node) return;

		const data = node.data || {};
		const type = node.type;
		const ctx = { player, cq, quest, node, data, g };

		switch (type) {
			case "start":
				await this.advance(player, cq, "exec");
				break;
			case "notify":
				notifs.info(
					player,
					data.text || "",
					data.header || quest.name,
				);
				await this.advance(player, cq, "exec");
				break;
			case "branch": {
				const ok = await this.evaluateBranchAsync(player, cq, data);
				await this.advance(player, cq, ok ? "true" : "false");
				break;
			}
			case "complete":
				await this.completeQuest(player, cq, "completed");
				notifs.success(player, data.text || "Квест выполнен", quest.name);
				break;
			case "fail":
				await this.completeQuest(player, cq, "failed");
				notifs.error(player, data.text || "Квест провален", quest.name);
				break;
			case "setVar": {
				const vars = this.parseVars(cq);
				const num = parseFloat(data.value);
				vars[data.varName || "var"] = isNaN(num) ? data.value || "" : num;
				await this.saveVars(cq, vars);
				await this.advance(player, cq, "exec");
				break;
			}
			case "delay": {
				const sec = Math.max(1, parseInt(data.seconds, 10) || 1);
				const key = player.character.id + ":" + cq.id;
				this.clearTimer(player, cq);
				this.syncTracker(
					player,
					cq,
					data.objective || "Подождите " + sec + " сек.",
				);
				this.timers[key] = setTimeout(() => {
					delete this.timers[key];
					if (!mp.players.exists(player) || !player.character) return;
					if (cq.status !== "active" || cq.nodeId !== node.id) return;
					this.advance(player, cq, "exec");
				}, sec * 1000);
				break;
			}
			case "mapMarker":
				player.call("quests.mapMarker.set", [
					{
						x: parseFloat(data.x),
						y: parseFloat(data.y),
						z: parseFloat(data.z),
						name: data.blipName || quest.name,
					},
				]);
				this.syncTracker(player, cq, data.objective);
				await this.advance(player, cq, "exec");
				break;
			case "checkpoint":
				player.call("quests.checkpoint.set", [
					{
						questId: quest.id,
						x: parseFloat(data.x),
						y: parseFloat(data.y),
						z: parseFloat(data.z),
						radius: parseFloat(data.radius) || 3,
						objective: data.objective || "Дойдите до точки",
					},
				]);
				this.syncTracker(player, cq, data.objective);
				break;
			case "talkNpc": {
				const spot = this.npcPoint(data);
				const worldNpc = data.npcKey && call("npcs").getByKey
					? call("npcs").getByKey(data.npcKey)
					: null;
				player.call("quests.npc.set", [
					{
						questId: quest.id,
						x: spot.x,
						y: spot.y,
						z: spot.z,
						h: spot.h || parseFloat(data.h) || 0,
						radius: parseFloat(data.radius) || 2.5,
						model: data.model || "a_m_y_business_01",
						npcName: (worldNpc && worldNpc.name) || data.npcName || "NPC",
						npcKey: data.npcKey || "",
						world: !!worldNpc,
						prompt:
							data.prompt ||
							"Нажмите <span>E</span>, чтобы поговорить",
					},
				]);
				this.syncTracker(player, cq, data.objective);
				break;
			}
			case "takeItem": {
				const itemId = parseInt(data.itemId, 10);
				const count = parseInt(data.count, 10) || 1;
				const rows =
					!itemId || inventory.isEmpty || !player.inventory
						? []
						: inventory.getArrayByItemId(player, itemId);
				if (rows.length < count) {
					notifs.error(player, "Не хватает предмета", quest.name);
					await this.advance(player, cq, "fail");
					break;
				}
				for (let i = 0; i < count; i++) {
					inventory.deleteItem(player, rows[i]);
				}
				await this.advance(player, cq, "ok");
				break;
			}
			case "wait":
				this.syncTracker(player, cq, data.objective);
				break;
			case "giveCash": {
				const amount = parseInt(data.amount, 10) || 0;
				if (amount <= 0) {
					await this.advance(player, cq, "exec");
					break;
				}
				money.addCash(player, amount, async ok => {
					if (ok) await this.advance(player, cq, "exec");
				}, "quest");
				this.syncTracker(player, cq, data.objective);
				break;
			}
			case "giveItem": {
				const itemId = parseInt(data.itemId, 10);
				const count = parseInt(data.count, 10) || 1;
				if (!itemId || inventory.isEmpty) {
					await this.advance(player, cq, "exec");
					break;
				}
				inventory.addItem(player, itemId, { count }, async err => {
					if (err) {
						notifs.error(player, String(err), quest.name);
						return;
					}
					await this.advance(player, cq, "exec");
				});
				this.syncTracker(player, cq, data.objective);
				break;
			}
			default:
				console.log(`[QUESTS] Неизвестный тип ноды: ${type}`);
		}

		if (
			type !== "checkpoint" &&
			type !== "wait" &&
			type !== "giveCash" &&
			type !== "talkNpc" &&
			type !== "mapMarker" &&
			type !== "delay"
		) {
			this.syncTracker(player);
		}
		void isResume;
		void ctx;
	},

	async onWaitSignal(player, signalName, signalData) {
		for (const cq of this.getActiveList(player)) {
			const quest = cq.Quest || this.getQuestById(cq.questId);
			if (!quest) continue;
			const g = graphUtil.parseGraph(quest.graph);
			const node = graphUtil.getNode(g, cq.nodeId);
			if (!node || node.type !== "wait") continue;
			const data = node.data || {};
			if (!this.matchWaitFilter(cq, data, signalName, signalData || {}))
				continue;

			const vars = this.parseVars(cq);
			if (data.counterVar) {
				const inc = parseFloat(data.counterInc) || 1;
				vars[data.counterVar] = (parseFloat(vars[data.counterVar]) || 0) + inc;
				await this.saveVars(cq, vars);
				const target = parseFloat(data.counterTarget);
				if (!isNaN(target) && vars[data.counterVar] < target) {
					this.syncTracker(player, cq, data.objective, vars, data);
					continue;
				}
			}
			await this.advance(player, cq, "exec");
		}
	},

	signal(player, name, data) {
		if (!player || !player.character) return;
		this.onWaitSignal(player, name, data || {});
	},

	async onCheckpointReach(player, questId) {
		const cq = this.findActive(player, questId);
		if (!cq) return;
		const quest = cq.Quest || this.getQuestById(cq.questId);
		const g = graphUtil.parseGraph(quest.graph);
		const node = graphUtil.getNode(g, cq.nodeId);
		if (!node || node.type !== "checkpoint") return;

		const data = node.data || {};
		const pos = player.position;
		const dx = pos.x - parseFloat(data.x);
		const dy = pos.y - parseFloat(data.y);
		const dz = pos.z - parseFloat(data.z);
		const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
		const radius = parseFloat(data.radius) || 3;
		if (dist > radius + 1.5) return;

		player.call("quests.world.clear", []);
		await this.advance(player, cq, "exec");
	},

	async onNpcTalk(player, questId) {
		const cq = this.findActive(player, questId);
		if (!cq) return;
		const quest = cq.Quest || this.getQuestById(cq.questId);
		const g = graphUtil.parseGraph(quest.graph);
		const node = graphUtil.getNode(g, cq.nodeId);
		if (!node || node.type !== "talkNpc") return;

		const data = node.data || {};
		const spot = this.npcPoint(data);
		const pos = player.position;
		const dx = pos.x - spot.x;
		const dy = pos.y - spot.y;
		const dz = pos.z - spot.z;
		const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
		const radius = parseFloat(data.radius) || 2.5;
		if (dist > radius + 2) return;

		if (data.npcKey) {
			const npcs = call("npcs");
			if (npcs && !npcs.isEmpty && npcs.pauseByKey) npcs.pauseByKey(player, data.npcKey);
		}

		const lines = String(data.dialog || data.text || "")
			.split("|")
			.map(s => s.trim())
			.filter(Boolean);
		player.call("quests.dialog.open", [
			{
				questId: quest.id,
				npcName: data.npcName || "NPC",
				lines: lines.length ? lines : ["..."],
				choices: this.dialogChoices(data),
			},
		]);
	},

	async onDialogChoice(player, questId, handle) {
		const cq = this.findActive(player, questId);
		if (!cq) return;
		const quest = cq.Quest || this.getQuestById(cq.questId);
		const g = graphUtil.parseGraph(quest.graph);
		const node = graphUtil.getNode(g, cq.nodeId);
		if (!node || node.type !== "talkNpc") return;
		const data = node.data || {};
		const allowed = this.dialogChoices(data).some(c => c.handle === handle);
		if (!allowed) return;
		const spot = this.npcPoint(data);
		const pos = player.position;
		const dx = pos.x - spot.x;
		const dy = pos.y - spot.y;
		const dz = pos.z - spot.z;
		if (Math.sqrt(dx * dx + dy * dy + dz * dz) > (parseFloat(data.radius) || 2.5) + 2)
			return;
		const npcs = call("npcs");
		if (npcs && !npcs.isEmpty && npcs.resume) npcs.resume(player);
		player.call("quests.dialog.close", []);
		player.call("quests.world.clear", []);
		await this.advance(player, cq, handle);
	},

	getLog(player) {
		const active = [];
		const done = [];
		for (const cq of player.questStates || []) {
			const quest = cq.Quest || this.getQuestById(cq.questId);
			if (!quest) continue;
			const g = graphUtil.parseGraph(quest.graph);
			const node = graphUtil.getNode(g, cq.nodeId);
			const item = {
				key: quest.key,
				name: quest.name,
				description: quest.description || "",
				status: cq.status,
				tracked: !!cq.tracked,
				objective:
					(node && node.data && node.data.objective) ||
					quest.description ||
					"",
			};
			if (cq.status === "active") active.push(item);
			else if (cq.status === "completed") done.push(item);
		}
		return { active, done };
	},

	openLog(player) {
		if (!player.character) return;
		player.call("quests.log.open", [this.getLog(player)]);
	},

	async abandonQuest(player, questKey) {
		const quest = this.getQuestByKey(questKey);
		if (!quest) return;
		const cq = this.findActive(player, quest.id);
		if (!cq) return;
		this.clearTimer(player, cq);
		cq.status = "failed";
		cq.tracked = false;
		await cq.save();
		player.call("quests.world.clear", []);
		player.call("quests.dialog.close", []);
		this.syncTracker(player);
		this.openLog(player);
	},

	syncTracker(player, focusCq, objectiveOverride, vars, waitData) {
		let cq =
			focusCq ||
			this.getActiveList(player).find(x => x.tracked) ||
			this.getActiveList(player)[0];
		if (!cq) {
			player.call("quests.tracker.set", [null]);
			return;
		}
		const quest = cq.Quest || this.getQuestById(cq.questId);
		const g = graphUtil.parseGraph(quest.graph);
		const node = graphUtil.getNode(g, cq.nodeId);
		const data = (node && node.data) || {};
		let objective =
			objectiveOverride || data.objective || quest.description || quest.name;
		let progress = null;
		const v = vars || this.parseVars(cq);
		if (waitData && waitData.counterVar && waitData.counterTarget) {
			progress = {
				current: parseFloat(v[waitData.counterVar]) || 0,
				target: parseFloat(waitData.counterTarget),
				unit: waitData.progressUnit || "",
			};
		} else if (
			node &&
			node.type === "wait" &&
			data.signal === "job.exp" &&
			data.op === "gte" &&
			data.value &&
			!jobsModule.isEmpty
		) {
			const skill = jobsModule.getJobSkill(player);
			if (skill) {
				progress = {
					current: skill.exp,
					target: parseFloat(data.value),
					unit: data.progressUnit || "",
				};
			}
		}
		const trackerLabel =
			data.trackerLabel ||
			(progress && progress.target > 0 ? quest.name : "Текущее задание");
		player.call("quests.tracker.set", [
			{
				questKey: quest.key,
				title: quest.name,
				label: trackerLabel,
				objective,
				progress,
			},
		]);
	},

	async setTracked(player, questKey) {
		const quest = this.getQuestByKey(questKey);
		if (!quest) return;
		const cq = this.findActive(player, quest.id);
		if (!cq) return;
		for (const row of player.questStates) {
			row.tracked = row.id === cq.id;
			await row.save();
		}
		this.syncTracker(player, cq);
	},

	async saveQuestGraph(player, payload) {
		if (!player.character || player.character.admin < 6) return false;
		let data = payload;
		if (typeof payload === "string") {
			try {
				data = JSON.parse(payload);
			} catch (e) {
				return false;
			}
		}
		const quest = await db.Models.Quest.findByPk(data.id);
		if (!quest) return false;
		if (data.key && data.key !== quest.key) {
			const taken = await db.Models.Quest.findOne({ where: { key: data.key } });
			if (taken) return false;
			quest.key = String(data.key).slice(0, 64);
		}
		quest.name = data.name || quest.name;
		quest.description = data.description != null ? data.description : quest.description;
		quest.enabled = !!data.enabled;
		quest.autoStart = data.autoStart || quest.autoStart;
		quest.requireQuest = data.requireQuest || null;
		quest.repeatable = !!data.repeatable;
		quest.graph = JSON.stringify(graphUtil.sanitizeGraphForSave(data.graph || {}));
		await quest.save();
		await this.loadFromDb();
		return true;
	},

	async createQuest(player, payload) {
		if (!player.character || player.character.admin < 6) return null;
		let data = payload;
		if (typeof payload === "string") {
			try {
				data = JSON.parse(payload);
			} catch (e) {
				return null;
			}
		}
		let key = String(data.key || "quest_" + Date.now())
			.replace(/\s+/g, "_")
			.slice(0, 64);
		const exists = await db.Models.Quest.findOne({ where: { key } });
		if (exists) key = (key + "_" + Date.now()).slice(0, 64);
		const startGraph = {
			nodes: [
				{
					id: "start_1",
					type: "start",
					position: { x: 80, y: 120 },
					data: {},
				},
			],
			edges: [],
		};
		const quest = await db.Models.Quest.create({
			key,
			name: data.name || "Новый квест",
			description: data.description || "",
			enabled: false,
			autoStart: "none",
			repeatable: false,
			graph: JSON.stringify(startGraph),
		});
		await this.loadFromDb();
		return quest;
	},

	async deleteQuest(player, questId) {
		if (!player.character || player.character.admin < 6) return false;
		const quest = await db.Models.Quest.findByPk(questId);
		if (!quest) return false;
		await db.Models.CharacterQuest.destroy({ where: { questId: quest.id } });
		await quest.destroy();
		await this.loadFromDb();
		return true;
	},

	async duplicateQuest(player, questId) {
		if (!player.character || player.character.admin < 6) return null;
		const quest = await db.Models.Quest.findByPk(questId);
		if (!quest) return null;
		const copy = await db.Models.Quest.create({
			key: (quest.key + "_" + Date.now()).slice(0, 64),
			name: quest.name + " (копия)",
			description: quest.description,
			enabled: false,
			autoStart: quest.autoStart,
			requireQuest: quest.requireQuest,
			repeatable: quest.repeatable,
			graph: quest.graph,
		});
		await this.loadFromDb();
		return copy;
	},

	async resetSelfQuest(player, questKey) {
		const quest = this.getQuestByKey(questKey);
		if (!quest) return;
		await db.Models.CharacterQuest.destroy({
			where: {
				characterId: player.character.id,
				questId: quest.id,
			},
		});
		player.questStates = (player.questStates || []).filter(
			cq => cq.questId !== quest.id,
		);
		player.call("quests.world.clear", []);
		this.syncTracker(player);
	},

	openEditor(player) {
		if (!player.character || player.character.admin < 6) return;
		player.call("questEditor.open", [this.getEditorPayload(player)]);
	},
};
