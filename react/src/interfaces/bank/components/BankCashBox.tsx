import React, { Fragment, useState, useRef } from "react";
import { useBankStore, setArgsBank, setLoadingBank } from '../store';
import { closeBankPage } from '../navigation';

function BankCashBox(ownProps) {
  const bank = useBankStore();
  const props = { ...ownProps,
    bank,
    closePage: closeBankPage,
    setArgs: setArgsBank,
    setLoading: setLoadingBank
  };
  const [state, setReactState] = useState(() => ({
    popMoney: '',
    pushMoney: '',
    errorPop: '',
    errorPush: ''
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

  self.validPop = money => {
    const {
      bank
    } = self.props;

    if (money) {
      if (!isNaN(money) && parseInt(money) > 0) {
        if (parseInt(money) <= bank.biz[0].cashBox) {
          setState({
            errorPop: '',
            popMoney: ''
          });
          return true;
        } else {
          setState({
            errorPop: 'Недостаточно денег в кассе'
          });
          return false;
        }
      } else {
        setState({
          errorPop: 'Некорректные данные'
        });
        return false;
      }
    } else {
      setState({
        errorPop: 'Поле не заполнено'
      });
      return false;
    }
  };

  self.validPush = money => {
    const {
      bank
    } = self.props;

    if (money) {
      if (!isNaN(money) && parseInt(money) > 0) {
        if (parseInt(money) <= bank.money) {
          setState({
            errorPush: '',
            pushMoney: ''
          });
          return true;
        } else {
          setState({
            errorPush: 'Недостаточно денег на счете'
          });
          return false;
        }
      } else {
        setState({
          errorPush: 'Некорректные данные'
        });
        return false;
      }
    } else {
      setState({
        errorPush: 'Поле не заполнено'
      });
      return false;
    }
  };

  self.pushMoney = () => {
    const {
      pushMoney
    } = self.state;
    const {
      setArgs,
      setLoading,
      bank
    } = self.props;
    setState({
      errorPop: ''
    });

    if (self.validPush(pushMoney)) {
      setArgs({
        money: parseInt(pushMoney),
        id: bank.biz[0].id
      });
      setLoading(true);
      mp.trigger('bank.biz.cashbox.push', bank.biz[0].id, parseInt(pushMoney));
    }
  };

  self.popMoney = () => {
    const {
      popMoney
    } = self.state;
    const {
      setArgs,
      setLoading,
      bank
    } = self.props;
    setState({
      errorPush: ''
    });

    if (self.validPop(popMoney)) {
      setArgs({
        money: parseInt(popMoney),
        id: bank.biz[0].id
      });
      setLoading(true);
      mp.trigger('bank.biz.cashbox.pop', bank.biz[0].id, parseInt(popMoney));
    }
  };

  self.getForm = () => {
    const {
      bank
    } = self.props;
    const {
      pushMoney,
      popMoney,
      errorPush,
      errorPop
    } = self.state;

    if (bank.biz.length > 0) {
      return <Fragment>
                    <div style={{
          fontSize: '140%'
        }}>
                        Состояние кассы:
                        <span style={{
            color: '#00932B'
          }}> ${bank.biz[0].cashBox}</span>
                    </div>
                    <div className='cashbox_back-bank-react'>
                        <div style={{
            display: 'inline-block',
            width: '35%',
            margin: '0 2% 0 2%'
          }}>
                            <div style={{
              textAlign: 'left',
              marginLeft: '5%',
              fontSize: '120%'
            }}>Пополнение кассы</div>
                            <div className='cashbox_block-bank-react'>
                                <div style={{
                textAlign: 'left',
                marginLeft: '5%'
              }}>Сумма пополнения</div>
                                <input className='input-bank-react' id='pushMoney' value={pushMoney} onChange={self.handleChangeInput} style={{
                borderColor: errorPush && 'red'
              }} />
                                <button className='button_input-bank-react' style={{
                width: '20%'
              }} onClick={self.pushMoney}>OK</button>
                            </div>
                        </div>

                        <div style={{
            display: 'inline-block',
            width: '35%',
            margin: '0 2% 0 2%'
          }}>
                            <div style={{
              textAlign: 'left',
              marginLeft: '5%',
              fontSize: '120%'
            }}>Снятие из кассы</div>
                            <div className='cashbox_block-bank-react'>
                                <div style={{
                textAlign: 'left',
                marginLeft: '5%'
              }}>Сумма снятия</div>
                                <input className='input-bank-react' id='popMoney' value={popMoney} onChange={self.handleChangeInput} style={{
                borderColor: errorPop && 'red'
              }} />
                                <button className='button_input-bank-react' style={{
                width: '20%'
              }} onClick={self.popMoney}>OK</button>
                            </div>
                        </div>
                    </div>
                </Fragment>;
    } else {
      return <Fragment>
                    <div style={{
          marginTop: '7%'
        }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="25%" height="25%" viewBox="0 0 127.688 111.486">
                            <g id="Group_54" data-name="Group 54" transform="translate(0 0)">
                                <path id="Path_101" data-name="Path 101" d="M274.16,263.75H256.81a8.618,8.618,0,0,0-8.61,8.61v13.306a8.618,8.618,0,0,0,8.61,8.61h17.35a8.618,8.618,0,0,0,8.61-8.61V272.36A8.618,8.618,0,0,0,274.16,263.75Zm2.348,21.916a2.355,2.355,0,0,1-2.348,2.348H256.81a2.355,2.355,0,0,1-2.348-2.348V272.36a2.355,2.355,0,0,1,2.348-2.348h17.35a2.355,2.355,0,0,1,2.348,2.348Z" transform="translate(-183.443 -203.037)" />
                                <path id="Path_102" data-name="Path 102" d="M127.688,67.577a2.906,2.906,0,0,0-.417-1.539l-18.994-33.4a3.148,3.148,0,0,0-2.713-1.592H22.1a3.094,3.094,0,0,0-2.713,1.592L.417,66.038A3.165,3.165,0,0,0,0,67.577a18.315,18.315,0,0,0,10.958,16.75V139.4a3.14,3.14,0,0,0,3.131,3.131h99.484A3.14,3.14,0,0,0,116.7,139.4V84.719a1.378,1.378,0,0,0-.026-.339A18.366,18.366,0,0,0,127.688,67.577ZM23.925,37.338h79.811l14.846,26.117H9.106ZM90.874,69.69a12.033,12.033,0,0,1-23.69,0Zm-30.343,0a12.049,12.049,0,0,1-23.716,0Zm-54.06,0H30.187a12.049,12.049,0,0,1-23.716,0ZM52.6,136.274h-18V102.486a4.46,4.46,0,0,1,4.462-4.462h9.106a4.46,4.46,0,0,1,4.462,4.462v33.787Zm57.843,0H58.861V102.486A10.74,10.74,0,0,0,48.137,91.763H39.032a10.74,10.74,0,0,0-10.723,10.723V136.3H17.22V85.867c.365.026.731.026,1.1.026A18.292,18.292,0,0,0,33.5,77.8a18.3,18.3,0,0,0,30.37,0,18.249,18.249,0,0,0,30.317,0,18.292,18.292,0,0,0,15.185,8.088c.365,0,.7-.026,1.07-.026v50.407Zm-1.07-56.643a12.027,12.027,0,0,1-11.845-9.914h23.716A12.1,12.1,0,0,1,109.372,79.631Z" transform="translate(0 -31.05)" />
                            </g>
                        </svg>
                    </div>
                    <div style={{
          fontSize: '150%',
          marginTop: '3%'
        }}>У Вас нет бизнеса</div>
                </Fragment>;
    }
  };

  return (() => {
    const {
      closePage
    } = self.props;
    const {
      errorPush,
      errorPop
    } = self.state;
    return <Fragment>
                <div className='page_title-bank-react'>
                    Касса бизнеса
                </div>

                {self.getForm()}

                <div style={{
        color: 'red',
        bottom: '20%',
        position: 'absolute',
        textAlign: 'center',
        width: '100%'
      }}>
                    {errorPush || errorPop}
                </div>

                <div className='buttons_panel-bank-react' style={{
        marginTop: '9%'
      }}>
                    <button className='button_panel-bank-react' onClick={closePage} style={{
          padding: '2% 5%',
          fontSize: '110%'
        }}>
                        Назад
                    </button>
                </div>
            </Fragment>;
  })();
}

export default BankCashBox;
