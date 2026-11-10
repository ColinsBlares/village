module.exports = (sequelize, DataTypes) => {
    const model = sequelize.define("FamilyRank", {
        id: {
            type: DataTypes.INTEGER(11),
            primaryKey: true,
            autoIncrement: true
        },
        familyId: {
            type: DataTypes.INTEGER(11),
            allowNull: false
        },
        // Название ранга
        name: {
            type: DataTypes.STRING(64),
            allowNull: false
        },
        // Порядковый номер ранга (чем больше, тем выше)
        rank: {
            type: DataTypes.INTEGER(11),
            allowNull: false
        },
    }, {
        timestamps: false
    });

    return model;
};
