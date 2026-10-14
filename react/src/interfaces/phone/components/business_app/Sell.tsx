import React, { Fragment, useState, useRef } from "react";
import ConfirmSell from "./ConfirmSell";
import HeaderBusinessApp from "./Header";
import { usePhoneStore, disableHomePhone, setSellStatusBusiness, setSellInfoBusiness } from '../../store';
import { closeAppDisplay, addAppDisplay, setAppDisplay } from '../../navigation';

function Sell(ownProps) {
  const phone = usePhoneStore();
  const props = { ...ownProps,
    info: phone,
    business: phone.biz && phone.biz[0],
    closeApp: closeAppDisplay,
    addApp: addAppDisplay,
    setApp: setAppDisplay,
    disableHome: disableHomePhone,
    setSellStatus: setSellStatusBusiness,
    setSellInfo: setSellInfoBusiness
  };
  const [state, setReactState] = useState(() => ({
    userId: '',
    sellPrice: '',
    errorUser: '',
    errorPrice: ''
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

  self.getLoader = () => {
    return <div className="loader01" style={{
      margin: '10% 5%'
    }}></div>;
  };

  self.sellBusiness = () => {
    const {
      disableHome,
      setSellStatus,
      setSellInfo,
      addApp,
      business
    } = self.props;
    const {
      userId,
      sellPrice
    } = self.state;

    if (self.validateForm()) {
      disableHome(true);
      addApp({
        name: 'ConfirmSell',
        form: <ConfirmSell />
      });
      mp.trigger('biz.sell.check', business.id, userId, parseInt(sellPrice));
      /*setTimeout(() => {
          setSellInfo({nick: 'Dun', price: this.state.sellPrice})
      }, 1000)*/
    }
  };

  self.validateUser = user => {
    if (user) {
      setState({
        errorUser: ''
      });
      return true;
    } else {
      setState({
        errorUser: 'Поле не заполнено'
      });
      return false;
    }
  };

  self.validatePrice = price => {
    const {
      business
    } = self.props;

    if (price) {
      if (!isNaN(price)) {
        if (business.price <= price) {
          setState({
            errorPrice: ''
          });
          return true;
        } else {
          setState({
            errorPrice: `Цена должна быть не ниже государственной ($${business.price})`
          });
          return false;
        }
      } else {
        setState({
          errorPrice: 'Неверный формат цены'
        });
        return false;
      }
    } else {
      setState({
        errorPrice: 'Поле не заполнено'
      });
      return false;
    }
  };

  self.validateForm = () => {
    const {
      userId,
      sellPrice
    } = self.state;
    let h = true;

    if (!self.validateUser(userId)) {
      h = false;
    }

    if (!self.validatePrice(sellPrice)) {
      h = false;
    }

    return h;
  };

  self.getContent = (_data?: any) => {
    const {
      business,
      closeApp,
      addApp
    } = self.props;
    const {
      errorUser,
      errorPrice
    } = self.state;
    return <Fragment>
                <div style={{
        textAlign: 'center',
        marginTop: '26%'
      }}>Продажа на руки</div>
                <div className='block_sell_inputs-phone-react'>
                    <div className='block_sell-phone-react'>
                        <label>ID покупателя</label>
                        <input id='userId' className='input_sell-phone-react' onChange={self.handleChangeInput} value={self.state.userId} style={{
            borderColor: errorUser && '#f44343'
          }} />
                        <span>{errorUser}</span>
                    </div>
                    <div className='block_sell-phone-react'>
                        <label>Сумма сделки</label>
                        <input id='sellPrice' className='input_sell-phone-react' onChange={self.handleChangeInput} value={self.state.sellPrice} style={{
            borderColor: errorPrice && '#f44343'
          }} />
                        <span>{errorPrice}</span>
                    </div>
                </div>

                <div className='house_buttons-phone-react' style={{
        bottom: '6%',
        position: 'absolute'
      }}>
                    <div className='house_button-phone-react' onClick={() => self.sellBusiness()}>
                        <span className='ico_button_house-phone-react'>
                            <svg xmlns="http://www.w3.org/2000/svg" width="80%" height="80%" viewBox="0 0 16.729 12.286" style={{
              marginLeft: '5px'
            }}>
                                <path id="Path_176" data-name="Path 176" d="M16.484,68.243a.836.836,0,0,0-1.183,0L5.28,78.264,1.427,74.412A.836.836,0,0,0,.245,75.595l4.444,4.444a.837.837,0,0,0,1.183,0L16.484,69.425A.836.836,0,0,0,16.484,68.243Z" transform="translate(0 -67.997)" fill="#74a607" />
                            </svg>
                        </span>
                        <div className='text_button_house-phone-react'>Подтвердить</div>
                    </div>
                    <div className='house_button-phone-react' onClick={() => closeApp()}>
                        <span className='ico_button_house-phone-react'>
                            <svg xmlns="http://www.w3.org/2000/svg" width="80%" height="80%" viewBox="0 0 16.37 16.369" style={{
              marginTop: '5%'
            }}>
                                <path id="Path_172" data-name="Path 172" d="M9.632,8.186,16.07,1.748A1.024,1.024,0,1,0,14.622.3L8.185,6.738,1.747.3A1.024,1.024,0,1,0,.3,1.748L6.737,8.186.3,14.623A1.023,1.023,0,1,0,1.747,16.07L8.185,9.633l6.437,6.437a1.024,1.024,0,0,0,1.448-1.448Z" transform="translate(0 -0.001)" fill="#f90040" />
                            </svg>
                        </span>
                        <div className='text_button_house-phone-react'>Отменить</div>
                    </div>
                </div>
            </Fragment>;
  };

  return (() => {
    const {
      business
    } = self.props;
    return <Fragment>
                <div className='back_page-phone-react'>
                    <HeaderBusinessApp business={business} />

                    {self.getContent(business)}
                </div>
            </Fragment>;
  })();
}

export default Sell;
