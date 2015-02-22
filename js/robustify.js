/** 
* robustify.js
* Fights linkrot by redirecting links to unavailable webpages to archived versions.
* An implementation based on the Memento Robust Links specification.
* See http://robustlinks.mementoweb.org/spec/
*
* Should work on any modern browser or IE 8 or better. 
*  
* @author René Voorburg <rene@digitopia.nl>
* @version 1.3
* @copyright René Voorburg 2015
* @package robustify.js
*
* Permission is hereby granted, free of charge, to any person
* obtaining a copy of this software and associated documentation
* files (the "Software"), to deal in the Software without
* restriction, including without limitation the rights to use,
* copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the
* Software is furnished to do so, subject to the following
* conditions:
* 
* The above copyright notice and this permission notice shall be
* included in all copies or substantial portions of the Software.
* 
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
* EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
* OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
* NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
* HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
* WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
* FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
* OTHER DEALINGS IN THE SOFTWARE.
*  
*/


// prototype for indexOf to support IE8
// from http://stackoverflow.com/questions/5864408/javascript-is-in-array
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function(searchElement /*, fromIndex */) {
        "use strict";

        if (this === void 0 || this === null)
            throw new TypeError();

        var t = Object(this);
        var len = t.length >>> 0;
        if (len === 0)
            return -1;

        var n = 0;
        if (arguments.length > 0) {
            n = Number(arguments[1]);
            if (n !== n) // shortcut for verifying if it's NaN
                n = 0;
            else if (n !== 0 && n !== (1 / 0) && n !== -(1 / 0))
                n = (n > 0 || -1) * Math.floor(Math.abs(n));
        }

        if (n >= len)
          return -1;

        var k = n >= 0
            ? n
            : Math.max(len - Math.abs(n), 0);

        for (; k < len; k++) {
            if (k in t && t[k] === searchElement)
                return k;
        }
        return -1;
    }
}


Robustify = function(preferences) {

    // settings, is used as a 'global' in the scope of Robustify:
    var settings = (function(preferences) {

        var settings = { 
            "dfltVersiondate": false, // to be overwritten later
            "archive"        : "http://timetravel.mementoweb.org/memento/{yyyymmddhhmmss}/{url}",
            "statusservice"  : "http://digitopia.nl/services/statuscode.php?soft404detect&url={url}",
            "precedence"     : "ask"    // "ask" || "live" || "archived" 
        }

        // returns the page's schema.org dateModified or else datePublished
        var pageModifiedDate = (function () {
            var ret = false;
            var meta = document.getElementsByTagName('meta');
            for (var i = 0; i < meta.length; i++) {
                itemprop = meta[i].getAttribute('itemprop');
                content  = meta[i].getAttribute('content');
                if (itemprop && content) {
                    if (itemprop == 'datePublished' && ret === false) {
                        ret = content;
                    }
                    if (itemprop == 'dateModified') {
                        ret = content;
                    }
                }
            }
            return ret;
        })();

        // override defaults to supplied preferences:
        if (preferences.dfltVersiondate) {
            settings.dfltVersiondate = preferences.dfltVersiondate;
        }
        if (pageModifiedDate) {
            settings.dfltVersiondate = pageModifiedDate;
        }
        if (!settings.dfltVersiondate ){
            settings.dfltVersiondate = (function() {
                var today = new Date();
                var dd = today.getDate();
                var mm = today.getMonth()+1;
                var yyyy = today.getFullYear();
                if (dd < 10) {
                    dd = '0'+dd
                }
                if (mm < 10) {
                    mm = '0'+mm
                }
                return yyyy + '-' + mm + '-' + dd;
            })();
        }
        settings.archive = preferences.archive ? preferences.archive : settings.archive;
        settings.statusservice = preferences.statusservice ? preferences.statusservice : settings.statusservice;
        settings.precedence = preferences.precedence ? preferences.precedence : settings.precedence;
        settings.ignoreLinks = preferences.ignoreLinks;
        return settings;
    })(preferences);
    
    // internationalization, langStrArr is used as a 'global' in the scope of Robustify:
    var langStrArr = (function() {
        // add missing languages as desired...:
        var langStrTable = {
            "en": { 
                "offlineToVersionurl" : "Redirected link\n\nThe requested page {url} is not available.\nYou are being redirected to an archived copy.", 
                "offlineToVersiondate": "Redirected link\n\nThe requested page {url} is not available.\nYour are being redirected to a web archive that might have a version of this page.",
                "onlineAsk"           : "An archived version has been specified. Confirm to visit the live page {url}, cancel to visit the archived page.",
                "onlineToVersionurl"  : "Redirected link\n\nYou are being redirected to an archived version of {url}."
            },
            "nl": {
                "offlineToVersionurl" : "Aangepaste verwijzing\n\nDe gevraagde pagina {url} is niet beschikbaar.\nU wordt doorgestuurd naar een gearchiveerde versie.",
                "offlineToVersiondate": "Aangepaste verwijzing\n\nDe gevraagde pagina {url} is niet beschikbaar.\nU wordt doorgestuurd naar een webarchief dat mogelijk een versie heeft.",
                "onlineAsk"           : "Een gearchiveerde versie is gespecificeerd. Bevestig om de live pagina {url} te bezoeken, annuleer voor de archiefversie.",
                "onlineToVersionurl"  : "Aangepaste verwijzing\n\nU wordt doorgestuurd naar een gearchiveerde versie van {url}."
            }
        } 
        var languages = [];
        for (var key in langStrTable) {
            languages.push(key);
        }
        var browserLang = (navigator.language || navigator.userLanguage).substring(0, 2);
        var lang = languages.indexOf(browserLang)== -1 ? 'en' : browserLang;
        return langStrTable[lang]; 
    })();


    // navigate to appropriate page, alert user, ask for input if required:
    var presentLink = function (response, versiondate, versionurl) {
    
        // returns a resource link as used in web archive:
        function buildArchiveLink(versiondate, url) {            
            var versiondate = versiondate ? versiondate : settings.dfltVersiondate;
            return settings.archive.replace('{url}', url).replace('{yyyymmddhhmmss}', versiondate.replace(/[^0-9]/g, ''));
        }
    
        if (response.headers[response.headers.length - 1].statuscode == 200) {
            // href is available online
            if (versionurl) {
                if (settings.precedence == 'archived') {
                    alert(langStrArr["onlineToVersionurl"].replace('{url}', response.request));
                    window.location.href = versionurl;
                }
                if (settings.precedence == 'live') {
                    window.location.href = response.request;
                }
                if (settings.precedence == 'ask') {
                    if (confirm(langStrArr["onlineAsk"].replace('{url}', response.request))) {
                        window.location.href = response.request;
                    } else {
                        window.location.href = versionurl;
                    }
                }
            } else {
                window.location.href = response.request;
            }
        } else {
            // href is not available online, link to archive
            if (versionurl) {
                alert(langStrArr["offlineToVersionurl"].replace('{url}', response.request));
                window.location.href= versionurl;
            } else {
                 alert(langStrArr["offlineToVersiondate"].replace('{url}', response.request));
                window.location.href= buildArchiveLink(versiondate, response.request);
            }
        }
    }
    
    // tests if given link is available by calling a JSON service
    // resulting object is presented to callback :
    var testLink = function (link, versiondate, versionurl, callback) {
        var http = new XMLHttpRequest();
        http.open('GET', settings.statusservice.replace('{url}', encodeURIComponent(link)), true);
        http.onreadystatechange = function() {
            if (this.readyState == this.DONE) {
                callback(JSON.parse(this.responseText), versiondate, versionurl);
            }
        }
        http.send();
    }
    
    // onclick handler attached to be attached to all links:
    var robustLink = function (link, versiondate, versionurl) {
        testLink(link, versiondate, versionurl, presentLink);
        return false;
    }

    // prevents sending a string value iso null:
    var cleanNull = function(str) {
        if (str=='null' || str=='') return null;
        return str;
    }
    
    // checks if a string matches a string value in an array
    var matchInArray = function(str, exprStrArr) {
        if (exprStrArr) {
            var len = exprStrArr.length;
            for (var i = 0; i < len; i++) {
                if (str.match(new RegExp(exprStrArr[i]))) {
                    return true;
                }
            }
        }
        return false;
    }

    // tests if this script is running inside a web archive:
    var inArchive = function() {
        return ((function(str) {
            // see http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
            var hash = 0,
                strlen = str.length,
                i,
                c;
            if ( strlen === 0 ) {
                return hash;
            }
            for ( i = 0; i < strlen; i++ ) {
                c = str.charCodeAt( i );
                hash = ((hash << 5) - hash) + c;
                hash = hash & hash; // Convert to 32bit integer
            }
            return hash;
        })('http://digitopia.nl')) != 1834440280; // string will be rewritten inside an archive
    }

    // will run only if not in context of web archive:
    if (!inArchive()) {
        // attach robustLink call to all external links:
        var links = document.getElementsByTagName("a");
        for (var i = 0; i < links.length; i++) {
            if (links[i].href.substring(0, window.location.origin.length) != window.location.origin) {
                // link is not local
                if (!matchInArray(links[i].href, settings.ignoreLinks)) {
                    // link is not on ignore list
                    links[i].onclick = function () {
                        return robustLink(this.href, cleanNull(this.getAttribute("data-versiondate")), cleanNull(this.getAttribute("data-versionurl")))
                    }
                }
            }
        }
    }
}