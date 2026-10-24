"use strict";

const npcs = require("./index");

module.exports = {
	"/npceditor": {
		access: 6,
		description: "Редактор NPC",
		args: "",
		handler: player => {
			npcs.openEditor(player);
		},
	},
};
