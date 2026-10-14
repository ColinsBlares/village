import Chat from './components/Chat';
import { registerChatEvents } from './events';

export default {
    id: 'chat',
    Component: Chat,
    order: 0,
    useVisible: () => true,
    register: registerChatEvents,
};
