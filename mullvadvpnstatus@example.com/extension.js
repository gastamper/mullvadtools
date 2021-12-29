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

const _httpSession = new Soup.SessionSync();
// const _httpSession = new Soup.SessionAsync();
Soup.Session.prototype.add_feature.call(
	_httpSession,
	new Soup.ProxyResolverDefault()
);
_httpSession.timeout = 2;

var menu;
var septxt = "";
var match = "";
var thisObj;

const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {
	_init () {
		super._init(0);
		let gicon = Gio.icon_new_for_string(`${Me.path}/mullvad.svg`)
		let icon = new St.Icon({ gicon, icon_size: 16 });
		this.add_child(icon);

		// Perform initial query so that menu can be populated on init, then build menu
		thisObj = this;
		this.getCurrentRelay(this);
		this._addentries();
		this._updateRelay();
		this.getRelayList();
	}

	_updateRelay () {
		this.subsep.set_text(septxt);
	}

	_addentries () {
		let txt;
		if ( ! septxt || septxt == "") { 
			txt = "Waiting on update";
		}
		else { txt = `Current relay: ${septxt}`}
		log(`Changing VPN relay text to ${septxt}`);
		this.sep = new PopupMenu.PopupSeparatorMenuItem("Current relay: ");
		this.subsep = new St.Label({ text : 'Waiting on update'});
		this.sep.add_child(this.subsep);
		this.menuItem = new PopupMenu.PopupMenuItem('Get new relay');
		this.menuItem.actor.connect('button_press_event', this.connectNewRelay);
    	this.menu.addMenuItem(this.menuItem);
    	this.menu.addMenuItem(this.sep);
	}

	updateUI () {
		this.getCurrentRelay();
	}

	getCurrentRelay (thisObj) {
		let request = new Soup.Message({
			method: "GET",
			uri: Soup.URI.new('https://am.i.mullvad.net/json'),
		});
		request.request_headers.append('User-Agent', 'curl/1.0');
		request.request_headers.append('Accept', '*/*');
		_httpSession.queue_message(request, this._parseit);
	}

	getRandomRelay () {
		if ( match.length != 0 ) { 
			return match[Math.floor(Math.random() * match.length)];
		} else {
			Main.notify("Error: Mullvad relay list was empty.");
			septxt = "Error";
			return "Empty";
		}
	}

	getRelayList () {
		let loop = GLib.MainLoop.new(null, false);
		try {
			let proc = Gio.Subprocess.new(['mullvad','relay','list'], Gio.SubprocessFlags.STDOUT_PIPE);

			proc.communicate_utf8_async(null, null, (proc, res) => {
				try {
					let [, stdout] = proc.communicate_utf8_finish(res);

					if (proc.get_successful()) {
						match = stdout.match(/\w{2}\d{2,3}-wireguard/g);
					} else {
						match = "Error";
						throw new Error("Failed to get relay list");
					}
				} catch (e) {
					logError(e)
				} finally {
					loop.quit();
				}

			});
		} catch (e) {
			logError(e);
		}
	}

	connectNewRelay () {
		if ( match == "" || match == "Empty") {
			return;
		}
		thisObj._updateRelay();
		let loop = GLib.MainLoop.new(null, false);
		try {
			let proc = Gio.Subprocess.new(['mullvad','relay','set', 'hostname', thisObj.getRandomRelay()], 
				Gio.SubprocessFlags.STDOUT_PIPE);

			proc.communicate_utf8_async(null, null, (proc, res) => {
				try {
					let [, stdout] = proc.communicate_utf8_finish(res);

					if (proc.get_successful()) {
						Main.notify(`Switched from ${septxt} to ${stdout.match(/\w{2}\d{2,3}-wireguard/g)}`);
						thisObj.updateUI();
					} else {
						throw new Error("Failed to set new relay");
					}
				} catch (e) {
					logError(e)
				} finally {
					loop.quit();
				}

			});
		} catch (e) {
			logError(e);
		}
	}

	_parseit (session, message) {
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
				log(`Response: ${response.mullvad_exit_ip_hostname}`);
			}
			thisObj._updateRelay();
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