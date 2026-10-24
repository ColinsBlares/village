"use strict";
const freemodeCharacters = [mp.joaat("mp_m_freemode_01"), mp.joaat("mp_f_freemode_01")];

let houses;
let bizes;
let death;
let factions;
let jobs;
let inventory;
let notifs;
let utils;
let promocodes;
let anticheat;

let clothesConfig = {
    0: {
        pants: [
            [0, 0],
            [14, 0]
        ],
        /// 11 / 3 / 8
        tops: [
            [0, 2, 0, 0, 9, 0],
            [5, 1, 4, 0, 3, 0],
            [16, 2, 15, 0, 3, 0]
        ],
        shoes: [
            [3, 0],
            [1, 7]
        ]
    },
    1: {
        pants: [
            [1, 5],
            [1, 6],
            [5, 0],
            [15, 3]
        ],
        /// 11 / 3 / 8
        tops: [
            [17, 0, 5, 0, 15, 0],
            [1, 0, 0, 0, 15, 0],
            [5, 2, 5, 0, 15, 0],
            [34, 0, 0, 0, 15, 0]
        ],
        shoes: [
            [1, 2],
            [9, 2]
        ]
    }
};

const TOP_ID = 7;
const PANTS_ID = 8;
const SHOES_ID = 9;

/// Функции модуля выбора и создания персоонажа
module.exports = {
    timeForSecondSlot: 100,
    costSecondSlot: 500,
    costThirdSlot: 1000,

    moduleInit() {
        houses = call('houses');
        bizes = call('bizes');
        death = call('death');
        factions = call('factions');
        inventory = call('inventory');
        notifs = call('notifications');
        utils = call("utils");
        promocodes = call("promocodes");
        jobs = call('jobs');
        anticheat = call('anticheat');
    },
    async init(player) {
        if (player.character != null) player.character = null;
        if (player.characters == null) {
            // var start = Date.now();
            player.characters = await db.Models.Character.findAll({
                where: {
                    accountId: player.account.id
                },
                include: [{
                        model: db.Models.Feature,
                    },
                    {
                        model: db.Models.Appearance,
                    },
                    db.Models.Fine,
                    {
                        model: db.Models.Promocode,
                        include: db.Models.PromocodeReward,
                    },
                    {
                        as: "settings",
                        model: db.Models.CharacterSettings,
                    },
                    // {
                    //     model: db.Models.CharacterInventory,
                    //     where: {
                    //         parentId: null,
                    //     },
                    //     // Этот инклюд тормозит выборку до 5 сек...
                    //     // include: [{
                    //     //     as: "params",
                    //     //     model: db.Models.CharacterInventoryParam,
                    //     // }],
                    // },
                ]
            });
            for (let i = 0; i < player.characters.length; i++) {
                player.characters[i].CharacterInventories = await db.Models.CharacterInventory.findAll({
                    where: {
                        parentId: null,
                        playerId: player.characters[i].id
                    },
                    include: {
                        as: "params",
                        model: db.Models.CharacterInventoryParam,
                    },
                });

                player.characters[i].tattoos = await db.Models.CharacterTattoo.findAll({
                    where: {
                        characterId: player.characters[i].id
                    }
                });
            }

            // var diff = Date.now() - start;
            // notifs.info(player, `Время выборки персонажей: ${diff} ms.`);
            player.characters.forEach(character => {
                character.Appearances.sort((x, y) => {
                    if (x.order > y.order) return 1;
                    if (x.order < y.order) return -1;
                    if (x.order === y.order) return 0;
                });
                character.Features.sort((x, y) => {
                    if (x.order > y.order) return 1;
                    if (x.order < y.order) return -1;
                    if (x.order === y.order) return 0;
                });
            });
        }
        let charInfos = [];
        for (let i = 0; i < player.characters.length; i++) {
            let house = houses.getHouseByCharId(player.characters[i].id);
            let biz = bizes.getBizByCharId(player.characters[i].id);
            let factionName = factions.getFactionNameById(player.characters[i].factionId);
            let jobName = jobs.getJobNameById(player.characters[i].job);
            charInfos.push({
                charInfo: {
                    name: player.characters[i].name,
                    cash: player.characters[i].cash,
                    bank: player.characters[i].bank,
                    status: this.getSocialStatus(player.characters[i]),
                    hours: parseInt(player.characters[i].minutes / 60),
                    faction: factionName ? factionName : "Нет",
                    job: jobName ? jobName : "Нет",
                    house: house ? `${house.info.Interior.class} (№${house.info.id})` : "Нет",
                    biz: biz ? `${biz.info.name}` : "Нет",
                    warns: player.characters[i].warnNumber,
                    hair: player.characters[i].hair,
                    hairColor: player.characters[i].hairColor,
                    hairHighlightColor: player.characters[i].hairHighlightColor,
                    eyeColor: player.characters[i].eyeColor,
                    beardColor: player.characters[i].beardColor,
                    eyebrowColor: player.characters[i].eyebrowColor,
                    blushColor: player.characters[i].blushColor,
                    lipstickColor: player.characters[i].lipstickColor,
                    chestHairColor: player.characters[i].chestHairColor,
                    gender: player.characters[i].gender,
                    mother: player.characters[i].mother,
                    father: player.characters[i].father,
                    skin: player.characters[i].skin,
                    similarity: player.characters[i].similarity,
                    Appearances: player.characters[i].Appearances,
                    Features: player.characters[i].Features,
                    tattoos: player.characters[i].tattoos.map(current => current.dataValues)
                },
                charClothes: inventory.getView(player.characters[i].CharacterInventories),
            });
        }
        return charInfos;
    },
    /// Функции создания персоонажа
    create(player) {
        player.characterInfo = {
            accountId: player.account.id,
            name: "",
            gender: 0,
            father: 0,
            mother: 21,
            similarity: 1,
            skin: 0,
            hair: 0,
            hairColor: 0,
            hairHighlightColor: 0,
            eyebrowColor: 0,
            beardColor: 0,
            eyeColor: 0,
            blushColor: 0,
            lipstickColor: 0,
            chestHairColor: 0,
            Features: [],
            Appearances: [],
            Fines: [],
            Promocode: {
                PromocodeReward: {},
            },
            settings: {},
        };
        for (let i = 0; i < 20; i++) player.characterInfo.Features.push({
            value: 0.0,
            order: i
        });
        for (let i = 0; i < 11; i++) player.characterInfo.Appearances.push({
            value: 255,
            opacity: 1.0,
            order: i
        });

        mp.events.call('characterInit.create.init', player);

        anticheat.allowModel(player);
        player.model = freemodeCharacters[1];
        this.applyCharacter(player);
        this.sendToCreator(player);
    },
    clampInt(value, min, max, fallback) {
        const n = parseInt(value);
        if (isNaN(n)) return fallback;
        return Math.max(min, Math.min(max, n));
    },
    clampFloat(value, min, max, fallback) {
        const n = parseFloat(value);
        if (isNaN(n)) return fallback;
        return Math.max(min, Math.min(max, n));
    },
    sanitizeCreatorData(raw, fullname, accountId) {
        const src = raw && typeof raw === 'object' ? raw : {};
        const features = [];
        const srcFeatures = Array.isArray(src.Features) ? src.Features : [];
        for (let i = 0; i < 20; i++) {
            const f = srcFeatures[i] || {};
            features.push({
                value: this.clampFloat(f.value, -1, 1, 0),
                order: i,
            });
        }
        const appearances = [];
        const srcAppearances = Array.isArray(src.Appearances) ? src.Appearances : [];
        for (let i = 0; i < 11; i++) {
            const a = srcAppearances[i] || {};
            appearances.push({
                value: this.clampInt(a.value, 0, 255, 255),
                opacity: this.clampFloat(a.opacity, 0, 1, 1),
                order: i,
            });
        }
        const gender = src.gender === 1 || src.gender === true ? 1 : 0;
        return {
            accountId,
            name: fullname,
            gender,
            father: this.clampInt(src.father, 0, 45, 0),
            mother: this.clampInt(src.mother, 0, 45, 21),
            similarity: this.clampFloat(src.similarity, 0, 1, 1),
            skin: this.clampInt(src.skin, 0, 45, 0),
            hair: this.clampInt(src.hair, 0, 73, 0),
            hairColor: this.clampInt(src.hairColor, 0, 63, 0),
            hairHighlightColor: this.clampInt(src.hairHighlightColor, 0, 63, 0),
            eyebrowColor: this.clampInt(src.eyebrowColor, 0, 63, 0),
            beardColor: this.clampInt(src.beardColor, 0, 63, 0),
            eyeColor: this.clampInt(src.eyeColor, 0, 31, 0),
            blushColor: this.clampInt(src.blushColor, 0, 63, 0),
            lipstickColor: this.clampInt(src.lipstickColor, 0, 63, 0),
            chestHairColor: this.clampInt(src.chestHairColor, 0, 63, 0),
            cash: 300,
            bank: 0,
            admin: 0,
            minutes: 0,
            Features: features,
            Appearances: appearances,
            Fines: [],
            Promocode: {
                PromocodeReward: {},
            },
            settings: {},
        };
    },
    isValidCharacterName(fullname) {
        return /^[A-Z][a-z]{1,14} [A-Z][a-z]{1,14}$/.test(fullname);
    },
    async save(player, fullname, charData) {
        if (!player.account || !player.characterInit || player.character) {
            return player.call('characterInit.create.check.ans', [0]);
        }
        if (player.characterInit && player.characterInit.creating) {
            return player.call('characterInit.create.check.ans', [0]);
        }
        if (!this.isValidCharacterName(fullname)) {
            return player.call('characterInit.create.check.ans', [0]);
        }
        const slots = player.account.slots || 1;
        const owned = await db.Models.Character.count({
            where: { accountId: player.account.id },
        });
        if (owned >= slots) {
            return player.call('characterInit.create.check.ans', [0]);
        }

        let parsed;
        try {
            parsed = typeof charData === 'string' ? JSON.parse(charData) : charData;
        } catch (e) {
            return player.call('characterInit.create.check.ans', [0]);
        }

        player.characterInit.creating = true;
        try {
        player.characterInfo = this.sanitizeCreatorData(parsed, fullname, player.account.id);
        let pos = this.getSpawn();
        player.characterInfo.x = pos[0];
        player.characterInfo.y = pos[1];
        player.characterInfo.z = pos[2];
        player.characterInfo.cash = 300;
        player.characterInfo.Promocode.promocode = await promocodes.getPromocode();

        const exists = await db.Models.Character.findOne({
            where: { name: fullname },
        });
        if (exists) {
            return player.call('characterInit.create.check.ans', [0]);
        }

        player.character = await db.Models.Character.create(player.characterInfo, {
            include: [{
                    model: db.Models.Feature,
                },
                {
                    model: db.Models.Appearance,
                },
                {
                    model: db.Models.Fine,
                },
                {
                    model: db.Models.Promocode,
                    include: db.Models.PromocodeReward,
                },
                {
                    as: "settings",
                    model: db.Models.CharacterSettings,
                },
            ]
        });
        player.name = player.character.name;
        mp.network.startBatch();
        try {
            this.applyCharacter(player);
            player.characterInit.created = true;
            player.call('characterInit.create.check.ans', [1]);
            this.spawn(player);
            mp.events.call('characterInit.done', player);
        } finally {
            mp.network.endBatch();
        }
        } catch (e) {
            player.character = null;
            player.call('characterInit.create.check.ans', [0]);
        } finally {
            if (player.characterInit) player.characterInit.creating = false;
        }
    },
    sendToCreator(player) {
        player.call("characterInit.create", [true, JSON.stringify(player.characterInfo)]);
    },
    applyCharacter(player) {
        anticheat.allowModel(player);
        if (player.character) {
            let features = [];
            player.character.Features.forEach((element) => {
                features.push(element.value);
            });
            player.setCustomization(
                player.character.gender === 0,

                player.character.mother,
                player.character.father,
                0,

                0,
                player.character.skin,
                0,

                player.character.similarity,
                1.0,
                0.0,

                player.character.eyeColor,
                player.character.hairColor,
                player.character.hairHighlightColor,

                features
            );

            player.setClothes(2, player.character.hair, 0, 2);
            for (let i = 0; i < 11; i++) {
                player.setHeadOverlay(i, [player.character.Appearances[i].value,
                    player.character.Appearances[i].opacity,
                    this.colorForOverlayIdx(player, i), 0
                ]);
            }
        } else {
            let features = [];
            player.characterInfo.Features.forEach((element) => {
                features.push(element.value);
            });
            player.setCustomization(
                player.characterInfo.gender === 0,

                player.characterInfo.mother,
                player.characterInfo.father,
                0,

                0,
                player.characterInfo.skin,
                0,

                player.characterInfo.similarity,
                1.0,
                0.0,

                player.characterInfo.eyeColor,
                player.characterInfo.hairColor,
                player.characterInfo.hairHighlightColor,

                features
            );

            player.setClothes(2, player.characterInfo.hair, 0, 2);
            for (let i = 0; i < 11; i++) {
                player.setHeadOverlay(i, [player.characterInfo.Appearances[i].value,
                    player.characterInfo.Appearances[i].opacity,
                    this.colorForOverlayIdx(player, i), 0
                ]);
            }
        }
    },
    colorForOverlayIdx(player, index) {
        let color;
        if (player.character != null) {
            switch (index) {
                case 1:
                    color = player.character.beardColor;
                    break;
                case 2:
                    color = player.character.eyebrowColor;
                    break;
                case 5:
                    color = player.character.blushColor;
                    break;
                case 8:
                    color = player.character.lipstickColor;
                    break;
                case 10:
                    color = player.character.chestHairColor;
                    break;
                default:
                    color = 0;
            }
        } else {
            switch (index) {
                case 1:
                    color = player.characterInfo.beardColor;
                    break;
                case 2:
                    color = player.characterInfo.eyebrowColor;
                    break;
                case 5:
                    color = player.characterInfo.blushColor;
                    break;
                case 8:
                    color = player.characterInfo.lipstickColor;
                    break;
                case 10:
                    color = player.characterInfo.chestHairColor;
                    break;
                default:
                    color = 0;
            }
        }
        return color;
    },
    getSpawn() {
        switch (call('utils').randomInteger(0, 5)) {
            case 0:
                return [-252.91534423828125, -338.6800231933594, 29.70627212524414]; /// Рокфорд-Хиллз
            case 1:
                return [258.9052429199219, -1112.8656005859375, 29.43829917907715]; /// Мишн-Роу
            case 2:
                return [-197.68017578125, -804.0416870117188, 30.45401954650879]; /// Пиллбокс-Хилл
            case 3:
                return [1155.053466796875, -470.5561828513281, 66.53962158203125]; /// Миррор-Парк
            case 4:
                return [-164.7874755859375, 6426.59912109375, 31.886451721191406]; /// Палето-Бэй
            case 5:
                return [1958.814208984365, 3844.35888671875, 31.985401153564453]; /// Сэнди-Шорс
            default:
                return [-252.91534423828125, -338.6800231933594, 29.70627212524414];
        }
    },
    setStartClothes(player) {
        let sex = player.character.gender ? 0 : 1;

        let pantsArray = clothesConfig[sex].pants;
        let pants = pantsArray[utils.randomInteger(0, pantsArray.length - 1)];
        let pantsParams = {
            sex: sex,
            variation: pants[0],
            texture: pants[1],
            pockets: '[5,5,5,5]',
            clime: '[10,30]',
            name: (pants[0] === 15 && sex === 1) || (pants[0] === 14 && sex === 0) ? 'Шорты' : 'Брюки'
        };
        inventory.addItem(player, PANTS_ID, pantsParams, (e) => {
            //if (e) return notifs.error(player, e);
            if (e) return console.log(e);
        });

        let shoesArray = clothesConfig[sex].shoes;
        let shoes = shoesArray[utils.randomInteger(0, shoesArray.length - 1)];
        let shoesParams = {
            sex: sex,
            variation: shoes[0],
            texture: shoes[1],
            clime: '[10,30]',
            name: 'Кроссовки'
        };
        inventory.addItem(player, SHOES_ID, shoesParams, (e) => {
            //if (e) return notifs.error(player, e);
            if (e) return console.log(e);
        });

        let topsArray = clothesConfig[sex].tops;
        let top = topsArray[utils.randomInteger(0, topsArray.length - 1)];
        let topParams = {
            sex: sex,
            variation: top[0],
            texture: top[1],
            torso: top[2],
            tTexture: top[3],
            undershirt: top[4],
            uTexture: top[5],
            pockets: '[5,5,5,5]',
            clime: '[10,30]',
            name: 'Футболка'
        };
        inventory.addItem(player, TOP_ID, topParams, (e) => {
            //if (e) return notifs.error(player, e);
            if (e) return console.log(e);
        });

        setTimeout(() => {
            player.call('inventory.hideItemFromHands', []);
        }, 500);
    },
    spawn(player) {
        if (player.character.arrestTime) return; // заспавнит модуль [police]
        var settings = player.character.settings;
        var house = houses.getHouseByCharId(player.character.id);

        if (settings.spawn === 1 && !house) settings.spawn = 0;
        if (settings.spawn === 2 && !player.character.factionId) settings.spawn = 0;
        anticheat.allowSpawn(player);
        switch (settings.spawn) {
            case 0: // улица
                player.spawn(new mp.Vector3(player.character.x, player.character.y, player.character.z));
                player.heading = player.character.h;
                player.dimension = 0;
                break;
            case 1: // дом
                var pos = new mp.Vector3(house.info.Interior.x, house.info.Interior.y, house.info.Interior.z);
                player.spawn(pos);
                player.heading = house.info.Interior.rotation; // need test and 
                player.dimension = house.info.id;
                player.house = {
                    id: house.info.id,
                    place: 1
                };
                break;
            case 2: //организация
                var marker = factions.getMarker(player.character.factionId);
                player.spawn(marker.position);
                player.heading = marker.h;
                player.dimension = marker.dimension;
                break;
        }

        if (death.knockedList.includes(player.character.id)) mp.events.call("death.spawn", player);
    },
    getSocialStatus(character) {
        if (character.admin) return "Администратор";
        if (character.media) return "Медиа";
        if (!character.factionId) return "Обычный";
        if (character.factionId < 8) return "Госслужащий";

        return "Бандит";
    },
};
