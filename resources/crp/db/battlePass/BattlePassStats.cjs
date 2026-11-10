"use strict";

module.exports = (sequelize, DataTypes) => {
    const model = sequelize.define("BattlePassStats", {
        id: {
            type: DataTypes.INTEGER(11),
            primaryKey: true,
            autoIncrement: true
        },
        characterId: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            unique: true
        },
        cashSpent: {
            type: DataTypes.INTEGER(11),
            defaultValue: 0,
            allowNull: false
        },
        drivenMeters: {
            type: DataTypes.FLOAT,
            defaultValue: 0,
            allowNull: false
        }
    }, {
        timestamps: false
    });

    model.associate = models => {
        model.belongsTo(models.Character, {
            foreignKey: "characterId"
        });
    };

    return model;
};
