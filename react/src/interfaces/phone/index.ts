import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'phone',
	order: 1,
	load: function () { return import('./runtime'); },
	gate: 'phoneReady',
	events: ["phone.show","phone.load","news.price","phone.message.list","phone.message.load","phone.message.set","phone.contact.mine.update","phone.call.in","phone.call.end","phone.call.ans","phone.app.add","phone.app.remove","house.sell.toGov.ans","house.sell.ans","house.sell.check.ans","house.improvements.buy.ans","biz.sell.toGov.ans","biz.sell.ans","biz.sell.check.ans","biz.order.ans","biz.order.complete","biz.order.take","biz.statistics.update","biz.cashbox.update","biz.improvements.buy.ans","biz.products.update","biz.faction.order.ans","biz.faction.order.complete","biz.faction.order.take","biz.faction.improvements.buy.ans","taxi.client.location","taxi.client.order.ans","taxi.client.order.ready","taxi.client.order.inTaxi","taxi.client.order.destination","taxi.client.order.cancel","taxi.client.order.error","taxi.driver.load","taxi.driver.order.add","taxi.driver.order.delete","taxi.driver.order.cancel","taxi.driver.order.error","taxi.driver.order.way"],
});
