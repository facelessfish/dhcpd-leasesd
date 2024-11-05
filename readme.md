# dhcpd.leases dashboard
I was looking for a simple way to monitor the `dhcpd(8)` leases, subnet utilization
and generally the state of the `OpenBSD` dhcpd server but I couldn't find any
tool suitable for my needs. Most options are an overkill for small networks and small routers like the APU, ODROID, Protectli etc.  

**Dhcpd-leasesd** is a simple dashboard for the `dhcpd.leases` file of the OpenBSD dhcpd server
that is very easy to install and use.  
Basically all this dashboard does is present the data in `dhcpd.leases` plus some
data from `dhcpd.conf` (subnets, ranges and fixed addresses) in a user friendly way
including full dynamic searching, filtering and sorting.
It can easily handle a few class C subnets or more, depending on your HW. 

- Pure sh script. Runs on a base OpenBSD installation with no dependancies.
- Javascript and styles can be merged into the script to create a single file 
  server or cgi script that is easy to deploy. This is the preferred way of 
  using this script.
- Can optionally do MAC address Vendor lookup using the standards-oui.ieee.org 
  data. Please note that Vendor lookup adds to the processing time.
- Displays IPs from both the dhcpd IP pool and fixed addresses (IP reservations).
- Filtering, sorting and searching in the browser.
- Requires read access to /var/db/dhcpd.leases and /etc/dhcpd.conf files.
- Can be started from rc.local

![Screenshot 1](screenshots/V1.5_macos_safari_1.png)
![Screenshot 1](screenshots/V1.5_macos_safari_2.png)
Safari on macOS

![Screenshot 3](screenshots/V1.5_openbsd_firefox.png)
Firefox on OpenBSD

![Screenshot 4](screenshots/V1.5_openbsd_iridium_1.png)
Iridium (Chromium) on OpenBSD


## Installation
Starting with V1.5 the merged verion of the script (single file server) will be available in the releases. Just download that, gunzip it and move it to `/usr/local/sbin/` or to somewhere in your $PATH and you are done.
```
  $ gunzip dhcpd-leasesd.gz
  $ chmod +x dhcpd-leasesd.sh
  $ mv dhcpd-leasesd.sh /usr/local/sbin/
```
You can still use the unmerged files if you want to:
```
$ git clone https://github.com/facelessfish/dhcpd-leasesd (or Code/Download zip
and unzip)
$ cd dhcpd-leasesd
$ chmod +x dhcpd-leasesd
$ ./dhcpd-leasesd -dv -l <ip address to listen>
```
To generate and install the single file server:
```
$ ./dhcpd-leasesd -f dhcpd-leasesd.sh
$ mv dhcpd-leasesd.sh /usr/local/sbin/
```
## Running
```
$ dhcpd-leasesd.sh -dv -l <ip address to listen>
```

On first run (or after a reboot or after /tmp is cleared by the system)
it will download the OUI data and cache it in /tmp if -v is specified.
Wait for the download to finish and then visit:
`http://<ip address>:9130` with a fairly recent browser.  
Tested in Safari, Firefox and Chromium.

## Upgrade
Overwrite the old version of the script with the new one and run `dhcpd-leasesd.sh -k` to kill it, if it's running in the background. Then start `dhcpd-leasesd.sh` with the same parameters as the old version. 

## The dashboard can be served in 2 (+1) ways.

  - Using the builtin `nc(1)` "HTTP server".  
    This the easiest way to run the dashboard. Please note that it has a 
    serious limitation of only 1 concurrent request (server is unavailable 
    during processing).  
    ex.
    ```
    $ dhcpd-leasesd -dv -l 192.168.0.1
    ```
    to start it in the background:
    ```
    $ dhcpd-leasesd -dv -l 192.168.0.1 &
    ```

  - Using `tcpserver(1)`.  
    This option requires the ucspi-tcp package which contains the tcpsrver. 
    Most flexible option due to the tcpserver configuration options. Can easily
    handle any number of concurrent requests.  
    ex.
    ```
    $ tcpserver 192.168.0.1 9130 dhcpd-leasesd.sh -tv
    ```

  - As a `slowcgi(8)` script for `httpd(8)`.  
   it is possible to partially run the script as a cgi but it currently lacks vendor lookup support and it's likely more trouble than it's worth. Vendor lookup depends on `nc(1)` and running it in the `httpd(8)` chroot looks messy. I'll look into it at some point.
    #### Copy the following commands to the chroot
    ```
    $ cp /bin/date /var/www/bin/
    $ cp /bin/cat /var/www/bin/
    $ cp /bin/sh /var/www/bin/
    ```
    #### then copy the config and leases files to the chroot (create the folders if they dont exist)
    ```
    $ cp /etc/dhcpd.conf /var/www/etc/
    $ cp /var/db/dhcpd.leases /var/www/var/db/
    ```
    and then copy the merged script to `/var/www/cgi-bin/dhcpd-leasesd.sh`
    #### Finally edit your server in /etc/httpd.conf to include something like:
    ```
     location "/cgi-bin/*" {
        fastcgi socket "/run/slowcgi.sock"
        root "/"
    }
    ```
    Start the `httpd(8)` and the `slowcgi(8)` servers and visit `http://<your_server>/cgi-bin/dhcpd-leasesd.sh`.
    You can use `httpd -dvvv`,  `slowcgi -dv` and `/tmp/dhcpd_leases.log` to debug if you need to.  

    After it's running you can set up `cron(8)` to periodically update `/var/www/etc/dhcp.conf` and `/var/www/var/db/dhcpd.leases`.

## Usage
```
dhcpd-leasesd [-b dhcpd.leases] [-c dhcpd.conf] [-t] [-v] [-u] [-f out_file] 
              [-d [-l listening_ip_address] [-p port]] 

Run without options will output HTML on stdout and exit.

-d Run as a deamon using the nc http server. Can only serve one request at a 
   time. -t is ignored (always on).

-l Listening address. Used only with -d. Default: 127.0.0.1

-p Listening port. Used only with -d. Default: 9130

-v Enable MAC address vendor lookup. Oui db will be downloaded and cached into
   /tmp if not already cached.

-t Prepend an HTTP 200 header to the HTML output. Needed when used with 
   tcpserver.

-b Path to dhcps.leases. Default: /var/db/dhcpd.leases

-c Path to dhcpd.conf. Default: /etc/dhcpd.conf

-u Update the vendor database and exit. All other options are ignored.

-f Merge the sh script, javascript and styles into out_file and exit. All other
   options are ignored.

-k kill the script if running in the background and exit.

Examples:
  $ dhcpd-leasesd.sh -d

  $ dhcpd-leasesd.sh -dv -b ./dhcpd.leases -c ./dhcpd.conf -l 192.168.0.1 -p 9130

  $ dhcpd-leasesd -f dhcpd-leasesd.sh 

  $ tcpserver 192.168.0.1 9130 dhcpd-leasesd.sh -tv

```


## Changelog
### V1.5
- Added support for Fixed IP addresses
- Added logging to /tmp/dhcpd_leases.log if running in the background
- Running as an httpd(8) cgi is somewhat supported but lacks Vendor Lookup
- Updated Readme

### V1.4
- graph: alternate color of hour labels (per day).
- added option -k to kill the script if its running in the background. Makes it easy to upgrade.
- fixed wheel scroll event (mousewheel is deprecated)

### V1.3
- fixed a bug where the first bar of the bargraph would not show
- improved handling of renewed leases
- More code cleanup & bug fixes

### v1.2
- Better handling of background OUI db download.
- UI improvements and code cleanup.
- Visually indicate renewed active leases.
- Starts fine from rc.local (diabled text output if not run from a terminal)
