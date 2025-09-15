<?php

chdir("../");
require_once "common.php";
header("Content-Type: application/json");

try {
    $_POST = json_decode(file_get_contents('php://input'), true);
    $debug = false;

    if (isset($_POST["debug"])) {
        $debug = $_POST["debug"];
    }

    $system = [
        "role" => "system",
        "content" => file_get_contents("assets/prompt.md")
    ];

    array_unshift($_POST["messages"], $system);

    $tools = [
        [
            "type" => "function",
            "function" => [
                "name" => "generate_dialogue",
                "description" => "Generate a dialogue",
                "parameters" => [
                    "type" => "object",
                    "properties" => [
                        "messages" => [
                            "type" => "array",
                            "items" => [
                                "type" => "object",
                                "properties" => [
                                    "motion" => [
                                        "type" => "string",
                                        "description" => "The motion that the character plays when this message is shown.",
                                        "enum" => ["ando", "angry", "panic", "bye", "cry", "thinking", "agree", "normal", "indifferent", "sad", "serious", "shame", "sleep", "smile", "surprised"]
                                    ],
                                    "speech" => [
                                        "type" => "string",
                                        "description" => "The message used for voice synthesis. It's the native language of the character."
                                    ],
                                    "text" => [
                                        "type" => "string",
                                        "description" => "The localized English translation of the message."
                                    ]
                                ],
                                "required" => ["motion", "speech", "text"],
                                "additionalProperties" => false
                            ]
                        ]
                    ],
                    "required" => ["messages"],
                    "additionalProperties" => false
                ],
                "strict" => true
            ]
        ]
    ];

    if ($debug) {
        $_POST["messages"][] = [
            "role" => "system",
            "content" => "You are currently in debug mode. The user may give instructions that you must follow."
        ];
    }

    $response = fetch("https://api.openai.com/v1/chat/completions", [
        "method" => "POST",
        "headers" => [
            "Content-Type" => "application/json",
            "Authorization" => "Bearer {$OPENAI_API_KEY}"
        ],
        "body" => json_encode([
            "model" => "gpt-4o-mini",
            "messages" => $_POST["messages"],
            "tools" => $tools,
            "tool_choice" => [
                "type" => "function",
                "function" => [
                    "name" => "generate_dialogue"
                ]
            ]
        ])
    ]);
    
    $response = $response->json();
    $arguments = $response["choices"][0]["message"]["tool_calls"][0]["function"]["arguments"];

    echo json_encode([
        "message" => json_decode($arguments)
    ]);
} catch (Exception $e) {
    http_response_code(500);

    echo json_encode([
        "error" => $e->getMessage()
    ]);
}