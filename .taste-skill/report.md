# 현재 UI 검증

최신 사용자 지시에 따라 원본 PokéRogue UI·이미지를 그대로 사용합니다. 초기 별도 HTML 전투 화면과 true-black-flat 방향은 보관된 이전 구현에만 해당하며, 현재 배포 진입점에는 적용하지 않습니다.

원본 Phaser 화면에서 파트너 만남·이름 입력·실제 전투 두 번째 턴·다섯 성장 보상·추가 파트너 두 마리 합류·저장 데이터 복원을 확인했습니다. 프로덕션 빌드에서도 기존 기술 세 개와 시작 특성, 이름 길이 검사, 일반 설정의 시드 표시를 확인했습니다. 데스크톱과 모바일 화면 전환에서 확인한 원작 설정의 터치 전용 행 갱신 오류는 해당 행이 없는 경우 갱신을 건너뛰도록 수정했습니다.

창작 파트너에는 임시 원본 포켓몬 이미지를 표시합니다. 별도 창작 이미지는 아직 연결하지 않았습니다.


## 2026-10-28: standalone mode and temporary partner identity
User requested one mode and simple type-colored circles with type symbols, retaining the original pixel battle UI. Title now offers adventure, load, history and settings; account, tutorial and collection menus are absent. Partner appearances are procedural local Canvas textures with 18 monochrome symbols, shared by field/summary/party and restored from permanent type metadata. Dual types split the circle and show both symbols. Native desktop browser verified growth 16/26/36/46/56, recruitment and save reconstruction with no console errors. Opponent sprites remain original.


## 2026-10-28: original type badges
User replaced the procedural circle direction with original PokeRogue type images. Appearance now samples the existing pbinfo_player_type atlas with nearest-neighbor scaling. Dual types clip the full-sized first badge to the left half and the second to the right half. Browser pixel checks covered all 153 dual combinations in both field and icon sizes (306 composites), plus native battle/party/summary display.


## 2026-10-28: universal partner pixel sprites
Replaced temporary type badges with 36 original neutral pixel frames: six body families, three evolution stages, true front/back views. Rejected agile/heavy/armored designs were regenerated as cacomistle/takin/armadillo; armored anatomy has four mammal legs. Original native UI remains. Canonical 8-color palettes use permanent type metadata and preserve alpha; body identity persists in saves. Native browser verified 180 body/stage/view/type combinations, battle back sprites, party/summary fronts, all growth rewards and save reconstruction. 18 focused tests cover exact asset count, size, role coverage, palette geometry and saved body identity.


## Partner encounter selection
First and wave-10 encounters reuse native reward selection: three distinct seeded type candidates, selected creature preview during naming, identical permanent type/body through battle. Wave-20 third recruitment removed. Native desktop/mobile flow checks selected second candidate, nickname validation, starting money and battle turn 2; dedicated recruitment check chooses third candidate for partner two and proves no wave-20 recruitment.


## 2026-10-29: sprite readability and hidden encounter identity
Redrew all six source families with broader pixel clusters and five solid output shades. Increased stage1 from36 to64 pixels, stage2 to76 and stage3 to86; all36 actual alpha bounds centered on96px frames with >=5px final margins. Fixed actual clipping: generated anatomy crossed nominal equal sheet boundaries, so packing now locates six whole connected creatures before extracting. Removed all stage digits and fixed naming crop. Encounter cards render only original type atlas icons; creature textures first generated after choice, then entire centered creature shown while naming. Native browser asserts36 geometry cases, no creature textures before initial choice, matching selected type in naming/battle, second recruit selection and no third recruit.


## 2026-10-29: augment choice screen and native evolution
User explicitly requests League augment-like side-by-side cards instead of native item reward animation. New native Phaser ForgeDraftUiHandler: three quiet navy panels, gold focus border, native pixel font, title and effect per card, no helper narration. Native item reward UI remains for real items. User-selected pixel/native identity takes precedence over generic app style dealing. Verified real mouse selection, keyboard and party return, no description overflow, 1440/768/390 screenshots. All18types have explicit body/mark color pairs; dual uses two main colors. Summary textures centered, battle feet aligned to native y132 platform rather than y148 container to avoid floating/clipping.
Evolution uses the original EvolutionPhase animation implementation with isolated hooks; original5form-change regression tests pass. Native cycles observed for16/36 (15+scale states each). Additional type selected before final animation; old sprite remains monotype until commit and new sprite is dualtype. Optional linked move cards preserve original moves if declined, and only the explicitly selected slot changes when accepted. All60-wave difficulty now Forge-only curves/rosters/gear limits; all10evilbosses tested.


## Latest override: Lv26 ability only
User removed immediate linked learning entirely. Lv26 changes ability only, with no linked descriptions/dialogs or moveset changes, even when slots are free. New moves remain exclusively16/46. Reward abilities buffed through native attributes: physical/special1.3, lower-offense1.5, HP>=half incoming0.75. Native damage application regression and fresh-browser3/4-slot preservation checks added; previous optional-learning notes above are superseded.
