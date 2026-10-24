Math.clamp = function(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// var mp = {
//     trigger(name, values)  {
//         console.log(`mp.trigger: ${name} ${JSON.stringify(values)}`);
//     },
// };

function getPaddingNumber(str, max = 5) {
    const string = str.toString();
    return string.length < max ? getPaddingNumber(`0${string}`, max) : string;
}

function prettyMoney(val) {
    val += '';
    return val.replace(/(\d)(?=(\d{3})+(\D|$))/g, '$1 ');
}

function setCursor(enable) {
    mp.invoke('focus', enable);
}

function cloneObj(inObj) {
    let outObj = JSON.parse(JSON.stringify(inObj));
    for (let key in inObj) {
        if (typeof(inObj[key]) == 'function') {
            outObj[key] = inObj[key];
        }
    }
    return outObj;
}

function debug(text) {
    terminal.debug(text);
}

function d(text) {
    notifications.push('info', text, `DEBUG-LOG`);
}

function convertToMoscowDate(date) {
    var offsetMs = date.getTimezoneOffset() * 60 * 1000;
    var moscowOffsetMs = 3 * 60 * 60 * 1000;
    return new Date(date.getTime() + offsetMs + moscowOffsetMs);
}

var busy = {
    list: [],
    add(name, mouse = true, client = false) {
        if (this.list.includes(name)) return false;
        this.list.push(name);
        if (client) mp.trigger('busy.add', name, mouse, true);
        return true;
    },
    includes(name) {
        if (name == null) return this.list.length > 0;
        if (typeof name != 'object') return this.list.includes(name);
        else {
            for (var i = 0; i < name.length; i++) {
                if (this.list.includes(name[i])) return true;
            }
            return false;
        }
    },
    remove(name, client = false) {
        var index = this.list.indexOf(name);
        if (index != -1) this.list.splice(index, 1);
        if (client) mp.trigger('busy.remove', name, true);
    },
};

var hud = window.hud = window.hud || {
    show: false,
    keysShow: true,
    showOnline: true,
    build: 0,
    localPos: { x: 0, y: 0 },
};

var auth = window.auth = window.auth || {
    show: false,
    loginOrEmail: '',
    password: '',
    rememberMe: false,
};

var selectMenu = window.selectMenu = window.selectMenu || {
    show: false,
};

var playerMenu = window.playerMenu = window.playerMenu || {
    show: false,
    enable: false,
    inputFocus: false,
    name: 'Cyrus Raider',
    admin: 1,
    factionId: 0,
    familyId: 0,
    media: 0,
    coins: 1000,
};

window.carPass = window.carPass || { show: false };
window.characterPass = window.characterPass || { show: false };
window.driverLicense = window.driverLicense || { show: false };
window.gunLicense = window.gunLicense || { show: false };
window.medicalCard = window.medicalCard || { show: false };
window.governmentBadge = window.governmentBadge || { show: false };
window.check = window.check || { show: false };
window.carSpecifications = window.carSpecifications || { show: false };
window.characterInfo = window.characterInfo || { show: false };
window.characterSelector = window.characterSelector || { show: false };
window.createCharacter = window.createCharacter || { show: false };
window.characterAddSlot = window.characterAddSlot || { show: false };

window.acceptWindow = window.acceptWindow || { show: false };
window.inputWindow = window.inputWindow || { show: false };
window.selectionWindow = window.selectionWindow || { show: false };
window.selectItems = window.selectItems || { show: false };
window.offerDialog = window.offerDialog || { show: false };
window.infoTable = window.infoTable || { show: false };
window.modal = window.modal || { show: false };
window.prompt = typeof window.prompt === 'object' && window.prompt ? window.prompt : { show: false };
window.loader = window.loader || { show: false };
window.watermark = window.watermark || { show: false };
window.timer = window.timer || { show: false };
window.notifications = window.notifications || { show: false };

var changelist = window.changelist = window.changelist || {
    enable: false,
    initLikes: function () {},
    setLikes: function () {},
};

var mapCase = window.mapCase = window.mapCase || {
    show: false,
    enable: false,
    type: '',
    userName: '',
    inputFocus: false,
};

var inventory = window.inventory = window.inventory || {
    show: false,
    enable: false,
    handsBlock: false,
    controlEnable: true,
    debug: false,
    spin: false,
    maxPlayerWeight: 30,
    satiety: 0,
    thirst: 0,
    hotkeys: {},
    equipment: {},
    itemsInfo: {},
    environment: [],
    searchMode: null,
    getItem: function () { return null; },
    getItemName: function () { return null; },
    urlItemImg: function (itemId) { return 'img/inventory/items/' + itemId + '.png'; },
    clearHands: function () {},
    moveItemToBody: function () {},
    getPrettyParams: function () { return []; },
    getItemsByItemId: function () { return []; },
    getItemByParams: function () { return null; },
};

var captureScore = window.captureScore = window.captureScore || {
    show: false,
    start: function () {},
    setScore: function () {},
};

var killList = window.killList = window.killList || {
    list: [],
    add: function () {},
};

var fishing = window.fishing = window.fishing || {
    show: false,
    isStarted: false,
    fishFetch: function () {},
    clearData: function () {},
    endFishing: function () {},
};

var wheelResult = window.wheelResult = window.wheelResult || {
    show: false,
    prizeText: '',
    prizeType: 'cash',
};

var bugTracker = window.bugTracker = window.bugTracker || {
    show: false,
    initBugList: function () {},
    addBug: function () {},
};

var supermarket = window.supermarket = window.supermarket || {
    show: false,
    open: function () {},
    close: function () {},
    notify: function () {},
};

var terminal = window.terminal = window.terminal || {
    show: false,
    enable: false,
    debug: function () {},
    push: function () {},
    initSavedCmds: function () {},
};

var interactionMenu = window.interactionMenu = window.interactionMenu || {
    show: false,
    enable: true,
    left: 80,
    menu: null,
    menus: {},
    family: null,
    familyCanInvite: false,
    faction: null,
    hasHeadBag: false,
    showByName: function () {},
    addItems: function () {},
    deleteItem: function () {},
};

var craft = window.craft = window.craft || {
    show: false,
    skill: 0,
    crafter: null,
    addItemToQueue: function () {},
    initCrafter: function () {},
    clearCrafter: function () {},
};
