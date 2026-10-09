import { createStore } from 'redux'; // createStore

import { composeWithDevTools } from 'redux-devtools-extension';
import rootReducers from './rootReducer';
import { PlayerEvents } from '../../events';

const store = createStore(rootReducers, // createStore
    composeWithDevTools());

PlayerEvents(store.dispatch, store.getState);

export default store;