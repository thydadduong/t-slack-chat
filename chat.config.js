require("dotenv").config();

module.exports.chatConfig = {
    slack_hook_api_url:
        process.env.SLACK_API_URL || "https://hooks.slack.com/api",
    slack_api_url: "https://slack.com/api/",
    slack_auth_token: process.env.SLACK_AUTH_TOKEN || "",
    slack_bot_token: process.env.SLACK_BOT_TOKEN || "",
    slack_chat_channel: process.env.SLACK_CHANNEL_CLIENT || "CR56YBWMR",
    slack_services: {
        chat_replies: "channels.replies"
    }
};
