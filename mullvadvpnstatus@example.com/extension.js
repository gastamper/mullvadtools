// Basic requirements
const {St, Clutter, Soup} = imports.gi;
const Main = imports.ui.main;
// Required to spawn a program to check relay status
const GLib = imports.gi.GLib;

// Required for UI elements
const Gio = imports.gi.Gio;
const GObject = imports.gi.GObject;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const Lang = imports.lang;

const _httpSession = new Soup.SessionSync();
// const _httpSession = new Soup.SessionAsync();
Soup.Session.prototype.add_feature.call(
	_httpSession,
	new Soup.ProxyResolverDefault()
);
_httpSession.timeout = 2;

var menu;
var septxt = "";

const Indicator = new Lang.Class({
	Name: "Indicator",
	Extends: PanelMenu.Button,

	_init: function() {
		this.parent(0.0);
		let gicon = Gio.icon_new_for_string(`${Me.path}/mullvad.svg`)
		let icon = new St.Icon({ gicon, icon_size: 16 });
		this.add_child(icon);

		// Perform initial query so that menu can be populated on init, then build menu
		this.getrelay();
		this._addentries();
		this._buildmenu();
	},

	_buildmenu: function() {
		this.sep.destroy();
		this.menuItem.destroy();
		this._addentries();
	},

	_addentries: function() {
		if ( ! septxt ) { septxt = "Waiting on update"}
		log("Changing VPN relay text to " + septxt);
		this.sep = new PopupMenu.PopupSeparatorMenuItem(septxt);
		this.menuItem = new PopupMenu.PopupMenuItem('Get new relay');
		this.menuItem.actor.connect('button_press_event', Lang.bind(this, this.updateUI));
    	this.menu.addMenuItem(this.menuItem);
    	this.menu.addMenuItem(this.sep);
	},

	updateUI: function() {
		Main.notify("Updating Mullvad VPN status");
		this.getrelay();
	},

	getrelay: function() {
		let request = new Soup.Message({
			method: "GET",
			uri: Soup.URI.new('https://am.i.mullvad.net/json'),
		});
		request.request_headers.append('User-Agent', 'curl/1.0');
		request.request_headers.append('Accept', '*/*');
		_httpSession.queue_message(request, this._parseit);
	},

	_parseit: function (session, message) {
			if (message.status_code !== 200) {
				log("Got error when querying Mullvad VPN relay");
				septxt = "Couldn't query Mullvad VPN relay";
				return "error";
			}
			const response = JSON.parse(JSON.parse(JSON.stringify(message.response_body.data)));
			if (response.mullvad_exit_ip == false) {
				log("Async call not responded yet");
				septxt = "Waiting for response";
				log(septxt);
			}
			else {
				septxt = response.mullvad_exit_ip_hostname;
				log("Response: " + response.mullvad_exit_ip_hostname);
			}
			menu._buildmenu();
			return response;
		}

});

function init() {
	log(`initializing ${Me.metadata.name} version $(Me.metadata.version}`);
}

function enable() {
	log(`enabling ${Me.metadata.name} version $(Me.metadata.version}`);
	menu = new Indicator();
	Main.panel._addToPanelBox('indicator', menu, 1, Main.panel._rightBox);
}

function disable() {
	log(`disabling ${Me.metadata.name} version $(Me.metadata.version}`);
	// It is required for extension to clean up after itself when disabled.
	if (menu != null) {
		menu.destroy();
		menu = null;
	}
}
