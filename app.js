const { RTMClient } = require("@slack/rtm-api");
const { WebClient } = require("@slack/web-api");
require("dotenv").config();
const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

const request = require("request");
const token = process.env.SLACK_BOT_USER_TOKEN;
const rtm = new RTMClient(token);
const web = new WebClient(token);

const createMainThread = async info => {
    const mThread = {
        username: info.username,
        text: "Join Channel",
        mrkdwn: true,
        as_user: false,
        channel: "CR4UZHL3E",
        reply_broadcast: false,
        icon_url:
            "https://gravatar.com/avatar/76cb3ba5d61b9135dae572bb4e400ef6?s=200&d=robohash&r=x"
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
        channel: "CR4UZHL3E",
        reply_broadcast: false,
        icon_url:
            "https://gravatar.com/avatar/76cb3ba5d61b9135dae572bb4e400ef6?s=200&d=robohash&r=x"
    };

    try {
        let response = await web.chat.postMessage(mMessage);
        return response;
    } catch (error) {
        console.log(error);
        throw error;
    }
};

(async () => {
    await rtm.start();
})();

//socket.io
const users = [
    {
        _id: "bot12345678",
        username: "bot",
        isOnline: true,
        roomId: ""
    }
];

const chatRooms = [
    {
        _id: "room123456",
        messages: [
            {
                _id: "msg1234567",
                from: "bot12345678",
                to: "u123456",
                text: "hello world"
            }
        ]
    }
];

const emitClientMessage = (roomId, slackEvent) => {
    const roomIndex = chatRooms.findIndex(r => r._id === slackEvent.thread_ts);

    if (roomIndex !== -1) {
        let message = {
            _id: slackEvent.ts,
            text: slackEvent.text,
            sender: slackEvent.username || "customer care"
        };
        const messageIndex = chatRooms[roomIndex].messages.findIndex(
            msg => msg._id === message._id
        );

        if (messageIndex === -1) {
            chatRooms[roomIndex].messages.push(message);
            io.sockets.in(roomId).emit("SLACK_MESSAGE", message);
        }
    }
};
const tChat = io.on("connection", socket => {
    console.log("a user connected");

    // Attach listeners to events by type. See: https://api.slack.com/events/message
    rtm.on("message", async event => {
        if (event.thread_ts) {
            emitClientMessage(event.thread_ts, event);
        } else {
        }
    });

    socket.on("SEND_MESSAGE", async payload => {
        const { message, from, to } = payload;
        const replyMessage = {
            text: message,
            username: from,
            thread_ts: to
        };

        try {
            const response = await replyThreadMessage(replyMessage);
        } catch (error) {
            console.log(error);
        }
    });

    socket.on("LOGIN", async credential => {
        let user = users.find(u => u._id === credential._id);
        if (!user) {
            const mUser = {
                _id: getObjectId(),
                color: getColor(),
                isOnline: true,
                username: credential.username,
                messages: []
            };
            try {
                const response = await createMainThread({
                    username: credential.username
                });
                mUser.roomId = response.ts;
                const mRoom = {
                    _id: response.ts,
                    messages: []
                };
                users.push(mUser);
                chatRooms.push(mRoom);

                socket.emit("LOGGED_IN", { currentUser: mUser });
            } catch (error) {}
        } else {
            socket.emit("LOGGED_IN", { currentUser: user });
        }
    });

    socket.on("JOIN_ROOM", payload => {
        socket.join(payload.roomId);
        io.sockets.in(payload.roomId).emit("JOIN_SUCCEED", {
            msg: "Hello! <br/> How can help you?",
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

http.listen(3000, function() {
    console.log("listening on *:3000");
});
