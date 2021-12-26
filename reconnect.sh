#!/usr/bin/env bash
# This script cycles through Mullvad VPN endpoints, keeping track of used
# endpoints in $HOME/mullvad.used.

usedlist=$HOME/mullvad.used
cmd='echo "$relays" | grep wireguard | cut -f1 -d " " | tr -d "\t"'
exclude="al|au|at|be|br|bg|cz|dk|ee|fi|fr|de|gr|hk|hu|ie|il|it|jp|lv|lu|md|nl|nz|mk|no|pl|pt|ro|rs|sg|es|se|ch|ae"

# Output usage info
usage() { 
	# Auto-generate documentation based on comments
	echo "$0 usage:" && { grep ".) \#" $0 | 
	tr -d "\t" | cut -f2 -d"|"; }; 
	exit 0;
}


# Check if mullvad binary in expected location and executable
check_executable() {
	if [[ ! -x "/usr/bin/mullvad" ]]; then
		echo "/usr/bin/mullvad doesn't exist or isn't executable"
		exit 1
	fi
}

# Ensure 'mullvad relay list' command & argument works as expected
check_relay() {
	relays=$(mullvad relay list)
	retval=$?
	if [[ $retval -ne 0 ]]; then
		echo "Got error $retval running 'mullvad relay list'"
		exit $retval
	fi
}

# Parse command line arguments
check_args() {
	local OPTIND
	while getopts ":rxhc" flag
	do
		case $flag in
			\?)
				echo "Invalid option: -$OPTARG" >&2
				exit 1;;
			r) # Do not randomize relay list
				export -n random=1;;
			x) # Do not exclude previously used relays
				exclude=1;;
			c) # List countries with available relays, then exit
				mullvad relay list | sed '/^\t/d' | sed '/^$/d' | cut -f2 -d '(' | cut -f1 -d')' | tr '\n' '|'
				echo -e \r\n
				exit 0
				;;
			h) # Display help
				usage
				exit 0;;
			*) ;;
		esac
	done
}

main() {
	# If requiring flags is needed later
	# [[ $# -eq 0 ]] && usage
	check_args $1
	check_executable
	check_relay

	# Randomize relay list if -r flag not passed
	[[ $random -ne 1 ]] && 
		relaylist=$(eval $cmd | shuf) ||
		relaylist=$(eval $cmd);

	# Create list of already used relays if it doesn't exist
	[[ ! -f $usedlist ]] &&	touch $usedlist

	# Loop through relays, exclude any which don't match, connect to first valid
	for item in $relaylist; do
		if [[ $(cat $usedlist) =~ (^|[[:space:]])$item($|[[:space:]]) ]]; then	
			echo "Already used $item"
		elif [[ ( $excluded -ne 1 ) && 
			( $(echo $exclude | grep ${item::2}) ) ]]; then
			echo "Excluded $item based on country"
			continue
		else
			echo "$item free"
			echo $item >> $usedlist
			mullvad relay set hostname $item && exit 0
			echo "Setting relay failed, exiting"
			exit 1
		fi
	done
	echo "All endpoints already used, exiting"
	exit 1
}

main "$@"
