"""
ASGI config for Vchat project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.0/howto/deployment/asgi/
"""
from django.core.asgi import get_asgi_application
application = get_asgi_application()

import os
import django
from channels.routing import ProtocolTypeRouter, URLRouter
from django.urls import re_path, path
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
from Vchat.routing import websocket_urlpatterns

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Vchat.settings')
django.setup()


application = ProtocolTypeRouter({
    "http": application,
    "websocket": AllowedHostsOriginValidator(
                    AuthMiddlewareStack(
                        URLRouter(websocket_urlpatterns)
                    )
                ),
            }
    )