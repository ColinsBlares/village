"use strict";

const routes = {};
let nearNpc = null;

function pedData(ped) {
	if (!ped || ped.type !== "ped") return null;
	try {
		return ped.getVariable("npc");
	} catch (e) {
		return null;
	}
}

function samePlayer(controller) {
	if (!controller) return false;
	const local = mp.players.local;
	if (controller === local) return true;
	if (typeof controller === "number") {
		return controller === local.handle || controller === local.remoteId;
	}
	if (controller.handle != null && controller.handle === local.handle) return true;
	if (controller.remoteId != null && controller.remoteId === local.remoteId) return true;
	return false;
}

function dist2(a, b) {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	return dx * dx + dy * dy;
}

function isClosest(ped) {
	const local = mp.players.local;
	if (!local || !local.position || !ped.position) return false;
	const mine = dist2(local.position, ped.position);
	if (mine > 250 * 250) return false;
	let closest = true;
	mp.players.forEachInStreamRange(player => {
		if (!closest || player === local || !player.position) return;
		if (dist2(player.position, ped.position) < mine) closest = false;
	});
	return closest;
}

function shouldDrive(ped) {
	const controller = ped.controller;
	if (samePlayer(controller)) return true;
	if (controller) return false;
	return isClosest(ped);
}

function stopRoute(id) {
	if (!routes[id]) return;
	clearInterval(routes[id]);
	delete routes[id];
}

function playAnim(ped, data) {
	if (!data.animDict || !data.animName) return;
	mp.utils.requestAnimDict(data.animDict, () => {
		if (!mp.peds.exists(ped)) return;
		ped.taskPlayAnim(
			data.animDict,
			data.animName,
			8,
			0,
			-1,
			1,
			0,
			false,
			false,
			false,
		);
	});
}

function routePath(data) {
	const route = (data.route || []).filter(point => point && isFinite(point.x) && isFinite(point.y));
	if (!route.length) return [];
	if (route.length === 1 && isFinite(data.x) && isFinite(data.y)) {
		return [route[0], { x: data.x, y: data.y, z: data.z }];
	}
	return route;
}

function pedExists(ped) {
	if (!ped) return false;
	if (mp.peds.exists) return mp.peds.exists(ped);
	return true;
}

function pedCoords(ped) {
	if (ped.getCoords) {
		const coords = ped.getCoords(true);
		if (coords && isFinite(coords.x)) return coords;
	}
	return ped.position;
}

function sendTo(ped, point, speed) {
	ped.freezePosition(false);
	if (ped.setBlockingOfNonTemporaryEvents) ped.setBlockingOfNonTemporaryEvents(false);
	ped.taskFollowNavMeshToCoord(point.x, point.y, point.z, speed, -1, 0.75, true, 0);
}

function walk(ped, data) {
	const points = routePath(data);
	if (!points.length) return;
	stopRoute(data.id);
	let index = 0;
	const speed = Math.max(parseFloat(data.speed) || 1, 1);
	const here = pedCoords(ped);
	if (here) {
		let best = 0;
		let bestDist = Infinity;
		points.forEach((point, pointIndex) => {
			const dist = dist2(here, point);
			if (dist < bestDist) {
				bestDist = dist;
				best = pointIndex;
			}
		});
		index = best;
	}

	function step() {
		if (!pedExists(ped) || !shouldDrive(ped)) {
			stopRoute(data.id);
			return;
		}
		const point = points[index % points.length];
		sendTo(ped, point, speed);
		routes[data.id] = setInterval(() => {
			if (!pedExists(ped) || !shouldDrive(ped)) {
				stopRoute(data.id);
				return;
			}
			const pos = pedCoords(ped);
			if (!pos) return;
			if (dist2(pos, point) < 1.6) {
				stopRoute(data.id);
				index = (index + 1) % points.length;
				step();
			}
		}, 200);
	}

	step();
}

function giveGear(ped, data) {
	const health = parseInt(data.health, 10) || 200;
	if (ped.setMaxHealth) ped.setMaxHealth(health);
	if (ped.setHealth) ped.setHealth(health);
	if (ped.setArmour) ped.setArmour(parseInt(data.armor, 10) || 0);
	if (!data.weapon) return;
	const hash = mp.game.joaat(data.weapon);
	ped.giveWeapon(hash, parseInt(data.ammo, 10) || 120, true);
	mp.game.invoke("0xADF692B254977C0C", ped.handle, hash, true);
}

function nearestVictim(ped, range) {
	const pos = pedCoords(ped);
	if (!pos) return null;
	let best = null;
	let bestDist = range * range;
	mp.players.forEachInStreamRange(player => {
		if (!player.position || player === mp.players.local && player.getHealth && player.getHealth() <= 0) return;
		const dist = dist2(player.position, pos);
		if (dist < bestDist) {
			bestDist = dist;
			best = player;
		}
	});
	return best;
}

function attack(ped, victim, range) {
	const seeing = range || 40;
	mp.game.invoke("0xC80A74AC829DDD92", ped.handle, mp.game.joaat("HATES_PLAYER"));
	mp.game.invoke("0x9F7794730795E019", ped.handle, 5, true);
	mp.game.invoke("0x9F7794730795E019", ped.handle, 46, true);
	mp.game.invoke("0x70A2D1137C8ED7C9", ped.handle, 0, false);
	if (mp.game.ped.setPedSeeingRange) mp.game.ped.setPedSeeingRange(ped.handle, seeing);
	if (mp.game.ped.setPedCombatAbility) mp.game.ped.setPedCombatAbility(ped.handle, 2);
	if (mp.game.ped.setPedCombatRange) mp.game.ped.setPedCombatRange(ped.handle, 2);
	mp.game.invoke("0xF166E48407BAC484", ped.handle, victim.handle, 0, 16);
}

function face(ped, player) {
	if (!player || !player.handle) return;
	ped.freezePosition(true);
	if (ped.taskTurnPedToFaceEntity) ped.taskTurnPedToFaceEntity(player.handle, -1);
	if (ped.taskLookAt) ped.taskLookAt(player.handle, -1, 2048, 3);
}

function applyNpc(ped) {
	const data = pedData(ped);
	if (!data) return;
	const hostile = data.kind === "hostile";
	ped.setInvincible(!hostile);
	ped.setCanRagdoll(hostile);
	giveGear(ped, data);
	let pauseId = 0;
	try {
		pauseId = ped.getVariable("npcPause") || 0;
	} catch (e) {}
	if (pauseId && shouldDrive(ped)) {
		stopRoute(data.id);
		face(ped, mp.players.atRemoteId(pauseId));
		return;
	}
	if (hostile && shouldDrive(ped)) {
		const victim = nearestVictim(ped, parseFloat(data.aggroRange) || 25);
		if (victim) {
			stopRoute(data.id);
			ped.freezePosition(false);
			attack(ped, victim, parseFloat(data.aggroRange) || 25);
			return;
		}
	}
	if (data.behavior === "route") {
		ped.freezePosition(false);
		if (shouldDrive(ped) && !routes[data.id]) walk(ped, data);
		return;
	}
	if (ped.setBlockingOfNonTemporaryEvents) ped.setBlockingOfNonTemporaryEvents(true);
	ped.freezePosition(true);
	if (data.behavior === "scenario" && data.scenario) {
		ped.taskStartScenarioInPlace(data.scenario, 0, true);
		return;
	}
	if (data.behavior === "anim") playAnim(ped, data);
}

function showNearPrompt() {
	if (!nearNpc) return;
	mp.events.call(
		"prompt.show",
		"Нажмите <span>E</span>, чтобы поговорить с " + nearNpc.name,
	);
}

mp.quests = mp.quests || {};

mp.keys.bind(0x45, true, () => {
	if (mp.busy.includes()) return;
	if (mp.game.ui.isPauseMenuActive()) return;
	if (mp.quests.tryTalk && mp.quests.tryTalk()) return;
	if (!nearNpc || !nearNpc.x) return;
	mp.events.callRemote("npcs.interact", nearNpc.id, nearNpc.x, nearNpc.y, nearNpc.z);
});

mp.events.add({
	entityStreamIn: entity => {
		if (pedData(entity)) applyNpc(entity);
	},
	entityStreamOut: entity => {
		const data = pedData(entity);
		if (data) stopRoute(data.id);
	},
	entityControllerChange: entity => {
		if (pedData(entity)) applyNpc(entity);
	},
	"npcs.near": data => {
		nearNpc = data && data.id ? data : null;
		if (nearNpc) showNearPrompt();
		else mp.events.call("prompt.hide");
	},
	"npcEditor.open": payload => {
		mp.busy.add("npcEditor", true);
		mp.callCEFR("npcEditor.open", [payload]);
	},
	"npcEditor.data": (payload, selectId) => {
		mp.callCEFR("npcEditor.setData", [payload, selectId]);
	},
	"npcEditor.close": () => {
		mp.busy.remove("npcEditor");
		mp.callCEFR("npcEditor.hide", []);
		destroyPreview();
	},
	"npcs.prompt.restore": () => {
		if (nearNpc) showNearPrompt();
	},
});

mp.events.addDataHandler("npc", entity => {
	if (entity && entity.type === "ped") applyNpc(entity);
});

const pedMode = {};

setInterval(() => {
	let nextNear = null;
	let nextDist = 3 * 3;
	const localPos = mp.players.local && mp.players.local.position;
	mp.peds.forEach(ped => {
		const data = pedData(ped);
		if (!data) return;
		const pos = pedCoords(ped);
		if (shouldDrive(ped) && pos) {
			mp.events.callRemote("npcs.live", data.id, pos.x, pos.y, pos.z);
			let pauseId = 0;
			try {
				pauseId = ped.getVariable("npcPause") || 0;
			} catch (e) {}
			if (pauseId) {
				if (pedMode[data.id] !== "pause") {
					pedMode[data.id] = "pause";
					stopRoute(data.id);
					face(ped, mp.players.atRemoteId(pauseId));
				}
			} else if (data.kind === "hostile") {
				const victim = nearestVictim(ped, parseFloat(data.aggroRange) || 25);
				if (victim) {
					if (pedMode[data.id] !== "fight") {
						pedMode[data.id] = "fight";
						stopRoute(data.id);
						ped.freezePosition(false);
						attack(ped, victim, parseFloat(data.aggroRange) || 25);
					}
				} else if (pedMode[data.id] === "fight" || pedMode[data.id] === "pause") {
					pedMode[data.id] = "";
					if (data.behavior === "route") walk(ped, data);
				}
			} else if (pedMode[data.id] === "pause") {
				pedMode[data.id] = "";
				ped.freezePosition(false);
				if (data.behavior === "route") walk(ped, data);
			} else if (data.behavior === "route" && !routes[data.id]) {
				walk(ped, data);
			}
		}
		if (!localPos || data.kind === "hostile") return;
		if (!pos) return;
		const dist = dist2(localPos, pos) + Math.pow(localPos.z - pos.z, 2);
		if (dist < nextDist) {
			nextDist = dist;
			nextNear = { id: data.id, key: data.key, name: data.name, x: pos.x, y: pos.y, z: pos.z };
		}
	});
	const same = nearNpc && nextNear && nearNpc.id === nextNear.id;
	nearNpc = nextNear;
	if (nextNear && !same) showNearPrompt();
	if (!nextNear && !same) mp.events.call("prompt.hide");
}, 400);

mp.events.add("render", () => {
	mp.peds.forEachInStreamRange(ped => {
		const data = pedData(ped);
		if (!data || !data.name) return;
		const pos = pedCoords(ped);
		if (!pos) return;
		const screen = mp.game.graphics.world3dToScreen2d(
			new mp.Vector3(pos.x, pos.y, pos.z + 1.05),
		);
		if (!screen) return;
		mp.utils.drawText2d(data.name, [screen.x, screen.y], [255, 255, 255, 210], [0.32, 0.32]);
	});
	drawRouteEditor();
});

let previewPed = null;
let routeCam = null;
let routeEdit = null;
let routeHint = "";

function destroyPreview() {
	if (previewPed && mp.peds.exists(previewPed)) previewPed.destroy();
	previewPed = null;
}

function showPreview(model, weapon, dict, anim) {
	destroyPreview();
	if (!model) return;
	const local = mp.players.local;
	const pos = local.position;
	const heading = local.getHeading ? local.getHeading() : 0;
	const rad = (heading * Math.PI) / 180;
	previewPed = mp.peds.new(
		mp.game.joaat(model),
		new mp.Vector3(pos.x + Math.sin(rad) * 1.6, pos.y + Math.cos(rad) * 1.6, pos.z),
		heading + 180,
		local.dimension,
	);
	if (!previewPed) return;
	previewPed.freezePosition(true);
	previewPed.setInvincible(true);
	if (weapon) {
		const hash = mp.game.joaat(weapon);
		previewPed.giveWeapon(hash, 30, true);
		mp.game.invoke("0xADF692B254977C0C", previewPed.handle, hash, true);
	}
	if (dict && anim) {
		mp.utils.requestAnimDict(dict, () => {
			if (!previewPed || !mp.peds.exists(previewPed)) return;
			previewPed.taskPlayAnim(dict, anim, 8, 0, -1, 1, 0, false, false, false);
		});
	}
}

function stopRouteCam(save) {
	if (!routeEdit) return;
	const points = routeEdit.points.slice();
	const id = routeEdit.id;
	routeEdit = null;
	routeHint = "";
	if (routeCam) {
		const pos = routeCam.getCoord();
		const heading = routeCam.getRot(2).z;
		routeCam.destroy(true);
		routeCam = null;
		mp.game.cam.renderScriptCams(false, false, 0, true, false);
		const local = mp.players.local;
		local.freezePosition(false);
		local.setInvincible(false);
		local.setVisible(true, false);
		local.setCollision(true, false);
		local.position = pos;
		mp.events.call("anticheat.noclip", false);
		mp.events.callRemote("anticheat.noclip", false, pos.x, pos.y, pos.z, heading);
	}
	mp.gui.cursor.show(false, false);
	if (save) mp.events.callRemote("npcs.route.set", id, JSON.stringify(points));
	else mp.events.callRemote("npcs.editor.reopen");
}

function lookPoint() {
	if (!routeCam) return null;
	const from = routeCam.getCoord();
	const dir = routeCam.getDirection();
	if (!dir) return null;
	const to = new mp.Vector3(from.x + dir.x * 60, from.y + dir.y * 60, from.z + dir.z * 60);
	const hit = mp.raycasting.testPointToPoint(from, to, mp.players.local.handle, 1 | 16);
	if (hit && hit.position) return hit.position;
	return new mp.Vector3(from.x + dir.x * 8, from.y + dir.y * 8, from.z + dir.z * 8 - 1);
}

function drawRouteEditor() {
	if (!routeEdit || !routeCam) return;
	const points = routeEdit.points;
	for (let i = 0; i < points.length; i++) {
		const point = points[i];
		mp.game.graphics.drawMarker(
			1, point.x, point.y, point.z - 1, 0, 0, 0, 0, 0, 0,
			0.45, 0.45, 0.8, 240, 192, 64, 180,
			false, false, 2, false, null, null, false,
		);
		if (i > 0) {
			const prev = points[i - 1];
			mp.game.graphics.drawLine(prev.x, prev.y, prev.z, point.x, point.y, point.z, 240, 192, 64, 220);
		}
	}
	const aim = lookPoint();
	if (aim) {
		mp.game.graphics.drawMarker(
			28, aim.x, aim.y, aim.z, 0, 0, 0, 0, 0, 0,
			0.25, 0.25, 0.25, 80, 180, 255, 200,
			false, false, 2, false, null, null, false,
		);
		if (points.length) {
			const last = points[points.length - 1];
			mp.game.graphics.drawLine(last.x, last.y, last.z, aim.x, aim.y, aim.z, 80, 180, 255, 160);
		}
	}
	mp.utils.drawText2d(routeHint, [0.5, 0.88], [255, 255, 255, 230], [0.38, 0.38]);
}

mp.events.add({
	"npcs.preview": (model, weapon, dict, anim) => {
		showPreview(model, weapon, dict, anim);
	},
	"npcs.preview.stop": () => {
		destroyPreview();
	},
	"npcEditor.hideLocal": () => {
		mp.busy.remove("npcEditor");
		mp.callCEFR("npcEditor.hide", []);
		destroyPreview();
	},
	"npcs.route.cam": (id, points, x, y, z) => {
		destroyPreview();
		mp.busy.remove("npcEditor");
		mp.callCEFR("npcEditor.hide", []);
		mp.gui.cursor.show(false, false);
		const local = mp.players.local;
		routeEdit = {
			id: id,
			points: Array.isArray(points) ? points.slice() : [],
			down: false,
		};
		routeHint = "ЛКМ точка   Backspace убрать   Enter сохранить   Esc отмена";
		routeCam = mp.cameras.new(
			"default",
			new mp.Vector3(x, y, z + 4),
			mp.game.cam.getGameplayCamRot(2),
			50,
		);
		routeCam.setActive(true);
		mp.game.cam.renderScriptCams(true, false, 0, true, false);
		local.freezePosition(true);
		local.setInvincible(true);
		local.setVisible(false, false);
		local.setCollision(false, false);
		mp.events.call("anticheat.noclip", true);
		mp.events.callRemote("anticheat.noclip", true);
	},
});

mp.events.add("render", () => {
	if (!routeCam || !routeEdit) return;
	const rot = routeCam.getRot(2);
	const lookX = mp.game.controls.getDisabledControlNormal(0, 220);
	const lookY = mp.game.controls.getDisabledControlNormal(0, 221);
	const moveX = mp.game.controls.getDisabledControlNormal(0, 218);
	const moveY = mp.game.controls.getDisabledControlNormal(0, 219);
	const dir = routeCam.getDirection();
	const pos = routeCam.getCoord();
	const speed = mp.keys.isDown(16) ? 1.5 : 0.55;
	let up = 0;
	if (mp.keys.isDown(0x20)) up = 0.45;
	if (mp.keys.isDown(0x11)) up -= 0.45;
	routeCam.setCoord(
		pos.x - dir.x * moveY * speed + dir.y * moveX * speed,
		pos.y - dir.y * moveY * speed - dir.x * moveX * speed,
		pos.z - dir.z * moveY * speed + up,
	);
	routeCam.setRot(rot.x + lookY * -5, 0, rot.z + lookX * -5, 2);
	mp.players.local.position = new mp.Vector3(pos.x, pos.y, pos.z + 1);
	if (mp.game.controls.isDisabledControlJustPressed(0, 24)) {
		const aim = lookPoint();
		if (aim) routeEdit.points.push({ x: aim.x, y: aim.y, z: aim.z });
	}
	if (mp.keys.isDown(0x08)) {
		if (!routeEdit.back) {
			routeEdit.back = true;
			routeEdit.points.pop();
		}
	} else routeEdit.back = false;
	if (mp.keys.isDown(0x0d)) {
		if (!routeEdit.enter) {
			routeEdit.enter = true;
			stopRouteCam(true);
		}
	} else if (routeEdit) routeEdit.enter = false;
	if (routeEdit && mp.keys.isDown(0x1b)) {
		if (!routeEdit.esc) {
			routeEdit.esc = true;
			stopRouteCam(false);
		}
	} else if (routeEdit) routeEdit.esc = false;
});
