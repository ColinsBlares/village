"use strict";

const HEADER = "Обмен";
const RANGE = 5;
const MAX_ITEMS = 12;
const MAX_CASH = 10000000;
const OFFER_MS = 12000;

const byCharacter = new Map();
const live = new Set();
const pending = new Map();

let inventory;
let money;
let notifs;
let logger;

function deps() {
    if (inventory) return;
    inventory = call("inventory");
    money = call("money");
    notifs = call("notifications");
    logger = call("logger");
}

function alive(player) {
    return !!(player && mp.players.exists(player) && player.character && player.inventory && player.inventory.items);
}

function tell(player, kind, text) {
    if (!alive(player)) return;
    notifs[kind](player, text, HEADER);
}

function blockReason(a, b) {
    if (!alive(a) || !alive(b)) return "Игрок недоступен";
    if (a.vehicle || b.vehicle) return "Обмен недоступен в транспорте";
    if (a.getVariable("knocked") || b.getVariable("knocked")) return "Игрок без сознания";
    if (a.inventory.search || b.inventory.search) return "Сначала закончите обыск";
    if ((a.inventory.place && a.inventory.place.sqlId) || (b.inventory.place && b.inventory.place.sqlId)) return "Сначала закройте багажник или шкаф";
    if (a.dimension != b.dimension || a.dist(b.position) > RANGE) return "Игрок слишком далеко";
    return null;
}

function sessionOf(player) {
    if (player && player.character && byCharacter.has(player.character.id)) return byCharacter.get(player.character.id);
    for (const session of live) {
        if (session.a === player || session.b === player) return session;
    }
    return null;
}

function otherPlayer(session, player) {
    return session.a === player ? session.b : session.a;
}

function blankSide() {
    return { items: [], cash: 0, ready: false, confirm: false };
}

function unready(session) {
    const sides = [session.sides[session.aId], session.sides[session.bId]];
    for (let i = 0; i < sides.length; i++) {
        sides[i].ready = false;
        sides[i].confirm = false;
    }
}

function forget(session) {
    if (!session || session.closed) return;
    session.closed = true;
    live.delete(session);
    byCharacter.delete(session.aId);
    byCharacter.delete(session.bId);
}

function closeUi(player) {
    if (!player || !mp.players.exists(player)) return;
    player.call("trade.close");
}

function cancel(session, text) {
    if (!session || session.closed || session.locked) return;
    const a = session.a;
    const b = session.b;
    forget(session);
    tell(a, "info", text);
    tell(b, "info", text);
    closeUi(a);
    closeUi(b);
}

function finish(session) {
    const a = session.a;
    const b = session.b;
    forget(session);
    tell(a, "success", "Обмен завершён");
    tell(b, "success", "Обмен завершён");
    closeUi(a);
    closeUi(b);
}

function safeName(itemId) {
    const info = inventory.getInventoryItem(itemId);
    return info ? info.name : "Предмет";
}

function paramsOf(item) {
    try {
        if (!item || !item.params) return {};
        return inventory.getParamsValues(item);
    } catch (e) {
        return {};
    }
}

function itemTitle(item) {
    const infoName = safeName(item.itemId);
    const params = paramsOf(item);
    if (params.name && [6, 7, 8, 9, 15, 131, 133, 134].indexOf(item.itemId) != -1) return String(params.name);
    if (item.itemId == 16 && params.name) return infoName + " " + params.name;
    if (item.itemId == 33 && params.vehName) return "Ключи от " + params.vehName;
    return infoName;
}

function describe(item) {
    const params = paramsOf(item);
    const count = parseInt(params.count, 10);
    const client = {};
    if (count > 0) client.count = count;
    if (params.health != null) client.health = params.health;
    if (params.name) client.name = params.name;
    if (params.vehName) client.vehName = params.vehName;
    return {
        sqlId: item.id,
        itemId: item.itemId,
        name: itemTitle(item),
        count: count > 0 ? count : 0,
        params: client,
    };
}

function factionLocked(item) {
    if (!item || !item.params) return false;
    const param = inventory.getParam(item, "faction");
    if (!param) return false;
    const value = param.value;
    return value != null && value !== "" && value !== "0" && value !== "null";
}

function treeOf(player, item) {
    return [item].concat(inventory.getArrayItems(player, item));
}

function lockedTree(player, item) {
    const tree = treeOf(player, item);
    for (let i = 0; i < tree.length; i++) {
        if (factionLocked(tree[i])) return true;
    }
    return false;
}

function isTradable(player, item) {
    if (!item || !item.parentId) return false;
    const parent = inventory.getItem(player, item.parentId);
    if (!parent || parent.parentId) return false;
    if (lockedTree(player, item)) return false;
    return true;
}

function isAncestor(player, item, ancestorId) {
    let current = item;
    let guard = 0;
    while (current && current.parentId && guard < 20) {
        if (current.parentId == ancestorId) return true;
        current = inventory.getItem(player, current.parentId);
        guard++;
    }
    return false;
}

function overlapsOffer(player, item, ids) {
    for (let i = 0; i < ids.length; i++) {
        if (ids[i] == item.id) return true;
        const other = inventory.getItem(player, ids[i]);
        if (!other) continue;
        if (isAncestor(player, item, other.id)) return true;
        if (isAncestor(player, other, item.id)) return true;
    }
    return false;
}

function listTradable(player, offered) {
    const list = [];
    const items = player.inventory.items;
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (offered.indexOf(item.id) != -1) continue;
        if (!isTradable(player, item)) continue;
        list.push(describe(item));
    }
    list.sort(function (a, b) {
        return String(a.name).localeCompare(String(b.name), "ru");
    });
    return list;
}

function describeIds(player, ids) {
    const list = [];
    for (let i = 0; i < ids.length; i++) {
        const item = inventory.getItem(player, ids[i]);
        if (!item) continue;
        list.push(describe(item));
    }
    return list;
}

function sanitize(session) {
    if (session.locked || session.closed) return;
    let changed = false;
    const players = [session.a, session.b];
    for (let p = 0; p < players.length; p++) {
        const player = players[p];
        if (!alive(player)) continue;
        const offer = session.sides[player.character.id];
        const next = [];
        for (let i = 0; i < offer.items.length; i++) {
            const item = inventory.getItem(player, offer.items[i]);
            if (!item || !isTradable(player, item)) {
                changed = true;
                continue;
            }
            next.push(item.id);
        }
        if (next.length != offer.items.length) {
            offer.items = next;
            changed = true;
        }
        const wallet = Math.max(0, parseInt(player.character.cash, 10) || 0);
        if (offer.cash > wallet) {
            offer.cash = wallet;
            changed = true;
        }
    }
    if (changed) unready(session);
}

function payloadFor(me, them, session) {
    const mine = session.sides[me.character.id];
    const theirs = session.sides[them.character.id];
    return {
        partnerName: them.name,
        partnerId: them.id,
        cash: parseInt(me.character.cash, 10) || 0,
        items: listTradable(me, mine.items),
        offerItems: describeIds(me, mine.items),
        offerCash: mine.cash,
        ready: mine.ready,
        confirm: mine.confirm,
        theirItems: describeIds(them, theirs.items),
        theirCash: theirs.cash,
        theirReady: theirs.ready,
        theirConfirm: theirs.confirm,
    };
}

function push(session) {
    if (!session || session.closed || session.locked) return;
    if (!alive(session.a) || !alive(session.b)) return cancel(session, "Обмен отменён");
    sanitize(session);
    if (session.closed) return;
    session.a.call("trade.apply", [JSON.stringify(payloadFor(session.a, session.b, session))]);
    session.b.call("trade.apply", [JSON.stringify(payloadFor(session.b, session.a, session))]);
}

function normalizeCash(player, raw) {
    if (raw == null || raw === "") return 0;
    const value = parseInt(raw, 10);
    if (isNaN(value) || value < 0) return null;
    const wallet = Math.max(0, parseInt(player.character.cash, 10) || 0);
    return Math.min(value, wallet, MAX_CASH);
}

function setCashValue(player, raw) {
    const session = sessionOf(player);
    const offer = session.sides[player.character.id];
    const sum = normalizeCash(player, raw);
    if (sum == null) return false;
    if (sum === offer.cash) return false;
    offer.cash = sum;
    return true;
}

function clearPendingOf(player) {
    if (player && player.character) pending.delete(player.character.id);
    for (const [id, offer] of pending) {
        if (offer.from === player) pending.delete(id);
    }
}

function pendingFor(player) {
    if (!player || !player.character) return null;
    const offer = pending.get(player.character.id);
    if (!offer) return null;
    if (Date.now() - offer.at > OFFER_MS) {
        pending.delete(player.character.id);
        return null;
    }
    return offer;
}

function findPocketSlot(player, itemId) {
    const items = player.inventory.items;
    for (let i = 0; i < items.length; i++) {
        const holder = items[i];
        if (!holder.id || holder.parentId) continue;
        const params = paramsOf(holder);
        if (!params.pockets || !params.pockets.length) continue;
        if (holder.itemId == itemId) continue;
        if (inventory.blackListExists(holder.itemId, itemId)) continue;
        const pockets = params.pockets.length / 2;
        for (let j = 0; j < pockets; j++) {
            const matrix = inventory.genMatrix(player, holder, j);
            if (!matrix) continue;
            const freeIndex = inventory.findFreeIndexMatrix(matrix, itemId);
            if (freeIndex == -1) continue;
            return {
                pocketIndex: j,
                index: freeIndex,
                parentId: holder.id,
            };
        }
    }
    return null;
}

function takePack(player, offer) {
    const roots = [];
    const trees = [];
    const ids = {};
    for (let i = 0; i < offer.items.length; i++) {
        const item = inventory.getItem(player, offer.items[i]);
        if (!item || !isTradable(player, item)) return { error: "Один из предметов уже недоступен" };
        const tree = treeOf(player, item);
        for (let j = 0; j < tree.length; j++) ids[tree[j].id] = true;
        roots.push(item);
        trees.push(tree);
    }
    return { roots: roots, trees: trees, ids: ids };
}

function weightOf(player, pack) {
    let sum = 0;
    for (let i = 0; i < pack.roots.length; i++) sum += inventory.getItemWeight(player, pack.roots[i]);
    return sum;
}

function hasWeapon(player, itemId, ignore) {
    const items = player.inventory.items;
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.itemId != itemId || ignore[item.id]) continue;
        if (inventory.getParam(item, "weaponHash")) return true;
    }
    return false;
}

function sexBlocked(player, item) {
    const params = paramsOf(item);
    return !!(params.sex && params.sex != !player.character.gender);
}

function checkFit(receiver, incomingPlayer, incoming, outgoing) {
    const seen = {};
    for (let i = 0; i < incoming.trees.length; i++) {
        const tree = incoming.trees[i];
        for (let j = 0; j < tree.length; j++) {
            const item = tree[j];
            if (sexBlocked(receiver, item)) return "Предмет противоположного пола";
            if (!inventory.getParam(item, "weaponHash")) continue;
            if (seen[item.itemId] || hasWeapon(receiver, item.itemId, outgoing.ids)) {
                return "Оружие " + safeName(item.itemId) + " уже имеется";
            }
            seen[item.itemId] = true;
        }
    }
    const next = inventory.getCommonWeight(receiver) - weightOf(receiver, outgoing) + weightOf(incomingPlayer, incoming);
    if (next > inventory.maxPlayerWeight + 0.001) {
        return "Превышение по весу (" + next.toFixed(1) + " из " + inventory.maxPlayerWeight + " кг)";
    }
    return null;
}

function snapshot(pack) {
    const snaps = [];
    for (let i = 0; i < pack.trees.length; i++) {
        const tree = pack.trees[i];
        for (let j = 0; j < tree.length; j++) {
            const item = tree[j];
            snaps.push({
                item: item,
                playerId: item.playerId,
                parentId: item.parentId,
                pocketIndex: item.pocketIndex,
                index: item.index,
            });
        }
    }
    return snaps;
}

function pullFrom(player, item) {
    if (!player || !player.inventory) return;
    const index = player.inventory.items.indexOf(item);
    if (index != -1) player.inventory.items.splice(index, 1);
}

function strip(player, pack) {
    for (let i = 0; i < pack.trees.length; i++) {
        const tree = pack.trees[i];
        for (let j = 0; j < tree.length; j++) pullFrom(player, tree[j]);
    }
}

function restore(a, b, snapA, snapB) {
    const all = snapA.concat(snapB);
    for (let i = 0; i < all.length; i++) {
        pullFrom(a, all[i].item);
        pullFrom(b, all[i].item);
    }
    putBack(a, snapA);
    putBack(b, snapB);
}

function putBack(player, snaps) {
    if (!alive(player)) return;
    for (let i = 0; i < snaps.length; i++) {
        const snap = snaps[i];
        snap.item.playerId = snap.playerId;
        snap.item.parentId = snap.parentId;
        snap.item.pocketIndex = snap.pocketIndex;
        snap.item.index = snap.index;
        player.inventory.items.push(snap.item);
    }
}

function placeAll(receiver, pack) {
    for (let i = 0; i < pack.roots.length; i++) {
        const root = pack.roots[i];
        const tree = pack.trees[i];
        const slot = findPocketSlot(receiver, root.itemId);
        if (!slot) return safeName(root.itemId);
        root.parentId = slot.parentId;
        root.pocketIndex = slot.pocketIndex;
        root.index = slot.index;
        for (let j = 0; j < tree.length; j++) {
            tree[j].playerId = receiver.character.id;
            receiver.inventory.items.push(tree[j]);
        }
    }
    return null;
}

function transferCash(from, to, sum) {
    return new Promise(function (resolve) {
        if (!sum) return resolve(true);
        if (!alive(from) || !alive(to)) return resolve(false);
        money.moveCash(
            from,
            to,
            sum,
            function (result) { resolve(!!result); },
            "Обмен с персонажем #" + to.character.id,
            "Обмен с персонажем #" + from.character.id
        );
    });
}

async function saveItems(snaps) {
    for (let i = 0; i < snaps.length; i++) {
        try {
            await snaps[i].item.save();
        } catch (e) {
            console.log("[trade] save", e);
            await snaps[i].item.save();
        }
    }
}

function syncMove(from, to, pack) {
    if (!alive(to)) return;
    for (let i = 0; i < pack.roots.length; i++) {
        const root = pack.roots[i];
        if (from && mp.players.exists(from)) from.call("inventory.deleteItem", [root.id]);
        to.call("inventory.addItem", [
            inventory.convertServerToClientItem(to.inventory.items, root),
            root.pocketIndex,
            root.index,
            root.parentId,
        ]);
    }
}

function fail(session, text) {
    if (!session || session.closed) return;
    session.locked = false;
    if (session.sides[session.aId]) {
        session.sides[session.aId].ready = false;
        session.sides[session.aId].confirm = false;
    }
    if (session.sides[session.bId]) {
        session.sides[session.bId].ready = false;
        session.sides[session.bId].confirm = false;
    }
    tell(session.a, "error", text);
    tell(session.b, "error", text);
    push(session);
}

async function commit(session) {
    if (!session || session.closed || session.locked) return;
    session.locked = true;
    const a = session.a;
    const b = session.b;
    const reason = blockReason(a, b);
    if (reason) {
        session.locked = false;
        return cancel(session, "Обмен отменён");
    }

    const packA = takePack(a, session.sides[session.aId]);
    if (packA.error) return fail(session, packA.error);
    const packB = takePack(b, session.sides[session.bId]);
    if (packB.error) return fail(session, packB.error);

    const cashA = session.sides[session.aId].cash;
    const cashB = session.sides[session.bId].cash;
    if (!packA.roots.length && !packB.roots.length && !cashA && !cashB) return fail(session, "Нечего обменивать");

    const fitA = checkFit(a, b, packB, packA);
    if (fitA) return fail(session, fitA);
    const fitB = checkFit(b, a, packA, packB);
    if (fitB) return fail(session, fitB);

    if ((parseInt(a.character.cash, 10) || 0) < cashA || (parseInt(b.character.cash, 10) || 0) < cashB) {
        return fail(session, "Недостаточно наличных");
    }

    const snapA = snapshot(packA);
    const snapB = snapshot(packB);
    strip(a, packA);
    strip(b, packB);

    try {
        const noRoomA = placeAll(b, packA);
        if (noRoomA) {
            restore(a, b, snapA, snapB);
            return fail(session, "Нет места для " + noRoomA);
        }
        const noRoomB = placeAll(a, packB);
        if (noRoomB) {
            restore(a, b, snapA, snapB);
            return fail(session, "Нет места для " + noRoomB);
        }
    } catch (e) {
        console.log("[trade] place", e);
        restore(a, b, snapA, snapB);
        return fail(session, "Не удалось переложить предметы");
    }

    const paidA = await transferCash(a, b, cashA);
    if (!paidA) {
        restore(a, b, snapA, snapB);
        return fail(session, "Не удалось передать деньги");
    }
    const paidB = await transferCash(b, a, cashB);
    if (!paidB) {
        await transferCash(b, a, cashA);
        restore(a, b, snapA, snapB);
        return fail(session, "Не удалось передать деньги");
    }

    try {
        await saveItems(snapA.concat(snapB));
    } catch (e) {
        console.log("[trade] save failed", e);
    }
    syncMove(a, b, packA);
    syncMove(b, a, packB);

    try {
        if (logger && !logger.isEmpty && logger.log) {
            logger.log("Обмен с #" + b.character.id + " предметы " + packA.roots.length + " деньги " + cashA, "trade", a);
            logger.log("Обмен с #" + a.character.id + " предметы " + packB.roots.length + " деньги " + cashB, "trade", b);
        }
    } catch (e) {
        console.log("[trade] log", e);
    }
    finish(session);
}

function ensureSession(player) {
    deps();
    const session = sessionOf(player);
    if (!session || session.closed) return null;
    if (session.locked) {
        tell(player, "error", "Обмен уже выполняется");
        return null;
    }
    const reason = blockReason(session.a, session.b);
    if (reason) {
        cancel(session, "Обмен отменён");
        tell(player, "error", reason);
        return null;
    }
    return session;
}

setInterval(function () {
    live.forEach(function (session) {
        try {
            if (session.locked || session.closed) return;
            deps();
            if (blockReason(session.a, session.b)) cancel(session, "Обмен отменён");
        } catch (e) {
            console.log("[trade]", e);
        }
    });
}, 1000);

module.exports = {
    offer(player, targetId) {
        deps();
        const target = mp.players.at(parseInt(targetId, 10));
        if (!alive(player)) return;
        if (!alive(target) || target === player) return tell(player, "error", "Игрок не найден");
        const reason = blockReason(player, target);
        if (reason) return tell(player, "error", reason);
        if (sessionOf(player) || sessionOf(target)) return tell(player, "error", "Обмен уже идёт");
        const existing = pendingFor(target);
        if (existing && existing.from !== player) return tell(player, "error", "Игроку уже предложили обмен");

        clearPendingOf(player);
        pending.set(target.character.id, { from: player, at: Date.now() });
        target.call("offerDialog.show", ["trade", {
            playerId: player.id,
            name: player.name,
        }]);
        tell(player, "info", "Вы предложили обмен " + target.name);
    },

    accept(player, fromId) {
        deps();
        if (!alive(player)) return;
        const offer = pendingFor(player);
        pending.delete(player.character.id);
        if (!offer || !alive(offer.from) || offer.from.id != parseInt(fromId, 10)) {
            return tell(player, "error", "Предложение не найдено");
        }
        const from = offer.from;
        const reason = blockReason(from, player);
        if (reason) {
            tell(player, "error", reason);
            tell(from, "error", reason);
            return;
        }
        if (sessionOf(from) || sessionOf(player)) {
            tell(player, "error", "Обмен уже идёт");
            return;
        }
        const session = {
            a: from,
            b: player,
            aId: from.character.id,
            bId: player.character.id,
            locked: false,
            closed: false,
            sides: {},
        };
        session.sides[session.aId] = blankSide();
        session.sides[session.bId] = blankSide();
        byCharacter.set(session.aId, session);
        byCharacter.set(session.bId, session);
        live.add(session);
        push(session);
    },

    decline(player, fromId) {
        deps();
        if (!player || !player.character) return;
        const offer = pendingFor(player);
        if (!offer || !offer.from || offer.from.id != parseInt(fromId, 10)) return;
        pending.delete(player.character.id);
        if (alive(offer.from)) tell(offer.from, "info", player.name + " отказался от обмена");
    },

    addItem(player, sqlId) {
        const session = ensureSession(player);
        if (!session) return;
        const id = parseInt(sqlId, 10);
        if (!id) return;
        const offer = session.sides[player.character.id];
        if (offer.items.indexOf(id) != -1) return;
        if (offer.items.length >= MAX_ITEMS) return tell(player, "error", "В обмене уже максимум предметов");
        const item = inventory.getItem(player, id);
        if (!item || !isTradable(player, item)) return tell(player, "error", "Этот предмет нельзя обменять");
        if (overlapsOffer(player, item, offer.items)) return tell(player, "error", "Предмет уже участвует в обмене");
        offer.items.push(item.id);
        unready(session);
        push(session);
    },

    removeItem(player, sqlId) {
        const session = ensureSession(player);
        if (!session) return;
        const id = parseInt(sqlId, 10);
        const offer = session.sides[player.character.id];
        const index = offer.items.indexOf(id);
        if (index == -1) return;
        offer.items.splice(index, 1);
        unready(session);
        push(session);
    },

    setCash(player, raw) {
        const session = ensureSession(player);
        if (!session) return;
        if (normalizeCash(player, raw) == null) return tell(player, "error", "Некорректная сумма");
        if (!setCashValue(player, raw)) return;
        unready(session);
        push(session);
    },

    ready(player, raw, flag) {
        const session = ensureSession(player);
        if (!session) return;
        if (raw != null && raw !== "" && normalizeCash(player, raw) == null) return tell(player, "error", "Некорректная сумма");
        const changed = raw != null && raw !== "" ? setCashValue(player, raw) : false;
        if (changed) unready(session);
        const offer = session.sides[player.character.id];
        const other = session.sides[otherPlayer(session, player).character.id];
        const want = parseInt(flag, 10) === 1;
        if (want) {
            if (!offer.items.length && !offer.cash && !other.items.length && !other.cash) {
                return tell(player, "error", "Нечего обменивать");
            }
            offer.ready = true;
            offer.confirm = false;
        } else {
            offer.ready = false;
            offer.confirm = false;
            other.confirm = false;
        }
        push(session);
    },

    confirm(player, raw) {
        const session = ensureSession(player);
        if (!session) return;
        if (raw != null && raw !== "" && normalizeCash(player, raw) == null) return tell(player, "error", "Некорректная сумма");
        const changed = raw != null && raw !== "" ? setCashValue(player, raw) : false;
        if (changed) {
            unready(session);
            push(session);
            return tell(player, "error", "Сумма изменилась, нажмите «Готов» ещё раз");
        }
        const offer = session.sides[player.character.id];
        const other = session.sides[otherPlayer(session, player).character.id];
        if (!offer.ready || !other.ready) return tell(player, "error", "Оба должны нажать «Готов»");
        if (offer.confirm) return;
        offer.confirm = true;
        if (!other.confirm) return push(session);
        commit(session).catch(function (e) {
            console.log("[trade]", e);
            fail(session, "Не удалось выполнить обмен");
        });
    },

    cancelRequest(player) {
        deps();
        const session = sessionOf(player);
        if (!session) return closeUi(player);
        if (session.locked) return;
        cancel(session, "Обмен отменён");
    },

    drop(player) {
        deps();
        clearPendingOf(player);
        const session = sessionOf(player);
        if (!session || session.locked) return;
        cancel(session, "Обмен отменён");
    },
};
