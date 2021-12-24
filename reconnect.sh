# This script cycles through Mullvad VPN endpoints, keeping track of used
# endpoints in $HOME/mullvad.used.

usedlist=$HOME/mullvad.used
relaylist=$(mullvad relay list | grep wireguard | cut -f1 -d ' ' | tr -d '\t')

if [[ ! -f $usedlist ]]; then
	touch $usedlist
fi

for item in $relaylist; do
	if [[ $(cat $usedlist) =~ (^|[[:space:]])$item($|[[:space:]]) ]] ; then	
		echo "Already used $item"
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
