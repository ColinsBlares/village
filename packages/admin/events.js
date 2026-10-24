"use strict";
let admin = require("./index.js");
let commands = {};
let reportCooldowns = new Map();

function isAdmin(player) {
    return !!(player && player.character && player.character.admin > 0);
}

function parsePayload(player, payload) {
    if (typeof payload !== "string") return payload;
    try {
        return JSON.parse(payload);
    } catch (error) {
        player.call('notifications.push.error', ['Некорректные данные', 'Ошибка']);
        return null;
    }
}

function notifyError(player, message) {
    player.call('notifications.push.error', [message, 'Ошибка']);
}

function getReportMessages(report) {
    let messages = [];
    try {
        messages = typeof report.messages === 'string'
            ? JSON.parse(report.messages)
            : report.messages;
    } catch (error) {
        console.error(`[ADMIN PANEL] Invalid messages JSON in report #${report.id}:`, error);
    }
    if (!Array.isArray(messages)) messages = [];
    if (messages.length === 0 && report.message) {
        messages.push({
            id: `report-${report.id}`,
            authorCharacterId: report.playerCharacterId,
            authorName: report.playerName,
            authorAdmin: false,
            message: report.message,
            createdAt: report.createdAt
        });
    }
    return messages.map((message, index) => ({
        ...message,
        id: message.id || `${report.id}-${index}`,
        reportId: report.id,
        authorAdmin: !!message.authorAdmin
    }));
}

function addReportMessage(report, message) {
    const messages = getReportMessages(report);
    messages.push(message);
    report.messages = JSON.stringify(messages);
    report.changed('messages', true);
    report.changed('updatedAt', true);
}

function openPanel(player) {
    if (!isAdmin(player)) return notifyError(player, 'Нет доступа');
    loadPanel(player, true);
}

async function loadPanel(player, open) {
    if (!isAdmin(player)) return notifyError(player, 'Нет доступа');
    try {
        const activeReportRows = await db.Models.AdminReport.findAll({
            where: { status: 'open' },
            order: [['updatedAt', 'DESC']],
        });
        const closedReportRows = await db.Models.AdminReport.findAll({
            where: { status: 'closed' },
            order: [['updatedAt', 'DESC']],
            limit: 50
        });
        const reports = activeReportRows.concat(closedReportRows)
            .map(report => report.get({ plain: true }));
        const reportMessages = reports.reduce((messages, report) => {
            return messages.concat(getReportMessages(report));
        }, []);
        const players = [];
        const staff = [];
        mp.players.forEach(current => {
            if (!current.character) return;
            const entry = {
                id: current.id,
                characterId: current.character.id,
                name: current.name,
                admin: current.character.admin || 0,
                factionId: current.character.factionId || 0,
                cash: current.character.cash || 0,
                bank: current.character.bank || 0,
                warnNumber: current.character.warnNumber || 0,
                wanted: current.character.wanted || 0,
                arrestTime: current.character.arrestTime || 0,
                arrestType: current.character.arrestType || 0,
                licenses: {
                    car: !!current.character.carLicense,
                    passenger: !!current.character.passengerLicense,
                    bike: !!current.character.bikeLicense,
                    truck: !!current.character.truckLicense,
                    air: !!current.character.airLicense,
                    boat: !!current.character.boatLicense,
                    weapon: !!current.character.gunLicenseDate
                }
            };
            players.push(entry);
            if (entry.admin > 0) staff.push({ id: entry.characterId, name: entry.name, admin: entry.admin });
        });
        const staffWithReportCounts = await Promise.all(staff.map(async member => ({
            ...member,
            processedReports: await db.Models.AdminReport.count({
                where: { assignedAdminCharacterId: member.id, status: 'closed' }
            })
        })));
        const processedReports = await db.Models.AdminReport.count({
            where: { assignedAdminCharacterId: player.character.id, status: 'closed' }
        });
        const availableCommands = Object.keys(commands)
            .filter(name => player.character.admin >= commands[name].access)
            .map(name => ({
                name,
                description: commands[name].description || '',
                args: commands[name].args || '',
                access: commands[name].access
            }));
        const data = {
            self: {
                characterId: player.character.id,
                name: player.name,
                level: player.character.admin,
                processedReports
            },
            commands: availableCommands,
            players,
            staff: staffWithReportCounts,
            reports,
            reportMessages
        };
        if (mp.players.exists(player)) {
            player.call('callCEFR', [
                open ? 'adminPanel.open' : 'adminPanel.setData',
                [data]
            ]);
        }
    } catch (error) {
        console.error('[ADMIN PANEL] Failed to load panel data:', error);
        notifyError(player, 'Не удалось загрузить данные панели');
    }
}

module.exports = {
    "init": () => {
        /// Список всех команд на сервере
        admin.init();
        commands = admin.getCommands();

        inited(__dirname);
    },
    /// обработка админ команд
    "admin.command.handle": (player, command, args) => {
        if (command == "/apanel") return openPanel(player);
        if (!isAdmin(player)) return;
        if (command == "/ahelp") return mp.events.call('admin.command.help', player, args);
        if (!Array.isArray(args)) return;
        let cmd = commands[command];
        if (!cmd) return;

        if (player.character.admin >= cmd.access) {
            if (cmd.args) {
                let requiredArgs;
                if (admin.isTerminalCommand(cmd.args)) {
                    requiredArgs = cmd.args.split(' ');
                } else {
                    requiredArgs = cmd.args.split('] ');
                }
                if (args.length < requiredArgs.length) {
                    return player.call('chat.message.push', [`!{#ffffff} Используйте: ${command} ${cmd.args}`]);
                }
                for (let i = 0; i < requiredArgs.length; i++) {
                    let argType = requiredArgs[i].split(":")[1];
                    if (!argType) continue;
                    if (!admin.isValidArg(argType, args[i])) return player.call('chat.message.push', [`Неверное значение "${args[i]}" для параметра ${requiredArgs[i]}`])
                    else args[i] = admin.toValidArg(argType, args[i]);
                }
            }

            cmd.handler(player, args, {
                log(text, player) {
                    let messages = text.split('<br/>');
                    if (player) {
                        messages.forEach((message) => {
                            if (!message) return;
                            player.call('chat.message.push', [`!{#e0b8ff} ${message}`])
                        });
                    } else {
                        messages.forEach((message) => {
                            if (!message) return;
                            mp.events.call('admin.notify.all', `!{#e0b8ff}[A] ${message}`);
                        });
                    }
                },
                info(text, player) {
                    let messages = text.split('<br/>');
                    if (player) {
                        messages.forEach((message) => {
                            if (!message) return;
                            player.call('chat.message.push', [`!{#59dbff} ${message}`])
                        });
                    } else {
                        messages.forEach((message) => {
                            if (!message) return;
                            mp.events.call('admin.notify.all', `!{#59dbff}[A] ${message}`);
                        });
                    }
                },
                warning(text, player) {
                    let messages = text.split('<br/>');
                    if (player) {
                        messages.forEach((message) => {
                            if (!message) return;
                            player.call('chat.message.push', [`!{#ffcc24} ${message}`])
                        });
                    } else {
                        messages.forEach((message) => {
                            if (!message) return;
                            mp.events.call('admin.notify.all', `!{#ffcc24}[A] ${message}`);
                        });
                    }
                },
                error(text, player) {
                    let messages = text.split('<br/>');
                    if (player) {
                        messages.forEach((message) => {
                            if (!message) return;
                            player.call('chat.message.push', [`!{#ff0000} ${message}`])
                        });
                    } else {
                        messages.forEach((message) => {
                            if (!message) return;
                            mp.events.call('admin.notify.all', `!{#ff0000}[A] ${message}`);
                        });
                    }
                },
                debug(text, player) {
                    let messages = text.split('<br/>');
                    if (player) {
                        messages.forEach((message) => {
                            if (!message) return;
                            player.call('chat.message.push', [`!{#ffffff} ${message}`])
                        });
                    } else {
                        messages.forEach((message) => {
                            if (!message) return;
                            mp.events.call('admin.notify.all', `!{#ffffff}[A] ${message}`);
                        });
                    }
                },
            });
        }
    },
    "admin.panel.load": (player) => {
        loadPanel(player, false);
    },
    "admin.panel.execute": (player, rawPayload) => {
        if (!isAdmin(player)) return notifyError(player, 'Нет доступа');
        const payload = parsePayload(player, rawPayload);
        if (!payload || typeof payload.command !== 'string' || !Array.isArray(payload.args)) return;
        const command = commands[payload.command];
        if (!command || player.character.admin < command.access ||
            payload.args.some(arg => typeof arg !== 'string')) {
            return notifyError(player, 'Команда недоступна');
        }
        mp.events.call('admin.command.handle', player, payload.command, payload.args);
    },
    "admin.panel.report.reply": async (player, rawPayload) => {
        if (!isAdmin(player)) return notifyError(player, 'Нет доступа');
        const payload = parsePayload(player, rawPayload);
        const reportId = Number(payload && payload.reportId);
        const message = typeof (payload && payload.message) === 'string' ? payload.message.trim() : '';
        if (!Number.isInteger(reportId) || reportId <= 0 || !message || message.length > 512) {
            return notifyError(player, 'Проверьте текст ответа');
        }
        let report;
        try {
            report = await db.Models.AdminReport.findByPk(reportId);
            if (!report || report.status !== 'open') return notifyError(player, 'Репорт уже закрыт или не найден');
            if (report.assignedAdminCharacterId !== player.character.id) {
                return notifyError(player, 'Сначала примите жалобу в работу');
            }
            addReportMessage(report, {
                id: `${report.id}-${Date.now()}`,
                authorCharacterId: player.character.id,
                authorName: player.name,
                authorAdmin: true,
                message,
            });
            await report.save();
        } catch (error) {
            console.error('[ADMIN PANEL] Failed to send report reply:', error);
            notifyError(player, 'Не удалось отправить ответ');
            return;
        }
        mp.players.forEach(current => {
            if (current.character && current.character.id === report.playerCharacterId) {
                current.call('chat.message.push', [`!{#59dbff}[Ответ администрации] ${message}`]);
            }
        });
        loadPanel(player, false);
    },
    "admin.panel.report.update": async (player, rawPayload) => {
        if (!isAdmin(player)) return notifyError(player, 'Нет доступа');
        const payload = parsePayload(player, rawPayload);
        if (!payload || typeof payload !== 'object') return;
        const reportId = Number(payload.reportId);
        if (!Number.isInteger(reportId) || reportId <= 0) return notifyError(player, 'Репорт не найден');
        try {
            if (payload.action === 'claim') {
                const [claimed] = await db.Models.AdminReport.update({
                    assignedAdminCharacterId: player.character.id,
                    assignedAdminName: player.name
                }, {
                    where: {
                        id: reportId,
                        status: 'open',
                        [Op.or]: [
                            { assignedAdminCharacterId: null },
                            { assignedAdminCharacterId: player.character.id }
                        ]
                    }
                });
                if (!claimed) {
                    const currentReport = await db.Models.AdminReport.findByPk(reportId);
                    if (!currentReport || currentReport.status !== 'open') {
                        return notifyError(player, 'Репорт уже закрыт или не найден');
                    }
                    return notifyError(player, `Жалобу уже принял ${currentReport.assignedAdminName || 'другой администратор'}`);
                }
                loadPanel(player, false);
                return;
            }
            const report = await db.Models.AdminReport.findByPk(reportId);
            if (!report || report.status !== 'open') return notifyError(player, 'Репорт уже закрыт или не найден');
            if (payload.action === 'close') {
                if (report.assignedAdminCharacterId !== player.character.id) {
                    return notifyError(player, 'Сначала примите жалобу в работу');
                }
                const resolution = typeof payload.resolution === 'string' ? payload.resolution.trim() : '';
                if (!resolution || resolution.length > 300) {
                    return notifyError(player, 'Укажите результат рассмотрения (до 300 символов)');
                }
                report.status = 'closed';
                report.closedAt = new Date();
                report.resolution = resolution;
            } else {
                return notifyError(player, 'Неизвестное действие');
            }
            await report.save();
            loadPanel(player, false);
        } catch (error) {
            console.error('[ADMIN PANEL] Failed to update report:', error);
            notifyError(player, 'Не удалось обновить репорт');
        }
    },
    "admin.panel.report.goto": async (player, rawReportId) => {
        if (!isAdmin(player) || player.character.admin < 2) return notifyError(player, 'Для телепорта нужен 2 уровень администратора');
        const reportId = Number(rawReportId);
        if (!Number.isInteger(reportId) || reportId <= 0) return notifyError(player, 'Жалоба не найдена');
        try {
            const report = await db.Models.AdminReport.findByPk(reportId);
            if (!report) return notifyError(player, 'Жалоба не найдена');
            let target = null;
            mp.players.forEach(current => {
                if (current.character && current.character.id === report.playerCharacterId) target = current;
            });
            if (!target) return notifyError(player, 'Заявитель сейчас не в сети');
            player.backPosition = player.position;
            player.backDimension = player.dimension;
            player.position = new mp.Vector3(target.position.x + 2, target.position.y, target.position.z);
            player.dimension = target.dimension;
            call('anticheat').allowMove(player);
            if (player.house && target.house) {
                player.house.place = target.house.place;
                player.house.id = target.house.id;
            }
            player.call('chat.message.push', [`!{#ebd13d}Вы телепортировались к заявителю ${target.name}. Используйте /goback для возврата.`]);
        } catch (error) {
            console.error('[ADMIN PANEL] Failed to teleport to report author:', error);
            notifyError(player, 'Не удалось телепортироваться к заявителю');
        }
    },
    /// обработка команды ahelp
    "admin.command.help": (player, args) => {
        if (!args[0] || isNaN(parseInt(args[0]))) return player.call('chat.message.push', [`!{#ffffff} Используйте /ahelp [уровень администрирования]`]);

        if (args[0] < 1 || args[0] > player.character.admin) return player.call('chat.message.push', [`!{#ffffff} Нет доступа`]);

        player.call('chat.message.push', [`!{#c1f051}Команды ${args[0]} уровня администрирования:`]);
        for (let cmd in commands) {
            if (commands[cmd].access == args[0]) {
                player.call('chat.message.push', [`!{#ffffff} ${commands[cmd].description}: ${cmd} ${commands[cmd].args}`]);
            }
        }
    },
    /// Отправить сообщение всем админам
    "admin.notify.all": (message) => {
        mp.players.forEach((current) => {
            if (current.character) {
                if (current.character.admin > 0) {
                    try {
                        current.call('chat.message.push', [message]);
                    } catch (err) {
                        console.log(err);
                    }
                }
            }
        });
    },
    "admin.notify.all.split": (message, fixed, color) => {
        mp.players.forEach((current) => {
            if (current.character) {
                if (current.character.admin > 0) {
                        current.call('chat.message.split', [message, fixed, color]);
                }
            }
        });
    },
    /// Отправить сообщение всем игрокам
    "admin.notify.players": (message) => {
        mp.players.forEach((current) => {
            if (!current.character) return;
            try {
                current.call('chat.message.push', [message]);
            } catch (err) {
                console.log(err);
            }
        });
    },
    "admin.notify.players.split": (message, fixed, color) => {
        mp.players.forEach((current) => {
            if (!current.character) return;
                current.call('chat.message.split', [message, fixed, color]);
        });
    },
    // Поступила жалоба или ответ игрока в существующем репорте
    "admin.report": async (player, message) => {
        if (!player.character || typeof message !== 'string') return;
        message = message.trim().slice(0, 512);
        if (!message) return;
        const characterId = player.character.id;
        const playerName = player.name;
        const lastSentAt = reportCooldowns.get(characterId) || 0;
        const isMedia = !!(player.character.Promocode && player.character.Promocode.media);
        if (!isMedia && Date.now() - lastSentAt < 60 * 1000) {
            const seconds = Math.ceil((60 * 1000 - (Date.now() - lastSentAt)) / 1000);
            return player.call('notifications.push.error', [`Подождите ${seconds} сек. перед следующим сообщением`, 'Репорт']);
        }
        reportCooldowns.set(characterId, Date.now());
        let report;
        try {
            report = await db.sequelize.transaction(async transaction => {
                let currentReport = await db.Models.AdminReport.findOne({
                    where: { playerCharacterId: characterId, status: 'open' },
                    order: [['createdAt', 'DESC']],
                    transaction
                });
                if (!currentReport) {
                    currentReport = await db.Models.AdminReport.create({
                        playerCharacterId: characterId,
                        playerName,
                        status: 'open'
                    }, { transaction });
                }
                if (!currentReport.message) currentReport.message = message.slice(0, 120);
                addReportMessage(currentReport, {
                    id: `${currentReport.id}-${Date.now()}`,
                    authorCharacterId: characterId,
                    authorName: playerName,
                    authorAdmin: false,
                    message
                });
                currentReport.playerName = playerName;
                await currentReport.save({ transaction });
                return currentReport;
            });
        } catch (error) {
            reportCooldowns.delete(characterId);
            console.error('[ADMIN PANEL] Failed to create report message:', error);
            if (mp.players.exists(player)) {
                player.call('notifications.push.error', ['Не удалось отправить репорт', 'Ошибка']);
            }
            return;
        }
        if (mp.players.exists(player)) {
            player.call('chat.message.push', [`!{#87c924}Сообщение отправлено в репорт #${report.id}. Ответ администрации появится в чате.`]);
        }
        mp.events.call('admin.notify.all', `!{#87c924}[Репорт #${report.id}] ${playerName}[${player.id}]: ${message}`);
        mp.players.forEach(current => {
            if (current.character && current.character.admin > 0) loadPanel(current, false);
        });
    },
    "characterInit.done": (player) => {
        let level = player.character.admin;
        if (level > 0) {
           player.call('admin.set', [level]);
        }
    },
    "playerQuit": (player) => {
        if (player.character) reportCooldowns.delete(player.character.id);
    },
}
