import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'inventory',
	order: 20,
	load: function () { return import('./runtime'); },
	global: 'inventory',
	methods: ["setItemsInfo","setItemInfo","setMergeList","setBlackList","setBodyList","getItem","addItem","initItems","initSearchItems","stopSearchMode","deleteItem","setItemSqlId","setItemParam","setFoundItem","addEnvironmentPlace","deleteEnvironmentPlace","getEnvironmentPlace","getEnvironmentItem","addEnvironmentItem","deleteEnvironmentItem","setEnvironmentItemSqlId","setEnvironmentItemParam","setArmour","setAmmo","getItemName","bindHotkey","unbindHotkey","clearHotkeys","onUseHandsItem","clearHands","moveItemToBody","urlItemImg","getPrettyParams","getItemsByItemId","getItemByParams","getItemInfoHash","getItemsInfoHashes","notify"],
	hotkey: { event: 'keyup', codes: [73], requireEnable: true, busy: ['auth', 'chat', 'terminal', 'interaction', 'mapCase', 'phone', 'playerMenu', 'inputWindow', 'fishing.game', 'selectItems', 'playersList', 'bugTracker'] },
});
