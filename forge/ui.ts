import "./style.css";
// biome-ignore lint/performance/noNamespaceImport: This small screen consumes the mode API as one namespace.
import * as G from "./game.ts";

const A = G as any;
const root = document.querySelector<HTMLDivElement>("#app")!;
const SAVE = "starter-forge-rogue-v1";
let run: any = null;
let quizAnswers: number[] = [];
let mapSeed = "모험-001";
let pokemonSeed = "동료-001";
let notice = "";
let pendingMove: string | null = null;
let selectedMember = 0;
let canResume = false;
try {
  canResume = !!localStorage.getItem(SAVE);
} catch {
  /* Private browsing can disable storage. */
}

const esc = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
const typeName = (id: string) => A.TYPES.find((t: any) => t.id === id)?.name ?? id;
const types = (list: string[]) => list.map(id => `<span class="type">${esc(typeName(id))}</span>`).join("");
const percent = (m: any) => Math.max(0, Math.min(100, (m.hp / Math.max(1, m.maxHp)) * 100));
const kindName = (w: number) =>
  ({ normal: "야생 조우", rival: "라이벌", evil: "악의 보스", boss: "최종 보스" })[A.matchKind(w) as string] ?? "전투";
const rarityName = (r: string) => ({ silver: "일반", gold: "희귀", prismatic: "특별" })[r] ?? r;
const hp = (m: any) =>
  `<div class="hp-track" role="meter" aria-label="${esc(m.name)} HP" aria-valuemin="0" aria-valuemax="${m.maxHp}" aria-valuenow="${m.hp}"><span style="width:${percent(m)}%" class="${percent(m) < 25 ? "low" : ""}"></span></div>`;

function save() {
  try {
    localStorage.setItem(SAVE, JSON.stringify(run));
    canResume = true;
  } catch {
    notice = "브라우저 저장 공간을 사용할 수 없습니다. 기록을 내려받아 주세요.";
  }
}
function command(fn: () => void) {
  try {
    fn();
    notice = "";
    pendingMove = null;
    save();
    render();
  } catch (err) {
    notice = err instanceof Error ? err.message : "진행하지 못했습니다. 다시 선택해 주세요.";
    render();
  }
}
function header() {
  return `<header class="topbar"><a class="brand" href="./" aria-label="Starter Forge 시작 화면"><span class="brand-mark" aria-hidden="true">S/F</span><span>Starter Forge <small>로그 모드</small></span></a><div class="top-actions">${run ? `<button data-action="share" class="quiet">시드 복사</button><button data-action="export" class="quiet">기록 저장</button>` : `<span class="version">웹 전투 · ${esc(A.VERSION)}</span>`}</div></header>`;
}
function startScreen() {
  const q = A.QUIZ[quizAnswers.length];
  const result = q ? null : A.quizType(quizAnswers, mapSeed);
  return `${header()}<main class="intro"><section class="intro-copy"><span class="eyebrow">60 웨이브의 탐험</span><h1>아직 모르는<br>너의 가능성.</h1><p>작은 선택에서 시작해, 함께 싸우며 알아가는 세 마리의 동료. 진화와 드래프트로 나만의 팀을 만드세요.</p><ol class="growth-preview"><li><b>16</b><span>첫 진화<br>전용기 선택</span></li><li><b>26</b><span>특성 선택</span></li><li><b>36</b><span>최종 진화<br>추가 타입</span></li><li><b>46</b><span>전용기 선택</span></li><li><b>56</b><span>개체값 조정</span></li></ol><p class="art-note">창작 포켓몬의 이미지는 추후 추가됩니다.</p><a class="source-link" href="https://github.com/oflo03/starter-forge-rogue" target="_blank" rel="noopener noreferrer">소스 코드 · AGPL-3.0 ↗</a>${canResume ? '<button class="resume" data-action="resume">저장된 탐험 이어하기 <span>→</span></button>' : ""}</section><section class="quiz-panel" aria-labelledby="quiz-title"><div class="quiz-progress"><span>첫 동료 만나기</span><span>${Math.min(quizAnswers.length + 1, A.QUIZ.length)} / ${A.QUIZ.length}</span></div><div class="progress-track"><span style="width:${(quizAnswers.length / A.QUIZ.length) * 100}%"></span></div><div class="seed-fields"><label>맵 시드<input id="map-seed" name="mapSeed" value="${esc(mapSeed)}" maxlength="100" autocomplete="off"></label><label>포켓몬 시드<input id="pokemon-seed" name="pokemonSeed" value="${esc(pokemonSeed)}" maxlength="100" autocomplete="off"></label></div>${q ? `<h2 id="quiz-title">${esc(q.question)}</h2><div class="answers">${q.answers.map((a: any, i: number) => `<button data-answer="${i}"><span>${esc(a.text)}</span><span aria-hidden="true">↗</span></button>`).join("")}</div>${quizAnswers.length > 0 ? '<button class="quiet back-answer" data-action="back-quiz">이전 질문</button>' : ""}` : `<div class="quiz-result"><span class="eyebrow">첫 동료의 타입</span><h2 id="quiz-title">${esc(typeName(result))}</h2><p>성향은 정해졌지만, 잠재력은 아직 비밀입니다.<br>전투에서 동료의 장점을 발견해 보세요.</p><button class="primary start-run" data-action="start">탐험 시작 <span>→</span></button><button class="quiet" data-action="retake">다시 알아보기</button></div>`}</section></main>${noticeMarkup()}`;
}
function noticeMarkup() {
  return notice ? `<div class="notice" role="status">${esc(notice)}</div>` : "";
}
function route() {
  const milestones: [number, string][] = [
    [5, "라이벌"],
    [25, "라이벌"],
    [40, "악의 보스"],
    [55, "라이벌"],
    [60, "보스"],
  ];
  return `<section class="route" aria-label="웨이브 진행"><div class="wave-title"><h1>웨이브</h1><strong>${String(run.wave).padStart(2, "0")}<small> / 60</small></strong></div><div class="route-line"><div class="route-track"><span style="width:${Math.min(100, (run.cleared / 60) * 100)}%"></span></div>${milestones.map(([w, label]) => `<div class="milestone ${run.cleared >= w ? "passed" : ""} ${run.wave === w ? "current" : ""}" style="left:${(w / 60) * 100}%"><b>${w}</b><span>${label}</span></div>`).join("")}</div><div class="match-kind"><span>${esc(kindName(run.wave))}</span><small>${run.phase === "battle" ? `턴 ${run.turn}` : run.phase === "won" ? "탐험 완료" : "성장과 정비"}</small></div></section>`;
}
function teamSidebar() {
  const m = run.team[Math.min(selectedMember, run.team.length - 1)];
  return `<aside class="team-panel" aria-label="우리 탐험대"><div class="section-title"><h2>탐험대</h2><span>${run.team.length} / 3</span></div><div class="team-list">${run.team.map((mon: any, i: number) => `<button data-inspect="${i}" class="team-member ${i === run.active ? "active" : ""} ${i === selectedMember ? "inspecting" : ""}" aria-pressed="${i === selectedMember}"><div class="team-number">${String(i + 1).padStart(2, "0")}</div><div class="team-summary"><div><b>${esc(mon.name)}</b><small>Lv.${mon.level}</small></div><span class="team-types">${mon.types.map(typeName).map(esc).join(" / ")}${mon.hp <= 0 ? " · 기절" : i === run.active ? " · 출전 중" : ""}</span>${hp(mon)}<small class="team-hp">${mon.hp} / ${mon.maxHp}</small></div></button>`).join("")}</div><section class="intel"><div class="section-title"><h3>동료 관찰</h3><span>${m.stage}단계</span></div><b class="intel-name">${esc(m.name)}</b><ul>${(run.phase === "won" || run.phase === "lost" ? Object.entries(A.STAT_LABELS).map(([k, label]) => `${label} 종족값 ${m.base[k]}`) : A.intel(m)).map((s: string) => `<li>${esc(s)}</li>`).join("")}</ul><div class="ability"><span>현재 특성</span><b>${esc(m.ability.name)}</b><p>${esc(m.ability.description)}</p></div></section></aside>`;
}
function healthCard(m: any, which: string) {
  return `<section class="health-card ${which}"><div class="health-heading"><h2>${esc(m.name)}</h2><span>Lv.${m.level}</span></div><div class="health-types">${types(m.types)}</div><div class="health-meter"><span>HP</span>${hp(m)}</div><p>${m.hp} <span>/ ${m.maxHp}</span></p></section>`;
}
function battlefield() {
  const own = run.team[run.active];
  const foe = run.enemy;
  return `<section class="battlefield" aria-label="전투 화면"><div class="field-caption"><span>${esc(kindName(run.wave))}</span><span>${run.phase === "battle" ? (run.pendingSwitch ? "출전할 동료를 선택하세요" : "기술을 선택하세요") : run.phase === "lost" ? "탐험 종료" : "전투 종료"}</span></div>${foe ? `${healthCard(foe, "enemy-health")}<div class="portrait enemy-portrait" role="img" aria-label="상대 포켓몬 이미지 자리"><span>상대 포켓몬<br><small>이미지 준비 중</small></span></div><div class="platform enemy-platform" aria-hidden="true"></div>` : ""}<div class="portrait own-portrait" role="img" aria-label="내 포켓몬 이미지 자리"><span>나의 포켓몬<br><small>이미지 준비 중</small></span></div><div class="platform own-platform" aria-hidden="true"></div>${healthCard(own, "own-health")}<div class="battle-condition">${esc(own.ability.name)}<span> · </span>${own.stage === 3 ? "최종 진화" : own.stage === 2 ? "첫 진화" : "진화 전"}</div></section>`;
}
function controls() {
  const own = run.team[run.active];
  if (run.phase === "won" || run.phase === "lost") {
    return `<section class="outcome"><div><span class="eyebrow">${run.phase === "won" ? "60 웨이브 완주" : `${run.cleared} 웨이브 돌파`}</span><h2>${run.phase === "won" ? "우리만의 가능성을 증명했어요." : "다음 탐험에서 다시 만나요."}</h2><p>선택과 발견은 탐험 기록에 남습니다.</p></div><div><button class="primary" data-action="export">탐험 기록 저장</button><button class="quiet" data-action="new">새 탐험 준비</button></div></section>`;
  }
  if (run.phase === "between") {
    return `<section class="between-panel"><div><span class="eyebrow">웨이브 ${run.cleared} 클리어</span><h2>다음 여정을 준비하세요.</h2><p>아래에서 출전할 동료를 교대할 수 있습니다.</p></div><button class="primary" data-action="advance">다음 웨이브 <span>→</span></button></section>${switches()}`;
  }
  const moves = A.availableMoves(own);
  return `<section class="move-panel" aria-label="기술 선택"><div class="section-title"><h2>${run.pendingSwitch ? "출전할 동료를 선택하세요" : `${esc(own.name)}의 기술`}</h2><span>단축키 1–4</span></div><div class="moves">${moves.map((m: any, i: number) => `<button class="move" data-move="${i}" ${run.phase !== "battle" || run.pendingSwitch || own.hp <= 0 || m.currentPp <= 0 ? "disabled" : ""} title="${esc(m.effect)}"><div class="move-top"><span class="move-type">${esc(typeName(m.type))} · ${esc(m.category)}</span><span class="pp">PP ${m.currentPp}/${m.pp}</span></div><b><kbd>${i + 1}</kbd>${esc(m.name)}</b><div class="move-stats"><span>위력 ${esc(m.power || "—")}</span><span>명중 ${m.accuracy === null ? "필중" : m.accuracy}</span>${m.priority ? `<span>우선도 ${m.priority > 0 ? "+" : ""}${m.priority}</span>` : ""}</div><p>${esc(m.effect)}</p></button>`).join("")}${moves.length < 4 ? '<div class="move move-empty"><span>빈 기술 칸</span><p>성장 보상으로 새로운 기술을 배웁니다.</p></div>' : ""}</div></section>${switches()}`;
}
function switches() {
  return `<section class="switch-strip" aria-label="동료 교대"><span>교대</span>${run.team.map((m: any, i: number) => `<button data-switch="${i}" ${i === run.active || m.hp <= 0 || !["battle", "between"].includes(run.phase) ? "disabled" : ""}><b>${esc(m.name)}</b><small>${m.hp <= 0 ? "기절" : i === run.active ? "출전 중" : `HP ${m.hp}/${m.maxHp}`}</small></button>`).join("")}</section>`;
}
function battleLog() {
  const logs = run.log.slice(-4);
  return `<section class="battle-log" aria-label="전투 기록"><span>전투 기록</span><ol>${logs.map((l: string, i: number) => `<li class="${i === logs.length - 1 ? "latest" : ""}">${esc(l)}</li>`).join("")}</ol><span class="sr-only" aria-live="polite">${esc(logs.at(-1) ?? "")}</span></section>`;
}
function draftOverlay() {
  const d = run.draft;
  if (run.phase !== "draft" || !d) {
    return "";
  }
  const mon = run.team.find((m: any) => m.id === d.memberId) ?? run.team[run.active];
  if (pendingMove) {
    const option = d.options.find((o: any) => o.id === pendingMove);
    return `<dialog class="draft-dialog replacement" aria-labelledby="draft-title"><span class="eyebrow">${esc(mon.name)} · Lv.${d.level}</span><h2 id="draft-title">어떤 기술을 바꿀까요?</h2><p><b>${esc(option?.name)}</b>을 배울 자리를 선택하세요.</p><div class="replacement-options">${mon.moves
      .map((m: any, i: number) => {
        const allowed = A.canReplaceMove(mon, option.move, i);
        return `<button data-slot="${i}" ${allowed ? "" : "disabled"}><span>${esc(m.name)}<small>${esc(typeName(m.type))} · ${esc(m.category)} · 위력 ${esc(m.power || "—")}</small>${allowed ? "" : '<small class="replacement-reason">특성으로 강화되는 기술 2개를 유지해야 합니다.</small>'}</span><span>${allowed ? "교체 →" : "유지 필요"}</span></button>`;
      })
      .join("")}</div><button data-action="cancel-move" class="quiet">보상 선택으로 돌아가기</button></dialog>`;
  }
  return `<dialog class="draft-dialog ${esc(d.rarity)}" aria-labelledby="draft-title"><div class="draft-heading"><div><span class="eyebrow">${esc(mon.name)} · Lv.${d.level} 성장 보상</span><h2 id="draft-title">${esc(d.title)}</h2><p>${esc(d.description)}</p></div><span class="rarity">${esc(rarityName(d.rarity))} 보상</span></div><div class="draft-cards">${d.options
    .map(
      (o: any, i: number) =>
        `<article class="draft-card"><div class="draft-card-top"><span>${esc(rarityName(o.actualRarity ?? d.rarity))}${o.actualRarity && o.actualRarity !== d.rarity ? " · 보충" : ""}</span><span>${String(i + 1).padStart(2, "0")}</span></div><div class="card-content"><h3>${esc(o.name)}</h3>${o.type ? `<div class="option-meta">${esc(typeName(o.type))}${o.category ? ` · ${esc(o.category)}` : ""}${o.power ? ` · 위력 ${esc(o.power)}` : ""}</div>` : ""}<p>${esc(o.description)}</p>${o.detail ? `<p class="option-detail">${esc(o.detail)}</p>` : ""}${o.changes?.length ? `<div class="option-changes"><span>함께 바뀌는 기술</span><ul>${o.changes.map((s: string) => `<li>${esc(s)}</li>`).join("")}</ul></div>` : ""}${o.choices?.length ? `<label class="option-select">추가할 타입<select data-option-select="${esc(o.id)}">${o.choices.map((t: string) => `<option value="${esc(t)}">${esc(typeName(t))}</option>`).join("")}</select></label>` : ""}${
          o.id === "ivs-focus"
            ? `<label class="option-select">V로 만들 능력치<select data-option-select="${esc(o.id)}">${Object.entries(
                A.STAT_LABELS,
              )
                .map(([k, v]) => `<option value="${esc(k)}">${esc(v)}</option>`)
                .join("")}</select></label>`
            : ""
        }</div><button class="draft-pick" data-option="${esc(o.id)}">선택하기 <span>→</span></button></article>`,
    )
    .join("")}</div><p class="draft-foot">한 가지를 선택하면 동료의 성장에 바로 적용됩니다.</p></dialog>`;
}
function render() {
  if (!run) {
    root.innerHTML = startScreen();
    return;
  }
  root.innerHTML = `${header()}<main class="game-shell">${route()}<div class="play-layout">${teamSidebar()}<div class="battle-column">${battlefield()}${controls()}${battleLog()}</div></div><footer class="game-footer"><span>맵 ${esc(run.mapSeed)} · 포켓몬 ${esc(run.pokemonSeed)}</span><span>자동 저장 · ${esc(A.VERSION)} <a href="https://github.com/oflo03/starter-forge-rogue" target="_blank" rel="noopener noreferrer">소스 코드 ↗</a></span></footer></main>${noticeMarkup()}${draftOverlay()}`;
  const dialog = root.querySelector<HTMLDialogElement>("dialog");
  if (dialog) {
    dialog.showModal();
    dialog.addEventListener("cancel", e => e.preventDefault());
  }
}
function readSeeds() {
  mapSeed = (root.querySelector<HTMLInputElement>("#map-seed")?.value ?? mapSeed).trim() || "모험-001";
  pokemonSeed = (root.querySelector<HTMLInputElement>("#pokemon-seed")?.value ?? pokemonSeed).trim() || "동료-001";
}
root.addEventListener("change", event => {
  const el = event.target as HTMLElement;
  if (el.id === "map-seed" || el.id === "pokemon-seed") {
    readSeeds();
  }
});
root.addEventListener("click", async event => {
  const el = (event.target as HTMLElement).closest<HTMLButtonElement>("button");
  if (!el || el.disabled) {
    return;
  }
  if (el.dataset.answer !== undefined) {
    readSeeds();
    quizAnswers.push(Number(el.dataset.answer));
    render();
    return;
  }
  if (el.dataset.inspect !== undefined) {
    selectedMember = Number(el.dataset.inspect);
    render();
    return;
  }
  if (el.dataset.move !== undefined) {
    command(() => A.attack(run, Number(el.dataset.move)));
    return;
  }
  if (el.dataset.switch !== undefined) {
    command(() => A.switchMember(run, Number(el.dataset.switch)));
    return;
  }
  if (el.dataset.option !== undefined) {
    const id = el.dataset.option;
    const d = run.draft;
    const mon = run.team.find((m: any) => m.id === d.memberId);
    if (d.kind === "move" && mon?.moves.length >= 4) {
      pendingMove = id;
      render();
      return;
    }
    const select = [...root.querySelectorAll<HTMLSelectElement>("[data-option-select]")].find(
      s => s.dataset.optionSelect === id,
    );
    command(() => A.chooseOption(run, id, select ? { stat: select.value } : {}));
    return;
  }
  if (el.dataset.slot !== undefined && pendingMove) {
    const id = pendingMove;
    command(() => A.chooseOption(run, id, { slot: Number(el.dataset.slot) }));
    return;
  }
  switch (el.dataset.action) {
    case "start":
      readSeeds();
      command(() => {
        run = A.createRun({ mapSeed, pokemonSeed, type: A.quizType(quizAnswers, mapSeed) });
      });
      break;
    case "resume":
      try {
        run = A.restoreRun(localStorage.getItem(SAVE) ?? "");
        notice = "";
        render();
      } catch {
        run = null;
        canResume = false;
        notice = "저장된 탐험을 읽을 수 없습니다. 새로운 탐험을 시작해 주세요.";
        render();
      }
      break;
    case "retake":
      readSeeds();
      quizAnswers = [];
      render();
      break;
    case "back-quiz":
      readSeeds();
      quizAnswers.pop();
      render();
      break;
    case "advance":
      command(() => A.advance(run));
      break;
    case "cancel-move":
      pendingMove = null;
      render();
      break;
    case "new":
      run = null;
      quizAnswers = [];
      selectedMember = 0;
      pendingMove = null;
      render();
      break;
    case "share":
      try {
        await navigator.clipboard.writeText(`Starter Forge | 맵: ${run.mapSeed} | 포켓몬: ${run.pokemonSeed}`);
        notice = "맵 시드와 포켓몬 시드를 복사했습니다.";
      } catch {
        notice = `맵 시드: ${run.mapSeed} / 포켓몬 시드: ${run.pokemonSeed}`;
      }
      render();
      break;
    case "export": {
      const url = URL.createObjectURL(new Blob([JSON.stringify(run, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `starter-forge-wave-${run.wave}.json`;
      a.click();
      URL.revokeObjectURL(url);
      break;
    }
  }
});
document.addEventListener("keydown", e => {
  if (
    !run
    || run.phase !== "battle"
    || e.ctrlKey
    || e.metaKey
    || e.altKey
    || ["INPUT", "SELECT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)
  ) {
    return;
  }
  const i = Number(e.key) - 1;
  if (i >= 0 && i < 4) {
    const button = root.querySelector<HTMLButtonElement>(`[data-move="${i}"]`);
    if (button && !button.disabled) {
      e.preventDefault();
      button.click();
    }
  }
});
Object.defineProperty(window, "forgeTest", { value: Object.freeze({ getState: () => run }), writable: false });
render();
