import React, { Fragment, useState, useEffect, useRef } from "react";
import HeadAppPhone from "./HeadAppPhone";
import ContactPage from "./ContactPage";
import ActiveCall from "./ActiveCall";
import CreateContactPage from "./CreateContactPage";
import { usePhoneStore, sortContacts } from '../store';
import { addAppDisplay, closeAppDisplay } from '../navigation';

function Contacts(ownProps) {
  const phone = usePhoneStore();
  const props = { ...ownProps,
    contacts: phone.contacts,
    info: phone,
    addApp: addAppDisplay,
    closeApp: closeAppDisplay,
    sortContacts
  };
  const [state, setReactState] = useState(() => ({
    search: ''
  }));

  function setState(update) {
    setReactState(prev => {
      const partial = typeof update === "function" ? update(prev) : update;
      return { ...prev,
        ...partial
      };
    });
  }

  const willRef = useRef(false);
  const updateRef = useRef(null);
  const selfRef = useRef(null);
  const readyRef = useRef(false);

  if (selfRef.current == null) {
    selfRef.current = {};
  }

  const self = selfRef.current;
  self.props = props;
  self.state = state;

  self.handleSearchInput = e => {
    setState({
      search: String(e.target.value).toLowerCase()
    });
  };

  self.toContactPage = (event, contact) => {
    const {
      addApp,
      closeApp
    } = self.props; //closeApp();
    //closeApp();

    addApp({
      name: 'ContactPage',
      form: <ContactPage contact={contact} />
    });
  };

  self.getContact = (contact, index) => {
    return <div className='contact_field-phone-react' key={index} id={`contact${index}`} onClick={e => self.toContactPage(e, contact)}>
                <span>{contact.name}</span>
            </div>;
  };

  useEffect(() => {
    if (updateRef.current) {
      const {
        contacts,
        sortContacts
      } = self.props; //contacts && contacts.isSorted && sortContacts();
      //contacts && contacts.isSorted && sortContacts();

      contacts && contacts.sort((a, b) => a.name.localeCompare(b.name));
    }

    updateRef.current = {
      props: self.props,
      state: self.state
    };
  });

  if (!willRef.current) {
    willRef.current = true;

    (() => {
      const {
        contacts,
        sortContacts
      } = self.props; //contacts && contacts.isSorted && sortContacts();
      //contacts && contacts.isSorted && sortContacts();

      contacts && contacts.sort((a, b) => a.name.localeCompare(b.name));
    })();
  }

  return (() => {
    console.log('render');
    const {
      addApp
    } = self.props;
    const {
      search
    } = self.state;
    var contacts = self.props.contacts;

    if (search) {
      contacts = contacts.filter(contact => contact.name.toString().toLowerCase().startsWith(search));
    }

    return <Fragment>
                <div className="back_page-phone-react">
                    <HeadAppPhone title='Контакты' />
                    <div className='search-phone-react'>
                        <input className="search_input-phone-react" placeholder='Поиск' onChange={self.handleSearchInput} />
                    </div>
                    <div className='contacts_list-phone-react'>
                        {contacts && contacts.length !== 0 ? contacts.map((contact, index) => self.getContact(contact, index)) : <div style={{
            textAlign: 'center'
          }}>Список контактов пуст</div>}
                    </div>
                    <div className='but_create_contact-phone-react' onClick={() => addApp({
          name: 'CreateContactPage',
          form: <CreateContactPage />
        })}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="45%" height="45%" viewBox="0 0 37.824 37.824" style={{
            position: 'absolute',
            top: '25%',
            left: '26%'
          }}>
                            <path id="_5A" data-name="5A" d="M20.412,20.412H36.325a1.5,1.5,0,0,0,0-3H20.412V1.5a1.5,1.5,0,0,0-3,0V17.412H1.5a1.5,1.5,0,1,0,0,3H17.412V36.325a1.5,1.5,0,0,0,3,0V20.412" transform="translate(0 0)" fill="#fff" />
                        </svg>
                    </div>
                </div>
            </Fragment>;
  })();
}

export default Contacts;
