#!/usr/bin/env bash
# This script cycles through Mullvad VPN endpoints, keeping track of used
# endpoints in $HOME/mullvad.used.

usedlist=$HOME/mullvad.used
cmd='echo "$relays" | grep wireguard | cut -f1 -d " " | tr -d "\t"'
# Get list of countries by 2-character identifier
# countries=$(mullvad relay list | sed '/^\t/d' | sed '/^$/d' | cut -f2 -d '(' | cut -f1 -d')' | tr '\n' '|')
exclude="al|au|at|be|br|bg|cz|dk|ee|fi|fr|de|gr|hk|hu|ie|il|it|jp|lv|lu|md|nl|nz|mk|no|pl|pt|ro|rs|sg|es|se|ch|ae"

if [[ ! -x "/usr/bin/mullvad" ]]; then
	echo "/usr/bin/mullvad doesn't exist or isn't executable"
	exit 1
fi

# Ensure 'mullvad relay list' command & argument works as expected
check_relay() {
	# Make $relays global
	declare -gx relays=$(mullvad relay list)
	retval=$?

	if [[ $retval -ne 0 ]]; then
		echo "Got error $retval running 'mullvad relay list'"
		exit $retval
	fi
}

check_relay

case $1 in
	"--help")
		echo "'$0 random' to randomize relay list"
		exit 0
		;;
	"random")
		relaylist=$(eval $cmd | shuf)
		;;
	*)
		relaylist=$(eval $cmd)
		;;
esac

# Create list of already used relays if it doesn't exist
if [[ ! -f $usedlist ]]; then
	touch $usedlist
fi

# Loop through relays, exclude any which don't match, connect to first valid
for item in $relaylist; do
	if [[ $(cat $usedlist) =~ (^|[[:space:]])$item($|[[:space:]]) ]] ; then	
		echo "Already used $item"
	elif [[ $(echo $exclude | grep ${item::2}) ]] ; then
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
