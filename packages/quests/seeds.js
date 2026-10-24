"use strict";

function buildIntroGraph(x, y, z) {
	return {
		nodes: [
			{
				id: "start_1",
				type: "start",
				position: { x: 0, y: 80 },
				data: {},
			},
			{
				id: "n_welcome",
				type: "notify",
				position: { x: 220, y: 80 },
				data: {
					text: "Добро пожаловать! Найдите гида на сервере — он расскажет, с чего начать.",
					header: "Знакомство",
					objective: "Найдите гида",
				},
			},
			{
				id: "n_map_guide",
				type: "mapMarker",
				position: { x: 400, y: 80 },
				data: {
					x,
					y,
					z,
					blipName: "Гид",
					objective: "Идите к гиду по метке на карте",
				},
			},
			{
				id: "n_talk_guide",
				type: "talkNpc",
				position: { x: 620, y: 80 },
				data: {
					x,
					y,
					z,
					radius: 3,
					npcName: "Гид",
					dialog:
						"Добро пожаловать на сервер!|Здесь ты найдёшь работы, фракции и знакомства с другими игроками.|Сначала осмотрись в городе, затем устройся на работу.",
					objective: "Поговорите с гидом",
				},
			},
			{
				id: "n_checkpoint",
				type: "checkpoint",
				position: { x: 860, y: 80 },
				data: {
					x,
					y,
					z,
					radius: 4,
					objective: "Дойдите до информационной точки",
				},
			},
			{
				id: "n_jobs_hint",
				type: "notify",
				position: { x: 700, y: 80 },
				data: {
					text: "Устройтесь на любую работу — так вы начнёте зарабатывать.",
					header: "Знакомство",
					objective: "Устройтесь на работу",
				},
			},
			{
				id: "n_wait_job",
				type: "wait",
				position: { x: 940, y: 80 },
				data: {
					signal: "job.changed",
					op: "any",
					objective: "Устройтесь на работу",
				},
			},
			{
				id: "n_reward",
				type: "giveCash",
				position: { x: 1180, y: 80 },
				data: { amount: 500, objective: "Получите награду" },
			},
			{
				id: "n_complete",
				type: "complete",
				position: { x: 1420, y: 80 },
				data: {},
			},
		],
		edges: [
			{ id: "e1", source: "start_1", target: "n_welcome", sourceHandle: "exec" },
			{ id: "e2", source: "n_welcome", target: "n_map_guide", sourceHandle: "exec" },
			{ id: "e2b", source: "n_map_guide", target: "n_talk_guide", sourceHandle: "exec" },
			{ id: "e2c", source: "n_talk_guide", target: "n_checkpoint", sourceHandle: "exec" },
			{ id: "e3", source: "n_checkpoint", target: "n_jobs_hint", sourceHandle: "exec" },
			{ id: "e4", source: "n_jobs_hint", target: "n_wait_job", sourceHandle: "exec" },
			{ id: "e5", source: "n_wait_job", target: "n_reward", sourceHandle: "exec" },
			{ id: "e6", source: "n_reward", target: "n_complete", sourceHandle: "exec" },
		],
	};
}

function buildFirstJobGraph() {
	return {
		nodes: [
			{
				id: "start_1",
				type: "start",
				position: { x: 0, y: 120 },
				data: {},
			},
			{
				id: "n_branch",
				type: "branch",
				position: { x: 200, y: 120 },
				data: { condition: "noJob" },
			},
			{
				id: "n_need_job",
				type: "notify",
				position: { x: 420, y: 40 },
				data: {
					text: "Найдите работу в городе и устройтесь.",
					header: "Первая работа",
					objective: "Устройтесь на работу",
				},
			},
			{
				id: "n_wait_job",
				type: "wait",
				position: { x: 640, y: 40 },
				data: {
					signal: "job.changed",
					op: "any",
					objective: "Устройтесь на работу",
				},
			},
			{
				id: "n_wait_exp",
				type: "wait",
				position: { x: 420, y: 220 },
				data: {
					signal: "job.exp",
					field: "exp",
					op: "gte",
					value: "10",
					progressUnit: "ед.",
					objective: "Наберите опыт на работе",
					trackerLabel: "Сбор опыта",
				},
			},
			{
				id: "n_reward",
				type: "giveCash",
				position: { x: 860, y: 120 },
				data: { amount: 1500, objective: "Получите награду" },
			},
			{
				id: "n_complete",
				type: "complete",
				position: { x: 1080, y: 120 },
				data: {},
			},
		],
		edges: [
			{ id: "e1", source: "start_1", target: "n_branch", sourceHandle: "exec" },
			{ id: "e2", source: "n_branch", target: "n_need_job", sourceHandle: "true" },
			{ id: "e3", source: "n_branch", target: "n_wait_exp", sourceHandle: "false" },
			{ id: "e4", source: "n_need_job", target: "n_wait_job", sourceHandle: "exec" },
			{ id: "e5", source: "n_wait_job", target: "n_wait_exp", sourceHandle: "exec" },
			{ id: "e6", source: "n_wait_exp", target: "n_reward", sourceHandle: "exec" },
			{ id: "e7", source: "n_reward", target: "n_complete", sourceHandle: "exec" },
		],
	};
}

module.exports = {
	async defaultSpot() {
		let x = -252.91;
		let y = -338.68;
		let z = 29.7;
		if (db.Models.InfoPoint) {
			const point = await db.Models.InfoPoint.findOne();
			if (point) {
				x = point.x;
				y = point.y;
				z = point.z;
			}
		}
		return { x, y, z };
	},

	async ensure(existingQuests) {
		if (existingQuests.length > 0) {
			await this.repairIntro(existingQuests);
			return;
		}

		const spot = await this.defaultSpot();
		const x = spot.x;
		const y = spot.y;
		const z = spot.z;
		const enabled = true;

		await db.Models.Quest.create({
			key: "intro",
			name: "Знакомство",
			description: "Первые шаги на сервере",
			enabled,
			autoStart: "onCreate",
			requireQuest: null,
			repeatable: false,
			graph: JSON.stringify(buildIntroGraph(x, y, z)),
		});

		await db.Models.Quest.create({
			key: "first_job",
			name: "Первая работа",
			description: "Устройтесь на работу и наберите опыт",
			enabled: true,
			autoStart: "onReady",
			requireQuest: "intro",
			repeatable: false,
			graph: JSON.stringify(buildFirstJobGraph()),
		});

		console.log("[QUESTS] Сиды intro / first_job созданы");
	},

	async repairIntro(existingQuests) {
		const intro = existingQuests.find(q => q.key === "intro");
		if (!intro) return;
		let graph;
		try {
			graph = JSON.parse(intro.graph || "{}");
		} catch (e) {
			graph = { nodes: [], edges: [] };
		}
		const placed = (graph.nodes || []).filter(n =>
			n.type === "mapMarker" || n.type === "talkNpc" || n.type === "checkpoint",
		);
		const empty = placed.length > 0 && placed.every(n => {
			const x = parseFloat(n.data && n.data.x);
			const y = parseFloat(n.data && n.data.y);
			return !x && !y;
		});
		if (!empty && intro.enabled) return;

		const spot = await this.defaultSpot();
		if (empty) {
			placed.forEach(n => {
				n.data = n.data || {};
				n.data.x = spot.x;
				n.data.y = spot.y;
				n.data.z = spot.z;
			});
			intro.graph = JSON.stringify(graph);
		}
		if (!intro.enabled) intro.enabled = true;
		await intro.save();
		console.log("[QUESTS] Квест intro включён");
	},
};
