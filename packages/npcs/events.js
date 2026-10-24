"use strict";

const npcs = require("./index");

module.exports = {
	init: async () => {
		await npcs.init();
		inited(__dirname);
	},

	playerEnterColshape: (player, shape) => {
		if (!shape || !shape.isNpcShape) return;
		player.npcNear = shape.npcId;
		player.call("npcs.near", [
			{ id: shape.npcId, key: shape.npcKey, name: shape.npcName },
		]);
	},

	playerExitColshape: (player, shape) => {
		if (!shape || !shape.isNpcShape) return;
		if (player.npcNear === shape.npcId) player.npcNear = null;
		player.call("npcs.near", [null]);
	},

	"npcs.route.index": (player, id, index) => {
		npcs.setRouteIndex(parseInt(id, 10), parseInt(index, 10) || 0);
	},

	"npcs.interact": (player, id, x, y, z) => {
		npcs.interact(player, id, x, y, z);
	},

	"npcs.live": (player, id, x, y, z) => {
		npcs.setLive(id, x, y, z);
	},

	"npcs.resume": player => {
		npcs.resume(player);
	},

	"npcs.route.begin": (player, id) => {
		if (!player.character || player.character.admin < 6) return;
		const npc = npcs.getById(parseInt(id, 10));
		if (!npc) return;
		player.call("npcEditor.hideLocal", []);
		player.call("npcs.route.cam", [npc.id, npcs.toClient(npc).route, npc.x, npc.y, npc.z]);
	},

	"npcs.editor.reopen": player => {
		npcs.openEditor(player);
	},

	"npcs.route.set": async (player, id, raw) => {
		let points = raw;
		if (typeof raw === "string") {
			try {
				points = JSON.parse(raw);
			} catch (e) {
				points = [];
			}
		}
		const npc = await npcs.setRoute(player, id, points);
		if (npc) npcs.pushEditor(player, npc.id);
	},

	"npcs.save": async (player, payload) => {
		const npc = await npcs.save(player, payload);
		npcs.pushEditor(player, npc ? npc.id : 0);
	},

	"npcs.create": async (player, payload) => {
		const npc = await npcs.create(player, payload);
		npcs.pushEditor(player, npc ? npc.id : 0);
	},

	"npcs.delete": async (player, id) => {
		await npcs.remove(player, parseInt(id, 10));
		npcs.pushEditor(player, 0);
	},

	"npcs.route.add": async (player, id) => {
		await npcs.addRoutePoint(player, parseInt(id, 10));
		npcs.pushEditor(player, parseInt(id, 10));
	},

	"npcs.route.clear": async (player, id) => {
		await npcs.clearRoute(player, parseInt(id, 10));
		npcs.pushEditor(player, parseInt(id, 10));
	},
};
