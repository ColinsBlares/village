"use strict";

let checkpoint = null;
let checkpointBlip = null;
let checkpointTick = null;
let markerBlip = null;
let npcState = null;
let npcPed = null;
let npcBlip = null;
let npcTick = null;

function destroyBlip(blip) {
	if (blip) {
		blip.destroy();
	}
}

function clearCheckpoint() {
	checkpoint = null;
	destroyBlip(checkpointBlip);
	checkpointBlip = null;
	if (checkpointTick) {
		clearInterval(checkpointTick);
		checkpointTick = null;
	}
}

function clearMapMarker() {
	destroyBlip(markerBlip);
	markerBlip = null;
}

function clearNpc() {
	npcState = null;
	if (npcPed) {
		npcPed.destroy();
		npcPed = null;
	}
	destroyBlip(npcBlip);
	npcBlip = null;
	if (npcTick) {
		clearInterval(npcTick);
		npcTick = null;
	}
	mp.events.call("prompt.hide");
	mp.events.call("quests.dialog.close");
	mp.events.call("npcs.prompt.restore");
}

function clearQuestWorld() {
	clearCheckpoint();
	clearMapMarker();
	clearNpc();
}

function startCheckpointWatch(data) {
	clearCheckpoint();
	checkpoint = data;
	const pos = new mp.Vector3(data.x, data.y, data.z);
	checkpointBlip = mp.blips.new(1, pos, {
		name: "Квест",
		color: 5,
		shortRange: false,
	});
	mp.game.ui.setNewWaypoint(data.x, data.y);

	checkpointTick = setInterval(() => {
		if (!checkpoint) return;
		const local = mp.players.local;
		if (!local || !local.position) return;
		const dx = local.position.x - checkpoint.x;
		const dy = local.position.y - checkpoint.y;
		const dz = local.position.z - checkpoint.z;
		const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
		const radius = checkpoint.radius || 3;
		if (dist <= radius + 0.5) {
			mp.events.callRemote(
				"quests.checkpoint.reach",
				checkpoint.questId,
			);
			clearCheckpoint();
		}
	}, 500);
}

function setMapMarker(data) {
	clearMapMarker();
	const pos = new mp.Vector3(data.x, data.y, data.z);
	markerBlip = mp.blips.new(1, pos, {
		name: data.name || "Квест",
		color: 5,
		shortRange: false,
	});
	mp.game.ui.setNewWaypoint(data.x, data.y);
}

function worldPed() {
	if (!npcState || !npcState.npcKey) return null;
	let found = null;
	mp.peds.forEachInStreamRange(ped => {
		let data = null;
		try {
			data = ped.getVariable("npc");
		} catch (e) {}
		if (data && data.key === npcState.npcKey) found = ped;
	});
	return found;
}

function npcDistance() {
	if (!npcState) return Infinity;
	const local = mp.players.local;
	if (!local || !local.position) return Infinity;
	const ped = npcState.world ? worldPed() : null;
	const pos = ped ? ped.position : npcState;
	const dx = local.position.x - pos.x;
	const dy = local.position.y - pos.y;
	const dz = local.position.z - pos.z;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

mp.quests = mp.quests || {};
mp.quests.tryTalk = () => {
	if (!npcState) return false;
	if (mp.busy.includes()) return false;
	const radius = npcState.radius || 2.5;
	if (npcDistance() > radius + 0.5) return false;
	mp.events.callRemote("quests.npc.talk", npcState.questId);
	return true;
};

function startNpcWatch(data) {
	clearNpc();
	npcState = data;
	const pos = new mp.Vector3(data.x, data.y, data.z);
	mp.game.ui.setNewWaypoint(data.x, data.y);
	if (!data.world) {
		npcBlip = mp.blips.new(480, pos, {
			name: data.npcName || "NPC",
			color: 2,
			shortRange: false,
		});
		npcPed = mp.peds.new(
			mp.game.joaat(data.model || "a_m_y_business_01"),
			pos,
			data.h || 0,
			0,
		);
	}
	npcTick = setInterval(() => {
		if (!npcState) return;
		const radius = npcState.radius || 2.5;
		if (npcDistance() <= radius + 0.5) {
			mp.events.call(
				"prompt.show",
				npcState.prompt ||
					"Нажмите <span>E</span>, чтобы поговорить",
			);
		} else {
			mp.events.call("prompt.hide");
		}
	}, 250);
}

mp.events.add({
	"quests.tracker.set": data => {
		mp.callCEFR("hud.quest.set", [data]);
	},
	"quests.checkpoint.set": data => {
		startCheckpointWatch(data);
	},
	"quests.mapMarker.set": data => {
		setMapMarker(data);
	},
	"quests.npc.set": data => {
		startNpcWatch(data);
	},
	"quests.dialog.open": data => {
		mp.busy.add("questDialog", true);
		mp.callCEFR("questDialog.open", [data]);
	},
	"quests.dialog.close": () => {
		mp.busy.remove("questDialog");
		mp.callCEFR("questDialog.hide", []);
		mp.events.callRemote("npcs.resume");
	},
	"quests.log.open": data => {
		mp.busy.add("questLog", true);
		mp.callCEFR("questLog.open", [data]);
	},
	"quests.log.close": () => {
		mp.busy.remove("questLog");
		mp.callCEFR("questLog.hide", []);
	},
	"quests.checkpoint.clear": () => {
		clearQuestWorld();
	},
	"quests.world.clear": () => {
		clearQuestWorld();
	},
	"questEditor.open": payload => {
		mp.busy.add("questEditor", true);
		mp.callCEFR("questEditor.open", [payload]);
	},
	"questEditor.data": payload => {
		mp.callCEFR("questEditor.setData", [payload]);
	},
	"questEditor.close": () => {
		mp.busy.remove("questEditor");
		mp.callCEFR("questEditor.hide", []);
	},
	"quests.editor.requestPosition": () => {
		const local = mp.players.local;
		if (!local || !local.position) return;
		mp.callCEFR("questEditor.setPosition", [
			{
				x: local.position.x,
				y: local.position.y,
				z: local.position.z,
				h: local.getHeading ? local.getHeading() : 0,
			},
		]);
	},
});

mp.keys.bind(0x4A, true, () => {
	if (mp.busy.includes()) return;
	if (mp.game.ui.isPauseMenuActive()) return;
	mp.events.callRemote("quests.log.request");
});
