# This script cycles through Mullvad VPN endpoints, keeping track of used
# endpoints in $HOME/mullvad.used.

usedlist=$HOME/mullvad.used
relaylist=$(mullvad relay list | grep wireguard | cut -f1 -d ' ' | tr -d '\t')
# Get list of countries by 2-character identifier
# countries=$(mullvad relay list | sed '/^\t/d' | sed '/^$/d' | cut -f2 -d '(' | cut -f1 -d')' | tr '\n' '|')
exclude="al|au|at|be|br|bg|cz|dk|ee|fi|fr|de|gr|hk|hu|ie|il|it|jp|lv|lu|md|nl|nz|mk|no|pl|pt|ro|rs|sg|es|se|ch|ae"

if [[ ! -f $usedlist ]]; then
	touch $usedlist
fi

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
