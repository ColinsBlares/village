import React, { Fragment, useState, useRef } from "react";
import HeadAppPhone from "./HeadAppPhone";
import ContactPage from "./ContactPage";
import { usePhoneStore, addContact } from '../store';
import { useDialogsStore, renameDialog } from '../dialogs';
import { addAppDisplay, closeAppDisplay } from '../navigation';

function CreateContactPage(ownProps) {
  const phone = usePhoneStore();
  const dialogs = useDialogsStore();
  const props = { ...ownProps,
    info: phone,
    dialogs,
    addContact,
    addApp: addAppDisplay,
    closeApp: closeAppDisplay,
    renameDialog
  };
  const [state, setReactState] = useState(() => ({
    error: '',
    number: '',
    name: ''
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

  self.handleChangeInput = e => {
    setState({
      [e.target.id]: e.target.value
    });
  };

  self.createContact = e => {
    e.preventDefault();
    const {
      addContact,
      addApp,
      closeApp,
      dialogs,
      renameDialog
    } = self.props;
    const {
      name,
      number
    } = self.state;

    if (self.validateForm()) {
      let contact = {
        name,
        number
      };
      addContact(contact);
      let dialogIndex = dialogs.list.findIndex(d => d.number === number);

      if (dialogIndex !== -1) {
        renameDialog(number, name);
      }

      mp.trigger('phone.contact.add', name, number);
      closeApp();
      addApp({
        name: 'ContactPage',
        form: <ContactPage contact={contact} />
      });
    }
  };

  self.validateForm = () => {
    const {
      info
    } = self.props;
    const {
      name,
      number
    } = self.state;
    var regName = /[\w\sА-яЁё]/;
    var regNum = /[0-9]/;

    if (name) {
      if (number) {
        let h = true;

        for (let i = 0; i < name.length; i++) {
          if (!regName.test(name[i])) {
            h = false;
          }
        }

        if (h) {
          let g = true;

          for (let i = 0; i < number.length; i++) {
            if (!regNum.test(number[i])) {
              g = false;
            }
          }

          if (g) {
            if (!info.contacts.some(num => number === num.number)) {
              setState({
                error: ''
              });
              return true;
            } else {
              setState({
                error: 'Такой контакт уже есть'
              });
              return false;
            }
          } else {
            setState({
              error: 'Неверный формат номера'
            });
            return false;
          }
        } else {
          setState({
            error: 'Неверный формат имени'
          });
          return false;
        }
      } else {
        setState({
          error: 'Номер не заполнен'
        });
        return false;
      }
    } else {
      setState({
        error: 'Имя не заполнено'
      });
      return false;
    }
  };

  return (() => {
    const {
      error
    } = self.state;
    return <Fragment>
                <div className='back_page-phone-react' style={{
        textAlign: 'center'
      }}>
                    <HeadAppPhone title='Добавить контакт' />
                    <div className='back_icon_contact-phone-react' style={{
          height: '17%',
          marginTop: '30%',
          marginLeft: 0
        }}>
                        <svg className='contact_icon-phone-react' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 38 33" style={{
            marginTop: '21%',
            marginLeft: '0'
          }}>
                            <path id="_4F" data-name="4F" d="M17.877,37.19A32.219,32.219,0,0,1,4.442,34.554c-3.589-1.7-5.565-3.96-5.565-6.364s1.976-4.664,5.565-6.364A32.219,32.219,0,0,1,17.877,19.19a32.219,32.219,0,0,1,13.435,2.636c3.588,1.7,5.565,3.96,5.565,6.364s-1.976,4.664-5.565,6.364A32.219,32.219,0,0,1,17.877,37.19Zm.29-19.537A8.892,8.892,0,0,1,9.23,8.826a8.939,8.939,0,0,1,17.876,0A8.893,8.893,0,0,1,18.167,17.653Z" transform="translate(1.123 0)" fill="#cacaca" />
                        </svg>
                    </div>

                    <div className='crt_cnt_err-phone-react' style={{
          background: error && '#ffeded',
          color: error && 'red'
        }}>
                        {error ? <span>{error}</span> : <span>Заполните поля ниже</span>}
                    </div>

                    <div className='block_crt_cnt-phone-react'>
                        <span>Имя:</span>
                        <input id='name' onChange={self.handleChangeInput} value={self.state.name} />
                        <span style={{
            marginTop: '10%'
          }}>Номер:</span>
                        <input id='number' onChange={self.handleChangeInput} value={self.state.number} />
                        <button onClick={self.createContact.bind(this)}>Добавить</button>
                    </div>
                </div>
            </Fragment>;
  })();
}

export default CreateContactPage;
