const skills = {
  star: {
    title: "技能 - 追星咨询",
    route: "/api/skill/star-consulting",
    sample: {
      user_id: "test-user",
      card_id: "data_strategist_v1",
      star_id: "test-star",
      available_votes: 12,
      budget_cents: 5000,
      projects: [
        {
          project_id: "project-1",
          name: "生日应援",
          target_cents: 100000,
          current_cents: 76000
        }
      ],
      rankings: [
        {
          ranking_id: "weekly",
          current_rank: 3,
          gap_to_next: 180
        }
      ]
    }
  },
  pet: {
    title: "技能 - 萌宠互动",
    route: "/api/skill/pet-interaction",
    sample: {
      user_id: "test-user",
      card_id: "pet_support_cat_v1",
      pet_id: "pet-1",
      action: "play",
      context: {
        task: "daily_check_in"
      }
    }
  },
  record: {
    title: "技能 - 记录鉴别",
    route: "/api/skill/record-verify",
    sample: {
      user_id: "test-user",
      card_id: "record_detective_v1",
      claimed_amount: 0,
      screenshots: [],
      metadata: {
        source: "local-test"
      }
    }
  }
};

const statusNode = document.querySelector("#status");
const payloadNode = document.querySelector("#payload");
const resultNode = document.querySelector("#result");
const titleNode = document.querySelector("#skillTitle");
const sendButton = document.querySelector("#sendButton");
const resetButton = document.querySelector("#resetButton");
const copyButton = document.querySelector("#copyButton");
const workflowButtons = [...document.querySelectorAll(".workflow")];

let activeSkill = "star";

function pretty(value) {
  return JSON.stringify(value, null, 2);
}

function setActiveSkill(skillKey) {
  activeSkill = skillKey;
  const skill = skills[skillKey];
  titleNode.textContent = skill.title;
  payloadNode.value = pretty(skill.sample);
  workflowButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.skill === skillKey);
  });
}

async function refreshStatus() {
  try {
    const response = await fetch("/api/workflows");
    const body = await response.json();
    const count = Array.isArray(body.data) ? body.data.length : 0;
    statusNode.textContent = `${count} 个工作流`;
    statusNode.className = "status ok";
  } catch (error) {
    statusNode.textContent = "连接失败";
    statusNode.className = "status bad";
  }
}

async function sendRequest() {
  sendButton.disabled = true;
  resultNode.textContent = "请求中...";
  try {
    const body = JSON.parse(payloadNode.value);
    const response = await fetch(skills[activeSkill].route, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    const text = await response.text();
    let output = text;
    try {
      output = pretty(JSON.parse(text));
    } catch {
      output = text;
    }
    resultNode.textContent = output;
  } catch (error) {
    resultNode.textContent = pretty({ error: error.message });
  } finally {
    sendButton.disabled = false;
  }
}

workflowButtons.forEach((button) => {
  button.addEventListener("click", () => setActiveSkill(button.dataset.skill));
});

resetButton.addEventListener("click", () => setActiveSkill(activeSkill));
sendButton.addEventListener("click", sendRequest);
copyButton.addEventListener("click", async () => {
  await navigator.clipboard.writeText(resultNode.textContent);
});

setActiveSkill(activeSkill);
refreshStatus();
