"use strict";

/// Настройки системы семей
module.exports = {
    // Цена создания семьи
    createPrice: 500000,
    // Цена смены тега
    renamePrice: 100000,
    // Базовый лимит участников
    maxMembers: 30,
    // +N к лимиту за каждый уровень семьи
    maxMembersPerLevel: 10,
    // Ограничения названия/тега
    maxNameLength: 32,
    minNameLength: 3,
    maxTagLength: 5,
    minTagLength: 2,
    // Спрайт блипа семьи на карте
    blipSprite: 84,
    // Спрайт блипа точки создания семьи
    createBlipSprite: 492,
    // Точка создания семьи (мэрия Лос-Сантоса)
    createPoint: {
        x: -544.99,
        y: -204.85,
        z: 38.23,
    },
    // Доступные цвета блипа (id цвета RAGE) и их названия для меню (порядок синхронен)
    blipColors: [0, 1, 2, 3, 5, 25, 27, 38, 47, 83],
    colorNames: ["Белый", "Красный", "Зелёный", "Синий", "Жёлтый", "Оранжевый", "Бирюзовый", "Голубой", "Розовый", "Фиолетовый"],
    // Ранги по умолчанию при создании (rank — порядковый номер, чем выше, тем главнее)
    defaultRanks: [
        { name: "Новичок", rank: 1 },
        { name: "Боец", rank: 2 },
        { name: "Старший", rank: 3 },
        { name: "Заместитель", rank: 4 },
        { name: "Глава", rank: 5 },
    ],
    // Пороги доступа по умолчанию (мин. rank для действия)
    defaultAccess: {
        inviteRank: 3,
        uvalRank: 4,
        giveRankRank: 4,
    },
    // Мин. ранг для доступа к складу семьи
    warehouseRank: 2,

    // ************** Уровни и прокачка **************
    // Максимальный уровень семьи
    maxLevel: 30,
    // Базовый множитель порога опыта (порог уровня = level * expBase)
    expBase: 1000,
    // Опыт за каждого онлайн-участника за один тик начисления
    expPerMember: 10,
    // Интервал начисления опыта за онлайн, мс
    expTickInterval: 10 * 60 * 1000,

    // ************** Контракты **************
    // Награда за выполненный контракт (в общак)
    contractReward: { cash: 50000, exp: 200 },
    // Кулдаун между контрактами семьи, мс
    contractCooldown: 10 * 60 * 1000,
    // Мин. ранг для взятия контракта
    contractRank: 1,
    // Точки доставки (выбирается случайная)
    contractPoints: [
        { x: 1208.0, y: -1402.0, z: 35.2 },
        { x: -1037.0, y: -641.0, z: 5.0 },
        { x: 425.0, y: -1645.0, z: 29.3 },
        { x: -75.0, y: 6420.0, z: 31.5 },
        { x: 1736.0, y: 3310.0, z: 41.2 },
        { x: -337.0, y: -1545.0, z: 28.0 },
        { x: 1133.0, y: -468.0, z: 66.7 },
    ],

    // ************** Гараж семьи **************
    // Базовый лимит транспорта семьи
    maxVehicles: 3,
    // +N к лимиту транспорта за каждый уровень семьи
    maxVehiclesPerLevel: 1,
    // Цена возврата (респавна) свободного транспорта из общака
    vehRespawnPrice: 5000,
    // Доступные для покупки модели (цена списывается из общака)
    familyVehicles: [
        { model: "sultan", name: "Karin Sultan", price: 250000 },
        { model: "buffalo3", name: "Bravado Buffalo S", price: 300000 },
        { model: "kuruma", name: "Karin Kuruma", price: 380000 },
        { model: "schafter2", name: "Benefactor Schafter", price: 320000 },
        { model: "dominator", name: "Vapid Dominator", price: 280000 },
        { model: "granger", name: "Declasse Granger", price: 350000 },
        { model: "baller5", name: "Gallivanter Baller LE", price: 450000 },
        { model: "gresley", name: "Bravado Gresley", price: 300000 },
    ],
};
