module.exports = (sequelize, DataTypes) => {
    const model = sequelize.define("Family", {
        id: {
            type: DataTypes.INTEGER(11),
            primaryKey: true,
            autoIncrement: true
        },
        // Название семьи
        name: {
            type: DataTypes.STRING(32),
            allowNull: false
        },
        // Тег семьи (латиница/цифры)
        tag: {
            type: DataTypes.STRING(5),
            allowNull: false
        },
        // ID персонажа-лидера
        leaderId: {
            type: DataTypes.INTEGER(11),
            allowNull: false
        },
        // Общак семьи
        cash: {
            type: DataTypes.INTEGER(11),
            defaultValue: 0,
            allowNull: false
        },
        // Уровень и опыт семьи
        level: {
            type: DataTypes.INTEGER(11),
            defaultValue: 1,
            allowNull: false
        },
        exp: {
            type: DataTypes.INTEGER(11),
            defaultValue: 0,
            allowNull: false
        },
        // Блип семьи на карте
        blip: {
            type: DataTypes.INTEGER(11),
            defaultValue: 84,
            allowNull: false
        },
        blipColor: {
            type: DataTypes.INTEGER(11),
            defaultValue: 1,
            allowNull: false
        },
        // Привязанный дом семьи (фаза 2 развития)
        houseId: {
            type: DataTypes.INTEGER(11),
            defaultValue: null,
            allowNull: true
        },
        // Координаты базы семьи (от дома)
        x: {
            type: DataTypes.FLOAT,
            defaultValue: null,
            allowNull: true
        },
        y: {
            type: DataTypes.FLOAT,
            defaultValue: null,
            allowNull: true
        },
        z: {
            type: DataTypes.FLOAT,
            defaultValue: null,
            allowNull: true
        },
        h: {
            type: DataTypes.FLOAT,
            defaultValue: null,
            allowNull: true
        },
        d: {
            type: DataTypes.INTEGER(11),
            defaultValue: null,
            allowNull: true
        },
        // Мин. ранг для приглашения
        inviteRank: {
            type: DataTypes.INTEGER(11),
            defaultValue: 3,
            allowNull: false
        },
        // Мин. ранг для увольнения
        uvalRank: {
            type: DataTypes.INTEGER(11),
            defaultValue: 4,
            allowNull: false
        },
        // Мин. ранг для смены рангов участников
        giveRankRank: {
            type: DataTypes.INTEGER(11),
            defaultValue: 4,
            allowNull: false
        },
    }, {
        timestamps: true
    });

    model.associate = (models) => {
        model.hasMany(models.FamilyRank, {
            foreignKey: 'familyId',
            as: "ranks"
        });
    };

    return model;
};
