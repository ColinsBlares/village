module.exports = (sequelize, DataTypes) => {
    const model = sequelize.define("BankCard", {
        id: {
            type: DataTypes.INTEGER(11),
            primaryKey: true,
            autoIncrement: true
        },
        characterId: {
            type: DataTypes.INTEGER(11),
            allowNull: false
        },
        type: {
            type: DataTypes.STRING(16),
            allowNull: false
        },
        number: {
            type: DataTypes.STRING(16),
            allowNull: false,
            unique: true
        },
        balance: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            defaultValue: 0
        },
        active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        blocked: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        feeAt: {
            type: DataTypes.DATE,
            allowNull: false
        },
        monthKey: {
            type: DataTypes.STRING(7),
            allowNull: false
        },
        transferMonth: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            defaultValue: 0
        },
        cashbackMonth: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            defaultValue: 0
        },
        itemSqlId: {
            type: DataTypes.INTEGER(11),
            allowNull: true
        }
    }, {
        timestamps: false,
        indexes: [{ fields: ["characterId"] }]
    });

    return model;
};
