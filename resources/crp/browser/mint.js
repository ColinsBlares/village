(function () {
  function install() {
    var bridge = window.mint || window.alt;
    if (!bridge) {
      setTimeout(install, 0);
      return;
    }
    var mp = window.mp || {};
    mp.trigger = function () {
      bridge.emit('mp', JSON.stringify(Array.prototype.slice.call(arguments)));
    };
    mp.invoke = function () {};
    if (!mp.event) {
      mp.event = { on: function () {}, call: function () {}, remove: function () {} };
    }
    window.mp = mp;
    window.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' && event.keyCode !== 27) return;
      event.preventDefault();
      mp.trigger('ui.escape');
    }, true);
    bridge.on('cef', function (code) {
      if (typeof code !== 'string') return;
      try {
        (0, eval)(code);
      } catch (err) {
        console.error(err);
      }
    });
    // auth.show читает changelist.list. Чанк списка ленивый, его надо поднять до экрана входа.
    var started = false;
    function waitList(tries) {
      var box = window.changelist;
      var list = box && box.list;
      if (list && typeof list.slice === 'function' && list.length) {
        bridge.emit('cef:ready');
        return;
      }
      if (!started && box && typeof box.initLikes === 'function') {
        started = true;
        try { box.initLikes(); } catch (err) {}
      }
      if (tries > 100) {
        bridge.emit('cef:ready');
        return;
      }
      setTimeout(function () { waitList(tries + 1); }, 50);
    }
    if (document.readyState === 'complete') waitList(0);
    else window.addEventListener('load', function () { waitList(0); });
  }
  install();
})();
