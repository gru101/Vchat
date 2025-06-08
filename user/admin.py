from django.contrib import admin
from user.models import User, Invitation, Friendship
from django.contrib.auth.admin import UserAdmin
# Register your models here.
admin.site.register(User, UserAdmin)
admin.site.register(Invitation)
admin.site.register(Friendship)