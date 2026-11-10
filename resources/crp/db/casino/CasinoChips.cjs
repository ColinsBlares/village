'use strict';

/// Баланс фишек казино. Отдельная таблица, чтобы не менять characters:
/// sequelize.sync() создаёт её сам, alter существующей таблицы не нужен.
module.exports = (sequelize, DataTypes) => {
	return sequelize.define(
		'CasinoChips',
		{
			characterId: {
				type: DataTypes.INTEGER(11),
				primaryKey: true,
				allowNull: false,
			},
			chips: {
				type: DataTypes.INTEGER(11),
				allowNull: false,
				defaultValue: 0,
			},
		},
		{
			timestamps: false,
			tableName: 'casino_chips',
		},
	);
};
