//
// robustify.js
// Fights linkrot by redirecting links to unavailable webpages to archived versions.
// An implementation based on the Memento Robust Links specification.
// See https://robustlinks.mementoweb.org/spec/
////
// @author René Voorburg <rene@digitopia.nl>
// @version 1.5
// @copyright René Voorburg 202024
// @package robustify.js
//
// Permission is hereby granted, free of charge, to any person
// obtaining a copy of this software and associated documentation
// files (the "Software"), to deal in the Software without
// restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the
// Software is furnished to do so, subject to the following
// conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
// OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
// WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
// OTHER DEALINGS IN THE SOFTWARE.
//

const robustify = ({ dfltVersiondate, archive, statusservice, precedence, ignoreLinks }) => {

    const settings = {
        dfltVersiondate: dfltVersiondate || getPageModifiedDate() || getTodayDate(),
        archive: archive || "https://timetravel.mementoweb.org/memento/{yyyymmddhhmmss}/{url}",
        statusservice: statusservice || "https://digitopia.nl/services/statuscode.php?soft404detect&url={url}",
        precedence,
        ignoreLinks
    };

    const langStrArr = getTranslations();

    function getTranslations() {
        const langStrTable = {
            "en": {
                "offlineToVersionurl": "Redirected link\n\nThe requested page {url} is not available.\nYou are being redirected to an archived copy.",
                "offlineToVersiondate": "Redirected link\n\nThe requested page {url} is not available.\nYou are being redirected to a web archive that might have a version of this page."
            },
            "nl": {
                "offlineToVersionurl": "Aangepaste verwijzing\n\nDe gevraagde pagina {url} is niet beschikbaar.\nU wordt doorgestuurd naar een gearchiveerde versie.",
                "offlineToVersiondate": "Aangepaste verwijzing\n\nDe gevraagde pagina {url} is niet beschikbaar.\nU wordt doorgestuurd naar een webarchief dat mogelijk een versie heeft."
            }
        };
        const browserLang = (navigator.language || navigator.userLanguage).substring(0, 2);
        return langStrTable[browserLang] || langStrTable["en"];
    }

    function getPageModifiedDate() {
        const meta = document.querySelectorAll('meta[itemprop="datePublished"], meta[itemprop="dateModified"]');
        return meta.length ? meta[meta.length - 1].getAttribute('content') : null;
    }

    function getTodayDate() {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    function buildArchiveLink(versiondate, url) {
        const date = versiondate ? versiondate : settings.dfltVersiondate;
        return settings.archive.replace('{url}', url).replace('{yyyymmddhhmmss}', date.replace(/[^0-9]/g, ''));
    }

    async function testLink(link, versiondate, versionurl) {
        try {
            const firstVersionUrl = versionurl ? versionurl.split(' ')[0] : null;
            const response = await fetch(settings.statusservice.replace('{url}', encodeURIComponent(link)));
            const result = await response.json();
            presentLink(result, versiondate, firstVersionUrl);
        } catch (error) {
            console.error("Network request failed", error);
        }
    }

    function presentLink(response, versiondate, versionurl) {
        if (response.headers[response.headers.length - 1].statuscode === 200) {
            window.location.href = response.request;
        } else {
            const message = versionurl
                ? langStrArr["offlineToVersionurl"].replace('{url}', response.request)
                : langStrArr["offlineToVersiondate"].replace('{url}', response.request);
            alert(message);
            window.location.href = versionurl || buildArchiveLink(versiondate, response.request);
        }
    }

    function cleanNull(str) {
        return str === 'null' || str === '' ? null : str;
    }

    function matchInArray(str, exprStrArr) {
        return exprStrArr ? exprStrArr.some(expr => str.match(new RegExp(expr))) : false;
    }

    function inArchive() {
        return ((function(str) {
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
        })('http://digitopia.nl')) !== 1834440280; // this string will be rewritten inside a webarchive
    }

    if (!inArchive()) {
        const links = document.querySelectorAll("a");
        links.forEach(link => {
            if (link.href.startsWith(window.location.origin) === false && !matchInArray(link.href, settings.ignoreLinks)) {
                link.onclick = () => {
                    testLink(link.href, cleanNull(link.getAttribute("data-versiondate")), cleanNull(link.getAttribute("data-versionurl")));
                    return false;
                };
            }
        });
    }
};

const Robustify = robustify;

