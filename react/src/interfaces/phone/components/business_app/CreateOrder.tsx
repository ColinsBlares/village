import React, { Fragment, useState, useRef } from "react";
import Header from "./Header";
import AnsOrder from "./AnsOrder";
import Success from "./Success";
import { usePhoneStore, setOrderStatusBusiness } from '../../store';
import { usePhoneScreens, closeAppDisplay, addAppDisplay } from '../../navigation';

function CreateOrder(ownProps) {
  const phone = usePhoneStore();
  const screens = usePhoneScreens(state => state.items);
  const props = { ...ownProps,
    info: phone,
    business: phone.biz && phone.biz[0],
    apps: screens,
    closeApp: closeAppDisplay,
    addApp: addAppDisplay,
    setOrderStatus: setOrderStatusBusiness
  };
  const [state, setReactState] = useState(() => ({
    productCount: '',
    productPrice: '',
    errorCount: '',
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

  self.validateCount = count => {
    if (count) {
      if (!isNaN(count) && parseInt(count) > 0) {
        setState({
          errorCount: ''
        });
        return true;
      } else {
        setState({
          errorCount: 'Некорректное значение',
          productCount: ''
        });
        return false;
      }
    } else {
      setState({
        errorCount: 'Поле не заполнено',
        productCount: ''
      });
      return false;
    }
  };

  self.validatePrice = price => {
    const {
      business
    } = self.props;

    if (price) {
      if (!isNaN(price) && parseFloat(price) <= business.resourcePriceMax && parseFloat(price) >= business.resourcePriceMin) {
        setState({
          errorPrice: ''
        });
        return true;
      } else {
        setState({
          errorPrice: 'Некорректное значение',
          productPrice: ''
        });
        return false;
      }
    } else {
      setState({
        errorPrice: 'Поле не заполнено',
        productPrice: ''
      });
      return false;
    }
  };

  self.validateForm = () => {
    const {
      productCount,
      productPrice
    } = self.state;
    let h = true;

    if (!self.validateCount(productCount)) {
      h = false;
    }

    if (!self.validatePrice(productPrice)) {
      h = false;
    }

    return h;
  };

  self.handleChangeInput = e => {
    setState({
      [e.target.id]: e.target.value
    });
  };

  self.createOrder = () => {
    const {
      addApp,
      setOrderStatus,
      apps,
      business
    } = self.props;
    const {
      productCount,
      productPrice
    } = self.state;

    if (self.validateForm() && !apps.some(app => app.name === 'AnsOrder')) {
      addApp({
        name: 'AnsOrder',
        form: <AnsOrder productsCount={parseInt(productCount)} productsPrice={productPrice} />
      });
      mp.trigger('biz.order.add', business.id, productCount, productPrice); // setTimeout(() => {
      //     setOrderStatus(1);
      // }, 1000)
    }
  };

  self.getContent = business => {
    const {
      closeApp
    } = self.props;
    const {
      productCount,
      productPrice,
      errorCount,
      errorPrice
    } = self.state;
    return <Fragment>
                <div style={{
        textAlign: 'center',
        marginTop: '26%'
      }}>Заказ товаров</div>
                <div className='block_sell_inputs-phone-react' style={{
        marginBottom: '0'
      }}>
                    <div className='block_sell-phone-react'>
                        <label>Количество товаров</label>
                        <input id='productCount' className='input_sell-phone-react' onChange={self.handleChangeInput} value={productCount} placeholder={errorCount} style={{
            borderColor: errorCount && '#f44343'
          }} />
                        {
            /*<span>{ errorCount }</span>*/
          }
                    </div>
                    <div className='block_sell-phone-react'>
                        <label>Цена за товар</label>
                        <input id='productPrice' className='input_sell-phone-react' onChange={self.handleChangeInput} placeholder={errorPrice} value={productPrice} style={{
            borderColor: errorPrice && '#f44343'
          }} />
                        {
            /*<span>{ errorPrice }</span>*/
          }
                    </div>
                </div>

                <div style={{
        textAlign: 'center'
      }}>
                    <div>Минимальная цена - <span style={{
            color: '#47a80f'
          }}>${business.resourcePriceMin}</span></div>
                    <div>Максимальная цена - <span style={{
            color: '#47a80f'
          }}>${business.resourcePriceMax}</span></div>
                </div>

                <div className='house_buttons-phone-react' style={{
        bottom: '6%',
        position: 'absolute'
      }}>
                    <div className='house_button-phone-react' onClick={self.createOrder}>
                        <span className='ico_button_house-phone-react'>
                            <svg xmlns="http://www.w3.org/2000/svg" width="80%" height="80%" viewBox="0 0 16.729 12.286" style={{
              marginLeft: '5px'
            }}>
                                <path id="Path_176" data-name="Path 176" d="M16.484,68.243a.836.836,0,0,0-1.183,0L5.28,78.264,1.427,74.412A.836.836,0,0,0,.245,75.595l4.444,4.444a.837.837,0,0,0,1.183,0L16.484,69.425A.836.836,0,0,0,16.484,68.243Z" transform="translate(0 -67.997)" fill="#74a607" />
                            </svg>
                        </span>
                        <div className='text_button_house-phone-react'>Заказать</div>
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
                    <Header business={business} />

                    {self.getContent(business)}
                </div>
            </Fragment>;
  })();
}

export default CreateOrder;
