import React, { Fragment, useState, useEffect, useRef } from "react";
import SearchPage from "./SearchPage";
import TaxiReadyPage from "./TaxiReadyPage";
import WayPage from "./WayPage";
import OrderPage from "./OrderPage";
import InTaxiPage from "./InTaxiPage";
import StartPage from "./StartPage";
import SelectPage from "./SelectPage";
import { useTaxiClientStore, loadLocationTaxiClient, createOrderTaxiClient, cancelOrderTaxiClient, ansOrderTaxiClient, clearLocationTaxiClient } from '../../../taxiClient';
import { closeAppDisplay } from '../../../navigation';

function TaxiClient(ownProps) {
  const taxiClient = useTaxiClientStore();
  const props = { ...ownProps,
    taxi: taxiClient,
    loadLocation: loadLocationTaxiClient,
    createOrderTaxi: createOrderTaxiClient,
    cancelOrderTaxi: cancelOrderTaxiClient,
    ansTaxi: ansOrderTaxiClient,
    closeApp: closeAppDisplay,
    clearLocation: clearLocationTaxiClient
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

  self.cancelOrder = () => {
    self.props.cancelOrderTaxi();
    mp.trigger('taxi.client.app.cancel');
  };

  self.getPage = () => {
    const {
      taxi
    } = self.props;

    if (!taxi.isSearch) {
      if (taxi.order) {
        if (taxi.order.isReady) {
          if (taxi.order.isInTaxi) {
            if (taxi.order.isSelect) {
              if (taxi.order.isWay) {
                return <WayPage />;
              } else {
                return <SelectPage />;
              }
            } else {
              return <InTaxiPage />;
            }
          } else {
            return <TaxiReadyPage />;
          }
        } else {
          return <OrderPage />;
        }
      } else {
        return <StartPage />;
      }
    } else {
      return <SearchPage />;
    }
  };

  useEffect(() => {
    return () => {
      self.props.clearLocation();
    };
  }, []);
  return (() => {
    const {
      taxi,
      closeApp
    } = self.props;
    return <Fragment>
                <div className='back_page-phone-react'>
                    {self.getPage()}
                    <div className='button_close_taxi-phone-react' onClick={() => closeApp()}>
                        Закрыть приложение
                    </div>
                </div>
            </Fragment>;
  })();
}

export default TaxiClient;
