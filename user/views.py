from django.shortcuts import render, redirect
from django.urls import reverse
from django.contrib.auth import authenticate, login, logout
from user.models import User, Invitation, Friendship
from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.http import JsonResponse
import redis
import os 
from dotenv import load_dotenv

load_dotenv()
Host=os.environ.get("UPSTASH_REDIS_HOST")
Port=os.environ.get("UPSTASH_REDIS_PORT")
Password=os.environ.get("UPSTASH_REDIS_KEY")

def redis_conn(host, port, password):
    r = redis.Redis(host=host,
                    port=port, 
                    password=password,
                    decode_responses=True,
                    ssl=True)

    return r 

_redis = redis_conn(host= Host, port=Port, password=Password)
_username = ""

# Create your views here.
def register(request):
    print("Register view called")
    if request.method == 'POST':
        username = request.POST.get('username').replace(" ","")
        first_name = request.POST.get('firstname').replace(" ","")
        last_name = request.POST.get('lastname').replace(" ","")
        password = request.POST.get('password').replace(" ","")
        
        print(username, first_name, last_name, password)
        first_name = first_name[0].upper() + first_name[1:]
        last_name = last_name[0].upper() + last_name[1:]

        if User.objects.filter(username=username).exists():
            return render(request=request, template_name= 'register.html',context={'error': 'Username already exists. Pick a different username.'})
        
        if username and first_name and last_name and password:
            user = User.objects.create_user(username=username, password=password, first_name=first_name, last_name=last_name)
            print(f"User created: {user}, password hash: {user.password}")
            return render(request=request, template_name='register.html', context={'success': 'User created'})
            
    return render(request=request, template_name='register.html')

def user_login(request):
    print("Login view called")
    if request.method == 'POST':
        username = request.POST.get('username')
        _username = username
        password = request.POST.get('password')
        user = authenticate(username=username, password=password)

        if user is not None:
            login(request, user)
            return redirect(reverse('home'))
        else:
            return render(request=request, template_name='login.html', context={'msg': 'Invalid username or password.'})
    return render(request=request, template_name='login.html')

@login_required(redirect_field_name='login')
def user_logout(request):
    print(_username)
    logout(request)
    return redirect('login')

@login_required(redirect_field_name='login')
def home(request):
    
    print("rediss://:{key}@{host}.upstash.io:{port}".format(key=Password, host=Host, port=Port))
    user = request.user

    # Pending invitations (users who sent you an invitation)
    pending_invitations = Invitation.objects.filter(receiver=user, status="pending").select_related('sender')
    invitations = [inv.sender for inv in pending_invitations]

    # Friends: users with whom you have a Friendship (either side)
    friendships = Friendship.objects.filter(Q(user1=user) | Q(user2=user)).select_related('user1', 'user2')

    accepted_friends = []
    for friendship in friendships:
        if friendship.user1 == user:
            accepted_friends.append(friendship.user2)
        else:
            accepted_friends.append(friendship.user1)

    context = {
        'user': user,
        'Invitations': invitations,
        'AcceptedFriends': accepted_friends,
    }
    return render(request, 'home.html', context)

@login_required(redirect_field_name='login')
def deleteAccount(request):
    print("deleteAccount view called")
    print("delete account method called")
    if request.method == 'POST':
        print("delete account method called")
        print(f"Deleting account: {request.user.username}")
        request.user.delete()
    return redirect('home') 

def search_friends(request):
    print("search_friends view called")
    sender_id = None 
    if request.user.is_authenticated:
        sender_id = request.user.pk
    if request.method == "POST":
        friend_id = request.POST.get('FriendID')
        msg = "Invalid ID"
        print("friend_id", friend_id, "sender_id", sender_id)

        if str(sender_id) == str(friend_id):
            return render(request=request, template_name='home.html', context={'msg': msg})
        try:
            friend = User.objects.get(pk=friend_id)
            return render(request=request, template_name='home.html', context={"Friends":[friend]})
        except:
            return render(request=request, template_name='home.html', context={'msg': msg })
    return render(request=request, template_name='home.html')   
     
def send_invitation(request):
    print("send_invitation view called")
    sender_id = None
    if request.user.is_authenticated:
        sender_id = request.user.pk

    if request.method == "POST":
        receiver_id = request.POST.get("receiver_id")
        if Invitation.objects.filter(sender_id=sender_id, receiver_id=receiver_id).exists():
            return render(request=request, template_name='home.html',context={'msg':"Invitation already sent"})
        invitation = Invitation(sender_id=sender_id, receiver_id=receiver_id)
        invitation.save()
        return render(request=request, template_name='home.html')
    
    return render(request=request, template_name='home.html')

def accept_invitation(request):
    print("accept_invitation view called")
    receiver_id = None 
    if request.user.is_authenticated:
        receiver_id = request.user.pk
    if request.method == "POST":
        sender_id = request.POST.get("sender_id")
        response = request.POST.get("action")
        print("sender_id", sender_id, "receiver_id", receiver_id, type(sender_id), type(receiver_id))

        if response == "Accept":
            Invitation.objects.filter(sender_id=sender_id, receiver_id=receiver_id).update(status="accepted")
        if response == "Reject":
            Invitation.objects.filter(sender_id=sender_id, receiver_id=receiver_id).delete()

        q = Q(receiver_id=receiver_id) & Q(status="pending")
        Invitations = Invitation.objects.filter(q).values_list('sender_id',flat=True)
        friends = User.objects.filter(pk__in=Invitations)
    return render(request=request, template_name='home.html', context={'Invitations': friends})

@login_required(redirect_field_name='login')
def get_online_users(request):
    try:
        user = request.user
        # Get all friends (user1 or user2)
        friendships = Friendship.objects.filter(Q(user1=user) | Q(user2=user)).select_related('user1', 'user2')
        friends = set()
        for friendship in friendships:
            if friendship.user1 == user:
                friends.add(friendship.user2.username)
            else:
                friends.add(friendship.user1.username)

        # Get online usernames from Redis using URL connection
        redis_url = f"rediss://:{os.getenv('UPSTASH_REDIS_KEY')}@{os.getenv('UPSTASH_REDIS_HOST')}:{os.getenv('UPSTASH_REDIS_PORT')}"
        r = redis.from_url(redis_url, decode_responses=True, ssl=True)
        
        keys = r.keys("user:*:online")
        online_usernames = {key.split(":")[1] for key in keys}

        # Only online friends
        online_friends = list(friends & online_usernames)
        print("Online friends:", online_friends)
        return JsonResponse({"online_users": online_friends})
    except Exception as e:
        print(f"Redis connection error: {str(e)}")
        return JsonResponse({"online_users": [], "error": "Could not fetch online users"})