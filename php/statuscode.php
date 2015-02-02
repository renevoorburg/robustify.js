<?php 
/** 
* statuscode.php
* Returns a JSON representation of the sequence of statuscodes and locations headers
* requesting an URL. Required service for robustify.js.
*  
* @author René Voorburg <rene@digitopia.nl>
* @version 1.0
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

if (isset($_GET["url"])) {

    // initializations:
    define("MAXFOLLOW", 5);

    stream_context_set_default(
        array(
            'http' => array(
                'method' => 'HEAD'
            )
        )
    );
    $results = array();
    $counter = 0;

    $requestUrl = urldecode($_GET["url"]);
    $location = $requestUrl;
    
    while (!empty($location) && ($counter <= MAXFOLLOW)) {
        $counter++;
        
        $headers = get_headers($location, 1);
        preg_match('#HTTP/\d+\.\d+ (\d+)#', $headers[0], $matches);
        $statuscode = (int)$matches[1];
        $location = isset($headers['Location']) ? $headers['Location'] : '';

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
