module.exports = (sequelize, DataTypes) => sequelize.define("AdminReport", {
    id: {
        type: DataTypes.INTEGER(11),
        primaryKey: true,
        autoIncrement: true
    },
    playerCharacterId: {
        type: DataTypes.INTEGER(11),
        field: "reporterCharacterId",
        allowNull: false
    },
    playerName: {
        type: DataTypes.STRING(50),
        field: "reporterName",
        allowNull: false
    },
    message: {
        type: DataTypes.STRING(120),
        allowNull: false,
        defaultValue: ""
    },
    evidenceUrl: {
        type: DataTypes.STRING(512),
        allowNull: true
    },
    messages: {
        type: DataTypes.TEXT("long"),
        allowNull: false,
        defaultValue: "[]"
    },
    status: {
        type: DataTypes.STRING(16),
        defaultValue: "open",
        allowNull: false
    },
    assignedAdminCharacterId: {
        type: DataTypes.INTEGER(11),
        field: "claimedByCharacterId",
        allowNull: true
    },
    assignedAdminName: {
        type: DataTypes.STRING(50),
        field: "claimedByName",
        allowNull: true
    },
    resolution: {
        type: DataTypes.STRING(300),
        allowNull: true
    },
    closedAt: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: "AdminReports"
});
