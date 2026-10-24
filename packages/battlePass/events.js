"use strict";

const battlePass = require("./index");
const money = call("money");
const donate = call("donate");
const timer = call("timer");
const claimLocks = new Set();

function reportError(player, eventName, error) {
    console.error(`[BATTLE PASS] ${eventName} failed`, error && error.stack ? error.stack : error);
    player.call("battlePass.error", ["Не удалось выполнить действие. Попробуйте позже."]);
}

function withClaimLock(player, eventName, action) {
    if (!player.character) return;
    const characterId = player.character.id;
    if (claimLocks.has(characterId)) {
        return player.call("battlePass.error", ["Подождите завершения предыдущего действия."]);
    }

    claimLocks.add(characterId);
    Promise.resolve()
        .then(action)
        .catch(error => reportError(player, eventName, error))
        .finally(() => claimLocks.delete(characterId));
}

module.exports = {
    init() {
        inited(__dirname);
        timer.addInterval(() => {
            mp.players.forEach(player => {
                if (!player.character) return;
                battlePass.addDriveSample(player).catch(error => {
                    console.error("[BATTLE PASS] Failed to save driving progress", error && error.stack ? error.stack : error);
                });
            });
        }, 5000);
    },

    "characterInit.done": async player => {
        if (!player.character) return;
        try {
            player.battlePassProgress = await battlePass.getProgress(player.character.id);
        } catch (error) {
            reportError(player, "characterInit.done", error);
        }
    },

    "time.main.tick": () => {
        mp.players.forEach(player => {
            if (!player.character) return;
            battlePass.addOnlineMinute(player).catch(error => {
                console.error("[BATTLE PASS] Failed to save online progress", error && error.stack ? error.stack : error);
            });
        });
    },

    "battlePass.cash.spent": (player, amount) => {
        battlePass.addMetricProgress(player, "cashSpent", amount).catch(error => {
            console.error("[BATTLE PASS] Failed to save spending progress", error && error.stack ? error.stack : error);
        });
    },

    "playerQuit": player => {
        battlePass.flushDriveBuffer(player).catch(error => {
            console.error("[BATTLE PASS] Failed to flush driving progress", error && error.stack ? error.stack : error);
        });
    },

    "battlePass.premium.reward.claim": (player, rewardId) => {
        withClaimLock(player, "battlePass.premium.reward.claim", async () => {
            if (typeof rewardId !== "string") return;
            const reward = battlePass.premiumRewards.find(item => item.id === rewardId);
            if (!reward) return;

            const premium = await battlePass.getPremiumProgress(player.character.id);
            const claimed = battlePass.parseIds(premium.claimedRewards);
            if (!premium.enabled || claimed.includes(reward.id) || premium.points < reward.requiredPoints) return;

            claimed.push(reward.id);
            premium.claimedRewards = JSON.stringify(claimed);
            premium.cases += reward.cases;
            await premium.save();
            player.call("battlePass.data", [await battlePass.getData(player.character.id)]);
        });
    },

    "battlePass.case.open": (player) => {
        withClaimLock(player, "battlePass.case.open", async () => {
            const premium = await battlePass.getPremiumProgress(player.character.id);
            if (!premium.enabled || premium.cases < 1) return;

            premium.cases -= 1;
            await premium.save();
            const prize = battlePass.casePrizes[Math.floor(Math.random() * battlePass.casePrizes.length)];
            const granted = await new Promise(resolve => {
                money.addCash(player, prize, resolve, "Награда из кейса боевого пропуска");
            });
            if (!granted) {
                premium.cases += 1;
                await premium.save();
                player.call("battlePass.error", ["Не удалось открыть кейс. Попробуйте позже."]);
                return;
            }

            player.call("battlePass.case.opened", [prize]);
            player.call("battlePass.data", [await battlePass.getData(player.character.id)]);
        });
    },

    "battlePass.request": async player => {
        if (!player.character) return;
        try {
            const data = await battlePass.getData(player.character.id);
            player.call("battlePass.data", [data]);
        } catch (error) {
            reportError(player, "battlePass.request", error);
        }
    },

    "battlePass.task.claim": (player, taskId) => {
        withClaimLock(player, "battlePass.task.claim", async () => {
            if (typeof taskId !== "string") return;
            const task = battlePass.tasks.find(item => item.id === taskId);
            if (!task) return;

            const progress = await battlePass.getProgress(player.character.id);
            const stats = await battlePass.getStats(player.character.id);
            const claimed = battlePass.parseIds(progress.claimedTasks);
            if (claimed.includes(task.id) || battlePass.getTaskProgressValue(task, progress, stats) < task.target) return;

            claimed.push(task.id);
            progress.claimedTasks = JSON.stringify(claimed);
            progress.points += task.points;
            await progress.save();
            player.call("battlePass.data", [await battlePass.getData(player.character.id)]);
        });
    },

    "battlePass.premium.purchase": (player) => {
        withClaimLock(player, "battlePass.premium.purchase", async () => {
            const premium = await battlePass.getPremiumProgress(player.character.id);
            if (premium.enabled) {
                player.call("battlePass.data", [await battlePass.getData(player.character.id)]);
                return;
            }
            if (!player.account || player.account.donate < battlePass.premiumPrice) {
                player.call("battlePass.error", [`Для премиум-ветки необходимо ${battlePass.premiumPrice} CC.`]);
                return;
            }

            donate.setDonate(
                player,
                player.account.donate - battlePass.premiumPrice,
                "Покупка премиум-ветки боевого пропуска"
            );
            premium.enabled = 1;
            await premium.save();
            player.call("battlePass.data", [await battlePass.getData(player.character.id)]);
        });
    },

    "battlePass.premium.task.claim": (player, taskId) => {
        withClaimLock(player, "battlePass.premium.task.claim", async () => {
            if (typeof taskId !== "string") return;
            const task = battlePass.premiumTasks.find(item => item.id === taskId);
            if (!task) return;

            const [premium, progress, stats] = await Promise.all([
                battlePass.getPremiumProgress(player.character.id),
                battlePass.getProgress(player.character.id),
                battlePass.getStats(player.character.id)
            ]);
            const claimed = battlePass.parseIds(premium.claimedTasks);
            if (!premium.enabled || claimed.includes(task.id) || battlePass.getTaskProgressValue(task, progress, stats) < task.target) return;

            claimed.push(task.id);
            premium.claimedTasks = JSON.stringify(claimed);
            premium.points += task.points;
            await premium.save();
            player.call("battlePass.data", [await battlePass.getData(player.character.id)]);
        });
    },

    "battlePass.reward.claim": (player, rewardId) => {
        withClaimLock(player, "battlePass.reward.claim", async () => {
            if (typeof rewardId !== "string") return;
            const reward = battlePass.rewards.find(item => item.id === rewardId);
            if (!reward) return;

            const progress = await battlePass.getProgress(player.character.id);
            const claimed = battlePass.parseIds(progress.claimedRewards);
            if (claimed.includes(reward.id) || progress.points < reward.requiredPoints) return;

            claimed.push(reward.id);
            progress.claimedRewards = JSON.stringify(claimed);
            await progress.save();

            const granted = await new Promise(resolve => {
                money.addCash(player, reward.cash, resolve, `Награда боевого пропуска — уровень ${reward.level}`);
            });
            if (!granted) {
                claimed.pop();
                progress.claimedRewards = JSON.stringify(claimed);
                await progress.save();
                player.call("battlePass.error", ["Не удалось выдать награду. Попробуйте позже."]);
                return;
            }

            player.call("battlePass.data", [await battlePass.getData(player.character.id)]);
        });
    }
};
