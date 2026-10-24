"use strict";

const quests = require("./index");

module.exports = {
	"/questeditor": {
		access: 6,
		description: "Редактор квестов",
		args: "",
		handler: player => {
			quests.openEditor(player);
		},
	},
};
