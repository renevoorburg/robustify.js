# robustify.js

robustify.js is a javascript that attempts to fight [link rot](https://en.wikipedia.org/wiki/Link_rot) or content drift with an implementation of Herbert Van de Sompel's [Memento Robust Links - Link Decoration](http://robustlinks.mementoweb.org/spec/) specification, in context of the [Hiberlink](http://hiberlink.org/) project.

robustify.js will make any clicked hyperlink test if the linked page is available online. If it is not, it will redirect the user to a web archive, by default using the [Memento Time Travel service](http://timetravel.mementoweb.org/).

The required server side helper script [statuscode.php](https://github.com/renevoorburg/robustify.js/blob/master/php/statuscode.php) will per default attempt to detect soft-404s. See [example.html](http://digitopia.nl/robustify/example.html) for examples of how to implement or customize robustify.js.  [statuscode.php](https://github.com/renevoorburg/robustify.js/blob/master/php/statuscode.php) can of course be run from your server but is does require the ssdeep extension for soft-404 detection.

robustify.js should work on any modern browser or IE 8 or better.


