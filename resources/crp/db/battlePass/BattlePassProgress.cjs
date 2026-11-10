"use strict";

module.exports = (sequelize, DataTypes) => {
    const model = sequelize.define("BattlePassProgress", {
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
        points: {
            type: DataTypes.INTEGER(11),
            defaultValue: 0,
            allowNull: false
        },
        onlineMinutes: {
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
