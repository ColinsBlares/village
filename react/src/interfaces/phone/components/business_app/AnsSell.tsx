import React, { Fragment, useState, useRef } from "react";
import Success from "./Success";
import MainDisplay from '../MainDisplay';
import Error from "./Error";
import { usePhoneStore } from '../../store';
import { addAppDisplay, setAppsDisplay, closeAppDisplay } from '../../navigation';

function AnsSell(ownProps) {
  const phone = usePhoneStore();
  const props = { ...ownProps,
    info: phone,
    business: phone.biz && phone.biz[0],
    addApp: addAppDisplay,
    setApps: setAppsDisplay,
    closeApp: closeAppDisplay
  };
  const [state, setReactState] = useState(() => ({}));

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

  self.getAnsPage = status => {
    const {
      addApp,
      closeApp,
      setApps,
      business
    } = self.props;

    if (status === 0) {
      closeApp();
      closeApp();
      addApp({
        name: 'Error',
        form: <Error status='Ошибка' />
      });
    } else if (status === 1) {
      let name = business.name;
      let area = business.area;
      setApps([{
        name: 'MainDisplay',
        form: <MainDisplay />
      }, {
        name: 'SuccessSell',
        form: <Success name={name} area={area} status='Бизнес успешно продан' />
      }]);
    } else if (status === 2) {
      closeApp();
      closeApp();
      addApp({
        name: 'Error',
        form: <Error status='Покупатель не принял условия сделки' />
      });
    } else if (status === 3) {
      closeApp();
      closeApp();
      addApp({
        name: 'Error',
        form: <Error status='Вы находитесь не рядом с бизнесом' />
      });
    } else if (status === 4) {
      closeApp();
      closeApp();
      addApp({
        name: 'Error',
        form: <Error status='Нельзя продать бизнес дешевле гос.стоимости' />
      });
    } else if (status === 5) {
      closeApp();
      closeApp();
      addApp({
        name: 'Error',
        form: <Error status='У покупателя недостаточно денег' />
      });
    } else if (status === 6) {
      closeApp();
      closeApp();
      addApp({
        name: 'Error',
        form: <Error status='У покупателя уже есть бизнес' />
      });
    }
  };

  return (() => {
    const {
      info
    } = self.props;
    return <div className='back_page-phone-react'>
                {info.biz[0].sellStatus != null ? <Fragment>{self.getAnsPage(info.biz[0].sellStatus)}</Fragment> : <div className="loader01" style={{
        margin: '10% 5%'
      }}></div>}
            </div>;
  })();
}

export default AnsSell;
