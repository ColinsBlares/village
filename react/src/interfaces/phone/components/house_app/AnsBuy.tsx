import React, { Fragment, useState, useRef } from "react";
import Success from "./SuccessBuy";
import Error from "./Error";
import HeaderHouseApp from "./HeaderHouseApp";
import { usePhoneStore } from '../../store';
import { addAppDisplay, closeAppDisplay } from '../../navigation';

function AnsBuy(ownProps) {
  const phone = usePhoneStore();
  const props = { ...ownProps,
    info: phone,
    house: phone.houses && phone.houses[0],
    addApp: addAppDisplay,
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
      closeApp
    } = self.props;

    if (status == 0) {
      closeApp();
      addApp({
        name: 'Error',
        form: <Error status='Ошибка' />
      });
    } else if (status == 1) {
      closeApp();
      addApp({
        name: 'SuccessBuy',
        form: <Success type={self.props.type} />
      });
    } else if (status == 2) {
      closeApp();
      addApp({
        name: 'Error',
        form: <Error status='У вас недостаточно денег' />
      });
    }
  };

  return (() => {
    const {
      info,
      house
    } = self.props;
    return <div className='back_page-phone-react'>
                <HeaderHouseApp house={house} />
                {info.houses[0].buyStatus != null ? <Fragment>{self.getAnsPage(info.houses[0].buyStatus)}</Fragment> : <div className="loader01" style={{
        margin: '10% 5%'
      }}></div>}
            </div>;
  })();
}

export default AnsBuy;
