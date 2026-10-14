import React, { Fragment, useState, useRef } from "react";
import BankError from "./BankError";
import BankSuccess from "./BankSuccess";
import { useBankStore } from '../store';
import { closeBankPage, addBankPage } from '../navigation';

function AnsOperationBank(ownProps) {
  const bank = useBankStore();
  const props = { ...ownProps,
    bank,
    closePage: closeBankPage,
    addPage: addBankPage
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

  self.getTextAnswer = answer => {
    if (answer == 0) {
      return 'Ошибка';
    } else if (answer == 2) {
      return 'Недостаточно денег на счете';
    } else if (answer == 3) {
      return 'Вам требуется отыграть 30 часов';
    }
  };

  self.getAnswer = () => {
    const {
      bank
    } = self.props;

    if (bank.answer == 1) {
      return <BankSuccess args={bank.args} />;
    } else {
      let text = self.getTextAnswer(bank.answer);
      return <BankError text={text} />;
    }
  };

  return (() => {
    const {
      bank
    } = self.props;
    return <Fragment>
                {self.getAnswer()}
            </Fragment>;
  })();
}

export default AnsOperationBank;
