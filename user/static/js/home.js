function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
const csrf_token = getCookie('csrftoken')

const closeAccount = document.querySelector("#closeAccountDetails");
const deleteAccountButton = document.querySelector("#deleteAccountButton");
const deleteAccountForm = document.querySelector("#deleteAccountForm");
const deleteAccountDialog = document.querySelector("#deleteAccountDialog");
const deleteAccountConfirm = document.querySelector("#deleteAccountConfirm");
const deleteAccountCancel = document.querySelector("#deleteAccountCancel");

const logoutAccountButton = document.querySelector("#logoutAccountButton");
const logoutAccountForm = document.querySelector("#logoutAccountForm");
const logoutAccountDialog = document.querySelector("#logoutAccountDialog");
const logoutAccountConfirm = document.querySelector("#logoutAccountConfirm");
const logoutAccountCancel = document.querySelector("#logoutAccountCancel");

const FriendID = document.querySelector("#FriendID");
const friendNotFound = document.querySelector("#friendNotFound");
const Result = document.querySelector("#Result");

const friendsButton = document.querySelector("#friendsButton");
const user = document.querySelector("#user")
const addfriend = document.querySelector("#addFriend");
const invitationButton = document.querySelector("#invitationsButton");
const InvitationList = document.querySelector(".InvitationList");

const call = document.querySelector("#c1"); 
const Invitations = document.querySelector(".Invitations")
const AccountDetails = document.querySelector(".AccountDetails");

const CallSection = document.querySelector(".CallSection");
const CallControls = document.querySelector(".CallControls");
const endcall = document.querySelector("#endcall");
const mic = document.querySelector("#mic");
const camera = document.querySelector("#camera");

const AddFriend = document.querySelector(".AddFriend");
const Menus = document.querySelector(".Menus")
const closeInvitations = document.querySelector("#closeInvitations");
const searchFriendButton = document.querySelector("#searchFriendButton");
const searchFriendForm = document.querySelector("#searchFriendForm");
const Results = document.querySelector(".Results");
const Invitation = document.querySelector(".Invitation");
const FriendList = document.querySelector(".FriendList");
const Friend = document.querySelector(".Friend");
const incomingCallDialog = document.querySelector("#incomingCallDialog");
const callerName = document.querySelector("#callerName");

const acceptCall = document.querySelector("#acceptCall");
const rejectCall = document.querySelector("#rejectCall");
const remoteVideo = document.querySelector("#remoteVideo");
const localVideo = document.querySelector("#localVideo");

const logout = document.querySelector("#logoutAccount");

const closefriend = document.querySelector("#closeAddFriend")
const main = document.querySelector(".Main");

const username_and_id = document.querySelector("#username_and_id");
const findFriend = document.querySelector(".FindFriend")

if (!incomingCallDialog) {
    console.error("Warning: Incoming call dialog not found in the DOM");
}

let online_users = [];
fetch("api/online_users").then(res => res.json()).then(data => {
        online_users = data.online_users
    })
    .catch(error => {
        console.error("Error fetching online users.");
        online_users = [];
    })

let protocol = window.location.protocol === "https:" ? "wss" : "ws";
let socket = new WebSocket(`${protocol}://${window.location.host}/ws/status/`);
let username = "username"
let receiver_username = null;
let sender = "sender"

let iceCandidatesQueue = [];

socket.addEventListener("open", (event) => {
  console.log("WebSocket connection opened");
});

socket.onmessage = async (e) => {
    let data = JSON.parse(e.data);
    console.log("message from server", data)
    let result = "";

    if (data.type == "search_result") {
        if (data.found == true) {
            console.log("found : ", data.found)
            result = `
                <form class="Result">
                    <div class="Info">
                        <p>${data.first_name} ${data.last_name}</p>
                        <p>${data.username}</p>
                    </div>
                    <input type="hidden" name="username" value="${data.username}">
                    <input type="hidden" name="csrfmiddlewaretoken" value="${csrf_token}">  
                                     
                    <button type="submit" id="">
                        <img src="/static/img/send.svg" alt=""> 
                    </button>
                </form>`;
            Results.innerHTML = "";
            Results.insertAdjacentHTML("afterbegin",result);
        }
    }

    if (data.type == "invitation_sent") {
        Results.innerHTML = "";
        alert(data.message);
    }

    if (data.type == "error") {
        alert(data.message);
    }

    if (data.type == "get_friends") {
        console.log("get friends")
        GetFriends(data.friends);
    }

    if (data.type == "connection_established") {
        username = data.username;
        console.log("Connected as:", username);
    }

    if (data.type === 'ice_candidate') {
        console.log("Received ICE candidate");
        if (data.candidate) {
            try {
                if (pc.remoteDescription && pc.remoteDescription.type) {
                    // If we have a remote description, add candidate immediately
                    await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                    console.log("Added ICE candidate immediately");
                } else {
                    // Queue the candidate for later
                    iceCandidatesQueue.push(data.candidate);
                    console.log("Queued ICE candidate for later");
                }
            } catch (err) {
                console.error("Error handling ICE candidate:", err);
            }
        }
    }

    if (data.type === 'sdp_offer') {
        console.log("Received SDP offer");
        await answer(data.offer, username, data.sender);
    }

    if (data.type === 'sdp_answer') {
        console.log("Received SDP answer");
        const answerDesc = new RTCSessionDescription(data.answer);
        await pc.setRemoteDescription(answerDesc);
    }

    if (data.type == "refresh_invitations") {
        RefreshInvitations(data.invitations)
    }

    if (data.type == "user_status_update") {
        if (!Array.isArray(online_users)) {
            online_users = []; // Ensure it's an array
        }
        
        if (data.status === "online") {
            if (!online_users.includes(data.username)) {
                online_users.push(data.username);
            }
        } else if (data.status === "offline") {
            online_users = online_users.filter(u => u !== data.username);
        }
        socket.send(JSON.stringify({'type': 'GetFriends'}));
    }

    if (data.type === "online_users_list") {
        online_users = data.users;
        console.log("Online users updated:", online_users);
        updateFriendsStatus();
    }

    if (data.type === "user_status_update") {
        console.log("User status update:", data);
        if (data.status === "online") {
            if (!online_users.includes(data.username)) {
                online_users.push(data.username);
            }
        } else if (data.status === "offline") {
            online_users = online_users.filter(u => u !== data.username);
        }
        console.log("Updated online users:", online_users);
        updateFriendsStatus();
    }
    
// Update the socket message handler for incoming calls
    if (data.type == "incoming_call") {
        if (isInCall) {
            // Send busy status back to caller
            socket.send(JSON.stringify({
                'type': 'user_busy',
                'sender': username,
                'receiver': data.sender,
                'message': `${username} is currently in another call`
            }));
            return;
        }
        receiver_username = data.sender;
        if (window.matchMedia("(max-width: 427px)").matches){
            FriendList.classList.add("Hide");
            CallSection.classList.remove("Hide");
            CallControls.classList.remove("Hide");
        }
        incomingCallDialog.showModal();
        document.getElementById('callerName').textContent = data.sender;
    }

    if (data.type === "user_busy") {
        alert(data.message);
        cleanupCall();
    }

    if (data.type === "call_accepted") {
        if(window.matchMedia("(max-width: 427px)").matches) {
            if (CallSection.classList.contains("Hide")){
                CallSection.classList.remove("Hide")
            }
            if (CallControls.classList.contains("Hide")){
                CallSection.classList.remove("Hide")
            }
        }
    }

    if (data.type == "call_rejected") {
        alert('Call was rejected');
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }
        receiver_username = null;
    }

    if (data.type === "call_ended") {
        console.log("Call ended by remote peer");
        if (isCallActive) {
            alert('Call Ended');
        }
        cleanupCall();
    }
};

if (acceptCall) {
    acceptCall.addEventListener("click", async (e) => {
        try {
            isCallActive = true;
            isInCall = true; 
            await Offer(username, receiver_username);
            incomingCallDialog.close();
            await initMedia();
            
            socket.send(JSON.stringify({
                'type': 'call_accepted',
                'sender': username,
                'receiver': receiver_username
            }));

            if (window.matchMedia("(max-width: 427px)").matches) {
                FriendList.classList.add("Hide");
                CallSection.classList.remove("Hide");
                CallControls.classList.remove("Hide");
            }
        } catch (error) {
            console.error("Error accepting call:", error);
            isCallActive = false;
            isInCall = false; // Reset busy state on error
            cleanupCall();
        }
    });
}

if (rejectCall) {
    rejectCall.addEventListener("click", (e) => {
        incomingCallDialog.close();
        socket.send(JSON.stringify({
            'type': 'call_rejected',
            'sender': username,
            'receiver': receiver_username
        }));
        receiver_username = null; // Clear stored username
        if (window.matchMedia("(max-width: 427px)").matches){
            FriendList.classList.remove("Hide");
            CallSection.classList.add("Hide");
            CallControls.classList.add("Hide");
        }
    });
}

// Update the updateFriendsStatus function
function updateFriendsStatus() {
    console.log("Updating friends status. Online users:", online_users);
    const friendElements = document.querySelectorAll('.Friend');
    friendElements.forEach(friendEl => {
        const username = friendEl.querySelector('input[name="username"]').value;
        const statusEl = friendEl.querySelector('.Info p:last-child');
        const isOnline = online_users.includes(username);
        console.log(`Friend ${username} online status:`, isOnline);
        statusEl.innerHTML = `<span class="online-status ${isOnline ? 'online' : 'offline'}">${isOnline ? 'Online' : 'Offline'}</span>`;
    });
}

// Update the GetFriends function's template
function GetFriends(friends) {
    let html = "";
    FriendList.innerHTML = ""; // Clear before adding
    if (friends.length > 0) {
        friends.forEach(friend => {
            const isOnline = online_users && online_users.includes(friend.username);
            html += `
                <form class="Friend">
                    <div class="Info">
                        <p>${friend.first_name} ${friend.last_name}</p>
                        <p>${friend.username}</p>
                        <p><span class="online-status ${isOnline ? 'online' : 'offline'}">${isOnline ? 'Online' : 'Offline'}</span></p>
                    </div>
                    <input type="hidden" name="username" value="${friend.username}">
                    <input type="hidden" name="csrfmiddlewaretoken" value="${csrf_token}">  
                    <button class="callButton" id="${friend.id}" type="submit">
                        <img src="/static/img/video.svg" alt="">
                    </button>
                </form>`;
        });
        FriendList.insertAdjacentHTML('afterbegin', html);
    }
}


function RefreshInvitations(invitations) {
    InvitationList.innerHTML = '';
    if (invitations.length === 0) {
        InvitationList.innerHTML = "<p>No Friend Requests</p>";
        return;
    }
    invitations.forEach((invitation) => {
        html =  `
            <form class="Invitation" id="${invitation.username}_invitation">
                <div class="Info">
                    <p>${invitation.first_name } ${invitation.last_name }</p>
                    <p>${invitation.username} </p>
                </div>
                <input type="hidden" name="sender_username" value="${invitation.username}">
                <button type="submit" name="action" value="Accept">
                    <img src="/static/img/check_square.svg" alt="Accept">
                </button>
                <button type="submit" name="action" value="Reject">
                    <img src="/static/img/x_square.svg" alt="Reject">
                </button>
            </form>`
        InvitationList.insertAdjacentHTML('afterbegin', html);
    })
}

function getFormData(e, type) {
    e.preventDefault(); 
    const obj = {'type': type};
    const formData = new FormData(e.target);

    formData.forEach((value, key) => {obj[key] = value;})
    console.log("From Data: ", obj);
    if (type == "ProcessInvitation") {
        obj['status'] = String(e.submitter.value); 
    }
    socket.send(JSON.stringify(obj)); 
    return obj 
}

Results.addEventListener("submit", function(e) {
    if (e.target.classList.contains("Result")) {
        getFormData(e, "SendInvitation");
    }
});
searchFriendForm.addEventListener("submit", (e) => {getFormData(e, "SearchFriend")});
Invitations.addEventListener("submit", function(e) {
    if (e.target.classList.contains("Invitation")) {
        getFormData(e, "ProcessInvitation");
    }
    socket.send(JSON.stringify({
        'type':'GetFriends'
    }))
});

// Replace the existing pc declaration
let pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
});

// Update track handling
pc.ontrack = (event) => {
    console.log("Remote track received:", event.streams[0]);
    remoteVideo.srcObject = event.streams[0];
};

let localStream = null;
let userMediaConfig = { video: true, audio: true }
async function initMedia() {
    try {
        userMediaConfig['video'] = true;
        userMediaConfig['audio'] = true;
        localStream = await navigator.mediaDevices.getUserMedia(userMediaConfig);
        localVideo.srcObject = localStream;

        // Add tracks to RTCPeerConnection
        localStream.getTracks().forEach(track => {
            pc.addTrack(track, localStream);
        });

        updateTracks();
        CallControls.classList.remove("Hide");
    } catch (err) {
        console.error("Media access denied or error:", String(err.message));
        
        // if (err.name === 'NotReadableError' || err.message.includes('Device in use')) {
        //     console.log("Device in use, falling back to sample video");
        //     localVideo.src = '/static/video/sample.mp4';
        //     localVideo.loop = true;
        //     localVideo.muted = true;
            
        //     try {
        //         await localVideo.play();
        //         // Create a MediaStream from the video element
        //         localStream = localVideo.captureStream();
        //         // Add tracks to RTCPeerConnection
        //         localStream.getTracks().forEach(track => {
        //             pc.addTrack(track, localStream);
        //         });
        //         updateTracks();
        //         CallControls.classList.remove("Hide");
        //     } catch (playError) {
        //         console.error("Error playing sample video:", playError);
        //     }
        // } else {
        //     alert("Could not access camera and microphone");
        // }
    }
}

pc.addEventListener("icecandidate", (e)=>{
    if (e.candidate) {
        socket.send(JSON.stringify({
            'type': 'ice_candidate',
            'candidate' : e.candidate,
            'sender': username,
            'receiver' : receiver_username
        }))
    }
})

async function Offer(sender, receiver) {
    try {        
        receiver_username = receiver;
        isCallActive = true; // Set as soon as you initiate the call
        await initMedia();

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        console.log(`Creating Offer:- Sender: ${sender}, Receiver: ${receiver}`);

        socket.send(JSON.stringify({
            'type': 'sdp_offer',
            'offer': offer,
            'sender': sender,  // Changed from sender
            'receiver': receiver  // Changed from receiver
        }));
    } catch (error) {
        console.error("Error creating offer:", error);
        cleanupCall();
    }
}

async function answer(offer, sender, receiver) {
    try {
        receiver_username = receiver;
        await initMedia();
        
        // Set remote description first
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        console.log("Set remote description successfully");
        
        // Process any queued ICE candidates
        while (iceCandidatesQueue.length > 0) {
            const candidate = iceCandidatesQueue.shift();
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
            console.log("Added queued ICE candidate");
        }
        
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        console.log(`Creating answer:- Sender: ${sender}, Receiver: ${receiver}`);
        
        socket.send(JSON.stringify({
            'type': 'sdp_answer',
            'answer': answer,
            'sender': sender,
            'receiver': receiver
        }));
    } catch (error) {
        console.error("Error in answer function:", error);
    }
}

FriendList.addEventListener("submit", async (e) => {
    if (e.target.classList.contains("Friend")) {
        e.preventDefault();
        const formData = new FormData(e.target);
        let obj = {};
        formData.forEach((value, key) => { obj[key] = value; });
        receiver_username = obj.username;
        
        if (!online_users.includes(receiver_username)) {
            alert(`${receiver_username} is offline`);
            return;
        }

        console.log(`Initiating call to: ${receiver_username}`);
        isCallInitiator = true;
        socket.send(JSON.stringify({
            'type': 'incoming_call',
            'sender': username,
            'receiver': receiver_username,
        }));
    }
});

let videoTrack = null;
let audioTrack = null;

function updateTracks(){
    if (localStream) {
        videoTrack = localStream.getTracks().find(track => track.kind === 'video');
        audioTrack = localStream.getTracks().find(track => track.kind === 'audio');
    }
}

let isCallActive = false;
let isCallInitiator = false;
let isInCall = false;

function cleanupCall() {
    isCallActive = false;
    isCallInitiator = false;
    isInCall = false; // Reset busy state
    receiver_username = null;

    if (localStream) {
        localStream.getTracks().forEach(track => {
            track.stop();
        });
        localStream = null;
    }

    // Stop remote stream
    if (remoteVideo.srcObject) {
        remoteVideo.srcObject.getTracks().forEach(track => track.stop());
        remoteVideo.srcObject = null;
    }

    // Reset video elements
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    
    // Reset call state
    isCallActive = false;
    isCallInitiator = false;
    receiver_username = null;

    // Reset UI for mobile
    if (window.matchMedia("(max-width: 427px)").matches) {
        CallSection.classList.add("Hide");
        CallControls.classList.add("Hide");
        FriendList.classList.remove("Hide");
        main.classList.remove("Hide");
    }
    
    // Reset peer connection
    if (pc) {
        pc.close();
        pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        setupPeerConnectionListeners();
    }
}

endcall.addEventListener("click", () => {
    if (isCallActive) {
        socket.send(JSON.stringify({
            'type': 'call_ended',
            'sender': username,
            'receiver': receiver_username
        }));
    }
    cleanupCall();
});

function setupPeerConnectionListeners() {
    pc.ontrack = (event) => {
        console.log("Remote track received:", event.streams[0]);
        remoteVideo.srcObject = event.streams[0];
    };

    pc.onicecandidate = (e) => {
        if (e.candidate) {
            socket.send(JSON.stringify({
                'type': 'ice_candidate',
                'candidate': e.candidate,
                'sender': username,
                'receiver': receiver_username
            }));
        }
    };

    pc.oniceconnectionstatechange = () => {
        console.log("ICE connection state:", pc.iceConnectionState);
        if (pc.iceConnectionState === 'disconnected' || 
            pc.iceConnectionState === 'failed' || 
            pc.iceConnectionState === 'closed') {
            cleanupCall();
        }
    };
}

// Mic button
mic.addEventListener("click", () => {
    if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        if (audioTrack.enabled) {
            mic.classList.remove('disabled');
            mic.querySelector('img').src = '/static/img/mic.svg'; // Use your enabled mic icon
        } else {
            mic.classList.add('disabled');
            mic.querySelector('img').src = '/static/img/mic_off.svg'; // Use your muted mic icon
        }
    }
});

// Camera button
camera.addEventListener("click", () => {
    if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        if (videoTrack.enabled) {
            camera.classList.remove('disabled');
            camera.querySelector('img').src = '/static/img/camera.svg'; // Use your enabled camera icon
        } else {
            camera.classList.add('disabled');
            camera.querySelector('img').src = '/static/img/camera_off.svg'; // Use your disabled camera icon
        }
    }
});

//This matches for phones
if (window.matchMedia("(max-width: 427px)").matches) {
    friendsButton.classList.add("Hide");

    if (call) {
        call.addEventListener("click", () => {
            CallSection.classList.remove("Hide");
            main.classList.add("Hide");
            FriendList.classList.add("Hide");
        });
    }

    addfriend.addEventListener("click", ()=> {
        AddFriend.classList.toggle("Hide")
        main.classList.toggle("Hide")
        console.log("add friend")
    })

    closefriend.addEventListener("click", ()=> {
        AddFriend.classList.toggle("Hide")
        main.classList.toggle("Hide")
    })

    user.addEventListener("click", ()=> {
        AccountDetails.classList.toggle("Hide")
        main.classList.toggle("Hide")
    })

    closeAccount.addEventListener("click", ()=> {
        AccountDetails.classList.toggle("Hide")
        main.classList.toggle("Hide")
    })

    deleteAccountButton.addEventListener("click", function (e) {
        e.preventDefault();  // Prevent the form from submitting immediately
        console.log("Delete Account Form")
        deleteAccountDialog.showModal();
    });

    // If user confirms 'Yes', submit the form
    deleteAccountConfirm.addEventListener("click", function () {
        console.log("Account deleted")
        AccountDelete.submit();
        deleteAccountDialog.close()
    });

    // If user cancels 'No', hide the dialog
    deleteAccountCancel.addEventListener("click", function () {
        console.log("Account Not deleted")
        deleteAccountDialog.close()
    });

    logoutAccountButton.addEventListener("click", function (e) {
        e.preventDefault();  // Prevent the form from submitting immediately
        logoutAccountDialog.showModal()
    });

    // If user confirms 'Yes', submit the form
    logoutAccountConfirm.addEventListener("click", function () {
        console.log("Account deleted")
        logoutAccountForm.submit()
        logoutAccountDialog.close()
    });

    // If user cancels 'No', hide the dialog
    logoutAccountCancel.addEventListener("click", function () {
        console.log("Account Not logged out")
        logoutAccountDialog.close()
    });

    invitationButton.addEventListener("click", ()=> {
        Invitations.classList.toggle("Hide")
        main.classList.toggle("Hide")
        console.log("invitation button clicked")
    })

    closeInvitations.addEventListener("click", ()=> {
        Invitations.classList.toggle("Hide")
        main.classList.toggle("Hide")
    })
}

//This matches for desktop
if (window.matchMedia("(min-width: 427px)").matches) {
    CallSection.classList.remove("Hide")
    Menus.append(Invitations, AccountDetails, AddFriend)

    function closeAllMenus() {
      Menus.classList.add("Hide")
      FriendList.classList.add("Hide")
      Invitations.classList.add("Hide") 
      AccountDetails.classList.add("Hide") 
      AddFriend.classList.add("Hide")
    }

    deleteAccountButton.addEventListener("click", function (e) {
        e.preventDefault();  // Prevent the form from submitting immediately
        console.log("Delete Account Form")
        deleteAccountDialog.showModal();
    });

    // If user confirms 'Yes', submit the form
    deleteAccountConfirm.addEventListener("click", function () {
        console.log("Account deleted")
        AccountDelete.submit();
        deleteAccountDialog.close()
    });

    // If user cancels 'No', hide the dialog
    deleteAccountCancel.addEventListener("click", function () {
        console.log("Account Not deleted")
        deleteAccountDialog.close()
    });

    logoutAccountButton.addEventListener("click", function (e) {
        e.preventDefault();  // Prevent the form from submitting immediately
        logoutAccountDialog.showModal()
    });

    // If user confirms 'Yes', submit the form
    logoutAccountConfirm.addEventListener("click", function () {
        console.log("Account deleted")
        logoutAccountForm.submit()
        logoutAccountDialog.close()
    });

    // If user cancels 'No', hide the dialog
    logoutAccountCancel.addEventListener("click", function () {
        console.log("Account Not logged out")
        logoutAccountDialog.close()
    });
    
    user.addEventListener("click", () => {
      closeAllMenus();
      if (!AccountDetails.classList.contains("Hide")) {
          AccountDetails.classList.add("Hide");
          Menus.classList.add("Hide");
          FriendList.classList.remove("Hide");
      } else {
          Menus.classList.remove("Hide");
          AccountDetails.classList.remove("Hide");
          
        deleteAccountButton.addEventListener("click", function (e) {
            e.preventDefault();  // Prevent the form from submitting immediately
            console.log("Delete Account Form")
            deleteAccountDialog.showModal();
        });

        // If user confirms 'Yes', submit the form
        deleteAccountConfirm.addEventListener("click", function () {
            console.log("Account deleted")
            AccountDelete.submit();
            deleteAccountDialog.close()
        });

        // If user cancels 'No', hide the dialog
        deleteAccountCancel.addEventListener("click", function () {
            console.log("Account Not deleted")
            deleteAccountDialog.close()
        });
        
      }
    });
      
    addfriend.addEventListener("click",()=> {
      closeAllMenus();
      console.log("add friend")
      if (!AddFriend.classList.contains("Hide")) {
          AddFriend.classList.add("Hide");
          Menus.classList.add("Hide");
          FriendList.classList.remove("Hide");
      } else {
          Menus.classList.remove("Hide");
          AddFriend.classList.remove("Hide");
      }
    });

    invitationButton.addEventListener("click", ()=> {
      closeAllMenus();
      console.log("invitation button clicked")
      if (!Invitations.classList.contains("Hide")) {
          Invitations.classList.add("Hide");
          Menus.classList.add("Hide");
          FriendList.classList.remove("Hide");
          console.log("invitation button clicked")
      } else {
          Menus.classList.remove("Hide");
          Invitations.classList.remove("Hide");
          console.log("invitation button clicked")
        }});

    friendsButton.addEventListener("click", ()=> {
        closeAllMenus();
        console.log("friends button clicked")
        if (!FriendList.classList.contains("Hide")) {
            FriendList.classList.add("Hide");
            Menus.classList.add("Hide");
            Invitations.classList.remove("Hide");
        } else {
            Menus.classList.add("Hide");
            FriendList.classList.remove("Hide");
        }});
}