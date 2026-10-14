import React, { Fragment, useState, useRef } from "react";
import '../players.css';
import PlayerRow from './PlayerRow';
import { usePlayersStore } from '../store';

function PlayersList(ownProps) {
  const players = usePlayersStore(state => state.items);
  const props = { ...ownProps,
    players
  };
  const [state, setReactState] = useState(() => ({
    type: 'name',
    sortedBy: 'id',
    search: ''
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

  self.getLoader = () => {
    return <div className='block_loader-house-react'>
                <div className='loader-house'></div>
            </div>;
  };

  self.handleChangeInput = e => {
    setState({
      search: e.target.value.toString().toLowerCase()
    });
  };

  self.handleChangeSelect = e => {
    setState({
      type: e.target.value
    });
  };

  self.getPlayers = players => {
    const {
      search,
      type,
      sortedBy
    } = self.state;
    return players.sort((a, b) => {
      if (sortedBy == 'id') {
        return a[sortedBy] - b[sortedBy];
      } else {
        if (a[sortedBy].toLowerCase() < b[sortedBy].toLowerCase()) {
          return -1;
        } else {
          return 1;
        }
      }
    }).filter(player => player[type].toString().toLowerCase().split(' ').some(word => word.startsWith(search))) //.startsWith(search.toString().toLowerCase()))
    .map((player, index) => <PlayerRow player={player} />);
  };

  return (() => {
    const {
      players
    } = self.props;
    const {
      search,
      type,
      sortedBy
    } = self.state;
    return <Fragment>
                <div id="playersList">
                    <div className="players_list-head">
                        <table rules="all">
                            <colgroup>
                                <col style={{
                width: '10%'
              }} />
                                <col style={{
                width: '40%'
              }} />
                                <col style={{
                width: '40%'
              }} />
                                <col style={{
                width: '10%'
              }} />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th onClick={() => {
                  setState({
                    sortedBy: 'id'
                  });
                }}>id {sortedBy == 'id' && '▼'}</th>
                                    <th onClick={() => {
                  setState({
                    sortedBy: 'name'
                  });
                }}>Имя {sortedBy == 'name' && '▼'}</th>
                                    <th onClick={() => {
                  setState({
                    sortedBy: 'faction'
                  });
                }}>Организация {sortedBy == 'faction' && '▼'}</th>
                                    <th>ping</th>
                                </tr>
                            </thead>
                        </table>
                        <div className="players_list-navigate_panel">
                            <span>Поиск:</span>
                            <input onChange={self.handleChangeInput} value={search} maxLength={25} />
                            <div onClick={() => setState({
              type: 'id'
            })} style={{
              borderColor: type === 'id' && 'yellow',
              background: type === 'id' && 'black'
            }}>
                                id
                            </div>
                            <div onClick={() => setState({
              type: 'name'
            })} style={{
              borderColor: type === 'name' && 'yellow',
              background: type === 'name' && 'black'
            }}>
                                Имя
                            </div>
                            <div onClick={() => setState({
              type: 'faction'
            })} style={{
              borderColor: type === 'faction' && 'yellow',
              background: type === 'faction' && 'black'
            }}>
                                Организация
                            </div>
                        </div>
                    </div>
                    <div className="players_list-body">
                        <table rules="all">
                            <colgroup>
                                <col style={{
                width: '10%'
              }} />
                                <col style={{
                width: '40%'
              }} />
                                <col style={{
                width: '40%'
              }} />
                                <col style={{
                width: '10%'
              }} />
                            </colgroup>
                            <Fragment>
                                {players.length !== 0 ? self.getPlayers(players) : self.getLoader()}
                            </Fragment>
                        </table>
                    </div>
                </div>
            </Fragment>;
  })();
}

export default PlayersList;
