let donate = call('donate');
let caseLocks = new Set();

module.exports = {
    "donate.case.open": async (player, caseId) => {
        if (!player.character || typeof caseId !== "string") return;
        const accountId = player.account && player.account.id;
        if (caseLocks.has(accountId)) return;
        caseLocks.add(accountId);
        try {
            const result = await donate.openCase(player, caseId);
            if (result.error) {
                player.call("donate.case.failed");
                return call("notifications").error(player, result.error, "Донат-кейс");
            }
            player.call("donate.case.opened", [result]);
        } catch (error) {
            console.error("[DONATE] Case purchase failed", error && error.stack ? error.stack : error);
            player.call("donate.case.failed");
            call("notifications").error(player, "Не удалось открыть кейс. Попробуйте позже.", "Донат-кейс");
        } finally {
            caseLocks.delete(accountId);
        }
    },
    "donate.convert": (player, sum) => {
        donate.convert(player, sum);
    },
    "donate.nickname.set": (player, name) => {
        donate.setNickname(player, name);
    },
    "donate.warns.clear": (player) => {
        donate.clearWarn(player);
    },
    "donate.slots.add": (player) => {
        donate.addSlot(player);
    },
}
