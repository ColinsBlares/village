"use strict";

/*
    Модуль лесоруба.

    created 25.10.19 by Carter Slade
*/

mp.woodman = {
    treeHealthBar: {
        width: 0.14,
        height: 0.018,
        border: 0.0007,
        textColor: [255, 255, 255, 255],
        textScale: [0.22, 0.22],
        getProgressColor() {
            var player = mp.players.local;
            return (player.isInMeleeCombat()) ? [255, 76, 76, 150] : [12, 30, 38, 180];
        },
        getFillColor(health) {
            if (health > 50) return [82, 220, 120, 220];
            if (health > 15) return [255, 189, 59, 220];

            return [238, 92, 92, 220];
        },
    },
    logHealthBar: {
        width: 0.065,
        height: 0.0135,
        border: 0.0005,
        textColor: [255, 255, 255, 220],
        textScale: [0.17, 0.17],
        getProgressColor() {
            return [10, 22, 31, 120];
        },
        getFillColor(health) {
            if (health > 50) return [82, 220, 120, 160];
            if (health > 15) return [255, 189, 59, 160];

            return [238, 92, 92, 160];
        },
    },
    treeHealth: 0,
    treePos: null,
    treeChop: {
        active: false,
        required: 0,
        progress: 0
    },
    logSquats: [],
    logObj: null,
    logFocusSlotI: -1,
    lastStartMelee: 0,
    hitWaitTime: 500,
    // Высота и ширина бревна
    logSize: {
        height: 0.3,
        width: 4.4,
    },
    logTimer: null,


    drawBarBackground(x, y, width, height, color) {
        mp.game.graphics.drawRect(x, y, width + 0.004, height + 0.006, 0, 0, 0, 100);
        mp.game.graphics.drawRect(x, y, width + 0.004, height + 0.006, color[0], color[1], color[2], color[3]);
        mp.game.graphics.drawRect(x, y + height * 0.1, width + 0.004, height * 0.8, 255, 255, 255, 12);
    },
    drawTreeHealthBar(x, y) {
        var info = this.treeHealthBar;
        var color = info.getProgressColor();
        var border = info.border;
        var fillColor = info.getFillColor(this.treeHealth);
        var textColor = info.textColor;
        var textScale = info.textScale;
        var barWidth = info.width;
        var barX = x - barWidth / 2;
        var barY = y;
        var fillWidth = Math.max(0, barWidth * this.treeHealth / 100);

        this.drawBarBackground(barX, barY, barWidth, info.height, color, [255, 255, 255, 90]);
        mp.game.graphics.drawRect(barX + border, barY + border, fillWidth, info.height - border * 2,
            fillColor[0], fillColor[1], fillColor[2], fillColor[3]);
        mp.game.graphics.drawRect(barX + fillWidth - 0.003, barY + border * 0.7, 0.003, info.height - border * 1.4,
            255, 255, 255, 210);
        mp.game.graphics.drawText('Дерево', [x - barWidth / 2 - 0.02, y - 0.04], {
            font: 0,
            color: [210, 235, 245, 210],
            scale: [0.16, 0.16],
            outline: false
        });
        mp.game.graphics.drawText(`${this.treeHealth}%`, [x + barWidth / 2 + 0.016, y - 0.04 * textScale[0]], {
            font: 0,
            color: textColor,
            scale: textScale,
            outline: false,
            alignment: 0
        });
    },
    drawLogHealthBar(x, y, index) {
        var info = this.logHealthBar;
        var health = this.logSquats[index];
        var color = info.getProgressColor();
        var border = info.border;
        var fillColor = info.getFillColor(health);
        var textColor = info.textColor;
        var textScale = info.textScale;
        var barWidth = info.width;
        var barX = x - barWidth / 2;
        var barY = y;
        var fillWidth = Math.max(0, barWidth * health / 100);

        if (this.logFocusSlotI == index) {
            color[3] = fillColor[3] = 210;
            mp.game.graphics.drawRect(barX - 0.005, barY - 0.004, barWidth + 0.01, info.height + 0.01, 90, 225, 200, 70);
        }

        this.drawBarBackground(barX, barY, barWidth, info.height, color, [255, 255, 255, 90]);
        mp.game.graphics.drawRect(barX + border, barY + border, fillWidth, info.height - border * 2,
            fillColor[0], fillColor[1], fillColor[2], fillColor[3]);
        mp.game.graphics.drawText(`${health}%`, [x, y - 0.042 * textScale[0]], {
            font: 0,
            color: textColor,
            scale: textScale,
            outline: false,
            alignment: 0
        });
    },
    drawTreeChopGame() {
        var progress = this.treeChop.required
            ? Math.min(this.treeChop.progress / this.treeChop.required, 1)
            : 0;
        var x = 0.5;
        var y = 0.84;
        var width = 0.34;
        var height = 0.115;

        mp.game.graphics.drawRect(x, y, width, height, 7, 20, 25, 220);
        mp.game.graphics.drawRect(x, y - 0.043, width - 0.006, 0.003, 67, 125, 105, 180);
        mp.game.graphics.drawText('РУБКА ДЕРЕВА', [x, y - 0.035], {
            font: 4,
            color: [220, 241, 225, 255],
            scale: [0.32, 0.32],
            outline: true,
            centre: true
        });
        mp.game.graphics.drawText('Кликайте ЛКМ по стволу', [x, y - 0.006], {
            font: 0,
            color: [201, 220, 210, 255],
            scale: [0.27, 0.27],
            outline: true,
            centre: true
        });
        mp.game.graphics.drawRect(x, y + 0.027, width - 0.045, 0.012, 3, 12, 16, 220);
        if (progress > 0) {
            mp.game.graphics.drawRect(x - (width - 0.045) * (1 - progress) / 2, y + 0.027,
                (width - 0.045) * progress, 0.008, 102, 205, 130, 255);
        }
        mp.game.graphics.drawText(`${this.treeChop.progress} / ${this.treeChop.required}`, [x, y + 0.043], {
            font: 0,
            color: [245, 250, 245, 255],
            scale: [0.23, 0.23],
            outline: true,
            centre: true
        });
    },
    startTreeChop(required, health) {
        this.treeChop.active = true;
        this.treeChop.required = required;
        this.treeChop.progress = 0;
        this.treeHealth = health;
        this.lastStartMelee = 0;
        mp.prompt.hide();
    },
    stopTreeChop(notifyServer) {
        if (!this.treeChop.active) return;
        this.treeChop.active = false;
        this.treeChop.required = 0;
        this.treeChop.progress = 0;
        this.lastStartMelee = 0;
        if (notifyServer) mp.events.callRemote(`woodman.trees.chop.cancel`);

        if (this.treePos && this.treeHealth > 0) {
            if (this.isAxInHands()) mp.prompt.showByName('woodman_start_ax');
            else mp.prompt.showByName('woodman_take_ax');
        }
    },
    isAxInHands(player) {
        if (!player) player = mp.players.local;
        return player.weapon == mp.game.joaat('weapon_hatchet') || player.weapon == mp.game.joaat('weapon_stone_hatchet');
    },
    isFocusTree() {
        if (!this.treePos) return false;
        var player = mp.players.local;
        var positions = [
            player.position,
            player.getOffsetFromInWorldCoords(-1, 0, 0),
            player.getOffsetFromInWorldCoords(1, 0, 0),
            player.getOffsetFromInWorldCoords(0, 0, 1),
            player.getOffsetFromInWorldCoords(0, 0, -1),
        ];
        var treeEntity = null;
        for (var i = 0; i < positions.length; i++) {
            var raycastToTree = mp.raycasting.testPointToPoint(positions[i], this.treePos);
            // mp.game.graphics.drawLine(positions[i].x, positions[i].y, positions[i].z, this.treePos.x, this.treePos.y, this.treePos.z, 255, 255, 255, 100);
            if (raycastToTree && raycastToTree.entity) {
                treeEntity = raycastToTree.entity;
                break;
            }
        }
        if (!treeEntity) return false;
        // var frontHash = mp.utils.getFrontObjectHash(player);
        // if (!frontHash || frontHash != raycastToTree.entity) return false;
        var frontPos = player.getOffsetFromInWorldCoords(0, 1, this.treePos.z - player.position.z);

        return mp.vdist(player.position, this.treePos) > mp.vdist(frontPos, this.treePos);
    },
    setInside(data) {
        if (!data) return mp.callCEFV(`selectMenu.show = false`);

        mp.callCEFV(`selectMenu.menus['woodman'].init(${JSON.stringify(data)})`);
        mp.callCEFV(`selectMenu.showByName('woodman')`);
    },
    setTreeInside(pos, health) {
        if (pos) {
            this.treePos = pos;
            this.treeHealth = health;
            if (health > 0) {
                if (this.isAxInHands()) mp.prompt.showByName('woodman_start_ax');
                else mp.prompt.showByName('woodman_take_ax');
            } else {
                mp.prompt.hide();
            }
        } else {
            this.stopTreeChop(true);
            mp.prompt.hide();

            this.treePos = null;
            this.treeHealth = 0;
        }
    },
    getFreeTreeSlot() {
        var player = mp.players.local;
        var leftPos = player.getOffsetFromInWorldCoords(2, -this.logSize.width / 2, 3);
        var rightPos = player.getOffsetFromInWorldCoords(2, this.logSize.width / 2, 3);

        var leftGroundZ = mp.game.gameplay.getGroundZFor3dCoord(leftPos.x, leftPos.y, leftPos.z, false, false);
        var rightGroundZ = mp.game.gameplay.getGroundZFor3dCoord(rightPos.x, rightPos.y, rightPos.z, false, false);

        var leftDist = mp.vdist(leftPos, new mp.Vector3(leftPos.x, leftPos.y, leftGroundZ));
        var rightDist = mp.vdist(rightPos, new mp.Vector3(rightPos.x, rightPos.y, rightGroundZ));

        var alpha = -Math.sin((leftDist - rightDist) / this.logSize.width) * 180 / Math.PI;

        var objPos = player.getOffsetFromInWorldCoords(2, 0, 3);
        objPos.z = mp.game.gameplay.getGroundZFor3dCoord(objPos.x, objPos.y, objPos.z, false, false) + this.logSize.height / 2;

        return {
            pos: objPos,
            rot: new mp.Vector3(0, alpha, player.getHeading() + 90),
        };
    },
    setLogInside(squats, objId) {
        if (squats) {
            if (this.isAxInHands()) mp.prompt.showByName('woodman_log_start_ax');
            else mp.prompt.showByName('woodman_log_take_ax');

            this.logSquats = squats;
            this.logObj = mp.objects.atRemoteId(objId);
        } else {
            mp.prompt.hide();

            this.logSquats = [];
            this.logObj = null;
        }
    },
    getLogSlots(obj) {
        var slots = [
            obj.getOffsetFromInWorldCoords(-2, 0, 0),
            obj.getOffsetFromInWorldCoords(-1, 0, 0),
            obj.getOffsetFromInWorldCoords(0, 0, 0),
            obj.getOffsetFromInWorldCoords(1, 0, 0),
            obj.getOffsetFromInWorldCoords(2, 0, 0),
        ];
        return slots;
    },
    hitLogHandler() {
        if (this.logFocusSlotI == -1 || !this.logObj || !mp.objects.exists(this.logObj) || this.logTimer != null) return;
        if (!this.isAxInHands()) return;
        if (!this.logSquats[this.logFocusSlotI]) return mp.notify.error(`Перейдите к другой части бревна`, `Лесоруб`);

        // TODO: set correct heading
        mp.busy.add("jobProcess", false);
        mp.events.callRemote(`animations.playById`, 5523);
        this.logTimer = mp.timer.add(() => {
            this.stopLogTimer();
            if (!mp.objects.exists(this.logObj) || !this.logObj || this.logFocusSlotI == -1 || !this.logSquats[this.logFocusSlotI]) {
                return;
            }
            mp.events.callRemote(`woodman.logs.hit`, this.logFocusSlotI);
        }, 2000);
    },
    stopLogTimer() {
        mp.timer.remove(this.logTimer);
        this.logTimer = null;
        mp.busy.remove("jobProcess");
        mp.events.callRemote(`animations.stop`);
    },
    createJobPed() {
        var pedInfo = {
            model: "mp_m_counterfeit_01",
            position: {
                x: -567.8530883789062,
                y: 5254.45556640625,
                z: 70.46736907958984
            },
            heading: 146.89959716796875,
        };
        mp.events.call('NPC.create', pedInfo);
    },
};

mp.events.add({
    "render": () => {
        var start = Date.now();
        var player = mp.players.local;
        if (mp.woodman.treeChop.active) {
            mp.woodman.lastStartMelee = 0;
            mp.game.controls.disableControlAction(0, 25, true);
            mp.game.controls.disableControlAction(0, 140, true);
            mp.game.controls.disableControlAction(0, 257, true);

            if (!mp.woodman.isAxInHands(player) || !mp.woodman.treePos
                || mp.vdist(player.position, mp.woodman.treePos) > 4) {
                mp.woodman.stopTreeChop(true);
            } else {
                mp.woodman.drawTreeChopGame();
                return;
            }
        }
        if (!mp.woodman.isAxInHands(player)) return;
        if (mp.woodman.treePos) {
            var startPos = player.getOffsetFromInWorldCoords(0, 0, 0);
            var endPos = player.getOffsetFromInWorldCoords(0, 1, 0);
            // mp.game.graphics.drawLine(startPos.x, startPos.y, startPos.z, endPos.x, endPos.y, endPos.z, 255, 255, 255, 100);

            startPos = player.getOffsetFromInWorldCoords(0, 0, 0);
            endPos = player.getOffsetFromInWorldCoords(-0.3, 1, 0);
            // mp.game.graphics.drawLine(startPos.x, startPos.y, startPos.z, endPos.x, endPos.y, endPos.z, 255, 255, 255, 100);

            startPos = player.getOffsetFromInWorldCoords(0, 0, 0);
            endPos = player.getOffsetFromInWorldCoords(0.3, 1, 0);
            // mp.game.graphics.drawLine(startPos.x, startPos.y, startPos.z, endPos.x, endPos.y, endPos.z, 255, 255, 255, 100);

            if (mp.woodman.isFocusTree()) {
                var pos2d = mp.game.graphics.world3dToScreen2d(mp.woodman.treePos);
                if (pos2d) mp.woodman.drawTreeHealthBar(pos2d.x, pos2d.y);
            }
        } else {
            mp.game.controls.disableControlAction(0, 24, true); /// удары
            mp.game.controls.disableControlAction(0, 25, true); /// INPUT_AIM
            mp.game.controls.disableControlAction(0, 140, true); /// удары R
            mp.game.controls.disableControlAction(0, 257, true); // INPUT_ATTACK2
        }
        if (mp.objects.exists(mp.woodman.logObj) && mp.woodman.logObj) {
            var slots = mp.woodman.getLogSlots(mp.woodman.logObj);
            if (mp.woodman.logTimer == null) {
                var playerPos = player.getOffsetFromInWorldCoords(0, 0, -1);
                var nearSlot = mp.utils.getNearPos(playerPos, slots, mp.x);
                mp.woodman.logFocusSlotI = slots.indexOf(nearSlot);
                var frontPos = player.getOffsetFromInWorldCoords(0, 0.5, -1);
                if (mp.vdist(playerPos, nearSlot) < mp.vdist(frontPos, nearSlot)) mp.woodman.logFocusSlotI = -1;
            }
            // if (mp.woodman.logFocusSlotI != -1) {
            //     var pos2d = mp.game.graphics.world3dToScreen2d(slots[mp.woodman.logFocusSlotI]);
            //     if (pos2d) mp.woodman.drawLogHealthBar(pos2d.x, pos2d.y);
            // }
            for (var i = 0; i < slots.length; i++) {
                var slot = slots[i];
                var pos2d = mp.game.graphics.world3dToScreen2d(slot);
                if (pos2d) mp.woodman.drawLogHealthBar(pos2d.x, pos2d.y, i);
            }

            mp.game.controls.disableControlAction(0, 24, true); /// удары
            mp.game.controls.disableControlAction(0, 25, true); /// INPUT_AIM
            mp.game.controls.disableControlAction(0, 140, true); /// удары R
            mp.game.controls.disableControlAction(0, 257, true); // INPUT_ATTACK2

            // var startPos = player.getOffsetFromInWorldCoords(0, 0, 0);
            // var endPos = player.getOffsetFromInWorldCoords(0, 0.5, -1);
            // mp.game.graphics.drawLine(startPos.x, startPos.y, startPos.z, endPos.x, endPos.y, endPos.z, 0, 187, 255, 100);
        }
        if (mp.woodman.lastStartMelee && Date.now() > mp.woodman.lastStartMelee + mp.woodman.hitWaitTime) {
            mp.woodman.lastStartMelee = 0;

            if (mp.woodman.isAxInHands() && mp.woodman.treePos && mp.woodman.isFocusTree()) {
                mp.events.callRemote(`woodman.trees.hit`);
            }
        }

        if (mp.renderChecker) mp.utils.drawText2d(`woodman rend: ${Date.now() - start} ms`, [0.8, 0.69]);
    },
    "woodman.storage.inside": (data) => {
        mp.woodman.setInside(data);
    },
    "woodman.tree.inside": (pos, health) => {
        mp.woodman.setTreeInside(pos, health);
    },
    "woodman.tree.health": (health) => {
        mp.woodman.treeHealth = health;
        if (health <= 0) mp.woodman.stopTreeChop(true);
    },
    "woodman.tree.chop.start": (required, health) => {
        mp.woodman.startTreeChop(required, health);
    },
    "woodman.tree.chop.progress": (progress) => {
        if (mp.woodman.treeChop.active) mp.woodman.treeChop.progress = progress;
    },
    "woodman.tree.chop.end": (success) => {
        mp.woodman.stopTreeChop(false);
        if (!success && mp.woodman.treePos && mp.woodman.treeHealth > 0) {
            mp.notify.error(`Рубка прервана`, `Лесоруб`);
        }
    },
    "woodman.log.request": () => {
        var slot = mp.woodman.getFreeTreeSlot();
        mp.events.callRemote(`woodman.logs.add`, JSON.stringify(slot));
    },
    "woodman.log.inside": (squats, objId) => {
        mp.woodman.setLogInside(squats, objId);
    },
    "woodman.log.health": (objId, slotI, health) => {
        if (mp.woodman.logFocusSlotI == slotI) mp.woodman.stopLogTimer();
        if (!mp.objects.exists(mp.woodman.logObj) || !mp.woodman.logObj || mp.woodman.logObj.remoteId != objId) return;
        mp.woodman.logSquats[slotI] = health;
    },
    "woodman.items.request": () => {
        if (!mp.woodman.logObj) return
        var slots = mp.woodman.getLogSlots(mp.woodman.logObj);
        slots.forEach(slot => {
            slot.z -= mp.woodman.logSize.height / 2;
            slot.rZ = mp.woodman.logObj.rotation.z + 20;
        });
        mp.events.callRemote(`woodman.items.add`, JSON.stringify(slots));
    },
    "playerWeaponChanged": (weapon) => {
        if (mp.woodman.treePos) {
            if (mp.woodman.treeChop.active && !mp.woodman.isAxInHands()) {
                mp.woodman.stopTreeChop(true);
            } else if (mp.woodman.treeHealth > 0) {
                if (mp.woodman.isAxInHands()) mp.prompt.showByName('woodman_start_ax');
                else mp.prompt.showByName('woodman_take_ax');
            }
        } else if (mp.woodman.logObj) {
            if (mp.woodman.isAxInHands()) mp.prompt.showByName('woodman_log_start_ax');
            else mp.prompt.showByName('woodman_log_take_ax');
        }
    },
    "playerStartMeleeCombat": () => {
        if (mp.woodman.treeChop.active) return;
        if (!mp.woodman.isAxInHands()) return;
        if (!mp.woodman.treePos) return;
        if (!mp.woodman.isFocusTree()) return;
        if (mp.woodman.treeHealth <= 0) return mp.notify.error(`Дерево исчерпало свой ресурс`);

        mp.woodman.lastStartMelee = Date.now();
    },
    "click": (x, y, upOrDown, leftOrRight, relativeX, relativeY, worldPosition, hitEntity) => {
        if (upOrDown != 'down' || leftOrRight != 'left') return;

        if (mp.game.ui.isPauseMenuActive()) return;
        if (mp.woodman.treeChop.active) {
            if (!mp.woodman.isAxInHands() || !mp.woodman.treePos
                || mp.vdist(mp.players.local.position, mp.woodman.treePos) > 4) return;
            mp.events.callRemote(`woodman.trees.chop.click`);
            return;
        }
        if (mp.busy.includes()) return;
        mp.woodman.hitLogHandler();
    },
});

mp.woodman.createJobPed();
