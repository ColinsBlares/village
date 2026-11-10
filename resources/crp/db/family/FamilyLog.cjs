const Sequelize = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const model = sequelize.define("FamilyLog", {
        id: {
            type: DataTypes.INTEGER(11),
            primaryKey: true,
            autoIncrement: true
        },
        familyId: {
            type: DataTypes.INTEGER(11),
            allowNull: false
        },
        // ID персонажа, совершившего действие
        characterId: {
            type: DataTypes.INTEGER(11),
            allowNull: false
        },
        // Тип действия (create, invite, uval, rank, cash и т.д.)
        action: {
            type: DataTypes.STRING(64),
            allowNull: false
        },
        // Доп. данные
        data: {
            type: DataTypes.TEXT,
            defaultValue: null,
            allowNull: true
        },
        createdAt: {
            type: DataTypes.DATE,
            defaultValue: Sequelize.NOW,
            allowNull: false
        },
    }, {
        timestamps: false
    });

    return model;
};
