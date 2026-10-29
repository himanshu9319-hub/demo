from django.contrib import admin
from django.urls import include, path
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"status": "ok", "service": "QueueFree API", "mode": "demo"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include("queue_api.urls")),
    path("health/", HealthView.as_view(), name="health"),
]
