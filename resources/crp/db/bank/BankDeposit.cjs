module.exports = (sequelize, DataTypes) => {
    const model = sequelize.define("BankDeposit", {
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
        cardId: {
            type: DataTypes.INTEGER(11),
            allowNull: false
        },
        tariff: {
            type: DataTypes.STRING(16),
            allowNull: false
        },
        balance: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            defaultValue: 0
        },
        openedAt: {
            type: DataTypes.DATE,
            allowNull: false
        },
        lastAccrualAt: {
            type: DataTypes.DATE,
            allowNull: false
        }
    }, { timestamps: false });

    return model;
};
