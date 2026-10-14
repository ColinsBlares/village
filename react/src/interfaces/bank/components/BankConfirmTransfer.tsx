import React, { Fragment, useState, useRef } from "react";
import { useBankStore, setAskAnswerBank, setLoadingBank, setArgsBank, setAnswerBank } from '../store';
import { closeBankPage } from '../navigation';

function BankConfirmTransfer(ownProps) {
  const bank = useBankStore();
  const props = { ...ownProps,
    bank,
    setAskAnswer: setAskAnswerBank,
    closePage: closeBankPage,
    setLoading: setLoadingBank,
    setArgs: setArgsBank,
    setAnswer: setAnswerBank
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

  self.back = () => {
    const {
      closePage,
      setAskAnswer
    } = self.props;
    setAskAnswer(null);
    closePage();
  };

  self.transfer = () => {
    const {
      setAnswer,
      setArgs,
      setLoading,
      bank
    } = self.props;
    setArgs({
      money: self.props.money
    });
    setLoading(true); // setTimeout(() => {
    //     setAnswer({ answer: 1, type: 'transfer' })
    // }, 1000)
    // setTimeout(() => {
    //     setAnswer({ answer: 1, type: 'transfer' })
    // }, 1000)

    mp.trigger('bank.transfer');
  };

  return (() => {
    const {
      bank
    } = self.props;
    return bank.askAnswer ? <Fragment>
                <div className='page_title-bank-react'>
                    Подтверждение перевода
                </div>

                <div className='push_block-bank-react'>
                    <div style={{
          textAlign: 'left',
          fontSize: '80%',
          marginLeft: '-8%'
        }}>Информация</div>
                    <div className='info_block_confirm-bank-react'>
                        <div>Получатель: {bank.askAnswer}</div>
                        <div>Номер счета: {self.props.number}</div>
                        <div>Сумма перевода: ${self.props.money}</div>
                    </div>
                    <div className='buttons_panel-bank-react'>
                        <button className='button_panel-bank-react' onClick={self.back.bind(this)}>
                            Назад
                        </button>
                        <button className='button_panel-bank-react' onClick={self.transfer}>
                            Подтвердить
                        </button>
                    </div>
                </div>
            </Fragment> : <Fragment>
                <div className='page_title-bank-react'>
                    Подтверждение перевода
                </div>

                <div className='push_block-bank-react'>
                    <div style={{
          textAlign: 'left',
          fontSize: '80%',
          marginLeft: '-8%'
        }}>Информация</div>
                    <div className='info_block_confirm-bank-react'>
                        <div>Получатель с таким номером счета не найден</div>
                    </div>
                    <div className='buttons_panel-bank-react'>
                        <button className='button_panel-bank-react' onClick={self.back.bind(this)}>
                            Назад
                        </button>
                    </div>
                </div>
            </Fragment>;
  })();
}

export default BankConfirmTransfer;
