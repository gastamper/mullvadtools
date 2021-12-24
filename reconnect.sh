# This script cycles through Mullvad VPN endpoints, keeping track of used
# endpoints in $HOME/mullvad.used.

relaylist=$(mullvad relay list | grep wireguard | cut -f1 -d ' ' | tr -d '\t')
used=$(cat $HOME/mullvad.used)

for item in $relaylist; do
	if [[ $used =~ (^|[[:space:]])$item($|[[:space:]]) ]] ; then	
		echo "Already used $item"
	else
		echo "$item free"
		echo "$item" >> $HOME/mullvad.used
		mullvad relay set hostname $item
		break
	fi
	echo "All endpoints already used, exiting"
done
