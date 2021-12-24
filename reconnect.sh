# This script cycles through Mullvad VPN endpoints, keeping track of used
# endpoints in $HOME/mullvad.used.

usedlist=$HOME/mullvad.used
relaylist=$(mullvad relay list | grep wireguard | cut -f1 -d ' ' | tr -d '\t')

if [[ -z $usedlist ]]; then
	used=$(cat $HOME/mullvad.used)
else
	used=""
fi

for item in $relaylist; do
	if [[ $usedlist =~ (^|[[:space:]])$item($|[[:space:]]) ]] ; then	
		echo "Already used $item"
	else
		echo "$item free"
		echo "$item" >> $usedlist
		mullvad relay set hostname $item && break || echo "Setting relay failed"
	fi
	echo "All endpoints already used, exiting"
done
