<?php

require_once "config.php";

class FetchResponse {
    public int $status;
    public bool $ok;
    public array $headers;
    public string $body;

    public function __construct($status, $ok, $headers, $body) {
        $this->status = $status;
        $this->ok = $ok;
        $this->headers = $headers;
        $this->body = $body;
    }

    public function json() {
        return json_decode($this->body, true);
    }

    public function text() {
        return $this->body;
    }
}

/**
 * A JavaScript-like fetch() implementation in PHP using cURL.
 *
 * This function mimics the behavior of the JS `fetch()` API as closely as possible.
 * It supports HTTP methods (GET, POST, PUT, DELETE, etc.), custom headers, JSON
 * request/response handling, and returns an object with status, headers, body, and
 * helper methods for JSON and text parsing.
 *
 * @param string $url     The URL to request.
 * @param array  $options Optional configuration array:
 *                        - method (string): HTTP method (default: 'GET').
 *                        - headers (array): Associative array of headers (e.g., ['Content-Type' => 'application/json']).
 *                        - body (mixed): Request body. Can be a string or array.
 *                                      If array and Content-Type is application/json, it will be JSON-encoded.
 *                        - timeout (int): Request timeout in seconds (default: 30).
 *
 * @return object An object with the following properties:
 *                - status (int): HTTP response status code.
 *                - ok (bool): True if status is in the range 200-299, false otherwise.
 *                - headers (array): Associative array of response headers.
 *                - body (string): Raw response body.
 *                - json() (callable): Returns the response body decoded as JSON (associative array).
 *                - text() (callable): Returns the raw response body as a string.
 *
 * Example usage:
 * $response = fetch('https://jsonplaceholder.typicode.com/posts/1');
 * if ($response->ok) {
 *     print_r($response->json());
 * } else {
 *     echo "Request failed with status: {$response->status}";
 * }
 */
function fetch(string $url, array $options = []): object {
    $ch = curl_init();

    // Default options
    $method = strtoupper($options['method'] ?? 'GET');
    $headers = $options['headers'] ?? [];
    $body = $options['body'] ?? null;
    $timeout = $options['timeout'] ?? 30;

    // Configure cURL
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

    // Bypass SSL verification
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

    // Handle body (JSON or raw)
    if ($body !== null) {
        if (is_array($body) && (isset($headers['Content-Type']) && stripos($headers['Content-Type'], 'application/json') !== false)) {
            $body = json_encode($body);
        }
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }

    // Convert headers to correct format
    $formattedHeaders = [];
    foreach ($headers as $key => $value) {
        $formattedHeaders[] = "$key: $value";
    }
    if (!empty($formattedHeaders)) {
        curl_setopt($ch, CURLOPT_HTTPHEADER, $formattedHeaders);
    }

    // Capture headers and body
    curl_setopt($ch, CURLOPT_HEADER, true);

    $response = curl_exec($ch);
    $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    $headerString = substr($response, 0, $headerSize);
    $bodyString = substr($response, $headerSize);

    // Parse headers into associative array
    $headersArray = [];
    foreach (explode("\r\n", trim($headerString)) as $i => $line) {
        if ($i === 0) continue; // Skip HTTP/1.1 200 OK line
        if (strpos($line, ': ') !== false) {
            list($key, $value) = explode(': ', $line, 2);
            $headersArray[$key] = $value;
        }
    }

    curl_close($ch);

    return new FetchResponse($status, $status >= 200 && $status < 300, $headersArray, $bodyString);
}