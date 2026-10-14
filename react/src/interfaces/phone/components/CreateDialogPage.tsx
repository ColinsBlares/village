import React, { Fragment, useState, useRef } from "react";
import HeadAppPhone from "./HeadAppPhone";
import DialogPage from "./DialogPage";
import { useDialogsStore, addDialog } from '../dialogs';
import { usePhoneStore } from '../store';
import { addAppDisplay, closeAppDisplay } from '../navigation';

function CreateDialogPage(ownProps) {
  const dialogs = useDialogsStore();
  const phone = usePhoneStore();
  const props = { ...ownProps,
    dialogs,
    info: phone,
    addDialog,
    addApp: addAppDisplay,
    closeApp: closeAppDisplay
  };
  const [state, setReactState] = useState(() => ({
    inputNumber: ''
  }));

  function setState(update) {
    setReactState(prev => {
      const partial = typeof update === "function" ? update(prev) : update;
      return { ...prev,
        ...partial
      };
    });
  }

  const selfRef = useRef(null);
  const readyRef = useRef(false);

  if (selfRef.current == null) {
    selfRef.current = {};
  }

  const self = selfRef.current;
  self.props = props;
  self.state = state;

  self.handleInputNumber = e => {
    setState({
      inputNumber: e.target.value
    });
  };

  self.getContact = (contact, index) => {
    return <div className='contact_field-phone-react' key={index} id={`contact${index}`} onClick={e => self.startDialog(e, contact.number)}>
                <span>{contact.name}</span>
                <span style={{
        float: 'right'
      }}>{contact.number}</span>
            </div>;
  };

  self.startDialog = (e, number) => {
    const {
      addApp,
      dialogs,
      addDialog,
      info
    } = self.props;
    e.preventDefault();
    let dialogIndex = dialogs.list.findIndex(d => d.number === number);
    let contact = info.contacts.find(c => c.number === number);

    if (contact) {
      if (dialogIndex === -1) {
        let dialog = {
          name: contact.name,
          number: number
        };
        addDialog(contact.name, number);
        addApp({
          name: 'DialogPage',
          form: <DialogPage dialog={dialog} />
        });
      } else {
        let dialog = dialogs.list[dialogIndex];
        addApp({
          name: 'DialogPage',
          form: <DialogPage dialog={dialog} />
        });
      }
    } else {
      let dialog = {
        name: null,
        number: number
      };
      addDialog(null, number);
      addApp({
        name: 'DialogPage',
        form: <DialogPage dialog={dialog} />
      });
    }
  };

  self.getMessage = contacts => {
    const {
      inputNumber
    } = self.state;
    return <Fragment>
                {contacts.length === 0 && <div style={{
        textAlign: 'center'
      }}>Список контактов пуст</div>}
                {inputNumber && !isNaN(inputNumber) && !contacts.some(con => con.number === inputNumber) && <div style={{
        textAlign: 'center',
        marginTop: '5%'
      }}>
                    Нажмите, чтобы начать диалог с абонентом
                    <div className='create_dialog-phone-react'>
                        <span>{inputNumber}</span>
                        <button onClick={e => self.startDialog(e, inputNumber)}>
                            Начать
                        </button>
                    </div>
                </div>}
            </Fragment>;
  };

  return (() => {
    const {
      info
    } = self.props;
    const {
      inputNumber
    } = self.state;
    var contacts = info.contacts;

    if (inputNumber) {
      contacts = contacts.filter(cont => cont.number.toString().toLowerCase().startsWith(inputNumber) || cont.name.toString().toLowerCase().startsWith(inputNumber));
    }

    return <Fragment>
                <div className='back_page-phone-react'>
                    <HeadAppPhone title='Создать диалог' />
                    <div className='search-phone-react' style={{
          marginTop: '25%'
        }}>
                        <input className="search_input-phone-react" placeholder='Номер или имя' onChange={self.handleInputNumber} value={inputNumber} maxLength={10} />
                    </div>
                    <div className='contacts_list-phone-react'>
                        {contacts && contacts.length !== 0 && contacts.map((contact, index) => self.getContact(contact, index))}
                        {self.getMessage(contacts)}
                    </div>
                </div>
            </Fragment>;
  })();
}

export default CreateDialogPage;
