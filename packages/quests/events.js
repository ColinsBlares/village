"use strict";

const quests = require("./index");

module.exports = {
	init: async () => {
		quests.init();
		await quests.loadFromDb();
		await quests.ensureSeeds();
		inited(__dirname);
	},

	"characterInit.done": async player => {
		if (!player.character) return;
		await quests.loadCharacterQuests(player);
		await quests.resumeActive(player);
		const isNew =
			!!(player.characterInit && player.characterInit.created) ||
			(player.character.minutes || 0) < 2;
		if (isNew) await quests.tryAutoStart(player, "onCreate");
		await quests.tryAutoStartReady(player);
	},

	"player.job.changed": player => {
		quests.signal(player, "job.changed", {
			jobId: player.character.job,
		});
	},

	"player.jobSkill.changed": (player, skill) => {
		quests.signal(player, "job.exp", {
			jobId: skill.jobId,
			exp: skill.exp,
		});
	},

	"player.faction.changed": player => {
		quests.signal(player, "faction.changed", {
			factionId: player.character.factionId,
		});
	},

	"vehicle.ready": (player, vehicle) => {
		quests.signal(player, "vehicle.enter", {
			vehicleId: vehicle && vehicle.id,
		});
	},

	"death.spawn": player => {
		quests.signal(player, "death.spawn", {});
	},

	"money.add": (player, amount, reason) => {
		quests.signal(player, "money.add", { amount, reason });
	},

	"money.remove": (player, amount, reason) => {
		quests.signal(player, "money.remove", { amount, reason });
	},

	"inventory.add": (player, itemId) => {
		quests.signal(player, "inventory.add", { itemId });
	},

	"quests.checkpoint.reach": (player, questId) => {
		questId = parseInt(questId, 10);
		quests.onCheckpointReach(player, questId);
	},

	"quests.npc.talk": (player, questId) => {
		questId = parseInt(questId, 10);
		quests.onNpcTalk(player, questId);
	},

	"quests.dialog.choice": (player, questId, handle) => {
		questId = parseInt(questId, 10);
		quests.onDialogChoice(player, questId, handle);
	},

	"quests.log.request": player => {
		quests.openLog(player);
	},

	"quests.track": async (player, questKey) => {
		await quests.setTracked(player, questKey);
		quests.openLog(player);
	},

	"quests.abandon": async (player, questKey) => {
		await quests.abandonQuest(player, questKey);
	},

	"questEditor.save": async (player, payload) => {
		const ok = await quests.saveQuestGraph(player, payload);
		if (ok) {
			player.call("questEditor.data", [quests.getEditorPayload(player)]);
		}
	},

	"questEditor.create": async (player, payload) => {
		const quest = await quests.createQuest(player, payload);
		player.call("questEditor.data", [
			quests.getEditorPayload(player),
			quest ? quest.id : 0,
		]);
	},

	"questEditor.delete": async (player, questId) => {
		await quests.deleteQuest(player, parseInt(questId, 10));
		player.call("questEditor.data", [quests.getEditorPayload(player), 0]);
	},

	"questEditor.duplicate": async (player, questId) => {
		const quest = await quests.duplicateQuest(player, parseInt(questId, 10));
		player.call("questEditor.data", [
			quests.getEditorPayload(player),
			quest ? quest.id : 0,
		]);
	},

	"questEditor.assignSelf": async (player, questKey) => {
		if (!player.character || player.character.admin < 6) return;
		await quests.resetSelfQuest(player, questKey);
		await quests.startQuest(player, questKey, { tracked: true, force: true });
	},

	"questEditor.resetSelf": async (player, questKey) => {
		if (!player.character || player.character.admin < 6) return;
		await quests.resetSelfQuest(player, questKey);
	},

	"questEditor.refresh": player => {
		if (!player.character || player.character.admin < 6) return;
		player.call("questEditor.data", [quests.getEditorPayload(player)]);
	},
};
