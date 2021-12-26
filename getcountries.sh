# Shows countries with relays
mullvad relay list | sed '/^\t/d' | sed '/^$/d'
