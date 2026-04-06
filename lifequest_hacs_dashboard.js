class LifequestCard extends HTMLElement {
  setConfig(config) {
    this._config = config;
    if (!this._root) {
      this._root = this.attachShadow({ mode: "open" });
    }
    this._expanded = null;
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    const players = this._getPlayers();
    const rewards = this._getPendingRewards();
    return 1 + players.length * 2 + (rewards.length > 0 ? rewards.length + 1 : 0);
  }

  _getPlayers() {
    if (!this._hass) return [];
    const states = this._hass.states;
    const players = [];
    const seen = new Set();

    for (const entityId of Object.keys(states)) {
      if (
        entityId.startsWith("sensor.lifequest_") &&
        entityId.endsWith("_quests_available")
      ) {
        const slug = entityId
          .replace("sensor.lifequest_", "")
          .replace("_quests_available", "");
        if (seen.has(slug)) continue;
        seen.add(slug);

        const questsSensor = states[entityId];
        const pointsSensor = states[`sensor.lifequest_${slug}_points`];
        const levelSensor = states[`sensor.lifequest_${slug}_level`];

        if (!pointsSensor) continue;

        const questsAttr = questsSensor.attributes.quests || [];
        const name =
          pointsSensor.attributes.friendly_name?.replace(" Points", "") ||
          slug
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());

        players.push({
          slug,
          name,
          points: parseInt(pointsSensor.state) || 0,
          threshold: pointsSensor.attributes.threshold || 250,
          progressPct: pointsSensor.attributes.progress_pct || 0,
          level: levelSensor ? parseInt(levelSensor.state) || 1 : 1,
          levelName: levelSensor?.attributes?.level_name || "",
          questCount: parseInt(questsSensor.state) || 0,
          quests: questsAttr,
        });
      }
    }

    return players.sort((a, b) => a.name.localeCompare(b.name));
  }

  _getPendingRewards() {
    if (!this._hass) return [];
    const sensor =
      this._hass.states["sensor.lifequest_rewards_pending"] ||
      this._hass.states["sensor.rewards_pending"];
    if (!sensor) return [];
    return sensor.attributes.rewards || [];
  }

  _handleToggle(playerSlug) {
    this._expanded = this._expanded === playerSlug ? null : playerSlug;
    this._render();
  }

  _handleCompleteQuest(playerId, questId) {
    if (!this._hass) return;
    this._hass.callService("lifequest", "complete_quest", {
      player_id: playerId,
      quest_id: questId,
    });
  }

  _handleDeliverReward(cycleId) {
    if (!this._hass) return;
    this._hass.callService("lifequest", "deliver_reward", {
      cycle_id: cycleId,
    });
  }

  _render() {
    const players = this._getPlayers();
    const pendingRewards = this._getPendingRewards();

    this._root.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: var(--primary-font-family, Roboto, sans-serif);
        }
        .card {
          background: var(--card-background-color, #fff);
          border-radius: 12px;
          padding: 16px;
          box-shadow: var(--ha-card-box-shadow, 0 2px 2px 0 rgba(0,0,0,0.14));
        }
        .header {
          font-size: 1.4em;
          font-weight: 600;
          margin-bottom: 12px;
          color: var(--primary-text-color);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .header ha-icon {
          color: var(--primary-color);
        }
        .player {
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: background 0.2s;
          border: 1px solid var(--divider-color, #e0e0e0);
        }
        .player:hover {
          background: var(--secondary-background-color, #f5f5f5);
        }
        .player.expanded {
          background: var(--secondary-background-color, #f5f5f5);
        }
        .player-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .player-name {
          font-weight: 500;
          font-size: 1.2em;
          color: var(--primary-text-color);
        }
        .player-meta {
          display: flex;
          gap: 12px;
          align-items: center;
          font-size: 1em;
          color: var(--secondary-text-color);
        }
        .badge {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.9em;
          font-weight: 600;
        }
        .badge-level {
          background: var(--primary-color, #03a9f4);
          color: var(--text-primary-color, #fff);
        }
        .badge-quests {
          background: var(--label-badge-green, #4caf50);
          color: #fff;
        }
        .badge-reward {
          background: #ff9800;
          color: #fff;
        }
        .progress-bar {
          width: 100%;
          height: 6px;
          background: var(--disabled-text-color, #ccc);
          border-radius: 3px;
          margin-top: 8px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          border-radius: 3px;
          background: var(--primary-color, #03a9f4);
          transition: width 0.3s ease;
        }
        .progress-text {
          font-size: 0.9em;
          color: var(--secondary-text-color);
          margin-top: 4px;
        }
        .quest-list {
          margin-top: 12px;
          border-top: 1px solid var(--divider-color, #e0e0e0);
          padding-top: 8px;
        }
        .quest-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid var(--divider-color, #e0e0e0);
        }
        .quest-item:last-child {
          border-bottom: none;
        }
        .quest-info {
          flex: 1;
        }
        .quest-title {
          font-weight: 500;
          font-size: 1.05em;
          color: var(--primary-text-color);
        }
        .quest-meta {
          font-size: 0.9em;
          color: var(--secondary-text-color);
          margin-top: 2px;
        }
        .quest-freq {
          display: inline-block;
          padding: 1px 6px;
          border-radius: 4px;
          font-size: 0.8em;
          font-weight: 600;
          text-transform: uppercase;
          margin-right: 6px;
        }
        .freq-daily { background: #e3f2fd; color: #1565c0; }
        .freq-weekly { background: #fff3e0; color: #e65100; }
        .freq-once { background: #f3e5f5; color: #7b1fa2; }
        .complete-btn, .deliver-btn {
          background: var(--primary-color, #03a9f4);
          color: var(--text-primary-color, #fff);
          border: none;
          border-radius: 6px;
          padding: 6px 12px;
          font-size: 0.9em;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: opacity 0.2s;
        }
        .complete-btn:hover, .deliver-btn:hover {
          opacity: 0.85;
        }
        .deliver-btn {
          background: #ff9800;
        }
        .rewards-section {
          margin-top: 16px;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #ff9800;
          background: rgba(255, 152, 0, 0.05);
        }
        .rewards-header {
          font-weight: 600;
          font-size: 1.2em;
          color: #ff9800;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .reward-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid var(--divider-color, #e0e0e0);
        }
        .reward-item:last-child {
          border-bottom: none;
        }
        .reward-info {
          flex: 1;
        }
        .reward-player {
          font-weight: 500;
          font-size: 1.05em;
          color: var(--primary-text-color);
        }
        .reward-meta {
          font-size: 0.9em;
          color: var(--secondary-text-color);
          margin-top: 2px;
        }
        .empty {
          color: var(--secondary-text-color);
          text-align: center;
          padding: 20px;
          font-style: italic;
        }
      </style>
      <div class="card">
        <div class="header">
          <ha-icon icon="mdi:shield-star"></ha-icon>
          Lifequest
        </div>
        ${
          pendingRewards.length > 0
            ? `<div class="rewards-section">
                <div class="rewards-header">
                  <ha-icon icon="mdi:gift" style="--icon-primary-color: #ff9800"></ha-icon>
                  Pending Rewards (${pendingRewards.length})
                </div>
                ${pendingRewards
                  .map(
                    (r) => `
                  <div class="reward-item">
                    <div class="reward-info">
                      <div class="reward-player">${r.player_name}</div>
                      <div class="reward-meta">Reached ${r.level_name || `Level ${r.level}`}</div>
                    </div>
                    <button class="deliver-btn" data-action="deliver" data-cycle="${r.cycle_id}">
                      Deliver
                    </button>
                  </div>
                `
                  )
                  .join("")}
              </div>`
            : ""
        }
        ${
          players.length === 0
            ? '<div class="empty">No players found</div>'
            : players
                .map(
                  (p) => `
            <div class="player ${
              this._expanded === p.slug ? "expanded" : ""
            }" data-slug="${p.slug}">
              <div class="player-header" data-action="toggle" data-slug="${
                p.slug
              }">
                <div>
                  <div class="player-name">${p.name}</div>
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: ${Math.min(
                      p.progressPct,
                      100
                    )}%"></div>
                  </div>
                  <div class="progress-text">${p.points} / ${p.threshold} pts (${p.progressPct}%)</div>
                </div>
                <div class="player-meta">
                  <span class="badge badge-level">Lvl ${p.level}${p.levelName ? ` ${p.levelName}` : ''}</span>
                  <span class="badge badge-quests">${p.questCount} quests</span>
                </div>
              </div>
              ${
                this._expanded === p.slug
                  ? `<div class="quest-list">
                    ${
                      p.quests.length === 0
                        ? '<div class="empty" style="padding:8px 0">No quests assigned</div>'
                        : p.quests
                            .map(
                              (q) => `
                          <div class="quest-item">
                            <div class="quest-info">
                              <div class="quest-title">${q.title}</div>
                              <div class="quest-meta">
                                <span class="quest-freq freq-${q.frequency}">${q.frequency}</span>
                                ${q.points} pts
                                ${q.repeatable ? " · repeatable" : ""}
                                ${q.completed_today > 0 ? ` · done ${q.completed_today}x today` : ""}
                              </div>
                            </div>
                            <button class="complete-btn" data-action="complete" data-player="${
                              p.id || ""
                            }" data-quest="${q.id}">
                              Complete
                            </button>
                          </div>
                        `
                            )
                            .join("")
                    }
                  </div>`
                  : ""
              }
            </div>
          `
                )
                .join("")
        }
      </div>
    `;

    // Attach event listeners
    this._root.querySelectorAll("[data-action='toggle']").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        this._handleToggle(el.dataset.slug);
      });
    });

    this._root.querySelectorAll("[data-action='complete']").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const questId = parseInt(el.dataset.quest);
        const slug = el.closest(".player").dataset.slug;
        const levelSensor =
          this._hass.states[`sensor.lifequest_${slug}_level`];
        const playerId = levelSensor?.attributes?.player_id;
        if (!playerId) return;

        el.textContent = "Done!";
        el.disabled = true;
        this._handleCompleteQuest(playerId, questId);
      });
    });

    this._root.querySelectorAll("[data-action='deliver']").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const cycleId = parseInt(el.dataset.cycle);
        el.textContent = "Delivered!";
        el.disabled = true;
        this._handleDeliverReward(cycleId);
      });
    });
  }
}

customElements.define("lifequest-card", LifequestCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "lifequest-card",
  name: "Lifequest Card",
  description: "Dashboard showing Lifequest player progress and quests",
});
