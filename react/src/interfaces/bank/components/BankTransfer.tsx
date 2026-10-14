import React, { Fragment, useState, useRef } from "react";
import BankConfirmTransfer from "./BankConfirmTransfer";
import { useBankStore, transferBank, setLoadingBank, setAskAnswerBank } from '../store';
import { closeBankPage, addBankPage } from '../navigation';
const inputStyle = {
  border: '1px solid #838383',
  borderRadius: '5px'
};

function BankTransfer(ownProps) {
  const bank = useBankStore();
  const props = { ...ownProps,
    bank,
    transferBank,
    closePage: closeBankPage,
    addPage: addBankPage,
    setLoading: setLoadingBank,
    setAskAnswer: setAskAnswerBank
  };
  const [state, setReactState] = useState(() => ({
    transferMoney: '',
    user: '',
    errorMoney: '',
    errorUser: ''
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

  self.validateUser = () => {
    const {
      user
    } = self.state;
    if (!user) return setState({
      errorUser: 'Номер счета не заполнен'
    });
    if (isNaN(user) || parseInt(user) < 0) return setState({
      errorUser: 'Некорректный номер счета'
    });
    setState({
      errorUser: ''
    });
    return true;
  };

  self.validateMoney = () => {
    const {
      transferMoney
    } = self.state;
    const {
      bank
    } = self.props;
    if (!transferMoney) return setState({
      errorMoney: 'Сумма перевода не заполнена'
    });
    if (isNaN(transferMoney) || parseInt(transferMoney) < 0) return setState({
      errorMoney: 'Некорректная сумма перевода'
    });
    if (parseInt(transferMoney) > bank.money) return setState({
      errorMoney: 'Недостаточно средств на счете'
    });
    if (parseInt(transferMoney) >= 200000) return setState({
      errorMoney: 'Сумма перевода не должна превышать $200 000'
    });
    setState({
      errorMoney: ''
    });
    return true;
  };

  self.transferMoney = () => {
    const {
      transferMoney,
      user
    } = self.state;
    const {
      setLoading,
      addPage
    } = self.props;

    if (self.validateUser() && self.validateMoney()) {
      addPage(<BankConfirmTransfer money={transferMoney} number={user} />);
      setLoading(true);
      mp.trigger('bank.transfer.ask', parseInt(user), parseInt(transferMoney)); // setTimeout(() => {
      //     this.props.setAskAnswer('Dun Hill');
      // }, 2000)
    }
  };

  return (() => {
    const {
      closePage,
      bank
    } = self.props;
    const {
      errorMoney,
      errorUser,
      transferMoney,
      user
    } = self.state;
    return <Fragment>
                <div className='page_title-bank-react'>
                    Переводы на другие счета
                </div>

                <div className='push_block-bank-react'>
                    <div className='input_label-bank-react'>Номер счета</div>
                    <input className='input-bank-react' style={Object.assign({}, inputStyle, {
          borderColor: errorUser ? 'red' : '#838383'
        })} id='user' onChange={self.handleChangeInput} value={user} />

                    <div className='input_label-bank-react'>Сумма перевода</div>
                    <input id='transferMoney' className='input-bank-react' style={Object.assign({}, inputStyle, {
          borderColor: errorMoney ? 'red' : '#838383'
        })} onChange={self.handleChangeInput} value={transferMoney} />

                    <div className='buttons_panel-bank-react'>
                        <button className='button_panel-bank-react' onClick={closePage}>
                            Отмена
                        </button>
                        <button className='button_panel-bank-react' onClick={self.transferMoney}>
                            Перевести
                        </button>
                    </div>

                    <div style={{
          color: 'red',
          fontSize: '90%',
          marginTop: '5%'
        }}>{errorMoney || errorUser}</div>
                </div>
            </Fragment>;
  })();
}

export default BankTransfer;
