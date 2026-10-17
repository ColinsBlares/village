"use strict";

module.exports = (sequelize, DataTypes) => {
    const model = sequelize.define("AntiCheatBan", {
        id: {
            type: DataTypes.INTEGER(11),
            primaryKey: true,
            autoIncrement: true
        },
        serial: {
            type: DataTypes.STRING(128),
            allowNull: true,
        },
        rgscId: {
            type: DataTypes.STRING(64),
            allowNull: true,
        },
        ip: {
            type: DataTypes.STRING(64),
            allowNull: true,
        },
        reason: {
            type: DataTypes.STRING(128),
            allowNull: true,
        },
        name: {
            type: DataTypes.STRING(64),
            allowNull: true,
        },
        date: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            allowNull: false,
        },
    }, {
        timestamps: false
    });

    model.associate = (models) => {

    };
    return model;
};
