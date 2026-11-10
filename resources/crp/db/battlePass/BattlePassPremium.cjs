"use strict";

module.exports = (sequelize, DataTypes) => {
    const model = sequelize.define("BattlePassPremium", {
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
        enabled: {
            type: DataTypes.TINYINT(1),
            defaultValue: 0,
            allowNull: false
        },
        points: {
            type: DataTypes.INTEGER(11),
            defaultValue: 0,
            allowNull: false
        },
        cases: {
            type: DataTypes.INTEGER(11),
            defaultValue: 0,
            allowNull: false
        },
        claimedTasks: {
            type: DataTypes.TEXT,
            defaultValue: "[]",
            allowNull: false
        },
        claimedRewards: {
            type: DataTypes.TEXT,
            defaultValue: "[]",
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
