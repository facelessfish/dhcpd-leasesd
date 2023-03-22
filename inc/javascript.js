const subnets_db = {};
var graph_ip_db = [],
	hours_db = {},
	graph_start = 0;


function init() {
	var ip_unique = {};

	// Init subnets_db & subnet filtering
	subnets.querySelectorAll('input[type=checkbox]').forEach((chk) => {
		chk.addEventListener('change', () => {
			document.getElementById('s_' + chk.dataset.subnet).style.opacity = ( chk.checked ) ? '1' : '0.4';
			leases_filter();
			bargraph_draw();
		});
		subnets_db[chk.dataset.subnet] = { 
			'checkbox': chk, 
			'mask': chk.dataset.mask, 
			'ips' :  +document.getElementById('s_' + chk.dataset.subnet).getElementsByClassName('s_ips')[0].textContent,
			'leases' : 0,
			'leased' : 0,
			'expired' : 0,
			'abandoned' : 0
		};
	});

	//Init leases & populate subnets
	const leases_rows = leases.tBodies[0].rows,
		  refreshed = new Date(now.textContent);

	graph_start = Math.floor(refreshed.getTime() / 3600000) - (bargraph_range.value * 24 ) + 1;
	leases_sort(2); // Ending time, desc

	// leases
	for ( const row of leases_rows ) {
		const ip = ip_to_int(row.getElementsByClassName('ip')[0].textContent),
			  ip_subnet = ip_in_subnet(ip),
			  starts = Math.floor(Date.parse(row.cells[1].textContent) / 3600000),
			  state = row.className.toLowerCase();
		row.dataset.ip = ip;
		row.dataset.subnet = ip_subnet;
		row.dataset.starts = starts;
		// subnets
		subnets_db[ip_subnet].leases ++;
		if ( state == 'leased' ) {
			if ( ! ip_unique[ip] ) {
				ip_unique[ip] = true;
				subnets_db[ip_subnet][state] ++;
			}
		} else {
			subnets_db[ip_subnet][state] ++;
		}	
	}

	search.addEventListener('input', () => {
		leases_filter();
		bargraph_draw();
	});

	bargraph_range.addEventListener('change', () => {
		graph_start = Math.floor(refreshed.getTime() / 3600000) - (bargraph_range.value * 24 ) + 1;
		leases_filter();
		bargraph_draw();
	});

	clear.addEventListener('click', () => {
		hours_db = {};
		search.value = '';
		leases_filter('All');
		bargraph_draw();
	});

	menu.querySelectorAll('td').forEach((td) => {
		td.addEventListener('click', () => leases_filter(td.id));
	});

	leases.querySelectorAll('th').forEach((th, column) => {
		th.addEventListener('click', () => leases_sort(column));
	});

	//  Leases state menu fixed layout & width
	menu.width = ( +menu.offsetWidth + 80 ) + 'px';
	menu.querySelectorAll('td').forEach( (td) => { 
		td.width = td.offsetWidth + 'px' 
	});
	menu.style.tableLayout = 'fixed';

	subnets_update();
	leases_filter(); // & init bargraph data
	bargraph_draw();
	layout_manager();

	window.addEventListener("resize", (event) => {
		layout_manager();
	});
}


function ip_from_int(int) {
	return ( (int>>>24) + '.' + (int>>16 & 255) + '.' + (int>>8 & 255) + '.' + (int & 255) );
}

function ip_to_int(ip) {
	return ip.split('.').reduce((a, b) => a * 256 + +b)
}

function ip_in_subnet(ip_int) {
	for (const key in subnets_db) {
		if ( ( ip_int & subnets_db[key].mask )>>>0 == key ) {
			return key;
		}
	}
	return false;
}


function layout_manager() {
	const leases_th = leases.tHead.rows[0].cells;

	leases.style.tableLayout = 'auto';
	for (const th of leases_th) {
		th.width = 'fit-content';
	}
	main.style.width = 'fit-content';
	leases.width = 'fit-content';

	leases.width = leases.offsetWidth + 'px';
	main.style.width = leases.offsetWidth + 'px';
	for (const th of leases_th) {
		th.width = th.offsetWidth + 'px';
	}
	leases.style.tableLayout = 'fixed';
}


function subnets_update() {
	for ( const key in subnets_db ) {
		const subnet_div = document.getElementById( 's_' + key ),
			  bar_graph = subnet_div.getElementsByClassName('bar_fg')[0],
			  s_leased_percent = ( subnets_db[key].leased * 100 / subnets_db[key].ips ).toFixed(2);

		subnet_div.getElementsByClassName('s_leased')[0].textContent = subnets_db[key].leased;
		subnet_div.getElementsByClassName('s_leased_percent')[0].textContent = s_leased_percent +'%';
		bar_graph.style.width = s_leased_percent + '%';
		bar_graph.className = ( s_leased_percent < 75) ? 'bar_fg bar_green' : ( s_leased_percent > 89 ) ? 'bar_fg bar_red' : 'bar_fg bar_yellow';
	}
}


function bargraph_draw() {
	const max_leases = graph_ip_db.reduce((a, b) => Math.max(a, b), -1),
		  col_span = +bargraph_range.value,
		  bars_num = col_span * 24,
		  tbody_tr = document.createElement('tr'),
		  tfoot_tr = document.createElement('tr'),
		  font_stretch = (col_span < 2) ? '100%' : ( col_span > 6 ) ? '50%' : ( 100 - col_span * 8 ) + '%';

	bargraph.tHead.rows[0].cells[0].colSpan = bars_num;
	for ( let i = 0; i < bars_num; i++ ) {
		const td = document.createElement('td'),
			  time = new Date(( graph_start + i ) * 3600000),
			  time_ts = time.getTime(),
			  leases = ( graph_ip_db[i] ) ? graph_ip_db[i] : 0;
		
		td.style.fontStretch = font_stretch;
		td.title = 'New leases: ' + leases + "\n" + time.toLocaleString().replace(',', ' -');

		if ( leases ) {
			const bar_div = document.createElement('div');
			bar_div.style.height = ( leases * 85 / max_leases ) + '%';
			td.className = ( hours_db[time_ts] ) ? 'has_leases selected' : 'has_leases';
			td.appendChild(document.createTextNode( leases ));
			td.appendChild(bar_div);
			td.addEventListener('click', () => {
				if ( hours_db[time_ts] ) {
					td.classList.remove('selected');
					delete hours_db[time_ts];
				} else {
					td.classList.add('selected');
					hours_db[time_ts] = true;
				}
				leases_filter();
			});
		}
		tbody_tr.appendChild(td);

		if ( ( i % col_span ) == 0 ) {
			td.classList.add('line');
			
			const label = document.createElement("td");
			label.colSpan = col_span;
			label.style.textAlign = ( col_span == 1 ) ? 'center' : 'left';
			label.appendChild(document.createTextNode( time.getHours() + ':' + time.getMinutes().toString().padStart(2, '0') ));
			tfoot_tr.appendChild(label);
		}
	}
	bargraph.tBodies[0].replaceChildren(tbody_tr);
	bargraph.tFoot.replaceChildren(tfoot_tr);
}


function leases_sort(column) {
	const headers = leases.tHead.rows[0].cells,
		  ip = ( headers[column].textContent == 'IP' ),
		  reverse = ( headers[column].className == 'ASC' );
	
	let rows_sorted = Array.from(leases.tBodies[0].rows).sort( (row_a, row_b) => {
		const td_a = row_a.cells[column].textContent,
			  td_b = row_b.cells[column].textContent;
		if ( td_b == '' ) return -1;
		if ( td_a == '' ) return 1;
		if ( ip ) return row_a.dataset.ip - row_b.dataset.ip;
		return td_a.localeCompare(td_b);
	} );

	if ( reverse ) {
		rows_sorted.reverse();
		headers[column].className = 'DESC';
	} else {
		for ( const header of headers ) {
			header.className = '';
		}
		headers[column].className = 'ASC';
	}
	leases.tBodies[0].replaceChildren( ...rows_sorted );
	box.scrollTop = 0;
}


function leases_filter(leases_state = false) {
	const leases_rows = leases.tBodies[0].rows,
		  search_text = search.value.toLowerCase(),
		  menu_selected = menu.rows[0].getElementsByClassName('selected'),
		  subnet_filter = ( subnets.querySelectorAll('input:checked').length == subnets.querySelectorAll('input').length ),
		  hour_filter = ( Object.keys(hours_db).length == 0 ),
		  ip_unique = {};

	let head_leased = 0, head_expired = 0, head_abandoned = 0, showing = 0;
	
	graph_ip_db = [];

	if ( ! leases_state ) {
		leases_state = menu_selected[0].id ;
	} else {
		menu_selected[0].className = '';
		document.getElementById(leases_state).className = 'selected';
	}
	
	for ( const row of leases_rows ) {
		let display = 'none';
		if (( (! search_text) || row.innerHTML.replace(/<(.|\n)*?>/g, '|').toLowerCase().includes(search_text) ) &&
			( subnet_filter || subnets_db[row.dataset.subnet].checkbox.checked ) ) {
			// init Bargraph graph_ip_db
			let graph_hour = 0,
				count = true;
			if ( row.dataset.starts >= graph_start ) {
				graph_hour = row.dataset.starts - graph_start;
				if  ( ! graph_ip_db[graph_hour] ) graph_ip_db[graph_hour] = 0;
			}
			if ( hour_filter || hours_db[row.dataset.starts * 3600000] ) {
				if ( ( leases_state == 'All' ) || ( row.className == leases_state ) ) {
					display = 'table-row';
					showing ++;
				}
				switch ( row.className ) {
					case 'Leased':
						if ( ! ip_unique[row.dataset.ip] ) {
							ip_unique[row.dataset.ip] = true;
							head_leased ++;
						} else {
							count = false;
						}
						break;
					case 'Expired':
						head_expired ++;
						break;
					case 'Abandoned':
						head_abandoned ++;
						break;
				}
			}
			if ( graph_hour && count ) graph_ip_db[graph_hour] ++;
		}
		row.style.display =  display;
	}

	leases_total.textContent = head_leased + head_expired + head_abandoned;
	leases_leased.textContent = head_leased;
	leases_expired.textContent = head_expired;
	leases_abandoned.textContent = head_abandoned;
	leases_showing.textContent = showing;
	leases_message.style.display = ( showing ) ? 'none' : 'table-footer-group';
	leases.tHead.style.display = ( showing ) ? 'table-header-group' : 'none';
	document.documentElement.style.setProperty('--bargraph-bars', ( hour_filter ) ? 'var(--blue-color)' : 'var(--darkblue-color)' );
	box.scrollTop = 0;
}


