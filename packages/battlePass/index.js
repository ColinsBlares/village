"use strict";

const TASKS = [
    { id: "online_10", title: "Первый шаг", description: "Проведите в игре 10 минут", metric: "onlineMinutes", target: 10, unit: "мин.", points: 50 },
    { id: "spend_25000", title: "Первые покупки", description: "Потратьте 25 000 $ наличными", metric: "cashSpent", target: 25000, unit: "$", points: 100 },
    { id: "drive_5km", title: "По дорогам города", description: "Проедьте 5 км за рулём автомобиля", metric: "drivenMeters", target: 5000, unit: "км", displayScale: 1000, points: 100 },
    { id: "online_60", title: "Постоянный участник", description: "Проведите в игре 60 минут", metric: "onlineMinutes", target: 60, unit: "мин.", points: 150 },
    { id: "spend_100000", title: "Активный покупатель", description: "Потратьте 100 000 $ наличными", metric: "cashSpent", target: 100000, unit: "$", points: 200 }
];

const PREMIUM_TASKS = [
    { id: "premium_online_30", title: "Знакомство с городом", description: "Проведите в игре 30 минут", metric: "onlineMinutes", target: 30, unit: "мин.", points: 50 },
    { id: "premium_drive_15km", title: "Дальняя поездка", description: "Проедьте 15 км за рулём автомобиля", metric: "drivenMeters", target: 15000, unit: "км", displayScale: 1000, points: 100 },
    { id: "premium_spend_100000", title: "Большие планы", description: "Потратьте 100 000 $ наличными", metric: "cashSpent", target: 100000, unit: "$", points: 150 },
    { id: "premium_online_120", title: "Жизнь города", description: "Проведите в игре 120 минут", metric: "onlineMinutes", target: 120, unit: "мин.", points: 200 },
    { id: "premium_spend_300000", title: "Премиальный шопинг", description: "Потратьте 300 000 $ наличными", metric: "cashSpent", target: 300000, unit: "$", points: 200 }
];

const REWARDS = [
    { id: "level_1", level: 1, requiredPoints: 50, type: "cash", cash: 1000 },
    { id: "level_2", level: 2, requiredPoints: 150, type: "cash", cash: 3000 },
    { id: "level_3", level: 3, requiredPoints: 300, type: "cash", cash: 5000 },
    { id: "level_4", level: 4, requiredPoints: 500, type: "cash", cash: 10000 }
];

const PREMIUM_REWARDS = [
    { id: "premium_case_1", level: 1, requiredPoints: 50, type: "case", cases: 1 },
    { id: "premium_case_2", level: 2, requiredPoints: 150, type: "case", cases: 1 },
    { id: "premium_case_3", level: 3, requiredPoints: 300, type: "case", cases: 1 },
    { id: "premium_case_4", level: 4, requiredPoints: 500, type: "case", cases: 2 }
];

const PREMIUM_PRICE = 500;
const CASE_PRIZES = [2500, 5000, 10000, 20000, 50000];

function parseIds(value) {
    const ids = JSON.parse(value || "[]");
    if (!Array.isArray(ids) || ids.some(id => typeof id !== "string")) {
        throw new Error("Некорректный список полученных наград боевого пропуска");
    }
    return ids;
}

function getProgress(characterId) {
    return db.Models.BattlePassProgress.findOrCreate({
        where: { characterId: characterId },
        defaults: { characterId: characterId }
    }).then(result => result[0]);
}

function getPremiumProgress(characterId) {
    return db.Models.BattlePassPremium.findOrCreate({
        where: { characterId: characterId },
        defaults: { characterId: characterId }
    }).then(result => result[0]);
}

function getStats(characterId) {
    return db.Models.BattlePassStats.findOrCreate({
        where: { characterId: characterId },
        defaults: { characterId: characterId }
    }).then(result => result[0]);
}

function getTaskValue(task, progress, stats) {
    if (task.metric === "onlineMinutes") return progress.onlineMinutes;
    return stats[task.metric] || 0;
}

function getTaskData(task, value, claimed) {
    const scale = task.displayScale || 1;
    return {
        ...task,
        progress: Math.min(value, task.target) / scale,
        target: task.target / scale,
        completed: value >= task.target,
        claimed: claimed.includes(task.id)
    };
}

module.exports = {
    tasks: TASKS,
    premiumTasks: PREMIUM_TASKS,
    rewards: REWARDS,
    premiumRewards: PREMIUM_REWARDS,
    premiumPrice: PREMIUM_PRICE,
    casePrizes: CASE_PRIZES,

    getProgress,
    getPremiumProgress,
    getStats,
    getTaskProgressValue: getTaskValue,
    parseIds,

    async getData(characterId) {
        const progress = await getProgress(characterId);
        const premium = await getPremiumProgress(characterId);
        const stats = await getStats(characterId);
        const claimedTasks = parseIds(progress.claimedTasks);
        const claimedRewards = parseIds(progress.claimedRewards);
        const claimedPremiumTasks = parseIds(premium.claimedTasks);
        const claimedPremiumRewards = parseIds(premium.claimedRewards);
        const entries = await db.Models.BattlePassProgress.findAll({
            where: { points: { [Op.gt]: 0 } },
            attributes: ["characterId", "points"],
            include: [{
                model: db.Models.Character,
                attributes: ["name"],
                required: true
            }],
            order: [["points", "DESC"], ["characterId", "ASC"]],
            limit: 10
        });
        const rank = await db.Models.BattlePassProgress.count({
            where: { points: { [Op.gt]: progress.points } }
        });

        return {
            season: "Сезон 01",
            points: progress.points,
            onlineMinutes: progress.onlineMinutes,
            premiumEnabled: !!premium.enabled,
            premiumPoints: premium.points,
            premiumCases: premium.cases,
            premiumPrice: PREMIUM_PRICE,
            rank: rank + 1,
            tasks: TASKS.map(task => getTaskData(task, getTaskValue(task, progress, stats), claimedTasks)),
            premiumTasks: PREMIUM_TASKS.map(task => getTaskData(task, getTaskValue(task, progress, stats), claimedPremiumTasks)),
            rewards: REWARDS.map(reward => ({
                ...reward,
                unlocked: progress.points >= reward.requiredPoints,
                claimed: claimedRewards.includes(reward.id)
            })),
            premiumRewards: PREMIUM_REWARDS.map(reward => ({
                ...reward,
                unlocked: !!premium.enabled && premium.points >= reward.requiredPoints,
                claimed: claimedPremiumRewards.includes(reward.id)
            })),
            leaderboard: entries.map(entry => ({
                characterId: entry.characterId,
                name: entry.Character.name,
                points: entry.points
            }))
        };
    },

    async addOnlineMinute(player) {
        if (!player.character || player.getVariable("afk")) return;
        const progress = player.battlePassProgress || await getProgress(player.character.id);
        player.battlePassProgress = progress;
        progress.onlineMinutes += 1;
        await progress.save();
        player.call("battlePass.onlineMinutes", [progress.onlineMinutes]);
    },

    async addMetricProgress(player, metric, amount) {
        if (!player.character || player.getVariable("afk")) return;
        if (metric !== "cashSpent" && metric !== "drivenMeters") return;
        const value = Number(amount);
        if (!Number.isFinite(value) || value <= 0) return;
        const stats = await getStats(player.character.id);
        await stats.increment(metric, { by: value });
        await stats.reload();
        const displayValue = metric === "drivenMeters" ? stats.drivenMeters / 1000 : stats.cashSpent;
        player.call("battlePass.progress.update", [metric, displayValue]);
    },

    async addDriveSample(player) {
        if (!player.character || player.getVariable("afk") || !player.vehicle || player.seat !== 0 ||
            player.vehicle.properties.vehType === 2) {
            if (player.battlePassDrivePosition && player.battlePassDriveBuffer > 0) {
                const buffered = player.battlePassDriveBuffer;
                player.battlePassDriveBuffer = 0;
                await this.addMetricProgress(player, "drivenMeters", buffered);
            }
            player.battlePassDrivePosition = null;
            player.battlePassDriveVehicle = null;
            return;
        }

        const vehicle = player.vehicle;
        const position = vehicle.position;
        const previous = player.battlePassDrivePosition;
        if (!previous || player.battlePassDriveVehicle !== vehicle) {
            player.battlePassDrivePosition = { x: position.x, y: position.y, z: position.z };
            player.battlePassDriveVehicle = vehicle;
            return;
        }

        const x = position.x - previous.x;
        const y = position.y - previous.y;
        const z = position.z - previous.z;
        const distance = Math.sqrt(x * x + y * y + z * z);
        player.battlePassDrivePosition = { x: position.x, y: position.y, z: position.z };
        if (!Number.isFinite(distance) || distance <= 0 || distance > 500) return;

        player.battlePassDriveBuffer = (player.battlePassDriveBuffer || 0) + distance;
        if (player.battlePassDriveBuffer >= 100) {
            const buffered = player.battlePassDriveBuffer;
            player.battlePassDriveBuffer = 0;
            await this.addMetricProgress(player, "drivenMeters", buffered);
        }
    },

    async flushDriveBuffer(player) {
        if (!player.character || !player.battlePassDriveBuffer) return;
        const buffered = player.battlePassDriveBuffer;
        player.battlePassDriveBuffer = 0;
        player.battlePassDrivePosition = null;
        player.battlePassDriveVehicle = null;
        await this.addMetricProgress(player, "drivenMeters", buffered);
    }
};
