"use strict";

module.exports = (sequelize, DataTypes) => {
	const model = sequelize.define(
		"CharacterQuest",
		{
			id: {
				type: DataTypes.INTEGER(11),
				primaryKey: true,
				autoIncrement: true,
			},
			characterId: {
				type: DataTypes.INTEGER(11),
				allowNull: false,
			},
			questId: {
				type: DataTypes.INTEGER(11),
				allowNull: false,
			},
			status: {
				type: DataTypes.STRING(16),
				defaultValue: "active",
				allowNull: false,
			},
			nodeId: {
				type: DataTypes.STRING(64),
				allowNull: true,
			},
			vars: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			tracked: {
				type: DataTypes.BOOLEAN,
				defaultValue: false,
				allowNull: false,
			},
		},
		{ timestamps: false },
	);

	model.associate = models => {
		model.belongsTo(models.Character, { foreignKey: "characterId" });
		model.belongsTo(models.Quest, { foreignKey: "questId" });
	};

	return model;
};
