"use strict";

module.exports = (sequelize, DataTypes) => {
	const model = sequelize.define(
		"Quest",
		{
			id: {
				type: DataTypes.INTEGER(11),
				primaryKey: true,
				autoIncrement: true,
			},
			key: {
				type: DataTypes.STRING(64),
				allowNull: false,
				unique: true,
			},
			name: {
				type: DataTypes.STRING(128),
				allowNull: false,
			},
			description: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			enabled: {
				type: DataTypes.BOOLEAN,
				defaultValue: false,
				allowNull: false,
			},
			autoStart: {
				type: DataTypes.STRING(16),
				defaultValue: "none",
				allowNull: false,
			},
			requireQuest: {
				type: DataTypes.STRING(64),
				allowNull: true,
			},
			repeatable: {
				type: DataTypes.BOOLEAN,
				defaultValue: false,
				allowNull: false,
			},
			graph: {
				type: DataTypes.TEXT("long"),
				allowNull: true,
			},
		},
		{ timestamps: false },
	);

	model.associate = models => {
		model.hasMany(models.CharacterQuest, { foreignKey: "questId" });
	};

	return model;
};
