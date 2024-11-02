const pl = require("plweb");
const fs = require("fs/promises");
const axios = require("axios");

async function fetchChatCompletion(text) {
  const url = "https://spark-api-open.xf-yun.com/v1/chat/completions";
  const data = {
    model: "generalv3.5",
    messages: [
      {
        role: "system",
        content:
          "你是一个AI阅读助手，接下来我会给你提供一篇文章，你需要帮我生成摘要，除摘要以外不要回复别的内容",
      },
      {
        role: "user",
        content: "文章如下：" + text,
      },
    ],
  };

  const headers = {
    Authorization: `Bearer ${process.env.TOKEN}`,
  };

  try {
    const response = await axios.post(url, data, { headers });
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error(
      "Error:",
      error.response ? error.response.data : error.message
    );
  }
}

async function main() {
  const user = new pl.User(process.env.USERNAME, process.env.PASSWORD);
  await user.user.login();
  const messages = (await user.notification.get(3, 20)).Data.Messages;

  const index = (await fs.readFile("./index.txt", "utf-8")).trim();

  async function getSummary(item) {
    if (index === item.ID) return;

    let summary;
    if (item.Fields.DiscussionID) {
      summary = (
        await user.projects.getSummary(item.Fields.DiscussionID, "Discussion")
      ).Data.Description.join("\n");
    }
    const response = await fetchChatCompletion(summary);
    console.log(response);
    await user.messages.comment(
      item.Fields.DiscussionID,
      "Discussion",
      `回复@${item.UserNames[0]}: 文章摘要如下：\n${response}`,
      item.Users[0]
    );
  }

  const promises = [];
  for (const item of messages) {
    if (index === item.ID) break;
    promises.push(getSummary(item));
  }

  await Promise.all(promises);

  await fs.writeFile("./index.txt", messages[0].ID);
}

main();
