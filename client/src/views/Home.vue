<template>
  <div class="home">
    <div class="chat-layout">
      <div class="chat-credential" v-if="!chatAuthenticated">
        <div class="welcome">
          <p class="title">Let's talk to our customer care.</p>
        </div>
        <div class="login-form">
          <form @submit.prevent="startChat">
            <input type="text" id="username" placeholder="username" v-model="username" />
            <button type="submit" id="login-button" :disabled="!username">GO</button>
          </form>
        </div>
      </div>
      <div class="message-layout" v-else>
        <div class="message-header">
          <p class="header-title">How can I help?</p>
        </div>
        <div class="message-body">
          <div
            style="display:flex"
            v-for="(msg, idx) in messages"
            :key="'message-'+msg._id+'-'+idx"
          >
            <div class="message-layout" :class="msg.sender===currentUser.username?'msg-current':''">
              <span
                class="avatar"
                v-if="msg.sender===currentUser.username"
                :style="{backgroundColor: currentUser.color}"
              ></span>
              <span class="avatar" v-else></span>
              <span class="message">
                <!-- <p>{{msg}}</p> -->
                <div v-html="msg.text"></div>
              </span>
            </div>
          </div>
        </div>
        <div class="message-footer">
          <form @submit.prevent="sendMessage">
            <div class="message-input">
              <input type="text" id="message" placeholder="Type your message..." v-model="message" />
              <button id="send" :disabled="!message" type="submit">SEND</button>
            </div>
          </form>
        </div>
      </div>
      <div class="loading-chat" v-if="connectingChatroom">loading...</div>
    </div>
  </div>
</template>

<script>
import io from "socket.io-client";

export default {
  name: "home",
  data() {
    return {
      chatAuthenticated: false,
      connectingChatroom: false,
      username: "",
      message: "",
      messages: [],
      currentUser: {},
      socket: {}
    };
  },
  created() {
    this.socket = io("http://192.168.100.118:3000");
  },
  methods: {
    sendMessage() {
      this.socket.emit("SEND_MESSAGE", {
        message: this.message,
        to: this.currentUser.roomId,
        from: this.currentUser.username
      });
      this.message = "";
    },
    startChat() {
      this.connectingChatroom = true;
      document.getElementById("username").blur();

      if (this.username) {
        this.socket.emit("LOGIN", { username: this.username });
        this.listentIO();
      }
    },
    listentIO() {
      this.socket.on("SENDING_MESSAGE", () => {
      });

      this.socket.on("JOIN_SUCCEED", payload => {
        const message = { _id: payload._id, text: payload.msg };
        this.messages.push(message);
      });
      this.socket.on("SLACK_MESSAGE", payload => {
        const message = {
          ...payload,
          text: payload.text.replace(/\n/g, "<br/>")
        };
        this.messages.push(message);
      });

      this.socket.on("LOGGED_IN", payload => {
        this.chatAuthenticated = true;
        this.connectingChatroom = false;

        this.currentUser = payload.currentUser;
        localStorage.chatUser = JSON.stringify(payload.currentUser);
        this.socket.emit("JOIN_ROOM", { roomId: payload.currentUser.roomId });
      });
    }
  }
};
</script>

<style lang="scss">
.chat-layout {
  position: fixed;
  // border: 2px solid teal;
  bottom: 2rem;
  right: 2rem;
  width: 30rem;
  height: 50rem;
  z-index: 2019;
  border-radius: 1rem;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23);
  overflow: hidden;

  .chat-credential {
    display: flex;
    flex-direction: column;
    height: 100%;

    .welcome {
      background-color: teal;
      border-bottom: 2px solid #bcbcbc;
      height: 10rem;
      display: flex;
      color: white;
      .title {
        margin: auto;
        font-weight: bold;
      }
    }
    .login-form {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;

      #username {
        border: 2px solid teal;
        border-radius: 3rem;
        padding: 0.5rem 1rem;
        font-size: 2rem;
        &::placeholder {
          color: #ccc;
        }
        &:focus {
          outline: none;
        }
      }
      #login-button {
        position: absolute;
        bottom: 1rem;
        right: 1rem;
        border-radius: 3rem;
        width: 4rem;
        height: 4rem;
        background-color: teal;
        color: white;
        font-size: 1.5rem;
        box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23);
        &:focus {
          outline: none;
        }
        transition: 300ms;
        &:hover {
          opacity: 0.9;
        }
        transition: 300ms;
        &:disabled {
          background-color: #cccccc;
          border-color: #cccccc;
        }
      }
    }
  }

  .message-layout {
    display: flex;
    flex-direction: column;
    height: 100%;
    .message-header {
      background-color: teal;
      color: white;
      padding: 1rem;
      font-size: 1.5rem;
      font-weight: bold;
      p {
        margin: 0;
      }
    }

    .message-body {
      flex: 1;
      overflow-y: auto;
      padding: 0 1rem;
      .message-layout {
        display: flex;
        max-width: 300;
        margin-bottom: 0.5rem;
        align-items: center;
        flex-direction: row;
        margin-top: 0.25rem;
        .avatar {
          width: 3rem;
          height: 3rem;
          border-radius: 3rem;
          margin-top: auto;
          background-color: teal;
          box-shadow: 0 4px 4px -4px black;
        }
        .message {
          max-width: 275px;
          background-color: #eee2e2;
          border-radius: 1rem;
          padding: 0.25rem 0.75rem;
          margin: 0 0.5rem;
          // flex-grow: 1;
        }
        &.msg-current {
          margin-left: auto;
          flex-direction: row-reverse;
          .msg-user {
            text-align: right;
          }
          .message {
            background-color: lightblue;
          }
        }
      }
    }
    .message-footer {
      border-top: 1px solid #dedede;
      height: 4rem;
      form {
        height: 100%;
        .message-input {
          display: flex;
          height: 100%;
          #message {
            flex: 1;
            margin: 0.5rem 0.5rem 0.5rem 1rem;
            border-radius: 3rem;
            border: 1px solid teal;
            padding: 0.5rem 1rem;
            &:focus {
              outline: none;
            }
          }
          #send {
            border-radius: 3rem;
            margin: 0.5rem;
            margin-left: 0;
            display: block;
            width: 3rem;
            height: 3rem;
            position: relative;
            border: 1px solid teal;
            color: teal;
            cursor: pointer;
            &:focus {
              outline: none;
            }
            transition: 300ms;
            &:disabled {
              border-color: #cccccc;
              color: #cccccc;
            }
          }
        }
      }
    }
  }

  .loading-chat {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #cccccccc;
    display: flex;
    justify-content: center;
    align-items: center;
  }
}
</style>