import React, { Fragment, useState, useRef } from "react";
import Success from "./Success";
import Error from "./Error";
import { usePhoneStore } from '../../store';
import { addAppDisplay, closeAppDisplay } from '../../navigation';

function AnsOrder(ownProps) {
  const phone = usePhoneStore();
  const props = { ...ownProps,
    info: phone,
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
      closeApp,
      productsCount,
      productsPrice
    } = self.props;

    if (status === 0) {
      closeApp();
      addApp({
        name: 'Error',
        form: <Error status='Ошибка' />
      });
    } else if (status === 1) {
      closeApp();
      closeApp();
      addApp({
        name: 'Success',
        form: <Success status='Заказ успешно сделан' productsCount={productsCount} productsPrice={productsPrice} />
      });
    } else if (status === 2) {
      closeApp();
      addApp({
        name: 'Error',
        form: <Error status='Недостаточно денег' />
      });
    } else if (status === 3) {
      closeApp();
      addApp({
        name: 'Error',
        form: <Error status='Недостаточно места на складе' />
      });
    }
  };

  return (() => {
    const {
      info
    } = self.props;
    return <div className='back_page-phone-react'>
                {info.factionBiz.orderStatus != null ? <Fragment>{self.getAnsPage(info.factionBiz.orderStatus)}</Fragment> : <div className="loader01" style={{
        margin: '10% 5%'
      }}></div>}
            </div>;
  })();
}

export default AnsOrder;
