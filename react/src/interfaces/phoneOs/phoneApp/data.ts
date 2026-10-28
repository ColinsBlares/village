export interface Contact {
	id: string;
	name: string;
	phone: string;
}

export interface Recent {
	id: string;
	contactId: string | null;
	name: string;
	phone: string;
	kind: 'in' | 'out' | 'missed';
	when: string;
}

export const seedContacts: Contact[] = [
	{ id: '1', name: 'Адам Уокер', phone: '555-0101' },
	{ id: '2', name: 'Виктория Соколова', phone: '555-0148' },
	{ id: '3', name: 'Дмитрий Ким', phone: '555-0172' },
	{ id: '4', name: 'Ева Ли', phone: '555-0190' },
	{ id: '5', name: 'Игорь Панин', phone: '555-0114' },
	{ id: '6', name: 'Мария Коваль', phone: '555-0166' },
	{ id: '7', name: 'Никита Орлов', phone: '555-0133' },
	{ id: '8', name: 'Ольга Белова', phone: '555-0188' },
	{ id: '9', name: 'Павел Громов', phone: '555-0120' },
	{ id: '10', name: 'Семья', phone: '555-0100' },
];

export const seedRecents: Recent[] = [
	{ id: 'r1', contactId: '2', name: 'Виктория Соколова', phone: '555-0148', kind: 'missed', when: '18:42' },
	{ id: 'r2', contactId: '6', name: 'Мария Коваль', phone: '555-0166', kind: 'out', when: '17:05' },
	{ id: 'r3', contactId: '10', name: 'Семья', phone: '555-0100', kind: 'in', when: 'вчера' },
	{ id: 'r4', contactId: '1', name: 'Адам Уокер', phone: '555-0101', kind: 'out', when: 'вчера' },
	{ id: 'r5', contactId: '7', name: 'Никита Орлов', phone: '555-0133', kind: 'missed', when: 'пн' },
	{ id: 'r6', contactId: '3', name: 'Дмитрий Ким', phone: '555-0172', kind: 'in', when: 'пн' },
	{ id: 'r7', contactId: '9', name: 'Павел Громов', phone: '555-0120', kind: 'out', when: 'вс' },
	{ id: 'r8', contactId: '4', name: 'Ева Ли', phone: '555-0190', kind: 'in', when: 'вс' },
];
