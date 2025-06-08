# routing.py
from django.urls import path
from user.consumers import DataExchangeConsumer

websocket_urlpatterns = [
    path("ws/status/", DataExchangeConsumer.as_asgi()),
]
