<?php 
/** 
 statuscode.php
 returns a json representation of the sequence of statuscodes and locations headers
 
 Copyright (c) 2015, René Voorburg

 Permission is hereby granted, free of charge, to any person
 obtaining a copy of this software and associated documentation
 files (the "Software"), to deal in the Software without
 restriction, including without limitation the rights to use,
 copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the
 Software is furnished to do so, subject to the following
 conditions:

 The above copyright notice and this permission notice shall be
 included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 OTHER DEALINGS IN THE SOFTWARE.
 
 */

function get_headers_curl($url) {
    $ch = curl_init();

    curl_setopt($ch, CURLOPT_URL,            $url);
    curl_setopt($ch, CURLOPT_HEADER,         true);
    curl_setopt($ch, CURLOPT_NOBODY,         true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT,        15);
    
    // setting a user agent was required for http://tdphotos.skyrock.com/3019645921-Une-installation-portuaire-d-epoque-romaine-a-Pommeroeul.html
    curl_setopt($ch, CURLOPT_USERAGENT, 'Googlebot/2.1 (+http://www.google.com/bot.html)');

    $r = curl_exec($ch);
    $r = split("\n", $r);
    return $r;
} 

function get_statuscode_header($headerArr) {
    return (int)substr($headerArr[0], 9, 3);
}

function get_location_header($headerArr) {
    $ret = null;
    foreach ($headerArr as $header) {
        if (0 === strpos($header, 'Location:')) {
            $ret = substr ($header, 10);
        } 
    }
    return  preg_replace('/\r/', '', $ret);
}



if (isset($_GET["url"])) {

    // initializations:
    define("MAXFOLLOW", 5);

    $results = array();
    $counter = 0;

    $requestUrl = urldecode($_GET["url"]);
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

    // present result as JSON
    header('Access-Control-Allow-Origin: *');
    header('Content-Type:application/json; charset=UTF-8');
    
    echo "{\"request\":".json_encode($requestUrl).",";
    echo "\"headers\":".json_encode($results);
    echo "}";
    
} else {
    echo "Error: no url provided. Example usage: http://".$_SERVER['SERVER_NAME'].$_SERVER['PHP_SELF']."?url=http%3A%2F%2Fnu.nl%2F ";   
}
