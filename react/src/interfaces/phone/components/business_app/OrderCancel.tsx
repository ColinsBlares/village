import React, { Fragment, useState, useRef } from "react";
import Header from "./Header";
import { usePhoneStore, cancelOrderBusiness } from '../../store';
import { closeAppDisplay } from '../../navigation';

function OrderCancel(ownProps) {
  const phone = usePhoneStore();
  const props = { ...ownProps,
    business: phone.biz && phone.biz[0],
    info: phone,
    closeApp: closeAppDisplay,
    cancelOrder: cancelOrderBusiness
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
    const {
      business,
      cancelOrder
    } = self.props;
    mp.trigger('biz.order.cancel', business.id);
    cancelOrder();
  };

  return (() => {
    const {
      business,
      closeApp
    } = self.props;

    try {
      return <Fragment>
                    <div className='back_page-phone-react' style={{
          textAlign: 'center'
        }}>
                        <Header business={business} />
    
                        <div style={{
            textAlign: 'center',
            marginTop: '26%'
          }}>Отмена заказа</div>
                        <div style={{
            marginTop: '10%'
          }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="40%" height="100%" viewBox="0 0 51.324 33.13" fill='#343c47'>
                                <g id="backspace" transform="translate(0 -5.09)">
                                    <path id="Path_23" data-name="Path 23" d="M12.343,5.09,0,21.655,12.343,38.22H51.324V5.09ZM49,36.271H13.632L2.74,21.655,13.632,7.039H49Z" transform="translate(0 0)" />
                                    <path id="Path_24" data-name="Path 24" d="M18.887,29.927,26.18,23l7.293,6.929,1.414-1.343-7.293-6.929,7.293-6.929-1.414-1.343L26.18,20.312l-7.293-6.929-1.414,1.343,7.293,6.929-7.293,6.929Z" transform="translate(4.664)" />
                                </g>
                            </svg>
                            <div style={{
              fontSize: '1.1em',
              fontWeight: 'bold',
              marginTop: '10%'
            }}>
                                Активный заказ:
                                {business.order ? <span style={{
                color: '#30af25'
              }}> {business.order.productsCount} на ${business.order.productsPrice}</span> : <span> нет</span>}
                            </div>
                            <div style={{
              marginTop: '5%'
            }}>При отмене заказа Вам будет возвращено 80% от суммы заказа</div>
                        </div>
    
                        <div className='house_buttons-phone-react' style={{
            bottom: '6%',
            position: 'absolute'
          }}>
                            {business.order && <div className='house_button-phone-react' onClick={self.cancelOrder}>
                                    <span className='ico_button_house-phone-react'>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="80%" height="80%" viewBox="0 0 16.729 12.286" style={{
                  marginLeft: '5px'
                }}>
                                            <path id="Path_176" data-name="Path 176" d="M16.484,68.243a.836.836,0,0,0-1.183,0L5.28,78.264,1.427,74.412A.836.836,0,0,0,.245,75.595l4.444,4.444a.837.837,0,0,0,1.183,0L16.484,69.425A.836.836,0,0,0,16.484,68.243Z" transform="translate(0 -67.997)" fill="#74a607" />
                                        </svg>
                                    </span>
                                    <div className='text_button_house-phone-react'>Отменить заказ</div>
                                </div>}
                            <div className='house_button-phone-react' onClick={() => closeApp()}>
                                    <span className='ico_button_house-phone-react'>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="80%" height="80%" viewBox="0 0 16.37 16.369" style={{
                  marginTop: '5%'
                }}>
                                            <path id="Path_172" data-name="Path 172" d="M9.632,8.186,16.07,1.748A1.024,1.024,0,1,0,14.622.3L8.185,6.738,1.747.3A1.024,1.024,0,1,0,.3,1.748L6.737,8.186.3,14.623A1.023,1.023,0,1,0,1.747,16.07L8.185,9.633l6.437,6.437a1.024,1.024,0,0,0,1.448-1.448Z" transform="translate(0 -0.001)" fill="#f90040" />
                                        </svg>
                                    </span>
                                <div className='text_button_house-phone-react'>Вернуться</div>
                            </div>
                        </div>
                    </div>
                </Fragment>;
    } catch (e) {
      return <h1>Ошибка</h1>;
    }
  })();
}

export default OrderCancel;
