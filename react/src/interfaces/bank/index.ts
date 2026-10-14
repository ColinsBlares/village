import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'bank',
	order: 5,
	load: function () { return import('./runtime'); },
	events: ["bank.show","bank.update","bank.close","bank.push.ans","bank.pop.ans","bank.phone.push.ans","bank.house.push.ans","bank.biz.push.ans","bank.biz.cashbox.push.ans","bank.biz.cashbox.pop.ans","bank.transfer.ask.ans","bank.transfer.ans"],
});
