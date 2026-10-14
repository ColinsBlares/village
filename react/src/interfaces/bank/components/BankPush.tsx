import React, { Fragment, useState, useRef } from "react";
import { useBankStore, pushBank, setLoadingBank, setAnswerBank, setArgsBank } from '../store';
import { closeBankPage } from '../navigation';

function BankPush(ownProps) {
  const bank = useBankStore();
  const props = { ...ownProps,
    bank,
    closePage: closeBankPage,
    pushBank,
    setLoading: setLoadingBank,
    setAnswer: setAnswerBank,
    setArgs: setArgsBank
  };
  const [state, setReactState] = useState(() => ({
    pushMoney: '',
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
      pushMoney: e.target.value
    });
  };

  self.validateForm = () => {
    const {
      pushMoney
    } = self.state;
    const {
      bank
    } = self.props;

    if (pushMoney) {
      if (!isNaN(pushMoney) && parseInt(pushMoney) > 0) {
        if (bank.cash >= parseInt(pushMoney)) {
          setState({
            error: ''
          });
          return true;
        } else {
          setState({
            error: 'Недостаточно наличных'
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

  self.pushMoney = () => {
    const {
      pushMoney
    } = self.state;
    const {
      setArgs,
      setAnswer,
      setLoading
    } = self.props;

    if (self.validateForm()) {
      setLoading(true);
      setArgs({
        money: parseInt(pushMoney)
      });
      mp.trigger('bank.push', parseInt(pushMoney));
    }
  };

  return (() => {
    const {
      closePage
    } = self.props;
    const {
      pushMoney,
      error
    } = self.state;
    return <Fragment>
                <div className='page_title-bank-react'>
                    Пополнение банковского счета
                </div>

                <div className='push_block-bank-react' style={{
        marginTop: '10%'
      }}>
                    <div>Введите сумму пополнения</div>
                    <div>
                        <input className='input-bank-react' value={pushMoney} style={{
            borderColor: error && 'red'
          }} onChange={self.handleChange} />
                        <input className='button_input-bank-react' value='ОК' onClick={self.pushMoney} type='submit' />
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

export default BankPush;
