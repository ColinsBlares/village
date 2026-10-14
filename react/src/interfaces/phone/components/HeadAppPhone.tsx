import React, { Fragment, useState, useRef } from "react";
import { closeAppDisplay } from '../navigation';

function HeadAppPhone(ownProps) {
  const props = { ...ownProps,
    closeApp: closeAppDisplay
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
  return (() => {
    const {
      closeApp,
      appName
    } = self.props;
    return (() => {
      return <Fragment>
                <div className="head_app-phone-react">
                    <div style={{
            float: 'left',
            margin: '6% 0 0 10%',
            display: 'inline-block',
            width: '23%'
          }} onClick={() => closeApp()}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="11%" height="6%" viewBox="0 0 18.812 35.125">
                            <path id="_6A" data-name="6A" d="M17.311,35.125a1.5,1.5,0,0,0,1.069-2.553L3.6,17.562,18.38,2.552a1.5,1.5,0,1,0-2.137-2.1L.431,16.51a1.5,1.5,0,0,0,0,2.1L16.243,34.677a1.5,1.5,0,0,0,1.068.448" transform="translate(0 0)" fill="#fff" />
                        </svg>
                        Назад
                    </div>
                    <div style={{
            float: 'right',
            margin: '6% 10% 0 0'
          }}>{self.props.title}</div>
                </div>
            </Fragment>;
    })();
  })();
}

export default HeadAppPhone;
