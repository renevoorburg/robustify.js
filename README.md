# robustify.js

robustify.js is a javascript that attempts to fight [link rot](https://en.wikipedia.org/wiki/Link_rot) or content drift with an implementation of Herbert Van de Sompel's [Memento Robust Links - Link Decoration](http://robustlinks.mementoweb.org/spec/) specification, in context of the [Hiberlink](http://hiberlink.org/) project.

robustify.js will make any clicked hyperlink test if the linked page is available online. If it is not, it will redirect the user to a web archive, by default using the [Memento Time Travel service](http://timetravel.mementoweb.org/).


See [example.html](http://digitopia.nl/robustify/example.html) for examples of how to use robustify.js. Mind that robustify.js needs to call a server side script to check link availability. As a default it uses the service at http://digitopia.nl/services/statuscode.php but statuscode.php is part of this package so it can be run from your server.

robustify.js should work on any modern browser or IE 8 or better.
