//BraveHeaRTC.js
//Send current hostname to check against array white-listed "Good" sites.
if (location.hostname) {self.port.emit("Check_Domain_Restriction", location.hostname)}

//Function is to replace all RTC Functions from their original constructor.
//call add-on if they are ever used.
function Replace_All_RTC_Functions_With_My_Own() {
    unsafeWindow.mozRTCPeerConnection = unsafeWindow.RTCPeerConnection =
        unsafeWindow.mozRTCSessionDescription = unsafeWindow.RTCSessionDescription =
            unsafeWindow.mozRTCIceCandidate = unsafeWindow.RTCIceCandidate =
               function Main_OverWrite_RTC_Function () {
        self.port.emit("Website_Called_RTC_Function", location.hostname);
    };
}

//add-on script has decided that this site is "Bad" replace all RTC Functions!
self.port.on("WebRTC_Domain_Restricted", function() {Replace_All_RTC_Functions_With_My_Own()});

//Show user confirm to accept WebRTC or not.
self.port.on("Ask_User_To_Enable_WebRTC", function(domain){
    if (confirm("Click OK to Enable WebRTC:\n\nInternal IP Network Information" +
        " will be sent to site: (http:\\\\" + domain + ")\n\nDo Not Continue If" +
        " you do not trust this site or you are using a VPN. This information " +
        "could potentially De-Anonymize your connection and expose your Privacy." +
        "\n\nClick Cancel to Abort!") == true) {
        //Save to give RTC functions back their bulit-in constructor WebRTC can contiune.
        unsafeWindow.mozRTCPeerConnection = unsafeWindow.RTCPeerConnection = mozRTCPeerConnection;
        unsafeWindow.mozRTCSessionDescription = unsafeWindow.RTCSessionDescription = mozRTCSessionDescription;
        unsafeWindow.mozRTCIceCandidate = unsafeWindow.RTCIceCandidate = mozRTCIceCandidate;
        if (domain == location.hostname) {
            self.port.emit("Add_Allowed_Domain_To_Array", domain);
            self.port.emit("Check_Domain_Restriction", location.hostname)
        }
    }else{ //If user cancels webrtc approval disclaimer,  then set to Secure.
        self.port.emit("Website_Called_RTC_Function",location.hostname);
    }
});





