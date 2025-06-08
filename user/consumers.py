# consumers.py
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.layers import get_channel_layer
from django.contrib.auth.models import AnonymousUser
from asgiref.sync import sync_to_async
import json

import redis.asyncio
import redis.asyncio
from user.models import User, Invitation, Friendship
from django.utils import timezone
from django.db.models import Q
from channels.layers import get_channel_layer
import redis
import os 
from dotenv import load_dotenv

load_dotenv()

class DataExchangeConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']
        self.username = self.user.username
        await self.accept()
        print("Username who just logged in:- ",self.username, type(self.username))
        # Join the online_users group
        await self.channel_layer.group_add("online_users", self.channel_name)
        await self.channel_layer.group_add(self.username, self.channel_name)
            
        Host=os.environ.get("UPSTASH_REDIS_HOST")
        Port=os.environ.get("UPSTASH_REDIS_PORT")
        Password=os.environ.get("UPSTASH_REDIS_KEY")
                
        self.redis = redis.Redis(host=Host, 
                                port=Port, 
                                password=Password, 
                                decode_responses=True, 
                                ssl=True)

        self.redis.set(f"user:{self.username}:online", 1)

        # Broadcast user's online status to all connected users
        await self.channel_layer.group_send(
                'online_users',
                {
                    'type': 'user_status_update',
                    'username': self.username,
                    'status': 'online'
                }
            )

            # Send connection confirmation
        await self.send(text_data=json.dumps({
                'type': 'connection_established',
                'message': 'Connected to the WebSocket',
                'username': self.username
            }))

        # Get and send current online users list
        keys = self.redis.keys("user:*:online")
        online_usernames = {key.split(":")[1] for key in keys}
        await self.send(text_data=json.dumps({
            'type': 'online_users_list',
            'users': list(online_usernames)
        }))

        await self.channel_layer.group_send(
                'online_users',
                {
                    'type': 'broadcast_online_users',
                    'users': list(online_usernames)
                }
            )
        print(f"User {self.username} connected. Channel name: {self.channel_name}")


    async def broadcast_online_users(self, event):
        await self.send(text_data=json.dumps({
            'type': 'online_users_list',
            'users': event['users']
        }))

    async def disconnect(self, close_code):
        self.redis.delete(f"user:{self.username}:online")
        await self.channel_layer.group_discard("online_users", self.channel_name)
        await self.channel_layer.group_discard(self.username, self.channel_name)

        if hasattr(self, 'redis') and self.redis:
            self.redis.delete(f"user:{self.username}:online")
                
            # Get updated online users list
            keys = self.redis.keys("user:*:online")
            online_usernames = {key.split(":")[1] for key in keys}
                
            # Broadcast updated online users list
            await self.channel_layer.group_send(
                "online_users",
                {
                    'type': 'broadcast_online_users',
                    'users': list(online_usernames)
                }
            )

        # await self.channel_layer.group_send(
        #     'online_users',
        #         {
        #         'type' : 'user_status_update',
        #         'username' : self.username,
        #         'status' : 'offline',
        #         }
        #     )
        print(f"{self.username} Disconnected")

    async def receive(self, text_data):
        print("Received data:", text_data)
        # received_data is the data sent from the frontend
        received_data = json.loads(text_data)
        type = received_data.get("type")
        print(type)

        if type == 'SearchFriend':
            await self.SearchFriend(received_data)
        elif type == 'SendInvitation':
            await self.SendInvitation(received_data)
        elif type == 'ProcessInvitation':
            await self.ProcessInvitation(received_data)
        elif type == 'GetFriends':
            await self.GetFriends()
        elif type == 'sdp_offer':
            await self.SendSDPoffer(received_data)
        elif type == 'sdp_answer':
            await self.SendSDPanswer(received_data)
        elif type == 'ice_candidate':
            await self.SendICEcandidate(received_data)
        elif type == 'refresh_invitations':
            await self.refresh_friends()
        elif type == 'incoming_call':
            await self.handle_incoming_call(received_data)
        elif type == 'call_accepted':
            await self.handle_call_accepted(received_data)
        elif type == 'call_rejected':
            await self.rejected_call(received_data)
        elif type == 'call_ended':
            await self.handle_call_ended(received_data)

    async def user_status_update(self, event):
        await self.send(text_data=json.dumps(event))

    async def SearchFriend(self, data):
        print("SearchFriends called with data:", data)
        user = self.scope['user']
        sender_username = str(user).split(",")[0].strip()
        receiver_username = data.get('FriendID')

        sender = await sync_to_async(User.objects.get)(username=sender_username)
        receiver_check = await sync_to_async(User.objects.filter(username=receiver_username).exists)()
        receiver = None
        if receiver_check:
            receiver = await sync_to_async(User.objects.get)(username=receiver_username)
        else:
            await self.send(text_data=json.dumps({
                'type' : 'error',
                'message' : 'User does not exist',
            }))

        print(sender_username, receiver_username)
        if sender_username == receiver_username:
            await self.send(text_data=json.dumps({'type': 'error', 'message': 'Invalid username'}))
        elif await sync_to_async(Friendship.objects.filter(
                                (Q(user1=sender) & Q(user2=receiver)) | 
                                (Q(user1=receiver) & Q(user2=sender))).exists)():
            print("Friendship already exists")
            await self.send(text_data=json.dumps({'type': 'error', 'message': ' Already a Friend'}))
        elif await sync_to_async(Invitation.objects.filter(sender=sender, receiver=receiver).exists)():
            await self.send(text_data=json.dumps({
                'type' : 'error',
                'message' : 'Friend request already sent',
            }))
        elif receiver_username:
            receiver = await sync_to_async(User.objects.filter(username=receiver_username).first)()
            if receiver:
                print("Found user:", receiver)
                await self.send(text_data=json.dumps({'type': 'search_result', 'found': True, 'username': receiver.username, 'first_name': receiver.first_name, 'last_name': receiver.last_name}))
            else:
                print("No user found")
                await self.send(text_data=json.dumps({'type': 'search_result', 'found': False}))
        else:
            print("No username provided for SearchFriends")
            await self.send(text_data=json.dumps({'type': 'error', 'message': 'No username provided'}))

    async def SendInvitation(self, data):
        user = self.scope['user']
        sender_username = str(user).split(",")[0].strip()
        receiver_username = data.get('username')    
        print(sender_username)
        print(receiver_username)

        sender = await sync_to_async(User.objects.get)(username=sender_username)
        receiver = await sync_to_async(User.objects.get)(username=receiver_username)

        if await sync_to_async(Invitation.objects.filter(sender=sender, receiver=receiver,status='Pending').exists)():
            await self.send(text_data=json.dumps({'type': 'error', 'message': 'Invitation already sent'}))
        else:
            invitation = await sync_to_async(Invitation.objects.create)(sender=sender, receiver=receiver)
            print("invitation sent")
            await self.send(text_data=json.dumps({'type': 'invitation_sent', 'message': 'Invitation sent successfully'}))
            await self.channel_layer.group_send(
                receiver_username, 
                {
                    'type' : 'refresh.invitations'
                })
            
    async def refresh_invitations(self, event):
        await self._send_invitations()

    async def _send_invitations(self):
        print("invitations refreshed")
        pending_invitations = await sync_to_async(list)(
            Invitation.objects.filter(receiver=self.user, status="pending").select_related('sender')
        )
        invitations = []
        for inv in pending_invitations:
            invitations.append({
                'username': inv.sender.username,
                'first_name': inv.sender.first_name,
                'last_name': inv.sender.last_name,
            })
        await self.send(text_data=json.dumps({
            'type': 'refresh_invitations',
            'invitations': invitations
        }))

    async def ProcessInvitation(self, data):
        user = self.scope['user']
        status = data.get('status')
        sender_username = data.get('sender_username')
        receiver_username = str(user).split(",")[0].strip()

        print(status, sender_username, receiver_username)
        sender = await sync_to_async(User.objects.get)(username=sender_username)
        receiver = await sync_to_async(User.objects.get)(username=receiver_username)

        if status == 'Accept':
            # Only create friendship if it doesn't exist
            exists = await sync_to_async(Friendship.objects.filter(user1=receiver, user2=sender).exists)()
            if not exists:
                await sync_to_async(Friendship.objects.create)(user1=receiver, user2=sender)
            await sync_to_async(Invitation.objects.filter(sender=sender, receiver=receiver).update)(status='accepted', date_accepted=timezone.now())
            await self.send(text_data=json.dumps({'type': 'invitation_processed', 'message': 'Invitation accepted'}))
            await self.channel_layer.group_send(
                sender_username, 
                {
                    'type' : 'refresh.friends'
                }
            )
        elif status == 'Reject':
            await sync_to_async(Invitation.objects.filter(sender=sender, receiver=receiver).delete)()
            await self.send(text_data=json.dumps({'type': 'invitation_processed', 'message': 'Invitation rejected'}))
        else:
            await self.send(text_data=json.dumps({'type': 'error', 'message': 'Invalid status'}))
        await self._send_invitations()

    async def refresh_friends(self, event):
        await self.GetFriends()

    async def GetFriends(self):
        print("Get friends consumer")
        user = self.scope['user']
        # Get all friendships where the user is user1 or user2
        friendships = await sync_to_async(list)(
            Friendship.objects.filter(Q(user1=user) | Q(user2=user)).select_related('user1', 'user2')
        )
        friends = []
        for friendship in friendships:
            if friendship.user1 == user:
                friend = friendship.user2
            else:
                friend = friendship.user1
            friends.append({
                'username': friend.username,
                'first_name': friend.first_name,
                'last_name': friend.last_name,
                'status': getattr(friend, 'status', ''),
            })

        await self.send(text_data=json.dumps({
            'type': 'get_friends',
            'friends': friends
        }))

    # Add this new method
    async def handle_call_accepted(self, data):
        await self.channel_layer.group_send(
            data['receiver'],
            {
                'type': 'call.accepted',
                'sender': data['sender']
            }
        )

    async def call_accepted(self, event):
        await self.send(text_data=json.dumps({
            'type': 'call_accepted',
            'sender': event['sender']
        }))

    async def handle_incoming_call(self, data):
        print("handling incoming call", self.username)
        await self.channel_layer.group_send(
            data['receiver'],
            {
                'type' : 'incoming.call',
                'sender': data['sender'],
            }
        )
    
    async def incoming_call(self, data):
        print("sending the incoming to another peer", self.username)
        await self.send(text_data=json.dumps({
                'type' : 'incoming_call',
                'sender': data['sender']
        }))

    async def SendSDPoffer(self, data):        
        await self.channel_layer.group_send(
            data['receiver'],
            {
                'type': 'sdp.offer',
                'offer': data['offer'],
                'sender': data['sender'],
            }
        )

    async def rejected_call(self, data):
        await self.channel_layer.group_send(
            data['sender'],
            {
                'type' : 'call.rejected',
                'sender': data['sender'],
                'receiver' : data['receiver'],
            })

    async def call_rejected(self, data):
        await self.send(text_data=json.dumps({
            'type' : 'call_rejected',
            'sender' : data['sender'],
            'receiver' : data['receiver'],
        }))  

    async def sdp_offer(self, data):
        await self.send(text_data=json.dumps({
            'type': 'sdp_offer',
            'offer': data['offer'],
            'sender':data['sender']
        }))

    # Update the SendSDPanswer method
    async def SendSDPanswer(self, data):
        await self.channel_layer.group_send(
            data['receiver'],  # Changed from data['receiver']
            {
                'type': 'sdp.answer',
                'answer': data['answer'],
                'sender': data['sender'],  # Changed from data['sender']
            }
        )
    
    async def sdp_answer(self, event):
        await self.send(text_data=json.dumps({
            'type': 'sdp_answer',
            'answer': event['answer'],
            'sender': event['sender']
        }))

    async def SendICEcandidate(self, data):
        await self.channel_layer.group_send(
            data['receiver'],
            {
                'type': 'ice.candidate',
                'candidate': data['candidate'],
                'sender': data['sender']  # Changed from data['sender']
            }
        )
    
    async def ice_candidate(self, event):
        await self.send(text_data=json.dumps({
            'type': 'ice_candidate',
            'candidate': event['candidate'],
            'sender': event['sender']
        }))

    async def handle_call_ended(self, data):
        print("Call ended", data)
        await self.channel_layer.group_send(
            data['receiver'],
            {
                'type': 'call.ended',
                'sender': data['sender']
            }
        )
    
    async def call_ended(self, event):
        await self.send(text_data=json.dumps({
            'type': 'call_ended',
            'sender': event['sender']
        }))