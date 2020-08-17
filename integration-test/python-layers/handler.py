import json


def hello(event, context):
    return {
        "message": "Hello Lumigo!",
        "event": event
    }

