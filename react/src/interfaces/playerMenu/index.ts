import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'playerMenu',
	order: 8,
	load: function () { return import('./runtime'); },
	global: 'playerMenu',
	methods: ["init","setFaction","setFactionRank","setFamily","setJob","setWanted","setFines","setBiz","setHouse","setSkills","setSkill","setCash","setDonate","setWarns","setSlots","setPromocode","setInvited","setCompleted","setMedia","setPasswordDate","setEmail","setName","setAdmin","setLaw","setNarcotism","setNicotine","setNumber","setSpouse","setFamiliar","setSettings","setStatistics","setDonatePrice","showConfirmWindow","openFamilyControl","enterCode","sendCode"],
	hotkey: { event: 'keyup', codes: [77], requireEnable: true, busy: ['chat', 'terminal', 'interaction', 'mapCase', 'phone', 'inventory', 'inputWindow', 'playersList', 'bugTracker'] },
});
