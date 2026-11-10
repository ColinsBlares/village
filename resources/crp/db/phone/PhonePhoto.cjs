"use strict";

/// Снимок камеры телефона. Картинка уже сжатый jpeg, чтобы пережить перезаход.
module.exports = (sequelize, DataTypes) => {
    const model = sequelize.define("PhonePhoto", {
        id: {
            type: DataTypes.INTEGER(11),
            primaryKey: true,
            autoIncrement: true
        },
        phoneId: {
            type: DataTypes.INTEGER(11),
            allowNull: false
        },
        src: {
            type: DataTypes.TEXT('medium'),
            allowNull: false
        },
        facing: {
            type: DataTypes.STRING(8),
            allowNull: false
        },
        shotAt: {
            type: DataTypes.BIGINT,
            allowNull: false,
            defaultValue: 0
        },
        wallpaper: {
            type: DataTypes.TINYINT(1),
            allowNull: false,
            defaultValue: 0
        },
    },
    {
        timestamps: false
    });

    model.associate = (models) => {
        model.belongsTo(models.Phone, {
            foreignKey: "phoneId"
        });
    };
    return model;
};
