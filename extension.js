const St = imports.gi.St;
const Main = imports.ui.main;
const Soup = imports.gi.Soup;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Clutter = imports.gi.Clutter;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Shell = imports.gi.Shell;

const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();

const BTCE_URL = 'https://btc-e.nz/api/3/ticker/ppc_usd';

let _httpSession;
let _prev = 1.92;

// U+2B61 ^
// U+2B63

const _Symbols = {
  error: "\u26a0",
  refresh: "\u27f3",
  up: "\u2b61",
  down: "\u2b63",
  unchanged: " ",
};

const BTCeInfoIndicator = new Lang.Class({
  Name: 'BTCeInfoIndicator',
  Extends: PanelMenu.Button,

  _init: function () {
    this.parent(0.0, "BTCe Info Indicator", false);
    this.buttonText = new St.Label({
      text: _(_Symbols.refresh),
      y_align: Clutter.ActorAlign.CENTER,
      // style_class: "indicator"
    });
    this.actor.add_actor(this.buttonText);

    this._popupMenu = new PopupMenu.PopupMenuItem(_('Settings'));
    this.menu.addMenuItem(this._popupMenu);
    this._popupMenu.connect('activate', function() {
      let app_sys = Shell.AppSystem.get_default();
      let prefs = app_sys.lookup_app('gnome-shell-extension-prefs.desktop');
      if (prefs.get_state() == prefs.SHELL_APP_STATE_RUNNING)
        prefs.activate();
      else
        prefs.get_app_info().launch_uris(['extension:///' + Extension.metadata.uuid], null);
    });

    this._refresh();
  },

  _refresh: function () {
    this._loadData(this._refreshUI);
    this._removeTimeout();
    this._timeout = Mainloop.timeout_add_seconds(30, Lang.bind(this, this._refresh));
    return true;
  },

  _loadData: function () {
    _httpSession = new Soup.Session();
    let message = Soup.form_request_new_from_hash('GET', BTCE_URL, {});
    _httpSession.queue_message(message, Lang.bind(this, function (_httpSession, message) {
          if (message.status_code !== 200)
            return;
          // global.log(message.response_body.data)
          let json = JSON.parse(message.response_body.data);
          this._refreshUI(json);
        }
      )
    );
  },

  _refreshUI: function (data) {
    let change = 0.0;
    // if(_prev){
      change = ((parseFloat(data.ppc_usd.last)-_prev)/_prev)*100;
    // } else {
      // _prev = parseFloat(data.nmc_usd.last);
    // }
    // global.log(change);
    let txt = data.ppc_usd.last.toString();
    txt = '$' + txt.substring(0,4) + ' ' + change.toString().substring(0,4)+'%';
    // global.log(txt);
    this.buttonText.set_text(txt);
  },

  _removeTimeout: function () {
    if (this._timeout) {
      Mainloop.source_remove(this._timeout);
      this._timeout = null;
    }
  },

  stop: function () {
    if (_httpSession !== undefined)
      _httpSession.abort();
    _httpSession = undefined;

    if (this._timeout)
      Mainloop.source_remove(this._timeout);
    this._timeout = undefined;

    this.menu.removeAll();
  }
});

let biMenu;

function init() {
}

function enable() {
  biMenu = new BTCeInfoIndicator;
  Main.panel.addToStatusArea('bi-indicator', biMenu);
}

function disable() {
  biMenu.stop();
  biMenu.destroy();
}