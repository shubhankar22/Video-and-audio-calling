'use strict';





var servers = {
    iceServers: [
        {urls: 'stun:stun.l.google.com:19302'}
    ]
};

var myPC;
var awaitingResponse;
var streamConstraints;
var myMediaStream;

const room = getRoom();
const wsChat = new WebSocket("ws://localhost:8080/comm");

window.addEventListener('load', function(){
    startCounter(); 
    var initCallElems = document.getElementsByClassName('initCall');
    
    for (var i = 0; i < initCallElems.length; i++) {
        initCallElems[i].addEventListener('click', initCall);
    }
    
    
    
    wsChat.onopen = function(){
        //subscribe to room
        wsChat.send(JSON.stringify({
            action: 'subscribe',
            room: room
        }));
        
        showSnackBar("Connected to the chat server!", 5000);
    };
    
    
    
    wsChat.onerror = function(){
        showSnackBar("Unable to connect to the chat server! Kindly refresh", 20000);
    };
    
    
    
    wsChat.onmessage = function(e){
        var data = JSON.parse(e.data);
        
        if(data.room === room){
           
            switch(data.action){
                case 'initCall':
                     
                    document.getElementById('calleeInfo').style.color = 'black';
                    document.getElementById('calleeInfo').innerHTML = data.msg;
                    
                    document.getElementById("rcivModal").style.display = 'block';
                    
                    document.getElementById('callerTone').play();
                    
                     
                    if (!$(".icon_minim").hasClass('panel-collapsed')) {
                        $(".icon_minim").parents('.panel').find('.panel-body').slideUp();
                        $(".icon_minim").addClass('panel-collapsed');
                        $(".icon_minim").removeClass('fa-minus').addClass('fa-plus');
                    }
                    
                    break;
                    
                case 'callRejected':
                  
                    document.getElementById("callerInfo").style.color = 'red';
                    document.getElementById("callerInfo").innerHTML = data.msg;

                    setTimeout(function(){
                        document.getElementById("callModal").style.display = 'none';
                    }, 3000);
                    
                  
                    document.getElementById('callerTone').pause();
                    
                   
                    enableCallBtns();
                    
                    break;
                    
                case 'endCall':
                     
                    document.getElementById("calleeInfo").style.color = 'red';
                    document.getElementById("calleeInfo").innerHTML = data.msg;

                    setTimeout(function(){
                        document.getElementById("rcivModal").style.display = 'none';
                    }, 3000);
                    
                     
                    document.getElementById('callerTone').pause();
                    
                    break;
                    
                case 'startCall':
                    startCall(false); 
                    
                    document.getElementById("callModal").style.display = 'none'; 
                    
                    clearTimeout(awaitingResponse); 
                    
                     
                    document.getElementById('callerTone').pause();
                    break;

                case 'candidate':
                    
                    myPC ? myPC.addIceCandidate(new RTCIceCandidate(data.candidate)) : "";
                    
                    break;

                case 'sdp':
               
                    myPC ? myPC.setRemoteDescription(new RTCSessionDescription(data.sdp)) : "";
                    
                    break;

                case 'txt':
                    
                    addRemoteChat(data.msg, data.date);

                    //play msg tone
                    document.getElementById('msgTone').play();
                    
                    break;

                case 'typingStatus':
                    if(data.status){
                        document.getElementById("typingInfo").innerHTML = "Remote is typing";
                    }
                    
                    else{
                        document.getElementById("typingInfo").innerHTML = "";
                    }
                    
                    break;
                    
                case 'terminateCall': 
                    handleCallTermination();
                    
                    break;
                    
                case 'newSub':
                    setRemoteStatus('online');

                     
                    wsChat.send(JSON.stringify({
                        action: 'imOnline',
                        room: room
                    }));

                    showSnackBar("Remote entered room", 10000);
                    
                    break;
                    
                case 'imOnline':
                    setRemoteStatus('online');
                    break;
                    
                case 'imOffline':
                    setRemoteStatus('offline');
        
                    showSnackBar("Remote left room", 10000);
                    enableCallBtns();
                    break;
            }  
        }
        
        else if(data.action === "subRejected"){
           
            showSnackBar("Maximum of two users allowed in room. Communication disallowed", 5000);
        }
    };
    
    
    document.getElementById("chatInput").addEventListener('keyup', function(){
        var msg = this.value.trim();
        
         
        if(msg){
            wsChat.send(JSON.stringify({
                action: 'typingStatus',
                status: true,
                room: room
            }));
        }
        
         
        else{
            wsChat.send(JSON.stringify({
                action: 'typingStatus',
                status: false,
                room: room
            }));
        }
        
    });
    
   
    document.getElementById("chatSendBtn").addEventListener('click', function(e){
        e.preventDefault();
        
        var msg = document.getElementById("chatInput").value.trim();
        
        if(msg){
            var date = new Date().toLocaleTimeString();
            
            addLocalChat(msg, date, true);
            
            
            document.getElementById("chatInput").value = "";
            
            return false;
        }
    });
    
     
    document.getElementById("chatInput").addEventListener('keypress', function(e){
        var msg = this.value.trim();
        
        if((e.which === 13) && msg){
           
            document.getElementById("chatSendBtn").click();
            
            return false;
        }
    });
    
    
  
    var answerCallElems = document.getElementsByClassName('answerCall');
    
    for (var i = 0; i < answerCallElems.length; i++) {
        answerCallElems[i].addEventListener('click', answerCall);
    }
    
    
   
    document.getElementById("rejectCall").addEventListener('click', function(e){
        e.preventDefault();
        
        wsChat.send(JSON.stringify({
            action: 'callRejected',
            msg: "Call rejected by Remote",
            room: room
        }));
        
        document.getElementById("rcivModal").style.display = 'none';
        
        document.getElementById('callerTone').pause();
    });
    
    
    document.getElementById("endCall").addEventListener('click', function(e){
        e.preventDefault();
        
        endCall("Call ended by remote", false);
        
        
        enableCallBtns();
    });
    
   
    $('.chat-pane').on('click', '.icon_minim', function (e) {
        var $this = $(this);
        
        if (!$this.hasClass('panel-collapsed')) {
            $this.parents('.panel').find('.panel-body').slideUp();
            $this.addClass('panel-collapsed');
            $this.removeClass('fa-minus').addClass('fa-plus');
        } 
        
        else {
            $this.parents('.panel').find('.panel-body').slideDown();
            $this.removeClass('panel-collapsed');
            $this.removeClass('fa-plus').addClass('fa-minus');
        }
        
        //fix scrollbar to bottom
        fixChatScrollBarToBottom();
    });
    
    
    $('.chat-pane').on('focus', '.chat_input', function () {
        var $this = $(this);
        
        if ($('#minim_chat_window').hasClass('panel-collapsed')) {
            $this.parents('.panel').find('.panel-body').slideDown();
            $('#minim_chat_window').removeClass('panel-collapsed');
            $('#minim_chat_window').removeClass('fa-plus').addClass('fa-minus');
            
          
            fixChatScrollBarToBottom();
        }
    });
    
 
    document.getElementById("terminateCall").addEventListener('click', function(e){
        e.preventDefault();
        
       
        myPC ? myPC.close() : "";
        
       
        stopMediaStream();
        
        
        document.querySelectorAll('video').src = appRoot+'img/vidbg.png';
        
      
        wsChat.send(JSON.stringify({
            action: 'terminateCall',
            room: room
        }));
         
        enableCallBtns();
    });
});

 


function initCall(){
    var callType = this.id === 'initVideo' ? "Video" : "Audio";
    var callerInfo = document.getElementById('callerInfo');
        
   
    if(checkUserMediaSupport){
         
        streamConstraints = callType === 'Video' ? {video:{facingMode:'user'}, audio:true} : {audio:true};

     
        callerInfo.style.color = 'black';
        callerInfo.innerHTML = callType === 'Video' ? 'Video call to Remote' : 'Audio call to Remote';

            
        document.getElementById('callerTone').play();

                wsChat.send(JSON.stringify({
            action: 'initCall',
            msg: callType === 'Video' ? "Video call from remote" : "Audio call from remote",
            room: room
        }));

        
        disableCallBtns();

         
        awaitingResponse = setTimeout(function(){
            endCall("Call ended due to lack of response", true);
        }, 30000);
    }

    else{
        callerInfo.style.color = 'red';
        callerInfo.innerHTML = "Your browser/device does not have the capability to make call";
    }


    document.getElementById("callModal").style.display = 'block';
}

 

function answerCall(){
     
    if(checkUserMediaSupport){
        
        streamConstraints = this.id === 'startVideo' ? {video:{facingMode:'user'}, audio:true} : {audio:true};

        
        document.getElementById("calleeInfo").innerHTML = "<i class='"+spinnerClass+"'></i> Setting up call...";

         
        startCall(true);

         
        document.getElementById("rcivModal").style.display = 'none';
 
        disableCallBtns();

    }

    else{
         
        wsChat.send(JSON.stringify({
            action: 'callRejected',
            msg: "Remote's device does not have the necessary requirements to make call",
            room: room
        }));

        document.getElementById("calleeInfo").innerHTML = "Your browser/device does not meet the minimum requirements needed to make a call";

        setTimeout(function(){
            document.getElementById("rcivModal").style.display = 'none';
        }, 3000);
    }

    document.getElementById('callerTone').pause();
}

 
function startCall(isCaller){
    if(checkUserMediaSupport){
        myPC = new RTCPeerConnection(servers); 
        myPC.onicecandidate = function(e){
            if(e.candidate){
                
                wsChat.send(JSON.stringify({
                    action: 'candidate',
                    candidate: e.candidate,
                    room: room
                }));
            }
        };
    
       
        myPC.ontrack = function(e){
            document.getElementById("peerVid").src = window.URL.createObjectURL(e.streams[0]);
        };
        
        
        
        myPC.oniceconnectionstatechange = function(){
            switch(myPC.iceConnectionState){
                case 'disconnected':
                case 'failed':
                    console.log("Ice connection state is failed/disconnected");
                    showSnackBar("Call connection problem", 15000);
                    break;
                    
                case 'closed':
                    console.log("Ice connection state is 'closed'");
                    showSnackBar("Call connection closed", 15000);
                    break;
            }
        };
        
        
        
        myPC.onsignalingstatechange = function(){
            switch(myPC.signalingState){
                case 'closed':
                    console.log("Signalling state is 'closed'");
                    showSnackBar("Signal lost", 15000);
                    break;
            }
        };
        
         
        setLocalMedia(streamConstraints, isCaller);
    }
    
    else{
        showSnackBar("Your browser does not support video call", 30000);
    }
}

 
function checkUserMediaSupport(){
    return !!(navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
}

 
function setLocalMedia(streamConstraints, isCaller){
    navigator.mediaDevices.getUserMedia(
        streamConstraints
    ).then(function(myStream){
        document.getElementById("myVid").src = window.URL.createObjectURL(myStream);
        
        myPC.addStream(myStream); 
        
         
        myMediaStream = myStream;
        
        if(isCaller){
            myPC.createOffer().then(description, function(e){
                console.log("Error creating offer", e.message);
                
                showSnackBar("Call connection failed", 15000);
            });
            
            
            wsChat.send(JSON.stringify({
                action: 'startCall',
                room: room
            }));
        }
        
        else{
            
            myPC.createAnswer().then(description).catch(function(e){
                console.log("Error creating answer", e);
                
                showSnackBar("Call connection failed", 15000);
            });

        }
        
    }).catch(function(e){
        
        switch(e.name){
            case 'SecurityError':
                console.log(e.message);
                
                showSnackBar("Media sources usage is not supported on this browser/device", 10000);
                break;

            case 'NotAllowedError':
                console.log(e.message);
                
                showSnackBar("We do not have access to your audio/video sources", 10000);
                break;
                
            case 'NotFoundError':
                console.log(e.message);
                
                showSnackBar("The requested audio/video source cannot be found", 10000);
                break;
            
            case 'NotReadableError':
            case 'AbortError':
                console.log(e.message);
                showSnackBar("Unable to use your media sources", 10000);
                break;
        }
    });
}

 
function addRemoteChat(msg, date){
    new Promise(function(resolve, reject){
        var newNode = document.createElement('div');
        
        newNode.className = "row msg_container base_receive";
        
        return resolve(newNode);
    }).then(function(newlyCreatedNode){
        newlyCreatedNode.innerHTML = '<div class="col-sm-10 col-xs-10">\
                <div class="messages msg_receive">\
                    <p>'+msg+'</p>\
                    <time>Remote • '+date+'</time>\
                </div>\
            </div>';
        
        document.getElementById('chats').appendChild(newlyCreatedNode);

        //open the chat just in case it is closed
        document.getElementById("chatInput").focus();

        fixChatScrollBarToBottom();
    });
}


 
function addLocalChat(msg, date, sendToPartner){
     
    var msgId = randomString(5); 
    
    new Promise(function(resolve, reject){
        var newNode = document.createElement('div');
        
        newNode.className = "row msg_container base_sent";
        
        return resolve(newNode);
    }).then(function(newlyCreatedNode){
        newlyCreatedNode.innerHTML = '<div class="col-sm-10 col-xs-10">\
                <div class="messages msg_sent">\
                    <p>'+msg+'</p>\
                    <time>You • '+date+' <i class="fa fa-clock-o sentStatus" id="'+msgId+'"></i></time>\
                </div>\
            </div>';
        
        document.getElementById('chats').appendChild(newlyCreatedNode);
        
        if(sendToPartner){
             
            sendChatToSocket(msg, date, msgId);
        }
    });
    
    
    fixChatScrollBarToBottom();
}

 
function description(desc){
    myPC.setLocalDescription(desc);

    //send sdp
    wsChat.send(JSON.stringify({
        action: 'sdp',
        sdp: desc,
        room: room
    }));
}

 
function endCall(msg, setTimeOut){
    wsChat.send(JSON.stringify({
        action: 'endCall',
        msg: msg,
        room: room
    }));

    if(setTimeOut){
        
        document.getElementById("callerInfo").style.color = 'red';
        document.getElementById.innerHTML = "<i class='fa fa-exclamation-triangle'></i> No response";
        
        setTimeout(function(){
            document.getElementById("callModal").style.display = 'none';
        }, 3000);
        
        enableCallBtns();
    }
    
    else{
        document.getElementById("callModal").style.display = 'none';
    }
    
    clearTimeout(awaitingResponse);

    document.getElementById('callerTone').pause();
}

 
function fixChatScrollBarToBottom(){
    var msgPane = document.getElementById("chats");
    msgPane.scrollTop = msgPane.scrollHeight;
}

 

function enableCallBtns(){
    
    var initCallElems = document.getElementsByClassName('initCall');
    
    for(let i = 0; i < initCallElems.length; i++){
        initCallElems[i].removeAttribute('disabled');
    }
    
    document.getElementById('terminateCall').setAttribute('disabled', true);
}

 

function disableCallBtns(){
     
    var initCallElems = document.getElementsByClassName('initCall');
    
    for(let i = 0; i < initCallElems.length; i++){
        initCallElems[i].setAttribute('disabled', true);
    }
    
    document.getElementById('terminateCall').removeAttribute('disabled');
}

 

function sendChatToSocket(msg, date, msgId){
    wsChat.send(JSON.stringify({
        action: 'txt',
        msg: msg,
        date: date,
        room: room
    }));
    
     
    $("#"+msgId).removeClass('fa-clock-o').addClass('fa-check text-success');
}

 
function handleCallTermination(){
    myPC ? myPC.close() : ""; 
                    
    
    showSnackBar("Call terminated by remote", 10000);

     
    stopMediaStream();
    
   
    $('video').attr('src', appRoot+'img/vidbg.png');

    //enable 'call' button and disable 'terminate call' btn
    enableCallBtns();
}

 
function setRemoteStatus(status){
    if(status === 'online'){
        $("#remoteStatus").css('color', 'green');
        $("#remoteStatusTxt").css({color:'green'}).html("(Online)");
    }
    
    else{
        $("#remoteStatus").css('color', '');
        $("#remoteStatusTxt").css({color:'red'}).html("(Offline)");
    }
}


 


function startCounter(){
    var sec = "00";
    var min = "00";
    var hr = "00";
    
    var hrElem = document.querySelector("#countHr");
    var minElem = document.querySelector("#countMin");
    var secElem = document.querySelector("#countSec");
    
    hrElem.innerHTML = hr;
    minElem.innerHTML = min;
    secElem.innerHTML = sec;
        
    setInterval(function(){
         
        ++sec;
        
        secElem.innerHTML = sec >= 60 ? "00" : (sec < 10 ? "0"+sec : sec);
        
        if(sec >= 60){
             
            ++min;
            minElem.innerHTML = min < 10 ? "0"+min : min;
            
            sec = 0;
            
            if(min >= 60){
                
                ++hr;
                hrElem.innerHTML = hr < 10 ? "0"+hr : hr;
                
                min = 0;
            }
        }
        
    }, 1000);
}

 

function stopMediaStream(){    
    if(myMediaStream){
 
        
        var totalTracks = myMediaStream.getTracks().length;
        
        for(let i = 0; i < totalTracks; i++){
            myMediaStream.getTracks()[i].stop();
        }
    }
}

 

function showSnackBar(msg, displayTime){
    document.getElementById('snackbar').innerHTML = msg;
    document.getElementById('snackbar').className = document.getElementById('snackbar').getAttribute('class') + " show";
    
    setTimeout(function(){
        $("#snackbar").html("").removeClass("show");
    }, displayTime);
}

 
function randomString(length){
    var rand = Math.random().toString(36).slice(2).substring(0, length);
    
    return rand;
}

 

function getRoom(){
    var params = window.location.search.substr(1).split("&");
    
    if(params){
        for(let i = 0; i < params.length; i++){
            var key = params[i].split("=")[0];
            var value = params[i].split("=")[1];
            
            if(key === "room"){
                return value;
            }
        }
    }
    
    else{
        return "";
    }
}
