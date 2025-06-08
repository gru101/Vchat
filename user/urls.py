from django.urls import path 
from user.views import register, user_login, user_logout, home, deleteAccount, search_friends, send_invitation, accept_invitation,get_online_users

urlpatterns = [
    path('', register, name='register'),
    path('home/', home, name='home'),
    path('login/', user_login, name='login'),
    path('logout/', user_logout, name='logout'),
    path('delete-account/', deleteAccount, name='delete_account'),
    path('friends/search/', search_friends, name='search_friends'),
    path('invitations/send/', send_invitation, name='send_invitation'),
    path('invitations/accept/', accept_invitation, name='accept_invitation'),
    path('home/api/online_users', get_online_users, name='get_online_users' ),
]
