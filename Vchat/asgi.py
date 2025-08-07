"""
ASGI config for Vchat project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.0/howto/deployment/asgi/
"""



import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Vchat.settings')
django.setup()

from channels.routing import ProtocolTypeRouter, URLRouter
from django.urls import re_path, path
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
from Vchat.routing import websocket_urlpatterns
from django.core.asgi import get_asgi_application


django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
                    AuthMiddlewareStack(
                        URLRouter(websocket_urlpatterns)
                    )
                ),
            }
    )