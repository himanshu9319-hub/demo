from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return None
    details = response.data
    response.data = {
        "error": {
            "code": getattr(exc, "default_code", "request_error"),
            "message": details if isinstance(details, str) else "The request could not be completed.",
            "details": details if isinstance(details, (dict, list)) else None,
        }
    }
    return response
