import React, { useState, useEffect, useRef } from "react";
import '../chat.css';
import { useChatStore, setOpacityChat, setFocusChat, pushMessage, setTagsChat, showChat } from '../store';

function Chat(ownProps) {
  const chat = useChatStore();
  const props = { ...ownProps,
    chat,
    setOpacityChat,
    setFocusChat,
    pushMessage,
    setTagsChat,
    showChat
  };
  const [state, setReactState] = useState(() => ({
    currentMessage: '',
    index: 0,
    curTagIndex: 0,
    opacity: 1,
    isMyMessage: false
  }));

  function setState(update) {
    setReactState(prev => {
      const partial = typeof update === "function" ? update(prev) : update;
      return { ...prev,
        ...partial
      };
    });
  }

  const renderedRef = useRef(false);
  const updateRef = useRef(null);
  const selfRef = useRef(null);
  const readyRef = useRef(false);

  if (selfRef.current == null) {
    selfRef.current = {};
  }

  const self = selfRef.current;

  if (!readyRef.current) {
    self.history = [];
    self.refList = null;
    self.refInput = null;
    self.isScroll = false;
    readyRef.current = true;
  }

  self.props = props;
  self.state = state;

  self.scrollToBottom = () => {
    const scrollHeight = self.refList.scrollHeight;
    const height = self.refList.clientHeight;
    const maxScrollTop = scrollHeight - height;
    self.refList.scrollTop = maxScrollTop > 0 ? maxScrollTop : 0;
  };

  self.handleChangeInput = e => {
    setState({
      currentMessage: e.target.value
    });
  };

  self.getMessage = (index, message) => {
    const {
      chat
    } = self.props;
    return <div key={index} className='message-chat-react'>
                {chat.time && <span style={{
        color: message.text[0].color
      }} className="word-chat-react">
                    {message.time}
                </span>}
                {message.text.map((word, ind) => <span style={{
        color: word.color
      }} key={ind * 10 + ind + 1} className="word-chat-react">
                            {word.text}
                        </span>)}
            </div>;
  };

  self.sendMessage = event => {
    const {
      curTagIndex,
      currentMessage,
      opacity
    } = self.state;
    const {
      chat,
      setFocusChat,
      setOpacityChat
    } = self.props;
    event.preventDefault();

    if (currentMessage && currentMessage.length <= 300) {
      self.history.push(currentMessage);
      setState({
        index: self.history.length,
        isMyMessage: true
      });
      mp.trigger('chat.message.get', chat.tags[curTagIndex].id, currentMessage);
      setState({
        currentMessage: ''
      });
    }

    setFocusChat(false);
    setOpacityChat(opacity);
    mp.trigger('chat.close');
  };

  self.pastePrevMessage = () => {
    const {
      index,
      currentMessage
    } = self.state;

    if (index > 0) {
      if (index === self.history.length) {
        setState({
          firstMessage: self.refInput.value
        });
      }

      setState({
        index: index - 1,
        currentMessage: self.history[index - 1]
      });
    }
  };

  self.pasteNextMessage = () => {
    const {
      index,
      firstMessage
    } = self.state;

    if (index < self.history.length - 1) {
      setState({
        index: index + 1,
        currentMessage: self.history[index + 1]
      });
    } else if (index === self.history.length - 1) {
      setState({
        index: index + 1,
        currentMessage: firstMessage
      });
    }
  };

  self.changeType = () => {
    const {
      curTagIndex
    } = self.state;
    const {
      chat
    } = self.props;

    if (curTagIndex < chat.tags.length - 1) {
      setState({
        curTagIndex: curTagIndex + 1
      });
    } else {
      setState({
        curTagIndex: 0
      });
    }
  };

  self.keyDownInput = event => {
    let code = event.keyCode;

    switch (code) {
      case 13:
        self.sendMessage(event);
        break;

      case 38:
        event.preventDefault();
        self.pastePrevMessage();
        break;

      case 40:
        event.preventDefault();
        self.pasteNextMessage();
        break;

      case 9:
        event.preventDefault();
        self.changeType();
        break;
    }
  };

  self.keyUpInput = event => {
    event.preventDefault();
    const {
      chat,
      setFocusChat,
      setOpacityChat
    } = self.props;
    let code = event.keyCode;

    if (code === 27) {
      setFocusChat(false);
      setOpacityChat(self.state.opacity);
      mp.trigger('chat.close');
    }
  };

  self.focusInput = event => {
    const {
      chat,
      setOpacityChat
    } = self.props;
    setState({
      opacity: chat.opacity
    });
    setOpacityChat(1);
  };

  useEffect(() => {
    if (updateRef.current) {
      const list = self.refList;
      const {
        chat
      } = self.props;
      const {
        isMyMessage
      } = self.state;

      if (list && chat.isFocus) {
        list.style.overflowY = 'auto';

        if (isMyMessage) {
          self.scrollToBottom();
          setState({
            isMyMessage: false
          });
        } else if (self.isScroll) {
          self.scrollToBottom();
          self.isScroll = false;
        }
      } else if (list) {
        list.style.overflowY = 'hidden';
        self.scrollToBottom();
      }
    }

    updateRef.current = {
      props: self.props,
      state: self.state
    };
  });

  if (renderedRef.current && self.refList && self.refList.scrollHeight - self.refList.scrollTop === self.refList.clientHeight) {
    self.isScroll = true;
  }

  renderedRef.current = true;
  return (() => {
    const {
      chat
    } = self.props;
    const {
      curTagIndex
    } = self.state;

    if (chat.isShow) {
      return <div id="chat-form-react" style={{
        opacity: chat.opacity,
        fontSize: `${chat.size * 1.6}vh`
      }}>

                    <ul id="message-list-chat-react" ref={list => {
          self.refList = list;
        }} style={{
          height: `${chat.size * 25}vh`
        }}>
                        {chat.messages.map((message, index) => self.getMessage(index, message))}
                    </ul>

                    {chat.isFocus && <div className='block-input-chat-react' style={{
          width: `${chat.size * 80}%`
        }}>
                        <div className="tag-chat-react">
                            <span style={{
              color: chat.tags[curTagIndex].color
            }}>
                                {chat.tags[curTagIndex].name}
                            </span>
                        </div>
                        <input type='text' value={self.state.currentMessage} onChange={self.handleChangeInput} ref={input => {
            self.refInput = input;
          }} placeholder='Введите сообщение' id="chat-message-input-react" onKeyDown={self.keyDownInput} onKeyUp={self.keyUpInput} maxLength={300} onFocus={self.focusInput.bind(this)} onBlur={() => {
            self.refInput.focus();
          }} autoFocus={true} style={{
            fontSize: `${chat.size * 1.6}vh`
          }}>
                        </input>
                    </div>}
                </div>;
    } else {
      return <div></div>;
    }
  })();
}

export default Chat;
