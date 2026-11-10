"use strict";

module.exports = (sequelize, DataTypes) => {
	const model = sequelize.define(
		"Npc",
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
				type: DataTypes.STRING(64),
				allowNull: false,
			},
			model: {
				type: DataTypes.STRING(64),
				allowNull: false,
				defaultValue: "a_m_y_business_01",
			},
			x: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
			y: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
			z: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
			h: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
			dimension: {
				type: DataTypes.INTEGER(11),
				allowNull: false,
				defaultValue: 0,
			},
			behavior: {
				type: DataTypes.STRING(16),
				allowNull: false,
				defaultValue: "idle",
			},
			scenario: { type: DataTypes.STRING(64), allowNull: true },
			animDict: { type: DataTypes.STRING(96), allowNull: true },
			animName: { type: DataTypes.STRING(64), allowNull: true },
			speed: {
				type: DataTypes.FLOAT,
				allowNull: false,
				defaultValue: 1,
			},
			route: { type: DataTypes.TEXT, allowNull: true },
			dialog: { type: DataTypes.TEXT, allowNull: true },
			blip: {
				type: DataTypes.BOOLEAN,
				allowNull: false,
				defaultValue: true,
			},
			enabled: {
				type: DataTypes.BOOLEAN,
				allowNull: false,
				defaultValue: true,
			},
			kind: {
				type: DataTypes.STRING(16),
				allowNull: false,
				defaultValue: "civil",
			},
			weapon: { type: DataTypes.STRING(48), allowNull: true },
			ammo: { type: DataTypes.INTEGER(11), allowNull: false, defaultValue: 0 },
			health: { type: DataTypes.INTEGER(11), allowNull: false, defaultValue: 200 },
			armor: { type: DataTypes.INTEGER(11), allowNull: false, defaultValue: 0 },
			aggroRange: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 25 },
		},
		{ timestamps: false },
	);
	return model;
};
