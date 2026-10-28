"use strict";

let phone = require("./index.js");
module.exports = {
    "/buyphone": {
        access: 1,
        description: "Покупка телефона",
        args: "",
        handler: (player, args) => {
            mp.events.call("phone.buy", player);
        }
    },
    "/changephone": {
        access: 1,
        description: "change",
        args: "",
        handler: async (player, args) => {
            console.log(await phone.changeNumber(player, args[0]));
        }
    },
    "/phoneui": {
        access: 1,
        description: "Тест нового телефона",
        args: "[show|hide|call|end|ans|sms|notice|taxi|help]",
        handler: (player, args) => {
            const action = String(args[0] || "help");
            const say = (text) => player.call("chat.message.push", [`!{#c1f051}${text}`]);

            if (action === "help") {
                say("/phoneui show | hide | call [номер] | end | ans [0-4]");
                say("/phoneui sms [текст] | notice [messages|news|bank|taxi] [текст]");
                say("/phoneui taxi search|found|ready|board|dest|cancel|error [модель или причина]");
                return;
            }
            if (action === "show") {
                player.call("phone.show", [true]);
                return;
            }
            if (action === "hide") {
                player.call("phone.show", [false]);
                return;
            }
            if (action === "call") {
                player.call("phone.call.in", [args[1] || "555-0142"]);
                return;
            }
            if (action === "end") {
                player.call("phone.call.end.in", []);
                return;
            }
            if (action === "ans") {
                player.call("phone.call.start.ans", [parseInt(args[1] || "0", 10)]);
                return;
            }
            if (action === "sms") {
                player.call("phone.message.set", [args.slice(1).join(" ") || "Тестовое сообщение", "555-0142"]);
                return;
            }
            if (action === "notice") {
                const app = args[1] || "news";
                const titles = { messages: "Сообщения", news: "Новости", bank: "Банк", taxi: "Такси" };
                player.call("phone.test.notice", [app, titles[app] || "Уведомление", args.slice(2).join(" ") || "Набережная открыта"]);
                return;
            }
            if (action === "taxi") {
                player.call("phone.test.taxi", [args[1] || "search", args.slice(2).join(" ") || "BMW M80"]);
                return;
            }
            say("Неизвестное действие. /phoneui help");
        }
    },
}