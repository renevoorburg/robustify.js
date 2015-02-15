<?php 
/**
 * statuscode.php
 *
 * Returns a json representation of the sequence of statuscodes and
 * location headers for a given url.
 * Will try to detect soft 404s using fuzzy hashes if 'soft404detect'
 * parameter has been supplied (requires 'ssdeep' extension).
 *
 * @author René Voorburg <rene@digitopia.nl>
 * @version 1.1
 * @package robustify.js
 *
 * Copyright (c) 2015, René Voorburg
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

define("CURLTIMEOUT", 3); // timeout in seconds for curl requests
define("MAXFOLLOW",   5); // max number of redirects to follow
define("RANDSTRLEN", 22); // length of string used for forced 404s
define("SSDEEPSAME", 95); // ssdeep threshold result considered a 404

/**
 * Returns a header to be used for mimicking a browser in a request.
 * @return array header
 */
function get_browser_header() {
    $header[0] = "Accept: text/xml,application/xml,application/xhtml+xml,text/html;q=0.9,text/plain;q=0.8,image/png,*/*;q=0.5";
    $header[] = "Cache-Control: max-age=0";
    $header[] = "Connection: keep-alive";
    $header[] = "Keep-Alive: 300";
    $header[] = "Accept-Charset: ISO-8859-1,utf-8;q=0.7,*;q=0.7";
    $header[] = "Accept-Language: en-us,en;q=0.5";
    $header[] = "Pragma: "; // browsers keep this blank.
    return $header;
}

/**
 * Obtains headers doing a HEAD request.
 * @param $url
 * @return array $r headers returned by request.
 */
function get_headers_curl($url) {
    // we'll mimic a browser
    $header = get_browser_header();
    $agent    = 'Googlebot/2.1 (+http://www.google.com/bot.html)';
    $referer  = 'http://www.google.com';
    $encoding = 'gzip,deflate';

    $ch = curl_init();

    curl_setopt($ch, CURLOPT_URL,            $url);
    curl_setopt($ch, CURLOPT_HEADER,         true);
    curl_setopt($ch, CURLOPT_NOBODY,         true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_AUTOREFERER,    true);
    curl_setopt($ch, CURLOPT_TIMEOUT,        CURLTIMEOUT);
    
    // mimic a browser, might be required for some sites
    curl_setopt($ch, CURLOPT_USERAGENT,  $agent);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $header);
    curl_setopt($ch, CURLOPT_REFERER,    $referer);
    curl_setopt($ch, CURLOPT_ENCODING,   $encoding);

    // do request
    $r = curl_exec($ch);
    $retry = 0;
    while(curl_errno($ch) == 28 && $retry < 1){
        $r = curl_exec($ch);
        $retry++;
    }
    curl_close($ch);
    $r = explode ("\n", $r);
    return $r;
}

/**
 * Obtains payload from a GET request.
 * @param $url
 * @return mixed $file_contents
 */
function get_contents_curl($url) {
    $header = get_browser_header();

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL,              $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER,   1);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT,   CURLTIMEOUT);

    curl_setopt($ch, CURLOPT_HTTPHEADER, $header);

    $file_contents = curl_exec($ch);
    curl_close($ch);
    return $file_contents;
}

/**
 * Extracts statuscode from response headers
 * @param $headerArr
 * @return int statuscode
 */
function get_statuscode_header($headerArr) {
    return (int)substr($headerArr[0], 9, 3);
}

/**
 * Extracts location from a response header
 * @param $headerArr
 * @return mixed
 */
function get_location_header($headerArr) {
    $ret = null;
    foreach ($headerArr as $header) {
        if (0 === strpos($header, 'Location:')) {
            $ret = substr ($header, 10);
        } 
    }
    return preg_replace('/\r/', '', $ret);
}

/**
 * Returns all consecutive headers following a HEAD requests chain,
 * following location redirects.
 * @param $requestUrl
 * @return array $results
 */
function get_header_array($requestUrl) {
    $results = array();
    $counter = 0;
    $location = $requestUrl;

    while (!empty($location) && ($counter <= MAXFOLLOW)) {
        $counter++;

        $headerArr = get_headers_curl($location);
        $locationHeader = get_location_header($headerArr);
        $statuscode = get_statuscode_header($headerArr);

        $prevLocation = $location;
        $location = $locationHeader;

        // check if location is relative and make it absolute:
        if ($locationHeader && !parse_url($locationHeader, PHP_URL_HOST)) {
            $urlComponentsArr = parse_url($prevLocation);
            $location = $urlComponentsArr['scheme'].'://'.$urlComponentsArr['host'].$location;
        }

        // store results:
        if ($location) {
            $results[] = array( 'statuscode' => $statuscode, 'location' => $location );
        } else {
            $results[] = array( 'statuscode' => $statuscode );
        }
    }
    return $results;
}

/**
 * Uses the requestUrl plus results to output JSON.
 * @param $requestUrl
 * @param $results
 */
function output_JSON($requestUrl, $results) {
    // present result as JSON
    header('Access-Control-Allow-Origin: *');
    header('Content-Type:application/json; charset=UTF-8');
    echo "{\"request\":".json_encode($requestUrl).",";
    echo "\"headers\":".json_encode($results);
    echo "}";
}

/**
 * Creates a random url to force a 404 using host and scheme of $base_url
 * @param $base_url
 * @return string random url
 */
function get_random_url($base_url) {
    $urlComponentsArr = parse_url($base_url);
    return $urlComponentsArr['scheme'].'://'.$urlComponentsArr['host'].'/'.substr(str_shuffle("abcdefghijklmnopqrstuvwxyz"), 0, RANDSTRLEN);
}

/**
 * Tests if last location of results is likely a soft 404, using a fuzzy hash comparison of
 * its contents with contents of a random request.
 * @param $results
 * @return mixed $results Last statuscode altered if soft 404 detected.
 */
function test_404($results) {
    $random_url = get_random_url ($results[count($results)-2]['location']);
    $random_contents = get_contents_curl($random_url);
    $requested_contents = get_contents_curl($results[count($results)-2]['location']);

    $similarity = ssdeep_fuzzy_compare(ssdeep_fuzzy_hash($random_contents), ssdeep_fuzzy_hash ($requested_contents));
    if ( $similarity > SSDEEPSAME ) {
        $results[count($results)-1]['statuscode'] = 404;
        $results[count($results)-1]['soft404']    = $similarity;
    }
    return $results;
}


if (isset($_GET["url"])) {

    $requestUrl = $_GET["url"];
    $results = get_header_array($requestUrl);

    if ( isset($_GET["soft404detect"])                                                  # soft-404 detect is asked for
          && count($results) > 1                                                        # & there has been at least 1 redirect
          && $results[count($results)-1]['statuscode'] == 200                           # & a 200 status code has been returned
          && parse_url($results[count($results)-2]['location'], PHP_URL_PATH) != '/'    # & skip if redirect to home , fix #4
    ) {
        $results = test_404($results);
    }

    output_JSON($requestUrl, $results);

} else {
    echo "Error: no url provided. Example usage: http://".$_SERVER['SERVER_NAME'].$_SERVER['PHP_SELF']."?soft404detect&url=http%3A%2F%2Fnu.nl%2F ";
}
