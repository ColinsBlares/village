import React, { Fragment, useState, useRef } from "react";
import { useBankStore, setArgsBank, setLoadingBank } from '../store';
import { closeBankPage } from '../navigation';

function BankPop(ownProps) {
  const bank = useBankStore();
  const props = { ...ownProps,
    bank,
    closePage: closeBankPage,
    setArgs: setArgsBank,
    setLoading: setLoadingBank
  };
  const [state, setReactState] = useState(() => ({
    popMoney: '',
    error: ''
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

  self.handleChange = e => {
    setState({
      popMoney: e.target.value
    });
  };

  self.validateForm = () => {
    const {
      popMoney
    } = self.state;
    const {
      bank
    } = self.props;

    if (popMoney) {
      if (!isNaN(popMoney) && parseInt(popMoney) > 0) {
        if (bank.money >= parseInt(popMoney)) {
          setState({
            error: ''
          });
          return true;
        } else {
          setState({
            error: 'Недостаточно средств на счете'
          });
          return false;
        }
      } else {
        setState({
          error: 'Некорректные данные'
        });
        return false;
      }
    } else {
      setState({
        error: 'Поле не заполнено'
      });
      return false;
    }
  };

  self.popMoney = () => {
    const {
      popMoney
    } = self.state;
    const {
      setArgs,
      setLoading
    } = self.props;

    if (self.validateForm()) {
      setArgs({
        money: parseInt(popMoney)
      });
      setLoading(true);
      mp.trigger('bank.pop', parseInt(popMoney));
    }
  };

  return (() => {
    const {
      closePage
    } = self.props;
    const {
      popMoney,
      error
    } = self.state;
    return <Fragment>
                <div className='page_title-bank-react'>
                    Снятие средств со счета
                </div>

                <div className='push_block-bank-react' style={{
        marginTop: '10%'
      }}>
                    <div>Введите сумму снятия</div>
                    <div>
                        <input className='input-bank-react' value={popMoney} style={{
            borderColor: error && 'red'
          }} onChange={self.handleChange} />
                        <input className='button_input-bank-react' value='ОК' onClick={self.popMoney} type='submit' />
                        
                    </div>

                    <div className='buttons_panel-bank-react'>
                        <button className='button_panel-bank-react' onClick={closePage}>
                            Назад
                        </button>
                    </div>

                    <div style={{
          color: 'red',
          marginTop: '5%'
        }}>{error}</div>
                </div>
            </Fragment>;
  })();
}

export default BankPop;
