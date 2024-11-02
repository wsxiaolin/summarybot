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
    if (!response.data.choices[0].message.content) {
      throw new Error();
    }
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error(
      "Error:",
      error.response ? error.response.data : error.message
    );
    fs.appendFile("./error.txt", JSON.stringify(error));
  }
}

async function main() {
  await fs.appendFile("./log.txt", "\n" + new Date().toDateString());
  const user = new pl.User(process.env.USERNAME, process.env.PASSWORD);
  await user.user.login();
  const messages = (await user.notification.get(3, 20)).Data.Messages;

  const index = (await fs.readFile("./index.txt", "utf-8")).trim();

  async function getSummary(item) {
    if (index === item.ID) return;
    if (!item.Fields.Content.includes("@生成摘要")) return;

    let summary;
    if (item.Fields.DiscussionID) {
      summary = (
        await user.projects.getSummary(item.Fields.DiscussionID, "Discussion")
      ).Data.Description.join("\n");
    }
    const response = await fetchChatCompletion(summary);
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

    if (promises.length === 2) {
      await Promise.all(promises);
      promises.length = 0;
    }
  }

  if (promises.length > 0) {
    await Promise.all(promises);
  }

  await fs.writeFile("./index.txt", messages[0].ID);
}

main();
