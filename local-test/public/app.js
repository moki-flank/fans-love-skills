const skills = {
  loop: {
    title: "智能体 - Codex 式循环",
    route: "/api/agent/loop",
    sample: {
      user_id: "user_001",
      agent_id: "fans_love_loop_agent.v1",
      entry_skill_id: "fan.codex_loop_agent.v1",
      conversation_id: "local-loop-conversation",
      card_id: "pet_support_cat_v1",
      message: "帮我判断今天要先做什么，如果需要就调用对应 skill，直到没有下一步。",
      max_steps: 20,
      dry_run: false,
      app_context: {
        route: "/pet/ai",
        current_tab_index: 0,
        current_user: {
          id: "user_001",
          nickname: "Archer Fan",
          points: 2568,
          current_star_id: "star_001",
          my_star_votes_today: 12,
          my_star_votes_total: 20,
          companion_days: 197
        },
        current_star: {
          id: "star_001",
          name: "Archer",
          rank: 1,
          support_count: 125669980
        },
        pet: {
          pet_id: "emo",
          intimacy: 75,
          mood: "happy"
        },
        projects: [
          {
            id: "cf_001",
            title: "应援演唱会应援项目",
            star_id: "star_001",
            target_votes: 50000,
            current_votes: 33000,
            status: "active"
          }
        ],
        tasks: [
          {
            id: "daily_check_in",
            title: "今日签到",
            current_progress: 1,
            total_progress: 1,
            reward_points: 10,
            is_claimable: true,
            type: "daily"
          },
          {
            id: "pet_touch",
            title: "和小 emo 互动",
            current_progress: 0,
            total_progress: 1,
            reward_points: 8,
            is_claimable: false,
            type: "pet"
          }
        ],
        memory_records: [
          {
            id: "record_001",
            content: "很开心，今天的演出太棒了！",
            location: "上海",
            image_urls: ["assets/images/democard1.png"]
          }
        ]
      }
    }
  },
  agent: {
    title: "智能体 - FS Love 应用路由",
    route: "/api/agent/fans-love-chat",
    sample: {
      user_id: "user_001",
      conversation_id: "local-conversation",
      card_id: "pet_support_cat_v1",
      message: "帮我看看今天先做任务还是去投票？",
      app_context: {
        route: "/pet/ai",
        current_tab_index: 0,
        current_user: {
          id: "user_001",
          nickname: "Archer Fan",
          points: 2568,
          current_star_id: "star_001",
          my_star_votes_today: 12,
          my_star_votes_total: 20,
          companion_days: 197
        },
        current_star: {
          id: "star_001",
          name: "Archer",
          rank: 1,
          support_count: 125669980
        },
        pet: {
          pet_id: "emo",
          intimacy: 75,
          mood: "happy"
        },
        projects: [
          {
            id: "cf_001",
            title: "应援演唱会应援项目",
            star_id: "star_001",
            target_votes: 50000,
            current_votes: 33000,
            status: "active"
          }
        ],
        tasks: [
          {
            id: "daily_check_in",
            title: "今日签到",
            current_progress: 1,
            total_progress: 1,
            reward_points: 10,
            is_claimable: true,
            type: "daily"
          }
        ],
        memory_records: [
          {
            id: "record_001",
            content: "很开心，今天的演出太棒了！",
            image_urls: ["assets/images/democard1.png"]
          }
        ]
      }
    }
  },
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
  memory: {
    title: "技能 - 回忆卡片生成",
    route: "/api/skill/memory-card-generation",
    sample: {
      user_id: "user_001",
      card_id: "pet_support_cat_v1",
      style: "warm_album",
      replace_existing_for_record: true,
      record: {
        id: "record_001",
        content: "很开心，今天的演出太棒了！Archer 的歌声真的让我感动落泪了。",
        location: "上海梅赛德斯奔驰文化中心",
        created_at: "2026-05-11T22:18:00+08:00",
        image_urls: [
          "assets/images/democard1.png",
          "assets/images/democard2.png",
          "assets/images/democard3.png"
        ]
      }
    }
  },
  task: {
    title: "技能 - 每日任务规划",
    route: "/api/skill/daily-task-planner",
    sample: {
      user_id: "user_001",
      card_id: "pet_support_cat_v1",
      points: 2568,
      pet_intimacy: 75,
      current_star: {
        id: "star_001",
        name: "Archer",
        rank: 1
      },
      tasks: [
        {
          id: "daily_check_in",
          title: "今日签到",
          description: "打开 App 完成签到",
          current_progress: 1,
          total_progress: 1,
          reward_points: 10,
          is_completed: false,
          is_claimable: true,
          type: "daily"
        },
        {
          id: "pet_touch",
          title: "和小 emo 互动",
          description: "轻点宠物增加亲密度",
          current_progress: 0,
          total_progress: 1,
          reward_points: 8,
          is_completed: false,
          is_claimable: false,
          type: "pet"
        }
      ]
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

let activeSkill = "loop";

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
