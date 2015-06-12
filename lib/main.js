//main.js
var pageMod = require("sdk/page-mod");
var notifications = require("sdk/notifications");
var sp = require("sdk/simple-prefs");
var {Cc, Ci, Cu} = require("chrome");
const {TextDecoder, TextEncoder, OS} = Cu.import("resource://gre/modules/osfile.jsm", {});
var localFile = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
const fileIO = require("sdk/io/file");

//File Preferences Logic
var stat_file = 'statutory_whitelist.txt';
var stat_path = OS.Constants.Path.profileDir;
var stat_path_joined =  OS.Path.join(stat_path, stat_file);
if (!sp.GetFile) {
    sp.prefs.GetFile = stat_path_joined;  //Set the default path/file if its value is Null.
}

localFile.initWithPath(sp.prefs.GetFile);

if (!fileIO.exists(sp.prefs.GetFile)) {
    writeTextToFile("#One hostname per line. (Note: this line will disappear on its own) Thanks, Null.", sp.prefs.GetFile); //Create Blank File.
}
sp.on("GetFile", function(xxx) {
    //console.log(xxx.value, "  Opening File");
    localFile.initWithPath(sp.prefs.GetFile);
});

sp.on("Open_WhiteList_File", function() {
    console.log("Opening File");
        //localFile.reveal();       // open the containing folder of the file
        localFile.launch();       // launch the file

});

sp.on("Open_WhiteList_Folder", function() {
    console.log("Opening Folder");
        localFile.reveal();       // open the containing folder of the file
        //localFile.launch();       // launch the file

});
//End of File Preferences Logic

//Writing WhiteList.
function writeTextToFile(text, filename) {
    var TextWriter = fileIO.open(filename, "w");
    if (!TextWriter.closed) {
        TextWriter.write(text);
        TextWriter.close();
    }
}

//Reading WhiteList. 
function readTextFromFile(filename) {
    var text = null;
    if (fileIO.exists(filename)) {
        var TextReader = fileIO.open(filename, "r");
        if (!TextReader.closed) {
            text = TextReader.read();
            TextReader.close();
        }
    }
    return text;
}

//Main Code Kickoff!
//Let the user know when add-on is first enabled.
exports.main = function (options, callbacks) {
    SetBrowser_WebRTC_Secure();
    console.log("EXports main has been called!!!!", sp.prefs["User_Notification_Enabled"]);
    if (sp.prefs['User_Notification_Enabled']) {
        notifications.notify({
            title: "WebRTC Protection Enabled!",
            text: "Click to prevent All Notifications (Note: Protection will still be enabled!).",
            onClick: function (domain) {sp.prefs['User_Notification_Enabled'] = false;}
        });
    }
};  //End of Main Code Kickoff

//set all webrtc about:config settings secure
function SetBrowser_WebRTC_Secure() {
    require("sdk/preferences/service").set("media.peerconnection.enabled", false);
    require("sdk/preferences/service").set("media.peerconnection.turn.disable", true);
    require("sdk/preferences/service").set("media.peerconnection.ice.loopback", false);
    require("sdk/preferences/service").set("media.peerconnection.use_document_iceservers", false);
    require("sdk/preferences/service").set("media.peerconnection.video.enabled", false);
    require("sdk/preferences/service").set("media.peerconnection.default_iceservers", '[]');
}

//reset all webrtc about:config settings to insecure (default)
function SetBrowser_WebRTC_Insecure () {
    require("sdk/preferences/service").reset("media.peerconnection.enabled");
    require("sdk/preferences/service").reset("media.peerconnection.turn.disable");
    require("sdk/preferences/service").reset("media.peerconnection.use_document_iceservers");
    require("sdk/preferences/service").reset("media.peerconnection.video.enabled");
    require("sdk/preferences/service").reset("media.peerconnection.default_iceservers");
}

//Run PageMod on every website.
pageMod.PageMod({
    include: /.*/,
    attachTo: ["existing", "top", "frame"],
    contentScriptFile: "./statutory.js",
    contentScriptWhen: "start",
    //First content-script call, to check array for website that are whitelisted
    onAttach: function (worker) {
        worker.port.on("Check_Domain_Restriction", function (domain) {

            var returned_text = readTextFromFile(sp.prefs.GetFile);
            //console.log(sp.prefs.GetFile);
            //console.log("Returned Text from file: " + returned_text);
            returned_text = returned_text.replace(/#.*$|/gm, '');
            whitelist_file_array = returned_text.split("\r\n");
            if (whitelist_file_array.indexOf(domain) === -1) {
                SetBrowser_WebRTC_Secure();
                worker.port.emit("WebRTC_Domain_Restricted")
            }

            else {
                SetBrowser_WebRTC_Insecure();
                if (sp.prefs['User_Notification_Enabled']) {
                    notifications.notify({
                        title: "IP has been Allowed for this Site!",
                        text: "IP Information will be disclosed to: " + domain + "\nClick here to remove WebRTC Access!",
                        data: domain,
                        onClick: function (domain) {
                            SetBrowser_WebRTC_Secure(); //Set all webrtc about:config preferences to defaults (Secure)
                            worker.port.emit("WebRTC_Domain_Restricted"); //Replace all webrtc functions with my own in JavaScript

                            var returned_text = readTextFromFile(sp.prefs.GetFile);
                            //console.log(sp.prefs.GetFile);
                            //console.log("Returned Text from file: " + returned_text);
                            returned_text = returned_text.replace(/#.*$|/gm, '');
                            whitelist_file_array = returned_text.split("\r\n");
                            whitelist_file_array.splice(whitelist_file_array.indexOf(domain), 1);

                            if (whitelist_file_array.indexOf(domain) === -1) {
                                send_back_text = whitelist_file_array.join("\r\n");
                                writeTextToFile(send_back_text, sp.prefs.GetFile);
                            }


                            notifications.notify({
                                    title: "("+  domain + ") is now Protected!",
                                    text: "Click to Allow WebRTC Again!",
                                    onClick: function () {
                                        SetBrowser_WebRTC_Insecure();
                                        worker.port.emit("Ask_User_To_Enable_WebRTC", domain);
                                    }
                                });
                        }
                    });
                }
            }
        });

        //website has called one of my rewritten RTC functions now do this.
        worker.port.on('Website_Called_RTC_Function', function (domain) {
            if (sp.prefs['User_Notification_Enabled']) {
                notifications.notify({
                    title: "Site Block! WebRTC Access from: (" + domain + ") Requested!",
                    text: "Click here to Allow!",
                    data : domain,
                    onClick: function (domain) {
                        SetBrowser_WebRTC_Insecure(); //Set Browser About:config preferences to insecure
                        worker.port.emit("Ask_User_To_Enable_WebRTC", domain);  //Place mozRTCPeerConnection back to original constructor.
                            notifications.notify({
                                title: "Protection is about to be turned off!",
                                text: "Private IP Information will be disclosed to: {" + domain + ")"
                            });

                    }
                });
            }
        });

        //Push a website on to whitelist array (now a file) and make page WebRTC Insecure.
        worker.port.on("Add_Allowed_Domain_To_Array", function (domain) {
            var returned_text = readTextFromFile(sp.prefs.GetFile);
            //console.log(sp.prefs.GetFile);
            //console.log("Returned Text from file: " + returned_text);
            returned_text = returned_text.replace(/#.*$|/g, '');
            whitelist_file_array = returned_text.split("\r\n");
            if (whitelist_file_array.indexOf(domain) === -1) {
                whitelist_file_array.push(domain);
                send_back_text = whitelist_file_array.join("\r\n");
                writeTextToFile(send_back_text, sp.prefs.GetFile);
            }
            SetBrowser_WebRTC_Insecure();
        });
    }
}); //End of pageMod

//Tell user that notification status has changed from notifications checkbox (Add-on options) has been checked/unchecked.
sp.on("User_Notification_Enabled", function (){
    if (sp.prefs['User_Notification_Enabled']) {

        console.log("This is next!");
        notifications.notify({
            title: "Notifications are now Enabled!"
        });
} else {
        notifications.notify({
            title: "Notification from Statutory disabled.",
            text: "Click to enable all notifications again, or you have to change it back in the Add-on options.",
            onClick: function (domain) {
                ( sp.prefs['User_Notification_Enabled'] = true );
                exports.main();
            }
        });
    }
});

//When add-on is disabled or uninstalled (add-on does-not have access to data folder.
exports.onUnload = function () {
    SetBrowser_WebRTC_Insecure();  //Set all about:config preferences to insecure
        notifications.notify({
            title: "Statutory has been Disabled or Uninstalled! ",
            text: "All about:config settings have been restored to defaults"
        });
};

