import economy from '@imgs/phone/taxi/economy.png';
import comfort from '@imgs/phone/taxi/comfort.png';
import business from '@imgs/phone/taxi/business.png';

export interface TaxiClass {
	id: string;
	name: string;
	price: string;
	car: string;
}

export const taxiClasses: TaxiClass[] = [
	{ id: 'economy', name: 'Эконом', price: 'от 15$', car: economy },
	{ id: 'comfort', name: 'Комфорт', price: 'от 50$', car: comfort },
	{ id: 'business', name: 'Бизнес', price: 'от 120$', car: business },
];
