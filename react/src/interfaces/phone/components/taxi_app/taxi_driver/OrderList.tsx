import React, { Fragment, useState, useEffect, useRef } from "react";
import { useTaxiDriverStore, takeOrderTaxiDriver, sortOrdersByDistance } from '../../../taxiDriver';

function OrderList(ownProps) {
  const taxiDriver = useTaxiDriverStore();
  const props = { ...ownProps,
    taxi: taxiDriver,
    takeOrder: takeOrderTaxiDriver,
    sortOrders: sortOrdersByDistance
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

  self.takeOrderInWork = id => {
    self.props.takeOrder(id);
    mp.trigger('taxi.driver.app.order.take', id);
  };

  useEffect(() => {
    if (updateRef.current) {
      const {
        taxi,
        sortOrders
      } = self.props;
      taxi.orders && !taxi.isSorted && sortOrders();
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
        taxi,
        sortOrders
      } = self.props;
      taxi.orders && sortOrders();
    })();
  }

  return (() => {
    const {
      taxi
    } = self.props;
    return <Fragment>
                <div style={{
        marginLeft: '5%',
        fontSize: '120%',
        marginTop: '5%'
      }}>Заказов: {taxi.orders.length}</div>
                <div className='order_list_taxi-phone-react'>
                    {taxi.orders.map((order, index) => <div key={index} onClick={() => self.takeOrderInWork(order.id)} className='order_taxi-phone-react' style={{
          marginTop: index === 0 && '0'
        }}>
                            <span style={{
            fontSize: '1.2em'
          }}>Принять</span>
                            <span style={{
            fontSize: '.9em',
            float: 'right',
            marginTop: '2%',
            marginRight: '2%'
          }}>до клиента {order.distance} км</span>
                        </div>)}
                </div>
            </Fragment>;
  })();
}

export default OrderList;
