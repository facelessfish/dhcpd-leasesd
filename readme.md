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
- Can run as a `slowcgi(8)` script for `httpd(8)`.
- Can be started from rc.local
- [Online Demo](https://html-preview.github.io/?url=https://github.com/facelessfish/dhcpd-leasesd/blob/main/screenshots/demo.html)

![Screenshot 1](screenshots/V1.5_macos_safari_1.png)
![Screenshot 1](screenshots/V1.5_macos_safari_2.png)
Safari on macOS

![Screenshot 3](screenshots/V1.5_openbsd_firefox.png)
Firefox on OpenBSD

![Screenshot 4](screenshots/V1.5_openbsd_iridium_1.png)
Iridium (Chromium) on OpenBSD


## Installation
Starting with V1.5 the merged verion of the script (single file server or cgi) will be available in the releases. Just download that, gunzip it and move it to `/usr/local/sbin/` or somewhere in your $PATH and you are done.
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
Just overwrite the current version of the script with the new one and run `dhcpd-leasesd.sh -k` to kill the script if it's running in the background. Then start `dhcpd-leasesd.sh` with the same options as the old version. 

## The dashboard can be served in 2 (+1) ways.

  - #### Using the builtin `nc(1)` "HTTP server".  
    This the easiest way to run the dashboard. Please note that it has a 
    serious limitation of only 1 concurrent request (server is unavailable 
    during processing).  
    ex.
    ```
    $ dhcpd-leasesd.sh -dv -l 192.168.0.1
    ```
    to start it in the background:
    ```
    $ dhcpd-leasesd.sh -dv -l 192.168.0.1 &
    ```

  - #### As a `slowcgi(8)` script for `httpd(8)`.  
    This is fully suported as of V1.6. A few commands and their dynamic libraries are needed inside the `httpd(8)` chroot.  
    Setup can be automated by the -s option which will copy them to /var/www or to a custom path if specified using -w.
   
    #### Copy commands to the chroot
    ```
    $ ./dhcpd-leasesd.sh -s
    Copying: [ cat date grep mkdir nc rm sh tr wc which basename dirname /etc/resolv.conf /etc/ssl/cert.pem ] and required libs
    To: /var/www/
    No files will be overwritten.

    The following will happen:

    mkdir -p "/var/www//bin"
    cp -p /bin/cat "/var/www//bin/cat"
    cp -p /bin/date "/var/www//bin/date"
    mkdir -p "/var/www//usr/bin"
    cp -p /usr/bin/grep "/var/www//usr/bin/grep"
     cp -p /usr/lib/libz.so.7.1 "/var/www//usr/lib/libz.so.7.1"
     cp -p /usr/lib/libc.so.100.3 "/var/www//usr/lib/libc.so.100.3"
    mkdir -p "/var/www//usr/libexec"
     cp -p /usr/libexec/ld.so "/var/www//usr/libexec/ld.so"
    cp -p /bin/mkdir "/var/www//bin/mkdir"
    cp -p /usr/bin/nc "/var/www//usr/bin/nc"
     cp -p /usr/lib/libtls.so.32.1 "/var/www//usr/lib/libtls.so.32.1"
     cp -p /usr/lib/libssl.so.59.1 "/var/www//usr/lib/libssl.so.59.1"
     cp -p /usr/lib/libcrypto.so.56.0 "/var/www//usr/lib/libcrypto.so.56.0"
    cp -p /bin/rm "/var/www//bin/rm"
    cp -p /bin/sh "/var/www//bin/sh"
    cp -p /usr/bin/tr "/var/www//usr/bin/tr"
    cp -p /usr/bin/wc "/var/www//usr/bin/wc"
     cp -p /usr/lib/libutil.so.20.0 "/var/www//usr/lib/libutil.so.20.0"
    cp -p /usr/bin/which "/var/www//usr/bin/which"
    cp -p /usr/bin/basename "/var/www//usr/bin/basename"
    cp -p /usr/bin/dirname "/var/www//usr/bin/dirname"
    mkdir -p "/var/www//etc"
    cp -p /etc/resolv.conf "/var/www//etc/resolv.conf"
    mkdir -p "/var/www//etc/ssl"
    cp -p /etc/ssl/cert.pem "/var/www//etc/ssl/cert.pem"

    Confirm [y/N]:y
    done.
    ```
    #### then copy the config and leases files to the chroot (create the folders if they dont exist)
    ```
    $ cp /etc/dhcpd.conf /var/www/etc/
    $ cp /var/db/dhcpd.leases /var/www/var/db/
    ```
    and then copy the merged script to `/var/www/cgi-bin/dhcpd-leasesd.sh`.
    #### Finally edit your server in /etc/httpd.conf to include something like:
    ```
     location "/cgi-bin/*" {
        fastcgi socket "/run/slowcgi.sock"
        root "/"
    }
    ```
    Start the `httpd(8)` and the `slowcgi(8)` servers and visit `http://<your_server>/cgi-bin/dhcpd-leasesd.sh`.  
    You can use `httpd -dvvv`,  `slowcgi -dv` and `/tmp/dhcpd_leasesd.log` to debug if you need to.  

    After it's up and running you can set up `cron(8)` to periodically update `/var/www/etc/dhcp.conf` and `/var/www/var/db/dhcpd.leases`.  
    
    An optional config file `/var/www/etc/dhcpd_leasesd.conf` can be used to enable features or custom options.  
    Currently: opt_vendor_lookup, leases_db, dhcpd_conf
    #### Ex. Enable MAC address Vendor Lookup:
    ```
    $ echo "opt_vendor_lookup=true" > /var/www/etc/dhcpd_leasesd.conf
    ```

  - #### Using `tcpserver(1)`.  
    ***!! Support for `tcpserver(1)` will be depreciated in the next version !!***  

    This option requires the ucspi-tcp package which contains the tcpsrver. 
    Most flexible option due to the tcpserver configuration options. Can easily
    handle any number of concurrent requests.  
    ex.
    ```
    $ tcpserver 192.168.0.1 9130 dhcpd-leasesd.sh -tv
    ```


## Usage
```
dhcpd-leasesd.sh [-b dhcpd.leases] [-c dhcpd.conf] [-t] [-v] [-u] [-f out_file] [-h]
              [-d [-l listening_ip_address] [-p port]]
              [-s [-w httpd_chroot_path]]

If its run without options it will output HTML to stdout and exit.

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

-k Kill the script if running in the background and exit.

-s Setup httpd(8). Copy the required commands, their dynamic libs and config files
   to the httpd chroot, if they don't already exist there. No files are overwritten.
   Interactive only, requires user confirmation.
   ($cmds)

-w Httpd(8) chroot directory. Used only with -s. Default: /var/www

-h Usage information

Examples:
  $ dhcpd-leasesd.sh -d

  $ dhcpd-leasesd.sh -dv -b ./dhcpd.leases -c ./dhcpd.conf -l 192.168.0.1 -p 9130

  $ dhcpd-leasesd -f dhcpd-leasesd.sh

  $ dhcpd-leasesd -s -w <httpd_chroot> 

  $ tcpserver 192.168.0.1 9130 dhcpd-leasesd.sh -tv
```


## Changelog
### V1.6
- Running as an httpd(8) slowcgi(8) is fully supported including MAC vendor lookup.
- Added option -s. This will copy the required commands and libs to the httpd chroot.
- Added option -w. This specifies the httpd chroot directory. Used only by -s
- Option -t (tcpserver) will be depreciaded in the next version, unless someone is using it. Open an issue if you do.
- Fixed issues with Fixed IPs (search & filering not working).
- Updated -h option to display full usage info.
- Added an online demo.
- bug fixes and code cleanup.


### V1.5
- Added support for Fixed IP addresses.
- Added logging to /tmp/dhcpd_leasesd.log if running in the background.
- Running as an httpd(8) cgi is somewhat supported but lacks Vendor Lookup.
- Updated Readme.

### V1.4
- graph: alternate color of hour labels (per day).
- added option -k to kill the script if its running in the background. Makes it easy to upgrade.
- fixed wheel scroll event (mousewheel is deprecated).

### V1.3
- fixed a bug where the first bar of the bargraph would not show.
- improved handling of renewed leases.
- More code cleanup & bug fixes.

### v1.2
- Better handling of background OUI db download.
- UI improvements and code cleanup.
- Visually indicate renewed active leases.
- Starts fine from rc.local (diabled text output if not run from a terminal).
