const pl = require("plweb");
const fs = require("fs/promises");
const axios = require("axios");

async function fetchChatCompletion(text) {
  const url = "https://spark-api-open.xf-yun.com/v1/chat/completions";
  const data = {
    model: "4.0Ultra",
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
    fs.appendFile("./error.txt", JSON.stringify(error) + "\n");
    return (
      error.response
        ? JSON.stringify(error.response.data)
        : JSON.stringify(error.message)
    ).slice(0, 300);
  }
}

async function main() {
  let logs = [];
  let pl_logs = [];
  const user = new pl.User(process.env.USERNAME, process.env.PASSWORD);
  await user.user.login();
  const messages = (await user.notification.get(3, 20)).Data.Messages;
  console.log(messages);
  const index = (await fs.readFile("./index.txt", "utf-8")).trim();
  await fs.writeFile("./index.txt", messages[0].ID);
  async function getSummary(item) {
    console.log(item.Users[0]);
    if (index === item.ID) return;
    if (!item?.Fields?.Content?.includes("@生成摘要")) return;
    if (item?.Fields?.Content?.length > 8) return;
    if (item.Users[0] === "669a4fc86b03afd70fa57bc2") return;

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
      `来自@${item.UserNames[0]}的召唤: 文章摘要如下（技术支持：plweb</discussion>）：\n${response}`,
      item.Users[0]
    );
    logs.push(
      new Date().toLocaleString(),
      item.Fields.DuscussionID,
      item.UserNames[0],
      response.replace(/\n/g, " ")
    );
    pl_logs.push(
      `<discussion=${item.Fields.DiscussionID}><discussion=${item.Fields.DiscussionID}>来自${item.UserNames[0]}</discussion></discussion>`
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

  await fs.appendFile("./logs.txt", logs.join("\n"));

  const log_projects = await user.projects.getSummary(
    "6726dd25d1225ef795064fa7",
    "Discussion"
  );
  log_projects.Data.Description.push(pl_logs.join("\n"));
  user.experiment.update(log_projects.Data);
}

main();

fs.appendFile('temp.txt', Math.random() + '\n');
