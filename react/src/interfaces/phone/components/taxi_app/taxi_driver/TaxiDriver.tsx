import React, { Fragment, useState, useEffect, useRef } from "react";
import Header from "./Header";
import ActiveOrder from "./ActiveOrder";
import OrderList from "./OrderList";
import { useTaxiDriverStore, loadInfoTaxiDriver, addOrderTaxiDriver } from '../../../taxiDriver';
import { closeAppDisplay } from '../../../navigation';

function TaxiDriver(ownProps) {
  const taxiDriver = useTaxiDriverStore();
  const props = { ...ownProps,
    taxi: taxiDriver,
    loadInfo: loadInfoTaxiDriver,
    closeApp: closeAppDisplay,
    addOrder: addOrderTaxiDriver
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

  self.getLoader = () => {
    return <div className="loader01" style={{
      margin: '10% 5%',
      borderColor: '#FBD825',
      borderRightColor: 'transparent'
    }}>
            </div>;
  };

  self.getForm = () => {
    const {
      taxi
    } = self.props;
    return <Fragment>
                <Header name={taxi.name} />
                {taxi.activeOrder != null ? <ActiveOrder /> : <OrderList />}
            </Fragment>;
  };

  useEffect(() => {
    const {
      taxi
    } = self.props; // setTimeout(() => {
    //     this.props.loadInfo({
    //         name: 'Dun Hill',
    //         orders: [
    //             {
    //                 id: 0,
    //                 distance: 4.2
    //             },
    //             {
    //                 id: 1,
    //                 distance: 0.5
    //             },
    //         ]
    //     })
    // }, )
    // //
    // setTimeout(() => {
    //     this.props.addOrder({id: 4, distance: 3.1});
    // }, 2000)
    // setTimeout(() => {
    //     this.props.loadInfo({
    //         name: 'Dun Hill',
    //         orders: [
    //             {
    //                 id: 0,
    //                 distance: 4.2
    //             },
    //             {
    //                 id: 1,
    //                 distance: 0.5
    //             },
    //         ]
    //     })
    // }, )
    // //
    // setTimeout(() => {
    //     this.props.addOrder({id: 4, distance: 3.1});
    // }, 2000)

    if (Object.keys(taxi).length === 0) {
      mp.trigger('taxi.driver.app.open');
    }
  }, []);
  return (() => {
    const {
      taxi,
      closeApp
    } = self.props;
    return <div className='back_page-phone-react'>
                <div className='back_taxi_img_driver-phone-react'></div>
                <div className='back_taxi_driver-phone-react'>
                    {Object.keys(taxi).length > 0 ? self.getForm() : self.getLoader()}
                    <div className='button_close_taxi-phone-react' onClick={() => closeApp()}>
                        Закрыть приложение
                    </div>
                </div>
            </div>;
  })();
}

export default TaxiDriver;
