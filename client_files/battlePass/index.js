"use strict";

mp.battlePass = {
    enabled: false
};

mp.keys.bind(0x42, true, () => {
    if (!mp.battlePass.enabled || mp.game.ui.isPauseMenuActive()) return;
    if (mp.busy.list.some(name => name !== "battlePass")) return;
    mp.callCEFV("battlePass.show = !battlePass.show");
});

mp.events.add({
    "characterInit.done": () => {
        mp.battlePass.enabled = true;
        mp.callCEFV("battlePass.setEnabled(true)");
    },
    "battlePass.data": data => {
        mp.callCEFV(`battlePass.setData(${JSON.stringify(data)})`);
    },
    "battlePass.onlineMinutes": minutes => {
        mp.callCEFV(`battlePass.setOnlineMinutes(${Number(minutes)})`);
    },
    "battlePass.progress.update": (metric, value) => {
        if (metric !== "cashSpent" && metric !== "drivenMeters") return;
        mp.callCEFV(`battlePass.setTaskProgress(${JSON.stringify(metric)}, ${Number(value)})`);
    },
    "battlePass.error": message => {
        mp.callCEFV(`battlePass.setError(${JSON.stringify(String(message))})`);
    },
    "battlePass.case.opened": prize => {
        mp.callCEFV(`battlePass.setCasePrize(${Number(prize)})`);
    }
});
