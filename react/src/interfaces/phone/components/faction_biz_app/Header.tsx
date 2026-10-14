import React, { useState, useRef } from "react";

function Header(ownProps) {
  const props = ownProps;
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
      business
    } = self.props;
    return (() => {
      return <div className='head_app-phone-react' style={{
        height: '15%',
        textAlign: 'center'
      }}>
                <div style={{
          marginTop: '5%',
          fontSize: '1.3em'
        }}>{business.name}</div>
                <div style={{
          color: '#e1c631',
          fontSize: '.9em',
          marginTop: '1%'
        }}>{business.area}</div>
            </div>;
    })();
  })();
}

export default Header;
