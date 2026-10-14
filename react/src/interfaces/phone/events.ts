import { addMessageToPhone, loadDialogs, loadMessagesToDialog } from './dialogs';
import {
    addInfoToPhone,
    completeOrderBusiness,
    completeOrderBusinessFaction,
    deleteApp,
    installPhoneApp,
    setBuyStatusBusiness,
    setBuyStatusBusinessFaction,
    setBuyStatusHouse,
    setCallStatus,
    setIncomingCall,
    setOrderStatusBusiness,
    setOrderStatusBusinessFaction,
    setSellInfoBusiness,
    setSellInfoHouse,
    setSellStatusBusiness,
    setSellStatusHouse,
    setSymbolPriceNews,
    showPhone,
    takeOrderBusiness,
    takeOrderBusinessFaction,
    updateCashboxBusiness,
    updateMyNumber,
    updateProductsBusiness,
    updateStatisticsBusiness,
} from './store';
import {
    ansOrderTaxiClient,
    cancelOrderTaxiClient,
    driverReadyTaxiClient,
    errorOrderTaxiClient,
    loadLocationTaxiClient,
    playerInTaxiClient,
    setDestinationTaxiClient,
} from './taxiClient';
import {
    addOrderTaxiDriver,
    cancelOrderTaxiDriver,
    deleteOrderTaxiDriver,
    errorOrderTaxiDriver,
    loadInfoTaxiDriver,
    setDestinationTaxiDriver,
} from './taxiDriver';

export function registerPhoneEvents(gameEvents: GameEvents) {
    gameEvents.on('phone.show', (flag) => {
        showPhone(flag);
    });

    gameEvents.on('phone.load', (info) => {
        addInfoToPhone(info);
    });

    gameEvents.on('news.price', (symbolPrice) => {
        setSymbolPriceNews(symbolPrice);
    });

    gameEvents.on('phone.message.list', (dialogs) => {
        loadDialogs(dialogs);
    });

    gameEvents.on('phone.message.load', (messages, number) => {
        loadMessagesToDialog(number, messages);
    });

    gameEvents.on('phone.message.set', (message, number) => {
        addMessageToPhone(message, Date.now(), number, false, false);
    });

    gameEvents.on('phone.contact.mine.update', (oldNumber, newNumber) => {
        updateMyNumber(oldNumber, newNumber);
    });

    gameEvents.on('phone.call.in', (number) => {
        setIncomingCall(true, number);
    });

    gameEvents.on('phone.call.end', () => {
        setCallStatus(5);
    });

    gameEvents.on('phone.call.ans', (answer) => {
        setCallStatus(answer);
    });

    gameEvents.on('phone.app.add', (appName, info) => {
        installPhoneApp(appName, info);
    });

    gameEvents.on('phone.app.remove', (appName) => {
        deleteApp(appName);
    });

    gameEvents.on('house.sell.toGov.ans', (answer) => {
        setSellStatusHouse(answer);
    });

    gameEvents.on('house.sell.ans', (answer) => {
        setSellStatusHouse(answer);
    });

    gameEvents.on('house.sell.check.ans', (nick, price) => {
        setSellInfoHouse({ nick, price });
    });

    gameEvents.on('house.improvements.buy.ans', (answer) => {
        setBuyStatusHouse(answer);
    });

    gameEvents.on('biz.sell.toGov.ans', (answer) => {
        setSellStatusBusiness(answer);
    });

    gameEvents.on('biz.sell.ans', (answer) => {
        setSellStatusBusiness(answer);
    });

    gameEvents.on('biz.sell.check.ans', (nick, price) => {
        setSellInfoBusiness({ nick, price });
    });

    gameEvents.on('biz.order.ans', (answer) => {
        setOrderStatusBusiness(answer);
    });

    gameEvents.on('biz.order.complete', (resources, sum) => {
        completeOrderBusiness(resources, sum);
    });

    gameEvents.on('biz.order.take', (flag) => {
        takeOrderBusiness(flag);
    });

    gameEvents.on('biz.statistics.update', (date, money) => {
        updateStatisticsBusiness(date, money);
    });

    gameEvents.on('biz.cashbox.update', (money) => {
        updateCashboxBusiness(money);
    });

    gameEvents.on('biz.improvements.buy.ans', (answer) => {
        setBuyStatusBusiness(answer);
    });

    gameEvents.on('biz.products.update', (number) => {
        updateProductsBusiness(number);
    });

    gameEvents.on('biz.faction.order.ans', (answer) => {
        setOrderStatusBusinessFaction(answer);
    });

    gameEvents.on('biz.faction.order.complete', (resources, sum) => {
        completeOrderBusinessFaction(resources, sum);
    });

    gameEvents.on('biz.faction.order.take', (flag) => {
        takeOrderBusinessFaction(flag);
    });

    gameEvents.on('biz.faction.improvements.buy.ans', (answer) => {
        setBuyStatusBusinessFaction(answer);
    });

    gameEvents.on('taxi.client.location', (area, street) => {
        loadLocationTaxiClient(area, street);
    });

    gameEvents.on('taxi.client.order.ans', (order) => {
        ansOrderTaxiClient(order);
    });

    gameEvents.on('taxi.client.order.ready', () => {
        driverReadyTaxiClient();
    });

    gameEvents.on('taxi.client.order.inTaxi', () => {
        playerInTaxiClient();
    });

    gameEvents.on('taxi.client.order.destination', (area, street, price) => {
        setDestinationTaxiClient(area, street, price);
    });

    gameEvents.on('taxi.client.order.cancel', () => {
        cancelOrderTaxiClient();
    });

    gameEvents.on('taxi.client.order.error', () => {
        errorOrderTaxiClient();
    });

    gameEvents.on('taxi.driver.load', (info) => {
        loadInfoTaxiDriver(info);
    });

    gameEvents.on('taxi.driver.order.add', (order) => {
        addOrderTaxiDriver(order);
    });

    gameEvents.on('taxi.driver.order.delete', (orderId) => {
        deleteOrderTaxiDriver(orderId);
    });

    gameEvents.on('taxi.driver.order.cancel', () => {
        cancelOrderTaxiDriver();
    });

    gameEvents.on('taxi.driver.order.error', () => {
        errorOrderTaxiDriver();
    });

    gameEvents.on('taxi.driver.order.way', (area, street, price) => {
        setDestinationTaxiDriver(area, street, price);
    });
}
