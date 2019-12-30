const { RTMClient } = require("@slack/rtm-api");
const { WebClient } = require("@slack/web-api");
const { FileManager } = require("./file-manager");
const axios = require("axios");
require("dotenv").config();
const express = require("express");
const app = express();

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
    );
    next();
});

const http = require("http").createServer(app);
const io = require("socket.io")(http);
const cors = require("cors");
const { chatConfig } = require("./chat.config");

/**
 * slack config
 */
const slackApiUrl = chatConfig.slack_api_url;
const slackBotToken = chatConfig.slack_bot_token;
const slackAuthToken = chatConfig.slack_auth_token;
const slackChatChannel = chatConfig.slack_chat_channel;
const slackService = chatConfig.slack_services.chat_replies;

const rtm = new RTMClient(slackBotToken);
const web = new WebClient(slackBotToken);

const createMainThread = async info => {
    const mThread = {
        username: info.username,
        text: "Join Channel",
        mrkdwn: true,
        as_user: false,
        channel: slackChatChannel,
        reply_broadcast: false,
        icon_url: info.avatar
    };
    try {
        let response = await web.chat.postMessage(mThread);
        return response;
    } catch (error) {
        console.log(error);
        throw error;
    }
};

const replyThreadMessage = async message => {
    const mMessage = {
        text: message.text,
        username: message.username,
        thread_ts: message.thread_ts,
        mrkdwn: true,
        as_user: false,
        channel: slackChatChannel,
        reply_broadcast: false,
        icon_url: message.icon_url
    };

    try {
        let response = await web.chat.postMessage(mMessage);
        return response;
    } catch (error) {
        console.log(error);
        throw error;
    }
};

const getThreadMessages = async thread_ts => {
    const reqMessageUrl = `${slackApiUrl}${slackService}?token=${slackAuthToken}&channel=${slackChatChannel}&thread_ts=${thread_ts}`;
    return axios.get(reqMessageUrl);
};

(async () => {
    await rtm.start();
})();

//socket.io
const emitClientMessage = (roomId, slackEvent) => {
    let message = slackEvent;
    // console.log("emit message", message, roomId);

    io.sockets.in(roomId).emit("SLACK_MESSAGE", message);
};
const tChat = io.on("connection", socket => {
    console.log("a user connected");

    // Attach listeners to events by type. See: https://api.slack.com/events/message
    rtm.on("message", event => {
        if (event.thread_ts) {
            emitClientMessage(event.thread_ts, event);
        }
    });

    socket.on("SEND_MESSAGE", async payload => {
        const { message, from, to, sender_profile } = payload;
        const replyMessage = {
            text: message,
            username: from,
            thread_ts: to,
            icon_url: sender_profile
        };

        try {
            const response = await replyThreadMessage(replyMessage);
        } catch (error) {
            console.log(error);
        }
    });

    socket.on("LOGIN", async credential => {
        let userList = FileManager.readJsonFile("./store/users.json");
        let avatarList = FileManager.readJsonFile("./store/avatars.json");

        let user = userList.find(u => u._id === credential._id);
        if (!user) {
            const mUser = {
                _id: getObjectId(),
                color: getColor(),
                isOnline: true,
                avatar: avatarList[userList.length % avatarList.length],
                username: credential.username
            };

            try {
                const response = await createMainThread(mUser);
                mUser.roomId = response.ts;

                userList.push(mUser);
                FileManager.writeJsonFile(
                    "./store/users.json",
                    JSON.stringify(userList)
                );
                socket.emit("LOGGED_IN", { currentUser: mUser, messages: [] });
                userList = undefined;
                avatarList = undefined;
            } catch (error) {
                console.log("create thread error", error);
            }
        } else {
            try {
                const response = await getThreadMessages(credential.roomId);
                const slackMessages = response.data.messages;
                FileManager.writeJsonFile(
                    "messages.json",
                    JSON.stringify(slackMessages)
                );
                slackMessages.shift();

                socket.emit("LOGGED_IN", {
                    currentUser: user,
                    messages: slackMessages
                });
            } catch (error) {
                socket.emit("LOGGED_IN", {
                    currentUser: user,
                    messages: []
                });
            }
            userList = undefined;
            avatarList = undefined;
        }
    });

    socket.on("JOIN_ROOM", payload => {
        socket.join(payload.roomId);
        io.sockets.in(payload.roomId).emit("JOIN_SUCCEED", {
            msg: "Hello! How can help you?",
            _id: getObjectId()
        });
    });

    socket.on("THREAD_CREATED", payload => {
        console.log(payload);
    });

    socket.on("DISCONNECTED", () => {
        console.log("user disconnected");
    });
});

const getObjectId = function() {
    let timestamp = ((new Date().getTime() / 1000) | 0).toString(16);
    return (
        timestamp +
        "xxxxxxxxxxxxxxxx"
            .replace(/[x]/g, function() {
                return ((Math.random() * 16) | 0).toString(16);
            })
            .toLowerCase()
    );
};
const getColor = () => "#" + Math.floor(Math.random() * 16777215).toString(16);

//server
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));

app.get("/", (req, res) => res.send("Welcome to TSC!"));
http.listen(3000, function() {
    console.log("listening on *:3000");
});
